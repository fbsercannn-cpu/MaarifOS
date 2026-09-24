import { defineConfig } from "@playwright/test";
import production from "./pwa.playwright.config.ts";
process.env.MAARIF_STUDENT_PRODUCTION = "1";
export default defineConfig(production, {
  testMatch: ["student-import-birthday-ui.spec.ts"],
  timeout: 90000,
  use: { viewport: { width: 390, height: 844 } },
  outputDir: "output/playwright/student-redesign-production-0.24.0-2026-09-07",
});
