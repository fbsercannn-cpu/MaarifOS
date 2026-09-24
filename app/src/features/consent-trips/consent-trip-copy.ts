import type { ConsentPurpose, ConsentUseState, TripStage } from "../../core/domain/consent-trips.ts";
export const consentPurposeLabels: Record<ConsentPurpose, string> = { trip: "Belirli gezi / etkinlik", "photo-sharing": "Fotoğraf paylaşımı", "portfolio-sharing": "Portfolyo paylaşımı", other: "Belgede açıklanan diğer amaç" };
export const consentStateLabels: Record<ConsentUseState, string> = { "no-document": "Belge yok", missing: "İzin bekliyor", granted: "İzin kayıtlı", revoked: "Geri çekildi", expired: "Süresi doldu", pending: "Başlangıcı bekleniyor", superseded: "Yeni sürüm için izin gerekli" };
export const tripStageLabels: Record<TripStage, string> = { departure: "Çıkış", checkpoint: "Ara kontrol", return: "Dönüş" };
export const consentSourceLabels = { "signed-paper": "İmzalı kâğıt belge", "signed-electronic-document": "İmzalı elektronik belge", "recorded-statement": "Belgeye ilişkin kayda alınmış veli beyanı" } as const;
export const consentTripCopy = {
  scope: "Belge ve kayıtlar seçili sınıf / eğitim yılına bağlıdır.",
  signature: "İmza ve beyan bilgisi öğretmenin gördüğü kaynaktan kaydedilir. Uygulama dijital imza veya velinin hukuki yetkisini doğrulamaz.",
  legacy: "Profildeki eski genel izin seçimleri korunur; bu belge için verilmiş izin sayılmaz.",
  missing: "İşaretlenmemiş çocuk sayım bekler. Görülmedi kaydı ve yoklama devamsızlığı farklıdır.",
  locked: "Başlangıç kadrosu kilitlendi. Sonraki sınıf listesi değişiklikleri bu sayımı değiştirmez.",
  refresh: "Kayıtları yenile", saved: "Kayıt saklandı. Önceki kayıtlar korundu.",
};
export const consentDateLabel = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
export const consentClockLabel = (value: string) => new Date(value).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", second: "2-digit" });
