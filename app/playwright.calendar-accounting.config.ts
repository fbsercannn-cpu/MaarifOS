import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests", testMatch: ["calendar-accounting-ui.spec.ts", "calendar-loading-ui.spec.ts"], timeout: 120000, workers: 1, use: { baseURL: "http://127.0.0.1:4182", viewport: { width: 390, height: 844 }, trace: "retain-on-failure" }, outputDir: "output/completion-2026-09-07/calendar/ui-results" });
