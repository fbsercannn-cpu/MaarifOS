import { useEffect, useId, useRef } from "react";
import {
  ArrowLeftIcon,
  BackpackIcon,
  EyeOpenIcon,
  FileTextIcon,
  LapTimerIcon,
  PlayIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import type { ActivityStudioContext } from "./ActivityStudio.tsx";
import type { ActivityStudioItem } from "./activity-studio-model.ts";
import { createActivityTeacherGuide } from "./activity-teacher-guide.ts";
import { ACTIVITY_TEACHER_GUIDE_COPY as copy } from "./activity-teacher-guide.copy.ts";
import "./activity-teacher-guide.css";

interface ActivityTeacherGuideProps {
  activity: ActivityStudioItem;
  context: ActivityStudioContext;
  busyAction: string | null;
  errorMessage: string | null;
  observationUnavailableReason?: string;
  observationReturn: boolean;
  toolsOpen: boolean;
  onToolsToggle(open: boolean): void;
  onBack(): void;
  onPlan(): void;
  onChildMode(): void;
  onPrint(): void;
  onObservation(): void;
  onObservationReturnFocus(): void;
}

export function ActivityTeacherGuide({
  activity,
  context,
  busyAction,
  errorMessage,
  observationUnavailableReason,
  observationReturn,
  toolsOpen,
  onToolsToggle,
  onBack,
  onPlan,
  onChildMode,
  onPrint,
  onObservation,
  onObservationReturnFocus,
}: ActivityTeacherGuideProps) {
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const guide = createActivityTeacherGuide(activity, context);
  const busy = busyAction !== null;

  useEffect(() => {
    const heading = headingRef.current;
    const scroll = heading?.closest<HTMLElement>(".mobile-scroll");
    if (scroll) scroll.scrollTop = 0;
    heading?.focus({ preventScroll: true });
  }, [activity.id]);

  return (
    <main className="activity-teacher-guide" aria-labelledby={`${id}-title`}>
      <button type="button" className="activity-teacher-guide__back" onClick={onBack} disabled={busy}>
        <ArrowLeftIcon aria-hidden="true" /> {copy.back}
      </button>
      <header className="activity-teacher-guide__header">
        <p className="activity-teacher-guide__eyebrow">{copy.heading}</p>
        <h1 id={`${id}-title`} ref={headingRef} data-route-heading tabIndex={-1}>{activity.title}</h1>
        <p className="activity-teacher-guide__metadata">
          <LapTimerIcon aria-hidden="true" />
          <span>{copy.duration(activity.durationMinutes, guide.ageLabel)}</span>
        </p>
        <img
          className="activity-teacher-guide__image"
          src="/assets/teaching/teacher-workshop.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          width={1280}
          height={512}
        />
        <p className="activity-teacher-guide__invitation">{activity.teacherPrompt}</p>
      </header>

      <section className="activity-teacher-guide__materials" aria-labelledby={`${id}-materials`}>
        <BackpackIcon aria-hidden="true" />
        <div>
          <h2 id={`${id}-materials`}>{copy.materials}</h2>
          <p>{activity.materials.join(" · ")}</p>
        </div>
      </section>

      {context.scenarioId !== "balanced" ? (
        <aside className="activity-teacher-guide__scenario" aria-label={copy.scenarioLabel}>
          <h2>{guide.adaptation.scenario.label}</h2>
          <p>{guide.adaptation.scenario.setupChange}</p>
          <p>{guide.adaptation.scenario.materialStrategy}</p>
          <p>{guide.adaptation.scenario.pacing}</p>
        </aside>
      ) : null}

      <section className="activity-teacher-guide__steps" aria-labelledby={`${id}-steps`}>
        <h2 id={`${id}-steps`}>{copy.steps}</h2>
        <ol>
          {activity.teacherSteps.map((step, index) => (
            <li key={step}>
              <span aria-hidden="true">{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="activity-teacher-guide__support" aria-labelledby={`${id}-support`}>
        <h2 id={`${id}-support`}>{copy.support}</h2>
        <p>{guide.ageSupport}</p>
        <p>{activity.inclusionNote}</p>
        {context.participationRouteId !== "multiple" ? (
          <p>{guide.adaptation.participationRoute.instruction}</p>
        ) : null}
      </aside>

      <section className="activity-teacher-guide__observation" aria-labelledby={`${id}-observation`}>
        <EyeOpenIcon aria-hidden="true" />
        <div>
          <h2 id={`${id}-observation`}>{copy.observation}</h2>
          <p>{activity.observationPrompt}</p>
          <p className="activity-teacher-guide__hint">{copy.observationHint}</p>
        </div>
      </section>

      {errorMessage ? <p className="activity-teacher-guide__error" role="alert">{errorMessage}</p> : null}
      {observationUnavailableReason ? (
        <p id={`${id}-notice`} className="activity-teacher-guide__notice">{observationUnavailableReason}</p>
      ) : null}
      <button
        type="button"
        className="activity-teacher-guide__primary"
        disabled={busy || Boolean(observationUnavailableReason)}
        aria-describedby={observationUnavailableReason ? `${id}-notice` : undefined}
        data-activity-observation-return={observationReturn ? "true" : undefined}
        onFocus={onObservationReturnFocus}
        onClick={onObservation}
      >
        <PlusIcon aria-hidden="true" />
        {busyAction === `observation:${activity.id}` ? copy.openingObservation : copy.addObservation}
      </button>

      <details
        className="activity-teacher-guide__details"
        open={toolsOpen}
        onToggle={(event) => onToolsToggle(event.currentTarget.open)}
      >
        <summary>{copy.tools}</summary>
        <dl>
          <div><dt>{copy.domains}</dt><dd>{activity.tymmDomains.join(" · ")}</dd></div>
          <div><dt>{copy.preparation}</dt><dd>{copy.preparationDetail(activity.environment, activity.preparationMinutes)}</dd></div>
          <div><dt>{copy.adaptation}</dt><dd>{guide.adaptation.scenario.label} · {guide.adaptation.participationRoute.label}</dd></div>
          <div><dt>{copy.setup}</dt><dd>{guide.adaptation.setup}</dd></div>
          <div><dt>{copy.materialSwap}</dt><dd>{guide.adaptation.materialSwap}</dd></div>
          <div><dt>{copy.facilitation}</dt><dd>{guide.adaptation.facilitation}</dd></div>
          <div><dt>{copy.evidence}</dt><dd>{guide.adaptation.evidencePrompt}</dd></div>
          <div><dt>{copy.family}</dt><dd>{guide.adaptation.familyBridge}</dd></div>
          <div><dt>{copy.safety}</dt><dd>{guide.adaptation.safetyCheck}</dd></div>
        </dl>
        <p className="activity-teacher-guide__hint">{copy.provenance}</p>
        <div className="activity-teacher-guide__tools">
          <button type="button" disabled={busy} onClick={onPlan}>
            <PlusIcon aria-hidden="true" />{busyAction === `plan:${activity.id}` ? copy.adding : copy.addToPlan}
          </button>
          <button type="button" disabled={busy} onClick={onPrint}>
            <FileTextIcon aria-hidden="true" />{busyAction === `print:${activity.id}` ? copy.preparing : copy.print}
          </button>
          <button
            type="button"
            disabled={busy}
            data-activity-child-trigger={activity.id}
            onClick={onChildMode}
            aria-label={copy.childModeLabel(activity.title)}
          >
            <PlayIcon aria-hidden="true" />{busyAction === `apply:${activity.id}` ? copy.opening : copy.childMode}
          </button>
        </div>
        <p className="activity-teacher-guide__hint">{copy.childModeNotice}</p>
      </details>
    </main>
  );
}
