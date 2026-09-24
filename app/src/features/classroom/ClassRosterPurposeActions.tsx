import { useRef, useState } from "react";
import { CLASS_ROSTER_LAYOUTS, type ClassRosterLayoutId } from "./class-roster-layouts.ts";
import "./class-roster-purpose-actions.css";

export function ClassRosterPurposeActions({ onPrepare, disabled = false }: {
  onPrepare(layout: ClassRosterLayoutId): void | Promise<void>;
  disabled?: boolean;
}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState<ClassRosterLayoutId | null>(null);
  const [message, setMessage] = useState("");
  const prepare = async (layout: ClassRosterLayoutId) => {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setBusy(layout); setMessage("");
    try {
      await onPrepare(layout);
      setMessage("Listeniz hazır. Önizlemeden yazdırabilir, PDF veya Excel olarak alabilirsiniz.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Liste hazırlanamadı. Aynı seçeneğe dokunarak yeniden deneyin.");
    } finally { inFlight.current = false; setBusy(null); }
  };
  return <section className="class-roster-purposes" aria-label="Sınıf listesi hazır düzenleri">
    <h3>Sınıf listeniz ne için hazırlanacak?</h3>
    <p>Amacınıza dokunun; alanlar ve sayfa düzeni hazır gelsin.</p>
    <div>{CLASS_ROSTER_LAYOUTS.map(layout => <button type="button" key={layout.id} disabled={disabled || busy !== null} aria-busy={busy === layout.id} onClick={() => void prepare(layout.id)}>
      <strong>{busy === layout.id ? "Hazırlanıyor…" : layout.purposeLabel}</strong>
      <span>{layout.description}</span>
    </button>)}</div>
    {message && <p role="status">{message}</p>}
  </section>;
}
