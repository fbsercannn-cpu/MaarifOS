import {
  civilDateInIstanbul,
  isCivilDate,
} from "../../core/domain/attendance.ts";
import {
  recordBelongsToClassroomScope,
  resolveActiveClassroomScope,
  type ActiveClassroomScope,
} from "../../core/domain/classroom-scope.ts";
import { isLocalTime } from "../../core/domain/classroom.ts";
import { createEmptySnapshot, type StoredRecord } from "../../core/domain/model.ts";
import type {
  DataTransaction,
  LocalDataStore,
} from "../../core/repository/contracts.ts";

export const CURRICULUM_PROGRAM_LABELS = {
  tymm: "Türkiye Yüzyılı Maarif Modeli",
  meb_2024: "Millî Eğitim Bakanlığı 2024 Okul Öncesi Eğitim Programı",
} as const;

export type CurriculumFramework = keyof typeof CURRICULUM_PROGRAM_LABELS;

export type CurriculumProfileOrigin = "teacher-declared" | "official-catalog";

export interface CurriculumProfileInput {
  framework: CurriculumFramework;
  programLabel: (typeof CURRICULUM_PROGRAM_LABELS)[CurriculumFramework];
  catalogId: string;
  sourceVersion: string;
  referenceOrigin?: CurriculumProfileOrigin;
  officialCatalogVerified?: boolean;
}

export interface CurriculumProfileSnapshot extends CurriculumProfileInput {
  referenceOrigin: CurriculumProfileOrigin;
  officialCatalogVerified: boolean;
}

export interface TeacherConfirmedCurriculumLink {
  id: string;
  framework: CurriculumFramework;
  programLabel: (typeof CURRICULUM_PROGRAM_LABELS)[CurriculumFramework];
  catalogId: string;
  sourceVersion: string;
  referenceCode: string;
  referenceTitle: string;
  confirmedAt: string;
  approvedByUserId: string;
  confirmationMethod: "teacher-confirmed";
  referenceOrigin: CurriculumProfileOrigin;
  officialCatalogVerified: boolean;
}

export interface PlanActivityResult {
  plan: StoredRecord;
  activity: StoredRecord;
}

export interface CapturedEvidenceResult {
  observation: StoredRecord;
}

export interface AssessmentDraftResult {
  draft: StoredRecord;
}

export const LOCAL_TEACHER_IDENTITY_SETTING_ID =
  "00000000-0000-4000-9000-000000000003";
export const LOCAL_TEACHER_IDENTITY_SETTING_TYPE = "local-teacher-identity";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} boş bırakılamaz.`);
  return normalized;
}

function validUuid(value: string | undefined, fieldName: string): string {
  const id = value ?? crypto.randomUUID();
  if (!UUID_PATTERN.test(id)) throw new Error(`${fieldName} kimliği geçersiz.`);
  return id;
}

function validUtc(value: string, fieldName: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${fieldName} UTC ISO biçiminde olmalıdır.`);
  }
  return value;
}

export function normalizeCurriculumProfile(
  profile: CurriculumProfileInput,
): CurriculumProfileSnapshot {
  if (
    profile.framework !== "tymm" &&
    profile.framework !== "meb_2024"
  ) {
    throw new Error("Program çerçevesi TYMM veya MEB 2024 olmalıdır.");
  }
  if (profile.programLabel !== CURRICULUM_PROGRAM_LABELS[profile.framework]) {
    throw new Error("Program adı seçilen çerçevenin doğrulanmış etiketiyle uyuşmuyor.");
  }
  const referenceOrigin = profile.referenceOrigin ?? "teacher-declared";
  if (referenceOrigin !== "teacher-declared" && referenceOrigin !== "official-catalog") {
    throw new Error("Program profilinin kaynak türü geçersiz.");
  }
  const officialCatalogVerified = profile.officialCatalogVerified === true;
  if (officialCatalogVerified && referenceOrigin !== "official-catalog") {
    throw new Error("Yalnız resmî katalog kaynağı doğrulanmış olarak işaretlenebilir.");
  }
  return {
    framework: profile.framework,
    programLabel: profile.programLabel,
    catalogId: requiredText(profile.catalogId, "Program katalog kimliği"),
    sourceVersion: requiredText(profile.sourceVersion, "Program kaynak sürümü"),
    referenceOrigin,
    officialCatalogVerified,
  };
}

