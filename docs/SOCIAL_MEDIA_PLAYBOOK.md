# Sakai Store — Social Media Playbook (Facebook Page + TikTok)

A practical guide for launching and running the **Sakai Store Facebook Page** and **TikTok account** to sell game top-ups in Cambodia. It is written for the shop owner (no coding needed) and matches what the website already does.

> Read it on your phone: **Admin → Marketing → Playbook** shows this document with a table of contents. The **Setup checklist** on the Marketing page links straight to the right section.

**Time needed:** about one day for setup (sections 2–6), then 30–60 minutes a day to post and reply.

---

## 1. How the website helps you sell on social

Everything below is already built into the site — your job is to use it consistently.

| What | Where | Why it matters |
|---|---|---|
| Link previews (Open Graph images) | Automatic for every page | A shared game link shows the game tile, “from $x”, best prices and “Pay with KHQR” on Facebook, Messenger and Telegram. |
| Promo images | Admin → Marketing → Promo images | Post-ready price lists: square (Facebook post), portrait (feed), story (TikTok cover, Reels, Stories). |
| Captions and video scripts | Admin → Marketing → Captions | Facebook post, TikTok caption and a 15–30 s script in Khmer and English, with tracked links and promo codes. |
| Tracked links (UTM) | Admin → Marketing → Tracked links | Every order is credited to Facebook, TikTok or Telegram. |
| Meta Pixel and TikTok Pixel | Hosting environment variables | Ads can measure ViewContent → AddToCart → InitiateCheckout → Purchase. |
| Channel promo codes | Admin → Promo codes | FB5 / TIKTOK5 / FOLLOW10 reward followers and show which platform sold. |
| Channel performance | Admin → Marketing → Channel performance | Orders, paid orders, revenue, average order and conversion per channel, promo code usage, top campaigns. |
| Social on the store | Header, footer, home page, order page | “Follow us” with the follower code, share bar (Facebook, Messenger, Telegram, copy link) and a floating chat button. |

### How orders are credited to Facebook or TikTok

The site remembers where a visitor came from in a small cookie (`sk_attr`) for **30 days**. The rule is **last non-direct touch wins**:

- A visit from a **tracked link** (`utm_source=…`), an **ad click** (fbclid / ttclid) or **another website** (for example facebook.com or t.me) is a *touch*. It is saved — and it **replaces** an older touch. If someone first came from Facebook and later from your TikTok bio, TikTok gets the credit.
- A **direct visit** (typing the address, a bookmark, coming back from the bank app after paying) or moving between pages of the site **never** replaces the saved touch.
- When the order is created, the touch is copied onto the order: channel, utm_source, utm_campaign, utm_content, click id, referrer and landing page.
- If an order still looks **direct** but used a **channel promo code** (TIKTOK5 is tagged “TikTok”), the order is credited to that channel. This matters on TikTok, where links in captions are not clickable and many people type the address.

| Customer journey | Credited to |
|---|---|
| Taps your Facebook post link → orders | Facebook |
| Taps the Facebook link, leaves, types the address two days later → orders | Facebook |
| Facebook link on Monday, TikTok bio link on Wednesday → orders | TikTok |
| Types the address after watching a TikTok, uses TIKTOK5 | TikTok |
| Types the address, no code | Direct |

> Always use links from the Marketing studio (or the share bar). An untracked link that is opened inside the Facebook or TikTok app often arrives **without** a referrer and is counted as Direct.

### Launch checklist

- [ ] Facebook Page created, username set, About filled in English and Khmer (section 2)
- [ ] Messenger instant reply and saved replies set up (section 2)
- [ ] TikTok switched to a Business account, bio link added (section 3)
- [ ] Page, Messenger and TikTok links saved in **Admin → Settings → Social links**
- [ ] Meta Pixel ID and TikTok Pixel ID added to the hosting environment, site redeployed (sections 4–5)
- [ ] Domain verified in Meta Business Suite (section 4)
- [ ] FB5, TIKTOK5 and FOLLOW10 live in **Admin → Promo codes**, FOLLOW10 set as the follower code in **Settings → Marketing** (section 6)
- [ ] Two-factor authentication on for every admin of the Page, TikTok and Meta Business account
- [ ] First week of posts scheduled from the content calendar (section 9)

---

## 2. Set up the Facebook Page

Use **Meta Business Suite** (business.facebook.com, or the Meta Business Suite app) for everything below: it manages the Page, Messenger inbox, scheduling and ads in one place.

### Name, username and category

