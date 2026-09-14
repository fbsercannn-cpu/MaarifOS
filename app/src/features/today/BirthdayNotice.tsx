import { upcomingStudentBirthdays, type BirthdayStudent } from "./student-birthdays.ts";
import "./birthday-notice.css";

export function BirthdayNotice({ students, civilDate, onOpenStudent }: { students: readonly BirthdayStudent[]; civilDate: string; onOpenStudent?: (id: string) => void }) {
  const birthdays = upcomingStudentBirthdays(students, civilDate);
  if (!birthdays.length) return null;
  return <section className="birthday-notice" aria-labelledby="birthday-notice-title">
    <div className="birthday-notice__heading"><span aria-hidden="true">🎂</span><div><h2 id="birthday-notice-title">Yaklaşan doğum günleri</h2><p>3 gün öncesinden hatırlatma</p></div></div>
    <ul>{birthdays.map(birthday => <li key={birthday.studentId}>
      <div><strong>{birthday.name}</strong><span>{birthday.daysUntil === 0 ? "Bugün" : birthday.daysUntil === 1 ? "Yarın" : `${birthday.daysUntil} gün sonra`} · {birthday.turningAge} yaşına giriyor</span>{birthday.leapDayAdjusted ? <small>29 Şubat doğum günü bu yıl 28 Şubat'ta hatırlatılıyor.</small> : null}</div>
      {onOpenStudent ? <button type="button" aria-label={`${birthday.name} öğrenci dosyasını aç`} onClick={() => onOpenStudent(birthday.studentId)}>Dosyası</button> : null}
    </li>)}</ul>
  </section>;
}
