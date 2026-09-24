/** Optional, bounded tactile feedback; unsupported or reduced-motion devices remain quiet. */
export function triggerHaptic(durationMs: number = 10): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;
  if (typeof window === "undefined" || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    navigator.vibrate(Math.min(50, Math.max(1, Math.round(durationMs))));
  } catch {
    // Haptic feedback must never interrupt the teacher's action.
  }
}
