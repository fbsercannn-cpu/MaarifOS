import { useEffect, useMemo, useRef, useState } from "react";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../teacher-followup/teacher-followup-service.ts";
import { actionCenterModel } from "./action-center-model.ts";
import { assignObservationCategory, completePreparedItem, createPreparedChecklist, executeObservationSupport } from "./action-center-service.ts";
import { ACTION_CENTER_COPY as copy } from "./action-center-copy.ts";
import "./action-center.css";
import { ObservationMetadataEditor } from "../observation-management/ObservationMetadataEditor.tsx";
import { WorkPackageCenter } from "../work-packages/WorkPackageCenter.tsx";
import { WORK_PACKAGE_COPY } from "../work-packages/work-package-copy.ts";
import { completeTeacherAssessments, preparedTeacherAssessments } from "../evidence/teacher-assessment-completion.ts";
import { KeyboardTextarea } from "../../mobile/Keyboard.tsx";
import { generateObservationOutcomeWithDeepSeek } from "./observation-outcome-ai.ts";
import { observationOutcomeCandidate, saveObservationOutcomePackage, type ObservationOutcomeCandidate } from "./observation-outcome-package.ts";

export interface ActionCenterProps {
  store: LocalDataStore;
  refreshKey: number | string;
  disabled: boolean;
  studentId?: string;
  observationId?: string;
  onChanged: () => void;
  onOpenPlans?: (planId: string) => void;
  onOpenProgramLinks?: (observationId: string) => void;
  onOpenObservation?: (observationId: string) => void;
}

