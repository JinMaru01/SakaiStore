import type { NextConfig } from "next";

// Cache Components is intentionally OFF: nearly every page reads cookies
// (language, admin session) or live order/catalog data, so we use plain
// request-time rendering. Pages that touch the DB call `await connection()`
// (or read cookies) so they are never prerendered at build time.
const nextConfig: NextConfig = {
  serverExternalPackages: ["bakong-khqr", "pg"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
