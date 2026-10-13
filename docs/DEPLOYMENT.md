# Deploying Sakai Store

Two supported ways to run the shop in production:

| | **A. Vercel + managed Postgres** | **B. Docker on a VPS** |
|---|---|---|
| Good for | Zero server maintenance, automatic HTTPS, preview deploys | Fixed monthly cost, a server in Singapore/Cambodia, full control |
| Database | Neon or Supabase (Singapore region) | Postgres 16 container with a volume (included) |
| Payment cron | Vercel Cron (Pro) or the included GitHub Action / any pinger | Included `cron` container |
| You manage | Env vars | OS updates, backups, TLS proxy |

Whichever you pick, finish with the **[go-live checklist](#5-go-live-checklist)** — especially
switching `PAYMENT_MODE` to `bakong`.

Contents:
1. [Before you start](#1-before-you-start)
2. [Option A — Vercel + Neon/Supabase](#2-option-a--vercel--neon-or-supabase)
3. [Option B — Docker / VPS](#3-option-b--docker-on-a-vps)
4. [Bakong KHQR go-live](#4-bakong-khqr-go-live)
5. [Go-live checklist](#5-go-live-checklist)
6. [Telegram webhook](#6-telegram-webhook)
7. [Payment reconcile cron](#7-payment-reconcile-cron)
8. [Environment variable reference](#8-environment-variable-reference)
9. [Operations: backups, updates, monitoring](#9-operations)

---

## 1. Before you start

You need:

- A **domain** (e.g. `sakaistore.com`). Facebook/TikTok link previews, the Meta/TikTok
  pixels and Telegram buttons all need the real public `https://` address.
- A **Bakong account** that can receive KHQR payments (see [section 4](#4-bakong-khqr-go-live)).
- A **Telegram bot** for paid-order alerts ([docs/TELEGRAM.md](TELEGRAM.md)).
- Two long random secrets:

  ```bash
  openssl rand -base64 32   # AUTH_SECRET  (signs admin sessions)
  openssl rand -hex 32      # CRON_SECRET and TELEGRAM_WEBHOOK_SECRET (one each)
  ```

> The seeded catalog uses **sample prices**. Set your real prices in `/admin/games`
> before you share the site.

---

## 2. Option A — Vercel + Neon or Supabase

### 2.1 Database

**Neon** (neon.tech) → New project → region **AWS Asia Pacific (Singapore)**. Copy the
**pooled** connection string (host contains `-pooler`), e.g.

```
postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**Supabase** (supabase.com) → New project → region **Southeast Asia (Singapore)** →
Project Settings → Database → *Connection string* → **Transaction pooler** (port 6543).

Both need TLS: set `DATABASE_SSL=true`. Keep the pool small on serverless
(`DATABASE_POOL_MAX=3`) — every function instance opens its own pool.

### 2.2 Create the tables and sample catalog (once, from your computer)

```bash
DATABASE_URL="postgresql://…pooler…?sslmode=require" DATABASE_SSL=true npm run db:setup
```

`db:setup` = `db:migrate` (safe to re-run) + `db:seed` (inserts the sample games, promo codes
and social links only where missing). Later schema changes only need `npm run db:migrate`.
To migrate automatically on every deploy instead, set Vercel's **Build Command** to
`npm run db:migrate && npm run build`.

### 2.3 Import the project

1. Push the repository to GitHub, then Vercel → **Add New… → Project** → import it.
   Framework preset: **Next.js** (defaults are fine).
2. **Environment Variables** (Production): everything marked *required* in the
   [reference](#8-environment-variable-reference) — at least `DATABASE_URL`, `DATABASE_SSL=true`,
   `DATABASE_POOL_MAX=3`, `NEXT_PUBLIC_SITE_URL=https://your-domain`, `AUTH_SECRET`,
   `ADMIN_PASSWORD`, `CRON_SECRET`, the Bakong and Telegram variables.
3. Deploy, then **Settings → Domains** → add your domain and follow the DNS instructions.
   Update `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy.

`vercel.json` pins functions to **Singapore (`sin1`)** — closest to Cambodia and to the
Singapore database — and registers the payment cron.

### 2.4 Cron on Vercel — plan limits

`vercel.json` schedules `GET /api/cron/reconcile` every 5 minutes. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.

- **Pro**: works as is.
- **Hobby**: cron jobs may run **at most once a day**, and a deploy with a more frequent
  schedule is rejected. Either change the schedule in `vercel.json` to `"0 0 * * *"` and
  use one of the [external schedulers](#7-payment-reconcile-cron) for the 5-minute run, or
  remove the `crons` block entirely. The included GitHub Action
  (`.github/workflows/reconcile-cron.yml`) is the easiest free option.

Customers who keep the order page open are confirmed by the page's own polling; the cron
catches people who paid and then closed the page.

---

## 3. Option B — Docker on a VPS

Any 1 vCPU / 1–2 GB RAM Linux server with Docker works (a Singapore region keeps latency to
Cambodia low).

### 3.1 First start

```bash
git clone <your repo> sakaistore && cd sakaistore
cp .env.example .env
nano .env        # fill in secrets — see the reference below
#   NEXT_PUBLIC_SITE_URL=https://your-domain
#   POSTGRES_PASSWORD=<long random>     (used by the db container and DATABASE_URL)
#   APP_PORT=127.0.0.1:3000             (only the reverse proxy can reach the app)
docker compose up -d --build
docker compose ps        # db healthy, migrate exited (0), app healthy, cron up
```

What `docker-compose.yml` runs:

| Service | What it does |
|---|---|
| `db` | Postgres 16, data in the `pgdata` volume, published on `127.0.0.1:5432` only |
| `migrate` | One-off (`Dockerfile` target `tools`): `npm run db:migrate`, then seeds the sample catalog **only if the database has no games yet** (`db:seed -- --if-empty`), so games you delete in /admin never come back |
| `app` | The website: Next.js standalone server on port 3000 as the non-root `node` user, with a `HEALTHCHECK` on `/api/health` |
| `cron` | Calls `/api/cron/reconcile` every minute with `CRON_SECRET` |

`DATABASE_URL` inside the containers is built from `POSTGRES_USER/PASSWORD/DB` and always
points at the `db` service; the value in `.env` is only used by `npm run` on the host.

**Pixel ids are build-time values**: after changing `NEXT_PUBLIC_FB_PIXEL_ID` or
`NEXT_PUBLIC_TIKTOK_PIXEL_ID`, run `docker compose up -d --build`.

### 3.2 HTTPS reverse proxy

Run a TLS proxy on the host in front of port 3000. **Caddy** (automatic Let's Encrypt):

```caddyfile
# /etc/caddy/Caddyfile
sakaistore.com, www.sakaistore.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

**nginx**: make the proxy *overwrite* `X-Forwarded-For` — the app rate-limits by the first
address in it, and an appended header would let clients spoof it:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Behind **Cloudflare**, use Cloudflare Tunnel or restrict the origin to Cloudflare IPs.
Never expose port 3000 directly — set `APP_PORT=127.0.0.1:3000`.

### 3.3 Useful commands

```bash
docker compose logs -f app                                  # live logs
docker compose run --rm migrate                             # re-run migrations
docker compose run --rm migrate npm run db:seed             # add missing sample games/promos
docker compose run --rm migrate npm run telegram:webhook    # register the Telegram webhook
docker compose exec db psql -U sakai sakaistore             # SQL shell
```

### 3.4 Without Docker (plain Node 20.9+ / 22)

```bash
npm ci && npm run build && npm run db:setup
NODE_ENV=production npm run start -- -p 3000   # keep alive with systemd or pm2
```

For a self-contained build, `NEXT_OUTPUT=standalone npm run build` produces
`.next/standalone/server.js`; copy `public/` and `.next/static/` next to it (the Dockerfile
shows the exact layout) and run `node server.js`.

---

## 4. Bakong KHQR go-live

Locally and in demos the shop runs with `PAYMENT_MODE=mock`: a valid-looking KHQR for a demo
account plus a **Simulate payment** button. **Never take real orders in mock mode** — anyone
can mark an order paid. (Paid-order alerts in Telegram are flagged "🧪 TEST payment" in that
mode, and `/admin/settings` shows a warning.)

1. **Bakong account id.** Open your bank app (ABA, ACLEDA, Wing…) or the Bakong app and find
   your **Bakong ID** (KHQR receiving account), e.g. `yourname@aclb`. This is
   `BAKONG_ACCOUNT_ID`. Set `BAKONG_MERCHANT_NAME` (max 25 characters, shown in the customer's
   bank app) and `BAKONG_MERCHANT_CITY` (max 15).
2. **API token.** Register at **https://api-bakong.nbc.gov.kh** with your email (the Bakong
   Open API registration). You receive a token by email: that is `BAKONG_API_TOKEN`.
   `BAKONG_API_BASE` stays `https://api-bakong.nbc.gov.kh`.
3. **Check the server can reach Bakong** (some hosting regions are blocked or slow). From
   the production server:

   ```bash
   curl -sS -m 10 -X POST https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5 \
     -H "Authorization: Bearer $BAKONG_API_TOKEN" -H "Content-Type: application/json" \
     -d '{"md5":"00000000000000000000000000000000"}'
   ```

   A JSON reply (e.g. `responseCode: 1`, transaction not found) means it works. A timeout,
   an HTML page or HTTP 401 (bad token) does not — fix that before launch.
4. **Switch modes**: `PAYMENT_MODE=bakong`, redeploy/restart. In this mode the
   simulate-payment endpoint returns 404, and cancelling first asks Bakong whether the order
   was paid.
5. **Real test**: buy the cheapest package with a real bank app. The order page should turn
   *Paid* within a few seconds, Telegram should alert you, and the order's payment reference
   should be the Bakong transaction hash.
6. **Renew the token before it expires.** Bakong tokens are time-limited (check the expiry
   date in the email or on the portal and put a reminder in your calendar). When the token
   expires, payment checks fail with HTTP 401 and the server logs
   `Bakong API token rejected … renew BAKONG_API_TOKEN`. Renew it on the portal, update
   `BAKONG_API_TOKEN`, and redeploy/restart. Payments made meanwhile are not lost: the cron
   re-checks orders (including recently expired ones) once the token works again.

The server only accepts a Bakong payment whose **amount, currency (USD) and receiving
account** match the order.

---

## 5. Go-live checklist

- [ ] `NEXT_PUBLIC_SITE_URL` is the final `https://` domain (OG images, sitemap, share links, Telegram buttons).
- [ ] `AUTH_SECRET` is a fresh random value (not the development default) and `ADMIN_PASSWORD` is long and unique.
- [ ] `PAYMENT_MODE=bakong` with `BAKONG_ACCOUNT_ID` + `BAKONG_API_TOKEN`; one real test payment done ([section 4](#4-bakong-khqr-go-live)).
- [ ] `FULFILLMENT_MODE=manual` (`mock` marks orders delivered without a real top-up).
- [ ] `PLAYER_LOOKUP_MODE=none` unless you have a real nickname provider (`mock` invents nicknames).
- [ ] `CRON_SECRET` set and the reconcile cron running ([section 7](#7-payment-reconcile-cron)).
- [ ] Telegram: bot token, username, admin chat ids, webhook secret, `npm run telegram:webhook` ([section 6](#6-telegram-webhook)).
- [ ] Real prices in `/admin/games`; promo codes reviewed in `/admin/promos`.
- [ ] `/admin/settings`: store name, support Telegram/phone, Facebook Page, TikTok, Messenger links, follower promo code. The *Integrations* card should show no warnings.
- [ ] Optional: Meta Pixel / TikTok Pixel ids (rebuild after setting), Facebook domain verification — see the [social media playbook](SOCIAL_MEDIA_PLAYBOOK.md).
- [ ] Review the Terms, Privacy and FAQ wording against how you actually operate.
- [ ] Paste a game link into Facebook's Sharing Debugger and Telegram to check the preview image.
- [ ] Backups scheduled ([section 9](#9-operations)).

---

## 6. Telegram webhook

Full guide: **[docs/TELEGRAM.md](TELEGRAM.md)**. In short, with the production values in
your environment:

```bash
npm run telegram:webhook            # registers https://<site>/api/telegram/webhook + command menus
npm run telegram:webhook -- --info  # shows what Telegram has registered
```

In production the webhook rejects every update unless `TELEGRAM_WEBHOOK_SECRET` is set.
A bot has exactly one webhook: use a separate bot for local testing.

---

## 7. Payment reconcile cron

`GET` (or `POST`) `/api/cron/reconcile` with header `Authorization: Bearer $CRON_SECRET`:

1. checks pending orders nobody is polling and recently expired orders (late payments) with Bakong;
2. expires unpaid orders 60 seconds after their QR window.

Run it every **1–5 minutes**. Without `CRON_SECRET` it answers 401 in production.

| Where you host | How |
|---|---|
| Vercel Pro | `vercel.json` (already configured, every 5 minutes) |
| Vercel Hobby | `.github/workflows/reconcile-cron.yml`: set repository **variable** `SITE_URL` and **secret** `CRON_SECRET`. GitHub can delay scheduled runs and pauses them after 60 days without repository activity; cron-job.org (free, supports custom headers) is an alternative. |
| Docker Compose | the `cron` service (every minute) |
| VPS without Docker | `crontab -e`: `* * * * * curl -fsS -m 50 -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/cron/reconcile > /dev/null` |

---

## 8. Environment variable reference

Configuration is validated at runtime by `src/lib/env.ts`; empty values count as unset.

### Core

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | local dev DB | Postgres connection string |
| `DATABASE_SSL` | managed DBs | `false` | `true` for Neon/Supabase/RDS (TLS) |
| `DATABASE_POOL_MAX` | | `10` | Use `3` on Vercel |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `http://localhost:3000` | Public https URL, no trailing slash. Read at run time |
| `AUTH_SECRET` | ✅ | dev value (warns) | ≥ 16 chars; `openssl rand -base64 32`. Changing it signs everyone out |
| `ADMIN_PASSWORD` | ✅ | — | `/admin` sign-in is disabled until set |

### Payments, fulfillment, lookup

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PAYMENT_MODE` | ✅ | `mock` | `bakong` in production |
| `BAKONG_ACCOUNT_ID` | bakong | — | Your Bakong ID, e.g. `name@aclb` |
| `BAKONG_MERCHANT_NAME` | | `Sakai Store` | ≤ 25 chars, shown in the bank app |
| `BAKONG_MERCHANT_CITY` | | `Phnom Penh` | ≤ 15 chars |
| `BAKONG_API_TOKEN` | bakong | — | From api-bakong.nbc.gov.kh; renew before expiry |
| `BAKONG_API_BASE` | | `https://api-bakong.nbc.gov.kh` | |
| `PAYMENT_TIMEOUT_MINUTES` | | `15` | KHQR validity (2–120) |
| `FULFILLMENT_MODE` | | `manual` | `mock` auto-delivers (demos only) |
| `PLAYER_LOOKUP_MODE` | | `none` | `mock` shows fake nicknames (demos only) |
| `CRON_SECRET` | ✅ prod | — | Bearer token for `/api/cron/reconcile` |

### Telegram

| Variable | Required | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | recommended | From @BotFather; without it notifications are off |
| `TELEGRAM_BOT_USERNAME` | recommended | Without `@`; enables "Get updates on Telegram" for customers |
| `TELEGRAM_ADMIN_CHAT_IDS` | recommended | Comma-separated numeric chat ids (send `/id` to the bot) |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ with bot | `A-Z a-z 0-9 _ -` only; `openssl rand -hex 32` |

### Social / ads (optional, build time)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_FB_PIXEL_ID` | Meta Pixel id, digits only. Inlined at build — rebuild/redeploy after changing |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Pixel id, capital letters + digits. Same rule |

### Docker Compose only

| Variable | Default | Notes |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `sakai` / `sakai` / `sakaistore` | **Change the password** before the first start (it is stored in the volume) |
| `DB_PORT` | `5432` | Host port for Postgres (bound to 127.0.0.1) |
| `APP_PORT` | `3000` | e.g. `127.0.0.1:3000` behind a reverse proxy |
| `NEXT_OUTPUT` | — | `standalone` is set by the Dockerfile |

### Tests only

| Variable | Notes |
|---|---|
| `TEST_DATABASE_URL` | Vitest DB (default `postgresql://sakai:sakai@localhost:5432/sakaistore_test`) |
| `E2E_PORT`, `E2E_ADMIN_PASSWORD` | Playwright port (3100) and admin password (default `admin123`) |
| `PLAYWRIGHT_CHROMIUM_PATH` | Use a preinstalled Chromium instead of `npx playwright install` |

---

## 9. Operations

**Backups (Docker).** Nightly dump, keep 14 days:

```bash
# crontab -e on the host
15 3 * * * cd /srv/sakaistore && docker compose exec -T db pg_dump -U sakai sakaistore | gzip > backups/sakai-$(date +\%F).sql.gz && find backups -name '*.sql.gz' -mtime +14 -delete
```

Copy backups off the server (e.g. `rclone` to Google Drive). Restore with
`gunzip -c file.sql.gz | docker compose exec -T db psql -U sakai sakaistore`.
Neon and Supabase have point-in-time restore on their paid plans.

**Updates.**

```bash
git pull
docker compose up -d --build     # migrate runs before the new app starts
```

On Vercel, pushing to the production branch deploys; run `npm run db:migrate` against the
production database first when a release contains a migration in `drizzle/`.

**Monitoring.** Point an uptime monitor (UptimeRobot, Better Stack…) at
`https://your-domain/api/health` — 200 `{ "ok": true, "db": "ok" }`, or 503 when the
database is unreachable. Watch the logs for `[payments]`, `[telegram]` and `[api/…]` errors.

**Scaling notes.** Rate limits and the Telegram duplicate-update guard are in memory per
server instance. That is fine for one VPS or a few warm Vercel functions; if you run many
instances behind a load balancer, move them to a shared store (Redis/Upstash).
