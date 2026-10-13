import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { OG_FONT } from "./primitives";

/**
 * Shared PNG renderer for Open Graph images and promo images (Satori via
 * next/og). Fonts are Latin woff subsets of Kantumruy Pro (the site's body
 * font) copied to src/assets/fonts — Satori cannot shape Khmer anyway, so
 * every image is English + numbers (see src/lib/marketing/og-text.ts).
 */

const FONT_FILES = [
  [400, "kantumruy-pro-latin-400-normal.woff"],
  [600, "kantumruy-pro-latin-600-normal.woff"],
  [700, "kantumruy-pro-latin-700-normal.woff"],
] as const;

type OgFont = { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" };

let fontsPromise: Promise<OgFont[]> | null = null;

/** Read once per server instance (production file tracing: see docs/SOCIAL_MEDIA_PLAYBOOK.md → Deployment). */
export function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_FILES.map(async ([weight, file]) => ({
        name: OG_FONT,
        data: await readFile(join(process.cwd(), "src", "assets", "fonts", file)),
        weight,
        style: "normal" as const,
      })),
    );
    // Do not cache a failure (e.g. a transient FS error) forever.
    fontsPromise.catch(() => {
      fontsPromise = null;
    });
  }
  return fontsPromise;
}

export type RenderOptions = {
  width: number;
  height: number;
  headers?: Record<string, string>;
};

/**
 * Render to a fully buffered PNG response. ImageResponse streams and would
 * report Satori errors only after a 200 status was sent; buffering lets the
 * caller catch them and answer with a proper error (or a fallback image).
 */
export async function renderPng(element: ReactElement, { width, height, headers = {} }: RenderOptions): Promise<Response> {
  const fonts = await loadOgFonts();
  const image = new ImageResponse(element, { width, height, fonts });
  const body = await image.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: { "content-type": "image/png", "content-length": String(body.byteLength), ...headers },
  });
}

/** Public, CDN-cacheable: link previews are crawled in bursts when a post goes viral. */
export const PUBLIC_IMAGE_CACHE = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";
