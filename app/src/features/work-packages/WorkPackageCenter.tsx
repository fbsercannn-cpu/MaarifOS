import { useEffect, useRef, useState } from "react";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { FOLLOWUP_CHANGED_EVENT } from "../teacher-followup/teacher-followup-service.ts";
import { prepareWorkPackageSelection, type WorkPackageModel as PackageModel, type WorkPackageReceipt as PackageReceipt } from "./work-package-model.ts";
import { loadWorkPackageModel, applyWorkPackage, previewWorkPackageUndo, undoWorkPackage } from "./work-package-service.ts";
import { WORK_PACKAGE_COPY as copy } from "./work-package-copy.ts";
import "./work-package.css";

export interface WorkPackageCenterProps {
  store: LocalDataStore; refreshKey: number | string; disabled: boolean;
  studentId?: string; observationId?: string; civilDate?: string;
  mode?: "all" | "observations" | "planning";
  onChanged: () => void; onOpenPlans?: (planId: string) => void;
  onOpenObservation?: (observationId: string) => void;
}

export function WorkPackageCenter({ store, refreshKey, disabled, studentId, observationId, civilDate, mode = "all", onChanged, onOpenPlans, onOpenObservation }: WorkPackageCenterProps) {
  const day = civilDate ?? civilDateInIstanbul(new Date());
  const [model, setModel] = useState<PackageModel | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [visibleLimit, setVisibleLimit] = useState(6);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState<"apply" | "undo" | null>(null);
  const [error, setError] = useState(""), [status, setStatus] = useState("");
  const [receipt, setReceipt] = useState<PackageReceipt | null>(null);
  const generation = useRef(0), readSequence = useRef(0), guard = useRef(false);
  const reload = useRef<() => Promise<void>>(async () => {});
  const lastRefresh = useRef(refreshKey);

  useEffect(() => {
    const scope = ++generation.current;
    setModel(null); setSelectedIds(null); setChoices({}); setVisibleLimit(6); setReceipt(null); setStatus(""); setError("");
    const read = async () => {
      const sequence = ++readSequence.current; setLoading(true);
      try {
        const value = await loadWorkPackageModel(store, { civilDate: day, studentId, observationId, mode });
        if (scope !== generation.current || sequence !== readSequence.current) return;
        setModel(value); setLoading(false); setError(previous => previous === copy.failedRead ? "" : previous);
      } catch {
        if (scope !== generation.current || sequence !== readSequence.current) return;
        setModel(null); setLoading(false); setError(copy.failedRead);
      }
    };
    reload.current = read;
    const listener = () => { void read(); };
    void read(); window.addEventListener(FOLLOWUP_CHANGED_EVENT, listener);
    return () => { generation.current++; window.removeEventListener(FOLLOWUP_CHANGED_EVENT, listener); };
  }, [store, studentId, observationId, day, mode]);
  useEffect(() => { if (lastRefresh.current !== refreshKey) { lastRefresh.current = refreshKey; void reload.current(); } }, [refreshKey]);

  const candidates = (model?.candidates ?? []).filter(candidate => mode === "all" || (mode === "observations" ? candidate.kind === "observation-package" : candidate.kind === "plan-gap"));
  const observations = candidates.filter(candidate => candidate.kind === "observation-package");
  const selected = observations.filter(candidate => selectedIds === null ? observations.length === 1 : selectedIds.includes(candidate.id));
  const activeChoice = (candidate: PackageModel["candidates"][number]) => candidate.choices.find(choice => choice.id === choices[candidate.id]) ?? candidate.choices.find(choice => choice.id === candidate.defaultChoiceId) ?? candidate.choices[0];
  const selection = Object.fromEntries(selected.map(candidate => [candidate.id, activeChoice(candidate)?.id]).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const writeDisabled = disabled || loading || busy !== null;

  async function apply(planCandidateId?: string) {
    const planCandidate = candidates.find(candidate => candidate.id === planCandidateId && candidate.kind === "plan-gap");
    const chosen = planCandidate ? { [planCandidate.id]: activeChoice(planCandidate).id } : selection;
    if (!model || writeDisabled || guard.current || !Object.keys(chosen).length) return;
    const version = generation.current; guard.current = true; setBusy("apply"); setError(""); setStatus("");
    let committed = false;
    try {
      const prepared = prepareWorkPackageSelection(model, { selections: chosen });
      const result = await applyWorkPackage(store, prepared); committed = true;
      if (version === generation.current) { setReceipt(result); setStatus(result.summary); setSelectedIds([]); }
      await reload.current();
      onChanged();
    } catch (cause) {
      if (version === generation.current) setError(committed ? copy.refreshPending : cause instanceof Error ? cause.message : copy.failedWrite);
      if (!committed) await reload.current();
      if (committed) onChanged();
    } finally { guard.current = false; setBusy(null); }
  }
  async function undo() {
    if (!receipt || writeDisabled || guard.current) return;
    const version = generation.current; guard.current = true; setBusy("undo"); setError("");
    let committed = false;
    try {
      const preview = await previewWorkPackageUndo(store, receipt);
      if (!preview.eligible || !preview.expectedFingerprint) throw new Error(preview.reason ?? "Bu işlem artık güvenle geri alınamıyor.");
      await undoWorkPackage(store, { receipt, expectedFingerprint: preview.expectedFingerprint }); committed = true;
      if (version === generation.current) { setReceipt(null); setStatus(copy.undone); setSelectedIds([]); }
      await reload.current(); onChanged();
    } catch (cause) {
      if (version === generation.current) setError(committed ? copy.refreshPending : cause instanceof Error ? cause.message : copy.failedWrite);
      if (committed) onChanged();
    } finally { guard.current = false; setBusy(null); }
  }

  if (!loading && !candidates.length && !receipt && !status && !error) return null;
  return <section className="work-package-center" aria-label={copy.title} aria-busy={loading || !!busy}>
    <h4>{copy.title}</h4><p>{copy.intro}</p>
    {error && <p className="work-package-error" role="alert">{error}</p>}
    {status && <p className="work-package-success" role="status">{status}</p>}
    {receipt && <div className="work-package-result-actions">
      {receipt.resultActions.filter(action => action.kind !== "undo").map((action, index) => {
        const open = action.kind === "open-observation" ? onOpenObservation : onOpenPlans;
        return open ? <button key={`${action.recordId}:${index}`} type="button" onClick={() => open(action.recordId)}>{action.label}</button> : null;
      })}
      <button type="button" disabled={writeDisabled} onClick={() => void undo()}>{busy === "undo" ? copy.undoing : copy.undo}</button>
    </div>}
    {loading && !model && <p>{copy.loading}</p>}
    {candidates.slice(0, visibleLimit).map(candidate => {
      const choice = activeChoice(candidate);
      return <article className="work-package-row" key={candidate.id}>
        {candidate.kind === "observation-package" ? <label className="work-package-select"><input type="checkbox" aria-label={`${candidate.title} ${copy.select}`} checked={selected.some(item => item.id === candidate.id)} disabled={writeDisabled || !choice} onChange={event => setSelectedIds(event.target.checked ? [...selected.map(item => item.id), candidate.id] : selected.filter(item => item.id !== candidate.id).map(item => item.id))} /><span>{candidate.title}</span></label> : <h5>{candidate.title}</h5>}
        {candidate.rawText && <blockquote>{candidate.rawText}</blockquote>}
        {candidate.civilDate && <time dateTime={candidate.civilDate}>{candidate.civilDate}</time>}
        <p>{candidate.reason}</p>
        <p><strong>{copy.result}:</strong> {choice?.resultLabel ?? candidate.resultLabel}</p>
        {candidate.reusedRecordIds.length > 0 && <p className="work-package-meta">{copy.reused} ({candidate.reusedRecordIds.length})</p>}
        {candidate.kind === "observation-package" && model?.preferences.source === "prior-explicit-actions" && <p className="work-package-meta">{copy.remembered}</p>}
        {candidate.choices.length > 1 && <label>{copy.choose}<select aria-label={`${candidate.title} — ${copy.choose}`} value={choice?.id ?? ""} disabled={writeDisabled} onChange={event => setChoices(previous => ({ ...previous, [candidate.id]: event.target.value }))}>{candidate.choices.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        {choice?.description && <p>{choice.description}</p>}
        {candidate.kind === "plan-gap" && choice && <button type="button" className="work-package-apply" disabled={writeDisabled} onClick={() => void apply(candidate.id)}>{busy === "apply" ? copy.applying : choice.resultLabel}</button>}
      </article>;
    })}
    {candidates.length > visibleLimit && <button type="button" onClick={() => setVisibleLimit(value => value + 6)}>Diğer {candidates.length - visibleLimit} işi sırayla göster</button>}
    {observations.length > 0 && <>
      <button type="button" className="work-package-apply" disabled={writeDisabled || !selected.length} onClick={() => void apply()}>{busy === "apply" ? copy.applying : selected.length > 1 ? `${copy.applyMany} (${selected.length})` : selected.length === 1 ? activeChoice(selected[0])?.resultLabel ?? copy.applyOne : copy.applyOne}</button>
    </>}
    {error && <button type="button" disabled={busy !== null} onClick={() => { setError(""); void reload.current(); }}>{copy.refresh}</button>}
  </section>;
}

