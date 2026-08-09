import type { AttendanceStatus } from "../../core/domain/attendance";

/**
 * Sınıf ekranının ihtiyaç duyduğu dar öğrenci izdüşümü.
 * Kalıcılık modeli yerine bu arayüzün kullanılması ekranı controller'dan bağımsız tutar.
 */
export interface ClassroomStudentViewModel {
  id: string;
  name: string;
  preferredName?: string;
  birthDate?: string;
  profilePhotoDataUrl?: string;
  status: AttendanceStatus;
  attendanceMarked?: boolean;
}

export interface ClassroomScreenSummary {
  activeStudentCount: number;
  presentStudentCount: number;
  observedStudentCount: number;
  attendanceMarkedStudentCount: number;
  attendanceCompleted: boolean;
}

export type ClassroomHealthState = "empty" | "ready" | "needs-attention";

export interface ClassroomTaskCenterSummary {
  attendance: {
    state: ClassroomHealthState;
    title: string;
    detail: string;
    unmarkedStudentCount: number;
  };
  evidence: {
    state: ClassroomHealthState;
    title: string;
    detail: string;
    missingStudentCount: number;
  };
}

export type ClassroomPriorityTask =
  | {
      kind: "add-student" | "clear-search" | "export-observations";
      title: string;
      detail: string;
    }
  | {
      kind: "open-attendance";
      title: string;
      detail: string;
      actionLabel: "Yoklamayı tamamla" | "Yoklamayı düzelt";
    }
  | {
      kind: "observe-student" | "review-profile";
      title: string;
      detail: string;
      studentId: string;
    };

export type ClassroomRosterStatus = AttendanceStatus | "unmarked";

export const CLASSROOM_STATUS_LABELS: Readonly<
  Record<ClassroomRosterStatus, string>
> = Object.freeze({
  present: "Geldi",
  late: "Geç geldi",
  absent: "Gelmedi",
  unmarked: "İşaretlenmedi",
});

export function classroomStudentDisplayName(
  student: ClassroomStudentViewModel,
): string {
  return student.preferredName ?? student.name;
}

export function classroomRosterStatus(
  student: ClassroomStudentViewModel,
): ClassroomRosterStatus {
  return student.attendanceMarked === false ? "unmarked" : student.status;
}

export function classroomScreenDescription(
  summary: ClassroomScreenSummary,
  archivedStudentCount: number,
): string {
  return `${summary.activeStudentCount} sınıfta · ${archivedStudentCount} sınıftan ayrılmış çocuk`;
}

/**
 * Yalnız ekrana zaten verilmiş sınıf/yoklama izdüşümünden öğretmenin iki temel
 * kontrolünü üretir. Arama açıkken yoklama sayısı açıkça arama kapsamıyla
 * etiketlenir; sınıf geneliymiş gibi sunulmaz.
 */
export function createClassroomTaskCenterSummary(options: {
  summary: ClassroomScreenSummary;
  students: readonly ClassroomStudentViewModel[];
  hasActiveSearch: boolean;
}): ClassroomTaskCenterSummary {
  const { summary, students, hasActiveSearch } = options;
  const markedStudents = students.filter(
    (student) => student.attendanceMarked !== false,
  );
  const unmarkedStudentCount = students.length - markedStudents.length;
  const presentStudentCount = markedStudents.filter(
    (student) => student.status === "present",
  ).length;
  const lateStudentCount = markedStudents.filter(
    (student) => student.status === "late",
  ).length;
  const absentStudentCount = markedStudents.filter(
    (student) => student.status === "absent",
  ).length;
  const globalUnmarkedStudentCount = Math.max(
    0,
    summary.activeStudentCount - summary.attendanceMarkedStudentCount,
  );
  const attendanceState: ClassroomHealthState =
    summary.activeStudentCount === 0
      ? "empty"
      : globalUnmarkedStudentCount > 0 || !summary.attendanceCompleted
        ? "needs-attention"
        : "ready";
  const attendanceScope = hasActiveSearch
    ? `${students.length} arama sonucu`
    : `${summary.activeStudentCount} çocuk`;
  const attendanceDetail =
    attendanceState === "empty"
      ? "Sınıf listesi oluşturulduğunda günlük yoklama izi burada görünür."
      : `${attendanceScope} · ${presentStudentCount} geldi · ${lateStudentCount} geç · ${absentStudentCount} gelmedi`;

  const missingStudentCount = Math.max(
    0,
    summary.activeStudentCount - summary.observedStudentCount,
  );
  const evidenceState: ClassroomHealthState =
    summary.activeStudentCount === 0
      ? "empty"
      : missingStudentCount > 0
        ? "needs-attention"
        : "ready";

  return {
    attendance: {
      state: attendanceState,
      title:
        attendanceState === "empty"
          ? "Yoklama için sınıf listesi gerekli"
          : hasActiveSearch
            ? unmarkedStudentCount > 0
              ? `${unmarkedStudentCount} arama sonucunda yoklama eksik`
              : globalUnmarkedStudentCount > 0
                ? `${globalUnmarkedStudentCount} sınıf genelinde yoklama eksik`
                : summary.attendanceCompleted
                  ? "Arama sonucunda yoklama eksiği yok"
                  : "Yoklama tamamlanmayı bekliyor"
            : globalUnmarkedStudentCount > 0
              ? `${globalUnmarkedStudentCount} yoklama işareti eksik`
              : summary.attendanceCompleted
                ? "Yoklama tamamlandı"
                : "Yoklama tamamlanmayı bekliyor",
      detail: attendanceDetail,
      unmarkedStudentCount,
    },
    evidence: {
      state: evidenceState,
      title:
        evidenceState === "empty"
          ? "Henüz gözlem izi yok"
          : missingStudentCount > 0
            ? `${missingStudentCount} çocukta gözlem izi yok`
            : "Her çocukta gözlem izi var",
      detail:
        evidenceState === "empty"
          ? "İlk gözlem kaydedildiğinde kanıt zinciri burada başlar."
          : `${summary.observedStudentCount}/${summary.activeStudentCount} çocuk için en az bir gözlem kayıtlı`,
      missingStudentCount,
    },
  };
}

