import {
  attendanceRecordKey,
  civilDateInIstanbul,
  findAttendanceCompletionSetting,
  isCivilDate,
  resolveAttendanceRecords,
} from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import {
  createEmptySnapshot,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { studentEnrollments } from "../archive/academic-year-archive.ts";

export const TEACHER_DAY_CLOSURE_SETTING_TYPE = "teacher-day-closure" as const;
export const TEACHER_DAY_CLOSURE_LEGACY_SCHEMA_VERSION = 1 as const;
export const TEACHER_DAY_CLOSURE_SCHEMA_VERSION = 2 as const;
export const TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE =
  "teacher-day-carry-forward-transition" as const;
export const TEACHER_DAY_CARRY_FORWARD_TRANSITION_SCHEMA_VERSION = 1 as const;

export const TEACHER_DAY_CLOSURE_ISSUE_CODES = [
  "no-students",
  "attendance-incomplete",
  "daily-plan-missing",
  "daily-plan-conflict",
  "activities-incomplete",
  "curriculum-links-pending",
] as const;

export type TeacherDayClosureIssueCode =
  (typeof TEACHER_DAY_CLOSURE_ISSUE_CODES)[number];

export interface TeacherDayClosureIssue {
  readonly code: TeacherDayClosureIssueCode;
  readonly title: string;
  readonly detail: string;
}

export interface TeacherDayClosureEvidence {
  readonly expectedStudentCount: number;
  readonly attendanceMarkedCount: number;
  readonly attendanceCompleted: boolean;
  readonly dailyPlanCount: number;
  readonly activityCount: number;
  readonly completedActivityCount: number;
  readonly observationCount: number;
  readonly pendingCurriculumLinkCount: number;
}

export interface TeacherDayClosureSetting extends StoredRecord {
  readonly settingType: typeof TEACHER_DAY_CLOSURE_SETTING_TYPE;
  readonly academicYearId: string;
  readonly classroomId: string;
  readonly closureStatus: "complete" | "carried-forward";
  readonly closedAt: string;
  readonly nextDayNote: string | null;
  readonly issueCodes: readonly TeacherDayClosureIssueCode[];
  readonly evidence: TeacherDayClosureEvidence;
  readonly evidenceFingerprint?: string;
}

export type TeacherDayCarryForwardState = "open" | "resolved" | "deferred";

export interface TeacherDayCarryForwardTransitionSetting extends StoredRecord {
  readonly settingType: typeof TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE;
  readonly academicYearId: string;
  readonly classroomId: string;
  readonly sourceClosureId: string;
  readonly sourceCivilDate: string;
  readonly sourceIssueCode: TeacherDayClosureIssueCode;
  readonly sourceIssueIdentity: string;
  readonly sourceIssueId: string;
  readonly transitionState: "resolved" | "deferred" | "reopened";
  readonly transitionedAt: string;
  readonly transitionNote: string | null;
  readonly deferredUntilCivilDate: string | null;
  readonly previousTransitionId: string | null;
}

export interface TeacherDayCarryForwardItem {
  readonly sourceIssueId: string;
  readonly sourceIssueIdentity: string;
  readonly sourceClosureId: string;
  readonly latestClosureId: string;
  readonly sourceCivilDate: string;
  readonly issueCode: TeacherDayClosureIssueCode;
  readonly title: string;
  readonly detail: string;
  readonly note: string;
  readonly state: TeacherDayCarryForwardState;
  readonly ageInDays: number;
  readonly deferredUntilCivilDate: string | null;
  readonly isDeferredDue: boolean;
  readonly latestTransition: TeacherDayCarryForwardTransitionSetting | null;
  readonly occurrenceSourceIssueIdentities: readonly string[];
  readonly occurrenceCivilDates: readonly string[];
}

export interface TeacherDayClosureWorkspace {
  readonly status: "not-configured" | "open" | "closed" | "stale";
  readonly civilDate: string;
  readonly evidence: TeacherDayClosureEvidence;
  readonly evidenceFingerprint: string;
  readonly issues: readonly TeacherDayClosureIssue[];
  readonly latestClosure: TeacherDayClosureSetting | null;
  readonly previousCarryForward: {
    readonly civilDate: string;
    readonly note: string;
  } | null;
  readonly carryForwardItems: readonly TeacherDayCarryForwardItem[];
  readonly resolvedCarryForwardItems: readonly TeacherDayCarryForwardItem[];
}

export function emptyTeacherDayClosureWorkspace(
  civilDate: string,
): TeacherDayClosureWorkspace {
  return {
    status: "not-configured",
    civilDate,
    evidence: {
      expectedStudentCount: 0,
      attendanceMarkedCount: 0,
      attendanceCompleted: false,
      dailyPlanCount: 0,
      activityCount: 0,
      completedActivityCount: 0,
      observationCount: 0,
      pendingCurriculumLinkCount: 0,
    },
    evidenceFingerprint: `sha256:${"0".repeat(64)}`,
    issues: [],
    latestClosure: null,
    previousCarryForward: null,
    carryForwardItems: [],
    resolvedCarryForwardItems: [],
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_NOTE_LENGTH = 1_200;
const SOURCE_ISSUE_IDENTITY_PATTERN =
  /^teacher-day-closure:[0-9a-f-]{36}:[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}:[a-z-]+$/i;

function isLive(record: StoredRecord): boolean {
  return typeof record.deletedAt !== "string";
}

function isSafeCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10_000;
}

function isIssueCode(value: unknown): value is TeacherDayClosureIssueCode {
  return (
    typeof value === "string" &&
    TEACHER_DAY_CLOSURE_ISSUE_CODES.includes(
      value as TeacherDayClosureIssueCode,
    )
  );
}

export function teacherDayCarryForwardSourceIdentity(input: {
  readonly academicYearId: string;
  readonly classroomId: string;
  readonly sourceCivilDate: string;
  readonly sourceIssueCode: TeacherDayClosureIssueCode;
}): string {
  return [
    "teacher-day-closure",
    input.academicYearId,
    input.classroomId,
    input.sourceCivilDate,
    input.sourceIssueCode,
  ].join(":");
}

export function isTeacherDayCarryForwardTransitionSetting(
  record: StoredRecord,
): record is TeacherDayCarryForwardTransitionSetting {
  const expectedIdentity =
    UUID_PATTERN.test(String(record.academicYearId)) &&
    UUID_PATTERN.test(String(record.classroomId)) &&
    isCivilDate(record.sourceCivilDate) &&
    isIssueCode(record.sourceIssueCode)
      ? teacherDayCarryForwardSourceIdentity({
          academicYearId: String(record.academicYearId),
          classroomId: String(record.classroomId),
          sourceCivilDate: String(record.sourceCivilDate),
          sourceIssueCode: record.sourceIssueCode,
        })
      : null;
  return (
    record.settingType === TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE &&
    UUID_PATTERN.test(record.id) &&
    UUID_PATTERN.test(String(record.academicYearId)) &&
    UUID_PATTERN.test(String(record.classroomId)) &&
    isCivilDate(record.civilDate) &&
    record.schemaVersion ===
      TEACHER_DAY_CARRY_FORWARD_TRANSITION_SCHEMA_VERSION &&
    UTC_ISO_PATTERN.test(record.createdAt) &&
    UTC_ISO_PATTERN.test(record.updatedAt) &&
    UTC_ISO_PATTERN.test(String(record.transitionedAt)) &&
    record.createdAt === record.transitionedAt &&
    record.updatedAt === record.transitionedAt &&
    (record.deletedAt === null || record.deletedAt === undefined) &&
    UUID_PATTERN.test(String(record.sourceClosureId)) &&
    isCivilDate(record.sourceCivilDate) &&
    isIssueCode(record.sourceIssueCode) &&
    typeof record.sourceIssueIdentity === "string" &&
    SOURCE_ISSUE_IDENTITY_PATTERN.test(record.sourceIssueIdentity) &&
    record.sourceIssueIdentity === expectedIdentity &&
    typeof record.sourceIssueId === "string" &&
    SOURCE_ISSUE_IDENTITY_PATTERN.test(record.sourceIssueId) &&
    (record.transitionState === "resolved" ||
      record.transitionState === "deferred" ||
      record.transitionState === "reopened") &&
    (record.transitionNote === null ||
      (typeof record.transitionNote === "string" &&
        record.transitionNote.length > 0 &&
        record.transitionNote.length <= MAX_NOTE_LENGTH)) &&
    (((record.transitionState === "resolved" ||
      record.transitionState === "reopened") &&
      record.deferredUntilCivilDate === null) ||
      (record.transitionState === "deferred" &&
        isCivilDate(record.deferredUntilCivilDate) &&
        String(record.deferredUntilCivilDate) > record.civilDate)) &&
    (record.previousTransitionId === null ||
      UUID_PATTERN.test(String(record.previousTransitionId)))
  );
}

function isEvidence(value: unknown): value is TeacherDayClosureEvidence {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const evidence = value as Record<string, unknown>;
  const keys = Object.keys(evidence).sort();
  const expectedKeys = [
    "activityCount",
    "attendanceCompleted",
    "attendanceMarkedCount",
    "completedActivityCount",
    "dailyPlanCount",
    "expectedStudentCount",
    "observationCount",
    "pendingCurriculumLinkCount",
  ].sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    isSafeCount(evidence.expectedStudentCount) &&
    isSafeCount(evidence.attendanceMarkedCount) &&
    typeof evidence.attendanceCompleted === "boolean" &&
    isSafeCount(evidence.dailyPlanCount) &&
    isSafeCount(evidence.activityCount) &&
    isSafeCount(evidence.completedActivityCount) &&
    isSafeCount(evidence.observationCount) &&
    isSafeCount(evidence.pendingCurriculumLinkCount) &&
    Number(evidence.attendanceMarkedCount) <= Number(evidence.expectedStudentCount) &&
    Number(evidence.completedActivityCount) <= Number(evidence.activityCount)
  );
}

function canonicalSemanticJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalSemanticJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${canonicalSemanticJson(record[key])}`,
    )
    .join(",")}}`;
}

function isCanonicalSemanticFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

const SHA256_ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256HexSync(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const first = words[index - 15];
      const second = words[index - 2];
      const sigmaZero =
        rotateRight(first, 7) ^ rotateRight(first, 18) ^ (first >>> 3);
      const sigmaOne =
        rotateRight(second, 17) ^ rotateRight(second, 19) ^ (second >>> 10);
      words[index] =
        (words[index - 16] + sigmaZero + words[index - 7] + sigmaOne) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sumOne = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporaryOne =
        (h + sumOne + choice + SHA256_ROUND_CONSTANTS[index] + words[index]) >>> 0;
      const sumZero = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporaryTwo = (sumZero + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporaryOne) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporaryOne + temporaryTwo) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function exactScope(
  record: StoredRecord,
  academicYearId: string,
  classroomId: string,
): boolean {
  return (
    isLive(record) &&
    record.academicYearId === academicYearId &&
    record.classroomId === classroomId
  );
}

function studentWasEnrolledOn(
  record: StoredRecord,
  input: {
    readonly academicYearId: string;
    readonly classroomId: string;
    readonly civilDate: string;
  },
): boolean {
  const matchingEnrollments = studentEnrollments(record).filter(
    (enrollment) =>
      enrollment.academicYearId === input.academicYearId &&
      enrollment.classroomId === input.classroomId,
  );
  if (matchingEnrollments.length > 0) {
    return matchingEnrollments.some(
      (enrollment) =>
        enrollment.startedOn <= input.civilDate &&
        (enrollment.endedOn === undefined || enrollment.endedOn >= input.civilDate),
    );
  }
  if (!exactScope(record, input.academicYearId, input.classroomId)) return false;
  if (
    typeof record.enrollmentDate === "string" &&
    isCivilDate(record.enrollmentDate) &&
    record.enrollmentDate > input.civilDate
  ) {
    return false;
  }
  return record.active !== false && record.enrollmentStatus !== "left";
}

