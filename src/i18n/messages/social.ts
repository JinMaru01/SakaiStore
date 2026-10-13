import type { NamespaceMessages } from "../translate";

// "social" namespace. Keep en and km keys identical (checked by src/i18n/messages.test.ts).
const messages = {
  en: {
    linkLabel: "{network} (opens in a new tab)",
    newTab: "(opens in a new tab)",
    follow: {
      title: "Follow us on Facebook & TikTok",
      body: "Be the first to get flash deals, new game drops and giveaways.",
      facebook: "Follow on Facebook",
      tiktok: "Follow on TikTok",
      telegram: "Join on Telegram",
      promoBefore: "Follow us and use code",
      copyCode: "Copy code",
      copyCodeAria: "Copy promo code {code}",
      /** Conditions of the follower code, shown next to it (from the promo code settings). */
      minOrder: "For orders from {amount}",
      firstOrder: "First top-up only",
    },
    share: {
      title: "Share",
      on: "Share on {network}",
      copyLink: "Copy link",
      copied: "Link copied!",
      copyHint: "Copy the link to paste in your TikTok bio, comments or DMs.",
      more: "More",
      gameHeading: "Share this top-up with friends",
      gameText: "Top up {game} from {price} at {store} — pay with KHQR, fast delivery.",
      gameTextNoPrice: "Top up {game} at {store} — pay with KHQR, fast delivery.",
      deliveredText: "Just topped up {game} at {store} — fast and easy with KHQR!",
    },
    chat: {
      title: "Need help? Chat with a real person.",
      open: "Chat with us",
      close: "Close chat options",
      messenger: "Chat on Messenger",
      telegram: "Chat on Telegram",
      call: "Call {phone}",
    },
  },
  km: {
    linkLabel: "{network} (បើកក្នុងផ្ទាំងថ្មី)",
    newTab: "(បើកក្នុងផ្ទាំងថ្មី)",
    follow: {
      title: "តាមដានយើងលើ Facebook និង TikTok",
      body: "ទទួលបានប្រូម៉ូសិនពិសេស ហ្គេមថ្មីៗ និងកម្មវិធីចាប់រង្វាន់មុនគេ។",
      facebook: "តាមដានលើ Facebook",
      tiktok: "តាមដានលើ TikTok",
      telegram: "ចូលរួមលើ Telegram",
      promoBefore: "តាមដានយើង ហើយប្រើកូដ",
      copyCode: "ចម្លងកូដ",
      copyCodeAria: "ចម្លងកូដបញ្ចុះតម្លៃ {code}",
      minOrder: "សម្រាប់ការបញ្ជាទិញចាប់ពី {amount}",
      firstOrder: "សម្រាប់តែការបញ្ចូលលើកដំបូង",
    },
    share: {
      title: "ចែករំលែក",
      on: "ចែករំលែកលើ {network}",
      copyLink: "ចម្លងតំណ",
      copied: "បានចម្លងតំណ!",
      copyHint: "ចម្លងតំណ ដើម្បីបិទភ្ជាប់ក្នុង bio TikTok មតិយោបល់ ឬសារផ្ទាល់។",
      more: "ផ្សេងទៀត",
      gameHeading: "ចែករំលែកការបញ្ចូលនេះទៅមិត្តភក្តិ",
      gameText: "បញ្ចូល {game} ចាប់ពី {price} នៅ {store} — បង់ប្រាក់ដោយ KHQR បញ្ចូលរហ័ស។",
      gameTextNoPrice: "បញ្ចូល {game} នៅ {store} — បង់ប្រាក់ដោយ KHQR បញ្ចូលរហ័ស។",
      deliveredText: "ទើបតែបញ្ចូល {game} នៅ {store} — លឿន និងងាយស្រួលតាម KHQR!",
    },
    chat: {
      title: "ត្រូវការជំនួយ? ជជែកជាមួយមនុស្សពិតប្រាកដ។",
      open: "ជជែកជាមួយយើង",
      close: "បិទជម្រើសជជែក",
      messenger: "ជជែកតាម Messenger",
      telegram: "ជជែកតាម Telegram",
      call: "ហៅទូរស័ព្ទ {phone}",
    },
  },
} satisfies NamespaceMessages;

export default messages;
