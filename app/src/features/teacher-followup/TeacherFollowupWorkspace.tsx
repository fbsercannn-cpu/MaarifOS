import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { studentContactsFromRecord } from "../../core/domain/student.ts";
import { isTeacherOwnedPlanRecord } from "../../core/domain/teacher-owned-plan.ts";
import { followupReminders, GUIDE_DIGEST, teacherFollowups, latestFollowupEvent, type ContactArea, type SupportChoice, type TeacherFollowupRecord, type TeacherWorkflow } from "../../core/domain/teacher-followup.ts";
import { appendTeacherFollowup, applyLearningDecisionToPlan, combinePreparationItems, contactAreaValue, contactFreshness, FOLLOWUP_CHANGED_EVENT, followupFingerprint, pickupContactSnapshot, preparationCandidates, type ContactFreshness } from "./teacher-followup-service.ts";

import { loadOrientationGuide, type OrientationGuide } from "../orientation-guide/orientation-guide.ts";
import "./teacher-followup.css";

export type FollowupSection = "contacts" | "pickup" | "meetings" | "preparation" | "guide" | "learning";
const sections: { id: FollowupSection; label: string }[] = [{ id: "contacts", label: "Bilgi güncelliği" }, { id: "pickup", label: "Günlük teslim" }, { id: "meetings", label: "Veli görüşmeleri" }, { id: "preparation", label: "Haftalık hazırlık" }, { id: "guide", label: "Uyum adımları" }, { id: "learning", label: "Sonraki eğitim adımı" }];
const areaLabels: Record<ContactArea, string> = { phones: "Telefonlar", address: "Ev adresi", pickup: "Teslim almaya yetkili kişiler" };
const sourceLabels: Record<string, string> = { "family-updated": "Veli tarafından güncellendi · öğretmen kaydı", "family-confirmed": "Veli ile doğrulandı", "teacher-checked": "Öğretmen kontrol etti" };
const states = { missing: "Bilgi eksik", unverified: "Henüz doğrulanmadı", changed: "Doğrulamadan sonra değişti", old: "Yeniden doğrulanmalı · 90 gün", current: "Güncel" };
const supportLabels: Record<SupportChoice, string> = { "adapt-environment": "Ortamı / materyali düzenle", "small-group": "Küçük grupla destekle", "family-cooperation": "Aileyle birlikte destekle", "observe-again": "Başka bir bağlamda yeniden gözlemle", other: "Öğretmenin diğer kararı" };
const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
const clockLabel = (t: string) => new Date(t).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
const plusDay = (day: string, count: number) => new Date(Date.parse(`${day}T12:00:00Z`) + count * 86_400_000).toISOString().slice(0, 10);
const nextMonday = (day: string) => plusDay(day, 8 - (new Date(`${day}T12:00:00Z`).getUTCDay() || 7));
const normalize = (text: string) => text.normalize("NFC").trim();

export function useTeacherFollowupSnapshot(store: LocalDataStore, refreshKey?: unknown) {
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const requestSequence = useRef(0);
  const latestRead = useRef<Promise<DataSnapshot> | null>(null);
  useEffect(() => { const refresh = () => setRevision(v => v + 1); window.addEventListener(FOLLOWUP_CHANGED_EVENT, refresh); window.addEventListener("focus", refresh); return () => { window.removeEventListener(FOLLOWUP_CHANGED_EVENT, refresh); window.removeEventListener("focus", refresh); }; }, []);
  useEffect(() => { let cancelled = false; const request = ++requestSequence.current; const pending = store.readSnapshot(); latestRead.current = pending; void pending.then(value => { if (!cancelled && request === requestSequence.current) { setSnapshot(value); setError(""); } }).catch(() => { if (!cancelled && request === requestSequence.current) setError("Takip kayıtları okunamadı. Yeniden deneyin."); }); return () => { cancelled = true; }; }, [store, refreshKey, revision]);
  const refresh = async () => {
    let request = ++requestSequence.current, pending = store.readSnapshot(); latestRead.current = pending;
    for (;;) {
      const value = await pending;
      if (request === requestSequence.current) { setSnapshot(value); setError(""); return; }
      // Saving stays busy until the newer focus/event read has also delivered its head.
      request = requestSequence.current; pending = latestRead.current!;
    }
  };
  return { snapshot, error, refresh, reload: () => setRevision(v => v + 1) };
}

export function FollowupInbox({ store, refreshKey, onOpen }: { store: LocalDataStore; refreshKey?: unknown; onOpen(studentId?: string, section?: FollowupSection): void }) {
  const { snapshot } = useTeacherFollowupSnapshot(store, refreshKey);
  const today = civilDateInIstanbul(new Date());
  const scope = snapshot ? resolveActiveClassroomScope(snapshot) : null;
  const records = snapshot && scope ? teacherFollowups(snapshot).filter(r => r.classroomId === scope.classroomId && r.academicYearId === scope.academicYearId && (r.studentId === null || snapshot.students.some(s => s.id === r.studentId && s.active !== false && typeof s.deletedAt !== "string"))) : [];
  const reminders = followupReminders(records, today);
  if (!scope) return null;
  return <section className="followup-inbox" aria-label="Öğretmen takipleri">
    <button type="button" onClick={() => onOpen()}><span><strong>Öğretmen takipleri</strong><small>{reminders.length ? `${reminders.length} işin takip tarihi geldi` : "Veli görüşmeleri, teslim ve haftalık hazırlık"}</small></span><span aria-hidden="true">›</span></button>
    {reminders.length > 0 ? <details><summary>Takibi gelen işleri göster</summary><ul>{reminders.map(r => <li key={r.id}><button type="button" onClick={() => onOpen(r.studentId ?? undefined, ({ meeting: "meetings", guide: "guide", learning: "learning", preparation: "preparation" } as const)[r.kind])}><strong>{r.title}</strong><small>{r.studentId ? `${String(snapshot?.students.find(s => s.id === r.studentId)?.displayName ?? "Çocuk")} · ` : ""}{dateLabel(r.dueOn)}</small></button></li>)}</ul></details> : null}
  </section>;
}

