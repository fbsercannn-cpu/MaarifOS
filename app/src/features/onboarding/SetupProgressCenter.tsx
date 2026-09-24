import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  LockClosedIcon,
  PersonIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";

import type {
  SetupProgressPresentation,
  SetupProgressStepId,
} from "./setup-progress-model.ts";
import "./setup-progress.css";

export interface SetupProgressCenterProps {
  presentation: SetupProgressPresentation;
  mode: "guided" | "compact";
  dataBusy: boolean;
  onOpenStep(stepId: SetupProgressStepId): void;
}

const stepIcons = {
  classroom: CalendarIcon,
  students: PersonIcon,
  plan: ReaderIcon,
  backup: LockClosedIcon,
} as const;

export function SetupProgressCenter({
  presentation,
  mode,
  dataBusy,
  onOpenStep,
}: SetupProgressCenterProps) {
  if (presentation.isComplete) return null;

  if (mode === "compact" && presentation.currentStep) {
    const step = presentation.currentStep;
    const Icon = stepIcons[step.id];

    return (
      <section
        className="setup-progress-center is-compact"
        aria-labelledby="setup-progress-title"
        data-testid="setup-progress-center"
        data-mode="compact"
      >
        <header className="setup-progress-compact-header">
          <span>
            <small>Başlangıç planı</small>
            <strong id="setup-progress-title">Kuruluma devam</strong>
          </span>
          <b
            aria-label={`${presentation.completedCount} / ${presentation.totalCount} adım tamamlandı`}
          >
            {presentation.completedCount}/{presentation.totalCount}
          </b>
        </header>

        <button
          className="setup-progress-next-step"
          type="button"
          disabled={dataBusy}
          onClick={() => onOpenStep(step.id)}
          aria-label={`${step.label}: ${step.title}. ${step.actionLabel}`}
        >
          <span className="setup-step-icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="setup-step-copy">
            <small>{step.label}</small>
            <strong>{step.title}</strong>
          </span>
          <span className="setup-progress-next-action" aria-hidden="true">
            {step.actionLabel}
          </span>
          <ChevronRightIcon className="setup-step-arrow" aria-hidden="true" />
        </button>

        <div
          className="setup-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={presentation.totalCount}
          aria-valuenow={presentation.completedCount}
          aria-label={`İlk kurulum ilerlemesi; ${presentation.remainingCount} adım kaldı`}
        >
          <span style={{ width: `${presentation.percent}%` }} />
        </div>
      </section>
    );
  }

  return (
    <section
      className="setup-progress-center"
      aria-labelledby="setup-progress-title"
      data-testid="setup-progress-center"
      data-mode="guided"
    >
      <header className="setup-progress-header">
        <div>
          <span className="section-eyebrow">İlk kurulum</span>
          <h2 id="setup-progress-title">{presentation.headline}</h2>
          <p>{presentation.detail}</p>
        </div>
        <strong aria-label={`${presentation.completedCount} / ${presentation.totalCount} adım tamamlandı`}>
          {presentation.completedCount}/{presentation.totalCount}
        </strong>
      </header>

      <div
        className="setup-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={presentation.totalCount}
        aria-valuenow={presentation.completedCount}
        aria-label="İlk kurulum ilerlemesi"
      >
        <span style={{ width: `${presentation.percent}%` }} />
      </div>

      <ol className="setup-progress-steps">
        {presentation.steps.map((step) => {
          const Icon = stepIcons[step.id];
          const locked = step.status === "locked";
          const complete = step.status === "complete";
          const detailId = `setup-step-${step.id}-detail`;
          return (
            <li key={step.id} data-status={step.status}>
              <button
                type="button"
                disabled={dataBusy || locked}
                onClick={() => onOpenStep(step.id)}
                aria-describedby={detailId}
              >
                <span className="setup-step-order" aria-hidden="true">
                  {complete ? <CheckCircledIcon /> : step.order}
                </span>
                <span className="setup-step-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="setup-step-copy">
                  <small>{step.label}</small>
                  <strong>{step.title}</strong>
                  <em id={detailId}>{step.detail}</em>
                  <b>{locked ? "Önceki adımı tamamlayın" : step.actionLabel}</b>
                </span>
                {!locked ? <ChevronRightIcon className="setup-step-arrow" aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
