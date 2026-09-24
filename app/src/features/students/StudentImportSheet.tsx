import { useMemo, useRef, useState } from "react";
import { BottomSheet, KeyboardInput, KeyboardTextarea } from "../../mobile";
import { splitStudentDisplayName } from "../../core/domain/student.ts";
import { ParentSurnameSuggestion } from "./ParentSurnameSuggestion.tsx";
import { StudentAddressField } from "./StudentAddressField.tsx";
import type { StudentHomeAddressParts } from "../../core/domain/student-home-address.ts";
import { IMPORT_FIELDS, importCandidates, readStudentWorkbook, reviewImportCandidates, suggestImportMapping, importSelectionStillReviewed, type ImportCandidate, type ImportExistingStudent, type ImportField, type ImportMapping, type ImportSheet } from "./student-spreadsheet-import.ts";
import type { StudentImportSelection } from "./student-import-service.ts";
import "./student-import.css";

export function StudentImportSheet({ civilDate, classroomName, existing, onClose, onCommit }: {
  civilDate: string; classroomName: string; existing: readonly ImportExistingStudent[];
  onClose(): void; onCommit(selections: readonly StudentImportSelection[]): Promise<void>;
}) {
  const [sheets, setSheets] = useState<ImportSheet[]>([]), [sheetIndex, setSheetIndex] = useState(0), [header, setHeader] = useState(0);
  const [mapping, setMapping] = useState<ImportMapping>({}), [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [excluded, setExcluded] = useState(0), [selected, setSelected] = useState<Map<string, readonly string[]>>(new Map()), [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const busyRef = useRef(false);
  const reviews = useMemo(() => reviewImportCandidates(candidates ?? [], existing, civilDate), [candidates, existing, civilDate]);
  const ready = reviews.filter(review => importSelectionStillReviewed(review, selected.get(review.candidate.id)));
  const sheet = sheets[sheetIndex];
  const chooseSheet = (index: number) => { setSheetIndex(index); setHeader(sheets[index].suggestedHeader); setMapping(sheets[index].suggestedMapping); setCandidates(null); setSelected(new Map()); setError(""); };
  const loadFile = async (file?: File) => {
    if (!file || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(""); setSheets([]); setCandidates(null); setSelected(new Map());
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Dosya 10 MB sınırından büyük.");
      const parsed = readStudentWorkbook(await file.arrayBuffer(), file.name);
      setSheets(parsed); setFilename(file.name); setSheetIndex(0); setHeader(parsed[0].suggestedHeader); setMapping(parsed[0].suggestedMapping);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Dosya okunamadı."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const preview = () => {
    if (!sheet) return;
    try {
      const result = importCandidates(sheet, header, mapping);
      if (!result.candidates.length) throw new Error("Seçilen başlığın altında öğrenci satırı bulunamadı.");
      setCandidates(result.candidates); setExcluded(result.excludedRows);
      setSelected(new Map(reviewImportCandidates(result.candidates, existing, civilDate).filter(r => !r.errors.length && !r.flag).map(r => [r.candidate.id, []]))); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Tablo önizlenemedi."); }
  };
  const commit = async () => {
    if (busyRef.current || !ready.length) return;
    busyRef.current = true; setBusy(true); setError("");
    try { await onCommit(ready.map(review => ({ candidate: review.candidate, acknowledgedDuplicateIds: selected.get(review.candidate.id)! }))); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Aktarım kaydedilemedi. Tekrar deneyebilirsiniz."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const updateCandidateValue = (candidateId: string, field: ImportField, value: string) => {
    setCandidates(current => current!.map(candidate => candidate.id === candidateId
      ? { ...candidate, values: { ...candidate.values, [field]: value } } : candidate));
    setSelected(current => { const next = new Map(current); next.delete(candidateId); return next; });
  };
  const updateCandidateAddress = (candidateId: string, value: string, homeAddressParts?: StudentHomeAddressParts) => {
    setCandidates(current => current!.map(candidate => candidate.id === candidateId
      ? { ...candidate, homeAddressParts, values: { ...candidate.values, homeAddress: value } } : candidate));
    setSelected(current => { const next = new Map(current); next.delete(candidateId); return next; });
  };
  return <BottomSheet open onOpenChange={open => { if (!open && !busyRef.current) onClose(); }} title="Excel'den öğrenci ekle" description={`${classroomName} · Dosya seç, kontrol et, sınıfa ekle`} snap={0.96}>
    <div className="student-import">
      <div className="student-import__intro"><strong>Veli iletişim listeniz hazırsa yeniden yazmayın.</strong><p>Anne, baba, meslekler ve 3. kişi sütunları otomatik eşleştirilir. Dosya bu cihazda okunur; öğrenci kayıtları son adımda eklenir.</p></div>
      <label className="student-import__file"><span>Excel / CSV dosyası</span><span className="student-import__file-button">{filename ? "Başka dosya seç" : "Dosya seç"}</span><input aria-label="Excel / CSV dosyası" type="file" accept=".xls,.xlsx,.csv,.tsv" disabled={busy} onChange={event => { void loadFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
      <small>Eski .xls ve yeni .xlsx desteklenir · En fazla 10 MB / 1.000 öğrenci</small>
      {sheet ? <>
        <p className="student-import__filename">{filename}</p>
        {!candidates ? <>
          <div className="student-import__grid"><label>Çalışma sayfası<select value={sheetIndex} onChange={event => chooseSheet(Number(event.target.value))}>{sheets.map((item, i) => <option key={item.name} value={i}>{item.name}</option>)}</select></label>
          <label>Başlık satırı<select value={header} onChange={event => { const row = Number(event.target.value); setHeader(row); setMapping(suggestImportMapping(sheet.rows, row)); }}>{sheet.rows.slice(0, 20).map((_, i) => <option key={i} value={i}>Excel satırı {i + 1}</option>)}</select></label></div>
          <details className="student-import__mapping" open><summary>Sütun eşleştirmesini kontrol et</summary><p>Adres ve özel not sütunları dosyanızda varsa buradan seçebilirsiniz.</p>
            <div className="student-import__grid">{Object.entries(IMPORT_FIELDS).map(([field, label]) => <label key={field}>{label}<select aria-label={`${label} sütunu`} value={mapping[field as ImportField] ?? ""} onChange={event => setMapping(current => { const next = { ...current }; if (event.target.value === "") delete next[field as ImportField]; else next[field as ImportField] = Number(event.target.value); return next; })}><option value="">Dosyada yok / aktarma</option>{sheet.rows[header].map((value, i) => <option key={i} value={i}>{i + 1}. sütun · {value || "Başlıksız"}</option>)}</select></label>)}</div>
          </details>
          <button type="button" className="sheet-primary" onClick={preview} disabled={busy || mapping.displayName === undefined}>Öğrencileri önizle</button>
        </> : <>
          <div className="student-import__summary" role="status"><strong>{candidates.length} öğrenci satırı · {ready.length} seçili</strong><span>{reviews.filter(r => r.errors.length).length} hatalı · {reviews.filter(r => r.flag).length} mükerrer adayı · {excluded} boş / öğrenci dışı satır</span></div>
          <p className="student-import__hint">Hatalı bilgileri satırın ayrıntılarında düzeltebilirsiniz. Mükerrer adayları kendiliğinden seçilmez; mevcut kayıtlar değiştirilmez. İletişim kaydı teslim alma yetkisi sayılmaz.</p>
          <div className="student-import__tools"><button type="button" disabled={busy} onClick={() => { setCandidates(null); setSelected(new Map()); }}>Sütunlara dön</button><button type="button" disabled={busy} onClick={() => setSelected(new Map(reviews.filter(r => !r.errors.length && !r.flag).map(r => [r.candidate.id, []])))}>Hatasızları seç</button><button type="button" disabled={busy} onClick={() => setSelected(new Map())}>Seçimi kaldır</button></div>
          <ol className="student-import__rows">{reviews.map(review => <li key={review.candidate.id} data-import-row={review.candidate.sourceRow}>
            <label className="student-import__selection"><input type="checkbox" disabled={busy || !!review.errors.length} checked={importSelectionStillReviewed(review, selected.get(review.candidate.id))} onChange={event => setSelected(current => { const next = new Map(current); if (event.target.checked) next.set(review.candidate.id, [...review.duplicateIds]); else next.delete(review.candidate.id); return next; })} /><span><small>Excel satırı {review.candidate.sourceRow}</small><strong>{review.candidate.values.displayName || "Ad soyad eksik"}</strong><small>{review.flag ? "İnceledim, ayrı öğrenci olarak ekle" : "Sınıfa ekle"}</small></span></label>
            {review.flag ? <p className="student-import__warning">Mükerrer adayı · Ad soyad, kimlik veya öğrenci numarası eşleşiyor. Silinen öğrenciler ve dosyadaki diğer satırlar da denetlendi.</p> : null}
            {review.errors.map(message => <p className="student-import__error" key={message}>{message}</p>)}
            {review.warnings.map(message => <p className="student-import__warning" key={message}>{message}</p>)}
            <details><summary>Bilgileri gör / düzelt</summary><div className="student-import__grid">{Object.entries(IMPORT_FIELDS).map(([field, label]) => {
              const importField = field as ImportField;
              const parentKind = field === "motherName" ? "mother" : field === "fatherName" ? "father" : null;
              const multiline = field === "homeAddress" || field === "childPrivateNotes" || field === "familySituationNotes";
              const fieldId = `student-import-${review.candidate.id}-${field}`;
              if (field === "homeAddress") return <div key={field} className="student-import__field student-import__field--wide">
                <StudentAddressField id={fieldId} value={review.candidate.values.homeAddress}
                  parts={review.candidate.homeAddressParts} disabled={busy}
                  onChange={(value, parts) => updateCandidateAddress(review.candidate.id, value, parts)} />
              </div>;
              return <div key={field} className={`student-import__field${multiline ? " student-import__field--wide" : ""}`}>
                <label htmlFor={fieldId}>{label}</label>{multiline ? <KeyboardTextarea id={fieldId} value={review.candidate.values[importField]} disabled={busy} rows={3}
                  maxLength={field === "childPrivateNotes" ? 2_000 : 1_000}
                  autoComplete="off"
                  onChange={event => updateCandidateValue(review.candidate.id, importField, event.target.value)} />
                  : <KeyboardInput id={fieldId} value={review.candidate.values[importField]} disabled={busy}
                    onChange={event => updateCandidateValue(review.candidate.id, importField, event.target.value)} />}
                {parentKind ? <ParentSurnameSuggestion childLastName={splitStudentDisplayName(review.candidate.values.displayName).lastName}
                  parentName={review.candidate.values[importField]} kind={parentKind} disabled={busy}
                  onApply={name => updateCandidateValue(review.candidate.id, importField, name)} /> : null}
              </div>;
            })}</div><p>Bilgileri düzelttikten sonra satırı yeniden seçin.</p></details>
          </li>)}</ol>
          <div className="student-import__footer"><span>{ready.length} / {candidates.length} öğrenci eklenecek</span><button type="button" className="sheet-primary" disabled={busy || !ready.length} onClick={() => void commit()}>{busy ? "Kaydediliyor…" : `${ready.length} öğrenciyi sınıfa ekle`}</button></div>
        </>}
      </> : null}
      {error ? <p className="student-import__error" role="alert">{error}</p> : null}
      {busy && !candidates ? <p role="status">Dosya okunuyor…</p> : null}
    </div>
  </BottomSheet>;
}
