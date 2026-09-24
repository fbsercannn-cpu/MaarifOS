import {
  COLLECTION_NAMES,
  RECOVERY_SNAPSHOT_STORE_NAME,
  STUDENT_VAULT_STATE_STORE_NAME,
  type StoredRecord,
} from "../../src/core/index.ts";
import {
  STUDENT_SENSITIVE_ENVELOPE_FIELD,
  STUDENT_SENSITIVE_KEY_ID,
  STUDENT_SENSITIVE_KEY_STORE_NAME,
  studentSensitiveKeyDatabaseName,
} from "../../src/core/security/student-sensitive-vault.ts";

export const TEST_TCKN = "10000000146";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error), {
      once: true,
    });
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), {
      once: true,
    });
    transaction.addEventListener("error", () => reject(transaction.error), {
      once: true,
    });
  });
}

export function fictionalStudent(
  id: string,
  marker: string,
  overrides: Record<string, unknown> = {},
): StoredRecord {
  return {
    id,
    createdAt: "2026-08-28T06:00:00.000Z",
    updatedAt: "2026-08-28T06:00:00.000Z",
    civilDate: "2026-08-28",
    deletedAt: null,
    schemaVersion: 7,
    displayName: `Kurgu Çocuk ${marker}`,
    firstName: "Kurgu",
    lastName: `Çocuk ${marker}`,
    preferredName: `Kurgu ${marker}`,
    birthDate: "2021-09-15",
    optionalCode: `OGR-${marker}`,
    nationalIdentityNumber: TEST_TCKN,
    enrollmentYear: "2025",
    homeLanguages: `Kurgu dil ${marker}`,
    interests: `Kurgu ilgi ${marker}`,
    strengths: `Kurgu güçlü yön ${marker}`,
    supportPreferences: `Kurgu destek ${marker}`,
    contacts: [
      {
        id: id.replace(/.$/, "f"),
        kind: "mother",
        relationship: "Anne",
        name: `Kurgu Veli ${marker}`,
        phone: "+905550001122",
        isPrimary: true,
        isEmergencyContact: true,
      },
    ],
    careDetails: {
      allergies: `Kurgu alerji ${marker}`,
      homeAddress: `Kurgu adres ${marker}`,
      guardianEmail: `kurgu.${marker.toLocaleLowerCase("tr-TR")}@example.com`,
      photoVideoPermissionOnFile: true,
      permissionFormDate: "2026-08-28",
    },
    profilePhotoDataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    profileSchemaVersion: 8,
    notes: `Kurgu öğretmen notu ${marker}`,
    active: true,
    enrollmentStatus: "active",
    ...overrides,
  };
}

export async function createLegacyMainDatabase(
  databaseName: string,
  students: readonly StoredRecord[],
  recoverySnapshots: readonly unknown[] = [],
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 6);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      for (const collection of COLLECTION_NAMES) {
        if (!database.objectStoreNames.contains(collection)) {
          database.createObjectStore(collection, { keyPath: "id" });
        }
      }
      if (!database.objectStoreNames.contains(RECOVERY_SNAPSHOT_STORE_NAME)) {
        const recovery = database.createObjectStore(
          RECOVERY_SNAPSHOT_STORE_NAME,
          { keyPath: "id" },
        );
        recovery.createIndex("by-created-at", "createdAt");
      }
      const studentStore = request.transaction?.objectStore("students");
      if (!studentStore) throw new Error("Kurgu student store açılamadı.");
      for (const student of students) studentStore.put(structuredClone(student));
      const recoveryStore = request.transaction?.objectStore(
        RECOVERY_SNAPSHOT_STORE_NAME,
      );
      if (!recoveryStore) throw new Error("Kurgu recovery store açılamadı.");
      for (const snapshot of recoverySnapshots) {
        recoveryStore.put(structuredClone(snapshot));
      }
    });
    request.addEventListener("success", () => {
      request.result.close();
      resolve();
    });
    request.addEventListener("error", () => reject(request.error));
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

