import {readRepositorySnapshot} from './helpers/production-repository';
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });
test.use({ viewport: { width: 390, height: 844 } });
const production = process.env.MAARIF_TEST_PRODUCTION === "1";

async function setupClass(page: Page, ageBand: string) {
  // Only shift civil time. Playwright's Clock retains a performance origin across reloads,
  // which disagrees with the new document.timeline and delays native WAAPI sheet exits.
  await page.addInitScript((offsetMs: number) => {
    const NativeDate = Date;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) {
        return Reflect.construct(target, args.length ? args : [NativeDate.now() + offsetMs]);
      },
      apply() { return new NativeDate(NativeDate.now() + offsetMs).toString(); },
      get(target, key, receiver) {
        return key === "now" ? () => NativeDate.now() + offsetMs : Reflect.get(target, key, receiver);
      },
    });
  }, Date.parse("2026-08-31T06:00:00.000Z") - Date.now());
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setup.getByLabel("Okul adı").fill("Gelişim Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Gelişim Kurgu Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: `${ageBand} ay` });
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Eğitim yılını başlat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Eğitim yılını başlat", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const child = page.getByRole("dialog", { name: "Çocuk ekle" });
  await child.getByLabel("Çocuğun adı").fill("Gelişim Kurgu Çocuğu");
  await child.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
  await expect(child).toBeHidden();
  await page.locator(".simple-student-list li").filter({ hasText: "Gelişim Kurgu Çocuğu" })
    .getByRole("button", {
      name: "Gelişim Kurgu Çocuğu için Maarif gelişim gözlemi ekle",
      exact: true,
    }).click();
  await expect(page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true })).toBeVisible();
  await page.locator(".quick-details > summary").click();
  await expect(page.getByRole("region", { name: "Gelişim bilgisi seç" })).toBeVisible();
}

async function records(page: Page) {
 const snapshot=await readRepositorySnapshot(page);
 return {observations:snapshot.observations.filter((x:any)=>!x.deletedAt),links:snapshot.evidenceCurriculumLinks.filter((x:any)=>!x.deletedAt),drafts:snapshot.settings.filter((x:any)=>!x.deletedAt&&x.settingType==='quick-observation-draft')};
}
for (const ageBand of ["36–48", "48–60", "60–72"]) {
  test(`${ageBand} ay: davranış seçimi notu doldurur, açık kayıttan önce kanıt üretmez`, async ({ page }) => {
    await setupClass(page, ageBand);
    const picker = page.getByRole("region", { name: "Gelişim bilgisi seç" });
    await expect(picker).toContainText(`Öğretmen gözlem örnekleri · ${ageBand} ay`);
    await expect(picker).toContainText("Yaşa göre genel örnekler");
    await expect(picker.getByRole("combobox", { name: "Öğrenme alanı" }).locator("option")).toHaveCount(7);
    const behavior = picker.getByRole("group", { name: "Gözlenen gelişim davranışları" }).getByRole("button").first();
    await behavior.click();
    await expect(behavior).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("textbox", { name: "Ne oldu?", exact: true })).not.toHaveValue("");
    await expect(page.getByRole("button", { name: "Gözlemi kaydet", exact: true })).toBeEnabled();
    expect((await records(page)).observations).toHaveLength(0);
    expect((await records(page)).links).toHaveLength(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true })).toBeHidden();
    await page.locator(".simple-student-list li").filter({ hasText: "Gelişim Kurgu Çocuğu" })
      .getByRole("button", {
        name: "Gelişim Kurgu Çocuğu için Maarif gelişim gözlemi ekle",
        exact: true,
      }).click();
    await page.locator(".quick-details > summary").click();
    await expect(behavior).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true })).toBeHidden();
    await expect.poll(async () => (await records(page)).links.length).toBe(1);
    const saved = await records(page);
    expect(saved.observations).toHaveLength(1);
    expect(saved.drafts).toHaveLength(0);
    expect(saved.links[0]).toMatchObject({ observationId: saved.observations[0].id, confirmationMethod: "teacher-confirmed", officialCatalogVerified: true });
    expect(saved.links[0]).not.toHaveProperty("plannedTargetId");
    await page.reload({ waitUntil: "networkidle" });
    expect((await records(page)).observations).toEqual(saved.observations);
    expect((await records(page)).links).toEqual(saved.links);
  });
}

test(`dar telefonda destek seçimi ve düzenlenen not ${production ? "çevrimdışı " : ""}tek kez kaydedilir`, async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setupClass(page, "60–72");
  const picker = page.getByRole("region", { name: "Gelişim bilgisi seç" });
  await picker.getByRole("combobox", { name: "Öğrenme alanı" }).selectOption("Matematik");
  await picker.getByRole("group", { name: "Gözlenen gelişim davranışları" }).getByRole("button").first().click();
  await picker.getByText("Maarif bağlantısı ve destek bilgisi", { exact: true }).click();
  await expect(picker.getByRole("link", { name: /MEB programı · sayfa.*yeni sekmede/u })).toHaveAttribute(
    "href",
    /^https:\/\/tymm\.meb\.gov\.tr\/assets\/pdf\/2024programokuloncesiOnayli\.pdf#page=\d+$/u,
  );
  await picker.getByRole("combobox", { name: "Bu gözlemde verilen destek" }).selectOption("with-reminder");
  await picker.getByRole("group", { name: "Gözlenen gelişim davranışları" }).getByRole("button").first().click();
  await expect(picker.getByRole("combobox", { name: "Bu gözlemde verilen destek" })).toHaveValue("with-reminder");
  const note = "Kurgu blok oyununda dört kırmızı ve üç mavi bloğu sayıp toplam yedi blok olduğunu söyledi.";
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(note);
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).blur();
  const save = page.getByRole("button", { name: "Gözlemi kaydet", exact: true });
  await expect(save).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("development-selection-320.png") });
  if (production) {
    await expect.poll(() => page.evaluate(() => Boolean(
      (window as Window & { __maarifosPwaStatus?: { offlineReady?: boolean } }).__maarifosPwaStatus?.offlineReady,
    )), { timeout: 30_000 }).toBe(true);
    await context.setOffline(true);
  }
  await save.click();
  await expect(page.getByRole("dialog", { name: "Gözlem ve değerlendirme akışı", exact: true })).toBeHidden();
  const saved = await records(page);
  expect(saved.observations).toHaveLength(1);
  expect(saved.observations[0]).toMatchObject({ rawText: note, rawTextImmutable: true, developmentSelection: { ageBand: "60-72", support: "with-reminder" } });
  expect(saved.links).toHaveLength(1);
  await context.setOffline(false);
  await page.reload({ waitUntil: "networkidle" });
  expect((await records(page)).observations).toEqual(saved.observations);
  await page.locator(".simple-student-list__profile").click();
  const profile = page.getByRole("dialog", { name: "Gelişim Kurgu Çocuğu profili" });
  await expect(profile).toContainText(note);
  await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await profile.getByText("Maarif gelişim bilgisi", { exact: true }).click();
  await expect(profile).toContainText("Bu gözlemde destek: Hatırlatmayla");
  await expect(profile).toContainText("Matematik");
  await expect(profile.getByText("Program bağlantısını tamamla", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(profile).toBeHidden();
  if (production) {
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sınıfım", exact: true })).toBeVisible();
    expect((await records(page)).observations).toEqual(saved.observations);
  }
});
