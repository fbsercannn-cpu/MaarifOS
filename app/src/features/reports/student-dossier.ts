import { civilDateInIstanbul, isCivilDate } from "../../core/domain/attendance.ts";
import { sha256Hex } from "../../core/backup/crypto.ts";
import { formatStudentPhone, studentContactsFromRecord } from "../../core/domain/student.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import {
  buildStudentLongitudinalArchive,
  type StudentLongitudinalArchive,
} from "../archive/academic-year-archive.ts";
import { formatObservationDateTime } from "../students/student-profile-tools.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DOSSIER_DESTINATIONS = [
  "whatsapp",
  "chatgpt",
  "gemini",
  "file",
] as const;
export type DossierDestination = (typeof DOSSIER_DESTINATIONS)[number];

export const DOSSIER_AUDIENCES = [
  "parent",
  "administration",
  "guidance",
  "teacher",
] as const;
export type DossierAudience = (typeof DOSSIER_AUDIENCES)[number];

export type DossierIdentityMode = "full" | "alias";

export interface StudentDossierOptions {
  destination: DossierDestination;
  audience: DossierAudience;
  identityMode: DossierIdentityMode;
  alias?: string;
  periodStart: string;
  periodEnd: string;
  includeContacts: boolean;
  includeAttendance: boolean;
  includeObservations: boolean;
  includePortfolio: boolean;
  includeExternalFeedback: boolean;
  personalDataApprovedForAi?: boolean;
}

export interface StudentDossier {
  fileName: string;
  title: string;
  text: string;
  includedEntityIds: Record<string, string[]>;
  manifest: Record<string, unknown>;
}

export interface ExternalAiFeedback {
  id: string;
  provider: "chatgpt" | "gemini" | "other";
  audience: DossierAudience;
  periodStart: string;
  periodEnd: string;
  receivedAt: string;
  feedbackText: string;
  teacherNote?: string;
  includeInTermSummary: boolean;
  includeInYearSummary: boolean;
  linkedExportPackageId?: string;
}

export interface ExternalFeedbackAggregation {
  kind: "term" | "year";
  studentId: string;
  academicYearId: string;
  periodStart: string;
  periodEnd: string;
  feedbackIds: string[];
  contentHashes: string[];
  text: string;
}

const audienceLabels: Record<DossierAudience, string> = {
  parent: "veli bilgilendirmesi",
  administration: "okul idaresi dosyası",
  guidance: "rehberlik öğretmeni değerlendirme hazırlığı",
  teacher: "öğretmen dönem/yıl sonu çalışma özeti",
};

function safeFileStem(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ogrenci"
  );
}

