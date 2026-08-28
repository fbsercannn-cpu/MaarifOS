import { expect, test, type Page } from "@playwright/test";
import { expectNoUntriagedAxeViolations } from "./smoke/accessibility-fixtures.ts";

test.describe.configure({ timeout: 90_000 });

async function ensureClassroomConfigured(page: Page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[data-testid="persistence-gate"]')) return false;
    const main = document.querySelector("main");
    if (!main) return false;
    const setupRequired =
      main.textContent?.includes("Sınıf kurulumu tamamlanmadı") ?? false;
    if (!setupRequired) return true;
    return [...document.querySelectorAll('[role="dialog"]')].some((dialog) =>
      dialog.textContent?.includes("Sınıfını hazırla"),
    );
  });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  if (!(await setup.isVisible().catch(() => false))) return;
  await setup.getByLabel("Okul adı").fill("Gözlem Akışı Test Okulu");
  await setup
    .getByLabel("Öğretmen adı soyadı")
    .fill("Gözlem Akışı Test Öğretmeni");
  await setup.getByLabel("Sınıf adı").fill("Gözlem Akışı Test Sınıfı");
  await setup
    .getByLabel("Maarif Modeli yaş grubu", { exact: true })
    .selectOption({ label: "60–72 ay" });
  await setup.getByText("Takvim ayrıntıları", { exact: true }).click();
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByText("İleri ayarlar", { exact: true }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

function classroomList(page: Page) {
  return page.getByRole("region", { name: /Sınıf(?:taki çocuklar| listesi)/i });
}

function studentListItem(page: Page, name: string) {
  return classroomList(page)
    .getByRole("listitem")
    .filter({ hasText: name })
    .first();
}

function studentProfileButton(page: Page, name: string) {
  return studentListItem(page, name).getByRole("button").first();
}

function studentObservationButton(page: Page, name: string) {
  return studentListItem(page, name).getByRole("button", {
    name: "Gözlem",
    exact: true,
  });
}

async function addChild(page: Page, name: string) {
  if (!(await page.getByRole("main", { name: "Sınıfım" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await page
    .getByRole("button", { name: /^(İlk öğrenciyi ekle|Öğrenci ekle)$/ })
    .last()
    .click();
  const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await sheet.getByLabel("Çocuğun adı").fill(name);
  await sheet.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(studentProfileButton(page, name)).toBeVisible();
}

async function openClassroom(page: Page) {
  const main = page.getByRole("main", { name: "Sınıfım" });
  if (!(await main.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await expect(main).toBeVisible();
}

async function openStudentProfile(page: Page, name: string) {
  const profile = page.getByRole("dialog", { name: `${name} profili` });
  if (!(await profile.isVisible().catch(() => false))) {
    await openClassroom(page);
    await studentProfileButton(page, name).click();
  }
  await expect(profile).toBeVisible();
  return profile;
}

test("390×844 hızlı gözlem ipuçlarını gösterir ve taslak yüklenirken yazmayı kilitler", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, "Ada Taslak");
  await addChild(page, "Mert Taslak");

  await studentObservationButton(page, "Ada Taslak").click();
  const dialog = page.getByRole("dialog", {
    name: "Gözlem ve değerlendirme akışı",
  });
  const note = dialog.getByLabel("Ne oldu?");
  const guide = dialog.getByRole("complementary", {
    name: "Bakıp yazabileceğiniz ipuçları",
  });
  await expect(guide).toBeVisible();
  await expect(
    guide.getByRole("button", { name: "Ne yaptı veya ne söyledi?" }),
  ).toBeVisible();
  await guide
    .getByRole("button", { name: "Ne yaptı veya ne söyledi?" })
    .click();
  await expect(
    guide.getByRole("status").filter({ hasText: "Seçili gözlem odağı" }),
  ).toBeVisible();

  await note.fill("Ada dört bloğu renk sırasına göre yan yana yerleştirdi.");
  await expect(
    dialog.getByRole("status").filter({ hasText: "Taslak bu cihazda korundu" }),
  ).toBeVisible();

  const loadingLockObserved = await page.evaluate(async () => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      "#d1-observation-text",
    );
    const region = document.querySelector<HTMLElement>(
      '[aria-label="Gözlem yapılacak çocuk"]',
    );
    const target = [...(region?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent?.includes("Mert Taslak"),
    );
    if (!textarea || !target) return false;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        resolve(value);
      };
      const observer = new MutationObserver(() => {
        if (textarea.disabled) finish(true);
      });
      observer.observe(textarea, {
        attributes: true,
        attributeFilter: ["disabled"],
      });
      target.click();
      window.setTimeout(() => finish(textarea.disabled), 2_000);
    });
  });
  expect(loadingLockObserved).toBe(true);
  await expect(
    dialog
      .getByRole("region", { name: "Gözlem yapılacak çocuk" })
      .getByRole("button", { name: "Mert Taslak", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(note).toBeEnabled();
  await expect(note).toHaveValue("");

  await dialog.getByText("İstersen ayrıntı ekle", { exact: true }).click();
  await dialog
    .getByRole("button", { name: "Oyun ve katılım", exact: true })
    .click();
  await expect(
    guide.getByRole("button", {
      name: "Oyuna nasıl katıldı, rolünü nasıl kurdu veya değiştirdi?",
    }),
  ).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.documentElement.scrollWidth,
    guideRight:
      document.querySelector(".quick-observation-guide")?.getBoundingClientRect()
        .right ?? 0,
  }));
  expect(layout.body).toBeLessThanOrEqual(layout.viewport);
  expect(layout.guideRight).toBeLessThanOrEqual(layout.viewport);
  await expectNoUntriagedAxeViolations(
    page,
    testInfo,
    "quick-observation-guide-390x844",
  );
});

test("program bağlantısından çıkılan gözlem profilde değerlendirmeye geri döner ve tamamlanır", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  const childName = "Emine Akış Çocuğu";
  const observationText =
    "Çocuk iki farklı yaprağı büyüklüklerine göre yan yana yerleştirdi.";
  await addChild(page, childName);
  await studentObservationButton(page, childName).click();
  await page.getByLabel("Ne oldu?").fill(observationText);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();

  let profile = await openStudentProfile(page, childName);
  await profile
    .getByRole("button", { name: "Program bağlantısını tamamla" })
    .click();
  const evidenceDialog = page.getByRole("dialog", {
    name: "Gözlem ve değerlendirme akışı",
  });
  await evidenceDialog.getByLabel("Program referans kodu").fill("ÖĞR-BEYAN-42");
  await evidenceDialog
    .getByLabel("Program öğesi / başlığı")
    .fill("Yaprakları gözlenebilir özelliğine göre karşılaştırma");
  await evidenceDialog
    .getByLabel("Bu bağlantıyı ben seçtim ve gözlemle ilişkisini onaylıyorum.")
    .check();
  await evidenceDialog
    .getByRole("button", { name: "Bağlantıyı onayla" })
    .click();
  await expect(
    evidenceDialog.getByRole("heading", { name: "Kanıta dayalı değerlendirme" }),
  ).toBeVisible();

  const storedLink = await page.evaluate(async (referenceCode) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("maarifos-local");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = database
          .transaction("evidenceCurriculumLinks", "readonly")
          .objectStore("evidenceCurriculumLinks")
          .getAll();
        request.onsuccess = () =>
          resolve(
            request.result.find(
              (record) => record.referenceCode === referenceCode,
            ) ?? {},
          );
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }, "ÖĞR-BEYAN-42");
  expect(storedLink).toMatchObject({
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
    targetSourceUrl: "about:blank",
  });
  expect(storedLink).not.toHaveProperty("plannedTargetId");

  await evidenceDialog
    .getByRole("button", { name: "Değerlendirme akışını kapat" })
    .click();
  await expect(evidenceDialog).toBeHidden();
  profile = await openStudentProfile(page, childName);
  await expect(
    profile.getByText("Değerlendirme bekliyor", { exact: true }),
  ).toBeVisible();
  await expectNoUntriagedAxeViolations(
    page,
    testInfo,
    "student-profile-assessment-pending-390x844",
  );
  await profile
    .getByRole("button", { name: "Değerlendirmeyi tamamla" })
    .click();
  await expect(
    evidenceDialog.getByRole("heading", { name: "Kanıta dayalı değerlendirme" }),
  ).toBeVisible();
  await evidenceDialog
    .getByLabel("Öğretmen değerlendirmesi")
    .fill(
      "Seçili gözlem, çocuğun yaprakların büyüklük farkını karşılaştırarak görünür kıldığını gösteriyor.",
    );
  await evidenceDialog
    .getByRole("button", { name: "İnceleme taslağını oluştur" })
    .click();
  await expect(
    evidenceDialog.getByText("Kayıt zinciri tamamlandı", { exact: true }),
  ).toBeVisible();
  await evidenceDialog
    .getByRole("button", { name: "Bugün ekranına dön" })
    .click();

  profile = await openStudentProfile(page, childName);
  await expect(
    profile.getByText("Gözlem zinciri tamamlandı", { exact: true }),
  ).toBeVisible();
  await expect(
    profile.getByRole("button", { name: "Değerlendirmeyi tamamla" }),
  ).toHaveCount(0);
  await expect(profile.getByText(observationText, { exact: true })).toBeVisible();
});
