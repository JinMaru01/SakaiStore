# Sakai Store — game top-up for Cambodia 🇰🇭

Sakai Store is a mobile-first website for selling **game top-ups** (Mobile Legends diamonds,
Free Fire, PUBG Mobile UC, Honor of Kings, Genshin Impact, …) in Cambodia. Customers pay with
**KHQR** (ABA, ACLEDA, Wing or any Bakong app), the owner gets a **Telegram** alert with
✅ / ❌ buttons, and the whole shop is built to be **promoted on a Facebook Page and TikTok**.

It replaces a Telegram-bot-only shop with a real storefront while keeping Telegram for the
owner's alerts and customers' order updates.

```
Facebook / TikTok post ──▶ /games/mobile-legends?promo=TIKTOK5 ──▶ enter ID ▸ pick package ▸ Pay with KHQR
                                                                         │
             customer scans with ABA / ACLEDA / Wing ◀── /orders/SK7F3K9Q2M (live status)
                                                                         │ paid (Bakong check)
                          owner taps ✅ Delivered in Telegram ◀── 💰 New paid order alert
```

> **Prices in the seed data are samples.** Set your real prices in `/admin/games` before launch.

---

## Features

### Storefront (English + ខ្មែរ)
- Home with popular games, "from $x" prices, how-it-works, payment methods, FAQ.
- Game page: Player ID + Zone (paste `123456789 (1234)` and it splits), nickname check,
  package cards with bonus/“was” prices and KHR estimate, promo codes, optional contact.
- Order page: official-style **KHQR** with countdown, *Download QR* (plus press-and-hold
  fallback for Facebook/TikTok in-app browsers), automatic payment confirmation (no
  screenshots), live Paid → Delivering → Delivered progress, cancel, support buttons.
- Track an order by code, recent orders on this device, language switch, accessible forms,
  works at 360 px wide.

### Payments & orders
- Bakong KHQR (dynamic, USD, order code as bill number) and the Bakong Open API
  `check_transaction_by_md5`; amount/currency/account are verified before an order is paid.
