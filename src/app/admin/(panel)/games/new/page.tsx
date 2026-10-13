import type { Metadata } from "next";
import { GameEditor } from "@/components/admin/game-editor";
import { PageHeader } from "@/components/admin/page-header";
import { EMPTY_GAME } from "@/lib/admin/game-schema";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { saveGameAction } from "../actions";

export const metadata: Metadata = { title: "New game" };

export default async function NewGamePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/games", label: "Games & Prices" }}
        title="New game"
        description="Fill in the game, add its packages, then create it. New games are visible right away when Active is on."
      />
      <GameEditor gameId={null} initial={{ game: EMPTY_GAME, packages: [] }} save={saveGameAction} siteUrl={siteUrl()} />
    </>
  );
}