- **Page name:** `Sakai Store – Game Top Up Cambodia` (people search for “top up” and the game names; keep the brand first).
- **Username:** `@sakaistore` (or `@sakaistore.kh` if taken). Use the **same handle on TikTok and Telegram** so people can find you everywhere.
- **Category:** Video Game Store. Add *Shopping & Retail* and *E-commerce Website* as extra categories.
- **Website:** your store address. **Phone / WhatsApp:** only numbers you actually answer. **Location:** service area *Phnom Penh, Cambodia* — no street address needed.
- **Hours:** set the hours you really deliver. If someone delivers orders in the evening only, say so; honest hours prevent angry messages.

### About text (English and Khmer)

Facebook shows a short **Intro / Bio** (about 100 characters) and a longer **About** section.

| | English | Khmer |
|---|---|---|
| Intro | Fast & cheap game top-up in Cambodia 🇰🇭 MLBB · Free Fire · PUBG. Pay with KHQR. | Top Up ហ្គេមលឿន និងថោកនៅកម្ពុជា 🇰🇭 MLBB · Free Fire · PUBG បង់ប្រាក់ដោយ KHQR |
| About | Top up Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings and more in a minute: enter your game ID, pick a package and pay with KHQR (ABA, ACLEDA, Wing or any Bakong app). We only need your game ID — never your password. Sakai Store is an independent reseller and is not affiliated with the game publishers. | បញ្ចូលពេជ្រ Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings និងហ្គេមផ្សេងទៀតក្នុងរយៈពេលមួយនាទី៖ បញ្ចូល ID ហ្គេម ជ្រើសរើសកញ្ចប់ ហើយបង់ប្រាក់ដោយ KHQR (ABA, ACLEDA, Wing ឬកម្មវិធី Bakong ណាមួយ)។ យើងត្រូវការតែ ID ហ្គេមរបស់អ្នកប៉ុណ្ណោះ — មិនដែលសុំលេខសម្ងាត់ទេ។ Sakai Store ជាអ្នកលក់ឯករាជ្យ មិនមានទំនាក់ទំនងជាមួយក្រុមហ៊ុនផលិតហ្គេមទេ។ |

### Profile picture and cover photo

- **Profile picture:** the Sakai gem logo on the purple-to-cyan gradient (the same mark as the website icon). Upload at least **720 × 720 px**; Facebook shows it as a circle, so keep the gem centred with space around it.
- **Cover photo:** upload **1640 × 624 px** (twice the desktop size of 820 × 312). Phones show a narrower crop of the middle, so keep the text and logo in the **central ~1100 px**. Good cover text: *“Game top-up in 1 minute · Pay with KHQR · sakaistore.com”*. Do **not** use official game logos or character art (see section 15).
- Refresh the cover for big moments (new pass season, flash-sale weekend) — it is the first thing visitors see.

### “Shop now” button

1. Page → **Add action button** (or *Edit action button*).
2. Choose **Shop now** (if your Page does not offer it, use **Learn more**).
3. Paste a tracked link: in **Marketing → Tracked links**, choose *Facebook page post*, landing page *Home page*, and set `utm_campaign` to `page_button`. Copy and paste it.

### Messenger instant reply and saved replies

Most Cambodian customers message first. Answer instantly and send them to the website, where the price is always right and payment is automatic.

1. Save your **m.me/yourusername** link in **Admin → Settings → Social links → Messenger**. The site’s floating chat button and order page use it.
2. Meta Business Suite → **Inbox → Automations**:
   - **Instant reply** (on). Use the *Messenger auto-reply* link from **Marketing → Tracked links**:

```text
សួស្តី 👋 សូមស្វាគមន៍មកកាន់ Sakai Store!
Top Up ហ្គេមបានយ៉ាងរហ័សនៅលើវេបសាយ៖ <your Messenger auto-reply link>
១. បញ្ចូល ID ហ្គេម ២. ជ្រើសរើសកញ្ចប់ ៣. បង់ប្រាក់ដោយ KHQR
យើងមិនដែលសុំលេខសម្ងាត់ទេ 🔒

Hi 👋 welcome to Sakai Store! Top up on our website in 1 minute: <link>
1. Enter your game ID 2. Pick a package 3. Pay with KHQR. We never ask for your password 🔒
```

   Add your delivery hours to the message if orders are delivered by hand (for example “delivered 8:00–23:00”).

   - **Frequently asked questions:** “Price list?”, “How do I pay?”, “Where is my order?”, “Is it safe?” — answers from the saved replies below.
   - **Away message** for hours you are offline: “We’re offline now — order on the website and it will be delivered when we’re back at 9:00.”
3. **Saved replies** (Inbox → Saved replies) — create these in both languages:

