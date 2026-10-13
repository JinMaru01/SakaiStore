import { describe, expect, it } from "vitest";
import { orderCallbackData, parseOrderCallback } from "./callbacks";
import { ADMIN_COMMANDS, CUSTOMER_COMMANDS, CUSTOMER_COMMANDS_KM, isForThisBot, parseCommand } from "./commands";

describe("parseCommand", () => {
  it("parses commands, arguments and @bot mentions", () => {
    expect(parseCommand("/start ord_SK7F3K9Q2M")).toEqual({ name: "start", args: "ord_SK7F3K9Q2M", mention: null });
    expect(parseCommand("  /Status   sk7f3k9q2m  ")).toEqual({ name: "status", args: "sk7f3k9q2m", mention: null });
    expect(parseCommand("/orders@SakaiBot")).toEqual({ name: "orders", args: "", mention: "SakaiBot" });
    expect(parseCommand("/order@SakaiBot SK7F3K9Q2M")).toMatchObject({ name: "order", args: "SK7F3K9Q2M" });
  });

  it("returns null for plain text", () => {
    expect(parseCommand("hello")).toBeNull();
    expect(parseCommand("SK7F3K9Q2M")).toBeNull();
    expect(parseCommand("/")).toBeNull();
    expect(parseCommand("/ start")).toBeNull();
  });

  it("only handles commands addressed to this bot", () => {
    const cmd = parseCommand("/status@OtherBot SK7F3K9Q2M")!;
    expect(isForThisBot(cmd, "SakaiBot")).toBe(false);
    expect(isForThisBot(parseCommand("/status@sakaibot")!, "SakaiBot")).toBe(true);
    expect(isForThisBot(parseCommand("/status")!, "SakaiBot")).toBe(true);
    expect(isForThisBot(cmd, null)).toBe(true);
  });
});

describe("command menus", () => {
  it("use valid Bot API command names and descriptions", () => {
    for (const c of [...CUSTOMER_COMMANDS, ...CUSTOMER_COMMANDS_KM, ...ADMIN_COMMANDS]) {
      expect(c.command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(c.description.length).toBeGreaterThanOrEqual(1);
      expect(c.description.length).toBeLessThanOrEqual(256);
    }
    expect(CUSTOMER_COMMANDS_KM.map((c) => c.command)).toEqual(CUSTOMER_COMMANDS.map((c) => c.command));
  });
});

describe("order callback data", () => {
  it("round-trips and fits Telegram's 64-byte limit", () => {
    for (const action of ["dlv", "fail", "view"] as const) {
      const data = orderCallbackData(action, "SK7F3K9Q2M");
      expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
      expect(parseOrderCallback(data)).toEqual({ action, code: "SK7F3K9Q2M" });
    }
  });

  it("rejects anything we did not create", () => {
    expect(parseOrderCallback(undefined)).toBeNull();
    expect(parseOrderCallback("ord:refund:SK7F3K9Q2M")).toBeNull();
    expect(parseOrderCallback("ord:dlv:SK7F3K9Q2M:x")).toBeNull();
    expect(parseOrderCallback("ord:dlv:<script>")).toBeNull();
    expect(parseOrderCallback("xord:dlv:SK7F3K9Q2M")).toBeNull();
  });
});
