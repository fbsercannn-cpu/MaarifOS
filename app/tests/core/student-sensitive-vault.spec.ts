import { expect, test } from "@playwright/test";

test("v2 kasa tüm öğrenci kaydını şifreler; API, restart, recovery ve şifreli yedek kayıpsızdır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const databaseName = `vault-full-${crypto.randomUUID()}`;
    const targetDatabaseName = `vault-full-target-${crypto.randomUUID()}`;
    const academicYearId = "00000000-0000-4000-8000-00000000d001";
    const classroomId = "00000000-0000-4000-8000-00000000d002";
    const studentId = "00000000-0000-4000-8000-00000000d003";
    const student = fx.fictionalStudent(studentId, "TÜM-KAYIT", {
      academicYearId,
      classroomId,
    });
    const base = {
      createdAt: "2026-08-28T06:00:00.000Z",
      updatedAt: "2026-08-28T06:00:00.000Z",
      civilDate: "2026-08-28",
      deletedAt: null,
    };
    const source = new core.IndexedDbDataStore({ databaseName });
    await source.transaction("readwrite", ["academicYears", "classrooms", "students"], async (transaction) => {
      await transaction.putMany("academicYears", [{
        ...base,
        id: academicYearId,
        schemaVersion: 1,
        name: "2026-2027",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
        status: "active",
      }]);
      await transaction.putMany("classrooms", [{
        ...base,
        id: classroomId,
        schemaVersion: 2,
        academicYearId,
        name: "Kurgu Güvenli Sınıf",
        schedule: {
          kind: "full_day",
          startTime: "08:30",
          endTime: "16:30",
          timeZone: "Europe/Istanbul",
        },
      }]);
      await transaction.putMany("students", [student]);
    });

    const first = (await source.readSnapshot()).students[0];
    const backupService = new core.BackupService(source, {
      appVersion: "local-vault-v2-test",
      clock: () => new Date("2026-08-28T07:00:00.000Z"),
      civilDateProvider: () => "2026-08-28",
    });
    const encryptedBackup = await backupService.exportEncryptedBackup("Kurgu-v2-parola-2026!");
    const recoveryMetadata = await backupService.createRecoverySnapshot("manual");
    const rawStudents = await fx.readAll<Record<string, unknown>>(databaseName, "students");
    const rawRecovery = await fx.readAll<Record<string, unknown>>(databaseName, core.RECOVERY_SNAPSHOT_STORE_NAME);
    const keyRecords = await fx.readAll<{ id: string; key?: CryptoKey }>(
      vault.studentSensitiveKeyDatabaseName(databaseName),
      vault.STUDENT_SENSITIVE_KEY_STORE_NAME,
    );
    source.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const restarted = new core.IndexedDbDataStore({ databaseName });
    const restartedStudent = (await restarted.readSnapshot()).students[0];
    const recoveryStudent = (await restarted.getRecoverySnapshot(recoveryMetadata.id))?.envelope.payload.students[0];
    restarted.close();
    const target = new core.IndexedDbDataStore({ databaseName: targetDatabaseName });
    await new core.BackupService(target, { appVersion: "local-vault-v2-test" }).restoreEncryptedBackup(
      encryptedBackup,
      "Kurgu-v2-parola-2026!",
      { mode: "replace", createRecoverySnapshot: false },
    );
    const restoredStudent = (await target.readSnapshot()).students[0];
    const targetRaw = await fx.readAll<Record<string, unknown>>(targetDatabaseName, "students");
    target.close();

    const rawStudent = rawStudents[0];
    const envelope = rawStudent?.[vault.STUDENT_VAULT_ENVELOPE_FIELD] as Record<string, unknown> | undefined;
    const rawRecoveryStudent = (rawRecovery[0]?.envelope as {
      payload?: { students?: Array<Record<string, unknown>> };
    })?.payload?.students?.[0];
    const forbidden = [
      String(student.displayName),
      String(student.birthDate),
      String(student.nationalIdentityNumber),
      String(student.notes),
      String(student.profilePhotoDataUrl),
      String((student.contacts as Array<{ name: string }>)[0].name),
    ];
    const rawTexts = [JSON.stringify(rawStudents), JSON.stringify(rawRecovery), JSON.stringify(targetRaw)];
    const key = keyRecords.find((record) => record.id === "local-vault-aes-gcm-v2")?.key;
    return {
      exactRoundTrips: [first, restartedStudent, recoveryStudent, restoredStudent].map(
        (value) => core.canonicalJson(value) === core.canonicalJson(student),
      ),
      outerKeys: Object.keys(rawStudent ?? {}).sort(),
      recoveryOuterKeys: Object.keys(rawRecoveryStudent ?? {}).sort(),
      envelopeKeys: Object.keys(envelope ?? {}).sort(),
      envelopeVersion: envelope?.version,
      envelopeAlgorithm: envelope?.algorithm,
      forbiddenVisible: forbidden.some((secret) => rawTexts.some((raw) => raw.includes(secret))),
      key: key ? { extractable: key.extractable, type: key.type } : null,
    };
  });

  expect(result.exactRoundTrips).toEqual([true, true, true, true]);
  expect(result.outerKeys).toEqual(["__maarifosLocalVault", "id"]);
  expect(result.recoveryOuterKeys).toEqual(["__maarifosLocalVault", "id"]);
  expect(result.envelopeKeys).toEqual([
    "algorithm", "ciphertext", "iv", "keyId", "recordGeneration", "recordSchemaVersion", "schemaEpoch", "version",
  ]);
  expect(result.envelopeVersion).toBe(2);
  expect(result.envelopeAlgorithm).toBe("AES-GCM");
  expect(result.forbiddenVisible).toBe(false);
  expect(result.key).toEqual({ extractable: false, type: "secret" });
});

