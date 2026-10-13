import { describe, expect, it } from "vitest";
import {
  adjustPriceCents,
  EMPTY_GAME,
  formatZoneOptions,
  gameFormSchema,
  normalizeHashtags,
  packageFormSchema,
  packagesFormSchema,
  parseZoneOptions,
  type PackageFormValues,
} from "./game-schema";
import { fieldErrorsFromZod } from "./forms";

const pkg = (over: Partial<PackageFormValues> = {}): PackageFormValues => ({
  key: "k",
  id: null,
  name: "86 Diamonds",
  amount: "78",
  bonus: "8",
  price: "1.50",
  compareAt: "",
  badge: "",
  supplierSku: "",
  active: true,
  ...over,
});

describe("zone options", () => {
  it("parses value|label lines, defaulting the label", () => {
    const r = parseZoneOptions("os_asia|Asia\n\n  os_usa | America \nos_euro");
    expect(r).toEqual({
      ok: true,
      options: [
        { value: "os_asia", label: "Asia" },
        { value: "os_usa", label: "America" },
        { value: "os_euro", label: "os_euro" },
      ],
    });
    expect(formatZoneOptions(r.ok ? r.options : [])).toBe("os_asia|Asia\nos_usa|America\nos_euro");
  });

  it("reports the line of the first problem", () => {
    expect(parseZoneOptions("a|A\n|B")).toEqual({ ok: false, error: 'Line 2: missing value before "|"' });
    expect(parseZoneOptions("a|A\nA|again")).toMatchObject({ ok: false, error: expect.stringContaining("duplicate") });
    expect(parseZoneOptions("has space|x")).toMatchObject({ ok: false });
  });
});

describe("gameFormSchema", () => {
  const valid = { ...EMPTY_GAME, name: "Free Fire", slug: "free-fire", idPattern: "^\\d{6,12}$" };

  it("accepts a valid game and normalizes values", () => {
    const r = gameFormSchema.safeParse({ ...valid, accentColor: "#FF7A00", hashtags: "FreeFire, #garena  #FreeFire" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      slug: "free-fire",
      accentColor: "#ff7a00",
      hashtags: "#FreeFire #garena",
      publisher: null,
      zoneOptions: null,
      sortOrder: 0,
    });
  });

  it("rejects bad slugs, colors, image urls and regexes", () => {
    const r = gameFormSchema.safeParse({
      ...valid,
      slug: "Free Fire!",
      accentColor: "red",
      imageUrl: "http://insecure.example/logo.png",
      idPattern: "([0-9",
      zonePattern: "(a+)+$",
    });
    expect(r.success).toBe(false);
    const errors = fieldErrorsFromZod(r.error!);
    expect(Object.keys(errors).sort()).toEqual(["accentColor", "idPattern", "imageUrl", "slug", "zonePattern"]);
  });

  it("requires a zone label when the game uses zones", () => {
    const r = gameFormSchema.safeParse({ ...valid, requiresZone: true });
    expect(r.success).toBe(false);
    expect(fieldErrorsFromZod(r.error!)).toHaveProperty("zoneLabel");
    const options = gameFormSchema.safeParse({ ...valid, zoneOptions: "os_asia|Asia", zoneLabel: "Server" });
    expect(options.data?.zoneOptions).toEqual([{ value: "os_asia", label: "Asia" }]);
  });

  it("reports invalid zone option lines on the zoneOptions field", () => {
    const r = gameFormSchema.safeParse({ ...valid, zoneLabel: "Server", zoneOptions: "|Asia" });
    expect(fieldErrorsFromZod(r.error!)).toHaveProperty("zoneOptions");
  });
});

describe("packageFormSchema", () => {
  it("converts dollars to cents", () => {
    const r = packageFormSchema.safeParse(pkg({ price: "$1.5", compareAt: "1.95", badge: "Best" }));
    expect(r.data).toMatchObject({ priceCents: 150, compareAtCents: 195, badge: "best", amount: 78, bonus: 8 });
  });

  it("rejects bad prices and a compare-at not above the price", () => {
    expect(fieldErrorsFromZod(packageFormSchema.safeParse(pkg({ price: "1.999" })).error!)).toHaveProperty("price");
    expect(fieldErrorsFromZod(packageFormSchema.safeParse(pkg({ price: "0" })).error!)).toHaveProperty("price");
    expect(
      fieldErrorsFromZod(packageFormSchema.safeParse(pkg({ price: "2.00", compareAt: "2" })).error!),
    ).toHaveProperty("compareAt");
    expect(fieldErrorsFromZod(packageFormSchema.safeParse(pkg({ amount: "-1" })).error!)).toHaveProperty("amount");
  });

  it("flags duplicate ids in the list with an indexed path", () => {
    const r = packagesFormSchema.safeParse([pkg({ id: 4 }), pkg({ id: 4 })]);
    expect(fieldErrorsFromZod(r.error!)).toHaveProperty(["1.name"]);
  });
});

describe("helpers", () => {
  it("adjusts prices by a percentage, rounded to 5 cents", () => {
    expect(adjustPriceCents(100, 10)).toBe(110);
    expect(adjustPriceCents(145, 10)).toBe(160); // 159.5 → 160
    expect(adjustPriceCents(99, 3)).toBe(100); // 101.97 → 100
    expect(adjustPriceCents(1000, -15)).toBe(850);
    expect(adjustPriceCents(5, -90)).toBe(5); // never below 5¢
  });

  it("normalizes hashtags", () => {
    expect(normalizeHashtags("  ")).toBe("");
    expect(normalizeHashtags("#MLBB mlbb #Mobile-Legends")).toBe("#MLBB #MobileLegends");
  });
});
