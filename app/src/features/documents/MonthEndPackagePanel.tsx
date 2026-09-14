import { useEffect, useRef, useState } from "react";
import type { LocalDataStore } from "../../core/repository/contracts.ts";
import { civilDateInIstanbul } from "../../core/domain/attendance.ts";
import { downloadBrowserFile } from "./browser-file-download.ts";
import { generateMonthEndPackage, loadMonthPackageInventory, type MonthPackageInventory } from "./month-end-package.ts";
import { DOCUMENT_HISTORY_CHANGED_EVENT } from "./document-history-service.ts";
import "./document-completion.css";

export function MonthEndPackagePanel({ store, refreshKey, disabled, onComplete }: {
  store: LocalDataStore; refreshKey: string; disabled?: boolean; onComplete: (kind: "monthly" | "evaluation", month: string) => void;
}) {
  const [month, setMonth] = useState(() => civilDateInIstanbul(new Date()).slice(0, 7));
  const [inventory, setInventory] = useState<MonthPackageInventory | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const lock = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const blocked = useRef(disabled);
  blocked.current = disabled;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const changed = () => setReload(value => value + 1);
    window.addEventListener(DOCUMENT_HISTORY_CHANGED_EVENT, changed);
    return () => window.removeEventListener(DOCUMENT_HISTORY_CHANGED_EVENT, changed);
  }, []);
  useEffect(() => {
    ++generation.current;
    let active = true;
    setInventory(null);
    void loadMonthPackageInventory(store, month).then(result => {
      if (active) { setInventory(result); setSelected(result.items.filter(item => item.kind !== "saved").map(item => item.id)); setMessage(""); }
    }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : "Paket listesi hazırlanamadı."); });
    return () => { active = false; ++generation.current; };
  }, [store, month, refreshKey, reload]);
  async function download() {
    if (!inventory || lock.current || disabled) return;
    const expectedGeneration = generation.current;
    lock.current = true; setBusy(true); setMessage("PDF ve Word belgeleri hazırlanıyor…");
    try {
      const file = await generateMonthEndPackage(store, inventory, selected);
      if (generation.current !== expectedGeneration) return;
      if (blocked.current) { setMessage("Paket indirmesi durduruldu. Sınıf tekrar hazır olduğunda yeniden hazırlayabilirsiniz."); return; }
      downloadBrowserFile(file); setMessage("İçindekiler, PDF ve Word belgeleri tek ZIP dosyasında hazır; indirme başlatıldı.");
    }
    catch (error) { if (generation.current === expectedGeneration) setMessage(error instanceof Error ? error.message : "Paket hazırlanamadı."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <section className="month-package-panel" aria-label="Ay sonu dosyası">
    <h2>Ay sonu dosyam</h2>
    <p>Ayı seçin; kayıtlı planlar ve değerlendirmeler PDF ve Word olarak tek dosyada toplansın. Saklanan PDF sürümlerini ayrıca seçerek ekleyebilirsiniz.</p>
    <label>Dosya ayı <input type="month" value={month} disabled={busy} onChange={event => setMonth(event.target.value)} /></label>
    {inventory?.items.map(item => <label key={item.id} style={{ display: "flex", gap: 10, padding: "12px 0" }}><input type="checkbox" checked={selected.includes(item.id)} disabled={busy || disabled} onChange={event => setSelected(values => event.target.checked ? [...values, item.id] : values.filter(id => id !== item.id))} />{item.title}</label>)}
    {inventory?.missing.map(item => <button key={item} type="button" disabled={busy || disabled} onClick={() => onComplete(item.includes("değerlendirme") ? "evaluation" : "monthly", month)}>{item}</button>)}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      <button type="button" disabled={!inventory || !selected.length || busy || disabled} onClick={() => void download()}>{busy ? "Hazırlanıyor…" : "Seçilenleri tek dosyada indir"}</button>
      <button type="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Listeyi yenile</button>
    </div>
    <p role="status">{message}</p>
  </section>;
}
