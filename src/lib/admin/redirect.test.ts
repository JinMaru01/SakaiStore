import { describe, expect, it } from "vitest";
import { safeAdminNext } from "./redirect";

describe("safeAdminNext", () => {
  it("allows admin paths with query and hash", () => {
    expect(safeAdminNext("/admin")).toBe("/admin");
    expect(safeAdminNext("/admin/orders?status=paid#top")).toBe("/admin/orders?status=paid#top");
    expect(safeAdminNext("/admin/orders/8b0f3c1e-1111-4222-8333-944455556666")).toBe(
      "/admin/orders/8b0f3c1e-1111-4222-8333-944455556666",
    );
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/games/free-fire",
    "/administrator",
    "/admin/login",
    "/admin/login?next=/admin",
    "/admin/../games",
    "/admin\n/x",
  ])("falls back to /admin for %s", (next) => {
    expect(safeAdminNext(next)).toBe("/admin");
  });
});
