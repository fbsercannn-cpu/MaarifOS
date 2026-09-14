import { useRef, useState } from "react";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { activeSchoolDocumentTemplate, schoolDocumentTemplateRecords, schoolDocumentLogoDimensions, SCHOOL_DOCUMENT_LOGO_MAX_BYTES, type SchoolDocumentLogo, type SchoolDocumentTemplate } from "../../core/domain/school-document-template.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { useTeacherFollowupSnapshot } from "../teacher-followup/TeacherFollowupWorkspace.tsx";
import { requestPdfDocument } from "../documents/pdf-preview-model.ts";
import { appendSchoolDocumentTemplate } from "./school-document-template-service.ts";
import { createSchoolStyledPdf } from "./school-document-template-pdf.ts";
import "./school-document-template.css";

async function localLogo(file: File): Promise<SchoolDocumentLogo> {
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > SCHOOL_DOCUMENT_LOGO_MAX_BYTES) throw new Error("Logo PNG veya JPEG, en fazla 256 KB ve 1024 × 1024 piksel olmalıdır.");
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Logo dosyası okunamadı.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
  const dimensions = schoolDocumentLogoDimensions(dataUrl);
  if (!dimensions) throw new Error("Logo dosyasının biçimi veya piksel ölçüleri geçersiz.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width !== dimensions.width || bitmap.height !== dimensions.height) throw new Error("Logo ölçüleri dosyayla uyuşmuyor.");
    // Decode and re-encode the local raster; camera metadata and unused embedded payloads are not persisted.
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Logo hazırlanamadı.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0);
    const canonical = canvas.toDataURL("image/jpeg", .88), actual = schoolDocumentLogoDimensions(canonical);
    if (!actual) throw new Error("Hazırlanan logo 256 KB sınırını aşıyor. Daha küçük bir görsel seçin.");
    return { dataUrl: canonical, ...actual };
  } finally { bitmap.close(); }
}

