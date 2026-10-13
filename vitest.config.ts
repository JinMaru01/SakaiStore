import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? "postgresql://sakai:sakai@localhost:5432/sakaistore_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; stub it for unit tests.
      "server-only": fileURLToPath(new URL("./tests/setup/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    globalSetup: ["./tests/setup/global-setup.ts"],
    // Integration tests share one test database; run files sequentially.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB,
      AUTH_SECRET: "test-secret-test-secret-test-secret",
      ADMIN_PASSWORD: "test-admin-password",
      PAYMENT_MODE: "mock",
      FULFILLMENT_MODE: "manual",
      PLAYER_LOOKUP_MODE: "mock",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      BAKONG_ACCOUNT_ID: "sakai_test@aclb",
      BAKONG_MERCHANT_NAME: "Sakai Store",
      BAKONG_MERCHANT_CITY: "Phnom Penh",
      PAYMENT_TIMEOUT_MINUTES: "15",
    },
  },
});
