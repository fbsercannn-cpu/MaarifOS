import { useEffect, useRef, useState } from "react";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { requestPdfDocument } from "../documents/pdf-preview-model.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../teacher-followup/teacher-followup-service.ts";
import { WorkPackageCenter } from "../work-packages/WorkPackageCenter.tsx";
import { createDayExitPackageRecipe } from "./day-exit-package-document.ts";
import { loadDayExitPackageModel, type DayExitPackageModel } from "./day-exit-package-model.ts";
import { saveDayExitPreparation } from "./day-exit-package-service.ts";
import "./day-exit-package.css";

export interface DayExitPackagePanelProps {
  readonly store: LocalDataStore;
  readonly civilDate?: string;
  readonly refreshKey?: string | number;
  readonly disabled?: boolean;
  readonly disabledReason?: string | null;
  readonly onChanged?: () => void;
  readonly onOpenAttendance?: () => void;
  readonly onOpenPickup?: (studentId: string, civilDate: string) => void;
  readonly onOpenPlan?: (planId: string) => void;
  readonly onPlanDate?: (civilDate: string) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dateLabel = (value: string) => DATE_FORMAT.format(new Date(`${value}T12:00:00.000Z`));
const timeLabel = (value: string) => new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
}).format(new Date(value));
const attendanceLabel = (value: "present" | "late" | "absent" | null) =>
  value === "present" ? "Geldi" : value === "late" ? "Geç geldi" : value === "absent" ? "Gelmedi" : "Yoklama eksik";

