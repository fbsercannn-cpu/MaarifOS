import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet, KeyboardInput, KeyboardTextarea, useKeyboard } from "../../mobile";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import { resolveDevelopmentOverview, formatDevelopmentDate } from "./development-overview.ts";
import { DEVELOPMENT_REPORT_NOTICE, isDevelopmentReportRecord, type DevelopmentReportRecord,
  type DevelopmentReportScope, type DevelopmentReportEvidenceSnapshot } from "./development-report-model.ts";
import { buildDevelopmentReportWorkspace, saveDevelopmentReportDraft, approveDevelopmentReport,
  getDevelopmentReportReadModel } from "./development-report.ts";
import { REPORT_EDITOR_COPY as copy } from "./development-editor-copy.ts";
import { resolveTymmOfficialProgramAccessUrl } from "../curriculum/tymm-official-resource-catalog.ts";
import { buildOfficialReportPreparation } from "./official-report-preparation.ts";
import "./development-report-editor.css";

interface Form {
  periodStart: string;
  periodEnd: string;
  selectedObservationIds: string[];
  teacherEvaluation: string;
  nextSupport: string;
}
interface Props {
  store: LocalDataStore;
  studentId: string;
  civilDate: string;
  suspended?: boolean;
  initialPeriod?: { periodStart: string; periodEnd: string } | null;
  runWrite<T>(task: () => Promise<T>): Promise<T>;
  registerDraftFlusher(flusher: () => Promise<void>): () => void;
  onClose(): void;
}
const toForm = (record: DevelopmentReportRecord): Form => ({
  periodStart: record.periodStart, periodEnd: record.periodEnd,
  selectedObservationIds: [...record.selectedObservationIds],
  teacherEvaluation: record.teacherEvaluation, nextSupport: record.nextSupport,
});

