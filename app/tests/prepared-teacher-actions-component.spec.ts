import { expect, test } from "@playwright/test";
async function mount(page: any, options = {}) {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.clock.install({ time: new Date("2026-09-21T06:00:00.000Z") }); await page.goto("/tests/runtime-fixture.html");
  await page.evaluate(async (input: any) => { const fx = await import("/tests/fixtures/prepared-teacher-actions-mount.tsx"); Object.assign(window, { preparedMounted: await fx.mountPreparedTeacherActions(input) }); }, options);
}
test("320px hazır odak seçimi kaydeder; reload edilen odak gerçek çocuk/etkinlik girişini açar", async ({ page }) => {
  await mount(page, { disabled: true, mode: "focus" });
  const apply = page.getByRole("button", { name: "Seçili çocukları bu etkinliğin gözlem odağına kaydet" }); await expect(apply).toBeDisabled();
  await page.evaluate(() => (window as any).preparedMounted.setDisabled(false)); await expect(apply).toBeEnabled();
  await page.getByLabel("Kurgu Çocuk 1").uncheck(); await apply.click();
  await expect(page.getByText("1 çocuk bu etkinliğin gözlem odağına kaydedildi.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kurgu Çocuk 2 için gerçek gözlem gir" }).click();
  const result = await page.evaluate(async () => { const f = (window as any).preparedMounted, data = await f.source.readSnapshot(); return { focuses: data.settings.filter((r: any) => r.workflow?.kind === "observation-focus").map((r: any) => r.studentId), expected: f.otherStudentId, opened: f.opened[0], activityId: f.activity.activity.id, overflow: document.documentElement.scrollWidth > 320 }; });
  expect(result.focuses).toEqual([result.expected]); expect(result.opened).toEqual({ childId: result.expected, activityId: result.activityId }); expect(result.overflow).toBe(false);
});
test("Başarılı commit sonrası okuma hatası başarıyı korur ve eski seçenekle yeni yazım açmaz", async ({ page }) => {
  await mount(page, { failAfterCommit: true, mode: "support" });
  await page.getByRole("button", { name: "Aynı desteği gelecek haftaya taşı" }).click();
  await expect(page.getByText(/haftasına destek ve .* tarihli takip kaydedildi/u)).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Hazır adımlar okunamadı");
  await expect(page.getByRole("button", { name: "Aynı desteği gelecek haftaya taşı" })).toHaveCount(0);
  await expect(page.getByText("Adım kaydedilemedi. Yeniden deneyin.")).toHaveCount(0);
});
test("Görüşme seçimi doğrudan kaydeder; davet tam kaydedilen aile randevusuna gider", async ({ page }) => {
  await mount(page, { mode: "family" }); await page.getByRole("button", { name: "2026-09-22 · 14:00–14:20 · Kurgu Veli" }).click();
  await page.getByRole("button", { name: "Bu veliye özel daveti hazırla" }).click();
  const result = await page.evaluate(async () => { const f = (window as any).preparedMounted, data = await f.source.readSnapshot(), record = data.settings.find((r: any) => r.workflow?.kind === "appointment"); return { opened: f.opened[0], id: record.workflow.appointmentId }; });
  expect(result.opened).toEqual({ appointmentId: result.id, scheduledOn: "2026-09-22" });
});