function sameCurriculumProfile(
  left: CurriculumProfileSnapshot,
  right: CurriculumProfileSnapshot,
): boolean {
  return (
    left.framework === right.framework &&
    left.programLabel === right.programLabel &&
    left.catalogId === right.catalogId &&
    left.sourceVersion === right.sourceVersion &&
    left.referenceOrigin === right.referenceOrigin &&
    left.officialCatalogVerified === right.officialCatalogVerified
  );
}

function curriculumProfileFromUnknown(value: unknown): CurriculumProfileSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  try {
    return normalizeCurriculumProfile(value as CurriculumProfileInput);
  } catch {
    return null;
  }
}

async function activeScopeInTransaction(
  transaction: DataTransaction,
): Promise<ActiveClassroomScope> {
  const snapshot = createEmptySnapshot();
  [snapshot.academicYears, snapshot.classrooms, snapshot.settings] =
    await Promise.all([
      transaction.getAll("academicYears"),
      transaction.getAll("classrooms"),
      transaction.getAll("settings"),
    ]);
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) {
    throw new Error("Bu işlem için etkin ve arşivlenmemiş bir sınıf gereklidir.");
  }
  return scope;
}

function sameScope(record: StoredRecord, scope: ActiveClassroomScope): boolean {
  return recordBelongsToClassroomScope(record, scope);
}

export async function createPlanWithActivity(
  store: LocalDataStore,
  input: {
    civilDate: string;
    planId?: string;
    planTitle: string;
    activityId?: string;
    activityTitle: string;
    startTime: string;
    endTime?: string;
    curriculumProfile: CurriculumProfileInput;
    now?: Date;
  },
): Promise<PlanActivityResult> {
  if (!isCivilDate(input.civilDate)) {
    throw new Error("Plan günü YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (!isLocalTime(input.startTime) || (input.endTime && !isLocalTime(input.endTime))) {
    throw new Error("Etkinlik saatleri SS:DD biçiminde olmalıdır.");
  }
  if (input.endTime && input.startTime >= input.endTime) {
    throw new Error("Etkinlik bitiş saati başlangıç saatinden sonra olmalıdır.");
  }
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const profile = normalizeCurriculumProfile(input.curriculumProfile);
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  const timestamp = now.toISOString();
  let result: PlanActivityResult | null = null;

  await store.transaction(
    "readwrite",
    ["academicYears", "classrooms", "settings", "plans", "activities"],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, classrooms, plans, activities] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("classrooms"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        input.civilDate < academicYear.startDate ||
        input.civilDate > academicYear.endDate
      ) {
        throw new Error("Plan günü aktif eğitim yılının tarih aralığında olmalıdır.");
      }
      const classroom = classrooms.find((record) => record.id === scope.classroomId);
      const classroomProfile = curriculumProfileFromUnknown(
        classroom?.curriculumProfileSnapshot,
      );
      if (!classroomProfile) {
        throw new Error(
          "Plan oluşturmadan önce sınıf ayarlarında program katalog kimliği ve kaynak sürümü tamamlanmalıdır.",
        );
      }
      if (!sameCurriculumProfile(classroomProfile, profile)) {
        throw new Error("Plan program profili aktif sınıfın kayıtlı program profiliyle uyuşmuyor.");
      }
      if (plans.some((record) => record.id === planId)) {
        throw new Error("Bu plan kimliği zaten kullanılıyor.");
      }
      if (activities.some((record) => record.id === activityId)) {
        throw new Error("Bu etkinlik kimliği zaten kullanılıyor.");
      }
      const plan: StoredRecord = {
        id: planId,
        planType: "daily",
        title: requiredText(input.planTitle, "Plan başlığı"),
        status: "active",
        curriculumProfileSnapshot: profile,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: 1,
      };
      const activity: StoredRecord = {
        id: activityId,
        planId,
        title: requiredText(input.activityTitle, "Etkinlik başlığı"),
        startTime: input.startTime,
        ...(input.endTime ? { endTime: input.endTime } : {}),
        status: "planned",
        curriculumProfileSnapshot: profile,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: input.civilDate,
        deletedAt: null,
        schemaVersion: 1,
      };
      await transaction.putMany("plans", [plan]);
      await transaction.putMany("activities", [activity]);
      result = { plan, activity };
    },
  );
  if (!result) throw new Error("Plan ve etkinlik kaydedilemedi.");
  return result;
}

