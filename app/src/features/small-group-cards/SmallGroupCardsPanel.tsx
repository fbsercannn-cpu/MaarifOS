import { useEffect, useRef, useState } from "react";
import { KeyboardInput, useKeyboard } from "../../mobile";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { requestPdfDocument } from "../documents/pdf-preview-model.ts";
import { WorkPackageCenter } from "../work-packages/WorkPackageCenter.tsx";
import { createSmallGroupCardsRecipe } from "./small-group-card-document.ts";
import {
  loadSmallGroupCardModel,
  type SmallGroupCardModel,
  type SmallGroupDailyTarget,
} from "./small-group-card-model.ts";
import {
  placeSmallGroupInDailyPlan,
  SMALL_GROUP_CARDS_CHANGED_EVENT,
} from "./small-group-card-service.ts";
import "./small-group-cards.css";

export interface SmallGroupCardsPanelProps {
  readonly store: LocalDataStore;
  readonly civilDate: string;
  readonly refreshKey?: string | number;
  readonly disabled?: boolean;
  readonly disabledReason?: string | null;
  readonly onChanged?: () => void;
  readonly onOpenPlan?: (planId: string) => void;
}

function targetLabel(target: SmallGroupDailyTarget): string {
  return `${target.civilDate} · ${target.startTime ?? "Saat belirtilmedi"} · ${target.activityTitle}`;
}

function initialGroup(target: SmallGroupDailyTarget | undefined): string[] {
  return target?.assignmentMode === "selected-students" && target.currentStudentIds.length <= 8
    ? [...target.currentStudentIds]
    : [];
}