type WorkspaceProps = { store: LocalDataStore; initialStudentId?: string; initialSection?: FollowupSection; initialPickupCivilDate?: string; refreshKey?: unknown; disabled?: boolean; onOpenStudent(studentId: string): void; onOpenPlans(): void; onChanged?(): void };
export function TeacherFollowupWorkspace(props: WorkspaceProps) {
  const { snapshot, error, reload } = useTeacherFollowupSnapshot(props.store, props.refreshKey);
  const [studentId, setStudentId] = useState(props.initialStudentId ?? "");
  const [pickupCivilDate, setPickupCivilDate] = useState(props.initialPickupCivilDate ?? civilDateInIstanbul(new Date()));
  const [section, setSection] = useState<FollowupSection>(props.initialSection ?? "contacts");
  const [guideVisited, setGuideVisited] = useState(props.initialSection === "guide");
  useEffect(() => { if (section === "guide") setGuideVisited(true); }, [section]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const today = civilDateInIstanbul(new Date());
  const scope = snapshot ? resolveActiveClassroomScope(snapshot) : null;
  const students = snapshot && scope ? snapshot.students.filter(s => s.classroomId === scope.classroomId && s.academicYearId === scope.academicYearId && typeof s.deletedAt !== "string") : [];
  const student = students.find(s => s.id === studentId);
  const records = useMemo(() => snapshot && scope ? teacherFollowups(snapshot).filter(r => r.academicYearId === scope.academicYearId && r.classroomId === scope.classroomId) : [], [snapshot, scope?.academicYearId, scope?.classroomId]);
  const selectedRecords = records.filter(r => r.studentId === studentId);
  const run = async (task: () => Promise<unknown>, success = "Takip kaydı kaydedildi.") => {
    if (busy || props.disabled) return false;
    setBusy(true); setSaveError(""); setMessage("");
    try { await task(); reload(); props.onChanged?.(); setMessage(success); return true; }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : "Kaydedilemedi; önceki kayıtlar korundu."); return false; }
    finally { setBusy(false); }
  };
  const save = (workflow: TeacherWorkflow, civilDate = today) => run(() => {
    const classOnly = workflow.kind === "preparation-list" || workflow.kind === "preparation-check";
    return appendTeacherFollowup(props.store, { studentId: classOnly ? null : studentId, workflow, civilDate, ...(!classOnly && student ? { expectedStudentUpdatedAt: student.updatedAt } : {}) });
  });
  if (error) return <div role="alert">{error}<button type="button" onClick={reload}>Yeniden dene</button></div>;
  if (!snapshot) return <p role="status">Takip kayıtları hazırlanıyor…</p>;
  if (!scope) return <p>Takip defteri için önce sınıfınızı hazırlayın.</p>;
  const disabled = !!props.disabled || busy || (section !== "preparation" && (!student || student.active === false));
  return <div className="teacher-followup" data-testid="teacher-followup-workspace">
    <p className="followup-intro">Çocukla ilgili kararları, aile iletişimini ve hazırlıkları tarihleriyle izleyin. Bugün: {dateLabel(today)}.</p>
    <label>Çalışma alanı<select aria-label="Takip çalışma alanı" value={section} disabled={busy} onChange={e => { setSection(e.target.value as FollowupSection); setMessage(""); setSaveError(""); }}>{sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    {section !== "preparation" ? <label>Çocuk<select aria-label="Takip çocuğu" value={studentId} disabled={busy} onChange={e => { setStudentId(e.target.value); setMessage(""); setSaveError(""); }}><option value="">Çocuk seçin</option>{students.map(s => <option key={s.id} value={s.id}>{String(s.displayName)}{s.active === false ? " · arşiv" : ""}</option>)}</select></label> : null}
    {saveError ? <p role="alert" className="followup-error">{saveError}</p> : null}{message ? <p role="status" className="followup-success">{message}</p> : null}
    {student?.active === false ? <p>Arşivdeki çocuğun önceki kayıtları okunur; yeni kayıt için çocuğun etkin kaydı gerekir.</p> : null}
    <div key={studentId || "class"}>
      <div hidden={section !== "contacts"}>{student ? <ContactPanel student={student} records={selectedRecords} today={today} disabled={disabled} save={save} onEdit={() => props.onOpenStudent(studentId)} /> : <MissingInfoList students={students} records={records} today={today} onSelect={setStudentId} />}</div>
      <div hidden={section !== "pickup"}>{pickupCivilDate !== today && <p>{dateLabel(pickupCivilDate)} tarihinin teslim kayıtları. <button type="button" onClick={() => setPickupCivilDate(today)}>Bugünün teslimini aç</button></p>}{student ? <PickupPanel key={`${studentId}:${pickupCivilDate}`} student={student} records={selectedRecords} today={pickupCivilDate} disabled={disabled || pickupCivilDate !== today} save={save} onEdit={() => props.onOpenStudent(studentId)} /> : <p>Teslim defteri için çocuk seçin.</p>}</div>
      <div hidden={section !== "meetings"}>{student ? <MeetingPanel records={selectedRecords} today={today} disabled={disabled} save={save} /> : <p>Veli görüşmesi için çocuk seçin.</p>}</div>
      <div hidden={section !== "guide"}>{guideVisited && (student ? <GuidePanel records={selectedRecords} today={today} disabled={disabled} save={save} /> : <p>Uyum takibi için çocuk seçin.</p>)}</div>
      <div hidden={section !== "learning"}>{student ? <LearningPanel snapshot={snapshot} student={student} records={selectedRecords} today={today} disabled={disabled} save={save} onPlans={props.onOpenPlans} apply={(decisionId, planId, expectedUpdatedAt, appliedText) => run(() => applyLearningDecisionToPlan(props.store, { decisionId, planId, expectedUpdatedAt, appliedText }), "Öğretmen kararı planın yeni revizyonuna eklendi.")} /> : <p>Eğitim adımı için çocuk seçin.</p>}</div>
    </div>
    <div hidden={section !== "preparation"}><PreparationPanel snapshot={snapshot} records={records.filter(r => r.studentId === null)} today={today} disabled={!!props.disabled || busy} save={save} onPlans={props.onOpenPlans} /></div>
  </div>;
}

