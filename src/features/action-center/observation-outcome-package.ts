import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import {
  COLLECTION_NAMES,
  createEmptySnapshot,
  type CollectionName,
  type DataSnapshot,
  type StoredRecord,
} from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";
import { createCitedAssessmentDraft } from "../evidence/evidence-flow.ts";
import { generateParentEmpathyDigest } from "../../services/parent-empathy-shield.ts";

export const OBSERVATION_FAMILY_BULLETIN_REPORT_TYPE =
  "observation-family-bulletin" as const;

export interface ObservationOutcomeCandidate {
  readonly studentId: string;
  readonly observationId: string;
  readonly studentName: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly assessmentText: string;
  readonly familyBulletinText: string;
  readonly sourceDisclosure: string;
  readonly uncertaintyDisclosure: string;
  readonly generationMode: "local-safe-fallback" | "deepseek";
  readonly aiModel?: string;
  readonly privacyDisclosure: string;
  readonly expectedSourceFingerprint: string;
}

export interface ObservationOutcomeResult {
  readonly alreadyCompleted: boolean;
  readonly assessmentDraftId?: string;
  readonly familyBulletinDraftId?: string;
}

const live = (record: StoredRecord): boolean =>
  typeof record.deletedAt !== "string";

function mondayToFriday(day: string): { start: string; end: string } {
  const date = new Date(`${day}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 4);
  return { start, end: date.toISOString().slice(0, 10) };
}

function normalizeObservation(rawText: unknown): string {
  return String(rawText ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function sourceFingerprint(
  snapshot: DataSnapshot,
  studentId: string,
  observationId: string,
): string | null {
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return null;
  const student = snapshot.students.find(
    (record) =>
      record.id === studentId &&
      live(record) &&
      record.active !== false &&
      recordBelongsToClassroomScope(record, scope),
  );
  const observation = snapshot.observations.find(
    (record) =>
      record.id === observationId &&
      live(record) &&
      record.rawTextImmutable === true &&
      recordBelongsToClassroomScope(record, scope) &&
      (record.studentId === studentId ||
        (Array.isArray(record.studentIds) &&
          record.studentIds.includes(studentId))),
  );
  if (!student || !observation) return null;
  const links = snapshot.evidenceCurriculumLinks
    .filter(
      (record) =>
        record.observationId === observationId &&
        record.confirmationMethod === "teacher-confirmed" &&
        live(record) &&
        recordBelongsToClassroomScope(record, scope),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  if (links.length === 0) return null;
  return canonicalJson({ scope, student, observation, links });
}

export function observationOutcomeCandidate(
  snapshot: DataSnapshot,
  studentId?: string,
  observationId?: string,
): ObservationOutcomeCandidate | null {
  if (!studentId || !observationId) return null;
  const fingerprint = sourceFingerprint(snapshot, studentId, observationId);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!fingerprint || !scope) return null;
  const student = snapshot.students.find((record) => record.id === studentId)!;
  const observation = snapshot.observations.find(
    (record) => record.id === observationId,
  )!;
  const rawText = normalizeObservation(observation.rawText);
  if (!rawText || !isCivilDate(observation.civilDate)) return null;
  const academicYear = snapshot.academicYears.find(
    (record) => record.id === scope.academicYearId && live(record),
  );
  if (
    !academicYear ||
    !isCivilDate(academicYear.startDate) ||
    !isCivilDate(academicYear.endDate)
  ) return null;
  const week = mondayToFriday(observation.civilDate);
  const periodStart = [week.start, academicYear.startDate].sort().at(-1)!;
  const periodEnd = [week.end, academicYear.endDate].sort()[0];
  if (periodStart > periodEnd) return null;
  const studentName = String(student.displayName ?? "Öğrencimiz").trim() ||
    "Öğrencimiz";
  const digest = generateParentEmpathyDigest({
    studentName,
    observationText: rawText,
  });
  return {
    studentId,
    observationId,
    studentName,
    periodStart,
    periodEnd,
    assessmentText:
      `${studentName} için ${observation.civilDate} tarihli gözlemde şu somut durum kaydedildi: ${rawText} ` +
      "Bu metin tek bir gözleme dayanan öğretmen inceleme taslağıdır; gelişim düzeyi veya tanı belirtmez.",
    familyBulletinText: digest.digestMessage,
    sourceDisclosure:
      "Kaynak: seçilen ham gözlem ve öğretmenin onayladığı program bağlantıları.",
    uncertaintyDisclosure:
      "Taslak otomatik hüküm değildir. Paylaşmadan veya resmi değerlendirmede kullanmadan önce öğretmen kontrolü gerekir.",
    generationMode: "local-safe-fallback",
    privacyDisclosure:
      "Cihaz içi taslakta gözlem metni ağ üzerinden bir yapay zekâ sağlayıcısına gönderilmedi.",
    expectedSourceFingerprint: fingerprint,
  };
}

function packageDrafts(
  snapshot: DataSnapshot,
  studentId: string,
  observationId: string,
): StoredRecord[] {
  const bulletins = snapshot.reportDrafts.filter(
    (record) =>
      Array.isArray(record.studentIds) &&
      record.studentIds.includes(studentId) &&
      record.reportType === OBSERVATION_FAMILY_BULLETIN_REPORT_TYPE &&
      Array.isArray(record.selectedObservationIds) &&
      record.selectedObservationIds.includes(observationId) &&
      live(record),
  );
  const linkedAssessmentIds = new Set(bulletins.flatMap((record) => {
    const sections = record.editableSections;
    if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
      return [];
    }
    const sourceAssessmentDraftId = (sections as Record<string, unknown>)
      .sourceAssessmentDraftId;
    return typeof sourceAssessmentDraftId === "string"
      ? [sourceAssessmentDraftId]
      : [];
  }));
  const assessments = snapshot.reportDrafts.filter(
    (record) =>
      record.reportType === "evidence-assessment" &&
      linkedAssessmentIds.has(record.id) &&
      live(record),
  );
  return [...assessments, ...bulletins];
}

function memoryStore(snapshot: DataSnapshot): LocalDataStore {
  const transaction = {
    getAll: async (name: CollectionName) =>
      structuredClone(snapshot[name]) as StoredRecord[],
    putMany: async (
      name: CollectionName,
      records: readonly StoredRecord[],
    ) => {
      const collection = snapshot[name] as StoredRecord[];
      for (const record of records) {
        const index = collection.findIndex((item) => item.id === record.id);
        if (index < 0) collection.push(structuredClone(record));
        else collection[index] = structuredClone(record);
      }
    },
    clear: async (name: CollectionName) => {
      snapshot[name] = [];
    },
  } as DataTransaction;
  return {
    readSnapshot: async () => structuredClone(snapshot),
    transaction: async (_mode, _collections, task) => task(transaction),
    close() {},
  };
}

async function readSnapshot(transaction: DataTransaction): Promise<DataSnapshot> {
  const snapshot = createEmptySnapshot();
  for (const name of COLLECTION_NAMES) {
    snapshot[name] = await transaction.getAll(name);
  }
  return snapshot;
}

export async function saveObservationOutcomePackage(
  store: LocalDataStore,
  input: ObservationOutcomeCandidate & { now?: Date },
): Promise<ObservationOutcomeResult> {
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("Kayıt zamanı geçersiz.");
  return store.transaction("readwrite", COLLECTION_NAMES, async (transaction) => {
    const current = await readSnapshot(transaction);
  const existing = packageDrafts(
      current,
      input.studentId,
      input.observationId,
    );
    const existingAssessment = existing.filter(
      (record) => record.reportType === "evidence-assessment",
    );
    const existingBulletin = existing.filter(
      (record) => record.reportType === OBSERVATION_FAMILY_BULLETIN_REPORT_TYPE,
    );
    if (existingAssessment.length === 1 && existingBulletin.length === 1) {
      return { alreadyCompleted: true };
    }
    if (existing.length !== 0) {
      throw new Error(
        "Önceki değerlendirme paketinin bir bölümü eksik. Kayıtlar değiştirilmeden incelemeye alındı.",
      );
    }
    const candidate = observationOutcomeCandidate(
      current,
      input.studentId,
      input.observationId,
    );
    const assessmentText = normalizeObservation(input.assessmentText);
    const familyBulletinText = normalizeObservation(input.familyBulletinText);
    if (
      !candidate ||
      candidate.expectedSourceFingerprint !== input.expectedSourceFingerprint ||
      canonicalJson({
        periodStart: candidate.periodStart,
        periodEnd: candidate.periodEnd,
      }) !== canonicalJson({
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      })
    ) {
      throw new Error(
        "Gözlem veya program bağlantısı değişti. Güncel taslağı yeniden açın.",
      );
    }
    if (
      assessmentText.length < 20 || assessmentText.length > 12_000 ||
      familyBulletinText.length < 20 || familyBulletinText.length > 12_000
    ) {
      throw new Error("İki taslağı da anlamlı ve güvenli uzunlukta tamamlayın.");
    }
    if (!["local-safe-fallback", "deepseek"].includes(input.generationMode)) {
      throw new Error("Taslak üretim modu doğrulanamadı.");
    }
    if (
      input.generationMode === "deepseek" &&
      (typeof input.aiModel !== "string" || !/^[A-Za-z0-9._-]{2,80}$/u.test(input.aiModel))
    ) {
      throw new Error("DeepSeek model bilgisi doğrulanamadı.");
    }

    const after = structuredClone(current);
    const staged = memoryStore(after);
    const sourceUpdatedAt = Date.parse(String(after.observations.find(
      (record) => record.id === input.observationId,
    )?.updatedAt ?? ""));
    if (!Number.isFinite(sourceUpdatedAt)) {
      throw new Error("Gözlemin kaynak zamanı doğrulanamadı.");
    }
    const timestamp = new Date(Math.max(now.getTime(), sourceUpdatedAt + 1));
    const assessment = await createCitedAssessmentDraft(staged, {
      studentId: input.studentId,
      observationIds: [input.observationId],
      teacherAssessmentText: assessmentText,
      completeTeacherAssessment: true,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      now: timestamp,
    });
    const assessmentDraft = assessment.draft;

    const scope = resolveActiveClassroomScope(after);
    if (!scope) throw new Error("Etkin sınıf değişti. Paketi yeniden açın.");
    const bulletinId = crypto.randomUUID();
    const bulletin: StoredRecord = {
      id: bulletinId,
      reportType: OBSERVATION_FAMILY_BULLETIN_REPORT_TYPE,
      scope: "selected-child-observation",
      status: "teacher-saved",
      studentIds: [input.studentId],
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      selectedObservationIds: [input.observationId],
      selectedMediaIds: [],
      editableSections: {
        familyBulletinText,
        sourceAssessmentDraftId: assessmentDraft.id,
        sourceDisclosure: input.sourceDisclosure,
        uncertaintyDisclosure: input.uncertaintyDisclosure,
        aiGenerationMode: input.generationMode,
        aiModel: input.aiModel ?? null,
        privacyDisclosure: input.privacyDisclosure,
      },
      teacherReviewRequired: false,
      reviewedByUserId: assessmentDraft.reviewedByUserId,
      reviewedAt: assessmentDraft.reviewedAt,
      academicYearId: scope.academicYearId,
      classroomId: scope.classroomId,
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
      civilDate: civilDateInIstanbul(timestamp),
      deletedAt: null,
      schemaVersion: 1,
    };
    after.reportDrafts.push(bulletin);

    await transaction.putMany("settings", after.settings.filter((record) =>
      !current.settings.some((existingRecord) =>
        existingRecord.id === record.id &&
        canonicalJson(existingRecord) === canonicalJson(record)
      )
    ));
    await transaction.putMany("reportDrafts", [assessmentDraft, bulletin]);
    return {
      alreadyCompleted: false,
      assessmentDraftId: assessmentDraft.id,
      familyBulletinDraftId: bulletinId,
    };
  });
}
