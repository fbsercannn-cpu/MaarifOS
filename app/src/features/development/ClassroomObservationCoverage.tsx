import { useId } from "react";
import { ChevronRightIcon, PlusIcon } from "@radix-ui/react-icons";
import { DEVELOPMENT_COPY } from "./development-copy.ts";
import { DevelopmentPeriodControl } from "./DevelopmentPeriodControl.tsx";
import { formatDevelopmentDate, type DevelopmentOverview, type DevelopmentPeriodKind } from "./development-overview.ts";
import "./development-overview.css";

export interface ClassroomObservationCoverageProps {
  overview: DevelopmentOverview;
  onPeriodChange(period: DevelopmentPeriodKind): void;
  onOpenStudent(studentId: string): void;
  onQuickObservation(studentId: string): void;
  disabled?: boolean;
}

export function ClassroomObservationCoverage(props: ClassroomObservationCoverageProps) {
  const headingId = useId();
  const { overview } = props;
  const nextStudent = overview.students.find((student) => student.observationCount === 0);
  const emptyMessage = !overview.scope ? DEVELOPMENT_COPY.noClassroom : !overview.period ? DEVELOPMENT_COPY.noPeriod : DEVELOPMENT_COPY.noStudents;
  return (
    <section className="development-card development-coverage" aria-labelledby={headingId}>
      <header className="development-card__heading"><h3 id={headingId}>{DEVELOPMENT_COPY.coverageTitle}</h3></header>
      <DevelopmentPeriodControl period={overview.periodKind} onChange={props.onPeriodChange} />
      <p className="development-coverage__summary" role="status">{overview.students.length > 0 ? DEVELOPMENT_COPY.coverageSummary(overview.observedStudentCount, overview.students.length - overview.observedStudentCount) : emptyMessage}</p>
      {nextStudent ? <button type="button" className="development-action development-action--primary development-coverage__next" disabled={props.disabled} onClick={() => props.onQuickObservation(nextStudent.studentId)}><span>{DEVELOPMENT_COPY.observeStudent(nextStudent.studentName)}</span><PlusIcon aria-hidden="true" /></button> : null}
      {overview.students.length > 0 ? <details className="development-details">
        <summary>{DEVELOPMENT_COPY.studentsDetail}</summary>
        <ul className="development-records">{overview.students.map((student) => <li key={student.studentId}>
          <button type="button" className="development-record" aria-label={DEVELOPMENT_COPY.openStudent(student.studentName)} onClick={() => props.onOpenStudent(student.studentId)}>
            <span className="development-record__body"><strong>{student.studentName}</strong><span className="development-record__meta">{student.observationCount > 0 ? DEVELOPMENT_COPY.observationCount(student.observationCount) : DEVELOPMENT_COPY.noObservations}{student.lastObservationDate ? <small>{DEVELOPMENT_COPY.lastObservation(formatDevelopmentDate(student.lastObservationDate))}</small> : null}</span></span><ChevronRightIcon aria-hidden="true" />
          </button>
        </li>)}</ul>
        <p className="development-coverage__notice">{DEVELOPMENT_COPY.coverageNotice}</p>
      </details> : null}
    </section>
  );
}
