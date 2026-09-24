import { defineConfig } from "@playwright/test";

process.env.MAARIF_TEST_PRODUCTION = "1";
const evidenceStamp = process.env.MAARIF_EVIDENCE_STAMP ?? "0.23.0-2026-09-01";

export default defineConfig({
  testDir: "./tests",
  testMatch: "development-observation-ui.spec.ts",
  timeout: 90_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4177", viewport: { width: 390, height: 844 } },
  outputDir: `output/playwright/development-production-${evidenceStamp}`,
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4177 --strictPort",
    url: "http://127.0.0.1:4177/",
    reuseExistingServer: false,
  },
});
