import type { StoredRecord } from "../domain/model.ts";
import type { RecoverySnapshotRecord } from "../repository/contracts.ts";

export const STUDENT_SENSITIVE_ENVELOPE_FIELD =
  "__maarifosStudentSensitive" as const;

export const STUDENT_SENSITIVE_KEY_STORE_NAME = "keys";
export const STUDENT_SENSITIVE_KEY_ID = "student-sensitive-aes-gcm-v1";

const STUDENT_SENSITIVE_KEY_DATABASE_SUFFIX =
  "--maarifos-student-sensitive-keys";
const STUDENT_SENSITIVE_KEY_DATABASE_VERSION = 1;
const STUDENT_SENSITIVE_ENVELOPE_VERSION = 1 as const;
const STUDENT_SENSITIVE_ALGORITHM = "AES-GCM" as const;
const STUDENT_SENSITIVE_IV_BYTES = 12;
const STUDENT_SENSITIVE_KEY_BITS = 256;
const STUDENT_SENSITIVE_CONTEXT = "maarifos/student-sensitive/v1";

type StudentSensitiveCipherEnvelope = {
  version: typeof STUDENT_SENSITIVE_ENVELOPE_VERSION;
  algorithm: typeof STUDENT_SENSITIVE_ALGORITHM;
  iv: string;
  ciphertext: string;
};

type StudentSensitivePayload = {
  version: typeof STUDENT_SENSITIVE_ENVELOPE_VERSION;
  nationalIdentityNumber?: string;
  contactPhones: Array<{ id: string; phone: string }>;
  careDetails?: Record<string, string | boolean>;
};

type SensitiveStudentRecord = StoredRecord & {
  [STUDENT_SENSITIVE_ENVELOPE_FIELD]?: StudentSensitiveCipherEnvelope;
};

type KeyRecord = {
  id: typeof STUDENT_SENSITIVE_KEY_ID;
  algorithm: typeof STUDENT_SENSITIVE_ALGORITHM;
  version: typeof STUDENT_SENSITIVE_ENVELOPE_VERSION;
  key: CryptoKey;
};

export interface StudentSensitiveVaultOptions {
  databaseName: string;
  crypto?: Crypto;
  indexedDb?: IDBFactory;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () =>
        reject(
          request.error ??
            new Error("Hassas veri anahtar deposu isteği tamamlanamadı."),
        ),
      { once: true },
    );
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ??
            new Error("Hassas veri anahtar işlemi geri alındı."),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(
          transaction.error ??
            new Error("Hassas veri anahtar işlemi başarısız oldu."),
        ),
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

function base64ToBytes(
  value: string,
  expectedLength?: number,
): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (
    (expectedLength !== undefined && bytes.length !== expectedLength) ||
    bytesToBase64(bytes) !== value
  ) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  return bytes;
}

function assertCipherEnvelope(
  value: unknown,
): asserts value is StudentSensitiveCipherEnvelope {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !==
      "algorithm,ciphertext,iv,version" ||
    value.version !== STUDENT_SENSITIVE_ENVELOPE_VERSION ||
    value.algorithm !== STUDENT_SENSITIVE_ALGORITHM ||
    typeof value.iv !== "string" ||
    typeof value.ciphertext !== "string"
  ) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
  base64ToBytes(value.iv, STUDENT_SENSITIVE_IV_BYTES);
  if (base64ToBytes(value.ciphertext).length < 16) {
    throw new Error("Hassas veri şifreli zarfı doğrulanamadı.");
  }
}

function assertCryptoKey(value: unknown): asserts value is CryptoKey {
  const algorithm =
    value instanceof CryptoKey
      ? (value.algorithm as Partial<AesKeyAlgorithm>)
      : undefined;
  if (
    !(value instanceof CryptoKey) ||
    value.type !== "secret" ||
    value.extractable ||
    algorithm?.name !== STUDENT_SENSITIVE_ALGORITHM ||
    algorithm.length !== STUDENT_SENSITIVE_KEY_BITS ||
    !value.usages.includes("encrypt") ||
    !value.usages.includes("decrypt")
  ) {
    throw new Error("Hassas veri anahtarı doğrulanamadı.");
  }
}

