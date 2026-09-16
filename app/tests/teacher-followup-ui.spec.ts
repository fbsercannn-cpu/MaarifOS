import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const output = "output/completion-2026-09-07/teacher-followup";
const child = "Kurgu Takip Çocuğu";
test.use({ viewport: { width: 390, height: 844 }, actionTimeout: 10000 });
test.describe.configure({ timeout: 90000 });

async function setup(page: Page) {
  await mkdir(output, { recursive: true });
  await page.clock.install({ time: new Date("2026-09-07T09:00:00.000Z") });
  await page.goto("/classroom?native=1");
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla", exact: true });
  await setup.getByLabel("Okul adı").fill("Kurgu Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Takip Sınıfı");
  await setup.getByLabel("Maarif Modeli yaş grubu", { exact: true }).selectOption({ label: "60–72 ay" });
  await setup.getByRole("button", { name: "Sınıfımı hazırla", exact: true }).click(); await expect(setup).toBeHidden();
  await page.getByRole("button", { name: "Çocuk ekle", exact: true }).click();
  const add = page.getByRole("dialog", { name: "Çocuk ekle", exact: true });
  await add.getByLabel("Çocuğun adı", { exact: true }).fill(child);
  await add.getByRole("button", { name: "Kaydet ve kapat", exact: true }).click(); await expect(add).toBeHidden();
  await page.evaluate(async (name) => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts");
    const { createTeacherOwnedPlanGraph } = await import("/src/features/planning/teacher-owned-plan-service.ts");
    const store = new IndexedDbDataStore();
    try {
      const s = await store.readSnapshot(); const student = s.students.find(r => r.displayName === name)!;
      const scope = { academicYearId: student.academicYearId, classroomId: student.classroomId };
      const base = { createdAt: "2026-09-07T08:30:00.000Z", updatedAt: "2026-09-07T08:30:00.000Z", civilDate: "2026-09-07", deletedAt: null, schemaVersion: 1, ...scope };
      await store.transaction("readwrite", ["students", "observations", "activities"], async tx => {
        await tx.putMany("students", [{ ...student, careDetails: { ...student.careDetails, homeAddress: "Kurgu Sokak No: 7 Acıpayam Denizli" }, contacts: [
          { id: crypto.randomUUID(), kind: "mother", name: "Kurgu Anne", relationship: "Anne", phone: "+905000000001", isPrimary: true, isAuthorizedPickup: true },
          { id: crypto.randomUUID(), kind: "father", name: "Kurgu Baba", relationship: "Baba", phone: "+905000000002", isPrimary: false, isAuthorizedPickup: true },
        ] }]);
        await tx.putMany("observations", [{ ...base, id: crypto.randomUUID(), studentId: student.id, rawText: "Kurgu çocuk iki farklı bloğu kendi seçip yan yana koydu." }]);
        await tx.putMany("activities", [{ ...base, id: crypto.randomUUID(), title: "Kurgu oyun hazırlığı", civilDate: "2026-09-14", materials: ["Kâğıt", "Boya"], preparation: ["Kartları hazırla"] }, { ...base, id: crypto.randomUUID(), title: "Kurgu sanat hazırlığı", civilDate: "2026-09-15", materials: ["kâğıt", "2 paket boya"] }]);
      });
      await createTeacherOwnedPlanGraph(store, { title: "Kurgu yıllık plan", periodStart: "2026-09-07", periodEnd: "2026-09-30", teacherContent: { narrative: "Kurgu yıllık içerik" }, months: [{ title: "Kurgu Eylül", monthKey: "2026-09", periodStart: "2026-09-07", periodEnd: "2026-09-30", teacherContent: { narrative: "Kurgu aylık içerik" }, weeks: [{ title: "Kurgu destek haftası", weekKey: "2026-W38", periodStart: "2026-09-14", periodEnd: "2026-09-18", teacherContent: { narrative: "Önceki öğretmen metni", materials: ["Kâğıt"] } }] }], now: new Date("2026-09-07T08:45:00.000Z") });
    } finally { store.close(); }
  }, child);
  await page.reload();
}
async function open(page: Page, section = "contacts") {
  await page.getByRole("region", { name: "Öğretmen takipleri", exact: true }).getByRole("button").first().click();
  const dialog = page.getByRole("dialog", { name: "Öğretmen takip defteri", exact: true });
  await expect(dialog.getByLabel("Takip çalışma alanı")).toBeVisible();
  await dialog.getByLabel("Takip çalışma alanı").selectOption(section);
  if (section !== "preparation") await dialog.getByLabel("Takip çocuğu").selectOption({ label: child });
  return dialog;
}
async function state(page: Page) {
  return page.evaluate(async () => {
    const { IndexedDbDataStore } = await import("/src/core/index.ts"); const store = new IndexedDbDataStore();
    try { const snapshot = await store.readSnapshot(); return { records: snapshot.settings.filter(r => r.settingType === "teacher-followup-v1"), plans: snapshot.plans, observations: snapshot.observations }; } finally { store.close(); }
  });
}
async function appendAndWait(page: Page, dialog: Locator, button: string) {
  const before = (await state(page)).records.length;
  await dialog.getByRole("button", { name: button, exact: true }).click();
  await expect.poll(async () => (await state(page)).records.length).toBe(before + 1);
}

