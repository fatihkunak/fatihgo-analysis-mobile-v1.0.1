import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/setup.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