test("plaintext v6 ve legacy v1 kaynakları shadow doğrulama ile v2'ye taşınır ve tekrar koşum değişmezdir", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journal = await import("/src/core/security/local-vault-migration-journal.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const plainDatabase = `vault-plain-${crypto.randomUUID()}`;
    const legacyDatabase = `vault-v1-${crypto.randomUUID()}`;
    const plainStudent = fx.fictionalStudent("00000000-0000-4000-8000-00000000d101", "PLAIN");
    const recoveryStudent = fx.fictionalStudent("00000000-0000-4000-8000-00000000d102", "RECOVERY");
    const legacyStudent = fx.fictionalStudent("00000000-0000-4000-8000-00000000d103", "LEGACY-V1");
    const recoveryId = "00000000-0000-4000-8000-00000000d104";
    const legacyRecovery = {
      id: recoveryId,
      createdAt: "2026-08-28T06:30:00.000Z",
      reason: "manual",
      checksumAlgorithm: "SHA-256",
      snapshotChecksum: "0".repeat(64),
      envelope: { payload: { students: [recoveryStudent] } },
    };
    await fx.createLegacyMainDatabase(plainDatabase, [plainStudent], [legacyRecovery]);
    await fx.createLegacyV1Database(legacyDatabase, legacyStudent);

    const migrate = async (databaseName: string) => {
      const store = new core.IndexedDbDataStore({ databaseName });
      const snapshot = await store.readSnapshot();
      store.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const firstRaw = await fx.readAll<Record<string, unknown>>(databaseName, "students");
      const ready = await fx.readReadyState(databaseName);
      const keyDatabase = vault.studentSensitiveKeyDatabaseName(databaseName);
      const journalRecord = await fx.readOne<Record<string, unknown>>(
        keyDatabase,
        journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
        vault.STUDENT_VAULT_MIGRATION_ID,
      );
      const shadows = await fx.readAll<Record<string, unknown>>(keyDatabase, journal.LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME);
      const keyIds = (
        await fx.readAll<{ id: string }>(
          keyDatabase,
          vault.STUDENT_SENSITIVE_KEY_STORE_NAME,
        )
      ).map((record) => record.id).sort();
      const second = new core.IndexedDbDataStore({ databaseName });
      await second.readSnapshot();
      second.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const secondRaw = await fx.readAll<Record<string, unknown>>(databaseName, "students");
      return { snapshot, firstRaw, secondRaw, ready, phase: journalRecord?.phase, shadowCount: shadows.length, keyIds };
    };
    const plain = await migrate(plainDatabase);
    const legacy = await migrate(legacyDatabase);
    const plainRawRecovery = await fx.readAll<Record<string, unknown>>(plainDatabase, core.RECOVERY_SNAPSHOT_STORE_NAME);
    const directVault = new vault.StudentSensitiveVault({ databaseName: plainDatabase });
    const openedRecovery = await directVault.openRecoverySnapshot(plainRawRecovery[0] as never);
    directVault.close();
    return {
      plainExact: core.canonicalJson(plain.snapshot.students[0]) === core.canonicalJson(plainStudent),
      legacyExact: core.canonicalJson(legacy.snapshot.students[0]) === core.canonicalJson(legacyStudent),
      recoveryExact: core.canonicalJson(openedRecovery.envelope.payload.students[0]) === core.canonicalJson(recoveryStudent),
      idempotent:
        core.canonicalJson(plain.firstRaw) === core.canonicalJson(plain.secondRaw) &&
        core.canonicalJson(legacy.firstRaw) === core.canonicalJson(legacy.secondRaw),
      rawVersions: [plain.firstRaw, legacy.firstRaw].map((records) =>
        (records[0]?.[vault.STUDENT_VAULT_ENVELOPE_FIELD] as { version?: number })?.version,
      ),
      phases: [plain.phase, legacy.phase],
      shadowCounts: [plain.shadowCount, legacy.shadowCount],
      keyIds: [plain.keyIds, legacy.keyIds],
      readyStates: [plain.ready, legacy.ready],
      recoveryRawKeys: Object.keys((plainRawRecovery[0]?.envelope as {
        payload?: { students?: Array<Record<string, unknown>> };
      })?.payload?.students?.[0] ?? {}).sort(),
    };
  });

  expect(result.plainExact).toBe(true);
  expect(result.legacyExact).toBe(true);
  expect(result.recoveryExact).toBe(true);
  expect(result.idempotent).toBe(true);
  expect(result.rawVersions).toEqual([2, 2]);
  expect(result.phases).toEqual(["ready", "ready"]);
  expect(result.shadowCounts).toEqual([0, 0]);
  expect(result.keyIds).toEqual([
    ["local-vault-aes-gcm-v2"],
    ["local-vault-aes-gcm-v2"],
  ]);
  expect(result.readyStates).toEqual([
    expect.objectContaining({ state: "ready", envelopeVersion: 2 }),
    expect.objectContaining({ state: "ready", envelopeVersion: 2 }),
  ]);
  expect(result.recoveryRawKeys).toEqual(["__maarifosLocalVault", "id"]);
});

test("ciphertext tamper, downgrade, kayıtlar arası swap ve store swap fail-closed durur", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const failures = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const field = vault.STUDENT_VAULT_ENVELOPE_FIELD;
    const closeTick = async (store: InstanceType<typeof core.IndexedDbDataStore>) => {
      store.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };
    const createReady = async (withRecovery = false) => {
      const databaseName = `vault-negative-${crypto.randomUUID()}`;
      const students = [fx.fictionalStudent(crypto.randomUUID(), "NEG-A"), fx.fictionalStudent(crypto.randomUUID(), "NEG-B")];
      const store = new core.IndexedDbDataStore({ databaseName });
      await store.transaction("readwrite", ["students"], async (transaction) => transaction.putMany("students", students));
      if (withRecovery) {
        await new core.BackupService(store, {
          appVersion: "local-vault-negative-test",
          clock: () => new Date("2026-08-28T07:00:00.000Z"),
          civilDateProvider: () => "2026-08-28",
        }).createRecoverySnapshot("manual");
      }
      await closeTick(store);
      return { databaseName };
    };
    const readFailure = async (databaseName: string) => {
      const store = new core.IndexedDbDataStore({ databaseName });
      try {
        await store.readSnapshot();
        return "NO_ERROR";
      } catch (error) {
        return error && typeof error === "object" && "code" in error ? String(error.code) : error instanceof Error ? error.name : "UNKNOWN";
      } finally {
        await closeTick(store);
      }
    };

    const tamper = await createReady();
    const tamperedRaw = await fx.readAll<Record<string, unknown>>(tamper.databaseName, "students");
    const tamperedEnvelope = structuredClone(tamperedRaw[0][field]) as { ciphertext: string };
    tamperedEnvelope.ciphertext = `${tamperedEnvelope.ciphertext[0] === "A" ? "B" : "A"}${tamperedEnvelope.ciphertext.slice(1)}`;
    await fx.putOne(tamper.databaseName, "students", { id: tamperedRaw[0].id, [field]: tamperedEnvelope });

    const downgrade = await createReady();
    const downgradeRaw = await fx.readAll<Record<string, unknown>>(downgrade.databaseName, "students");
    await fx.putOne(downgrade.databaseName, "students", {
      id: downgradeRaw[0].id,
      [field]: { ...(downgradeRaw[0][field] as Record<string, unknown>), version: 1 },
    });

    const generationTamper = await createReady();
    const generationRaw = await fx.readAll<Record<string, unknown>>(
      generationTamper.databaseName,
      "students",
    );
    const generationEnvelope = structuredClone(generationRaw[0][field]) as {
      recordGeneration: number;
    };
    generationEnvelope.recordGeneration += 1;
    await fx.putOne(generationTamper.databaseName, "students", {
      id: generationRaw[0].id,
      [field]: generationEnvelope,
    });

    const crossRecord = await createReady();
    const crossRaw = await fx.readAll<Record<string, unknown>>(crossRecord.databaseName, "students");
    await fx.putOne(crossRecord.databaseName, "students", { id: crossRaw[0].id, [field]: structuredClone(crossRaw[1][field]) });

    const storeSwap = await createReady(true);
    const storeSwapRaw = await fx.readAll<Record<string, unknown>>(storeSwap.databaseName, "students");
    const recoveryRaw = await fx.readAll<Record<string, unknown>>(storeSwap.databaseName, core.RECOVERY_SNAPSHOT_STORE_NAME);
    const recoveryStudent = (recoveryRaw[0].envelope as {
      payload: { students: Array<Record<string, unknown>> };
    }).payload.students.find((student) => student.id === storeSwapRaw[0].id);
    await fx.putOne(storeSwap.databaseName, "students", structuredClone(recoveryStudent));

    const sameRecordReplay = await createReady();
    const replayOldRaw = await fx.readAll<Record<string, unknown>>(
      sameRecordReplay.databaseName,
      "students",
    );
    const updater = new core.IndexedDbDataStore({
      databaseName: sameRecordReplay.databaseName,
    });
    await updater.transaction("readwrite", ["students"], async (transaction) => {
      const current = (await transaction.getAll("students"))[0];
      await transaction.putMany("students", [
        {
          ...current,
          notes: "Yeni ve güvenlik-kritik gözlem",
          updatedAt: "2026-08-28T08:00:00.000Z",
        },
      ]);
    });
    await closeTick(updater);
    const replayNewRaw = await fx.readAll<Record<string, unknown>>(
      sameRecordReplay.databaseName,
      "students",
    );
    await fx.putOne(
      sameRecordReplay.databaseName,
      "students",
      structuredClone(replayOldRaw[0]),
    );
    return {
      tamper: await readFailure(tamper.databaseName),
      downgrade: await readFailure(downgrade.databaseName),
      generationTamper: await readFailure(generationTamper.databaseName),
      crossRecord: await readFailure(crossRecord.databaseName),
      storeSwap: await readFailure(storeSwap.databaseName),
      sameRecordReplay: await readFailure(sameRecordReplay.databaseName),
      replayGenerations: [replayOldRaw, replayNewRaw].map(
        (records) =>
          (records[0]?.[field] as { recordGeneration?: number } | undefined)
            ?.recordGeneration,
      ),
    };
  });

  expect(failures).toEqual({
    tamper: "LOCAL_VAULT_AUTHENTICATION_FAILED",
    downgrade: "LOCAL_VAULT_INVALID_ENVELOPE",
    generationTamper: "LOCAL_VAULT_AUTHENTICATION_FAILED",
    crossRecord: "LOCAL_VAULT_AUTHENTICATION_FAILED",
    storeSwap: "LOCAL_VAULT_AUTHENTICATION_FAILED",
    sameRecordReplay: "LOCAL_VAULT_REPLAY_DETECTED",
    replayGenerations: [1, 2],
  });
});