export function DevelopmentReportDialog(props: Props) {
  const keyboard = useKeyboard();
  const openedCivilDate = useRef(props.civilDate);
  const [snapshot, setSnapshotState] = useState<DataSnapshot | null>(null);
  const snapshotRef = useRef<DataSnapshot | null>(null);
  const setSnapshot = useCallback((value: DataSnapshot) => { snapshotRef.current = value; setSnapshotState(value); }, []);
  const [scope, setScope] = useState<Omit<DevelopmentReportScope, "periodStart" | "periodEnd"> | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [record, setRecord] = useState<DevelopmentReportRecord | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [canExport, setCanExport] = useState(false);
  const [sourceStatus, setSourceStatus] = useState("");
  const recordRef = useRef(record);
  const formRef = useRef(form);
  const scopeRef = useRef(scope);
  const savedKeyRef = useRef("");
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const runWriteRef = useRef(props.runWrite);
  runWriteRef.current = props.runWrite;
  const mountedRef = useRef(true);
  const updateRecord = useCallback((next: DevelopmentReportRecord | null) => {
    recordRef.current = next; setRecord(next);
  }, []);
  const updateForm = useCallback((next: Form) => {
    formRef.current = next; setForm(next); setConfirmed(false); setCanExport(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    void props.store.readSnapshot().then((data) => {
      if (!active) return;
      const overview = resolveDevelopmentOverview(data, { civilDate: openedCivilDate.current, period: "month" });
      if (!overview.scope || !overview.period) throw new Error(copy.empty);
      const context = { ...overview.scope, studentId: props.studentId };
      const requestedPeriod = props.initialPeriod ?? { periodStart: overview.period.startDate, periodEnd: overview.period.endDate };
      const previous = data.settings.filter(isDevelopmentReportRecord)
        .filter((item) => !item.deletedAt && item.studentId === context.studentId &&
          item.classroomId === context.classroomId && item.academicYearId === context.academicYearId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const initial = previous.find((item) => item.periodStart === requestedPeriod.periodStart && item.periodEnd === requestedPeriod.periodEnd) ?? null;
      const period = initial ?? requestedPeriod;
      const workspace = buildDevelopmentReportWorkspace(data, { ...context, ...period });
      const next = initial ? toForm(initial) : {
        periodStart: period.periodStart, periodEnd: period.periodEnd,
        selectedObservationIds: workspace.availableEvidence.map((item) => item.observationId),
        teacherEvaluation: "", nextSupport: "",
      };
      scopeRef.current = context; setScope(context); setSnapshot(data);
      savedKeyRef.current = initial ? JSON.stringify(next) : "";
      updateRecord(initial); updateForm(next);
      setStatus(initial?.status === "approved" ? copy.approved : initial ? copy.saved : copy.unsaved);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : copy.loadError); });
    return () => { active = false; mountedRef.current = false; };
  }, [props.store, props.studentId, props.initialPeriod, updateForm, updateRecord, setSnapshot]);

  const workspace = useMemo(() => {
    if (!snapshot || !scope || !form) return null;
    try { return buildDevelopmentReportWorkspace(snapshot, { ...scope, periodStart: form.periodStart, periodEnd: form.periodEnd }); }
    catch { return null; }
  }, [snapshot, scope, form?.periodStart, form?.periodEnd]);
  const officialPreparation = useMemo(() => {
    if (!snapshot || !scope || !form) return null;
    try {
      return buildOfficialReportPreparation(
        snapshot,
        { ...scope, periodStart: form.periodStart, periodEnd: form.periodEnd },
        form.selectedObservationIds,
      );
    } catch {
      return null;
    }
  }, [snapshot, scope, form]);

  const flushDraft = useCallback(async () => {
    const operation = queueRef.current.then(async () => {
      const latest = formRef.current;
      const context = scopeRef.current;
      if (!latest || !context || recordRef.current?.status === "approved") return recordRef.current;
      const key = JSON.stringify(latest);
      if (key === savedKeyRef.current) return recordRef.current;
      if (mountedRef.current) setStatus(copy.saving);
      const previous = recordRef.current;
      const visibleData = snapshotRef.current;
      if (!visibleData) throw new Error(copy.loadError);
      const visibleEvidence = buildDevelopmentReportWorkspace(visibleData, { ...context, ...latest }).availableEvidence;
      const selected = latest.selectedObservationIds.map((id) => visibleEvidence.find((entry) => entry.observationId === id));
      if (selected.some((entry) => !entry)) throw new Error(copy.stale);
      const saved = await runWriteRef.current(() => saveDevelopmentReportDraft(props.store, {
        ...context, ...latest,
        expectedEvidenceSnapshots: selected as DevelopmentReportEvidenceSnapshot[],
        ...(previous ? { reportId: previous.id, expectedRevision: previous.revision } : {}),
      }));
      recordRef.current = saved;
      savedKeyRef.current = key;
      if (mountedRef.current) { setRecord(saved); setStatus(copy.saved); setError(""); }
      return saved;
    });
    queueRef.current = operation.catch(() => undefined);
    return operation;
  }, [props.store]);

  useEffect(() => props.registerDraftFlusher(async () => { await flushDraft(); }), [props.registerDraftFlusher, flushDraft]);
  useEffect(() => {
    if (props.suspended || !form || !scope || record?.status === "approved" || JSON.stringify(form) === savedKeyRef.current) return;
    const timer = window.setTimeout(() => {
      void flushDraft().catch((reason) => { if (mountedRef.current) setError(reason instanceof Error ? reason.message : copy.failed); });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [props.suspended, form, scope, record?.status, flushDraft]);

  useEffect(() => {
    if (!snapshot || !record || record.status !== "approved") { setCanExport(false); return; }
    let active = true;
    void getDevelopmentReportReadModel(snapshot, record.id).then((view) => {
      if (active) { setCanExport(view.canExport); setSourceStatus(view.sourceStatus); }
    }).catch(() => { if (active) { setCanExport(false); setSourceStatus("invalid"); } });
    return () => { active = false; };
  }, [snapshot, record]);

  const perform = async (task: () => Promise<void>) => {
    setBusy(true); setError(""); keyboard.hide();
    try { await task(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : copy.failed); }
    finally { if (mountedRef.current) setBusy(false); }
  };
  const close = () => { if (!busy && !props.suspended) void perform(async () => { await flushDraft(); props.onClose(); }); };
  const approve = () => void perform(async () => {
    const saved = await flushDraft();
    if (!saved || !confirmed) return;
    const approved = await runWriteRef.current(() => approveDevelopmentReport(props.store, {
      reportId: saved.id, expectedRevision: saved.revision,
    }));
    updateRecord(approved); setSnapshot(await props.store.readSnapshot()); setStatus(copy.approved);
  });
  const download = () => void perform(async () => {
    const id = recordRef.current?.id;
    if (!id) return;
    const data = await props.store.readSnapshot();
    const before = await getDevelopmentReportReadModel(data, id);
    if (!before.canExport) { setSnapshot(data); throw new Error(copy.stale); }
    const { createDevelopmentReportPdfDocument } = await import("./development-report-export.ts");
    const document = await createDevelopmentReportPdfDocument(data, id);
    const latest = await props.store.readSnapshot();
    const after = await getDevelopmentReportReadModel(latest, id);
    if (!after.canExport || JSON.stringify(before.record.approvalSeal) !== JSON.stringify(after.record.approvalSeal)) {
      setSnapshot(latest); throw new Error(copy.sourceChanged);
    }
    downloadBrowserFile(document); setStatus(copy.pdfReady);
  });
  const newDraft = () => void perform(async () => {
    await flushDraft();
    const data = await props.store.readSnapshot();
    const current = formRef.current;
    if (!current || !scopeRef.current) return;
    const nextWorkspace = buildDevelopmentReportWorkspace(data, { ...scopeRef.current, ...current });
    const available = new Set(nextWorkspace.availableEvidence.map((item) => item.observationId));
    const next = { ...current, selectedObservationIds: current.selectedObservationIds.filter((id) => available.has(id)) };
    updateRecord(null); savedKeyRef.current = ""; setSnapshot(data); updateForm(next);
    await flushDraft();
  });
  const loadPrevious = (id: string) => void perform(async () => {
    await flushDraft();
    const data = await props.store.readSnapshot();
    const previous = data.settings.find((item) => item.id === id);
    if (!isDevelopmentReportRecord(previous) || previous.deletedAt || !scopeRef.current ||
      previous.studentId !== props.studentId || previous.classroomId !== scopeRef.current.classroomId ||
      previous.academicYearId !== scopeRef.current.academicYearId) throw new Error(copy.loadError);
    const next = toForm(previous);
    savedKeyRef.current = JSON.stringify(next); updateRecord(previous); updateForm(next); setSnapshot(data);
    setStatus(previous.status === "approved" ? copy.approved : copy.saved);
  });
  const refreshSources = () => void perform(async () => {
    await queueRef.current;
    const data = await props.store.readSnapshot();
    const current = formRef.current;
    const context = scopeRef.current;
    if (!current || !context || recordRef.current?.status === "approved") return;
    const currentWorkspace = buildDevelopmentReportWorkspace(data, { ...context, ...current });
    const available = new Set(currentWorkspace.availableEvidence.map((entry) => entry.observationId));
    const previous = recordRef.current;
    const latest = previous ? data.settings.find((item) => item.id === previous.id) : null;
    const conflict = previous && (!isDevelopmentReportRecord(latest) || latest.deletedAt || latest.revision !== previous.revision || latest.contentSha256 !== previous.contentSha256);
    // Another tab's version is preserved. Recover this editor's text under a new id.
    if (conflict) updateRecord(null);
    setSnapshot(data);
    updateForm({ ...current, selectedObservationIds: current.selectedObservationIds.filter((id) => available.has(id)) });
    savedKeyRef.current = "";
    await flushDraft();
    setStatus(conflict ? copy.conflictRecovered : copy.sourcesRefreshed);
  });
  const changePeriod = (key: "periodStart" | "periodEnd", value: string) => {
    if (!form || !scope || !snapshot) return;
    const next = { ...form, [key]: value };
    try {
      const available = new Set(buildDevelopmentReportWorkspace(snapshot, { ...scope, ...next }).availableEvidence.map((item) => item.observationId));
      next.selectedObservationIds = next.selectedObservationIds.filter((id) => available.has(id));
    } catch { /* The service explains invalid civil dates without losing the user's text. */ }
    updateForm(next);
  };
  const approved = record?.status === "approved";
  const evidence = approved ? record.evidenceSnapshots : workspace?.availableEvidence ?? [];
  const renderSource = (entry: DevelopmentReportEvidenceSnapshot) => <details className="development-report-source">
    <summary>{copy.source}</summary>
    <p>{entry.contextSnapshot.activityTitle}</p>
    {entry.confirmedTargets.map((target) => {
      const programAccessUrl = resolveTymmOfficialProgramAccessUrl(
        target.sourceUrl,
        target.sourceSha256,
        target.sourcePage,
      );
      const sourceLabel = `${copy.programSource}${target.sourcePage ? ` · ${target.sourcePage}` : ""}`;
      return <p key={target.id}>{target.domain} · {target.referenceCode} · {target.referenceTitle}<br />
        {programAccessUrl
          ? <a href={programAccessUrl} target="_blank" rel="noreferrer">{sourceLabel}</a>
          : <span>{sourceLabel} · doğrulanmış erişim bağlantısı yok</span>}
      </p>;
    })}
    <small>{entry.observationId}</small>
  </details>;

  return <BottomSheet key={props.suspended ? "report-private" : "report-visible"} open={!props.suspended}
    onOpenChange={(open) => { if (!open) close(); }} title={copy.title} snap={1}>
    <div className="development-report-editor" hidden={props.suspended}>
      <div className="development-report-editor__body">
        {error ? <div className="development-report-error"><p role="alert">{error}</p>
          {!record || record.status === "draft" ? <button type="button" disabled={busy || !form || !scope} onClick={refreshSources}>{copy.refreshSources}</button> : null}</div> : null}
        {!form || !scope ? <p role="status">{error ? "" : copy.loading}</p> : <>
          <header className="development-report-person"><strong>{record?.studentSnapshot.displayName ?? workspace?.studentSnapshot.displayName}</strong>
            <span>{approved ? copy.approved : copy.draft}</span></header>
          <p className="development-report-notice">{DEVELOPMENT_REPORT_NOTICE}</p>
          <div className="development-report-period">
            <label>{copy.periodStart}<KeyboardInput aria-label={copy.periodStart} type="date" value={form.periodStart}
              disabled={busy || approved} onChange={(event) => changePeriod("periodStart", event.target.value)} /></label>
            <label>{copy.periodEnd}<KeyboardInput aria-label={copy.periodEnd} type="date" value={form.periodEnd}
              disabled={busy || approved} onChange={(event) => changePeriod("periodEnd", event.target.value)} /></label>
          </div>
          <fieldset className="development-report-evidence" disabled={busy}>
            <legend>{copy.evidence} · {copy.selectedCount(form.selectedObservationIds.length)}</legend>
            {!approved && workspace?.unavailableEvidenceCount ? <p role="status">{copy.unavailable(workspace.unavailableEvidenceCount)}</p> : null}
            {evidence.length === 0 ? <p>{copy.empty}</p> : evidence.map((entry) => <article
              id={`development-observation-${entry.observationId}`}
              key={entry.observationId}
            >
              <label className="development-report-evidence__select">
                {!approved ? <input type="checkbox" checked={form.selectedObservationIds.includes(entry.observationId)}
                  aria-label={`${formatDevelopmentDate(entry.civilDate)}: ${entry.rawText}`}
                  onChange={(event) => updateForm({ ...form, selectedObservationIds: event.target.checked
                    ? [...form.selectedObservationIds, entry.observationId] : form.selectedObservationIds.filter((id) => id !== entry.observationId) })} /> : null}
                <span><time dateTime={entry.civilDate}>{formatDevelopmentDate(entry.civilDate)}</time>
                  <p>{entry.rawText}</p><small>{entry.confirmedTargets.map((target) => target.domain).filter((value, index, list) => list.indexOf(value) === index).join(" · ") || copy.noDomain}</small>
                  {entry.supportLabel ? <small>{copy.support}: {entry.supportLabel}</small> : null}</span>
              </label>{renderSource(entry)}
            </article>)}
          </fieldset>
          {officialPreparation ? <section className="development-report-source" aria-labelledby="official-report-preparation-heading">
            <h3 id="official-report-preparation-heading">Ek 4 ve e-Okul öğretmen hazırlığı</h3>
            <p>{officialPreparation.notice}</p>
            <p><strong>Çocuk:</strong> {officialPreparation.child.displayName}<br />
              <strong>Eğitim yılı:</strong> {officialPreparation.academicYear.name}<br />
              <strong>Dönem:</strong> {formatDevelopmentDate(officialPreparation.period.start)} - {formatDevelopmentDate(officialPreparation.period.end)}</p>
            {officialPreparation.status === "evidence-selection-required"
              ? <p role="status">Hazırlık için gözlem seçin.</p>
              : <>
                <p role="status">{officialPreparation.evidence.length} seçilmiş gözlem öğretmen incelemesine hazır.</p>
                {officialPreparation.programFields.length === 0
                  ? <p>Seçilen gözlemlerde öğretmenin doğruladığı program alanı bulunmuyor.</p>
                  : officialPreparation.programFields.map((field) => <details key={field.domain}>
                    <summary>{field.domain} · {field.references.length} doğrulanmış kaynak</summary>
                    {field.references.map((reference) => <p key={`${reference.observationId}-${reference.targetId}`}>
                      {reference.referenceCode} · {reference.referenceTitle}<br />
                      <a href={`#development-observation-${reference.observationId}`}>Kaynak gözleme dön</a>
                    </p>)}
                  </details>)}
                {officialPreparation.evidenceWithoutConfirmedProgramLinkCount > 0
                  ? <p>{officialPreparation.evidenceWithoutConfirmedProgramLinkCount} seçili gözlemde doğrulanmış program alanı yok; bu gözlemler kaynak metin olarak korunur.</p>
                  : null}
              </>}
          </section> : null}
          <label className="development-report-field">{copy.evaluation}
            <KeyboardTextarea value={form.teacherEvaluation} aria-label={copy.evaluation} rows={5} maxLength={20000}
              readOnly={approved} disabled={busy} placeholder={copy.evaluationHint}
              onChange={(event) => updateForm({ ...form, teacherEvaluation: event.target.value })} />
          </label>
          <label className="development-report-field">{copy.nextSupport}
            <KeyboardTextarea value={form.nextSupport} aria-label={copy.nextSupport} rows={3} maxLength={20000}
              readOnly={approved} disabled={busy} onChange={(event) => updateForm({ ...form, nextSupport: event.target.value })} />
          </label>
          {approved ? <p role="status">{canExport ? copy.currentSources : sourceStatus ? copy.stale : copy.loading}</p>
            : <label className="development-report-confirm"><input type="checkbox" checked={confirmed} disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)} />{copy.confirm}</label>}
          {workspace && workspace.reports.length > 0 ? <details className="development-report-previous"><summary>{copy.previous}</summary>
            {workspace.reports.map((item) => <button key={item.id} type="button" disabled={busy || item.id === record?.id} onClick={() => loadPrevious(item.id)}>
              {formatDevelopmentDate(item.periodStart)} - {formatDevelopmentDate(item.periodEnd)} · {item.status === "approved" ? copy.approved : copy.draft}
            </button>)}
          </details> : null}
        </>}
      </div>
      <footer className="development-report-editor__footer">
        <p role="status">{status}</p>
        {approved ? <><button type="button" className="development-report-primary" disabled={busy || !canExport} onClick={download}>{copy.pdf}</button>
          <button type="button" disabled={busy} onClick={newDraft}>{copy.newDraft}</button><small>{copy.newDraftHint}</small></>
          : <><button type="button" className="development-report-primary" disabled={busy || !form?.selectedObservationIds.length || !form.teacherEvaluation.trim() || !confirmed} onClick={approve}>{busy ? copy.approving : copy.approve}</button>
            {!form?.selectedObservationIds.length || !form.teacherEvaluation.trim() ? <small>{copy.missing}</small> : !confirmed ? <small>{copy.confirmHint}</small> : null}</>}
      </footer>
    </div>
  </BottomSheet>;
}
