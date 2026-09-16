/**
 * ActivityRatingBadge.tsx � E9 (0.50.0)
 *
 * Gunluk planda her etkinligin yani "Bu etkinlik nasil gitti?" 3'lu rozet.
 * 1 dokunusla kalici yerel kayit; sonraki ayin ayni etkinliginde onceki derecelendirme gorunur.
 * Kalici kayit: LocalStorage (JSON), key: activity-rating-{activityId}
 */
import { useEffect, useState } from "react";

export type ActivityRating = "great" | "ok" | "retry";

export interface ActivityRatingBadgeProps {
  readonly activityId: string;
  readonly activityTitle: string;
  /** Okunmakta olan tarih � aynI aktivite farkli tarihlerde farkli derecelendirilebilir */
  readonly civilDate: string;
  readonly disabled?: boolean;
}

const RATING_LABELS: Record<ActivityRating, string> = {
  great: "Harika",
  ok: "Idare eder",
  retry: "Tekrar et",
};

const RATING_EMOJIS: Record<ActivityRating, string> = {
  great: "??",
  ok: "??",
  retry: "??",
};

const STORAGE_PREFIX = "maarifos-activity-rating-";

function ratingKey(activityId: string, civilDate: string): string {
  return `${STORAGE_PREFIX}${activityId}-${civilDate}`;
}

function loadRating(activityId: string, civilDate: string): ActivityRating | null {
  try {
    const raw = localStorage.getItem(ratingKey(activityId, civilDate));
    if (raw === "great" || raw === "ok" || raw === "retry") return raw;
  } catch { /* localStorage erisim hatasi tolere edilir */ }
  return null;
}

function saveRating(activityId: string, civilDate: string, rating: ActivityRating): void {
  try {
    localStorage.setItem(ratingKey(activityId, civilDate), rating);
  } catch { /* Sessizce yut */ }
}

function loadLastRating(activityId: string): { rating: ActivityRating; date: string } | null {
  try {
    const prefix = `${STORAGE_PREFIX}${activityId}-`;
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    if (!keys.length) return null;
    const latest = keys.sort().reverse()[0]!;
    const raw = localStorage.getItem(latest);
    const date = latest.replace(prefix, "");
    if (raw === "great" || raw === "ok" || raw === "retry") return { rating: raw, date };
  } catch { /* localStorage okunamazsa null don */ }
  return null;
}

const RATINGS: ActivityRating[] = ["great", "ok", "retry"];

export function ActivityRatingBadge({
  activityId,
  activityTitle,
  civilDate,
  disabled = false,
}: ActivityRatingBadgeProps) {
  const [rating, setRating] = useState<ActivityRating | null>(() =>
    loadRating(activityId, civilDate),
  );
  const [lastRating] = useState(() => loadLastRating(activityId));

  function handleRate(r: ActivityRating) {
    if (disabled) return;
    saveRating(activityId, civilDate, r);
    setRating(r);
  }

  return (
    <div className="activity-rating-badge" aria-label={`${activityTitle} degerlendirmesi`}>
      {lastRating && lastRating.date !== civilDate && (
        <small className="arb__history">
          Onceki: {RATING_EMOJIS[lastRating.rating]} {lastRating.date}
        </small>
      )}
      <div className="arb__buttons" role="group" aria-label="Etkinlik degerlendirmesi">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className="arb__btn"
            aria-pressed={rating === r}
            aria-label={RATING_LABELS[r]}
            onClick={() => handleRate(r)}
            disabled={disabled}
          >
            <span aria-hidden="true">{RATING_EMOJIS[r]}</span>
            <small>{RATING_LABELS[r]}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
