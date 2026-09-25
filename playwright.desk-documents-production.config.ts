import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "desk-documents-production.spec.ts", timeout: 180000, workers: 1,
  use: { baseURL: "http://127.0.0.1:4193", viewport: { width: 320, height: 844 }, actionTimeout: 15000 },
  outputDir: "output/desk-documents-2026-09-10/production-results",
  webServer: { command: "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4193 --strictPort", url: "http://127.0.0.1:4193/", reuseExistingServer: false },
});
