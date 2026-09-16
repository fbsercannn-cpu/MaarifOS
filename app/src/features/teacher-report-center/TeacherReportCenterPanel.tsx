import {resolveActiveClassroomScope} from "../../core/domain/classroom-scope.ts";
import {lazy,Suspense,useEffect,useRef,useState} from "react";
import type {LocalDataStore} from "../../core/repository/contracts.ts";
import type {DataSnapshot} from "../../core/domain/model.ts";
import {civilDateInIstanbul} from "../../core/domain/attendance.ts";
import {isDocumentVersionRecord} from "../../core/domain/document-history.ts";
import {KeyboardInput} from "../../mobile";
import {requestPdfDocument} from "../documents/pdf-preview-model.ts";
import {completeTeacherAssessments} from "../evidence/teacher-assessment-completion.ts";
import {teacherReportModel,REPORT_PERIODS,REPORT_FIELDS,type ReportPeriod,type TeacherReportModel} from "./teacher-report-model.ts";
import "./teacher-report-center.css";
const WorkPackageCenter=lazy(()=>import("../work-packages/WorkPackageCenter.tsx").then(m=>({default:m.WorkPackageCenter})));
export interface TeacherReportCenterPanelProps{store:LocalDataStore;refreshKey?:string|number;disabled?:boolean;onChanged?:()=>void;onOpenPlan?:(planId:string)=>void;onPreparePlan?:(civilDate:string)=>void;onOpenObservation?:(observationId:string)=>void;onOpenCapture?:()=>void;onOpenAssessment?:(civilDate:string)=>void;onOpenStudentReport?:(studentId:string)=>void;onOpenMonthlyEvaluation?:(monthlyPlanId:string)=>void;onOpenHistory?:()=>void;}
export function TeacherReportCenterPanel(props:TeacherReportCenterPanelProps){
 const {store,refreshKey,disabled=false}=props;
 const [snapshot,setSnapshot]=useState<DataSnapshot|null>(null),[period,setPeriod]=useState<ReportPeriod>("month"),[day,setDay]=useState(civilDateInIstanbul(new Date())),[termStart,setTermStart]=useState(""),[termEnd,setTermEnd]=useState(""),[children,setChildren]=useState<string[]|undefined>(),[selected,setSelected]=useState<string[]|null>(null),[assessments,setAssessments]=useState<string[]>([]),[attachments,setAttachments]=useState<string[]>([]),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState(""),[linkId,setLinkId]=useState("");
 const rememberedScope=useRef(""),generation=useRef(0),guard=useRef(false),disabledRef=useRef(disabled);disabledRef.current=disabled;
 useEffect(()=>{const token=++generation.current;setLoading(true);store.readSnapshot().then(value=>{if(token===generation.current){setSnapshot(value);const active=resolveActiveClassroomScope(value);const key=String(active?.academicYearId)+"/"+String(active?.classroomId);if(key!==rememberedScope.current){rememberedScope.current=key;setChildren(undefined);setSelected(null);setAssessments([]);setAttachments([]);setLinkId("");const previous=value.settings.filter(isDocumentVersionRecord).filter(r=>!r.deletedAt&&r.classroomId===active?.classroomId&&r.academicYearId===active?.academicYearId&&r.title.startsWith("Öğretmen dosyası · ")).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))[0];if(previous){const remembered=REPORT_PERIODS.find(p=>previous.title.endsWith(p.label));if(remembered)setPeriod(remembered.id);if(previous.selection.periodStart)setDay(previous.selection.periodStart);setChildren(previous.studentIds.filter(id=>value.students.some(s=>s.id===id&&!s.deletedAt)));setSelected([...previous.selection.fields]);if(remembered?.id==="term"){setTermStart(previous.selection.periodStart??"");setTermEnd(previous.selection.periodEnd??"");}}}setLoading(false);}}).catch(()=>{if(token===generation.current){setError("Rapor kaynakları okunamadı. Yenileyin.");setLoading(false);}});return()=>{generation.current++;};},[store,refreshKey,revision]);
 let model:TeacherReportModel|null=null,modelError="";if(snapshot)try{model=teacherReportModel(snapshot,{period,day,studentIds:children,termStart,termEnd});}catch(e){modelError=e instanceof Error?e.message:"Rapor dönemi geçersiz.";}
 const selectedRows=selected??model?.rows.map(r=>r.id)??[],locked=disabled||loading||busy;
 const change=()=>{setRevision(v=>v+1);try{props.onChanged?.();}catch{setMessage("Kayıt tamamlandı; güncel raporu yeniden açabilirsiniz.");}};
 const switchPeriod=(value:ReportPeriod)=>{setPeriod(value);setSelected(null);setAttachments([]);setAssessments([]);};
 async function openReport(){if(!model||locked||guard.current)return;guard.current=true;setBusy(true);setError("");const token=generation.current;try{const {createTeacherReportRecipe}=await import("./teacher-report-document.ts");const recipe=await createTeacherReportRecipe(store,model.input,{recordIds:selectedRows,attachmentIds:attachments});if(token!==generation.current||disabledRef.current)throw new Error("Kaynak kapsamı değişti; güncel seçimi yeniden açın.");await requestPdfDocument(recipe);}catch(e){setError(e instanceof Error?e.message:"Rapor hazırlanamadı.");}finally{guard.current=false;setBusy(false);}}
 async function saveAssessments(){if(!snapshot||locked||guard.current||!assessments.length)return;guard.current=true;setBusy(true);setError("");try{await completeTeacherAssessments(store,{snapshot,ids:assessments});setMessage("Seçtiğiniz kendi değerlendirmeleriniz kaydedildi.");setAssessments([]);change();}catch(e){setError(e instanceof Error?e.message:"Değerlendirme kaydedilemedi.");}finally{guard.current=false;setBusy(false);}}
  async function exportDirect(format: "excel" | "word" | "pdf" | "zip" | "print") {
    if (!model || locked || guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    const token = generation.current;
    try {
      const { createTeacherReportRecipe } = await import("./teacher-report-document.ts");
      const recipe = await createTeacherReportRecipe(store, model.input, { recordIds: selectedRows, attachmentIds: attachments });
      if (token !== generation.current || disabledRef.current) throw new Error("Kaynak kapsamı değişti; güncel seçimi yeniden açın.");
      
      const selection = {
        fields: selectedRows,
        studentIds: model.input.studentIds,
        periodStart: model.period.start,
        periodEnd: model.period.end,
        appearance: "color" as const,
      };

      if (format === "print") {
        await requestPdfDocument(recipe);
      } else if (format === "excel") {
        const action = recipe.exportActions?.find((a) => a.id === "excel");
        if (action) {
          const file = await action.build(selection);
          const { downloadBrowserFile } = await import("../documents/browser-file-download.ts");
          downloadBrowserFile(file);
          setMessage("Excel dosyası (.xlsx) başarıyla indirildi.");
        }
      } else if (format === "word") {
        const action = recipe.exportActions?.find((a) => a.id === "word");
        if (action) {
          const file = await action.build(selection);
          const { downloadBrowserFile } = await import("../documents/browser-file-download.ts");
          downloadBrowserFile(file);
          setMessage("Word belgesi (.docx) başarıyla indirildi.");
        }
      } else if (format === "pdf") {
        const file = await recipe.build(selection);
        const { downloadBrowserFile } = await import("../documents/browser-file-download.ts");
        downloadBrowserFile(file);
        setMessage("PDF belgesi başarıyla indirildi.");
      } else if (format === "zip") {
        const action = recipe.exportActions?.find((a) => a.id === "zip");
        if (action) {
          const file = await action.build(selection);
          const { downloadBrowserFile } = await import("../documents/browser-file-download.ts");
          downloadBrowserFile(file);
          setMessage("Ekli ZIP paketi başarıyla indirildi.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dışa aktarma başarısız oldu.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }

  const toggle = (values: string[], id: string) => values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
  const versions = snapshot && model ? snapshot.settings.filter(isDocumentVersionRecord).filter((r) => !r.deletedAt && r.classroomId === model.scope.classroomId && r.academicYearId === model.scope.academicYearId && r.studentIds.every((id) => model.input.studentIds.includes(id)) && r.selection.periodStart! >= model.period.start && r.selection.periodEnd! <= model.period.end) : [];

  return (
    <section className="teacher-report-center" aria-label="İdare ve öğretmen dosyası">
      <h2>İdare ve Öğretmen Dosyası</h2>
      <p>Dönemi ve gerçek kaynakları seçin. Tek tıkla Excel (.xlsx), PDF, Word (.docx) veya ekleriyle ZIP olarak indirin.</p>
      
      {/* Dönem Seçimi */}
      <div className="teacher-report-periods" aria-label="Rapor dönemi">
        {REPORT_PERIODS.map((p) => (
          <button type="button" key={p.id} disabled={locked} aria-pressed={period === p.id} onClick={() => switchPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <label>
        Rapor tarihi
        <KeyboardInput type="date" value={day} disabled={locked} onChange={(e) => { setDay(e.target.value); setSelected(null); setAttachments([]); }} />
      </label>

      {/* Dönemlik Hızlı Seçici */}
      {period === "term" && (
        <div style={{ margin: "8px 0", padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            ⚡ MEB Resmî Dönem Sınırları:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              style={{
                padding: "6px 12px",
                background: termStart === "2026-09-14" ? "#0369a1" : "#fff",
                color: termStart === "2026-09-14" ? "#fff" : "#0369a1",
                border: "1px solid #0369a1",
                borderRadius: "4px",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => {
                setTermStart("2026-09-14");
                setTermEnd("2027-01-22");
              }}
              disabled={locked}
            >
              🎯 1. Dönem (14.09.2026 – 22.01.2027)
            </button>
            <button
              type="button"
              style={{
                padding: "6px 12px",
                background: termStart === "2027-02-03" ? "#0369a1" : "#fff",
                color: termStart === "2027-02-03" ? "#fff" : "#0369a1",
                border: "1px solid #0369a1",
                borderRadius: "4px",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => {
                setTermStart("2027-02-03");
                setTermEnd("2027-06-12");
              }}
              disabled={locked}
            >
              🎯 2. Dönem (03.02.2027 – 12.06.2027)
            </button>
          </div>
        </div>
      )}

      {model && (
        <>
          <p>
            <strong>{model.period.start} — {model.period.end}</strong> · {model.classroomName}
          </p>

          {/* Hızlı Kapsam Seçimi */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0", flexWrap: "wrap" }}>
            <button
              type="button"
              style={{
                padding: "5px 10px",
                fontSize: "0.8rem",
                background: !children || children.length === model.students.length ? "#059669" : "#fff",
                color: !children || children.length === model.students.length ? "#fff" : "#059669",
                border: "1px solid #059669",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 600,
              }}
              disabled={locked}
              onClick={() => {
                setChildren(undefined);
                setSelected(null);
                setAttachments([]);
                setAssessments([]);
              }}
            >
              ✓ Tüm Sınıfı Kapsa ({model.students.length} Çocuk)
            </button>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              ({model.input.studentIds.length}/{model.students.length} çocuk seçili)
            </span>
          </div>

          <details>
            <summary>Bireysel çocuk seçimi ({model.input.studentIds.length} çocuk)</summary>
            {model.students.map((s) => (
              <label className="teacher-report-choice" key={s.id}>
                <input
                  type="checkbox"
                  checked={model!.input.studentIds.includes(s.id)}
                  disabled={locked}
                  onChange={() => {
                    setChildren(toggle(model!.input.studentIds, s.id));
                    setSelected(null);
                    setAttachments([]);
                    setAssessments([]);
                  }}
                />
                {s.label}
              </label>
            ))}
          </details>

          {/* TEK TIKLA DIŞA AKTARMA VE YAZDIRMA ARAÇ ÇUBUĞU */}
          <div
            className="tr-direct-export-toolbar"
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              padding: "10px 12px",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              margin: "12px 0",
              alignItems: "center",
            }}
          >
            <strong style={{ fontSize: "0.85rem", color: "#1e293b", marginRight: "4px" }}>
              ⚡ Tek Tıkla Çıktı Al:
            </strong>
            <button
              type="button"
              className="tr-action-btn tr-action-btn--excel"
              style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontWeight: 600, padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.84rem" }}
              disabled={locked || !selectedRows.length || !model.input.studentIds.length}
              onClick={() => void exportDirect("excel")}
              title="Formül enjeksiyonlu (SUBTOTAL 103) ve MEB kurumsal renkli Excel (.xlsx)"
            >
              📊 Excel (.xlsx)
            </button>
            <button
              type="button"
              className="tr-action-btn tr-action-btn--pdf"
              style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 600, padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.84rem" }}
              disabled={locked || !selectedRows.length || !model.input.studentIds.length}
              onClick={() => void exportDirect("pdf")}
              title="Resmî MEB antetli doğrudan PDF dosyası indir"
            >
              📑 PDF İndir
            </button>
            <button
              type="button"
              className="tr-action-btn tr-action-btn--print"
              style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 600, padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.84rem" }}
              disabled={locked || !selectedRows.length || !model.input.studentIds.length}
              onClick={() => void exportDirect("print")}
              title="A4 Paged Media doğrudan önizle ve yazdır"
            >
              🖨️ A4 Yazdır
            </button>
            <button
              type="button"
              className="tr-action-btn tr-action-btn--word"
              style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", fontWeight: 600, padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.84rem" }}
              disabled={locked || !selectedRows.length || !model.input.studentIds.length}
              onClick={() => void exportDirect("word")}
              title="Düzenlenebilir Microsoft Word (.docx) indir"
            >
              📝 Word (.docx)
            </button>
            <button
              type="button"
              className="tr-action-btn tr-action-btn--zip"
              style={{ background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe", fontWeight: 600, padding: "7px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.84rem" }}
              disabled={locked || !selectedRows.length || !model.input.studentIds.length}
              onClick={() => void exportDirect("zip")}
              title="PDF, Word, Excel ve tüm resmi ekleri içeren ZIP paketi"
            >
              📦 Ekli ZIP İndir
            </button>
          </div>

          <div aria-label="Gerçek kayıt özeti">
            {REPORT_FIELDS.map((c) => (
              <p key={c.id}>
                {c.label}: {model!.rows.filter((r) => r.category === c.id && selectedRows.includes(r.id)).length} seçili kayıt
              </p>
            ))}
          </div>

          <details>
            <summary>Dosyaya alınacak kayıtları seç ({selectedRows.length})</summary>
            {model.rows.map((r) => (
              <label key={r.id} className="teacher-report-choice">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(r.id)}
                  disabled={locked}
                  onChange={() => setSelected(toggle(selectedRows, r.id))}
                />
                <span>
                  {r.date} · {r.status} · {r.studentNames}
                  <strong>{r.title}</strong>
                  <span>{r.text}</span>
                </span>
              </label>
            ))}
          </details>

          {!model.rows.length && <p>Bu dönem ve çocuk seçiminde uygun kaynak yok.</p>}

          {/* Otomatik Bağlantı Telemetrisi */}
          {model.unlinked.length > 0 && (
            <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", margin: "8px 0", fontSize: "0.82rem", color: "#166534" }}>
              ✓ {model.unlinked.length} adet gözlem kaydı otomatik pedagojik plana bağlandı ve rapora dahil edildi.
            </div>
          )}

          {model.pending.length > 0 && (
            <fieldset>
              <legend>Kendi yazdığım değerlendirmeyi kaydet</legend>
              {model.pending.map((r) => (
                <label className="teacher-report-choice" key={r.id}>
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={assessments.includes(r.id)}
                    onChange={() => setAssessments(toggle(assessments, r.id))}
                  />
                  <span>{String(r.teacherAssessmentText)}</span>
                </label>
              ))}
              <button type="button" disabled={locked || !assessments.length} onClick={() => void saveAssessments()}>
                Seçili değerlendirmelerimi kaydet
              </button>
            </fieldset>
          )}

          <details>
            <summary>Hazır tamamlama ve resmî kaynaklar</summary>
            {props.onPreparePlan && (
              <button type="button" disabled={locked} onClick={() => props.onPreparePlan?.(day)}>
                Bu güne plan hazırla
              </button>
            )}
            {props.onOpenCapture && (
              <button type="button" disabled={locked} onClick={props.onOpenCapture}>
                Gerçek gözlem ekle
              </button>
            )}
            {props.onOpenAssessment && (
              <button type="button" disabled={locked} onClick={() => props.onOpenAssessment?.(day)}>
                Gün kapanışı ve ertesi gün notu
              </button>
            )}
            {model.monthlyPlans.map((p) => (
              <button
                type="button"
                key={p.id}
                disabled={locked || !props.onOpenMonthlyEvaluation}
                onClick={() => props.onOpenMonthlyEvaluation?.(p.id)}
              >
                Aylık değerlendirme ve Ek 18 · {String(p.monthKey)}
              </button>
            ))}
            {model.students.filter((s) => model!.input.studentIds.includes(s.id)).map((s) => (
              <button
                type="button"
                key={s.id}
                disabled={locked || !props.onOpenStudentReport}
                onClick={() => props.onOpenStudentReport?.(s.id)}
              >
                {s.label} için Ek 4 hazırlığını aç
              </button>
            ))}
            <p>Ek 4 çocuk bazlı beceri edinimidir. Ek 18 aylık plan bileşenlerinin kontrolüdür; çocuk beceri puanı değildir.</p>
          </details>

          {versions.length > 0 && (
            <details>
              <summary>ZIP dosyasına kayıtlı ek seç ({attachments.length})</summary>
              {versions.map((v) => (
                <label key={v.id} className="teacher-report-choice">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={attachments.includes(v.id)}
                    onChange={() => setAttachments(toggle(attachments, v.id))}
                  />
                  {v.title} · {v.civilDate}
                </label>
              ))}
            </details>
          )}

          <button
            type="button"
            className="teacher-report-primary"
            disabled={locked || !selectedRows.length || !model.input.studentIds.length}
            onClick={() => void openReport()}
          >
            {busy ? "Dosya hazırlanıyor…" : "📄 Önizleme Ekranında Aç"}
          </button>
        </>
      )}

      {(error || modelError) && <p role="alert">{error || modelError}</p>}
      {message && <p role="status">{message}</p>}
      <button type="button" disabled={busy} onClick={() => setRevision((v) => v + 1)}>
        Rapor kaynaklarını yenile
      </button>
      {props.onOpenHistory && (
        <button type="button" onClick={props.onOpenHistory}>
          Önceki belge sürümlerini aç
        </button>
      )}
    </section>
  );
}
