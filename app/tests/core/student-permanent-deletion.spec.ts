import { expect, test } from "@playwright/test";
import type { DataTransaction } from "../../src/core/repository/contracts.ts";

test("aktif öğrenciyi ortak kanıtları koruyarak siler ve sonraki yedekten çıkarır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const databaseName = `permanent-student-active-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000901";
    const otherStudentId = "00000000-0000-4000-8000-000000000902";
    const at = "2026-09-10T06:00:00.000Z";
    const base = { createdAt: at, updatedAt: at, civilDate: "2026-09-10", deletedAt: null, schemaVersion: 1 };
    await store.transaction("readwrite", ["students", "observations", "activities", "mediaAssets"], async (transaction) => {
      await transaction.putMany("students", [
        { ...base, id: studentId, displayName: "Ada Kurgu", firstName: "Ada", lastName: "Kurgu", profileSchemaVersion: 5, active: true, enrollmentStatus: "active", schemaVersion: 5 },
        { ...base, id: otherStudentId, displayName: "Ece Kurgu", firstName: "Ece", lastName: "Kurgu", profileSchemaVersion: 5, active: true, enrollmentStatus: "active", schemaVersion: 5 },
      ]);
      await transaction.putMany("observations", [
        { ...base, id: "00000000-0000-4000-8000-000000000903", rawText: "Kurgu ortak gözlem", studentIds: [studentId, otherStudentId] },
        { ...base, id: "00000000-0000-4000-8000-000000000904", rawText: "Kurgu tek çocuk gözlemi", studentIds: [studentId] },
        { ...base, id: "00000000-0000-4000-8000-000000000906", rawText: "Kurgu eski tekil gözlem", studentId },
      ]);
      await transaction.putMany("mediaAssets", [
        {
          ...base,
          id: "00000000-0000-4000-8000-000000000905",
          blobKey: "kurgu-ortak-medya",
          mimeType: "image/jpeg",
          originalName: "kurgu-ortak.jpg",
          capturedAt: at,
          studentIds: [studentId, otherStudentId],
          sharingFlags: {
            classBulletinAllowed: false,
            individualReportAllowed: false,
            portfolioAllowed: false,
          },
        },
        {
          ...base,
          id: "00000000-0000-4000-8000-000000000907",
          blobKey: "kurgu-tekil-medya",
          mimeType: "image/jpeg",
          originalName: "kurgu-tekil.jpg",
          capturedAt: at,
          studentIds: [studentId],
          sharingFlags: {
            classBulletinAllowed: false,
            individualReportAllowed: false,
            portfolioAllowed: false,
          },
        },
      ]);
      await transaction.putMany("activities", [{
        ...base,
        id: "00000000-0000-4000-8000-000000000908",
        title: "Kurgu ortak etkinlik",
        legacyAssignmentStatus: "needs-review",
        date: "2026-09-10",
        description: "Kurgu",
        studentIds: [otherStudentId],
        evidenceIds: ["00000000-0000-4000-8000-000000000904"],
        evidenceCount: 1,
        mediaIds: ["00000000-0000-4000-8000-000000000907"],
        status: "planned",
      }]);
    });
    const backupService = new core.BackupService(store, {
      appVersion: "permanent-deletion-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const recovery = await backupService.createRecoverySnapshot("manual");
    const preview = lifecycle.previewPermanentStudentDeletion(await store.readSnapshot(), studentId);
    const deletion = await lifecycle.permanentlyDeleteStudent(store, {
      studentId,
      confirmationName: preview.displayName,
      expectedFingerprint: preview.fingerprint,
      now: new Date("2026-10-01T08:00:00.000Z"),
    });
    const after = await store.readSnapshot();
    const verifiedBackup = await backupService.parseAndVerifyBackup(await backupService.exportBackup());
    const recoveryAfter = await store.getRecoverySnapshot(recovery.id);
    store.close();
    const reopened = new core.IndexedDbDataStore({ databaseName });
    const persisted = await reopened.readSnapshot();
    reopened.close();
    return {
      preview,
      deletion,
      after,
      backupPayload: verifiedBackup.payload,
      recoveryAfter,
      persisted,
    };
  });

  expect(result.preview.sharedObservationCount).toBe(1);
  expect(result.preview.sharedMediaCount).toBe(1);
  expect(result.preview.observationCount).toBe(3);
  expect(result.preview.mediaCount).toBe(2);
  expect(result.preview.fingerprint).toMatch(/^student-deletion-v1:[0-9a-f]{32}$/);
  expect(result.deletion.purgedRecoverySnapshotCount).toBe(1);
  expect(result.recoveryAfter).toBeNull();
  expect(result.after.students.map((record) => record.id)).toEqual([
    "00000000-0000-4000-8000-000000000902",
  ]);
  expect(result.after.observations).toHaveLength(1);
  expect(result.after.observations[0].studentIds).toEqual([
    "00000000-0000-4000-8000-000000000902",
  ]);
  expect(result.after.mediaAssets[0].studentIds).toEqual([
    "00000000-0000-4000-8000-000000000902",
  ]);
  expect(result.after.activities[0].evidenceIds).toEqual([]);
  expect(result.after.activities[0].evidenceCount).toBe(0);
  expect(result.after.activities[0].mediaIds).toEqual([]);
  expect(JSON.stringify(result.backupPayload)).not.toContain(
    "00000000-0000-4000-8000-000000000901",
  );
  expect(result.persisted).toEqual(result.after);
});

