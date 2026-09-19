/**
 * haptics.ts — Apple HIG & Web Vibration API Dokunsal Geri Bildirim Motoru
 *
 * Mobil cihazlarda fiziksel tuş hissi vererek bilişsel sürtünmeyi sıfırlar.
 * Güvenlik/izin kısıtlaması olan veya desteklenmeyen tarayıcılarda Graceful Degradation ile hatayı yutar.
 */

export function triggerHaptic(durationMs: number = 10): void {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Graceful degradation: masaüstü veya titreşim izni olmayan ortamda sessizce geçer
    }
  }
}
