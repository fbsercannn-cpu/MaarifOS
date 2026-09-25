import { defineConfig } from "@playwright/test";
import production from "./pwa.playwright.config.ts";

process.env.MAARIF_DOCUMENTS_PRODUCTION = "1";
process.env.GROWTH_PRODUCTION = "1";
process.env.CLASS_ROSTER_EXPORT_PRODUCTION = "1";

export default defineConfig(production, {
  testMatch: ["pdf-preview-ui.spec.ts", "growth-measurements-ui.spec.ts", "pdf-print-production.spec.ts", "class-roster-export-ui.spec.ts"],
  grep: /uygulama sınıf|MR097|üretim çevrimdışı yazdırma|390px: gerçek Sınıfım/u,
  timeout: 240000,
  use: { viewport: { width: 390, height: 844 }, actionTimeout: 20000 },
  outputDir: "output/documents-production-results",
});
