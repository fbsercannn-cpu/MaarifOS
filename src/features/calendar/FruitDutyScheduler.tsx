/**
 * FruitDutyScheduler.tsx — MaarifOS 0.64.0
 *
 * Değişiklikler (0.64.0):
 *   1. "Planlandı" sütunu KALDIRILDI (kullanıcı talebi).
 *   2. Tarih formatı: YYYY-MM-DD → GG.AA.YYYY (Türk formatı).
 *   3. getWorkdaysInMonth() ile sadece iş günleri (Pzt-Cum) kullanılır.
 *
 * Dengeli dağılım algoritması:
 *   1. Hiç sıra gelmemiş çocuklar öncelikli
 *   2. En az görev alan bir sonraki
 *   3. Eşitlikte en uzun bekleyen
 * Immutable history: geçmiş görevler hiç yeniden dağıtılmaz.
 * IEEE 754 Yasası: tarih hesaplamaları string slice ile (float yok).
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
  readonly civilDate: string;    // YYYY-MM-DD (dahili)
  readonly weekdayLabel: string;
  /** null = henüz atanmamış */
  studentIds: string[];
  locked: boolean;
}

export interface FruitDutySchedulerProps {
  readonly yearMonth: string; // YYYY-MM
  readonly students: readonly FruitDutyStudent[];
  readonly eligibleDates: readonly string[]; // YYYY-MM-DD (iş günleri)
  readonly personsPerDay: number;
  readonly existingSlots: readonly FruitDutySlot[];
  readonly disabled?: boolean;
  readonly onSave: (slots: readonly FruitDutySlot[]) => void;
}

/** YYYY-MM-DD → GG.AA.YYYY (Türk formatı, float yok) */
export function formatDateTR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Belirtilen YYYY-MM ayındaki tüm iş günlerini (Pzt-Cum) döner.
 * @param yearMonth  "YYYY-MM" formatı
 * @param holidays   Tatil olarak atlanacak YYYY-MM-DD listesi
 */
export function getWorkdaysInMonth(yearMonth: string, holidays: string[] = []): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const holidaySet = new Set(holidays);
  const result: string[] = [];
  const daysInMonth = new Date(y, m, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(m).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${y}-${mm}-${dd}`;
    const dow = new Date(`${iso}T12:00:00Z`).getDay(); // 0=Paz, 6=Cmt
    if (dow >= 1 && dow <= 5 && !holidaySet.has(iso)) {
      result.push(iso);
    }
  }
  return result;
}

function balancedDistribute(
  eligibleDates: readonly string[],
  students: readonly FruitDutyStudent[],
  personsPerDay: number,
  lockedSlots: Map<string, FruitDutySlot>,
): FruitDutySlot[] {
  const dutyCounts = new Map<string, number>(students.map((s) => [s.id, s.pastDutyCount]));
  const lastDates = new Map<string, string | null>(students.map((s) => [s.id, s.lastDutyDate]));
  const result: FruitDutySlot[] = [];

  for (const date of eligibleDates) {
    const locked = lockedSlots.get(date);
    if (locked) { result.push({ ...locked }); continue; }

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
  const lockedSlots = useMemo(() => {
    const m = new Map<string, FruitDutySlot>();
    for (const s of existingSlots) if (s.locked) m.set(s.civilDate, s);
    return m;
  }, [existingSlots]);

  const [slots, setSlots] = useState<FruitDutySlot[]>(() =>
    balancedDistribute(eligibleDates, students, personsPerDay, lockedSlots),
  );
  const [saved, setSaved] = useState(false);

  const studentMap = useMemo(() => {
    const m = new Map<string, FruitDutyStudent>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  function redistribute() {
    setSlots(balancedDistribute(eligibleDates, students, personsPerDay, lockedSlots));
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
    <section className="fruit-duty-scheduler" aria-label="Meyve Günü Çizelgesi">
      <header className="fruit-duty-scheduler__header">
        <h2>🍎 Meyve Günü Çizelgesi</h2>
        <p>{yearMonth} · Günde {personsPerDay} öğrenci · Sadece iş günleri</p>
        <div className="fruit-duty-scheduler__actions">
          <button type="button" onClick={redistribute} disabled={disabled}>
            Dengeli Dağıt
          </button>
          <button
            type="button"
            className="fruit-duty-scheduler__save"
            onClick={handleSave}
            disabled={disabled || saved}
          >
            {saved ? "✅ Kaydedildi" : "Kaydet"}
          </button>
        </div>
      </header>

      <table className="fruit-duty-scheduler__table">
        <thead>
          <tr>
            <th>Gün</th>
            <th>Tarih</th>
            <th>Öğrenci(ler)</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.civilDate} data-locked={slot.locked} style={{ breakInside: "avoid" }}>
              <td><strong>{slot.weekdayLabel}</strong></td>
              <td>{formatDateTR(slot.civilDate)}</td>
              <td>
                {slot.studentIds.length > 0
                  ? slot.studentIds.map((id) => studentMap.get(id)?.displayName ?? id).join(", ")
                  : <em>Atanmadı</em>}
              </td>
              <td>
                <button
                  type="button"
                  className="fds__lock"
                  aria-pressed={slot.locked}
                  aria-label={slot.locked ? "Kilidi kaldır" : "Bu atamayı sabitle"}
                  onClick={() => toggleLock(slot.civilDate)}
                  disabled={disabled}
                >
                  {slot.locked ? "🔒 Kilitli" : "Sabitle"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {students.length === 0 && (
        <p role="status" className="fruit-duty-scheduler__empty">
          Sınıfta kayıtlı öğrenci bulunmuyor. Önce öğrenci ekleyin.
        </p>
      )}
    </section>
  );
}
