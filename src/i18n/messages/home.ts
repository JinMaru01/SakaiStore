import type { NamespaceMessages } from "../translate";

// "home" namespace. Keep en and km keys identical (checked by src/i18n/messages.test.ts).
const messages = {
  en: {
    meta: {
      title: "Game top-up in Cambodia — MLBB, Free Fire, PUBG with KHQR",
      description:
        "Top up Mobile Legends diamonds, Free Fire, PUBG Mobile UC and more in Cambodia. Pay with KHQR (ABA, ACLEDA, Wing) and get your top-up in minutes.",
    },
    hero: {
      badge: "Cambodia's game top-up store",
      titleLine1: "Top up your games",
      titleLine2: "in minutes, for less",
      subtitle:
        "Diamonds, UC and passes for Mobile Legends, Free Fire, PUBG Mobile and more. Scan to pay with KHQR from ABA, ACLEDA, Wing or any bank app.",
      cta: "Top up now",
      secondary: "Track order",
      paidToast: "Payment received",
      paidToastSub: "Delivering your diamonds…",
    },
    trust: {
      instant: "Instant delivery",
      khqr: "Pay with KHQR",
      support: "Real human support",
      cheapest: "Cheapest prices",
    },
    games: {
      popularTitle: "Popular games",
      popularSubtitle: "The top-ups everyone is buying right now",
      allTitle: "All games",
      allSubtitle: "{count} games available — pick yours to start",
      empty: "No games are available right now. Please check back soon.",
      topUp: "Top up",
    },
    how: {
      title: "How it works",
      subtitle: "Four quick steps, no account needed",
      step1: { title: "Choose your game", body: "Pick the game and the package you want." },
      step2: {
        title: "Enter your player ID",
        body: "Type your ID (and zone or server). Check the name to make sure it's you.",
      },
      step3: { title: "Pay with KHQR", body: "Scan the QR with ABA, ACLEDA, Wing or any Bakong bank app." },
      step4: {
        title: "Get your top-up",
        body: "Payment confirms automatically and we deliver to your account in minutes.",
      },
    },
    payments: {
      title: "Pay with any Cambodian bank app",
      body: "Every order gets its own KHQR code. Scan it with your bank app and the payment is confirmed automatically — no screenshots, no waiting for a reply.",
    },
    faq: {
      title: "Questions? We have answers",
      subtitle: "Everything you need to know before your first top-up",
      more: "See all questions",
    },
    cta: {
      title: "Ready to level up?",
      body: "Pick your game, pay with KHQR and get back to playing in minutes.",
      button: "Choose a game",
    },
  },
  km: {
    meta: {
      title: "បញ្ចូលហ្គេមនៅកម្ពុជា — MLBB, Free Fire, PUBG តាម KHQR",
      description:
        "បញ្ចូល Diamonds Mobile Legends, Free Fire, UC PUBG Mobile និងហ្គេមជាច្រើនទៀតនៅកម្ពុជា។ បង់ប្រាក់ដោយ KHQR (ABA, ACLEDA, Wing) ហើយទទួលបានក្នុងរយៈពេលប៉ុន្មាននាទី។",
    },
    hero: {
      badge: "ហាងបញ្ចូលហ្គេមសម្រាប់អ្នកលេងនៅកម្ពុជា",
      titleLine1: "បញ្ចូលហ្គេមរបស់អ្នក",
      titleLine2: "លឿនទាន់ចិត្ត តម្លៃសមរម្យ",
      subtitle:
        "Diamonds, UC និង Pass សម្រាប់ Mobile Legends, Free Fire, PUBG Mobile និងហ្គេមជាច្រើនទៀត។ ស្កេនបង់ប្រាក់ដោយ KHQR តាម ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារណាមួយ។",
      cta: "បញ្ចូលឥឡូវនេះ",
      secondary: "តាមដានការបញ្ជាទិញ",
      paidToast: "បានទទួលការបង់ប្រាក់",
      paidToastSub: "កំពុងបញ្ចូល Diamonds ជូនអ្នក…",
    },
    trust: {
      instant: "បញ្ចូលភ្លាមៗ",
      khqr: "បង់ប្រាក់ដោយ KHQR",
      support: "មានមនុស្សពិតជួយ",
      cheapest: "តម្លៃថោកបំផុត",
    },
    games: {
      popularTitle: "ហ្គេមពេញនិយម",
      popularSubtitle: "កញ្ចប់បញ្ចូលដែលអ្នកលេងទិញច្រើនជាងគេ",
      allTitle: "ហ្គេមទាំងអស់",
      allSubtitle: "មាន {count} ហ្គេម — ជ្រើសរើសហ្គេមរបស់អ្នកដើម្បីចាប់ផ្តើម",
      empty: "បច្ចុប្បន្នមិនទាន់មានហ្គេមនៅឡើយទេ។ សូមត្រឡប់មកមើលម្តងទៀតឆាប់ៗនេះ។",
      topUp: "បញ្ចូល",
    },
    how: {
      title: "របៀបបញ្ចូល",
      subtitle: "បួនជំហានងាយៗ មិនចាំបាច់បង្កើតគណនី",
      step1: { title: "ជ្រើសរើសហ្គេម", body: "ជ្រើសរើសហ្គេម និងកញ្ចប់ដែលអ្នកចង់បាន។" },
      step2: {
        title: "បញ្ចូល ID អ្នកលេង",
        body: "វាយបញ្ចូល ID (និង Zone ឬ Server) របស់អ្នក។ ចុចពិនិត្យឈ្មោះ ដើម្បីប្រាកដថាត្រឹមត្រូវ។",
      },
      step3: {
        title: "បង់ប្រាក់ដោយ KHQR",
        body: "ស្កេន QR ដោយកម្មវិធី ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារណាមួយដែលភ្ជាប់បាគង។",
      },
      step4: {
        title: "ទទួលបានការបញ្ចូល",
        body: "ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិ ហើយយើងបញ្ចូលទៅគណនីរបស់អ្នកក្នុងរយៈពេលប៉ុន្មាននាទី។",
      },
    },
    payments: {
      title: "បង់ប្រាក់តាមកម្មវិធីធនាគារណាមួយនៅកម្ពុជា",
      body: "ការបញ្ជាទិញនីមួយៗមានកូដ KHQR ផ្ទាល់ខ្លួន។ គ្រាន់តែស្កេនដោយកម្មវិធីធនាគាររបស់អ្នក ការបង់ប្រាក់នឹងត្រូវបញ្ជាក់ដោយស្វ័យប្រវត្តិ — មិនចាំបាច់ផ្ញើរូបថតអេក្រង់ ឬរង់ចាំការឆ្លើយតបឡើយ។",
    },
    faq: {
      title: "មានសំណួរ? យើងមានចម្លើយ",
      subtitle: "អ្វីៗដែលអ្នកគួរដឹង មុនពេលបញ្ចូលលើកដំបូង",
      more: "មើលសំណួរទាំងអស់",
    },
    cta: {
      title: "ត្រៀមខ្លួនឡើងកម្រិតហើយឬនៅ?",
      body: "ជ្រើសរើសហ្គេម បង់ប្រាក់ដោយ KHQR ហើយត្រឡប់ទៅលេងវិញក្នុងរយៈពេលប៉ុន្មាននាទី។",
      button: "ជ្រើសរើសហ្គេម",
    },
  },
} satisfies NamespaceMessages;

export default messages;
