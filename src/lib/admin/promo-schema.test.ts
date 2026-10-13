import { describe, expect, it } from "vitest";
import type { PromoCode } from "@/db/schema";
import { fieldErrorsFromZod } from "./forms";
import {
  describeDiscount,
  EMPTY_PROMO,
  promoFormSchema,
  promoState,
  promoToFormValues,
  type PromoFormValues,
} from "./promo-schema";

const form = (over: Partial<PromoFormValues> = {}): PromoFormValues => ({ ...EMPTY_PROMO, code: "tiktok10", value: "10", ...over });

describe("promoFormSchema", () => {
  it("uppercases the code and parses a percent promo", () => {
    const r = promoFormSchema.safeParse(form({ maxDiscount: "2", minOrder: "5.00", channel: "tiktok", maxUses: "100" }));
    expect(r.data).toEqual({
      code: "TIKTOK10",
      description: null,
      type: "percent",
      value: 10,
      maxDiscountCents: 200,
      minOrderCents: 500,
      maxUses: 100,
      gameId: null,
      channel: "tiktok",
      startsAt: null,
      endsAt: null,
      active: true,
    });
  });

  it("converts fixed amounts to cents and drops the percent cap", () => {
    const r = promoFormSchema.safeParse(form({ type: "fixed", value: "1.5", maxDiscount: "9" }));
    expect(r.data).toMatchObject({ type: "fixed", value: 150, maxDiscountCents: null });
  });

  it.each([
    [{ code: "AB" }, "code"],
    [{ code: "BAD CODE!" }, "code"],
    [{ code: "X".repeat(33) }, "code"],
    [{ value: "0" }, "value"],
    [{ value: "101" }, "value"],
    [{ value: "12.5" }, "value"],
    [{ type: "fixed" as const, value: "abc" }, "value"],
    [{ maxUses: "0" }, "maxUses"],
    [{ channel: "myspace" }, "channel"],
    [{ minOrder: "-1" }, "minOrder"],
    [{ startsAt: "2026-10-13T25:00" }, "startsAt"],
  ])("rejects %o on %s", (over, field) => {
    const r = promoFormSchema.safeParse(form(over));
    expect(r.success).toBe(false);
    expect(fieldErrorsFromZod(r.error!)).toHaveProperty([field]);
  });

  it("reads dates as Phnom Penh time and requires end after start", () => {
    const r = promoFormSchema.safeParse(form({ startsAt: "2026-10-13T00:00", endsAt: "2026-10-20T23:59" }));
    expect(r.data?.startsAt?.toISOString()).toBe("2026-10-12T17:00:00.000Z");
    const bad = promoFormSchema.safeParse(form({ startsAt: "2026-10-13T00:00", endsAt: "2026-10-12T00:00" }));
    expect(fieldErrorsFromZod(bad.error!)).toHaveProperty("endsAt");
  });
});

describe("promo helpers", () => {
  const base: PromoCode = {
    id: 1,
    code: "FB5",
    description: null,
    descriptionKm: null,
    firstOrderOnly: false,
    type: "percent",
    value: 5,
    maxDiscountCents: 200,
    minOrderCents: 0,
    maxUses: null,
    usedCount: 0,
    gameId: null,
    channel: "facebook",
    startsAt: null,
    endsAt: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const now = new Date("2026-10-13T00:00:00Z");

  it("derives the current state", () => {
    expect(promoState(base, now)).toBe("active");
    expect(promoState({ ...base, active: false }, now)).toBe("inactive");
    expect(promoState({ ...base, startsAt: new Date("2026-10-14T00:00:00Z") }, now)).toBe("scheduled");
    expect(promoState({ ...base, endsAt: new Date("2026-10-12T00:00:00Z") }, now)).toBe("expired");
    expect(promoState({ ...base, maxUses: 3, usedCount: 3 }, now)).toBe("used_up");
  });

  it("describes discounts", () => {
    expect(describeDiscount(base)).toBe("5% off (max $2.00)");
    expect(describeDiscount({ ...base, maxDiscountCents: null })).toBe("5% off");
    expect(describeDiscount({ ...base, type: "fixed", value: 150 })).toBe("$1.50 off");
  });

  it("round-trips through form values", () => {
    const values = promoToFormValues({ ...base, minOrderCents: 500, startsAt: new Date("2026-10-12T17:00:00Z") });
    expect(values).toMatchObject({ code: "FB5", value: "5", maxDiscount: "2.00", minOrder: "5.00", startsAt: "2026-10-13T00:00" });
    expect(promoFormSchema.safeParse(values).data).toMatchObject({ value: 5, maxDiscountCents: 200, minOrderCents: 500 });
  });
});
