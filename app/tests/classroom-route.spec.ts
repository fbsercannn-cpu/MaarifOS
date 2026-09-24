import { expect, test, type Page } from "@playwright/test";

async function configureClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Okul adı").fill("Route Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Route Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Route Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "Takvim ayrıntıları" })
    .locator("summary")
    .click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("Sınıfım lazy route yüklenir; geri/ileri URL ve odağı korur", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/ClassroomScreen\.(?:tsx|js)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await configureClassroom(page);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(page).toHaveURL(/\/classroom(?:\?native=1)?$/);
  await expect(page.getByTestId("classroom-route-loading")).toBeVisible();

  const classroomHeading = page.getByRole("heading", { name: "Sınıfım", level: 1 });
  await expect(classroomHeading).toBeVisible();
  await expect(classroomHeading).toBeFocused();
  await expect(page.getByRole("dialog", { name: "Sınıfım" })).toHaveCount(0);

  const layout = await page.getByRole("main", { name: /Sınıfım/ }).evaluate((screen) => ({
    scrollWidth: screen.scrollWidth,
    clientWidth: screen.clientWidth,
    right: screen.getBoundingClientRect().right,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.right).toBeLessThanOrEqual(390);

  await page.goBack();
  await expect(page).toHaveURL(/\/(?:\?native=1)?$/);
  const todayHeading = page.getByTestId("today-screen").getByRole("heading", { level: 1 });
  await expect(todayHeading).toBeVisible();
  await expect(todayHeading).toBeFocused();

  await page.goForward();
  await expect(page).toHaveURL(/\/classroom(?:\?native=1)?$/);
  await expect(classroomHeading).toBeVisible();
  await expect(classroomHeading).toBeFocused();
});

test("/classroom reload sonrasında route ve yerel sınıf listesi korunur", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/classroom", { waitUntil: "networkidle" });
  await configureClassroom(page);

  await expect(page.getByRole("heading", { name: "Sınıfım", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addSheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addSheet.getByLabel("Çocuğun adı").fill("Route Kalıcılık Çocuğu");
  await addSheet.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await expect(addSheet).toBeHidden();
  await expect(
    page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Route Kalıcılık Çocuğu" }),
  ).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/classroom(?:\?native=1)?$/);
  await expect(page.getByRole("heading", { name: "Sınıfım", level: 1 })).toBeFocused();
  await expect(
    page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Route Kalıcılık Çocuğu" }),
  ).toBeVisible();
});
