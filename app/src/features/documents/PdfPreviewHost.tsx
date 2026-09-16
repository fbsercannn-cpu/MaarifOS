import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { installPdfPreviewPresenter, preparePdfArtifact, downloadPreparedPdfArtifact, validatePdfSelection, pdfFieldsForSelection,
  type PdfPreviewRequest, type PdfPreviewSelection, type PreparedPdfArtifact } from "./pdf-preview-model.ts";
import { downloadBrowserFile } from "./browser-file-download.ts";
import { documentOutputPresets, selectDocumentOutputPreset, DOCUMENT_OUTPUT_COPY } from "./document-output-presets.ts";
import {
  DOCUMENT_EXPORT_PURPOSES,
  DOCUMENT_EXPORT_RECIPIENTS,
  assertDocumentExportIntent,
  documentExportChannelNotice,
  documentExportScopeSummary,
  type DocumentExportPurpose,
  type DocumentExportRecipient,
} from "./document-export-intent.ts";
import "./pdf-preview.css";
import { saveDocumentVersion, type DocumentHistoryContext } from "./document-history-service.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import type { BrowserFileDownload } from "./browser-file-download.ts";

const PdfPageCanvas = lazy(() => import("./PdfPageCanvas.tsx"));

export interface PdfPreviewHostProps { readonly sourceRevision: unknown; readonly historyStore?: LocalDataStore; readonly historyScope?: ActiveClassroomScope; }
export function PdfPreviewHost({ sourceRevision, historyStore, historyScope }: PdfPreviewHostProps) {
  const revision = useRef(sourceRevision); revision.current = sourceRevision;
  const requestId = useRef(0);
  const [request, setRequest] = useState<(PdfPreviewRequest & { sourceRevision: unknown; id: number }) | null>(null);
  const currentRequest = useRef(request); currentRequest.current = request;
  useEffect(() => installPdfPreviewPresenter((next) => {
    currentRequest.current?.complete("cancelled");
    setRequest({ ...next, sourceRevision: revision.current, id: ++requestId.current });
  }), []);
  useEffect(() => () => currentRequest.current?.complete("cancelled"), []);
  if (!request) return null;
  return <PdfPreviewDialog key={request.id}
    request={request} stale={request.sourceRevision !== sourceRevision}
    history={historyStore && historyScope ? { store: historyStore, scope: historyScope } : undefined}
    onRefresh={async selection => {
      if (!request.recipe?.refresh) throw new Error("Bu belge güncel kaynak ekranından yeniden hazırlanmalıdır.");
      const expectedRevision = revision.current;
      const next = await request.recipe.refresh(structuredClone(selection));
      if (currentRequest.current?.id !== request.id || revision.current !== expectedRevision) throw new Error("Kaynak güncelleme sırasında yeniden değişti. Aynı seçimlerle tekrar güncelleyin.");
      validatePdfSelection(next, selection);
      setRequest({ ...request, file: undefined, recipe: { ...next, initial: structuredClone(selection) }, sourceRevision: expectedRevision });
    }}
    onClose={() => { request.complete("cancelled"); setRequest(null); }} />;
}

