/**
 * BulkDateShifter.tsx � 0.48.0
 *
 * Tatil gelince gelecekteki secili isleri yeni uygun gune tasir.
 * Guvenli: kaydirmadan once "Degisecekler" listesi gosterilir.
 * Immutable: gecmis kayitlar (bugunden once) hic etkilenmez.
 */
import { useState, useMemo } from "react";

export interface ShiftableItem {
  readonly id: string;
  readonly label: string;
  readonly civilDate: string; // YYYY-MM-DD
  readonly kind: "plan" | "observation" | "fruit-duty" | "star-of-week" | "material" | "other";
}

export interface BulkDateShifterProps {
  readonly todayCivilDate: string;
  readonly items: readonly ShiftableItem[];
  /** Kullanilabilir hedef gunler (tatil, hafta sonu haric, bugunden sonra) */
  readonly availableTargetDates: readonly string[];
  readonly disabled?: boolean;
  readonly onShift: (shifts: readonly { itemId: string; fromDate: string; toDate: string }[]) => void;
}

const KIND_LABELS: Record<ShiftableItem["kind"], string> = {
  plan: "Plan",
  observation: "Gozlem",
  "fruit-duty": "Meyve Gorevi",
  "star-of-week": "Haftanin Cocugu",
  material: "Materyal Hazirligi",
  other: "Diger",
};

export function BulkDateShifter({
  todayCivilDate,
  items,
  availableTargetDates,
  disabled = false,
  onShift,
}: BulkDateShifterProps) {
  // Sadece bugunden sonraki isler
  const futureItems = useMemo(
    () => items.filter((it) => it.civilDate > todayCivilDate),
    [items, todayCivilDate],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetDate, setTargetDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [shifted, setShifted] = useState(false);

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirmed(false);
    setShifted(false);
  }

  function selectAll() {
    setSelectedIds(new Set(futureItems.map((it) => it.id)));
    setConfirmed(false);
  }
  function clearAll() {
    setSelectedIds(new Set());
    setConfirmed(false);
  }

  const selectedItems = futureItems.filter((it) => selectedIds.has(it.id));
  const shifts = selectedItems.map((it) => ({
    itemId: it.id,
    fromDate: it.civilDate,
    toDate: targetDate,
  }));

  function handleShift() {
    onShift(shifts);
    setShifted(true);
    setConfirmed(false);
  }

  return (
    <section className="bulk-date-shifter" aria-label="Toplu Tarih Kaydirma">
      <header>
        <h2>Toplu Tarih Kaydirma</h2>
        <p>Tatil veya okul kapanisinda gelecekteki isleri yeni bir gune tasiyabilirsiniz. Gecmis kayitlar etkilenmez.</p>
      </header>

      {futureItems.length === 0 ? (
        <p role="status">Kaydirabilecek gelecekteki is bulunmuyor.</p>
      ) : (
        <>
          <div className="bds__item-select">
            <div className="bds__select-actions">
              <button type="button" onClick={selectAll} disabled={disabled}>Tumunu Sec</button>
              <button type="button" onClick={clearAll} disabled={disabled}>Secimleri Kaldir</button>
            </div>
            <ol className="bds__item-list">
              {futureItems.map((item) => (
                <li key={item.id} data-selected={selectedIds.has(item.id)}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      disabled={disabled}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{KIND_LABELS[item.kind]} � {item.civilDate}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          </div>

          {selectedItems.length > 0 && (
            <div className="bds__target">
              <label>
                <span>Yeni Tarih</span>
                <select
                  value={targetDate}
                  onChange={(e) => { setTargetDate(e.target.value); setConfirmed(false); }}
                  disabled={disabled}
                >
                  <option value="">Hedef gun secin�</option>
                  {availableTargetDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {selectedItems.length > 0 && targetDate && !confirmed && !shifted && (
            <div className="bds__preview">
              <strong>Degisecekler ({selectedItems.length} is � {targetDate}):</strong>
              <ul>
                {selectedItems.map((it) => (
                  <li key={it.id}>{it.label} ({it.civilDate} � {targetDate})</li>
                ))}
              </ul>
              <button
                type="button"
                className="bds__confirm-btn"
                onClick={() => setConfirmed(true)}
                disabled={disabled}
              >
                Onayliyorum, Tasiyorum
              </button>
            </div>
          )}

          {confirmed && !shifted && (
            <div className="bds__execute" role="alert">
              <strong>Emin misiniz?</strong>
              <p>{selectedItems.length} is {targetDate} tarihine tas�nacak.</p>
              <div>
                <button type="button" onClick={() => setConfirmed(false)} disabled={disabled}>Vazgec</button>
                <button type="button" className="bds__shift-btn" onClick={handleShift} disabled={disabled}>Tasimayi Tamamla</button>
              </div>
            </div>
          )}

          {shifted && (
            <p className="bds__success" role="status">
              {selectedItems.length} is {targetDate} tarihine tasindin!
            </p>
          )}
        </>
      )}
    </section>
  );
}
