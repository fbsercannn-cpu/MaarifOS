import { defineConfig } from "@playwright/test";
import production from "./pwa.playwright.config.ts";

process.env.MAARIF_ADDRESS_PRODUCTION = "1";
process.env.MAARIF_PARENT_PRODUCTION = "1";

export default defineConfig(production, {
  testMatch: ["student-structured-address-ui.spec.ts", "student-parent-address-ui.spec.ts"],
  timeout: 120000,
  use: { viewport: { width: 390, height: 844 } },
  outputDir: "output/address-2026-09-07/production-offline",
});
