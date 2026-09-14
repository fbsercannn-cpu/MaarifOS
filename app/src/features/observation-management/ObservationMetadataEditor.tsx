import { useEffect, useRef, useState } from "react";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../teacher-followup/teacher-followup-service.ts";
import { observationMetadataModel } from "./observation-management-model.ts";
import { saveObservationMetadata, type MetadataPlacement } from "./observation-management-service.ts";
import { OBSERVATION_MANAGEMENT_COPY as copy } from "./observation-management-copy.ts";
import "./observation-management.css";

export interface ObservationMetadataEditorProps { store: LocalDataStore; observationId: string; studentId?: string; disabled: boolean; refreshKey: number | string; onChanged: () => void; onOpenProgramLinks?: (observationId: string) => void; compact?: boolean }
export function ObservationMetadataEditor({ store, observationId, studentId, disabled, refreshKey, onChanged, onOpenProgramLinks, compact = false }: ObservationMetadataEditorProps) {
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [targetDate, setTargetDate] = useState<string | undefined>();
  const [status, setStatus] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const guard = useRef(false), request = useRef(0), generation = useRef(0);
  const reload = useRef<() => void>(() => {});
  const lastRefresh = useRef(refreshKey);
  useEffect(() => {
    const version = ++generation.current;
    const read = () => {
      const id = ++request.current; setLoading(true);
      void store.readSnapshot().then(value => { if (id === request.current && version === generation.current) { setSnapshot(value); setLoading(false); } }).catch(() => { if (id === request.current && version === generation.current) { setError(copy.readFailed); setLoading(false); } });
    };
    reload.current = read;
    read(); window.addEventListener(FOLLOWUP_CHANGED_EVENT, read);
    return () => { generation.current++; window.removeEventListener(FOLLOWUP_CHANGED_EVENT, read); };
  }, [store, observationId]);
  useEffect(() => { if (lastRefresh.current !== refreshKey) { lastRefresh.current = refreshKey; reload.current(); } }, [refreshKey]);
  useEffect(() => { setTargetDate(undefined); setStatus(""); setError(""); setExpanded(false); }, [observationId, studentId]);
  const model = snapshot ? observationMetadataModel(snapshot, observationId, targetDate) : null;
  const visible = model && (!studentId || model.studentIds.includes(studentId));
  const writeDisabled = disabled || busy || loading;
  async function save(placement: MetadataPlacement) {
    if (!model || writeDisabled || guard.current) return;
    guard.current = true; setBusy(true); setError(""); setStatus(""); const version = generation.current;
    let committed = false;
    try {
      const result = await saveObservationMetadata(store, { model, placement }); committed = true;
      if (generation.current === version) { setStatus(result.alreadyCompleted ? copy.duplicate : copy.saved); setTargetDate(result.civilDate); }
      const id = ++request.current; const value = await store.readSnapshot();
      if (generation.current === version && id === request.current) { setSnapshot(value); setLoading(false); }
      onChanged();
    } catch (cause) {
      if (generation.current === version) {
        setError(committed ? copy.refresh : cause instanceof Error ? cause.message : copy.failed);
        if (!committed) { const id = ++request.current; try { const value = await store.readSnapshot(); if (generation.current === version && id === request.current) { setSnapshot(value); setLoading(false); } } catch { /* Preserve the write error. */ } }
      }
      if (committed) onChanged();
    } finally { guard.current = false; setBusy(false); }
  }
  if (!visible || !model) return error ? <p role="alert">{error}</p> : null;
  const today = civilDateInIstanbul(new Date());
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const dateChanged = model.targetDate !== model.observation.civilDate;
  return <section className="observation-management" aria-label={copy.title} aria-busy={busy}>
    <h4>{copy.title}</h4>{!compact && <p>{copy.explanation}</p>}
    {!compact && <blockquote><time dateTime={model.observation.civilDate}>{model.observation.civilDate}</time><br />{String(model.observation.rawText ?? "")}</blockquote>}
    {status && <p className="observation-management-success" role="status">{status}</p>}
    {error && <p className="observation-management-error" role="alert">{error}</p>}
    <p><strong>{copy.recorded}:</strong> {civilDateInIstanbul(new Date(model.observation.createdAt))}<br /><strong>{copy.current}:</strong> {model.currentTitle ?? copy.noActivity}</p>
    {model.studentIds.length > 1 && <p><strong>{copy.participants} ({model.studentIds.length}):</strong> {model.studentIds.map(id => String(snapshot?.students.find(s => s.id === id)?.displayName ?? "")).join(" · ")}<br />{copy.shared}</p>}
    <div className="observation-management-dates"><button type="button" aria-pressed={model.targetDate === today} disabled={writeDisabled} onClick={() => setTargetDate(today)}>{copy.today}</button><button type="button" aria-pressed={model.targetDate === yesterday} disabled={writeDisabled} onClick={() => setTargetDate(yesterday)}>{copy.yesterday}</button><label>{copy.pickDate}<input type="date" aria-label={copy.date} value={model.targetDate} max={today} disabled={writeDisabled} onChange={event => setTargetDate(event.target.value)} /></label></div>
    {!model.dateValid ? <p role="alert">{copy.invalidDate}</p> : <>
      {dateChanged && model.keepCurrent && <button type="button" disabled={writeDisabled} onClick={() => void save({ kind: "keep" })}>{copy.keep}</button>}
      {model.placements.length > 0 && <><h5>{copy.choices}</h5>{model.placements.slice(0, expanded ? undefined : 3).map(candidate => <details key={candidate.id} className="observation-management-choice">
        <summary>{candidate.title} · {candidate.civilDate}</summary><p>{candidate.planTitle}</p>
        {candidate.clearProgramLinks && <p>{copy.removeLinks}</p>}
        <button type="button" disabled={writeDisabled} onClick={() => void save({ kind: "activity", activityId: candidate.id, clearProgramLinks: candidate.clearProgramLinks, expectedActivityUpdatedAt: candidate.expectedActivityUpdatedAt, expectedPlanUpdatedAt: candidate.expectedPlanUpdatedAt })}>{copy.attach}</button>
        {candidate.targets.map(target => <div key={target.id} className="observation-management-target"><p><strong>{copy.source}:</strong> {target.referenceCode} · {target.referenceTitle}</p><button type="button" disabled={writeDisabled} onClick={() => void save({ kind: "activity", activityId: candidate.id, targetId: target.id, clearProgramLinks: candidate.clearProgramLinks, expectedActivityUpdatedAt: candidate.expectedActivityUpdatedAt, expectedPlanUpdatedAt: candidate.expectedPlanUpdatedAt })}>{copy.attachTarget}</button></div>)}
      </details>)}</>}
      {model.developmentChoices.length > 0 && <details className="observation-management-choice"><summary>{copy.developmentTitle}</summary><p>{copy.developmentHelp}</p><p>{model.developmentMatchCount ? copy.developmentMatch : copy.noDevelopmentMatch}</p>{model.developmentChoices.slice(0, expanded ? undefined : 3).map(preset => <div key={preset.id} className="observation-management-target"><p><strong>{preset.label}</strong><br />{preset.curriculumReference.code} · {preset.curriculumReference.title}</p><button type="button" disabled={writeDisabled} onClick={() => void save({ kind: "development", presetId: preset.id })}>{copy.developmentAction}</button></div>)}</details>}
      {!expanded && (model.placements.length > 3 || model.developmentChoices.length > 3) && <button type="button" onClick={() => setExpanded(true)}>{model.developmentChoices.length > 3 ? copy.moreDevelopment : copy.all}</button>}
      {(dateChanged || !model.currentTitle) && <div className="observation-management-fallback"><p>{model.placements.length ? copy.fallbackHelp : copy.empty}</p>{model.spontaneousClearsLinks && <p>{copy.removeLinks}</p>}<button type="button" disabled={writeDisabled} onClick={() => void save({ kind: "spontaneous", clearProgramLinks: model.spontaneousClearsLinks })}>{busy ? copy.busy : model.currentIsSpontaneous || !model.currentTitle ? copy.fallback : copy.spontaneous}</button></div>}
      {onOpenProgramLinks && !model.developmentChoices.length && !model.placements.some(p => p.targets.length) && <button type="button" onClick={() => onOpenProgramLinks(observationId)}>{copy.otherLinks}</button>}
    </>}
  </section>;
}


