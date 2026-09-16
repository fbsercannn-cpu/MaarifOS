import type { BackupHealthReceipt } from "../../core/storage/backup-reminder.ts";
import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";

export type SetupProgressStepId = "classroom" | "students" | "plan" | "backup";
export type SetupProgressStepStatus = "complete" | "current" | "locked";

export interface SetupProgressInput {
  classroomConfigured: boolean;
  planningAcademicYearReady: boolean;
  activeStudentCount: number;
  /** @deprecated Controller uyumluluğu; kurulum kararı için kullanılmaz. */
  planReady: boolean;
  /** @deprecated Salt zaman damgası kanıt değildir; kurulum kararı için kullanılmaz. */
  backupReady: boolean;
}

export interface SetupProgressEvidence {
  planCompletedLevelCount: number;
  planTotalLevelCount: 4;
  planChainComplete: boolean;
  backupReceiptVerified: boolean;
  restoreDrillVerified: boolean;
}

export interface SetupProgressStep {
  id: SetupProgressStepId;
  order: number;
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  status: SetupProgressStepStatus;
}

export interface SetupProgressPresentation {
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  percent: number;
  isComplete: boolean;
  currentStepId: SetupProgressStepId | null;
  currentStep: SetupProgressStep | null;
  headline: string;
  detail: string;
  steps: readonly SetupProgressStep[];
}

function stepStatus(complete: boolean, unlocked: boolean): SetupProgressStepStatus {
  if (complete) return "complete";
  return unlocked ? "current" : "locked";
}

export function createSetupProgressEvidence(
  workspace: TeacherWorkCycleWorkspace,
  backupReceipt: BackupHealthReceipt | null,
): SetupProgressEvidence {
  const annualReady = workspace.annual !== null;
  const monthlyReady =
    workspace.monthly !== null && workspace.documents.planDocumentReady;
  const weeklyReady =
    monthlyReady &&
    workspace.weekly !== null &&
    workspace.monthly!.weeklyPlanCount > 0;
  const dailyReady =
    weeklyReady &&
    workspace.weekly!.dailyPlanCount > 0 &&
    workspace.monthly!.dailyPlanCount > 0;
  const planCompletedLevelCount = [
    annualReady,
    monthlyReady,
    weeklyReady,
    dailyReady,
  ].filter(Boolean).length;

  return {
    planCompletedLevelCount,
    planTotalLevelCount: 4,
    planChainComplete: planCompletedLevelCount === 4,
    backupReceiptVerified: backupReceipt !== null,
    restoreDrillVerified:
      backupReceipt?.lastRestoreDrillAt !== null &&
      backupReceipt?.lastRestoreDrillAt !== undefined &&
      backupReceipt.lastRestoreMode !== null,
  };
}

