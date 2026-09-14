import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import type {
  GrowthMeasurementMetric,
  GrowthMeasurementSource,
  GrowthMeasurementValueRecord,
} from "../../core/domain/growth-measurements.ts";
import type { DataSnapshot } from "../../core/domain/model.ts";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { downloadBrowserFile } from "../documents/browser-file-download.ts";
import { requestPdfPreview } from "../documents/pdf-preview-model.ts";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import { GROWTH_COPY } from "./growth-copy.ts";
import {
  saveGrowthMeasurementBatch,
  selectGrowthMeasurement,
  type SaveGrowthMeasurementInput,
} from "./growth-measurement-service.ts";
import {
  buildGrowthWorkspace,
  growthAgeMonths,
  growthChartPoints,
  growthChartSegments,
  growthDaysBetween,
  matchedGrowthChange,
  type GrowthChartPoint,
  type GrowthMetricState,
  type GrowthStudentPeriodState,
  type GrowthWorkspaceModel,
} from "./growth-model.ts";
import {
  formatGrowthInteger,
  parseGrowthDisplayValue,
} from "./growth-value.ts";
import type {
  GrowthImportCandidate,
  GrowthImportField,
  GrowthImportMapping,
  GrowthImportReview,
  GrowthImportSheet,
} from "./growth-spreadsheet.ts";
import "./growth-measurements.css";

export interface GrowthMeasurementsWorkspaceProps {
  readonly store: LocalDataStore;
  readonly initialStudentId?: string;
  readonly refreshKey?: unknown;
  readonly disabled?: boolean;
  readonly onChanged?: () => void;
}

type GrowthTab = "entry" | "student" | "class" | "missing" | "documents";
type MetricMode = "repeat" | "correction";

interface MetricDraft {
  value: string;
  measuredOn: string;
  source: GrowthMeasurementSource;
  mode: MetricMode;
  correctionReason: string;
  measuredBy: string;
  instrument: string;
  conditionsNote: string;
  documentDate: string;
}

function emptyMetricDraft(today: string): MetricDraft {
  return {
    value: "",
    measuredOn: today,
    source: "school",
    mode: "repeat",
    correctionReason: "",
    measuredBy: "",
    instrument: "",
    conditionsNote: "",
    documentDate: "",
  };
}

function displayDate(value: string): string {
  return value.split("-").reverse().join(".");
}

function studentName(state: Pick<GrowthStudentPeriodState, "student">): string {
  return String(state.student.displayName ?? "İsimsiz öğrenci");
}

function statusClass(status: GrowthStudentPeriodState["status"]): string {
  return `growth-status growth-status--${status}`;
}

function MetricHistory({
  metric,
  state,
  disabled,
  onSelect,
}: {
  metric: GrowthMeasurementMetric;
  state: GrowthMetricState;
  disabled: boolean;
  onSelect(record: GrowthMeasurementValueRecord): Promise<void>;
}) {
  if (!state.history.length) return null;
  return <details className="growth-history">
    <summary>{GROWTH_COPY.metrics[metric]} geçmişi · {state.history.length}</summary>
    <ol>{[...state.history].reverse().map((record) => {
      const current = record.id === state.selected?.id;
      return <li key={record.id}>
        <div><strong>{formatGrowthInteger(record.integerValue, metric)}</strong><small>{displayDate(record.measuredOn)} · {GROWTH_COPY.sources[record.source]}{record.eventKind === "correction" ? " · Düzeltme" : ""}</small></div>
        {current
          ? <span className="growth-current-value">Geçerli sonuç</span>
          : <button type="button" disabled={disabled} onClick={() => void onSelect(record)}>Geçerli yap</button>}
        {record.correctionReason ? <p>Düzeltme gerekçesi: {record.correctionReason}</p> : null}
      </li>;
    })}</ol>
  </details>;
}

function GrowthLineChart({
  title,
  metric,
  points,
}: {
  title: string;
  metric: GrowthMeasurementMetric;
  points: readonly GrowthChartPoint[];
}) {
  const valid = points.filter((point) =>
    point.integerValue !== null && point.measuredOn !== null);
  const segments = growthChartSegments(points);
  const values = valid.map((point) => point.integerValue!);
  const dates = valid.map((point) => Date.parse(`${point.measuredOn}T00:00:00.000Z`));
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const minDate = dates.length ? Math.min(...dates) : 0;
  const maxDate = dates.length ? Math.max(...dates) : 1;
  const x = (point: GrowthChartPoint) => {
    const time = Date.parse(`${point.measuredOn}T00:00:00.000Z`);
    return minDate === maxDate ? 160 : 34 + ((time - minDate) / (maxDate - minDate)) * 252;
  };
  const y = (point: GrowthChartPoint) => minimum === maximum
    ? 72
    : 126 - ((point.integerValue! - minimum) / (maximum - minimum)) * 88;
  const label = valid.length
    ? `${valid.length} gerçek ölçüm noktası. ${points.filter((point) => point.integerValue === null).length} eksik dönem sıfır olarak çizilmedi.`
    : "Henüz ölçüm noktası yok.";
  return <figure className="growth-chart">
    <figcaption><strong>{title}</strong><span>{label}</span></figcaption>
    <svg viewBox="0 0 320 150" role="img" aria-label={`${title}. ${label}`}>
      <title>{title}</title>
      <line x1="34" y1="24" x2="34" y2="126" className="growth-chart__axis" />
      <line x1="34" y1="126" x2="296" y2="126" className="growth-chart__axis" />
      {segments.map((segment, index) => segment.length > 1
        ? <polyline key={index} points={segment.map((point) => `${x(point)},${y(point)}`).join(" ")} className="growth-chart__line" />
        : null)}
      {valid.map((point) => <g key={point.periodKey}>
        <circle cx={x(point)} cy={y(point)} r="5" className="growth-chart__point" />
        <text x={x(point)} y={Math.max(14, y(point) - 9)} textAnchor="middle">{formatGrowthInteger(point.integerValue!, metric)}</text>
        <text x={x(point)} y="143" textAnchor="middle">{point.measuredOn!.slice(5).split("-").reverse().join(".")}</text>
      </g>)}
    </svg>
    <ul className="growth-chart__accessible-list">{points.map((point) => <li key={point.periodKey}>
      <span>{point.periodLabel}</span><strong>{point.integerValue === null ? "Ölçülmedi" : formatGrowthInteger(point.integerValue, metric)}</strong><small>{point.measuredOn ? displayDate(point.measuredOn) : "Tarih yok"}</small>
    </li>)}</ul>
  </figure>;
}