| Name | English | Khmer |
|---|---|---|
| prices | Today’s prices are always on our website: <tracked link>. Pick your game to see every package. | តម្លៃថ្ងៃនេះមាននៅលើវេបសាយជានិច្ច៖ <link> សូមជ្រើសរើសហ្គេម ដើម្បីមើលកញ្ចប់ទាំងអស់។ |
| howto | Enter your game ID → pick a package → tap “Pay with KHQR” and scan with ABA, ACLEDA or Wing. Done in a minute! | បញ្ចូល ID ហ្គេម → ជ្រើសរើសកញ្ចប់ → ចុច «បង់ប្រាក់ដោយ KHQR» ហើយស្កេនដោយ ABA, ACLEDA ឬ Wing។ រួចរាល់ក្នុងមួយនាទី! |
| order | Please send your order code (starts with SK). You can also check it yourself at <site>/track. | សូមផ្ញើលេខកូដកុម្ម៉ង់ (ចាប់ផ្តើមដោយ SK)។ អ្នកក៏អាចពិនិត្យដោយខ្លួនឯងនៅ <site>/track។ |
| safe | We only need your game ID and never your password or OTP. Pay only through the KHQR on our website. | យើងត្រូវការតែ ID ហ្គេម មិនដែលសុំលេខសម្ងាត់ ឬ OTP ទេ។ សូមបង់ប្រាក់តាម KHQR នៅលើវេបសាយរបស់យើងប៉ុណ្ណោះ។ |
| code | Follow our Page and use code FOLLOW10 for 10% off orders from $5 (max $2). | Follow Page របស់យើង ហើយប្រើកូដ FOLLOW10 បញ្ចុះ 10% សម្រាប់ការកុម្ម៉ង់ចាប់ពី $5 (អតិបរមា $2)។ |

### Meta Business Suite and roles

1. Create a **Business portfolio** at business.facebook.com and add the Page.
2. Add a **second admin** you trust (a backup if your account is locked) and give helpers only the tasks they need (Messages, Content).
3. Turn on **two-factor authentication** for every person with access. Hacked game-shop Pages are common; 2FA is the best protection.
4. Use **Planner** to schedule a week of posts in one sitting (section 9).

---

## 3. Set up the TikTok Business account

1. Create the account with a shop email or phone (not a personal one), username **@sakaistore** — the same handle as Facebook.
2. **Settings and privacy → Account → Switch to Business Account**, category *Shopping & Retail* (or *Games*).
3. **Edit profile:**
   - Photo: the same gem logo.
   - Bio (80 characters): `Game top-up KH 🇰🇭 MLBB·FF·PUBG · Pay KHQR ⚡ Code TIKTOK5 👇` or in Khmer `Top Up ហ្គេម 🇰🇭 បង់ KHQR ⚡ កូដ TIKTOK5 👇`.
   - **Website:** paste the *TikTok bio link* from **Marketing → Tracked links** (it points to the home page with `utm_source=tiktok&utm_campaign=bio`). If the website field is not available yet for your account, write `sakaistore.com` in the bio and pin a comment with the link under every video until it is.
4. Save your profile URL (`https://www.tiktok.com/@sakaistore`) in **Admin → Settings → Social links → TikTok**.
5. **Music:** Business accounts can only use the **Commercial Music Library**. Using other trending songs gets videos muted or removed.
6. **Ads:** create a **TikTok Ads Manager** account (ads.tiktok.com) with currency **USD** and time zone **Phnom Penh (UTC+7)** — you need it for the Pixel (section 5) and later for Spark Ads. A Visa or Mastercard debit card (for example an ABA card) works for payment.

---

## 4. Meta Pixel and domain verification

The pixel lets Facebook and Instagram ads see who viewed a game, picked a package, opened the KHQR and **paid** — so Meta can find more buyers.

1. Meta Business Suite → **Events Manager → Connect data sources → Web → Meta Pixel**. Name it “Sakai Store”.
2. Choose **“Install code manually”**, but do not paste any code — just copy the **Pixel ID** (a number like `123456789012345`).
3. On your hosting (for example Vercel → Project → Settings → Environment Variables) set:
   `NEXT_PUBLIC_FB_PIXEL_ID=123456789012345`
4. **Redeploy** the site. `NEXT_PUBLIC_*` values are built into the pages, so a restart without a new build is not enough.
5. Check **Admin → Marketing → Setup checklist**: “Meta Pixel” turns green. The ID must be digits only — anything else is ignored for security.

What the site sends (you do not need to set up events by hand):

