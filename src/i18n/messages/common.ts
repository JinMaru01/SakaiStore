import type { NamespaceMessages } from "../translate";

// "common" namespace. Keep en and km keys identical (checked by src/i18n/messages.test.ts).
const messages = {
  en: {
    language: "Language",
    loading: "Loading…",
    retry: "Try again",
    copy: "Copy",
    copied: "Copied!",
    back: "Back",
    close: "Close",
    error: "Something went wrong. Please try again.",
    skipToContent: "Skip to content",
    fromPrice: "from {price}",
    nav: {
      label: "Main",
      home: "Home",
      games: "Games",
      track: "Track order",
      faq: "FAQ",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    payments: {
      anyBakong: "any Bakong app",
    },
    footer: {
      about:
        "{store} is a fast, low-cost game top-up shop in Cambodia. Pay with KHQR from any bank app and get your diamonds, UC and passes in minutes.",
      quickLinks: "Quick links",
      payments: "We accept",
      paymentsNote: "Prices in US dollars. Payments are confirmed automatically.",
      support: "Support",
      telegram: "Telegram",
      phone: "Phone",
      hours: "Chat with a real person — we reply as fast as we can.",
      terms: "Terms of service",
      privacy: "Privacy policy",
      disclaimer:
        "{store} is an independent reseller and is not affiliated with the game publishers. All trademarks belong to their owners.",
      copyright: "© {year} {store}. All rights reserved.",
    },
    notFound: {
      title: "Page not found",
      body: "The page you're looking for doesn't exist or has moved. Check the link, or head back to the games.",
      home: "Back to home",
      track: "Track an order",
    },
    errorPage: {
      title: "Something went wrong",
      body: "Sorry, we hit an unexpected problem. Please try again — your orders and payments are safe.",
      reference: "Error reference:",
    },
  },
  km: {
    language: "ភាសា",
    loading: "កំពុងដំណើរការ…",
    retry: "ព្យាយាមម្តងទៀត",
    copy: "ចម្លង",
    copied: "បានចម្លង!",
    back: "ត្រឡប់ក្រោយ",
    close: "បិទ",
    error: "មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។",
    skipToContent: "រំលងទៅខ្លឹមសារ",
    fromPrice: "ចាប់ពី {price}",
    nav: {
      label: "ម៉ឺនុយមេ",
      home: "ទំព័រដើម",
      games: "ហ្គេម",
      track: "តាមដានការបញ្ជាទិញ",
      faq: "សំណួរញឹកញាប់",
      openMenu: "បើកម៉ឺនុយ",
      closeMenu: "បិទម៉ឺនុយ",
    },
    payments: {
      anyBakong: "គ្រប់កម្មវិធីបាគង",
    },
    footer: {
      about:
        "{store} ជាហាងបញ្ចូលហ្គេមលឿន និងតម្លៃថោកនៅកម្ពុជា។ បង់ប្រាក់ដោយ KHQR ពីកម្មវិធីធនាគារណាមួយ ហើយទទួលបាន Diamonds, UC និង Pass ក្នុងរយៈពេលប៉ុន្មាននាទី។",
      quickLinks: "តំណភ្ជាប់រហ័ស",
      payments: "យើងទទួលយក",
      paymentsNote: "តម្លៃគិតជាដុល្លារអាមេរិក។ ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិ។",
      support: "ជំនួយ",
      telegram: "Telegram",
      phone: "ទូរស័ព្ទ",
      hours: "ជជែកជាមួយមនុស្សពិតប្រាកដ — យើងឆ្លើយតបឱ្យបានលឿនបំផុត។",
      terms: "លក្ខខណ្ឌប្រើប្រាស់",
      privacy: "គោលការណ៍ឯកជនភាព",
      disclaimer:
        "{store} គឺជាអ្នកលក់បន្តឯករាជ្យ ហើយមិនមានទំនាក់ទំនងជាមួយក្រុមហ៊ុនបោះពុម្ពហ្គេមទាំងនោះទេ។ ពាណិជ្ជសញ្ញាទាំងអស់ជាកម្មសិទ្ធិរបស់ម្ចាស់រៀងៗខ្លួន។",
      copyright: "© {year} {store}។ រក្សាសិទ្ធិគ្រប់យ៉ាង។",
    },
    notFound: {
      title: "រកមិនឃើញទំព័រ",
      body: "ទំព័រដែលអ្នកកំពុងស្វែងរកមិនមាន ឬត្រូវបានផ្លាស់ទីតាំង។ សូមពិនិត្យតំណភ្ជាប់ ឬត្រឡប់ទៅមើលហ្គេមវិញ។",
      home: "ត្រឡប់ទៅទំព័រដើម",
      track: "តាមដានការបញ្ជាទិញ",
    },
    errorPage: {
      title: "មានបញ្ហាកើតឡើង",
      body: "សូមអភ័យទោស យើងជួបបញ្ហាដែលមិនបានរំពឹងទុក។ សូមព្យាយាមម្តងទៀត — ការបញ្ជាទិញ និងការបង់ប្រាក់របស់អ្នកនៅតែមានសុវត្ថិភាព។",
      reference: "លេខយោងកំហុស៖",
    },
  },
} satisfies NamespaceMessages;

export default messages;
