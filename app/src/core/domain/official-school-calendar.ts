export const MEB_2026_2027_SOURCE_URL =
  "https://meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr";
export const MEB_2026_2027_SOURCE_CHECKED_ON = "2026-07-29";

export interface OfficialAcademicCalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  kind:
    | "teacher_work"
    | "adaptation"
    | "term"
    | "break"
    | "year_end";
  sourceUrl: string;
  sourceCheckedOn: string;
}

export interface OfficialAcademicCalendarProfile {
  id: "meb-2026-2027";
  label: "2026–2027 MEB çalışma takvimi";
  academicYearName: "2026–2027 Eğitim Yılı";
  dataStartDate: "2026-09-01";
  dataEndDate: "2027-08-31";
  instructionalStartDate: "2026-09-14";
  instructionalEndDate: "2027-06-25";
  events: readonly OfficialAcademicCalendarEvent[];
}

const source = {
  sourceUrl: MEB_2026_2027_SOURCE_URL,
  sourceCheckedOn: MEB_2026_2027_SOURCE_CHECKED_ON,
} as const;

export const OFFICIAL_ACADEMIC_CALENDAR_2026_2027:
  OfficialAcademicCalendarProfile = {
    id: "meb-2026-2027",
    label: "2026–2027 MEB çalışma takvimi",
    academicYearName: "2026–2027 Eğitim Yılı",
    dataStartDate: "2026-09-01",
    dataEndDate: "2027-08-31",
    instructionalStartDate: "2026-09-14",
    instructionalEndDate: "2027-06-25",
    events: [
      {
        id: "teacher-work-start",
        title: "Öğretmenlerin mesleki çalışmaları başlıyor",
        startDate: "2026-09-01",
        endDate: "2026-09-01",
        kind: "teacher_work",
        ...source,
      },
      {
        id: "preschool-adaptation",
        title: "Okul öncesi uyum eğitimi",
        startDate: "2026-09-07",
        endDate: "2026-09-11",
        kind: "adaptation",
        ...source,
      },
      {
        id: "first-term",
        title: "Birinci dönem",
        startDate: "2026-09-14",
        endDate: "2027-01-22",
        kind: "term",
        ...source,
      },
      {
        id: "first-break",
        title: "Birinci dönem ara tatili",
        startDate: "2026-11-16",
        endDate: "2026-11-20",
        kind: "break",
        ...source,
      },
      {
        id: "semester-break",
        title: "Yarıyıl tatili",
        startDate: "2027-01-25",
        endDate: "2027-02-05",
        kind: "break",
        ...source,
      },
      {
        id: "second-term",
        title: "İkinci dönem",
        startDate: "2027-02-08",
        endDate: "2027-06-25",
        kind: "term",
        ...source,
      },
      {
        id: "second-break",
        title: "İkinci dönem ara tatili",
        startDate: "2027-03-08",
        endDate: "2027-03-12",
        kind: "break",
        ...source,
      },
      {
        id: "academic-year-end",
        title: "Eğitim öğretim yılı sona eriyor",
        startDate: "2027-06-25",
        endDate: "2027-06-25",
        kind: "year_end",
        ...source,
      },
    ],
  };

