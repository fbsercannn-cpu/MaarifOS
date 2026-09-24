import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";

export type DocumentWorkspaceItemId = "plans" | "monthly" | "anecdotes" | "students";
export type DocumentWorkspaceTone = "ready" | "attention" | "empty";

export interface DocumentWorkspaceItem {
  id: DocumentWorkspaceItemId;
  label: string;
  title: string;
  detail: string;
  source: string;
  actionLabel: string;
  tone: DocumentWorkspaceTone;
}

export interface DocumentWorkspacePresentation {
  readyCount: number;
  pendingCount: number;
  emptyCount: number;
  items: readonly DocumentWorkspaceItem[];
}

export function createDocumentWorkspacePresentation(
  workspace: TeacherWorkCycleWorkspace,
  options: { studentCount: number; observationCount: number },
): DocumentWorkspacePresentation {
  const fullYearPlanCountsAvailable =
    typeof workspace.documents.planMonthCount === "number" &&
    typeof workspace.documents.planWeekCount === "number" &&
    typeof workspace.documents.planDailyCount === "number";
  const planScopeDetail = fullYearPlanCountsAvailable
    ? `${workspace.documents.planMonthCount} ay · ${workspace.documents.planWeekCount} hafta · ${workspace.documents.planDailyCount} günlük plan`
    : `${workspace.monthly?.weeklyPlanCount ?? 0} hafta · ${workspace.monthly?.dailyPlanCount ?? 0} günlük plan`;
  const planItem: DocumentWorkspaceItem = workspace.documents.planDocumentReady
    ? {
        id: "plans",
        label: "Plan belgeleri",
        title: fullYearPlanCountsAvailable
          ? "Eğitim yılı plan grafiği bağlı"
          : "Yıllık ve aylık kaynak bağlı",
        detail: planScopeDetail,
        source: fullYearPlanCountsAvailable
          ? "Seçili eğitim yılının kalıcı plan grafiği"
          : "Kalıcı yıllık ve aylık plan kayıtları",
        actionLabel: "Plan belgelerini aç",
        tone: "ready",
      }
    : {
        id: "plans",
        label: "Plan belgeleri",
        title: "Plan belgesi kaynağı eksik",
        detail: "Belge için yıllık omurga ve ona bağlı aylık plan gerekir.",
        source: "Yıllık + aylık plan kaydı bekleniyor",
        actionLabel: "Plan kaynağını tamamla",
        tone: "attention",
      };

  const monthlyItem: DocumentWorkspaceItem =
    workspace.documents.monthlyEvaluationCount > 0
      ? {
          id: "monthly",
          label: "Aylık değerlendirme",
          title: `${workspace.documents.monthlyEvaluationCount} değerlendirme kaydı hazır`,
          detail: "Ek 18 ve öğretmen değerlendirme eki yalnız seçili kalıcı kayıttan üretilir.",
          source: "Aylık plan + öğretmen değerlendirme snapshotı",
          actionLabel: "Ek 18 ve değerlendirmeyi aç",
          tone: "ready",
        }
      : {
          id: "monthly",
          label: "Aylık değerlendirme",
          title: "Aylık değerlendirme eksik",
          detail: "Ek 18 için önce kanıta dayalı aylık öğretmen değerlendirmesini kaydedin.",
          source: "Değerlendirme kaydı bekleniyor",
          actionLabel: "Aylık değerlendirmeyi tamamla",
          tone: "attention",
        };

  const anecdotePending =
    workspace.documents.anecdoteIncompleteCount +
    workspace.documents.anecdoteReviewRequiredCount;
  const anecdoteItem: DocumentWorkspaceItem = workspace.documents.anecdoteReadyCount > 0
    ? {
        id: "anecdotes",
        label: "Anekdot kayıt formu",
        title: `${workspace.documents.anecdoteReadyCount} onaylı form hazır`,
        detail: anecdotePending > 0
          ? `${anecdotePending} kayıt daha tamamlanmayı veya yeniden onayı bekliyor.`
          : "Onaylı formlar görsel PDF ve DOCX olarak alınabilir.",
        source: "Değişmez gözlem + öğretmen onayı + program bağlantısı",
        actionLabel: "Anekdot formlarını aç",
        tone: anecdotePending > 0 ? "attention" : "ready",
      }
    : anecdotePending > 0
      ? {
          id: "anecdotes",
          label: "Anekdot kayıt formu",
          title: `${anecdotePending} kayıt tamamlanmayı bekliyor`,
          detail: "Eksik alanları tamamlayıp öğretmen onayını yenileyin.",
          source: "Onay bekleyen anekdot kayıtları",
          actionLabel: "Anekdot kayıtlarını tamamla",
          tone: "attention",
        }
      : {
          id: "anecdotes",
          label: "Anekdot kayıt formu",
          title: "Henüz anekdot türünde gözlem yok",
          detail: "Hızlı gözlemde türü Anekdot seçilen kayıtlar burada görünür.",
          source: "MEB 2024 · Ek 3",
          actionLabel: "Anekdot alanını aç",
          tone: "empty",
        };

  const studentItem: DocumentWorkspaceItem = options.studentCount > 0
    ? {
        id: "students",
        label: "Öğrenci dosyaları",
        title: `${options.studentCount} öğrenci için dosya hazırlanabilir`,
        detail: `${options.observationCount} tarihli gözlem · hedef ve kimlik kapsamını öğretmen seçer`,
        source: "Seçili öğrenci + tarih aralığı + açık paylaşım amacı",
        actionLabel: "Öğrenci dosyalarını aç",
        tone: options.observationCount > 0 ? "ready" : "empty",
      }
    : {
        id: "students",
        label: "Öğrenci dosyaları",
        title: "Öğrenci kaydı yok",
        detail: "Öğrenci dosyası için önce sınıf listenizi oluşturun.",
        source: "Öğrenci ve gözlem kaydı bekleniyor",
        actionLabel: "İlk öğrenciyi ekle",
        tone: "empty",
      };

  const items = [planItem, monthlyItem, anecdoteItem, studentItem] as const;
  return {
    readyCount: items.filter((item) => item.tone === "ready").length,
    pendingCount: items.filter((item) => item.tone === "attention").length,
    emptyCount: items.filter((item) => item.tone === "empty").length,
    items,
  };
}