/**
 * Sınıf ekranındaki gerçek handler'larla tamamlanabilen tek bir sonraki işi
 * seçer; yeni rota veya veri durumu varsaymaz.
 */
export function resolveClassroomPriorityTask(options: {
  summary: ClassroomScreenSummary;
  students: readonly ClassroomStudentViewModel[];
  hasActiveSearch: boolean;
  educationalWritesDisabled: boolean;
  observationCountFor: (studentId: string) => number;
}): ClassroomPriorityTask {
  const {
    summary,
    students,
    hasActiveSearch,
    educationalWritesDisabled,
    observationCountFor,
  } = options;

  if (summary.activeStudentCount === 0) {
    return {
      kind: "add-student",
      title: "Sınıf listesini oluştur",
      detail: "İlk çocuğu ekleyerek yoklama ve gözlem akışını başlat.",
    };
  }

  const unmarkedStudentCount = Math.max(
    0,
    summary.activeStudentCount - summary.attendanceMarkedStudentCount,
  );
  if (unmarkedStudentCount > 0 || !summary.attendanceCompleted) {
    const requiresCorrection =
      summary.attendanceCompleted && unmarkedStudentCount > 0;
    return {
      kind: "open-attendance",
      title:
        unmarkedStudentCount > 0
          ? `${unmarkedStudentCount} çocuğun yoklamasını tamamla`
          : "Bugünün yoklamasını tamamla",
      detail:
        unmarkedStudentCount > 0
          ? "Eksik işaretleri gözden geçirip bugünün devam durumunu kaydet."
          : "Tüm çocuklar işaretlendi; günlük devam durumunu son kez onayla.",
      actionLabel: requiresCorrection
        ? "Yoklamayı düzelt"
        : "Yoklamayı tamamla",
    };
  }

  if (hasActiveSearch && students.length === 0) {
    return {
      kind: "clear-search",
      title: "Sınıf listesine dön",
      detail: "Arama filtresini temizleyip tüm çocukları yeniden göster.",
    };
  }

  const firstStudentWithoutObservation = students.find(
    (student) => observationCountFor(student.id) === 0,
  );
  if (firstStudentWithoutObservation && !educationalWritesDisabled) {
    return {
      kind: "observe-student",
      studentId: firstStudentWithoutObservation.id,
      title: `${classroomStudentDisplayName(firstStudentWithoutObservation)} için ilk gözlemi ekle`,
      detail: "Sınıftaki kanıt dağılımını dengelemek için en kritik açık iş.",
    };
  }

  if (hasActiveSearch && summary.observedStudentCount < summary.activeStudentCount) {
    return {
      kind: "clear-search",
      title: "Gözlem izi eksik çocukları göster",
      detail: "Aramayı temizleyerek sınıf genelindeki açık kanıt işine dön.",
    };
  }

  if (educationalWritesDisabled && students[0]) {
    return {
      kind: "review-profile",
      studentId: students[0].id,
      title: "Çocuk dosyasını gözden geçir",
      detail: "Kayıt dönemi kapalıyken mevcut gözlem ve devam izlerini incele.",
    };
  }

  return {
    kind: "export-observations",
    title: "Sınıf gözlem dökümünü denetle",
    detail: "Tarih ve çocuk kapsamını seçerek kayıtların belge izini gözden geçir.",
  };
}
