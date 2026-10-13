# Telegram bot — setup & daily use

Sakai Store keeps Telegram as the **owner's control room** and the
**customer's notification channel**, while orders happen on the website:

| Who | What they get |
|---|---|
| Owner / staff (admin chats) | A 💰 alert for every paid order with **✅ Delivered** / **❌ Failed** buttons, plus `/orders`, `/order`, `/stats` |
| Customers | Order updates in Telegram after tapping **Get updates on Telegram** on their order page, plus `/status` |

Everything is optional: without `TELEGRAM_BOT_TOKEN` the site works normally and
simply sends no Telegram messages.

---

## 1. Create the bot (2 minutes)

1. In Telegram, open **@BotFather** and send `/newbot`.
2. Pick a display name (e.g. *Sakai Store*) and a username ending in `bot`
   (e.g. `SakaiStoreBot`).
3. BotFather replies with a **token** like `123456789:AAH…`. Keep it secret —
   anyone with it controls your bot.
4. Optional but recommended, still in @BotFather:
   - `/setuserpic` — your shop logo.
   - `/setdescription` — e.g. *Fast & cheap game top-up in Cambodia. Order at sakaistore.com.*
   - `/setabouttext` — a one-line bio with your website link.

> Already ran the shop as a bot? You can reuse the same bot and token: the
> website takes over orders, and your customers keep the chat they know.

## 2. Find your admin chat id(s)

Admin chats receive paid-order alerts and may use the admin commands and buttons.

- **Easiest:** after step 4 (webhook) is done, send `/id` to your bot. It
  replies with your chat id.
- **Before the bot is live:** message **@userinfobot** — it replies with your
  numeric id (e.g. `123456789`).
- **A staff group:** add your bot to the group, send `/id@YourBot` in the
  group (after step 4) — group ids are negative, e.g. `-1001234567890`.

⚠️ Each admin must **open the bot and press Start once** — Telegram does not
let bots message people who never started them.

⚠️ If you configure a **group** id, **every member of that group** can press ✅/❌
and use the admin commands. Only use a private staff group.

## 3. Environment variables

Add to `.env` (local) or your hosting provider's environment settings:

```bash
TELEGRAM_BOT_TOKEN=123456789:AAH...            # from @BotFather
TELEGRAM_BOT_USERNAME=SakaiStoreBot            # without @; enables "Get updates on Telegram" links
TELEGRAM_ADMIN_CHAT_IDS=123456789,987654321    # comma-separated numeric ids (users and/or groups)
TELEGRAM_WEBHOOK_SECRET=<random>               # generate: openssl rand -hex 32
NEXT_PUBLIC_SITE_URL=https://sakaistore.com    # your public https URL (used for links and the webhook)
```

`TELEGRAM_WEBHOOK_SECRET` may contain only `A-Z a-z 0-9 _ -` (`openssl rand -hex 32`
is fine). In production the webhook refuses **all** updates when it is unset.

You can check what is configured (without revealing secrets) in
**/admin/settings → Integrations**.

## 4. Register the webhook

Telegram pushes updates to `https://<your-site>/api/telegram/webhook`. After
deploying (and whenever the domain or secret changes) run:

```bash
npm run telegram:webhook            # or: npx tsx scripts/set-telegram-webhook.ts
```

It will:

1. check the token (`getMe`) and that `TELEGRAM_BOT_USERNAME` matches,
2. `setWebhook` → `<NEXT_PUBLIC_SITE_URL>/api/telegram/webhook` with your secret,
   `allowed_updates = ["message", "callback_query"]` and `drop_pending_updates`,
3. set the command menus: customer commands for everyone (English + Khmer) and
   admin commands for each admin chat,
4. print the webhook status.

Other options:

```bash
npx tsx scripts/set-telegram-webhook.ts --info                     # show current webhook status
npx tsx scripts/set-telegram-webhook.ts --url https://abc.trycloudflare.com   # use another public URL
npx tsx scripts/set-telegram-webhook.ts --delete                   # stop receiving updates
```

**Local development:** Telegram only calls public HTTPS URLs. Expose your dev
server with a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000` or
`ngrok http 3000`) and run the script with `--url <tunnel URL>`. Outgoing
messages (alerts, customer updates) work locally without a webhook. Buttons
that would point at `localhost` are left out, because Telegram rejects them.

> Only one webhook per bot: registering a tunnel replaces the production
> webhook. Use a separate test bot for local development.

## 5. How customers link an order

1. A customer orders on the website and lands on `/orders/<code>`.
2. The page shows **Get updates on Telegram** →
   `https://t.me/<TELEGRAM_BOT_USERNAME>?start=ord_<code>`.
3. Telegram opens the bot with a **Start** button; tapping it sends
   `/start ord_<code>`. The bot links that chat to the order and replies
   "You'll get updates here" with the current status.
4. From then on the customer gets a message — in the language they used on the
   website (English or Khmer) — when the order is:

