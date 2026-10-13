import type { OrderStatus } from "@/db/schema";
import type { Locale } from "@/i18n/config";

/**
 * Customer-facing Telegram bot texts (English + Khmer). Telegram HTML: the
 * strings may contain <b>/<i>/<code>; {placeholders} are filled with values
 * that the caller has already HTML-escaped (see ./format.ts). Wording follows
 * the website's order page so customers see the same terms everywhere.
 * en and km must have identical keys and placeholders (messages.test.ts).
 */

type StatusTexts = Record<OrderStatus, string>;
type UpdateText = { title: string; body: string };

export type BotStrings = {
  labels: { order: string; status: string };
  statusNames: StatusTexts;
  statusHints: StatusTexts;
  linked: UpdateText;
  updates: {
    paid: UpdateText;
    processing: UpdateText;
    delivered: UpdateText;
    failed: UpdateText;
    refunded: UpdateText;
    expired: UpdateText;
    cancelled: UpdateText;
  };
  contact: string;
  /** {networks} = linked network names joined with `and`. */
  follow: { ask: string; and: string; promo: string };
  welcome: { title: string; pay: string; order: string; updates: string };
  help: string;
  status: { usage: string; notFound: string; recent: string; recentHint: string };
  buttons: {
    viewOrder: string;
    payNow: string;
    topUpAgain: string;
    orderAgain: string;
    website: string;
    support: string;
    facebook: string;
    tiktok: string;
  };
};

const en: BotStrings = {
  labels: { order: "Order", status: "Status" },
  statusNames: {
    pending_payment: "Awaiting payment",
    paid: "Paid",
    processing: "Delivering",
    delivered: "Delivered",
    failed: "Problem",
    refunded: "Refunded",
    expired: "Expired",
    cancelled: "Cancelled",
  },
  statusHints: {
    pending_payment: "Waiting for your KHQR payment. Open the order page to scan the QR code.",
    paid: "We're delivering your top-up — usually 1–5 minutes.",
    processing: "We're delivering your top-up — usually 1–5 minutes.",
    delivered: "Delivered. Open the game to see it — have fun!",
    failed: "There was a problem with the delivery. Your payment is safe — we'll retry or refund you.",
    refunded: "Your payment was refunded.",
    expired: "The payment time ran out. Already paid? Contact us with your order code.",
    cancelled: "Cancelled before payment — no money was taken.",
  },
  linked: {
    title: "🔔 <b>You'll get updates here</b>",
    body: "We'll message you in this chat as soon as order <code>{code}</code> is delivered.",
  },
  updates: {
    paid: {
      title: "✅ <b>Payment received — thank you!</b>",
      body: "We're now sending {package} to {player}. Most orders arrive within 1–5 minutes.",
    },
    processing: {
      title: "🔄 <b>We're retrying your top-up</b>",
      body: "{package} is on its way to {player}. We'll message you when it's done.",
    },
    delivered: {
      title: "🎉 <b>Top-up delivered!</b>",
      body: "{package} has been sent to {player}. Open {game} to see it — have fun!",
    },
    failed: {
      title: "⚠️ <b>We couldn't complete your top-up</b>",
      body: "Sorry! Your payment is safe. Our team will retry the delivery or refund you. Order code: <code>{code}</code>",
    },
    refunded: {
      title: "↩️ <b>Order refunded</b>",
      body: "Your payment for order <code>{code}</code> was refunded.",
    },
    expired: {
      title: "⌛ <b>Payment time ran out</b>",
      body: "The QR code for order <code>{code}</code> expired before we received a payment. Already paid? Don't worry — contact us with your order code and we'll sort it out.",
    },
    cancelled: {
      title: "🚫 <b>Order cancelled</b>",
      body: "Order <code>{code}</code> was cancelled before payment, so no money was taken. You can place a new order any time.",
    },
  },
  contact: "💬 Need help? {links}",
  follow: {
    ask: "❤️ Enjoyed it? Follow us on {networks} for flash deals, new games and giveaways.",
    and: " &amp; ",
    promo: "🎁 Followers save with code <code>{code}</code> on their next top-up.",
  },
  welcome: {
    title: "👋 <b>Welcome to {store}!</b>",
    pay: "💳 Pay in seconds with KHQR — ABA, ACLEDA, Wing or any bank app.",
    order: "🎮 Order on our website: {site}",
    updates:
      "🔔 <b>Get delivery updates here:</b> after you order, tap <b>Get updates on Telegram</b> on your order page — or send me your order code, e.g. <code>/status SK7F3K9Q2M</code>.",
  },
  help: "<b>How I can help</b>\n/status <code>CODE</code> — check an order\n/start — welcome &amp; website link\n\nTo get updates automatically, tap <b>Get updates on Telegram</b> on your order page.",
  status: {
    usage: "Send your order code, e.g. <code>/status SK7F3K9Q2M</code>. You'll find it on your order page.",
    notFound: "😕 We couldn't find that order. Please check the code (it starts with SK) and try again.",
    recent: "📋 <b>Your recent orders</b>",
    recentHint: "Send <code>/status CODE</code> for details.",
  },
  buttons: {
    viewOrder: "🧾 View order",
    payNow: "💳 Pay now",
    topUpAgain: "🎮 Top up again",
    orderAgain: "🛒 Order again",
    website: "🎮 Top up now",
    support: "💬 Contact us",
    facebook: "📘 Facebook",
    tiktok: "🎵 TikTok",
  },
};

