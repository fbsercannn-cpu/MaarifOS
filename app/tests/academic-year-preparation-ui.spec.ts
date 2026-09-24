import { readRepositorySnapshot } from "./helpers/production-repository";
import { expect, test, type Page } from "@playwright/test";
import { expectNoUntriagedAxeViolations } from "./smoke/accessibility-fixtures.ts";

async function installAcademicYearClock(page: Page) {
  // Shift civil time while preserving the browser animation and timeout clocks.
  await page.addInitScript((initialOffset: number) => {
    const NativeDate = Date;
    const now = () => NativeDate.now() + Number(sessionStorage.getItem("academic-year-test-offset") ?? initialOffset);
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) { return Reflect.construct(target, args.length ? args : [now()]); },
      apply() { return new NativeDate(now()).toString(); },
      get(target, key, receiver) { return key === "now" ? now : Reflect.get(target, key, receiver); },
    });
  }, Date.parse("2026-08-31T06:00:00.000Z") - Date.now());
}
test.describe.configure({ timeout: 60_000 });
test.use({ viewport: { width: 390, height: 844 } });

test("2026–2027 sınıfı ana ekrandan başlatılır ve yeniden yüklemede kayıt kullanımı açık kalır", async ({
  page,
}) => {
  await installAcademicYearClock(page);
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Hazırlık Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Hazırlık Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Hazırlık Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await expect(setup.getByLabel("Eğitim yılı başlangıcı")).toHaveValue("2026-09-01");
  await expect(setup.getByLabel("Eğitim yılı bitişi")).toHaveValue("2027-08-31");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
  await expect(page.getByRole("button", { name: "Eğitim yılını başlat", exact: true })).toBeInViewport();

  const childName = "Hazırlık Kurgu Öğrencisi";
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill(childName);
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await expect(addStudent).toBeHidden();
  const studentRow = page.locator(".simple-student-list li").filter({ hasText: childName });
  const quickObservation = studentRow.getByRole("button", {
    name: `${childName} için Maarif gelişim gözlemi ekle`,
    exact: true,
  });
  await expect(quickObservation).toBeDisabled();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  const startYear = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  await expect(startYear).toHaveCount(1);
  await expect(startYear).toBeInViewport();
  await startYear.click();
  await expect(startYear).toBeHidden();
  await expect(setup).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await expect(startYear).toHaveCount(0);
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await expect(quickObservation).toBeEnabled();
  await quickObservation.click();
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Hızlı Gözlem", { exact: true })).toBeHidden();

  await page.getByText("Sınıf işlemleri", { exact: true }).click();
  const attendance = page.getByRole("button", { name: /Bugünün yoklaması/ });
  await expect(attendance).toBeEnabled();
  await attendance.click();
  await expect(page.getByRole("dialog", { name: "Hızlı Dokunmatik Yoklama (E5)" })).toBeVisible();
  await page.keyboard.press("Escape");

  const year = (await readRepositorySnapshot(page)).academicYears.find((record: any) => record.status === "active");
  const savedYear = year ? { startDate: year.startDate, endDate: year.endDate, operationalStartDate: year.operationalStartDate } : null;
  expect(savedYear).toEqual({
    startDate: "2026-09-01",
    endDate: "2027-08-31",
    operationalStartDate: "2026-08-31",
  });
  await expect(
    page.getByRole("dialog", { name: "Yeni kayıtlar güvenlik için durduruldu" }),
  ).toBeHidden();
});

