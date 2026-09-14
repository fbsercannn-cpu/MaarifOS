import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardInput, KeyboardTextarea, useKeyboard } from "../../mobile";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { resolveActiveClassroomScope, type ActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { availableFamilySlots, appointmentState, communicationPreferenceHead, currentAppointments, familyCalendarDay, familyContactSnapshot, familyEngagementRecords, familyLocalToUtc, familyScopeMatches, FAMILY_CHANNELS, FAMILY_FORMATS, resolveCommunicationPreference, type CommunicationPreference, type FamilyEngagementRecord } from "../../core/domain/family-engagement.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { studentContactsFromRecord, type StudentContact } from "../../core/domain/student.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { requestPdfDocument } from "../documents/pdf-preview-model.ts";
import { familyAppointmentPdfRecipe } from "./family-engagement-document.ts";
import { executeFamilyEngagement, FAMILY_ENGAGEMENT_CHANGED_EVENT, readFamilyEngagementSnapshot, type FamilyEngagementCommand } from "./family-engagement-service.ts";
import {
  recordOfficialAppointmentCompletion,
  resolveOfficialAppointmentTransition,
  type OfficialAppointmentCompletionRecord,
} from "./official-appointment-transition.ts";
import { calendarReasonLabels, channelLabels, familyDateLabel, formatLabels, preferenceStateLabels, weekdayLabels } from "./family-engagement-copy.ts";
import "./family-engagement.css";
import { FamilyMeetingFormPanel } from "./FamilyMeetingFormPanel.tsx";

export interface FamilyEngagementWorkspaceProps { store: LocalDataStore; initialSection: "appointments" | "communication"; initialStudentId?: string; refreshKey?: unknown; disabled?: boolean; onChanged?(): void }
type Save = (command: FamilyEngagementCommand) => Promise<FamilyEngagementRecord | null>;
type SaveOfficial = (command: {
  appointmentId: string;
  sourceAppointmentEventId: string;
  expectedPreviousCompletionId: string | null;
  officialReference: string;
  officialScheduledOn: string;
  teacherConfirmed: true;
}) => Promise<OfficialAppointmentCompletionRecord | null>;
type PanelProps = { snapshot: DataSnapshot; scope: ActiveClassroomScope; records: FamilyEngagementRecord[]; students: StoredRecord[]; today: string; save: Save; saveOfficial: SaveOfficial; initialStudentId?: string; openMeetingForm: (appointmentId: string) => void };
const Input = ({ label, value, onChange, type = "text", maxLength = 500 }: { label: string; value: string; onChange(v: string): void; type?: string; maxLength?: number }) => <label>{label}<KeyboardInput aria-label={label} value={value} type={type} onChange={e => onChange(e.target.value)} maxLength={maxLength} /></label>;
const Note = ({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) => <label>{label}<KeyboardTextarea aria-label={label} value={value} onChange={e => onChange(e.target.value)} maxLength={1000} /></label>;
const Toggle = ({ selected, onClick, children }: { selected: boolean; onClick(): void; children: ReactNode }) => <button type="button" className="family-toggle" role="checkbox" aria-checked={selected} onClick={onClick}><span aria-hidden="true">{selected ? "✓ " : "+ "}</span>{children}</button>;
const changeSet = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];
function CalendarNotice({ snapshot, scope, date }: { snapshot: DataSnapshot; scope: ActiveClassroomScope; date: string }) {
  const resolution = familyCalendarDay(snapshot, scope, date);
  return <p className={resolution.isTeachingDay ? "family-context" : "family-warning"} role="status">{resolution.reasons.map(r => calendarReasonLabels[r] ?? r).join(" · ")}{resolution.sources.filter(s => s.authority !== "Millî Eğitim Bakanlığı").map(s => ` · ${s.authority}`).join("")}</p>;
}
export function FamilyEngagementWorkspace(props: FamilyEngagementWorkspaceProps) {
  const [formAppointmentId, setFormAppointmentId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState(""), [section, setSection] = useState(props.initialSection);
  const openedScope = useRef<ActiveClassroomScope | null>(null), requestSequence = useRef(0);
  const keyboard = useKeyboard();
  useEffect(() => { if (busy) return; let alive = true; const request = ++requestSequence.current; void readFamilyEngagementSnapshot(props.store).then(s => { if (alive && request === requestSequence.current) setSnapshot(s); }).catch(() => { if (alive && request === requestSequence.current) setError("Aile katılımı kayıtları okunamadı."); }); return () => { alive = false; }; }, [props.store, props.refreshKey, revision, busy]);
  useEffect(() => { const reload = () => setRevision(r => r + 1); window.addEventListener(FAMILY_ENGAGEMENT_CHANGED_EVENT, reload); window.addEventListener("focus", reload); return () => { window.removeEventListener(FAMILY_ENGAGEMENT_CHANGED_EVENT, reload); window.removeEventListener("focus", reload); }; }, []);
  const currentScope = snapshot ? resolveActiveClassroomScope(snapshot) : null;
  if (currentScope && !openedScope.current) openedScope.current = { ...currentScope };
  const scope = openedScope.current;
  const scopeChanged = Boolean(scope && (!currentScope || !familyScopeMatches(scope, currentScope)));
  const save: Save = async command => {
    if (!scope || scopeChanged || busy || props.disabled) return null;
    keyboard.hide(); setBusy(true); setError(""); setMessage("");
    try { const result = await executeFamilyEngagement(props.store, { scope, command }); const request = ++requestSequence.current; const latest = await readFamilyEngagementSnapshot(props.store); if (request === requestSequence.current) setSnapshot(latest); setMessage("Kayıt ve geçmiş bu cihaza kaydedildi."); props.onChanged?.(); return result; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Kaydedilemedi. Önceki kayıtlar korundu."); return null; }
    finally { setBusy(false); }
  };
  const saveOfficial: SaveOfficial = async command => {
    if (!scope || scopeChanged || busy || props.disabled) return null;
    keyboard.hide(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await recordOfficialAppointmentCompletion(props.store, { ...scope, ...command });
      const request = ++requestSequence.current;
      const latest = await readFamilyEngagementSnapshot(props.store);
      if (request === requestSequence.current) setSnapshot(latest);
      setMessage("Resmî işlem referansı öğretmen onayıyla bu cihaza kaydedildi.");
      props.onChanged?.();
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Resmî işlem kaydı oluşturulamadı.");
      return null;
    } finally { setBusy(false); }
  };
  const pdf = async (date: string, appointmentId?: string) => {
    keyboard.hide(); setError("");
    try { if (snapshot && scope) await requestPdfDocument(familyAppointmentPdfRecipe(snapshot, { scope, scheduledOn: date, appointmentId })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Belge hazırlanamadı."); }
  };
  if (!snapshot) return <p role="status">Aile katılımı kayıtları hazırlanıyor…{error}</p>;
  if (scopeChanged) return <p role="alert" className="family-warning">Etkin sınıf veya eğitim yılı değişti. Eski taslağın başka sınıfa yazılmasını önlemek için aile katılımı alanını kapatıp yeniden açın.</p>;
  if (!scope) return <p>Aile katılımı için bir sınıf seçin.</p>;
  const records = familyEngagementRecords(snapshot), students = snapshot.students.filter(s => familyScopeMatches(scope, s) && typeof s.deletedAt !== "string" && s.active !== false);
  const panel: PanelProps = { snapshot, scope, records, students, today: civilDateInIstanbul(new Date()), save, saveOfficial, initialStudentId: props.initialStudentId, openMeetingForm: id => { keyboard.hide(); setFormAppointmentId(id); } };
  return <div className="family-engagement" data-testid="family-engagement-workspace"><p className="family-context">{String(snapshot.classrooms.find(c => c.id === scope.classroomId)?.name ?? "Sınıf")} · {String(snapshot.academicYears.find(y => y.id === scope.academicYearId)?.name ?? "Eğitim yılı")} · İstanbul saati</p>
    <div className="family-tabs" role="group" aria-label="Aile katılımı alanı"><button type="button" aria-pressed={section === "appointments"} onClick={() => { keyboard.hide(); setSection("appointments"); }}>Görüşme hazırlığı</button><button type="button" aria-pressed={section === "communication"} onClick={() => { keyboard.hide(); setSection("communication"); }}>İletişim tercihleri</button></div>
    {error && <p role="alert" className="family-error">{error}</p>}{message && <p role="status" className="family-success">{message}</p>}
    <button type="button" onClick={() => setRevision(v => v + 1)} disabled={busy}>Son kayıtları yenile</button>
    <fieldset disabled={busy || props.disabled} className="family-fieldset"><div hidden={section !== "appointments"}><Appointments {...panel} pdf={pdf} /></div><div hidden={section !== "communication"}><Communication {...panel} /></div></fieldset>
    {formAppointmentId && <FamilyMeetingFormPanel store={props.store} appointmentId={formAppointmentId} refreshKey={revision} disabled={props.disabled} onClose={() => setFormAppointmentId(null)} onChanged={() => { setRevision(v => v + 1); props.onChanged?.(); }} />}
    {busy && <p role="status">Kaydediliyor…</p>}
  </div>;
}
function ChildContact({ students, studentId, contactId, onStudent, onContact }: { students: StoredRecord[]; studentId: string; contactId: string; onStudent(v: string): void; onContact(v: string): void }) {
  const contacts = studentContactsFromRecord(students.find(s => s.id === studentId)?.contacts);
  return <><label>Çocuk<select aria-label="Aile katılımı çocuğu" value={studentId} onChange={e => { onStudent(e.target.value); onContact(""); }}><option value="">Çocuk seçin</option>{students.map(s => <option key={s.id} value={s.id}>{String(s.displayName ?? "Çocuk")}</option>)}</select></label><label>Yakın kişi<select aria-label="Aile katılımı yakını" value={contactId} onChange={e => onContact(e.target.value)}><option value="">Kayıtlı yakın seçin</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name || "Adı girilmemiş"} · {c.relationship}</option>)}</select></label>{studentId && !contacts.length && <p>Önce çocuk profilinin Yakınlar alanına anne, baba veya üçüncü kişiyi ekleyin.</p>}</>;
}
function Communication(props: PanelProps) {
  const [studentId, setStudentId] = useState(props.initialStudentId ?? ""), [contactId, setContactId] = useState(""), [editorVersion, setEditorVersion] = useState(0);
  const contact = studentContactsFromRecord(props.students.find(s => s.id === studentId)?.contacts).find(c => c.id === contactId);
  return <section aria-label="Yakına özel iletişim tercihleri"><h3>Yakına özel iletişim tercihleri</h3><p>Anne, baba ve üçüncü kişinin bildirimleri ayrı tutulur. Tercih, belgeye bağlı izin veya teslim yetkisi değildir. Bu alan otomatik mesaj göndermez.</p><ChildContact students={props.students} studentId={studentId} contactId={contactId} onStudent={setStudentId} onContact={setContactId} />
    {contact && <PreferenceEditor key={`${studentId}:${contactId}:${editorVersion}`} {...props} studentId={studentId} contact={contact} onSaved={() => setEditorVersion(v => v + 1)} />}
  </section>;
}
function PreferenceEditor({ snapshot, scope, records, studentId, contact, today, save, onSaved }: PanelProps & { studentId: string; contact: StudentContact; onSaved(): void }) {
  const resolution = resolveCommunicationPreference(snapshot, scope, studentId, contact.id), head = communicationPreferenceHead(records, scope, studentId, contact.id);
  const prior = resolution.state === "declared" && head?.workflow.kind === "communication-preference" ? head.workflow : null;
  const [expected] = useState(head?.id ?? null), [channels, setChannels] = useState<CommunicationPreference["channels"]>(prior?.channels ?? []), [formats, setFormats] = useState<CommunicationPreference["formats"]>(prior?.formats ?? []), [weekdays, setWeekdays] = useState(prior?.weekdays ?? []), [from, setFrom] = useState(prior?.availableFrom ?? ""), [until, setUntil] = useState(prior?.availableUntil ?? ""), [language, setLanguage] = useState(prior?.language ?? ""), [note, setNote] = useState(""), [reportedOn, setReportedOn] = useState(today), [source, setSource] = useState<"" | "oral" | "written">(""), [confirmed, setConfirmed] = useState(false);
  const submit = async (status: "declared" | "withdrawn") => {
    if (!source) return;
    if (await save({ action: "preference", studentId, preference: { contact: familyContactSnapshot(contact), previousEventId: expected, status, reportedOn, source, channels, availableFrom: from || null, availableUntil: until || null, weekdays, language, formats, note } })) onSaved();
  };
  return <div className="family-card"><p className="family-preference-state" role="status">{preferenceStateLabels[resolution.state]}</p><p>İşaretlenmeyen alanlar bildirilmemiştir. Dil veya erişim ihtiyacı isimden, aile durumundan veya başka kayıttan çıkarılmaz.</p>
    <fieldset><legend>Bildirilen iletişim kanalları</legend><div className="family-options">{FAMILY_CHANNELS.map(c => <Toggle key={c} selected={channels.includes(c)} onClick={() => setChannels(changeSet(channels, c))}>{channelLabels[c]}</Toggle>)}</div></fieldset>
    <fieldset><legend>Bildirilen uygun günler</legend><div className="family-options">{weekdayLabels.map((label, i) => <Toggle key={label} selected={weekdays.includes(i + 1)} onClick={() => setWeekdays(changeSet(weekdays, i + 1))}>{label}</Toggle>)}</div></fieldset>
    <div className="family-row"><Input label="Uygun saat başlangıcı" type="time" value={from} onChange={setFrom} /><Input label="Uygun saat bitişi" type="time" value={until} onChange={setUntil} /></div><p className="family-context">Saat belirtilmediyse iki alanı da boş bırakın. Saatler İstanbul saatidir.</p>
    <Input label="Bildirilen iletişim dili (isteğe bağlı)" value={language} onChange={setLanguage} maxLength={120} />
    <fieldset><legend>Bildirilen erişim biçimleri</legend><div className="family-options">{FAMILY_FORMATS.map(f => <Toggle key={f} selected={formats.includes(f)} onClick={() => setFormats(changeSet(formats, f))}>{formatLabels[f]}</Toggle>)}</div></fieldset>
    <Input label="Tercihin bildirildiği gün" type="date" value={reportedOn} onChange={setReportedOn} /><label>Bildirim kaynağı<select aria-label="Bildirim kaynağı" value={source} onChange={e => setSource(e.target.value as typeof source)}><option value="">Kaynak seçin</option><option value="oral">Yakının sözlü bildirimi</option><option value="written">Yakının yazılı bildirimi</option></select></label><Note label="Tercih açıklaması / geri çekme gerekçesi" value={note} onChange={setNote} /><Toggle selected={confirmed} onClick={() => setConfirmed(!confirmed)}>Bu tercihleri seçilen yakın açıkça bildirdi</Toggle>
    <div className="family-actions"><button type="button" className="sheet-primary" disabled={!source || !confirmed || !reportedOn || Boolean(from) !== Boolean(until)} onClick={() => void submit("declared")}>İletişim tercihini kaydet</button>{head && <button type="button" disabled={!source || !confirmed || !note.trim()} onClick={() => void submit("withdrawn")}>Tercihi gerekçeyle geri çek</button>}</div>
    <details><summary>Bu yakının tercih geçmişi ({records.filter(r => r.studentId === studentId && familyScopeMatches(scope, r) && r.workflow.kind === "communication-preference" && r.workflow.contact.id === contact.id).length})</summary><ol>{records.filter(r => r.studentId === studentId && familyScopeMatches(scope, r) && r.workflow.kind === "communication-preference" && r.workflow.contact.id === contact.id).map(r => <li key={r.id}>{familyDateLabel(r.civilDate)} · {r.workflow.kind === "communication-preference" ? `${r.workflow.status === "declared" ? "Bildirim kaydedildi" : "Geri çekildi"} · ${r.workflow.note || "Ek açıklama yok"}` : ""}</li>)}</ol></details>
  </div>;
}
function Appointments(props: PanelProps & { pdf(date: string, id?: string): Promise<void> }) {
  const [date, setDate] = useState(props.today), [availabilityOpen, setAvailabilityOpen] = useState(false), [editing, setEditing] = useState<string | null>(null), [detailId, setDetailId] = useState("");
  const states = currentAppointments(props.records).filter(s => s.plan && familyScopeMatches(props.scope, s.plan));
  const selected = detailId ? appointmentState(props.records, detailId) : null;
  const windows = props.records.filter(r => familyScopeMatches(props.scope, r) && r.workflow.kind === "availability" && r.workflow.scheduledOn === date);
  return <section aria-label="Veli görüşmesi hazırlığı"><h3>Veli görüşmesi hazırlığı</h3><p>Buradaki saat ve davet yalnız öğretmenin yerel hazırlığıdır; resmî randevu oluşturmaz. Çakışma kontrolü bu cihazdaki bütün sınıflarınızı kapsar. Başka cihazların ve resmî sistemin takvimi burada bilinmez.</p><Input label="Yerel hazırlık günü" type="date" value={date} onChange={setDate} /><CalendarNotice snapshot={props.snapshot} scope={props.scope} date={date} />
    <button type="button" onClick={() => setAvailabilityOpen(!availabilityOpen)}>Uygun saat aralığı aç</button>{availabilityOpen && <AvailabilityEditor {...props} date={date} onSaved={() => setAvailabilityOpen(false)} />}
    <div className="family-slots" aria-label="Uygun görüşme hazırlığı saatleri">{availableFamilySlots(props.snapshot, props.scope, date).map(s => <span className={s.available ? "family-slot-free" : "family-slot-busy"} key={`${s.availabilityId}:${s.startTime}`}>{s.startTime}–{s.endTime} · {s.available ? "Uygun" : "Dolu"}</span>)}</div>
    {!windows.length && <p>Bu gün için henüz uygun saat aralığı açılmadı.</p>}
    <button type="button" className="sheet-primary" disabled={!availableFamilySlots(props.snapshot, props.scope, date).some(s => s.available)} onClick={() => setEditing("new")}>Yeni yerel görüşme hazırlığı</button>
    {editing && <AppointmentEditor key={`editor:${editing}`} {...props} date={date} appointmentId={editing === "new" ? undefined : editing} onSaved={id => { setDetailId(id); setEditing(null); }} onCancel={() => setEditing(null)} />}
    <button type="button" onClick={() => void props.pdf(date)}>İsimsiz ortak saat çizelgesi PDF</button>
    <label>Yerel hazırlık kaydı<select aria-label="Yerel görüşme hazırlığı" value={detailId} onChange={e => setDetailId(e.target.value)}><option value="">Hazırlık seçin</option>{states.map(s => s.plan?.workflow.kind === "appointment" && <option key={s.plan.workflow.appointmentId} value={s.plan.workflow.appointmentId}>{familyDateLabel(s.plan.workflow.scheduledOn)} {s.plan.workflow.startTime} · {String(props.snapshot.students.find(c => c.id === s.plan!.studentId)?.displayName ?? "Çocuk")} · {s.status === "cancelled" ? "Yerel hazırlık iptal" : s.status === "completed" ? "Yerel görüşme kaydı var" : "Yerel hazırlık"}</option>)}</select></label>
    {selected?.plan && <AppointmentDetail key={`detail:${detailId}`} {...props} state={selected} onEdit={() => setEditing(detailId)} pdf={props.pdf} />}
    <details><summary>Uygun saat aralıkları ve kapatma geçmişi</summary>{windows.map(r => <AvailabilityRow key={r.id} record={r} records={props.records} save={props.save} />)}</details>
  </section>;
}
function AvailabilityEditor({ snapshot, scope, date, save, onSaved }: PanelProps & { date: string; onSaved(): void }) {
  const [start, setStart] = useState("14:00"), [end, setEnd] = useState("16:00"), [minutes, setMinutes] = useState("20"), [note, setNote] = useState("");
  const calendar = familyCalendarDay(snapshot, scope, date);
  return <div className="family-card"><h4>{familyDateLabel(date)} uygun saatleri</h4><div className="family-row"><Input label="Uygun aralık başlangıcı" type="time" value={start} onChange={setStart} /><Input label="Uygun aralık bitişi" type="time" value={end} onChange={setEnd} /></div><label>Görüşme süresi<select aria-label="Görüşme süresi" value={minutes} onChange={e => setMinutes(e.target.value)}>{[10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} dakika</option>)}</select></label>{!calendar.isTeachingDay && <Note label="Tatil / kapanış gününde görüşme gerekçesi" value={note} onChange={setNote} />}<button type="button" className="sheet-primary" disabled={!date || !start || !end || (!calendar.isTeachingDay && !note.trim())} onClick={() => void save({ action: "availability", availability: { scheduledOn: date, startTime: start, endTime: end, slotMinutes: Number(minutes), calendarNote: note } }).then(r => { if (r) onSaved(); })}>Uygun saatleri kaydet</button></div>;
}
function AvailabilityRow({ record, records, save }: { record: FamilyEngagementRecord; records: FamilyEngagementRecord[]; save: Save }) {
  const [reason, setReason] = useState(""); if (record.workflow.kind !== "availability") return null;
  const closed = records.find(r => r.workflow.kind === "availability-close" && r.workflow.availabilityId === record.id);
  return <div className="family-card"><p>{record.workflow.startTime}–{record.workflow.endTime} · {closed ? "Kapatıldı" : "Açık"}</p>{closed?.workflow.kind === "availability-close" ? <p>{closed.workflow.reason}</p> : <><Note label={`Aralık kapatma gerekçesi ${record.workflow.startTime}`} value={reason} onChange={setReason} /><button type="button" disabled={!reason.trim()} onClick={() => void save({ action: "close-availability", availabilityId: record.id, reason })}>Bu saat aralığını kapat</button></>}</div>;
}
function AppointmentEditor(props: PanelProps & { date: string; appointmentId?: string; onSaved(id: string): void; onCancel(): void }) {
  const previous = props.appointmentId ? appointmentState(props.records, props.appointmentId) : null, old = previous?.plan?.workflow.kind === "appointment" ? previous.plan.workflow : null;
  const [expected] = useState(previous?.last?.id ?? null), [studentId, setStudentId] = useState(previous?.plan?.studentId ?? props.initialStudentId ?? ""), [contactId, setContactId] = useState(old?.contact.id ?? ""), [date, setDate] = useState(old?.scheduledOn ?? props.date), [slot, setSlot] = useState(""), [location, setLocation] = useState(old?.location ?? ""), [purpose, setPurpose] = useState(old?.purpose ?? ""), [reason, setReason] = useState(""), [calendarNote, setCalendarNote] = useState("");
  const contact = studentContactsFromRecord(props.students.find(s => s.id === studentId)?.contacts).find(c => c.id === contactId), slots = availableFamilySlots(props.snapshot, props.scope, date, props.appointmentId), selectedSlot = slots.find(s => `${s.availabilityId}/${s.startTime}` === slot), calendar = familyCalendarDay(props.snapshot, props.scope, date);
  const pref = contact ? resolveCommunicationPreference(props.snapshot, props.scope, studentId, contact.id) : null;
  const submit = async () => { if (!contact || !selectedSlot) return; const record = await props.save({ action: "appointment", studentId, ...(props.appointmentId ? { appointmentId: props.appointmentId } : {}), appointment: { previousEventId: expected, availabilityId: selectedSlot.availabilityId, contact: familyContactSnapshot(contact), scheduledOn: date, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, location, purpose, reason, calendarNote } }); if (record?.workflow.kind === "appointment") props.onSaved(record.workflow.appointmentId); };
  return <div className="family-card"><h4>{old ? "Yerel hazırlık tarihini / saatini değiştir" : "Yeni yerel görüşme hazırlığı"}</h4><ChildContact students={props.students} studentId={studentId} contactId={contactId} onStudent={setStudentId} onContact={setContactId} /><Input label="Görüşme için hazırlanan gün" type="date" value={date} onChange={v => { setDate(v); setSlot(""); }} /><CalendarNotice snapshot={props.snapshot} scope={props.scope} date={date} />
    <label>Görüşme hazırlığı saati<select aria-label="Görüşme hazırlığı saati" value={slot} onChange={e => setSlot(e.target.value)}><option value="">Uygun saat seçin</option>{slots.map(s => <option key={`${s.availabilityId}/${s.startTime}`} value={`${s.availabilityId}/${s.startTime}`} disabled={!s.available}>{s.startTime}–{s.endTime}{!s.available ? " · Başka yerel hazırlık var" : ""}</option>)}</select></label>
    {pref && <p className="family-context">{preferenceStateLabels[pref.state]}{pref.state === "declared" && pref.preference ? ` · ${pref.preference.channels.map(c => channelLabels[c]).join(", ") || "Kanal belirtilmedi"} · ${pref.preference.availableFrom ? `${pref.preference.availableFrom}–${pref.preference.availableUntil}` : "Saat belirtilmedi"} · ${pref.preference.language || "Dil belirtilmedi"} · ${pref.preference.formats.map(f => formatLabels[f]).join(", ") || "Biçim belirtilmedi"}` : ""}</p>}
    <Input label="Görüşme yeri / yöntemi" value={location} onChange={setLocation} maxLength={300} /><Input label="Görüşme amacı" value={purpose} onChange={setPurpose} />{old && <Note label="Randevu değişiklik gerekçesi" value={reason} onChange={setReason} />}{!calendar.isTeachingDay && <Note label="Tatil / kapanış günü randevu gerekçesi" value={calendarNote} onChange={setCalendarNote} />}
    <div className="family-actions"><button type="button" className="sheet-primary" disabled={!contact || !selectedSlot?.available || !location.trim() || !purpose.trim() || (!!old && !reason.trim()) || (!calendar.isTeachingDay && !calendarNote.trim())} onClick={() => void submit()}>Yerel hazırlığı kaydet</button><button type="button" onClick={props.onCancel}>Hazırlık düzenlemeyi kapat</button></div>
  </div>;
}
function AppointmentDetail(props: PanelProps & { state: ReturnType<typeof appointmentState>; onEdit(): void; pdf(date: string, id?: string): Promise<void> }) {
  const { state } = props, w = state.plan?.workflow;
  const [mode, setMode] = useState<"cancel" | "meeting" | null>(null), [reason, setReason] = useState(""), [participants, setParticipants] = useState(w?.kind === "appointment" ? w.contact.name : ""), [discussion, setDiscussion] = useState(""), [decision, setDecision] = useState(""), [followup, setFollowup] = useState(""), [actualTime, setActualTime] = useState(w?.kind === "appointment" ? w.startTime : ""), [expected, setExpected] = useState(state.last?.id ?? ""), [officialReference, setOfficialReference] = useState(""), [officialScheduledOn, setOfficialScheduledOn] = useState(w?.kind === "appointment" ? w.scheduledOn : ""), [officialConfirmed, setOfficialConfirmed] = useState(false);
  if (w?.kind !== "appointment" || !state.last) return null;
  const meetingId = state.last.workflow.kind === "appointment-meeting" ? state.last.workflow.meetingId : null;
  const meeting = meetingId ? props.snapshot.settings.find(r => r.id === meetingId) : null;
  const official = resolveOfficialAppointmentTransition(props.snapshot, w.appointmentId);
  return <article className="family-card" aria-label="Seçilen yerel görüşme hazırlığı"><h4>{familyDateLabel(w.scheduledOn)} · {w.startTime}–{w.endTime}</h4><p>{w.contact.name || w.contact.relationship} · {w.location}</p><p>{w.purpose}</p><p className="family-appointment-status" role="status">{official.localLabel}</p><CalendarNotice snapshot={props.snapshot} scope={props.scope} date={w.scheduledOn} />
    <section className="family-card" aria-label="Resmî randevu işlemi"><h4>Resmî Okul Randevu Sistemi</h4><p>MaarifOS kaydı yalnız hazırlıktır. Resmî randevuyu Bakanlığın sisteminde tamamlayın; bu ekran rezervasyon göndermez.</p><a href={official.officialSystemUrl} target="_blank" rel="noreferrer">Resmî Okul Randevu Sistemi’ni aç</a><p className="family-appointment-status" role="status">{official.officialLabel}</p>
      {official.completion ? <p>Referans: {official.completion.officialReference} · Tarih: {familyDateLabel(official.completion.officialScheduledOn)} · Öğretmen onayı: {familyDateLabel(official.completion.civilDate)}</p> : null}
      {official.officialStatus !== "official-completed" && state.status !== "cancelled" ? <><Input label="Resmî işlem referansı" value={officialReference} onChange={setOfficialReference} maxLength={200} /><Input label="Resmî randevu tarihi" type="date" value={officialScheduledOn} onChange={setOfficialScheduledOn} /><Toggle selected={officialConfirmed} onClick={() => setOfficialConfirmed(value => !value)}>Referansı resmî sistemde gördüm ve bu işlem kaydını onaylıyorum</Toggle><button type="button" className="sheet-primary" disabled={!officialReference.trim() || officialScheduledOn !== w.scheduledOn || !officialConfirmed} onClick={() => void props.saveOfficial({ appointmentId: w.appointmentId, sourceAppointmentEventId: state.plan!.id, expectedPreviousCompletionId: official.completion?.id ?? null, officialReference, officialScheduledOn, teacherConfirmed: true }).then(record => { if (record) { setOfficialReference(""); setOfficialConfirmed(false); } })}>Resmî işlem kanıtını kaydet</button>{officialScheduledOn !== w.scheduledOn ? <p className="family-warning">Resmî tarih yerel hazırlıkla aynı olmalı; farklıysa önce yerel hazırlığı güncelleyin.</p> : null}</> : null}
    </section>
    {state.status !== "cancelled" && <button type="button" onClick={() => void props.pdf(w.scheduledOn, w.appointmentId)}>Yalnız bu veliye davet PDF</button>}
    {state.status !== "cancelled" && <button type="button" onClick={() => props.openMeetingForm(w.appointmentId)}>Gündem sonuç ve görev formunu aç</button>}
    {state.status === "scheduled" && <div className="family-actions"><button type="button" onClick={props.onEdit}>Yerel hazırlığı değiştir</button><button type="button" onClick={() => { setExpected(state.last!.id); setMode("cancel"); }}>Yerel hazırlığı iptal et</button><button type="button" disabled={w.startsAtUtc > new Date().toISOString()} onClick={() => { setExpected(state.last!.id); setMode("meeting"); }}>Görüşme sonucunu kaydet</button></div>}
    {mode === "cancel" && state.status === "scheduled" && <><Note label="Randevu iptal gerekçesi" value={reason} onChange={setReason} /><button type="button" disabled={!reason.trim()} onClick={() => void props.save({ action: "cancel", appointmentId: w.appointmentId, expectedEventId: expected, reason }).then(r => { if (r) setMode(null); })}>Gerekçeli iptali kaydet</button></>}
    {mode === "meeting" && state.status === "scheduled" && <><Input label="Gerçek görüşme saati" type="time" value={actualTime} onChange={setActualTime} /><Input label="Görüşmeye katılan kişiler" value={participants} onChange={setParticipants} /><Note label="Görüşülen konular" value={discussion} onChange={setDiscussion} /><Note label="Birlikte alınan karar" value={decision} onChange={setDecision} /><Input label="Sonraki takip günü (isteğe bağlı)" type="date" value={followup} onChange={setFollowup} /><button type="button" className="sheet-primary" disabled={!participants.trim() || !discussion.trim() || !decision.trim() || !actualTime} onClick={() => void props.save({ action: "meeting", appointmentId: w.appointmentId, expectedEventId: expected, actualAtUtc: familyLocalToUtc(w.scheduledOn, actualTime), participants, discussion, decision, followupOn: followup || null }).then(r => { if (r) setMode(null); })}>Görüşmeyi ve takibini kaydet</button></>}
    {meeting && <p>Görüşme ve takip: {familyDateLabel(meeting.civilDate)} · Çocuğun öğretmen takip alanında kayıtlı.</p>}
    <details><summary>Yerel hazırlık geçmişi ({state.events.length})</summary><ol>{state.events.map(r => <li key={r.id}>{familyDateLabel(r.civilDate)} · {r.workflow.kind === "appointment" ? `${familyDateLabel(r.workflow.scheduledOn)} ${r.workflow.startTime}–${r.workflow.endTime} · ${r.workflow.reason || "İlk yerel hazırlık"}` : r.workflow.kind === "appointment-cancel" ? `İptal: ${r.workflow.reason}` : "Görüşme kaydedildi"}</li>)}</ol></details>
  </article>;
}
