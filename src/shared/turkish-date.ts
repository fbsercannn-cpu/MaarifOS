const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** Kullanıcıya gösterilen bütün günleri sabit gg/aa/yyyy biçimine çevirir. */
export function formatTurkishDate(value: string): string {
  const match = CIVIL_DATE.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function formatTurkishInstantDate(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")}`;
}
