import { expect, test, type Locator, type Page } from "@playwright/test";
import { installCivilClock } from "./helpers/development-workspace-ui";

// Browser execution is pending. Civil clocks must not replace the animation clock.
async function installPreparationClock(page: Page) {
  const offset = Date.parse("2026-08-31T06:00:00.000Z") - Date.now();
  await page.addInitScript((offsetMs: number) => {
    const NativeDate = Date;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) { return Reflect.construct(target, args.length ? args : [NativeDate.now() + offsetMs]); },
      apply() { return new NativeDate(NativeDate.now() + offsetMs).toString(); },
      get(target, key, receiver) { return key === "now" ? () => NativeDate.now() + offsetMs : Reflect.get(target, key, receiver); },
    });
  }, offset);
}

async function configureExistingClassroom(page: Page) {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await expect(setup).toBeVisible();
  await setup.getByLabel("Okul adı").fill("İlk Görünüm Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Deneme Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-08-31");
  await setup.locator("details.classroom-advanced-settings > summary").click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();
}

async function expectReadableIdentity(element: Locator) {
  const layout = await element.evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
    whiteSpace: getComputedStyle(node).whiteSpace,
  }));
  expect(layout.whiteSpace).toBe("normal");
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
}

async function expectTouchTarget(element: Locator) {
  const box = await element.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function readClassroomIdentity(page: Page) {
  return page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const store = new IndexedDbDataStore();
    try {
      const snapshot = await store.readSnapshot();
      const classroom = snapshot.classrooms.find((record) =>
        !record.deletedAt && record.name === "Deneme Sınıfı");
      const year = snapshot.academicYears.find(
        (record) => record.id === classroom?.academicYearId,
      );
      return {
        yearId: year?.id,
        classroomId: classroom?.id,
        startDate: year?.startDate,
        endDate: year?.endDate,
        operationalStartDate: year?.operationalStartDate,
      };
    } finally { store.close(); }
  });
}

test.describe.configure({ timeout: 90_000 });
test.use({ viewport: { width: 390, height: 844 } });

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(viewport.width + " px hazırlık sınıfında yıl başlatma ilk görünümde tek ana eylemdir", async ({ page }) => {
    await page.setViewportSize(viewport);
    await installPreparationClock(page);
    await page.goto("/?native=1", { waitUntil: "networkidle" });
    const today = page.getByTestId("today-screen");
    await expect(today).toHaveAttribute("data-setup-only", "true");
    await expect(page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true })).toBeVisible();
    await expect(today.locator(".simple-today__focus")).toContainText("Sınıfı kur");
    await expect(today.locator(".simple-today__follow-ups")).toHaveCount(0);

    await configureExistingClassroom(page);
    await expect(today).toHaveAttribute("data-setup-only", "false");
    await expect(today.getByRole("heading", { name: "Merhaba Kurgu Öğretmen", exact: true })).toBeVisible();
    const context = today.getByRole("region", { name: "Bugünün sınıf bilgisi", exact: true });
    const className = context.locator("strong");
    const classMeta = context.locator(":scope > span");
    await expect(className).toHaveText("Deneme Sınıfı");
    await expect(classMeta).toHaveText(
      "Kayıtlı 0 · Bugünün yoklama kapsamı 0 · 60–72 ay · TYMM",
    );
    await expectReadableIdentity(className);
    await expectReadableIdentity(classMeta);

    const primary = today.getByRole("region", { name: "Sıradaki en iyi adım", exact: true });
    const startYear = primary.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
    const followUps = today.getByRole("region", { name: "Diğer iki adım", exact: true });
    await expect(primary.getByRole("button")).toHaveCount(1);
    await expect(startYear).toBeEnabled();
    await expect(startYear).toBeInViewport();
    await expect(followUps.getByRole("button")).toHaveCount(2);
    await expect(followUps.getByRole("button", { name: "İlk çocuğu ekle", exact: true })).toBeVisible();
    await expect(followUps.getByRole("button", { name: "Planları hazırla", exact: true })).toBeVisible();
    await expect(today.locator("#simple-today-details")).toHaveCount(0);
    await expect(today.getByRole("button", { name: "Hızlı gözlem", exact: true })).toHaveCount(0);

    // Read geometry before any scrolling so this remains a first-viewport check.
    const layout = await today.evaluate((screen) => {
      const focus = screen.querySelector(".simple-today__focus > button")!.getBoundingClientRect();
      const followUps = screen.querySelector(".simple-today__follow-ups")!.getBoundingClientRect();
      const navigation = document.querySelector(".bottom-nav")!.getBoundingClientRect();
      return {
        scrollWidth: screen.scrollWidth, clientWidth: screen.clientWidth,
        documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
        focusTop: focus.top, focusBottom: focus.bottom,
        followUpsTop: followUps.top, navigationTop: navigation.top,
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.focusTop).toBeGreaterThanOrEqual(0);
    expect(layout.focusTop).toBeLessThan(Math.min(520, viewport.height));
    expect(layout.focusBottom).toBeLessThanOrEqual(Math.min(viewport.height, layout.navigationTop) + 1);
    expect(layout.followUpsTop).toBeGreaterThanOrEqual(layout.focusBottom);
    expect(layout.followUpsTop).toBeLessThan(viewport.height);
    await expectTouchTarget(startYear);
    for (const button of await followUps.getByRole("button").all()) await expectTouchTarget(button);

    // The child follow-up stays available without replacing year activation.
    await followUps.getByRole("button", { name: "İlk çocuğu ekle", exact: true }).click();
    const addStudent = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
    await expect(addStudent).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(addStudent).toBeHidden();
    await page.getByRole("navigation", { name: "Ana menü", exact: true })
      .getByRole("button", { name: "Bugün", exact: true })
      .click();
    await expect(startYear).toBeEnabled();
    await expect.poll(() => readClassroomIdentity(page)).toMatchObject({
      yearId: expect.any(String),
      classroomId: expect.any(String),
    });
    const before = await readClassroomIdentity(page);
    expect(before.yearId).toEqual(expect.any(String));
    expect(before.classroomId).toEqual(expect.any(String));
    await startYear.click();
    await expect(startYear).toBeHidden();
    await expect.poll(async () => (await readClassroomIdentity(page)).operationalStartDate).toBe("2026-08-31");
    expect(await readClassroomIdentity(page)).toMatchObject({
      yearId: before.yearId, classroomId: before.classroomId,
      startDate: "2026-09-01", endDate: "2027-08-31",
      operationalStartDate: "2026-08-31",
    });
  });
}

