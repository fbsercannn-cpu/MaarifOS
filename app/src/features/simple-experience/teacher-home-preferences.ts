import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";

export const TEACHER_HOME_PREFERENCES_SETTING_TYPE =
  "teacher-home-preferences-v1" as const;

export const TEACHER_HOME_SHORTCUT_IDS = [
  "attendance",
  "daily-plan",
  "classroom",
  "calendar",
] as const;

export type TeacherHomeShortcutId =
  (typeof TEACHER_HOME_SHORTCUT_IDS)[number];

export interface TeacherHomePreferencesWorkflow {
  readonly kind: "home-preferences";
  readonly lessonMode: boolean;
  readonly pinnedShortcutIds: readonly TeacherHomeShortcutId[];
}

export interface TeacherHomePreferencesRecord extends StoredRecord,
  ActiveClassroomScope {
  readonly settingType: typeof TEACHER_HOME_PREFERENCES_SETTING_TYPE;
  readonly studentId: null;
  readonly schemaVersion: 1;
  readonly deletedAt: null;
  readonly workflow: TeacherHomePreferencesWorkflow;
}

export interface TeacherHomePreferencesModel {
  readonly scope: ActiveClassroomScope | null;
  readonly lessonMode: boolean;
  readonly pinnedShortcutIds: readonly TeacherHomeShortcutId[];
  readonly expectedUpdatedAt: string | null;
}

export interface SaveTeacherHomePreferencesRequest {
  readonly lessonMode: boolean;
  readonly pinnedShortcutIds: readonly TeacherHomeShortcutId[];
  readonly expectedUpdatedAt: string | null;
  readonly now?: Date;
}

export const DEFAULT_TEACHER_HOME_PREFERENCES = {
  lessonMode: false,
  pinnedShortcutIds: ["attendance", "daily-plan"],
} as const satisfies Pick<
  TeacherHomePreferencesModel,
  "lessonMode" | "pinnedShortcutIds"
>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const RECORD_KEYS = [
  "id",
  "createdAt",
  "updatedAt",
  "civilDate",
  "deletedAt",
  "schemaVersion",
  "settingType",
  "academicYearId",
  "classroomId",
  "studentId",
  "workflow",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

export function isTeacherHomeShortcutId(
  value: unknown,
): value is TeacherHomeShortcutId {
  return typeof value === "string" &&
    (TEACHER_HOME_SHORTCUT_IDS as readonly string[]).includes(value);
}

function isTeacherHomePreferencesWorkflow(
  value: unknown,
): value is TeacherHomePreferencesWorkflow {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ["kind", "lessonMode", "pinnedShortcutIds"]) ||
    value.kind !== "home-preferences" ||
    typeof value.lessonMode !== "boolean" ||
    !Array.isArray(value.pinnedShortcutIds) ||
    value.pinnedShortcutIds.length !== 2 ||
    value.pinnedShortcutIds.some((id) => !isTeacherHomeShortcutId(id))
  ) {
    return false;
  }
  return new Set(value.pinnedShortcutIds).size === value.pinnedShortcutIds.length;
}

export function isTeacherHomePreferencesRecord(
  value: unknown,
): value is TeacherHomePreferencesRecord {
  return isObject(value) &&
    hasExactKeys(value, RECORD_KEYS) &&
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.createdAt === "string" &&
    UTC_ISO_PATTERN.test(value.createdAt) &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    new Date(value.createdAt).toISOString() === value.createdAt &&
    typeof value.updatedAt === "string" &&
    UTC_ISO_PATTERN.test(value.updatedAt) &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    new Date(value.updatedAt).toISOString() === value.updatedAt &&
    value.updatedAt >= value.createdAt &&
    typeof value.civilDate === "string" &&
    isCivilDate(value.civilDate) &&
    value.civilDate === civilDateInIstanbul(new Date(value.createdAt)) &&
    value.deletedAt === null &&
    value.schemaVersion === 1 &&
    value.settingType === TEACHER_HOME_PREFERENCES_SETTING_TYPE &&
    typeof value.academicYearId === "string" &&
    UUID_PATTERN.test(value.academicYearId) &&
    typeof value.classroomId === "string" &&
    UUID_PATTERN.test(value.classroomId) &&
    value.studentId === null &&
    isTeacherHomePreferencesWorkflow(value.workflow);
}

