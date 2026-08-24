import { expect, test, type Page } from "@playwright/test";

async function configureEmptyOriginClassroom(page: Page): Promise<void> {
  const setup = page.getByRole("dialog", { name: "Sınıfını hazırla" });
  await expect(setup).toBeVisible({ timeout: 15_000 });
  await setup.getByLabel("Okul adı").fill("Kurgu Güvenli Anaokulu");
  await setup.getByLabel("Öğretmen adı soyadı").fill("Kurgu Öğretmen");
  await setup.getByLabel("Sınıf adı").fill("Kurgu Güvenli Sınıf");
  await setup.getByLabel("Maarif Modeli yaş grubu").selectOption({
    label: "60–72 ay",
  });
  await setup.getByText("Takvim ayrıntıları", { exact: true }).click();
  await setup.getByLabel("Eğitim yılı", { exact: true }).fill("2025–2026");
  await setup.getByLabel("Eğitim yılı başlangıcı").fill("2025-09-01");
  await setup.getByLabel("Eğitim yılı bitişi").fill("2026-08-31");
  await setup.getByText("İleri ayarlar", { exact: true }).click();
  await setup.getByLabel("Çalışma düzeni", { exact: true }).selectOption("morning");
  await setup.getByRole("button", { name: "Sınıfımı hazırla" }).click();
  await expect(setup).toBeHidden();
}