| Event | Message |
|---|---|
| paid | ✅ Payment received, delivering in 1–5 minutes |
| delivered | 🎉 Top-up delivered + **Top up again** button + a friendly ask to follow your **Facebook page / TikTok** (with the follower promo code from **/admin/settings**, if set) |
| failed | ⚠️ Apology, payment is safe, support contacts |
| retry after a failure | 🔄 We're retrying |
| refunded / expired / cancelled | short explanation (+ support contacts) |

Customers can also send `/status SK7F3K9Q2M` (or just paste the code) to
check any order, and `/status` alone to list the orders linked to their chat.

**Promote the bot on Facebook & TikTok:** put `https://t.me/<bot>?start=tiktok`
in your TikTok bio and `https://t.me/<bot>?start=facebook` on your Facebook
page. The welcome message links to the website with matching UTM tags
(`utm_source=tiktok&utm_medium=telegram_bot`), so those sales show up under the
right channel in **/admin/marketing**. Links customers tap in bot messages
(e.g. *Top up again*) are tagged `utm_source=telegram&utm_medium=bot`.

## 6. Admin: daily use

**Paid-order alert** (sent to every admin chat):

```
💰 New paid order

🧾 Order SK7F3K9Q2M
🎮 Mobile Legends: Bang Bang
📦 Weekly Diamond Pass
🆔 Player ID: 123456789      ← tap to copy
🌐 Zone: 1234                ← tap to copy
👤 Nickname: KhmerGamer
💵 Total: $1.38 ($1.45 − $0.07 promo TIKTOK5)
📣 Channel: 🎵 TikTok · oct_ml
🕒 Paid 13 Oct 2026, 14:05
📞 Contact: 012 345 678 · Telegram @khmer_gamer
[✅ Delivered] [❌ Failed]
[Open in admin ↗]
```

1. Top up the player in-game / with your supplier.
2. Tap **✅ Delivered**. The customer is notified, and **every admin's copy**
   of the alert changes to "✅ Delivered by *Your name* at 14:09" with the
   buttons removed — so nobody tops up twice.
3. Can't deliver (wrong ID, supplier down…)? Tap **❌ Failed**. The customer
   gets an apology with your support contacts. Later you can deliver from
   `/order <code>` or refund in the admin panel.

Tapping a button twice (or after another admin already handled the order)
just answers *Already delivered* — the order service applies each change once.
Changes made in the **admin panel** also update the Telegram alerts
("✅ Delivered via admin panel"). If the **system** fails an order, admins get a
❗ alert with a ✅ button.

**Commands** (admin chats only; elsewhere they show the customer help):

| Command | What it does |
|---|---|
| `/orders` | Paid / processing / failed orders, longest-waiting first, with tap-to-open buttons |
| `/order SK7F3K9Q2M` | Full order card with ✅/❌ buttons |
| `/stats` | Today's paid orders, revenue, orders to deliver, sales **by channel** (Facebook, TikTok, Telegram…) and the last 7 days — Phnom Penh time |
| `/status SK7F3K9Q2M` | What the customer sees |
| `/id` | This chat's id |
| `/help` | Command list |

Every paid-order alert is recorded on the order's timeline in the admin panel
("Paid-order alert sent to 2 of 2 Telegram admin chat(s)").

## 7. Troubleshooting

| Symptom | Check |
|---|---|
| No alerts at all | `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_CHAT_IDS` set? Did each admin press **Start** in the bot? Server logs show `[telegram] sendMessage failed: …` with Telegram's reason (the token is never logged). |
| "Forbidden: bot was blocked by the user" / "chat not found" | That admin/customer never started the bot or blocked it. Open the bot and press Start. |
| Buttons / commands do nothing | Run `npx tsx scripts/set-telegram-webhook.ts --info`. Look at `last error`. A `401` means `TELEGRAM_WEBHOOK_SECRET` on the server differs from the one registered — re-run the script after changing it. Wrong URL → re-run with the right `NEXT_PUBLIC_SITE_URL`. |
| "Not allowed" when tapping ✅ | Your user id (or the group id) is not in `TELEGRAM_ADMIN_CHAT_IDS`. Send `/id` to the bot to see it. |
| Admin commands answer with the customer help | The chat is not an admin chat (see above). Admin commands only work in admin chats so order details never leak into other groups. |
| Customers don't see "Get updates on Telegram" | `TELEGRAM_BOT_USERNAME` is not set (or contains spaces). The button is also hidden once the chat is linked. |
| Alerts in dev have no "Open in admin" button | Expected on `localhost`: Telegram rejects buttons pointing at local addresses. |
| Command menu missing | Re-run the webhook script; Telegram apps may need a restart to refresh menus. |
| Webhook works, but the reply is slow | Each update is handled within the request (one DB transaction + a few Bot API calls, each with a 10 s timeout). Check database latency and that the server can reach `api.telegram.org`. |

**Security notes**

- The webhook only accepts requests carrying your secret (constant-time
  comparison); everything else gets `401`.
- Only admin chats can change orders; status changes go through the same order
  service as the admin panel and are recorded on the order timeline with the
  admin's Telegram name and id.
- Order codes act like a password for an order: anyone with the code can see
  its status (same as the website order page). Customers should not post them
  publicly.
