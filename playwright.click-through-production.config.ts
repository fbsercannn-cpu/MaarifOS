import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "pwa/click-through-offline.spec.ts", timeout: 150000, workers: 1,
  use: { baseURL: "http://127.0.0.1:4190", viewport: { width: 320, height: 844 }, actionTimeout: 15000 },
  outputDir: "output/click-through-production",
  webServer: { command: "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4190 --strictPort", url: "http://127.0.0.1:4190/", reuseExistingServer: false },
});
