import type { BotCommand } from "./client";

/**
 * Bot command parsing and the command menus registered with Telegram
 * (scripts/set-telegram-webhook.ts). Pure and framework-free (relative
 * imports only) so the tsx script can import it.
 */

export type ParsedCommand = {
  /** Lower-case command without the slash, e.g. "status". */
  name: string;
  /** Everything after the command, trimmed ("" when none). */
  args: string;
  /** "@BotName" suffix used in groups (/status@SakaiBot), without "@". */
  mention: string | null;
};

const COMMAND_RE = /^\/([A-Za-z0-9_]{1,32})(?:@([A-Za-z0-9_]{3,64}))?(?:\s+([\s\S]*))?$/;

/** Parse "/cmd@bot args". Returns null for text that is not a command. */
export function parseCommand(text: string): ParsedCommand | null {
  const m = COMMAND_RE.exec(text.trim());
  if (!m) return null;
  return { name: m[1]!.toLowerCase(), args: (m[3] ?? "").trim(), mention: m[2] ?? null };
}

/**
 * In groups, "/status@OtherBot" is meant for another bot. Commands without a
 * mention, or when we don't know our own username, are for us.
 */
export function isForThisBot(cmd: ParsedCommand, botUsername: string | null): boolean {
  if (!cmd.mention || !botUsername) return true;
  return cmd.mention.toLowerCase() === botUsername.toLowerCase();
}

/** Customer menu (default scope). */
export const CUSTOMER_COMMANDS: BotCommand[] = [
  { command: "start", description: "Welcome & how to get order updates" },
  { command: "status", description: "Check an order: /status SK…" },
  { command: "help", description: "How this bot works" },
];

/** Same menu for Telegram apps set to Khmer. */
export const CUSTOMER_COMMANDS_KM: BotCommand[] = [
  { command: "start", description: "ស្វាគមន៍ និងរបៀបទទួលដំណឹងការបញ្ជាទិញ" },
  { command: "status", description: "ពិនិត្យការបញ្ជាទិញ៖ /status SK…" },
  { command: "help", description: "របៀបប្រើប្រាស់" },
];

/** Admin menu (registered per admin chat). */
export const ADMIN_COMMANDS: BotCommand[] = [
  { command: "orders", description: "Orders to deliver (paid / processing / failed)" },
  { command: "order", description: "Order details & actions: /order SK…" },
  { command: "stats", description: "Today's paid orders, revenue & channels" },
  { command: "status", description: "Customer view of an order: /status SK…" },
  { command: "id", description: "Show this chat's id" },
  { command: "help", description: "Admin commands" },
];
