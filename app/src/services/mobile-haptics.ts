/**
 * MaarifOS Mobile Apex — Evrensel Haptik ve Titreşim Motoru (iOS & Android)
 * Sınıf içi tek elle kullanımda dokunma ve başarı geri bildirimini fiziksel olarak sağlar.
 */

export type HapticFeedbackType =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

/**
 * Cihazda haptik titreşim tetikler.
 * Web Vibration API, Capacitor Haptics ve iOS Taptic fallback'lerini destekler.
 */
export function triggerHaptic(type: HapticFeedbackType = "light"): void {
  if (typeof window === "undefined") return;

  // 1. Capacitor Native Haptics Bridge (varsa)
  const cap = (window as any).Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    try {
      const Haptics = (window as any).Plugins?.Haptics;
      if (Haptics) {
        if (type === "success") {
          Haptics.notification({ type: "SUCCESS" });
          return;
        } else if (type === "warning") {
          Haptics.notification({ type: "WARNING" });
          return;
        } else if (type === "error") {
          Haptics.notification({ type: "ERROR" });
          return;
        } else if (type === "selection") {
          Haptics.selectionChanged();
          return;
        } else {
          Haptics.impact({
            style: type === "heavy" ? "HEAVY" : type === "medium" ? "MEDIUM" : "LIGHT",
          });
          return;
        }
      }
    } catch {
      // Web fallback'e devam et
    }
  }

  // 2. Standart Web Navigator Vibration API
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      switch (type) {
        case "selection":
          navigator.vibrate(8);
          break;
        case "light":
          navigator.vibrate(12);
          break;
        case "medium":
          navigator.vibrate(25);
          break;
        case "heavy":
          navigator.vibrate(40);
          break;
        case "success":
          // Çift vuruş tatlı onay melodisi
          navigator.vibrate([15, 30, 25]);
          break;
        case "warning":
          navigator.vibrate([30, 40, 30]);
          break;
        case "error":
          navigator.vibrate([50, 40, 50, 40, 50]);
          break;
        default:
          navigator.vibrate(10);
      }
    } catch {
      // Güvenli yut
    }
  }
}