test("TCKN, veli telefonu ve sağlık bilgileri raw IndexedDB kaydında görünmez; public API, restart ve yedek round-trip kayıpsızdır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import(
      "/src/core/security/student-sensitive-vault.ts"
    );
    const databaseName = `maarifos-sensitive-${crypto.randomUUID()}`;
    const targetDatabaseName = `maarifos-sensitive-target-${crypto.randomUUID()}`;
    const academicYearId = "00000000-0000-4000-8000-00000000e101";
    const classroomId = "00000000-0000-4000-8000-00000000e102";
    const studentId = "00000000-0000-4000-8000-00000000e103";
    const contactId = "00000000-0000-4000-8000-00000000e104";
    const identity = "10000000146";
    const phone = "+905551112233";
    const allergy = "Kurgu fındık alerjisi";
    const homeAddress = "Kurgu Mahallesi 12, Denizli";
    const guardianEmail = "kurgu.veli@example.com";
    const physicianName = "Dr. Kurgu Hekim";
    const familyNeed = "Kurgu aile eğitimi ihtiyacı";
    const timestamp = "2026-08-21T08:00:00.000Z";
    const base = {
      createdAt: timestamp,
      updatedAt: timestamp,
      civilDate: "2026-08-21",
      deletedAt: null,
      schemaVersion: 7,
    };

    const readAll = <T>(name: string, objectStoreName: string): Promise<T[]> =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction(objectStoreName, "readonly");
          const getAll = transaction.objectStore(objectStoreName).getAll();
          getAll.addEventListener("success", () => {
            const records = structuredClone(getAll.result) as T[];
            transaction.addEventListener("complete", () => {
              database.close();
              resolve(records);
            });
          });
          getAll.addEventListener("error", () => reject(getAll.error));
        });
        request.addEventListener("error", () => reject(request.error));
      });

    const source = new core.IndexedDbDataStore({ databaseName });
    await source.transaction(
      "readwrite",
      ["academicYears", "classrooms", "students"],
      async (transaction) => {
        await transaction.putMany("academicYears", [
          {
            ...base,
            id: academicYearId,
            schemaVersion: 1,
            name: "2026-2027",
            startDate: "2026-08-21",
            endDate: "2027-06-30",
            status: "active",
          },
        ]);
        await transaction.putMany("classrooms", [
          {
            ...base,
            id: classroomId,
            schemaVersion: 2,
            academicYearId,
            name: "Güneş Sınıfı",
            schedule: {
              kind: "full_day",
              startTime: "08:30",
              endTime: "16:30",
              timeZone: "Europe/Istanbul",
            },
          },
        ]);
        await transaction.putMany("students", [
          {
            ...base,
            id: studentId,
            schemaVersion: 7,
            academicYearId,
            classroomId,
            displayName: "Kurgu Öğrenci",
            firstName: "Kurgu",
            lastName: "Öğrenci",
            nationalIdentityNumber: identity,
            contacts: [
              {
                id: contactId,
                kind: "mother",
                relationship: "Anne",
                name: "Kurgu Veli",
                phone,
                isPrimary: true,
                isEmergencyContact: true,
                isAuthorizedPickup: true,
              },
            ],
            careDetails: {
              allergies: allergy,
              homeAddress,
              emergencyNotes: "Önce anne aranır",
              guardianEmail,
              physicianName,
              familyEducationNeeds: familyNeed,
              photoVideoPermissionOnFile: true,
              permissionFormDate: "2026-08-21",
            },
            profileSchemaVersion: 8,
            active: true,
          },
        ]);
      },
    );

    const publicSnapshot = await source.readSnapshot();
    const listed = await source.listStudentsByClassroom(classroomId);
    const backupService = new core.BackupService(source, {
      appVersion: "student-sensitive-vault-test",
      clock: () => new Date("2026-08-21T09:00:00.000Z"),
      civilDateProvider: () => "2026-08-21",
    });
    const encryptedBackup = await backupService.exportEncryptedBackup(
      "MaarifOS-test-parolasi-2026!",
    );
    const recovery = await backupService.createRecoverySnapshot("manual");
    const rawStudents = await readAll<Record<string, unknown>>(
      databaseName,
      "students",
    );
    const rawRecovery = await readAll<Record<string, unknown>>(
      databaseName,
      core.RECOVERY_SNAPSHOT_STORE_NAME,
    );
    const keyRecords = await readAll<{ key: CryptoKey }>(
      vault.studentSensitiveKeyDatabaseName(databaseName),
      vault.STUDENT_SENSITIVE_KEY_STORE_NAME,
    );
    source.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const restarted = new core.IndexedDbDataStore({ databaseName });
    const restartedSnapshot = await restarted.readSnapshot();
    const restoredRecovery = await restarted.getRecoverySnapshot(recovery.id);
    restarted.close();

    const target = new core.IndexedDbDataStore({
      databaseName: targetDatabaseName,
    });
    await new core.BackupService(target, {
      appVersion: "student-sensitive-vault-test",
    }).restoreEncryptedBackup(
      encryptedBackup,
      "MaarifOS-test-parolasi-2026!",
      { mode: "replace", createRecoverySnapshot: false },
    );
    const restoredSnapshot = await target.readSnapshot();
    const targetRawStudents = await readAll<Record<string, unknown>>(
      targetDatabaseName,
      "students",
    );
    target.close();

    return {
      publicStudent: publicSnapshot.students[0],
      listedStudent: listed[0],
      restartedStudent: restartedSnapshot.students[0],
      recoveryStudent: restoredRecovery?.envelope.payload.students[0],
      restoredStudent: restoredSnapshot.students[0],
      rawStudentText: JSON.stringify(rawStudents),
      rawRecoveryText: JSON.stringify(rawRecovery),
      targetRawStudentText: JSON.stringify(targetRawStudents),
      rawContactPhone:
        (rawStudents[0]?.contacts as Array<Record<string, unknown>> | undefined)?.[0]
          ?.phone,
      cipherAlgorithm: (
        rawStudents[0]?.[vault.STUDENT_SENSITIVE_ENVELOPE_FIELD] as
          | { algorithm?: string }
          | undefined
      )?.algorithm,
      keyExtractable: keyRecords[0]?.key.extractable,
      keyType: keyRecords[0]?.key.type,
    };
  });

  for (const student of [
    result.publicStudent,
    result.listedStudent,
    result.restartedStudent,
    result.recoveryStudent,
    result.restoredStudent,
  ]) {
    expect(student?.nationalIdentityNumber).toBe("10000000146");
    expect(student?.contacts?.[0]?.phone).toBe("+905551112233");
    expect(student?.contacts?.[0]?.isEmergencyContact).toBe(true);
    expect(student?.contacts?.[0]?.isAuthorizedPickup).toBe(true);
    expect(student?.careDetails?.allergies).toBe("Kurgu fındık alerjisi");
    expect(student?.careDetails?.homeAddress).toBe("Kurgu Mahallesi 12, Denizli");
    expect(student?.careDetails?.guardianEmail).toBe("kurgu.veli@example.com");
    expect(student?.careDetails?.physicianName).toBe("Dr. Kurgu Hekim");
    expect(student?.careDetails?.familyEducationNeeds).toBe(
      "Kurgu aile eğitimi ihtiyacı",
    );
    expect(student?.careDetails?.photoVideoPermissionOnFile).toBe(true);
  }
  expect(result.rawStudentText).not.toContain("10000000146");
  expect(result.rawStudentText).not.toContain("+905551112233");
  expect(result.rawStudentText).not.toContain("Kurgu fındık alerjisi");
  expect(result.rawStudentText).not.toContain("kurgu.veli@example.com");
  expect(result.rawStudentText).not.toContain("Dr. Kurgu Hekim");
  expect(result.rawStudentText).not.toContain("Kurgu aile eğitimi ihtiyacı");
  expect(result.rawStudentText).not.toContain("Kurgu Mahallesi 12, Denizli");
  expect(result.rawStudentText).not.toContain('"careDetails"');
  expect(result.rawRecoveryText).not.toContain("10000000146");
  expect(result.rawRecoveryText).not.toContain("+905551112233");
  expect(result.rawRecoveryText).not.toContain("Kurgu fındık alerjisi");
  expect(result.rawRecoveryText).not.toContain("Kurgu Mahallesi 12, Denizli");
  expect(result.targetRawStudentText).not.toContain("10000000146");
  expect(result.targetRawStudentText).not.toContain("+905551112233");
  expect(result.targetRawStudentText).not.toContain("Kurgu fındık alerjisi");
  expect(result.targetRawStudentText).not.toContain("Kurgu Mahallesi 12, Denizli");
  expect(result.rawContactPhone).toBeUndefined();
  expect(result.cipherAlgorithm).toBe("AES-GCM");
  expect(result.keyExtractable).toBe(false);
  expect(result.keyType).toBe("secret");
});