function assertKeyRecord(value: unknown): asserts value is KeyRecord {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(",") !== "algorithm,id,key,version" ||
    value.id !== STUDENT_SENSITIVE_KEY_ID ||
    value.algorithm !== STUDENT_SENSITIVE_ALGORITHM ||
    value.version !== STUDENT_SENSITIVE_ENVELOPE_VERSION
  ) {
    throw new Error("Hassas veri anahtar kaydı doğrulanamadı.");
  }
  assertCryptoKey(value.key);
}

function contactRecords(record: StoredRecord): Record<string, unknown>[] {
  if (record.contacts === undefined) return [];
  if (!Array.isArray(record.contacts)) {
    throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
  }
  return record.contacts.map((contact) => {
    if (!isRecord(contact) || typeof contact.id !== "string") {
      throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
    }
    return contact;
  });
}

const STUDENT_CARE_DETAIL_LIMITS = {
  homeAddress: 500,
  allergies: 500,
  dietaryNeeds: 500,
  medicationNotes: 500,
  emergencyNotes: 1_000,
  physicianName: 120,
  physicianPhone: 30,
  medicalDevices: 500,
  guardianEmail: 254,
  familyEducationNeeds: 1_000,
  familyParticipationPreferences: 1_000,
  permissionFormDate: 10,
} as const;

const STUDENT_CARE_BOOLEAN_FIELDS = new Set([
  "photoVideoPermissionOnFile",
  "fieldTripPermissionOnFile",
  "digitalCommunicationPermissionOnFile",
]);

function careDetailsRecord(value: unknown): Record<string, string | boolean> {
  if (!isRecord(value)) {
    throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
  }
  const keys = Object.keys(value);
  if (
    keys.length === 0 ||
    keys.some(
      (key) =>
        !(key in STUDENT_CARE_DETAIL_LIMITS) &&
        !STUDENT_CARE_BOOLEAN_FIELDS.has(key),
    )
  ) {
    throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
  }
  const normalized: Record<string, string | boolean> = {};
  for (const key of keys) {
    const fieldValue = value[key];
    if (STUDENT_CARE_BOOLEAN_FIELDS.has(key)) {
      if (fieldValue !== true) {
        throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
      }
      normalized[key] = true;
      continue;
    }
    const limit = STUDENT_CARE_DETAIL_LIMITS[
      key as keyof typeof STUDENT_CARE_DETAIL_LIMITS
    ];
    if (
      typeof fieldValue !== "string" ||
      !fieldValue.trim() ||
      fieldValue.length > limit
    ) {
      throw new Error("Hassas öğrenci sağlık ve güvenlik verisi doğrulanamadı.");
    }
    normalized[key] = fieldValue;
  }
  return normalized;
}

function containsPlaintext(record: StoredRecord): boolean {
  if (Object.prototype.hasOwnProperty.call(record, "nationalIdentityNumber")) {
    return true;
  }
  if (Object.prototype.hasOwnProperty.call(record, "careDetails")) return true;
  return contactRecords(record).some((contact) =>
    Object.prototype.hasOwnProperty.call(contact, "phone"),
  );
}

function hasContactMetadata(record: StoredRecord): boolean {
  return contactRecords(record).length > 0;
}

function utf8Bytes(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);
  const bytes = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  bytes.set(encoded);
  return bytes;
}

function sensitiveSubject(
  databaseName: string,
  subject: string,
): Uint8Array<ArrayBuffer> {
  return utf8Bytes(
    `${STUDENT_SENSITIVE_CONTEXT}\n${databaseName}\n${subject}`,
  );
}

