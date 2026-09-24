import {
  isClassroomSchedule,
  type ClassroomSchedule,
} from "./classroom.ts";

export const TEACHER_OWNED_DAILY_FLOW_SCHEMA_VERSION = 1 as const;
export const TEACHER_OWNED_DAILY_FLOW_ORIGIN = "teacher-authored" as const;

export const TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS = [
  "welcome",
  "center-play",
  "community-circle",
  "teacher-activity-one",
  "food-selfcare",
  "outdoor-movement",
  "teacher-activity-two",
  "rest-regulation",
  "small-group",
  "closing",
] as const;

export type TeacherOwnedDailyFlowBlockKind =
  (typeof TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS)[number];
export type TeacherOwnedActivityFlowBlockKind =
  | "teacher-activity-one"
  | "teacher-activity-two";
export type TeacherOwnedDailyFlowBlockStatus =
  | "planned"
  | "optional"
  | "skipped";

export interface TeacherOwnedDailyFlowBlock {
  readonly id: string;
  readonly order: number;
  readonly kind: TeacherOwnedDailyFlowBlockKind;
  readonly title: string;
  readonly status: TeacherOwnedDailyFlowBlockStatus;
  readonly durationMinutes: number;
  readonly transitionNote: string;
  readonly teacherNote: string;
}

export interface TeacherOwnedDailyFlowAuthorshipConfirmation {
  readonly confirmationMethod: "teacher-reviewed";
  readonly confirmedAt: string;
  readonly confirmedByUserId: string;
}

export interface TeacherOwnedDailyFlowTemplateSource {
  readonly mode: "previous-day" | "weekly-template";
  readonly sourcePlanId: string;
  readonly sourceWeeklyPlanId: string;
  readonly sourceCivilDate: string;
  readonly sourceFlowRevisionNumber: number;
}

export interface TeacherOwnedDailyFlowBlockDraft {
  readonly id?: string;
  readonly kind: TeacherOwnedDailyFlowBlockKind;
  readonly title: string;
  readonly status: TeacherOwnedDailyFlowBlockStatus;
  readonly durationMinutes: number;
  readonly transitionNote: string;
  readonly teacherNote: string;
}

export type TeacherOwnedDailyFlowBlockEdit = Omit<
  TeacherOwnedDailyFlowBlock,
  "order"
>;

export interface TeacherOwnedDailyFlowRevisionSnapshot {
  readonly revisionNumber: number;
  readonly blocks: readonly TeacherOwnedDailyFlowBlock[];
  readonly updatedAt: string;
  readonly capturedAt: string;
  readonly authorshipConfirmation: TeacherOwnedDailyFlowAuthorshipConfirmation;
}

