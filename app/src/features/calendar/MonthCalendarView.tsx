/**
 * MonthCalendarView.tsx � 0.46.0
 *
 * Carmack prensibi: max 31 hucre - Virtual Scroll yok, O(1).
 * Her gune tiklaninca DailyPlanDrawer disaridan slot olarak beslenir.
 * CSS Grid layout; DocumentFragment kullanilmaz cunku JSX zaten batch ediyor.
 */
import { useMemo } from "react";
import "./month-calendar.css";

export interface MonthCalendarDayBadges {
  hasPlan?: boolean;
  hasObservation?: boolean;
  hasFruitDuty?: boolean;
  hasStarOfWeek?: boolean;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface MonthCalendarDay {
  readonly civilDate: string; // YYYY-MM-DD
  readonly dayOfMonth: number;
  readonly isToday: boolean;
  readonly badges: MonthCalendarDayBadges;
}

export interface MonthCalendarViewProps {
  /** YYYY-MM formatinda ay */
  readonly yearMonth: string;
  readonly days: readonly MonthCalendarDay[];
  readonly onSelectDay: (civilDate: string) => void;
  readonly todayCivilDate: string;
}

const TR_WEEKDAYS = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];

/** ISO haftanin ilk gunu Pazartesi; JS Date.getDay() Pazar=0 duzeltmesi */
function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7);
}

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year!, month! - 1, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

export function MonthCalendarView({
  yearMonth,
  days,
  onSelectDay,
  todayCivilDate,
}: MonthCalendarViewProps) {
  // Ayin ilk gununun ISO weekday indexi (Pazartesi=0)
  const firstWeekdayOffset = useMemo(() => {
    const [year, month] = yearMonth.split("-").map(Number);
    return isoWeekday(new Date(year!, month! - 1, 1));
  }, [yearMonth]);

  // Map: civilDate -> day nesnesi O(n) once, sonra O(1) erisim
  const dayMap = useMemo(() => {
    const m = new Map<string, MonthCalendarDay>();
    for (const d of days) m.set(d.civilDate, d);
    return m;
  }, [days]);

  const totalCells = firstWeekdayOffset + days.length;
  const gridRows = Math.ceil(totalCells / 7);

  return (
    <section className="month-calendar" aria-label={monthLabel(yearMonth)}>
      <header className="month-calendar__header">
        <h2>{monthLabel(yearMonth)}</h2>
      </header>
      <div className="month-calendar__weekdays" aria-hidden="true">
        {TR_WEEKDAYS.map((wd) => (
          <span key={wd}>{wd}</span>
        ))}
      </div>
      <div
        className="month-calendar__grid"
        style={{ "--grid-rows": gridRows } as React.CSSProperties}
        role="grid"
        aria-label={monthLabel(yearMonth) + " takvimi"}
      >
        {/* Bos onceki gunler */}
        {Array.from({ length: firstWeekdayOffset }).map((_, i) => (
          <span key={`empty-${i}`} className="month-calendar__cell--empty" role="gridcell" aria-hidden="true" />
        ))}
        {/* Gercek gunler */}
        {days.map((day) => {
          const b = day.badges;
          const isToday = day.civilDate === todayCivilDate;
          return (
            <button
              key={day.civilDate}
              type="button"
              className="month-calendar__cell"
              data-today={isToday ? "true" : undefined}
              data-holiday={b.isHoliday ? "true" : undefined}
              data-weekend={b.isWeekend ? "true" : undefined}
              role="gridcell"
              aria-label={`${day.dayOfMonth}. gun${isToday ? " (bugun)" : ""}${b.hasPlan ? ", plan mevcut" : ""}${b.hasObservation ? ", gozlem var" : ""}${b.hasFruitDuty ? ", meyve gorevi" : ""}${b.hasStarOfWeek ? ", haftanin cocugu" : ""}${b.isHoliday ? ", tatil" : ""}`}
              onClick={() => onSelectDay(day.civilDate)}
            >
              <span className="month-calendar__day-num">{day.dayOfMonth}</span>
              <span className="month-calendar__badges" aria-hidden="true">
                {b.hasPlan && <span className="mcb mcb--plan" title="Plan" />}
                {b.hasObservation && <span className="mcb mcb--obs" title="Gozlem" />}
                {b.hasFruitDuty && <span className="mcb mcb--fruit" title="Meyve" />}
                {b.hasStarOfWeek && <span className="mcb mcb--star" title="Haftanin cocugu" />}
                {b.isHoliday && <span className="mcb mcb--holiday" title="Tatil" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