test("iki aşamalı tombstone kalıcı silme ve crash aralıklarında eski ciphertext replay'ini fail-closed reddeder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vaultModule = await import(
      "/src/core/security/student-sensitive-vault.ts"
    );
    const generation = await import(
      "/src/core/security/local-vault-record-generation.ts"
    );
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const closeTick = async (
      store: InstanceType<typeof core.IndexedDbDataStore>,
    ) => {
      store.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };
    const failureCode = async (databaseName: string) => {
      const store = new core.IndexedDbDataStore({ databaseName });
      try {
        await store.readSnapshot();
        return "NO_ERROR";
      } catch (error) {
        return error && typeof error === "object" && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.name
            : "UNKNOWN";
      } finally {
        await closeTick(store);
      }
    };
    const createReady = async (marker: string) => {
      const databaseName = `vault-retire-${marker}-${crypto.randomUUID()}`;
      const student = fx.fictionalStudent(crypto.randomUUID(), marker);
      const store = new core.IndexedDbDataStore({ databaseName });
      await store.transaction(
        "readwrite",
        ["students"],
        async (transaction) => transaction.putMany("students", [student]),
      );
      await closeTick(store);
      const raw = (
        await fx.readAll<Record<string, unknown>>(databaseName, "students")
      )[0];
      return { databaseName, student, raw };
    };
    const prepareDeleteIntent = async (databaseName: string) => {
      const vault = new vaultModule.StudentSensitiveVault({ databaseName });
      await vault.prepareCommittedStudentRecordRetirements([]);
      vault.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };
    const generationState = async (databaseName: string) => {
      const states = await fx.readAll<Record<string, unknown>>(
        vaultModule.studentSensitiveKeyDatabaseName(databaseName),
        generation.LOCAL_VAULT_RECORD_GENERATION_STATE_STORE_NAME,
      );
      return states[0];
    };

    const permanent = await createReady("PERMANENT");
    const permanentStore = new core.IndexedDbDataStore({
      databaseName: permanent.databaseName,
    });
    await permanentStore.transactionWithStudentRecoveryPurge(
      permanent.student.id,
      async (transaction) => {
        const students = await transaction.getAll("students");
        await transaction.clear("students");
        await transaction.putMany(
          "students",
          students.filter((student) => student.id !== permanent.student.id),
        );
      },
    );
    await closeTick(permanentStore);
    const permanentRawAfter = await fx.readAll(
      permanent.databaseName,
      "students",
    );
    const permanentState = await generationState(permanent.databaseName);
    await fx.putOne(
      permanent.databaseName,
      "students",
      structuredClone(permanent.raw),
    );
    const permanentReplay = await failureCode(permanent.databaseName);
    await fx.deleteOne(
      permanent.databaseName,
      "students",
      permanent.student.id,
    );
    const recreateStore = new core.IndexedDbDataStore({
      databaseName: permanent.databaseName,
    });
    await recreateStore.transaction(
      "readwrite",
      ["students"],
      async (transaction) =>
        transaction.putMany("students", [
          {
            ...permanent.student,
            notes: "Tombstone sonrasında meşru yeni kayıt",
            updatedAt: "2026-08-28T09:00:00.000Z",
          },
        ]),
    );
    await closeTick(recreateStore);
    const recreatedRaw = await fx.readAll<Record<string, unknown>>(
      permanent.databaseName,
      "students",
    );
    const recreatedGeneration = (
      recreatedRaw[0]?.[vaultModule.STUDENT_VAULT_ENVELOPE_FIELD] as
        | { recordGeneration?: number }
        | undefined
    )?.recordGeneration;
    await fx.putOne(
      permanent.databaseName,
      "students",
      structuredClone(permanent.raw),
    );
    const replayAfterRecreate = await failureCode(permanent.databaseName);

    const pendingWithMain = await createReady("PENDING-MAIN");
    await prepareDeleteIntent(pendingWithMain.databaseName);
    const pendingWithMainState = await generationState(
      pendingWithMain.databaseName,
    );
    const pendingWithMainCode = await failureCode(
      pendingWithMain.databaseName,
    );

    const pendingDeleted = await createReady("PENDING-DELETED");
    await prepareDeleteIntent(pendingDeleted.databaseName);
    await fx.deleteOne(
      pendingDeleted.databaseName,
      "students",
      pendingDeleted.student.id,
    );
    const pendingDeletedStore = new core.IndexedDbDataStore({
      databaseName: pendingDeleted.databaseName,
    });
    const pendingDeletedCount = (await pendingDeletedStore.readSnapshot())
      .students.length;
    await closeTick(pendingDeletedStore);
    const pendingDeletedState = await generationState(
      pendingDeleted.databaseName,
    );

    const pendingReplay = await createReady("PENDING-REPLAY");
    await prepareDeleteIntent(pendingReplay.databaseName);
    await fx.deleteOne(
      pendingReplay.databaseName,
      "students",
      pendingReplay.student.id,
    );
    await fx.putOne(
      pendingReplay.databaseName,
      "students",
      structuredClone(pendingReplay.raw),
    );
    const pendingReplayCode = await failureCode(pendingReplay.databaseName);
    return {
      permanent: {
        remaining: permanentRawAfter.length,
        retired: permanentState?.retired,
        generation: permanentState?.currentGeneration,
        pending: permanentState?.pendingRetirementGeneration,
        replay: permanentReplay,
        recreatedGeneration,
        replayAfterRecreate,
      },
      pendingWithMain: {
        retired: pendingWithMainState?.retired,
        generation: pendingWithMainState?.currentGeneration,
        pending: pendingWithMainState?.pendingRetirementGeneration,
        code: pendingWithMainCode,
      },
      pendingDeleted: {
        remaining: pendingDeletedCount,
        retired: pendingDeletedState?.retired,
        generation: pendingDeletedState?.currentGeneration,
        pending: pendingDeletedState?.pendingRetirementGeneration,
      },
      pendingReplayCode,
    };
  });

  expect(result).toEqual({
    permanent: {
      remaining: 0,
      retired: true,
      generation: 2,
      pending: null,
      replay: "LOCAL_VAULT_REPLAY_DETECTED",
      recreatedGeneration: 3,
      replayAfterRecreate: "LOCAL_VAULT_REPLAY_DETECTED",
    },
    pendingWithMain: {
      retired: false,
      generation: 1,
      pending: 2,
      code: "LOCAL_VAULT_REPLAY_DETECTED",
    },
    pendingDeleted: {
      remaining: 0,
      retired: true,
      generation: 2,
      pending: null,
    },
    pendingReplayCode: "LOCAL_VAULT_REPLAY_DETECTED",
  });
});

