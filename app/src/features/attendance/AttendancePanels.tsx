import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import { BottomSheet, KeyboardInput, KeyboardTextarea } from "../../mobile";
import type {
  AttendanceEvent,
  AttendanceEventType,
  AttendancePartialDayPeriod,
  AttendanceRecord,
  AttendanceStatus,
} from "../../core/domain/attendance";
import type { DashboardStudent } from "../dashboard/dashboard-data";
import { formatAttendanceHistorySummary } from "./attendance-history";
import {
  ATTENDANCE_EVENT_LABELS,
  PARTIAL_DAY_PERIOD_LABELS,
  createAttendanceEventFromDraft,
  initialAttendanceEventDraft,
  localTimeInIstanbul,
  type AttendanceEventDraft,
} from "./attendance-panel-model";

export interface AttendancePanelsProps {
  calculationDetails?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: readonly DashboardStudent[];
  civilDate: string;
  formattedCivilDate: string;
  statusLabels: Record<AttendanceStatus, string>;
  renderAvatar: (student: DashboardStudent) => ReactNode;
  writesBlocked: boolean;
  educationalWritesDisabled: boolean;
  persistencePending: boolean;
  dataBusy: boolean;
  canUndo: boolean;
  onToggleStatus: (studentId: string) => void;
  onUndo: () => void;
  onComplete: () => void;
  onSaveEvent: (
    student: DashboardStudent,
    event: AttendanceEvent,
  ) => Promise<string | null>;
}

