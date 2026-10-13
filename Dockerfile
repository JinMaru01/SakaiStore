# syntax=docker/dockerfile:1
#
# Sakai Store — production image (Next.js standalone output, non-root).
#
#   docker build -t sakaistore .                       # app image (target "runner")
#   docker build -t sakaistore-tools --target tools .  # migrations / seed / Telegram webhook
#
# docker-compose.yml wires both together with Postgres; see docs/DEPLOYMENT.md.

ARG NODE_IMAGE=node:22-alpine

# ── deps: install exactly what package-lock.json says ───────────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── builder: next build → .next/standalone ──────────────────────────────────
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
# NEXT_PUBLIC_* values are inlined into the JavaScript at build time: pass the
# pixel ids as build args (docker compose reads them from .env). Everything
# else (DATABASE_URL, secrets, NEXT_PUBLIC_SITE_URL) is read at run time.
ARG NEXT_PUBLIC_FB_PIXEL_ID=""
ARG NEXT_PUBLIC_TIKTOK_PIXEL_ID=""
ENV NEXT_PUBLIC_FB_PIXEL_ID=${NEXT_PUBLIC_FB_PIXEL_ID} \
    NEXT_PUBLIC_TIKTOK_PIXEL_ID=${NEXT_PUBLIC_TIKTOK_PIXEL_ID}
RUN npm run build

# ── tools: one-off jobs (npm run db:migrate / db:seed / telegram:webhook) ────
FROM ${NODE_IMAGE} AS tools
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json tsconfig.json drizzle.config.ts ./
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node src ./src
USER node
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed -- --if-empty"]

# ── runner: the web server ───────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# server.js + traced node_modules (incl. src/assets/fonts and the playbook,
# see outputFileTracingIncludes), then the static assets it serves.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