test("önizleme sonrası öğrenci değişirse silmeyi ve recovery snapshot'ını korur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const databaseName = `permanent-student-stale-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000911";
    const student = {
      id: studentId, displayName: "Mina Kurgu", firstName: "Mina", lastName: "Kurgu",
      profileSchemaVersion: 5, active: true, enrollmentStatus: "active",
      createdAt: "2026-09-10T06:00:00.000Z", updatedAt: "2026-09-10T06:00:00.000Z",
      civilDate: "2026-09-10", deletedAt: null, schemaVersion: 5,
    };
    await store.transaction("readwrite", ["students"], (transaction) => transaction.putMany("students", [student]));
    const service = new core.BackupService(store, {
      appVersion: "permanent-deletion-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const recovery = await service.createRecoverySnapshot("manual");
    const preview = lifecycle.previewPermanentStudentDeletion(await store.readSnapshot(), studentId);
    await store.transaction("readwrite", ["students"], async (transaction) => {
      const students = await transaction.getAll("students");
      await transaction.clear("students");
      await transaction.putMany("students", students.map((record) => record.id === studentId
        ? { ...record, interests: "Kurgu yeni ilgi", updatedAt: "2026-10-01T07:59:00.000Z" }
        : record));
    });
    const beforeAttempt = await store.readSnapshot();
    let error = "";
    try {
      await lifecycle.permanentlyDeleteStudent(store, {
        studentId,
        confirmationName: preview.displayName,
        expectedFingerprint: preview.fingerprint,
        now: new Date("2026-10-01T08:00:00.000Z"),
      });
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    }
    const afterAttempt = await store.readSnapshot();
    const recoveryAfter = await store.getRecoverySnapshot(recovery.id);
    store.close();
    return { error, beforeAttempt, afterAttempt, recoveryAfter };
  });

  expect(result.error).toContain("önizlemeden sonra değişti");
  expect(result.afterAttempt).toEqual(result.beforeAttempt);
  expect(result.recoveryAfter?.envelope.payload.students[0].displayName).toBe("Mina Kurgu");
});

