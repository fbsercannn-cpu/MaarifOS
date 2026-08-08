import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import type { DataTransaction } from "../../core/repository/contracts.ts";

export const LOCAL_TEACHER_IDENTITY_SETTING_ID =
  "00000000-0000-4000-9000-000000000003";
export const LOCAL_TEACHER_IDENTITY_SETTING_TYPE = "local-teacher-identity";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function existingIdentityLatestTimestamp(identity: {
  createdAt: unknown;
  updatedAt: unknown;
  deletedAt?: unknown;
}): string {
  if (!isUtcIso(identity.createdAt)) {
    throw new Error(
      "Yerel öğretmen kimliği createdAt zamanı geçerli UTC ISO biçiminde değil.",
    );
  }
  if (!isUtcIso(identity.updatedAt)) {
    throw new Error(
      "Yerel öğretmen kimliği updatedAt zamanı geçerli UTC ISO biçiminde değil.",
    );
  }
  if (identity.deletedAt !== null && !isUtcIso(identity.deletedAt)) {
    throw new Error(
      "Yerel öğretmen kimliği deletedAt zamanı null veya geçerli UTC ISO biçiminde olmalıdır.",
    );
  }
  if (
    identity.updatedAt < identity.createdAt ||
    (typeof identity.deletedAt === "string" &&
      identity.deletedAt < identity.createdAt)
  ) {
    throw new Error("Yerel öğretmen kimliği zaman çizelgesi geçersiz.");
  }
  return [identity.createdAt, identity.updatedAt, identity.deletedAt]
    .filter((timestamp): timestamp is string => typeof timestamp === "string")
    .sort()
    .at(-1)!;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function requireUuid(value: string | undefined, fieldName: string): string {
  const id = value ?? crypto.randomUUID();
  if (!isUuid(id)) throw new Error(`${fieldName} kimliği geçersiz.`);
  return id;
}

/**
 * Aynı cihazdaki program ve değer kanıtı onaylarının tek yerel öğretmen
 * kimliğini paylaşmasını sağlar. Bu kimlik bir hesap veya yetki beyanı değildir.
 */
export async function resolveLocalTeacherIdentity(
  transaction: DataTransaction,
  input: {
    now: Date;
    requestedTeacherUserId?: string | null;
  },
): Promise<string> {
  if (Number.isNaN(input.now.getTime())) {
    throw new Error("Geçerli bir öğretmen kimliği zamanı gerekli.");
  }
  const timestamp = input.now.toISOString();
  const requestedTeacherUserId = input.requestedTeacherUserId ?? null;
  if (requestedTeacherUserId !== null && !isUuid(requestedTeacherUserId)) {
    throw new Error("Onaylayan öğretmen kimliği geçersiz.");
  }
  const settings = await transaction.getAll("settings");
  const reservedSetting = settings.find(
    (record) => record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID,
  );
  if (
    reservedSetting &&
    reservedSetting.settingType !== LOCAL_TEACHER_IDENTITY_SETTING_TYPE
  ) {
    throw new Error(
      "Yerel öğretmen kimliği için ayrılan ayar kimliği başka bir ayar türü tarafından kullanılıyor.",
    );
  }
  const identitySetting = reservedSetting;
  if (identitySetting) {
    if (!isUuid(identitySetting.teacherUserId)) {
      throw new Error("Kayıtlı yerel öğretmen kimliği geçersiz.");
    }
  }
  const storedTeacherUserId = isUuid(identitySetting?.teacherUserId)
    ? identitySetting.teacherUserId
    : null;
  if (
    requestedTeacherUserId &&
    storedTeacherUserId &&
    requestedTeacherUserId !== storedTeacherUserId
  ) {
    throw new Error(
      "Onaylayan öğretmen kimliği bu cihazdaki kalıcı kimlikle uyuşmuyor.",
    );
  }
  if (identitySetting) {
    const latestIdentityTimestamp = existingIdentityLatestTimestamp(
      identitySetting,
    );
    if (timestamp < latestIdentityTimestamp) {
      throw new Error(
        "Yerel öğretmen kimliği geçmişe dönük onay veya canlandırma için kullanılamaz.",
      );
    }
  }

  const teacherUserId =
    storedTeacherUserId ?? requestedTeacherUserId ?? crypto.randomUUID();
  if (!isUuid(teacherUserId)) {
    throw new Error("Yerel öğretmen kimliği üretilemedi.");
  }
  const identityIsLive =
    storedTeacherUserId !== null &&
    identitySetting?.deletedAt === null;
  if (!identityIsLive) {
    await transaction.putMany("settings", [
      {
        ...(identitySetting ?? {}),
        id: LOCAL_TEACHER_IDENTITY_SETTING_ID,
        settingType: LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
        teacherUserId,
        createdAt: identitySetting?.createdAt ?? timestamp,
        updatedAt: timestamp,
        civilDate: identitySetting?.civilDate ?? civilDateInIstanbul(input.now),
        deletedAt: null,
        schemaVersion: 1,
      },
    ]);
  }
  return teacherUserId;
}