| Event | When | Details |
|---|---|---|
| PageView | Every store page, including in-site navigation | Never on /admin |
| ViewContent | Game page opened | Game, “from” price |
| AddToCart | Package selected | Package and price |
| InitiateCheckout | Order created, KHQR shown | Total, event ID = order code |
| Purchase | Order paid | Total in USD, event ID = order code (prevents double counting) |
| Contact | Messenger / Telegram chat button | — |

- The site turns off Meta’s automatic button and form scanning, so player IDs and phone numbers typed on the site are not collected by the pixel.
- **Test it:** install the *Meta Pixel Helper* Chrome extension, or use **Events Manager → Test events**, then place a test order.
- **Domain verification:** Business settings → **Brand safety → Domains → Add** your domain → choose **DNS TXT record** and add the TXT record at your domain registrar (no website change needed). Verified domains let you edit link previews in ads and protect your links from being reused by fake Pages.
- If Events Manager asks you to rank web events, put **Purchase** first, then InitiateCheckout, AddToCart, ViewContent.

---

## 5. TikTok Pixel

1. TikTok Ads Manager → **Tools → Events → Web Events → Set up web events**.
2. Choose **TikTok Pixel → Manually install pixel code**, name it “Sakai Store”, and copy the **Pixel ID** (capital letters and digits, like `C4ABCDEFGH1234567890`). Do not paste the code anywhere.
3. On your hosting set `NEXT_PUBLIC_TIKTOK_PIXEL_ID=C4ABCDEFGH1234567890` and **redeploy**.
4. The site sends ViewContent, AddToCart, InitiateCheckout, **CompletePayment** (TikTok’s name for a purchase) and Contact, each purchase with its value in USD and the order code as event ID.
5. **Test it** with the *TikTok Pixel Helper* extension or **Events → Test events**.

---

## 6. Channel promo codes

Promo codes do two jobs: they reward people for following you, and they tell you **which platform sold** even when the visit looks direct. The seed data creates these codes — check them in **Admin → Promo codes** and adjust to your margins.

| Code | Channel | Offer (default) | Where to use it |
|---|---|---|---|
| FOLLOW10 | Facebook | 10% off orders from $5, max $2 | “Follow us” section on the site, pinned post, Messenger replies. Set it in **Settings → Marketing → Follower promo code**. |
| FB5 | Facebook | 5% off, max $2 | Facebook posts and ads |
| TIKTOK5 | TikTok | 5% off, max $2 | TikTok bio, captions and pinned comments |
| WELCOME5 | — | 5% off, max $1 | General first-order code |

- Links from the Marketing studio add `?promo=CODE` to game links, so the code is **filled in automatically**.
- Promo images and captions only show codes that are **live right now** and valid for that game.
- Always set a **maximum discount** and, for campaigns, an **end date**. A code without limits that goes viral can cost more than it earns.
- Know your margin before choosing a percentage: if 86 Diamonds sells for $1.50 and costs you $1.30, a 10% code ($0.15) leaves $0.05. The **$5 minimum** on FOLLOW10 protects small orders.
- In **Channel performance → Promo codes by channel** you see orders, revenue and the discount you gave for every code. A code with many orders but low revenue is training people to wait for discounts — shorten it.

---

## 7. Using the Marketing studio

**Admin → Marketing** is your daily workspace. The usual flow takes about 10 minutes per post:

1. **Pick what you promote:** “All games” or one game chip.
2. **Promo images:** choose the promo code to print (or *No code*), then **Download**:
   - **Square** → Facebook post.
   - **Portrait** → Facebook/Instagram feed (takes more space in the feed).
   - **Story** → TikTok cover or photo post, Facebook/Instagram Story, Reels cover. Content stays clear of TikTok’s buttons and caption area.
   Images are English and numbers only; write the Khmer in the caption.
3. **Captions & video scripts:** choose a template — *Price list, Flash sale, Weekly/monthly pass, How to top up, Giveaway* — and the language tab (ខ្មែរ / English). Copy the **Facebook post**, the **TikTok caption** and the **video script**. Read the yellow notes: they warn when a “flash sale” has nothing discounted or a game has no pass.
4. **Tracked links:** choose where the link goes (Facebook page post, Facebook ad, Messenger auto-reply, TikTok bio, TikTok pinned comment, TikTok ad, Telegram channel) and copy it. Captions already contain the right link.
5. **Post**, then reply to every comment in the first hour.

Tips:

- Post the **same price list** in Khmer on Facebook and as a TikTok photo/video; the links tell you which one sold.
- After editing prices, reopen the studio — images refresh automatically.
- If a shared link shows an old preview on Facebook, open the **Sharing Debugger** (developers.facebook.com/tools/debug), paste the link and press **Scrape Again**. In Telegram, send the link to **@WebpageBot**.

