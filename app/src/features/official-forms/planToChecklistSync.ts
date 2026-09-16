import { MONTHS, type MonthKey, type ChecklistItem } from "./OfficialMonthlyPlanChecklistForm.tsx";

/**
 * TTKB Okul Öncesi Eğitim Programı Yıllık Plan Dağılım Haritası.
 * Her ayın pedagojik temasına göre ele alınan resmî kazanım ve bileşen kodları.
 */
export const OFFICIAL_TYMM_CURRICULUM_DISTRIBUTION: Record<MonthKey, string[]> = {
  Eylül: [
    "mab-1", "fab-1", "fab-2", "sab-1", "sab-2", "hsab-1", "hsab-5", "hsab-8",
    "tab-1", "e1", "sdb-1", "d-1", "k-renk", "k-sekil"
  ],
  Ekim: [
    "mab-1", "mab-2", "mab-3", "fab-1", "fab-3", "sab-3", "sab-4", "hsab-2",
    "hsab-6", "snab-1", "snab-2", "e1", "e2", "sdb-1", "sdb-2", "d-1", "d-2",
    "ob-1", "k-boyut", "k-miktar"
  ],
  Kasım: [
    "mab-2", "mab-4", "fab-4", "sab-4", "sab-5", "hsab-3", "snab-3", "mab-mus-1",
    "tab-2", "e2", "sdb-2", "d-2", "d-5", "ob-1", "ob-2", "k-mekan", "k-zaman"
  ],
  Aralık: [
    "mab-3", "mab-5", "fab-7", "sab-6", "sab-7", "hsab-4", "snab-4", "mab-mus-2",
    "e3", "sdb-2", "d-3", "d-5", "ob-3", "k-miktar", "k-sayi"
  ],
  Ocak: [
    "mab-5", "mab-6", "fab-8", "sab-8", "sab-9", "hsab-8", "hsab-9", "tab-3",
    "e1", "e3", "sdb-3", "d-4", "d-5", "ob-4", "k-duyu", "k-zit"
  ],
  Şubat: [
    "mab-4", "mab-7", "fab-3", "fab-4", "sab-10", "hsab-6", "hsab-7", "mab-mus-3",
    "e2", "sdb-1", "sdb-2", "d-4", "ob-5", "k-boyut", "k-duygu"
  ],
  Mart: [
    "mab-7", "mab-8", "mab-9", "fab-7", "fab-9", "sab-11", "sab-12", "hsab-1",
    "snab-2", "tab-2", "e3", "sdb-2", "d-2", "d-3", "ob-6", "k-mekan", "k-zit"
  ],
  Nisan: [
    "mab-9", "mab-10", "fab-12", "sab-13", "sab-14", "hsab-3", "snab-4", "mab-mus-4",
    "tab-1", "tab-3", "e1", "e2", "sdb-2", "sdb-3", "d-1", "d-4", "ob-1", "ob-4",
    "k-sayi", "k-zaman"
  ],
  Mayıs: [
    "mab-8", "mab-11", "mab-12", "fab-13", "sab-15", "hsab-2", "hsab-7", "snab-3",
    "mab-mus-1", "mab-mus-2", "tab-2", "e2", "e3", "sdb-3", "d-5", "ob-7", "ob-8",
    "k-duyu", "k-zit"
  ],
  Haziran: [
    "mab-11", "mab-12", "mab-13", "fab-8", "fab-12", "sab-1", "sab-14", "hsab-5",
    "hsab-8", "snab-4", "mab-mus-4", "tab-3", "e1", "e2", "e3", "sdb-1", "sdb-3",
    "d-1", "d-4", "d-5", "ob-8", "k-renk", "k-sekil"
  ]
};

/**
 * Verilen kontrol listesi öğeleri için tüm eğitim yılı boyunca
 * resmî müfredat dağılımını otomatik olarak işaretleyen senkronizasyon fonksiyonu.
 */
export function generateCurriculumMatrix(
  items: ChecklistItem[]
): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {};

  items.forEach((item) => {
    result[item.id] = {};
    MONTHS.forEach((month) => {
      const monthCodes = OFFICIAL_TYMM_CURRICULUM_DISTRIBUTION[month] || [];
      result[item.id]![month] = monthCodes.includes(item.id);
    });
  });

  return result;
}