function extractSensitivePayload(record: StoredRecord): {
  publicRecord: StoredRecord;
  payload: StudentSensitivePayload | null;
} {
  const publicRecord = structuredClone(record) as SensitiveStudentRecord;
  if (publicRecord[STUDENT_SENSITIVE_ENVELOPE_FIELD] !== undefined) {
    throw new Error("Hassas öğrenci kaydı iki kez şifrelenemez.");
  }

  const payload: StudentSensitivePayload = {
    version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
    contactPhones: [],
  };
  if (Object.prototype.hasOwnProperty.call(publicRecord, "nationalIdentityNumber")) {
    if (
      typeof publicRecord.nationalIdentityNumber !== "string" ||
      !publicRecord.nationalIdentityNumber
    ) {
      throw new Error("Hassas öğrenci kimlik verisi doğrulanamadı.");
    }
    payload.nationalIdentityNumber = publicRecord.nationalIdentityNumber;
    delete publicRecord.nationalIdentityNumber;
  }

  if (Object.prototype.hasOwnProperty.call(publicRecord, "careDetails")) {
    payload.careDetails = careDetailsRecord(publicRecord.careDetails);
    delete publicRecord.careDetails;
  }

  if (publicRecord.contacts !== undefined) {
    const contacts = contactRecords(publicRecord);
    const contactIds = new Set<string>();
    publicRecord.contacts = contacts.map((contact) => {
      if (contactIds.has(contact.id as string)) {
        throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
      }
      contactIds.add(contact.id as string);
      if (typeof contact.phone !== "string" || !contact.phone) {
        throw new Error("Hassas öğrenci iletişim verisi doğrulanamadı.");
      }
      payload.contactPhones.push({
        id: contact.id as string,
        phone: contact.phone,
      });
      const publicContact = structuredClone(contact);
      delete publicContact.phone;
      return publicContact;
    });
  }

  const hasSensitiveValue =
    payload.nationalIdentityNumber !== undefined ||
    payload.careDetails !== undefined ||
    payload.contactPhones.length > 0;
  return { publicRecord, payload: hasSensitiveValue ? payload : null };
}

function parseSensitivePayload(value: unknown): StudentSensitivePayload {
  if (
    !isRecord(value) ||
    value.version !== STUDENT_SENSITIVE_ENVELOPE_VERSION ||
    !Array.isArray(value.contactPhones) ||
    (value.nationalIdentityNumber !== undefined &&
      (typeof value.nationalIdentityNumber !== "string" ||
        !value.nationalIdentityNumber)) ||
    Object.keys(value).some(
      (key) =>
        key !== "version" &&
        key !== "nationalIdentityNumber" &&
        key !== "contactPhones" &&
        key !== "careDetails",
    )
  ) {
    throw new Error("Hassas öğrenci verisi doğrulanamadı.");
  }
  const ids = new Set<string>();
  const contactPhones = value.contactPhones.map((entry) => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).sort().join(",") !== "id,phone" ||
      typeof entry.id !== "string" ||
      !entry.id ||
      ids.has(entry.id) ||
      typeof entry.phone !== "string" ||
      !entry.phone
    ) {
      throw new Error("Hassas öğrenci verisi doğrulanamadı.");
    }
    ids.add(entry.id);
    return { id: entry.id, phone: entry.phone };
  });
  return {
    version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
    ...(typeof value.nationalIdentityNumber === "string"
      ? { nationalIdentityNumber: value.nationalIdentityNumber }
      : {}),
    contactPhones,
    ...(value.careDetails !== undefined
      ? { careDetails: careDetailsRecord(value.careDetails) }
      : {}),
  };
}

function restoreSensitivePayload(
  publicRecord: StoredRecord,
  payload: StudentSensitivePayload,
): StoredRecord {
  const restored = structuredClone(publicRecord) as SensitiveStudentRecord;
  delete restored[STUDENT_SENSITIVE_ENVELOPE_FIELD];
  const contacts = contactRecords(restored);
  const phoneByContact = new Map(
    payload.contactPhones.map((contact) => [contact.id, contact.phone]),
  );
  if (
    contacts.length !== phoneByContact.size ||
    contacts.some((contact) => !phoneByContact.has(contact.id as string))
  ) {
    throw new Error("Hassas öğrenci verisi doğrulanamadı.");
  }
  if (contacts.length > 0) {
    restored.contacts = contacts.map((contact) => ({
      ...contact,
      phone: phoneByContact.get(contact.id as string) as string,
    }));
  }
  if (payload.nationalIdentityNumber !== undefined) {
    restored.nationalIdentityNumber = payload.nationalIdentityNumber;
  }
  if (payload.careDetails !== undefined) {
    restored.careDetails = structuredClone(payload.careDetails);
  }
  return restored;
}