export interface TeacherOwnedDailyFlow {
  readonly schemaVersion: typeof TEACHER_OWNED_DAILY_FLOW_SCHEMA_VERSION;
  readonly flowOrigin: typeof TEACHER_OWNED_DAILY_FLOW_ORIGIN;
  readonly revisionNumber: number;
  readonly revisionHistory: readonly TeacherOwnedDailyFlowRevisionSnapshot[];
  readonly blocks: readonly TeacherOwnedDailyFlowBlock[];
  readonly scheduleSnapshot: ClassroomSchedule;
  readonly authorshipConfirmation: TeacherOwnedDailyFlowAuthorshipConfirmation;
  readonly templateSource?: TeacherOwnedDailyFlowTemplateSource;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function isTemplateSource(value: unknown): value is TeacherOwnedDailyFlowTemplateSource {
  return isObject(value) &&
    hasExactKeys(value, [
      "mode",
      "sourcePlanId",
      "sourceWeeklyPlanId",
      "sourceCivilDate",
      "sourceFlowRevisionNumber",
    ]) &&
    (value.mode === "previous-day" || value.mode === "weekly-template") &&
    typeof value.sourcePlanId === "string" &&
    UUID_PATTERN.test(value.sourcePlanId) &&
    typeof value.sourceWeeklyPlanId === "string" &&
    UUID_PATTERN.test(value.sourceWeeklyPlanId) &&
    typeof value.sourceCivilDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.sourceCivilDate) &&
    Number.isInteger(value.sourceFlowRevisionNumber) &&
    Number(value.sourceFlowRevisionNumber) >= 1;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BLOCK_STATUSES: readonly TeacherOwnedDailyFlowBlockStatus[] = [
  "planned",
  "optional",
  "skipped",
];

const DEFAULT_BLOCKS: readonly Omit<
  TeacherOwnedDailyFlowBlockDraft,
  "id"
>[] = [
  { kind: "welcome", title: "Karşılama ve güne geçiş", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "center-play", title: "Merkezlerde serbest oyun", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "community-circle", title: "Topluluk çemberi", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "teacher-activity-one", title: "Öğretmenin planladığı etkinlik 1", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "food-selfcare", title: "Beslenme ve öz bakım", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "outdoor-movement", title: "Açık hava ve hareket", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "teacher-activity-two", title: "Öğretmenin planladığı etkinlik 2", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "rest-regulation", title: "Dinlenme ve düzenleme", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "small-group", title: "Küçük grup çalışması", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
  { kind: "closing", title: "Günü değerlendirme ve ayrılış", status: "planned", durationMinutes: 30, transitionNote: "", teacherNote: "" },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} zorunludur.`);
  }
  if (value.trim().length > 200) {
    throw new Error(`${label} 200 karakteri aşamaz.`);
  }
  return value.trim();
}

function boundedNote(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string") throw new Error(`${label} metin olmalıdır.`);
  if (value.length > maximum) {
    throw new Error(`${label} ${maximum} karakteri aşamaz.`);
  }
  return value;
}

function validTimestamp(now: Date, label: string): string {
  if (Number.isNaN(now.getTime())) throw new Error(`${label} geçerli olmalıdır.`);
  return now.toISOString();
}

function minutesFromLocalTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function scheduleMinutes(schedule: ClassroomSchedule): number {
  return minutesFromLocalTime(schedule.endTime) -
    minutesFromLocalTime(schedule.startTime);
}

function isBlock(
  value: unknown,
  expectedOrder: number,
): value is TeacherOwnedDailyFlowBlock {
  if (!isObject(value)) return false;
  const expectedKind = TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS[expectedOrder - 1];
  return (
    hasExactKeys(value, [
      "id",
      "order",
      "kind",
      "title",
      "status",
      "durationMinutes",
      "transitionNote",
      "teacherNote",
    ]) &&
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    value.order === expectedOrder &&
    value.kind === expectedKind &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title === value.title.trim() &&
    value.title.length <= 200 &&
    BLOCK_STATUSES.includes(value.status as TeacherOwnedDailyFlowBlockStatus) &&
    Number.isInteger(value.durationMinutes) &&
    Number(value.durationMinutes) >= 5 &&
    Number(value.durationMinutes) <= 240 &&
    typeof value.transitionNote === "string" &&
    value.transitionNote.length <= 500 &&
    typeof value.teacherNote === "string" &&
    value.teacherNote.length <= 1_000
  );
}

function isBlockSequence(value: unknown): value is readonly TeacherOwnedDailyFlowBlock[] {
  return (
    Array.isArray(value) &&
    value.length === TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS.length &&
    value.every((block, index) => isBlock(block, index + 1)) &&
    new Set(value.map((block) => block.id)).size === value.length &&
    value.some((block) => block.status === "planned")
  );
}

function sameBlockIdentity(
  left: readonly TeacherOwnedDailyFlowBlock[],
  right: readonly TeacherOwnedDailyFlowBlock[],
): boolean {
  return left.every(
    (block, index) =>
      block.id === right[index]?.id &&
      block.order === right[index]?.order &&
      block.kind === right[index]?.kind,
  );
}

function normalizeDrafts(
  drafts: readonly TeacherOwnedDailyFlowBlockDraft[],
  expectedTotalMinutes: number,
  expectedIds?: readonly string[],
): TeacherOwnedDailyFlowBlock[] {
  if (drafts.length !== TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS.length) {
    throw new Error("Öğretmen günlük akışı tam olarak 10 bölüm taşımalıdır.");
  }
  const blocks = drafts.map((draft, index) => {
    const expectedKind = TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS[index];
    if (draft.kind !== expectedKind) {
      throw new Error(`Günlük akışın ${index + 1}. bölümü ${expectedKind} türünde olmalıdır.`);
    }
    const id = expectedIds?.[index] ?? draft.id ?? crypto.randomUUID();
    if (!UUID_PATTERN.test(id) || (expectedIds && draft.id !== id)) {
      throw new Error(`Günlük akışın ${index + 1}. bölüm kimliği değiştirilemez.`);
    }
    if (!BLOCK_STATUSES.includes(draft.status)) {
      throw new Error(`Günlük akışın ${index + 1}. bölüm durumu geçersizdir.`);
    }
    if (
      !Number.isInteger(draft.durationMinutes) ||
      draft.durationMinutes < 5 ||
      draft.durationMinutes > 240
    ) {
      throw new Error(`Günlük akışın ${index + 1}. bölüm süresi 5-240 dakika olmalıdır.`);
    }
    return {
      id,
      order: index + 1,
      kind: expectedKind,
      title: requiredText(draft.title, `Günlük akışın ${index + 1}. bölüm başlığı`),
      status: draft.status,
      durationMinutes: draft.durationMinutes,
      transitionNote: boundedNote(
        draft.transitionNote,
        `Günlük akışın ${index + 1}. geçiş notu`,
        500,
      ),
      teacherNote: boundedNote(
        draft.teacherNote,
        `Günlük akışın ${index + 1}. öğretmen notu`,
        1_000,
      ),
    } satisfies TeacherOwnedDailyFlowBlock;
  });
  if (new Set(blocks.map((block) => block.id)).size !== blocks.length) {
    throw new Error("Öğretmen günlük akışındaki bölüm kimlikleri benzersiz olmalıdır.");
  }
  if (!blocks.some((block) => block.status === "planned")) {
    throw new Error("Öğretmen günlük akışında en az bir uygulanacak bölüm bulunmalıdır.");
  }
  const totalMinutes = blocks.reduce(
    (total, block) => total + block.durationMinutes,
    0,
  );
  if (totalMinutes !== expectedTotalMinutes) {
    throw new Error(
      `Öğretmen günlük akışı ${expectedTotalMinutes} dakikalık sınıf düzeniyle tam eşleşmelidir; mevcut toplam ${totalMinutes} dakikadır.`,
    );
  }
  return blocks;
}

export function defaultTeacherOwnedDailyFlowBlockDrafts(
  totalMinutes = 300,
): TeacherOwnedDailyFlowBlockDraft[] {
  if (
    !Number.isInteger(totalMinutes) ||
    totalMinutes < TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS.length * 5 ||
    totalMinutes > TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS.length * 240
  ) {
    throw new Error("Sınıf günlük süresi 50-2400 dakika aralığında olmalıdır.");
  }
  const baseDuration = Math.floor(
    totalMinutes / TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS.length,
  );
  const remainder = totalMinutes % TEACHER_OWNED_DAILY_FLOW_BLOCK_KINDS.length;
  return DEFAULT_BLOCKS.map((block, index) => ({
    ...block,
    durationMinutes: baseDuration + (index < remainder ? 1 : 0),
  }));
}

export function createTeacherOwnedDailyFlow(input: {
  readonly blocks: readonly TeacherOwnedDailyFlowBlockDraft[];
  readonly schedule: ClassroomSchedule;
  readonly confirmedByUserId: string;
  readonly templateSource?: TeacherOwnedDailyFlowTemplateSource;
  readonly now?: Date;
}): TeacherOwnedDailyFlow {
  const timestamp = validTimestamp(input.now ?? new Date(), "Günlük akış kayıt zamanı");
  if (!isClassroomSchedule(input.schedule)) {
    throw new Error("Öğretmen günlük akışı için geçerli sınıf çalışma düzeni gereklidir.");
  }
  if (!UUID_PATTERN.test(input.confirmedByUserId)) {
    throw new Error("Günlük akışı onaylayan yerel öğretmen kimliği geçersizdir.");
  }
  if (input.templateSource !== undefined && !isTemplateSource(input.templateSource)) {
    throw new Error("Günlük akış şablon kaynağı doğrulanamadı.");
  }
  const totalMinutes = scheduleMinutes(input.schedule);
  return {
    schemaVersion: TEACHER_OWNED_DAILY_FLOW_SCHEMA_VERSION,
    flowOrigin: TEACHER_OWNED_DAILY_FLOW_ORIGIN,
    revisionNumber: 1,
    revisionHistory: [],
    blocks: normalizeDrafts(
      input.blocks,
      totalMinutes,
    ),
    scheduleSnapshot: structuredClone(input.schedule),
    authorshipConfirmation: {
      confirmationMethod: "teacher-reviewed",
      confirmedAt: timestamp,
      confirmedByUserId: input.confirmedByUserId,
    },
    ...(input.templateSource
      ? { templateSource: structuredClone(input.templateSource) }
      : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isTeacherOwnedDailyFlow(value: unknown): value is TeacherOwnedDailyFlow {
  const expectedKeys = [
    "schemaVersion",
    "flowOrigin",
    "revisionNumber",
    "revisionHistory",
    "blocks",
    "scheduleSnapshot",
    "authorshipConfirmation",
    "createdAt",
    "updatedAt",
    ...(isObject(value) && value.templateSource !== undefined
      ? ["templateSource"]
      : []),
  ];
  if (
    !isObject(value) ||
    !hasExactKeys(value, expectedKeys) ||
    value.schemaVersion !== TEACHER_OWNED_DAILY_FLOW_SCHEMA_VERSION ||
    value.flowOrigin !== TEACHER_OWNED_DAILY_FLOW_ORIGIN ||
    !Number.isInteger(value.revisionNumber) ||
    Number(value.revisionNumber) < 1 ||
    !isUtcIso(value.createdAt) ||
    !isUtcIso(value.updatedAt) ||
    value.createdAt > value.updatedAt ||
    !isObject(value.scheduleSnapshot) ||
    !hasExactKeys(value.scheduleSnapshot, [
      "kind",
      "startTime",
      "endTime",
      "timeZone",
    ]) ||
    !isClassroomSchedule(value.scheduleSnapshot) ||
    !isObject(value.authorshipConfirmation) ||
    !hasExactKeys(value.authorshipConfirmation, [
      "confirmationMethod",
      "confirmedAt",
      "confirmedByUserId",
    ]) ||
    value.authorshipConfirmation.confirmationMethod !== "teacher-reviewed" ||
    value.authorshipConfirmation.confirmedAt !== value.updatedAt ||
    !UUID_PATTERN.test(String(value.authorshipConfirmation.confirmedByUserId)) ||
    (value.templateSource !== undefined && !isTemplateSource(value.templateSource)) ||
    !isBlockSequence(value.blocks) ||
    value.blocks.reduce(
      (total, block) => total + Number(block.durationMinutes),
      0,
    ) !== scheduleMinutes(value.scheduleSnapshot) ||
    !Array.isArray(value.revisionHistory) ||
    value.revisionHistory.length !== Number(value.revisionNumber) - 1
  ) {
    return false;
  }
  let previousUpdatedAt = value.createdAt;
  for (let index = 0; index < value.revisionHistory.length; index += 1) {
    const candidate = value.revisionHistory[index];
    if (
      !isObject(candidate) ||
      !hasExactKeys(candidate, [
        "revisionNumber",
        "blocks",
        "updatedAt",
        "capturedAt",
        "authorshipConfirmation",
      ]) ||
      candidate.revisionNumber !== index + 1 ||
      !isUtcIso(candidate.updatedAt) ||
      !isUtcIso(candidate.capturedAt) ||
      candidate.updatedAt !== previousUpdatedAt ||
      candidate.capturedAt <= candidate.updatedAt ||
      !isObject(candidate.authorshipConfirmation) ||
      !hasExactKeys(candidate.authorshipConfirmation, [
        "confirmationMethod",
        "confirmedAt",
        "confirmedByUserId",
      ]) ||
      candidate.authorshipConfirmation.confirmationMethod !== "teacher-reviewed" ||
      candidate.authorshipConfirmation.confirmedAt !== candidate.updatedAt ||
      !UUID_PATTERN.test(String(candidate.authorshipConfirmation.confirmedByUserId)) ||
      !isBlockSequence(candidate.blocks) ||
      candidate.blocks.reduce(
        (total, block) => total + block.durationMinutes,
        0,
      ) !== scheduleMinutes(value.scheduleSnapshot) ||
      !sameBlockIdentity(candidate.blocks, value.blocks)
    ) {
      return false;
    }
    previousUpdatedAt = candidate.capturedAt;
  }
  return previousUpdatedAt === value.updatedAt;
}

export function reviseTeacherOwnedDailyFlow(
  current: TeacherOwnedDailyFlow,
  edits: readonly TeacherOwnedDailyFlowBlockEdit[],
  confirmedByUserId: string,
  now: Date = new Date(),
): TeacherOwnedDailyFlow {
  if (!isTeacherOwnedDailyFlow(current)) {
    throw new Error("Öğretmen günlük akışının mevcut sürümü doğrulanamadı.");
  }
  const timestamp = validTimestamp(now, "Günlük akış revizyon zamanı");
  if (timestamp <= current.updatedAt) {
    throw new Error("Günlük akış revizyon zamanı mevcut sürümden sonra olmalıdır.");
  }
  if (!UUID_PATTERN.test(confirmedByUserId)) {
    throw new Error("Günlük akış revizyonunu onaylayan yerel öğretmen kimliği geçersizdir.");
  }
  const blocks = normalizeDrafts(
    edits,
    scheduleMinutes(current.scheduleSnapshot),
    current.blocks.map((block) => block.id),
  );
  return {
    schemaVersion: current.schemaVersion,
    flowOrigin: current.flowOrigin,
    revisionNumber: current.revisionNumber + 1,
    revisionHistory: [
      ...current.revisionHistory.map((snapshot) => structuredClone(snapshot)),
      {
        revisionNumber: current.revisionNumber,
        blocks: current.blocks.map((block) => structuredClone(block)),
        updatedAt: current.updatedAt,
        capturedAt: timestamp,
        authorshipConfirmation: structuredClone(current.authorshipConfirmation),
      },
    ],
    blocks,
    scheduleSnapshot: structuredClone(current.scheduleSnapshot),
    authorshipConfirmation: {
      confirmationMethod: "teacher-reviewed",
      confirmedAt: timestamp,
      confirmedByUserId,
    },
    ...(current.templateSource
      ? { templateSource: structuredClone(current.templateSource) }
      : {}),
    createdAt: current.createdAt,
    updatedAt: timestamp,
  };
}
