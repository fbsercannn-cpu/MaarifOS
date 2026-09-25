/**
 * WeeklyFocusCard.tsx — E2 (0.50.0)
 *
 * Her haftanin basinda ekrana gelen tek kart:
 * Bu haftanin TYMM temasi + 3 onemli etkinlik + hatirlama notu.
 * Ogretmen kapatirsa LocalStorage'a "kapatildi" yazilir; Pazartesi yenilenir.
 */
import { useState } from "react";

export interface WeeklyFocusData {
  readonly weekLabel: string; // orn. "15-19 Eylul Haftasi"
  readonly theme: string; // orn. "Benlik Gelisimi"
  readonly keyActivities: readonly string[];
  readonly reminder?: string;
}

export interface WeeklyFocusCardProps {
  readonly focus: WeeklyFocusData;
  readonly mondayCivilDate: string; // hafta pazartesisi YYYY-MM-DD
}

const DISMISS_KEY = "maarifos-weekly-focus-dismissed";

function wasDismissedThisWeek(mondayDate: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_KEY}-${mondayDate}`) === "true";
  } catch { return false; }
}

function markDismissed(mondayDate: string): void {
  try {
    localStorage.setItem(`${DISMISS_KEY}-${mondayDate}`, "true");
  } catch { /* sessiz */ }
}

export function WeeklyFocusCard({ focus, mondayCivilDate }: WeeklyFocusCardProps) {
  const [override, setOverride] = useState<{ week: string; dismissed: boolean } | null>(null);
  const dismissed = override?.week === mondayCivilDate ? override.dismissed : wasDismissedThisWeek(mondayCivilDate);
  function setDismissed(value: boolean) {
    setOverride({ week: mondayCivilDate, dismissed: value });
    try { if (!value) localStorage.removeItem(`${DISMISS_KEY}-${mondayCivilDate}`); } catch { /* optional UI preference */ }
  }

  if (dismissed) {
    return (
      <button
        type="button"
        className="weekly-focus-minichip no-print"
        aria-label="Haftalık Odak Mini Rozeti"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          margin: "8px 0",
          fontSize: "0.82rem",
          color: "#1e40af",
          cursor: "pointer",
        }}
        onClick={() => setDismissed(false)}
        title="Haftalık Odak Detayını Aç"
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🎯</span>
          <span><strong>Bu Hafta:</strong> {focus.theme} ({focus.weekLabel})</span>
        </span>
        <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>Genişlet ▾</span>
      </button>
    );
  }

  return (
    <section className="weekly-focus-card" aria-label="Haftalık TYMM Odak Kartı">
      <header className="wfc__header">
        <span className="wfc__badge">🎯 BU HAFTA</span>
        <h2>{focus.weekLabel}</h2>
        <button
          type="button"
          className="wfc__dismiss"
          aria-label="Haftalık odak kartını kapat"
          title="Kartı Kapat"
          onClick={() => { markDismissed(mondayCivilDate); setDismissed(true); }}
        >
          ×
        </button>
      </header>
      <p className="wfc__theme">
        <span>TYMM Odak Teması:</span> <strong>{focus.theme}</strong>
      </p>
      {focus.keyActivities.length > 0 && (
        <ul className="wfc__activities">
          {focus.keyActivities.map((act, i) => (
            <li key={i}>
              <span>✨</span>
              <span>{act}</span>
            </li>
          ))}
        </ul>
      )}
      {focus.reminder && (
        <p className="wfc__reminder">
          <span>💡 <strong>Hatırlatma:</strong> {focus.reminder}</span>
        </p>
      )}
    </section>
  );
}
