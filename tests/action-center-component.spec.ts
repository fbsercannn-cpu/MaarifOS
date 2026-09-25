import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-10T09:00:00.000Z"));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/tests/runtime-fixture.html");
});

test("320px tıklanabilir kategori → hazır seçim → kayıtlı plan zinciri çalışır", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedAction: await f.mountActionCenter() }); });
  const panel = page.getByRole("region", { name: "Birlikte tamamlayalım" });
  await panel.getByRole("button", { name: "Dil ve iletişim", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText("Başlık kaydedildi. Şimdi sonraki adımı seçebilirsiniz.");
  await expect(panel).toContainText("Yerleştirildiği başlık: Dil ve iletişim");
  await expect(panel).toContainText("2026-09-14 · Gözlemden sonraki adımlar");
  await panel.locator("summary").filter({ hasText: "Aynı bağlamda yeniden gözle" }).click();
  await expect(panel).toContainText("Çocuğun seçimini, yaptığı eylemi");
  await panel.getByRole("button", { name: "Seç ve haftalık plana ekle", exact: true }).click();
  await expect(panel).toContainText("Sonraki destek adımı haftalık plana kaydedildi.");
  await expect(panel.getByRole("button", { name: "Seç ve haftalık plana ekle" })).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const m = (window as any).mountedAction;
    const data = await m.source.readSnapshot();
    return { kinds: data.settings.filter(r => r.settingType === "teacher-followup-v1").map(r => r.workflow.kind).sort(), count: data.plans.filter(r => r.planOrigin === "teacher-authored").length, width: document.documentElement.scrollWidth, viewport: innerWidth, raw: data.observations.find(r => r.id === m.observationId).rawText };
  });
  expect(result).toEqual({ kinds: ["learning-decision", "learning-plan-link"], count: 3, width: 320, viewport: 320, raw: "Kurgu çocuk çizdiği resmi arkadaşına anlattı." });
});

test("Yazma kilidi seçenekleri kapatır; açılınca aynı taslak devam eder", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedAction: await f.mountActionCenter({ disabled: true }) }); });
  const category = page.getByRole("button", { name: "Dil ve iletişim", exact: true });
  await expect(category).toBeDisabled();
  await page.evaluate(() => (window as any).mountedAction.render(false));
  await expect(category).toBeEnabled();
  await category.click();
  await expect(page.getByRole("status")).toContainText("Başlık kaydedildi");
});

test("Commit sonrası okuma hatası yazma başarısını geri almış gibi gösterilmez", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedAction: await f.mountActionCenter({ failRefreshAfterCommit: true }) }); });
  await page.getByRole("button", { name: "Dil ve iletişim", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Başlık kaydedildi");
  await expect(page.locator(".action-center-error")).toContainText("Adım kaydedildi. Görünüm henüz yenilenemedi");
  await expect(page.getByText("Değişiklik kaydedilemedi; gözlem korunuyor.", { exact: true })).toHaveCount(0);
  const categories = await page.evaluate(async () => { const m = (window as any).mountedAction; return (await m.source.readSnapshot()).observations.find(r => r.id === m.observationId).observationCategories; });
  expect(categories).toEqual(["language-communication"]);
});

test("320px gözlem ayrıntısında değerlendirme ve veli bülteni tek onayla taşmadan kaydolur", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedAction: await f.mountActionCenter({ outcome: true }) }); });
  const packageRegion = page.getByRole("region", { name: "Gözlemden değerlendirme ve veli bülteni" });
  await expect(packageRegion).toContainText("Kaynak: seçilen ham gözlem");
  await expect(packageRegion).toContainText("cihaz içi güvenli taslak");
  await expect(packageRegion.getByLabel("Haftalık değerlendirme taslağı", { exact: true })).toBeEditable();
  await expect(packageRegion.getByLabel("Veli bülteni taslağı", { exact: true })).toBeEditable();
  await packageRegion.getByRole("button", { name: "Metinleri kontrol ettim; ikisini birlikte kaydet", exact: true }).click();
  await expect(page.locator(".action-center-success")).toHaveText("Haftalık değerlendirme ve veli bülteni aynı işlemde kaydedildi.");
  const result = await page.evaluate(async () => {
    const mounted = (window as any).mountedAction;
    const snapshot = await mounted.source.readSnapshot();
    const core = await import("/src/core/index.ts");
    const backup = await new core.BackupService(mounted.source, { appVersion: "p1-test" }).exportBackup();
    const target = new core.IndexedDbDataStore({ databaseName: `action-outcome-restore-${crypto.randomUUID()}` });
    await new core.BackupService(target, { appVersion: "p1-test" }).restoreBackup(backup, { mode: "replace" });
    const restored = await target.readSnapshot();
    const restoredTypes = restored.reportDrafts.filter((record: any) => record.reportType === "evidence-assessment" || record.reportType === "observation-family-bulletin").map((record: any) => record.reportType).sort();
    target.close();
    return {
      types: snapshot.reportDrafts.filter((record: any) => record.reportType === "evidence-assessment" || record.reportType === "observation-family-bulletin").map((record: any) => record.reportType).sort(),
      restoredTypes,
      overflow: document.documentElement.scrollWidth > innerWidth,
      raw: snapshot.observations.find((record: any) => record.id === mounted.observationId)?.rawText,
    };
  });
  expect(result).toEqual({ types: ["evidence-assessment", "observation-family-bulletin"], restoredTypes: ["evidence-assessment", "observation-family-bulletin"], overflow: false, raw: "Kurgu çocuk çizdiği resmi arkadaşına anlattı." });
});