type Save = (workflow: TeacherWorkflow, civilDate?: string) => Promise<boolean>;
type PanelProps = { records: TeacherFollowupRecord[]; today: string; disabled: boolean; save: Save };
const Input = ({ label, value, onChange, type = "text", min, max }: { label: string; value: string; onChange(v: string): void; type?: string; min?: string; max?: string }) => <label>{label}<KeyboardInput aria-label={label} value={value} type={type} min={min} max={max} maxLength={500} onChange={e => onChange(e.target.value)} /></label>;
const Note = ({ label, value, onChange, maxLength = 4000 }: { label: string; value: string; onChange(v: string): void; maxLength?: number }) => <label>{label}<KeyboardTextarea aria-label={label} value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} /><small>{value.length.toLocaleString("tr-TR")} / {maxLength.toLocaleString("tr-TR")}</small></label>;
const Toggle = ({ checked, onClick, children, disabled }: { checked: boolean; onClick(): void; children: ReactNode; disabled?: boolean }) => <button className="followup-toggle" type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={onClick}><span aria-hidden="true">{checked ? "✓" : "+"}</span>{children}</button>;

function MissingInfoList({ students, records, today, onSelect }: { students: StoredRecord[]; records: TeacherFollowupRecord[]; today: string; onSelect(id: string): void }) {
  const [rows, setRows] = useState<{ student: StoredRecord; info: ContactFreshness[] }[]>([]);
  useEffect(() => { let alive = true; void Promise.all(students.filter(s => s.active !== false).map(async student => ({ student, info: await contactFreshness(student, records, today) }))).then(value => { if (alive) setRows(value); }); return () => { alive = false; }; }, [students, records, today]);
  return <section><h3>Bilgisi kontrol edilecek çocuklar</h3><p>Telefon, adres ve teslim kişileri ayrı izlenir. 90 günlük kontrol aralığı uygulamanın hatırlatma tercihidir.</p><ul className="followup-list">{rows.filter(r => r.info.some(i => i.state !== "current")).map(r => <li key={r.student.id}><button type="button" onClick={() => onSelect(r.student.id)}><strong>{String(r.student.displayName)}</strong><small>{r.info.filter(i => i.state !== "current").map(i => `${areaLabels[i.area]}: ${states[i.state]}`).join(" · ")}</small></button></li>)}</ul>{rows.length > 0 && rows.every(r => r.info.every(i => i.state === "current")) ? <p>Bütün etkin çocukların iletişim bilgileri güncel.</p> : null}</section>;
}