export function SmallGroupCardsPanel({
  store,
  civilDate,
  refreshKey,
  disabled = false,
  disabledReason,
  onChanged,
  onOpenPlan,
}: SmallGroupCardsPanelProps) {
  const [day, setDay] = useState(civilDate);
  const [model, setModel] = useState<SmallGroupCardModel | null>(null);
  const [targetId, setTargetId] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestVersion = useRef(0);
  const writeGuard = useRef(false);
  const keyboard = useKeyboard();

  useEffect(() => setDay(civilDate), [civilDate]);

  async function read(options: { keepSelection?: boolean } = {}) {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const next = await loadSmallGroupCardModel(store, { civilDate: day });
      if (version !== requestVersion.current) return;
      setModel(next);
      setTargetId((previous) => {
        const selected = next.targets.find((target) => target.planId === previous)
          ?? next.targets.find((target) => target.civilDate === day && target.available)
          ?? next.targets.find((target) => target.civilDate === day)
          ?? next.targets.find((target) => target.available)
          ?? next.targets[0];
        if (!options.keepSelection) setStudentIds(initialGroup(selected));
        return selected?.planId ?? "";
      });
      setCardIds((previous) => {
        const available = new Set(next.printableCards.map((card) => card.planId));
        const preserved = previous.filter((id) => available.has(id)).slice(0, 6);
        return preserved.length ? preserved : next.printableCards.slice(0, 6).map((card) => card.planId);
      });
      setError("");
    } catch (cause) {
      if (version === requestVersion.current) {
        setModel(null);
        setError(cause instanceof Error ? cause.message : "Küçük grup kartı kaynakları okunamadı.");
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    void read();
    return () => { requestVersion.current++; };
  }, [store, day, refreshKey]);

  useEffect(() => {
    const changed = () => void read({ keepSelection: true });
    window.addEventListener(SMALL_GROUP_CARDS_CHANGED_EVENT, changed);
    return () => window.removeEventListener(SMALL_GROUP_CARDS_CHANGED_EVENT, changed);
  }, [store, day]);

  const target = model?.targets.find((candidate) => candidate.planId === targetId);
  const exactDatePlan = model?.targets.some((candidate) => candidate.civilDate === day) ?? false;
  const writeDisabled = disabled || loading || busy !== null;
  const eligible = new Set(target?.eligibleStudentIds ?? []);
  const selectedNames = model?.students.filter((student) => studentIds.includes(student.id)).map((student) => student.label) ?? [];
  const currentAssignment = target?.assignmentMode === "whole-class"
    ? `Tüm sınıf (${target.currentStudentIds.length} çocuk)`
    : `${target?.currentStudentIds.length ?? 0} seçili çocuk`;

  function chooseTarget(planId: string) {
    const next = model?.targets.find((candidate) => candidate.planId === planId);
    setTargetId(planId);
    setStudentIds(initialGroup(next));
    setError("");
    setMessage("");
  }

  function toggleStudent(studentId: string, checked: boolean) {
    setStudentIds((previous) => checked
      ? previous.includes(studentId) ? previous : [...previous, studentId]
      : previous.filter((id) => id !== studentId));
    setMessage("");
  }

  async function save() {
    if (!target || writeDisabled || writeGuard.current) return;
    writeGuard.current = true;
    keyboard.hide();
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const result = await placeSmallGroupInDailyPlan(store, {
        civilDate: day,
        planId: target.planId,
        activityId: target.activityId,
        studentIds,
        expectedPlanUpdatedAt: target.planUpdatedAt,
        expectedActivityUpdatedAt: target.activityUpdatedAt,
        expectedSourceFingerprint: target.sourceFingerprint,
      });
      setMessage(result.changed
        ? `${selectedNames.join(", ")} küçük grubu günlük plana yerleştirildi. Plan uygulanmış veya gözlenmiş sayılmadı.`
        : "Bu küçük grup günlük planda zaten kayıtlı; ikinci bir yazım yapılmadı.");
      await read({ keepSelection: true });
      onChanged?.();
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : "Küçük grup günlük plana yerleştirilemedi.";
      await read({ keepSelection: true });
      setError(failureMessage);
    } finally {
      writeGuard.current = false;
      setBusy(null);
    }
  }

  async function previewPdf() {
    if (!cardIds.length || busy || writeGuard.current) return;
    writeGuard.current = true;
    keyboard.hide();
    setBusy("pdf");
    setError("");
    try {
      await requestPdfDocument(await createSmallGroupCardsRecipe(store, { planIds: cardIds }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Küçük grup kartı PDF önizlemesi hazırlanamadı.");
    } finally {
      writeGuard.current = false;
      setBusy(null);
    }
  }

  return <section className="small-group-cards" aria-label="Küçük grup kartları" aria-busy={loading || busy !== null}>
    <header>
      <h3>Küçük grup kartları</h3>
      <p>Kayıtlı günlük planın tek gerçek etkinliğine 2–8 çocuk yerleştirin. Etkinlik ve varsa materyal kaynağı değişmez; uygulama veya gözlem kaydı oluşmaz.</p>
    </header>
    <label className="small-group-cards__date">Küçük grup planı günü
      <KeyboardInput type="date" aria-label="Küçük grup planı günü" value={day} disabled={busy !== null} onChange={(event) => { keyboard.hide(); setDay(event.target.value); setMessage(""); }} />
    </label>
    {model && <p className="small-group-cards__context">{model.classroomName} · {model.weekStart}–{model.weekEnd}</p>}
    {disabled && disabledReason && <p role="status" className="small-group-cards__warning">{disabledReason}</p>}
    {error && <div role="alert" className="small-group-cards__error"><p>{error}</p><button type="button" disabled={busy !== null} onClick={() => void read()}>Kaynakları yenile</button></div>}
    {message && <p role="status" className="small-group-cards__success">{message}</p>}
    {loading && !model && <p role="status">Haftanın günlük planları okunuyor…</p>}
    {model && <>
      {model.targets.length > 0 ? <fieldset disabled={writeDisabled}>
        <legend>Günlük plan ve küçük grup</legend>
        <label>Haftanın günlük planı
          <select aria-label="Haftanın günlük planı" value={targetId} onChange={(event) => chooseTarget(event.target.value)}>
            {model.targets.map((candidate) => <option key={candidate.planId} value={candidate.planId}>{targetLabel(candidate)}{candidate.available ? "" : " · kullanılamıyor"}</option>)}
          </select>
        </label>
        {target && <article className={target.available ? "small-group-cards__target" : "small-group-cards__target is-blocked"}>
          <h4>{target.activityTitle}</h4>
          <p><strong>Gerçek materyaller:</strong> {target.materials.length ? target.materials.join(" · ") : "Kayıtlı planda materyal belirtilmemiş; kartta doldurulacak boş alan bırakılır."}</p>
          {target.materialSourceLabels.length > 0 && <small>Kaynak: {target.materialSourceLabels.join(" · ")}</small>}
          {target.blockReason && <p className="small-group-cards__warning">{target.blockReason}</p>}
          <p className="small-group-cards__change"><strong>Atama değişikliği:</strong> {currentAssignment}, aşağıda açıkça seçtiğiniz {studentIds.length} çocukla değiştirilecek.</p>
          <div className="small-group-cards__students" role="group" aria-label="Küçük grup öğrencileri">
            {model.students.map((student) => {
              const allowed = eligible.has(student.id);
              const recommended = target.recommendedStudentIds.includes(student.id);
              return <label key={student.id} className={recommended ? "is-recommended" : ""}>
                <input type="checkbox" aria-label={`${student.label} küçük gruba seç`} checked={studentIds.includes(student.id)} disabled={!target.available || !allowed || writeDisabled} onChange={(event) => toggleStudent(student.id, event.target.checked)} />
                <span><strong>{student.label}</strong>{recommended && <small>Kayıtlı küçük grup destek kararı var</small>}{!allowed && <small>Bu plan gününde sınıfa kayıtlı değil</small>}</span>
              </label>;
            })}
          </div>
          <button type="button" className="small-group-cards__primary" disabled={!target.available || studentIds.length < 2 || studentIds.length > 8 || writeDisabled} onClick={() => void save()}>{busy === "save" ? "Grup yerleştiriliyor…" : "Seçili grubu günlük plana yerleştir"}</button>
          {onOpenPlan && <button type="button" disabled={busy !== null} onClick={() => onOpenPlan(target.planId)}>Günlük planı aç</button>}
        </article>}
      </fieldset> : <p className="small-group-cards__warning">Bu haftada kayıtlı günlük plan bulunamadı.</p>}
      {!exactDatePlan && <div className="small-group-cards__prerequisite">
        <h4>{day} için günlük planı hazırla</h4>
        <p>Küçük grup, bağımsız veya bağsız bir kayıt olarak oluşturulmaz. Önce bu güne ait gerçek günlük plan ve etkinlik zincirini tamamlayın.</p>
        <WorkPackageCenter store={store} refreshKey={String(refreshKey ?? "small-group")} disabled={disabled} civilDate={day} mode="planning" onChanged={() => { void read(); onChanged?.(); }} onOpenPlans={onOpenPlan} />
      </div>}
      {model.printableCards.length > 0 && <fieldset className="small-group-cards__print" disabled={busy !== null}>
        <legend>Kesilecek kartları seçin</legend>
        <p>Bir A4 sayfasına en çok 6 kayıtlı grup kartı yerleşir.</p>
        {model.printableCards.map((card) => <label key={card.planId}><input type="checkbox" aria-label={`${card.civilDate} ${card.activityTitle} kartını seç`} checked={cardIds.includes(card.planId)} disabled={!cardIds.includes(card.planId) && cardIds.length >= 6} onChange={(event) => setCardIds((previous) => event.target.checked ? [...previous, card.planId].slice(0, 6) : previous.filter((id) => id !== card.planId))} /><span><strong>{card.civilDate} · {card.activityTitle}</strong><small>{card.studentNames.join(", ")}</small></span></label>)}
        <button type="button" className="small-group-cards__primary" disabled={!cardIds.length || busy !== null} onClick={() => void previewPdf()}>{busy === "pdf" ? "PDF hazırlanıyor…" : "Seçili kartları A4 PDF önizle"}</button>
      </fieldset>}
    </>}
  </section>;
}