test("commit öncesi hata ana veriyi ve recovery snapshot'ını birlikte geri alır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const databaseName = `permanent-student-rollback-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000921";
    await store.transaction("readwrite", ["students"], (transaction) => transaction.putMany("students", [{
      id: studentId, displayName: "Lale Kurgu", firstName: "Lale", lastName: "Kurgu",
      profileSchemaVersion: 5, active: true, enrollmentStatus: "active",
      createdAt: "2026-09-10T06:00:00.000Z", updatedAt: "2026-09-10T06:00:00.000Z",
      civilDate: "2026-09-10", deletedAt: null, schemaVersion: 5,
    }]));
    const service = new core.BackupService(store, {
      appVersion: "permanent-deletion-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const recovery = await service.createRecoverySnapshot("manual");
    const before = await store.readSnapshot();
    const preview = lifecycle.previewPermanentStudentDeletion(before, studentId);
    const failingStore = {
      transaction: store.transaction.bind(store),
      readSnapshot: store.readSnapshot.bind(store),
      close: store.close.bind(store),
      transactionWithStudentRecoveryPurge: (
        targetStudentId: string,
        task: (transaction: DataTransaction) => Promise<unknown>,
      ) => store.transactionWithStudentRecoveryPurge(targetStudentId, async (transaction) => {
        await task(transaction);
        throw new Error("Kurgu commit öncesi hata");
      }),
    };
    let error = "";
    try {
      await lifecycle.permanentlyDeleteStudent(failingStore, {
        studentId,
        confirmationName: preview.displayName,
        expectedFingerprint: preview.fingerprint,
        now: new Date("2026-10-01T08:00:00.000Z"),
      });
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    }
    const after = await store.readSnapshot();
    const recoveryAfter = await store.getRecoverySnapshot(recovery.id);
    store.close();
    return { error, before, after, recoveryAfter };
  });

  expect(result.error).toContain("Kurgu commit öncesi hata");
  expect(result.after).toEqual(result.before);
  expect(result.recoveryAfter?.envelope.payload.students[0].displayName).toBe("Lale Kurgu");
});

test("olmayan öğrenci için önizleme ve kalıcı silme yazma başlatmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `permanent-student-missing-${crypto.randomUUID()}` });
    const missingId = "00000000-0000-4000-8000-000000000931";
    let previewError = "";
    let deletionError = "";
    try {
      lifecycle.previewPermanentStudentDeletion(await store.readSnapshot(), missingId);
    } catch (reason) {
      previewError = reason instanceof Error ? reason.message : String(reason);
    }
    try {
      await lifecycle.permanentlyDeleteStudent(store, {
        studentId: missingId,
        confirmationName: "Kurgu Olmayan",
        expectedFingerprint: "student-deletion-v1:00000000000000000000000000000000",
      });
    } catch (reason) {
      deletionError = reason instanceof Error ? reason.message : String(reason);
    }
    const snapshot = await store.readSnapshot();
    const recoveries = await store.listRecoverySnapshots();
    store.close();
    return { previewError, deletionError, snapshot, recoveries };
  });

  expect(result.previewError).toContain("öğrenci bulunamadı");
  expect(result.deletionError).toContain("öğrenci bulunamadı");
  expect(result.snapshot.students).toEqual([]);
  expect(result.recoveries).toEqual([]);
});

test("aktif silme API'si çalışma zamanında önizleme parmak izi olmadan yazmaz", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import("/src/features/students/student-lifecycle.ts");
    const store = new core.IndexedDbDataStore({ databaseName: `permanent-student-token-${crypto.randomUUID()}` });
    const studentId = "00000000-0000-4000-8000-000000000941";
    const student = {
      id: studentId, displayName: "Suna Kurgu", firstName: "Suna", lastName: "Kurgu",
      profileSchemaVersion: 5, active: true, enrollmentStatus: "active",
      createdAt: "2026-09-10T06:00:00.000Z", updatedAt: "2026-09-10T06:00:00.000Z",
      civilDate: "2026-09-10", deletedAt: null, schemaVersion: 5,
    };
    await store.transaction("readwrite", ["students"], (transaction) => transaction.putMany("students", [student]));
    const before = await store.readSnapshot();
    let error = "";
    try {
      await (lifecycle.permanentlyDeleteStudent as unknown as (
        dataStore: typeof store,
        input: { studentId: string; confirmationName: string },
      ) => Promise<unknown>)(store, { studentId, confirmationName: student.displayName });
    } catch (reason) {
      error = reason instanceof Error ? reason.message : String(reason);
    }
    const after = await store.readSnapshot();
    const recoveries = await store.listRecoverySnapshots();
    store.close();
    return { error, before, after, recoveries };
  });

  expect(result.error).toContain("parmak izi gereklidir");
  expect(result.after).toEqual(result.before);
  expect(result.recoveries).toEqual([]);
});
