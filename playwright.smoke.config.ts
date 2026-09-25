import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.ALPHA_SMOKE_PORT ?? 4175);

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  // Image/PDF generation and IndexedDB flows are CPU-heavy. Capping the
  // shared host prevents synthetic contention from corrupting latency and
  // WebKit state-transition measurements while still exercising concurrency.
  workers: 4,
  fullyParallel: false,
  projects: [
    { name: "chromium-phone", use: { ...devices["Pixel 7"] } },
    { name: "webkit-phone", timeout: 90_000, expect: { timeout: 30_000 }, use: { ...devices["iPhone 14"] } },
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node ./scripts/prepare-premium-preview.mjs && node ./node_modules/vite/bin/vite.js --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: {
      VITE_PREMIUM_PREVIEW_URL:
        "/premium-preview-cache/tymm-6072-2026-09-v3.json",
    },
  },
});
