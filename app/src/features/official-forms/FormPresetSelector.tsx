import { useState } from "react";
import { FormDialog } from "./FormDialog.tsx";
export interface FormPreset { id: string; title: string; text: string }
export function FormPresetSelector({ options, onSelect, currentValue = "", label = "Örnek metin seç" }: { options: FormPreset[]; onSelect: (text: string) => void; currentValue?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null);
  function apply(text: string, append: boolean) {
    const result = append && currentValue.trim() ? `${currentValue}\n\n${text}` : text;
    setUndo({ before: currentValue, after: result }); onSelect(result); setOpen(false);
  }
  return <div className="of-preset-selector no-print">
    <button type="button" className="of-btn of-btn--close" aria-haspopup="dialog" onClick={() => setOpen(true)}>{label} ({options.length})</button>
    {undo && currentValue === undo.after && <button type="button" className="of-btn of-btn--close" onClick={() => { onSelect(undo.before); setUndo(null); }}>Örnek eklemeyi geri al</button>}
    <FormDialog open={open} title={label} onClose={() => setOpen(false)}>
      <p>Örnekler kayıtlı gözlem değildir. Kendi değerlendirmenize göre düzenleyin. Mevcut yazınız siz seçmeden değiştirilmez.</p>
      {options.map((option) => <article key={option.id} className="of-preset-card"><h3>{option.title}</h3><p>{option.text}</p><div className="of-preset-actions">
        <button type="button" className="of-btn of-btn--print" onClick={() => apply(option.text, true)}>Metnin sonuna ekle</button>
        {currentValue.trim() && <button type="button" className="of-btn of-btn--close" onClick={() => apply(option.text, false)}>Mevcut metnin yerine kullan</button>}
      </div></article>)}
    </FormDialog>
  </div>;
}