export function studentSensitiveKeyDatabaseName(
  applicationDatabaseName: string,
): string {
  return `${applicationDatabaseName}${STUDENT_SENSITIVE_KEY_DATABASE_SUFFIX}`;
}

export function hasSealedStudentSensitiveData(record: StoredRecord): boolean {
  return (
    (record as SensitiveStudentRecord)[STUDENT_SENSITIVE_ENVELOPE_FIELD] !==
    undefined
  );
}

export function hasPlaintextStudentSensitiveData(
  record: StoredRecord,
): boolean {
  return containsPlaintext(record);
}

export class StudentSensitiveVault {
  private readonly applicationDatabaseName: string;
  private readonly keyDatabaseName: string;
  private readonly cryptoProvider: Crypto;
  private readonly indexedDb: IDBFactory;
  private keyDatabasePromise: Promise<IDBDatabase> | undefined;
  private keyPromise: Promise<CryptoKey> | undefined;

  constructor(options: StudentSensitiveVaultOptions) {
    this.applicationDatabaseName = options.databaseName;
    this.keyDatabaseName = studentSensitiveKeyDatabaseName(
      options.databaseName,
    );
    const cryptoProvider = options.crypto ?? globalThis.crypto;
    const indexedDb = options.indexedDb ?? globalThis.indexedDB;
    if (!cryptoProvider?.subtle || !indexedDb) {
      throw new Error("Hassas veri kasası bu ortamda kullanılamıyor.");
    }
    this.cryptoProvider = cryptoProvider;
    this.indexedDb = indexedDb;
  }

  async sealStudentRecord(
    record: StoredRecord,
    subject: string,
  ): Promise<StoredRecord> {
    if (hasSealedStudentSensitiveData(record)) {
      throw new Error("Hassas öğrenci kaydı iki kez şifrelenemez.");
    }
    const { publicRecord, payload } = extractSensitivePayload(record);
    if (!payload) return publicRecord;
    const key = await this.getOrCreateKey();
    const iv = new Uint8Array(
      new ArrayBuffer(STUDENT_SENSITIVE_IV_BYTES),
    );
    this.cryptoProvider.getRandomValues(iv);
    let ciphertext: ArrayBuffer;
    try {
      ciphertext = await this.cryptoProvider.subtle.encrypt(
        {
          name: STUDENT_SENSITIVE_ALGORITHM,
          iv,
          additionalData: sensitiveSubject(
            this.applicationDatabaseName,
            subject,
          ),
          tagLength: 128,
        },
        key,
        utf8Bytes(JSON.stringify(payload)),
      );
    } catch {
      throw new Error("Hassas öğrenci verisi güvenle şifrelenemedi.");
    }
    (publicRecord as SensitiveStudentRecord)[
      STUDENT_SENSITIVE_ENVELOPE_FIELD
    ] = {
      version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
      algorithm: STUDENT_SENSITIVE_ALGORITHM,
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    };
    return publicRecord;
  }

