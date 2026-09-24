export const DOCUMENT_USE_PHASES = [
  {
    id: "before-class",
    label: "Ders öncesi",
    detail: "Planı, sınıf çizelgesini ve gerekli boş not sayfalarını hazırlayın; gerekiyorsa önceden basın.",
  },
  {
    id: "during-class",
    label: "Ders sırasında",
    detail: "Telefon zorunlu değildir. Kurum düzenine göre basılı kısa not kullanın; çocukla çalışmayı bölmeyin.",
  },
  {
    id: "after-class",
    label: "Ders sonrası",
    detail: "Basılı notu öğretmen yargısıyla gözden geçirip cihazdaki kalıcı kayda dönüştürün.",
  },
] as const;

export const DOCUMENT_AUTHORIZED_CHANNEL_NOTICE =
  "MaarifOS dosyayı kendiliğinden göndermez. Paylaşım gerekiyorsa alıcıyı, amacı ve kapsamı kontrol ederek yalnız okulun güncel yetkili kanalını kullanın.";

export function assertClassroomPhoneOptional(phases: readonly { readonly detail: string }[]): void {
  if (!phases.some((phase) => /Telefon zorunlu değildir/u.test(phase.detail))) {
    throw new Error("Belge kullanım yardımı sınıf içinde telefonu zorunlu tutmamalıdır.");
  }
}
