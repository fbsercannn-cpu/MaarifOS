import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/pwa", testMatch: "roster-vibrant-upgrade.spec.ts", workers: 1, retries: 0, timeout: 240000,
  outputDir: "output/class-roster-vibrant-2026-09-08/ui/production/test-results",
  use: { actionTimeout: 15000, trace: "retain-on-failure", screenshot: "only-on-failure" },
});
