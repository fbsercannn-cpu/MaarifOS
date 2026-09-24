/**
 * acoustic-classroom-sensor.ts — MaarifOS 0.95.0
 * Akustik Sınıf Rezonansı & Gerçek Zamanlı Desibel / Diyalojik Denge Motoru
 * 
 * MİMARİ VE GÜVENLİK YASALARI:
 * 1. %100 Zero-Trust & KVKK: Asla ses kaydı tutulmaz, disk/RAM'e audio binary yazılmaz.
 * 2. Web Audio API AnalyserNode ile saf frekans spektrogramı (FFT) ve RMS desibel hesaplanır.
 * 3. Çocukların bilişsel gürültü eşiğini (Montessori & Reggio Emilia) gerçek zamanlı telemetriye döker.
 */

export interface AcousticTelemetry {
  readonly dbLevel: number;             // Tahmini ses basınç seviyesi (dB)
  readonly category: "sessiz" | "ideal" | "uyari" | "kaos";
  readonly categoryLabel: string;
  readonly spectralBalance: {
    readonly lowBass: number;           // Masa sürtmesi / ayak sesleri (20-250 Hz)
    readonly speechBand: number;        // Çocuk & öğretmen konuşma bandı (300-3400 Hz)
    readonly highHarsh: number;         // Çığlık / metalik yankı (>4000 Hz)
  };
  readonly pedagogicalAdvice: string;
  readonly recommendedActivity: string;
}

export class AcousticClassroomSensor {
  private static audioCtx: AudioContext | null = null;
  private static analyser: AnalyserNode | null = null;
  private static micStream: MediaStream | null = null;
  private static dataArray: Uint8Array | null = null;
  private static isListening: boolean = false;

  /**
   * Mikrofon erişimini başlatır (yalnızca yerel donanım analizi)
   */
  public static async startListening(
    onData: (telemetry: AcousticTelemetry) => void
  ): Promise<boolean> {
    if (this.isListening) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Gerçek sınıf ortamını ölçmek için raw noise
          autoGainControl: false,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      this.audioCtx = ctx;
      this.analyser = analyser;
      this.micStream = stream;
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);
      this.isListening = true;

      const analyzeLoop = () => {
        if (!this.isListening || !this.analyser || !this.dataArray) return;

        this.analyser.getByteFrequencyData(this.dataArray as any);

        // 1. RMS Hesaplama
        let sum = 0;
        let bassSum = 0;
        let speechSum = 0;
        let highSum = 0;

        const binCount = this.analyser.frequencyBinCount;
        for (let i = 0; i < binCount; i++) {
          const val = this.dataArray[i];
          sum += val * val;

          // Frekans ayrıştırma (44100Hz örneklemede her bin ~86Hz)
          if (i < 4) bassSum += val;
          else if (i >= 4 && i < 40) speechSum += val;
          else highSum += val;
        }

        const rms = Math.sqrt(sum / binCount);
        // Normalize 35 dB - 95 dB ölçeği
        const estimatedDb = Math.min(95, Math.max(32, Math.round(32 + (rms / 255) * 60)));

        let category: "sessiz" | "ideal" | "uyari" | "kaos" = "ideal";
        let categoryLabel = "İdeal Üretken Uğultu";
        let advice = "Sınıf akustiği öğrenme merkezleri için mükemmel dengede.";
        let recommendedActivity = "Mevcut merkez çalışmalarını sürdürün.";

        if (estimatedDb < 42) {
          category = "sessiz";
          categoryLabel = "Fısıltı / Derin Odak";
          advice = "Sınıf oldukça sakin. Bireysel kitap okuma veya ince motor çalışmaları için ideal an.";
          recommendedActivity = "Kitap & Dil Merkezi dinleme etkinliği.";
        } else if (estimatedDb <= 64) {
          category = "ideal";
          categoryLabel = "İdeal Üretken Uğultu";
          advice = "Akran iletişimi canlı, kognitif iş birliği aktif.";
          recommendedActivity = "Blok ve Dramatik Oyun merkezlerinde rol paylaşımı.";
        } else if (estimatedDb <= 74) {
          category = "uyari";
          categoryLabel = "Yükselen Enerji / Ses Uyarısı";
          advice = "Gürültü dikkat eşiğini aşıyor. Çocukların ses tonunu regüle etmek için yumuşak bir ritim çemberi başlatın.";
          recommendedActivity = "Nefes egzersizi & 'Ses Dedektifi' oyunu.";
        } else {
          category = "kaos";
          categoryLabel = "Akustik Doygunluk / Kaos Eşiği";
          advice = "Bilişsel yorgunluk ve duyusal aşırı yüklenme riski var. Sınıfı anında 'Sessiz Göl' moduna davet edin.";
          recommendedActivity = "Sakinleşme Çemberi veya Doğal Sesler Meditasyonu.";
        }

        onData({
          dbLevel: estimatedDb,
          category,
          categoryLabel,
          spectralBalance: {
            lowBass: Math.round(bassSum / 4),
            speechBand: Math.round(speechSum / 36),
            highHarsh: Math.round(highSum / (binCount - 40)),
          },
          pedagogicalAdvice: advice,
          recommendedActivity,
        });

        requestAnimationFrame(analyzeLoop);
      };

      requestAnimationFrame(analyzeLoop);
      return true;
    } catch (err) {
      console.warn("[AcousticClassroomSensor] Mikrofon erişim hatası:", err);
      return false;
    }
  }

  /**
   * Dinlemeyi durdurur ve donanım kaynaklarını RAM'den siler
   */
  public static stopListening(): void {
    this.isListening = false;
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  public static getActiveStatus(): boolean {
    return this.isListening;
  }
}
