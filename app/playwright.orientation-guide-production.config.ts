import { defineConfig } from "@playwright/test";
import production from "./pwa.playwright.config.ts";

export default defineConfig(production, {
  testMatch: ["pwa/orientation-guide-offline.spec.ts"],
  timeout: 90_000,
  outputDir: "./output/orientation-guide-2026-09-07/test-results",
  use: { viewport: { width: 390, height: 844 }, channel: "chromium" },
});
