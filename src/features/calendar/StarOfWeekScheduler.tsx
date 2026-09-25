/**
 * StarOfWeekScheduler.tsx � 0.46.0
 *
 * Haftanin Cocugu takvimi.
 * Immutable: tamamlanmis haftalar yeniden kumaya girmez.
 * Ayni cocugun meyve + haftanin cocugu gorevin cakismasindan kacinilir (soft uyari).
 */
import { useState, useMemo } from "react";
import "./month-calendar.css";

export interface StarWeekSlot {
  /** Haftanin bitis tarihi (Cuma) YYYY-MM-DD */
  readonly weekEndDate: string;
  readonly weekLabel: string;
  studentId: string | null;
  locked: boolean;
  completed: boolean;
}

export interface StarOfWeekStudent {
  readonly id: string;
  readonly displayName: string;
  readonly pastStarCount: number;
  readonly fruitDutyDates?: readonly string[];
}

export interface StarOfWeekSchedulerProps {
  readonly termLabel: string;
  readonly weeks: readonly { weekEndDate: string; weekLabel: string }[];
  readonly students: readonly StarOfWeekStudent[];
  readonly existingSlots: readonly StarWeekSlot[];
  readonly disabled?: boolean;
  readonly onSave: (slots: readonly StarWeekSlot[]) => void;
}

function distributeStarWeeks(
  weeks: readonly { weekEndDate: string; weekLabel: string }[],
  students: readonly StarOfWeekStudent[],
  lockedMap: Map<string, StarWeekSlot>,
  completedMap: Map<string, StarWeekSlot>,
): StarWeekSlot[] {
  const counts = new Map<string, number>(students.map((s) => [s.id, s.pastStarCount]));
  const result: StarWeekSlot[] = [];

  for (const week of weeks) {
    const locked = lockedMap.get(week.weekEndDate);
    if (locked) { result.push({ ...locked }); continue; }
    const completed = completedMap.get(week.weekEndDate);
    if (completed) { result.push({ ...completed }); continue; }

    const sorted = [...students].sort((a, b) => {
      const ca = counts.get(a.id) ?? 0;
      const cb = counts.get(b.id) ?? 0;
      return ca - cb;
    });
    const chosen = sorted[0] ?? null;
    const slot: StarWeekSlot = {
      weekEndDate: week.weekEndDate,
      weekLabel: week.weekLabel,
      studentId: chosen?.id ?? null,
      locked: false,
      completed: false,
    };
    if (chosen) counts.set(chosen.id, (counts.get(chosen.id) ?? 0) + 1);
    result.push(slot);
  }
  return result;
}

export function StarOfWeekScheduler({
  termLabel,
  weeks,
  students,
  existingSlots,
  disabled = false,
  onSave,
}: StarOfWeekSchedulerProps) {
  const lockedMap = useMemo(() => {
    const m = new Map<string, StarWeekSlot>();
    for (const s of existingSlots) if (s.locked) m.set(s.weekEndDate, s);
    return m;
  }, [existingSlots]);
  const completedMap = useMemo(() => {
    const m = new Map<string, StarWeekSlot>();
    for (const s of existingSlots) if (s.completed) m.set(s.weekEndDate, s);
    return m;
  }, [existingSlots]);

  const [slots, setSlots] = useState<StarWeekSlot[]>(() =>
    distributeStarWeeks(weeks, students, lockedMap, completedMap),
  );
  const [saved, setSaved] = useState(false);

  const studentMap = useMemo(() => {
    const m = new Map<string, StarOfWeekStudent>();
    for (const s of students) m.set(s.id, s);
    return m;
  }, [students]);

  function redistribute() {
    setSlots(distributeStarWeeks(weeks, students, lockedMap, completedMap));
    setSaved(false);
  }

  function changeStudent(weekEndDate: string, studentId: string) {
    setSlots((prev) =>
      prev.map((s) => s.weekEndDate === weekEndDate && !s.locked && !s.completed
        ? { ...s, studentId } : s),
    );
    setSaved(false);
  }

  function toggleLock(weekEndDate: string) {
    setSlots((prev) =>
      prev.map((s) => s.weekEndDate === weekEndDate && !s.completed
        ? { ...s, locked: !s.locked } : s),
    );
  }

  return (
    <section className="star-of-week-scheduler" aria-label="Haftanin Cocugu Takvimi">
      <header className="star-of-week-scheduler__header">
        <h2>Haftanin Cocugu</h2>
        <p>{termLabel}</p>
        <div>
          <button type="button" onClick={redistribute} disabled={disabled}>Dengeli Dagit</button>
          <button
            type="button"
            className="star-of-week-scheduler__save"
            disabled={disabled || saved}
            onClick={() => { onSave(slots); setSaved(true); }}
          >
            {saved ? "Kaydedildi" : "Kaydet"}
          </button>
        </div>
      </header>
      <ol className="star-of-week-scheduler__list">
        {slots.map((slot) => {
          const student = slot.studentId ? studentMap.get(slot.studentId) : null;
          const hasFruitConflict = student?.fruitDutyDates?.includes(slot.weekEndDate) ?? false;
          return (
            <li key={slot.weekEndDate} className="sows__slot"
              data-completed={slot.completed}
              data-locked={slot.locked}
            >
              <span className="sows__week">
                <strong>{slot.weekLabel}</strong>
                {slot.completed && <small>Tamamlandi</small>}
                {slot.locked && !slot.completed && <small>Kilitli</small>}
              </span>
              {slot.completed ? (
                <span className="sows__student">{student?.displayName ?? "�"}</span>
              ) : (
                <select
                  value={slot.studentId ?? ""}
                  disabled={disabled || slot.locked || slot.completed}
                  aria-label={`${slot.weekLabel} icin ogrenci sec`}
                  onChange={(e) => changeStudent(slot.weekEndDate, e.target.value)}
                >
                  <option value="">Atanmadi</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.displayName}</option>
                  ))}
                </select>
              )}
              {hasFruitConflict && (
                <span className="sows__conflict-warn" role="alert">
                  Bu hafta meyve gorevi de var
                </span>
              )}
              {!slot.completed && (
                <button
                  type="button"
                  aria-pressed={slot.locked}
                  onClick={() => toggleLock(slot.weekEndDate)}
                  disabled={disabled}
                >
                  {slot.locked ? "Kilidi Kaldir" : "Sabitle"}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
