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
    },
    share: {
      title: "Share",
      on: "Share on {network}",
      copyLink: "Copy link",
      copied: "Link copied!",
      copyHint: "Copy the link to paste in your TikTok bio, comments or DMs.",
      more: "More",
      gameHeading: "Share this top-up with friends",
      gameText: "Top up {game} from {price} at {store} — pay with KHQR, delivered in minutes.",
      gameTextNoPrice: "Top up {game} at {store} — pay with KHQR, delivered in minutes.",
      deliveredText: "Just topped up {game} at {store} — fast and cheap with KHQR!",
    },
    chat: {
      title: "Need help? Chat with a real person.",
      open: "Chat with us",
      close: "Close chat options",
      messenger: "Chat on Messenger",
      telegram: "Chat on Telegram",
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
    },
    share: {
      title: "ចែករំលែក",
      on: "ចែករំលែកលើ {network}",
      copyLink: "ចម្លងតំណ",
      copied: "បានចម្លងតំណ!",
      copyHint: "ចម្លងតំណ ដើម្បីបិទភ្ជាប់ក្នុង bio TikTok មតិយោបល់ ឬសារផ្ទាល់។",
      more: "ផ្សេងទៀត",
      gameHeading: "ចែករំលែកការបញ្ចូលនេះទៅមិត្តភក្តិ",
      gameText: "បញ្ចូល {game} ចាប់ពី {price} នៅ {store} — បង់ប្រាក់ដោយ KHQR បញ្ចូលរួចក្នុងប៉ុន្មាននាទី។",
      gameTextNoPrice: "បញ្ចូល {game} នៅ {store} — បង់ប្រាក់ដោយ KHQR បញ្ចូលរួចក្នុងប៉ុន្មាននាទី។",
      deliveredText: "ទើបតែបញ្ចូល {game} នៅ {store} — លឿន និងថោកតាម KHQR!",
    },
    chat: {
      title: "ត្រូវការជំនួយ? ជជែកជាមួយមនុស្សពិតប្រាកដ។",
      open: "ជជែកជាមួយយើង",
      close: "បិទជម្រើសជជែក",
      messenger: "ជជែកតាម Messenger",
      telegram: "ជជែកតាម Telegram",
    },
  },
} satisfies NamespaceMessages;

export default messages;
