import { defineConfig } from "@playwright/test";

process.env.MAARIF_TEST_PRODUCTION = "1";
const evidenceStamp = process.env.MAARIF_EVIDENCE_STAMP ?? "0.23.0-2026-09-01";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["development-workspace-ui.spec.ts", "development-report-recovery-ui.spec.ts"],
  timeout: 120_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4178", viewport: { width: 390, height: 844 }, actionTimeout: 15_000 },
  outputDir: `output/playwright/development-workspace-production-${evidenceStamp}`,
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4178 --strictPort",
    url: "http://127.0.0.1:4178/",
    reuseExistingServer: false,
  },
});
