import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.MAARIFOS_LIVE_URL ??
  "https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site";

export default defineConfig({
  testDir: "./tests/smoke",
  globalSetup: "./playwright.live.setup.ts",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  grepInvert:
    /premium cihaz anahtarı|premium lisans IDB|gerçek mobil Chromium canvas/u,
  projects: [
    { name: "live-chromium-phone", use: { ...devices["Pixel 7"] } },
    { name: "live-webkit-phone", use: { ...devices["iPhone 14"] } },
  ],
  use: {
    baseURL,
    storageState: "./test-results/live-access-state.json",
    // Production registers a service worker, but live tests mock selected API
    // responses. Blocking it keeps those mocks deterministic across Chromium
    // and WebKit instead of letting a previously installed worker bypass
    // Playwright's route interception.
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
