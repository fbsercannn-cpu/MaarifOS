/**
 * T.C. Hazine ve Maliye Bakanlığı & MaarifOS Standartları
 * TYMM Okul Öncesi Günlük Plan Materyalleri ve Kaynak Galerisi Domain Modeli
 * İlham: okuloncesirehberi.com (Materyaller ve Günün Kaynakları Mimarisi)
 * Mimari: Zero-Trust, %100 Stateless Client-Side, A4 CSS Paged Media Uyumlu
 */

export type DailyPlanMaterialCategory =
  | "rhythm-music"
  | "coloring-art"
  | "game-cards"
  | "rules-values-posters"
  | "story-cards"
  | "fingerplay-song"
  | "worksheets";

export interface DailyPlanMaterialCategoryMeta {
  readonly id: DailyPlanMaterialCategory;
  readonly title: string;
  readonly shortTitle: string;
  readonly icon: string;
  readonly description: string;
  readonly badgeColor: string;
}

export const DAILY_PLAN_MATERIAL_CATEGORIES: readonly DailyPlanMaterialCategoryMeta[] = [
  {
    id: "rhythm-music",
    title: "Ritim, Müzik ve Ses Kalıpları",
    shortTitle: "Ritim & Ses",
    icon: "🎵",
    description: "İsim heceleri, vücut perküsyonu ve ses üreten nesnelerle ritim çalışmaları",
    badgeColor: "#8b5cf6",
  },
  {
    id: "coloring-art",
    title: "Boyama ve Özgün Çizim Sayfaları",
    shortTitle: "Boyama",
    icon: "🎨",
    description: "Günün temasına ve değerine uygun açık uçlu renklendirme ve çizim şablonları",
    badgeColor: "#ec4899",
  },
  {
    id: "game-cards",
    title: "Günün Oyunu ve Oyun Kartları",
    shortTitle: "Oyun Kartı",
    icon: "🎲",
    description: "Kurallı grup ve bahçe oyunları, rol dağılımı ve görsel kural kartları",
    badgeColor: "#f59e0b",
  },
  {
    id: "rules-values-posters",
    title: "Sınıf Kuralları ve Erdem-Değer Afişleri",
    shortTitle: "Kural & Değer",
    icon: "📜",
    description: "TYMM Adalet, Saygı, Sorumluluk ve Nezaket görsel A4 duvar posterleri",
    badgeColor: "#059669",
  },
  {
    id: "story-cards",
    title: "Etkileşimli Resimli Hikaye Kartları",
    shortTitle: "Hikaye Kartı",
    icon: "📖",
    description: "Çember saatinde çocuklarla birlikte kurulacak aşamalı öykü kartları",
    badgeColor: "#0284c7",
  },
  {
    id: "fingerplay-song",
    title: "Parmak Oyunları ve Sınıf Şarkıları",
    shortTitle: "Parmak Oyunu",
    icon: "🎶",
    description: "Geçişleri kolaylaştıran hareketli parmak oyunları ve sözlü tekerlemeler",
    badgeColor: "#10b981",
  },
  {
    id: "worksheets",
    title: "A4 Becerileri Geliştirme Çalışma Sayfaları",
    shortTitle: "Çalışma Sayfası",
    icon: "📝",
    description: "Çizgi, eşleştirme, gruplama ve ince motor A4 baskı sayfaları",
    badgeColor: "#6366f1",
  },
] as const;

export interface DailyPlanMaterialItem {
  readonly id: string;
  readonly category: DailyPlanMaterialCategory;
  readonly title: string;
  readonly subtitle: string;
  readonly pedagogicalObjective: string;
  readonly curriculumTargetCode?: string;
  readonly ageGroup: "36-48" | "48-60" | "60-72" | "all";
  readonly classroomInstruction: string;
  readonly lowCostAlternative?: string;
  readonly printTitle: string;
  readonly printBodyHtml: string;
  readonly tags: readonly string[];
}

