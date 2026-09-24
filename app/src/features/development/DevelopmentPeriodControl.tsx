import { DEVELOPMENT_COPY, DEVELOPMENT_PERIOD_OPTIONS } from "./development-copy.ts";
import type { DevelopmentPeriodKind } from "./development-overview.ts";

export function DevelopmentPeriodControl({ period, onChange }: {
  period: DevelopmentPeriodKind;
  onChange(period: DevelopmentPeriodKind): void;
}) {
  return (
    <div className="development-period" role="group" aria-label={DEVELOPMENT_COPY.periodLabel}>
      {DEVELOPMENT_PERIOD_OPTIONS.map((option) => (
        <button type="button" key={option.value} aria-pressed={period === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
