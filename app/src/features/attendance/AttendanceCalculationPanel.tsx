import { useEffect, useMemo, useState } from "react";
import { KeyboardInput } from "../../mobile";
import { isCivilDate } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { buildAttendanceDayBreakdown, type AttendanceDayClassification } from "./attendance-day-breakdown.ts";
import "./attendance-calculation.css";

export const ATTENDANCE_ACCOUNTING_REASONS: Readonly<Record<string, string>> = {
  adaptation: "Uyum eğitimi günü", term: "Öğretim günü", "custom-weekday": "Sınıf takviminde hafta içi",
  weekend: "Hafta sonu", "official-break": "MEB ara / yarıyıl tatili", "full-day-holiday": "Tam gün resmî tatil",
  "local-closure": "Öğretmenin kaydettiği okul kapanışı", "explicit-closure": "Kaynaklı okul kapanışı",
  "outside-teaching-period": "Öğretim dönemi dışında", "before-operational-start": "Eğitim yılı çalışması başlamadı",
  "after-academic-year": "Eğitim yılı sona erdi", "invalid-calendar": "Takvim bilgisi doğrulanamadı",
  enrolled: "Üyelik döneminde", "legacy-enrolled": "Eski kaydın bilinen üyelik tarihinde",
  "before-enrollment": "Öğrenci henüz kayıtlı değil", "after-departure": "Öğrencinin ayrılmasından sonra",
  "between-enrollments": "Ayrılış ile yeniden kayıt arasında", "outside-scope": "Bu sınıf / yıl üyeliği yok",
  "invalid-membership": "Üyelik geçmişi incelenmeli", "outside-academic-year": "Eğitim yılı çalışma aralığı dışında",
  "deleted-student": "Silinmiş öğrenci kaydı", "future-day": "Henüz gelmemiş gün", "unmarked-day": "Beklenen gün; yoklama işaretlenmemiş",
  "attendance-record": "Takvim ve üyelik uygun; günlük kayıt esas alındı", "invalid-record": "Geçersiz kaynak kayıt",
  "duplicate-record": "Aynı öğrenci ve günün mükerrer kaydı", "deleted-record": "Silinmiş günlük kayıt",
  "unknown-student": "Kaynak kaydın öğrencisi kapsamda bulunamadı", "excluded-day": "Sayılmayan günde kaynak kayıt var",
};
const labels = { present: "Geldi", late: "Geç geldi", absent: "Gelmedi" } as const;
const classificationLabels = { counted: "Sayılan", missing: "Eksik", excluded: "Dışlanan" } as const;
function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", weekday: "short" }).format(new Date(`${value}T12:00:00.000Z`));
}
function rate(numerator: number, denominator: number): string {
  return denominator ? new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 }).format(numerator / denominator) : "Oran için kayıt yok";
}