const km: BotStrings = {
  labels: { order: "ការបញ្ជាទិញ", status: "ស្ថានភាព" },
  statusNames: {
    pending_payment: "រង់ចាំការបង់ប្រាក់",
    paid: "បានបង់ប្រាក់",
    processing: "កំពុងបញ្ចូល",
    delivered: "បានបញ្ចូលរួច",
    failed: "មានបញ្ហា",
    refunded: "បានសងប្រាក់វិញ",
    expired: "ផុតកំណត់",
    cancelled: "បានបោះបង់",
  },
  statusHints: {
    pending_payment: "កំពុងរង់ចាំការបង់ប្រាក់តាម KHQR។ សូមបើកទំព័រការបញ្ជាទិញ ដើម្បីស្កេនកូដ QR។",
    paid: "យើងកំពុងបញ្ចូលជូនអ្នក — ជាធម្មតាប្រើពេល 1–5 នាទី។",
    processing: "យើងកំពុងបញ្ចូលជូនអ្នក — ជាធម្មតាប្រើពេល 1–5 នាទី។",
    delivered: "បានបញ្ចូលរួចហើយ។ បើកហ្គេមដើម្បីពិនិត្យមើល — រីករាយក្នុងការលេង!",
    failed: "មានបញ្ហាក្នុងការបញ្ចូល។ ប្រាក់របស់អ្នកមានសុវត្ថិភាព — យើងនឹងព្យាយាមបញ្ចូលម្តងទៀត ឬសងប្រាក់ជូនអ្នកវិញ។",
    refunded: "ប្រាក់របស់អ្នកត្រូវបានសងវិញហើយ។",
    expired: "ផុតពេលបង់ប្រាក់ហើយ។ បានបង់រួចហើយមែនទេ? សូមទាក់ទងយើងជាមួយលេខកូដការបញ្ជាទិញ។",
    cancelled: "បានបោះបង់មុនពេលបង់ប្រាក់ — មិនមានការកាត់ប្រាក់ទេ។",
  },
  linked: {
    title: "🔔 <b>អ្នកនឹងទទួលបានដំណឹងនៅទីនេះ</b>",
    body: "យើងនឹងផ្ញើសារជូនអ្នកក្នុងការជជែកនេះ ភ្លាមៗពេលការបញ្ជាទិញ <code>{code}</code> បញ្ចូលរួចរាល់។",
  },
  updates: {
    paid: {
      title: "✅ <b>បានទទួលការបង់ប្រាក់ — សូមអរគុណ!</b>",
      body: "យើងកំពុងបញ្ចូល {package} ទៅកាន់ {player}។ ការបញ្ជាទិញភាគច្រើនបញ្ចូលរួចក្នុងរយៈពេល 1–5 នាទី។",
    },
    processing: {
      title: "🔄 <b>យើងកំពុងព្យាយាមបញ្ចូលម្តងទៀត</b>",
      body: "{package} កំពុងបញ្ចូលទៅកាន់ {player}។ យើងនឹងផ្ញើសារជូនអ្នក ពេលបញ្ចូលរួចរាល់។",
    },
    delivered: {
      title: "🎉 <b>បញ្ចូលរួចរាល់!</b>",
      body: "{package} ត្រូវបានបញ្ចូលទៅកាន់ {player} ហើយ។ បើក {game} ដើម្បីពិនិត្យមើល — រីករាយក្នុងការលេង!",
    },
    failed: {
      title: "⚠️ <b>យើងមិនអាចបញ្ចប់ការបញ្ចូលរបស់អ្នកបានទេ</b>",
      body: "សូមអភ័យទោស! ប្រាក់របស់អ្នកមានសុវត្ថិភាព។ ក្រុមការងាររបស់យើងនឹងព្យាយាមបញ្ចូលម្តងទៀត ឬសងប្រាក់ជូនអ្នកវិញ។ លេខកូដការបញ្ជាទិញ៖ <code>{code}</code>",
    },
    refunded: {
      title: "↩️ <b>ការបញ្ជាទិញត្រូវបានសងប្រាក់វិញ</b>",
      body: "ប្រាក់ដែលអ្នកបានបង់សម្រាប់ការបញ្ជាទិញ <code>{code}</code> ត្រូវបានសងវិញហើយ។",
    },
    expired: {
      title: "⌛ <b>ផុតពេលបង់ប្រាក់</b>",
      body: "កូដ QR សម្រាប់ការបញ្ជាទិញ <code>{code}</code> បានផុតកំណត់ មុនពេលយើងទទួលបានការបង់ប្រាក់។ ប្រសិនបើអ្នកបានបង់រួចហើយ កុំបារម្ភ — សូមទាក់ទងយើងជាមួយលេខកូដការបញ្ជាទិញ យើងនឹងដោះស្រាយជូន។",
    },
    cancelled: {
      title: "🚫 <b>ការបញ្ជាទិញត្រូវបានបោះបង់</b>",
      body: "ការបញ្ជាទិញ <code>{code}</code> ត្រូវបានបោះបង់មុនពេលបង់ប្រាក់ ដូច្នេះមិនមានការកាត់ប្រាក់ទេ។ អ្នកអាចបញ្ជាទិញថ្មីបានគ្រប់ពេល។",
    },
  },
  contact: "💬 ត្រូវការជំនួយ? {links}",
  follow: {
    ask: "❤️ ពេញចិត្តទេ? តាមដានយើងលើ {networks} ដើម្បីទទួលបានប្រូម៉ូសិនពិសេស ហ្គេមថ្មីៗ និងកម្មវិធីចាប់រង្វាន់។",
    and: " និង ",
    promo: "🎁 អ្នកតាមដានទទួលបានការបញ្ចុះតម្លៃជាមួយកូដ <code>{code}</code> សម្រាប់ការបញ្ចូលលើកក្រោយ។",
  },
  welcome: {
    title: "👋 <b>សូមស្វាគមន៍មកកាន់ {store}!</b>",
    pay: "💳 បង់ប្រាក់ក្នុងពេលប៉ុន្មានវិនាទីតាម KHQR — ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារណាមួយ។",
    order: "🎮 បញ្ជាទិញនៅលើគេហទំព័ររបស់យើង៖ {site}",
    updates:
      "🔔 <b>ទទួលដំណឹងការបញ្ចូលនៅទីនេះ៖</b> បន្ទាប់ពីបញ្ជាទិញ សូមចុច <b>ទទួលដំណឹងតាម Telegram</b> នៅលើទំព័រការបញ្ជាទិញ — ឬផ្ញើលេខកូដការបញ្ជាទិញមកខ្ញុំ ឧ. <code>/status SK7F3K9Q2M</code>។",
  },
  help: "<b>ខ្ញុំអាចជួយអ្វីបាន</b>\n/status <code>លេខកូដ</code> — ពិនិត្យការបញ្ជាទិញ\n/start — ស្វាគមន៍ និងតំណគេហទំព័រ\n\nដើម្បីទទួលដំណឹងដោយស្វ័យប្រវត្តិ សូមចុច <b>ទទួលដំណឹងតាម Telegram</b> នៅលើទំព័រការបញ្ជាទិញរបស់អ្នក។",
  status: {
    usage: "សូមផ្ញើលេខកូដការបញ្ជាទិញរបស់អ្នក ឧ. <code>/status SK7F3K9Q2M</code>។ អ្នកអាចរកវាឃើញនៅលើទំព័រការបញ្ជាទិញ។",
    notFound: "😕 រកមិនឃើញការបញ្ជាទិញនេះទេ។ សូមពិនិត្យលេខកូដ (ចាប់ផ្តើមដោយ SK) ហើយព្យាយាមម្តងទៀត។",
    recent: "📋 <b>ការបញ្ជាទិញថ្មីៗរបស់អ្នក</b>",
    recentHint: "ផ្ញើ <code>/status លេខកូដ</code> ដើម្បីមើលព័ត៌មានលម្អិត។",
  },
  buttons: {
    viewOrder: "🧾 មើលការបញ្ជាទិញ",
    payNow: "💳 បង់ប្រាក់ឥឡូវ",
    topUpAgain: "🎮 បញ្ចូលម្តងទៀត",
    orderAgain: "🛒 បញ្ជាទិញម្តងទៀត",
    website: "🎮 បញ្ចូលឥឡូវនេះ",
    support: "💬 ទាក់ទងយើង",
    facebook: "📘 Facebook",
    tiktok: "🎵 TikTok",
  },
};

export const BOT_STRINGS: Record<Locale, BotStrings> = { en, km };

export function botStrings(locale: Locale): BotStrings {
  return BOT_STRINGS[locale] ?? en;
}

/** Fill {placeholders}. Values must already be HTML-safe. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key]! : match));
}
