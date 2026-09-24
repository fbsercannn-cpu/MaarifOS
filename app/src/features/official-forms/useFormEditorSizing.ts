import { useEffect, type RefObject } from "react";

export function resizeFormTextarea(field: HTMLTextAreaElement) {
  if (field.getClientRects().length === 0) return;
  const style = getComputedStyle(field);
  const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  field.style.height = "auto";
  field.style.height = `${Math.ceil(field.scrollHeight + border)}px`;
  field.style.overflowY = "hidden";
}

/** Input, React commits, preset actions, fonts and available width all affect wrapping. */
export function useFormEditorSizing(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let pending = 0;
    let disposed = false;
    const resize = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => root.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(resizeFormTextarea));
    };
    const mutation = new MutationObserver((records) => {
      if (records.some((record) => record.type !== "attributes" || !(record.target instanceof HTMLTextAreaElement))) resize();
    });
    mutation.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden"] });
    let previousWidth = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width !== previousWidth) { previousWidth = entry.contentRect.width; resize(); }
    });
    observer.observe(root);
    root.addEventListener("input", resize, true);
    root.addEventListener("change", resize, true);
    root.addEventListener("click", resize, true);
    document.fonts?.addEventListener("loadingdone", resize);
    void document.fonts?.ready.then(() => { if (!disposed) resize(); });
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(pending); mutation.disconnect(); observer.disconnect();
      root.removeEventListener("input", resize, true); root.removeEventListener("change", resize, true); root.removeEventListener("click", resize, true);
      document.fonts?.removeEventListener("loadingdone", resize);
    };
  }, [ref]);
}
