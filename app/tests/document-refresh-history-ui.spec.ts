import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 320, height: 844 } });
test("permanent student deletion removes the entire saved PDF containing that child", async ({ page }) => {
  await page.goto("/tests/document-history-fixture.html");
  const result = await page.evaluate(async () => {
    const { growthFixture, growthScope, growthStudents } = await import("/tests/fixtures/growth-measurements-fixture.mjs");
    const { IndexedDbDataStore } = await import("/src/core/repository/indexed-db.ts");
    const { COLLECTION_NAMES } = await import("/src/core/domain/model.ts");
    const { saveDocumentVersion, listDocumentVersions } = await import("/src/features/documents/document-history-service.ts");
    const { previewPermanentStudentDeletion, permanentlyDeleteStudent } = await import("/src/features/students/student-lifecycle.ts");
    const store = new IndexedDbDataStore({ databaseName: `history-purge-${crypto.randomUUID()}` });
    const snapshot = growthFixture(); snapshot.academicYears[0].operationalStartedAt = snapshot.academicYears[0].createdAt;
    await store.transaction("readwrite", COLLECTION_NAMES, async tx => { for (const c of COLLECTION_NAMES) await tx.putMany(c, snapshot[c]); });
    await saveDocumentVersion({ store, scope: growthScope }, { title: "Kurgu", selection: { fields: ["name"], studentIds: [growthStudents.ada] }, file: { bytes: new TextEncoder().encode("%PDF-1.4\nKurgu\n%%EOF"), fileName: "Kurgu.pdf", mimeType: "application/pdf" }, now: new Date("2027-06-30T09:00:00Z") });
    const impact = previewPermanentStudentDeletion(await store.readSnapshot(), growthStudents.ada);
    await permanentlyDeleteStudent(store, { studentId: growthStudents.ada, confirmationName: impact.displayName, expectedFingerprint: impact.fingerprint, now: new Date("2027-07-01T09:00:00Z") });
    const remaining = await listDocumentVersions({ store, scope: growthScope }); store.close(); return remaining.length;
  });
  expect(result).toBe(0);
});
test("document versions participate in real backup validation and reject tampered content", async ({ page }) => {
  await page.goto("/tests/document-history-fixture.html");
  const result = await page.evaluate(async () => {
    const { GrowthMemoryStore, growthScope, growthStudents } = await import("/tests/fixtures/growth-measurements-fixture.mjs");
    const { saveDocumentVersion } = await import("/src/features/documents/document-history-service.ts");
    const { BackupService } = await import("/src/core/backup/backup-service.ts");
    const store = new GrowthMemoryStore();
    store.snapshot.academicYears[0].operationalStartedAt = store.snapshot.academicYears[0].createdAt;
    await saveDocumentVersion({ store, scope: growthScope }, { title: "Kurgu", selection: { fields: ["name"], studentIds: [growthStudents.ada] }, file: { bytes: new TextEncoder().encode("%PDF-1.4\nKurgu\n%%EOF"), fileName: "Kurgu.pdf", mimeType: "application/pdf" }, now: new Date("2027-06-30T09:00:00Z") });
    const backup = new BackupService(store, { appVersion: "0.41.0", clock: () => new Date("2027-06-30T09:00:00Z") });
    const exported = await backup.exportBackup();
    const version = store.snapshot.settings.find(r => r.settingType === "document-version");
    version.sha256 = "0".repeat(64);
    let rejected = false; try { await backup.exportBackup(); } catch { rejected = true; }
    return { saved: exported.payload.settings.filter(r => r.settingType === "document-version").length, rejected };
  });
  expect(result).toEqual({ saved: 1, rejected: true });
});
test("fresh snapshot keeps exact excluded students and fields, old PDF blocked, versions survive reload", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/tests/document-history-fixture.html");
  await page.waitForFunction(() => Boolean((window as any).historyTest));
  await page.evaluate(async () => {
    const { store, input } = (window as any).historyTest;
    const { createClassRosterPdfDocument } = await import("/src/features/classroom/class-roster-document.ts");
    const { pdfPreviewRecipe, requestPdfDocument } = (window as any).historyTest.previewModel;
    const factory = async () => {
      const snapshot = await store.readSnapshot();
      const file = await createClassRosterPdfDocument({ ...input, snapshot, columns: ["schoolNumber", "name"], studentIds: [input.snapshot.students[0].id], period: { start: "2026-09-07", end: "2026-09-30" }, layout: "daily-classroom" });
      return { ...pdfPreviewRecipe(file.bytes)!, refresh: factory };
    };
    void requestPdfDocument(await factory()).catch(error => { (window as any).requestError = error.message; });
  });
  const dialog = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  const download = dialog.getByRole("button", { name: "Bu PDF'yi indir", exact: true });
  await expect(download).toBeEnabled({ timeout: 30000 });
  const firstDownload = page.waitForEvent("download"); await download.click(); await firstDownload;
  await page.evaluate(async () => {
    const { store, bump } = (window as any).historyTest;
    const snapshot = await store.readSnapshot();
    snapshot.students[0].displayName = "Kurgu Yeni İsim";
    const third = { ...snapshot.students[1], id: crypto.randomUUID(), displayName: "Kurgu Yeni Gelen" };
    await store.transaction("readwrite", ["students"], async tx => tx.putMany("students", [snapshot.students[0], third]));
    bump();
  });
  await expect(download).toBeDisabled();
  await dialog.getByRole("button", { name: "Aynı seçimlerle güncelle", exact: true }).click();
  await expect(download).toBeEnabled({ timeout: 30000 });
  const secondDownload = page.waitForEvent("download"); await download.click(); await secondDownload;
  const result = await page.evaluate(async () => {
    const { store, input } = (window as any).historyTest;
    const { listDocumentVersions } = await import("/src/features/documents/document-history-service.ts");
    const versions = await listDocumentVersions({ store, scope: input.scope });
    return versions.map(v => ({ selection: v.selection, sha256: v.sha256 }));
  });
  expect(result).toHaveLength(2);
  expect(result[0].selection).toEqual(result[1].selection);
  expect(result[0].selection.fields).toEqual(["schoolNumber", "name"]);
  expect(result[0].selection.studentIds).toHaveLength(1);
  expect(result[0].selection.periodStart).toBe("2026-09-07");
  expect(result[0].selection.periodEnd).toBe("2026-09-30");
  expect(result[0].selection.layout).toBe("daily-classroom");
  expect(result[0].sha256).not.toBe(result[1].sha256);
  await page.reload();
  await expect(page.getByRole("button", { name: "Bu sürümü aç", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Bu sürümü aç", exact: true }).last().click();
  await expect(download).toBeEnabled({ timeout: 30000 });
});
