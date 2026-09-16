import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("MR107 stok ve devir şablonları uzun tablo, yerel logo ve iki imzayla oluşturulur", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/tests/runtime-fixture.html");
  const files = await page.evaluate(async () => {
    const { DevelopmentReportMemoryStore } = await import("/tests/fixtures/development-report-fixture.mjs");
    const { seedEnrichmentWorkflows } = await import("/tests/fixtures/enrichment-browser.ts");
    const { appendClassroomAdmin, buildHandoverItems } = await import("/src/features/classroom-admin/classroom-admin-service.ts");
    const { classroomAdminRecords, adminLedgerHead } = await import("/src/core/domain/classroom-admin.ts");
    const { classroomHandoverPdf, classroomInventoryPdf } = await import("/src/features/classroom-admin/classroom-admin-document.ts");
    const store = new DevelopmentReportMemoryStore(), ids = await seedEnrichmentWorkflows(store);
    const scope = { academicYearId: ids.academicYearId, classroomId: ids.classroomId };
    let time = Date.parse("2026-09-22T09:00:00.000Z");
    const append = async workflow => appendClassroomAdmin(store, { expectedScope: scope, expectedHead: adminLedgerHead(classroomAdminRecords(await store.readSnapshot(), scope)), workflow, now: new Date(time += 1000) });
    for (let i = 0; i < 35; i++) await append({ kind: "inventory-item", name: `Kurgu Çok Parçalı Eğitim ve Sanat Malzemesi ${i + 1}`, category: "Öğrenme merkezi malzemeleri", unit: "set", initialQuantity: 10, note: "" });
    const items = buildHandoverItems(await store.readSnapshot(), scope, Array.from({ length: 36 }, (_, i) => `Kurgu Devir Maddesi ${String(i + 1).padStart(2, "0")} · Sınıf eğitim malzemeleri, aile iletişim belgeleri ve öğretmen dosyalarının eksiksiz teslim kontrolü`));
    const handover = await append({ kind: "handover-plan", title: "Kurgu Dönem Sonu Devir Tutanağı", recipient: "Kurgu Teslim Alan Öğretmen", dueOn: "2026-09-25", note: "", items });
    const snapshot = await store.readSnapshot(), style = snapshot.settings.find(r => r.id === ids.templateId);
    style.workflow.template.headerLines = ["Kurgu İl Millî Eğitim Müdürlüğü · Eğitim Öğretim Hizmetleri ve Okul Öncesi Eğitim Birimi", "Kurgu İlçe Millî Eğitim Müdürlüğü · Çocukların Gelişimini Destekleme ve Aile İş Birliği Çalışmaları", "Kurgu Anaokulu Müdürlüğü · 2026–2027 Eğitim Öğretim Yılı Sınıf Evrakı"];
    const files = [];
    for (const orientation of ["portrait", "landscape"]) {
      style.workflow.template.orientation = orientation;
      for (const [kind, recipe] of [["inventory", classroomInventoryPdf(snapshot, scope, "2026-09-22")], ["handover", classroomHandoverPdf(snapshot, scope, handover.id)]]) {
        const file = await recipe.build({ fields: [kind === "inventory" ? "stock" : "checklist"], studentIds: [] });
        files.push({ name: `${kind}-${orientation}`, bytes: Array.from(file.bytes) });
      }
    }
    store.close(); return files;
  });
  const folder = "output/new-workflows-2026-09-08/school-styled-admin";
  await mkdir(folder, { recursive: true });
  expect(files).toHaveLength(4);
  for (const file of files) { expect(file.bytes.length).toBeGreaterThan(10000); await writeFile(`${folder}/${file.name}.pdf`, new Uint8Array(file.bytes)); }
});