function PdfPreviewDialog({ request, stale, history, onRefresh, onClose }: {
  request: PdfPreviewRequest; stale: boolean; history?: DocumentHistoryContext; onRefresh(selection: PdfPreviewSelection): Promise<void>; onClose(): void;
}) {
  const recipe = request.recipe;
  const [selection, setSelection] = useState<PdfPreviewSelection>(recipe?.initial ?? { fields: ["content"] });
  const [artifact, setArtifact] = useState<PreparedPdfArtifact | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");
  const lastPrepared = useRef<{ file: BrowserFileDownload; selection: PdfPreviewSelection } | null>(null);
  const [recipient, setRecipient] = useState<DocumentExportRecipient>("teacher-preparation");
  const [purpose, setPurpose] = useState<DocumentExportPurpose>("lesson-preparation");
  const [secondaryActionsOpen, setSecondaryActionsOpen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 601px)").matches,
  );
  const sequence = useRef(0);
  const mounted = useRef(true);
  const actionInFlight = useRef(false);
  const selectionKey = JSON.stringify(selection);
  const intentKey = `${recipient}:${purpose}`;
  const initialKey = JSON.stringify(recipe?.initial ?? selection);
  const latest = useRef({ stale, artifact, selectionKey, intentKey });
  latest.current = { stale, artifact, selectionKey, intentKey };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++sequence.current; }; }, []);
  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 601px)");
    const updateForViewport = (event: MediaQueryListEvent) => setSecondaryActionsOpen(event.matches);
    viewport.addEventListener("change", updateForViewport);
    return () => viewport.removeEventListener("change", updateForViewport);
  }, []);
  useEffect(() => {
    const generation = ++sequence.current;
    let current: PreparedPdfArtifact | undefined;
    setArtifact(null); setError(""); setStatus("");
    if (stale) { setBusy(false); return; }
    setBusy(true);
    void (async () => {
      if (recipe) validatePdfSelection(recipe, selection);
      const file = request.file && selectionKey === initialKey ? request.file : await recipe!.build(selection);
      if (sequence.current !== generation) return;
      current = preparePdfArtifact(file);
      lastPrepared.current = { file: { ...file, bytes: file.bytes.slice() }, selection: structuredClone(selection) };
      setArtifact(current);
    })().catch((reason: unknown) => { if (sequence.current === generation) setError(reason instanceof Error ? reason.message : "PDF hazırlanamadı. Kaynağı kontrol ederek yeniden deneyin."); })
      .finally(() => { if (sequence.current === generation) setBusy(false); });
    return () => { ++sequence.current; current?.dispose(); };
  }, [request, recipe, selectionKey, initialKey, stale]);

  const fields = recipe ? pdfFieldsForSelection(recipe, selection) : [];
  const outputPresets = recipe ? documentOutputPresets(recipe, selection) : [];
  const exportScope = useMemo(
    () => documentExportScopeSummary(recipe?.students, selection),
    [recipe?.students, selectionKey],
  );
  const exportIntent = { recipient, purpose } as const;
  const recipientLabel = DOCUMENT_EXPORT_RECIPIENTS.find((option) => option.id === recipient)?.label ?? recipient;
  const purposeLabel = DOCUMENT_EXPORT_PURPOSES.find((option) => option.id === purpose)?.label ?? purpose;
  const compactStudentScopeLabel = recipe?.students
    ? exportScope.selectedStudentLabels.length === 1
      ? exportScope.selectedStudentLabels[0]
      : exportScope.selectedStudentLabels.length > 1
        ? `${exportScope.selectedStudentLabels.length} çocuk seçili`
        : "Çocuk seçilmedi"
    : "Önizlemede doğrulanmalı";
  const compactSelectionSummary = recipe?.students === undefined
    ? `${exportScope.selectedFieldCount} alan · çocuk kapsamını kontrol edin`
    : `${exportScope.selectedFieldCount} alan · ${exportScope.selectedStudentIds.length} çocuk`;
  const exportActions = recipe?.exportActions?.filter((action) => !action.templates || (selection.template && action.templates.includes(selection.template))) ?? [];
  const fieldGroups = new Map<string, typeof fields[number][]>();
  fields.forEach((field) => { const group = field.group ?? ""; fieldGroups.set(group, [...(fieldGroups.get(group) ?? []), field]); });
  const update = (patch: Partial<PdfPreviewSelection>) => {
    if (actionInFlight.current || stale) return;
    if (JSON.stringify({ ...selection, ...patch }) === selectionKey) return;
    setArtifact(null); setSelection((previous) => ({ ...previous, ...patch }));
  };
  const changeTemplate = (template: string) => {
    const nextFields = recipe?.fieldsForTemplate ? recipe.defaultFieldsForTemplate?.[template]
      ?? pdfFieldsForSelection(recipe, { template }).map((field) => field.id) : selection.fields;
    update({ template, fields: nextFields, ...(recipe?.layoutTemplates && !recipe.layoutTemplates.includes(template) ? { layout: undefined } : {}) });
  };
  const toggle = (kind: "fields" | "studentIds", id: string) => {
    const previous = selection[kind] ?? [];
    update({ [kind]: previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id] });
  };
  const runAction = async (operation: (current: PreparedPdfArtifact, assertCurrent: () => Promise<void>) => Promise<void>) => {
    if (!artifact || stale || busy || actionInFlight.current) return;
    const currentArtifact = artifact, currentKey = selectionKey, currentIntentKey = intentKey, generation = sequence.current;
    actionInFlight.current = true; setSharing(true); setError(""); setStatus("");
    const check = () => {
      if (!mounted.current || latest.current.stale || latest.current.artifact !== currentArtifact
        || latest.current.selectionKey !== currentKey || latest.current.intentKey !== currentIntentKey
        || sequence.current !== generation) {
        throw new Error("Belgenin kaynağı veya seçimi değişti. Güncel belgeyi yeniden hazırlayın.");
      }
    };
    const assertCurrent = async () => {
      check(); if (recipe) validatePdfSelection(recipe, selection);
      assertDocumentExportIntent(exportIntent, exportScope);
      await recipe?.assertExportAllowed?.(selection); check();
    };
    try {
      await assertCurrent();
      if (history && !request.historical) {
        const bytes = new Uint8Array(await currentArtifact.blob.arrayBuffer());
        try { await saveDocumentVersion(history, { file: { bytes, mimeType: "application/pdf", fileName: currentArtifact.fileName }, title: request.title, selection, assertCurrent }); setHistoryNotice(""); }
        catch (reason) { setHistoryNotice(`Dosya çıktısı devam ediyor; bu sürüm geçmişe eklenemedi. ${reason instanceof Error ? reason.message : "Kalıcı kayıt hatası."}`); }
        await assertCurrent();
      }
      await operation(currentArtifact, assertCurrent);
    }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Belge dışa aktarılamadı. Yeniden deneyin."); }
    finally { actionInFlight.current = false; if (mounted.current) setSharing(false); }
  };
  const download = () => runAction(async (current, assertCurrent) => {
    await assertCurrent(); downloadPreparedPdfArtifact(current);
    setStatus("Önizlemedeki PDF indirildi."); request.complete("downloaded");
  });
  const print = () => runAction(async (current, assertCurrent) => {
    setStatus("Seçilen PDF sayfaları yazdırma için hazırlanıyor…");
    const { printPreparedPdfArtifact } = await import("./print-pdf-artifact.ts");
    await printPreparedPdfArtifact(current, assertCurrent);
    if (mounted.current) setStatus("Yazdırma penceresi açıldı. Yazıcı ve kâğıt ayarlarını bu pencereden seçebilirsiniz.");
  });
  const exportFile = (action: NonNullable<NonNullable<typeof recipe>["exportActions"]>[number]) => runAction(async (_current, assertCurrent) => {
    setStatus("Seçilen alanlarla dosya hazırlanıyor…");
    const file = await action.build(selection);
    await assertCurrent(); downloadBrowserFile(file);
    setStatus(`${action.label}: seçilen alanlar ve öğrenciler dışa aktarıldı.`);
  });
  const share = async () => {
    if (!artifact || stale || busy || actionInFlight.current) return;
    if (request.warning && !window.confirm(request.warning)) return;
    await runAction(async (current, assertCurrent) => {
      const fallback = async () => { await assertCurrent(); downloadPreparedPdfArtifact(current); setStatus("Önizlemedeki PDF indirildi."); request.complete("downloaded"); };
      const file = new File([current.blob], current.fileName, { type: "application/pdf" });
      const data = { files: [file], title: request.title };
      if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) { await fallback(); return; }
      await assertCurrent();
      try { await navigator.share(data); if (mounted.current) setStatus("Önizlemedeki PDF paylaşıldı."); request.complete("shared"); }
      catch (reason) { if (!(reason instanceof Error && reason.name === "AbortError")) await fallback(); }
    });
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="pdf-preview-overlay" /><Dialog.Content className="pdf-preview-dialog" aria-describedby="pdf-preview-description">
      <header><div><Dialog.Title>PDF önizlemesi</Dialog.Title><p>{request.title}</p></div><Dialog.Close aria-label="PDF önizlemesini kapat">Kapat</Dialog.Close></header>
      <Dialog.Description id="pdf-preview-description">{exportActions.length ? "Alanları ve öğrencileri seçin. PDF ve diğer dosya biçimleri aynı seçimi kullanır." : "Basılacak gerçek PDF sayfaları. İndirme ve paylaşım burada gördüğünüz dosyayı kullanır."}</Dialog.Description>
      <div className="pdf-preview-body">
        <section className="pdf-export-review" aria-label="Çıkış öncesi belge kapsamı">
          <dl>
            <div><dt>Çocuk kapsamı</dt><dd>{compactStudentScopeLabel}</dd></div>
            <div><dt>Alan kapsamı</dt><dd>{exportScope.selectedFieldCount} seçili alan</dd></div>
            <div><dt>Alıcı</dt><dd>{recipientLabel}</dd></div>
            <div><dt>Amaç</dt><dd>{purposeLabel}</dd></div>
          </dl>
        </section>
        <details className="pdf-preview-options">
          <summary><span>Şablon ve seçimleri düzenle</span><small>{compactSelectionSummary}</small></summary>
          <div className="pdf-preview-options__body">
            {outputPresets.length > 0 && <fieldset className="document-output-presets"><legend>{DOCUMENT_OUTPUT_COPY.title}</legend><p>{DOCUMENT_OUTPUT_COPY.detail}</p><div className="pdf-selection-actions">{outputPresets.map(preset => <button key={preset.id} type="button" disabled={stale || sharing} aria-pressed={preset.patch.appearance ? (selection.appearance ?? "color") === preset.patch.appearance : preset.patch.fields?.length === selection.fields.length && preset.patch.fields.every(id => selection.fields.includes(id))} onClick={() => {
              try { update(selectDocumentOutputPreset(recipe!, selection, preset.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Düzen seçilemedi."); }
            }}>{preset.label}</button>)}</div>{selection.appearance === "ink-saving" && <p>{DOCUMENT_OUTPUT_COPY.printDetail}</p>}</fieldset>}
            {recipe?.description && <p>{recipe.description}</p>}
            {recipe?.layouts && (!recipe.layoutTemplates || recipe.layoutTemplates.includes(selection.template ?? "")) && <label>Sayfa düzeni<select aria-label="Sayfa düzeni" disabled={stale || sharing} value={selection.layout ?? ""} onChange={event => update({ layout: event.target.value || undefined })}>
              <option value="">Klasik çizelge</option>
              {recipe.layouts.map(layout => <option key={layout.id} value={layout.id}>{layout.label}</option>)}
            </select></label>}
            {recipe?.templates && <label>Hazır şablon<select disabled={stale || sharing} value={selection.template} onChange={(event) => changeTemplate(event.target.value)}>
              {recipe.templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </select></label>}
            {recipe?.period && <fieldset><legend>Belge dönemi</legend><label>Başlangıç<input type="date" disabled={stale || sharing} min={recipe.period.min} max={recipe.period.max} value={selection.periodStart} onChange={(event) => update({ periodStart: event.target.value })} /></label>
              <label>Bitiş<input type="date" disabled={stale || sharing} min={recipe.period.min} max={recipe.period.max} value={selection.periodEnd} onChange={(event) => update({ periodEnd: event.target.value })} /></label></fieldset>}
            {recipe && <fieldset><legend>Belgeye alınacak alanlar · {selection.fields.filter((id) => fields.some((field) => field.id === id)).length}/{fields.length}</legend>
              <div className="pdf-selection-actions"><button type="button" disabled={stale || sharing} onClick={() => update({ fields: fields.map((field) => field.id) })}>Tüm alanları seç</button><button type="button" disabled={stale || sharing} onClick={() => update({ fields: [] })}>Alan seçimini temizle</button></div>
              {[...fieldGroups].map(([group, choices]) => {
                const inputs = choices.map((field) => <label key={field.id} className="pdf-preview-choice"><input type="checkbox" disabled={stale || sharing} checked={selection.fields.includes(field.id)} onChange={() => toggle("fields", field.id)} />{field.label}</label>);
                return group ? <details key={group} className="pdf-field-group" open={group === "Öğrenci"}><summary>{group}<span>{choices.filter((field) => selection.fields.includes(field.id)).length}/{choices.length}</span></summary><div>{inputs}</div></details> : <div key="ungrouped" className="pdf-field-choices">{inputs}</div>;
              })}
            </fieldset>}
            {recipe?.students && <fieldset><legend>Öğrenci kapsamı</legend><div className="pdf-selection-actions"><button type="button" disabled={stale || sharing} onClick={() => update({ studentIds: recipe.students!.map((student) => student.id) })}>Tüm öğrenciler</button><button type="button" disabled={stale || sharing} onClick={() => update({ studentIds: [] })}>Seçimi temizle</button></div>
              {recipe.students.map((student) => <label key={student.id} className="pdf-preview-choice"><input type="checkbox" disabled={stale || sharing} checked={selection.studentIds?.includes(student.id) ?? false} onChange={() => toggle("studentIds", student.id)} />{student.label}</label>)}</fieldset>}
            <fieldset className="pdf-export-intent"><legend>Alıcı ve kullanım amacı</legend>
              <div className="pdf-export-review__choices">
                <label>Alıcı<select value={recipient} disabled={stale || sharing} onChange={(event) => {
                  const next = event.target.value as DocumentExportRecipient;
                  setRecipient(next);
                  if (next === "selected-student-family") setPurpose("family-information");
                  else if (next === "official-system-preparation") setPurpose("official-process");
                  else if (purpose === "family-information" || purpose === "official-process") setPurpose("lesson-preparation");
                }}>
                  {DOCUMENT_EXPORT_RECIPIENTS.map((option) => <option key={option.id} value={option.id}
                    disabled={option.id === "selected-student-family" && exportScope.selectedStudentIds.length !== 1}>{option.label}</option>)}
                </select></label>
                <label>Amaç<select value={purpose} disabled={stale || sharing} onChange={(event) => {
                  const next = event.target.value as DocumentExportPurpose;
                  setPurpose(next);
                  if (next === "family-information") setRecipient("selected-student-family");
                  else if (next === "official-process") setRecipient("official-system-preparation");
                  else if (recipient === "selected-student-family" || recipient === "official-system-preparation") setRecipient("teacher-preparation");
                }}>
                  {DOCUMENT_EXPORT_PURPOSES.map((option) => <option key={option.id} value={option.id}
                    disabled={option.id === "family-information" && exportScope.selectedStudentIds.length !== 1}>{option.label}</option>)}
                </select></label>
              </div>
              <p className="pdf-export-intent__notice">{documentExportChannelNotice(exportIntent)}</p>
            </fieldset>
          </div>
        </details>
        {stale && <div role="alert"><p>Belgenin kaynak kayıtları değişti. Eski dosyanın indirilmesi durduruldu.</p>{recipe?.refresh ? <button type="button" disabled={refreshing || sharing} onClick={() => {
          if (refreshing) return;
          setRefreshing(true); setError("");
          void (async () => {
            if (history && lastPrepared.current) {
              try { await saveDocumentVersion(history, { ...lastPrepared.current, title: request.title }); }
              catch (reason) { setHistoryNotice(`Önceki önizleme geçmişe eklenemedi. ${reason instanceof Error ? reason.message : "Kalıcı kayıt hatası."}`); }
            }
            await onRefresh(selection);
          })().catch(reason => setError(reason instanceof Error ? reason.message : "Belge güncellenemedi.")).finally(() => setRefreshing(false));
        }}>{refreshing ? "Aynı seçimler güncelleniyor…" : "Aynı seçimlerle güncelle"}</button> : <p>Güncel kapsamı almak için bu pencereyi kapatıp belgeyi yeniden hazırlayın.</p>}</div>}
        {busy && <p role="status">Seçilen kapsamla PDF hazırlanıyor…</p>}
        {error && <p role="alert">{error}</p>}
        {historyNotice && <p role="alert">{historyNotice}</p>}
        {request.historical && <p>Önceki sürüm: bu dosya güncel kaynak değişikliklerini içermez.</p>}
        {artifact && !stale && <Suspense fallback={<p role="status">PDF sayfaları açılıyor…</p>}><PdfPageCanvas artifact={artifact} /></Suspense>}
      </div>
      <footer><p role="status">{status || (artifact && !stale ? `${artifact.fileName} · ${artifact.byteLength.toLocaleString("tr-TR")} bayt` : "")}</p><div className="pdf-preview-primary-actions">
        {recipe?.printEnabled && <button type="button" disabled={!artifact || stale || busy || sharing} onClick={() => void print()}>Yazdır</button>}
        <button type="button" disabled={!artifact || stale || busy || sharing} onClick={() => void download()}>Bu PDF'yi indir</button>
        <details className="pdf-preview-secondary-actions" open={secondaryActionsOpen}
          onToggle={(event) => setSecondaryActionsOpen(event.currentTarget.open)}>
          <summary>Diğer işlemler</summary>
          <div className="pdf-preview-secondary-menu">
            {exportActions.map((action) => <button key={action.id} type="button" disabled={!artifact || stale || busy || sharing} onClick={() => void exportFile(action)}>{action.label}</button>)}
            <button type="button" disabled={!artifact || stale || busy || sharing} onClick={() => void share()}>Bu PDF'yi paylaş</button>
          </div>
        </details>
      </div></footer>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
