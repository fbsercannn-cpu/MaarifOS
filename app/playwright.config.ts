import { defineConfig } from "@playwright/test";

const testPort = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);
const externalServer = process.env.MOBILE_RUNTIME_EXTERNAL_SERVER === "1";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: "pwa/**",
  timeout: 20_000,
  use: {
    baseURL: `http://127.0.0.1:${testPort}`,
    viewport: { width: 1100, height: 1100 },
  },
  webServer: externalServer
    ? undefined
    : {
        command: `node ./node_modules/vite/bin/vite.js --port ${testPort}`,
        url: `http://127.0.0.1:${testPort}/tests/runtime-fixture.html`,
        reuseExistingServer: false,
      },
});