- Strict order state machine with race-safe conditional updates (polling, cron, Telegram and
  admin clicks can't double-apply), late-payment handling, reconcile cron.
- `PAYMENT_MODE=mock` for demos and tests (simulate-payment button).

### Telegram
- Paid-order alerts to every admin chat with ✅ Delivered / ❌ Failed buttons, kept in sync
  across admins; `/orders`, `/order <code>`, `/stats` for the owner.
- Customers tap *Get updates on Telegram* to receive status messages in English or Khmer.

### Admin (`/admin`)
- Dashboard (revenue, conversion, needs-delivery queue, sales by channel, top games).
- Orders: filters, search by code/player/phone, CSV export, full timeline, deliver/fail/refund/
  manual mark-paid.
- Games & packages editor (prices, badges, ID rules with a live tester), promo codes, store /
  social settings, integration status.

### Facebook & TikTok promotion
- **Link previews**: generated Open Graph images for the site and every game
  ("from $x", best packages) so shared links look great on Facebook, Messenger, Telegram and
  in the TikTok bio.
- **Marketing studio** (`/admin/marketing`): downloadable price-list posters
  (square / portrait / TikTok story) with your promo code, a caption generator
  (Facebook post, TikTok caption, video script — English & Khmer, with tracked links),
  a UTM link builder and a setup checklist.
- **Attribution**: every order records where the customer came from (Facebook, TikTok,
  Telegram, Google…) via UTM tags, click ids and channel promo codes (`FB5`, `TIKTOK5`);
  channel analytics show orders, revenue and conversion per channel.
- **Meta Pixel & TikTok Pixel** (optional): ViewContent, AddToCart, InitiateCheckout,
  Purchase/CompletePayment with the order code as event id; never loaded on /admin.
- Share bar (Facebook, Messenger, Telegram, copy, native share), "Follow us" section with the
  follower promo code, floating Messenger/Telegram chat button.
- **[Social media playbook](docs/SOCIAL_MEDIA_PLAYBOOK.md)**: Page/TikTok setup, pixels,
  content pillars, a 4-week posting calendar (`docs/marketing/content-calendar.csv`),
  captions, hashtags, video scripts, a small-budget ads plan — also readable at
  `/admin/marketing/playbook`.

---

## Screenshots

_To add (save in `docs/screenshots/`):_

1. Home page on a phone (`home-mobile.png`)
2. Game page with nickname check and promo applied (`game-mobile.png`)
3. KHQR payment page with countdown (`order-khqr.png`)
4. Delivered order (`order-delivered.png`)
5. Khmer language version (`home-km.png`)
6. Admin dashboard (`admin-dashboard.png`)
7. Marketing studio: poster + captions (`admin-marketing.png`)
8. Generated TikTok story poster (`promo-story.png`)
9. Telegram paid-order alert with ✅ / ❌ (`telegram-alert.png`)

---

## Quick start (local)

Requirements: **Node.js 20.9+** (22 recommended), **PostgreSQL 16** (or Docker).

```bash
npm install
cp .env.example .env               # defaults work for local dev (PAYMENT_MODE=mock)
docker compose up -d db            # Postgres on localhost:5432 (user/pass/db: sakai/sakai/sakaistore)
npm run db:setup                   # migrate + seed the sample catalog
npm run dev                        # http://localhost:3000
```

- Admin: http://localhost:3000/admin — the password is `ADMIN_PASSWORD` from `.env`.
- Set `PLAYER_LOOKUP_MODE=mock` to see fake nicknames, and use **Simulate payment** on the
  order page to "pay" in mock mode.
- Telegram is optional locally; see [docs/TELEGRAM.md](docs/TELEGRAM.md).

### Tests

```bash
docker compose exec db createdb -U sakai sakaistore_test   # once (any Postgres works)
npm run typecheck && npm run lint
npm test                      # Vitest: unit + DB integration tests (sakaistore_test)
npm run build
npm run test:e2e              # Playwright, mobile + desktop, against `next start` on :3100
```

The e2e tests need a migrated + seeded database in `DATABASE_URL`, `PAYMENT_MODE=mock`,
`PLAYER_LOOKUP_MODE=mock`, and `ADMIN_PASSWORD` matching `E2E_ADMIN_PASSWORD`
(default `admin123`). Install the browser once with `npx playwright install chromium`.

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Insert missing sample games, promo codes and settings (`-- --if-empty`, `-- --reset`) |
| `npm run db:setup` | `db:migrate` + `db:seed` |
| `npm run db:studio` | Drizzle Studio (browse the database) |
| `npm run telegram:webhook` | Register the Telegram webhook + bot commands (`-- --info`, `-- --delete`) |

---

## Project structure

```
src/
  app/
    (store)/              customer site: home, games/[slug], orders/[code], track, faq, terms, privacy
    admin/                login + protected panel: dashboard, orders, games, promos, settings, marketing
    api/                  orders, players/lookup, promo/validate, cron/reconcile, telegram/webhook,
                          promo-image/[slug], health
    opengraph-image.tsx   site link preview (+ one per game), sitemap.ts, robots.ts, manifest.ts
  components/             ui primitives, store, social, marketing (pixels, OG cards, studio), admin
  db/                     Drizzle schema + client
  i18n/                   English/Khmer messages and helpers
  lib/                    catalog, orders (state machine, pricing, service), payments (KHQR, Bakong),
                          players, fulfillment, notify + telegram, marketing, tracking, admin, auth, env
  proxy.ts                signed-out admin deep links → /admin/login?next=…
drizzle/                  SQL migrations
scripts/                  migrate, seed, set-telegram-webhook
tests/                    integration tests (core, telegram) and Playwright e2e
docs/                     architecture, deployment, Telegram, social media playbook, content calendar
Dockerfile, docker-compose.yml, vercel.json, .github/workflows/
```

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: module contracts, order lifecycle, API, conventions.
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Vercel + Neon/Supabase, Docker/VPS, Bakong KHQR go-live, cron, env reference.
- **[docs/TELEGRAM.md](docs/TELEGRAM.md)**: bot setup, admin chat ids, webhook, daily use.
- **[docs/SOCIAL_MEDIA_PLAYBOOK.md](docs/SOCIAL_MEDIA_PLAYBOOK.md)**: growing the shop on Facebook and TikTok.

## Tech stack

Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS v4 · PostgreSQL + Drizzle ORM ·
zod · `bakong-khqr` · Telegram Bot API · Vitest · Playwright.

## Notes

- Game names and logos are trademarks of their publishers. The site renders generated tiles
  instead of official art; Sakai Store is an independent reseller.
- Money is stored as integer USD cents and always recomputed on the server.