test("legacy plaintext ilk güvenli açılışta atomik ve idempotent biçimde taşınır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import(
      "/src/core/security/student-sensitive-vault.ts"
    );
    const databaseName = `maarifos-sensitive-legacy-${crypto.randomUUID()}`;
    const identity = "10000000146";
    const phone = "+905559998877";
    const student = {
      id: "00000000-0000-4000-8000-00000000e201",
      createdAt: "2026-08-21T08:00:00.000Z",
      updatedAt: "2026-08-21T08:00:00.000Z",
      civilDate: "2026-08-21",
      deletedAt: null,
      schemaVersion: 6,
      displayName: "Legacy Kurgu",
      nationalIdentityNumber: identity,
      contacts: [
        {
          id: "00000000-0000-4000-8000-00000000e202",
          kind: "father",
          relationship: "Baba",
          phone,
          isPrimary: true,
        },
      ],
    };
    const empty = new core.IndexedDbDataStore({ databaseName });
    await empty.readSnapshot();
    empty.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const writeRaw = (record: unknown): Promise<void> =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("students", "readwrite");
          transaction.objectStore("students").put(record);
          transaction.addEventListener("complete", () => {
            database.close();
            resolve();
          });
          transaction.addEventListener("abort", () => reject(transaction.error));
        });
        request.addEventListener("error", () => reject(request.error));
      });
    const readRaw = (): Promise<Record<string, unknown>> =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("students", "readonly");
          const get = transaction.objectStore("students").get(student.id);
          get.addEventListener("success", () => {
            const record = structuredClone(get.result);
            transaction.addEventListener("complete", () => {
              database.close();
              resolve(record);
            });
          });
          get.addEventListener("error", () => reject(get.error));
        });
        request.addEventListener("error", () => reject(request.error));
      });

    await writeRaw(student);
    const firstOpen = new core.IndexedDbDataStore({ databaseName });
    const firstPublic = await firstOpen.readSnapshot();
    firstOpen.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const firstRaw = await readRaw();

    const secondOpen = new core.IndexedDbDataStore({ databaseName });
    const secondPublic = await secondOpen.readSnapshot();
    secondOpen.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const secondRaw = await readRaw();
    const firstEnvelope = firstRaw[vault.STUDENT_SENSITIVE_ENVELOPE_FIELD];
    const secondEnvelope = secondRaw[vault.STUDENT_SENSITIVE_ENVELOPE_FIELD];

    return {
      firstPublic: firstPublic.students[0],
      secondPublic: secondPublic.students[0],
      firstRawText: JSON.stringify(firstRaw),
      secondRawText: JSON.stringify(secondRaw),
      envelopeStable:
        JSON.stringify(firstEnvelope) === JSON.stringify(secondEnvelope),
    };
  });

  expect(result.firstPublic.nationalIdentityNumber).toBe("10000000146");
  expect(result.firstPublic.contacts?.[0]?.phone).toBe("+905559998877");
  expect(result.secondPublic).toEqual(result.firstPublic);
  expect(result.firstRawText).not.toContain("10000000146");
  expect(result.firstRawText).not.toContain("+905559998877");
  expect(result.secondRawText).not.toContain("10000000146");
  expect(result.secondRawText).not.toContain("+905559998877");
  expect(result.envelopeStable).toBe(true);
});