test("CSPRNG allocator eşzamanlı nonce'ları ayırır; tam key-DB rollback deterministik reuse üretmez ve gerçek çakışmayı reddeder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const vaultModule = await import("/src/core/security/student-sensitive-vault.ts");
    const envelopeModule = await import("/src/core/security/local-vault-envelope.ts");
    const nonceModule = await import("/src/core/security/local-vault-nonce.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const databaseName = `vault-nonce-${crypto.randomUUID()}`;
    const firstVault = new vaultModule.StudentSensitiveVault({ databaseName });
    const secondVault = new vaultModule.StudentSensitiveVault({ databaseName });
    const students = Array.from({ length: 48 }, (_, index) =>
      fx.fictionalStudent(crypto.randomUUID(), `NONCE-${String(index).padStart(2, "0")}`),
    );
    const sealed = await Promise.all(students.map((student, index) =>
      (index % 2 === 0 ? firstVault : secondVault).sealStudentRecord(student, `student:${student.id}`),
    ));
    firstVault.close();
    secondVault.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const ivs = sealed.map((record) => (record[envelopeModule.LOCAL_VAULT_ENVELOPE_FIELD] as unknown as { iv: string }).iv);
    const keyDatabase = vaultModule.studentSensitiveKeyDatabaseName(databaseName);
    const allocator = await fx.readOne<Record<string, unknown>>(keyDatabase, nonceModule.LOCAL_VAULT_NONCE_STORE_NAME, envelopeModule.LOCAL_VAULT_KEY_ID);
    const reservations = await fx.readAll<Record<string, unknown>>(keyDatabase, nonceModule.LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME);
    await fx.clearStore(keyDatabase, nonceModule.LOCAL_VAULT_NONCE_RESERVATION_STORE_NAME);
    await fx.putOne(keyDatabase, nonceModule.LOCAL_VAULT_NONCE_STORE_NAME, {
      ...allocator,
      nextAuditCounter: "0",
      revision: 0,
    });
    const rollbackVault = new vaultModule.StudentSensitiveVault({ databaseName });
    const rollbackStudent = fx.fictionalStudent(crypto.randomUUID(), "ROLLBACK");
    const rollbackSealed = await rollbackVault.sealStudentRecord(
      rollbackStudent,
      `student:${rollbackStudent.id}`,
    );
    rollbackVault.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rollbackIv = (
      rollbackSealed[envelopeModule.LOCAL_VAULT_ENVELOPE_FIELD] as unknown as {
        iv: string;
      }
    ).iv;
    const replayBytes = envelopeModule.base64ToBytes(rollbackIv);
    const collisionCrypto = {
      subtle: new Proxy(crypto.subtle, {
        get(target, property) {
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }),
      getRandomValues<T extends ArrayBufferView>(target: T): T {
        new Uint8Array(target.buffer, target.byteOffset, target.byteLength).set(
          replayBytes,
        );
        return target;
      },
      randomUUID: crypto.randomUUID.bind(crypto),
    } as Crypto;
    const collisionVault = new vaultModule.StudentSensitiveVault({
      databaseName,
      crypto: collisionCrypto,
    });
    let collisionCode = "NO_ERROR";
    try {
      const student = fx.fictionalStudent(crypto.randomUUID(), "COLLISION");
      await collisionVault.sealStudentRecord(student, `student:${student.id}`);
    } catch (error) {
      collisionCode = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
    } finally {
      collisionVault.close();
    }
    return {
      ivCount: ivs.length,
      uniqueIvCount: new Set(ivs).size,
      auditCounter: allocator?.nextAuditCounter,
      reservationCount: reservations.length,
      rollbackIvWasFresh: !ivs.includes(rollbackIv),
      collisionCode,
    };
  });

  expect(result).toEqual({
    ivCount: 48,
    uniqueIvCount: 48,
    auditCounter: "48",
    reservationCount: 48,
    rollbackIvWasFresh: true,
    collisionCode: "LOCAL_VAULT_NONCE_REUSE",
  });
});