test("boş sınıf ile arama sonucu olmayan sınıf farklı ve eyleme dönük metin gösterir", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Boş Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Boş Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Boş Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup
    .locator("details")
    .filter({ hasText: "İleri ayarlar" })
    .locator("summary")
    .click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const emptyState = page.locator(".simple-empty-state");
  const emptyStateMessage = emptyState.getByRole("status");
  await expect(emptyStateMessage).toHaveAttribute("aria-live", "polite");
  await expect(emptyStateMessage).toHaveAttribute("aria-atomic", "true");
  await expect(
    emptyStateMessage.getByText("Henüz çocuk eklenmedi", { exact: true }),
  ).toBeVisible();
  await expect(
    emptyStateMessage.getByText("Çocuk ekle düğmesiyle sınıf listenizi oluşturun.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Çocuk ekle", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle" });
  await addStudent.getByLabel("Çocuğun adı").fill("Arama Kurgu Öğrencisi");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat" }).click();
  await expect(addStudent).toBeHidden();
  await expect(
    page.locator(".simple-student-list li").filter({ hasText: "Arama Kurgu Öğrencisi" }),
  ).toBeVisible();

  const studentSearch = page.getByLabel("Çocuk ara");
  await studentSearch.fill("olmayan");
  await expect(studentSearch).toHaveValue("olmayan");
  await expect(
    emptyStateMessage.getByText("Eşleşen çocuk yok", { exact: true }),
  ).toBeVisible();
  await expect(
    emptyStateMessage.getByText("Arama metnini değiştirin.", { exact: true }),
  ).toBeVisible();
});

test("sona ermiş yıldan yeni döneme geçiş 320 ve 390 px ilk görünümde tek karardır", async ({
  page,
}, testInfo) => {
  await installAcademicYearClock(page);
  await page.goto("/?native=1", { waitUntil: "networkidle" });

  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Geçiş Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Geçiş Kurgu Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Geçiş Kurgu Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.locator("details.classroom-calendar-details > summary").click();
  await setup.getByLabel("Eğitim yılı", { exact: true }).fill("2025–2026 Eğitim Yılı");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click();
  await expect(setup).toBeHidden();

  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const addStudent = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await addStudent.getByLabel("Çocuğun adı").fill("Yeni Dönem Çocuğu");
  await addStudent.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(addStudent).toBeHidden();
  await page.getByRole("button", { name: "Bugün", exact: true }).click();

  await page.evaluate(() => sessionStorage.setItem("academic-year-test-offset", String(Math.trunc(Date.parse("2026-09-01T06:00:00.000Z") - performance.timeOrigin - performance.now()))));
  await page.reload({ waitUntil: "networkidle" });
  const prepareNextYear = page.getByRole("button", {
    name: "Yeni dönemi hazırla",
    exact: true,
  });
  await expect(prepareNextYear).toBeVisible();
  await prepareNextYear.click();

  const transition = page.getByRole("dialog", {
    name: "Yeni eğitim yılına geç",
    exact: true,
  });
  const carryConfirmation = transition.getByLabel(
    "Çocukları yeni sınıfa taşımayı ve eski kayıtları arşivlemeyi onayla",
    { exact: true },
  );
  const primaryAction = transition.getByRole("button", {
    name: "Yeni eğitim yılına geç",
    exact: true,
  });
  const transitionSummary = transition.locator(".academic-year-transition-compact");
  const editDetails = transition.locator("details.classroom-setup-edit-details");

  await expect(transition).toBeVisible();
  await expect(transitionSummary.getByText("Eski dönem", { exact: true })).toBeVisible();
  await expect(transitionSummary.getByText("2025–2026 Eğitim Yılı", { exact: true })).toBeVisible();
  await expect(transitionSummary.getByText("Yeni dönem", { exact: true })).toBeVisible();
  await expect(transitionSummary.getByText("2026–2027 Eğitim Yılı", { exact: true })).toBeVisible();
  await expect(transitionSummary.getByText("1 çocuğu yeni eğitim yılına taşı", { exact: true })).toBeVisible();
  await expect(primaryAction).toHaveCount(1);
  await expect(primaryAction).toBeDisabled();
  await expect(editDetails).not.toHaveAttribute("open", "");
  await expect(editDetails.getByText("Ayrıntıları değiştir", { exact: true })).toBeVisible();
  await expect(editDetails.getByLabel("Okul adı")).toBeHidden();
  await expect(carryConfirmation).toBeFocused();

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () =>
        transition.evaluate((dialog) => {
          const sheetContent = dialog.querySelector<HTMLElement>(".sheet-content");
          sheetContent?.scrollTo({ top: 0 });
          return sheetContent?.scrollTop ?? -1;
        }),
      )
      .toBe(0);
    const layout = await transition.evaluate((dialog) => {
      const sheetContent = dialog.querySelector<HTMLElement>(".sheet-content");
      const confirmation = dialog.querySelector<HTMLElement>(
        ".academic-year-transition-confirm",
      );
      const action = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Yeni eğitim yılına geç",
      );
      const sheetRect = sheetContent?.getBoundingClientRect();
      const confirmationRect = confirmation?.getBoundingClientRect();
      const actionRect = action?.getBoundingClientRect();
      return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            sheetScrollTop: sheetContent?.scrollTop ?? -1,
            sheetScrollWidth: sheetContent?.scrollWidth ?? Number.POSITIVE_INFINITY,
            sheetClientWidth: sheetContent?.clientWidth ?? 0,
            confirmationTop: confirmationRect?.top ?? Number.POSITIVE_INFINITY,
            confirmationBottom: confirmationRect?.bottom ?? Number.POSITIVE_INFINITY,
            actionTop: actionRect?.top ?? Number.POSITIVE_INFINITY,
            actionBottom: actionRect?.bottom ?? Number.POSITIVE_INFINITY,
            sheetTop: sheetRect?.top ?? Number.NEGATIVE_INFINITY,
            sheetBottom: sheetRect?.bottom ?? Number.NEGATIVE_INFINITY,
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.sheetScrollWidth).toBeLessThanOrEqual(layout.sheetClientWidth + 1);
    expect(layout.confirmationTop).toBeGreaterThanOrEqual(layout.sheetTop);
    expect(layout.confirmationBottom).toBeLessThanOrEqual(layout.sheetBottom + 1);
    expect(layout.actionTop).toBeGreaterThanOrEqual(layout.sheetTop);
    expect(layout.actionBottom).toBeLessThanOrEqual(layout.sheetBottom + 1);
    await expect(carryConfirmation).toBeInViewport();
    await expect(primaryAction).toBeInViewport();
    await expectNoUntriagedAxeViolations(
      page,
      testInfo,
      `academic-year-transition-${viewport.width}x${viewport.height}`,
    );
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await carryConfirmation.focus();
  await page.keyboard.press("Space");
  await expect(carryConfirmation).toBeChecked();
  await expect(primaryAction).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(primaryAction).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(transition).toBeHidden();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  const carriedStudent = page
    .locator(".simple-student-list li")
    .filter({ hasText: "Yeni Dönem Çocuğu" });
  await expect(carriedStudent).toBeVisible();
  await expect(
    carriedStudent.getByRole("button", {
      name: "Yeni Dönem Çocuğu için Maarif gelişim gözlemi ekle",
      exact: true,
    }),
  ).toBeEnabled();
  await page.reload({ waitUntil: "networkidle" });
  await expect(carriedStudent).toBeVisible();

  const snapshot = await readRepositorySnapshot(page);
  const activeYear = snapshot.academicYears.find((record: any) => record.status === "active");
  const archivedYear = snapshot.academicYears.find((record: any) => record.status === "archived");
  const activeClassroom = snapshot.classrooms.find((record: any) => record.academicYearId === activeYear?.id && record.status === "active");
  const storedTransition = { activeYearName: activeYear?.name, activeYearStart: activeYear?.startDate,
    archivedYearName: archivedYear?.name, activeClassroomId: activeClassroom?.id };

  expect(storedTransition).toMatchObject({
    activeYearName: "2026–2027 Eğitim Yılı",
    activeYearStart: "2026-09-01",
    archivedYearName: "2025–2026 Eğitim Yılı",
    activeClassroomId: expect.any(String),
  });
});
