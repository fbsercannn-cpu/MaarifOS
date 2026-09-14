import { useEffect, useState } from "react";
import { CheckCircledIcon, ChevronDownIcon, CircleIcon } from "@radix-ui/react-icons";
import { TYMM_2024_DOMAINS, type Tymm2024AgeBand, type Tymm2024Domain } from "../curriculum/tymm-2024-catalog.ts";
import { TYMM_OFFICIAL_PROGRAM_PDF_URL } from "../curriculum/tymm-official-resource-catalog.ts";
import {
  getDevelopmentObservationPresets,
  DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS,
  type DevelopmentObservationSelection,
  type DevelopmentObservationSupport,
  type DevelopmentObservationPreset,
} from "./development-observation-presets.ts";
import {
  getActivityContextObservationPresets,
  resolveActivityContextObservationDomain,
  type DevelopmentObservationActivityContext,
} from "./activity-context-observation-model.ts";
import "./development-observation-picker.css";

const COPY = {
  region: "Gelişim bilgisi seç",
  context: "TYMM · yaşa uygun gelişim bilgisi",
  title: "Ne gözlemlediniz?",
  examples: "Öğretmen gözlem örnekleri",
  ageUnit: "ay",
  domain: "Öğrenme alanı",
  generalExamples: "Yaşa göre genel örnekler",
  generalGroup: "Gözlenen gelişim davranışları",
  activityExamples: "Bu etkinliğin program bağlantısından",
  activityGroup: "Etkinlikle ilişkili gözlem örnekleri",
  otherExamples: "Diğer gözlem örnekleri",
  selectedExample: "Seçilen örnek:",
  sourceDetails: "Maarif bağlantısı ve destek bilgisi",
  officialOutcome: "Resmî öğrenme çıktısı",
  sourcePage: "MEB programı · sayfa",
  exampleNotice: "Seçilen cümle bir MaarifOS gözlem örneğidir; resmî kontrol listesi veya başarı düzeyi değildir.",
  support: "Bu gözlemde verilen destek",
  unspecified: "Belirtilmedi",
  clearSelection: "Program seçimini kaldır, notu koru",
} as const;

export function DevelopmentObservationPicker({ ageBand, activityContext, selection, disabled, onSelect }: {
  ageBand: Tymm2024AgeBand;
  activityContext?: DevelopmentObservationActivityContext;
  selection?: DevelopmentObservationSelection;
  disabled: boolean;
  onSelect(selection: DevelopmentObservationSelection | undefined): void;
}) {
  const presets = getDevelopmentObservationPresets(ageBand);
  const activityPresets = getActivityContextObservationPresets(ageBand, activityContext);
  const hasActivityExamples = activityPresets.length > 0;
  const selected = presets.find((preset) => preset.id === selection?.presetId);
  const defaultDomain = selected?.domain ??
    resolveActivityContextObservationDomain(ageBand, activityContext);
  const [domain, setDomain] = useState<Tymm2024Domain>(defaultDomain);
  useEffect(() => {
    setDomain(defaultDomain);
  }, [activityContext?.id, defaultDomain, selected?.id]);
  const visiblePresets = presets.filter((preset) => preset.domain === domain);
  const selectedIsVisible = (hasActivityExamples ? activityPresets : visiblePresets)
    .some((preset) => preset.id === selected?.id);

  function choices(items: readonly DevelopmentObservationPreset[], label: string) {
    return (
      <div className="development-picker__choices" role="group" aria-label={label}>
        {items.map((preset) => (
          <button key={preset.id} type="button" disabled={disabled}
            aria-pressed={selection?.presetId === preset.id}
            onClick={() => onSelect(selection?.presetId === preset.id ? selection : { presetId: preset.id, ageBand })}>
            {selection?.presetId === preset.id ? <CheckCircledIcon aria-hidden="true" /> : <CircleIcon aria-hidden="true" />}
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    );
  }

  const library = (
    <div className="development-picker__library-content">
      <label className="development-picker__domain">
        <span>{COPY.domain}</span>
        <select value={domain} onChange={(event) => setDomain(event.target.value as Tymm2024Domain)} disabled={disabled}>
          {TYMM_2024_DOMAINS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      {choices(visiblePresets, COPY.generalGroup)}
    </div>
  );

  return (
    <section className="development-picker" aria-label={COPY.region}>
      <header>
        <span className="development-picker__context">{COPY.context}</span>
        <h2>{COPY.title}</h2>
        <p>{COPY.examples} · {ageBand.replace("-", "–")} {COPY.ageUnit}</p>
      </header>
      {hasActivityExamples ? (
        <>
          <div className="development-picker__activity">
            <p>{COPY.activityExamples}</p>
            {choices(activityPresets, COPY.activityGroup)}
          </div>
          <details className="development-picker__library" key={activityContext?.id}>
            <summary><span>{COPY.otherExamples}</span><ChevronDownIcon aria-hidden="true" /></summary>
            {library}
          </details>
        </>
      ) : (
        <>
          <p className="development-picker__empty">{COPY.generalExamples}</p>
          {library}
        </>
      )}
      {selected ? (
        <div className="development-picker__selection">
          <p role="status" className={selectedIsVisible ? "development-picker__sr-only" : "development-picker__selected-summary"}>
            <CheckCircledIcon aria-hidden="true" />{COPY.selectedExample} {selected.label}
          </p>
          <details className="development-picker__source">
            <summary><span>{COPY.sourceDetails}</span><ChevronDownIcon aria-hidden="true" /></summary>
            <div className="development-picker__source-content">
              <p className="development-picker__source-label">{COPY.officialOutcome}</p>
              <p><strong>{selected.curriculumReference.code}</strong> · {selected.curriculumReference.title}</p>
              <a
                href={`${TYMM_OFFICIAL_PROGRAM_PDF_URL}#page=${selected.curriculumReference.sourcePage}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`${COPY.sourcePage} ${selected.curriculumReference.sourcePage} (yeni sekmede)`}
              >
                {COPY.sourcePage} {selected.curriculumReference.sourcePage}
              </a>
              <p>{COPY.exampleNotice}</p>
              <label className="development-picker__domain">
                <span>{COPY.support}</span>
                <select value={selection?.support ?? ""} disabled={disabled} onChange={(event) => onSelect({
                  presetId: selected.id, ageBand,
                  ...(event.target.value ? { support: event.target.value as DevelopmentObservationSupport } : {}),
                })}>
                  <option value="">{COPY.unspecified}</option>
                  {DEVELOPMENT_OBSERVATION_SUPPORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <button type="button" className="development-picker__clear" disabled={disabled} onClick={() => onSelect(undefined)}>{COPY.clearSelection}</button>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}