export function DayExitPackagePanel({
  store,
  civilDate,
  refreshKey,
  disabled = false,
  disabledReason,
  onChanged,
  onOpenAttendance,
  onOpenPickup,
  onOpenPlan,
  onPlanDate,
}: DayExitPackagePanelProps) {
  const day = civilDate ?? civilDateInIstanbul(new Date());
  const [model, setModel] = useState<DayExitPackageModel | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [planningDay, setPlanningDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const lock = useRef(false);

  async function read(options: { preserveSelection?: boolean; preserveMessage?: boolean } = {}) {
    const version = ++generation.current;
    setLoading(true);
    try {
      const next = await loadDayExitPackageModel(store, { civilDate: day });
      if (generation.current !== version) return;
      setModel(next);
      if (next.nextDay && next.nextDay.plans.length === 0) setPlanningDay(next.nextDay.civilDate);
      setSelectedSourceIds((previous) => {
        const candidates = next.nextDay?.sources.filter((source) => source.available && !source.alreadySaved) ?? [];
        if (!options.preserveSelection) return candidates.map((source) => source.id);
        const allowed = new Set(candidates.map((source) => source.id));
        return previous.filter((id) => allowed.has(id));
      });
      setError("");
      if (!options.preserveMessage) setMessage("");
    } catch (cause) {
      if (generation.current === version) {
        setModel(null);
        setError(cause instanceof Error ? cause.message : "Günün çıkış paketi okunamadı.");
      }
    } finally {
      if (generation.current === version) setLoading(false);
    }
  }

  useEffect(() => {
    setPlanningDay(null);
    void read();
    return () => { generation.current += 1; };
  }, [store, day, refreshKey]);

  useEffect(() => {
    const changed = () => void read({ preserveSelection: true, preserveMessage: true });
    window.addEventListener(FOLLOWUP_CHANGED_EVENT, changed);
    return () => window.removeEventListener(FOLLOWUP_CHANGED_EVENT, changed);
  }, [store, day]);

  async function savePreparation() {
    if (!model?.nextDay || disabled || busy || lock.current || !selectedSourceIds.length) return;
    lock.current = true;
    setBusy("save");
    setError("");
    setMessage("");
    let committed = false;
    try {
      const result = await saveDayExitPreparation(store, {
        civilDate: model.civilDate,
        sourceIds: selectedSourceIds,
        expectedSourceFingerprint: model.nextDay.sourceFingerprint,
      });
      committed = true;
      setMessage(result.changed
        ? `${result.itemCount} gerçek materyal/hazırlık maddesi ${dateLabel(result.nextTeachingDate)} için kaydedildi.`
        : "Seçilen hazırlık kaynakları zaten kayıtlı; ikinci bir liste oluşturulmadı.");
      await read({ preserveSelection: true, preserveMessage: true });
      onChanged?.();
    } catch (cause) {
      const failure = committed
        ? "Hazırlık kaydedildi; ekranın güncel durumu yeniden okunamadı. Güncel kayıtları yeniden okuyun."
        : cause instanceof Error ? cause.message : "Sonraki öğretim günü hazırlığı kaydedilemedi.";
      await read({ preserveSelection: true, preserveMessage: true });
      setError(failure);
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  async function previewPdf() {
    if (!model || disabled || busy || lock.current) return;
    lock.current = true;
    setBusy("pdf");
    setError("");
    try {
      await requestPdfDocument(await createDayExitPackageRecipe(store, { civilDate: model.civilDate }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Günün çıkış paketi PDF önizlemesi hazırlanamadı.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  const writeAllowed = model?.civilDate === model?.today;
  return <section className="day-exit-package" aria-label="Günün çıkış paketi" aria-busy={loading || busy !== null}>
    <header>
      <span>GÜN SONU KONTROLÜ</span>
      <h2>Günün çıkış paketi</h2>
      <p>Gerçek yoklama ve düzeltilmiş teslim kayıtlarını kontrol edin; sonraki öğretim gününün kayıtlı plan kaynaklarından hazırlığı tek işlemle kaydedin.</p>
    </header>
    {disabled && disabledReason && <p className="day-exit-package__warning" role="status">{disabledReason}</p>}
    {loading && !model && <p role="status">Günün kayıtları okunuyor…</p>}
    {error && <div className="day-exit-package__error" role="alert"><p>{error}</p><button type="button" disabled={busy !== null} onClick={() => void read({ preserveSelection: true, preserveMessage: true })}>Güncel kayıtları yeniden oku</button></div>}
    {message && <p className="day-exit-package__success" role="status">{message}</p>}
    {model && <>
      <p className="day-exit-package__context"><strong>{dateLabel(model.civilDate)}</strong> · {model.schoolName} · {model.classroomName}</p>
      <div className="day-exit-package__summary" aria-label="Gün sonu özeti">
        <article><strong>{model.attendance.recordedCount}/{model.attendance.rows.length}</strong><span>Yoklama kayıtlı</span></article>
        <article><strong>{model.pickups.completedCount}</strong><span>Gerçek teslim kayıtlı</span></article>
        <article><strong>{model.pickups.missingCount}</strong><span>Teslim kaydı eksik</span></article>
      </div>
      <section className="day-exit-package__card" aria-labelledby="day-exit-attendance">
        <h3 id="day-exit-attendance">Bugünün yoklama ve teslim kontrolü</h3>
        {!model.attendance.schoolDay.isTeachingDay && <p className="day-exit-package__warning">Bu tarih okul takviminde öğretim günü değil.</p>}
        {model.pickups.rows.length ? <ul className="day-exit-package__students">{model.pickups.rows.map((row) => <li key={row.studentId}>
          <div><strong>{row.studentName}</strong><span>{attendanceLabel(row.attendanceStatus)}</span></div>
          <div>{row.delivery
            ? <span className="is-complete">Teslim: {timeLabel(row.delivery.handedOverAt)} · {row.delivery.contactName}</span>
            : <span className={row.state === "missing" ? "is-missing" : ""}>{row.state === "not-required" ? "Devamsız; teslim gerekmiyor" : row.state === "attendance-missing" ? "Yoklama tamamlanmadan teslim beklenmiyor" : row.correctionCount ? "Önceki teslim düzeltildi; geçerli teslim eksik" : "Gerçek teslim kaydı eksik"}</span>}
            {row.state === "missing" && writeAllowed && onOpenPickup && <button type="button" disabled={disabled || busy !== null} onClick={() => onOpenPickup(row.studentId, model.civilDate)}>Gerçek teslimi kaydet</button>}
            {row.state === "missing" && !writeAllowed && onOpenPickup && <button type="button" disabled={disabled || busy !== null} onClick={() => onOpenPickup(row.studentId, model.today)}>Bugünün teslimini aç</button>}
          </div>
        </li>)}</ul> : <p>Bu gün için yoklama kapsamına giren çocuk bulunmuyor.</p>}
        {model.attendance.missingCount > 0 && onOpenAttendance && <button type="button" disabled={disabled || busy !== null} onClick={onOpenAttendance}>Bugünün yoklamasını aç</button>}
        {!writeAllowed && <p className="day-exit-package__note">Geçmiş gün kayıtları salt okunur. Yeni gerçek teslim yalnız bugünün teslim alanından kaydedilir.</p>}
      </section>
      <section className="day-exit-package__card" aria-labelledby="day-exit-next-day">
        <h3 id="day-exit-next-day">Sonraki öğretim günü hazırlığı</h3>
        {model.nextDay ? <>
          <p><strong>{dateLabel(model.nextDay.civilDate)}</strong> · gerçek plan ve etkinlik kaynakları</p>
          {model.nextDay.plans.length ? <ul className="day-exit-package__plans">{model.nextDay.plans.map((plan) => <li key={plan.id}><span>{plan.title}</span>{onOpenPlan && <button type="button" disabled={busy !== null} onClick={() => onOpenPlan(plan.id)}>Planı aç</button>}</li>)}</ul> : <p className="day-exit-package__warning">Bu gün için kayıtlı günlük plan yok. Aşağıdaki hazır seçenek gerçek plan zincirini oluşturur.</p>}
          {(model.nextDay.plans.length === 0 || planningDay === model.nextDay.civilDate) && <div className="day-exit-package__planning">
            {model.nextDay.plans.length > 0 && <p className="day-exit-package__note">Az önce oluşturulan plan paketini burada gözden geçirebilir veya güvenli geri alma seçeneğini kullanabilirsiniz.</p>}
            <WorkPackageCenter store={store} civilDate={model.nextDay.civilDate} mode="planning" refreshKey={`${String(refreshKey ?? "day-exit")}:${model.nextDay.civilDate}`} disabled={disabled} onChanged={() => { void read({ preserveMessage: true }); onChanged?.(); }} onOpenPlans={onOpenPlan} />
            {onPlanDate && <button type="button" disabled={disabled || busy !== null} onClick={() => onPlanDate(model.nextDay!.civilDate)}>Günün plan hazırlığını aç</button>}
          </div>}
          {model.nextDay.sources.length ? <fieldset disabled={disabled || busy !== null || !writeAllowed}>
            <legend>Hazırlığa alınacak gerçek kaynaklar</legend>
            {model.nextDay.sources.map((source) => <label className="day-exit-package__source" key={`${source.collection}:${source.id}`}>
              <input type="checkbox" checked={selectedSourceIds.includes(source.id)} disabled={!source.available || source.alreadySaved} onChange={(event) => setSelectedSourceIds((previous) => event.target.checked ? [...previous, source.id] : previous.filter((id) => id !== source.id))} />
              <span><strong>{source.title}</strong><small>{source.collection === "plans" ? "Plan" : "Etkinlik"} · {source.materials.length} materyal · {source.preparation.length} ön hazırlık</small><small>{source.alreadySaved ? "Hazırlık listesinde kayıtlı" : source.available ? "Seçilebilir" : "Kaynakta materyal veya ön hazırlık belirtilmemiş"}</small></span>
            </label>)}
            <button className="day-exit-package__primary" type="button" disabled={!selectedSourceIds.length || disabled || busy !== null || !writeAllowed} onClick={() => void savePreparation()}>{busy === "save" ? "Hazırlık kaydediliyor…" : "Seçili sonraki gün hazırlığını kaydet"}</button>
          </fieldset> : <p>Sonraki gün için hazırlık kaynağı henüz bulunmuyor.</p>}
        </> : <p>Eğitim yılı içinde sonraki bir öğretim günü bulunamadı.</p>}
      </section>
      <button className="day-exit-package__pdf" type="button" disabled={disabled || busy !== null} onClick={() => void previewPdf()}>{busy === "pdf" ? "PDF hazırlanıyor…" : "Günün çıkış paketini A4 PDF önizle"}</button>
    </>}
  </section>;
}