test("tam sayfa reload ve paralel readSnapshot çağrıları aynı origin-local anahtarla hydrate olur", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const seeded = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const databaseName = `maarifos-sensitive-reload-${crypto.randomUUID()}`;
    const store = new core.IndexedDbDataStore({ databaseName });
    await store.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [
        {
          id: "00000000-0000-4000-8000-00000000e251",
          createdAt: "2026-08-21T08:00:00.000Z",
          updatedAt: "2026-08-21T08:00:00.000Z",
          civilDate: "2026-08-21",
          schemaVersion: 6,
          displayName: "Reload Kurgu",
          nationalIdentityNumber: "10000000146",
          contacts: [
            {
              id: "00000000-0000-4000-8000-00000000e252",
              kind: "mother",
              relationship: "Anne",
              phone: "+905550001122",
              isPrimary: true,
            },
          ],
        },
      ]),
    );
    store.close();
    localStorage.setItem("sensitive-reload-database", databaseName);
    return databaseName;
  });

  await page.reload();
  const hydrated = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const databaseName = localStorage.getItem("sensitive-reload-database");
    if (!databaseName) throw new Error("Reload test veritabanı bulunamadı.");
    const first = new core.IndexedDbDataStore({ databaseName });
    const second = new core.IndexedDbDataStore({ databaseName });
    const [snapshotA, snapshotB, snapshotC] = await Promise.all([
      first.readSnapshot(),
      first.readSnapshot(),
      second.readSnapshot(),
    ]);
    first.close();
    second.close();
    return [snapshotA, snapshotB, snapshotC].map((snapshot) => ({
      identity: snapshot.students[0]?.nationalIdentityNumber,
      phone: snapshot.students[0]?.contacts?.[0]?.phone,
    }));
  });

  expect(seeded).toContain("maarifos-sensitive-reload-");
  expect(hydrated).toEqual([
    { identity: "10000000146", phone: "+905550001122" },
    { identity: "10000000146", phone: "+905550001122" },
    { identity: "10000000146", phone: "+905550001122" },
  ]);
});

