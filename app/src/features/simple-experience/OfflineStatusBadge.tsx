/**
 * OfflineStatusBadge.tsx — MaarifOS 1.3.0
 *
 * Sıfır sunucu: navigator.onLine + SW registration kontrolü, tüm işlem RAM'de.
 * Çevrim içi iken sessiz kalır (sıfır görsel gürültü); yalnızca çevrim dışı veya güncelleme durumunda görünür.
 */
import { useEffect, useState } from "react";
import "./simple-experience.css";

type BadgeState = "online" | "offline" | "installing";

function resolveBadgeState(): BadgeState {
  if (!navigator.onLine) return "offline";
  return "online";
}

const STATE_LABELS: Record<BadgeState, string> = {
  online: "Çevrim içi",
  offline: "Çevrim dışı · Veriler yerel hafızada",
  installing: "Güncelleme yükleniyor",
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
    // SW güncelleme kontrolü
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

  // Çevrim içi durumdayken arayüzde yüzen görsel gürültü (chartjunk) oluşturmaz
  if (badgeState === "online") {
    return null;
  }

  return (
    <span className="offline-status-badge" data-tone={STATE_TONES[badgeState]}>
      <button
        type="button"
        className="offline-status-badge__dot"
        aria-label={STATE_LABELS[badgeState] + " - detayları görmek için tıklayın"}
        aria-expanded={detailOpen}
        onClick={() => setDetailOpen((v) => !v)}
      >
        <span className="offline-status-badge__indicator" aria-hidden="true" />
      </button>
      {detailOpen ? (
        <span className="offline-status-badge__popup" role="status" aria-live="polite">
          {STATE_LABELS[badgeState]}
          {badgeState === "offline"
            ? " • Tüm kayıtlarınız cihazda güvenle korunuyor."
            : " • Sayfa yenilendiğinde yeni sürüm devreye girer."}
        </span>
      ) : null}
    </span>
  );
}