function ContactPanel({ student, records, today, disabled, save, onEdit }: PanelProps & { student: StoredRecord; onEdit(): void }) {
  const [freshness, setFreshness] = useState<ContactFreshness[]>([]);
  const [areas, setAreas] = useState<ContactArea[]>([]);
  const [source, setSource] = useState<"family-updated" | "family-confirmed" | "teacher-checked">("family-confirmed");
  const [note, setNote] = useState("");
  useEffect(() => { let alive = true; void contactFreshness(student, records, today).then(value => { if (alive) setFreshness(value); }); return () => { alive = false; }; }, [student, records, today]);
  const check = async () => {
    const fingerprints: Partial<Record<ContactArea, string>> = {};
    for (const area of areas) fingerprints[area] = await followupFingerprint(contactAreaValue(student, area));
    if (await save({ kind: "contact-check", areas, fingerprints, source, note: normalize(note) })) { setAreas([]); setNote(""); }
  };
  return <section><h3>İletişim bilgilerini doğrula</h3><div className="followup-cards">{freshness.map(i => <article key={i.area} data-state={i.state}><strong>{areaLabels[i.area]}</strong><b>{states[i.state]}</b><small>{i.checkedOn ? `${dateLabel(i.checkedOn)} · ${sourceLabels[i.source ?? ""]}` : "Doğrulama kaydı yok"}</small></article>)}</div>
    <button className="followup-secondary" type="button" onClick={onEdit}>Telefon, adres ve yetkili kişileri düzenle</button>
    <fieldset disabled={disabled}><legend>Kontrol ettiğiniz bilgileri seçin</legend>{freshness.map(i => <Toggle key={i.area} checked={areas.includes(i.area)} disabled={i.missing} onClick={() => setAreas(a => a.includes(i.area) ? a.filter(x => x !== i.area) : [...a, i.area])}>{areaLabels[i.area]}{i.missing ? " · önce bilgiyi girin" : ""}</Toggle>)}
      <label>Doğrulama kaynağı<select value={source} onChange={e => setSource(e.target.value as typeof source)}>{Object.entries(sourceLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><Note label="Doğrulama notu (isteğe bağlı)" value={note} onChange={setNote} /><button className="sheet-primary" type="button" disabled={!areas.length} onClick={() => void check()}>Seçili bilgileri doğrula</button>
    </fieldset>
    <details><summary>Doğrulama geçmişi</summary>{records.filter(r => r.workflow.kind === "contact-check").slice().reverse().map(r => r.workflow.kind === "contact-check" ? <article className="followup-record" key={r.id}><strong>{dateLabel(r.civilDate)} · {sourceLabels[r.workflow.source]}</strong><p>{r.workflow.areas.map(a => areaLabels[a]).join(" · ")}</p><p>{r.workflow.note}</p></article> : null)}</details>
  </section>;
}

function PickupPanel({ student, records, today, disabled, save, onEdit }: PanelProps & { student: StoredRecord; onEdit(): void }) {
  const contacts = studentContactsFromRecord(student.contacts).filter(c => c.isAuthorizedPickup && c.name?.trim());
  const [contactId, setContactId] = useState(""); const [time, setTime] = useState(clockLabel(new Date().toISOString())); const [note, setNote] = useState("");
  const activeLog = records.find(r => r.civilDate === today && r.workflow.kind === "pickup-log" && !records.some(e => e.workflow.kind === "pickup-correction" && e.workflow.sourceId === r.id));
  const submit = async () => { const contact = contacts.find(c => c.id === contactId); if (!contact) return; const handedOverAt = new Date(`${today}T${time}:00+03:00`).toISOString(); if (await save({ kind: "pickup-log", contact: pickupContactSnapshot(contact), handedOverAt, note: normalize(note), authorityFingerprint: await followupFingerprint(contactAreaValue(student, "pickup")) }, today)) { setContactId(""); setNote(""); } };
  return <section><h3>Günlük teslim defteri</h3><p>Teslim alan gerçek kişiyi seçin. Kayda kişi bilgisi, o andaki yetkisi ve saat birlikte alınır.</p>
    {!contacts.length ? <p>Teslim almaya yetkili, adı yazılı bir kişi bulunmuyor. <button type="button" onClick={onEdit}>Yetkili kişileri düzenle</button></p> : null}
    {activeLog ? <p className="followup-success">Seçilen günün teslimi kaydedildi. Düzeltme gerekirse aşağıdaki kayda gerekçe ekleyin.</p> : null}
    <fieldset disabled={disabled || !!activeLog}><legend>{dateLabel(today)} teslimi</legend><label>Teslim alan kişi<select aria-label="Teslim alan kişi" value={contactId} onChange={e => setContactId(e.target.value)}><option value="">Yetkili kişi seçin</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.relationship}</option>)}</select></label><Input label="Gerçek teslim saati" type="time" value={time} onChange={setTime} /><Note label="Teslim notu (isteğe bağlı)" value={note} onChange={setNote} /><button type="button" className="sheet-primary" disabled={!contactId || !time} onClick={() => void submit()}>Teslimi kaydet</button></fieldset>
    <h4>Teslim geçmişi</h4>{records.filter(r => r.workflow.kind === "pickup-log").slice().reverse().map(r => r.workflow.kind === "pickup-log" ? <article className="followup-record" key={r.id}><strong>{dateLabel(r.civilDate)} · {clockLabel(r.workflow.handedOverAt)}</strong><p>{r.workflow.contact.name} · {r.workflow.contact.relationship} · {r.workflow.contact.phone}</p><p>{r.workflow.note}</p>{records.filter(e => e.workflow.kind === "pickup-correction" && e.workflow.sourceId === r.id).map(e => <p key={e.id}><b>Düzeltme: </b>{e.workflow.kind === "pickup-correction" ? e.workflow.note : ""}</p>)}{r.civilDate === today && !records.some(e => e.workflow.kind === "pickup-correction" && e.workflow.sourceId === r.id) ? <RecordAction label="Gerekçeli düzeltme ekle" source={r} kind="pickup-correction" disabled={disabled} today={today} save={save} /> : null}</article> : null)}
    <details><summary>Teslim yetkisi değişiklik geçmişi</summary><p>Bu özellikten önceki yetki değişiklikleri geriye dönük üretilmez.</p>{records.filter(r => r.workflow.kind === "pickup-authority").slice().reverse().map(r => r.workflow.kind === "pickup-authority" ? <article className="followup-record" key={r.id}><strong>{dateLabel(r.civilDate)} · {clockLabel(r.createdAt)}</strong><p>{r.workflow.before?.name ?? "Yeni kişi"} → {r.workflow.after?.name ?? "Kişi kaldırıldı"}</p><p>Önce: {r.workflow.before?.authorized ? "Yetkili" : "Yetkisiz"} · Sonra: {r.workflow.after?.authorized ? "Yetkili" : "Yetkisiz"}</p><p>{r.workflow.reason}</p></article> : null)}</details>
  </section>;
}