export interface AttendanceCalculationPanelProps {
  store: LocalDataStore; civilDate: string; studentId?: string; scope?: ActiveClassroomScope; refreshKey?: unknown;
}
/** Mount inside an existing app surface; no modal, write or inferred attendance is created. */
export function AttendanceCalculationPanel({ store, civilDate, studentId, scope: requestedScope, refreshKey }: AttendanceCalculationPanelProps) {
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [period, setPeriod] = useState<"month" | "year" | "custom">("month");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [filter, setFilter] = useState<"all" | AttendanceDayClassification>("all");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  useEffect(() => {
    let cancelled = false;
    void store.readSnapshot().then(next => { if (!cancelled) { setSnapshot(next); setError(""); } })
      .catch(() => { if (!cancelled) { setSnapshot(null); setError("Devam dökümü okunamadı. Kayıtlar değiştirilmedi; yeniden deneyebilirsiniz."); } });
    return () => { cancelled = true; };
  }, [store, civilDate, studentId, requestedScope?.academicYearId, requestedScope?.classroomId, refreshKey, refresh]);
  const scope = snapshot ? requestedScope ?? resolveActiveClassroomScope(snapshot) : null;
  const year = snapshot?.academicYears.find(record => record.id === scope?.academicYearId);
  const yearStart = year && isCivilDate(year.operationalStartDate) ? year.operationalStartDate : year && isCivilDate(year.startDate) ? year.startDate : "";
  const yearEnd = year && isCivilDate(year.endDate) ? year.endDate : "";
  const monthStart = `${civilDate.slice(0, 7)}-01`;
  const periodStart = period === "custom" ? from : period === "year" ? yearStart : monthStart < yearStart ? yearStart : monthStart;
  const periodEnd = period === "custom" ? to : civilDate < yearEnd ? civilDate : yearEnd;
  const result = useMemo(() => {
    if (!snapshot || !scope || !periodStart || !periodEnd) return { data: null, error: "" };
    try { return { data: buildAttendanceDayBreakdown(snapshot, { scope, periodStart, periodEnd, asOfCivilDate: civilDate, ...(studentId || selectedStudentId ? { studentId: studentId || selectedStudentId } : {}) }), error: "" }; }
    catch (reason) { return { data: null, error: reason instanceof Error ? reason.message : "Devam dönemi doğrulanamadı." }; }
  }, [snapshot, scope?.academicYearId, scope?.classroomId, periodStart, periodEnd, civilDate, studentId, selectedStudentId]);
  const allStudents = useMemo(() => {
    if (!snapshot || !scope || !yearStart || !yearEnd) return [];
    try { return buildAttendanceDayBreakdown(snapshot, { scope, periodStart: yearStart, periodEnd: yearStart, asOfCivilDate: civilDate }).students; }
    catch { return []; }
  }, [snapshot, scope?.academicYearId, scope?.classroomId, yearStart, yearEnd, civilDate]);
  const totals = result.data?.totals;
  return <section className="attendance-calculation" aria-label="Devam hesabının gün gün dökümü">
    <header><div><span>Devam hesabı</span><h3>Hangi gün neden sayıldı?</h3></div>
      <button type="button" onClick={() => setRefresh(value => value + 1)}>Yenile</button></header>
    <p>Geldi ve geç geldi işaretleri devamın payını oluşturur. Eksik yoklama, gelmedi kabul edilmez. Tatiller ve öğrencinin kayıtlı olmadığı günler beklenen günlere katılmaz.</p>
    <div className="attendance-calculation__filters" role="group" aria-label="Devam hesabı dönemi">
      {(["month", "year", "custom"] as const).map(value => <button type="button" key={value} aria-pressed={period === value}
        onClick={() => { if (value === "custom") { setFrom(periodStart || yearStart); setTo(periodEnd || civilDate); } setPeriod(value); }}>
        {value === "month" ? "Bu ay" : value === "year" ? "Eğitim yılı" : "Tarih seç"}</button>)}
    </div>
    {period === "custom" ? <div className="attendance-calculation__dates"><label>Devam başlangıç tarihi<KeyboardInput type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label>Devam bitiş tarihi<KeyboardInput type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div> : null}
    {!studentId && allStudents.length ? <label>Devam dökümü öğrencisi<select value={selectedStudentId} onChange={event => setSelectedStudentId(event.target.value)}>
      <option value="">Sınıfın tamamı</option>{allStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label> : null}
    {error || result.error ? <p role="alert">{error || result.error}</p> : !snapshot ? <p role="status">Devam hesabı hazırlanıyor…</p> : !scope ? <p>Devam hesabı için sınıf ve eğitim yılını seçin.</p> : null}
    {totals && result.data ? <>
      <div className="attendance-calculation__totals" aria-label="Devam payı ve paydası">
        <div><strong>{totals.attendanceNumerator} / {totals.attendanceDenominator}</strong><span>İşaretli günlerde devam</span><small>{rate(totals.attendanceNumerator, totals.attendanceDenominator)}</small></div>
        <div><strong>{totals.coverageNumerator} / {totals.coverageDenominator}</strong><span>Beklenen çocuk-günlerde kayıt</span><small>{rate(totals.coverageNumerator, totals.coverageDenominator)}</small></div>
        <div><strong>{totals.missingStudentDays}</strong><span>Eksik yoklama</span></div><div><strong>{totals.excludedStudentDays}</strong><span>Dışlanan çocuk-gün</span></div>
      </div>
      <p className="attendance-calculation__formula">Devam: (Geldi {totals.presentStudentDays} + Geç geldi {totals.lateStudentDays}) / (Geldi {totals.presentStudentDays} + Geç geldi {totals.lateStudentDays} + Gelmedi {totals.absentStudentDays}). Kayıt kapsamı: {totals.recordedStudentDays} işaretli / {totals.expectedStudentDays} beklenen çocuk-gün.</p>
      <div className="attendance-calculation__filters" role="group" aria-label="Devam günlerini süz">
        {(["all", "counted", "missing", "excluded"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "Tümü" : classificationLabels[value]}</button>)}
      </div>
      <div className="attendance-calculation__days">{result.data.days.map(day => {
        const rows = day.rows.filter(row => filter === "all" || row.classification === filter);
        if (!rows.length) return null;
        return <details key={day.civilDate} className="attendance-calculation__day" data-civil-date={day.civilDate}>
          <summary><strong>{dateLabel(day.civilDate)}</strong><span>{rows.length} çocuk · {ATTENDANCE_ACCOUNTING_REASONS[day.calendar.reason]}</span></summary>
          {day.calendar.sources.length ? <small>{day.calendar.sources.map(source => source.authority).join(" · ")}</small> : null}
          <ul>{rows.map(row => <li key={row.studentId} data-student-id={row.studentId} data-classification={row.classification}>
            <div><strong>{row.studentName}</strong><span>{classificationLabels[row.classification]}{row.status ? ` · ${labels[row.status]}` : ""}</span></div>
            <p>{ATTENDANCE_ACCOUNTING_REASONS[row.reason] ?? row.reason}</p>
            {!row.membership.eligible && row.reason !== row.membership.reason ? <p>{ATTENDANCE_ACCOUNTING_REASONS[row.membership.reason]}</p> : null}
            {row.membership.issues.length ? <p className="attendance-calculation__warning">Üyelik geçmişinde {row.membership.issues.length} inceleme işareti var; kaynaklar korunuyor.</p> : null}
            {row.sourceRecordIds.length ? <details><summary>Kaynak kayıtları ({row.sourceRecordIds.length})</summary>
              <p>{row.duplicateRecordIds.length} mükerrer, {row.invalidRecordIds.length} geçersiz kayıt. Mükerrerlerde son güncellenen geçerli kayıt esas alınır; kayıtlar silinmez.</p>
              {row.canonicalRecordId ? <p>Esas kayıt: <code>{row.canonicalRecordId}</code></p> : null}
              <ul>{row.sourceRecordIds.map(id => <li key={id}><code>{id}</code></li>)}</ul></details> : null}
          </li>)}</ul>
        </details>;
      })}</div>
      {result.data.sourceIssues.length ? <details className="attendance-calculation__source-review"><summary>Kaynak kayıt incelemesi ({result.data.sourceIssues.length})</summary>
        <p>Geçersiz tarihler ve öğrencisi bulunamayan kayıtlar dahil, hesap dışında kalan kaynaklar burada görünür. Bu görünüm hiçbir kaydı değiştirmez.</p>
        <ul>{result.data.sourceIssues.map((issue, index) => <li key={`${issue.recordId}-${issue.reason}-${index}`}><strong>{ATTENDANCE_ACCOUNTING_REASONS[issue.reason]}</strong> · {issue.civilDate || "Tarih yok"}<code>{issue.recordId}</code></li>)}</ul>
      </details> : null}
    </> : null}
  </section>;
}
