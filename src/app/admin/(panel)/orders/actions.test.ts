import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ sub: "admin" })),
  requireAdminApi: vi.fn(async () => null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notify", () => ({
  notifyOrderPaid: vi.fn(async () => {}),
  notifyOrderStatusChanged: vi.fn(async () => {}),
}));

import { revalidatePath } from "next/cache";
import { IDLE, type ActionState } from "@/lib/admin/forms";
import { requireAdmin, requireAdminApi } from "@/lib/auth";
import { getGameBySlug } from "@/lib/catalog";
import { createOrder, getOrderById, listOrderEvents, markOrderPaid } from "@/lib/orders/service";
import { resetDb, seedCatalog } from "../../../../../tests/helpers/db";
import { orderAction } from "./actions";
import { GET as exportOrders } from "./export/route";

async function newOrder() {
  const game = (await getGameBySlug("mobile-legends"))!;
  const pkg = game.packages.find((p) => p.name === "Weekly Diamond Pass")!;
  return createOrder({ gameSlug: game.slug, packageId: pkg.id, playerId: "123456789", zoneId: "1234" });
}

const run = (fields: Record<string, string>): Promise<ActionState> => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return orderAction(IDLE, fd);
};

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("orderAction", () => {
  it("requires an admin session", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    const order = await newOrder();
    await expect(run({ intent: "cancel", orderId: order.id })).rejects.toThrow("NEXT_REDIRECT");
    expect((await getOrderById(order.id))!.status).toBe("pending_payment");
  });

  it("marks a processing order delivered and revalidates the admin", async () => {
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system", ref: "REF1" }); // manual fulfillment → processing
    const result = await run({ intent: "deliver", orderId: order.id });
    expect(result).toMatchObject({ status: "success", message: `Order ${order.code} marked delivered.` });
    const updated = (await getOrderById(order.id))!;
    expect(updated.status).toBe("delivered");
    expect(updated.deliveredAt).toBeInstanceOf(Date);
    const delivered = (await listOrderEvents(order.id)).find((e) => e.type === "delivered")!;
    expect(delivered.actor).toBe("admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("explains a refused transition with the current status", async () => {
    const order = await newOrder();
    const result = await run({ intent: "deliver", orderId: order.id });
    expect(result.status).toBe("error");
    expect(result.status === "error" && result.message).toContain("“Awaiting payment”");
  });

  it("requires a reason to mark failed", async () => {
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system" });
    const missing = await run({ intent: "fail", orderId: order.id, reason: " " });
    expect(missing).toMatchObject({ status: "error", fieldErrors: { reason: expect.any(String) } });
    const ok = await run({ intent: "fail", orderId: order.id, reason: "Wrong zone id" });
    expect(ok.status).toBe("success");
    const failed = (await listOrderEvents(order.id)).find((e) => e.type === "failed")!;
    expect(failed.message).toBe("Wrong zone id");

    const retry = await run({ intent: "retry", orderId: order.id });
    expect(retry.status).toBe("success");
    expect((await getOrderById(order.id))!.status).toBe("processing");
  });

  it("marks paid manually only with a reference and confirmation", async () => {
    const order = await newOrder();
    const unconfirmed = await run({ intent: "mark_paid", orderId: order.id, reference: "ABA-123" });
    expect(unconfirmed).toMatchObject({ status: "error", fieldErrors: { confirm: expect.any(String) } });
    const noRef = await run({ intent: "mark_paid", orderId: order.id, reference: "", confirm: "on" });
    expect(noRef).toMatchObject({ status: "error", fieldErrors: { reference: expect.any(String) } });

    const paid = await run({ intent: "mark_paid", orderId: order.id, reference: "ABA-123", confirm: "on" });
    expect(paid).toMatchObject({ status: "success", message: `Order ${order.code} marked paid — now Processing.` });
    const updated = (await getOrderById(order.id))!;
    expect(updated).toMatchObject({ status: "processing", paymentRef: "ABA-123" });
    expect(updated.paymentPayload).toMatchObject({ manual: true, reference: "ABA-123" });
    expect((await listOrderEvents(order.id)).find((e) => e.type === "paid")!.actor).toBe("admin");
  });

  it("cancels pending orders and refunds paid ones", async () => {
    const pending = await newOrder();
    expect((await run({ intent: "cancel", orderId: pending.id })).status).toBe("success");
    expect((await getOrderById(pending.id))!.status).toBe("cancelled");

    const paid = await newOrder();
    await markOrderPaid(paid.id, { actor: "system" });
    const refund = await run({ intent: "refund", orderId: paid.id, message: "Sent back via ABA" });
    expect(refund.status).toBe("success");
    expect((await getOrderById(paid.id))!.status).toBe("refunded");
  });

  it("adds internal notes", async () => {
    const order = await newOrder();
    expect(await run({ intent: "note", orderId: order.id, note: "Customer asked on Messenger" })).toMatchObject({
      status: "success",
    });
    const note = (await listOrderEvents(order.id)).find((e) => e.type === "note")!;
    expect(note).toMatchObject({ actor: "admin", message: "Customer asked on Messenger" });
  });

  it("rejects unknown intents and ids", async () => {
    expect((await run({ intent: "explode", orderId: "x" })).status).toBe("error");
    expect(await run({ intent: "deliver", orderId: "not-a-uuid" })).toMatchObject({
      status: "error",
      fieldErrors: { orderId: expect.any(String) },
    });
  });
});

describe("GET /admin/orders/export", () => {
  it("is admin only", async () => {
    vi.mocked(requireAdminApi).mockResolvedValueOnce(Response.json({ error: "unauthorized" }, { status: 401 }));
    const res = await exportOrders(new Request("http://localhost/admin/orders/export"));
    expect(res.status).toBe(401);
  });

  it("downloads the filtered orders as CSV", async () => {
    const a = await newOrder();
    const b = await newOrder();
    await markOrderPaid(b.id, { actor: "system" });
    const res = await exportOrders(new Request("http://localhost/admin/orders/export?status=processing"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="sakai-orders-\d{8}\.csv"$/);
    expect(res.headers.get("x-export-rows")).toBe("1");
    const bytes = new Uint8Array(await res.arrayBuffer());
    // UTF-8 BOM so Excel shows Khmer player names correctly (Response.text() would strip it).
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("order_code,")).toBe(true);
    expect(text).toContain(b.code);
    expect(text).not.toContain(a.code);
  });
});
