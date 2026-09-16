import { useEffect, useRef, useState } from "react";
import { KeyboardInput } from "../../mobile";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { recordBelongsToClassroomScope, resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { buildMonthlyWallCalendarModel, type MonthlyWallCalendarModel } from "../planning/calendar-print-model.ts";
import { createMonthRecipe, createWeekRecipe } from "../planning/planning-calendar-pdf.ts";
import { createStudentSummaryRecipe } from "../student-summary/student-summary-document.ts";
import { WorkPackageCenter } from "../work-packages/WorkPackageCenter.tsx";
import { PlanNextSteps } from "../planning/PlanNextSteps.tsx";
import { requestPdfDocument, type PdfPreviewRecipe } from "./pdf-preview-model.ts";
import { OfficialFormsWorkspace } from "../official-forms/OfficialFormsWorkspace.tsx";
import "./desk-document-center.css";

interface Props {
  store: LocalDataStore;
  refreshKey: string | number;
  disabled: boolean;
  onChanged: () => void;
  onOpenPlan: (id: string) => void;
  onOpenDate: (date: string) => void;
  onPlanDate: (date: string) => void;
}

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );

export function DeskDocumentCenter({
  store,
  refreshKey,
  disabled,
  onChanged,
  onOpenPlan,
  onOpenDate,
  onPlanDate,
}: Props) {
  const today = civilDateInIstanbul(new Date());
  const [weekDate, setWeekDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [model, setModel] = useState<MonthlyWallCalendarModel | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [studentId, setStudentId] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [officialFormsOpen, setOfficialFormsOpen] = useState(false);
  const generation = useRef(0);
  const lock = useRef(false);
  const blocked = useRef(disabled);
  blocked.current = disabled;

  useEffect(() => {
    const version = ++generation.current;
    setModel((previous) => (previous?.monthKey === month ? previous : null));
    setMessage("");
    void store
      .readSnapshot()
      .then((snapshot) => {
        if (version !== generation.current) return;
        setModel(buildMonthlyWallCalendarModel(snapshot, { monthKey: month }));
        const scope = resolveActiveClassroomScope(snapshot);
        const roster = scope
          ? snapshot.students
              .filter(
                (student) =>
                  !student.deletedAt &&
                  student.active !== false &&
                  recordBelongsToClassroomScope(student, scope),
              )
              .map((student) => ({ id: student.id, name: String(student.displayName) }))
              .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"))
          : [];
        setStudents(roster);
        setStudentId((previous) =>
          roster.some((student) => student.id === previous)
            ? previous
            : roster[0]?.id ?? "",
        );
      })
      .catch((cause) => {
        if (version === generation.current)
          setMessage(
            cause instanceof Error ? cause.message : "Masa belgeleri hazırlanamadı.",
          );
      });
    return () => {
      ++generation.current;
    };
  }, [store, month, refreshKey, reload]);

  async function prepare(factory: () => Promise<PdfPreviewRecipe>) {
    if (blocked.current || lock.current) return;
    const version = generation.current;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const recipe = await factory();
      if (version !== generation.current || blocked.current) return;
      await requestPdfDocument(recipe);
    } catch (cause) {
      if (version === generation.current)
        setMessage(cause instanceof Error ? cause.message : "Belge hazırlanamadı.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const day = model?.days.find((item) => item.civilDate === selectedDate);

  return (
    <section className="desk-documents" aria-label="Öğretmenin masa belgeleri">
      <h2>Masa belgeleri ve aylık takvim</h2>
      <p>
        Kayıtlı planlar ve öğrenci bilgileri doğrudan yerleşir. Boş öğretim gününü seçin,
        hazır etkinliği yerleştirerek ilerleyin.
      </p>

      {/* MEB TTKB Resmî Formları Barı */}
      <div
        style={{
          margin: "12px 0 16px 0",
          padding: "12px 16px",
          background: "#fff7ed",
          borderRadius: "10px",
          border: "1.5px solid #fdba74",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <strong style={{ display: "block", color: "#9a3412", fontSize: "0.95rem" }}>
            T.C. MEB TTKB Resmî Matbu Formlar (26 Enstrümanlı Külliyat)
          </strong>
          <small style={{ color: "#c2410c" }}>
            EK-1..EK-15, Beceri Edinim, Karne, Portfolyo, Veli Toplantısı, Dijital Taahhütname · A4 &amp; Word (.doc)
          </small>
        </div>
        <button
          type="button"
          style={{
            background: "#ea580c",
            color: "#ffffff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => setOfficialFormsOpen(true)}
        >
          🖨️ Resmî Formlar Merkezini Aç
        </button>
      </div>

      <div className="desk-document-controls">
        <div>
          <label>
            Haftanın bir günü
            <KeyboardInput
              type="date"
              value={weekDate}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value) setWeekDate(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() =>
              void prepare(() => createWeekRecipe(store, { civilDate: weekDate }))
            }
          >
            Haftalık masa planını hazırla
          </button>
        </div>
        <div>
          <label>
            Takvim ayı
            <KeyboardInput
              type="month"
              value={month}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value) {
                  setMonth(event.target.value);
                  setSelectedDate(`${event.target.value}-01`);
                }
              }}
            />
          </label>
          <button
            type="button"
            disabled={disabled || busy || !model}
            onClick={() =>
              void prepare(() => createMonthRecipe(store, { monthKey: month }))
            }
          >
            Aylık duvar takvimini hazırla
          </button>
        </div>
        <div>
          <label>
            Öğrenci özeti
            <select
              value={studentId}
              disabled={busy || !students.length}
              onChange={(event) => setStudentId(event.target.value)}
            >
              {!students.length && <option value="">Sınıfta öğrenci yok</option>}
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={disabled || busy || !studentId}
            onClick={() =>
              void prepare(async () => {
                const scope = resolveActiveClassroomScope(await store.readSnapshot());
                if (!scope) throw new Error("Öğrenci özeti için sınıfı açın.");
                return createStudentSummaryRecipe(store, { scope, studentId });
              })
            }
          >
            Öğrencinin özetini hazırla
          </button>
        </div>
      </div>
      {message && <p role="alert">{message}</p>}
      {busy && <p role="status">Belge hazırlanıyor…</p>}
      {!model && !message && <p role="status">Takvim okunuyor…</p>}
      {model && (
        <>
          <div className="desk-month-grid" aria-label={`${month} sınıf takvimi`}>
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((label) => (
              <span className="desk-weekday" key={label}>
                {label}
              </span>
            ))}
            {model.days
              .filter((item) => item.inMonth)
              .map((item, index) => (
                <button
                  type="button"
                  key={item.civilDate}
                  aria-pressed={item.civilDate === selectedDate}
                  aria-label={`${dateLabel(item.civilDate)} · ${
                    item.items.length
                      ? `${item.items.length} kayıt`
                      : item.isTeachingDay
                        ? "Etkinlik yerleştir"
                        : "Öğretim günü değil"
                  }`}
                  className={item.isTeachingDay ? "" : "desk-day-closed"}
                  style={index === 0 ? { gridColumnStart: item.dayOfWeek } : undefined}
                  onClick={() => setSelectedDate(item.civilDate)}
                >
                  <strong>{Number(item.civilDate.slice(-2))}</strong>
                  <span>
                    {item.items.length
                      ? `${item.items.length} kayıt`
                      : item.isTeachingDay
                        ? "+ Ekle"
                        : "—"}
                  </span>
                </button>
              ))}
          </div>
          {day && (
            <section className="desk-selected-day" aria-label="Seçilen gün">
              <h3>{dateLabel(day.civilDate)}</h3>
              {day.items.length > 0 ? (
                <ul>
                  {day.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.title}</span>
                      {item.planId && (
                        <button type="button" onClick={() => onOpenPlan(item.planId!)}>
                          Planı aç
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {day.isTeachingDay
                    ? "Bu güne henüz plan veya etkinlik yerleştirilmedi."
                    : "Bu tarih öğretim günü değil."}
                </p>
              )}
              {day.isTeachingDay && (
                <WorkPackageCenter
                  key={day.civilDate}
                  store={store}
                  civilDate={day.civilDate}
                  mode="planning"
                  refreshKey={`${refreshKey}:${reload}`}
                  disabled={disabled}
                  onChanged={() => {
                    setReload((value) => value + 1);
                    onChanged();
                  }}
                  onOpenPlans={onOpenPlan}
                />
              )}
              {day.isTeachingDay &&
                day.items.some((item) => item.kind === "daily-plan") && (
                  <PlanNextSteps
                    key={`links:${day.civilDate}`}
                    store={store}
                    civilDate={day.civilDate}
                    requestedLevel="daily"
                    density="compact"
                    refreshKey={`${refreshKey}:${reload}`}
                    disabled={disabled}
                    onChanged={() => {
                      setReload((value) => value + 1);
                      onChanged();
                    }}
                    onOpenPlan={(target) => onOpenPlan(target.planId)}
                  />
                )}
              <div className="desk-day-actions">
                {day.isTeachingDay && !day.items.some((item) => item.planId) && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPlanDate(day.civilDate)}
                  >
                    Bu günün planını tamamla
                  </button>
                )}
                <button type="button" onClick={() => onOpenDate(day.civilDate)}>
                  Günün takvimini aç
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {officialFormsOpen && (
        <OfficialFormsWorkspace onClose={() => setOfficialFormsOpen(false)} />
      )}
    </section>
  );
}