test("ciphertext değişikliği fail-closed kalır; kaynak ve loglar hassas değer sızdırmaz", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const vault = await import(
      "/src/core/security/student-sensitive-vault.ts"
    );
    const databaseName = `maarifos-sensitive-tamper-${crypto.randomUUID()}`;
    const identity = "10000000146";
    const phone = "+905553334455";
    const student = {
      id: "00000000-0000-4000-8000-00000000e301",
      createdAt: "2026-08-21T08:00:00.000Z",
      updatedAt: "2026-08-21T08:00:00.000Z",
      civilDate: "2026-08-21",
      schemaVersion: 6,
      displayName: "Tamper Kurgu",
      nationalIdentityNumber: identity,
      contacts: [
        {
          id: "00000000-0000-4000-8000-00000000e302",
          kind: "other",
          relationship: "Vasi",
          phone,
          isPrimary: true,
        },
      ],
    };
    const store = new core.IndexedDbDataStore({ databaseName });
    await store.transaction("readwrite", ["students"], (transaction) =>
      transaction.putMany("students", [student]),
    );
    store.close();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tamperedRaw = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("students", "readwrite");
          const objectStore = transaction.objectStore("students");
          const get = objectStore.get(student.id);
          get.addEventListener("success", () => {
            const record = get.result as Record<string, unknown>;
            const envelope = record[
              vault.STUDENT_SENSITIVE_ENVELOPE_FIELD
            ] as { ciphertext: string };
            envelope.ciphertext = `${
              envelope.ciphertext[0] === "A" ? "B" : "A"
            }${envelope.ciphertext.slice(1)}`;
            objectStore.put(record);
            transaction.addEventListener("complete", () => {
              database.close();
              resolve(structuredClone(record));
            });
          });
          get.addEventListener("error", () => reject(get.error));
        });
        request.addEventListener("error", () => reject(request.error));
      },
    );

    const logged: string[] = [];
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    console.error = (...values) => logged.push(values.map(String).join(" "));
    console.warn = (...values) => logged.push(values.map(String).join(" "));
    console.log = (...values) => logged.push(values.map(String).join(" "));
    let errorMessage = "";
    const tamperedStore = new core.IndexedDbDataStore({ databaseName });
    try {
      await tamperedStore.readSnapshot();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      tamperedStore.close();
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    const rawAfter = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("students", "readonly");
          const get = transaction.objectStore("students").get(student.id);
          get.addEventListener("success", () => {
            const record = structuredClone(get.result);
            transaction.addEventListener("complete", () => {
              database.close();
              resolve(record);
            });
          });
          get.addEventListener("error", () => reject(get.error));
        });
        request.addEventListener("error", () => reject(request.error));
      },
    );
    return {
      errorMessage,
      sourceUnchanged: JSON.stringify(rawAfter) === JSON.stringify(tamperedRaw),
      logText: logged.join("\n"),
      rawText: JSON.stringify(rawAfter),
    };
  });

  expect(result.errorMessage).toContain("güvenlik nedeniyle durduruldu");
  expect(result.sourceUnchanged).toBe(true);
  expect(result.logText).not.toContain("10000000146");
  expect(result.logText).not.toContain("+905553334455");
  expect(result.rawText).not.toContain("10000000146");
  expect(result.rawText).not.toContain("+905553334455");
});