function MeetingPanel({ records, today, disabled, save }: PanelProps) {
  const [participants, setParticipants] = useState(""); const [discussion, setDiscussion] = useState(""); const [decision, setDecision] = useState(""); const [date, setDate] = useState(today); const [followupOn, setFollowupOn] = useState("");
  return <section><h3>Veli görüşmesi ve takip</h3><fieldset disabled={disabled}><legend>Yeni görüşme</legend><Input label="Görüşme tarihi" type="date" value={date} onChange={setDate} max={today} /><Input label="Görüşmeye katılanlar" value={participants} onChange={setParticipants} /><Note label="Görüşülen konu ve aileden alınan bilgi" value={discussion} onChange={setDiscussion} /><Note label="Birlikte alınan karar / yapılacak iş" value={decision} onChange={setDecision} /><Input label="Takip tarihi (isteğe bağlı)" type="date" value={followupOn} onChange={setFollowupOn} min={date} /><button type="button" className="sheet-primary" disabled={!participants.trim() || !discussion.trim() || !decision.trim() || !date} onClick={() => void save({ kind: "family-meeting", participants: normalize(participants), discussion: normalize(discussion), decision: normalize(decision), followupOn: followupOn || null }, date).then(ok => { if (ok) { setParticipants(""); setDiscussion(""); setDecision(""); setFollowupOn(""); } })}>Görüşmeyi kaydet</button></fieldset>
    <h4>Görüşme geçmişi</h4>{records.filter(r => r.workflow.kind === "family-meeting").slice().reverse().map(r => r.workflow.kind === "family-meeting" ? <article className="followup-record" key={r.id}><strong>{dateLabel(r.civilDate)} · {r.workflow.participants}</strong><p>{r.workflow.discussion}</p><p><b>Karar: </b>{r.workflow.decision}</p><p>{r.workflow.followupOn ? `İlk takip: ${dateLabel(r.workflow.followupOn)}` : "Takip tarihi belirlenmedi"}</p>{records.filter(e => e.workflow.kind === "followup-resolution" && e.workflow.sourceId === r.id).map(e => e.workflow.kind === "followup-resolution" ? <blockquote key={e.id}><b>{dateLabel(e.civilDate)}: </b>{e.workflow.outcome}<small>{e.workflow.nextFollowupOn ? `Yeni takip: ${dateLabel(e.workflow.nextFollowupOn)}` : "Takip tamamlandı"}</small></blockquote> : null)}<RecordAction label="Takip sonucu ekle" kind="followup-resolution" source={r} disabled={disabled} today={today} save={save} /></article> : null)}
  </section>;
}

function RecordAction({ label, source, kind, disabled, today, save }: { label: string; source: TeacherFollowupRecord; kind: "pickup-correction" | "followup-resolution" | "guide-observation" | "learning-reflection"; disabled: boolean; today: string; save: Save }) {
  const [note, setNote] = useState(""); const [nextStep, setNextStep] = useState(""); const [nextDate, setNextDate] = useState(""); const [status, setStatus] = useState<"continuing" | "completed">("continuing");
  const submit = () => { const sourceId = source.id; const n = normalize(note); const workflow: TeacherWorkflow = kind === "pickup-correction" ? { kind, sourceId, note: n } : kind === "followup-resolution" ? { kind, sourceId, outcome: n, nextFollowupOn: nextDate || null } : kind === "guide-observation" ? { kind, sourceId, observation: n, status, nextFollowupOn: status === "completed" ? null : nextDate || null } : { kind, sourceId, reflection: n, nextStep: normalize(nextStep), nextFollowupOn: nextDate || null }; void save(workflow).then(ok => { if (ok) { setNote(""); setNextStep(""); setNextDate(""); } }); };
  return <details><summary>{label}</summary><fieldset disabled={disabled}><legend>{label}</legend><Note label={kind === "pickup-correction" ? "Düzeltme gerekçesi" : kind === "guide-observation" ? "Tarihli uyum gözlemi" : "Takip sonucu / öğretmen değerlendirmesi"} value={note} onChange={setNote} />{kind === "learning-reflection" ? <Note label="Bundan sonraki öğretmen adımı" value={nextStep} onChange={setNextStep} /> : null}{kind === "guide-observation" ? <label>Adımın durumu<select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="continuing">Devam ediyor</option><option value="completed">Tamamlandı</option></select></label> : null}{kind !== "pickup-correction" && !(kind === "guide-observation" && status === "completed") ? <Input label="Yeni takip tarihi (boşsa hatırlatma kapanır)" type="date" value={nextDate} onChange={setNextDate} min={today} /> : null}<button type="button" className="sheet-primary" disabled={!note.trim() || (kind === "learning-reflection" && !nextStep.trim())} onClick={submit}>Sonucu kaydet</button></fieldset></details>;
}