export async function captureImmutableRawObservation(
  store: LocalDataStore,
  input: {
    observationId?: string;
    studentId: string;
    planId: string;
    activityId: string;
    rawText: string;
    childQuote?: string;
    context?: string;
    observedAt: string;
    now?: Date;
  },
): Promise<CapturedEvidenceResult> {
  const observationId = validUuid(input.observationId, "Gözlem");
  const studentId = validUuid(input.studentId, "Öğrenci");
  const planId = validUuid(input.planId, "Plan");
  const activityId = validUuid(input.activityId, "Etkinlik");
  const observedAt = validUtc(input.observedAt, "Gözlem zamanı");
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir kayıt zamanı gerekli.");
  if (input.rawText.trim().length === 0) {
    throw new Error("Gözlem notu boş bırakılamaz.");
  }
  const timestamp = now.toISOString();
  let observation: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "plans",
      "activities",
      "observations",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [students, plans, activities, observations] = await Promise.all([
        transaction.getAll("students"),
        transaction.getAll("plans"),
        transaction.getAll("activities"),
        transaction.getAll("observations"),
      ]);
      const student = students.find(
        (record) =>
          record.id === studentId &&
          typeof record.deletedAt !== "string" &&
          record.enrollmentStatus !== "left" &&
          record.enrollmentStatus !== "completed" &&
          sameScope(record, scope),
      );
      if (!student) throw new Error("Gözlem notu yalnız etkin sınıftaki çocuğa bağlanabilir.");
      const plan = plans.find(
        (record) =>
          record.id === planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      const activity = activities.find(
        (record) =>
          record.id === activityId &&
          record.planId === planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!plan || !activity) {
        throw new Error("Gözlemin plan ve etkinlik ilişkisi etkin sınıfla uyuşmuyor.");
      }
      if (observations.some((record) => record.id === observationId)) {
        throw new Error("Gözlem notu kimliği daha önce kullanılmış; kanıtın üzerine yazılamaz.");
      }
      observation = {
        id: observationId,
        studentIds: [studentId],
        planId,
        activityId,
        rawText: input.rawText,
        rawTextImmutable: true,
        ...(input.childQuote?.trim() ? { childQuote: input.childQuote.trim() } : {}),
        ...(input.context?.trim() ? { context: input.context.trim() } : {}),
        observedAt,
        workflowStatus: "captured",
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(new Date(observedAt)),
        deletedAt: null,
        schemaVersion: 2,
      };
      await transaction.putMany("observations", [observation]);
    },
  );
  if (!observation) throw new Error("Gözlem notu kaydedilemedi.");
  return { observation };
}