test("DeepSeek kimliksiz taslakları getirir; öğretmen düzenlemesi ve model kaynağı kayda girer", async ({ page }) => {
  let postedBody = "";
  await page.route("**/api/ai/chat", async route => {
    postedBody = route.request().postData() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: "deepseek-flash",
        text: JSON.stringify({
          assessmentText: "Çocuk hazırladığı resmi arkadaşına anlattı ve arkadaşının sorusuna kendi sözleriyle yanıt verdi. Benzer anlatım fırsatları izlenebilir.",
          familyBulletinText: "Bugün sınıfta hazırladığı resmi bir arkadaşına anlattı. Evde isterse seçtiği bir resmi size anlatması için sakin bir zaman sunabilirsiniz.",
        }),
      }),
    });
  });
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedAction: await f.mountActionCenter({ outcome: true }) }); });
  const studentName = await page.evaluate(async () => {
    const mounted = (window as any).mountedAction;
    return String((await mounted.source.readSnapshot()).students.find((record: any) => record.id === mounted.studentId)?.displayName ?? "");
  });
  const region = page.getByRole("region", { name: "Gözlemden değerlendirme ve veli bülteni" });
  await region.getByRole("button", { name: "DeepSeek ile iki metni geliştir", exact: true }).click();
  await expect(region.getByRole("status")).toContainText("DeepSeek iki taslağı hazırladı");
  await expect(region).toContainText("DeepSeek · deepseek-flash");
  const assessment = region.getByLabel("Haftalık değerlendirme taslağı", { exact: true });
  await assessment.fill(`${await assessment.inputValue()} Öğretmen düzenlemesi.`);
  await region.getByRole("button", { name: "Metinleri kontrol ettim; ikisini birlikte kaydet", exact: true }).click();
  await expect(page.locator(".action-center-success")).toHaveText("Haftalık değerlendirme ve veli bülteni aynı işlemde kaydedildi.");
  expect(studentName).not.toBe("");
  expect(postedBody).not.toContain(studentName);
  const result = await page.evaluate(async () => {
    const mounted = (window as any).mountedAction;
    const snapshot = await mounted.source.readSnapshot();
    const assessmentDraft = snapshot.reportDrafts.find((record: any) => record.reportType === "evidence-assessment");
    const bulletin = snapshot.reportDrafts.find((record: any) => record.reportType === "observation-family-bulletin");
    return {
      assessment: assessmentDraft?.teacherAssessmentText,
      mode: bulletin?.editableSections?.aiGenerationMode,
      model: bulletin?.editableSections?.aiModel,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(result.assessment).toContain("Öğretmen düzenlemesi.");
  expect(result).toMatchObject({ mode: "deepseek", model: "deepseek-flash", overflow: false });
});

test("Hazırlıkta kaynak seçimi gerçek listeyi oluşturur; hazır madde tıklanarak kapanır", async ({ page }) => {
  await page.evaluate(async () => { const f = await import("/tests/fixtures/action-center-mount.tsx"); Object.assign(window, { mountedAction: await f.mountActionCenter({ preparation: true }) }); });
  const panel = page.getByRole("region", { name: "Birlikte tamamlayalım" });
  await panel.getByText("Adımları ayrı ayrı düzenle", { exact: true }).click();
  await panel.locator("summary").filter({ hasText: "Seçili kaynaklardan hazırlık listesi oluştur" }).click();
  await panel.getByRole("checkbox", { name: /Kurgu boya oyunu/ }).uncheck();
  await panel.locator("button").filter({ hasText: /^Seçili kaynaklardan hazırlık listesi oluştur$/ }).click();
  await expect(panel.getByRole("status")).toContainText("Hazırlık listesi kaydedildi");
  await expect(panel.locator(".action-center-prep")).toContainText("Kurgu kartlar");
  await panel.getByRole("button", { name: "Hazırladım, tamamla" }).click();
  await expect(panel.getByRole("status")).toHaveText("Hazırlık maddesi tamamlandı.");
  await expect(panel.locator(".action-center-prep")).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const m = (window as any).mountedAction, data = await m.source.readSnapshot();
    return data.settings.filter(r => r.settingType === "teacher-followup-v1").map(r => ({ kind: r.workflow.kind, ...(r.workflow.kind === "preparation-list" ? { items: r.workflow.items.map(i => i.text), sources: r.workflow.sources.map(s => s.title) } : { completed: r.workflow.completed }) }));
  });
  expect(result).toHaveLength(2);
  expect(result).toEqual(expect.arrayContaining([{ kind: "preparation-list", items: ["Kurgu kartlar"], sources: ["Kurgu kart oyunu"] }, { kind: "preparation-check", completed: true }]));
});