function GuidePanel({ records, today, disabled, save }: PanelProps) {
  const [guide, setGuide] = useState<OrientationGuide | null>(null); const [failed, setFailed] = useState(false); const [page, setPage] = useState(6); const [title, setTitle] = useState(""); const [plannedOn, setPlannedOn] = useState(today);
  useEffect(() => { let alive = true; void loadOrientationGuide().then(g => { if (alive) setGuide(g); }).catch(() => { if (alive) setFailed(true); }); return () => { alive = false; }; }, []);
  return <section><h3>Uyum rehberinden öğretmen adımları</h3><p>Adımı rehberi okuyarak siz belirleyin. Bu liste öğretmen takibidir; kaynak metni ve kayıtlı adımlarınız korunur.</p>{failed ? <p role="alert">Rehber metni okunamadı. Kaynak sayfayı görmeden adım eklemeyin; çalışma alanını yeniden açarak deneyin.</p> : null}<fieldset disabled={disabled || !guide}><legend>Kaynağa bağlı adım ekle</legend><label>Özgün rehber sayfası<select aria-label="Uyum kaynak sayfası" value={page} onChange={e => setPage(Number(e.target.value))}>{guide?.pages.map(p => <option key={p.number} value={p.number}>PDF {p.number} · {p.title}</option>)}</select></label><details><summary>Kaynak metnini aç · sayfa {page}</summary><p style={{ whiteSpace: "pre-wrap" }}>{guide?.pages.find(item => item.number === page)?.text}</p></details><Input label="Uygulayacağınız uyum adımı" value={title} onChange={setTitle} /><Input label="Planlanan uygulama tarihi" type="date" value={plannedOn} onChange={setPlannedOn} /><button type="button" className="sheet-primary" disabled={!title.trim() || !plannedOn} onClick={() => void save({ kind: "guide-step", page, sourceSha256: GUIDE_DIGEST, title: normalize(title), plannedOn }).then(ok => { if (ok) setTitle(""); })}>Uyum adımını ekle</button></fieldset>
    {records.filter(r => r.workflow.kind === "guide-step").slice().reverse().map(r => r.workflow.kind === "guide-step" ? <article className="followup-record" key={r.id}><strong>{r.workflow.title}</strong><p>Planlanan: {dateLabel(r.workflow.plannedOn)} · Özgün PDF sayfası {r.workflow.page}</p><details><summary>Kaynak metni</summary><p style={{ whiteSpace: "pre-wrap" }}>{guide?.pages.find(item => r.workflow.kind === "guide-step" && item.number === r.workflow.page)?.text}</p></details>{records.filter(e => e.workflow.kind === "guide-observation" && e.workflow.sourceId === r.id).map(e => e.workflow.kind === "guide-observation" ? <blockquote key={e.id}><b>{dateLabel(e.civilDate)} · {e.workflow.status === "completed" ? "Tamamlandı" : "Devam ediyor"}</b><p>{e.workflow.observation}</p>{e.workflow.nextFollowupOn ? <small>Takip: {dateLabel(e.workflow.nextFollowupOn)}</small> : null}</blockquote> : null)}<RecordAction label="Uyum gözlemi ekle" kind="guide-observation" source={r} disabled={disabled} today={today} save={save} /></article> : null)}
  </section>;
}

