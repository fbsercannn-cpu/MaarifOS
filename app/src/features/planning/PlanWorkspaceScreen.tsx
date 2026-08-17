import {
  ArchiveIcon,
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
  ReaderIcon,
  TargetIcon,
} from "@radix-ui/react-icons";

import type { TeacherWorkCycleWorkspace } from "../teacher-cycle/teacher-work-cycle.ts";
import {
  createPlanWorkbenchPresentation,
  type PlanWorkbenchLevelId,
} from "./plan-workbench-model.ts";
import "./plan-workspace.css";

export interface PlanWorkspaceScreenProps {
  workspace: TeacherWorkCycleWorkspace;
  educationalWritesDisabled: boolean;
  preparationPlanningAllowed?: boolean;
  preparationPlanningCivilDate?: string | null;
  upcomingPlanningCivilDate?: string | null;
  dataBusy: boolean;
  onOpenLevel(levelId: PlanWorkbenchLevelId): void;
  onOpenCalendar(): void;
  onOpenPlanLibrary(): void;
  onOpenDocuments(): void;
}

const LEVEL_ICONS = {
  annual: ArchiveIcon,
  monthly: TargetIcon,
  weekly: CalendarIcon,
  daily: ReaderIcon,
} as const;

export function PlanWorkspaceScreen({
  workspace,
  educationalWritesDisabled,
  preparationPlanningAllowed = false,
  preparationPlanningCivilDate = null,
  upcomingPlanningCivilDate = null,
  dataBusy,
  onOpenLevel,
  onOpenCalendar,
  onOpenPlanLibrary,
  onOpenDocuments,
}: PlanWorkspaceScreenProps) {
  const presentation = createPlanWorkbenchPresentation(workspace, {
    educationalWritesDisabled,
    preparationPlanningAllowed,
    preparationPlanningCivilDate,
    upcomingPlanningCivilDate,
  });

  return (
    <main className="plan-workspace" aria-labelledby="plan-workspace-title">
      <header className="plan-workspace-hero">
        <div>
          <span className="plan-workspace-brand">MaarifOS · öğretmen planlama merkezi</span>
          <h1 id="plan-workspace-title" data-route-heading tabIndex={-1}>Planlar</h1>
          <p>Yıllık omurgadan bugünün akışına kadar her planı tek zincirde izleyin.</p>
        </div>
        <div className="plan-workspace-score" aria-label={`${presentation.linkedLevelCount} plan düzeyi kayıt zincirine bağlı`}>
          <strong>{presentation.linkedLevelCount}/4</strong>
          <span>bağlı düzey</span>
        </div>
      </header>

      <section className="plan-workspace-priority" aria-labelledby="plan-workspace-priority-title">
        <div>
          <span>{presentation.priority.eyebrow}</span>
          <h2 id="plan-workspace-priority-title">{presentation.priority.title}</h2>
          <p>{presentation.priority.detail}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenLevel(presentation.priority.levelId)}
          disabled={dataBusy}
        >
          {presentation.priority.actionLabel}
          <ChevronRightIcon aria-hidden="true" />
        </button>
      </section>

      <section className="plan-workspace-hierarchy" aria-labelledby="plan-workspace-hierarchy-title">
        <div className="plan-workspace-section-heading">
          <div>
            <span>Plan hiyerarşisi</span>
            <h2 id="plan-workspace-hierarchy-title">Yıl → Ay → Hafta → Gün</h2>
          </div>
          <small>Kaydedilmiş planlar</small>
        </div>

        <ol className="plan-workspace-levels">
          {presentation.levels.map((level, index) => {
            const Icon = LEVEL_ICONS[level.id];
            const StatusIcon = level.tone === "ready" ? CheckCircledIcon : ClockIcon;
            return (
              <li key={level.id}>
                <button
                  type="button"
                  className={`plan-workspace-level is-${level.tone}`}
                  onClick={() => onOpenLevel(level.id)}
                  disabled={dataBusy}
                  aria-label={`${level.label}: ${level.title}. ${level.detail}. ${level.actionLabel}`}
                >
                  <span className="plan-workspace-level-index" aria-hidden="true">{index + 1}</span>
                  <span className="plan-workspace-level-icon" aria-hidden="true"><Icon /></span>
                  <span className="plan-workspace-level-copy">
                    <span className="plan-workspace-level-label">{level.label}</span>
                    <strong>{level.title}</strong>
                    <small>{level.detail}</small>
                    <em><StatusIcon aria-hidden="true" /> {level.meta}</em>
                  </span>
                  <span className="plan-workspace-level-action">
                    {level.actionLabel}
                    <ChevronRightIcon aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="plan-workspace-tools" aria-labelledby="plan-workspace-tools-title">
        <div className="plan-workspace-section-heading">
          <div>
            <span>Çalışma araçları</span>
            <h2 id="plan-workspace-tools-title">Planı hazırlayın, tarihlendirin, belgeleyin</h2>
          </div>
        </div>
        <div className="plan-workspace-tool-grid">
          <button type="button" onClick={onOpenPlanLibrary} disabled={dataBusy}>
            <TargetIcon aria-hidden="true" />
            <span><strong>Plan Kütüphanesi</strong><small>Yıllık, aylık ve haftalık kaynaklar</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button type="button" onClick={onOpenCalendar} disabled={dataBusy}>
            <CalendarIcon aria-hidden="true" />
            <span><strong>Eğitim takvimi</strong><small>Plan günleri ve sınıf notları</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
          <button type="button" onClick={onOpenDocuments} disabled={dataBusy}>
            <ArchiveIcon aria-hidden="true" />
            <span><strong>Plan belgeleri</strong><small>PDF, DOCX, değerlendirme ve Ek 18</small></span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}