export function teacherDayClosureSemanticFingerprint(
  snapshot: DataSnapshot,
  input: {
    readonly academicYearId: string;
    readonly classroomId: string;
    readonly civilDate: string;
  },
): string {
  if (
    !UUID_PATTERN.test(input.academicYearId) ||
    !UUID_PATTERN.test(input.classroomId) ||
    !isCivilDate(input.civilDate)
  ) {
    throw new Error("Gün sonu semantik parmak izi kapsamı geçersiz.");
  }
  const inScope = (record: StoredRecord) =>
    exactScope(record, input.academicYearId, input.classroomId);
  const activeStudentIds = snapshot.students
    .filter((record) => studentWasEnrolledOn(record, input))
    .map((record) => record.id)
    .sort();
  const activeStudentIdSet = new Set(activeStudentIds);
  const resolvedAttendance = resolveAttendanceRecords(
    snapshot.attendanceRecords.filter(inScope),
  );
  const attendance = activeStudentIds.map((studentId) => {
    const latest = resolvedAttendance.latestByKey.get(
      attendanceRecordKey(studentId, input.civilDate),
    );
    return latest
      ? {
          id: latest.id,
          studentId,
          status: latest.status ?? null,
          events: Array.isArray(latest.events)
            ? latest.events.map((event) => ({
                civilDate: event.civilDate,
                fromLocalTime: event.fromLocalTime ?? null,
                id: event.id,
                localTime: event.localTime ?? null,
                occurredAtUtc: event.occurredAtUtc,
                partialDayPeriod: event.partialDayPeriod ?? null,
                toLocalTime: event.toLocalTime ?? null,
                type: event.type,
              }))
            : null,
        }
      : { id: null, studentId, status: null, events: null };
  });
  const dailyPlans = snapshot.plans
    .filter(
      (record) =>
        inScope(record) &&
        record.planType === "daily" &&
        record.civilDate === input.civilDate,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const dailyPlanIds = new Set(dailyPlans.map((record) => record.id));
  const activities = snapshot.activities
    .filter(
      (record) =>
        inScope(record) &&
        typeof record.planId === "string" &&
        dailyPlanIds.has(record.planId),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const observations = snapshot.observations
    .filter(
      (record) =>
        inScope(record) &&
        record.civilDate === input.civilDate &&
        (typeof record.studentId !== "string" ||
          activeStudentIdSet.has(record.studentId)),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const observationIds = new Set(observations.map((record) => record.id));
  const curriculumLinks = snapshot.evidenceCurriculumLinks
    .filter(
      (record) =>
        inScope(record) &&
        typeof record.observationId === "string" &&
        observationIds.has(record.observationId),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const attendanceCompletion = snapshot.settings
    .filter(
      (record) =>
        inScope(record) &&
        record.settingType === "attendance-day-completion" &&
        record.civilDate === input.civilDate,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const semanticProjection = canonicalSemanticJson({
    activeStudentIds,
    attendance,
    attendanceCompletion: attendanceCompletion.map((record) => ({
      attendanceCompleted: record.attendanceCompleted === true,
      id: record.id,
    })),
    dailyPlans: dailyPlans.map((record) => ({
      id: record.id,
      status: record.status ?? null,
    })),
    activities: activities.map((record) => ({
      id: record.id,
      planId: record.planId,
      status: record.status ?? null,
    })),
    observations: observations.map((record) => ({
      activityId: record.activityId ?? null,
      id: record.id,
      planId: record.planId ?? null,
      studentId: record.studentId ?? null,
      studentIds: Array.isArray(record.studentIds)
        ? [...record.studentIds].sort()
        : null,
    })),
    curriculumLinks: curriculumLinks.map((record) => ({
      id: record.id,
      observationId: record.observationId,
      referenceCode: record.referenceCode ?? null,
    })),
  });
  return `sha256:${sha256HexSync(semanticProjection)}`;
}

export function isTeacherDayClosureSetting(
  record: StoredRecord,
): record is TeacherDayClosureSetting {
  const derivedIssueCodes = isEvidence(record.evidence)
    ? issueList(record.evidence).map((issue) => issue.code)
    : [];
  return (
    record.settingType === TEACHER_DAY_CLOSURE_SETTING_TYPE &&
    UUID_PATTERN.test(record.id) &&
    UUID_PATTERN.test(String(record.academicYearId)) &&
    UUID_PATTERN.test(String(record.classroomId)) &&
    isCivilDate(record.civilDate) &&
    (record.schemaVersion === TEACHER_DAY_CLOSURE_LEGACY_SCHEMA_VERSION ||
      record.schemaVersion === TEACHER_DAY_CLOSURE_SCHEMA_VERSION) &&
    UTC_ISO_PATTERN.test(record.createdAt) &&
    UTC_ISO_PATTERN.test(record.updatedAt) &&
    UTC_ISO_PATTERN.test(String(record.closedAt)) &&
    record.createdAt === record.closedAt &&
    record.updatedAt === record.closedAt &&
    (record.deletedAt === null || record.deletedAt === undefined) &&
    (record.closureStatus === "complete" ||
      record.closureStatus === "carried-forward") &&
    (record.nextDayNote === null ||
      (typeof record.nextDayNote === "string" &&
        record.nextDayNote.length >= 10 &&
        record.nextDayNote.length <= MAX_NOTE_LENGTH)) &&
    Array.isArray(record.issueCodes) &&
    record.issueCodes.every(isIssueCode) &&
    new Set(record.issueCodes).size === record.issueCodes.length &&
    isEvidence(record.evidence) &&
    ((record.schemaVersion === TEACHER_DAY_CLOSURE_LEGACY_SCHEMA_VERSION &&
      record.evidenceFingerprint === undefined) ||
      (record.schemaVersion === TEACHER_DAY_CLOSURE_SCHEMA_VERSION &&
        isCanonicalSemanticFingerprint(record.evidenceFingerprint))) &&
    record.issueCodes.length === derivedIssueCodes.length &&
    record.issueCodes.every(
      (issueCode, index) => issueCode === derivedIssueCodes[index],
    ) &&
    ((record.closureStatus === "complete" &&
      record.issueCodes.length === 0) ||
      (record.closureStatus === "carried-forward" &&
        record.issueCodes.length > 0 &&
        typeof record.nextDayNote === "string"))
  );
}

function issueList(evidence: TeacherDayClosureEvidence): TeacherDayClosureIssue[] {
  const issues: TeacherDayClosureIssue[] = [];
  if (evidence.expectedStudentCount === 0) {
    issues.push({
      code: "no-students",
      title: "Sınıf listesi boş",
      detail: "Günü kapatmadan önce etkin çocuk listesini doğrulayın.",
    });
  } else if (
    !evidence.attendanceCompleted ||
    evidence.attendanceMarkedCount < evidence.expectedStudentCount
  ) {
    issues.push({
      code: "attendance-incomplete",
      title: "Yoklama tamamlanmadı",
      detail: `${evidence.attendanceMarkedCount}/${evidence.expectedStudentCount} çocuk işaretlendi.`,
    });
  }
  if (evidence.dailyPlanCount === 0) {
    issues.push({
      code: "daily-plan-missing",
      title: "Günlük plan yok",
      detail: "Bugünün uygulama akışı kayıtlı bir günlük plana bağlı değil.",
    });
  } else if (evidence.dailyPlanCount > 1) {
    issues.push({
      code: "daily-plan-conflict",
      title: "Günlük plan çakışması",
      detail: `${evidence.dailyPlanCount} günlük plan aynı sınıf ve tarihe bağlı; gün kapanmadan inceleyin.`,
    });
  } else if (
    evidence.activityCount === 0 ||
    evidence.completedActivityCount < evidence.activityCount
  ) {
    issues.push({
      code: "activities-incomplete",
      title: "Uygulama akışı açık",
      detail: `${evidence.completedActivityCount}/${evidence.activityCount} etkinlik tamamlandı.`,
    });
  }
  if (evidence.pendingCurriculumLinkCount > 0) {
    issues.push({
      code: "curriculum-links-pending",
      title: "Program bağı bekliyor",
      detail: `${evidence.pendingCurriculumLinkCount} gözlem program bağlantısı bekliyor.`,
    });
  }
  return issues;
}

function closureNewestFirst(
  left: TeacherDayClosureSetting,
  right: TeacherDayClosureSetting,
): number {
  return right.closedAt.localeCompare(left.closedAt) || right.id.localeCompare(left.id);
}

function evidenceEquals(
  left: TeacherDayClosureEvidence,
  right: TeacherDayClosureEvidence,
): boolean {
  return (
    left.expectedStudentCount === right.expectedStudentCount &&
    left.attendanceMarkedCount === right.attendanceMarkedCount &&
    left.attendanceCompleted === right.attendanceCompleted &&
    left.dailyPlanCount === right.dailyPlanCount &&
    left.activityCount === right.activityCount &&
    left.completedActivityCount === right.completedActivityCount &&
    left.observationCount === right.observationCount &&
    left.pendingCurriculumLinkCount === right.pendingCurriculumLinkCount
  );
}

function civilDateDistanceInDays(from: string, to: string): number {
  const toOrdinal = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  };
  return Math.max(0, toOrdinal(to) - toOrdinal(from));
}

function oldestFirst(
  left: TeacherDayClosureSetting,
  right: TeacherDayClosureSetting,
): number {
  return left.closedAt.localeCompare(right.closedAt) || left.id.localeCompare(right.id);
}

function transitionOldestFirst(
  left: TeacherDayCarryForwardTransitionSetting,
  right: TeacherDayCarryForwardTransitionSetting,
): number {
  return (
    left.transitionedAt.localeCompare(right.transitionedAt) ||
    left.id.localeCompare(right.id)
  );
}

export function resolveTeacherDayCarryForwardLifecycle(
  snapshot: DataSnapshot,
  asOfCivilDate: string,
): readonly TeacherDayCarryForwardItem[] {
  if (!isCivilDate(asOfCivilDate)) {
    throw new Error("Taşınan iş tarihi YYYY-AA-GG biçiminde olmalıdır.");
  }
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return [];
  const scopedSettings = snapshot.settings.filter(
    (record) =>
      isLive(record) && recordBelongsToClassroomScope(record, scope),
  );
  const closures = scopedSettings
    .filter(isTeacherDayClosureSetting)
    .filter((record) => record.civilDate <= asOfCivilDate)
    .sort(oldestFirst);
  const latestClosureByCivilDate = new Map<string, TeacherDayClosureSetting>();
  for (const closure of closures) {
    latestClosureByCivilDate.set(closure.civilDate, closure);
  }
  const origins = new Map<
    string,
    {
      closure: TeacherDayClosureSetting;
      issueCode: TeacherDayClosureIssueCode;
    }
  >();
  for (const closure of closures) {
    for (const issueCode of closure.issueCodes) {
      const identity = teacherDayCarryForwardSourceIdentity({
        academicYearId: closure.academicYearId,
        classroomId: closure.classroomId,
        sourceCivilDate: closure.civilDate,
        sourceIssueCode: issueCode,
      });
      if (!origins.has(identity)) {
        origins.set(identity, { closure, issueCode });
      }
    }
  }
  const transitionsByIdentity = new Map<
    string,
    TeacherDayCarryForwardTransitionSetting[]
  >();
  for (const candidate of scopedSettings) {
    if (
      !isTeacherDayCarryForwardTransitionSetting(candidate) ||
      candidate.civilDate > asOfCivilDate
    ) {
      continue;
    }
    const group = transitionsByIdentity.get(candidate.sourceIssueIdentity) ?? [];
    group.push(candidate);
    transitionsByIdentity.set(candidate.sourceIssueIdentity, group);
  }

  const items: TeacherDayCarryForwardItem[] = [];
  for (const [identity, origin] of origins) {
    const latestClosure = latestClosureByCivilDate.get(origin.closure.civilDate);
    if (!latestClosure) continue;
    const latestIssueClosure = [...closures]
      .reverse()
      .find(
        (closure) =>
          closure.civilDate === origin.closure.civilDate &&
          closure.issueCodes.includes(origin.issueCode),
      ) ?? origin.closure;
    const issue = issueList(latestIssueClosure.evidence).find(
      (candidate) => candidate.code === origin.issueCode,
    );
    if (!issue || typeof latestIssueClosure.nextDayNote !== "string") continue;

    let state: TeacherDayCarryForwardState = latestClosure.issueCodes.includes(
      origin.issueCode,
    )
      ? "open"
      : "resolved";
    let latestTransition: TeacherDayCarryForwardTransitionSetting | null = null;
    let expectedPreviousId: string | null = null;
    const transitions = (transitionsByIdentity.get(identity) ?? []).sort(
      transitionOldestFirst,
    );
    for (const transition of transitions) {
      const validChainLink =
        transition.sourceClosureId === origin.closure.id &&
        transition.sourceCivilDate === origin.closure.civilDate &&
        transition.sourceIssueCode === origin.issueCode &&
        transition.previousTransitionId === expectedPreviousId &&
        transition.transitionedAt >= origin.closure.closedAt;
      if (!validChainLink) continue;
      expectedPreviousId = transition.id;
      latestTransition = transition;
      if (transition.transitionedAt >= latestClosure.closedAt) {
        state = transition.transitionState === "reopened"
          ? "open"
          : transition.transitionState;
      }
    }
    items.push({
      sourceIssueId: latestTransition?.sourceIssueId ?? identity,
      sourceIssueIdentity: identity,
      sourceClosureId: origin.closure.id,
      latestClosureId: latestClosure.id,
      sourceCivilDate: origin.closure.civilDate,
      issueCode: origin.issueCode,
      title: issue.title,
      detail: issue.detail,
      note: latestIssueClosure.nextDayNote,
      state,
      ageInDays: civilDateDistanceInDays(
        origin.closure.civilDate,
        asOfCivilDate,
      ),
      deferredUntilCivilDate:
        state === "deferred"
          ? latestTransition?.deferredUntilCivilDate ?? null
          : null,
      isDeferredDue:
        state === "deferred" &&
        typeof latestTransition?.deferredUntilCivilDate === "string" &&
        latestTransition.deferredUntilCivilDate <= asOfCivilDate,
      latestTransition,
      occurrenceSourceIssueIdentities: [identity],
      occurrenceCivilDates: [origin.closure.civilDate],
    });
  }
  const grouped = new Map<string, TeacherDayCarryForwardItem>();
  for (const item of items.sort(
    (left, right) =>
      left.sourceCivilDate.localeCompare(right.sourceCivilDate) ||
      left.sourceIssueIdentity.localeCompare(right.sourceIssueIdentity),
  )) {
    const groupKey = item.latestTransition?.sourceIssueId ??
      (item.state === "resolved"
        ? item.sourceIssueIdentity
        : `active:${item.issueCode}`);
    const existing = grouped.get(groupKey);
    if (!existing) {
      grouped.set(groupKey, item);
      continue;
    }
    grouped.set(groupKey, {
      ...existing,
      latestClosureId: item.latestClosureId,
      note: item.note,
      state: item.state,
      deferredUntilCivilDate: item.deferredUntilCivilDate,
      isDeferredDue: item.isDeferredDue,
      latestTransition: item.latestTransition ?? existing.latestTransition,
      occurrenceSourceIssueIdentities: [
        ...existing.occurrenceSourceIssueIdentities,
        ...item.occurrenceSourceIssueIdentities,
      ],
      occurrenceCivilDates: [
        ...existing.occurrenceCivilDates,
        ...item.occurrenceCivilDates,
      ],
    });
  }
  return [...grouped.values()].sort(
    (left, right) =>
      Number(left.state === "resolved") - Number(right.state === "resolved") ||
      right.ageInDays - left.ageInDays ||
      left.sourceIssueIdentity.localeCompare(right.sourceIssueIdentity),
  );
}

export function resolveTeacherDayClosureWorkspace(
  snapshot: DataSnapshot,
  civilDate: string,
): TeacherDayClosureWorkspace {
  if (!isCivilDate(civilDate)) {
    throw new Error("Gün sonu tarihi YYYY-AA-GG biçiminde olmalıdır.");
  }
  const scope = resolveActiveClassroomScope(snapshot);
  const emptyEvidence: TeacherDayClosureEvidence = {
    expectedStudentCount: 0,
    attendanceMarkedCount: 0,
    attendanceCompleted: false,
    dailyPlanCount: 0,
    activityCount: 0,
    completedActivityCount: 0,
    observationCount: 0,
    pendingCurriculumLinkCount: 0,
  };
  if (!scope) {
    return {
      status: "not-configured",
      civilDate,
      evidence: emptyEvidence,
      evidenceFingerprint: `sha256:${"0".repeat(64)}`,
      issues: issueList(emptyEvidence),
      latestClosure: null,
      previousCarryForward: null,
      carryForwardItems: [],
      resolvedCarryForwardItems: [],
    };
  }
  const academicYear = snapshot.academicYears.find(
    (record) => isLive(record) && record.id === scope.academicYearId,
  );
  if (
    !academicYear ||
    typeof academicYear.startDate !== "string" ||
    typeof academicYear.endDate !== "string" ||
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate) ||
    civilDate < academicYear.startDate ||
    civilDate > academicYear.endDate
  ) {
    return {
      status: "not-configured",
      civilDate,
      evidence: emptyEvidence,
      evidenceFingerprint: `sha256:${"0".repeat(64)}`,
      issues: [],
      latestClosure: null,
      previousCarryForward: null,
      carryForwardItems: [],
      resolvedCarryForwardItems: [],
    };
  }

  const inScope = (record: StoredRecord) =>
    isLive(record) && recordBelongsToClassroomScope(record, scope);
  const activeStudents = snapshot.students.filter((record) =>
    studentWasEnrolledOn(record, {
      academicYearId: scope.academicYearId,
      classroomId: scope.classroomId,
      civilDate,
    })
  );
  const activeStudentIds = new Set(activeStudents.map((record) => record.id));
  const resolvedAttendance = resolveAttendanceRecords(
    snapshot.attendanceRecords.filter(inScope),
  );
  const attendanceMarkedCount = activeStudents.filter((student) =>
    resolvedAttendance.latestByKey.has(attendanceRecordKey(student.id, civilDate)),
  ).length;
  const scopedSettings = snapshot.settings.filter((record) =>
    recordBelongsToClassroomScope(record, scope),
  );
  const dailyPlans = snapshot.plans.filter(
    (record) => inScope(record) && record.planType === "daily" && record.civilDate === civilDate,
  );
  const dailyPlanIds = new Set(dailyPlans.map((record) => record.id));
  const activities = snapshot.activities.filter(
    (record) =>
      inScope(record) &&
      typeof record.planId === "string" &&
      dailyPlanIds.has(record.planId),
  );
  const observations = snapshot.observations.filter(
    (record) =>
      inScope(record) &&
      record.civilDate === civilDate &&
      (typeof record.studentId !== "string" || activeStudentIds.has(record.studentId)),
  );
  const linkedObservationIds = new Set(
    snapshot.evidenceCurriculumLinks
      .filter(
        (record) =>
          inScope(record) && record.confirmationMethod === "teacher-confirmed",
      )
      .flatMap((record) =>
        typeof record.observationId === "string" ? [record.observationId] : [],
      ),
  );
  const evidence: TeacherDayClosureEvidence = {
    expectedStudentCount: activeStudents.length,
    attendanceMarkedCount,
    attendanceCompleted:
      findAttendanceCompletionSetting(scopedSettings, civilDate)
        ?.attendanceCompleted === true,
    dailyPlanCount: dailyPlans.length,
    activityCount: activities.length,
    completedActivityCount: activities.filter(
      (record) => record.status === "completed",
    ).length,
    observationCount: observations.length,
    pendingCurriculumLinkCount: observations.filter(
      (record) => !linkedObservationIds.has(record.id),
    ).length,
  };
  const issues = issueList(evidence);
  const evidenceFingerprint = teacherDayClosureSemanticFingerprint(snapshot, {
    academicYearId: scope.academicYearId,
    classroomId: scope.classroomId,
    civilDate,
  });
  const closures = scopedSettings
    .filter(isTeacherDayClosureSetting)
    .sort(closureNewestFirst);
  const latestClosure =
    closures.find((record) => record.civilDate === civilDate) ?? null;
  const relevantRecords = [
    ...snapshot.attendanceRecords.filter(
      (record) => inScope(record) && record.civilDate === civilDate,
    ),
    ...dailyPlans,
    ...activities,
    ...observations,
    ...snapshot.evidenceCurriculumLinks.filter(
      (record) =>
        inScope(record) &&
        typeof record.observationId === "string" &&
        observations.some((observation) => observation.id === record.observationId),
    ),
    ...scopedSettings.filter(
      (record) =>
        record.settingType === "attendance-day-completion" &&
        record.civilDate === civilDate,
    ),
  ];
  const stale =
    latestClosure !== null &&
    (!evidenceEquals(latestClosure.evidence, evidence) ||
      latestClosure.evidenceFingerprint !== evidenceFingerprint ||
      relevantRecords.some(
        (record) => record.updatedAt > latestClosure.closedAt,
      ));
  const carryForwardLifecycle = resolveTeacherDayCarryForwardLifecycle(
    snapshot,
    civilDate,
  );
  const carryForwardItems = carryForwardLifecycle.filter(
    (item) => item.sourceCivilDate < civilDate && item.state !== "resolved",
  );
  const resolvedCarryForwardItems = carryForwardLifecycle
    .filter(
      (item) => item.sourceCivilDate <= civilDate && item.state === "resolved",
    )
    .sort((left, right) => {
      const leftRecency =
        left.latestTransition?.transitionedAt ?? left.sourceCivilDate;
      const rightRecency =
        right.latestTransition?.transitionedAt ?? right.sourceCivilDate;
      return (
        rightRecency.localeCompare(leftRecency) ||
        right.sourceIssueId.localeCompare(left.sourceIssueId)
      );
    })
    .slice(0, 5);
  const previousActiveCarry = carryForwardItems.find(
    (item) => item.state === "open" || item.isDeferredDue,
  ) ?? null;
  return {
    status: latestClosure ? (stale ? "stale" : "closed") : "open",
    civilDate,
    evidence,
    evidenceFingerprint,
    issues,
    latestClosure,
    previousCarryForward: previousActiveCarry
      ? {
          civilDate: previousActiveCarry.sourceCivilDate,
          note: previousActiveCarry.note,
        }
      : null,
    carryForwardItems,
    resolvedCarryForwardItems,
  };
}

export async function loadTeacherDayClosureWorkspace(
  store: LocalDataStore,
  options: { readonly civilDate: string },
): Promise<TeacherDayClosureWorkspace> {
  return resolveTeacherDayClosureWorkspace(
    await store.readSnapshot(),
    options.civilDate,
  );
}

export async function closeTeacherDay(
  store: LocalDataStore,
  input: {
    readonly civilDate: string;
    readonly nextDayNote: string;
    readonly now?: Date;
  },
): Promise<TeacherDayClosureSetting> {
  const now = input.now ?? new Date();
  const openCivilDate = civilDateInIstanbul(now);
  if (Number.isNaN(now.getTime()) || input.civilDate > openCivilDate) {
    throw new Error("Gün sonu gelecek İstanbul takvim günü için kaydedilemez.");
  }
  const normalizedNote = input.nextDayNote.trim();
  if (normalizedNote.length > MAX_NOTE_LENGTH) {
    throw new Error("Yarına not 1200 karakteri aşamaz.");
  }
  const collections = [
    "academicYears",
    "classrooms",
    "students",
    "attendanceRecords",
    "plans",
    "activities",
    "observations",
    "evidenceCurriculumLinks",
    "settings",
  ] as const;
  return store.transaction("readwrite", collections, async (transaction) => {
    const values = await Promise.all(
      collections.map((collection) => transaction.getAll(collection)),
    );
    const snapshot = createEmptySnapshot();
    collections.forEach((collection, index) => {
      snapshot[collection] = values[index] as StoredRecord[];
    });
    const workspace = resolveTeacherDayClosureWorkspace(
      snapshot,
      input.civilDate,
    );
    if (workspace.status === "not-configured") {
      throw new Error("Gün sonu için etkin eğitim yılı ve sınıf kapsamı bulunamadı.");
    }
    if (workspace.issues.length > 0 && normalizedNote.length < 10) {
      throw new Error(
        "Eksik işleri yarına taşımak için en az 10 karakterlik kısa bir öğretmen notu yazın.",
      );
    }
    const existing = workspace.latestClosure;
    const issueCodes = workspace.issues.map((issue) => issue.code);
    const closureStatus = issueCodes.length === 0 ? "complete" : "carried-forward";
    const nextDayNote = normalizedNote || null;
    if (
      existing &&
      workspace.status === "closed" &&
      existing.closureStatus === closureStatus &&
      existing.nextDayNote === nextDayNote &&
      evidenceEquals(existing.evidence, workspace.evidence)
    ) {
      return existing;
    }
    const closedAt = now.toISOString();
    const record: TeacherDayClosureSetting = {
      id: crypto.randomUUID(),
      settingType: TEACHER_DAY_CLOSURE_SETTING_TYPE,
      academicYearId: workspace.latestClosure?.academicYearId ??
        resolveActiveClassroomScope(snapshot)!.academicYearId,
      classroomId: workspace.latestClosure?.classroomId ??
        resolveActiveClassroomScope(snapshot)!.classroomId,
      civilDate: input.civilDate,
      closureStatus,
      closedAt,
      nextDayNote,
      issueCodes,
      evidence: workspace.evidence,
      evidenceFingerprint: workspace.evidenceFingerprint,
      createdAt: closedAt,
      updatedAt: closedAt,
      deletedAt: null,
      schemaVersion: TEACHER_DAY_CLOSURE_SCHEMA_VERSION,
    };
    if (!isTeacherDayClosureSetting(record)) {
      throw new Error("Gün sonu kaydı bütünlük sözleşmesine uymuyor.");
    }
    await transaction.putMany("settings", [record]);
    return record;
  });
}

export async function transitionTeacherDayCarryForward(
  store: LocalDataStore,
  input: {
    readonly sourceIssueIdentity: string;
    readonly state: "resolved" | "deferred" | "reopened";
    readonly note?: string;
    readonly deferredUntilCivilDate?: string;
    readonly now?: Date;
  },
): Promise<TeacherDayCarryForwardTransitionSetting> {
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("Taşınan iş geçiş zamanı geçersiz.");
  }
  const civilDate = civilDateInIstanbul(now);
  const normalizedNote = input.note?.trim() ?? "";
  if (normalizedNote.length > MAX_NOTE_LENGTH) {
    throw new Error("Taşınan iş notu 1200 karakteri aşamaz.");
  }
  const deferredUntilCivilDate = input.deferredUntilCivilDate ?? null;
  if (
    input.state === "deferred" &&
    (!isCivilDate(deferredUntilCivilDate) || deferredUntilCivilDate <= civilDate)
  ) {
    throw new Error("Erteleme tarihi açık İstanbul takvim gününden sonra olmalıdır.");
  }
  if (input.state !== "deferred" && deferredUntilCivilDate !== null) {
    throw new Error("Çözülen veya yeniden açılan iş erteleme tarihi taşıyamaz.");
  }
  const collections = ["academicYears", "classrooms", "settings"] as const;
  return store.transaction("readwrite", collections, async (transaction) => {
    const values = await Promise.all(
      collections.map((collection) => transaction.getAll(collection)),
    );
    const snapshot = createEmptySnapshot();
    collections.forEach((collection, index) => {
      snapshot[collection] = values[index] as StoredRecord[];
    });
    const item = resolveTeacherDayCarryForwardLifecycle(snapshot, civilDate).find(
      (candidate) =>
        candidate.sourceIssueId === input.sourceIssueIdentity ||
        candidate.sourceIssueIdentity === input.sourceIssueIdentity,
    );
    if (!item) {
      throw new Error("Taşınan iş kimliği etkin sınıf kapsamında bulunamadı.");
    }
    const targetNote = normalizedNote || null;
    const targetState = input.state === "reopened" ? "open" : input.state;
    if (
      item.state === targetState &&
      item.latestTransition?.transitionState === input.state &&
      item.latestTransition.transitionNote === targetNote &&
      item.latestTransition.deferredUntilCivilDate === deferredUntilCivilDate
    ) {
      return item.latestTransition;
    }
    if (input.state === "reopened" && item.state !== "resolved") {
      throw new Error("Yalnız çözülmüş taşınan iş yeniden açılabilir.");
    }
    if (input.state !== "reopened" && item.state === "resolved") {
      throw new Error("Çözülmüş taşınan iş yeniden değiştirilemez.");
    }
    const transitionedAt = now.toISOString();
    const closures = snapshot.settings
      .filter(isTeacherDayClosureSetting)
      .sort(oldestFirst);
    const records = item.occurrenceSourceIssueIdentities.map((identity) => {
      const sourceClosure = closures.find(
        (candidate) =>
          candidate.issueCodes.includes(item.issueCode) &&
          teacherDayCarryForwardSourceIdentity({
            academicYearId: candidate.academicYearId,
            classroomId: candidate.classroomId,
            sourceCivilDate: candidate.civilDate,
            sourceIssueCode: item.issueCode,
          }) === identity,
      );
      if (!sourceClosure) {
        throw new Error("Taşınan işin kaynak kapanışı bulunamadı.");
      }
      const previousTransition = snapshot.settings
        .filter(isTeacherDayCarryForwardTransitionSetting)
        .filter((candidate) => candidate.sourceIssueIdentity === identity)
        .sort(transitionOldestFirst)
        .at(-1) ?? null;
      const record: TeacherDayCarryForwardTransitionSetting = {
        id: crypto.randomUUID(),
        settingType: TEACHER_DAY_CARRY_FORWARD_TRANSITION_SETTING_TYPE,
        academicYearId: sourceClosure.academicYearId,
        classroomId: sourceClosure.classroomId,
        civilDate,
        sourceClosureId: sourceClosure.id,
        sourceCivilDate: sourceClosure.civilDate,
        sourceIssueCode: item.issueCode,
        sourceIssueIdentity: identity,
        sourceIssueId: item.sourceIssueId,
        transitionState: input.state,
        transitionedAt,
        transitionNote: targetNote,
        deferredUntilCivilDate,
        previousTransitionId: previousTransition?.id ?? null,
        createdAt: transitionedAt,
        updatedAt: transitionedAt,
        deletedAt: null,
        schemaVersion: TEACHER_DAY_CARRY_FORWARD_TRANSITION_SCHEMA_VERSION,
      };
      if (!isTeacherDayCarryForwardTransitionSetting(record)) {
        throw new Error("Taşınan iş geçişi bütünlük sözleşmesine uymuyor.");
      }
      return record;
    });
    await transaction.putMany("settings", records);
    return records.find(
      (record) => record.sourceIssueIdentity === item.sourceIssueId,
    ) ?? records[0];
  });
}
