import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests", testMatch: "consent-trips-ui.spec.ts", timeout: 150000, workers: 1, use: { baseURL: process.env.CONSENT_TRIP_BASE_URL ?? "http://127.0.0.1:4183", viewport: { width: 390, height: 844 }, actionTimeout: 15000, trace: "retain-on-failure" }, outputDir: "output/consent-trips-2026-09-08/ui-results" });
