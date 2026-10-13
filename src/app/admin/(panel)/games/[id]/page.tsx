import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeleteGameForm } from "@/components/admin/game-controls";
import { GameEditor } from "@/components/admin/game-editor";
import { PageHeader } from "@/components/admin/page-header";
import { FlashToast } from "@/components/admin/toast";
import { buttonClasses, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { flashMessage } from "@/lib/admin/flash";
import { gameToFormValues, packageToFormValues } from "@/lib/admin/game-schema";
import { countPromosForGame, getAdminGame } from "@/lib/admin/games";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { deleteGameAction, saveGameAction } from "../actions";

export const metadata: Metadata = { title: "Edit game" };

export default async function EditGamePage(props: PageProps<"/admin/games/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const gameId = /^\d{1,10}$/.test(id) ? Number(id) : NaN;
  const game = Number.isSafeInteger(gameId) ? await getAdminGame(gameId) : null;
  if (!game) notFound();
  const promoCount = await countPromosForGame(game.id);

  return (
    <>
      <FlashToast message={flashMessage(sp.flash)} />
      <PageHeader
        back={{ href: "/admin/games", label: "Games & Prices" }}
        title={game.name}
        description={`${game.packages.length} package${game.packages.length === 1 ? "" : "s"} · ${game.active ? "visible in the store" : "hidden from the store"}`}
        actions={
          game.active ? (
            <a href={`/games/${game.slug}`} target="_blank" rel="noopener" className={buttonClasses("secondary", "md")}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View in store
            </a>
          ) : undefined
        }
      />
      {/* key: a fresh editor when navigating between games */}
      <GameEditor
        key={game.id}
        gameId={game.id}
        initial={{ game: gameToFormValues(game), packages: game.packages.map(packageToFormValues) }}
        save={saveGameAction}
        siteUrl={siteUrl()}
      />
      <Card className="mt-4 border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteGameForm action={deleteGameAction} gameId={game.id} slug={game.slug} promoCount={promoCount} />
        </CardContent>
      </Card>
    </>
  );
}
