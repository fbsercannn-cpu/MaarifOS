import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["classroom-admin-ui.spec.ts", "consent-trips-ui.spec.ts", "family-engagement-ui.spec.ts", "learning-centers-ui.spec.ts"],
  workers: 1,
  timeout: 150000,
  use: { baseURL: "http://127.0.0.1:4198", viewport: { width: 390, height: 844 }, actionTimeout: 15000, trace: "retain-on-failure" },
  outputDir: "output/new-workflows-2026-09-08/final/management-results",
});
