/**
 * BirthdayTracker.tsx — 0.49.0
 *
 * Ayin dogum gunleri takvimi + A4 tebrik karti HTML olusturucu.
 * Veri: students prop'undan gelir — harici API yok.
 * Yarin dogum gunu uyarisi: bugun UI'da gosterilir (bildirim izni gerektirmez).
 */
import { useMemo } from "react";

export interface BirthdayStudent {
  readonly id: string;
  readonly displayName: string;
  /** YYYY-MM-DD veya MM-DD formati */
  readonly birthDate: string | null;
}

export interface BirthdayTrackerProps {
  readonly students: readonly BirthdayStudent[];
  readonly todayCivilDate: string; // YYYY-MM-DD
  readonly onOpenStudent?: (studentId: string) => void;
}

interface BirthdayEntry {
  student: BirthdayStudent;
  dayOfMonth: number;
  monthDay: string; // MM-DD
  isToday: boolean;
  isTomorrow: boolean;
  isThisMonth: boolean;
}

function parseBirthday(birthDate: string): { month: number; day: number } | null {
  // MM-DD veya YYYY-MM-DD
  const parts = birthDate.split("-");
  if (parts.length === 2) {
    const [m, d] = parts.map(Number);
    if (m && d) return { month: m, day: d };
  }
  if (parts.length === 3) {
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (m && d) return { month: m, day: d };
  }
  return null;
}

function generateBirthdayCard(studentName: string, date: string): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>Tebrik Karti — ${studentName}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family:'Inter',Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#fff9f0; }
  .card { background:linear-gradient(135deg,#1a2a6c,#00897b); color:#fff; border-radius:16px; padding:48px; text-align:center; max-width:400px; box-shadow:0 8px 32px rgba(0,0,0,.18); }
  .emoji { font-size:64px; display:block; margin-bottom:16px; }
  h1 { font-size:28pt; margin:0 0 8px; }
  p { font-size:14pt; opacity:.85; margin:0; }
  .date { font-size:11pt; opacity:.7; margin-top:12px; }
</style>
</head>
<body>
<div class="card">
  <span class="emoji">??</span>
  <h1>Iyi ki Dogdun</h1>
  <p style="font-size:22pt; font-weight:700;">${studentName}</p>
  <p class="date">${date}</p>
</div>
</body>
</html>`.trim();
}

export function BirthdayTracker({ students, todayCivilDate, onOpenStudent }: BirthdayTrackerProps) {
  const todayParts = todayCivilDate.split("-");
  const todayMonth = Number(todayParts[1]);
  const todayDay = Number(todayParts[2]);

  // Yarin (basit hesap: ayi ve yili degistirmiyoruz, edge case tolere edilir)
  const tomorrowDay = todayDay + 1;
  const tomorrowMonth = todayMonth; // basit

  const entries = useMemo((): BirthdayEntry[] => {
    const result: BirthdayEntry[] = [];
    for (const student of students) {
      if (!student.birthDate) continue;
      const parsed = parseBirthday(student.birthDate);
      if (!parsed) continue;
      const isToday = parsed.month === todayMonth && parsed.day === todayDay;
      const isTomorrow = parsed.month === tomorrowMonth && parsed.day === tomorrowDay;
      const isThisMonth = parsed.month === todayMonth;
      result.push({
        student,
        dayOfMonth: parsed.day,
        monthDay: `${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`,
        isToday,
        isTomorrow,
        isThisMonth,
      });
    }
    return result.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [students, todayCivilDate]);

  const thisMonthEntries = entries.filter((e) => e.isThisMonth);
  const todayBirthdays = entries.filter((e) => e.isToday);
  const tomorrowBirthdays = entries.filter((e) => e.isTomorrow);

  function printCard(entry: BirthdayEntry) {
    const dateStr = new Date(`2000-${entry.monthDay}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    const html = generateBirthdayCard(entry.student.displayName, dateStr);
    const win = window.open("", "_blank", "width=600,height=500");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <section className="birthday-tracker" aria-label="Dogum Gunu Takvimi">
      <header>
        <h2>?? Dogum Gunleri</h2>
      </header>

      {todayBirthdays.length > 0 && (
        <div className="birthday-tracker__today" role="alert">
          <strong>Bugun dogum gunu!</strong>
          {todayBirthdays.map((e) => (
            <span key={e.student.id}>{e.student.displayName}</span>
          ))}
        </div>
      )}

      {tomorrowBirthdays.length > 0 && (
        <div className="birthday-tracker__tomorrow">
          <strong>Yarin dogum gunu:</strong>
          {tomorrowBirthdays.map((e) => (
            <span key={e.student.id}>{e.student.displayName}</span>
          ))}
        </div>
      )}

      {thisMonthEntries.length === 0 ? (
        <p>Bu ay dogum gunu olan ogrenci bulunmuyor.</p>
      ) : (
        <ol className="birthday-tracker__list">
          {thisMonthEntries.map((entry) => (
            <li
              key={entry.student.id}
              data-today={entry.isToday}
              data-tomorrow={entry.isTomorrow}
            >
              <span className="bt__day">{entry.dayOfMonth}</span>
              <button
                type="button"
                className="bt__name"
                onClick={() => onOpenStudent?.(entry.student.id)}
              >
                {entry.student.displayName}
              </button>
              {(entry.isToday || entry.isTomorrow) && (
                <button
                  type="button"
                  className="bt__card-btn"
                  onClick={() => printCard(entry)}
                  aria-label={`${entry.student.displayName} icin tebrik karti yazdir`}
                >
                  Tebrik Karti
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
