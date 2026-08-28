import { expect, test, type Page } from "@playwright/test";

async function configureExistingClassroom(
  page: Page,
  period: "official-next" | "active" = "official-next",
) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("İlk Görünüm Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Deneme Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup
    .getByLabel("Eğitim yılı başlangıcı")
    .fill(period === "active" ? "2025-09-01" : "2026-09-01");
  await setup
    .getByLabel("Eğitim yılı bitişi")
    .fill(period === "active" ? "2026-08-31" : "2027-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test.use({ viewport: { width: 390, height: 844 } });

test("temiz cihaz tek kurulum odağını korur, sınıf kurulunca ilk öğrenciyi ilk görünüme taşır", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const today = page.getByTestId("today-screen");
  await expect(today).toHaveAttribute("data-setup-only", "true");
  await expect(page.getByRole("dialog", { name: "Sınıfını hazırla" })).toBeVisible();
  await expect(today.locator(".simple-today__focus")).toContainText("Eğitim yılı ve sınıfınızı kurun");
  await expect(today.locator(".simple-today__prepared")).toHaveCount(0);

  await configureExistingClassroom(page);

  await expect(today).toHaveAttribute("data-setup-only", "false");
  await expect(page.getByRole("heading", { name: "Günaydın Kurgu Öğretmen" })).toBeVisible();
  const className = today.locator(".simple-today__context-item").first().locator("strong");
  await expect(className).toHaveText("Deneme Sınıfı");
  const classNameLayout = await className.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(classNameLayout.scrollWidth).toBeLessThanOrEqual(classNameLayout.clientWidth + 1);
  expect(classNameLayout.scrollHeight).toBeLessThanOrEqual(classNameLayout.clientHeight + 1);
  expect(classNameLayout.whiteSpace).toBe("normal");
  const classMeta = today
    .locator(".simple-today__context-item:not(.is-date)")
    .locator("small");
  await expect(classMeta).toHaveText("0 çocuk · 60–72 ay · TYMM");
  const classMetaLayout = await classMeta.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(classMetaLayout.whiteSpace).toBe("normal");
  expect(classMetaLayout.scrollWidth).toBeLessThanOrEqual(classMetaLayout.clientWidth + 1);
  expect(classMetaLayout.scrollHeight).toBeLessThanOrEqual(classMetaLayout.clientHeight + 1);
  const nextTask = page.getByLabel("Sıradaki en iyi adım");
  const teacherDesk = page.locator(".simple-today__desk-grid");
  await expect(nextTask).toBeVisible();
  await expect(nextTask).toContainText("İlk çocuğu ekleyin");
  await expect(teacherDesk.getByRole("button")).toHaveCount(4);

  const layout = await today.evaluate((screen) => {
    const focus = screen.querySelector<HTMLElement>(".simple-today__focus");
    const desk = screen.querySelector<HTMLElement>(".simple-today__desk");
    return {
      screenScrollWidth: screen.scrollWidth,
      screenClientWidth: screen.clientWidth,
      focusTop: focus?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      focusBottom: focus?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      deskTop: desk?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(layout.screenScrollWidth).toBeLessThanOrEqual(layout.screenClientWidth);
  expect(layout.focusTop).toBeLessThan(520);
  expect(layout.focusBottom).toBeLessThanOrEqual(844);
  expect(layout.deskTop).toBeLessThan(844);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const responsiveLayout = await today.evaluate((screen) => {
      const focus = screen.querySelector<HTMLElement>(".simple-today__focus");
      return {
        scrollWidth: screen.scrollWidth,
        clientWidth: screen.clientWidth,
        focusTop: focus?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      };
    });
    expect(responsiveLayout.scrollWidth).toBeLessThanOrEqual(responsiveLayout.clientWidth);
    expect(responsiveLayout.focusTop).toBeLessThan(viewport.height);
  }
});

test("Bugün ekranındaki tek dokunuşlu Hızlı gözlem mevcut güvenli akışı açar", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await configureExistingClassroom(page, "active");

  const quickObservation = page.getByRole("button", {
    name: "Hızlı gözlem",
    exact: true,
  });
  await expect(quickObservation).toBeVisible();
  const target = await quickObservation.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Hızlı Gözlem Çocuğu");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addStudent).toBeHidden();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  await page.getByRole("button", { name: "Hızlı gözlem", exact: true }).click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  const child = page
    .getByRole("region", { name: "Gözlem yapılacak çocuk" })
    .getByRole("button", { name: "Hızlı Gözlem Çocuğu", exact: true });
  await expect(child).toHaveAttribute("aria-pressed", "false");
  await child.click();
  await expect(child).toHaveAttribute("aria-pressed", "true");
});