export const BUILT_IN_DAILY_MATERIALS: readonly DailyPlanMaterialItem[] = [
  {
    id: "mat-rhythm-name-beat",
    category: "rhythm-music",
    title: "İsim Heceleriyle Ritim Kalıbı",
    subtitle: "Alkış, diz vurma ve isim yankısı",
    pedagogicalObjective: "Ses farkındalığı, heceleme algısı ve akran dinleme becerisini geliştirir.",
    curriculumTargetCode: "TADB.2",
    ageGroup: "all",
    classroomInstruction: "Çemberde oturan her çocuk kendi adını hecelerine ayırarak söyler (E-mi-ne: 3 alkış). Grup hep birlikte aynı ritmi yankılar.",
    lowCostAlternative: "Tahta kaşıklar veya kapalı plastik kutu içi kuru nohut ritim aleti.",
    printTitle: "RİTİM KARTI · İSİM VE HECE YANKISI",
    printBodyHtml: `
      <div class="print-card">
        <h3>İSİM HECELERİ RİTİM KALIBI</h3>
        <p class="objective"><strong>Kazanım:</strong> TADB.2 — Ses, hece ve ritim örüntülerini bedensel olarak canlandırma.</p>
        <div class="steps-box">
          <div class="step-item"><strong>1. Aşama:</strong> Öğretmen kendi ismini el çırparak heceler (Örn: E - Mİ - NE).</div>
          <div class="step-item"><strong>2. Aşama:</strong> Çocuklar halkada sırayla isimlerini dizlerine vurarak tekrarlar.</div>
          <div class="step-item"><strong>3. Aşama:</strong> İki heceli ve üç heceli isimler gruplanarak ortak ritim orkestrası kurulur.</div>
        </div>
        <div class="visual-box">
          <div class="beat-circle">👏 1. Vuruş</div>
          <div class="beat-circle">🦵 2. Vuruş</div>
          <div class="beat-circle">✨ 3. Vuruş (Sessiz)</div>
        </div>
        <p class="footer-note">MaarifOS · Okul Öncesi Türkiye Yüzyılı Maarif Modeli Ritim Kartı</p>
      </div>
    `,
    tags: ["ritim", "müzik", "çember", "isim", "hece"],
  },
  {
    id: "mat-coloring-friendship-circle",
    category: "coloring-art",
    title: "Birlikte Oynayan Arkadaşlar Boyama Şablonu",
    subtitle: "A4 Açık Uçlu Resim ve Boyama",
    pedagogicalObjective: "İnce motor kas kontrolü, estetik ifade ve sınıf arkadaşlığı bilincini destekler.",
    curriculumTargetCode: "SAB.8",
    ageGroup: "all",
    classroomInstruction: "Çocuklara boyama sayfası sunulur. Çocuklar karakterlerin kıyafetlerini ve çevrelerini özgürce diledikleri renklerle tamamlar.",
    lowCostAlternative: "Artık renkli kumaş parçaları veya kuru yapraklarla kolaj çalışması.",
    printTitle: "BOYAMA SAYFASI · BİRLİKTE OYNAYAN ARKADAŞLAR",
    printBodyHtml: `
      <div class="print-card coloring-page">
        <h3>BİRLİKTE DAHA GÜZELİZ · ARKADAŞLIK BOYAMA SAYFASI</h3>
        <p class="subtitle">Adı Soyadı: .................................................... · Tarih: .........................</p>
        <div class="svg-container" style="border: 2px dashed #94a3b8; border-radius: 12px; padding: 40px; text-align: center; min-height: 480px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <svg viewBox="0 0 400 300" width="360" height="270" style="stroke: #1e293b; fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;">
            <!-- Güneş -->
            <circle cx="60" cy="60" r="30" />
            <line x1="60" y1="20" x2="60" y2="10" />
            <line x1="60" y1="100" x2="60" y2="110" />
            <line x1="20" y1="60" x2="10" y2="60" />
            <line x1="100" y1="60" x2="110" y2="60" />
            <!-- Çocuk 1 -->
            <circle cx="150" cy="120" r="28" />
            <line x1="150" y1="148" x2="150" y2="210" />
            <line x1="150" y1="170" x2="120" y2="190" />
            <line x1="150" y1="170" x2="200" y2="160" />
            <line x1="150" y1="210" x2="130" y2="270" />
            <line x1="150" y1="210" x2="170" y2="270" />
            <!-- El Ele Tutuşma -->
            <!-- Çocuk 2 -->
            <circle cx="250" cy="120" r="28" />
            <line x1="250" y1="148" x2="250" y2="210" />
            <line x1="250" y1="160" x2="200" y2="160" />
            <line x1="250" y1="170" x2="280" y2="190" />
            <line x1="250" y1="210" x2="230" y2="270" />
            <line x1="250" y1="210" x2="270" y2="270" />
            <!-- Çimen ve Çiçekler -->
            <path d="M 20 270 Q 100 250 200 270 T 380 270" />
            <circle cx="90" cy="255" r="8" />
            <circle cx="310" cy="255" r="8" />
          </svg>
          <p style="margin-top: 20px; font-weight: 600; color: #475569;">"Arkadaşımla el ele veririm, oyunu birlikte güzelleştiririm."</p>
        </div>
        <p class="footer-note">MaarifOS · TYMM Özgün Sanat ve Boyama Şablonu</p>
      </div>
    `,
    tags: ["boyama", "sanat", "arkadaşlık", "ince motor", "A4"],
  },
  {
    id: "mat-game-musical-statues",
    category: "game-cards",
    title: "Günün Oyunu: Neşeli Heykeller ve Donma Oyunu",
    subtitle: "Kurallı grup ve dikkat oyunu",
    pedagogicalObjective: "Öz düzenleme, yönerge takip etme, dur-başla kontrolü ve beden farkındalığı.",
    curriculumTargetCode: "BMB.1",
    ageGroup: "all",
    classroomInstruction: "Müzik veya tef ritmi çalarken çocuklar alanda serbestçe yürür/dans eder. Müzik durduğunda herkes bir 'heykel' olarak donar. Gülen veya hareket eden çocuk 'heykeltıraş yardımcısı' olur.",
    lowCostAlternative: "Müzik yerine tef veya ritmik el çırpması kullanılır.",
    printTitle: "GÜNÜN OYUNU · NEŞELİ HEYKELLER KART KARTI",
    printBodyHtml: `
      <div class="print-card game-card">
        <h3>GÜNÜN OYUNU: NEŞELİ HEYKELLER</h3>
        <p class="badge-role">Oyun Türü: Kurallı Hareket ve Öz Düzenleme Oyunu · Süre: 20 Dk</p>
        <div class="rule-grid">
          <div class="rule-item">
            <h4>1. Kural: Ritimle Hareket Et</h4>
            <p>Müzik veya el çırpması sürdüğü sürece kendi alanında kimseye çarpmadan hareket et.</p>
          </div>
          <div class="rule-item">
            <h4>2. Kural: Sessizce Don</h4>
            <p>Ses durduğu anda bulunduğun pozisyonda heykel gibi sabit kal. Gülümsemek serbest, hareket yok!</p>
          </div>
          <div class="rule-item">
            <h4>3. Rol: Heykeltıraş</h4>
            <p>Öğretmen veya seçilen heykeltıraş çocuk heykelleri gezer, en yaratıcı duruşları tebrik eder.</p>
          </div>
        </div>
        <div class="pedagogical-box">
          <strong>Öğretmen Gözlem Notu:</strong> Çocuğun dürtü kontrolü (inhibition) ve dur-başla tepki hızı süreç değerlendirmesinde dikkate alınır.
        </div>
        <p class="footer-note">MaarifOS · TYMM Oyun Sandığı</p>
      </div>
    `,
    tags: ["oyun", "hareket", "öz düzenleme", "dikkat", "çember"],
  },
  {
    id: "mat-poster-turn-taking",
    category: "rules-values-posters",
    title: "Sınıf Değer Afişi: Sıramızı Bekleriz & Nezaketle İsteriz",
    subtitle: "A4 Renkli Duvar Posteri",
    pedagogicalObjective: "TYMM Adalet ve Saygı (D14) kök değerini günlük sınıf rutinine yerleştirir.",
    curriculumTargetCode: "D14.Saygı",
    ageGroup: "all",
    classroomInstruction: "Sınıfın etkinlik veya su içme alanına göz hizasında asılır. İhtiyaç anında çocuklara afişteki sembol hatırlatılarak rehberlik edilir.",
    lowCostAlternative: "Karton kutu kapağı üzerine çizilip duvara yapıştırılabilir.",
    printTitle: "SINIF DEĞER AFİŞİ · SIRAMIZI BEKLERİZ",
    printBodyHtml: `
      <div class="print-card poster-page" style="border: 4px solid #059669; border-radius: 16px; padding: 24px; text-align: center; background: #f0fdf4;">
        <h1 style="color: #065f46; font-size: 24pt; margin-bottom: 8px;">SIRAMIZI SEVGİYLE BEKLERİZ</h1>
        <h2 style="color: #047857; font-size: 16pt; font-weight: normal; margin-top: 0;">"Senin sıran bittiğinde ben, benim sıram bittiğinde sen."</h2>
        <div style="display: flex; justify-content: center; gap: 20px; margin: 30px 0;">
          <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 16px; width: 140px;">
            <div style="font-size: 36pt;">🙋‍♂️</div>
            <strong style="color: #065f46;">1. Parmak Kaldır</strong>
          </div>
          <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 16px; width: 140px;">
            <div style="font-size: 36pt;">⏳</div>
            <strong style="color: #065f46;">2. Sabırla Bekle</strong>
          </div>
          <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 16px; width: 140px;">
            <div style="font-size: 36pt;">🤝</div>
            <strong style="color: #065f46;">3. Sevgiyle Paylaş</strong>
          </div>
        </div>
        <p style="font-size: 13pt; color: #166534; font-weight: 600; line-height: 1.6;">
          Konuşurken arkadaşımızın sözünü bitirmesini bekleriz.<br />
          Oyuncağı sırayla kullanır, nezaket sözcükleri fısıldarız.
        </p>
        <p class="footer-note" style="margin-top: 40px; color: #65a30d;">T.C. Millî Eğitim Bakanlığı TYMM Erdem-Değer-Eylem İlkeleri Uyarınca Hazırlanmıştır</p>
      </div>
    `,
    tags: ["afiş", "kural", "saygı", "adalet", "nezaket", "duvar"],
  },
  {
    id: "mat-story-sharing-forest",
    category: "story-cards",
    title: "Etkileşimli Hikaye Kartları: Neşeli Orman ve Paylaşım",
    subtitle: "4 Sahneli Resimli Öykü ve Soru Kartı",
    pedagogicalObjective: "Empati kurma, problem çözme ve dinlediğini yorumlama becerilerini pekiştirir.",
    curriculumTargetCode: "TAKB.2",
    ageGroup: "all",
    classroomInstruction: "Öğretmen kartları sırayla çocuklara gösterir. 3. sahnede hikaye durdurularak çocuklara 'Sizce sincap ne yapabilir?' sorusu yöneltilir.",
    lowCostAlternative: "Kartlar renkli kalemlerle çocuklarla birlikte çizilebilir.",
    printTitle: "HİKAYE KARTLARI · NEŞELİ ORMAN VE PAYLAŞIM",
    printBodyHtml: `
      <div class="print-card story-page">
        <h3>NEŞELİ ORMAN VE PAYLAŞIM HİKAYESİ</h3>
        <p class="story-desc">Çember saatinde etkileşimli okuma için 4 aşamalı anlatı:</p>
        <div class="story-quad">
          <div class="quad-card">
            <strong>1. Sahne: Buluşma</strong>
            <p>Küçük Sincap Pıtır, meşe ağacının altında kocaman kırmızı bir elma bulur. Karnı çok acıkmıştır ama elma tek başına yemek için çok büyüktür.</p>
          </div>
          <div class="quad-card">
            <strong>2. Sahne: Karşılaşma</strong>
            <p>O sırada yanına üzgün yürüyen Kirpi Diken gelir. Sabahtan beri hiçbir meyve bulamamıştır.</p>
          </div>
          <div class="quad-card">
            <strong>3. Sahne: Çözüm Çemberi (Durdur ve Sor)</strong>
            <p><em>Öğretmen Sorusu:</em> "Çocuklar, Pıtır bu durumda ne yaparsa iki arkadaş da mutlu olur?"</p>
          </div>
          <div class="quad-card">
            <strong>4. Sahne: Birlikte Ziyafet</strong>
            <p>Pıtır elmayı ikiye böler ve yarısını Kirpi Diken'e verir. Birlikte şarkı söyleyerek neşeyle yerler.</p>
          </div>
        </div>
        <p class="footer-note">MaarifOS · TYMM Etkileşimli Hikaye Kartı</p>
      </div>
    `,
    tags: ["hikaye", "öykü", "paylaşım", "çember", "empati"],
  },
  {
    id: "mat-fingerplay-line-up",
    category: "fingerplay-song",
    title: "Parmak Oyunu & Şarkı: Sıra Olalım Treni",
    subtitle: "Geçiş ve Bahçeye Çıkış Şarkısı",
    pedagogicalObjective: "Geçiş anlarında karmaşayı önler, motor koordinasyon ve grup uyumunu sağlar.",
    curriculumTargetCode: "GİB.1",
    ageGroup: "all",
    classroomInstruction: "Sınıftan bahçeye veya yemekhaneye geçişte çocuklarla birlikte ritim tutularak söylenir. Bir çocuk 'makinist' olur, diğerleri 'vagon' gibi dizilir.",
    lowCostAlternative: "Görsel tren şapkası kağıttan yapılabilir.",
    printTitle: "PARMAK OYUNU VE GEÇİŞ ŞARKISI · SIRA OLALIM TRENİ",
    printBodyHtml: `
      <div class="print-card fingerplay-page">
        <h3>SIRA OLALIM TRENİ (GEÇİŞ ŞARKISI)</h3>
        <p class="song-meta">Makam / Tempo: Neşeli ve Ritmik · Kullanım: Bahçeye ve Etkinlik Geçişlerine Uygun</p>
        <div class="lyrics-box" style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 18px; margin: 16px 0; font-size: 13pt; line-height: 1.8;">
          <p>Çuf çuf çuf çuf tren gelir, <em>(Kollar dirsekten bükülü ritimle çevrilir)</em></p>
          <p>Tüm vagonlar peş peşe dizilir. <em>(Parmaklar tek tek sıraya girer)</em></p>
          <p>Kimse kimseyi itmez, <em>(İşaret parmağı ile hayır hareketi)</em></p>
          <p>Sevgi treni hiç bitmez! <em>(İki el kalbin üzerine konur)</em></p>
          <p>Düt düüüt! Yolcular hazır mı? <em>(Bir el havaya kalkar düdük çalar)</em></p>
          <p>Biz hazırız, yola çıkalım! <em>(Hep birlikte adım atılır)</em></p>
        </div>
        <p class="footer-note">MaarifOS · Erken Çocukluk Geçiş Rutinleri Kılavuzu</p>
      </div>
    `,
    tags: ["parmak oyunu", "şarkı", "geçiş", "tren", "sıra"],
  },
  {
    id: "mat-worksheet-fine-motor-trace",
    category: "worksheets",
    title: "Çalışma Sayfası: Yuvaya Ulaşan Çizgiler",
    subtitle: "A4 Çizgi Tamamlama ve El-Göz Koordinasyonu",
    pedagogicalObjective: "Kalem tutuşu, el-göz koordinasyonu ve soldan sağa çizgi takibi becerisini pekiştirir.",
    curriculumTargetCode: "GİB.3",
    ageGroup: "all",
    classroomInstruction: "Çocuklara çalışma kağıdı verilir. Noktalı çizgileri parmaklarıyla veya kalın üçgen pastel boyalarla birleştirmeleri istenir.",
    lowCostAlternative: "Tepsi içine dökülen un veya irmik üzerinde parmakla çizgi çalışması.",
    printTitle: "A4 ÇALIŞMA SAYFASI · YUVAYA ULAŞAN ÇİZGİLER",
    printBodyHtml: `
      <div class="print-card worksheet-page">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px;">
          <strong>Öğrenci Adı: ....................................................</strong>
          <strong>Tarih: .........................</strong>
        </div>
        <h3 style="text-align: center; margin-top: 16px;">YUVAYA ULAŞAN ÇİZGİLERİ TAMAMLAYALIM</h3>
        <p style="text-align: center; color: #64748b; font-size: 11pt;">Sevimli hayvanları noktalı çizgileri takip ederek yuvalarına ulaştırın.</p>
        <div class="lines-task" style="margin: 30px 0; display: flex; flex-direction: column; gap: 35px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 28pt;">🐰</span>
            <span style="flex: 1; margin: 0 15px; border-bottom: 3px dashed #334155;"></span>
            <span style="font-size: 28pt;">🥕</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 28pt;">🐝</span>
            <svg style="flex: 1; margin: 0 15px; height: 30px; stroke: #334155; fill: none; stroke-width: 3; stroke-dasharray: 6,6;">
              <path d="M 0 15 Q 60 0 120 15 T 240 15 T 360 15 T 480 15" />
            </svg>
            <span style="font-size: 28pt;">🌺</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 28pt;">🐿️</span>
            <svg style="flex: 1; margin: 0 15px; height: 40px; stroke: #334155; fill: none; stroke-width: 3; stroke-dasharray: 6,6;">
              <path d="M 0 35 L 40 5 L 80 35 L 120 5 L 160 35 L 200 5 L 240 35 L 280 5 L 320 35 L 360 5 L 400 35 L 440 5 L 480 35" />
            </svg>
            <span style="font-size: 28pt;">🌰</span>
          </div>
        </div>
        <p class="footer-note" style="margin-top: 60px;">MaarifOS · TYMM Becerileri Destekleme Çalışma Sayfası</p>
      </div>
    `,
    tags: ["çalışma sayfası", "çizgi", "el göz koordinasyonu", "ince motor", "A4"],
  },
];