function matchingPreference(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "settings">,
  scope: ActiveClassroomScope,
): TeacherHomePreferencesRecord | null {
  const candidates = snapshot.settings.filter(
    (record) => record.settingType === TEACHER_HOME_PREFERENCES_SETTING_TYPE,
  );
  if (candidates.some((record) => !isTeacherHomePreferencesRecord(record))) {
    throw new Error("Ana ekran tercih kaydı geçersiz; kayıt değiştirilmeden inceleme gerekir.");
  }
  const scoped = (candidates as TeacherHomePreferencesRecord[]).filter(
    (record) => record.academicYearId === scope.academicYearId &&
      record.classroomId === scope.classroomId,
  );
  if (scoped.length > 1) {
    throw new Error("Bu sınıf için birden fazla ana ekran tercih kaydı bulundu; kayıtlar birleştirilmeden değiştirilemez.");
  }
  return scoped[0] ?? null;
}

function normalizeShortcutIds(
  values: readonly TeacherHomeShortcutId[],
): readonly [TeacherHomeShortcutId, TeacherHomeShortcutId] {
  if (
    values.length !== 2 ||
    values.some((value) => !isTeacherHomeShortcutId(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error("Ana ekranda birbirinden farklı iki sabit kısayol seçin.");
  }
  return [values[0]!, values[1]!];
}

export function resolveTeacherHomePreferences(
  snapshot: Pick<DataSnapshot, "academicYears" | "classrooms" | "settings">,
): TeacherHomePreferencesModel {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    return {
      scope: null,
      ...DEFAULT_TEACHER_HOME_PREFERENCES,
      expectedUpdatedAt: null,
    };
  }
  const current = matchingPreference(snapshot, scope);
  return current
    ? {
        scope,
        lessonMode: current.workflow.lessonMode,
        pinnedShortcutIds: [...current.workflow.pinnedShortcutIds],
        expectedUpdatedAt: current.updatedAt,
      }
    : {
        scope,
        ...DEFAULT_TEACHER_HOME_PREFERENCES,
        expectedUpdatedAt: null,
      };
}

export async function loadTeacherHomePreferences(
  store: LocalDataStore,
): Promise<TeacherHomePreferencesModel> {
  return resolveTeacherHomePreferences(await store.readSnapshot());
}

export async function saveTeacherHomePreferences(
  store: LocalDataStore,
  request: SaveTeacherHomePreferencesRequest,
): Promise<TeacherHomePreferencesModel> {
  const pinnedShortcutIds = normalizeShortcutIds(request.pinnedShortcutIds);
  const now = request.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Ana ekran tercih kayıt zamanı geçersiz.");
  }
  return store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings"],
    async (transaction) => {
      const [academicYears, classrooms, settings] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("settings"),
      ]);
      const snapshot = { academicYears, classrooms, settings };
      const scope = resolveActiveClassroomScope(snapshot);
      if (!scope) throw new Error("Ana ekran tercihi için önce Sınıfım kurulumunu tamamlayın.");
      const current = matchingPreference(snapshot, scope);
      if ((current?.updatedAt ?? null) !== request.expectedUpdatedAt) {
        throw new Error("Ana ekran tercihleri başka bir işlemde değişti. Güncel seçimleri açıp yeniden deneyin.");
      }
      if (
        current?.workflow.lessonMode === request.lessonMode &&
        current.workflow.pinnedShortcutIds.every(
          (id, index) => id === pinnedShortcutIds[index],
        )
      ) {
        return resolveTeacherHomePreferences(snapshot);
      }
      const minimumTime = current ? Date.parse(current.updatedAt) + 1 : now.getTime();
      const timestampMs = Math.max(now.getTime(), minimumTime);
      if (timestampMs > now.getTime() + 60_000) {
        throw new Error("Cihaz saati ana ekran tercih geçmişinin gerisinde; saati kontrol edin.");
      }
      const timestamp = new Date(timestampMs).toISOString();
      const createdAt = current?.createdAt ?? timestamp;
      const record: TeacherHomePreferencesRecord = {
        id: current?.id ?? crypto.randomUUID(),
        createdAt,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(new Date(createdAt)),
        deletedAt: null,
        schemaVersion: 1,
        settingType: TEACHER_HOME_PREFERENCES_SETTING_TYPE,
        ...scope,
        studentId: null,
        workflow: {
          kind: "home-preferences",
          lessonMode: request.lessonMode,
          pinnedShortcutIds,
        },
      };
      if (!isTeacherHomePreferencesRecord(record)) {
        throw new Error("Ana ekran tercihleri kayıt sözleşmesine uymuyor.");
      }
      await transaction.putMany("settings", [record]);
      return {
        scope,
        lessonMode: record.workflow.lessonMode,
        pinnedShortcutIds: [...record.workflow.pinnedShortcutIds],
        expectedUpdatedAt: record.updatedAt,
      };
    },
  );
}