function MetricEntry({
  metric,
  current,
  draft,
  disabled,
  today,
  onChange,
}: {
  metric: GrowthMeasurementMetric;
  current: GrowthMetricState;
  draft: MetricDraft;
  disabled: boolean;
  today: string;
  onChange(patch: Partial<MetricDraft>): void;
}) {
  const label = GROWTH_COPY.metrics[metric];
  return <fieldset className="growth-metric-entry" disabled={disabled}>
    <legend>{label}</legend>
    {current.selected ? <div className="growth-previous-value"><span>Şu an geçerli</span><strong>{formatGrowthInteger(current.selected.integerValue, metric)}</strong><small>{displayDate(current.selected.measuredOn)} · {GROWTH_COPY.sources[current.selected.source]}</small></div> : <p>Bu dönem için {label.toLocaleLowerCase("tr-TR")} kaydı yok.</p>}
    {current.selected ? <div className="growth-mode" role="group" aria-label={`${label} kayıt türü`}>
      <button type="button" aria-pressed={draft.mode === "repeat"} onClick={() => onChange({ mode: "repeat", correctionReason: "" })}>Tekrar ölçüm</button>
      <button type="button" aria-pressed={draft.mode === "correction"} onClick={() => onChange({ mode: "correction" })}>Düzeltme</button>
    </div> : null}
    <label>{label} ({metric === "height" ? "cm" : "kg"})
      <KeyboardInput inputMode="decimal" value={draft.value} placeholder={metric === "height" ? "112,5" : "19,40"} aria-label={`${label} değeri`} onChange={(event) => onChange({ value: event.target.value })} />
    </label>
    <label>Gerçek {label.toLocaleLowerCase("tr-TR")} ölçüm tarihi
      <KeyboardInput type="date" max={today} value={draft.measuredOn} aria-label={`${label} ölçüm tarihi`} onChange={(event) => onChange({ measuredOn: event.target.value })} />
    </label>
    <label>Kaynak
      <select aria-label={`${label} kaynağı`} value={draft.source} onChange={(event) => onChange({ source: event.target.value as GrowthMeasurementSource })}>
        {Object.entries(GROWTH_COPY.sources).map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
    {draft.mode === "correction" && current.selected ? <label>Düzeltme gerekçesi
      <KeyboardTextarea rows={2} maxLength={1_000} value={draft.correctionReason} aria-label={`${label} düzeltme gerekçesi`} onChange={(event) => onChange({ correctionReason: event.target.value })} />
    </label> : null}
    <details><summary>İsteğe bağlı ölçüm ayrıntıları</summary>
      <label>Ölçen kişi<KeyboardInput maxLength={160} value={draft.measuredBy} onChange={(event) => onChange({ measuredBy: event.target.value })} /></label>
      <label>Kullanılan araç<KeyboardInput maxLength={160} value={draft.instrument} onChange={(event) => onChange({ instrument: event.target.value })} /></label>
      {draft.source === "document" ? <label>Belge tarihi<KeyboardInput type="date" max={today} value={draft.documentDate} onChange={(event) => onChange({ documentDate: event.target.value })} /></label> : null}
      <label>Ölçüm koşulu notu<KeyboardTextarea rows={2} maxLength={2_000} value={draft.conditionsNote} onChange={(event) => onChange({ conditionsNote: event.target.value })} /></label>
    </details>
  </fieldset>;
}

function EntryEditor({
  state,
  workspace,
  store,
  disabled,
  onSaved,
  onCancel,
}: {
  state: GrowthStudentPeriodState;
  workspace: GrowthWorkspaceModel;
  store: LocalDataStore;
  disabled: boolean;
  onSaved(next: boolean): Promise<void>;
  onCancel(): void;
}) {
  const [height, setHeight] = useState(() => emptyMetricDraft(workspace.today));
  const [weight, setWeight] = useState(() => emptyMetricDraft(workspace.today));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (next: boolean) => {
    if (busy) return;
    setError("");
    try {
      const inputs: SaveGrowthMeasurementInput[] = [];
      for (const [metric, draft, current] of [
        ["height", height, state.height],
        ["weight", weight, state.weight],
      ] as const) {
        if (!draft.value.trim()) continue;
        const input: SaveGrowthMeasurementInput = {
          ...workspace.scope,
          studentId: state.student.id,
          periodKey: state.period.key,
          metric,
          integerValue: parseGrowthDisplayValue(draft.value, metric),
          measuredOn: draft.measuredOn,
          source: draft.source,
          expectedSelectionEventId: current.selectionEventId,
          measuredBy: draft.measuredBy,
          instrument: draft.instrument,
          conditionsNote: draft.conditionsNote,
          documentDate: draft.source === "document" ? draft.documentDate || undefined : undefined,
          ...(current.selected && draft.mode === "repeat" ? { repeatOfId: current.selected.id } : {}),
          ...(current.selected && draft.mode === "correction" ? { correction: { correctsId: current.selected.id, reason: draft.correctionReason } } : {}),
        };
        inputs.push(input);
      }
      if (!inputs.length) throw new Error("Boy veya kilo alanlarından en az birini doldurun.");
      setBusy(true);
      await saveGrowthMeasurementBatch(store, inputs);
      await onSaved(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ölçüm kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };
  return <section className="growth-entry-editor" aria-label={`${studentName(state)} ölçüm girişi`}>
    <header><div><small>{state.period.label}</small><h3>{studentName(state)}</h3></div><button type="button" onClick={onCancel} disabled={busy}>Kapat</button></header>
    {state.period.windowStart > workspace.today ? <p role="status">Bu dönem henüz başlamadı; gelecek ölçüm bugünden kaydedilmez.</p> : <>
      <MetricEntry metric="height" current={state.height} draft={height} disabled={disabled || busy} today={workspace.today} onChange={(patch) => setHeight((current) => ({ ...current, ...patch }))} />
      <button className="growth-same-date" type="button" disabled={disabled || busy || !height.measuredOn} onClick={() => setWeight((current) => ({ ...current, measuredOn: height.measuredOn }))}>Boy tarihini kilo için de kullan</button>
      <MetricEntry metric="weight" current={state.weight} draft={weight} disabled={disabled || busy} today={workspace.today} onChange={(patch) => setWeight((current) => ({ ...current, ...patch }))} />
      {error ? <p className="growth-error" role="alert">{error}</p> : null}
      <div className="growth-entry-actions"><button type="button" disabled={disabled || busy} onClick={() => void save(false)}>{busy ? "Kaydediliyor…" : "Kaydet"}</button><button type="button" className="growth-primary" disabled={disabled || busy} onClick={() => void save(true)}>Kaydet ve sıradakine geç</button></div>
    </>}
  </section>;
}

function PeriodPicker({
  workspace,
  value,
  onChange,
}: {
  workspace: GrowthWorkspaceModel;
  value: string;
  onChange(value: string): void;
}) {
  return <div className="growth-period-picker" role="group" aria-label="Ölçüm dönemi">
    {workspace.periods.map((period) => <button type="button" key={period.key} aria-pressed={period.key === value} onClick={() => onChange(period.key)}><span>{period.label}</span><small>{period.key}</small></button>)}
  </div>;
}

function EntryView({
  workspace,
  store,
  periodKey,
  disabled,
  initialStudentId,
  onPeriodChange,
  onReload,
}: {
  workspace: GrowthWorkspaceModel;
  store: LocalDataStore;
  periodKey: string;
  disabled: boolean;
  initialStudentId?: string;
  onPeriodChange(value: string): void;
  onReload(): Promise<void>;
}) {
  const eligible = workspace.states.filter((state) =>
    state.period.key === periodKey && state.membership !== "out-of-scope");
  const [editingId, setEditingId] = useState<string | null>(initialStudentId ?? null);
  useEffect(() => { if (initialStudentId) setEditingId(initialStudentId); }, [initialStudentId]);
  const editing = eligible.find((state) => state.student.id === editingId);
  const afterSave = async (next: boolean) => {
    const currentIndex = eligible.findIndex((state) => state.student.id === editingId);
    await onReload();
    setEditingId(next && eligible.length > 1
      ? eligible[(currentIndex + 1) % eligible.length]!.student.id
      : null);
  };
  return <section className="growth-view" aria-label="Dönem ölçüm çizelgesi">
    <PeriodPicker workspace={workspace} value={periodKey} onChange={(value) => { onPeriodChange(value); setEditingId(null); }} />
    {editing ? <EntryEditor key={`${editing.student.id}:${editing.period.key}:${editing.height.selectionEventId}:${editing.weight.selectionEventId}`} state={editing} workspace={workspace} store={store} disabled={disabled} onSaved={afterSave} onCancel={() => setEditingId(null)} /> : null}
    <ol className="growth-roster">{eligible.map((state, index) => <li key={state.student.id}>
      <button type="button" disabled={disabled || state.membership === "review" || state.period.windowStart > workspace.today} onClick={() => setEditingId(state.student.id)} aria-label={`${studentName(state)} ölçümünü aç`}>
        <span className="growth-roster__number">{index + 1}</span><span><strong>{studentName(state)}</strong><small>{state.height.selected ? formatGrowthInteger(state.height.selected.integerValue, "height") : "Boy bekliyor"} · {state.weight.selected ? formatGrowthInteger(state.weight.selected.integerValue, "weight") : "Kilo bekliyor"}</small></span><span className={statusClass(state.status)}>{GROWTH_COPY.statuses[state.status]}</span>
      </button>
    </li>)}</ol>
    {!eligible.length ? <p>{GROWTH_COPY.noChildren}</p> : null}
    <p className="growth-scope-note">Kapsam dışındaki {workspace.states.filter((state) => state.period.key === periodKey && state.membership === "out-of-scope").length.toLocaleString("tr-TR")} çocuk bu iş listesine alınmadı.</p>
  </section>;
}

function StudentView({
  workspace,
  store,
  studentId,
  disabled,
  onStudentChange,
  onReload,
}: {
  workspace: GrowthWorkspaceModel;
  store: LocalDataStore;
  studentId: string;
  disabled: boolean;
  onStudentChange(value: string): void;
  onReload(): Promise<void>;
}) {
  const [fromKey, setFromKey] = useState(workspace.periods[0]!.key);
  const [toKey, setToKey] = useState(workspace.periods.at(-1)!.key);
  const [error, setError] = useState("");
  const student = workspace.students.find((record) => record.id === studentId) ?? workspace.students[0];
  if (!student) return <p>{GROWTH_COPY.noChildren}</p>;
  const states = workspace.states.filter((state) => state.student.id === student.id);
  const selectHistory = async (state: GrowthStudentPeriodState, metric: GrowthMeasurementMetric, record: GrowthMeasurementValueRecord) => {
    try {
      setError("");
      await selectGrowthMeasurement(store, {
        ...workspace.scope,
        studentId: student.id,
        periodKey: state.period.key,
        metric,
        selectedMeasurementId: record.id,
        expectedSelectionEventId: state[metric].selectionEventId,
        reason: "manual-review",
      });
      await onReload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sonuç seçilemedi."); }
  };
  const first = states.find((state) => state.period.key === fromKey);
  const last = states.find((state) => state.period.key === toKey);
  const change = (metric: GrowthMeasurementMetric) => {
    const a = first?.[metric].selected;
    const b = last?.[metric].selected;
    return a && b && a.measuredOn <= b.measuredOn
      ? { difference: b.integerValue - a.integerValue, days: growthDaysBetween(a.measuredOn, b.measuredOn) }
      : null;
  };
  return <section className="growth-view" aria-label="Çocuk boy-kilo görünümü">
    <label className="growth-select-label">Çocuk<select value={student.id} onChange={(event) => onStudentChange(event.target.value)}>{workspace.students.map((record) => <option key={record.id} value={record.id}>{String(record.displayName)}</option>)}</select></label>
    <GrowthLineChart title={`${String(student.displayName)} · Boy`} metric="height" points={growthChartPoints(workspace, student.id, "height")} />
    <GrowthLineChart title={`${String(student.displayName)} · Kilo`} metric="weight" points={growthChartPoints(workspace, student.id, "weight")} />
    <section className="growth-change" aria-label="Çocuğun dönemler arası değişimi"><h3>Tarihli değişim</h3><div><label>İlk dönem<select value={fromKey} onChange={(event) => setFromKey(event.target.value)}>{workspace.periods.slice(0, -1).map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}</select></label><label>Son dönem<select value={toKey} onChange={(event) => setToKey(event.target.value)}>{workspace.periods.filter((period) => period.key > fromKey).map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}</select></label></div>
      <p>Boy: <strong>{change("height") ? `${formatGrowthInteger(change("height")!.difference, "height", { signed: true })} · ${change("height")!.days} gün` : "İki gerçek değer gerekli"}</strong></p>
      <p>Kilo: <strong>{change("weight") ? `${formatGrowthInteger(change("weight")!.difference, "weight", { signed: true })} · ${change("weight")!.days} gün` : "İki gerçek değer gerekli"}</strong></p>
    </section>
    {error ? <p className="growth-error" role="alert">{error}</p> : null}
    <ol className="growth-period-cards">{states.map((state) => <li key={state.period.key}><header><strong>{state.period.label}</strong><span className={statusClass(state.status)}>{GROWTH_COPY.statuses[state.status]}</span></header>
      <dl><div><dt>Boy</dt><dd>{state.height.selected ? `${formatGrowthInteger(state.height.selected.integerValue, "height")} · ${displayDate(state.height.selected.measuredOn)}` : "Ölçülmedi"}</dd></div><div><dt>Kilo</dt><dd>{state.weight.selected ? `${formatGrowthInteger(state.weight.selected.integerValue, "weight")} · ${displayDate(state.weight.selected.measuredOn)}` : "Ölçülmedi"}</dd></div></dl>
      {state.height.selected ? <small>Boy ölçüm yaşı: {growthAgeMonths(student, state.height.selected.measuredOn) ?? "Doğum tarihi yok"}{typeof growthAgeMonths(student, state.height.selected.measuredOn) === "number" ? " tamamlanmış ay" : ""}</small> : null}
      <MetricHistory metric="height" state={state.height} disabled={disabled} onSelect={(record) => selectHistory(state, "height", record)} />
      <MetricHistory metric="weight" state={state.weight} disabled={disabled} onSelect={(record) => selectHistory(state, "weight", record)} />
    </li>)}</ol>
  </section>;
}

function ClassView({ workspace }: { workspace: GrowthWorkspaceModel }) {
  const [fromKey, setFromKey] = useState(workspace.periods[0]!.key);
  const [toKey, setToKey] = useState(workspace.periods.at(-1)!.key);
  const heightChange = matchedGrowthChange(workspace, fromKey, toKey, "height");
  const weightChange = matchedGrowthChange(workspace, fromKey, toKey, "weight");
  const classPoints = (metric: GrowthMeasurementMetric): GrowthChartPoint[] => workspace.statistics.map((item) => ({
    periodKey: item.period.key,
    periodLabel: `${item.period.label} · n=${item[metric].n}`,
    measuredOn: item[metric].mean === null ? null : item.period.windowStart,
    integerValue: item[metric].mean,
    source: null,
  }));
  return <section className="growth-view" aria-label="Sınıf boy-kilo özeti">
    <p className="growth-notice">{GROWTH_COPY.classAverageNotice}</p>
    <GrowthLineChart title="Sınıf boy ortalamaları" metric="height" points={classPoints("height")} />
    <GrowthLineChart title="Sınıf kilo ortalamaları" metric="weight" points={classPoints("weight")} />
    <ol className="growth-statistics">{workspace.statistics.map((item) => <li key={item.period.key}><h3>{item.period.label}</h3><p>Kapsam <strong>n={item.expectedN}</strong> · ikisi tamam <strong>n={item.completeN}</strong>{item.completionRate === null ? " · Kapsamda çocuk yok" : ` · %${(item.completionRate * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`}</p>
      <dl><div><dt>Boy</dt><dd>n={item.height.n} · ort. {item.height.mean === null ? "—" : formatGrowthInteger(item.height.mean, "height")} · ortanca {item.height.median === null ? "—" : formatGrowthInteger(item.height.median, "height")} · aralık {item.height.minimum === null ? "—" : `${formatGrowthInteger(item.height.minimum, "height")}–${formatGrowthInteger(item.height.maximum!, "height")}`}</dd></div><div><dt>Kilo</dt><dd>n={item.weight.n} · ort. {item.weight.mean === null ? "—" : formatGrowthInteger(item.weight.mean, "weight")} · ortanca {item.weight.median === null ? "—" : formatGrowthInteger(item.weight.median, "weight")} · aralık {item.weight.minimum === null ? "—" : `${formatGrowthInteger(item.weight.minimum, "weight")}–${formatGrowthInteger(item.weight.maximum!, "weight")}`}</dd></div></dl>
      <p className="growth-source-mix">Boy kaynakları: okul {item.heightSources.school}, aile {item.heightSources.family}, belge {item.heightSources.document}. Kilo kaynakları: okul {item.weightSources.school}, aile {item.weightSources.family}, belge {item.weightSources.document}.</p>
      {item.reviewN ? <p>{item.reviewN} üyelik / sonuç kaydı inceleme bekliyor.</p> : null}
    </li>)}</ol>
    <section className="growth-change" aria-label="Aynı çocuklarla sınıf değişimi"><h3>Aynı çocuklarla değişim</h3><div><label>İlk dönem<select value={fromKey} onChange={(event) => { const next = event.target.value; setFromKey(next); if (toKey <= next) setToKey(workspace.periods.find((period) => period.key > next)?.key ?? workspace.periods.at(-1)!.key); }}>{workspace.periods.slice(0, -1).map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}</select></label><label>Son dönem<select value={toKey} onChange={(event) => setToKey(event.target.value)}>{workspace.periods.filter((period) => period.key > fromKey).map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}</select></label></div>
      <p>Boy: <strong>{heightChange.meanChange === null ? "Eşleşen çocuk yok" : `${formatGrowthInteger(heightChange.meanChange, "height", { signed: true })} · eşleşen n=${heightChange.matchedN}`}</strong></p><p>Kilo: <strong>{weightChange.meanChange === null ? "Eşleşen çocuk yok" : `${formatGrowthInteger(weightChange.meanChange, "weight", { signed: true })} · eşleşen n=${weightChange.matchedN}`}</strong></p>
    </section>
  </section>;
}

function MissingView({
  workspace,
  periodKey,
  onPeriodChange,
  onOpen,
}: {
  workspace: GrowthWorkspaceModel;
  periodKey: string;
  onPeriodChange(value: string): void;
  onOpen(studentId: string): void;
}) {
  const missing = workspace.states.filter((state) =>
    state.period.key === periodKey && state.membership === "included" &&
    (!state.height.selected || !state.weight.selected));
  const groups = [
    { id: "both", title: "Boy ve kilo bekleyen", rows: missing.filter((state) => !state.height.selected && !state.weight.selected) },
    { id: "height", title: "Yalnız boy bekleyen", rows: missing.filter((state) => !state.height.selected && state.weight.selected) },
    { id: "weight", title: "Yalnız kilo bekleyen", rows: missing.filter((state) => state.height.selected && !state.weight.selected) },
  ];
  return <section className="growth-view" aria-label="Eksik boy-kilo ölçümleri"><PeriodPicker workspace={workspace} value={periodKey} onChange={onPeriodChange} />
    {groups.map((group) => <section className="growth-missing-group" key={group.id}><h3>{group.title} · {group.rows.length}</h3>{group.rows.length ? <ul>{group.rows.map((state) => <li key={state.student.id}><span>{studentName(state)}</span><button type="button" onClick={() => onOpen(state.student.id)}>Ölçümü aç</button></li>)}</ul> : <p>Bu grupta eksik yok.</p>}</section>)}
    {!missing.length ? <p role="status">Seçilen dönemde kapsamdaki çocuklar için eksik ölçüm yok.</p> : null}
  </section>;
}

function GrowthImportPanel({
  snapshot,
  workspace,
  store,
  disabled,
  onCommitted,
}: {
  snapshot: DataSnapshot;
  workspace: GrowthWorkspaceModel;
  store: LocalDataStore;
  disabled: boolean;
  onCommitted(): Promise<void>;
}) {
  const moduleRef = useRef<typeof import("./growth-spreadsheet.ts") | null>(null);
  const [sheets, setSheets] = useState<GrowthImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<GrowthImportMapping>({});
  const [candidates, setCandidates] = useState<GrowthImportCandidate[]>([]);
  const [reviews, setReviews] = useState<GrowthImportReview[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sheet = sheets[sheetIndex];
  const loadFile = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setError(""); setCandidates([]); setReviews([]); setSelected(new Set());
    try {
      const module = await import("./growth-spreadsheet.ts");
      moduleRef.current = module;
      const next = module.readGrowthWorkbook(await file.arrayBuffer(), file.name);
      if (!next.length) throw new Error("Dosyada okunabilir ölçüm sayfası yok.");
      setSheets(next); setFileName(file.name); setSheetIndex(0);
      setHeaderRow(next[0]!.suggestedHeader); setMapping(next[0]!.suggestedMapping);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Dosya okunamadı."); }
    finally { setBusy(false); }
  };
  const preview = () => {
    if (!sheet || !moduleRef.current) return;
    try {
      const next = moduleRef.current.growthImportCandidates(sheet, headerRow, mapping);
      const checked = moduleRef.current.reviewGrowthImport(next, snapshot, workspace.scope, workspace.today);
      setCandidates(next); setReviews(checked); setSelected(new Set()); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ölçüm önizlenemedi."); }
  };
  const updateCandidate = (sourceRow: number, field: GrowthImportField, value: string) => {
    const next = candidates.map((candidate) => candidate.sourceRow === sourceRow ? {
      ...candidate, values: { ...candidate.values, [field]: value },
    } : candidate);
    setCandidates(next);
    if (moduleRef.current) setReviews(moduleRef.current.reviewGrowthImport(next, snapshot, workspace.scope, workspace.today));
    setSelected((current) => { const result = new Set(current); result.delete(sourceRow); return result; });
  };
  const commit = async () => {
    if (!moduleRef.current || busy) return;
    setBusy(true); setError("");
    try {
      await moduleRef.current.commitGrowthImport(store, { reviews, selectedSourceRows: [...selected] });
      await onCommitted(); setSheets([]); setCandidates([]); setReviews([]); setSelected(new Set()); setFileName("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ölçümler içe aktarılamadı."); }
    finally { setBusy(false); }
  };
  return <details className="growth-import"><summary>Ölçüm dosyasını önizleyerek içe aktar</summary><p>{GROWTH_COPY.importIdentity}</p>
    <label className="growth-file"><span>{fileName || "XLSX / CSV dosyası"}</span><span>Dosya seç</span><input type="file" aria-label="Boy-kilo ölçüm dosyası" accept=".xlsx,.xls,.csv,.tsv" disabled={disabled || busy} onChange={(event) => { void loadFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
    {sheet && !reviews.length ? <><div className="growth-import__selectors"><label>Çalışma sayfası<select value={sheetIndex} onChange={(event) => { const index = Number(event.target.value); const next = sheets[index]!; setSheetIndex(index); setHeaderRow(next.suggestedHeader); setMapping(next.suggestedMapping); }}>{sheets.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label><label>Başlık satırı<select value={headerRow} onChange={(event) => { const row = Number(event.target.value); setHeaderRow(row); setMapping(moduleRef.current!.suggestGrowthImportMapping(sheet.rows, row)); }}>{sheet.rows.slice(0, 20).map((_, index) => <option key={index} value={index}>Satır {index + 1}</option>)}</select></label></div>
      <details open><summary>Sütun eşleştirmesini kontrol et</summary><div className="growth-import__mapping">{Object.entries((moduleRef.current!).GROWTH_IMPORT_FIELDS).map(([field, label]) => <label key={field}>{label}<select value={mapping[field as GrowthImportField] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value === "" ? undefined : Number(event.target.value) }))}><option value="">Dosyada yok</option>{(sheet.rows[headerRow] ?? []).map((header, index) => <option key={index} value={index}>{index + 1}. {header || "Başlıksız"}</option>)}</select></label>)}</div></details>
      <button type="button" className="growth-primary" disabled={disabled || busy} onClick={preview}>Ölçümleri önizle</button></> : null}
    {reviews.length ? <><div className="growth-import__summary" role="status">{reviews.length} satır · {reviews.filter((review) => !review.errors.length).length} kaydedilebilir · {selected.size} seçili</div><button type="button" onClick={() => setSelected(new Set(reviews.filter((review) => !review.errors.length).map((review) => review.candidate.sourceRow)))}>Hatasızları seç</button><ol className="growth-import__rows">{reviews.map((review) => <li key={review.candidate.sourceRow}>
      <label className="growth-import__select"><input type="checkbox" checked={selected.has(review.candidate.sourceRow)} disabled={disabled || busy || Boolean(review.errors.length)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(review.candidate.sourceRow); else next.delete(review.candidate.sourceRow); return next; })} /><span><strong>Satır {review.candidate.sourceRow} · {review.studentName}</strong><small>{review.displayValue} · {review.candidate.values.periodKey}</small></span></label>
      {review.errors.map((message) => <p className="growth-error" key={message}>{message}</p>)}{review.warnings.map((message) => <p className="growth-warning" key={message}>{message}</p>)}
      <details><summary>Önizlenen değeri düzelt</summary><label>Değer<KeyboardInput inputMode="decimal" value={review.candidate.values.value} onChange={(event) => updateCandidate(review.candidate.sourceRow, "value", event.target.value)} /></label><label>Gerçek ölçüm tarihi<KeyboardInput type="date" max={workspace.today} value={review.candidate.values.measuredOn} onChange={(event) => updateCandidate(review.candidate.sourceRow, "measuredOn", event.target.value)} /></label><label>Çocuk anahtarı<KeyboardInput value={review.candidate.values.studentId} onChange={(event) => updateCandidate(review.candidate.sourceRow, "studentId", event.target.value)} /></label></details>
    </li>)}</ol><button type="button" className="growth-primary" disabled={disabled || busy || !selected.size} onClick={() => void commit()}>{busy ? "Kaydediliyor…" : `${selected.size} ölçümü atomik kaydet`}</button></> : null}
    {error ? <p className="growth-error" role="alert">{error}</p> : null}
  </details>;
}

function DocumentsView({
  snapshot,
  workspace,
  store,
  studentId,
  disabled,
  onStudentChange,
  onReload,
}: {
  snapshot: DataSnapshot;
  workspace: GrowthWorkspaceModel;
  store: LocalDataStore;
  studentId: string;
  disabled: boolean;
  onStudentChange(value: string): void;
  onReload(): Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [spreadsheetPreview, setSpreadsheetPreview] = useState<readonly (readonly string[])[]>([]);
  const [spreadsheetScope, setSpreadsheetScope] = useState<"class" | "individual">("class");
  const [spreadsheetPreviewScope, setSpreadsheetPreviewScope] = useState("");
  const [exportPeriodKey, setExportPeriodKey] = useState("");
  const [explanation, setExplanation] = useState("");
  const exportPeriodLabel = workspace.periods.find((period) => period.key === exportPeriodKey)?.label ?? "Tüm yıl";
  const makePdf = async (template: "individual" | "class" | "blank") => {
    setBusy(true); setError("");
    try {
      const { createGrowthPdfDocument } = await import("./growth-pdf.ts");
      const file = await createGrowthPdfDocument(snapshot, workspace.today, {
        template,
        ...(template === "individual" ? { studentId } : {}),
        ...(template === "individual" && explanation.trim() ? { explanation } : {}),
        ...(exportPeriodKey ? { periodKey: exportPeriodKey } : {}),
      });
      if (!requestPdfPreview(file)) throw new Error("PDF önizleme alanı hazır değil; çalışma alanını kapatıp yeniden açın.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "PDF hazırlanamadı."); }
    finally { setBusy(false); }
  };
  const makeSpreadsheet = async () => {
    setBusy(true); setError("");
    try {
      const { createGrowthSpreadsheet } = await import("./growth-spreadsheet.ts");
      const selection = spreadsheetScope === "individual"
        ? { mode: "individual" as const, studentId, ...(exportPeriodKey ? { periodKey: exportPeriodKey } : {}) }
        : { mode: "class" as const, ...(exportPeriodKey ? { periodKey: exportPeriodKey } : {}) };
      const file = createGrowthSpreadsheet(snapshot, workspace.today, workspace.scope, selection);
      setSpreadsheetPreview(file.dataRows.slice(0, 5));
      setSpreadsheetPreviewScope(spreadsheetScope === "individual"
        ? `Seçili çocuk · ${String(workspace.students.find((student) => student.id === studentId)?.displayName ?? "")} · ${exportPeriodLabel}`
        : `Tüm sınıf · ${workspace.students.length} çocuk · ${exportPeriodLabel}`);
      downloadBrowserFile(file);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Excel hazırlanamadı."); }
    finally { setBusy(false); }
  };
  return <section className="growth-view" aria-label="Boy-kilo çıktıları">
    <p className="growth-notice">Önizlenen ve indirilen PDF aynı baytlardır. Çocuk ve dönem kapsamı PDF ile XLSX dosya adına, başlığına ve içeriğine birlikte uygulanır.</p>
    <label className="growth-select-label">Bireysel belge ve XLSX çocuğu<select value={studentId} onChange={(event) => { onStudentChange(event.target.value); setSpreadsheetPreview([]); }}>{workspace.students.map((student) => <option key={student.id} value={student.id}>{String(student.displayName)}</option>)}</select></label>
    <label className="growth-select-label">XLSX kapsamı<select value={spreadsheetScope} onChange={(event) => { setSpreadsheetScope(event.target.value as "class" | "individual"); setSpreadsheetPreview([]); }}><option value="class">Tüm sınıf</option><option value="individual">Seçili çocuk</option></select></label>
    <label className="growth-select-label">Baskı dönemi<select value={exportPeriodKey} onChange={(event) => { setExportPeriodKey(event.target.value); setSpreadsheetPreview([]); }}><option value="">Tüm yıl</option>{workspace.periods.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}</select></label>
    <label>{GROWTH_COPY.individualExplanationLabel}<KeyboardTextarea rows={3} maxLength={320} value={explanation} placeholder={GROWTH_COPY.individualExplanationPlaceholder} onChange={(event) => setExplanation(event.target.value)} /></label>
    <div className="growth-document-actions"><button type="button" disabled={disabled || busy || !studentId} onClick={() => void makePdf("individual")}>Bireysel PDF önizle</button><button type="button" disabled={disabled || busy} onClick={() => void makePdf("class")}>Sınıf çizelgesi PDF</button><button type="button" disabled={disabled || busy} onClick={() => void makePdf("blank")}>Boş çizelge PDF</button><button type="button" disabled={disabled || busy || (spreadsheetScope === "individual" && !studentId)} onClick={() => void makeSpreadsheet()}>XLSX dışa aktar</button></div>
    {spreadsheetPreview.length ? <details open><summary>Aktarılabilir veri önizlemesi · {spreadsheetPreviewScope} · ilk {spreadsheetPreview.length} satır</summary><div className="growth-table-scroll"><table><thead><tr><th>Çocuk anahtarı</th><th>Dönem</th><th>Tür</th><th>Değer</th><th>Tarih</th><th>Kaynak</th></tr></thead><tbody>{spreadsheetPreview.map((row, index) => <tr key={index}><td>{row[1]}</td><td>{row[5]}</td><td>{row[6]}</td><td>{row[7]} {row[8]}</td><td>{row[9]}</td><td>{row[10]}</td></tr>)}</tbody></table></div></details> : null}
    <GrowthImportPanel snapshot={snapshot} workspace={workspace} store={store} disabled={disabled} onCommitted={onReload} />
    {error ? <p className="growth-error" role="alert">{error}</p> : null}
  </section>;
}

export function GrowthMeasurementsWorkspace({
  store,
  initialStudentId,
  refreshKey,
  disabled = false,
  onChanged,
}: GrowthMeasurementsWorkspaceProps) {
  const today = civilDateInIstanbul(new Date());
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [workspace, setWorkspace] = useState<GrowthWorkspaceModel | null>(null);
  const [tab, setTab] = useState<GrowthTab>(initialStudentId ? "student" : "entry");
  const [periodKey, setPeriodKey] = useState("");
  const [studentId, setStudentId] = useState(initialStudentId ?? "");
  const [entryStudentId, setEntryStudentId] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const reload = async () => {
    try {
      const nextSnapshot = await store.readSnapshot();
      const nextWorkspace = buildGrowthWorkspace(nextSnapshot, civilDateInIstanbul(new Date()));
      if (!alive.current) return;
      setSnapshot(nextSnapshot); setWorkspace(nextWorkspace); setError("");
      setPeriodKey((current) => current && nextWorkspace.periods.some((period) => period.key === current)
        ? current
        : [...nextWorkspace.periods].reverse().find((period) => period.windowStart <= today)?.key ?? nextWorkspace.periods[0]!.key);
      setStudentId((current) => nextWorkspace.students.some((student) => student.id === current)
        ? current
        : initialStudentId && nextWorkspace.students.some((student) => student.id === initialStudentId)
          ? initialStudentId
          : nextWorkspace.students[0]?.id ?? "");
      setVersion((current) => current + 1);
    } catch (reason) {
      if (alive.current) setError(reason instanceof Error ? reason.message : "Boy-kilo çalışma alanı açılamadı.");
    }
  };
  const reloadAfterChange = async () => { await reload(); onChanged?.(); };
  useEffect(() => { void reload(); }, [store, refreshKey]);
  const tabs = useMemo(() => Object.entries(GROWTH_COPY.tabs) as [GrowthTab, string][], []);
  if (!workspace || !snapshot || !periodKey) return <section className="growth-workspace" aria-label={GROWTH_COPY.title}>{error ? <p className="growth-error" role="alert">{error}</p> : <p role="status">Boy-kilo çizelgesi hazırlanıyor…</p>}</section>;
  const openMissing = (id: string) => { setEntryStudentId(id); setTab("entry"); };
  return <section className="growth-workspace" aria-label={GROWTH_COPY.title} data-growth-version={version}>
    <header className="growth-workspace__header"><div><h2>{GROWTH_COPY.title}</h2><p>{String(workspace.classroom.name)} · {String(workspace.academicYear.name)}</p></div><span>Yerel · çevrim dışı</span></header>
    <p className="growth-notice">{GROWTH_COPY.nonMedicalNotice}</p>
    <nav className="growth-tabs" aria-label="Boy-kilo bölümleri">{tabs.map(([id, label]) => <button type="button" key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "entry" ? <EntryView workspace={workspace} store={store} periodKey={periodKey} disabled={disabled} initialStudentId={entryStudentId} onPeriodChange={setPeriodKey} onReload={reloadAfterChange} /> : null}
    {tab === "student" ? <StudentView workspace={workspace} store={store} studentId={studentId} disabled={disabled} onStudentChange={setStudentId} onReload={reloadAfterChange} /> : null}
    {tab === "class" ? <ClassView workspace={workspace} /> : null}
    {tab === "missing" ? <MissingView workspace={workspace} periodKey={periodKey} onPeriodChange={setPeriodKey} onOpen={openMissing} /> : null}
    {tab === "documents" ? <DocumentsView snapshot={snapshot} workspace={workspace} store={store} studentId={studentId} disabled={disabled} onStudentChange={setStudentId} onReload={reloadAfterChange} /> : null}
    {error ? <p className="growth-error" role="alert">{error}</p> : null}
  </section>;
}
