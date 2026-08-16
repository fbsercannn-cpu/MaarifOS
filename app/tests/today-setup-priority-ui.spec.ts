import { expect, test, type Page } from "@playwright/test";

async function configureExistingClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıf kurulumu" });
  await setup.getByLabel("Sınıf adı").fill("İlk görünüm sınıfı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup
    .getByLabel("Uygulanan program")
    .selectOption({ label: "Türkiye Yüzyılı Maarif Modeli" });
  await setup.getByLabel("Program katalog kimliği").fill("TODAY-FIRST-VIEWPORT");
  await setup.getByLabel("Kaynak sürümü").fill("2026-test");
  await setup.getByRole("button", { name: "Devam et" }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup
    .getByRole("button", { name: "Sınıfı ve çalışma düzenini kaydet" })
    .click();
  await expect(setup).toBeHidden();
}

test.use({ viewport: { width: 390, height: 844 } });

test("temiz cihaz rehberli kurulumu korur, sınıf kurulunca Şimdi alanını ilk görünüme taşır", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const setupCenter = page.getByTestId("setup-progress-center");
  const teacherControl = page.locator(".teacher-control");

  await expect(setupCenter).toHaveAttribute("data-mode", "guided");
  await expect(setupCenter.locator("button")).toHaveCount(4);
  await expect(setupCenter.locator("button").first()).toBeEnabled();
  await expect(setupCenter.locator("button").nth(1)).toBeDisabled();
  await expect(teacherControl).toBeHidden();
  await expect(page.getByTestId("marif-teacher-agent")).toHaveCount(0);
  await expect(page.getByTestId("teacher-work-cycle")).toHaveCount(0);
  await expect(page.getByTestId("teacher-day-close")).toHaveCount(0);
  await expect(page.locator(".home-children")).toHaveCount(0);
  await expect(page.locator(".teacher-control-premium")).toHaveCount(0);

  await configureExistingClassroom(page);

  await expect(setupCenter).toBeHidden();
  await expect(page.getByTestId("marif-teacher-agent")).toBeVisible();
  await expect(page.getByTestId("marif-teacher-agent")).toContainText("Sıradaki iş");
  await expect(page.getByTestId("marif-teacher-agent")).not.toContainText(
    "MARİF · öğretmen asistanı",
  );
  await expect(teacherControl).toBeVisible();
  await expect(page.getByRole("heading", { name: "Şimdi", exact: true })).toBeVisible();

  const attendance = page.getByRole("button", { name: /Bugünkü devam/ });
  const plan = teacherControl.locator(".today-priority-card--plan");
  const layout = await page.locator(".today-screen").evaluate((screen) => {
    const setup = screen.querySelector<HTMLElement>(".setup-progress-center");
    const control = screen.querySelector<HTMLElement>(".teacher-control");
    const attendanceCard = screen.querySelector<HTMLElement>(
      ".today-priority-card--attendance",
    );
    const planCard = screen.querySelector<HTMLElement>(".today-priority-card--plan");
    return {
      screenScrollWidth: screen.scrollWidth,
      screenClientWidth: screen.clientWidth,
      setupHeight: setup?.getBoundingClientRect().height ?? 0,
      controlTop: control?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      attendanceBottom:
        attendanceCard?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      planTop: planCard?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(layout.screenScrollWidth).toBeLessThanOrEqual(layout.screenClientWidth);
  expect(layout.setupHeight).toBe(0);
  expect(layout.controlTop).toBeLessThan(620);
  expect(layout.attendanceBottom).toBeLessThan(844);
  expect(layout.planTop).toBeLessThan(844);

  await expect(attendance).toBeVisible();
  await expect(plan).toBeVisible();

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const responsiveLayout = await page.locator(".today-screen").evaluate((screen) => {
      const control = screen.querySelector<HTMLElement>(".teacher-control");
      return {
        scrollWidth: screen.scrollWidth,
        clientWidth: screen.clientWidth,
        controlTop: control?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      };
    });
    expect(responsiveLayout.scrollWidth).toBeLessThanOrEqual(responsiveLayout.clientWidth);
    expect(responsiveLayout.controlTop).toBeLessThan(viewport.height);
  }
});