function stringValue(record: StoredRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function dateInRange(
  record: StoredRecord,
  startDate: string,
  endDate: string,
): boolean {
  return record.civilDate >= startDate && record.civilDate <= endDate;
}

function observationLines(record: StoredRecord, index: number): string {
  const observedAt =
    typeof record.observedAt === "string"
      ? formatObservationDateTime(record.observedAt)
      : record.civilDate;
  return [
    `${index + 1}. ${observedAt}`,
    `Gözlem: ${String(record.rawText ?? "").trim()}`,
    ...(stringValue(record, "context")
      ? [`Bağlam: ${stringValue(record, "context")}`]
      : []),
    ...(stringValue(record, "childQuote")
      ? [`Çocuğun sözü: ${stringValue(record, "childQuote")}`]
      : []),
  ].join("\n");
}

function attendanceSummary(records: readonly StoredRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const status =
      typeof record.status === "string" ? record.status : "bilinmiyor";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const label: Record<string, string> = {
    present: "Geldi",
    absent: "Gelmedi",
    late: "Geç geldi",
    excused: "Mazeretli",
  };
  return [...counts.entries()].map(
    ([status, count]) => `${label[status] ?? status}: ${count}`,
  );
}

function feedbackFromRecord(record: StoredRecord): ExternalAiFeedback | null {
  if (
    record.rawTextImmutable !== true ||
    record.reviewStatus !== "teacher-saved" ||
    !isCivilDate(record.periodStart) ||
    !isCivilDate(record.periodEnd)
  ) {
    return null;
  }
  const feedbackText =
    typeof record.feedbackText === "string"
      ? record.feedbackText.trim()
      : "";
  if (!feedbackText) return null;
  const provider =
    record.provider === "chatgpt" || record.provider === "gemini"
      ? record.provider
      : "other";
  const audience = DOSSIER_AUDIENCES.includes(
    record.audience as DossierAudience,
  )
    ? (record.audience as DossierAudience)
    : "teacher";
  return {
    id: record.id,
    provider,
    audience,
    periodStart: record.periodStart as string,
    periodEnd: record.periodEnd as string,
    receivedAt:
      typeof record.receivedAt === "string"
        ? record.receivedAt
        : record.createdAt,
    feedbackText,
    ...(typeof record.teacherNote === "string" &&
    record.teacherNote.trim()
      ? { teacherNote: record.teacherNote.trim() }
      : {}),
    includeInTermSummary: record.includeInTermSummary === true,
    includeInYearSummary: record.includeInYearSummary === true,
    ...(typeof record.linkedExportPackageId === "string"
      ? { linkedExportPackageId: record.linkedExportPackageId }
      : {}),
  };
}

export function listExternalAiFeedback(
  snapshot: DataSnapshot,
  studentId: string,
): ExternalAiFeedback[] {
  return snapshot.externalFeedback
    .filter(
      (record) =>
        typeof record.deletedAt !== "string" &&
        record.studentId === studentId,
    )
    .map(feedbackFromRecord)
    .filter((record): record is ExternalAiFeedback => record !== null)
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

function resolveStudentName(
  student: StoredRecord,
  options: StudentDossierOptions,
): string {
  if (options.identityMode === "alias") {
    return options.alias?.trim() || "Öğrenci A";
  }
  return (
    stringValue(student, "displayName") ??
    stringValue(student, "preferredName") ??
    "İsimsiz öğrenci"
  );
}

function buildAiInstruction(
  options: StudentDossierOptions,
  name: string,
): string[] {
  if (options.destination !== "chatgpt" && options.destination !== "gemini") {
    return [];
  }
  return [
    "YAPAY ZEKÂ İÇİN GÖREV",
    `${name} için ${audienceLabels[options.audience]} amacıyla düzenlenebilir bir taslak oluştur.`,
    "Yalnız verilen tarihli kanıtlara dayan; gözlem ile yorumu açıkça ayır.",
    "Tanı, teşhis, kesin gelişim hükmü veya çocuklar arası karşılaştırma üretme.",
    "Her önemli ifadeyi tarihli kanıtla ilişkilendir; veri yetersizse açıkça belirt.",
    "Kişisel iletişim bilgilerini yanıtında tekrar etme.",
    "Yanıtı öğretmenin son incelemesine uygun, doğal ve mesleki Türkçe ile yaz.",
    "",
  ];
}

export function buildStudentDossier(
  archive: StudentLongitudinalArchive,
  options: StudentDossierOptions,
  generatedAt = new Date(),
): StudentDossier {
  if (
    !isCivilDate(options.periodStart) ||
    !isCivilDate(options.periodEnd) ||
    options.periodStart > options.periodEnd
  ) {
    throw new Error("Paylaşım tarih aralığı geçersiz.");
  }
  if (!DOSSIER_DESTINATIONS.includes(options.destination)) {
    throw new Error("Paylaşım hedefi geçersiz.");
  }
  if (!DOSSIER_AUDIENCES.includes(options.audience)) {
    throw new Error("Belge amacı geçersiz.");
  }
  if (
    (options.destination === "chatgpt" ||
      options.destination === "gemini") &&
    options.identityMode === "full" &&
    options.personalDataApprovedForAi !== true
  ) {
    throw new Error(
      "Yapay zekâ paylaşımında tam kimlik için açık kişisel veri onayı gerekir.",
    );
  }
  const student = archive.student;
  const academicYearId = stringValue(student, "academicYearId");
  const classroomId = stringValue(student, "classroomId");
  const academicYear = archive.academicYears.find(
    (record) => record.id === academicYearId,
  );
  if (
    !academicYearId ||
    !classroomId ||
    !academicYear ||
    !isCivilDate(String(academicYear.startDate ?? "")) ||
    !isCivilDate(String(academicYear.endDate ?? "")) ||
    options.periodStart < String(academicYear.startDate) ||
    options.periodEnd > String(academicYear.endDate)
  ) {
    throw new Error(
      "Paylaşım dönemi öğrencinin bağlı olduğu eğitim yılı içinde olmalıdır.",
    );
  }
  const name = resolveStudentName(student, options);
  const observations = archive.observations
    .filter(
      (record) =>
        record.academicYearId === academicYearId &&
        record.classroomId === classroomId &&
        dateInRange(record, options.periodStart, options.periodEnd),
    )
    .sort(
      (left, right) =>
        left.civilDate.localeCompare(right.civilDate) ||
        left.id.localeCompare(right.id),
    );
  const attendance = archive.attendanceRecords.filter(
    (record) =>
      record.academicYearId === academicYearId &&
      record.classroomId === classroomId &&
      dateInRange(record, options.periodStart, options.periodEnd),
  );
  const observationIds = new Set(observations.map((record) => record.id));
  const portfolio = archive.portfolioSelections.filter(
    (record) => {
      const periodStart =
        typeof record.periodStart === "string" ? record.periodStart : "";
      const periodEnd =
        typeof record.periodEnd === "string" ? record.periodEnd : "";
      return (
        record.academicYearId === academicYearId &&
        record.classroomId === classroomId &&
        typeof record.deletedAt !== "string" &&
        periodStart <= options.periodEnd &&
        periodEnd >= options.periodStart
      );
    },
  );
  const feedback = archive.externalFeedback
    .map(feedbackFromRecord)
    .filter(
      (record): record is ExternalAiFeedback =>
        record !== null &&
        archive.externalFeedback.some(
          (source) =>
            source.id === record.id &&
            source.academicYearId === academicYearId &&
            source.classroomId === classroomId,
        ) &&
        record.periodStart <= options.periodEnd &&
        record.periodEnd >= options.periodStart,
    );
  const contacts = studentContactsFromRecord(student.contacts);
  const profileLines =
    options.identityMode === "full"
      ? [
          `Ad soyad: ${stringValue(student, "displayName") ?? name}`,
          ...(stringValue(student, "preferredName")
            ? [`Kullanılan ad: ${stringValue(student, "preferredName")}`]
            : []),
          ...(stringValue(student, "optionalCode")
            ? [`Okul numarası / isteğe bağlı kod: ${stringValue(student, "optionalCode")}`]
            : []),
          ...(stringValue(student, "birthDate")
            ? [`Doğum tarihi: ${stringValue(student, "birthDate")}`]
            : []),
        ]
      : [`Öğrenci: ${name}`, "Kimlik bilgileri dış paylaşım için gizlendi."];
  const contactLines =
    options.includeContacts && options.identityMode === "full"
      ? contacts.map(
          (contact) =>
            `${contact.relationship}${
              contact.name ? ` · ${contact.name}` : ""
            }: ${formatStudentPhone(contact.phone)}${
              contact.isPrimary ? " (öncelikli)" : ""
            }`,
        )
      : [];
  const portfolioLines = portfolio.map((selection, index) => {
    const source = observations.find(
      (record) => record.id === selection.itemId,
    );
    return [
      `${index + 1}. ${selection.periodStart}–${selection.periodEnd}`,
      ...(source && options.includeObservations
        ? [`Kaynak gözlem: ${String(source.rawText ?? "")}`]
        : []),
      ...(stringValue(selection, "teacherCaption")
        ? [`Öğretmen açıklaması: ${stringValue(selection, "teacherCaption")}`]
        : []),
      ...(stringValue(selection, "childReflection")
        ? [`Çocuğun görüşü: ${stringValue(selection, "childReflection")}`]
        : []),
      ...(stringValue(selection, "familyContribution")
        ? [`Aile katkısı: ${stringValue(selection, "familyContribution")}`]
        : []),
    ].join("\n");
  });
  const feedbackLines = feedback.map(
    (item, index) =>
      `${index + 1}. ${item.provider.toLocaleUpperCase("tr-TR")} · ${item.periodStart}–${item.periodEnd}\n${item.feedbackText}${
        item.teacherNote ? `\nÖğretmen notu: ${item.teacherNote}` : ""
      }`,
  );
  const title = `${name} · ${audienceLabels[options.audience]}`;
  const text = [
    ...buildAiInstruction(options, name),
    "MAARİFOS ÖĞRENCİ DOSYASI",
    `Amaç: ${audienceLabels[options.audience]}`,
    `Dönem: ${options.periodStart}–${options.periodEnd}`,
    `Oluşturulma: ${formatObservationDateTime(generatedAt.toISOString())}`,
    "",
    "TEMEL BİLGİLER",
    ...profileLines,
    ...(contactLines.length > 0
      ? ["", "YAKIN İLETİŞİM BİLGİLERİ", ...contactLines]
      : []),
    ...(options.includeAttendance
      ? [
          "",
          "DEVAM ÖZETİ",
          ...(attendanceSummary(attendance).length > 0
            ? attendanceSummary(attendance)
            : ["Bu aralıkta devam kaydı bulunmuyor."]),
        ]
      : []),
    ...(options.includeObservations
      ? [
          "",
          "TARİHLİ GÖZLEMLER",
          ...(observations.length > 0
            ? observations.map(observationLines)
            : ["Bu aralıkta gözlem bulunmuyor."]),
        ]
      : []),
    ...(options.includePortfolio
      ? [
          "",
          "PORTFOLYO SEÇKİLERİ",
          ...(portfolioLines.length > 0
            ? portfolioLines
            : ["Bu aralıkta portfolyo seçkisi bulunmuyor."]),
        ]
      : []),
    ...(options.includeExternalFeedback
      ? [
          "",
          "KAYDEDİLMİŞ HARİCÎ YAPAY ZEKÂ GERİ BİLDİRİMLERİ",
          ...(feedbackLines.length > 0
            ? feedbackLines
            : ["Bu aralıkta kaydedilmiş geri bildirim bulunmuyor."]),
        ]
      : []),
    "",
    "SINIRLAR",
    "Bu dosya öğretmen kayıtlarından oluşturulmuştur; tıbbi veya psikolojik tanı içermez.",
    "Nihai paylaşım ve ifade sorumluluğu öğretmenin incelemesindedir.",
  ].join("\n");
  return {
    title,
    fileName: `${safeFileStem(name)}-${options.audience}-${options.periodEnd}.txt`,
    text,
    includedEntityIds: {
      observations: options.includeObservations
        ? observations.map((record) => record.id)
        : [],
      attendanceRecords: options.includeAttendance
        ? attendance.map((record) => record.id)
        : [],
      portfolioSelections: options.includePortfolio
        ? portfolio.map((record) => record.id)
        : [],
      externalFeedback: options.includeExternalFeedback
        ? feedback.map((record) => record.id)
        : [],
      mediaAssets: [],
    },
    manifest: {
      packageKind: "student_dossier",
      destination: options.destination,
      ...(options.destination === "chatgpt" ||
      options.destination === "gemini"
        ? { provider: options.destination }
        : {}),
      audience: options.audience,
      purpose: options.audience,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      academicYearId,
      classroomId,
      identityMode: options.identityMode,
      includeContacts: options.includeContacts,
      includeAttendance: options.includeAttendance,
      includeObservations: options.includeObservations,
      includePortfolio: options.includePortfolio,
      includeExternalFeedback: options.includeExternalFeedback,
      generatedAt: generatedAt.toISOString(),
    },
  };
}

export async function createStudentDossier(
  store: LocalDataStore,
  input: {
    studentId: string;
    options: StudentDossierOptions;
    now?: Date;
  },
): Promise<{ dossier: StudentDossier; exportPackageId: string }> {
  if (!UUID_PATTERN.test(input.studentId)) {
    throw new Error("Dosyası hazırlanacak öğrenci kimliği geçersiz.");
  }
  const now = input.now ?? new Date();
  const archive = await buildStudentLongitudinalArchive(store, {
    studentId: input.studentId,
    now,
  });
  const dossier = buildStudentDossier(archive, input.options, now);
  const exportPackageId = crypto.randomUUID();
  const student = archive.student;
  if (
    typeof student.academicYearId !== "string" ||
    typeof student.classroomId !== "string"
  ) {
    throw new Error("Öğrenci paylaşım için eğitim yılı kapsamına bağlı değil.");
  }
  const timestamp = now.toISOString();
  await store.transaction("readwrite", ["exportPackages"], async (transaction) => {
    await transaction.putMany("exportPackages", [
      {
        id: exportPackageId,
        type: "student_dossier",
        studentIds: [input.studentId],
        periodStart: input.options.periodStart,
        periodEnd: input.options.periodEnd,
        anonymizationMode:
          input.options.identityMode === "alias"
            ? "student-alias"
            : "full-identity",
        includedEntityIds: dossier.includedEntityIds,
        manifest: dossier.manifest,
        createdFileIds: [],
        academicYearId: student.academicYearId,
        classroomId: student.classroomId,
        createdAt: timestamp,
        updatedAt: timestamp,
        civilDate: civilDateInIstanbul(now),
        deletedAt: null,
        schemaVersion: 1,
      },
    ]);
  });
  return { dossier, exportPackageId };
}

export async function saveExternalAiFeedback(
  store: LocalDataStore,
  input: {
    studentId: string;
    provider: ExternalAiFeedback["provider"];
    audience: DossierAudience;
    periodStart: string;
    periodEnd: string;
    feedbackText: string;
    teacherNote?: string;
    includeInTermSummary?: boolean;
    includeInYearSummary?: boolean;
    linkedExportPackageId?: string;
    now?: Date;
  },
): Promise<ExternalAiFeedback> {
  if (!UUID_PATTERN.test(input.studentId)) {
    throw new Error("Geri bildirim öğrenci kimliği geçersiz.");
  }
  if (
    !isCivilDate(input.periodStart) ||
    !isCivilDate(input.periodEnd) ||
    input.periodStart > input.periodEnd
  ) {
    throw new Error("Geri bildirim tarih aralığı geçersiz.");
  }
  if (!DOSSIER_AUDIENCES.includes(input.audience)) {
    throw new Error("Geri bildirim amacı geçersiz.");
  }
  if (
    input.provider !== "chatgpt" &&
    input.provider !== "gemini" &&
    input.provider !== "other"
  ) {
    throw new Error("Geri bildirim sağlayıcısı geçersiz.");
  }
  const feedbackText = input.feedbackText.trim();
  if (!feedbackText || feedbackText.length > 50_000) {
    throw new Error("Geri bildirim 1–50.000 karakter arasında olmalıdır.");
  }
  const teacherNote = input.teacherNote?.trim();
  if (teacherNote && teacherNote.length > 5_000) {
    throw new Error("Öğretmen notu 5.000 karakterden uzun olamaz.");
  }
  if (
    input.linkedExportPackageId &&
    !UUID_PATTERN.test(input.linkedExportPackageId)
  ) {
    throw new Error("Bağlı dışa aktarım paketi kimliği geçersiz.");
  }
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const id = crypto.randomUUID();
  const contentHash = await sha256Hex(feedbackText);
  await store.transaction(
    "readwrite",
    ["academicYears", "students", "exportPackages", "externalFeedback"],
    async (transaction) => {
      const [academicYears, students, exportPackages] = await Promise.all([
        transaction.getAll("academicYears"),
        transaction.getAll("students"),
        transaction.getAll("exportPackages"),
      ]);
      const student = students.find((record) => record.id === input.studentId);
      if (
        !student ||
        typeof student.academicYearId !== "string" ||
        typeof student.classroomId !== "string"
      ) {
        throw new Error("Geri bildirim kaydedilecek öğrenci bulunamadı.");
      }
      const academicYear = academicYears.find(
        (record) => record.id === student.academicYearId,
      );
      if (
        !academicYear ||
        academicYear.status !== "active" ||
        !isCivilDate(String(academicYear.startDate ?? "")) ||
        !isCivilDate(String(academicYear.endDate ?? "")) ||
        input.periodStart < String(academicYear.startDate) ||
        input.periodEnd > String(academicYear.endDate)
      ) {
        throw new Error(
          "Geri bildirim dönemi öğrencinin aktif eğitim yılı içinde olmalıdır.",
        );
      }
      if (
        (input.provider === "chatgpt" || input.provider === "gemini") &&
        !input.linkedExportPackageId
      ) {
        throw new Error(
          "ChatGPT/Gemini geri bildirimi için kaynak dışa aktarım paketi zorunludur.",
        );
      }
      const linkedPackage = input.linkedExportPackageId
        ? exportPackages.find(
            (record) => record.id === input.linkedExportPackageId,
          )
        : undefined;
      const linkedManifest =
        linkedPackage?.manifest &&
        typeof linkedPackage.manifest === "object" &&
        !Array.isArray(linkedPackage.manifest)
          ? (linkedPackage.manifest as Record<string, unknown>)
          : undefined;
      if (
        input.linkedExportPackageId &&
        (!linkedPackage ||
          linkedPackage.type !== "student_dossier" ||
          !Array.isArray(linkedPackage.studentIds) ||
          !linkedPackage.studentIds.includes(input.studentId) ||
          linkedPackage.academicYearId !== student.academicYearId ||
          linkedPackage.classroomId !== student.classroomId ||
          linkedPackage.periodStart !== input.periodStart ||
          linkedPackage.periodEnd !== input.periodEnd ||
          linkedManifest?.packageKind !== "student_dossier" ||
          linkedManifest.audience !== input.audience ||
          linkedManifest.purpose !== input.audience ||
          linkedManifest.periodStart !== input.periodStart ||
          linkedManifest.periodEnd !== input.periodEnd ||
          linkedManifest.academicYearId !== student.academicYearId ||
          linkedManifest.classroomId !== student.classroomId ||
          (input.provider !== "other" &&
            (linkedManifest.destination !== input.provider ||
              linkedManifest.provider !== input.provider)))
      ) {
        throw new Error(
          "Bağlı dışa aktarım paketi öğrenci, sağlayıcı, alıcı, dönem veya kapsamla uyuşmuyor.",
        );
      }
      await transaction.putMany("externalFeedback", [
        {
          id,
          studentId: input.studentId,
          provider: input.provider,
          audience: input.audience,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          receivedAt: timestamp,
          rawTextImmutable: true,
          contentHash,
          feedbackText,
          ...(teacherNote ? { teacherNote } : {}),
          includeInTermSummary: input.includeInTermSummary === true,
          includeInYearSummary: input.includeInYearSummary === true,
          ...(input.linkedExportPackageId
            ? { linkedExportPackageId: input.linkedExportPackageId }
            : {}),
          reviewStatus: "teacher-saved",
          academicYearId: student.academicYearId,
          classroomId: student.classroomId,
          createdAt: timestamp,
          updatedAt: timestamp,
          civilDate: civilDateInIstanbul(now),
          deletedAt: null,
          schemaVersion: 1,
        },
      ]);
    },
  );
  return {
    id,
    provider: input.provider,
    audience: input.audience,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    receivedAt: timestamp,
    feedbackText,
    ...(teacherNote ? { teacherNote } : {}),
    includeInTermSummary: input.includeInTermSummary === true,
    includeInYearSummary: input.includeInYearSummary === true,
    ...(input.linkedExportPackageId
      ? { linkedExportPackageId: input.linkedExportPackageId }
      : {}),
  };
}

export function buildExternalFeedbackAggregation(
  snapshot: DataSnapshot,
  input: {
    kind: "term" | "year";
    studentId: string;
    academicYearId: string;
    periodStart: string;
    periodEnd: string;
  },
): ExternalFeedbackAggregation {
  if (
    !UUID_PATTERN.test(input.studentId) ||
    !UUID_PATTERN.test(input.academicYearId) ||
    !isCivilDate(input.periodStart) ||
    !isCivilDate(input.periodEnd) ||
    input.periodStart > input.periodEnd
  ) {
    throw new Error("Geri bildirim toplama kapsamı geçersiz.");
  }
  const student = snapshot.students.find(
    (record) => record.id === input.studentId,
  );
  const academicYear = snapshot.academicYears.find(
    (record) => record.id === input.academicYearId,
  );
  if (
    !student ||
    !academicYear ||
    !isCivilDate(String(academicYear.startDate ?? "")) ||
    !isCivilDate(String(academicYear.endDate ?? "")) ||
    input.periodStart < String(academicYear.startDate) ||
    input.periodEnd > String(academicYear.endDate) ||
    !(
      student.academicYearId === input.academicYearId ||
      (Array.isArray(student.enrollments) &&
        student.enrollments.some(
          (enrollment) =>
            enrollment &&
            typeof enrollment === "object" &&
            (enrollment as Record<string, unknown>).academicYearId ===
              input.academicYearId,
        ))
    )
  ) {
    throw new Error(
      "Geri bildirim toplama dönemi öğrencinin eğitim yılı kapsamıyla uyuşmuyor.",
    );
  }
  const includeFlag =
    input.kind === "term" ? "includeInTermSummary" : "includeInYearSummary";
  const records = snapshot.externalFeedback
    .filter(
      (record) =>
        record.studentId === input.studentId &&
        record.academicYearId === input.academicYearId &&
        record[includeFlag] === true &&
        typeof record.deletedAt !== "string" &&
        typeof record.periodStart === "string" &&
        typeof record.periodEnd === "string" &&
        record.periodStart <= input.periodEnd &&
        record.periodEnd >= input.periodStart,
    )
    .sort(
      (left, right) =>
        String(left.receivedAt ?? "").localeCompare(
          String(right.receivedAt ?? ""),
        ) || left.id.localeCompare(right.id),
    );
  return {
    kind: input.kind,
    studentId: input.studentId,
    academicYearId: input.academicYearId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    feedbackIds: records.map((record) => record.id),
    contentHashes: records.map((record) => String(record.contentHash ?? "")),
    text: records
      .map(
        (record, index) =>
          `${index + 1}. ${String(record.provider).toLocaleUpperCase("tr-TR")} · ${record.periodStart}–${record.periodEnd}\n${String(record.feedbackText)}`,
      )
      .join("\n\n"),
  };
}