  async openStudentRecord(
    record: StoredRecord,
    subject: string,
    options: { allowLegacyPlaintext?: boolean } = {},
  ): Promise<StoredRecord> {
    const envelope = (record as SensitiveStudentRecord)[
      STUDENT_SENSITIVE_ENVELOPE_FIELD
    ];
    if (envelope === undefined) {
      if (containsPlaintext(record)) {
        if (options.allowLegacyPlaintext) return structuredClone(record);
        throw new Error(
          "Hassas öğrenci verisi güvenli depoya taşınmadan açılamaz.",
        );
      }
      if (hasContactMetadata(record)) {
        throw new Error("Hassas öğrenci verisi doğrulanamadı.");
      }
      return structuredClone(record);
    }
    if (containsPlaintext(record)) {
      throw new Error("Hassas öğrenci verisi doğrulanamadı.");
    }
    assertCipherEnvelope(envelope);
    const key = await this.getExistingKey();
    let plaintext: ArrayBuffer;
    try {
      plaintext = await this.cryptoProvider.subtle.decrypt(
        {
          name: STUDENT_SENSITIVE_ALGORITHM,
          iv: base64ToBytes(envelope.iv, STUDENT_SENSITIVE_IV_BYTES),
          additionalData: sensitiveSubject(
            this.applicationDatabaseName,
            subject,
          ),
          tagLength: 128,
        },
        key,
        base64ToBytes(envelope.ciphertext),
      );
    } catch {
      throw new Error(
        "Hassas öğrenci verisi doğrulanamadı; erişim güvenlik nedeniyle durduruldu.",
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
    } catch {
      throw new Error("Hassas öğrenci verisi doğrulanamadı.");
    }
    return restoreSensitivePayload(record, parseSensitivePayload(parsed));
  }

  async sealRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
  ): Promise<RecoverySnapshotRecord> {
    const sealed = structuredClone(snapshot);
    sealed.envelope.payload.students = await Promise.all(
      sealed.envelope.payload.students.map((student) =>
        this.sealStudentRecord(
          student,
          this.recoveryStudentSubject(snapshot.id, student.id),
        ),
      ),
    );
    return sealed;
  }

