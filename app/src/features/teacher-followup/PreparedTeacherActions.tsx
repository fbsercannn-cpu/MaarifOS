import { useEffect, useRef, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { applyPreparedTeacherAction, loadPreparedTeacherActions, type PreparedTeacherMode, type PreparedTeacherModel, type PreparedTeacherOption, type PreparedTeacherResult } from "./prepared-teacher-actions.ts";
import "./prepared-teacher-actions.css";

export interface PreparedTeacherActionsProps {
  store: LocalDataStore; refreshKey: string | number; disabled?: boolean; studentId?: string; mode?: PreparedTeacherMode;
  onChanged: () => unknown | Promise<unknown>; onOpenPlan?: (planId: string) => void;
  onOpenObservation?: (studentId: string, activityId: string) => void;
  onOpenFamily?: (appointmentId: string) => void;
  onPrepareInvitation?: (appointmentId: string, scheduledOn: string) => void;
}
export function PreparedTeacherActions({ store, refreshKey, disabled = false, studentId, mode = "all", onChanged, onOpenPlan, onOpenObservation, onOpenFamily, onPrepareInvitation }: PreparedTeacherActionsProps) {
  const [model, setModel] = useState<PreparedTeacherModel | null>(null), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [result, setResult] = useState<PreparedTeacherResult | null>(null), [revision, setRevision] = useState(0), [selected, setSelected] = useState<Record<string,string[]>>({});
  const readVersion = useRef(0), scopeVersion = useRef(0), locked = useRef(false);
  useEffect(() => { scopeVersion.current++; setResult(null); setSelected({}); return () => { scopeVersion.current++; }; }, [store, studentId, mode]);
  useEffect(() => {
    const version = ++readVersion.current; setLoading(true); setModel(null);
    void loadPreparedTeacherActions(store, { ...(studentId ? { studentId } : {}), mode }).then(value => { if (version !== readVersion.current) return; setModel(value); setError(""); setSelected(Object.fromEntries(value.cards.filter(c => c.students).map(c => [c.id, c.students!.slice(0, 3).map(s => s.id)]))); setLoading(false); }).catch(() => { if (version === readVersion.current) { setLoading(false); setError("Hazır adımlar okunamadı. Son kayıtları görmek için yeniden yükleyin."); } });
    return () => { readVersion.current++; };
  }, [store, refreshKey, studentId, mode, revision]);
  const apply = async (option: PreparedTeacherOption, cardId: string) => {
    if (disabled || locked.current || loading || !model) return;
    locked.current = true; setBusy(true); setError(""); setResult(null); const scope = scopeVersion.current;
    const request = option.request.kind === "focus" ? { ...option.request, studentIds: selected[cardId] ?? [] } : option.request;
    let committed = false;
    try {
      const receipt = await applyPreparedTeacherAction(store, { request, expectedFingerprint: model.fingerprint }); committed = true;
      if (scope === scopeVersion.current) { setResult(receipt); setLoading(true); setModel(null); }
      try { await onChanged(); } catch { if (scope === scopeVersion.current) setError("Adım kaydedildi; üst görünüm henüz yenilenemedi."); }
    } catch (cause) { if (scope === scopeVersion.current) setError(cause instanceof Error ? cause.message : "Adım kaydedilemedi. Yeniden deneyin."); }
    finally { locked.current = false; setBusy(false); if (scope === scopeVersion.current && committed) setRevision(r => r + 1); }
  };
  const blocked = disabled || busy || loading;
  return <section className="prepared-teacher-actions" aria-label="Hazır öğretmen adımları">
    <header><h3>Hazır öğretmen adımları</h3><p>Yapılacak işi ve gerçek kaynaklarını inceleyin; seçtiğiniz adım kaydedilir.</p></header>
    {loading && <p role="status">Hazır adımlar yükleniyor…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => setRevision(r => r + 1)}>Güncel adımları yeniden yükle</button></div>}
    {result && <div className="prepared-teacher-result" role="status"><strong>{result.summary}</strong><div className="prepared-teacher-buttons">
      {result.planId && onOpenPlan && <button type="button" onClick={() => onOpenPlan(result.planId!)}>Kaydedilen planı aç</button>}
      {result.appointmentId && onOpenFamily && <button type="button" onClick={() => onOpenFamily(result.appointmentId!)}>Kaydedilen görüşmeyi aç</button>}
      {result.appointmentId && result.scheduledOn && onPrepareInvitation && <button type="button" onClick={() => onPrepareInvitation(result.appointmentId!, result.scheduledOn!)}>Bu veliye özel daveti hazırla</button>}
    </div></div>}
    {model && model.focuses.length > 0 && <details open><summary>Bugün plana kaydedilen gözlem odakları · {model.focuses.length}</summary>{model.focuses.map(focus => <div key={`${focus.activityId}:${focus.studentId}`} className="prepared-teacher-saved-focus"><p><strong>{focus.studentName}</strong> · {focus.activityTitle}</p>{onOpenObservation && <button type="button" disabled={disabled} onClick={() => onOpenObservation(focus.studentId, focus.activityId)}>{focus.studentName} için gerçek gözlem gir</button>}</div>)}</details>}
    {!loading && model && model.cards.length === 0 && model.focuses.length === 0 && <p>Bu kapsamda hazır kaynaklarıyla tamamlanmayı bekleyen adım yok.</p>}
    {model?.cards.map(card => <article key={card.id} data-prepared-kind={card.kind}><h4>{card.title}</h4><p>{card.detail}</p>
      {card.evidence.length > 0 && <details><summary>Gerçek kaynak gözlemler · {card.evidence.length}</summary>{card.evidence.map(e => <blockquote key={e.id}><small>{e.date}</small><p>{e.text}</p></blockquote>)}</details>}
      {card.students && <fieldset disabled={blocked}><legend>Gözlem odağına alınacak çocuklar · en çok 3</legend>{card.students.map(s => <label key={s.id}><input type="checkbox" checked={(selected[card.id] ?? []).includes(s.id)} disabled={!(selected[card.id] ?? []).includes(s.id) && (selected[card.id] ?? []).length >= 3} onChange={e => setSelected(previous => ({ ...previous, [card.id]: e.target.checked ? [...(previous[card.id] ?? []), s.id] : (previous[card.id] ?? []).filter(id => id !== s.id) }))} /><span>{s.name}<small>Son 14 günde {s.count} gözlem</small></span></label>)}</fieldset>}
      <div className="prepared-teacher-options">{card.options.map(option => <div key={option.id}><p>{option.detail}</p><button type="button" disabled={blocked || (option.request.kind === "focus" && !(selected[card.id] ?? []).length)} onClick={() => void apply(option, card.id)}>{option.label}</button></div>)}</div>
    </article>)}
  </section>;
}
