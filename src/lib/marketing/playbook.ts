import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The social media playbook lives in the repo (docs/) and is rendered at /admin/marketing/playbook. */
export const PLAYBOOK_FILE = join("docs", "SOCIAL_MEDIA_PLAYBOOK.md");

let cached: string | null = null;

/** Markdown source, or null when the file is not deployed (see the playbook's Deployment notes). */
export async function loadPlaybook(): Promise<string | null> {
  if (cached && process.env.NODE_ENV === "production") return cached;
  try {
    const text = await readFile(join(process.cwd(), PLAYBOOK_FILE), "utf8");
    cached = text;
    return text;
  } catch (err) {
    console.error("[playbook] could not read", PLAYBOOK_FILE, err);
    return null;
  }
}
