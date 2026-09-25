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
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2026-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2027-06-30");
  await setup.getByText("İleri ayarlar", { exact: true }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

function classroomList(page: Page) {
  return page.getByRole("region", { name: "Çocuklar", exact: true });
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
    name: `${name} için Maarif gelişim gözlemi ekle`,
    exact: true,
  });
}

async function addChild(page: Page, name: string) {
  if (!(await page.getByRole("main", { name: "Sınıfım" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Çocuk ekle", exact: true })
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
  const nextStep = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  if (await nextStep.isVisible().catch(() => false)) { await nextStep.getByRole("button", { name: "Gözlemden sonraki adım ekranını kapat", exact: true }).click(); await expect(nextStep).toBeHidden(); }
  const profile = page.getByRole("dialog", { name: `${name} profili` });
  if (!(await profile.isVisible().catch(() => false))) {
    await openClassroom(page);
    await studentProfileButton(page, name).click();
  }
  await expect(profile).toBeVisible();
  const archive = profile.locator("details.student-profile-context-details");
  if ((await archive.getAttribute("open")) === null) {
    await profile
      .getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true })
      .click();
  }
  await expect(archive).toHaveAttribute("open", "");
  return profile;
}

test("uzun gözlem metni yazılırken arayüz ana iş parçacığını kilitlemez", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  await addChild(page, "Akıcılık Deneme");
  await studentObservationButton(page, "Akıcılık Deneme").click();

  const note = page
    .getByRole("dialog", { name: "Gözlem ve değerlendirme akışı" })
    .getByLabel("Ne oldu?");
  const text = "Çocuk blokları renklerine göre ayırdı, seçimini açıkladı ve arkadaşının önerisinden sonra düzenini yeniden kurdu. ".repeat(2);
  const startedAt = Date.now();
  await note.pressSequentially(text, { delay: 0 });
  const elapsedMs = Date.now() - startedAt;

  await expect(note).toHaveValue(text);
  expect(elapsedMs).toBeLessThan(1_500);
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
});

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
  await dialog.getByText("Yazmak için ipuçları", { exact: true }).click();
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

  await dialog.getByRole("button", { name: "Çocuğu değiştir" }).click();
  await expect(
    dialog.getByRole("region", { name: "Gözlem yapılacak çocuk" }),
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

test("program hedefi seçiminden çıkan gözlem profilde değerlendirmeye döner ve tek kayıtla tamamlanır", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await ensureClassroomConfigured(page);
  const childName = "Kurgu Akış Çocuğu";
  const observationText = "Çocuk iki farklı yaprağı büyüklüklerine göre yan yana yerleştirdi.";
  await addChild(page, childName);
  await studentObservationButton(page, childName).click();
  await page.getByLabel("Ne oldu?").fill(observationText);
  await page.getByRole("button", { name: "Gözlemi kaydet" }).click();
  const next = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  await expect(next).toBeVisible();
  const packages = next.getByRole("region", { name: "Hazır iş paketleri", exact: true });
  const chooser = packages.getByRole("combobox");
  await expect(chooser).toBeVisible();
  const selected = await chooser.locator("option").evaluateAll(options => options.map(o => (o as HTMLOptionElement).value).find(value => value.startsWith("source:development:")));
  expect(selected).toBeTruthy();
  await chooser.selectOption(selected!);
  await packages.getByRole("checkbox").check();
  await packages.locator(".work-package-apply").click();
  await expect(packages.getByRole("status")).toContainText("kaydedildi");
  let profile = await openStudentProfile(page, childName);
  await profile.getByRole("button", { name: "Değerlendirmeyi tamamla", exact: true }).click();
  const evidence = page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true });
  await expect(evidence.getByRole("heading", { name: "Kanıta dayalı değerlendirme" })).toBeVisible();
  await evidence.getByLabel("Öğretmen değerlendirmesi").fill("Kurgu öğretmenin seçili gözleme dayanan değerlendirmesi.");
  await evidence.getByRole("button", { name: "Değerlendirmeyi kaydet ve tamamla", exact: true }).click();
  await expect(evidence.getByText("Kayıt zinciri tamamlandı", { exact: true })).toBeVisible();
  await expect(evidence.getByText("Bağlantılar tamamlandı", { exact: true })).toBeVisible();
  await evidence.getByRole("button", { name: "Bugün ekranına dön", exact: true }).click();
  await expect(evidence).toBeHidden();
  profile = await openStudentProfile(page, childName);
  await expect(profile.getByText("Gözlem zinciri tamamlandı", { exact: true })).toBeVisible();
  await expect(profile.getByRole("button", { name: "Değerlendirmeyi tamamla", exact: true })).toHaveCount(0);
  await expect(profile.getByRole("region", { name: "Gelişim kayıtları" }).getByRole("listitem").filter({ hasText: observationText })).toBeVisible();
});
