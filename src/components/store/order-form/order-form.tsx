"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { PublicOrder } from "@/lib/orders/public";
import { track } from "@/lib/tracking/client";
import { apiRequest, errorMessage } from "../api";
import {
  addRecentOrder,
  parsePlayerMemory,
  parseRecentOrders,
  playerMemoryKey,
  RECENT_ORDERS_KEY,
} from "../recent-orders";
import { storageGet, storageRemove, storageSet, useStoredString } from "../storage";
import { AccountStep } from "./account-step";
import { ContactStep, PHONE_RE, TELEGRAM_RE } from "./contact-step";
import { MobileBar, ORDER_FORM_ID, SummaryCard, type SummaryProps } from "./order-summary";
import { PackageGrid } from "./package-grid";
import { PromoStep } from "./promo-step";
import { promoSubmitMessage } from "./promo-text";
import {
  lookupOutcome,
  minOrderFrom,
  type FollowTerms,
  type FormGame,
  type FormPackage,
  type LookupState,
  type PlayerLookupResponse,
  type PromoState,
  type PromoValidateResponse,
} from "./types";
import {
  normalizePlayerId,
  normalizeZoneId,
  splitIdAndZone,
  usesZone,
  validatePlayerIdField,
  validateZoneField,
} from "./validation";

type Props = {
  game: FormGame;
  packages: FormPackage[];
  khrPerUsd: number;
  /** Follower promo code advertised on Facebook/TikTok (settings.marketing.followPromoCode). */
  followCode: string;
  /** Its conditions (minimum order, first top-up only), shown next to the code. */
  followTerms?: FollowTerms | null;
  /** A player-name lookup provider is configured (PLAYER_LOOKUP_MODE ≠ none). */
  nameLookup: boolean;
  /** Promo code from the shared link (?promo=CODE), applied once a package is picked. */
  initialPromo?: string;
  /** Extra content rendered under the steps (share bar, game description). */
  children?: React.ReactNode;
};

type ServerField = { field: "playerId" | "zoneId"; error: string } | null;

const PROMO_PREFIX = "promo_";
const FORM_ID = ORDER_FORM_ID;