export async function confirmObservationCurriculumLink(
  store: LocalDataStore,
  input: {
    observationId: string;
    framework: CurriculumFramework;
    catalogId: string;
    sourceVersion: string;
    referenceCode: string;
    referenceTitle: string;
    approvedByUserId?: string;
    referenceOrigin?: CurriculumProfileOrigin;
    officialCatalogVerified?: boolean;
    now?: Date;
  },
): Promise<StoredRecord> {
  const observationId = validUuid(input.observationId, "Gözlem");
  const profile = normalizeCurriculumProfile({
    framework: input.framework,
    programLabel: CURRICULUM_PROGRAM_LABELS[input.framework],
    catalogId: input.catalogId,
    sourceVersion: input.sourceVersion,
    referenceOrigin: input.referenceOrigin,
    officialCatalogVerified: input.officialCatalogVerified,
  });
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir onay zamanı gerekli.");
  const timestamp = now.toISOString();
  const requestedApproverId = input.approvedByUserId
    ? validUuid(input.approvedByUserId, "Onaylayan öğretmen")
    : null;
  let result: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "plans",
      "observations",
      "evidenceCurriculumLinks",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [plans, observations, links, settings] = await Promise.all([
        transaction.getAll("plans"),
        transaction.getAll("observations"),
        transaction.getAll("evidenceCurriculumLinks"),
        transaction.getAll("settings"),
      ]);
      const observation = observations.find(
        (record) =>
          record.id === observationId &&
          record.rawTextImmutable === true &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      if (!observation || typeof observation.rawText !== "string") {
        throw new Error("Program bağlantısı kurulacak gözlem notu etkin sınıfta bulunamadı.");
      }
      const plan = plans.find(
        (record) =>
          record.id === observation.planId &&
          typeof record.deletedAt !== "string" &&
          sameScope(record, scope),
      );
      const planProfile = curriculumProfileFromUnknown(
        plan?.curriculumProfileSnapshot,
      );
      if (!planProfile || !sameCurriculumProfile(planProfile, profile)) {
        throw new Error(
          "Program bağlantısı planın doğrulanmış katalog ve program profiliyle uyuşmuyor.",
        );
      }
      const existingLinks = links.filter(
        (link) => link.observationId === observationId,
      );
      const referenceCode = requiredText(input.referenceCode, "Program referans kodu");
      const identitySetting = settings.find(
        (record) =>
          record.id === LOCAL_TEACHER_IDENTITY_SETTING_ID &&
          record.settingType === LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
      );
      const storedApproverId =
        typeof identitySetting?.teacherUserId === "string" &&
        UUID_PATTERN.test(identitySetting.teacherUserId)
          ? identitySetting.teacherUserId
          : null;
      if (
        requestedApproverId &&
        storedApproverId &&
        requestedApproverId !== storedApproverId
      ) {
        throw new Error("Onaylayan öğretmen kimliği bu cihazdaki kalıcı kimlikle uyuşmuyor.");
      }
      const approvedByUserId = storedApproverId ?? requestedApproverId ?? crypto.randomUUID();
      if (!storedApproverId) {
        await transaction.putMany("settings", [
          {
            ...(identitySetting ?? {}),
            id: LOCAL_TEACHER_IDENTITY_SETTING_ID,
            settingType: LOCAL_TEACHER_IDENTITY_SETTING_TYPE,
            teacherUserId: approvedByUserId,
            createdAt: identitySetting?.createdAt ?? timestamp,
            updatedAt: timestamp,
            civilDate: identitySetting?.civilDate ?? civilDateInIstanbul(now),
            deletedAt: null,
            schemaVersion: 1,
          },
        ]);
      }
      if (
        existingLinks.some(
          (link) =>
            link.framework === profile.framework &&
            link.sourceVersion === profile.sourceVersion &&
            link.referenceCode === referenceCode &&
            (link.referenceOrigin ?? "teacher-declared") === profile.referenceOrigin &&
            (link.officialCatalogVerified === true) === profile.officialCatalogVerified,
        )
      ) {
        return;
      }
      const link: TeacherConfirmedCurriculumLink = {
        id: crypto.randomUUID(),
        framework: profile.framework,
        programLabel: profile.programLabel,
        catalogId: profile.catalogId,
        sourceVersion: profile.sourceVersion,
        referenceCode,
        referenceTitle: requiredText(input.referenceTitle, "Program referans başlığı"),
        confirmedAt: timestamp,
        approvedByUserId,
        confirmationMethod: "teacher-confirmed",
        referenceOrigin: profile.referenceOrigin,
        officialCatalogVerified: profile.officialCatalogVerified,
      };
      result = {
        ...link,
        observationId,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: 1,
      };
      await transaction.putMany("evidenceCurriculumLinks", [result]);
    },
  );
  if (result) return result;
  const existing = (await store.readSnapshot()).evidenceCurriculumLinks.find(
    (record) =>
      record.observationId === observationId &&
      record.framework === input.framework &&
      record.catalogId === input.catalogId &&
      record.sourceVersion === input.sourceVersion &&
      record.referenceCode === input.referenceCode.trim(),
  );
  if (!existing) throw new Error("Program bağlantısı kaydedilemedi.");
  return existing;
}