export function createSetupProgressPresentation(
  input: SetupProgressInput,
  evidence: SetupProgressEvidence,
): SetupProgressPresentation {
  const classroomComplete =
    input.classroomConfigured && input.planningAcademicYearReady;
  const studentsComplete = classroomComplete && input.activeStudentCount > 0;
  const planComplete = studentsComplete && evidence.planChainComplete;
  const backupComplete =
    planComplete &&
    evidence.backupReceiptVerified &&
    evidence.restoreDrillVerified;
  const planMissingLevelCount =
    evidence.planTotalLevelCount - evidence.planCompletedLevelCount;

  const steps: SetupProgressStep[] = [
    {
      id: "classroom",
      order: 1,
      label: "Eğitim yılı ve sınıf",
      title: classroomComplete
        ? "Sınıf çalışma düzeni hazır"
        : input.classroomConfigured
          ? "2026–2027 dönemini hazırlayın"
        : "Eğitim yılı ve sınıfınızı kurun",
      detail: classroomComplete
        ? "Program, yaş grubu ve günlük çalışma saatleri kaydedildi."
        : input.classroomConfigured
          ? "Mevcut sınıf önceki dönemde. Yeni plan zinciri için resmî döneme güvenli geçiş yapın."
        : "Resmî takvimi, yaş grubunu, programı ve çalışma saatlerini bir kez belirleyin.",
      actionLabel: classroomComplete
        ? "Sınıf ayarlarını gözden geçir"
        : input.classroomConfigured
          ? "Yeni dönemi hazırla"
          : "Sınıfı kur",
      status: stepStatus(classroomComplete, true),
    },
    {
      id: "students",
      order: 2,
      label: "Çocuk listesi",
      title: studentsComplete
        ? `${input.activeStudentCount} çocuk sınıf listesinde`
        : "İlk çocuğu ekleyin",
      detail: studentsComplete
        ? "Yoklama, gözlem ve gelişim izi için sınıf listesi hazır."
        : classroomComplete
          ? "Yalnız gerekli profil bilgileriyle sınıf listesini başlatın."
          : "Çocuk kaydından önce eğitim yılı ve sınıf kapsamı kurulmalıdır.",
      actionLabel: studentsComplete ? "Sınıf listesini aç" : "İlk çocuğu ekle",
      status: stepStatus(studentsComplete, classroomComplete),
    },
    {
      id: "plan",
      order: 3,
      label: "İlk plan",
      title: planComplete
        ? "İlk plan zinciri hazır"
        : evidence.planCompletedLevelCount > 0
          ? `${evidence.planCompletedLevelCount}/4 plan düzeyi bağlı`
          : "İlk plan zincirinizi hazırlayın",
      detail: planComplete
        ? "Yıllık, aylık, haftalık ve günlük plan aynı çalışma zincirinde doğrulandı."
        : studentsComplete
          ? evidence.planCompletedLevelCount > 0
            ? `Yıllık → aylık → haftalık → günlük zincirinde ${planMissingLevelCount} düzey eksik.`
            : "Yıl, ay, hafta ve gün bağını Planlar çalışma alanında kurun."
          : "Planın gerçek çocuk ve sınıf kapsamına bağlanması için önce sınıf listesini başlatın.",
      actionLabel: planComplete ? "Plan çalışma alanını aç" : "Planlamaya başla",
      status: stepStatus(planComplete, studentsComplete),
    },
    {
      id: "backup",
      order: 4,
      label: "Güvenli yedek",
      title: backupComplete
        ? "Şifreli yedek ve kurtarma doğrulandı"
        : evidence.backupReceiptVerified
          ? "Geri yükleme tatbikatını tamamlayın"
          : "İlk şifreli yedeği alın",
      detail: backupComplete
        ? "V2 bütünlük makbuzu ve aynı şifreli dosyayla kurtarma tatbikatı doğrulandı."
        : planComplete
          ? evidence.backupReceiptVerified
            ? "Dosya bütünlüğü doğrulandı; geri yüklenebilirliği kanıtlamak için aynı dosyayla tatbikat yapın."
            : "Parolası yalnız sizde kalan şifreli bir dosyayla başlangıç kayıtlarını koruyun."
          : "Yedek adımı, ilk plan kaydedildikten sonra açılır.",
      actionLabel: backupComplete
        ? "Yedek ayarlarını aç"
        : evidence.backupReceiptVerified
          ? "Kurtarma tatbikatını aç"
          : "Şifreli yedek oluştur",
      status: stepStatus(backupComplete, planComplete),
    },
  ];

  const completedCount = steps.filter((step) => step.status === "complete").length;
  const currentStep = steps.find((step) => step.status === "current") ?? null;
  const currentStepId = currentStep?.id ?? null;
  const isComplete = completedCount === steps.length;

  return {
    completedCount,
    totalCount: steps.length,
    remainingCount: steps.length - completedCount,
    percent: Math.round((completedCount / steps.length) * 100),
    isComplete,
    currentStepId,
    currentStep,
    headline: isComplete ? "MaarifOS kullanıma hazır" : "Başlangıç planınız",
    detail: isComplete
      ? "Sınıf, çocuk listesi, plan zinciri ve ilk şifreli yedek tamamlandı."
      : "Dört adımı sırayla tamamlayın; MaarifOS sıradaki işi açık tutar.",
    steps,
  };
}