test("gecikmeli WebCrypto IDB transaction auto-close üretmez; şifreleme hatası tüm staged işlemi geri alır", async ({
  page,
}) => {
  await page.goto("/tests/runtime-fixture.html");
  const result = await page.evaluate(async () => {
    const core = await import("/src/core/index.ts");
    const delay = (milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds));
    const delayedCrypto = {
      getRandomValues: crypto.getRandomValues.bind(crypto),
      randomUUID: crypto.randomUUID.bind(crypto),
      subtle: {
        generateKey: crypto.subtle.generateKey.bind(crypto.subtle),
        encrypt: async (...args: Parameters<SubtleCrypto["encrypt"]>) => {
          await delay(25);
          return crypto.subtle.encrypt(...args);
        },
        decrypt: async (...args: Parameters<SubtleCrypto["decrypt"]>) => {
          await delay(25);
          return crypto.subtle.decrypt(...args);
        },
      },
    } as unknown as Crypto;
    const delayedDatabase = `maarifos-sensitive-delay-${crypto.randomUUID()}`;
    const student = {
      id: "00000000-0000-4000-8000-00000000e401",
      createdAt: "2026-08-21T08:00:00.000Z",
      updatedAt: "2026-08-21T08:00:00.000Z",
      civilDate: "2026-08-21",
      schemaVersion: 6,
      displayName: "Gecikmeli Kurgu",
      nationalIdentityNumber: "10000000146",
    };
    const setting = {
      id: "00000000-0000-4000-8000-00000000e402",
      createdAt: "2026-08-21T08:00:00.000Z",
      updatedAt: "2026-08-21T08:00:00.000Z",
      civilDate: "2026-08-21",
      schemaVersion: 1,
      settingType: "sensitive-vault-transaction-test",
    };
    const delayedStore = new core.IndexedDbDataStore({
      databaseName: delayedDatabase,
      sensitiveVault: { crypto: delayedCrypto },
    });
    await delayedStore.transaction(
      "readwrite",
      ["students", "settings"],
      async (transaction) => {
        await transaction.putMany("students", [student]);
        await delay(40);
        await transaction.putMany("settings", [setting]);
      },
    );
    await Promise.all([
      delayedStore.transaction("readwrite", ["students"], async (transaction) => {
        await delay(30);
        await transaction.putMany("students", [
          {
            ...student,
            id: "00000000-0000-4000-8000-00000000e403",
            displayName: "Kuyruk Kurgu A",
          },
        ]);
      }),
      delayedStore.transaction("readwrite", ["students"], (transaction) =>
        transaction.putMany("students", [
          {
            ...student,
            id: "00000000-0000-4000-8000-00000000e404",
            displayName: "Kuyruk Kurgu B",
          },
        ]),
      ),
    ]);
    const peerStore = new core.IndexedDbDataStore({
      databaseName: delayedDatabase,
      sensitiveVault: { crypto: delayedCrypto },
    });
    await Promise.all([
      delayedStore.transaction("readwrite", ["students"], async (transaction) => {
        await delay(30);
        await transaction.putMany("students", [
          {
            ...student,
            id: "00000000-0000-4000-8000-00000000e405",
            displayName: "Origin Kuyruk Kurgu A",
          },
        ]);
      }),
      peerStore.transaction("readwrite", ["students"], (transaction) =>
        transaction.putMany("students", [
          {
            ...student,
            id: "00000000-0000-4000-8000-00000000e406",
            displayName: "Origin Kuyruk Kurgu B",
          },
        ]),
      ),
    ]);
    peerStore.close();
    const delayedSnapshot = await delayedStore.readSnapshot();
    delayedStore.close();

    const failingCrypto = {
      getRandomValues: crypto.getRandomValues.bind(crypto),
      randomUUID: crypto.randomUUID.bind(crypto),
      subtle: {
        generateKey: crypto.subtle.generateKey.bind(crypto.subtle),
        decrypt: crypto.subtle.decrypt.bind(crypto.subtle),
        encrypt: async () => {
          await delay(25);
          throw new Error("injected crypto failure");
        },
      },
    } as unknown as Crypto;
    const failingDatabase = `maarifos-sensitive-fail-${crypto.randomUUID()}`;
    const failingStore = new core.IndexedDbDataStore({
      databaseName: failingDatabase,
      sensitiveVault: { crypto: failingCrypto },
    });
    let failureMessage = "";
    try {
      await failingStore.transaction(
        "readwrite",
        ["students", "settings"],
        async (transaction) => {
          await transaction.putMany("students", [student]);
          await transaction.putMany("settings", [setting]);
        },
      );
    } catch (error) {
      failureMessage = error instanceof Error ? error.message : String(error);
    }
    failingStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rawCounts = await new Promise<{ students: number; settings: number }>(
      (resolve, reject) => {
        const request = indexedDB.open(failingDatabase);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction(
            ["students", "settings"],
            "readonly",
          );
          const students = transaction.objectStore("students").count();
          const settings = transaction.objectStore("settings").count();
          transaction.addEventListener("complete", () => {
            database.close();
            resolve({ students: students.result, settings: settings.result });
          });
          transaction.addEventListener("abort", () => reject(transaction.error));
        });
        request.addEventListener("error", () => reject(request.error));
      },
    );

    const legacyFailureDatabase =
      `maarifos-sensitive-legacy-fail-${crypto.randomUUID()}`;
    const legacyInitializer = new core.IndexedDbDataStore({
      databaseName: legacyFailureDatabase,
    });
    await legacyInitializer.readSnapshot();
    legacyInitializer.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(legacyFailureDatabase);
      request.addEventListener("success", () => {
        const database = request.result;
        const transaction = database.transaction("students", "readwrite");
        transaction.objectStore("students").put(student);
        transaction.addEventListener("complete", () => {
          database.close();
          resolve();
        });
        transaction.addEventListener("abort", () => reject(transaction.error));
      });
      request.addEventListener("error", () => reject(request.error));
    });
    const failingLegacyStore = new core.IndexedDbDataStore({
      databaseName: legacyFailureDatabase,
      sensitiveVault: { crypto: failingCrypto },
    });
    let legacyMigrationFailureMessage = "";
    try {
      await failingLegacyStore.readSnapshot();
    } catch (error) {
      legacyMigrationFailureMessage =
        error instanceof Error ? error.message : String(error);
    }
    failingLegacyStore.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const legacyRawAfterFailure = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const request = indexedDB.open(legacyFailureDatabase);
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("students", "readonly");
          const get = transaction.objectStore("students").get(student.id);
          get.addEventListener("success", () => {
            const raw = structuredClone(get.result);
            transaction.addEventListener("complete", () => {
              database.close();
              resolve(raw);
            });
          });
          get.addEventListener("error", () => reject(get.error));
        });
        request.addEventListener("error", () => reject(request.error));
      },
    );
    return {
      delayedIdentity: delayedSnapshot.students[0]?.nationalIdentityNumber,
      serializedStudentCount: delayedSnapshot.students.length,
      delayedSettingCount: delayedSnapshot.settings.length,
      failureMessage,
      rawCounts,
      legacyMigrationFailureMessage,
      legacySourcePreserved:
        legacyRawAfterFailure.nationalIdentityNumber === "10000000146" &&
        legacyRawAfterFailure.__maarifosStudentSensitive === undefined,
    };
  });

  expect(result.delayedIdentity).toBe("10000000146");
  expect(result.serializedStudentCount).toBe(5);
  expect(result.delayedSettingCount).toBe(1);
  expect(result.failureMessage).toContain("güvenle şifrelenemedi");
  expect(result.rawCounts).toEqual({ students: 0, settings: 0 });
  expect(result.legacyMigrationFailureMessage).toContain(
    "güvenle şifrelenemedi",
  );
  expect(result.legacySourcePreserved).toBe(true);
});

