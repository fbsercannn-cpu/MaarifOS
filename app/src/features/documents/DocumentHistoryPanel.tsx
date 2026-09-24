import { useEffect, useRef, useState } from "react";
import { DOCUMENT_HISTORY_CHANGED_EVENT, documentVersionFile, listDocumentVersions, type DocumentHistoryContext } from "./document-history-service.ts";
import type { DocumentVersionRecord } from "../../core/domain/document-history.ts";
import { downloadBrowserFile } from "./browser-file-download.ts";
import { requestPdfPreview } from "./pdf-preview-model.ts";
import "./document-completion.css";

export interface DocumentHistoryPanelProps extends DocumentHistoryContext { readonly refreshKey?: unknown; }
export function DocumentHistoryPanel({ store, scope, refreshKey }: DocumentHistoryPanelProps) {
  const [records, setRecords] = useState<DocumentVersionRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  useEffect(() => { const changed = () => setHistoryRevision(v => v + 1); window.addEventListener(DOCUMENT_HISTORY_CHANGED_EVENT, changed); return () => window.removeEventListener(DOCUMENT_HISTORY_CHANGED_EVENT, changed); }, []);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current; setRecords([]); setError("");
    void listDocumentVersions({ store, scope }).then(next => { if (current === generation.current) setRecords(next); }).catch(reason => { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Belge geçmişi okunamadı."); });
    return () => { ++generation.current; };
  }, [store, scope.academicYearId, scope.classroomId, refreshKey, historyRevision]);
  const open = async (record: DocumentVersionRecord) => {
    if (busy) return; setBusy(true); setError(""); const current = generation.current;
    try {
      const live = (await listDocumentVersions({ store, scope })).find(candidate => candidate.id === record.id);
      if (!live) throw new Error("Belge sürümü artık bu sınıfın geçmişinde bulunmuyor.");
      const file = await documentVersionFile(live);
      if (current !== generation.current) return;
      if (!requestPdfPreview(file, { historical: true, warning: "Bu dosya önceki bir sürümdür; güncel kaynak değişikliklerini içermez." })) downloadBrowserFile(file);
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Belge sürümü açılamadı."); }
    finally { setBusy(false); }
  };
  return <section className="document-history-panel" aria-label="Belge sürüm geçmişi"><h3>Önceki belge sürümleri</h3><p>İndirme, yazdırma veya paylaşım için hazırlanan PDF'ler seçimleriyle saklanır. Önceki sürümler güncel kaynak değişikliklerini içermez.</p>
    {error && <p role="alert">{error}</p>}
    {!records.length && !error && <p>Henüz saklanan belge sürümü yok.</p>}
    {records.map(record => <article key={record.id}><strong>{record.title}</strong><p>{record.civilDate} · {record.selection.fields.length} alan · {record.studentIds.length} öğrenci · {record.fileName}</p><button type="button" disabled={busy} onClick={() => void open(record)}>Bu sürümü aç</button></article>)}
    <p>Sınıf başına en fazla 20 sürüm / 10 MB; PDF başına 2 MB. Sınır dolduğunda eski sürümler silinmez.</p>
  </section>;
}
