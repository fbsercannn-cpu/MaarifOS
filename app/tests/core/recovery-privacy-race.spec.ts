import { expect, test } from "@playwright/test";
import type { DataTransaction } from "../../src/core/repository/contracts.ts";

test("writer silmeden önce kazanırsa aynı atomik commit PII snapshot'ını kaldırır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import(
      "/src/features/students/student-lifecycle.ts"
    );
    const databaseName = `maarifos-recovery-writer-first-${crypto.randomUUID()}`;
    const deletionStore = new core.IndexedDbDataStore({ databaseName });
    const writerStore = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000761";
    const snapshotId = "00000000-0000-4000-8000-000000000762";
    const student = {
      id: studentId,
      displayName: "Ada Mahremiyet",
      firstName: "Ada",
      lastName: "Mahremiyet",
      profileSchemaVersion: 5,
      active: false,
      enrollmentStatus: "left",
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 5,
    };
    await deletionStore.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [student]),
    );
    const service = new core.BackupService(writerStore, {
      appVersion: "0.7.0-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const staleEnvelope = await service.exportBackup();
    const staleSnapshot = await core.createRecoverySnapshotRecord(
      staleEnvelope,
      "manual",
      {
        id: snapshotId,
        createdAt: "2026-10-01T07:55:00.000Z",
      },
    );
    await writerStore.saveRecoverySnapshot(staleSnapshot);
    let purgeCallCount = 0;
    const raceStore = {
      transaction: deletionStore.transaction.bind(deletionStore),
      readSnapshot: deletionStore.readSnapshot.bind(deletionStore),
      close: deletionStore.close.bind(deletionStore),
      saveRecoverySnapshot: deletionStore.saveRecoverySnapshot.bind(deletionStore),
      listRecoverySnapshots: deletionStore.listRecoverySnapshots.bind(deletionStore),
      getRecoverySnapshot: deletionStore.getRecoverySnapshot.bind(deletionStore),
      deleteRecoverySnapshot: deletionStore.deleteRecoverySnapshot.bind(deletionStore),
      deleteRecoverySnapshotsContainingStudent: async (targetStudentId: string) => {
        return deletionStore.deleteRecoverySnapshotsContainingStudent(
          targetStudentId,
        );
      },
      transactionWithStudentRecoveryPurge: async (
        targetStudentId: string,
        task: (transaction: DataTransaction) => Promise<unknown>,
      ) => {
        purgeCallCount += 1;
        return deletionStore.transactionWithStudentRecoveryPurge(
          targetStudentId,
          task,
        );
      },
    };

    const deletion = await lifecycle.permanentlyDeleteArchivedStudent(
      raceStore,
      {
        studentId,
        confirmationName: "Ada Mahremiyet",
        now: new Date("2026-10-01T08:00:00.000Z"),
      },
    );
    const current = await deletionStore.readSnapshot();
    const recovery = await writerStore.listRecoverySnapshots();
    const staleAfterDelete = await writerStore.getRecoverySnapshot(snapshotId);
    deletionStore.close();
    writerStore.close();
    return {
      deletion,
      purgeCallCount,
      currentContainsStudent: JSON.stringify(current).includes(studentId),
      currentContainsName: JSON.stringify(current).includes("Ada Mahremiyet"),
      recovery,
      staleAfterDelete,
    };
  });

  expect(result.deletion.purgedRecoverySnapshotCount).toBe(1);
  expect(result.purgeCallCount).toBe(1);
  expect(result.currentContainsStudent).toBe(false);
  expect(result.currentContainsName).toBe(false);
  expect(result.recovery).toEqual([]);
  expect(result.staleAfterDelete).toBeNull();
});