export function SchoolDocumentTemplateWorkspace({ store, refreshKey, disabled, onChanged }: { store: LocalDataStore; refreshKey?: unknown; disabled?: boolean; onChanged?(): void }) {
  const { snapshot, error, reload, refresh } = useTeacherFollowupSnapshot(store, refreshKey);
  const mountedScope = useRef<string | null>(null);
  const [, reopen] = useState(0);
  const [message, setMessage] = useState("");
  if (error) return <p role="alert">{error}<button type="button" onClick={reload}>Yeniden dene</button></p>;
  if (!snapshot) return <p role="status">Okul şablonu hazırlanıyor…</p>;
  const scope = resolveActiveClassroomScope(snapshot);
  if (!scope) return <p>Belge şablonu için önce sınıfınızı hazırlayın.</p>;
  const scopeKey = `${scope.academicYearId}/${scope.classroomId}`;
  if (mountedScope.current === null) mountedScope.current = scopeKey;
  if (mountedScope.current !== scopeKey) return <p role="alert">Etkin sınıf değişti. Önceki sınıfın taslağı yeni sınıfa kaydedilmez.<button type="button" onClick={() => { mountedScope.current = scopeKey; setMessage(""); reopen(value => value + 1); }}>Yeni sınıfın şablonunu aç</button></p>;
  const records = schoolDocumentTemplateRecords(snapshot, scope), head = records.at(-1)?.id ?? null;
  const classroom = snapshot.classrooms.find(r => r.id === scope.classroomId)!;
  const teacherName = String(classroom.teacherDisplayName ?? classroom.teacherName ?? "Öğretmen");
  return <div className="school-template" data-testid="school-document-template-workspace">
    <h2>Okul belge şablonu</h2><p>Logo, üst başlık ve imza düzeni bu sınıfın belgelerinde kullanılır. Kaydetmeden önce tam PDF’yi inceleyebilirsiniz.</p>
    {message ? <p role="status">{message}</p> : null}
    <TemplateForm key={`${scope.classroomId}/${head}`} initial={activeSchoolDocumentTemplate(snapshot, scope)} schoolName={String(classroom.schoolName ?? "Okul")} teacherName={teacherName} disabled={!!disabled || snapshot.academicYears.find(r => r.id === scope.academicYearId)?.status === "archived"} save={async template => { await appendSchoolDocumentTemplate(store, { template, expectedScope: scope, expectedHead: head }); await refresh(); setMessage("Okul belge şablonu kaydedildi."); onChanged?.(); }} />
    <p className="school-template-help">{records.length ? `${records.length} şablon sürümü cihazda ve şifreli yedekte korunuyor.` : "Henüz özel şablon kaydedilmedi. Belgeler mevcut düzeni kullanıyor."}</p>
  </div>;
}
function TemplateForm({ initial, schoolName, teacherName, disabled, save }: { initial: SchoolDocumentTemplate; schoolName: string; teacherName: string; disabled: boolean; save(template: SchoolDocumentTemplate): Promise<void> }) {
  const [template, setTemplate] = useState(initial), [headers, setHeaders] = useState(initial.headerLines.join("\n"));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const change = <K extends keyof SchoolDocumentTemplate>(key: K, value: SchoolDocumentTemplate[K]) => setTemplate(previous => ({ ...previous, [key]: value }));
  const value = () => ({ ...template, headerLines: headers.split(/\r?\n/u).map(s => s.normalize("NFC").trim()).filter(Boolean), principalName: template.principalName.normalize("NFC").trim() });
  const run = async (task: () => Promise<unknown>) => { if (busy) return; setBusy(true); setError(""); try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "İşlem tamamlanamadı; kayıtlı şablon korundu."); } finally { setBusy(false); } };
  return <form onSubmit={e => { e.preventDefault(); void run(() => save(value())); }}>
    {error ? <p role="alert">{error}</p> : null}
    <fieldset disabled={disabled || busy}>
      <label>Hazır düzen<select value={template.layout} onChange={e => change("layout", e.target.value as SchoolDocumentTemplate["layout"])}><option value="official">Resmî · logo ortada</option><option value="simple">Sade · logo solda</option></select></label>
      <label>Üst başlıklar · en fazla 3 satır<KeyboardTextarea rows={3} maxLength={482} value={headers} onChange={e => setHeaders(e.target.value)} placeholder="İl / ilçe millî eğitim müdürlüğü&#10;Okulunuzun adı" /></label>
      <label>Okul logosu · PNG veya JPEG<KeyboardInput type="file" accept="image/png,image/jpeg" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void run(async () => change("logo", await localLogo(file))); }} /></label>
      <p className="school-template-help">En fazla 256 KB ve 1024 × 1024 piksel. Logo bu cihazda işlenir.</p>
      {template.logo ? <div className="school-template-logo"><img src={template.logo.dataUrl} alt="Seçilen okul logosu" draggable={false} /><button type="button" onClick={() => change("logo", null)}>Logoyu kaldır</button></div> : null}
      <label>İmza yerleşimi<select value={template.signatureLayout} onChange={e => change("signatureLayout", e.target.value as SchoolDocumentTemplate["signatureLayout"])}><option value="teacher-right">Öğretmen sağda</option><option value="teacher-left">Öğretmen solda</option><option value="teacher-and-principal">Öğretmen ve okul müdürü</option></select></label>
      {template.signatureLayout === "teacher-and-principal" ? <label>Okul müdürü adı soyadı<KeyboardInput value={template.principalName} maxLength={160} onChange={e => change("principalName", e.target.value)} /></label> : null}
      <label>Kâğıt yönü<select value={template.orientation} onChange={e => change("orientation", e.target.value as SchoolDocumentTemplate["orientation"])}><option value="auto">Belgeye uygun · otomatik</option><option value="portrait">A4 dikey</option><option value="landscape">A4 yatay</option></select></label>
      <p className="school-template-help">Otomatik seçim geniş çizelgeleri yatay, bireysel belgeleri dikey hazırlar. Uzun içerik ek sayfalarda eksiksiz devam eder.</p>
      <div className="school-template-actions"><button type="button" onClick={() => void run(() => requestPdfDocument({ title: "Okul şablonu önizlemesi", fields: [{ id: "sample", label: "Tam örnek belge" }], initial: { fields: ["sample"] }, async build() { return { bytes: await createSchoolStyledPdf({ title: "Okul şablonu önizlemesi", orientation: "landscape", nodes: [{ kind: "heading", level: 1, text: "Okul şablonu önizlemesi" }, { kind: "paragraph", text: schoolName }, { kind: "paragraph", tone: "meta", text: "Örnek çizelge · bu sayfada gerçek öğrenci bilgisi bulunmaz." }, { kind: "table", headers: ["Sıra", "Örnek kayıt", "Açıklama"], columnWeights: [1, 3, 5], fontSize: 10, rows: [["1", "Birinci örnek", "Üst başlık, logo, kâğıt yönü ve imza yerleşimi gösterilir."], ["2", "İkinci örnek", "Uzun açıklamalar satıra sığacak biçimde sarılır."]] }] }, value(), { teacherName }), fileName: "okul-sablonu-onizleme.pdf", mimeType: "application/pdf" }; } }))}>Tam PDF önizlemesi</button><button type="submit" className="school-template-primary">Şablonu kaydet</button></div>
    </fieldset>
  </form>;
}
