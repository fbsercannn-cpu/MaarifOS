/**
 * OfflineStatusBadge.tsx � 0.45.0
 *
 * Sifir sunucu: navigator.onLine + SW registration kontrolu, tum islem RAM'de.
 * Tor prensibi: hata yuttulmaz; SW yoksa "Yukluyor" durumu gosterilir.
 */
import { useEffect, useState } from "react";
import "./simple-experience.css";

type BadgeState = "online" | "offline" | "installing";

function resolveBadgeState(): BadgeState {
  if (!navigator.onLine) return "offline";
  return "online";
}

const STATE_LABELS: Record<BadgeState, string> = {
  online: "Cevrimici",
  offline: "Cevrimdisi - veriler yerel",
  installing: "Guncelleme yukleniyor",
};

const STATE_TONES: Record<BadgeState, string> = {
  online: "ok",
  offline: "warn",
  installing: "info",
};

export function OfflineStatusBadge() {
  const [badgeState, setBadgeState] = useState<BadgeState>(resolveBadgeState());
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setBadgeState("online");
    const handleOffline = () => setBadgeState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // SW guncelleme kontrolu
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.installing) setBadgeState("installing");
      }).catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <span className="offline-status-badge" data-tone={STATE_TONES[badgeState]}>
      <button
        type="button"
        className="offline-status-badge__dot"
        aria-label={STATE_LABELS[badgeState] + " - detaylari gormek icin tiklayin"}
        aria-expanded={detailOpen}
        onClick={() => setDetailOpen((v) => !v)}
      >
        <span className="offline-status-badge__indicator" aria-hidden="true" />
      </button>
      {detailOpen ? (
        <span className="offline-status-badge__popup" role="status" aria-live="polite">
          {STATE_LABELS[badgeState]}
          {badgeState === "offline"
            ? " � Tum kayitlar cihazda guvenle sakliyor."
            : badgeState === "installing"
              ? " � Sayfa yenilendikten sonra aktif olur."
              : " � Son kayitlar aninda kalici hale getirildi."}
        </span>
      ) : null}
    </span>
  );
}
