import { initialOfficialFormValue } from "./official-form-initial-values.ts";
import { OfficialLegacyArchiveReview } from "./OfficialLegacyArchiveReview.tsx";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import type { DataSnapshot, StoredRecord } from "../../core/domain/model.ts";
import { resolveActiveClassroomScope } from "../../core/domain/classroom-scope.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { registerOfficialFormExportSession } from "./official-form-session.ts";
import { canonicalJson } from "../../core/backup/canonical-json.ts";
import { curriculumAgeBandFromLabel } from "../curriculum/curriculum-catalog.ts";
import { officialFormPeriod, isOfficialFormRecord, migrateLegacyOfficialForms, saveOfficialForm, sameOfficialFormScope, type FormValue, type OfficialFormScope } from "./official-form-record.ts";

interface FormContext { store: LocalDataStore; snapshot: DataSnapshot; scope: OfficialFormScope; formId: string; values: Record<string, FormValue>; registerField: (key: string, value: FormValue) => void; setField: (key: string, value: FormValue) => void }
const Context = createContext<FormContext | null>(null);
const storeQueues = new WeakMap<LocalDataStore, Promise<unknown>>();
const CHILD_FORMS = new Set(["anecdote", "child_interview", "skill_acquisition", "term_report", "portfolio", "guidance", "student_intake", "self_peer", "rubric", "family_need", "family_participation", "family_activity", "differentiation"]);
export function useOfficialFormContext(): FormContext {
  const value = useContext(Context);
  if (!value) throw new Error("Formu sınıfın Resmî Formlar çalışma alanından açın.");
  return value;
}
export function useOfficialFormChildren(): StoredRecord[] {
  const { snapshot, scope } = useOfficialFormContext();
  return snapshot.students.filter(s => !s.deletedAt && s.classroomId === scope.classroomId && (!scope.studentIds.length || scope.studentIds.includes(s.id)));
}
export function useOfficialFormState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const ctx = useOfficialFormContext();
  const initialRef = useRef<{ value: T } | null>(null);
  if (!initialRef.current) initialRef.current = { value: initialOfficialFormValue(key, typeof initial === "function" ? (initial as () => T)() : initial, ctx) as T };
  const value = (Object.hasOwn(ctx.values, key) ? ctx.values[key] : initialRef.current.value) as T;
  ctx.registerField(key, value as FormValue);
  const valueRef = useRef(value); valueRef.current = value;
  const setValue: Dispatch<SetStateAction<T>> = next => {
    const resolved = typeof next === "function" ? (next as (old: T) => T)(valueRef.current) : next;
    valueRef.current = resolved;
    ctx.setField(key, resolved as FormValue);
  };
  return [value, setValue];
}