### Reading channel analytics

**Channel performance** (7 / 30 / 90 days) uses order dates in Phnom Penh time:

| Number | Meaning | What to do |
|---|---|---|
| Orders | Orders created (any status) | Measures interest |
| Paid | Orders where money arrived | The real result |
| Conversion | Paid ÷ orders | Below ~50% means people drop at the KHQR — check the order page on a phone, and remind people in captions that ABA, ACLEDA and Wing all work |
| Revenue | Paid, processing and delivered orders | Refunded / failed orders are excluded |
| Avg. order | Revenue ÷ revenue orders | Push passes and bigger packs if it is low |
| Direct | No tracked touch and no channel code | Too much Direct = untracked links; use studio links everywhere |

- **Promo codes by channel:** which codes are used and how much discount you gave.
- **Top campaigns:** the `utm_campaign` of the posts, videos and ads that sold (game slug, `bio`, `instant_reply`, or your ad campaign names).

**Weekly review (Monday, 15 minutes):** compare the last 7 days with the previous week. Double down on the channel and post type with the most **paid** orders; repeat the best-selling video idea with a new hook; stop formats that bring comments but no orders.

---

## 8. Content pillars

Mix five kinds of posts. Selling every day without value makes people unfollow.

| Pillar | Share | Examples |
|---|---|---|
| Prices & deals | 30% | Price lists, weekly pass reminders, flash sales, new packages |
| How-to & trust | 20% | “Top up in 60 seconds”, where to find your ID, KHQR banks, “we never ask for passwords” |
| Proof | 20% | “Delivered!” screenshots with IDs blurred, customer reviews (with permission), order counters |
| Gaming culture | 20% | Patch news, hero/character tips, memes, rank-up moments, esports results (MPL KH, FFWS) |
| Community | 10% | Giveaways, polls (“Which game next?”), Q&A, follower milestones |

---

## 9. Four-week posting calendar

**Cadence:** Facebook **1 feed post a day** plus 2–4 Stories; TikTok **1 video a day** (2 on weekends); repost the best piece to the Telegram channel 2–3 times a week.

**Best times (Phnom Penh):** lunch **11:30–13:00** and evening **19:00–22:00**; weekends also **09:00–11:00**. Weekly passes run out on a weekly cycle — remind players on **Monday mornings**.

The full plan (about 60 Facebook and TikTok posts plus Telegram reposts, with the studio template, image format and tracked-link values for each) is in **docs/marketing/content-calendar.csv** — import it into Google Sheets or Excel. Summary:

| Week | Theme | Facebook focus | TikTok focus |
|---|---|---|---|
| 1 | Launch & trust | Welcome post, how to top up, FOLLOW10, price lists for MLBB / Free Fire / PUBG | “60-second top-up”, price checks, “we never ask for passwords” |
| 2 | Passes & proof | Monday pass reminder, delivered screenshots, Honor of Kings + Magic Chess prices | “POV: pass expired”, diamonds vs coffee, customer reaction |
| 3 | Flash-sale weekend | Teaser Thursday, flash sale Fri–Sun with a real end time, results post | Countdown videos, before/after prices, live-style reminders |
| 4 | Community & giveaway | Giveaway (rules from the studio), winners, poll for next game, month recap | Giveaway video, “which game are you?”, best-of compilation |

---

## 10. Caption bank (English / Khmer)

Use these when you write your own posts. The studio generates full captions.

| Use | English | Khmer |
|---|---|---|
| Hook | Still paying too much for diamonds? 👀 | នៅតែទិញពេជ្រថ្លៃមែនទេ? 👀 |
| Hook | Top up in 60 seconds — no password needed ⏱️ | Top Up ក្នុង ៦០ វិនាទី — មិនត្រូវការលេខសម្ងាត់ ⏱️ |
| Hook | Monday = Weekly Pass day ✅ | ថ្ងៃចន្ទ = ថ្ងៃបន្ត Weekly Pass ✅ |
| Hook | 86 Diamonds for less than an iced coffee ☕ | 86 ពេជ្រ ថោកជាងកាហ្វេទឹកកកមួយកែវ ☕ |
| Hook | ⚡ Flash sale ends tonight | ⚡ Flash Sale ផុតកំណត់យប់នេះ |
| Trust | Pay with KHQR — ABA, ACLEDA, Wing & any Bakong app | បង់ប្រាក់ដោយ KHQR — ABA, ACLEDA, Wing និងកម្មវិធី Bakong ទាំងអស់ |
| Trust | We only need your game ID — never your password | ត្រូវការតែ ID ហ្គេម — មិនដែលសុំលេខសម្ងាត់ទេ |
| Trust | Real people answer your messages | មានមនុស្សពិតឆ្លើយសាររបស់អ្នក |
| Promo | Follow us and use FOLLOW10 for 10% off | Follow យើង ហើយប្រើកូដ FOLLOW10 បញ្ចុះ 10% |
| CTA | 👉 Order here: <link> | 👉 កុម្ម៉ង់នៅទីនេះ៖ <link> |
| CTA | 🔗 Link in bio | 🔗 លីងនៅក្នុង Bio |
| CTA | Comment your game and we’ll reply with the price 👇 | ខមិនប្រាប់ឈ្មោះហ្គេម យើងនឹងប្រាប់តម្លៃ 👇 |
| Proof | Delivered in 3 minutes — thank you! 💎 (ID hidden for privacy) | បញ្ចូលរួចក្នុង ៣ នាទី — អរគុណច្រើន! 💎 (បិទ ID ដើម្បីឯកជនភាព) |

