/**
 * WeeklyFocusCard.tsx � E2 (0.50.0)
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
  const [dismissed, setDismissed] = useState(() => wasDismissedThisWeek(mondayCivilDate));

  if (dismissed) {
    return (
      <aside
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🎯</span>
          <span><strong>Bu Hafta:</strong> {focus.theme} ({focus.weekLabel})</span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>Genişlet ▾</span>
      </aside>
    );
  }

  return (
    <section className="weekly-focus-card" aria-label="Haftalik Odak">
      <header className="wfc__header">
        <span>BU HAFTA</span>
        <h2>{focus.weekLabel}</h2>
        <button
          type="button"
          className="wfc__dismiss"
          aria-label="Haftalik odak kartini kapat"
          onClick={() => { markDismissed(mondayCivilDate); setDismissed(true); }}
        >
          �
        </button>
      </header>
      <p className="wfc__theme">?? Tema: <strong>{focus.theme}</strong></p>
      {focus.keyActivities.length > 0 && (
        <ul className="wfc__activities">
          {focus.keyActivities.map((act, i) => (
            <li key={i}>{act}</li>
          ))}
        </ul>
      )}
      {focus.reminder && (
        <p className="wfc__reminder">?? {focus.reminder}</p>
      )}
    </section>
  );
}
