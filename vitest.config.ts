import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Unit tests run always; integration tests need TEST_DATABASE_URL
    // (set automatically in CI with a Postgres service container).
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
