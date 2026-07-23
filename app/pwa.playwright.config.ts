import { defineConfig } from "@playwright/test";

const port = Number(process.env.PWA_PREVIEW_PORT ?? 4175);
const externalServer = process.env.PWA_EXTERNAL_SERVER === "1";

export default defineConfig({
  testDir: "./tests/pwa",
  testMatch: "production.spec.ts",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: externalServer
    ? undefined
    : {
        command: `node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port}`,
        url: `http://127.0.0.1:${port}/`,
        reuseExistingServer: false,
      },
});
