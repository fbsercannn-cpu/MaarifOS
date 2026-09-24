import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "roster-purpose-ui.spec.ts", timeout: 180000, workers: 1,
  use: { baseURL: "http://127.0.0.1:4192", viewport: { width: 390, height: 844 }, actionTimeout: 15000 },
  outputDir: "output/roster-redesign/production-results",
  webServer: { command: "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4192 --strictPort", url: "http://127.0.0.1:4192/", reuseExistingServer: false },
});
