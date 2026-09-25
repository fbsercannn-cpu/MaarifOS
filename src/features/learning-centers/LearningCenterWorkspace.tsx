import { useRef, useState } from "react";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { adminLedgerHead, classroomAdminRecords, inventoryBalances } from "../../core/domain/classroom-admin.ts";
import { learningCenterHead, learningCenterRecords, learningCenterState, type LearningCenter } from "../../core/domain/learning-centers.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { useTeacherFollowupSnapshot } from "../teacher-followup/TeacherFollowupWorkspace.tsx";
import { requestPdfDocument } from "../documents/pdf-preview-model.ts";
import { saveLearningCenter } from "./learning-center-service.ts";
import { learningCenterPdf } from "./learning-center-document.ts";
import "../classroom-admin/classroom-admin.css";
import "./learning-centers.css";

type Draft = Omit<LearningCenter, "allocations"> & { allocations: { itemId: string; quantity: number }[] };
const freshCenter = (name = "") : Draft => ({ id: crypto.randomUUID(), name, observation: "", nextStep: "", allocations: [] });
const dateLabel = (d: string) => d.split("-").reverse().join(".");
export function LearningCenterWorkspace({ store, refreshKey, disabled, onChanged }: { store: LocalDataStore; refreshKey?: unknown; disabled?: boolean; onChanged?(): void }) {
  const { snapshot, error, reload, refresh } = useTeacherFollowupSnapshot(store, refreshKey), today = civilDateInIstanbul(new Date());
  const openedScope = useRef<string | null>(null);
  const [title, setTitle] = useState("Haftalık merkez düzeni"), [startOn, setStartOn] = useState(today), [endOn, setEndOn] = useState(today), [previous, setPrevious] = useState("");
  const [centers, setCenters] = useState<Draft[]>(() => [freshCenter("Kitap merkezi")]), [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(""), [message, setMessage] = useState("");
  const scope = snapshot ? resolveActiveClassroomScope(snapshot) : null;
  if (scope && !openedScope.current) openedScope.current = `${scope.academicYearId}:${scope.classroomId}`;
  if (error) return <p role="alert">{error}<button type="button" onClick={reload}>Yeniden dene</button></p>;
  if (!snapshot) return <p role="status">Merkez düzeni açılıyor…</p>;
  if (!scope) return <p>Önce sınıfınızı hazırlayın.</p>;
  if (openedScope.current !== `${scope.academicYearId}:${scope.classroomId}`) return <p role="alert">Etkin sınıf değişti. Çalışma alanını kapatıp yeniden açın; önceki sınıfın taslağı yeni sınıfa kaydedilmez.</p>;
  const balances = inventoryBalances(classroomAdminRecords(snapshot, scope)), plans = learningCenterRecords(snapshot, scope).filter(r => r.workflow.kind === "center-plan");
  const state = learningCenterState(snapshot, selected), locked = !!disabled || busy || snapshot.academicYears.find(y => y.id === scope.academicYearId)?.status === "archived";
  const update = (id: string, patch: Partial<Draft>) => setCenters(items => items.map(c => c.id === id ? { ...c, ...patch } : c));
  const save = async (command: Parameters<typeof saveLearningCenter>[1]["command"]) => {
    if (locked) return false; setBusy(true); setFailure(""); setMessage("");
    try { const record = await saveLearningCenter(store, { command, expectedScope: scope, expectedHead: learningCenterHead(snapshot, scope), expectedInventoryHead: adminLedgerHead(classroomAdminRecords(snapshot, scope)) }); if (command.kind === "plan") setSelected(record.id); await refresh(); onChanged?.(); setMessage(command.kind === "close" ? "Merkez düzeni kapatıldı; kalan malzemeler stoka iade edildi." : "Merkez düzeni kaydedildi."); return true; }
    catch (e) { setFailure(e instanceof Error ? e.message : "Kaydedilemedi. Önceki kayıtlar korundu."); reload(); return false; }
    finally { setBusy(false); }
  };
  const copy = () => { const source = learningCenterState(snapshot, previous); if (!source) return; setCenters(source.centers.map(c => ({ id: crypto.randomUUID(), name: c.name, observation: "", nextStep: c.nextStep, allocations: c.allocations.map(a => ({ itemId: a.itemId, quantity: a.quantity })) }))); };
  return <div className="classroom-admin learning-centers" data-testid="learning-center-workspace"><div className="admin-lead"><h2>Öğrenme merkezleri</h2><p>Ortamı gözden geçirin; malzemeyi ve bir sonraki düzenleme kararını birlikte izleyin.</p></div>
    {failure && <p role="alert">{failure}</p>}{message && <p role="status">{message}</p>}
    <details className="admin-card"><summary>Yeni merkez düzeni oluştur</summary><fieldset disabled={locked}>
      <label>Önceki düzenden yararlan<select aria-label="Önceki düzenden yararlan" value={previous} onChange={e => setPrevious(e.target.value)}><option value="">Yeni düzen</option>{plans.map(p => <option key={p.id} value={p.id}>{p.workflow.kind === "center-plan" ? `${dateLabel(p.workflow.startOn)} · ${p.workflow.title}` : ""}</option>)}</select></label><button type="button" disabled={!previous} onClick={copy}>Merkezleri taslağa kopyala</button>
      <label>Düzen başlığı<KeyboardInput value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></label>
      <label>Başlangıç tarihi<KeyboardInput type="date" value={startOn} onChange={e => setStartOn(e.target.value)} /></label><label>Bitiş / gözden geçirme tarihi<KeyboardInput type="date" value={endOn} onChange={e => setEndOn(e.target.value)} /></label>
      {centers.map((c, index) => <div className="center-draft" key={c.id}><label>{index + 1}. merkez adı<KeyboardInput value={c.name} maxLength={100} onChange={e => update(c.id, { name: e.target.value })} /></label>
        <MaterialSelector balances={balances} center={c} onAdd={a => update(c.id, { allocations: [...c.allocations, a] })} />
        <ul>{c.allocations.map(a => <li key={a.itemId}><span>{balances.find(b => b.item.id === a.itemId)?.item.workflow.name ?? "Malzeme bulunamadı"} · {a.quantity}</span><button type="button" aria-label={`${c.name} malzemesini taslaktan çıkar`} onClick={() => update(c.id, { allocations: c.allocations.filter(x => x.itemId !== a.itemId) })}>Çıkar</button></li>)}</ul>
        <label>Ortam gözlemi (isteğe bağlı)<KeyboardTextarea value={c.observation} maxLength={2000} onChange={e => update(c.id, { observation: e.target.value })} /></label><label>Düzenleme kararı (isteğe bağlı)<KeyboardTextarea value={c.nextStep} maxLength={2000} onChange={e => update(c.id, { nextStep: e.target.value })} /></label><button type="button" disabled={centers.length === 1} onClick={() => setCenters(items => items.filter(x => x.id !== c.id))}>Merkezi taslaktan çıkar</button>
      </div>)}<button type="button" disabled={centers.length >= 20} onClick={() => setCenters(items => [...items, freshCenter()])}>Merkez ekle</button>
      <p>Kaydettiğinizde seçilen malzemeler şimdiden bu merkezlere ayrılır; aynı miktar başka yere verilemez. Bitiş tarihi malzemeyi kendiliğinden iade etmez.</p>
      <button type="button" disabled={!title.trim() || centers.some(c => !c.name.trim()) || !startOn || !endOn} onClick={() => void save({ kind: "plan", title, startOn, endOn, previousPlanId: previous || null, centers })}>Düzeni kaydet ve malzemeyi ayır</button>
    </fieldset></details>
    <label className="admin-card">Kayıtlı düzen<select aria-label="Kayıtlı düzen" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Düzen seçin</option>{[...plans].reverse().map(p => <option key={p.id} value={p.id}>{p.workflow.kind === "center-plan" ? `${dateLabel(p.workflow.startOn)} · ${p.workflow.title}${learningCenterState(snapshot, p.id)?.closed ? " · Kapalı" : " · Açık"}` : ""}</option>)}</select></label>
    {state && state.plan.workflow.kind === "center-plan" && <><div className="admin-card"><h3>{state.plan.workflow.title}</h3><p>{dateLabel(state.plan.workflow.startOn)} – {dateLabel(state.plan.workflow.endOn)} · {state.closed ? "Kapalı" : "Açık"}</p><button type="button" onClick={() => { setFailure(""); void requestPdfDocument(learningCenterPdf(snapshot, selected)).catch(e => setFailure(e instanceof Error ? e.message : "Belge açılamadı.")); }}>Merkez düzeni PDF</button></div>
      {state.centers.map(c => <div key={c.id} className="admin-card"><h3>{c.name}</h3><ul>{c.allocations.map(a => <li key={a.loanId}>{balances.find(b => b.item.id === a.itemId)?.item.workflow.name ?? "Malzeme"}: {a.remaining} / {a.quantity} merkezde</li>)}</ul>{!c.allocations.length && <p>Bu merkeze stoktan malzeme ayrılmadı.</p>}<p>Ortam gözlemi: {c.observation || "Henüz yazılmadı."}</p><p>Sonraki adım: {c.nextStep || "Henüz yazılmadı."}</p>{!state.closed && <Reflection key={`${c.id}:${state.history.length}`} disabled={locked} center={c} save={(observation, nextStep) => save({ kind: "reflection", planId: selected, centerId: c.id, observation, nextStep })}/>}</div>)}
      {!state.closed && <ClosePlan disabled={locked} key={selected} save={reason => save({ kind: "close", planId: selected, reason })}/>}<details className="admin-card"><summary>İşlem geçmişi</summary><ul>{state.history.map(r => <li key={r.id}>{dateLabel(r.civilDate)} · {r.workflow.kind === "center-plan" ? "Düzen oluşturuldu" : r.workflow.kind === "center-close" ? `Kapatıldı: ${r.workflow.reason}` : r.workflow.kind === "center-box-check" ? (r.workflow.prepared ? "Kutu hazır olarak kaydedildi" : "Kutu yeniden hazırlığa açıldı") : `${state.centers.find(c => "centerId" in r.workflow && c.id === r.workflow.centerId)?.name ?? "Merkez"}: ${r.workflow.observation} → ${r.workflow.nextStep}`}</li>)}</ul></details></>}
  </div>;
}
function MaterialSelector({ balances, center, onAdd }: { balances: ReturnType<typeof inventoryBalances>; center: Draft; onAdd(a: { itemId: string; quantity: number }): void }) { const [itemId, setItemId] = useState(""), [quantity, setQuantity] = useState("1"); return <div><label>Malzeme<select aria-label="Malzeme" value={itemId} onChange={e => setItemId(e.target.value)}><option value="">Malzeme seçin</option>{balances.filter(b => !center.allocations.some(a => a.itemId === b.item.id)).map(b => <option key={b.item.id} value={b.item.id}>{b.item.workflow.name} · {b.available} {b.item.workflow.unit} kullanılabilir</option>)}</select></label><label>Miktar<KeyboardInput type="number" inputMode="numeric" min={1} step={1} value={quantity} onChange={e => setQuantity(e.target.value)} /></label><button type="button" disabled={!itemId || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1} onClick={() => { onAdd({ itemId, quantity: Number(quantity) }); setItemId(""); setQuantity("1"); }}>Malzemeyi merkeze ekle</button></div>; }
function Reflection({ center, disabled, save }: { center: Draft; disabled: boolean; save(o: string, n: string): Promise<boolean> }) { const [observation, setObservation] = useState(""), [nextStep, setNextStep] = useState(""); return <details><summary>Yeni gözlem ve düzenleme kararı</summary><fieldset disabled={disabled}><label>{center.name} ortam gözlemi<KeyboardTextarea value={observation} maxLength={2000} onChange={e => setObservation(e.target.value)} /></label><label>{center.name} sonraki adımı<KeyboardTextarea value={nextStep} maxLength={2000} onChange={e => setNextStep(e.target.value)} /></label><button type="button" disabled={!observation.trim() || !nextStep.trim()} onClick={() => void save(observation, nextStep)}>Gözlem ve kararı kaydet</button></fieldset></details>; }
function ClosePlan({ disabled, save }: { disabled: boolean; save(reason: string): Promise<boolean> }) { const [reason, setReason] = useState(""); return <details className="admin-card"><summary>Düzeni kapat ve malzemeleri iade et</summary><fieldset disabled={disabled}><label>Kapanış / değişiklik gerekçesi<KeyboardTextarea value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></label><p>Merkezde kalan tüm malzemeler aynı işlemde stoka döner. Geçmiş gözlemler ve kararlar korunur.</p><button type="button" disabled={!reason.trim()} onClick={() => void save(reason)}>Kapat ve iade et</button></fieldset></details>; }
