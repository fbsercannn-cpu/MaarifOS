import { useEffect, useRef, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { loadPlanNextSteps, applyPlanNextStep } from "./plan-next-steps.ts";
import { PLAN_NEXT_STEPS_COPY as copy } from "./plan-next-steps-copy.ts";
import "./plan-next-steps.css";
import { KeyboardInput } from "../../mobile";

type NextStepsModel = Awaited<ReturnType<typeof loadPlanNextSteps>>;
type ApplyResult = Awaited<ReturnType<typeof applyPlanNextStep>>;
type ApplyRequest = Parameters<typeof applyPlanNextStep>[1];
type OpenTarget = NonNullable<NextStepsModel["options"][number]["openTarget"]>;

export interface PlanNextStepsProps {
  store: LocalDataStore;
  civilDate: string;
  refreshKey?: unknown;
  requestedLevel?: "annual" | "monthly" | "weekly" | "daily";
  disabled?: boolean;
  disabledReason?: string | null;
  density?: "compact" | "full";
  onChanged?: (result: ApplyResult) => void | Promise<void>;
  onOpenPlan?: (target: OpenTarget) => void | Promise<void>;
  onManualPlan?: (civilDate: string) => void;
  onApplyStep?: (request: ApplyRequest) => Promise<ApplyResult>;
}

export function PlanNextSteps({ store, civilDate, refreshKey, requestedLevel, disabled = false,
  disabledReason, density = "full", onChanged, onOpenPlan, onApplyStep, onManualPlan }: PlanNextStepsProps) {
  const [day, setDay] = useState(civilDate);
  const [model, setModel] = useState<NextStepsModel | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedTarget, setSavedTarget] = useState<OpenTarget | null>(null);
  const guard = useRef(false);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setDay(civilDate); }, [civilDate]);
  useEffect(() => {
    const version = ++generation.current;
    setModel(null);
    setError("");
    void loadPlanNextSteps(store, { civilDate: day, requestedLevel }).then(next => {
      if (version === generation.current) setModel(next);
    }).catch(cause => {
      if (version === generation.current) setError(cause instanceof Error ? cause.message : copy.readFailed);
    });
    return () => { generation.current++; };
  }, [store, day, refreshKey, requestedLevel]);

  async function choose(option: NextStepsModel["options"][number]) {
    if (guard.current || (disabled && option.request)) return;
    if (!option.request) {
      try { if (option.openTarget) await onOpenPlan?.(option.openTarget); }
      catch { setError(copy.openFailed); }
      return;
    }
    guard.current = true;
    setBusy(true);
    setError("");
    const version = generation.current;
    let committed = false;
    try {
      const result = await (onApplyStep ? onApplyStep(option.request) : applyPlanNextStep(store, option.request));
      committed = true;
      if (version === generation.current) {
        setMessage(result.kind === "link-existing-daily-plan" ? result.message : result.createdPlanIds.length ? copy.saved : copy.alreadySaved);
        setSavedTarget(result.nextTarget);
      }
      try {
        const next = await loadPlanNextSteps(store, { civilDate: day, requestedLevel });
        if (version === generation.current) {
          setModel(next);
          window.requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
        }
      } catch {
        if (version === generation.current) setError(copy.savedRefreshFailed);
      }
      const openCreatedDay = version === generation.current && result.nextTarget.level === "daily" && result.createdPlanIds.includes(result.nextTarget.planId);
      await onChanged?.(result);
      if (openCreatedDay) {
        await onOpenPlan?.(result.nextTarget);
      }
    } catch (cause) {
      if (version === generation.current) setError(committed
        ? copy.savedOpenFailed
        : cause instanceof Error ? cause.message : copy.writeFailed);
    } finally { guard.current = false; setBusy(false); }
  }

  async function refresh() {
    if (guard.current) return;
    const version = ++generation.current;
    setError("");
    try {
      const next = await loadPlanNextSteps(store, { civilDate: day, requestedLevel });
      if (version === generation.current) setModel(next);
    } catch (cause) {
      if (version === generation.current) setError(cause instanceof Error ? cause.message : copy.readFailed);
    }
  }

  return <section className={`plan-next-steps plan-next-steps--${density}`} aria-label={copy.region} aria-busy={busy}>
    <header><span>{copy.sequence}</span><h2 ref={heading} tabIndex={-1}>{model?.title ?? copy.loadingTitle}</h2>
      <p>{model?.detail ?? copy.loading}</p></header>
    <label className="plan-next-steps-date">{copy.day}<KeyboardInput type="date" aria-label={copy.day} value={day}
      disabled={busy} onChange={event => { setDay(event.target.value); setMessage(""); setSavedTarget(null); }} /></label>
    {onManualPlan && <button type="button" disabled={disabled || busy || !/^\d{4}-\d{2}-\d{2}$/.test(day)} onClick={() => onManualPlan(day)}>Kendim planla</button>}
    {message && <p role="status" className="plan-next-steps-success">{message}</p>}
    {disabled && disabledReason && <p role="status">{disabledReason}</p>}
    {error && <div role="alert" className="plan-next-steps-error"><p>{error}</p><button type="button" disabled={busy} onClick={() => void refresh()}>{copy.refresh}</button></div>}
    {model && <div className="plan-next-steps-options">{model.options.map(option => <article key={option.id}>
      <h3>{option.title}</h3><p>{option.detail}</p><small>{option.sourceLabel}</small>
      <button type="button" disabled={busy || (disabled && Boolean(option.request)) || (!option.request && !onOpenPlan)} onClick={() => void choose(option)}>
        {busy ? copy.saving : option.actionLabel}
      </button>
    </article>)}</div>}
    {savedTarget && onOpenPlan && <button type="button" className="plan-next-steps-open" disabled={busy} onClick={() => void onOpenPlan(savedTarget)}>{copy.openSaved}</button>}
  </section>;
}