test("silme transaction'ı ad drift'i nedeniyle abort olursa mevcut recovery snapshot korunur", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import(
      "/src/features/students/student-lifecycle.ts"
    );
    const databaseName = `maarifos-recovery-delete-abort-${crypto.randomUUID()}`;
    const deletionStore = new core.IndexedDbDataStore({ databaseName });
    const writerStore = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000766";
    const snapshotId = "00000000-0000-4000-8000-000000000767";
    const student = {
      id: studentId,
      displayName: "Ela Mahremiyet",
      firstName: "Ela",
      lastName: "Mahremiyet",
      profileSchemaVersion: 5,
      active: false,
      enrollmentStatus: "left",
      createdAt: "2026-09-01T06:00:00.000Z",
      updatedAt: "2026-09-01T06:00:00.000Z",
      civilDate: "2026-09-01",
      deletedAt: null,
      schemaVersion: 5,
    };
    await deletionStore.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [student]),
    );
    const service = new core.BackupService(writerStore, {
      appVersion: "0.7.0-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const recoverySnapshot = await core.createRecoverySnapshotRecord(
      await service.exportBackup(),
      "manual",
      {
        id: snapshotId,
        createdAt: "2026-10-01T07:55:00.000Z",
      },
    );
    await writerStore.saveRecoverySnapshot(recoverySnapshot);

    let readCount = 0;
    let purgeCallCount = 0;
    const driftStore = {
      transaction: deletionStore.transaction.bind(deletionStore),
      readSnapshot: async () => {
        const snapshot = await deletionStore.readSnapshot();
        readCount += 1;
        if (readCount === 1) {
          await writerStore.transaction(
            "readwrite",
            ["students"],
            async (transaction) => {
              const students = await transaction.getAll("students");
              const renamed = students.map((record) =>
                record.id === studentId
                  ? {
                      ...record,
                      displayName: "Ela Değişti",
                      lastName: "Değişti",
                      updatedAt: "2026-10-01T07:59:00.000Z",
                    }
                  : record,
              );
              await transaction.clear("students");
              await transaction.putMany("students", renamed);
            },
          );
        }
        return snapshot;
      },
      close: deletionStore.close.bind(deletionStore),
      saveRecoverySnapshot: deletionStore.saveRecoverySnapshot.bind(deletionStore),
      listRecoverySnapshots: deletionStore.listRecoverySnapshots.bind(deletionStore),
      getRecoverySnapshot: deletionStore.getRecoverySnapshot.bind(deletionStore),
      deleteRecoverySnapshot: deletionStore.deleteRecoverySnapshot.bind(deletionStore),
      deleteRecoverySnapshotsContainingStudent: async (targetStudentId: string) => {
        return deletionStore.deleteRecoverySnapshotsContainingStudent(
          targetStudentId,
        );
      },
      transactionWithStudentRecoveryPurge: async (
        targetStudentId: string,
        task: (transaction: DataTransaction) => Promise<unknown>,
      ) => {
        purgeCallCount += 1;
        return deletionStore.transactionWithStudentRecoveryPurge(
          targetStudentId,
          task,
        );
      },
    };

    let deletionError = "";
    try {
      await lifecycle.permanentlyDeleteArchivedStudent(driftStore, {
        studentId,
        confirmationName: "Ela Mahremiyet",
        now: new Date("2026-10-01T08:00:00.000Z"),
      });
    } catch (error) {
      deletionError = error instanceof Error ? error.message : String(error);
    }
    const current = await deletionStore.readSnapshot();
    const recovery = await writerStore.listRecoverySnapshots();
    const preserved = await writerStore.getRecoverySnapshot(snapshotId);
    deletionStore.close();
    writerStore.close();
    return {
      deletionError,
      purgeCallCount,
      currentStudent: current.students.find((record) => record.id === studentId),
      recovery,
      preserved,
    };
  });

  expect(result.deletionError).toContain("onayı öğrenci adıyla uyuşmuyor");
  expect(result.purgeCallCount).toBe(1);
  expect(result.currentStudent?.displayName).toBe("Ela Değişti");
  expect(result.recovery).toHaveLength(1);
  expect(result.recovery[0].id).toBe("00000000-0000-4000-8000-000000000767");
  expect(result.preserved?.envelope.payload.students[0].displayName).toBe(
    "Ela Mahremiyet",
  );
});

test("kalıcı silme önce kazanırsa eski preimage aynı veritabanına geri yazılamaz", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import(
      "/src/features/students/student-lifecycle.ts"
    );
    const databaseName = `maarifos-recovery-delete-first-${crypto.randomUUID()}`;
    const deletionStore = new core.IndexedDbDataStore({ databaseName });
    const writerStore = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000771";
    const snapshotId = "00000000-0000-4000-8000-000000000772";
    await deletionStore.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        {
          id: studentId,
          displayName: "Ece Mahremiyet",
          firstName: "Ece",
          lastName: "Mahremiyet",
          profileSchemaVersion: 5,
          active: false,
          enrollmentStatus: "left",
          createdAt: "2026-09-01T06:00:00.000Z",
          updatedAt: "2026-09-01T06:00:00.000Z",
          civilDate: "2026-09-01",
          deletedAt: null,
          schemaVersion: 5,
        },
      ]),
    );
    const service = new core.BackupService(writerStore, {
      appVersion: "0.7.0-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const staleEnvelope = await service.exportBackup();
    const staleSnapshot = await core.createRecoverySnapshotRecord(
      staleEnvelope,
      "manual",
      {
        id: snapshotId,
        createdAt: "2026-10-01T07:55:00.000Z",
      },
    );

    const deletion = await lifecycle.permanentlyDeleteArchivedStudent(
      deletionStore,
      {
        studentId,
        confirmationName: "Ece Mahremiyet",
        now: new Date("2026-10-01T08:00:00.000Z"),
      },
    );
    let staleSaveError = "";
    try {
      await writerStore.saveRecoverySnapshot(staleSnapshot);
    } catch (error) {
      staleSaveError = error instanceof Error ? error.message : String(error);
    }
    const current = await deletionStore.readSnapshot();
    const recovery = await writerStore.listRecoverySnapshots();
    const staleAfterDelete = await writerStore.getRecoverySnapshot(snapshotId);
    deletionStore.close();
    writerStore.close();
    return {
      deletion,
      staleSaveError,
      currentContainsStudent: JSON.stringify(current).includes(studentId),
      currentContainsName: JSON.stringify(current).includes("Ece Mahremiyet"),
      recovery,
      staleAfterDelete,
    };
  });

  expect(result.deletion.purgedRecoverySnapshotCount).toBe(0);
  expect(result.staleSaveError).toContain(
    "yerel veri snapshot oluşturulduktan sonra değişti",
  );
  expect(result.currentContainsStudent).toBe(false);
  expect(result.currentContainsName).toBe(false);
  expect(result.recovery).toEqual([]);
  expect(result.staleAfterDelete).toBeNull();
});

