import {readRepositorySnapshot} from './production-repository';
import { expect, type Page } from "@playwright/test";

export const childName = "Gelişim Deneme Çocuğu";
export const otherChildName = "İkinci Deneme Çocuğu";
export const observation = "Dinlediği kurgu öyküyü kendi cümleleriyle anlattı ve kahramanların yaptıklarını sırasıyla söyledi.";
export const evaluation = "Seçilen gözlem sırasında öykünün olay sırasını kendi cümleleriyle aktardı. Bu kayıt yalnız bu etkinlikte gözlediğim davranışı anlatır.";

const civilClockOffsets = new WeakMap<Page, number>();

export async function installCivilClock(page: Page, sameClockAs?: Page, civilTime = "2026-09-10T06:00:00.000Z") {
  const offset = sameClockAs ? civilClockOffsets.get(sameClockAs) : Date.parse(civilTime) - Date.now();
  if (offset === undefined) throw new Error("Paylaşılan kurgu saat önce ana sekmede kurulmalı.");
  civilClockOffsets.set(page, offset);
  // Leave the browser animation clock intact across reloads; shift civil time only.
  await page.addInitScript((offsetMs: number) => {
    const NativeDate = Date;
    globalThis.Date = new Proxy(NativeDate, {
      construct(target, args) { return Reflect.construct(target, args.length ? args : [NativeDate.now() + offsetMs]); },
      apply() { return new NativeDate(NativeDate.now() + offsetMs).toString(); },
      get(target, key, receiver) { return key === "now" ? () => NativeDate.now() + offsetMs : Reflect.get(target, key, receiver); },
    });
  }, offset);
}

export async function setup(page: Page) {
  await installCivilClock(page);
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  const setupDialog = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await setupDialog.getByLabel("Okul adı").fill("Gelişim Deneme Anaokulu");
  await setupDialog.getByLabel("Öğretmen adı soyadı").fill("Deneme Öğretmeni");
  await setupDialog.getByLabel("Sınıf adı").fill("Gelişim Deneme Sınıfı");
  await setupDialog.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setupDialog.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setupDialog).toBeHidden();
  const start = page.getByRole("button", { name: "Eğitim yılını başlat", exact: true });
  await expect(page.getByRole("region", { name: "Bugünün sınıf bilgisi", exact: true })).toBeVisible();
  if (await start.isVisible()) { await start.click(); await expect(start).toBeHidden(); }
  await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
  for (const name of [childName, otherChildName]) {
    await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
    const add = page.getByRole("dialog", { name: "Çocuk ekle" });
    await add.getByLabel("Çocuğun adı").fill(name);
    await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click();
    await expect(add).toBeHidden();
  }
  const coverage = page.getByRole("region", { name: "Gözlem kapsamı" });
  await page.locator('.simple-classroom__development-coverage > summary').click();
  await expect(coverage).toContainText("0 çocukta kayıt var · 2 çocukta henüz yok");
  await page.locator(".simple-student-list li").filter({ hasText: childName }).getByRole("button", {
    name: `${childName} için Maarif gelişim gözlemi ekle`,
    exact: true,
  }).click();
  const picker = page.getByRole("region", { name: "Gelişim bilgisi seç" });
  await page.locator(".quick-details > summary").click();
  await expect(picker).toBeVisible();
  await picker.getByRole("group", { name: "Gözlenen gelişim davranışları" }).getByRole("button").first().click();
  await page.getByRole("textbox", { name: "Ne oldu?", exact: true }).fill(observation);
  await page.getByRole("button", { name: "Gözlemi kaydet", exact: true }).click();
  await expect(picker).toBeHidden();
  const nextStep = page.getByRole("dialog", { name: "Gözlemden sonraki adım", exact: true });
  if (await nextStep.isVisible()) {
    await page.keyboard.press("Escape");
    await expect(nextStep).toBeHidden();
  }
  await expect(coverage).toContainText("1 çocukta kayıt var · 1 çocukta henüz yok");
}

export async function openProfile(page: Page, name = childName) {
  await page.locator(".simple-student-list li").filter({ hasText: name }).locator(".simple-student-list__profile").click();
  const profile = page.getByRole("dialog", { name: `${name} profili` });
  await expect(profile.getByRole("region", { name: "Gelişim kayıtları" })).toBeVisible();
  return profile;
}

export async function openReport(page: Page, period = "Bu ay") {
  const profile = await openProfile(page);
  await profile.getByRole("button", { name: period, exact: true }).click();
  await profile.getByRole("button", { name: "Rapor hazırla", exact: true }).click();
  const report = page.getByRole("dialog", { name: "Öğretmen gözlem özeti", exact: true });
  await expect(report.getByRole("textbox", { name: "Öğretmen değerlendirmesi", exact: true })).toBeVisible();
  return report;
}

export async function readRecords(page: Page) {
 const snapshot=await readRepositorySnapshot(page);
 return {reports:snapshot.settings.filter((x:any)=>!x.deletedAt&&x.settingType==='development-report'),observations:snapshot.observations.filter((x:any)=>!x.deletedAt)};
}