  async openRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
    options: { allowLegacyPlaintext?: boolean } = {},
  ): Promise<RecoverySnapshotRecord> {
    const opened = structuredClone(snapshot);
    const students = opened?.envelope?.payload?.students;
    if (!Array.isArray(students)) {
      throw new Error("Kurtarma snapshot hassas veri yapısı doğrulanamadı.");
    }
    opened.envelope.payload.students = await Promise.all(
      students.map((student) =>
        this.openStudentRecord(
          student,
          this.recoveryStudentSubject(snapshot.id, student.id),
          options,
        ),
      ),
    );
    return opened;
  }

  async migrateStudentRecord(
    record: StoredRecord,
    subject: string,
  ): Promise<{ record: StoredRecord; changed: boolean }> {
    if (hasSealedStudentSensitiveData(record)) {
      await this.openStudentRecord(record, subject);
      return { record: structuredClone(record), changed: false };
    }
    if (containsPlaintext(record)) {
      return {
        record: await this.sealStudentRecord(record, subject),
        changed: true,
      };
    }
    await this.openStudentRecord(record, subject);
    return { record: structuredClone(record), changed: false };
  }

  async migrateRecoverySnapshot(
    snapshot: RecoverySnapshotRecord,
  ): Promise<{ snapshot: RecoverySnapshotRecord; changed: boolean }> {
    const migrated = structuredClone(snapshot);
    const students = migrated?.envelope?.payload?.students;
    if (!Array.isArray(students)) {
      throw new Error("Kurtarma snapshot hassas veri yapısı doğrulanamadı.");
    }
    let changed = false;
    migrated.envelope.payload.students = await Promise.all(
      students.map(async (student) => {
        const result = await this.migrateStudentRecord(
          student,
          this.recoveryStudentSubject(snapshot.id, student.id),
        );
        changed ||= result.changed;
        return result.record;
      }),
    );
    return { snapshot: migrated, changed };
  }

  close(): void {
    const current = this.keyDatabasePromise;
    this.keyDatabasePromise = undefined;
    this.keyPromise = undefined;
    if (current) {
      void current
        .then((database) => database.close())
        .catch(() => undefined);
    }
  }

  private recoveryStudentSubject(snapshotId: string, studentId: string): string {
    return `recovery:${snapshotId}:student:${studentId}`;
  }

  private getOrCreateKey(): Promise<CryptoKey> {
    return this.resolveKey(true);
  }

  private getExistingKey(): Promise<CryptoKey> {
    return this.resolveKey(false);
  }

  private resolveKey(createIfMissing: boolean): Promise<CryptoKey> {
    if (!this.keyPromise) {
      const pending = this.loadKey(createIfMissing);
      this.keyPromise = pending;
      void pending.catch(() => {
        if (this.keyPromise === pending) this.keyPromise = undefined;
      });
    }
    return this.keyPromise;
  }

  private async loadKey(createIfMissing: boolean): Promise<CryptoKey> {
    const database = await this.openKeyDatabase();
    let generated: CryptoKey | undefined;
    if (createIfMissing) {
      try {
        generated = (await this.cryptoProvider.subtle.generateKey(
          {
            name: STUDENT_SENSITIVE_ALGORITHM,
            length: STUDENT_SENSITIVE_KEY_BITS,
          },
          false,
          ["encrypt", "decrypt"],
        )) as CryptoKey;
      } catch {
        throw new Error("Hassas veri anahtarı güvenle üretilemedi.");
      }
      assertCryptoKey(generated);
    }

    const transaction = database.transaction(
      STUDENT_SENSITIVE_KEY_STORE_NAME,
      createIfMissing ? "readwrite" : "readonly",
    );
    const completion = transactionResult(transaction);
    try {
      const store = transaction.objectStore(STUDENT_SENSITIVE_KEY_STORE_NAME);
      const existing = await requestResult(
        store.get(STUDENT_SENSITIVE_KEY_ID) as IDBRequest<KeyRecord | undefined>,
      );
      if (existing) {
        assertKeyRecord(existing);
        await completion;
        return existing.key;
      }
      if (!generated) {
        throw new Error(
          "Hassas veri anahtarı bulunamadı; erişim güvenlik nedeniyle durduruldu.",
        );
      }
      const record: KeyRecord = {
        id: STUDENT_SENSITIVE_KEY_ID,
        algorithm: STUDENT_SENSITIVE_ALGORITHM,
        version: STUDENT_SENSITIVE_ENVELOPE_VERSION,
        key: generated,
      };
      await requestResult(store.add(record));
      await completion;
      return generated;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Tamamlanan işlemin özgün güvenlik hatasını koru.
      }
      await completion.catch(() => undefined);
      if (error instanceof Error && error.message.startsWith("Hassas veri")) {
        throw error;
      }
      throw new Error("Hassas veri anahtar deposu doğrulanamadı.");
    }
  }

  private openKeyDatabase(): Promise<IDBDatabase> {
    if (!this.keyDatabasePromise) {
      const opening = new Promise<IDBDatabase>((resolve, reject) => {
        const request = this.indexedDb.open(
          this.keyDatabaseName,
          STUDENT_SENSITIVE_KEY_DATABASE_VERSION,
        );
        request.addEventListener("upgradeneeded", () => {
          if (
            !request.result.objectStoreNames.contains(
              STUDENT_SENSITIVE_KEY_STORE_NAME,
            )
          ) {
            request.result.createObjectStore(
              STUDENT_SENSITIVE_KEY_STORE_NAME,
              { keyPath: "id" },
            );
          }
        });
        request.addEventListener(
          "success",
          () => {
            const database = request.result;
            database.addEventListener("versionchange", () => {
              database.close();
              if (this.keyDatabasePromise === opening) {
                this.keyDatabasePromise = undefined;
                this.keyPromise = undefined;
              }
            });
            resolve(database);
          },
          { once: true },
        );
        request.addEventListener(
          "blocked",
          () =>
            reject(
              new Error("Hassas veri anahtar deposu başka bir sekmede açık."),
            ),
          { once: true },
        );
        request.addEventListener(
          "error",
          () =>
            reject(
              request.error ??
                new Error("Hassas veri anahtar deposu açılamadı."),
            ),
          { once: true },
        );
      });
      this.keyDatabasePromise = opening;
      void opening.catch(() => {
        if (this.keyDatabasePromise === opening) {
          this.keyDatabasePromise = undefined;
        }
      });
    }
    return this.keyDatabasePromise;
  }
}