test("iki eşzamanlı legacy migration tek atomik cutover ile aynı kanonik sonuca ulaşır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journal = await import("/src/core/security/local-vault-migration-journal.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const databaseName = `vault-concurrent-migration-${crypto.randomUUID()}`;
    const students = Array.from({ length: 12 }, (_, index) =>
      fx.fictionalStudent(crypto.randomUUID(), `MIG-${String(index).padStart(2, "0")}`),
    );
    await fx.createLegacyMainDatabase(databaseName, students);
    const first = new core.IndexedDbDataStore({ databaseName });
    const second = new core.IndexedDbDataStore({ databaseName });
    const [firstSnapshot, secondSnapshot] = await Promise.all([first.readSnapshot(), second.readSnapshot()]);
    first.close();
    second.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const raw = await fx.readAll<Record<string, unknown>>(databaseName, "students");
    const keyDatabase = vault.studentSensitiveKeyDatabaseName(databaseName);
    const journalRecord = await fx.readOne<Record<string, unknown>>(
      keyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    const shadows = await fx.readAll<Record<string, unknown>>(keyDatabase, journal.LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME);
    const fences = await fx.readAll<Record<string, unknown>>(keyDatabase, journal.LOCAL_VAULT_MIGRATION_FENCE_STORE_NAME);
    return {
      firstExact:
        core.canonicalJson(firstSnapshot.students.toSorted((left, right) => left.id.localeCompare(right.id))) ===
        core.canonicalJson(students.toSorted((left, right) => left.id.localeCompare(right.id))),
      secondExact:
        core.canonicalJson(secondSnapshot.students.toSorted((left, right) => left.id.localeCompare(right.id))) ===
        core.canonicalJson(students.toSorted((left, right) => left.id.localeCompare(right.id))),
      rawCount: raw.length,
      allV2: raw.every((record) =>
        (record[vault.STUDENT_VAULT_ENVELOPE_FIELD] as { version?: number })?.version === 2,
      ),
      phase: journalRecord?.phase,
      shadowCount: shadows.length,
      fenceCount: fences.length,
    };
  });

  expect(result).toEqual({
    firstExact: true,
    secondExact: true,
    rawCount: 12,
    allV2: true,
    phase: "ready",
    shadowCount: 0,
    fenceCount: 0,
  });
});

