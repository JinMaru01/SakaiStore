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
  },
} satisfies NamespaceMessages;

export default messages;
