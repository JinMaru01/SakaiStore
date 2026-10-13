"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  fail,
  fieldErrorsFromZod,
  formString,
  isUniqueViolation,
  type ActionState,
  type FieldErrors,
} from "@/lib/admin/forms";
import {
  gameFormSchema,
  gameToFormValues,
  packagesFormSchema,
  packageToFormValues,
  type GameEditorValues,
} from "@/lib/admin/game-schema";
import {
  deleteGame,
  getAdminGame,
  isDbId,
  isSlugTaken,
  moveGame,
  saveGame,
  setGameFlag,
  StalePackagesError,
} from "@/lib/admin/games";
import { requireAdmin } from "@/lib/auth";

export type SaveGameResult =
  | { status: "success"; message: string; at: number; id: number; values: GameEditorValues }
  | { status: "error"; message: string; fieldErrors?: FieldErrors; at: number };

/** Games change the storefront (home grid, game pages, OG images) as well as the admin. */
function revalidateCatalog() {
  revalidatePath("/", "layout");
}

const prefixed = (prefix: string, errors: FieldErrors): FieldErrors =>
  Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${prefix}${k}`, v]));

/**
 * Create (gameId = null) or update a game together with its full package
 * list. Returns the saved values (packages now carry their DB ids) so the
 * editor can continue from the stored state.
 */
export async function saveGameAction(gameId: number | null, values: GameEditorValues): Promise<SaveGameResult> {
  await requireAdmin();
  if (gameId !== null && !isDbId(gameId)) return { status: "error", message: "Unknown game.", at: Date.now() };

  const game = gameFormSchema.safeParse(values?.game);
  const packages = packagesFormSchema.safeParse(values?.packages);
  if (!game.success || !packages.success) {
    const fieldErrors: FieldErrors = {
      ...(game.success ? {} : fieldErrorsFromZod(game.error)),
      ...(packages.success ? {} : prefixed("packages.", fieldErrorsFromZod(packages.error))),
    };
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors, at: Date.now() };
  }

  const slugError = { slug: "Another game already uses this slug" };
  if (await isSlugTaken(game.data.slug, gameId)) {
    return { status: "error", message: "That slug is taken.", fieldErrors: slugError, at: Date.now() };
  }

  let id: number | null;
  try {
    id = await saveGame(gameId, game.data, packages.data);
  } catch (err) {
    if (err instanceof StalePackagesError) {
      return {
        status: "error",
        message: "Packages were changed somewhere else (another tab?). Reload the page and try again.",
        at: Date.now(),
      };
    }
    if (isUniqueViolation(err)) {
      return { status: "error", message: "That slug is taken.", fieldErrors: slugError, at: Date.now() };
    }
    console.error("[admin] saving game failed", err);
    return { status: "error", message: "Could not save the game. Please try again.", at: Date.now() };
  }
  if (id === null) return { status: "error", message: "This game no longer exists.", at: Date.now() };

  revalidateCatalog();
  const saved = await getAdminGame(id);
  if (!saved) return { status: "error", message: "This game no longer exists.", at: Date.now() };
  return {
    status: "success",
    message: gameId === null ? "Game created." : "Changes saved.",
    at: Date.now(),
    id,
    values: { game: gameToFormValues(saved), packages: saved.packages.map(packageToFormValues) },
  };
}

/** Delete after the owner typed the slug. Restricted promo codes are deactivated (see deleteGame). */
export async function deleteGameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const gameId = Number(formString(formData, "gameId"));
  const game = isDbId(gameId) ? await getAdminGame(gameId) : null;
  if (!game) return fail("This game no longer exists.");
  if (formString(formData, "confirmSlug").trim().toLowerCase() !== game.slug) {
    return fail("The slug you typed does not match.", { confirmSlug: `Type ${game.slug} to confirm` });
  }
  try {
    await deleteGame(game.id);
  } catch (err) {
    console.error("[admin] deleting game failed", err);
    return fail("Could not delete the game. Please try again.");
  }
  revalidateCatalog();
  redirect("/admin/games?flash=game_deleted");
}

const flagSchema = z.object({
  gameId: z.coerce.number().int().positive(),
  flag: z.enum(["active", "featured"]),
  value: z.enum(["true", "false"]),
});

/** Inline Active / Featured switches on the games list. */
export async function toggleGameFlagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = flagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setGameFlag(parsed.data.gameId, parsed.data.flag, parsed.data.value === "true");
  revalidateCatalog();
}

const moveSchema = z.object({
  gameId: z.coerce.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

/** Up/down buttons on the games list (storefront order). */
export async function moveGameAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = moveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await moveGame(parsed.data.gameId, parsed.data.direction);
  revalidateCatalog();
}
