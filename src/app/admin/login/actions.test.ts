import { beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = { ip: "203.0.113.7" };
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": headerStore.ip })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    createAdminSession: vi.fn(async () => {}),
    destroyAdminSession: vi.fn(async () => {}),
    requireAdmin: vi.fn(async () => ({ sub: "admin" })),
  };
});

import { createAdminSession, destroyAdminSession } from "@/lib/auth";
import { resetRateLimits } from "@/lib/rate-limit";
import { loginAction, logoutAction } from "./actions";

const attempt = (password: string, next = "") => {
  const f = new FormData();
  f.set("password", password);
  f.set("next", next);
  return loginAction({ error: null }, f);
};

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  headerStore.ip = "203.0.113.7";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("loginAction", () => {
  it("rejects a wrong password", async () => {
    expect(await attempt("nope")).toMatchObject({ error: "Wrong password." });
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("signs in and redirects only to safe admin paths", async () => {
    await expect(attempt("test-admin-password", "/admin/orders?status=paid")).rejects.toMatchObject({
      url: "/admin/orders?status=paid",
    });
    expect(createAdminSession).toHaveBeenCalledTimes(1);
    await expect(attempt("test-admin-password", "https://evil.example")).rejects.toMatchObject({ url: "/admin" });
  });

  it("rate-limits to 5 attempts per minute per IP", async () => {
    for (let i = 0; i < 5; i++) await attempt("wrong");
    const blocked = await attempt("test-admin-password");
    expect(blocked.error).toMatch(/Too many attempts/);
    expect(createAdminSession).not.toHaveBeenCalled();
    // Another IP is not affected.
    headerStore.ip = "198.51.100.1";
    await expect(attempt("test-admin-password")).rejects.toMatchObject({ url: "/admin" });
  });
});

describe("logoutAction", () => {
  it("destroys the session and goes to the login page", async () => {
    await expect(logoutAction()).rejects.toMatchObject({ url: "/admin/login?flash=signed_out" });
    expect(destroyAdminSession).toHaveBeenCalled();
  });
});