export function OrderForm({
  game,
  packages,
  khrPerUsd,
  followCode,
  followTerms,
  nameLookup,
  initialPromo = "",
  children,
}: Props) {
  const t = useT();
  const router = useRouter();
  const hasZone = usesZone(game);

  // ── Player id / zone (prefilled from the last order on this device) ──
  const memoryKey = playerMemoryKey(game.slug);
  const remembered = parsePlayerMemory(useStoredString(memoryKey));
  const [idInput, setIdInput] = useState<string | null>(null);
  const [zoneInput, setZoneInput] = useState<string | null>(null);
  const playerId = idInput ?? remembered?.playerId ?? "";
  const zoneId = zoneInput ?? (hasZone ? (remembered?.zoneId ?? "") : "");
  const usingMemory = idInput === null && !!remembered;

  const [touched, setTouched] = useState({ playerId: false, zoneId: false });
  const [submitted, setSubmitted] = useState(false);
  const [serverField, setServerField] = useState<ServerField>(null);

  const idIssue = validatePlayerIdField(playerId, game.idPattern);
  const zoneIssue = validateZoneField(zoneId, game);
  const normId = normalizePlayerId(playerId);
  const normZone = hasZone ? normalizeZoneId(zoneId) : "";

  const [lookup, setLookup] = useState<LookupState | null>(null);
  const lookupKey = `${normId}|${normZone}`;
  const currentLookup = lookup?.key === lookupKey ? lookup : null;
  const playerName = currentLookup?.status === "ok" ? currentLookup.playerName : null;

  // ── Package / promo / contact ──
  const [packageId, setPackageId] = useState<number | null>(null);
  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const [packageError, setPackageError] = useState(false);
  const [promoInput, setPromoInput] = useState(initialPromo.toUpperCase().slice(0, 32));
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });
  // A promo error the customer was already told about at checkout: the next Pay continues without the code.
  const [ackedPromoError, setAckedPromoError] = useState<PromoState | null>(null);
  const autoApplyPromo = useRef(!!initialPromo);
  const promoRequest = useRef(0);
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const minPrice = useMemo(
    () => (packages.length ? Math.min(...packages.map((p) => p.priceCents)) : 0),
    [packages],
  );

  useEffect(() => {
    track("ViewContent", { contentId: game.slug, contentName: game.name, value: minPrice / 100, currency: "USD" });
  }, [game.slug, game.name, minPrice]);

  // ── handlers ──

  function onPlayerIdChange(v: string) {
    setServerField(null);
    // "123456789 (1234)" pasted into the id field: split into id + zone.
    const split = hasZone ? splitIdAndZone(v) : null;
    if (split && !game.zoneOptions?.length) {
      setIdInput(split.id);
      setZoneInput(split.zone);
      return;
    }
    setIdInput(v);
    if (zoneInput === null && remembered) setZoneInput(remembered.zoneId);
  }

  function onZoneChange(v: string) {
    setServerField(null);
    if (idInput === null && remembered) setIdInput(remembered.playerId);
    setZoneInput(v);
  }

  function onForget() {
    storageRemove(memoryKey);
    setIdInput("");
    setZoneInput("");
    setLookup(null);
  }

  async function checkName() {
    setTouched({ playerId: true, zoneId: true });
    if (idIssue || zoneIssue) return;
    const key = lookupKey;
    setLookup({ key, status: "loading" });
    const res = await apiRequest<PlayerLookupResponse>("/api/players/lookup", {
      body: { gameSlug: game.slug, playerId: normId, zoneId: normZone || undefined },
    });
    setLookup((prev) => {
      if (prev?.key !== key) return prev; // inputs changed meanwhile
      if (!res.ok) return { key, status: "error", error: res.error };
      const outcome = lookupOutcome(res.data);
      return { key, status: "ok", outcome, playerName: outcome === "found" ? res.data.playerName : null };
    });
  }

  // The player the promo is checked for, once the ID (and zone) are well-formed: first-order codes
  // depend on it, so the "first top-up only" error shows before checkout instead of at Pay.
  const promoPlayerKey = !idIssue && !zoneIssue ? lookupKey : "";

  async function validatePromo(code: string, forPackage: FormPackage) {
    const normalized = code.replace(/\s+/g, "").toUpperCase();
    if (!normalized) return;
    const req = ++promoRequest.current;
    const playerKey = promoPlayerKey;
    setPromo({ status: "loading", code: normalized });
    const res = await apiRequest<PromoValidateResponse>("/api/promo/validate", {
      body: {
        code: normalized,
        gameSlug: game.slug,
        packageId: forPackage.id,
        ...(playerKey ? { playerId: normId, zoneId: normZone || undefined } : {}),
      },
    });
    if (req !== promoRequest.current) return; // a newer request superseded this one
    if (res.ok) {
      setPromo({
        status: "applied",
        code: res.data.code ?? normalized,
        packageId: forPackage.id,
        discountCents: res.data.discountCents,
        description: res.data.description ?? null,
        playerKey,
      });
      setPromoInput(res.data.code ?? normalized);
    } else {
      setPromo({ status: "error", code: normalized, error: res.error, minOrderCents: minOrderFrom(res.body) });
    }
  }

  /** After the ID or zone changes, re-check a code that was checked for another player (first-order rule). */
  function recheckPromoForPlayer() {
    if (!pkg || !promoPlayerKey) return;
    if (promo.status === "applied" && promo.playerKey !== promoPlayerKey) void validatePromo(promo.code, pkg);
    else if (promo.status === "error" && promo.error === "first_order_only") void validatePromo(promo.code, pkg);
  }

  function selectPackage(p: FormPackage) {
    if (p.id === packageId) return;
    setPackageId(p.id);
    setPackageError(false);
    setSubmitError(null);
    track("AddToCart", {
      contentId: `${game.slug}:${p.id}`,
      contentName: `${game.name} - ${p.name}`,
      value: p.priceCents / 100,
      currency: "USD",
    });
    // Discounts depend on the subtotal (min order, caps): re-check the code for the new package,
    // including a code that failed only because no / too small a package was picked.
    const retry =
      promo.status === "error" && (promo.error === "need_package" || promo.error === "min_order") ? promoInput : "";
    const pending = promo.status === "applied" || promo.status === "loading" ? promo.code : retry;
    if (pending.trim()) {
      autoApplyPromo.current = false;
      void validatePromo(pending, p);
    } else if (autoApplyPromo.current && promoInput.trim()) {
      autoApplyPromo.current = false;
      void validatePromo(promoInput, p);
    }
  }

  function applyPromo() {
    if (!promoInput.trim()) return;
    if (!pkg) {
      // Applied automatically as soon as a package is picked.
      autoApplyPromo.current = true;
      setPromo({ status: "error", code: promoInput, error: "need_package" });
      setPackageError(true);
      return;
    }
    void validatePromo(promoInput, pkg);
  }

  function removePromo() {
    promoRequest.current++;
    setPromo({ status: "idle" });
    setPromoInput("");
  }

  function focusField(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setSubmitError(null);

    if (idIssue) return focusField("playerId");
    if (zoneIssue) return focusField("zoneId");
    if (!pkg) {
      setPackageError(true);
      document.getElementById("step-package")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if ((phone.trim() && !PHONE_RE.test(phone.trim())) || (telegram.trim() && !TELEGRAM_RE.test(telegram.trim()))) {
      return focusField(phone.trim() && !PHONE_RE.test(phone.trim()) ? "contactPhone" : "contactTelegram");
    }
    if (promo.status === "loading") return; // wait for the discount to settle

    // A code that failed in the promo step: say so once next to Pay (instead of silently charging the
    // full price); tapping Pay again continues without the code.
    if (promo.status === "error" && promo.error !== "need_package" && ackedPromoError !== promo) {
      setAckedPromoError(promo);
      setSubmitError(promoSubmitMessage(t, promo.error, promo.minOrderCents));
      document.getElementById("step-promo")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // An applied code, or one typed without tapping Apply (the server validates it either way).
    const typed = promo.status === "idle" ? promoInput.replace(/\s+/g, "").toUpperCase() : "";
    const promoCode =
      promo.status === "applied" && promo.packageId === pkg.id ? promo.code : typed || undefined;
    setSubmitting(true);
    const res = await apiRequest<{ order: PublicOrder }>("/api/orders", {
      body: {
        gameSlug: game.slug,
        packageId: pkg.id,
        playerId: normId,
        zoneId: normZone || undefined,
        playerName: playerName ?? undefined,
        promoCode,
        contactPhone: phone.trim() || undefined,
        contactTelegram: telegram.trim().replace(/^@/, "") || undefined,
      },
    });

    if (!res.ok) {
      setSubmitting(false);
      if (res.error.startsWith(PROMO_PREFIX)) {
        // The code can't be used (expired / used up / first top-up only / below the minimum).
        const failed: PromoState = {
          status: "error",
          code: promoCode ?? promoInput,
          error: res.error.slice(PROMO_PREFIX.length),
          minOrderCents: minOrderFrom(res.body),
        };
        setPromo(failed);
        setAckedPromoError(failed); // already explained here: Pay again continues without it
        setSubmitError(promoSubmitMessage(t, failed.error, failed.minOrderCents));
        return;
      }
      if (res.error === "invalid_id" || res.error === "invalid_zone") {
        const field = res.error === "invalid_id" ? "playerId" : "zoneId";
        setServerField({ field, error: res.error });
        return focusField(field);
      }
      setSubmitError(errorMessage(t, "game.errors", res.error));
      return;
    }

    const order = res.data.order;
    storageSet(memoryKey, JSON.stringify({ playerId: normId, zoneId: normZone }));
    storageSet(
      RECENT_ORDERS_KEY,
      JSON.stringify(
        addRecentOrder(parseRecentOrders(storageGet(RECENT_ORDERS_KEY)), {
          code: order.code,
          gameSlug: order.gameSlug,
          gameName: order.gameName,
          packageName: order.packageName,
          totalCents: order.totalCents,
          createdAt: order.createdAt,
        }),
      ),
    );
    track("InitiateCheckout", {
      contentId: `${game.slug}:${pkg.id}`,
      contentName: `${game.name} - ${pkg.name}`,
      value: order.totalCents / 100,
      currency: "USD",
      orderCode: order.code,
    });
    // Keep `submitting` on while navigating so the button cannot double-submit.
    router.push(`/orders/${order.code}`);
  }

  const discountCents = promo.status === "applied" && pkg && promo.packageId === pkg.id ? promo.discountCents : 0;
  const summary: SummaryProps = {
    game,
    pkg,
    playerId: normId,
    zoneId: normZone,
    playerName,
    promoCode: discountCents > 0 && promo.status === "applied" ? promo.code : null,
    discountCents,
    khrPerUsd,
    submitting,
    error: submitError,
  };


  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:gap-8">
      <div className="space-y-4 sm:space-y-5">
        <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4 sm:space-y-5">
          <AccountStep
            game={game}
            playerId={playerId}
            zoneId={zoneId}
            idIssue={touched.playerId || submitted ? idIssue : null}
            zoneIssue={touched.zoneId || submitted ? zoneIssue : null}
            serverField={serverField}
            lookup={currentLookup}
            nameLookup={nameLookup}
            remembered={usingMemory}
            onPlayerIdChange={onPlayerIdChange}
            onZoneChange={onZoneChange}
            onBlur={(f) => {
              setTouched((s) => ({ ...s, [f]: true }));
              recheckPromoForPlayer();
            }}
            onCheck={checkName}
            onForget={onForget}
          />
          <PackageGrid
            packages={packages}
            selectedId={packageId}
            khrPerUsd={khrPerUsd}
            error={packageError && !pkg}
            onSelect={selectPackage}
          />
          <PromoStep
            value={promoInput}
            state={promo}
            followCode={followCode}
            followTerms={followTerms}
            onChange={(v) => {
              setPromoInput(v);
              if (promo.status === "error") setPromo({ status: "idle" });
            }}
            onApply={applyPromo}
            onRemove={removePromo}
            onUseFollowCode={() => {
              setPromoInput(followCode);
              if (pkg) void validatePromo(followCode, pkg);
              else autoApplyPromo.current = true;
            }}
          />
          <ContactStep
            phone={phone}
            telegram={telegram}
            showErrors={submitted}
            onPhoneChange={setPhone}
            onTelegramChange={setTelegram}
          />
        </form>
        {children}
      </div>

      {/* The summary lives outside <form>; its Pay buttons submit via form={FORM_ID}. */}
      <div className="hidden lg:sticky lg:top-24 lg:block">
        <SummaryCard {...summary} />
      </div>
      <MobileBar {...summary} />
    </div>
  );
}
