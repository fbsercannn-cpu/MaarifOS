import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native modal supplies focus trapping, Escape and inert background. */
export function FormDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      const workspace = dialog.closest<HTMLElement>(".official-workspace-overlay");
      const destination = workspace && (!returnFocus || !workspace.contains(returnFocus))
        ? workspace.querySelector<HTMLElement>("button:not(:disabled)")
        : returnFocus;
      if (destination?.isConnected) destination.focus({ preventScroll: true });
    };
  }, [open]);
  return <dialog ref={dialogRef} className="of-choice-dialog no-print" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="of-choice-dialog__header"><h2 id={titleId}>{title}</h2><button type="button" className="of-btn of-btn--close" onClick={onClose}>Kapat</button></header>
    {open && <div className="of-choice-dialog__body">{children}</div>}
  </dialog>;
}