---

## 11. Hashtag sets per game

Use 3–6 hashtags on Facebook and 4–8 on TikTok. Always add one brand tag. The studio adds the game’s tags (edit them in **Admin → Games**) plus the default set from **Settings → Marketing**.

| Game | Hashtags |
|---|---|
| Brand (always) | #SakaiStore #GameTopUp #TopUpKH #Cambodia |
| Mobile Legends | #MLBB #MobileLegends #MLBBCambodia #MLBBKhmer #WeeklyDiamondPass |
| Free Fire | #FreeFire #FreeFireCambodia #GarenaFreeFire #FFKhmer |
| PUBG Mobile | #PUBGMobile #PUBGM #PUBGCambodia #UC |
| Honor of Kings | #HonorOfKings #HOK #HOKCambodia |
| Magic Chess: Go Go | #MagicChessGoGo #MagicChess #MCGG |
| Genshin Impact | #GenshinImpact #Genshin #WelkinMoon |
| Call of Duty: Mobile | #CODM #CallOfDutyMobile #CODMCambodia |
| Blood Strike | #BloodStrike #BloodStrikeCambodia |
| Khmer reach | #ខ្មែរ #កម្ពុជា #ហ្គេម |

Avoid misleading tags (#FreeDiamonds, #Hack) — they attract scammers and can get posts limited.

---

## 12. Ten TikTok video ideas with scripts

Film vertical **9:16**, 15–30 seconds, captions on screen (many people watch muted), music from the Commercial Music Library. Blur every Player ID, nickname and bank detail. The studio’s **Video script** gives a full version of ideas 1–4 and 9.

1. **Price check** — Hook (0–3 s): zoom on the story image, text “Diamonds from $0.25?! 😳” / “ពេជ្រ ចាប់ពី $0.25?! 😳”. Scenes: tap the three best prices; screen-record a 20-second order. CTA: “Link in bio — code TIKTOK5”.
2. **60-second top-up** — Hook: a visible 60-second timer, “Top up in 60 seconds”. Scenes: enter ID (blurred) → pick package → scan KHQR in ABA → balance goes up. CTA: stop the timer, “Done ✅ link in bio”.
3. **POV: your pass expired** — Hook: shocked face + in-game pass screen, “Monday… pass expired 😱” / “ថ្ងៃចន្ទ… Pass ផុតកំណត់ 😱”. Scenes: renew on the site in 3 taps. CTA: “Renew every Monday — link in bio”.
4. **Diamonds vs coffee** — Hook: iced coffee in one hand, phone in the other: “$1.50: coffee or 86 diamonds?”. Scenes: show the price on the site; show the skin/hero you get. CTA: “Your choice 😄 link in bio”.
5. **Where is my ID?** — Hook: “Can’t find your MLBB ID? 👀”. Scenes: open the game profile, circle the User ID and Zone ID (blur the numbers), show where to paste them on the site. CTA: “Save this video 📌”.
6. **Scam warning** — Hook: fake DM on screen with a red ❌, “If someone asks for your password, it’s a scam”. Scenes: real ways to pay (KHQR on the site only), our official accounts. CTA: “Share this with your squad”. Builds trust more than any ad.
7. **Delivered!** — Hook: a notification sound and “Delivered in 2 minutes 💎”. Scenes: order page “Delivered” status (code blurred), customer reaction or review (with permission). CTA: “Your turn — link in bio”.
8. **Which game are you?** — Hook: “Tell me your game, I’ll tell you who you are 😂”. Scenes: one joke per game (MLBB, FF, PUBG, HOK). CTA: “Comment your game 👇” — then reply with a video to the best comments.
9. **Flash sale countdown** — Hook: “⚡ FLASH SALE — ends Sunday 9 PM”. Scenes: old price crossed out → sale price; code applied at checkout. CTA: “Ends Sunday — link in bio”. Only when the discount is real.
10. **Giveaway announcement and winners** — Hook: “🎁 GIVEAWAY: 3 Weekly Passes”. Scenes: how to enter (comment only), rules card (free, not sponsored by TikTok, we never ask for passwords). Winners video: screen-record the random comment picker. CTA: “Follow for the next one”.

---

## 13. Small-budget ads plan

Start small, measure **paid orders**, and only scale what sells. Make sure both pixels are installed first (sections 4–5) and use tracked URL parameters on every ad.

### Facebook / Instagram (Meta Ads Manager)

- **Budget:** $3–5 per day per test ad set, 3–5 days per test. A first month of testing costs about $100.
- **Objective:** *Sales* (website, Purchase event) once the pixel has recorded some purchases; before that, *Traffic* optimised for landing page views, or *Engagement → Messages* to Messenger if you answer fast.
- **Audience:** Cambodia (start with Phnom Penh, Siem Reap, Battambang, Kampong Cham, Sihanoukville), **ages 18–34** (they own the bank app needed for KHQR, and Meta limits targeting for teens). Interests: Mobile Legends: Bang Bang, Garena Free Fire, PUBG Mobile, Mobile games, Esports. Also try **Advantage+ audience** with the same location and age.
- **Placements:** Advantage+ placements (Facebook and Instagram Feed, Stories, Reels).
- **Creatives:** test 3 at a time — the **story image** from the studio, the **60-second top-up** video, and a **price check** video. Khmer captions first.
- **URL parameters** (Ad → Tracking → URL parameters):
  `utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`
- **When to kill:** after ~$10–15 spent with no purchase, or cost per landing-page view above about $0.10, or cost per purchase above your profit per order.
- **When to scale:** cost per purchase below target for 3 days → raise the budget 20–30% every 2–3 days, or duplicate the ad set to a new city. Big jumps reset learning.
- **Retargeting** (after a few hundred visitors): website visitors in the last 14 days who did not purchase, with a FOLLOW10 / FB5 image.

### TikTok

- TikTok Ads Manager requires at least about **$20 per day per ad group**, so start with **Promote** inside the TikTok app on your best organic video (a few dollars per day, goal *Website visits*).
- When you can spend $20/day, use **Spark Ads** (boost your own videos) in Ads Manager with the TikTok Pixel and *Complete Payment* as the goal.
- **Destination URL parameters:** `utm_source=tiktok&utm_medium=paid_social&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__`
- Same kill / scale rules as Facebook. Refresh creatives every 7–10 days — TikTok ads tire fast.

### Ad rules to respect

- No “official” claims, no game logos or character art in ads, no “free diamonds” promises.
- Prices in ads must match the website on the day the ad runs.

---

## 14. Community management

- **Reply time:** under 15 minutes during your hours. Comments answered in the first hour boost reach on both platforms.
- **Pin a post** on Facebook and a comment/video on TikTok with: official links, the follower code and the scam warning below.
- **Moderation:** Page settings → **Moderation** → block words such as `password`, `hack`, `free diamonds`, `generator`, and hide comments that contain phone numbers or player IDs. On TikTok use **Comment filters** with the same words.

**Reply templates**

| Situation | English | Khmer |
|---|---|---|
| Price question | Prices for every package are here: <link> 💎 | តម្លៃកញ្ចប់ទាំងអស់នៅទីនេះ៖ <link> 💎 |
| Where is my order? | Sorry for the wait! Please send your order code (SK…) by message and we’ll check right away. | សូមអភ័យទោសដែលរង់ចាំ! សូមផ្ញើលេខកូដកុម្ម៉ង់ (SK…) តាមសារ យើងនឹងពិនិត្យភ្លាមៗ។ |
| Wrong ID entered | Message us your order code and the correct ID before we deliver — we’ll fix it. | សូមផ្ញើលេខកូដកុម្ម៉ង់ និង ID ត្រឹមត្រូវមកយើងមុនពេលបញ្ចូល — យើងនឹងកែជូន។ |
| Complaint | We’re sorry — please message us your order code so we can solve it today. | សូមអភ័យទោស — សូមផ្ញើលេខកូដកុម្ម៉ង់តាមសារ ដើម្បីយើងដោះស្រាយជូនថ្ងៃនេះ។ |
| Happy customer | Thank you for your trust! 🙏 Enjoy the game! | អរគុណសម្រាប់ការជឿទុកចិត្ត! 🙏 លេងហ្គេមឱ្យសប្បាយ! |

**Scam warning (pin it):**

> ⚠️ Sakai Store will **never message you first** to ask for your password, OTP code or a payment. We only need your game ID, and you only pay through the KHQR on our website. Our only accounts: this Page, @sakaistore on TikTok and our website. Report fake pages that copy our name.
>
> ⚠️ Sakai Store **មិនដែលផ្ញើសារមកអ្នកមុន** ដើម្បីសុំលេខសម្ងាត់ លេខកូដ OTP ឬឱ្យបង់ប្រាក់ឡើយ។ យើងត្រូវការតែ ID ហ្គេម ហើយអ្នកបង់ប្រាក់តាម KHQR នៅលើវេបសាយរបស់យើងប៉ុណ្ណោះ។ គណនីផ្លូវការ៖ Page នេះ, @sakaistore លើ TikTok និងវេបសាយរបស់យើង។ សូម Report Page ក្លែងក្លាយដែលចម្លងឈ្មោះយើង។

If an impersonator appears: report it from the fake Page (**… → Report Page → Pretending to be someone**) and post the warning again.

---

## 15. Compliance and brand safety

- **No official game logos or art without permission.** Game names, logos, heroes and splash art belong to their publishers (Moonton, Garena, Level Infinite/Tencent, HoYoverse, Activision, NetEase). The website and the studio use generated tiles; do the same in posts, covers and ads. Short gameplay clips for commentary are common, but never make a publisher’s art look like your brand.
- **Independent reseller disclaimer:** keep “Sakai Store is an independent reseller and is not affiliated with the game publishers” in the Page About, the TikTok bio links and every giveaway.
- **Honest pricing:** a “was” (compare-at) price must be a price you really charged; flash sales must really end when you say; never fake scarcity (“only 3 left” for digital goods).
- **Giveaways** (the studio’s Giveaway template already includes these):
  - Facebook (Meta Pages terms): publish official rules (eligibility, dates, prize, how winners are chosen and contacted), state that the promotion is **not sponsored, endorsed, administered by or associated with Facebook**, and that entrants **release Facebook**. Do **not** require sharing on personal timelines or tagging friends to enter or to get extra entries. Reacting and commenting are fine.
  - TikTok: same disclaimers naming TikTok; entry by comment only; no “follow/like for more entries”; follow TikTok’s Community Guidelines and branded content policy.
  - Free to enter, no purchase necessary, prize delivered as a top-up (no cash), winners drawn at random — record the draw.
- **No gambling-style promotions:** no paid lucky draws, “spin to win”, mystery boxes or raffles that require a purchase. Paid chance-based promotions can be illegal gambling or lotteries; keep giveaways free.
- **Protect customer data:** blur Player IDs, nicknames, order codes, phone numbers and bank details in every screenshot and video. Ask permission before posting a customer’s review or name.
- **Minors:** many players are teenagers. Don’t target ads at under-18s, keep the “under 18, ask a parent” line in giveaways, and never pressure young customers.
- **Payments:** never ask customers to transfer money to a personal account; the KHQR on the order page is the only payment method.
- **Privacy:** the site uses cookies for attribution and, when configured, the Meta and TikTok pixels. Keep the Privacy page up to date if you add more tracking.

---

## 16. Deployment notes (for the developer)

- `NEXT_PUBLIC_FB_PIXEL_ID` (digits only) and `NEXT_PUBLIC_TIKTOK_PIXEL_ID` (A–Z, 0–9) are validated; invalid values are ignored. They are inlined at build time — **redeploy** after changing them.
- `NEXT_PUBLIC_SITE_URL` must be the public https address: it is used in OG images, tracked links, the sitemap and robots.txt.
- Open Graph images and promo images load fonts from `src/assets/fonts/` (Kantumruy Pro Latin, SIL Open Font License), and the admin playbook page reads `docs/SOCIAL_MEDIA_PLAYBOOK.md`. Both are already listed in `outputFileTracingIncludes` in `next.config.ts`, so Vercel and the Docker (`output: "standalone"`) image ship them. Keep that list in sync if you move these files. Full hosting guide: `docs/DEPLOYMENT.md`.
- OG images are cached publicly for up to an hour (CDN) and fall back to a generic card if the database is unavailable. Promo images are admin-only (`private`) and refresh automatically when prices, codes or settings change.
- `robots.txt` blocks `/admin`, `/api` and `/orders` (order pages contain player IDs); `sitemap.xml` lists the home page, every active game, FAQ, Track, Terms and Privacy.
