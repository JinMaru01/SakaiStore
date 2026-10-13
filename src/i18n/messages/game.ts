import type { NamespaceMessages } from "../translate";

// "game" namespace. Keep en and km keys identical (checked by src/i18n/messages.test.ts).
const messages = {
  en: {},
  km: {},
} satisfies NamespaceMessages;

export default messages;