test("nonce rezervasyonu sonrası crash plaintext kaynağı korur ve sonraki koşum idempotent devam eder", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journal = await import("/src/core/security/local-vault-migration-journal.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const databaseName = `vault-crash-stage-${crypto.randomUUID()}`;
    const student = fx.fictionalStudent("00000000-0000-4000-8000-00000000d601", "CRASH-STAGE");
    await fx.createLegacyMainDatabase(databaseName, [student]);
    let injected = false;
    const crashing = new core.IndexedDbDataStore({
      databaseName,
      sensitiveVault: {
        onMigrationCheckpoint(checkpoint: string) {
          if (!injected && checkpoint.includes(":nonce-reserved:students:")) {
            injected = true;
            throw new Error("KURGU_NONCE_CRASH");
          }
        },
      },
    });
    let crashMessage = "NO_ERROR";
    try {
      await crashing.readSnapshot();
    } catch (error) {
      crashMessage = error instanceof Error ? error.message : "UNKNOWN";
    } finally {
      crashing.close();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rawAfterCrash = await fx.readAll<Record<string, unknown>>(databaseName, "students");
    const readyAfterCrash = await fx.readReadyState(databaseName);
    const keyDatabase = vault.studentSensitiveKeyDatabaseName(databaseName);
    const journalAfterCrash = await fx.readOne<Record<string, unknown>>(
      keyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    const resumed = new core.IndexedDbDataStore({ databaseName });
    const resumedStudent = (await resumed.readSnapshot()).students[0];
    resumed.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rawAfterResume = await fx.readAll<Record<string, unknown>>(databaseName, "students");
    const journalAfterResume = await fx.readOne<Record<string, unknown>>(
      keyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    return {
      crashMessage,
      plaintextPreserved:
        rawAfterCrash[0].displayName === student.displayName &&
        !(vault.STUDENT_VAULT_ENVELOPE_FIELD in rawAfterCrash[0]),
      readyAfterCrash,
      phaseAfterCrash: journalAfterCrash?.phase,
      resumedExact: core.canonicalJson(resumedStudent) === core.canonicalJson(student),
      rawVersionAfterResume: (rawAfterResume[0][vault.STUDENT_VAULT_ENVELOPE_FIELD] as { version?: number })?.version,
      phaseAfterResume: journalAfterResume?.phase,
    };
  });

  expect(result).toEqual({
    crashMessage: "KURGU_NONCE_CRASH",
    plaintextPreserved: true,
    readyAfterCrash: undefined,
    phaseAfterCrash: "staging",
    resumedExact: true,
    rawVersionAfterResume: 2,
    phaseAfterResume: "ready",
  });
});

test("cutover commit sonrası crash hazır marker üzerinden günlüğü uzlaştırır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journal = await import("/src/core/security/local-vault-migration-journal.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const databaseName = `vault-crash-cutover-${crypto.randomUUID()}`;
    const student = fx.fictionalStudent("00000000-0000-4000-8000-00000000d701", "CRASH-CUTOVER");
    await fx.createLegacyMainDatabase(databaseName, [student]);
    let injected = false;
    const crashing = new core.IndexedDbDataStore({
      databaseName,
      sensitiveVault: {
        onMigrationCheckpoint(checkpoint: string) {
          if (!injected && checkpoint === "student-vault-v2:cutover-committed") {
            injected = true;
            throw new Error("KURGU_CUTOVER_CRASH");
          }
        },
      },
    });
    let crashMessage = "NO_ERROR";
    try {
      await crashing.readSnapshot();
    } catch (error) {
      crashMessage = error instanceof Error ? error.message : "UNKNOWN";
    } finally {
      crashing.close();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rawAfterCrash = await fx.readAll<Record<string, unknown>>(databaseName, "students");
    const readyAfterCrash = await fx.readReadyState(databaseName);
    const keyDatabase = vault.studentSensitiveKeyDatabaseName(databaseName);
    const journalAfterCrash = await fx.readOne<Record<string, unknown>>(
      keyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    const shadowsAfterCrash = await fx.readAll<Record<string, unknown>>(keyDatabase, journal.LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME);
    const resumed = new core.IndexedDbDataStore({ databaseName });
    const resumedStudent = (await resumed.readSnapshot()).students[0];
    resumed.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const journalAfterResume = await fx.readOne<Record<string, unknown>>(
      keyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    const shadowsAfterResume = await fx.readAll<Record<string, unknown>>(keyDatabase, journal.LOCAL_VAULT_MIGRATION_SHADOW_STORE_NAME);
    return {
      crashMessage,
      rawVersion: (rawAfterCrash[0][vault.STUDENT_VAULT_ENVELOPE_FIELD] as { version?: number })?.version,
      readyState: (readyAfterCrash as { state?: string } | undefined)?.state,
      phaseAfterCrash: journalAfterCrash?.phase,
      shadowsAfterCrash: shadowsAfterCrash.length,
      resumedExact: core.canonicalJson(resumedStudent) === core.canonicalJson(student),
      phaseAfterResume: journalAfterResume?.phase,
      shadowsAfterResume: shadowsAfterResume.length,
    };
  });

  expect(result).toEqual({
    crashMessage: "KURGU_CUTOVER_CRASH",
    rawVersion: 2,
    readyState: "ready",
    phaseAfterCrash: "cutover-pending",
    shadowsAfterCrash: 1,
    resumedExact: true,
    phaseAfterResume: "ready",
    shadowsAfterResume: 0,
  });
});

test("doğrulanmış main hazırken silinen journal yeniden kurulur; journal hazır/main plaintext rollback yeni nesille taşınır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journal = await import("/src/core/security/local-vault-migration-journal.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");

    const mainAheadDatabase = `vault-main-ahead-${crypto.randomUUID()}`;
    const mainAheadStudent = fx.fictionalStudent(crypto.randomUUID(), "MAIN-AHEAD");
    const mainAheadStore = new core.IndexedDbDataStore({ databaseName: mainAheadDatabase });
    await mainAheadStore.transaction("readwrite", ["students"], async (transaction) =>
      transaction.putMany("students", [mainAheadStudent]),
    );
    mainAheadStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mainAheadRawBefore = await fx.readAll<Record<string, unknown>>(mainAheadDatabase, "students");
    const mainAheadKeyDatabase = vault.studentSensitiveKeyDatabaseName(mainAheadDatabase);
    await fx.deleteOne(
      mainAheadKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    const mainAheadReopen = new core.IndexedDbDataStore({ databaseName: mainAheadDatabase });
    const mainAheadOpened = (await mainAheadReopen.readSnapshot()).students[0];
    mainAheadReopen.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mainAheadRawAfter = await fx.readAll<Record<string, unknown>>(mainAheadDatabase, "students");
    const recreatedJournal = await fx.readOne<Record<string, unknown>>(
      mainAheadKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );

    const journalAheadDatabase = `vault-journal-ahead-${crypto.randomUUID()}`;
    const journalAheadStudent = fx.fictionalStudent(crypto.randomUUID(), "JOURNAL-AHEAD");
    await fx.createLegacyMainDatabase(journalAheadDatabase, [journalAheadStudent]);
    const firstMigration = new core.IndexedDbDataStore({ databaseName: journalAheadDatabase });
    await firstMigration.readSnapshot();
    firstMigration.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const journalAheadKeyDatabase = vault.studentSensitiveKeyDatabaseName(journalAheadDatabase);
    const firstJournal = await fx.readOne<Record<string, unknown>>(
      journalAheadKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    await fx.putOne(journalAheadDatabase, "students", journalAheadStudent);
    await fx.deleteOne(
      journalAheadDatabase,
      core.STUDENT_VAULT_STATE_STORE_NAME,
      vault.STUDENT_VAULT_READY_STATE_ID,
    );
    const secondMigration = new core.IndexedDbDataStore({ databaseName: journalAheadDatabase });
    const journalAheadOpened = (await secondMigration.readSnapshot()).students[0];
    secondMigration.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const secondJournal = await fx.readOne<Record<string, unknown>>(
      journalAheadKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    const journalAheadRaw = await fx.readAll<Record<string, unknown>>(journalAheadDatabase, "students");
    return {
      mainAheadExact: core.canonicalJson(mainAheadOpened) === core.canonicalJson(mainAheadStudent),
      mainCiphertextUnchanged:
        core.canonicalJson(mainAheadRawBefore) === core.canonicalJson(mainAheadRawAfter),
      recreated: {
        phase: recreatedJournal?.phase,
        generation: recreatedJournal?.generation,
      },
      journalAheadExact:
        core.canonicalJson(journalAheadOpened) === core.canonicalJson(journalAheadStudent),
      generations: [firstJournal?.generation, secondJournal?.generation],
      secondPhase: secondJournal?.phase,
      secondRawVersion: (
        journalAheadRaw[0][vault.STUDENT_VAULT_ENVELOPE_FIELD] as {
          version?: number;
        }
      )?.version,
    };
  });

  expect(result).toEqual({
    mainAheadExact: true,
    mainCiphertextUnchanged: true,
    recreated: { phase: "ready", generation: 1 },
    journalAheadExact: true,
    generations: [1, 2],
    secondPhase: "ready",
    secondRawVersion: 2,
  });
});

test("doğrulanmış main journal staging/verifying rollback'ini ve kayıp ready marker'ı idempotent onarır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journal = await import("/src/core/security/local-vault-migration-journal.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const closeTick = async (store: InstanceType<typeof core.IndexedDbDataStore>) => {
      store.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
    };
    const createReady = async (marker: string) => {
      const databaseName = `vault-split-repair-${marker}-${crypto.randomUUID()}`;
      const student = fx.fictionalStudent(crypto.randomUUID(), marker);
      const store = new core.IndexedDbDataStore({ databaseName });
      await store.transaction("readwrite", ["students"], async (transaction) =>
        transaction.putMany("students", [student]),
      );
      await closeTick(store);
      return { databaseName, student };
    };

    const journalBehind = await createReady("JOURNAL-BEHIND");
    const journalKeyDatabase = vault.studentSensitiveKeyDatabaseName(
      journalBehind.databaseName,
    );
    const oldJournal = await fx.readOne<Record<string, unknown>>(
      journalKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    await fx.putOne(
      journalKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      { ...oldJournal, phase: "staging" },
    );
    const journalReopen = new core.IndexedDbDataStore({
      databaseName: journalBehind.databaseName,
    });
    const journalOpened = (await journalReopen.readSnapshot()).students[0];
    await closeTick(journalReopen);
    const repairedJournal = await fx.readOne<Record<string, unknown>>(
      journalKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );

    const verifyingBehind = await createReady("VERIFYING-BEHIND");
    const verifyingKeyDatabase = vault.studentSensitiveKeyDatabaseName(
      verifyingBehind.databaseName,
    );
    const verifyingJournal = await fx.readOne<Record<string, unknown>>(
      verifyingKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );
    await fx.putOne(
      verifyingKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      { ...verifyingJournal, phase: "verifying" },
    );
    const verifyingReopen = new core.IndexedDbDataStore({
      databaseName: verifyingBehind.databaseName,
    });
    const verifyingOpened = (await verifyingReopen.readSnapshot()).students[0];
    await closeTick(verifyingReopen);
    const repairedVerifying = await fx.readOne<Record<string, unknown>>(
      verifyingKeyDatabase,
      journal.LOCAL_VAULT_MIGRATION_JOURNAL_STORE_NAME,
      vault.STUDENT_VAULT_MIGRATION_ID,
    );

    const markerMissing = await createReady("MARKER-MISSING");
    await fx.deleteOne(
      markerMissing.databaseName,
      core.STUDENT_VAULT_STATE_STORE_NAME,
      vault.STUDENT_VAULT_READY_STATE_ID,
    );
    const markerReopen = new core.IndexedDbDataStore({
      databaseName: markerMissing.databaseName,
    });
    const markerOpened = (await markerReopen.readSnapshot()).students[0];
    await closeTick(markerReopen);
    const repairedMarker = await fx.readReadyState(markerMissing.databaseName);
    const markerRaw = await fx.readAll<Record<string, unknown>>(
      markerMissing.databaseName,
      "students",
    );
    return {
      journalExact:
        core.canonicalJson(journalOpened) ===
        core.canonicalJson(journalBehind.student),
      journalRepair: {
        phase: repairedJournal?.phase,
        generation: repairedJournal?.generation,
      },
      verifyingExact:
        core.canonicalJson(verifyingOpened) ===
        core.canonicalJson(verifyingBehind.student),
      verifyingRepair: {
        phase: repairedVerifying?.phase,
        generation: repairedVerifying?.generation,
      },
      markerExact:
        core.canonicalJson(markerOpened) ===
        core.canonicalJson(markerMissing.student),
      markerState: (repairedMarker as { state?: string } | undefined)?.state,
      markerRawGeneration: (
        markerRaw[0]?.[vault.STUDENT_VAULT_ENVELOPE_FIELD] as
          | { recordGeneration?: number }
          | undefined
      )?.recordGeneration,
    };
  });

  expect(result).toEqual({
    journalExact: true,
    journalRepair: { phase: "ready", generation: 2 },
    verifyingExact: true,
    verifyingRepair: { phase: "ready", generation: 2 },
    markerExact: true,
    markerState: "ready",
    markerRawGeneration: 1,
  });
});

