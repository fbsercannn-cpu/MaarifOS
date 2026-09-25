/**
 * QuickStatsBar.tsx � 0.45.0
 *
 * Lovelace prensibi: degisken adlari anlamli, kriptik kisaltma yok.
 * O(1): tum degerler prop olarak gelir, bu bilesen hesap yapmaz.
 * A11y: her stat tiklanabilir dugme; aria-label aciklayici.
 */
import "./simple-experience.css";

export interface QuickStat {
  /** Etiketi: orn. "Bugun" */
  readonly label: string;
  /** Deger: orn. "18/20" */
  readonly value: string;
  /** Aciklama tooltip/sr: orn. "18 cocuk katildi, 20 kayitli" */
  readonly detail: string;
  /** Tiklaninca cagrilir -- yoksa sadece gosterilir */
  readonly onClick?: () => void;
  /** Ikaz tonu: "ok" | "warn" | "error" */
  readonly tone?: "ok" | "warn" | "error";
}

export interface QuickStatsBarProps {
  readonly stats: readonly QuickStat[];
}

const STAT_ICONS: Record<string, string> = {
  "Sınıfta": "👥",
  "Haftalık Plan": "📅",
  "Gözlem Kapsamı": "👁️",
};

export function QuickStatsBar({ stats }: QuickStatsBarProps) {
  if (stats.length === 0) return null;
  return (
    <div
      className="quick-stats-bar"
      role="list"
      aria-label="Sınıf özet istatistikleri"
    >
      {stats.map((stat) =>
        stat.onClick ? (
          <button
            key={stat.label}
            type="button"
            className="quick-stats-bar__item"
            data-tone={stat.tone ?? "ok"}
            aria-label={stat.detail}
            onClick={stat.onClick}
            role="listitem"
            title={stat.detail}
          >
            <div className="quick-stats-bar__top">
              <small>{stat.label}</small>
              <span className="quick-stats-bar__icon">{STAT_ICONS[stat.label] || "📊"}</span>
            </div>
            <strong>{stat.value}</strong>
          </button>
        ) : (
          <span
            key={stat.label}
            className="quick-stats-bar__item"
            data-tone={stat.tone ?? "ok"}
            aria-label={stat.detail}
            role="listitem"
            title={stat.detail}
          >
            <div className="quick-stats-bar__top">
              <small>{stat.label}</small>
              <span className="quick-stats-bar__icon">{STAT_ICONS[stat.label] || "📊"}</span>
            </div>
            <strong>{stat.value}</strong>
          </span>
        ),
      )}
    </div>
  );
}
