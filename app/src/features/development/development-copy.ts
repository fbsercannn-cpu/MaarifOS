export const DEVELOPMENT_PERIOD_OPTIONS = [
  { value: "week", label: "Bu hafta" },
  { value: "month", label: "Bu ay" },
  { value: "year", label: "Eğitim yılı" },
] as const;

export const DEVELOPMENT_COPY = {
  cardTitle: "Gelişim kayıtları",
  coverageTitle: "Gözlem kapsamı",
  periodLabel: "Gözlem dönemi",
  unspecifiedDomain: "Alan belirtilmedi",
  noObservations: "Henüz kayıt yok",
  noStudents: "Bu dönemde sınıf üyesi yok.",
  noPeriod: "Seçili dönem eğitim yılı dışında.",
  noClassroom: "Önce sınıfınızı seçin.",
  quickObservation: "Gözlem ekle",
  createReport: "Rapor hazırla",
  reportNeedsObservation: "Rapor için bu döneme ait en az bir gözlem gerekli.",
  studentsDetail: "Çocuk bazında gör",
  support: "Bu olayda destek",
  coverageNotice: "Yalnız kayıt sayısıdır; gelişim düzeyi göstermez.",
  invalidDate: "Gözlem dönemi için geçerli bir tarih gerekli.",
  invalidPeriod: "Gözlem dönemi geçersiz.",
  studentFallback: "Çocuk",
  observationCount: (count: number) => `${count} gözlem`,
  moreObservations: (count: number) => `Diğer ${count} kaydı gör`,
  coverageSummary: (observed: number, remaining: number) =>
    `${observed} çocukta kayıt var · ${remaining} çocukta henüz yok`,
  lastObservation: (date: string) => `Son kayıt: ${date}`,
  openObservation: (date: string) => `${date} tarihli gözlemi aç`,
  openStudent: (name: string) => `${name} gelişim kayıtlarını aç`,
  observeStudent: (name: string) => `${name} için gözlem ekle`,
} as const;
