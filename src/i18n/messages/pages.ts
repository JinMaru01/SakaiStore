import type { NamespaceMessages } from "../translate";

// "pages" namespace (FAQ, terms, privacy). Keep en and km keys identical (checked by src/i18n/messages.test.ts).
// Blank lines ("\n\n") inside bodies split paragraphs.
const messages = {
  en: {
    toc: "On this page",
    contactFallback: "the chat button on our website",
    faq: {
      metaTitle: "FAQ — game top-up help",
      title: "Frequently asked questions",
      subtitle: "Quick answers about delivery, payments, player IDs and refunds.",
      description:
        "Answers about delivery times, finding your player ID, KHQR payments, promo codes and refunds.",
      stillTitle: "Still need help?",
      stillBody: "Chat with a real person — we're happy to help.",
      items: {
        delivery: {
          q: "How long does delivery take?",
          a: "Most orders are delivered within 1–5 minutes after the payment is confirmed. At busy times it can take up to 30 minutes.\n\nYou can follow the progress live on your order page, and if you turn on Telegram updates we'll message you as soon as it's done.",
        },
        findId: {
          q: "Where do I find my player ID?",
          a: "Open your profile in the game — the ID is usually shown under your nickname. For Mobile Legends, the number in brackets is your Zone ID, e.g. 123456789 (1234).\n\nEvery game page also has a \"How to find your ID\" guide right under the ID field.",
        },
        payment: {
          q: "Which payment methods do you accept?",
          a: "We accept KHQR, Cambodia's national QR payment standard. You can scan it with ABA, ACLEDA, Wing and any other bank or wallet app connected to Bakong.\n\nPrices are in US dollars; the riel amount shown is only an estimate.",
        },
        safety: {
          q: "Is it safe? Do you need my password?",
          a: "We never ask for your game password or login — only your player ID (and zone or server if the game needs one). Payments go directly through your own bank app with KHQR, so we never see your card or bank details.",
        },
        wrongId: {
          q: "I entered the wrong player ID. What should I do?",
          a: "Contact us right away on Telegram or Messenger with your order code. If the top-up hasn't been delivered yet, we can correct it.\n\nOnce diamonds or UC are delivered to an account, the publisher usually doesn't let us move them, so please use the \"Check player name\" button before you pay.",
        },
        notReceived: {
          q: "I paid but haven't received my top-up. What now?",
          a: "First check your order page — it updates automatically. If it still says \"Awaiting payment\" a few minutes after you paid, or more than 30 minutes have passed since payment, contact us with your order code and a screenshot of your bank receipt. We'll check with the bank and fix it quickly.",
        },
        expired: {
          q: "My QR code expired. Can I still pay?",
          a: "Each KHQR code is valid for a limited time. If it expired before you paid, simply place a new order.\n\nIf you paid just as it expired, don't pay again — contact us with your order code and we'll match your payment.",
        },
        refund: {
          q: "Can I get a refund?",
          a: "Top-ups are digital goods delivered instantly, so we can't refund an order that was delivered to the player ID you entered.\n\nIf we can't deliver your order for any reason, we'll deliver it again or refund you in full — your choice.",
        },
        promo: {
          q: "How do I use a promo code?",
          a: "Enter the code in the \"Promo code\" step on the game page and tap Apply — the discount appears immediately. Follow our Facebook page and TikTok to get exclusive codes.\n\nEach code may have conditions, such as a minimum order or an end date.",
        },
        contact: {
          q: "How can I contact you?",
          a: "Tap the chat button at the bottom of any page to reach us on Messenger or Telegram. You'll talk to a real person. Please include your order code so we can help you faster.",
        },
      },
    },
    terms: {
      title: "Terms of service",
      description: "The rules for buying game top-ups from our store.",
      updated: "Last updated: October 2026",
      intro:
        "These terms apply when you buy game top-ups from {store}. By placing an order you agree to them. Please read them carefully — they are short.",
      sections: {
        service: {
          title: "Our service",
          body: "{store} is an independent reseller of in-game currency, passes and other digital items for mobile and PC games, serving customers in Cambodia. We are not affiliated with, endorsed by or sponsored by any game publisher. Game names and logos are trademarks of their respective owners.",
        },
        orders: {
          title: "Placing an order",
          body: "You are responsible for entering the correct player ID, zone or server and choosing the right package. Please use the \"Check player name\" button when it is available. We deliver to the account details you provide and cannot be responsible for top-ups sent to an ID that was entered incorrectly.\n\nWe may refuse or cancel an order if we suspect fraud or abuse, or if the item becomes unavailable. If we cancel an order you have already paid for, we will refund you in full.",
        },
        prices: {
          title: "Prices",
          body: "Prices are shown in US dollars (USD). The amount in Cambodian riel (KHR) is an estimate for convenience only. Prices may change at any time, but the price shown on your order page when you pay is the price you pay.",
        },
        payment: {
          title: "Payment",
          body: "Payments are made with KHQR through ABA, ACLEDA, Wing or any other bank or wallet app connected to Bakong. Each KHQR code is valid for a limited time and for one order only. Please pay the exact amount shown.\n\nPayments are confirmed automatically with the bank. We never ask for your bank login, card details or game password.",
        },
        delivery: {
          title: "Delivery",
          body: "Most orders are delivered within minutes after the payment is confirmed, but delivery can occasionally take longer because of game publisher or network delays. Your order page shows the current status. If delivery is delayed, we keep working on it and will contact you if we need more information.",
        },
        refunds: {
          title: "Cancellations and refunds",
          body: "You can cancel an order before paying. Because top-ups are digital goods delivered to your game account, completed deliveries cannot be cancelled or refunded, including when an incorrect player ID was entered.\n\nIf we are unable to deliver a paid order, we will either deliver it again or refund the full amount to the account you paid from, after confirming the payment with the bank.",
        },
        promos: {
          title: "Promo codes",
          body: "Promo codes may have conditions such as a minimum order amount, a maximum discount, a usage limit, an end date or specific games. Codes cannot be exchanged for cash. We may end a promotion at any time and may cancel orders that abuse promo codes.",
        },
        conduct: {
          title: "Acceptable use",
          body: "Please do not use our website for fraud, to test stolen payment methods, to resell top-ups without our permission, or to interfere with the website. The game publishers' own terms also apply to your game account and the items you receive.",
        },
        liability: {
          title: "Liability",
          body: "We provide our service with care, but we cannot control game publishers, banks or networks. To the extent permitted by law, our responsibility for any order is limited to the amount you paid for that order. Nothing in these terms limits your rights under the laws of the Kingdom of Cambodia.",
        },
        changes: {
          title: "Changes and contact",
          body: "We may update these terms from time to time; the version on this page applies to new orders. If you have a question about these terms or an order, contact us via {contact}.",
        },
      },
    },
    privacy: {
      title: "Privacy policy",
      description: "How we collect, use and protect your information.",
      updated: "Last updated: October 2026",
      intro:
        "{store} respects your privacy. This policy explains what information we collect when you use our website and how we use it. We only collect what we need to deliver your top-ups and run our store.",
      sections: {
        collect: {
          title: "Information we collect",
          body: "Order details: the game, package, player ID, zone or server, and the player name returned by the game when available.\n\nContact details you choose to give us, such as your phone number or Telegram username, and your Telegram chat if you turn on order updates.\n\nPayment details: the payment reference and amount confirmed by the bank. We never receive your bank login, card number or game password.\n\nTechnical and marketing data: your language choice, basic device and browser information, a hashed (anonymised) IP address used to prevent abuse, and how you arrived at our site (for example a Facebook or TikTok link).",
        },
        use: {
          title: "How we use it",
          body: "We use your information to process and deliver orders, confirm payments, send you order updates, provide customer support, prevent fraud and abuse, and understand which pages and promotions work well so we can improve our store.",
        },
        marketing: {
          title: "Cookies, pixels and social media",
          body: "We use a small number of cookies to remember your language and which link, post or ad last brought you to our site (kept for 30 days). When enabled, we also use the Meta (Facebook) Pixel and the TikTok Pixel to measure how our ads and posts perform. These tools may set their own cookies and are covered by Meta's and TikTok's privacy policies. You can limit them in your browser or app settings.",
        },
        sharing: {
          title: "When we share information",
          body: "We share information only when needed to provide our service: with banks and the Bakong system to confirm payments, with game publishers or suppliers to deliver your top-up, with Telegram when you choose to receive updates there, and with authorities when the law requires it. We do not sell your personal information.",
        },
        storage: {
          title: "Storage and security",
          body: "Your information is stored on secure servers with access limited to our team. Some information, such as your recent order codes and last used player ID, is saved only in your own browser so you can reorder faster; you can clear it at any time.",
        },
        retention: {
          title: "How long we keep it",
          body: "We keep order records for as long as needed for customer support, accounting and legal obligations, and then delete or anonymise them.",
        },
        rights: {
          title: "Your choices",
          body: "You can ask us to see, correct or delete your personal information, or to stop sending you Telegram updates, by contacting us via {contact}. Some order records may need to be kept for accounting or legal reasons.",
        },
        children: {
          title: "Children",
          body: "Our store is meant for players who can pay on their own or with their parents' permission. If you are under 18, please ask a parent or guardian before buying.",
        },
        changes: {
          title: "Changes to this policy",
          body: "We may update this policy from time to time. The latest version is always available on this page.",
        },
      },
    },
  },
  km: {
    toc: "ក្នុងទំព័រនេះ",
    contactFallback: "ប៊ូតុងជជែកនៅលើគេហទំព័ររបស់យើង",
    faq: {
      metaTitle: "សំណួរញឹកញាប់ — ជំនួយអំពីការបញ្ចូលហ្គេម",
      title: "សំណួរដែលសួរញឹកញាប់",
      subtitle: "ចម្លើយរហ័សអំពីការបញ្ចូល ការបង់ប្រាក់ ID អ្នកលេង និងការសងប្រាក់វិញ។",
      description:
        "ចម្លើយអំពីរយៈពេលបញ្ចូល ការស្វែងរក ID អ្នកលេង ការបង់ប្រាក់ KHQR កូដបញ្ចុះតម្លៃ និងការសងប្រាក់វិញ។",
      stillTitle: "នៅតែត្រូវការជំនួយ?",
      stillBody: "ជជែកជាមួយមនុស្សពិតប្រាកដ — យើងរីករាយនឹងជួយអ្នក។",
      items: {
        delivery: {
          q: "ការបញ្ចូលចំណាយពេលប៉ុន្មាន?",
          a: "ការបញ្ជាទិញភាគច្រើនត្រូវបានបញ្ចូលក្នុងរយៈពេល 1–5 នាទី បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់។ នៅពេលមមាញឹក វាអាចចំណាយពេលរហូតដល់ 30 នាទី។\n\nអ្នកអាចតាមដានដំណើរការផ្ទាល់នៅលើទំព័រការបញ្ជាទិញរបស់អ្នក ហើយប្រសិនបើអ្នកបើកការជូនដំណឹងតាម Telegram យើងនឹងផ្ញើសារជូនអ្នកភ្លាមៗ នៅពេលបញ្ចូលរួច។",
        },
        findId: {
          q: "តើខ្ញុំអាចរក ID អ្នកលេងរបស់ខ្ញុំនៅឯណា?",
          a: "បើកប្រវត្តិរូប (Profile) របស់អ្នកក្នុងហ្គេម — ជាធម្មតា ID បង្ហាញនៅក្រោមឈ្មោះហៅរបស់អ្នក។ សម្រាប់ Mobile Legends លេខនៅក្នុងវង់ក្រចកគឺជា Zone ID របស់អ្នក ឧ. 123456789 (1234)។\n\nទំព័រហ្គេមនីមួយៗក៏មានការណែនាំ «របៀបស្វែងរក ID» នៅក្រោមប្រអប់បញ្ចូល ID ផងដែរ។",
        },
        payment: {
          q: "តើអ្នកទទួលយកការបង់ប្រាក់បែបណាខ្លះ?",
          a: "យើងទទួលយក KHQR ដែលជាស្តង់ដារបង់ប្រាក់តាម QR ថ្នាក់ជាតិរបស់កម្ពុជា។ អ្នកអាចស្កេនវាដោយ ABA, ACLEDA, Wing និងកម្មវិធីធនាគារ ឬកាបូបអេឡិចត្រូនិកផ្សេងទៀតដែលភ្ជាប់ជាមួយបាគង។\n\nតម្លៃគិតជាដុល្លារអាមេរិក ចំណែកចំនួនប្រាក់រៀលដែលបង្ហាញ គ្រាន់តែជាការប៉ាន់ប្រមាណប៉ុណ្ណោះ។",
        },
        safety: {
          q: "តើមានសុវត្ថិភាពទេ? តើត្រូវការពាក្យសម្ងាត់របស់ខ្ញុំទេ?",
          a: "យើងមិនដែលសុំពាក្យសម្ងាត់ ឬព័ត៌មានចូលគណនីហ្គេមរបស់អ្នកទេ — យើងត្រូវការតែ ID អ្នកលេង (និង Zone ឬ Server ប្រសិនបើហ្គេមតម្រូវ)។ ការបង់ប្រាក់ធ្វើឡើងផ្ទាល់តាមកម្មវិធីធនាគាររបស់អ្នកតាម KHQR ដូច្នេះយើងមិនដែលឃើញព័ត៌មានកាត ឬគណនីធនាគាររបស់អ្នកឡើយ។",
        },
        wrongId: {
          q: "ខ្ញុំបញ្ចូល ID អ្នកលេងខុស។ តើត្រូវធ្វើដូចម្តេច?",
          a: "សូមទាក់ទងយើងភ្លាមៗតាម Telegram ឬ Messenger ជាមួយលេខកូដការបញ្ជាទិញរបស់អ្នក។ ប្រសិនបើមិនទាន់បានបញ្ចូលទេ យើងអាចកែតម្រូវបាន។\n\nនៅពេល Diamonds ឬ UC ត្រូវបានបញ្ចូលទៅគណនីណាមួយហើយ ជាធម្មតាក្រុមហ៊ុនហ្គេមមិនអនុញ្ញាតឱ្យផ្ទេរវិញទេ ដូច្នេះសូមប្រើប៊ូតុង «ពិនិត្យឈ្មោះអ្នកលេង» មុនពេលបង់ប្រាក់។",
        },
        notReceived: {
          q: "ខ្ញុំបានបង់ប្រាក់ហើយ តែមិនទាន់ទទួលបាន។ តើត្រូវធ្វើអ្វី?",
          a: "ជាដំបូង សូមពិនិត្យទំព័រការបញ្ជាទិញរបស់អ្នក — វាធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិ។ ប្រសិនបើវានៅតែបង្ហាញ «រង់ចាំការបង់ប្រាក់» ប៉ុន្មាននាទីក្រោយពេលអ្នកបង់ ឬកន្លងផុត 30 នាទីក្រោយការបង់ប្រាក់ សូមទាក់ទងយើងជាមួយលេខកូដការបញ្ជាទិញ និងរូបថតបង្កាន់ដៃធនាគារ។ យើងនឹងពិនិត្យជាមួយធនាគារ ហើយដោះស្រាយជូនយ៉ាងរហ័ស។",
        },
        expired: {
          q: "កូដ QR របស់ខ្ញុំផុតកំណត់។ តើខ្ញុំនៅតែអាចបង់បានទេ?",
          a: "កូដ KHQR នីមួយៗមានសុពលភាពក្នុងរយៈពេលកំណត់។ ប្រសិនបើវាផុតកំណត់មុនពេលអ្នកបង់ សូមធ្វើការបញ្ជាទិញថ្មី។\n\nប្រសិនបើអ្នកបានបង់ចំពេលវាផុតកំណត់ សូមកុំបង់ម្តងទៀត — សូមទាក់ទងយើងជាមួយលេខកូដការបញ្ជាទិញ យើងនឹងផ្ទៀងផ្ទាត់ការបង់ប្រាក់របស់អ្នក។",
        },
        refund: {
          q: "តើខ្ញុំអាចទទួលបានប្រាក់វិញទេ?",
          a: "ការបញ្ចូលហ្គេមជាទំនិញឌីជីថលដែលបញ្ចូលភ្លាមៗ ដូច្នេះយើងមិនអាចសងប្រាក់វិញ សម្រាប់ការបញ្ជាទិញដែលបានបញ្ចូលទៅ ID អ្នកលេងដែលអ្នកបានផ្តល់រួចហើយនោះទេ។\n\nប្រសិនបើយើងមិនអាចបញ្ចូលការបញ្ជាទិញរបស់អ្នកបាន ដោយហេតុផលណាមួយ យើងនឹងបញ្ចូលម្តងទៀត ឬសងប្រាក់ជូនអ្នកវិញទាំងស្រុង — តាមជម្រើសរបស់អ្នក។",
        },
        promo: {
          q: "តើប្រើកូដបញ្ចុះតម្លៃដោយរបៀបណា?",
          a: "បញ្ចូលកូដនៅជំហាន «កូដបញ្ចុះតម្លៃ» នៅលើទំព័រហ្គេម ហើយចុច «ប្រើ» — ការបញ្ចុះតម្លៃនឹងបង្ហាញភ្លាមៗ។ តាមដានទំព័រ Facebook និង TikTok របស់យើង ដើម្បីទទួលបានកូដពិសេស។\n\nកូដនីមួយៗអាចមានលក្ខខណ្ឌ ដូចជាតម្លៃបញ្ជាទិញអប្បបរមា ឬកាលបរិច្ឆេទផុតកំណត់។",
        },
        contact: {
          q: "តើខ្ញុំអាចទាក់ទងអ្នកដោយរបៀបណា?",
          a: "ចុចប៊ូតុងជជែកនៅខាងក្រោមទំព័រណាមួយ ដើម្បីទាក់ទងយើងតាម Messenger ឬ Telegram។ អ្នកនឹងនិយាយជាមួយមនុស្សពិតប្រាកដ។ សូមភ្ជាប់លេខកូដការបញ្ជាទិញរបស់អ្នក ដើម្បីឱ្យយើងជួយអ្នកបានលឿនជាងមុន។",
        },
      },
    },
    terms: {
      title: "លក្ខខណ្ឌប្រើប្រាស់",
      description: "ច្បាប់សម្រាប់ការទិញការបញ្ចូលហ្គេមពីហាងរបស់យើង។",
      updated: "ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ខែតុលា ឆ្នាំ 2026",
      intro:
        "លក្ខខណ្ឌទាំងនេះអនុវត្តនៅពេលអ្នកទិញការបញ្ចូលហ្គេមពី {store}។ ដោយធ្វើការបញ្ជាទិញ អ្នកយល់ព្រមនឹងលក្ខខណ្ឌទាំងនេះ។ សូមអានដោយយកចិត្តទុកដាក់ — វាខ្លីប៉ុណ្ណោះ។",
      sections: {
        service: {
          title: "សេវាកម្មរបស់យើង",
          body: "{store} គឺជាអ្នកលក់បន្តឯករាជ្យនូវរូបិយប័ណ្ណក្នុងហ្គេម Pass និងទំនិញឌីជីថលផ្សេងៗសម្រាប់ហ្គេមលើទូរស័ព្ទ និងកុំព្យូទ័រ ដែលបម្រើអតិថិជននៅកម្ពុជា។ យើងមិនមានទំនាក់ទំនង មិនត្រូវបានគាំទ្រ ឬឧបត្ថម្ភដោយក្រុមហ៊ុនបោះពុម្ពហ្គេមណាមួយឡើយ។ ឈ្មោះ និងឡូហ្គោហ្គេម គឺជាពាណិជ្ជសញ្ញារបស់ម្ចាស់រៀងៗខ្លួន។",
        },
        orders: {
          title: "ការធ្វើការបញ្ជាទិញ",
          body: "អ្នកទទួលខុសត្រូវក្នុងការបញ្ចូល ID អ្នកលេង Zone ឬ Server ឱ្យបានត្រឹមត្រូវ និងជ្រើសរើសកញ្ចប់ឱ្យបានត្រឹមត្រូវ។ សូមប្រើប៊ូតុង «ពិនិត្យឈ្មោះអ្នកលេង» នៅពេលដែលមាន។ យើងបញ្ចូលទៅតាមព័ត៌មានគណនីដែលអ្នកផ្តល់ ហើយមិនអាចទទួលខុសត្រូវចំពោះការបញ្ចូលទៅ ID ដែលបានបញ្ចូលខុសនោះទេ។\n\nយើងអាចបដិសេធ ឬលុបចោលការបញ្ជាទិញ ប្រសិនបើយើងសង្ស័យថាមានការក្លែងបន្លំ ឬការរំលោភបំពាន ឬប្រសិនបើទំនិញនោះលែងមាន។ ប្រសិនបើយើងលុបចោលការបញ្ជាទិញដែលអ្នកបានបង់ប្រាក់រួច យើងនឹងសងប្រាក់ជូនអ្នកវិញទាំងស្រុង។",
        },
        prices: {
          title: "តម្លៃ",
          body: "តម្លៃត្រូវបានបង្ហាញជាដុល្លារអាមេរិក (USD)។ ចំនួនទឹកប្រាក់ជារៀល (KHR) គ្រាន់តែជាការប៉ាន់ប្រមាណដើម្បីភាពងាយស្រួលប៉ុណ្ណោះ។ តម្លៃអាចផ្លាស់ប្តូរនៅពេលណាក៏បាន ប៉ុន្តែតម្លៃដែលបង្ហាញនៅលើទំព័រការបញ្ជាទិញរបស់អ្នកនៅពេលបង់ប្រាក់ គឺជាតម្លៃដែលអ្នកត្រូវបង់។",
        },
        payment: {
          title: "ការបង់ប្រាក់",
          body: "ការបង់ប្រាក់ធ្វើឡើងដោយ KHQR តាមរយៈ ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារ ឬកាបូបអេឡិចត្រូនិកផ្សេងទៀតដែលភ្ជាប់ជាមួយបាគង។ កូដ KHQR នីមួយៗមានសុពលភាពក្នុងរយៈពេលកំណត់ និងសម្រាប់តែការបញ្ជាទិញមួយប៉ុណ្ណោះ។ សូមបង់ចំនួនទឹកប្រាក់ឱ្យត្រូវតាមការបង្ហាញ។\n\nការបង់ប្រាក់ត្រូវបានបញ្ជាក់ដោយស្វ័យប្រវត្តិជាមួយធនាគារ។ យើងមិនដែលសុំព័ត៌មានចូលធនាគារ ព័ត៌មានកាត ឬពាក្យសម្ងាត់ហ្គេមរបស់អ្នកឡើយ។",
        },
        delivery: {
          title: "ការបញ្ចូល",
          body: "ការបញ្ជាទិញភាគច្រើនត្រូវបានបញ្ចូលក្នុងរយៈពេលប៉ុន្មាននាទី បន្ទាប់ពីការបង់ប្រាក់ត្រូវបានបញ្ជាក់ ប៉ុន្តែម្តងម្កាលវាអាចយូរជាងនេះ ដោយសារការពន្យារពេលពីក្រុមហ៊ុនហ្គេម ឬបណ្តាញ។ ទំព័រការបញ្ជាទិញរបស់អ្នកបង្ហាញស្ថានភាពបច្ចុប្បន្ន។ ប្រសិនបើការបញ្ចូលមានការយឺតយ៉ាវ យើងនៅតែបន្តដោះស្រាយ ហើយនឹងទាក់ទងអ្នក ប្រសិនបើត្រូវការព័ត៌មានបន្ថែម។",
        },
        refunds: {
          title: "ការលុបចោល និងការសងប្រាក់វិញ",
          body: "អ្នកអាចលុបចោលការបញ្ជាទិញបាន មុនពេលបង់ប្រាក់។ ដោយសារការបញ្ចូលហ្គេមជាទំនិញឌីជីថលដែលបញ្ចូលទៅក្នុងគណនីហ្គេមរបស់អ្នក ការបញ្ចូលដែលបានបញ្ចប់រួចមិនអាចលុបចោល ឬសងប្រាក់វិញបានទេ រួមទាំងករណីដែលបានបញ្ចូល ID អ្នកលេងខុសផងដែរ។\n\nប្រសិនបើយើងមិនអាចបញ្ចូលការបញ្ជាទិញដែលបានបង់ប្រាក់រួច យើងនឹងបញ្ចូលម្តងទៀត ឬសងប្រាក់វិញទាំងស្រុងទៅគណនីដែលអ្នកបានប្រើបង់ប្រាក់ បន្ទាប់ពីផ្ទៀងផ្ទាត់ការបង់ប្រាក់ជាមួយធនាគារ។",
        },
        promos: {
          title: "កូដបញ្ចុះតម្លៃ",
          body: "កូដបញ្ចុះតម្លៃអាចមានលក្ខខណ្ឌ ដូចជាតម្លៃបញ្ជាទិញអប្បបរមា ការបញ្ចុះតម្លៃអតិបរមា ចំនួនដងនៃការប្រើប្រាស់ កាលបរិច្ឆេទផុតកំណត់ ឬសម្រាប់តែហ្គេមជាក់លាក់។ កូដមិនអាចប្តូរជាសាច់ប្រាក់បានទេ។ យើងអាចបញ្ចប់ប្រូម៉ូសិននៅពេលណាក៏បាន ហើយអាចលុបចោលការបញ្ជាទិញដែលរំលោភបំពានលើការប្រើកូដ។",
        },
        conduct: {
          title: "ការប្រើប្រាស់ដែលអាចទទួលយកបាន",
          body: "សូមកុំប្រើគេហទំព័ររបស់យើងសម្រាប់ការក្លែងបន្លំ ការសាកល្បងមធ្យោបាយបង់ប្រាក់ដែលលួចបាន ការលក់បន្តការបញ្ចូលដោយគ្មានការអនុញ្ញាតពីយើង ឬការរំខានដល់ដំណើរការគេហទំព័រ។ លក្ខខណ្ឌរបស់ក្រុមហ៊ុនហ្គេមក៏អនុវត្តចំពោះគណនីហ្គេម និងទំនិញដែលអ្នកទទួលបានផងដែរ។",
        },
        liability: {
          title: "ការទទួលខុសត្រូវ",
          body: "យើងផ្តល់សេវាកម្មដោយយកចិត្តទុកដាក់ ប៉ុន្តែយើងមិនអាចគ្រប់គ្រងក្រុមហ៊ុនហ្គេម ធនាគារ ឬបណ្តាញបានទេ។ ក្នុងកម្រិតដែលច្បាប់អនុញ្ញាត ការទទួលខុសត្រូវរបស់យើងចំពោះការបញ្ជាទិញណាមួយ មានកំណត់ត្រឹមចំនួនទឹកប្រាក់ដែលអ្នកបានបង់សម្រាប់ការបញ្ជាទិញនោះ។ គ្មានអ្វីនៅក្នុងលក្ខខណ្ឌទាំងនេះកំណត់សិទ្ធិរបស់អ្នកក្រោមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជាឡើយ។",
        },
        changes: {
          title: "ការផ្លាស់ប្តូរ និងទំនាក់ទំនង",
          body: "យើងអាចធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌទាំងនេះម្តងម្កាល ហើយកំណែនៅលើទំព័រនេះអនុវត្តចំពោះការបញ្ជាទិញថ្មីៗ។ ប្រសិនបើអ្នកមានសំណួរអំពីលក្ខខណ្ឌទាំងនេះ ឬអំពីការបញ្ជាទិញ សូមទាក់ទងយើងតាម {contact}។",
        },
      },
    },
    privacy: {
      title: "គោលការណ៍ឯកជនភាព",
      description: "របៀបដែលយើងប្រមូល ប្រើប្រាស់ និងការពារព័ត៌មានរបស់អ្នក។",
      updated: "ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ខែតុលា ឆ្នាំ 2026",
      intro:
        "{store} គោរពឯកជនភាពរបស់អ្នក។ គោលការណ៍នេះពន្យល់ពីព័ត៌មានដែលយើងប្រមូល នៅពេលអ្នកប្រើគេហទំព័ររបស់យើង និងរបៀបដែលយើងប្រើវា។ យើងប្រមូលតែព័ត៌មានដែលចាំបាច់ ដើម្បីបញ្ចូលហ្គេមជូនអ្នក និងដំណើរការហាងរបស់យើងប៉ុណ្ណោះ។",
      sections: {
        collect: {
          title: "ព័ត៌មានដែលយើងប្រមូល",
          body: "ព័ត៌មានការបញ្ជាទិញ៖ ហ្គេម កញ្ចប់ ID អ្នកលេង Zone ឬ Server និងឈ្មោះអ្នកលេងដែលហ្គេមផ្តល់មក (ប្រសិនបើមាន)។\n\nព័ត៌មានទំនាក់ទំនងដែលអ្នកជ្រើសរើសផ្តល់ឱ្យយើង ដូចជាលេខទូរស័ព្ទ ឬឈ្មោះអ្នកប្រើ Telegram និងការជជែក Telegram របស់អ្នក ប្រសិនបើអ្នកបើកការជូនដំណឹងអំពីការបញ្ជាទិញ។\n\nព័ត៌មានការបង់ប្រាក់៖ លេខយោងការបង់ប្រាក់ និងចំនួនទឹកប្រាក់ដែលធនាគារបញ្ជាក់។ យើងមិនដែលទទួលព័ត៌មានចូលធនាគារ លេខកាត ឬពាក្យសម្ងាត់ហ្គេមរបស់អ្នកឡើយ។\n\nទិន្នន័យបច្ចេកទេស និងទីផ្សារ៖ ភាសាដែលអ្នកជ្រើសរើស ព័ត៌មានមូលដ្ឋានអំពីឧបករណ៍ និងកម្មវិធីរុករក អាសយដ្ឋាន IP ដែលត្រូវបានបំប្លែងជាអនាមិក ដើម្បីការពារការរំលោភបំពាន និងរបៀបដែលអ្នកមកដល់គេហទំព័ររបស់យើង (ឧទាហរណ៍ តំណពី Facebook ឬ TikTok)។",
        },
        use: {
          title: "របៀបដែលយើងប្រើប្រាស់",
          body: "យើងប្រើព័ត៌មានរបស់អ្នក ដើម្បីដំណើរការ និងបញ្ចូលការបញ្ជាទិញ បញ្ជាក់ការបង់ប្រាក់ ផ្ញើដំណឹងអំពីការបញ្ជាទិញ ផ្តល់ជំនួយដល់អតិថិជន ការពារការក្លែងបន្លំ និងការរំលោភបំពាន ព្រមទាំងស្វែងយល់ថាទំព័រ និងប្រូម៉ូសិនណាខ្លះដំណើរការល្អ ដើម្បីកែលម្អហាងរបស់យើង។",
        },
        marketing: {
          title: "ខូគី ភីកសែល និងបណ្តាញសង្គម",
          body: "យើងប្រើខូគីមួយចំនួនតូច ដើម្បីចងចាំភាសារបស់អ្នក និងតំណ ការបង្ហោះ ឬការផ្សាយចុងក្រោយដែលនាំអ្នកមកកាន់គេហទំព័ររបស់យើង (រក្សាទុក ៣០ ថ្ងៃ)។ នៅពេលបើកដំណើរការ យើងក៏ប្រើ Meta (Facebook) Pixel និង TikTok Pixel ដើម្បីវាស់វែងប្រសិទ្ធភាពនៃការផ្សាយពាណិជ្ជកម្ម និងការបង្ហោះរបស់យើងផងដែរ។ ឧបករណ៍ទាំងនេះអាចកំណត់ខូគីរបស់ខ្លួន ហើយស្ថិតក្រោមគោលការណ៍ឯកជនភាពរបស់ Meta និង TikTok។ អ្នកអាចកំណត់វានៅក្នុងការកំណត់កម្មវិធីរុករក ឬកម្មវិធីរបស់អ្នក។",
        },
        sharing: {
          title: "ពេលណាដែលយើងចែករំលែកព័ត៌មាន",
          body: "យើងចែករំលែកព័ត៌មាន តែនៅពេលចាំបាច់ដើម្បីផ្តល់សេវាកម្មប៉ុណ្ណោះ៖ ជាមួយធនាគារ និងប្រព័ន្ធបាគង ដើម្បីបញ្ជាក់ការបង់ប្រាក់ ជាមួយក្រុមហ៊ុនហ្គេម ឬអ្នកផ្គត់ផ្គង់ ដើម្បីបញ្ចូលហ្គេមជូនអ្នក ជាមួយ Telegram នៅពេលអ្នកជ្រើសរើសទទួលដំណឹងនៅទីនោះ និងជាមួយអាជ្ញាធរ នៅពេលដែលច្បាប់តម្រូវ។ យើងមិនលក់ព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកឡើយ។",
        },
        storage: {
          title: "ការរក្សាទុក និងសុវត្ថិភាព",
          body: "ព័ត៌មានរបស់អ្នកត្រូវបានរក្សាទុកនៅលើម៉ាស៊ីនមេដែលមានសុវត្ថិភាព ហើយមានតែក្រុមការងាររបស់យើងប៉ុណ្ណោះដែលអាចចូលប្រើបាន។ ព័ត៌មានមួយចំនួន ដូចជាលេខកូដការបញ្ជាទិញថ្មីៗ និង ID អ្នកលេងដែលបានប្រើចុងក្រោយ ត្រូវបានរក្សាទុកតែនៅក្នុងកម្មវិធីរុករករបស់អ្នកផ្ទាល់ ដើម្បីឱ្យអ្នកបញ្ជាទិញម្តងទៀតបានលឿន។ អ្នកអាចលុបវាបានគ្រប់ពេល។",
        },
        retention: {
          title: "រយៈពេលដែលយើងរក្សាទុក",
          body: "យើងរក្សាទុកកំណត់ត្រាការបញ្ជាទិញ ក្នុងរយៈពេលដែលចាំបាច់សម្រាប់ជំនួយអតិថិជន គណនេយ្យ និងកាតព្វកិច្ចផ្លូវច្បាប់ បន្ទាប់មកយើងលុប ឬធ្វើឱ្យវាក្លាយជាអនាមិក។",
        },
        rights: {
          title: "ជម្រើសរបស់អ្នក",
          body: "អ្នកអាចស្នើសុំមើល កែតម្រូវ ឬលុបព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក ឬឈប់ទទួលដំណឹងតាម Telegram ដោយទាក់ទងយើងតាម {contact}។ កំណត់ត្រាការបញ្ជាទិញមួយចំនួនអាចត្រូវរក្សាទុក ដោយសារហេតុផលគណនេយ្យ ឬផ្លូវច្បាប់។",
        },
        children: {
          title: "កុមារ",
          body: "ហាងរបស់យើងសម្រាប់អ្នកលេងដែលអាចបង់ប្រាក់ដោយខ្លួនឯង ឬដោយមានការអនុញ្ញាតពីឪពុកម្តាយ។ ប្រសិនបើអ្នកមានអាយុក្រោម 18 ឆ្នាំ សូមសុំការអនុញ្ញាតពីឪពុកម្តាយ ឬអាណាព្យាបាល មុនពេលទិញ។",
        },
        changes: {
          title: "ការផ្លាស់ប្តូរគោលការណ៍នេះ",
          body: "យើងអាចធ្វើបច្ចុប្បន្នភាពគោលការណ៍នេះម្តងម្កាល។ កំណែចុងក្រោយបំផុតមាននៅលើទំព័រនេះជានិច្ច។",
        },
      },
    },
  },
} satisfies NamespaceMessages;

export default messages;
