/**
 * ambient-classroom-sensor.ts — MaarifOS 0.92.0
 * Türkiye Yüzyılı Maarif Modeli (TYMM) 2026
 * Ambient Intelligence & NFC / QR / Beacon Öğrenme Merkezleri Sensörü
 * 
 * Felsefe: Mark Weiser (Ubiquitous Computing) & Maria Montessori (Hazırlanmış Çevre)
 * 
 * Öğretmenin sınıfta dolaşırken ekrana bakma zorunluluğunu ortadan kaldıran;
 * sınıftaki 6 öğrenme merkezine yerleştirilen NFC/QR/Beacon etiketleriyle
 * öğretmenin hangi istasyonda olduğunu algılayıp pedagojik gözlem ve
 * öğrenci bağlamını arka planda otonom hazırlayan ortam zekâsı çekirdeği.
 * 
 * %100 İstemci Taraflı (Stateless Client-Side) & Sıfır Bulut Bağımlılığı.
 */

export interface LearningCenterStation {
  id: string;
  name: string;
  nfcTagId: string;
  qrPayload: string;
  icon: string;
  themeColor: string;
  dominantTymmCodes: string[];
  suggestedPrompt: string;
  activeChildCount: number;
}

export interface AmbientSensorState {
  isNfcAvailable: boolean;
  isScanning: boolean;
  activeStationId: string | null;
  lastDetectedAt: string | null;
  detectionMode: "nfc" | "qr" | "manual" | "beacon_sim";
}

export const LEARNING_CENTER_STATIONS: LearningCenterStation[] = [
  {
    id: "center_blok",
    name: "Blok Merkezi",
    nfcTagId: "MOS-TAG-BLOK-01",
    qrPayload: "maarifos://station/blok",
    icon: "🧱",
    themeColor: "#0284c7",
    dominantTymmCodes: ["MAB 1.1 İnce Motor", "MAB 1.3 Görsel-Mekânsal Denge", "E2.4 İş Birliği"],
    suggestedPrompt: "Blok kulesi veya köprü yapımında parça seçimi, denge ve akranla paylaşım davranışı.",
    activeChildCount: 4,
  },
  {
    id: "center_sanat",
    name: "Sanat Merkezi",
    nfcTagId: "MOS-TAG-SANAT-02",
    qrPayload: "maarifos://station/sanat",
    icon: "🎨",
    themeColor: "#f59e0b",
    dominantTymmCodes: ["E3.1 Estetik Duyarlılık", "D19 Estetik & Zarafet", "MAB 1.1 Kesme/Yoğurma"],
    suggestedPrompt: "Renk karışımları, serbest fırça kullanımı ve materyalleri amaca uygun temiz kullanma.",
    activeChildCount: 5,
  },
  {
    id: "center_fen",
    name: "Fen & Doğa Merkezi",
    nfcTagId: "MOS-TAG-FEN-03",
    qrPayload: "maarifos://station/fen",
    icon: "🌱",
    themeColor: "#10b981",
    dominantTymmCodes: ["E1.1 Merak & Keşif", "E1.2 Bilimsel Sorgulama", "FKB 1.1 Doğa Gözlemi"],
    suggestedPrompt: "Büyüteç, terazi veya tohum incelemesinde neden-sonuç sorusu sorma ve hipotez kurma.",
    activeChildCount: 3,
  },
  {
    id: "center_kitap",
    name: "Kitap & Masal Merkezi",
    nfcTagId: "MOS-TAG-KITAP-04",
    qrPayload: "maarifos://station/kitap",
    icon: "📖",
    themeColor: "#8b5cf6",
    dominantTymmCodes: ["MAB 1.2 Dil & İletişim", "OB4 Görsel Okuryazarlık", "D11 Sabır & Dinleme"],
    suggestedPrompt: "Resimli kitaptaki olay akışını tahmin etme, sayfaları özenle çevirme ve akrana anlatma.",
    activeChildCount: 3,
  },
  {
    id: "center_dramatik",
    name: "Dramatik Oyun Merkezi",
    nfcTagId: "MOS-TAG-DRAMA-05",
    qrPayload: "maarifos://station/drama",
    icon: "🎭",
    themeColor: "#ec4899",
    dominantTymmCodes: ["SDB 1.1 Rol Üstlenme", "D20 Sevgi & Saygı", "E2.4 Nezaket Kuralları"],
    suggestedPrompt: "Kostüm ve aksesuarlarla hayali oyun kurma, problem durumunda uzlaşmacı diyalog kurma.",
    activeChildCount: 5,
  },
  {
    id: "center_muzik",
    name: "Müzik & Ritim İstasyonu",
    nfcTagId: "MOS-TAG-MUZIK-06",
    qrPayload: "maarifos://station/muzik",
    icon: "🎵",
    themeColor: "#06b6d4",
    dominantTymmCodes: ["MAB 1.1 Ritmik Koordinasyon", "E2.1 Öz Düzenleme", "E3.1 Müzikal Duyu"],
    suggestedPrompt: "Enstrümanla verilen ritme uyum sağlama, ses tonunu ayarlama ve şarkıya eşlik etme.",
    activeChildCount: 4,
  },
];

/**
 * Cihazda Web NFC desteği olup olmadığını kontrol eder (Android Chrome vb.).
 */
export function isWebNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/**
 * NFC Tarayıcısını başlatır ve istasyon etiketini dinler.
 */
export async function startAmbientNfcScanner(
  onStationDetected: (station: LearningCenterStation) => void,
  onError?: (errorMsg: string) => void
): Promise<() => void> {
  if (!isWebNfcSupported()) {
    if (onError) onError("Cihazınızda Web NFC desteklenmiyor veya izin verilmedi.");
    return () => {};
  }

  try {
    const ndef = new (window as any).NDEFReader();
    await ndef.scan();

    const handleReading = (event: any) => {
      const serialNumber = event.serialNumber;
      // Serial veya içerikten istasyon eşle
      const matched = LEARNING_CENTER_STATIONS.find((s) =>
        s.nfcTagId === serialNumber || event.message.records.some((r: any) => new TextDecoder().decode(r.data).includes(s.id))
      ) || LEARNING_CENTER_STATIONS[0];

      onStationDetected(matched);
    };

    ndef.addEventListener("reading", handleReading);

    return () => {
      // Cleanup listener
      try {
        ndef.removeEventListener("reading", handleReading);
      } catch { /* ignore */ }
    };
  } catch (err: any) {
    if (onError) onError(err.message || "NFC tarayıcı başlatılamadı.");
    return () => {};
  }
}

/**
 * QR Kod metninden ilgili istasyonu eşler.
 */
export function resolveStationFromQr(qrText: string): LearningCenterStation | null {
  const clean = qrText.trim().toLowerCase();
  for (const st of LEARNING_CENTER_STATIONS) {
    if (clean.includes(st.id) || clean.includes(st.name.toLowerCase()) || clean === st.qrPayload) {
      return st;
    }
  }
  return null;
}
