import { defineConfig } from "@playwright/test";

const port = Number(process.env.PWA_PREVIEW_PORT ?? 4175);

export default defineConfig({
  testDir: "./tests/pwa",
  testMatch: "production.spec.ts",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `npm exec vite -- preview --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: true,
  },
});
