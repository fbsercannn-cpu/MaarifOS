/**
 * circadian-rhythm-engine.ts — MaarifOS 1.3.0
 * Biyolojik ve Nöro-Pedagojik Gün Akışı Ritim Motoru
 * 
 * Okul öncesi çocukların biyolojik dikkat ve hareket dalgalanmalarını
 * günün saatine göre modelleyerek ders akışını ve 528 MEB etkinliğini
 * Türkiye Yüzyılı Maarif Modeli (TYMM) standartlarıyla senkronize eder.
 */

export interface CircadianPhase {
  readonly phaseId: "morning_peak" | "kinetic_burst" | "lunch_nutrition" | "post_lunch_dip" | "social_reflection";
  readonly phaseName: string;
  readonly shortName: string;
  readonly timeRange: string;
  readonly cognitiveCapacity: number;     // 0 - 100
  readonly primaryDomain: string;
  readonly biologicalState: string;
  readonly pedagogicalGuidance: string;
  readonly recommendedCenter: string;
  readonly recommendedActivityType: string;
}

export class CircadianRhythmEngine {
  /**
   * Belirtilen saate (veya şu anki saate) göre günün pedagojik akış evresini döner
   */
  public static getCurrentPhase(currentDate: Date = new Date()): CircadianPhase {
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const decimalHour = hours + minutes / 60;

    if (decimalHour < 10.25) {
      // 08:30 - 10:15: Keşif & Etkinlik Saati
      return {
        phaseId: "morning_peak",
        phaseName: "Keşif ve Etkinlik Saati (Bilişsel Odak)",
        shortName: "Keşif & Etkinlik",
        timeRange: "08:30 - 10:15",
        cognitiveCapacity: 95,
        primaryDomain: "Matematik (MAB) ve Fen / Keşif (FAB)",
        biologicalState: "Zihinsel uyanıklık ve odaklanma düzeyi en yüksek aralıktadır.",
        pedagogicalGuidance: "Soyut düşünme, eşleştirme, örüntü ve keşif etkinlikleri için en verimli dilimdir.",
        recommendedCenter: "Blok Merkezi / Fen ve Keşif Merkezi",
        recommendedActivityType: "528 MEB Etkinlik Havuzundan Keşif ve Mantık Çalışmaları",
      };
    } else if (decimalHour < 12.0) {
      // 10:15 - 12:00: Oyun ve Hareket Saati
      return {
        phaseId: "kinetic_burst",
        phaseName: "Oyun ve Hareket Saati (Bedensel Gelişim)",
        shortName: "Oyun & Hareket",
        timeRange: "10:15 - 12:00",
        cognitiveCapacity: 75,
        primaryDomain: "Fiziksel Gelişim (FMB) ve Açık Hava / Bahçe",
        biologicalState: "Doğal hareket ihtiyacı ve kaba motor enerjisi ön plandadır.",
        pedagogicalGuidance: "Sandalye başı etkinlikler sonlandırılmalı; bahçe, geleneksel çocuk oyunları ve hareket parkurları uygulanmalıdır.",
        recommendedCenter: "Bahçe ve Açık Hava / Dramatik Oyun Merkezi",
        recommendedActivityType: "Geleneksel Çocuk Oyunları ve Ritimli Hareket",
      };
    } else if (decimalHour < 13.0) {
      // 12:00 - 13:00: Beslenme ve Öz Bakım
      return {
        phaseId: "lunch_nutrition",
        phaseName: "Beslenme ve Öz Bakım Zamanı",
        shortName: "Beslenme Saati",
        timeRange: "12:00 - 13:00",
        cognitiveCapacity: 50,
        primaryDomain: "Öz Bakım (OBB) ve Sosyal Nezaket",
        biologicalState: "Beslenme, sindirim ve dinlenme dengesi devrededir.",
        pedagogicalGuidance: "Sofra kültürü, hijyen alışkanlıkları ve paylaşma sakin bir tempoda pekiştirilir.",
        recommendedCenter: "Beslenme ve Dinlenme Alanı",
        recommendedActivityType: "Masa Düzeni ve Sakin İletişim Çemberi",
      };
    } else if (decimalHour < 14.25) {
      // 13:00 - 14:15: Sakin Dinlenme ve Masal
      return {
        phaseId: "post_lunch_dip",
        phaseName: "Sakin Dinlenme ve Masal Saati",
        shortName: "Dinlenme & Masal",
        timeRange: "13:00 - 14:15",
        cognitiveCapacity: 60,
        primaryDomain: "Dil Becerileri (DAB) ve Sanat / Müzik",
        biologicalState: "Yemek sonrası doğal biyolojik gevşeme ve sakinleşme evresidir.",
        pedagogicalGuidance: "Işıklar yumuşatılmalı; resimli kitap okuma, masal anlatımı, mandala ve hafif müzik dinletisi yapılmalıdır.",
        recommendedCenter: "Kitap ve Dil Merkezi / Sanat Merkezi",
        recommendedActivityType: "Masal Çemberi ve Sakin Sanat Etkinlikleri",
      };
    } else {
      // 14:15 - 16:30: Günü Değerlendirme
      return {
        phaseId: "social_reflection",
        phaseName: "Günü Değerlendirme ve Paylaşım Çemberi",
        shortName: "Günü Değerlendirme",
        timeRange: "14:15 - 16:30",
        cognitiveCapacity: 80,
        primaryDomain: "Sosyal-Duygusal Beceriler (SDB) ve Değerler",
        biologicalState: "Akran iletişimi, günün anılarını paylaşma ve yansıtma ihtiyacı belirgindir.",
        pedagogicalGuidance: "Günün öğrenmelerini birlikte konuşun, ürün dosyalarını düzenleyin ve veli paylaşım notunu hazırlayın.",
        recommendedCenter: "Toplanma ve Değerlendirme Halısı",
        recommendedActivityType: "Günün Değerlendirmesi ve Aile Bilgilendirme Notu",
      };
    }
  }
}
