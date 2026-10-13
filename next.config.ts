import type { NextConfig } from "next";

// Cache Components is intentionally OFF: nearly every page reads cookies
// (language, admin session) or live order/catalog data, so we use plain
// request-time rendering. Pages that touch the DB call `await connection()`
// (or read cookies) so they are never prerendered at build time.
const nextConfig: NextConfig = {
  // Docker/VPS builds set NEXT_OUTPUT=standalone to get a self-contained
  // `.next/standalone/server.js` (see Dockerfile). Plain `next start` and
  // Vercel use the default output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: ["bakong-khqr", "pg"],
  // OG images, the promo-image API and the admin playbook read these files at
  // runtime via readFile(process.cwd()/…); static tracing cannot see them.
  outputFileTracingIncludes: {
    "/*": ["./src/assets/fonts/**/*", "./docs/SOCIAL_MEDIA_PLAYBOOK.md"],
  },
  poweredByHeader: false,
  // Baseline hardening for every response. Nothing on this site is meant to
  // be framed (clickjacking on /admin), and pages never need camera/mic/GPS.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
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
