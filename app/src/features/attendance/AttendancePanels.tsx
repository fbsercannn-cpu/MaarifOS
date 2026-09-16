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
import type { LocalDataStore } from "../../core/repository/contracts";
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
import "./quick-attendance.css";

export interface AttendancePanelsProps {
  store?: LocalDataStore;
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
  onToggleStatus: (studentId: string, directStatus?: AttendanceStatus) => void;
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

  const markedCount = props.students.filter((s) => s.attendanceMarked !== false).length;
  const presentCount = props.students.filter((s) => s.status === "present" && s.attendanceMarked !== false).length;
  const absentCount = props.students.filter((s) => s.status === "absent" && s.attendanceMarked !== false).length;
  const lateCount = props.students.filter((s) => s.status === "late" && s.attendanceMarked !== false).length;

  const handleMarkAllUnmarkedPresent = () => {
    props.students
      .filter((s) => s.attendanceMarked === false)
      .forEach((s) => props.onToggleStatus(s.id, "present"));
  };

  const handleExportAttendanceExcel = async () => {
    const { exportOfficialTableToExcel } = await import("../official-forms/official-form-export-service.ts");
    const rows = props.students.map((s, index) => {
      const isMarked = s.attendanceMarked !== false;
      const status = isMarked ? s.status : "unmarked";
      const statusText = status === "present" ? "Var" : status === "absent" ? "Yok" : status === "late" ? "Geç" : "İşaretsiz";
      const notes = (s.events ?? [])
        .map((e) => [e.localTime, e.teacherNote || e.reason || e.type].filter(Boolean).join(" "))
        .filter(Boolean)
        .join(", ");
      return {
        no: index + 1,
        name: s.name,
        statusText,
        isPresent: status === "present" ? 1 : 0,
        isAbsent: status === "absent" ? 1 : 0,
        isLate: status === "late" ? 1 : 0,
        notes: notes || "-",
      };
    });

    await exportOfficialTableToExcel({
      fileName: `Yoklama_${props.civilDate}`,
      sheetName: "Günlük Yoklama",
      title: "T.C. MİLLÎ EĞİTİM BAKANLIĞI OKUL ÖNCESİ GÜNLÜK VE AYLIK YOKLAMA ÇİZELGESİ",
      subtitle: `${props.formattedCivilDate} Sınıf Yoklama Cetveli`,
      metadata: [
        { label: "Tarih", value: props.civilDate },
        { label: "Sınıf Mevcudu", value: String(props.students.length) },
        { label: "Katılım", value: `${presentCount} Var (%${Math.round((presentCount / (props.students.length || 1)) * 100)})` },
        { label: "Devamsız", value: `${absentCount} Yok` },
        { label: "Geç Kalan", value: `${lateCount} Geç` },
      ],
      columns: [
        { header: "No", key: "no", width: 6, align: "center", isNumeric: true },
        { header: "Öğrenci Adı Soyadı", key: "name", width: 28, align: "left" },
        { header: "Durum", key: "statusText", width: 14, align: "center" },
        { header: "Var (1)", key: "isPresent", width: 10, align: "center", isNumeric: true },
        { header: "Yok (1)", key: "isAbsent", width: 10, align: "center", isNumeric: true },
        { header: "Geç (1)", key: "isLate", width: 10, align: "center", isNumeric: true },
        { header: "Saat & Notlar", key: "notes", width: 35, align: "left" },
      ],
      rows,
      includeSubtotals: true,
    });
  };

  const handleExportMonthlyAttendanceExcel = async () => {
    const { exportMonthlyAttendanceExcel } = await import("./attendance-excel-service.ts");
    await exportMonthlyAttendanceExcel({
      civilDate: props.civilDate,
      students: props.students,
      store: props.store,
    });
  };

  const handlePrintAttendance = async () => {
    const { printOfficialFormA4 } = await import("../official-forms/official-form-export-service.ts");
    printOfficialFormA4(`Yoklama_${props.civilDate}`);
  };

