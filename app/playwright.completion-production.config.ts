import { defineConfig } from "@playwright/test";
import production from "./pwa.playwright.config.ts";
process.env.MAARIF_CALENDAR_PRODUCTION = "1";
process.env.MAARIF_DOCUMENTS_PRODUCTION = "1";
export default defineConfig(production, {
  testMatch: ["teacher-followup-production.spec.ts", "calendar-accounting-ui.spec.ts", "pdf-preview-ui.spec.ts"],
  grep: /üretim:|gerçek yoklama|uygulama sınıf/u,
  timeout: 150000,
  use: { viewport: { width: 390, height: 844 }, actionTimeout: 10000 },
  outputDir: "output/completion-2026-09-07/production",
});