test("iletişim doğrulama, profil değişikliğiyle eskime ve Bugün / Sınıfım bağlantıları", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 }); await setup(page);
  let dialog = await open(page);
  for (const name of ["Telefonlar", "Ev adresi", "Teslim almaya yetkili kişiler"]) await dialog.getByRole("checkbox", { name, exact: true }).click();
  await dialog.getByLabel("Doğrulama kaynağı").selectOption("family-confirmed");
  await appendAndWait(page, dialog, "Seçili bilgileri doğrula");
  await expect(dialog.locator(".followup-cards [data-state=current]")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Telefon, adres ve yetkili kişileri düzenle", exact: true }).click();
  const profile = page.getByRole("dialog", { name: `${child} profili`, exact: true });
  await expect(profile).toBeVisible();
  // The follow-up edit action opens the contacts section directly.
  await profile.getByRole("button", { name: "Yakınlar", exact: true }).click();
  await profile.getByRole("region", { name: "Anne bilgileri", exact: true }).getByLabel("Cep telefonu", { exact: true }).fill("05000000003");
  await profile.getByRole("button", { name: "Profili kaydet", exact: true }).click(); await expect(profile).toBeHidden();
  await page.locator("button.simple-student-list__profile").filter({ hasText: child }).click();
  await page.getByRole("dialog", { name: `${child} profili`, exact: true }).getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
  await page.getByRole("dialog", { name: `${child} profili`, exact: true }).getByRole("button", { name: /İletişim ve öğretmen takibi/ }).click();
  dialog = page.getByRole("dialog", { name: "Öğretmen takip defteri", exact: true });
  await expect(dialog.getByLabel("Takip çocuğu")).not.toHaveValue("");
  await expect(dialog.locator(".followup-cards [data-state=changed]")).toHaveCount(2);
  await expect(dialog.locator(".followup-cards [data-state=current]")).toHaveCount(1);
  await expect.poll(async () => (await dialog.boundingBox())?.y ?? 999).toBeLessThan(150);
  await dialog.locator(".followup-cards").scrollIntoViewIfNeeded();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/contacts-stale-320.png` });
  await page.reload();
  await page.getByRole("navigation", { name: "Ana menü" }).getByRole("button", { name: "Bugün", exact: true }).click();
  dialog = await open(page); await expect(dialog.locator(".followup-cards [data-state=changed]")).toHaveCount(2);
});

test("gerçek teslim kişisi, çift teslim engeli ve gerekçeli düzeltme tarihçesi", async ({ page }) => {
  await setup(page); let dialog = await open(page, "pickup");
  await dialog.getByLabel("Teslim alan kişi", { exact: true }).selectOption({ label: "Kurgu Baba · Baba" });
  await dialog.getByLabel("Gerçek teslim saati", { exact: true }).fill("11:50");
  await appendAndWait(page, dialog, "Teslimi kaydet");
  await expect(dialog.getByLabel("Teslim alan kişi", { exact: true })).toBeDisabled();
  await expect(dialog.locator(".followup-record").filter({ hasText: "Kurgu Baba · Baba" })).toContainText("11:50");
  await dialog.locator("summary").filter({ hasText: "Gerekçeli düzeltme ekle" }).click();
  await dialog.getByLabel("Düzeltme gerekçesi", { exact: true }).fill("Kurgu saat düzeltmesi: gerçek saat 11.55.");
  await appendAndWait(page, dialog, "Sonucu kaydet");
  await expect(dialog.getByLabel("Teslim alan kişi", { exact: true })).toBeEnabled();
  await dialog.getByLabel("Teslim alan kişi", { exact: true }).selectOption({ label: "Kurgu Baba · Baba" });
  await dialog.getByLabel("Gerçek teslim saati", { exact: true }).fill("11:55");
  await appendAndWait(page, dialog, "Teslimi kaydet");
  await expect(dialog.getByLabel("Teslim alan kişi", { exact: true })).toBeDisabled();
  await page.reload(); dialog = await open(page, "pickup");
  await expect(dialog.locator(".followup-record").filter({ hasText: "Kurgu Baba · Baba" })).toHaveCount(2);
  await expect(dialog.getByText("Kurgu saat düzeltmesi: gerçek saat 11.55.")).toBeVisible();
  await page.screenshot({ path: `${output}/pickup-correction-390.png` });
});

test("veli görüşmesi hatırlatması sonuç kaydıyla kapanır ve kaynak görüşme korunur", async ({ page }) => {
  await setup(page); let dialog = await open(page, "meetings");
  await dialog.getByLabel("Görüşmeye katılanlar", { exact: true }).fill("Kurgu Anne, Kurgu Öğretmen");
  await dialog.getByLabel("Görüşülen konu ve aileden alınan bilgi", { exact: true }).fill("Kurgu sabah rutini konuşuldu.");
  await dialog.getByLabel("Birlikte alınan karar / yapılacak iş", { exact: true }).fill("Kurgu sabah rutini izlenecek.");
  await dialog.getByLabel("Takip tarihi (isteğe bağlı)", { exact: true }).fill("2026-09-07");
  await appendAndWait(page, dialog, "Görüşmeyi kaydet");
  await expect(dialog.getByRole("status")).toHaveText("Takip kaydı kaydedildi.");
  await expect.poll(async () => (await state(page)).records.filter(r => r.workflow.kind === "family-meeting").length).toBe(1);
  await expect(dialog.getByText("Kurgu sabah rutini konuşuldu.", { exact: true })).toBeVisible();
  await page.reload();
  expect((await state(page)).records.filter(r => r.workflow.kind === "family-meeting")).toHaveLength(1);
  await expect(page.getByRole("region", { name: "Öğretmen takipleri", exact: true })).toContainText("1 işin takip tarihi geldi");
  dialog = await open(page, "meetings");
  await dialog.locator("summary").filter({ hasText: "Takip sonucu ekle" }).click();
  await dialog.getByLabel("Takip sonucu / öğretmen değerlendirmesi", { exact: true }).fill("Kurgu aile geri bildirim verdi; takip tamamlandı.");
  await appendAndWait(page, dialog, "Sonucu kaydet");
  await expect(dialog.getByText("Takip tamamlandı", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Öğretmen takipleri", exact: true })).not.toContainText("işin takip tarihi geldi");
  dialog = await open(page, "meetings"); await expect(dialog.getByText("Kurgu sabah rutini konuşuldu.", { exact: true })).toBeVisible();
});

test("özgün rehber sayfasından uyum adımı ve tarihli gözlem korunur", async ({ page }) => {
  await setup(page); let dialog = await open(page, "guide");
  await dialog.getByLabel("Uyum kaynak sayfası", { exact: true }).selectOption("8");
  await dialog.getByRole("button", { name: /Seçilen kaynak sayfasını aç · PDF 8/ }).click();
  const guide = page.getByRole("dialog", { name: "Okula uyum rehberi · 2026–2027", exact: true });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await dialog.getByLabel("Uygulayacağınız uyum adımı", { exact: true }).fill("Kurgu karşılama oyununu aileyle konuş.");
  await appendAndWait(page, dialog, "Uyum adımını ekle");
  await expect(dialog.getByText("Kurgu karşılama oyununu aileyle konuş.", { exact: true })).toBeVisible();
  await dialog.locator("summary").filter({ hasText: "Uyum gözlemi ekle" }).click();
  await dialog.getByLabel("Tarihli uyum gözlemi", { exact: true }).fill("Kurgu çocuk karşılamada el salladı.");
  await dialog.getByRole("combobox", { name: "Adımın durumu", exact: true }).selectOption("completed");
  await appendAndWait(page, dialog, "Sonucu kaydet");
  await expect(dialog.getByText("Kurgu çocuk karşılamada el salladı.", { exact: true })).toBeVisible();
  await page.reload(); dialog = await open(page, "guide");
  await expect(dialog.getByRole("button", { name: /Kaynak sayfa 8/ })).toBeVisible();
  await expect(dialog.getByText("Kurgu çocuk karşılamada el salladı.", { exact: true })).toBeVisible();
});

test("haftalık kaynak malzemeleri birleşir, farklı miktarlar korunur ve hazır işareti kalıcıdır", async ({ page }) => {
  await setup(page); let dialog = await open(page, "preparation");
  for (const name of ["Kurgu oyun hazırlığı", "Kurgu sanat hazırlığı", "Kurgu destek haftası"]) await dialog.getByRole("checkbox").filter({ hasText: name }).click();
  await dialog.getByRole("button", { name: "Seçilen kaynakların hazırlığını birleştir", exact: true }).click();
  const items = dialog.getByLabel(/^Hazırlık maddesi \d+$/);
  await expect(items).toHaveCount(4);
  expect((await items.evaluateAll(elements => elements.map(el => (el as HTMLInputElement).value.toLocaleLowerCase("tr-TR")))).sort()).toEqual(["kâğıt", "boya", "2 paket boya", "kartları hazırla"].sort());
  await appendAndWait(page, dialog, "Haftalık hazırlık listesini kaydet");
  const ready = dialog.locator(".followup-record").getByRole("checkbox").filter({ hasText: /kâğıt/iu });
  await expect(ready).toHaveCount(1); await ready.click(); await expect(ready).toHaveAttribute("aria-checked", "true");
  await page.reload(); dialog = await open(page, "preparation");
  await expect(dialog.locator(".followup-record").getByRole("checkbox").filter({ hasText: /kâğıt/iu })).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: `${output}/preparation-390.png` });
});

test("gözlemden eğitim kararı, hedef hafta planına açık aktarım ve sonraki değerlendirme", async ({ page }) => {
  await setup(page); let dialog = await open(page, "learning");
  await dialog.getByText("Kaynak gözlemleri seç · 0 seçili", { exact: true }).click();
  await dialog.getByRole("checkbox").filter({ hasText: "Kurgu çocuk iki farklı bloğu" }).click();
  await dialog.getByRole("combobox", { name: "Öğretmenin destek seçimi", exact: true }).selectOption("small-group");
  await dialog.getByLabel("Gözleme dayanarak planladığınız destek", { exact: true }).fill("Kurgu küçük gruba farklı blok seçenekleri sun.");
  await appendAndWait(page, dialog, "Sonraki hafta taslağına al");
  await expect(dialog.locator(".followup-record > p").filter({ hasText: "Kurgu küçük gruba farklı blok seçenekleri sun." })).toBeVisible();
  await dialog.getByText("Taslağı hedef haftanın planına ekle", { exact: true }).click();
  await dialog.getByLabel("Destek hedef planı", { exact: true }).selectOption({ label: "Kurgu destek haftası" });
  await appendAndWait(page, dialog, "Seçtiğim metni plana ekle");
  await expect(dialog.getByText("Öğretmen planına eklendi · revizyon 2", { exact: true })).toBeVisible();
  const saved = await state(page); const week = saved.plans.find(r => r.planType === "weekly")!;
  expect(week.teacherContent.narrative).toBe("Önceki öğretmen metni");
  expect(week.teacherContent.followupSupportSteps[0].text).toBe("Kurgu küçük gruba farklı blok seçenekleri sun.");
  expect(saved.observations).toHaveLength(1);
  await page.clock.setFixedTime(new Date("2026-09-14T09:00:00.000Z")); await page.reload(); dialog = await open(page, "learning");
  await dialog.locator("summary").filter({ hasText: "Uygulama sonrası değerlendirme ekle" }).click();
  await dialog.getByLabel("Takip sonucu / öğretmen değerlendirmesi", { exact: true }).fill("Kurgu küçük grup uygulamasında çocuk iki blok seçti.");
  await dialog.getByLabel("Bundan sonraki öğretmen adımı", { exact: true }).fill("Kurgu seçimi farklı bağlamda yeniden gözlemle.");
  await appendAndWait(page, dialog, "Sonucu kaydet");
  await expect(dialog.getByText("Kurgu küçük grup uygulamasında çocuk iki blok seçti.", { exact: true })).toBeVisible();
  await page.reload(); dialog = await open(page, "learning");
  await expect(dialog.getByText("Kurgu küçük grup uygulamasında çocuk iki blok seçti.", { exact: true })).toBeVisible();
  expect((await state(page)).observations).toHaveLength(1);
});
