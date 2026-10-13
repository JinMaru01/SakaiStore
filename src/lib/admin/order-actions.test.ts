import { describe, expect, it } from "vitest";
import { availableOrderActions } from "./order-actions";

const enabled = (s: Parameters<typeof availableOrderActions>[0]) =>
  Object.entries(availableOrderActions(s))
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();

describe("availableOrderActions", () => {
  it("follows the order state machine", () => {
    expect(enabled("pending_payment")).toEqual(["cancel", "markPaid"]);
    expect(enabled("expired")).toEqual(["markPaid"]);
    expect(enabled("paid")).toEqual(["deliver", "fail", "process", "refund"]);
    expect(enabled("processing")).toEqual(["deliver", "fail", "refund"]);
    expect(enabled("failed")).toEqual(["deliver", "process", "refund"]);
    expect(enabled("delivered")).toEqual(["refund"]);
    expect(enabled("refunded")).toEqual([]);
    expect(enabled("cancelled")).toEqual([]);
  });
});