test("aktif sınıfta ders sırasındaki Hızlı gözlem güvenli çocuk seçimini doğrudan açar", async ({ page }) => {
  await installCivilClock(page);
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await configureExistingClassroom(page);
  await expect(page.getByRole("button", { name: "Eğitim yılını başlat", exact: true })).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "Ana menü", exact: true });
  await navigation.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await addStudent.getByLabel("Çocuğun adı").fill("Hızlı Gözlem Çocuğu");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addStudent).toBeHidden();
  await navigation.getByRole("button", { name: "Bugün", exact: true }).click();

  const today = page.getByTestId("today-screen");
  await expect(today.getByRole("region", { name: "Bugünün sınıf bilgisi", exact: true }))
    .toContainText("Kayıtlı 1 · Bugünün yoklama kapsamı 1 · 60–72 ay · TYMM");
  await expect(today.locator("#simple-today-details")).toHaveCount(0);
  const quickObservation = today.getByRole("button", { name: "Hızlı gözlem", exact: true });
  await expect(quickObservation).toHaveCount(1);
  await expect(quickObservation).toBeEnabled();
  await quickObservation.scrollIntoViewIfNeeded();
  await expect(quickObservation).toBeInViewport();
  await expectTouchTarget(quickObservation);
  expect(await today.evaluate((screen) => screen.scrollWidth <= screen.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await quickObservation.click();
  const flow = page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true });
  await expect(flow).toBeVisible();
  await expect(flow.getByRole("region", { name: "Gözlem bağlamı", exact: true })).toContainText("Plan dışı anlık gözlem");
  const child = flow.getByRole("region", { name: "Gözlem yapılacak çocuk", exact: true })
    .getByRole("button", { name: "Hızlı Gözlem Çocuğu", exact: true });
  await expect(child).toHaveAttribute("aria-pressed", "false");
  await expectTouchTarget(child);
  await child.click();
  await expect(child).toHaveAttribute("aria-pressed", "true");
  await expect(flow.getByRole("textbox", { name: "Ne oldu?", exact: true })).toHaveValue("");
  await expect(flow.getByRole("button", { name: "Gözlemi kaydet", exact: true })).toBeDisabled();
});