export function AttendancePanels(props: AttendancePanelsProps) {
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttendanceEventDraft>(
    initialAttendanceEventDraft,
  );
  const [error, setError] = useState("");
  const detailStudent = useMemo(
    () => props.students.find((student) => student.id === detailStudentId) ?? null,
    [detailStudentId, props.students],
  );

  const closeDetail = () => {
    setDetailStudentId(null);
    setDraft(initialAttendanceEventDraft());
    setError("");
  };

  return (
    <>
      <BottomSheet
        open={props.open}
        onOpenChange={props.onOpenChange}
        title="Bugünün devam durumu"
        description={`${props.formattedCivilDate} · Bir çocuğa dokunarak Geldi → Geç geldi → Gelmedi durumları arasında ilerleyin.`}
        snap={0.84}
      >
        {props.calculationDetails ? <details className="attendance-calculation-disclosure"><summary>Devam hesabını gün gün incele</summary>{props.calculationDetails}</details> : null}
        <div className="attendance-list">
          {props.students.map((student) => (
            <div className="attendance-student-row" key={student.id}>
              <button
                className="student-row"
                type="button"
                onClick={() => props.onToggleStatus(student.id)}
                disabled={
                  props.writesBlocked ||
                  props.educationalWritesDisabled ||
                  props.persistencePending ||
                  props.dataBusy
                }
              >
                {props.renderAvatar(student)}
                <span className="student-name">
                  {student.name}
                  {(student.events?.length ?? 0) > 0 ? (
                    <small>{student.events?.length} ayrıntı</small>
                  ) : null}
                </span>
                <span
                  className={`status-pill status-pill--${
                    student.attendanceMarked === false
                      ? "unmarked"
                      : student.status
                  }`}
                >
                  {student.attendanceMarked === false
                    ? "İşaretlenmedi"
                    : props.statusLabels[student.status]}
                </span>
              </button>
              <button
                className="attendance-detail-trigger"
                type="button"
                onClick={() => {
                  setDraft(initialAttendanceEventDraft());
                  setError("");
                  setDetailStudentId(student.id);
                }}
                disabled={
                  props.writesBlocked ||
                  props.educationalWritesDisabled ||
                  props.dataBusy
                }
                aria-label={`${student.name} için yoklama ayrıntısını aç`}
              >
                Ayrıntı <ChevronRightIcon aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {props.canUndo ? (
          <button
            className="attendance-undo"
            type="button"
            onClick={props.onUndo}
            disabled={props.writesBlocked || props.persistencePending || props.dataBusy}
          >
            Son değişikliği geri al
          </button>
        ) : null}
        <button
          className="sheet-primary"
          type="button"
          onClick={props.onComplete}
          disabled={
            props.dataBusy || props.writesBlocked || props.educationalWritesDisabled
          }
        >
          <CheckCircledIcon aria-hidden="true" /> Devam durumunu tamamla
        </button>
      </BottomSheet>

      <BottomSheet
        open={detailStudent !== null}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        title={detailStudent
          ? `${detailStudent.name} · yoklama ayrıntısı`
          : "Yoklama ayrıntısı"}
        description={`${props.formattedCivilDate} · Saat seçin veya tek dokunuşla “şimdi” kaydedin.`}
        snap={0.9}
      >
        {detailStudent ? (
          <AttendanceEventEditor
            student={detailStudent}
            draft={draft}
            error={error}
            dataBusy={props.dataBusy}
            writesBlocked={props.writesBlocked}
            educationalWritesDisabled={props.educationalWritesDisabled}
            onDraftChange={setDraft}
            onSave={async (candidate) => {
              const result = createAttendanceEventFromDraft(
                candidate,
                props.civilDate,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              const persistenceError = await props.onSaveEvent(
                detailStudent,
                result.event,
              );
              if (persistenceError) {
                setError(persistenceError);
                return;
              }
              setError("");
              setDraft(initialAttendanceEventDraft());
            }}
            onSaveNow={async (type) => {
              const candidate = {
                ...initialAttendanceEventDraft(),
                type,
                localTime: localTimeInIstanbul(),
                partialDayPeriod:
                  type === "partial_day" ? draft.partialDayPeriod : "morning",
              } satisfies AttendanceEventDraft;
              const result = createAttendanceEventFromDraft(
                candidate,
                props.civilDate,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              const persistenceError = await props.onSaveEvent(
                detailStudent,
                result.event,
              );
              setError(persistenceError ?? "");
              if (!persistenceError) setDraft(initialAttendanceEventDraft());
            }}
          />
        ) : null}
      </BottomSheet>
    </>
  );
}

interface AttendanceEventEditorProps {
  student: DashboardStudent;
  draft: AttendanceEventDraft;
  error: string;
  dataBusy: boolean;
  writesBlocked: boolean;
  educationalWritesDisabled: boolean;
  onDraftChange: (draft: AttendanceEventDraft) => void;
  onSave: (draft: AttendanceEventDraft) => Promise<void>;
  onSaveNow: (type: AttendanceEventType) => Promise<void>;
}

function AttendanceEventEditor(props: AttendanceEventEditorProps) {
  const events = props.student.events ?? [];
  return (
    <div className="attendance-detail-sheet">
      <section className="attendance-quick-events" aria-label="Şimdi kaydet">
        <button type="button" onClick={() => void props.onSaveNow("check_in")} disabled={props.dataBusy || props.writesBlocked || props.educationalWritesDisabled}><ClockIcon /> Giriş şimdi</button>
        <button type="button" onClick={() => void props.onSaveNow("check_out")} disabled={props.dataBusy || props.writesBlocked || props.educationalWritesDisabled}><ClockIcon /> Çıkış şimdi</button>
        <button type="button" onClick={() => void props.onSaveNow("early_departure")} disabled={props.dataBusy || props.writesBlocked || props.educationalWritesDisabled}><ClockIcon /> Erken ayrılma şimdi</button>
        <button type="button" onClick={() => void props.onSaveNow("partial_day")} disabled={props.dataBusy || props.writesBlocked || props.educationalWritesDisabled}><CalendarIcon /> Kısmi gün · sabah</button>
      </section>
      {events.length > 0 ? (
        <section className="attendance-event-list" aria-labelledby="today-attendance-events">
          <h3 id="today-attendance-events">Bugünün ayrıntıları</h3>
          <ul>{[...events].reverse().map((event) => (
            <li key={event.id}>
              <strong>{ATTENDANCE_EVENT_LABELS[event.type]}</strong>
              <span>{event.localTime ?? "Saat belirtilmedi"}{event.partialDayPeriod ? ` · ${PARTIAL_DAY_PERIOD_LABELS[event.partialDayPeriod]}` : ""}</span>
              {event.reason ? <small>Neden: {event.reason}</small> : null}
              {event.teacherNote ? <small>Not: {event.teacherNote}</small> : null}
            </li>
          ))}</ul>
        </section>
      ) : <p className="attendance-event-empty">Bugün için giriş, çıkış veya mazeret ayrıntısı yok.</p>}
      <section className="attendance-event-editor" aria-labelledby="attendance-event-editor-heading">
        <h3 id="attendance-event-editor-heading">Ayrıntı ekle</h3>
        <label htmlFor="attendance-event-type">Olay
          <select id="attendance-event-type" value={props.draft.type} onChange={(event) => props.onDraftChange({ ...props.draft, type: event.target.value as AttendanceEventType })}>
            {Object.entries(ATTENDANCE_EVENT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        {props.draft.type !== "excuse" ? (
          <div className="attendance-time-row">
            <label htmlFor="attendance-event-time">Saat
              <input id="attendance-event-time" type="time" value={props.draft.localTime} onChange={(event) => props.onDraftChange({ ...props.draft, localTime: event.target.value })} />
            </label>
            <button type="button" onClick={() => props.onDraftChange({ ...props.draft, localTime: localTimeInIstanbul() })}>Şimdi</button>
          </div>
        ) : null}
        {props.draft.type === "partial_day" ? (
          <>
            <label htmlFor="attendance-partial-period">Kısmi gün dönemi
              <select id="attendance-partial-period" value={props.draft.partialDayPeriod} onChange={(event) => props.onDraftChange({ ...props.draft, partialDayPeriod: event.target.value as AttendancePartialDayPeriod })}>
                {Object.entries(PARTIAL_DAY_PERIOD_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            {props.draft.partialDayPeriod === "custom" ? (
              <div className="attendance-custom-time-row">
                <label>Başlangıç<input type="time" value={props.draft.fromLocalTime} onChange={(event) => props.onDraftChange({ ...props.draft, fromLocalTime: event.target.value })} /></label>
                <label>Bitiş<input type="time" value={props.draft.toLocalTime} onChange={(event) => props.onDraftChange({ ...props.draft, toLocalTime: event.target.value })} /></label>
              </div>
            ) : null}
          </>
        ) : null}
        {props.draft.type === "excuse" || props.draft.type === "early_departure" || props.draft.type === "partial_day" ? (
          <label htmlFor="attendance-event-reason">Neden {props.draft.type === "excuse" ? "(zorunlu)" : "(isteğe bağlı)"}
            <KeyboardInput id="attendance-event-reason" value={props.draft.reason} onChange={(event) => props.onDraftChange({ ...props.draft, reason: event.target.value })} maxLength={240} autoComplete="off" />
          </label>
        ) : null}
        <label htmlFor="attendance-event-note">Öğretmen notu (isteğe bağlı)
          <KeyboardTextarea id="attendance-event-note" value={props.draft.teacherNote} onChange={(event) => props.onDraftChange({ ...props.draft, teacherNote: event.target.value })} maxLength={2000} />
        </label>
        {props.error ? <p role="alert">{props.error}</p> : null}
        <button className="sheet-primary" type="button" onClick={() => void props.onSave(props.draft)} disabled={props.dataBusy || props.writesBlocked || props.educationalWritesDisabled}><CheckCircledIcon /> Ayrıntıyı kaydet</button>
      </section>
    </div>
  );
}

export function StudentAttendanceHistoryPanel(props: {
  records: readonly AttendanceRecord[];
  error: string;
  formatCivilDate: (civilDate: string) => string;
}) {
  return (
    <section className="student-attendance-history" aria-labelledby="student-attendance-history-heading">
      <div><span className="section-eyebrow">Günlük kayıtlar</span><h3 id="student-attendance-history-heading">Yoklama geçmişi</h3></div>
      {props.error ? <p role="alert">{props.error}</p> : props.records.length > 0 ? (
        <ul>{props.records.map((record) => (
          <li key={record.id}>
            <time dateTime={record.civilDate}>{props.formatCivilDate(record.civilDate)}</time>
            <strong>{formatAttendanceHistorySummary(record)}</strong>
            {(record.events ?? []).some((event) => event.teacherNote) ? <small>{(record.events ?? []).map((event) => event.teacherNote).filter(Boolean).join(" · ")}</small> : null}
          </li>
        ))}</ul>
      ) : <p>Henüz günlük yoklama kaydı yok.</p>}
    </section>
  );
}