export function OfficialFormRecordProvider({ store, formId, disabled = false, children }: { store: LocalDataStore; formId: string; disabled?: boolean; children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [studentId, setStudentId] = useState("");
  const [period, setPeriod] = useState(() => civilDateInIstanbul(new Date()));
  const [ageBand, setAgeBand] = useState("");
  const [error, setError] = useState("");
  const [migrationCount, setMigrationCount] = useState(0);
  useEffect(() => {
    let live = true;
    void (async () => {
      await storeQueues.get(store)?.catch(() => undefined);
      const count = await migrateLegacyOfficialForms(store, localStorage);
      const source = await store.readSnapshot();
      if (live) {
        const active = resolveActiveClassroomScope(source);
        const classroom = source.classrooms.find(record => record.id === active?.classroomId);
        setAgeBand(curriculumAgeBandFromLabel(typeof classroom?.ageGroup === "string" ? classroom.ageGroup : undefined) ?? "");
        setMigrationCount(count); setSnapshot(source);
      }
    })().catch(() => { if (live) setError("Form kayıtları açılamadı. Kaynaklar korunuyor; çalışma alanını yeniden açın."); });
    return () => { live = false; };
  }, [store]);
  if (error) return <p role="alert">{error}</p>;
  if (!snapshot) return <p role="status">Şifreli form kayıtları açılıyor…</p>;
  const active = resolveActiveClassroomScope(snapshot);
  if (!active) return <p role="status">Form kaydetmek için önce bir eğitim yılı ve sınıf oluşturun.</p>;
  const students = snapshot.students.filter(s => !s.deletedAt && s.classroomId === active.classroomId && s.academicYearId === active.academicYearId && s.active !== false);
  const needsChild = CHILD_FORMS.has(formId);
  const yearStart = String(snapshot.academicYears.find(y => y.id === active.academicYearId)?.startDate ?? period);
  const scope: OfficialFormScope = { ...active, period: officialFormPeriod(formId, period, yearStart), ageBand, studentIds: needsChild && studentId ? [studentId] : [] };
  return <div className="official-record-workspace">
    <div className="official-record-scope no-print">
      {formId !== "checklist" && <label>{["monthly", "monthly_evaluation"].includes(formId) ? "Kayıt ayı" : "Kayıt tarihi"} <input type={["monthly", "monthly_evaluation"].includes(formId) ? "month" : "date"} value={["monthly", "monthly_evaluation"].includes(formId) ? period.slice(0, 7) : period} onChange={e => { if (e.target.value) setPeriod(e.target.type === "month" ? `${e.target.value}-01` : e.target.value); }} disabled={disabled} /></label>}
      <label>Yaş bandı <select disabled={disabled} value={ageBand} onChange={e => setAgeBand(e.target.value)}><option value="">Yaş bandını seçin</option><option value="36-48">36–48 ay</option><option value="48-60">48–60 ay</option><option value="60-72">60–72 ay</option></select></label>
      {needsChild && <label>Çocuk <select value={studentId} onChange={e => setStudentId(e.target.value)} disabled={disabled}><option value="">Kayıtlı çocuk seçin</option>{students.map(s => <option key={s.id} value={s.id}>{String(s.displayName)}</option>)}</select></label>}
    </div>
    <OfficialLegacyArchiveReview store={store} records={snapshot.settings.filter(r => r.settingType === "official-form-legacy-v1")} onChange={() => void store.readSnapshot().then(setSnapshot)} />
    {migrationCount > 0 && <p role="status">{migrationCount} eski form kaynağı şifreli kasada ve yedek kapsamındadır. Eski örnekler gerçek çocuk kayıtlarına otomatik bağlanmadı.</p>}
    {!ageBand ? <p role="status">Form için öğretmenin belirlediği yaş bandını seçin.</p> : formId === "checklist" && ageBand !== "60-72" ? <p role="status">Bu EK-15 kaynağı yalnız 60–72 ay için doğrulandı. Seçili sınıf yaş bandı için doğrulanmış çizelge henüz yok.</p> : needsChild && !studentId ? <p role="status">Bu belge için kayıtlı çocuğu seçin. Kaynaksız çocuk bilgisi üretilmez.</p> : <FormSession key={`${formId}:${studentId}:${scope.period}:${ageBand}`} {...{ store, formId, scope, snapshot, disabled }}>{children}</FormSession>}
  </div>;
}
function FormSession({ store, formId, scope, snapshot, disabled, children }: { store: LocalDataStore; formId: string; scope: OfficialFormScope; snapshot: DataSnapshot; disabled: boolean; children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [values, setValues] = useState<Record<string, FormValue>>({});
  const valuesRef = useRef(values);
  const revision = useRef(0);
  const [status, setStatus] = useState("Kayıt açılıyor…");
  const [failed, setFailed] = useState(false);
  const live = useRef(true);
  const failure = useRef(false);
  const sequence = useRef(0);
  const persisted = useRef("{}");
  useEffect(() => {
    live.current = true;
    void (async () => {
      await storeQueues.get(store)?.catch(() => undefined);
      const source = await store.readSnapshot();
      const records = source.settings.filter(isOfficialFormRecord).filter(r => r.formId === formId && sameOfficialFormScope(r, scope));
      if (records.length > 1) throw new Error("Aynı kapsamda birden fazla kayıt var.");
      const record = records[0];
      revision.current = record?.revision ?? 0;
      valuesRef.current = { ...(record?.formValues ?? {}) };
      persisted.current = canonicalJson(valuesRef.current);
      if (live.current) { setValues({ ...valuesRef.current }); setLoaded(true); setStatus(record ? "Kayıt cihazda saklı" : "Yeni taslak · henüz değişiklik yok"); }
    })().catch(() => { if (live.current) { setFailed(true); setStatus("Kayıt açılamadı; yeniden açın."); } });
    return () => { live.current = false; };
  }, [store, formId, scope.classroomId, scope.academicYearId, scope.period, scope.ageBand, scope.studentIds.join(",")]);
  const setField = useCallback((key: string, value: FormValue) => {
    if (disabled || failed || failure.current) return;
    const next = { ...valuesRef.current, [key]: value };
    valuesRef.current = next; setValues(next); setStatus("Cihaza kaydediliyor…");
    const ticket = ++sequence.current;
    const previous = storeQueues.get(store)?.catch(() => undefined) ?? Promise.resolve();
    const settle = new Promise(resolve => setTimeout(resolve, 180));
    const task = Promise.all([previous, settle]).then(async () => {
      if (ticket !== sequence.current) return;
      if (failure.current) throw new Error("Önceki kayıt tamamlanmadı.");
      const record = await saveOfficialForm(store, formId, scope, next, revision.current);
      revision.current = record.revision;
      persisted.current = canonicalJson(next);
      if (live.current && ticket === sequence.current) setStatus("Kayıt cihazda saklı");
    });
    storeQueues.set(store, task);
    void task.catch(() => { failure.current = true; if (live.current) { setFailed(true); setStatus("Kaydetme tamamlanmadı veya başka sekmede kayıt değişti. Metin bu ekranda korundu; yeniden açmadan önce kopyalayın."); } });
  }, [disabled, failed, store, formId, scope]);
  useEffect(() => registerOfficialFormExportSession(async () => {
    const expectedValues = canonicalJson(valuesRef.current);
    await storeQueues.get(store);
    if (canonicalJson(valuesRef.current) !== expectedValues) throw new Error("Çıktı hazırlanırken form değişti. Yeniden deneyin.");
    if (failure.current || disabled || !loaded) throw new Error("Kayıt tamamlanmadan çıktı hazırlanamaz.");
    if (canonicalJson(valuesRef.current) !== persisted.current) {
      const saved = await saveOfficialForm(store, formId, scope, valuesRef.current, revision.current);
      revision.current = saved.revision;
      persisted.current = canonicalJson(saved.formValues);
    }
    const source = await store.readSnapshot();
    const record = source.settings.filter(isOfficialFormRecord).find(r => r.formId === formId && sameOfficialFormScope(r, scope));
    if (!record || record.revision !== revision.current || canonicalJson(record.formValues) !== persisted.current) throw new Error("Çıktı kaynağı başka sekmede değişti; formu yeniden açın.");
    return structuredClone(record);
  }), [store, formId, scope, disabled, loaded]);
  const registerField = (key: string, value: FormValue) => {
    if (!Object.hasOwn(valuesRef.current, key)) valuesRef.current[key] = value;
  };
  if (!loaded) return <p role={failed ? "alert" : "status"}>{status}</p>;
  return <Context.Provider value={{ store, snapshot, scope, formId, values, registerField, setField }}><p className="official-record-status no-print" role={failed ? "alert" : "status"}>{status}</p><fieldset disabled={disabled || failed} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset></Context.Provider>;
}
