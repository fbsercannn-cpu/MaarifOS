import { useEffect, useMemo, useState } from "react";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { resolveDevelopmentOverview } from "./development-overview.ts";
import { StudentDevelopmentCard } from "./StudentDevelopmentCard.tsx";
import { DevelopmentPeriodControl } from "./DevelopmentPeriodControl.tsx";
import { ClassroomObservationCoverage } from "./ClassroomObservationCoverage.tsx";
import { REPORT_EDITOR_COPY } from "./development-editor-copy.ts";
import "./development-panels.css";

interface DevelopmentPanelProps {
  store: LocalDataStore;
  civilDate: string;
  refreshKey: unknown;
  rosterKey?: unknown;
  disabled?: boolean;
  onQuickObservation(studentId: string): void;
}

function useDevelopmentOverview({ store, civilDate, refreshKey, rosterKey }: DevelopmentPanelProps) {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const read = async () => {
      const request = ++sequence;
      try {
        const next = await store.readSnapshot();
        if (active && request === sequence) { setSnapshot(next); setError(""); }
      } catch {
        if (active && request === sequence) { setSnapshot(null); setError(REPORT_EDITOR_COPY.overviewError); }
      }
    };
    setSnapshot(null);
    void read();
    window.addEventListener("focus", read);
    return () => { active = false; window.removeEventListener("focus", read); };
  }, [store, civilDate, refreshKey, rosterKey]);
  const overview = useMemo(() => snapshot
    ? resolveDevelopmentOverview(snapshot, { civilDate, period }) : null, [snapshot, civilDate, period]);
  return { overview, period, setPeriod, error };
}

export function ClassroomDevelopmentPanel(props: DevelopmentPanelProps & {
  onOpenStudent(studentId: string): void;
}) {
  const { overview, period, setPeriod, error } = useDevelopmentOverview(props);
  if (!overview) return <section className="development-card development-coverage" aria-label="Gözlem kapsamı" aria-busy={!error}>
    <header className="development-card__heading"><h3>Gözlem kapsamı</h3></header>
    <DevelopmentPeriodControl period={period} onChange={setPeriod} />
    <p className="development-coverage__summary" role={error ? "alert" : "status"}>{error || "Gözlem kapsamı hazırlanıyor"}</p>
  </section>;
  return <ClassroomObservationCoverage overview={overview} onPeriodChange={setPeriod}
    onOpenStudent={props.onOpenStudent} onQuickObservation={props.onQuickObservation} disabled={props.disabled} />;
}

export function StudentDevelopmentPanel(props: DevelopmentPanelProps & {
  studentId: string;
  onOpenObservation(observationId: string): void;
  onCreateReport(studentId: string, period: { periodStart: string; periodEnd: string }): void;
}) {
  const { overview, setPeriod, error } = useDevelopmentOverview(props);
  if (error) return <p role="status">{error}</p>;
  if (!overview) {
    return (
      <p
        className="development-card__empty"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Gelişim kayıtları yükleniyor…
      </p>
    );
  }
  const student = overview?.students.find((item) => item.studentId === props.studentId);
  if (!student) {
    return (
      <p
        className="development-card__empty"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Bu çocuk güncel gelişim özetinde bulunamadı. Profil ve kayıtlar değiştirilmedi; sınıf görünümünü yenileyip yeniden deneyin.
      </p>
    );
  }
  if (!overview.period) {
    return (
      <p
        className="development-card__empty"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Seçilen dönem için gelişim özeti henüz kullanılamıyor. Profil ve kayıtlar değiştirilmedi.
      </p>
    );
  }
  return <StudentDevelopmentCard student={student} period={overview.periodKind}
    onPeriodChange={setPeriod} onOpenObservation={props.onOpenObservation}
    onQuickObservation={props.onQuickObservation}
    onCreateReport={(id) => props.onCreateReport(id, { periodStart: overview.period!.startDate, periodEnd: overview.period!.endDate })}
    disabled={props.disabled} />;
}
