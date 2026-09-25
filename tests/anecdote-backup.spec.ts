import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test.use({ viewport: { width: 390, height: 844 } });

test("anekdot formu yerel/reload/yedek zincirinden Belgeler ekranına ve gerçek indirmeye ulaşır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const today = await import("/src/features/today/today-data.ts");
    const evidence = await import("/src/features/evidence/evidence-flow.ts");
    const quick = await import("/src/features/evidence/quick-observation.ts");
    const taxonomy = await import(
      "/src/core/domain/observation-taxonomy.ts"
    );
    const curriculum = await import(
      "/src/features/curriculum/curriculum-catalog.ts"
    );
    const tymm = await import(
      "/src/features/curriculum/tymm-2024-catalog.ts"
    );
    const anecdote = await import(
      "/src/features/anecdote/anecdote-form.ts"
    );

    const sourceDatabaseName = "maarifos-local";
    const targetDatabaseName =
      `maarifos-test-anecdote-target-${crypto.randomUUID()}`;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(sourceDatabaseName);
      request.addEventListener("success", () => resolve());
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("blocked", () =>
        reject(new Error("Kurgu varsayılan veritabanı silinemedi.")),
      );
    });
    let source = new core.IndexedDbDataStore({
      databaseName: sourceDatabaseName,
    });
    const targetStore = new core.IndexedDbDataStore({
      databaseName: targetDatabaseName,
    });
    const yearId = "00000000-0000-4000-8000-000000007201";
    const classroomId = "00000000-0000-4000-8000-000000007202";
    const studentId = "00000000-0000-4000-8000-000000007203";
    const planId = "00000000-0000-4000-8000-000000007204";
    const activityId = "00000000-0000-4000-8000-000000007205";
    const observationId = "00000000-0000-4000-8000-000000007206";
    const assessmentDraftId = "00000000-0000-4000-8000-000000007207";
    const rawText =
      "  Ece, iki yaprağın damarlarını büyüteçle karşılaştırıp ‘Bunun çizgileri daha çok.’ dedi.  ";
    const assessmentText =
      "Ece, iki doğal nesnenin görünür özelliklerini karşılaştırırken benzerlik ve farklılıkları sözel olarak ifade etmeye yönelmiştir.";
    const profile = {
      framework: "tymm" as const,
      programLabel: evidence.CURRICULUM_PROGRAM_LABELS.tymm,
      catalogId: tymm.TYMM_2024_CATALOG_METADATA.catalogId,
      sourceVersion: tymm.TYMM_2024_CATALOG_METADATA.sourceVersion,
      referenceOrigin: "official-catalog" as const,
      officialCatalogVerified: true,
    };
    const target = curriculum
      .curriculumTargetsForProfile(profile, "60-72")
      .find((candidate) => candidate.referenceCode === "FAB.1");
    if (!target) throw new Error("Kurgu resmî program hedefi bulunamadı.");

    await today.saveClassroomConfiguration(source, {
      academicYear: {
        id: yearId,
        name: "2026–2027 Eğitim Yılı",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
      },
      classroom: {
        id: classroomId,
        name: "Anekdot Yedek Sınıfı",
        ageGroup: "60-72 ay",
        curriculumProfile: profile,
      },
      schedule: {
        kind: "morning",
        startTime: "08:30",
        endTime: "12:30",
      },
      now: new Date("2026-09-01T06:00:00.000Z"),
    });
    await source.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        {
          id: studentId,
          displayName: "Ece Yıldız",
          academicYearId: yearId,
          classroomId,
          active: true,
          enrollmentStatus: "active",
          createdAt: "2026-09-01T06:10:00.000Z",
          updatedAt: "2026-09-01T06:10:00.000Z",
          civilDate: "2026-09-01",
          deletedAt: null,
          schemaVersion: 2,
          profileSchemaVersion: 2,
        },
      ]),
    );
    await evidence.createPlanWithActivity(source, {
      civilDate: "2026-09-09",
      planId,
      planTitle: "Doğal nesneleri inceleme planı",
      activityId,
      activityTitle: "Yaprak damarlarını karşılaştırma",
      startTime: "09:30",
      endTime: "10:00",
      curriculumProfile: profile,
      curriculumTargets: [target],
      assignmentMode: "selected-students",
      studentIds: [studentId],
      now: new Date("2026-09-09T06:00:00.000Z"),
    });
    await quick.persistQuickObservationDraft(source, {
      studentId,
      planId,
      activityId,
      rawText,
      observationType: "anecdotal",
      categoryIds: ["cognitive-learning"],
      taxonomyVersion: taxonomy.OBSERVATION_TAXONOMY_VERSION_V2,
      now: new Date("2026-09-09T07:00:00.000Z"),
    });
    await quick.finalizeQuickObservationDraft(source, {
      observationId,
      studentId,
      planId,
      activityId,
      taxonomyVersion: taxonomy.OBSERVATION_TAXONOMY_VERSION_V2,
      observedAt: "2026-09-09T07:01:00.000Z",
      now: new Date("2026-09-09T07:02:00.000Z"),
    });
    await evidence.confirmObservationCurriculumLink(source, {
      observationId,
      framework: profile.framework,
      catalogId: profile.catalogId,
      sourceVersion: profile.sourceVersion,
      referenceCode: target.referenceCode,
      referenceTitle: target.referenceTitle,
      referenceOrigin: profile.referenceOrigin,
      officialCatalogVerified: profile.officialCatalogVerified,
      plannedTargetId: target.id,
      now: new Date("2026-09-09T08:00:00.000Z"),
    });
    await evidence.createCitedAssessmentDraft(source, {
      draftId: assessmentDraftId,
      studentId,
      observationIds: [observationId],
      teacherAssessmentText: assessmentText,
      assessmentTargetIds: [target.id],
      periodStart: "2026-09-09",
      periodEnd: "2026-09-09",
      now: new Date("2026-09-09T09:00:00.000Z"),
    });
    await anecdote.saveAnecdoteFormDraft(source, {
      observationId,
      observedLocation: "Fen ve doğa merkezi",
      observerGeneralAssessment: assessmentText,
      now: new Date("2026-09-09T10:00:00.000Z"),
    });
    await anecdote.approveAnecdoteForm(source, {
      observationId,
      now: new Date("2026-09-09T10:01:00.000Z"),
    });

    const beforeReload = await source.readSnapshot();
    source.close();
    source = new core.IndexedDbDataStore({ databaseName: sourceDatabaseName });
    const reopened = await anecdote.loadAnecdoteFormWorkspace(source);
    const service = new core.BackupService(source, {
      appVersion: "anecdote-backup-test",
      clock: () => new Date("2026-09-09T12:00:00.000Z"),
      civilDateProvider: () => "2026-09-09",
    });
    const backup = await service.exportBackup();

    const validationError = async (
      mutate: (candidate: typeof backup) => void,
    ) => {
      const candidate = structuredClone(backup);
      mutate(candidate);
      candidate.manifest.payloadChecksum = await core.sha256Hex(
        core.canonicalJson(candidate.payload),
      );
      try {
        await service.parseAndVerifyBackup(candidate);
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };
    const linkTamperError = await validationError((candidate) => {
      const draft = candidate.payload.reportDrafts.find(
        (record) => record.reportType === anecdote.ANECDOTE_FORM_REPORT_TYPE,
      );
      if (!draft) throw new Error("Kurgu anekdot formu bulunamadı.");
      draft.editableSections.approvedCurriculumLinkIds = [];
    });
    const assessmentTamperError = await validationError((candidate) => {
      const draft = candidate.payload.reportDrafts.find(
        (record) => record.id === assessmentDraftId,
      );
      if (!draft) throw new Error("Kurgu değerlendirme kaydı bulunamadı.");
      draft.teacherAssessmentText = "Kaynakla uyuşmayan değiştirilmiş metin.";
    });
    const rawTextTamperError = await validationError((candidate) => {
      const observation = candidate.payload.observations.find(
        (record) => record.id === observationId,
      );
      if (!observation) throw new Error("Kurgu anekdot gözlemi bulunamadı.");
      observation.rawText = `${observation.rawText} TAMPER`;
    });
    const linkContentTamperErrors = await Promise.all(
      [
        ["referenceTitle", "Seal dışı başlık"],
        ["referenceCode", "FAB.9"],
        ["confirmedAt", "2026-09-09T08:00:01.000Z"],
        ["approvedByUserId", "00000000-0000-4000-8000-000000007299"],
      ].map(([field, value]) =>
        validationError((candidate) => {
          const link = candidate.payload.evidenceCurriculumLinks.find(
            (record) => record.observationId === observationId,
          );
          if (!link) throw new Error("Kurgu program bağı bulunamadı.");
          link[field] = value;
        }),
      ),
    );
    const sealAllowlistError = await validationError((candidate) => {
      const draft = candidate.payload.reportDrafts.find(
        (record) => record.reportType === anecdote.ANECDOTE_FORM_REPORT_TYPE,
      );
      if (!draft?.approvalSeal?.observation) {
        throw new Error("Kurgu anekdot approval seal bulunamadı.");
      }
      draft.approvalSeal.observation.unexpected = true;
    });
    const legacyBackup = structuredClone(backup);
    const legacyDraft = legacyBackup.payload.reportDrafts.find(
      (record) => record.reportType === anecdote.ANECDOTE_FORM_REPORT_TYPE,
    );
    if (!legacyDraft) throw new Error("Kurgu legacy anekdot formu bulunamadı.");
    delete legacyDraft.approvalSeal;
    legacyDraft.schemaVersion = 1;
    legacyBackup.manifest.payloadChecksum = await core.sha256Hex(
      core.canonicalJson(legacyBackup.payload),
    );
    const parsedLegacy = await service.parseAndVerifyBackup(legacyBackup);
    const legacyWorkspace = anecdote.resolveAnecdoteFormWorkspace(
      parsedLegacy.payload,
    );

    await new core.BackupService(targetStore, {
      appVersion: "anecdote-backup-test",
    }).restoreBackup(backup, {
      mode: "replace",
      createRecoverySnapshot: false,
    });
    const restored = await anecdote.loadAnecdoteFormWorkspace(targetStore);
    const restoredSnapshot = await targetStore.readSnapshot();
    source.close();
    targetStore.close();
    return {
      beforeRawText: beforeReload.observations[0]?.rawText,
      reopenedStatus: reopened.forms[0]?.workflowStatus,
      reopenedRawText: reopened.forms[0]?.observedSituation,
      restoredStatus: restored.forms[0]?.workflowStatus,
      restoredRawText: restored.forms[0]?.observedSituation,
      restoredAssessment: restored.forms[0]?.observerGeneralAssessment,
      restoredSourceDraftId:
        restored.forms[0]?.generalEvaluationSourceDraftId,
      restoredPortfolioCount: restoredSnapshot.portfolioSelections.length,
      sealRoundTrip:
        JSON.stringify(
          restoredSnapshot.reportDrafts.find(
            (record) => record.reportType === anecdote.ANECDOTE_FORM_REPORT_TYPE,
          )?.approvalSeal,
        ) ===
        JSON.stringify(
          backup.payload.reportDrafts.find(
            (record) => record.reportType === anecdote.ANECDOTE_FORM_REPORT_TYPE,
          )?.approvalSeal,
        ),
      backupAnecdoteCount: backup.payload.reportDrafts.filter(
        (record) => record.reportType === anecdote.ANECDOTE_FORM_REPORT_TYPE,
      ).length,
      linkTamperError,
      assessmentTamperError,
      rawTextTamperError,
      linkContentTamperErrors,
      sealAllowlistError,
      legacyWorkflowStatus: legacyWorkspace.forms[0]?.workflowStatus,
    };
  });

  expect(result.beforeRawText).toBe(
    "  Ece, iki yaprağın damarlarını büyüteçle karşılaştırıp ‘Bunun çizgileri daha çok.’ dedi.  ",
  );
  expect(result.reopenedStatus).toBe("ready");
  expect(result.reopenedRawText).toBe(result.beforeRawText);
  expect(result.restoredStatus).toBe("ready");
  expect(result.restoredRawText).toBe(result.beforeRawText);
  expect(result.restoredAssessment).toContain(
    "iki doğal nesnenin görünür özelliklerini karşılaştırırken",
  );
  expect(result.restoredSourceDraftId).toBe(
    "00000000-0000-4000-8000-000000007207",
  );
  expect(result.restoredPortfolioCount).toBe(0);
  expect(result.backupAnecdoteCount).toBe(1);
  expect(result.sealRoundTrip).toBe(true);
  expect(result.linkTamperError).toContain(
    "anekdot formu kaynak, kapsam veya öğretmen onayı sözleşmesine uymuyor",
  );
  expect(result.assessmentTamperError).toContain(
    "anekdot formu kaynak, kapsam veya öğretmen onayı sözleşmesine uymuyor",
  );
  expect(result.rawTextTamperError).toContain(
    "anekdot formu kaynak, kapsam veya öğretmen onayı sözleşmesine uymuyor",
  );
  for (const error of result.linkContentTamperErrors) {
    expect(error).toContain(
      "anekdot formu kaynak, kapsam veya öğretmen onayı sözleşmesine uymuyor",
    );
  }
  expect(result.sealAllowlistError).toContain(
    "anekdot formu kaynak, kapsam veya öğretmen onayı sözleşmesine uymuyor",
  );
  expect(result.legacyWorkflowStatus).toBe("review-required");

  await page.evaluate(async () => {
    const { CURRENT_RELEASE } = await import("/src/release.ts");
    window.localStorage.setItem(
      "maarifos.release.acknowledgement.v1",
      JSON.stringify({
        schemaVersion: 1,
        firstSeenVersion: CURRENT_RELEASE.version,
        acknowledgedVersion: CURRENT_RELEASE.version,
        acknowledgedAt: "2026-09-09T12:05:00.000Z",
      }),
    );
  });
  await page.goto("/?native=1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Belgeler", exact: true }).click();
  await page.getByRole("button", { name: /Ayrıntılı resmî formlar/ }).click();
  const documents = page.getByRole("dialog", { name: "Belgeler" });
  await expect(documents).toBeVisible();
  await expect(documents).toContainText("Anekdot Kayıt Formları");
  await expect(documents).toContainText("Ece Yıldız");
  await expect(documents).toContainText("Belgeye hazır");

  await documents
    .locator(".anecdote-form-card > summary")
    .filter({ hasText: "Ece Yıldız" })
    .click();
  await expect(
    documents.getByText(result.beforeRawText.trim(), { exact: true }),
  ).toBeVisible();
  await expect(documents.getByLabel("Gözlenen Mekân")).toHaveValue(
    "Fen ve doğa merkezi",
  );
  await expect(
    documents.getByLabel("Gözlemcinin Genel Değerlendirmesi"),
  ).toHaveValue(result.restoredAssessment);

  const [wordDownload] = await Promise.all([
    page.waitForEvent("download"),
    documents.getByRole("button", { name: "Word indir" }).click(),
  ]);
  expect(wordDownload.suggestedFilename()).toMatch(
    /^MaarifOS_Anekdot_Kayit_Formu_Ece_Yıldız_2026-09-09\.docx$/,
  );
  await documents.getByRole("button", { name: "Görsel PDF indir" }).click();
  const pdfPreview = page.getByRole("dialog", { name: "PDF önizlemesi", exact: true });
  await expect(pdfPreview).toBeVisible();
  const [pdfDownload] = await Promise.all([
    page.waitForEvent("download"),
    pdfPreview.getByRole("button", { name: "Bu PDF'yi indir", exact: true }).click(),
  ]);
  expect(pdfDownload.suggestedFilename()).toMatch(
    /^MaarifOS_Anekdot_Kayit_Formu_Ece_Yıldız_2026-09-09\.pdf$/,
  );
});