test("stale fence revision journal mutasyonunu reddeder ve açık kullanıcı eylemi iki IndexedDB'yi kriptografik siler", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const journalModule = await import("/src/core/security/local-vault-migration-journal.ts");
    const idbSecurity = await import("/src/core/security/local-vault-idb.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const databaseName = `vault-erase-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    const student = fx.fictionalStudent(crypto.randomUUID(), "ERASE");
    await store.transaction("readwrite", ["students"], async (transaction) =>
      transaction.putMany("students", [student]),
    );
    const keyDatabaseName = vault.studentSensitiveKeyDatabaseName(databaseName);
    const keyDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(keyDatabaseName);
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error), { once: true });
    });
    const migrationJournal = new journalModule.LocalVaultMigrationJournal(keyDatabase);
    const now = Date.now();
    const firstLease = await migrationJournal.acquireFence({
      migrationId: vault.STUDENT_VAULT_MIGRATION_ID,
      ownerId: "kurgu-stale-owner",
      nowMs: now,
      leaseMs: 30_000,
    });
    const renewedLease = await migrationJournal.renewFence({
      lease: firstLease,
      nowMs: now + 1,
      leaseMs: 30_000,
    });
    let staleMutationCode = "NO_ERROR";
    try {
      await migrationJournal.clearShadows(vault.STUDENT_VAULT_MIGRATION_ID, {
        lease: firstLease,
        nowMs: now + 2,
      });
    } catch (error) {
      staleMutationCode = error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "UNKNOWN";
    }
    await migrationJournal.releaseFence(renewedLease);
    keyDatabase.close();
    const legacyKey = (await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )) as CryptoKey;
    await fx.putOne(keyDatabaseName, vault.STUDENT_SENSITIVE_KEY_STORE_NAME, {
      id: vault.STUDENT_SENSITIVE_KEY_ID,
      algorithm: "AES-GCM",
      version: 1,
      key: legacyKey,
    });
    await store.cryptographicallyEraseAllData();
    const names = (await indexedDB.databases()).map((entry) => entry.name);
    const fallbackCalls: number[] = [];
    const fakeDatabase = {
      transaction(...args: unknown[]) {
        fallbackCalls.push(args.length);
        if (args.length === 3) throw new TypeError("durability unsupported");
        return {} as IDBTransaction;
      },
    } as IDBDatabase;
    const fallback = idbSecurity.openLocalVaultReadwriteTransaction(
      fakeDatabase,
      "kurgu-store",
    );

    const partialDatabaseName = `vault-erase-partial-${crypto.randomUUID()}`;
    const partialStore = new core.IndexedDbDataStore({
      databaseName: partialDatabaseName,
    });
    const partialStudent = fx.fictionalStudent(
      crypto.randomUUID(),
      "ERASE-PARTIAL",
    );
    await partialStore.transaction(
      "readwrite",
      ["students"],
      async (transaction) => transaction.putMany("students", [partialStudent]),
    );
    partialStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const partialKeyDatabaseName = vault.studentSensitiveKeyDatabaseName(
      partialDatabaseName,
    );
    const partialBlocker = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(partialKeyDatabaseName);
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      });
      request.addEventListener("error", () => reject(request.error), {
        once: true,
      });
    });
    let partialEraseMessage = "NO_ERROR";
    try {
      await core.cryptographicallyEraseIndexedDbData({
        databaseName: partialDatabaseName,
        blockedTimeoutMs: 25,
      });
    } catch (error) {
      partialEraseMessage = error instanceof Error ? error.message : "UNKNOWN";
    }
    const namesDuringPartial = (await indexedDB.databases()).map(
      (entry) => entry.name,
    );
    partialBlocker.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await core.cryptographicallyEraseIndexedDbData({
      databaseName: partialDatabaseName,
      blockedTimeoutMs: 250,
    });
    const namesAfterRetry = (await indexedDB.databases()).map(
      (entry) => entry.name,
    );

    const mainPartialDatabaseName =
      `vault-erase-main-partial-${crypto.randomUUID()}`;
    const mainPartialStore = new core.IndexedDbDataStore({
      databaseName: mainPartialDatabaseName,
    });
    const mainPartialStudent = fx.fictionalStudent(
      crypto.randomUUID(),
      "ERASE-MAIN-PARTIAL",
    );
    await mainPartialStore.transaction(
      "readwrite",
      ["students"],
      async (transaction) =>
        transaction.putMany("students", [mainPartialStudent]),
    );
    mainPartialStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mainPartialKeyDatabaseName = vault.studentSensitiveKeyDatabaseName(
      mainPartialDatabaseName,
    );
    const mainPartialBlocker = await new Promise<IDBDatabase>(
      (resolve, reject) => {
        const request = indexedDB.open(mainPartialDatabaseName);
        request.addEventListener("success", () => resolve(request.result), {
          once: true,
        });
        request.addEventListener("error", () => reject(request.error), {
          once: true,
        });
      },
    );
    let mainPartialEraseMessage = "NO_ERROR";
    try {
      await core.cryptographicallyEraseIndexedDbData({
        databaseName: mainPartialDatabaseName,
        blockedTimeoutMs: 25,
      });
    } catch (error) {
      mainPartialEraseMessage =
        error instanceof Error ? error.message : "UNKNOWN";
    }
    const namesDuringMainPartial = (await indexedDB.databases()).map(
      (entry) => entry.name,
    );
    mainPartialBlocker.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await core.cryptographicallyEraseIndexedDbData({
      databaseName: mainPartialDatabaseName,
      blockedTimeoutMs: 250,
    });
    const namesAfterMainPartialRetry = (await indexedDB.databases()).map(
      (entry) => entry.name,
    );

    const lateDatabaseName = `vault-key-late-${crypto.randomUUID()}`;
    const lateKeyDatabaseName = vault.studentSensitiveKeyDatabaseName(
      lateDatabaseName,
    );
    const lateBlocker = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(lateKeyDatabaseName, 3);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore(vault.STUDENT_SENSITIVE_KEY_STORE_NAME, {
          keyPath: "id",
        });
      });
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      });
      request.addEventListener("error", () => reject(request.error), {
        once: true,
      });
    });
    const lateVault = new vault.StudentSensitiveVault({
      databaseName: lateDatabaseName,
    });
    const lateStudent = fx.fictionalStudent(crypto.randomUUID(), "KEY-LATE");
    let lateOpenMessage = "NO_ERROR";
    try {
      await lateVault.sealStudentRecord(
        lateStudent,
        `student:${lateStudent.id}`,
      );
    } catch (error) {
      lateOpenMessage = error instanceof Error ? error.message : "UNKNOWN";
    }
    lateBlocker.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const lateVersion = (await indexedDB.databases()).find(
      (entry) => entry.name === lateKeyDatabaseName,
    )?.version;
    lateVault.close();
    return {
      staleMutationCode,
      mainExists: names.includes(databaseName),
      keyDatabaseExists: names.includes(keyDatabaseName),
      durabilityFallback: fallback.durability,
      durabilityCallShape: fallbackCalls,
      partialEraseFailed: partialEraseMessage !== "NO_ERROR",
      partialState: {
        main: namesDuringPartial.includes(partialDatabaseName),
        key: namesDuringPartial.includes(partialKeyDatabaseName),
      },
      retryState: {
        main: namesAfterRetry.includes(partialDatabaseName),
        key: namesAfterRetry.includes(partialKeyDatabaseName),
      },
      mainPartialEraseFailed: mainPartialEraseMessage !== "NO_ERROR",
      mainPartialState: {
        main: namesDuringMainPartial.includes(mainPartialDatabaseName),
        key: namesDuringMainPartial.includes(mainPartialKeyDatabaseName),
      },
      mainPartialRetryState: {
        main: namesAfterMainPartialRetry.includes(mainPartialDatabaseName),
        key: namesAfterMainPartialRetry.includes(
          mainPartialKeyDatabaseName,
        ),
      },
      lateOpenFailed: lateOpenMessage !== "NO_ERROR",
      lateVersion,
    };
  });

  expect(result).toEqual({
    staleMutationCode: "LOCAL_VAULT_MIGRATION_BUSY",
    mainExists: false,
    keyDatabaseExists: false,
    durabilityFallback: "browser-default",
    durabilityCallShape: [3, 2],
    partialEraseFailed: true,
    partialState: { main: true, key: true },
    retryState: { main: false, key: false },
    mainPartialEraseFailed: true,
    mainPartialState: { main: true, key: false },
    mainPartialRetryState: { main: false, key: false },
    lateOpenFailed: true,
    lateVersion: 3,
  });
});

