"use client";

import { CircleAlert, CircleCheck, Save, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { GameArt } from "@/components/store/game-tile";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@/components/ui";
import type { FieldErrors } from "@/lib/admin/forms";
import { parseZoneOptions, SLUG_RE, type GameEditorValues, type GameFormValues } from "@/lib/admin/game-schema";
import { compileSafePattern } from "@/lib/orders/validation";
import { cn, slugify } from "@/lib/utils";
import { Field, Switch } from "./field";
import { PackagesEditor } from "./packages-editor";
import { useToast } from "./toast";

type SaveResult =
  | { status: "success"; message: string; at: number; id: number; values: GameEditorValues }
  | { status: "error"; message: string; fieldErrors?: FieldErrors; at: number };

type Props = {
  gameId: number | null;
  initial: GameEditorValues;
  save: (gameId: number | null, values: GameEditorValues) => Promise<SaveResult>;
  siteUrl: string;
};

/** Tiny "does this ID match?" tester next to a regex field (client-side only). */
function PatternTester({ pattern, label }: { pattern: string; label: string }) {
  const [sample, setSample] = useState("");
  if (!pattern.trim()) return null;
  const re = compileSafePattern(pattern.trim());
  const result = !sample ? null : re ? re.test(sample.trim()) : null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        placeholder={`Test a ${label.toLowerCase()}…`}
        aria-label={`Test the ${label} pattern`}
        className="h-9 max-w-56 text-sm"
      />
      <span className="text-xs" role="status" aria-live="polite">
        {!re ? (
          <span className="text-danger">Invalid pattern</span>
        ) : result === true ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> matches
          </span>
        ) : result === false ? (
          <span className="inline-flex items-center gap-1 text-danger">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" /> no match
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Create/edit a game and its packages on one page with one Save, so price
 * and package changes are stored together (one transaction on the server).
 */
export function GameEditor({ gameId, initial, save, siteUrl }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  // New games derive the slug from the name until the owner edits it by hand.
  const [slugTouched, setSlugTouched] = useState(gameId !== null);
  const rootRef = useRef<HTMLFormElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const g = values.game;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setGame = (patch: Partial<GameFormValues>) => setValues((v) => ({ ...v, game: { ...v.game, ...patch } }));

  function onName(name: string) {
    setGame(slugTouched ? { name } : { name, slug: slugify(name).slice(0, 64) });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await save(gameId, values);
      if (result.status === "error") {
        setErrors(result.fieldErrors ?? {});
        toast.show("error", result.message);
        // Bring the first problem into view (after the error state renders).
        requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        return;
      }
      setErrors({});
      setValues(result.values);
      setBaseline(result.values);
      if (gameId === null) {
        router.replace(`/admin/games/${result.id}?flash=game_created`);
      } else {
        toast.show("success", result.message);
      }
    });
  }

  const zones = parseZoneOptions(g.zoneOptions);
  const slugChanged = gameId !== null && g.slug !== baseline.game.slug;
  const slugLooksValid = SLUG_RE.test(g.slug);
  const e = (k: keyof GameFormValues) => errors[k];

  return (
    <form ref={rootRef} onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" error={e("name")} className="sm:col-span-2">
              <Input value={g.name} maxLength={120} required onChange={(ev) => onName(ev.target.value)} />
            </Field>
            <Field
              label="Slug (link)"
              error={e("slug")}
              className="sm:col-span-2"
              hint={
                <>
                  {siteUrl}/games/<span className="text-fg">{g.slug || "…"}</span>
                  {!slugTouched && " · follows the name until you edit it"}
                </>
              }
            >
              <Input
                value={g.slug}
                maxLength={64}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(ev) => {
                  setSlugTouched(true);
                  setGame({ slug: ev.target.value.toLowerCase() });
                }}
                onBlur={() => setGame({ slug: slugify(g.slug).slice(0, 64) })}
              />
            </Field>
            {slugChanged && slugLooksValid && (
              <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-sm text-warning ring-1 ring-warning/30 ring-inset sm:col-span-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Changing the slug breaks links you already posted on Facebook, TikTok or Telegram.
              </p>
            )}
            <Field label="Publisher" error={e("publisher")} optional>
              <Input value={g.publisher} maxLength={120} onChange={(ev) => setGame({ publisher: ev.target.value })} />
            </Field>
            <Field label="Currency name" error={e("currencyName")} hint="Diamonds, UC, CP, Tokens…">
              <Input value={g.currencyName} maxLength={40} required onChange={(ev) => setGame({ currencyName: ev.target.value })} />
            </Field>
            <Field label="Tagline" error={e("tagline")} optional className="sm:col-span-2" hint="One line under the name on game cards.">
              <Input value={g.tagline} maxLength={200} onChange={(ev) => setGame({ tagline: ev.target.value })} />
            </Field>
            <Field label="Description" error={e("description")} optional className="sm:col-span-2" hint="Shown on the game page and in link previews.">
              <Textarea value={g.description} maxLength={2000} rows={3} onChange={(ev) => setGame({ description: ev.target.value })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Look</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="mx-auto w-36">
              <GameArt game={{ name: g.name || "New game", currencyName: g.currencyName || "Diamonds", accentColor: g.accentColor, imageUrl: g.imageUrl || null }} sizes="144px" />
              <p className="mt-2 text-center text-xs text-muted">Preview</p>
            </div>
            <Field label="Accent color" error={e("accentColor")} controlId="game-accent-hex">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(g.accentColor) ? g.accentColor : "#7c5cff"}
                  onChange={(ev) => setGame({ accentColor: ev.target.value })}
                  aria-label="Pick accent color"
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-surface-2 p-1"
                />
                <Input
                  id="game-accent-hex"
                  aria-invalid={e("accentColor") ? true : undefined}
                  aria-describedby={e("accentColor") ? "game-accent-hex-error" : undefined}
                  value={g.accentColor}
                  maxLength={7}
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(ev) => setGame({ accentColor: ev.target.value.trim() })}
                  className="font-mono"
                />
              </div>
            </Field>
            <Field
              label="Image URL"
              error={e("imageUrl")}
              optional
              hint="https:// link to artwork you own. Leave empty to use the generated tile (official logos are trademarks)."
            >
              <Input value={g.imageUrl} maxLength={500} inputMode="url" onChange={(ev) => setGame({ imageUrl: ev.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Player ID</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <Field label="ID field label" error={e("idLabel")} hint="User ID, Player ID, UID, Character ID…">
              <Input value={g.idLabel} maxLength={40} required onChange={(ev) => setGame({ idLabel: ev.target.value })} />
            </Field>
            <div>
              <Field
                label="ID pattern (regular expression)"
                error={e("idPattern")}
                optional
                hint={<>Example: <code className="font-mono">^\d{"{6,12}"}$</code> = 6–12 digits. Empty = letters and digits.</>}
              >
                <Input value={g.idPattern} maxLength={160} spellCheck={false} autoCapitalize="none" className="font-mono" onChange={(ev) => setGame({ idPattern: ev.target.value })} />
              </Field>
              <PatternTester pattern={g.idPattern} label={g.idLabel || "ID"} />
            </div>
            <Field label="Where to find the ID" error={e("idHelp")} optional>
              <Textarea value={g.idHelp} maxLength={500} rows={2} onChange={(ev) => setGame({ idHelp: ev.target.value })} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zone / server</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <Switch
              label="Requires a zone or server"
              description="Mobile Legends needs a Zone ID; Genshin needs a server."
              checked={g.requiresZone}
              onChange={(v) => setGame({ requiresZone: v })}
            />
            <Field label="Zone label" error={e("zoneLabel")} optional={!g.requiresZone} hint="Zone ID, Server…">
              <Input value={g.zoneLabel} maxLength={40} onChange={(ev) => setGame({ zoneLabel: ev.target.value })} />
            </Field>
            <div>
              <Field label="Zone pattern (regular expression)" error={e("zonePattern")} optional>
                <Input value={g.zonePattern} maxLength={160} spellCheck={false} autoCapitalize="none" className="font-mono" onChange={(ev) => setGame({ zonePattern: ev.target.value })} />
              </Field>
              <PatternTester pattern={g.zonePattern} label={g.zoneLabel || "zone"} />
            </div>
            <Field
              label="Zone dropdown options"
              error={e("zoneOptions")}
              optional
              hint={
                zones.ok && zones.options.length
                  ? `${zones.options.length} option${zones.options.length === 1 ? "" : "s"} — customers pick from a list.`
                  : "One per line as value|label, e.g. os_asia|Asia. Leave empty for a free-text zone."
              }
            >
              <Textarea value={g.zoneOptions} rows={3} spellCheck={false} className="font-mono text-sm" onChange={(ev) => setGame({ zoneOptions: ev.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <Switch label="Active" description="Shown in the store and can be ordered." checked={g.active} onChange={(v) => setGame({ active: v })} />
            <Switch label="Featured" description="Shown in the big cards on the home page." checked={g.featured} onChange={(v) => setGame({ featured: v })} />
            <Field label="Sort order" error={e("sortOrder")} hint="Lower numbers come first.">
              <Input value={g.sortOrder} inputMode="numeric" className="max-w-32" onChange={(ev) => setGame({ sortOrder: ev.target.value })} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Social</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Hashtags" error={e("hashtags")} optional hint="Added to generated Facebook/TikTok captions, e.g. #MLBB #MobileLegends">
              <Textarea value={g.hashtags} maxLength={300} rows={2} onChange={(ev) => setGame({ hashtags: ev.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="items-start">
          <div>
            <CardTitle>Packages & prices</CardTitle>
            <p className="mt-0.5 text-sm text-muted">Prices in USD. The cheapest active package is the “from” price.</p>
          </div>
        </CardHeader>
        <CardContent>
          <PackagesEditor
            packages={values.packages}
            onChange={(packages) => setValues((v) => ({ ...v, packages }))}
            errors={errors}
            currencyName={g.currencyName || "Diamonds"}
          />
        </CardContent>
      </Card>

      {/* Sticky save bar: always reachable on long pages and phones. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className={cn("min-w-0 flex-1 truncate text-sm", dirty ? "text-warning" : "text-muted")} aria-live="polite">
            {Object.keys(errors).length > 0
              ? "Fix the highlighted fields"
              : dirty
                ? "Unsaved changes"
                : gameId === null
                  ? "New game"
                  : "All changes saved"}
          </p>
          {dirty && gameId !== null && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setValues(baseline);
                setErrors({});
                setSlugTouched(true);
              }}
              disabled={pending}
            >
              Discard
            </Button>
          )}
          <Button type="submit" loading={pending} disabled={!dirty && gameId !== null}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {gameId === null ? "Create game" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
