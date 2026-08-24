import { expect, test } from "@playwright/test";

const ACCESS_CODE = ["43", "85", "79"].join("");

test("davet ekranı yanlış kodu reddeder, doğru kodu cihazda korur", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1&accessGate=1");

  await expect(
    page.getByRole("heading", { name: "MaarifOS’a hoş geldiniz" }),
  ).toBeVisible();

  const input = page.getByLabel("6 haneli davet kodu");
  await input.fill("000000");
  await page.getByRole("button", { name: "MaarifOS’a gir" }).click();
  await expect(page.getByRole("alert")).toContainText("Kod doğrulanamadı");
  await expect(input).toHaveValue("");

  await input.fill(ACCESS_CODE);
  await page.getByRole("button", { name: "MaarifOS’a gir" }).click();
  await expect(page.getByTestId("today-screen")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("today-screen")).toBeVisible();
  await expect(
    page.getByText(/premium|demo|kurucu|abonelik|deneme sürümü/iu),
  ).toHaveCount(0);
});

test("aynı davet kodu üç bağımsız cihaz profilinde kotasız ve lisans ağı olmadan çalışır", async ({
  browser,
  baseURL,
}) => {
  expect(baseURL).toBeTruthy();

  for (let index = 0; index < 3; index += 1) {
    const context = await browser.newContext({
      viewport: { width: 320 + index * 55, height: 568 + index * 138 },
    });
    const page = await context.newPage();
    const remoteRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== new URL(baseURL!).origin) remoteRequests.push(url.href);
    });

    await page.goto(`${baseURL}/?native=1&accessGate=1&premiumPilot=1`);
    await page.getByLabel("6 haneli davet kodu").fill(ACCESS_CODE);
    await page.getByRole("button", { name: "MaarifOS’a gir" }).click();
    await expect(page.getByTestId("today-screen")).toBeVisible();
    expect(remoteRequests).toEqual([]);
    await expect(
      page.getByText(/premium|demo|kurucu|abonelik|cihaz hakkı/iu),
    ).toHaveCount(0);

    const grant = await page.evaluate(() => {
      const raw = localStorage.getItem("maarifos.shared-invite-access.v1");
      return raw ? JSON.parse(raw) : null;
    });
    expect(Object.keys(grant).sort()).toEqual([
      "grantedAtUtc",
      "schemaVersion",
      "verifierId",
    ]);
    expect(JSON.stringify(grant)).not.toContain(ACCESS_CODE);
    await context.close();
  }
});
