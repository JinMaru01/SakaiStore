# Sakai Store — notes for Claude Code

@AGENTS.md

Game top-up web portal for Cambodia (Next.js 16 + Postgres/Drizzle + KHQR + Telegram),
promoted via a Facebook Page and TikTok. **Read `docs/ARCHITECTURE.md` before changing code** —
it defines the module contracts, order state machine, API shapes and conventions.

Key rules:
- Money is integer USD cents; the server always recomputes prices.
- Order status changes only through `src/lib/orders/service.ts` (conditional UPDATEs, idempotent side effects).
- Customer-facing text goes through i18n (`src/i18n/messages/*`, en + km with identical keys). Admin is English-only.
- Use `env()` from `@/lib/env`, shared UI from `@/components/ui`, semantic Tailwind tokens from `globals.css`.
- Admin pages/actions/routes must call `requireAdmin()` / `requireAdminApi()`.
- Cache Components is off; `params`/`searchParams`/`cookies()` are async (Next 16).

Local dev: `cp .env.example .env`, start Postgres (`docker compose up -d db`), `npm run db:setup`, `npm run dev`.
Checks: `npm run typecheck && npm run lint && npm test && npm run build`.
