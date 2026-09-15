/**
 * FruitDutyScheduler.tsx � 0.46.0
 *
 * Dengeli dagilim algoritmasi:
 *   1. Hic sira gelmemis cocuklar oncelikli
 *   2. En az gorev alan bir sonraki
 *   3. Esitlikte en uzun bekleyen
 * Immutable history: gecmis gorevler hic yeniden dagitilmaz.
 * IEEE 754 Yasasi: tarih hesaplamalari string slice ile (float yok).
 */
import { useState, useMemo } from "react";
import "./month-calendar.css";

export interface FruitDutyStudent {
  readonly id: string;
  readonly displayName: string;
  readonly pastDutyCount: number;
  readonly lastDutyDate: string | null; // YYYY-MM-DD
}

export interface FruitDutySlot {
  readonly civilDate: string;
  readonly weekdayLabel: string;
  /** null = henuz atanmamis */
  studentIds: string[];
  locked: boolean;
}

export interface FruitDutySchedulerProps {
  readonly yearMonth: string; // YYYY-MM
  readonly students: readonly FruitDutyStudent[];
  readonly eligibleDates: readonly string[]; // YYYY-MM-DD listesi (tatil haric okul gunleri)
  readonly personsPerDay: number;
  readonly existingSlots: readonly FruitDutySlot[];
  readonly disabled?: boolean;
  readonly onSave: (slots: readonly FruitDutySlot[]) => void;
}

/** Ogrencileri adil siralayan karsilastirici: once az gorev, sonra en uzun bekleyen */
function compareStudentPriority(
  a: FruitDutyStudent,
  b: FruitDutyStudent,
  today: string,
): number {
  if (a.pastDutyCount !== b.pastDutyCount) return a.pastDutyCount - b.pastDutyCount;
  // Hic gorev almamis = en yuksek oncelik
  if (!a.lastDutyDate && b.lastDutyDate) return -1;
  if (a.lastDutyDate && !b.lastDutyDate) return 1;
  if (!a.lastDutyDate && !b.lastDutyDate) return 0;
  // En eski tarih = en uzun bekleyen
  return a.lastDutyDate! < b.lastDutyDate! ? -1 : 1;
}

function balancedDistribute(
  eligibleDates: readonly string[],
  students: readonly FruitDutyStudent[],
  personsPerDay: number,
  lockedSlots: Map<string, FruitDutySlot>,
  today: string,
): FruitDutySlot[] {
  // Yerel kopya gorev sayaci (mutation sadece bu fonksiyon icinde)
  const dutyCounts = new Map<string, number>(students.map((s) => [s.id, s.pastDutyCount]));
  const lastDates = new Map<string, string | null>(students.map((s) => [s.id, s.lastDutyDate]));

  const result: FruitDutySlot[] = [];

  for (const date of eligibleDates) {
    // Kilitli slot: dokunma
    const locked = lockedSlots.get(date);
    if (locked) {
      result.push({ ...locked });
      continue;
    }
    // Siradaki en uygun ogrenciler (once az gorev alan)
    const sorted = [...students].sort((a, b) => {
      const ca = dutyCounts.get(a.id) ?? 0;
      const cb = dutyCounts.get(b.id) ?? 0;
      if (ca !== cb) return ca - cb;
      const la = lastDates.get(a.id);
      const lb = lastDates.get(b.id);
      if (!la && lb) return -1;
      if (la && !lb) return 1;
      if (!la && !lb) return 0;
      return la! < lb! ? -1 : 1;
    });
    const chosen = sorted.slice(0, personsPerDay);
    const slot: FruitDutySlot = {
      civilDate: date,
      weekdayLabel: new Date(`${date}T12:00:00Z`).toLocaleDateString("tr-TR", { weekday: "long" }),
      studentIds: chosen.map((s) => s.id),
      locked: false,
    };
    // Gorev sayaclarini guncelle
    for (const s of chosen) {
      dutyCounts.set(s.id, (dutyCounts.get(s.id) ?? 0) + 1);
      lastDates.set(s.id, date);
    }
    result.push(slot);
  }
  return result;
}

export function FruitDutyScheduler({
  yearMonth,
  students,
  eligibleDates,
  personsPerDay,
  existingSlots,
  disabled = false,
  onSave,
}: FruitDutySchedulerProps) {
  const today = new Date().toISOString().slice(0, 10);

  const lockedSlots = useMemo(() => {
    const m = new Map<string, FruitDutySlot>();
    for (const s of existingSlots) if (s.locked) m.set(s.civilDate, s);
    return m;
  }, [existingSlots]);

  const [slots, setSlots] = useState<FruitDutySlot[]>(() =>
    balancedDistribute(eligibleDates, students, personsPerDay, lockedSlots, today),
  );
  const [saved, setSaved] = useState(false);

  const studentMap = useMemo(() => {
    const m = new Map<string, FruitDutyStudent>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  function redistribute() {
    setSlots(balancedDistribute(eligibleDates, students, personsPerDay, lockedSlots, today));
    setSaved(false);
  }

  function toggleLock(civilDate: string) {
    setSlots((prev) =>
      prev.map((s) => s.civilDate === civilDate ? { ...s, locked: !s.locked } : s),
    );
  }

  function handleSave() {
    onSave(slots);
    setSaved(true);
  }

  return (
    <section className="fruit-duty-scheduler" aria-label="Meyve Gunu Cizelgesi">
      <header className="fruit-duty-scheduler__header">
        <h2>Meyve Gunu Cizelgesi</h2>
        <p>
          {yearMonth} � gun basina {personsPerDay} ogrenci
        </p>
        <div className="fruit-duty-scheduler__actions">
          <button type="button" onClick={redistribute} disabled={disabled}>
            Dengeli Dagit
          </button>
          <button
            type="button"
            className="fruit-duty-scheduler__save"
            onClick={handleSave}
            disabled={disabled || saved}
          >
            {saved ? "Kaydedildi" : "Kaydet"}
          </button>
        </div>
      </header>

      <ol className="fruit-duty-scheduler__list">
        {slots.map((slot) => (
          <li key={slot.civilDate} className="fruit-duty-scheduler__slot" data-locked={slot.locked}>
            <span className="fds__date">
              <strong>{slot.weekdayLabel}</strong>
              <small>{slot.civilDate}</small>
            </span>
            <span className="fds__students">
              {slot.studentIds.length > 0
                ? slot.studentIds
                    .map((id) => studentMap.get(id)?.displayName ?? id)
                    .join(", ")
                : <em>Atanmadi</em>}
            </span>
            <button
              type="button"
              className="fds__lock"
              aria-pressed={slot.locked}
              aria-label={slot.locked ? "Kilidi kaldir" : "Bu atamay� sabitle"}
              onClick={() => toggleLock(slot.civilDate)}
              disabled={disabled}
            >
              {slot.locked ? "Kilitli" : "Sabitle"}
            </button>
          </li>
        ))}
      </ol>

      {students.length === 0 && (
        <p role="status" className="fruit-duty-scheduler__empty">
          Sinifta kayitli ogrenci bulunmuyor. Once ogrenci ekleyin.
        </p>
      )}
    </section>
  );
}
