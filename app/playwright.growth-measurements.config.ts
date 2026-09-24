import { defineConfig } from "@playwright/test";

const testPort = Number(process.env.GROWTH_TEST_PORT ?? 4182);
const externalServer = process.env.GROWTH_EXTERNAL_SERVER === "1";
const artifactRoot = (process.env.MAARIF_DOCUMENTS_OUTPUT_DIR?.trim() ||
  "output/export-fixes-2026-09-09").replace(/[\\/]+$/u, "");

export default defineConfig({
  testDir: "./tests",
  testMatch: "growth-measurements-ui.spec.ts",
  timeout: 240_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.GROWTH_BASE_URL ?? `http://127.0.0.1:${testPort}`,
    viewport: { width: 390, height: 844 },
    actionTimeout: 20_000,
    trace: "retain-on-failure",
  },
  outputDir: `${artifactRoot}/growth/ui-results`,
  webServer: externalServer ? undefined : {
    command: `node ./node_modules/vite/bin/vite.js --port ${testPort}`,
    url: `http://127.0.0.1:${testPort}/classroom?native=1`,
    reuseExistingServer: false,
  },
});