export async function createCitedAssessmentDraft(
  store: LocalDataStore,
  input: {
    draftId?: string;
    studentId: string;
    observationIds: string[];
    teacherAssessmentText: string;
    periodStart: string;
    periodEnd: string;
    now?: Date;
  },
): Promise<AssessmentDraftResult> {
  const draftId = validUuid(input.draftId, "Değerlendirme taslağı");
  const studentId = validUuid(input.studentId, "Öğrenci");
  if (!isCivilDate(input.periodStart) || !isCivilDate(input.periodEnd)) {
    throw new Error("Değerlendirme dönemi YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (input.periodStart > input.periodEnd) {
    throw new Error("Değerlendirme dönemi başlangıcı bitişten sonra olamaz.");
  }
  if (input.observationIds.length === 0) {
    throw new Error("Değerlendirme taslağı en az bir gözlem notuna dayanmalıdır.");
  }
  const observationIds = [...new Set(
    input.observationIds.map((id) => validUuid(id, "Gözlem")),
  )];
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Geçerli bir taslak zamanı gerekli.");
  const timestamp = now.toISOString();
  let draft: StoredRecord | null = null;

  await store.transaction(
    "readwrite",
    [
      "academicYears",
      "classrooms",
      "settings",
      "students",
      "observations",
      "evidenceCurriculumLinks",
      "reportDrafts",
    ],
    async (transaction) => {
      const scope = await activeScopeInTransaction(transaction);
      const [academicYears, students, observations, links, reportDrafts] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("observations"),
        transaction.getAll("evidenceCurriculumLinks"),
        transaction.getAll("reportDrafts"),
      ]);
      const academicYear = academicYears.find(
        (record) => record.id === scope.academicYearId,
      );
      if (
        !academicYear ||
        !isCivilDate(academicYear.startDate) ||
        !isCivilDate(academicYear.endDate) ||
        input.periodStart < academicYear.startDate ||
        input.periodEnd > academicYear.endDate
      ) {
        throw new Error("Değerlendirme dönemi aktif eğitim yılının tarih aralığında olmalıdır.");
      }
      const student = students.find(
        (record) =>
          record.id === studentId &&
          typeof record.deletedAt !== "string" &&
          record.enrollmentStatus !== "left" &&
          record.enrollmentStatus !== "completed" &&
          sameScope(record, scope),
      );
      if (!student) {
        throw new Error("Değerlendirme yalnız etkin sınıftaki çocuk için hazırlanabilir.");
      }
      if (reportDrafts.some((record) => record.id === draftId)) {
        throw new Error("Bu değerlendirme taslağı kimliği zaten kullanılıyor.");
      }
      const selected = observationIds.map((id) =>
        observations.find(
          (record) =>
            record.id === id &&
            record.rawTextImmutable === true &&
            typeof record.deletedAt !== "string" &&
            sameScope(record, scope) &&
            Array.isArray(record.studentIds) &&
            record.studentIds.includes(studentId),
        ),
      );
      if (selected.some((record) => record === undefined)) {
        throw new Error("Seçilen gözlemlerden biri çocuk veya sınıf kapsamıyla uyuşmuyor.");
      }
      if (
        selected.some(
          (record) =>
            typeof record?.civilDate !== "string" ||
            record.civilDate < input.periodStart ||
            record.civilDate > input.periodEnd,
        )
      ) {
        throw new Error("Seçilen gözlemler değerlendirme tarih aralığında olmalıdır.");
      }
      const selectedLinks = observationIds.map((observationId) =>
        links.filter(
          (link) =>
            link.observationId === observationId &&
            link.confirmationMethod === "teacher-confirmed" &&
            typeof link.deletedAt !== "string" &&
            sameScope(link, scope),
        ),
      );
      if (selectedLinks.some((observationLinks) => observationLinks.length === 0)) {
        throw new Error("Her kanıt için öğretmen onaylı program bağlantısı gereklidir.");
      }
      const linkProfiles = selectedLinks
        .flat()
        .map(
          (link) =>
            `${String(link.framework)}\u0000${String(link.catalogId)}\u0000${String(link.sourceVersion)}`,
        );
      if (new Set(linkProfiles).size !== 1) {
        throw new Error(
          "Bir değerlendirme taslağında farklı program, katalog veya kaynak sürümleri karıştırılamaz.",
        );
      }
      const selectedFlatLinks = selectedLinks.flat();
      const referenceVerificationStatus = selectedFlatLinks.every(
        (link) =>
          link.referenceOrigin === "official-catalog" &&
          link.officialCatalogVerified === true,
      )
        ? "official-catalog-verified"
        : "teacher-declared-unverified";
      const citations = selected.map((record, index) => ({
        observationId: record!.id,
        observedAt: record!.observedAt,
        confirmedCurriculumLinkIds: selectedLinks[index].map((link) => link.id),
      }));
      draft = {
        id: draftId,
        reportType: "evidence-assessment",
        status: "teacher-review-required",
        studentIds: [studentId],
        observationIds,
        evidenceCitations: citations,
        teacherAssessmentText: requiredText(
          input.teacherAssessmentText,
          "Öğretmen değerlendirmesi",
        ),
        authoredBy: "teacher",
        teacherReviewRequired: true,
        reviewStatus: "pending",
        reviewedByUserId: null,
        reviewedAt: null,
        generationMode: "teacher-authored-cited-draft",
        referenceVerificationStatus,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        academicYearId: scope.academicYearId,
        classroomId: scope.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: 1,
      };
      await transaction.putMany("reportDrafts", [draft]);
    },
  );
  if (!draft) throw new Error("Kaynaklı değerlendirme taslağı oluşturulamadı.");
  return { draft };
}
