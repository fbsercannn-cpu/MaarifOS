import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "pwa/action-completion-offline.spec.ts", timeout: 150000, workers: 1,
  use: { baseURL: "http://127.0.0.1:4188", viewport: { width: 390, height: 844 }, actionTimeout: 15000 },
  outputDir: "output/action-completion-production",
  webServer: { command: "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4188 --strictPort", url: "http://127.0.0.1:4188/", reuseExistingServer: false },
});