  return (
    <>
      <BottomSheet
        open={props.open}
        onOpenChange={props.onOpenChange}
        title="Hızlı Dokunmatik Yoklama (E5)"
        description={`${props.formattedCivilDate} · Tek dokunuşla Var / Yok / Geç işaretleyin.`}
        snap={0.88}
      >
        {props.calculationDetails ? (
          <details className="attendance-calculation-disclosure">
            <summary>Devam hesabını gün gün incele</summary>
            {props.calculationDetails}
          </details>
        ) : null}

        {/* Hızlı Dışa Aktarma Butonları */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "flex-end", marginBottom: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void handleExportMonthlyAttendanceExcel()}
            style={{
              background: "#047857",
              color: "#ffffff",
              border: "1px solid #047857",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Aylık Öğrenci × Gün devamsızlık matrisi ve SUBTOTAL(109) toplamları (.xlsx)"
          >
            📅 Aylık Matris Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => void handleExportAttendanceExcel()}
            style={{
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="SUBTOTAL(109) formül enjeksiyonlu resmî Excel günlük yoklama tablosu indir"
          >
            📊 Günlük Yoklama (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => void handlePrintAttendance()}
            style={{
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="A4 formatında yazdır veya PDF olarak kaydet"
          >
            🖨️ A4 Yazdır / PDF
          </button>
        </div>

        {/* E5 Hızlı Özet Şeridi */}
        <div className="qag-summary-bar">
          <div className="qag-summary-stats">
            <span className="qag-badge qag-badge--total">
              {markedCount}/{props.students.length} İşaretlendi
            </span>
            <span className="qag-badge qag-badge--present">
              ✓ {presentCount} Var
            </span>
            <span className="qag-badge qag-badge--absent">
              ✗ {absentCount} Yok
            </span>
            <span className="qag-badge qag-badge--late">
              ⏱ {lateCount} Geç
            </span>
          </div>
          {markedCount < props.students.length && (
            <button
              type="button"
              className="qag-all-present-btn"
              onClick={handleMarkAllUnmarkedPresent}
              disabled={
                props.writesBlocked ||
                props.educationalWritesDisabled ||
                props.persistencePending ||
                props.dataBusy
              }
            >
              Kalanları Geldi Yap
            </button>
          )}
        </div>

        {/* E5 Hızlı Dokunmatik Grid */}
        <div className="qag-grid-container" role="group" aria-label="Yoklama listesi">
          {props.students.map((student) => {
            const isMarked = student.attendanceMarked !== false;
            const currentStatus = isMarked ? student.status : null;
            const disabled =
              props.writesBlocked ||
              props.educationalWritesDisabled ||
              props.persistencePending ||
              props.dataBusy;

            return (
              <div
                key={student.id}
                className="qag-student-card"
                data-status={currentStatus ?? "unmarked"}
              >
                <div className="qag-student-info">
                  {props.renderAvatar(student)}
                  <div className="qag-student-name-block">
                    <span className="qag-student-name">{student.name}</span>
                    {(student.events?.length ?? 0) > 0 && (
                      <small style={{ display: "block", color: "#64748b", fontSize: "0.75rem" }}>
                        {student.events?.length} ayrıntı kaydı
                      </small>
                    )}
                  </div>
                </div>

                <div className="qag-button-group" role="group" aria-label={`${student.name} yoklama`}>
                  <button
                    type="button"
                    className={`qag-touch-btn qag-touch-btn--present ${currentStatus === "present" ? "is-active" : ""}`}
                    onClick={() => props.onToggleStatus(student.id, "present")}
                    disabled={disabled}
                    aria-label={`${student.name} Geldi`}
                    aria-pressed={currentStatus === "present"}
                  >
                    ✓ Var
                  </button>

                  <button
                    type="button"
                    className={`qag-touch-btn qag-touch-btn--absent ${currentStatus === "absent" ? "is-active" : ""}`}
                    onClick={() => props.onToggleStatus(student.id, "absent")}
                    disabled={disabled}
                    aria-label={`${student.name} Gelmedi`}
                    aria-pressed={currentStatus === "absent"}
                  >
                    ✗ Yok
                  </button>

                  <button
                    type="button"
                    className={`qag-touch-btn qag-touch-btn--late ${currentStatus === "late" ? "is-active" : ""}`}
                    onClick={() => props.onToggleStatus(student.id, "late")}
                    disabled={disabled}
                    aria-label={`${student.name} Geç Geldi`}
                    aria-pressed={currentStatus === "late"}
                  >
                    ⏱ Geç
                  </button>

                  <button
                    type="button"
                    className="qag-detail-trigger"
                    onClick={() => {
                      setDraft(initialAttendanceEventDraft());
                      setError("");
                      setDetailStudentId(student.id);
                    }}
                    disabled={disabled}
                    title="Yoklama ayrıntısı ve saat notu ekle"
                    aria-label={`${student.name} için yoklama ayrıntısını aç`}
                  >
                    <ChevronRightIcon aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alt Aksiyon Butonları */}
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {props.canUndo && (
            <button
              className="attendance-undo"
              type="button"
              onClick={props.onUndo}
              disabled={props.writesBlocked || props.persistencePending || props.dataBusy}
            >
              Son değişikliği geri al
            </button>
          )}

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
        </div>
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
