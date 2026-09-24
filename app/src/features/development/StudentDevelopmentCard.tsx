import { useId } from "react";
import { ChevronRightIcon, PlusIcon, ReaderIcon } from "@radix-ui/react-icons";
import { DEVELOPMENT_COPY } from "./development-copy.ts";
import { DevelopmentPeriodControl } from "./DevelopmentPeriodControl.tsx";
import { formatDevelopmentDate, type DevelopmentObservationView, type DevelopmentPeriodKind, type StudentDevelopmentOverview } from "./development-overview.ts";
import "./development-overview.css";

export interface StudentDevelopmentCardProps {
  student: StudentDevelopmentOverview;
  period: DevelopmentPeriodKind;
  onPeriodChange(period: DevelopmentPeriodKind): void;
  onOpenObservation(observationId: string): void;
  onQuickObservation(studentId: string): void;
  onCreateReport(studentId: string): void;
  disabled?: boolean;
}

export function StudentDevelopmentCard(props: StudentDevelopmentCardProps) {
  const headingId = useId();
  const renderObservation = (observation: DevelopmentObservationView) => (
    <li key={observation.id}>
      <button type="button" className="development-record" onClick={() => props.onOpenObservation(observation.id)} aria-label={DEVELOPMENT_COPY.openObservation(formatDevelopmentDate(observation.civilDate))}>
        <span className="development-record__body">
          <span className="development-record__meta"><time dateTime={observation.civilDate}>{formatDevelopmentDate(observation.civilDate)}</time><span>{observation.domainLabels.join(" · ")}</span></span>
          <span className="development-record__text">{observation.rawText}</span>
          {observation.developmentSupportLabel ? <small>{DEVELOPMENT_COPY.support}: {observation.developmentSupportLabel}</small> : null}
        </span>
        <ChevronRightIcon aria-hidden="true" />
      </button>
    </li>
  );
  return (
    <section className="development-card" aria-labelledby={headingId}>
      <header className="development-card__heading"><h3 id={headingId}>{DEVELOPMENT_COPY.cardTitle}</h3><span>{DEVELOPMENT_COPY.observationCount(props.student.observationCount)}</span></header>
      <DevelopmentPeriodControl period={props.period} onChange={props.onPeriodChange} />
      {props.student.observations.length > 0 ? <ul className="development-records">{props.student.observations.slice(0, 3).map(renderObservation)}</ul> : <p className="development-card__empty" role="status">{DEVELOPMENT_COPY.noObservations}</p>}
      {props.student.observations.length > 3 ? <details className="development-details"><summary>{DEVELOPMENT_COPY.moreObservations(props.student.observations.length - 3)}</summary><ul className="development-records">{props.student.observations.slice(3).map(renderObservation)}</ul></details> : null}
      <div className="development-card__actions">
        <button type="button" className="development-action development-action--primary" data-student-development-trigger={props.student.studentId} disabled={props.disabled} onClick={() => props.onQuickObservation(props.student.studentId)}><PlusIcon aria-hidden="true" />{DEVELOPMENT_COPY.quickObservation}</button>
        <button type="button" className="development-action" disabled={props.disabled || props.student.observationCount === 0} aria-describedby={props.student.observationCount === 0 ? `${headingId}-report-notice` : undefined} onClick={() => props.onCreateReport(props.student.studentId)}><ReaderIcon aria-hidden="true" />{DEVELOPMENT_COPY.createReport}</button>
      </div>
      {props.student.observationCount === 0 ? <p id={`${headingId}-report-notice`} className="development-card__empty">{DEVELOPMENT_COPY.reportNeedsObservation}</p> : null}
    </section>
  );
}
