import type { CollectionName } from "../../core/domain/model";

export const backupRecoveryCopy = {
  title: "Yedek ve kurtarma güvencesi", inspect: "Kayıt ve kapasiteyi kontrol et", busy: "Doğrulanıyor…",
  fileSection: "Bir yedek dosyasını sınayın", file: "Şifreli yedek dosyası", password: "Yedek parolası",
  verify: "Dosyayı değiştirmeden doğrula", verified: "Yedek dosyası doğrulandı",
  local: "Cihazdaki veri", restored: "Son geri yüklemede doğrulanan veri", counts: "Koleksiyon kayıt sayıları",
  drillHelp: "Dosya bu cihazda bellekte geri yüklenir; mevcut sınıfınız değiştirilmez. Bu kontrol, başka bir cihazda denemenin yerine geçmez.",
  protected: "Yerel veri kasası bütün 20 koleksiyonun kayıtlarını ve kurtarma kopyalarının içeriğini şifreler.",
  unsupported: "Dosya desteklenen 96 MiB sınırını aşıyor; daha küçük ve doğrulanmış bir yedek seçin.",
  missing: "Bir şifreli yedek dosyası ve en az 10 karakterlik parolası gerekli.",
  error: "Kurtarma doğrulanamadı. Dosyayı ve parolasını kontrol edin.",
};

export const backupCollectionLabels: Record<CollectionName, string> = {
  academicYears: "Eğitim yılları", classrooms: "Sınıflar", students: "Çocuklar", attendanceRecords: "Yoklama kayıtları",
  observations: "Gözlemler", observationRevisions: "Gözlem düzeltmeleri", activities: "Etkinlikler", mediaAssets: "Medya kayıtları",
  plans: "Planlar", calendarEntries: "Takvim kayıtları", maarifReferences: "Program kaynakları",
  evidenceCurriculumLinks: "Gözlem ve program bağları", valueEvidenceLinks: "Değer eğitimi kanıtları",
  portfolioSelections: "Portfolyo seçimleri", reportDrafts: "Rapor taslakları", externalFeedback: "Dış geri bildirimler",
  exportPackages: "Dışa aktarma kayıtları", notificationRules: "Bildirim kuralları", settings: "Ayar ve öğretmen takip kayıtları",
  auditLogs: "İşlem geçmişi",
};