function LearningPanel({ snapshot, student, records, today, disabled, save, apply, onPlans }: PanelProps & { snapshot: DataSnapshot; student: StoredRecord; apply(decisionId: string, planId: string, expectedUpdatedAt: string, appliedText: string): Promise<boolean>; onPlans(): void }) {
  const observations = snapshot.observations.filter(o => typeof o.deletedAt !== "string" && o.classroomId === student.classroomId && o.academicYearId === student.academicYearId && (o.studentId === student.id || (Array.isArray(o.studentIds) && o.studentIds.includes(student.id))) && o.civilDate <= today).sort((a, b) => b.civilDate.localeCompare(a.civilDate));
  const [selected, setSelected] = useState<string[]>([]); const [support, setSupport] = useState<SupportChoice>("observe-again"); const [decision, setDecision] = useState(""); const [weekStart, setWeekStart] = useState(nextMonday(today)); const [weekEnd, setWeekEnd] = useState(plusDay(nextMonday(today), 4)); const [reviewOn, setReviewOn] = useState(plusDay(nextMonday(today), 4));
  return <section><h3>Gözlem → öğretmen kararı → sonraki hafta</h3><p>Mevcut gözlemlerden destek kararı seçin. Taslak, siz hedef plana ekleyene kadar bekler. Çocuğun başarısı veya gelişim sonucu otomatik yazılmaz.</p>
    <fieldset disabled={disabled}><legend>Gözleme dayalı destek taslağı</legend><details><summary>Kaynak gözlemleri seç · {selected.length} seçili</summary>{observations.length ? observations.map(o => <Toggle key={o.id} checked={selected.includes(o.id)} onClick={() => setSelected(s => s.includes(o.id) ? s.filter(id => id !== o.id) : [...s, o.id])}><span><strong>{dateLabel(o.civilDate)}</strong><small>{String(o.rawText ?? "")}</small></span></Toggle>) : <p>Bu çocuğa bağlı kayıtlı gözlem yok. Önce gerçek bir gözlem kaydedin.</p>}</details><label>Öğretmenin destek seçimi<select value={support} onChange={e => setSupport(e.target.value as SupportChoice)}>{Object.entries(supportLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><Note label="Gözleme dayanarak planladığınız destek" value={decision} onChange={setDecision} /><Input label="Hedef hafta başlangıcı" type="date" value={weekStart} onChange={setWeekStart} min={plusDay(today, 1)} /><Input label="Hedef hafta bitişi" type="date" value={weekEnd} onChange={setWeekEnd} min={weekStart} /><Input label="Uygulama sonrası değerlendirme tarihi" type="date" value={reviewOn} onChange={setReviewOn} min={weekStart} /><button type="button" className="sheet-primary" disabled={!selected.length || !decision.trim()} onClick={() => void save({ kind: "learning-decision", observationIds: selected, support, teacherDecision: normalize(decision), targetWeekStart: weekStart, targetWeekEnd: weekEnd, reviewOn }).then(ok => { if (ok) { setSelected([]); setDecision(""); } })}>Sonraki hafta taslağına al</button></fieldset>
    {records.filter(r => r.workflow.kind === "learning-decision").slice().reverse().map(r => <LearningRecord key={r.id} record={r} snapshot={snapshot} records={records} today={today} disabled={disabled} save={save} apply={apply} onPlans={onPlans} />)}
  </section>;
}
function LearningRecord({ record, snapshot, records, today, disabled, save, apply, onPlans }: PanelProps & { record: TeacherFollowupRecord; snapshot: DataSnapshot; apply(decisionId: string, planId: string, expectedUpdatedAt: string, appliedText: string): Promise<boolean>; onPlans(): void }) {
  const w = record.workflow; const [planId, setPlanId] = useState(""); const [text, setText] = useState(w.kind === "learning-decision" ? w.teacherDecision : "");
  if (w.kind !== "learning-decision") return null;
  const plans = snapshot.plans.filter(isTeacherOwnedPlanRecord).filter(p => p.planType === "weekly" && p.classroomId === record.classroomId && p.academicYearId === record.academicYearId && p.periodStart === w.targetWeekStart && p.periodEnd === w.targetWeekEnd);
  const link = latestFollowupEvent(records, record.id, "learning-plan-link");
  return <article className="followup-record"><strong>{supportLabels[w.support]} · {dateLabel(w.targetWeekStart)}–{dateLabel(w.targetWeekEnd)}</strong><p>{w.teacherDecision}</p><small>{w.observationIds.length} kaynak gözlem · Değerlendirme: {dateLabel(w.reviewOn)}</small><details><summary>Bağlı gözlemleri oku</summary>{w.observationIds.map(id => { const o = snapshot.observations.find(o => o.id === id); return <blockquote key={id}><strong>{o ? dateLabel(o.civilDate) : "Kaynak bulunamadı"}</strong><p>{String(o?.rawText ?? "")}</p></blockquote>; })}</details>
    {link?.workflow.kind === "learning-plan-link" ? <p className="followup-success">Öğretmen planına eklendi · revizyon {link.workflow.planRevision}</p> : <details><summary>Taslağı hedef haftanın planına ekle</summary>{plans.length ? <fieldset disabled={disabled}><legend>Plana aktarım</legend><label>Hedef haftanın planı<select aria-label="Destek hedef planı" value={planId} onChange={e => setPlanId(e.target.value)}><option value="">Plan seçin</option>{plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><Note label="Plana eklenecek öğretmen metni" value={text} onChange={setText} maxLength={8000} /><button type="button" className="sheet-primary" disabled={!planId || !text.trim()} onClick={() => { const p = plans.find(p => p.id === planId); if (p) void apply(record.id, p.id, p.updatedAt, text); }}>Seçtiğim metni plana ekle</button></fieldset> : <p>Bu tarih aralığında öğretmen haftalık planı yok. Taslak burada korunuyor. <button type="button" onClick={onPlans}>Hedef haftayı planlarda hazırla</button></p>}</details>}
    {records.filter(r => r.workflow.kind === "learning-reflection" && r.workflow.sourceId === record.id).map(r => r.workflow.kind === "learning-reflection" ? <blockquote key={r.id}><strong>{dateLabel(r.civilDate)}</strong><p>{r.workflow.reflection}</p><p><b>Sonraki adım: </b>{r.workflow.nextStep}</p></blockquote> : null)}{today >= w.targetWeekStart ? <RecordAction label="Uygulama sonrası değerlendirme ekle" source={record} kind="learning-reflection" disabled={disabled} today={today} save={save} /> : <p>Uygulama sonrası değerlendirme {dateLabel(w.targetWeekStart)} tarihinde açılır.</p>}
  </article>;
}

function PreparationPanel({ snapshot, records, today, disabled, save, onPlans }: PanelProps & { snapshot: DataSnapshot; onPlans(): void }) {
  const [start, setStart] = useState(nextMonday(today)); const [end, setEnd] = useState(plusDay(nextMonday(today), 4)); const [selected, setSelected] = useState<string[]>([]);
  const [items, setItems] = useState<ReturnType<typeof combinePreparationItems>>([]); const [extra, setExtra] = useState("");
  const scope = resolveActiveClassroomScope(snapshot)!;
  const candidates = preparationCandidates(snapshot, scope, start, end);
  const chosen = candidates.filter(c => selected.includes(c.source.id));
  const [enriching, setEnriching] = useState(false);
  const combine = async () => {
    setEnriching(true);
    try {
      const { getActivityStudioItem } = await import("../activity-studio/activity-studio-model.ts");
      const enriched = chosen.map(c => { const record = snapshot[c.source.collection].find(r => r.id === c.source.id); const activity = typeof record?.sourceActivityId === "string" ? getActivityStudioItem(record.sourceActivityId) : null; return activity && c.missingMaterials ? { ...c, materials: [...activity.materials], preparation: [...c.preparation], missingMaterials: false } : c; });
      setItems(combinePreparationItems(enriched, start));
    } finally { setEnriching(false); }
  };
  return <section><h3>Haftalık malzeme ve hazırlık</h3><p>Gerçek plan ve etkinliklerden kaynak seçin. Aynı yazılan malzeme tek maddede birleşir; farklı miktarlar otomatik toplanmaz.</p><fieldset disabled={disabled || enriching}><legend>Haftayı ve kaynakları seçin</legend><Input label="Hazırlık haftası başlangıcı" type="date" value={start} onChange={v => { setStart(v); setSelected([]); setItems([]); }} /><Input label="Hazırlık haftası bitişi" type="date" value={end} onChange={v => { setEnd(v); setSelected([]); setItems([]); }} min={start} />{candidates.length ? candidates.map(c => <Toggle key={c.source.id} checked={selected.includes(c.source.id)} onClick={() => { setSelected(s => s.includes(c.source.id) ? s.filter(id => id !== c.source.id) : [...s, c.source.id]); setItems([]); }}><span>{c.source.title}<small>{c.source.collection === "plans" ? "Plan" : "Etkinlik"}{c.missingMaterials ? " · malzeme bilgisi kaynak seçilince kontrol edilir" : ` · ${c.materials.length} malzeme`}</small></span></Toggle>) : <p>Bu tarihlerde seçilebilir kayıtlı plan / etkinlik yok. <button type="button" onClick={onPlans}>Haftayı planlarda hazırla</button></p>}<button type="button" disabled={!chosen.length} onClick={() => void combine()}>Seçilen kaynakların hazırlığını birleştir</button>
      {chosen.length ? <><p>Kaynakta malzeme yazılmamışsa eksik bilgiyi aşağıdan kendiniz ekleyebilirsiniz.</p>{items.map((item, index) => <div className="followup-prep-edit" key={item.id}><Input label={`Hazırlık maddesi ${index + 1}`} value={item.text} onChange={text => setItems(rows => rows.map(r => r.id === item.id ? { ...r, text } : r))} /><Toggle checked={item.advance} onClick={() => setItems(rows => rows.map(r => r.id === item.id ? { ...r, advance: !r.advance } : r))}>Önceden hazırlanacak</Toggle><Input label={`Madde ${index + 1} son hazırlık tarihi`} type="date" value={item.dueOn} onChange={dueOn => setItems(rows => rows.map(r => r.id === item.id ? { ...r, dueOn } : r))} max={end} /><button type="button" onClick={() => setItems(rows => rows.filter(r => r.id !== item.id))}>Bu maddeyi taslaktan kaldır</button></div>)}<Input label="Öğretmenin ek hazırlık maddesi" value={extra} onChange={setExtra} /><button type="button" disabled={!extra.trim()} onClick={() => { setItems(rows => [...rows, { id: crypto.randomUUID(), text: normalize(extra), advance: true, dueOn: start, sourceIds: chosen.map(c => c.source.id) }]); setExtra(""); }}>Ek maddeyi taslağa al</button><button type="button" className="sheet-primary" disabled={!items.length || items.some(i => !i.text.trim() || !i.dueOn)} onClick={() => void save({ kind: "preparation-list", weekStart: start, weekEnd: end, sources: chosen.map(c => c.source), items: items.map(i => ({ ...i, text: normalize(i.text) })) }).then(ok => { if (ok) { setItems([]); setSelected([]); } })}>Haftalık hazırlık listesini kaydet</button></> : null}
    </fieldset>
    {records.filter(r => r.workflow.kind === "preparation-list").slice().reverse().map(r => r.workflow.kind === "preparation-list" ? <article className="followup-record" key={r.id}><strong>{dateLabel(r.workflow.weekStart)}–{dateLabel(r.workflow.weekEnd)} hazırlığı</strong><details><summary>Seçilen kaynaklar · {r.workflow.sources.length}</summary>{r.workflow.sources.map(s => <p key={s.id}>{s.title}{snapshot[s.collection].find(v => v.id === s.id)?.updatedAt !== s.updatedAt ? " · kaynak sonradan değişti, hazırlığı yeniden kontrol edin" : ""}</p>)}</details>{r.workflow.items.map(item => { const checks = records.filter(e => e.workflow.kind === "preparation-check" && e.workflow.sourceId === r.id && e.workflow.itemId === item.id); const latest = checks.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; const completed = latest?.workflow.kind === "preparation-check" && latest.workflow.completed; return <Toggle key={item.id} checked={!!completed} disabled={disabled} onClick={() => void save({ kind: "preparation-check", sourceId: r.id, itemId: item.id, completed: !completed })}><span>{item.text}<small>{item.advance ? "Ön hazırlık · " : ""}{dateLabel(item.dueOn)}{completed ? " · Hazır" : " · Bekliyor"}</small></span></Toggle>; })}</article> : null)}
  </section>;
}