test("gerçek boş origin sınıf kurulumu, hassas hızlı kayıt ve reload zinciri kilitlenmez", async ({
  page,
}) => {
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/classroom?native=1");
  const initialDatabases = await page.evaluate(async () =>
    typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((database) => database.name)
      : [],
  );
  expect(initialDatabases).not.toContain("maarifos-local");
  await configureEmptyOriginClassroom(page);

  await page.getByRole("button", { name: "Öğrenci ekle", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Çocuk ekle" });
  await sheet.getByLabel("Çocuğun adı").fill("Kurgu Reload Öğrencisi");
  await sheet.getByLabel("Öğrenci numarası").fill("38");
  await sheet.getByLabel("T.C. kimlik numarası").fill("10000000146");
  await sheet.getByLabel("Yakının adı ve soyadı").fill("Kurgu Reload Veli");
  await sheet.getByLabel("Yakının cep telefonu").fill("0555 000 11 22");
  await sheet
    .getByRole("button", { name: "Kaydet ve kapat", exact: true })
    .click();
  await expect(sheet).toBeHidden();
  await expect(
    page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Kurgu Reload Öğrencisi" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page
      .locator("button.simple-student-list__profile")
      .filter({ hasText: "Kurgu Reload Öğrencisi" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText("Cihazdaki öğretmen kayıtları doğrulanamadı"),
  ).toHaveCount(0);

  const rawText = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open("maarifos-local");
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("students", "readonly");
          const getAll = transaction.objectStore("students").getAll();
          getAll.addEventListener("success", () => {
            const text = JSON.stringify(getAll.result);
            transaction.addEventListener("complete", () => {
              database.close();
              resolve(text);
            });
          });
          getAll.addEventListener("error", () => reject(getAll.error));
        });
        request.addEventListener("error", () => reject(request.error));
      }),
  );
  expect(rawText).not.toContain("10000000146");
  expect(rawText).not.toContain("05550001122");
  expect(rawText).not.toContain("+905550001122");
});