export function ActionCenter({ store, refreshKey, disabled, studentId, observationId, onChanged, onOpenPlans, onOpenProgramLinks, onOpenObservation }: ActionCenterProps) {
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState<string | null>(null);
  const [selectedPreparation, setSelectedPreparation] = useState<string[] | null>(null);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [outcomeDraft, setOutcomeDraft] = useState<ObservationOutcomeCandidate | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const guard = useRef(false);
  const generation = useRef(0);
  const readSequence = useRef(0);

  useEffect(() => {
    const version = ++generation.current;
    const load = () => {
      const read = ++readSequence.current;
      void store.readSnapshot().then(value => { if (generation.current === version && readSequence.current === read) setSnapshot(value); }).catch(() => { if (generation.current === version && readSequence.current === read) setError(copy.error); });
    };
    load();
    window.addEventListener(FOLLOWUP_CHANGED_EVENT, load);
    return () => { generation.current++; window.removeEventListener(FOLLOWUP_CHANGED_EVENT, load); };
  }, [store, refreshKey, studentId, observationId]);
  useEffect(() => { setStatus(""); setError(""); setPlanId(null); setExpanded(false); setSelectedPreparation(null); }, [studentId, observationId]);

  async function run(task: () => Promise<{ alreadyCompleted: boolean; planId?: string }>, message: string) {
    if (disabled || guard.current) return;
    guard.current = true; setBusy(true); setError("");
    const version = generation.current;
    try {
      let result: { alreadyCompleted: boolean; planId?: string };
      try { result = await task(); }
      catch (cause) {
        if (version === generation.current) {
          setError(cause instanceof Error ? cause.message : copy.error);
          const read = ++readSequence.current;
          try { const value = await store.readSnapshot(); if (version === generation.current && readSequence.current === read) setSnapshot(value); } catch { /* Preserve the storage error. */ }
        }
        return;
      }
      if (version === generation.current) {
        setStatus(result.alreadyCompleted ? copy.alreadyDone : message);
        if (result.planId) setPlanId(result.planId);
        const read = ++readSequence.current;
        try { const value = await store.readSnapshot(); if (version === generation.current && readSequence.current === read) setSnapshot(value); }
        catch { if (version === generation.current) setError(copy.refreshPending); }
      }
      onChanged();
    } catch {
      if (version === generation.current) setError(copy.refreshPending);
    } finally { guard.current = false; setBusy(false); }
  }

  const model = useMemo(() => snapshot ? actionCenterModel(snapshot, { studentId, observationId }) : null, [snapshot, studentId, observationId]);
  const outcomeCandidate = useMemo(
    () => snapshot ? observationOutcomeCandidate(snapshot, studentId, observationId) : null,
    [snapshot, studentId, observationId],
  );
  useEffect(() => {
    setOutcomeDraft(outcomeCandidate);
    setAiNotice("");
  }, [outcomeCandidate?.expectedSourceFingerprint]);

  async function improveOutcomeWithDeepSeek() {
    if (!snapshot || !outcomeCandidate || disabled || busy || aiBusy) return;
    setAiBusy(true);
    setAiNotice("");
    try {
      const generated = await generateObservationOutcomeWithDeepSeek(snapshot, outcomeCandidate);
      setOutcomeDraft(generated);
      setAiNotice("DeepSeek iki taslağı hazırladı. Metinleri düzenleyip açıkça kaydedebilirsiniz.");
    } catch (cause) {
      setAiNotice(cause instanceof Error ? cause.message : "DeepSeek taslağı hazırlanamadı; cihaz içi taslak korunuyor.");
    } finally {
      setAiBusy(false);
    }
  }

  if (!snapshot || !model) return error ? <p role="alert">{error}</p> : null;
  const limit = expanded || observationId ? Infinity : 1;
  const actions = model.observations.slice(0, limit);
  const preparation = model.preparation.slice(0, expanded ? undefined : 1);
  const selectedCandidates = model.candidates.filter(c => selectedPreparation === null || selectedPreparation.includes(c.source.id));
  const assessments = preparedTeacherAssessments(snapshot, studentId, observationId);
  return <section className="action-center" aria-label={copy.title} aria-busy={busy || aiBusy}>
    {assessments.length > 0 && <section aria-label="Değerlendirmeleri tamamla"><h3>Yazdığınız değerlendirmeleri tamamlayın</h3><p>Metinleri seçin; mevcut gözlem ve hedef bağlantılarıyla birlikte kaydedilsin.</p>{assessments.map(record => <label className="action-center-card action-center-assessment-choice" key={record.id}><input type="checkbox" checked={selectedAssessments.includes(record.id)} disabled={disabled || busy} onChange={event => setSelectedAssessments(previous => event.target.checked ? [...previous, record.id] : previous.filter(id => id !== record.id))} /><span>{String(record.teacherAssessmentText)}<small>{String(record.periodStart)} – {String(record.periodEnd)}</small></span></label>)}<button type="button" className="action-center-primary" disabled={disabled || busy || !selectedAssessments.some(id => assessments.some(record => record.id === id))} onClick={() => void run(() => completeTeacherAssessments(store, { snapshot, ids: selectedAssessments.filter(id => assessments.some(record => record.id === id)) }), "Seçtiğiniz değerlendirmeler gözlem ve hedefleriyle kaydedildi.")}>Seçili değerlendirmeleri kaydet ve tamamla</button></section>}
    <WorkPackageCenter store={store} refreshKey={refreshKey} disabled={disabled || busy} studentId={studentId} observationId={observationId} mode="observations" onChanged={onChanged} onOpenPlans={onOpenPlans} onOpenObservation={onOpenObservation} />
    {outcomeCandidate && outcomeDraft && <section className="action-center-outcome" aria-label="Gözlemden değerlendirme ve veli bülteni">
      <h3>Gözlemden iki işi birlikte tamamla</h3>
      <p>Kimliksizleştirilmiş gözlemden DeepSeek desteği alabilir veya cihaz içi taslağı doğrudan düzenleyebilirsiniz. Hiçbir metin açık kaydınız olmadan belgeye dönüşmez.</p>
      <button type="button" className="action-center-ai" disabled={disabled || busy || aiBusy} onClick={() => void improveOutcomeWithDeepSeek()}>{aiBusy ? "DeepSeek hazırlıyor…" : "DeepSeek ile iki metni geliştir"}</button>
      {aiNotice && <p className="action-center-ai-notice" role="status">{aiNotice}</p>}
      <details open><summary>Metinleri incele ve düzenle</summary>
        <label>Haftalık değerlendirme taslağı<KeyboardTextarea aria-label="Haftalık değerlendirme taslağı" rows={5} maxLength={12000} disabled={disabled || busy || aiBusy} value={outcomeDraft.assessmentText} onChange={event => setOutcomeDraft(current => current ? { ...current, assessmentText: event.target.value } : current)} /></label>
        <label>Veli bülteni taslağı<KeyboardTextarea aria-label="Veli bülteni taslağı" rows={5} maxLength={12000} disabled={disabled || busy || aiBusy} value={outcomeDraft.familyBulletinText} onChange={event => setOutcomeDraft(current => current ? { ...current, familyBulletinText: event.target.value } : current)} /></label>
      </details>
      <p className="action-center-source-note">{outcomeDraft.sourceDisclosure}</p>
      <p className="action-center-source-note">{outcomeDraft.privacyDisclosure}</p>
      <p className="action-center-uncertainty">{outcomeDraft.uncertaintyDisclosure}</p>
      <p className="action-center-source-note">Üretim modu: {outcomeDraft.generationMode === "deepseek" ? `DeepSeek${outcomeDraft.aiModel ? ` · ${outcomeDraft.aiModel}` : ""}` : "cihaz içi güvenli taslak"}. Bulut yanıtı kullanılamadığında taklit edilmez.</p>
      <button type="button" className="action-center-primary" disabled={disabled || busy || aiBusy || outcomeDraft.assessmentText.trim().length < 20 || outcomeDraft.familyBulletinText.trim().length < 20} onClick={() => void run(() => saveObservationOutcomePackage(store, outcomeDraft), "Haftalık değerlendirme ve veli bülteni aynı işlemde kaydedildi.")}>{busy ? copy.busy : "Metinleri kontrol ettim; ikisini birlikte kaydet"}</button>
    </section>}
    {(model.observations.length > 0 || model.preparation.length > 0 || model.candidates.length > 0 || status || error || observationId) && <details open={!!observationId}>
    <summary>{WORK_PACKAGE_COPY.individual}</summary>
    <header><h3>{copy.title}</h3><p>{copy.intro}</p></header>
    {observationId && <ObservationMetadataEditor store={store} observationId={observationId} studentId={studentId} disabled={disabled || busy} refreshKey={refreshKey} onChanged={onChanged} onOpenProgramLinks={onOpenProgramLinks} />}
    {status && <p className="action-center-success" role="status">{status}</p>}
    {error && <p className="action-center-error" role="alert">{error}</p>}
    {planId && onOpenPlans && <button type="button" className="action-center-primary" onClick={() => onOpenPlans(planId)}>{copy.planOpen}</button>}
    {actions.map(action => <article className="action-center-card" key={`${action.scope.observationId}:${action.scope.studentId}`}>
      <div className="action-center-source"><strong>{action.studentName}</strong><time dateTime={action.civilDate}>{action.civilDate}</time></div>
      {!observationId && <blockquote>{action.rawText}</blockquote>}
      {!observationId && <details><summary>{copy.metadata}</summary><ObservationMetadataEditor store={store} observationId={action.scope.observationId} studentId={action.scope.studentId} disabled={disabled || busy} refreshKey={refreshKey} onChanged={onChanged} onOpenProgramLinks={onOpenProgramLinks} compact /></details>}
      {action.assignedCategories.length > 0 && <p className="action-center-placement"><strong>{copy.assigned}:</strong> {action.assignedCategories.join(" · ")}</p>}
      {action.needsCategory ? <>
        <h4>{copy.categories}</h4><p>{copy.categoryHelp}</p>
        <div className="action-center-categories">{action.categories.slice(0, categoryExpanded === action.scope.observationId ? undefined : 3).map(category => <button key={category} type="button" disabled={disabled || busy} onClick={() => void run(() => assignObservationCategory(store, { ...action.scope, category }), copy.categorySaved)}>{copy.categoryLabels[category]}</button>)}</div>
        {categoryExpanded !== action.scope.observationId && <button type="button" className="action-center-link" onClick={() => setCategoryExpanded(action.scope.observationId)}>{copy.moreCategories}</button>}
      </> : action.planId ? <><p className="action-center-success">{copy.completed}</p>{onOpenPlans && action.planId !== planId && <button type="button" onClick={() => onOpenPlans(action.planId!)}>{copy.planOpen}</button>}</> : action.period ? <>
        <h4>{copy.support}</h4><p>{copy.supportHelp}</p>
        <p className="action-center-target"><strong>{action.period.existingPlanId ? String(snapshot.plans.find(p => p.id === action.period!.existingPlanId)?.title ?? copy.weeklyTitle) : `${action.period.start} · ${copy.weeklyTitle}`}</strong><br />{action.period.start} – {action.period.end}</p>
        <p>{copy.reviewDate}: {action.period.end}</p>
        <div className="action-center-options">{copy.supportOptions.map(option => <details key={option.id}>
          <summary>{option.title}</summary><p>{option.text}</p><p className="action-center-value">{copy.valueTrace}</p>
          <button type="button" className="action-center-primary" disabled={disabled || busy} onClick={() => void run(() => executeObservationSupport(store, { action, optionId: option.id }), copy.planCreated)}>{busy ? copy.busy : copy.addToPlan}</button>
        </details>)}</div>
      </> : <p>{copy.noFuture}</p>}
    </article>)}
    {(preparation.length > 0 || model.candidates.length > 0) && <article className="action-center-card">
      <h4>{copy.preparation}</h4>
      {preparation.map(item => <div className="action-center-prep" key={`${item.sourceId}:${item.itemId}`}><p>{item.text}<br /><time dateTime={item.dueOn}>{item.dueOn}</time></p><button type="button" disabled={disabled || busy} onClick={() => void run(() => completePreparedItem(store, item), copy.checked)}>{copy.preparationComplete}</button></div>)}
      {model.candidates.length > 0 && model.scope && <details><summary>{copy.preparationCreate}</summary><div className="action-center-preparation-sources">{model.candidates.map(c => <label key={c.source.id}><input type="checkbox" checked={selectedCandidates.some(candidate => candidate.source.id === c.source.id)} disabled={disabled || busy} onChange={event => setSelectedPreparation(event.target.checked ? [...selectedCandidates.map(candidate => candidate.source.id), c.source.id] : selectedCandidates.filter(candidate => candidate.source.id !== c.source.id).map(candidate => candidate.source.id))} /><span><strong>{c.source.title}</strong>: {[...c.materials, ...c.preparation].join(" · ")}</span></label>)}</div><button type="button" className="action-center-primary" disabled={disabled || busy || selectedCandidates.length === 0} onClick={() => void run(() => createPreparedChecklist(store, { ...model.scope!, candidates: selectedCandidates }), copy.preparationSaved)}>{copy.preparationCreate}</button></details>}
    </article>}
    {!expanded && (model.observations.length > 1 || model.preparation.length > 1) && <button type="button" className="action-center-link" onClick={() => setExpanded(true)}>{copy.showMore}</button>}
    {observationId && !actions.length && !status && <p>{copy.empty}</p>}
    </details>}
  </section>;
}