export function filterDailyMaterials(
  category?: DailyPlanMaterialCategory | "all",
  searchQuery?: string,
): readonly DailyPlanMaterialItem[] {
  let items = BUILT_IN_DAILY_MATERIALS;
  if (category && category !== "all") {
    items = items.filter((m) => m.category === category);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    items = items.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.pedagogicalObjective.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  return items;
}

/**
 * Verilen materyal öğesi için A4 CSS Paged Media uyumlu,
 * baskıya hazır tam HTML belgesi üretir.
 */
export function generateMaterialPrintHtml(item: DailyPlanMaterialItem): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${item.printTitle} — MaarifOS</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .print-brand {
      font-weight: 800;
      font-size: 13pt;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .print-meta {
      font-size: 9pt;
      color: #475569;
      text-align: right;
    }
    .print-card {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    h1, h2, h3, h4 {
      margin-top: 0;
      color: #0f172a;
    }
    .objective {
      background: #f8fafc;
      padding: 8px 12px;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      font-size: 10.5pt;
      margin: 12px 0;
    }
    .steps-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 14px 0;
    }
    .step-item {
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 10.5pt;
    }
    .visual-box {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 24px 0;
    }
    .beat-circle {
      border: 2px solid #64748b;
      border-radius: 50px;
      padding: 12px 20px;
      font-weight: 700;
      background: #f8fafc;
      font-size: 12pt;
    }
    .rule-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin: 16px 0;
    }
    .rule-item {
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 12px;
    }
    .rule-item h4 {
      font-size: 10.5pt;
      margin-bottom: 4px;
      color: #92400e;
    }
    .rule-item p {
      font-size: 9.5pt;
      margin: 0;
      color: #78350f;
    }
    .story-quad {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 16px 0;
    }
    .quad-card {
      background: #f0f9ff;
      border: 1.5px solid #bae6fd;
      border-radius: 10px;
      padding: 14px;
    }
    .quad-card strong {
      display: block;
      color: #0369a1;
      margin-bottom: 6px;
      font-size: 11pt;
    }
    .quad-card p {
      font-size: 10pt;
      margin: 0;
      color: #0c4a6e;
    }
    .footer-note {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8.5pt;
      color: #64748b;
      text-align: center;
    }
    @media print {
      body {
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <header class="print-header">
      <div class="print-brand">T.C. MİLLÎ EĞİTİM BAKANLIĞI · MAARİFOS</div>
      <div class="print-meta">
        <div>Türkiye Yüzyılı Maarif Modeli</div>
        <div>Okul Öncesi Sınıf İçi Etkinlik Materyali</div>
      </div>
    </header>
    <main>
      ${item.printBodyHtml}
    </main>
  </div>
</body>
</html>`;
}