export async function createLegacyV1Database(
  databaseName: string,
  student: StoredRecord,
): Promise<void> {
  const legacyKey = (await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )) as CryptoKey;
  const publicRecord = structuredClone(student) as StoredRecord;
  const contacts = (publicRecord.contacts as Array<Record<string, unknown>>) ?? [];
  const payload = {
    version: 1,
    optionalCode: publicRecord.optionalCode,
    nationalIdentityNumber: publicRecord.nationalIdentityNumber,
    contactPhones: contacts.map((contact) => ({
      id: contact.id,
      phone: contact.phone,
    })),
    contactNames: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
    })),
    careDetails: publicRecord.careDetails,
  };
  delete publicRecord.optionalCode;
  delete publicRecord.nationalIdentityNumber;
  delete publicRecord.careDetails;
  publicRecord.contacts = contacts.map((contact) => {
    const result = structuredClone(contact);
    delete result.phone;
    delete result.name;
    return result;
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(
        `maarifos/student-sensitive/v1\n${databaseName}\nstudent:${student.id}`,
      ),
      tagLength: 128,
    },
    legacyKey,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  publicRecord[STUDENT_SENSITIVE_ENVELOPE_FIELD] = {
    version: 1,
    algorithm: "AES-GCM",
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  await createLegacyMainDatabase(databaseName, [publicRecord]);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(studentSensitiveKeyDatabaseName(databaseName), 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(STUDENT_SENSITIVE_KEY_STORE_NAME, {
        keyPath: "id",
      });
    });
    request.addEventListener("success", () => {
      const database = request.result;
      const transaction = database.transaction(
        STUDENT_SENSITIVE_KEY_STORE_NAME,
        "readwrite",
      );
      transaction.objectStore(STUDENT_SENSITIVE_KEY_STORE_NAME).add({
        id: STUDENT_SENSITIVE_KEY_ID,
        algorithm: "AES-GCM",
        version: 1,
        key: legacyKey,
      });
      transaction.addEventListener("complete", () => {
        database.close();
        resolve();
      });
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
    request.addEventListener("error", () => reject(request.error));
  });
}

export async function readAll<T>(
  databaseName: string,
  storeName: string,
): Promise<T[]> {
  const database = await requestResult(indexedDB.open(databaseName));
  const transaction = database.transaction(storeName, "readonly");
  const completion = transactionResult(transaction);
  const values = await requestResult(
    transaction.objectStore(storeName).getAll() as IDBRequest<T[]>,
  );
  await completion;
  database.close();
  return structuredClone(values);
}

export async function readOne<T>(
  databaseName: string,
  storeName: string,
  id: IDBValidKey,
): Promise<T | undefined> {
  const database = await requestResult(indexedDB.open(databaseName));
  const transaction = database.transaction(storeName, "readonly");
  const completion = transactionResult(transaction);
  const value = await requestResult(
    transaction.objectStore(storeName).get(id) as IDBRequest<T | undefined>,
  );
  await completion;
  database.close();
  return structuredClone(value);
}

export async function putOne(
  databaseName: string,
  storeName: string,
  value: unknown,
): Promise<void> {
  const database = await requestResult(indexedDB.open(databaseName));
  const transaction = database.transaction(storeName, "readwrite");
  const completion = transactionResult(transaction);
  await requestResult(transaction.objectStore(storeName).put(structuredClone(value)));
  await completion;
  database.close();
}

export async function clearStore(
  databaseName: string,
  storeName: string,
): Promise<void> {
  const database = await requestResult(indexedDB.open(databaseName));
  const transaction = database.transaction(storeName, "readwrite");
  const completion = transactionResult(transaction);
  await requestResult(transaction.objectStore(storeName).clear());
  await completion;
  database.close();
}

export async function deleteOne(
  databaseName: string,
  storeName: string,
  id: IDBValidKey,
): Promise<void> {
  const database = await requestResult(indexedDB.open(databaseName));
  const transaction = database.transaction(storeName, "readwrite");
  const completion = transactionResult(transaction);
  await requestResult(transaction.objectStore(storeName).delete(id));
  await completion;
  database.close();
}

export async function deleteDatabase(databaseName: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.addEventListener("success", () => resolve(), { once: true });
    request.addEventListener("blocked", () => reject(new Error("Kurgu DB silme bloklandı.")), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

export async function readReadyState(databaseName: string): Promise<unknown> {
  return readOne(
    databaseName,
    STUDENT_VAULT_STATE_STORE_NAME,
    "students-v2",
  );
}