test("eksik anahtar recovery-only, mixed plaintext ve şifreleme hatası atomik fail-closed davranır", async ({ page }) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import("/src/core/security/student-sensitive-vault.ts");
    const fx = await import("/tests/fixtures/local-vault-browser.ts");
    const failureCode = async (databaseName: string) => {
      const store = new core.IndexedDbDataStore({ databaseName });
      try {
        await store.readSnapshot();
        return "NO_ERROR";
      } catch (error) {
        return error && typeof error === "object" && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.message
            : "UNKNOWN";
      } finally {
        store.close();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    const missingKeyDatabase = `vault-missing-key-${crypto.randomUUID()}`;
    const missingStudent = fx.fictionalStudent(crypto.randomUUID(), "MISSING-KEY");
    const missingStore = new core.IndexedDbDataStore({ databaseName: missingKeyDatabase });
    await missingStore.transaction("readwrite", ["students"], async (transaction) => transaction.putMany("students", [missingStudent]));
    missingStore.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const missingRawBefore = await fx.readAll<Record<string, unknown>>(missingKeyDatabase, "students");
    await fx.deleteDatabase(vault.studentSensitiveKeyDatabaseName(missingKeyDatabase));
    const missingKeyCode = await failureCode(missingKeyDatabase);
    const missingRawAfter = await fx.readAll<Record<string, unknown>>(missingKeyDatabase, "students");

    const mixedDatabase = `vault-mixed-${crypto.randomUUID()}`;
    const mixedStudents = [fx.fictionalStudent(crypto.randomUUID(), "MIXED-A"), fx.fictionalStudent(crypto.randomUUID(), "MIXED-B")];
    const mixedStore = new core.IndexedDbDataStore({ databaseName: mixedDatabase });
    await mixedStore.transaction("readwrite", ["students"], async (transaction) => transaction.putMany("students", mixedStudents));
    mixedStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fx.putOne(mixedDatabase, "students", mixedStudents[0]);
    await fx.deleteOne(
      mixedDatabase,
      core.STUDENT_VAULT_STATE_STORE_NAME,
      vault.STUDENT_VAULT_READY_STATE_ID,
    );
    const mixedCode = await failureCode(mixedDatabase);

    const atomicDatabase = `vault-encrypt-failure-${crypto.randomUUID()}`;
    const subtle = new Proxy(crypto.subtle, {
      get(target, property) {
        if (property === "encrypt") {
          return async () => {
            throw new DOMException("Kurgu encrypt hatası", "OperationError");
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const failingCrypto = {
      subtle,
      getRandomValues: crypto.getRandomValues.bind(crypto),
      randomUUID: crypto.randomUUID.bind(crypto),
    } as unknown as Crypto;
    const atomicStore = new core.IndexedDbDataStore({
      databaseName: atomicDatabase,
      sensitiveVault: { crypto: failingCrypto },
    });
    await atomicStore.readSnapshot();
    let encryptionCode = "NO_ERROR";
    try {
      await atomicStore.transaction("readwrite", ["students", "settings"], async (transaction) => {
        await transaction.putMany("students", [fx.fictionalStudent(crypto.randomUUID(), "ATOMIC")]);
        await transaction.putMany("settings", [{
          id: crypto.randomUUID(),
          createdAt: "2026-08-28T06:00:00.000Z",
          updatedAt: "2026-08-28T06:00:00.000Z",
          civilDate: "2026-08-28",
          deletedAt: null,
          schemaVersion: 1,
          key: "kurgu-atomic",
          value: "yazılmamalı",
        }]);
      });
    } catch (error) {
      encryptionCode = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
    }
    atomicStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const atomicStudents = await fx.readAll(atomicDatabase, "students");
    const atomicSettings = await fx.readAll(atomicDatabase, "settings");
    return {
      missingKeyCode,
      missingCiphertextUnchanged: core.canonicalJson(missingRawBefore) === core.canonicalJson(missingRawAfter),
      mixedCode,
      encryptionCode,
      atomicCounts: [atomicStudents.length, atomicSettings.length],
    };
  });

  expect(result).toEqual({
    missingKeyCode: "LOCAL_VAULT_RECOVERY_REQUIRED",
    missingCiphertextUnchanged: true,
    mixedCode: "LOCAL_VAULT_MIXED_VERSION",
    encryptionCode: "LOCAL_VAULT_ENCRYPTION_FAILED",
    atomicCounts: [0, 0],
  });
});
