import { chromium, type FullConfig } from "@playwright/test";

const ACCESS_CODE = ["43", "85", "79"].join("");

export default async function grantLiveAccess(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string" || !baseURL.startsWith("https://")) {
    throw new Error("Live phone acceptance requires an HTTPS base URL.");
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/?native=1&accessGate=1`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("6 haneli davet kodu").fill(ACCESS_CODE);
    await page.getByRole("button", { name: "MaarifOS’a gir" }).click();
    await page.getByTestId("today-screen").waitFor({ state: "visible" });
    await context.storageState({
      path: "./test-results/live-access-state.json",
    });
  } finally {
    await browser.close();
  }
}
