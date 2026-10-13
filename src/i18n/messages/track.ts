import type { NamespaceMessages } from "../translate";

// "track" namespace. Keep en and km keys identical (checked by src/i18n/messages.test.ts).
const messages = {
  en: {
    meta: {
      title: "Track your order",
      description: "Check the status of your game top-up with your order code.",
    },
    title: "Track your order",
    subtitle: "Enter the order code from your payment page or Telegram message.",
    form: {
      label: "Order code",
      placeholder: "e.g. SK7F3K9Q2M",
      submit: "Track order",
      invalid: "Please enter a valid order code (letters and numbers, e.g. SK7F3K9Q2M).",
      hint: "Your code starts with SK and has 10 characters.",
    },
    recent: {
      title: "Recent orders on this device",
      empty: "No recent orders on this device yet.",
      emptyHint: "Orders you place on this phone or browser will show up here.",
      clear: "Clear",
      clearConfirm: "Remove the recent orders list from this device? Your orders are not affected.",
      view: "View order",
      unknown: "Order",
    },
    help: {
      title: "Can't find your order code?",
      body: "It's shown on the payment page and in your Telegram updates. If you lost it, contact us with your player ID and payment receipt — we'll find your order.",
      link: "Paid but didn't receive your top-up?",
    },
  },
  km: {
    meta: {
      title: "តាមដានការបញ្ជាទិញរបស់អ្នក",
      description: "ពិនិត្យស្ថានភាពការបញ្ចូលហ្គេមរបស់អ្នក ដោយប្រើលេខកូដការបញ្ជាទិញ។",
    },
    title: "តាមដានការបញ្ជាទិញរបស់អ្នក",
    subtitle: "បញ្ចូលលេខកូដការបញ្ជាទិញ ពីទំព័របង់ប្រាក់ ឬពីសារ Telegram របស់អ្នក។",
    form: {
      label: "លេខកូដការបញ្ជាទិញ",
      placeholder: "ឧ. SK7F3K9Q2M",
      submit: "តាមដាន",
      invalid: "សូមបញ្ចូលលេខកូដការបញ្ជាទិញឱ្យបានត្រឹមត្រូវ (អក្សរ និងលេខ ឧ. SK7F3K9Q2M)។",
      hint: "លេខកូដរបស់អ្នកចាប់ផ្តើមដោយ SK ហើយមាន 10 តួ។",
    },
    recent: {
      title: "ការបញ្ជាទិញថ្មីៗលើឧបករណ៍នេះ",
      empty: "មិនទាន់មានការបញ្ជាទិញលើឧបករណ៍នេះនៅឡើយទេ។",
      emptyHint: "ការបញ្ជាទិញដែលអ្នកធ្វើលើទូរស័ព្ទ ឬកម្មវិធីរុករកនេះ នឹងបង្ហាញនៅទីនេះ។",
      clear: "សម្អាត",
      clearConfirm: "លុបបញ្ជីការបញ្ជាទិញថ្មីៗចេញពីឧបករណ៍នេះមែនទេ? ការបញ្ជាទិញរបស់អ្នកមិនរងផលប៉ះពាល់ទេ។",
      view: "មើលការបញ្ជាទិញ",
      unknown: "ការបញ្ជាទិញ",
    },
    help: {
      title: "រកលេខកូដការបញ្ជាទិញមិនឃើញ?",
      body: "លេខកូដបង្ហាញនៅលើទំព័របង់ប្រាក់ និងក្នុងសារ Telegram របស់អ្នក។ ប្រសិនបើបាត់ សូមទាក់ទងយើងជាមួយ ID អ្នកលេង និងបង្កាន់ដៃបង់ប្រាក់ — យើងនឹងរកការបញ្ជាទិញរបស់អ្នកជូន។",
      link: "បង់ប្រាក់ហើយ តែមិនទាន់ទទួលបាន?",
    },
  },
} satisfies NamespaceMessages;

export default messages;
