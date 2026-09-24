import { defineConfig } from "@playwright/test";
const production = process.env.CLASS_ROSTER_EXPORT_PRODUCTION === "1";
export default defineConfig({
  testDir: "./tests", testMatch: "class-roster-export-ui.spec.ts", workers: 1, timeout: 180000,
  outputDir: `output/class-roster-v5-2026-09-08/ui/${production ? "production" : "development"}/test-results`,
  use: { baseURL: process.env.CLASS_ROSTER_EXPORT_BASE_URL ?? `http://127.0.0.1:${production ? 4198 : 4183}`,
    viewport: { width: 390, height: 844 }, actionTimeout: 15000, trace: "retain-on-failure", screenshot: "only-on-failure" },
});