test("atomik işlem commit öncesi enjekte hatada ana veriyle recovery snapshot'ı birlikte geri alır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const lifecycle = await import(
      "/src/features/students/student-lifecycle.ts"
    );
    const databaseName = `maarifos-recovery-atomic-abort-${crypto.randomUUID()}`;
    const deletionStore = new core.IndexedDbDataStore({ databaseName });
    const observerStore = new core.IndexedDbDataStore({ databaseName });
    const studentId = "00000000-0000-4000-8000-000000000781";
    const snapshotId = "00000000-0000-4000-8000-000000000782";
    await deletionStore.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        {
          id: studentId,
          displayName: "Eylül Mahremiyet",
          firstName: "Eylül",
          lastName: "Mahremiyet",
          profileSchemaVersion: 5,
          active: false,
          enrollmentStatus: "left",
          createdAt: "2026-09-01T06:00:00.000Z",
          updatedAt: "2026-09-01T06:00:00.000Z",
          civilDate: "2026-09-01",
          deletedAt: null,
          schemaVersion: 5,
        },
      ]),
    );
    const service = new core.BackupService(observerStore, {
      appVersion: "0.7.0-test",
      clock: () => new Date("2026-10-01T07:55:00.000Z"),
      civilDateProvider: () => "2026-10-01",
    });
    const recoverySnapshot = await core.createRecoverySnapshotRecord(
      await service.exportBackup(),
      "manual",
      {
        id: snapshotId,
        createdAt: "2026-10-01T07:55:00.000Z",
      },
    );
    await observerStore.saveRecoverySnapshot(recoverySnapshot);

    const failingStore = {
      transaction: deletionStore.transaction.bind(deletionStore),
      readSnapshot: deletionStore.readSnapshot.bind(deletionStore),
      close: deletionStore.close.bind(deletionStore),
      transactionWithStudentRecoveryPurge: (
        targetStudentId: string,
        task: (transaction: DataTransaction) => Promise<unknown>,
      ) =>
        deletionStore.transactionWithStudentRecoveryPurge(
          targetStudentId,
          async (transaction) => {
            await task(transaction);
            throw new Error("Enjekte atomik commit hatası.");
          },
        ),
    };

    let deletionError = "";
    try {
      await lifecycle.permanentlyDeleteArchivedStudent(failingStore, {
        studentId,
        confirmationName: "Eylül Mahremiyet",
        now: new Date("2026-10-01T08:00:00.000Z"),
      });
    } catch (error) {
      deletionError = error instanceof Error ? error.message : String(error);
    }
    const current = await observerStore.readSnapshot();
    const recovery = await observerStore.listRecoverySnapshots();
    const preserved = await observerStore.getRecoverySnapshot(snapshotId);
    deletionStore.close();
    observerStore.close();
    return {
      deletionError,
      currentStudent: current.students.find((record) => record.id === studentId),
      recovery,
      preserved,
    };
  });

  expect(result.deletionError).toContain("Enjekte atomik commit hatası");
  expect(result.currentStudent?.displayName).toBe("Eylül Mahremiyet");
  expect(result.recovery).toHaveLength(1);
  expect(result.recovery[0].id).toBe("00000000-0000-4000-8000-000000000782");
  expect(result.preserved?.envelope.payload.students[0].displayName).toBe(
    "Eylül Mahremiyet",
  );
});
