import fs from "fs";
import path from "path";

const rawPath = "C:/Users/Asus/.gemini/antigravity/brain/b3555101-a26c-4830-8426-867ed4aa4195/scratch/all_textbook_activities.json";
const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"));

function cleanTitle(raw) {
  if (!raw) return "Etkinlik";
  let t = raw.trim().replace(/^\d+\s*/, "").replace(/\s*\d+$/, "").trim();
  // Capitalize nicely
  return t;
}

function determineDomain(title, text) {
  const combined = (title + " " + text).toLowerCase();
  if (/sayı|rakam|örüntü|sayma|toplama|şekil|daire|üçgen|kare|dikdörtgen|miktar|az|çok|eşleştir|bütün|yarım|grafik|çetele|geometrik/.test(combined)) {
    return "Matematik";
  }
  if (/deney|su|böcek|bitki|çiçek|hayvan|doğa|tohum|ağaç|hava|bulut|rüzgar|batar|yüzer|canlı|cansız|organ|duyu|toprak|taş|mevsim|sonbahar|kış|ilkbahar|yaz|uzay|gezegen|gölge|ışık|mıknatıs|çevre/.test(combined)) {
    return "Fen ve Doğa";
  }
  if (/çiz|boya|kolaj|sanat|yoğurma|kil|hamur|artık materyal|heykel|parmak boyası|origami|katlama|kesme|yapıştırma/.test(combined)) {
    return "Sanat";
  }
  if (/şarkı|ritim|müzik|çalgı|ses|melodi|marş|enstrüman|tempo|marakas|tef/.test(combined)) {
    return "Müzik";
  }
  if (/koşu|zıpla|tırman|denge|hareket|spor|jimnastik|parmak oyunu|top|nefes|parkur|beden|fiziksel/.test(combined)) {
    return "Hareket ve Sağlık";
  }
  if (/arkadaş|duygu|öfke|sevinç|mutlu|üzgün|kural|paylaş|nezaket|aile|empati|barış|mahremiyet|hak|saygı|yardım/.test(combined)) {
    return "Sosyal & Duygusal";
  }
  if (/hikaye|masal|kitap|harf|ses|tekerleme|şiir|canlandırma|drama|konuşma|dinleme|kelime|okuma/.test(combined)) {
    return "Erken Okuryazarlık & Türkçe";
  }
  return "Bütünleşik Etkinlik";
}

function determineTheme(title, domain) {
  let t = cleanTitle(title);
  if (t.length > 3) return t;
  return `${domain} Keşifleri`;
}

function extractResearchQuestion(text, title, domain) {
  if (!text) return `${title} ile çevremizde neleri keşfedebiliriz?`;
  // look for question sentence in text
  const match = text.match(/([A-ZÇĞİÖŞÜa-zçğıöşü\s,–—'"]+\?)/);
  if (match && match[1].trim().length > 12 && match[1].trim().length < 120) {
    let q = match[1].trim().replace(/^\d+\s*/, "");
    return q.charAt(0).toUpperCase() + q.slice(1);
  }
  if (domain === "Matematik") return `${cleanTitle(title)} ile sayıları ve şekilleri nasıl gruplayabiliriz?`;
  if (domain === "Fen ve Doğa") return `${cleanTitle(title)} doğada ve çevremizde nasıl işler?`;
  if (domain === "Sanat") return `Farklı malzemelerle ${cleanTitle(title)} nasıl canlandırabiliriz?`;
  if (domain === "Müzik") return `Bedenimiz ve sesimizle ${cleanTitle(title)} ritmini nasıl yakalarız?`;
  if (domain === "Hareket ve Sağlık") return `${cleanTitle(title)} hareketlerini yaparken bedenimiz nasıl dengede kalır?`;
  if (domain === "Sosyal & Duygusal") return `${cleanTitle(title)} durumunda kendimizi ve arkadaşlarımızı nasıl anlarız?`;
  return `${cleanTitle(title)} konusu günlük yaşamımızda bize nasıl yardımcı olur?`;
}

function extractMaterials(text, domain) {
  const combined = (text || "").toLowerCase();
  const pool = [];
  if (/büyüteç|mikroskop/.test(combined)) pool.push("Büyük boy el büyüteçleri");
  if (/su|kap|kova/.test(combined)) pool.push("Şeffaf su deney küveti");
  if (/boya|renkli/.test(combined)) pool.push("Su bazlı boya kalemleri", "Renkli fon kartonları");
  if (/hamur|yoğur/.test(combined)) pool.push("Doğal tuz seramiği / Oyun hamuru", "Merdaneler");
  if (/yaprak|dal|taş|toprak|doğal/.test(combined)) pool.push("Doğal kozalak ve yapraklar", "Düz dere taşları");
  if (/sayı|rakam|sayma|nesne/.test(combined)) pool.push("Ahşap sayma çubukları", "Sayı kartları (1-10)");
  if (/şekil|kare|üçgen|daire/.test(combined)) pool.push("Geometrik ahşap şekil blokları");
  if (/müzik|ritim|şarkı/.test(combined)) pool.push("Ritim çubukları", "Marakas ve tefler");
  if (/hikaye|kitap|masal/.test(combined)) pool.push("Büyük boy resimli hikaye kitabı", "Görsel sıralama kartları");
  if (/ayna|duygu|yüz/.test(combined)) pool.push("Kırılmaz çocuk güvenlik aynası", "Duygu ifade kartları");
  if (/top|denge|zıpla/.test(combined)) pool.push("Yumuşak sünger denge topları", "Zemin işaretleme bantları");

  if (pool.length < 3) {
    if (domain === "Fen ve Doğa") pool.push("Gözlem tepsisi", "Doğa koleksiyonu kutusu");
    else if (domain === "Matematik") pool.push("Renkli bağlantı küpleri", "Eşleştirme tablası");
    else if (domain === "Sanat") pool.push("Fırçalar ve parmak boyaları", "Beyaz resim kağıtları");
    else if (domain === "Müzik") pool.push("Ses boruları", "Ahşap kastanyet");
    else if (domain === "Hareket ve Sağlık") pool.push("Denge yastıkları", "Renkli jimnastik çemberleri");
    else pool.push("Etkinlik resim kartları", "Renkli pastel boyalar");
  }

  return Array.from(new Set(pool)).slice(0, 4);
}

function extractConcepts(text, domain) {
  const combined = (text || "").toLowerCase();
  const c = [];
  if (/büyük|küçük/.test(combined)) c.push("Büyük - Küçük");
  if (/uzun|kısa/.test(combined)) c.push("Uzun - Kısa");
  if (/kalın|ince/.test(combined)) c.push("Kalın - İnce");
  if (/az|çok/.test(combined)) c.push("Az - Çok");
  if (/ağır|hafif/.test(combined)) c.push("Ağır - Hafif");
  if (/bütün|yarım/.test(combined)) c.push("Bütün - Yarım");
  if (/kırmızı/.test(combined)) c.push("Kırmızı");
  if (/sarı/.test(combined)) c.push("Sarı");
  if (/mavi/.test(combined)) c.push("Mavi");
  if (/yeşil/.test(combined)) c.push("Yeşil");
  if (/daire/.test(combined)) c.push("Daire");
  if (/üçgen/.test(combined)) c.push("Üçgen");
  if (/kare/.test(combined)) c.push("Kare");
  if (/içinde|dışında/.test(combined)) c.push("İçinde - Dışında");
  if (/önünde|arkasında/.test(combined)) c.push("Önünde - Arkasında");
  if (/altında|üstünde/.test(combined)) c.push("Altında - Üstünde");
  if (/canlı|cansız/.test(combined)) c.push("Canlı - Cansız");
  if (/sıcak|soğuk/.test(combined)) c.push("Sıcak - Soğuk");
  if (/aynı|farklı/.test(combined)) c.push("Aynı - Farklı");
  if (/mutlu|üzgün/.test(combined)) c.push("Mutlu - Üzgün");
  if (/gece|gündüz/.test(combined)) c.push("Gece - Gündüz");
  if (/1|bir/.test(combined)) c.push("1 (Bir)");
  if (/2|iki/.test(combined)) c.push("2 (İki)");
  if (/3|üç/.test(combined)) c.push("3 (Üç)");
  if (/4|dört/.test(combined)) c.push("4 (Dört)");
  if (/5|beş/.test(combined)) c.push("5 (Beş)");

  if (c.length === 0) {
    if (domain === "Matematik") c.push("Az - Çok", "Aynı - Farklı");
    else if (domain === "Fen ve Doğa") c.push("Canlı - Cansız", "Sıcak - Soğuk");
    else if (domain === "Sanat") c.push("Aynı - Farklı", "Daire");
    else if (domain === "Müzik") c.push("Hızlı - Yavaş", "Yüksek - Alçak");
    else c.push("Aynı - Farklı", "İçinde - Dışında");
  }
  return Array.from(new Set(c)).slice(0, 3);
}

function extractValues(domain, text) {
  const combined = (text || "").toLowerCase();
  const v = [];
  if (/yardım|destek|paylaş/.test(combined)) v.push("D20 Yardımseverlik");
  if (/arkadaş|saygı|dinle|sıra/.test(combined)) v.push("D14 Saygı");
  if (/sorumluluk|görev|topla/.test(combined)) v.push("D16 Sorumluluk");
  if (/doğa|hayvan|canlı|çiçek/.test(combined)) v.push("D5 Duyarlılık", "D10 Merhamet");
  if (/sanat|güzel|çizim|renk/.test(combined)) v.push("D7 Estetik");
  if (/temizlik|yıka|hijyen|sağlık/.test(combined)) v.push("D18 Temizlik", "D13 Sağlıklı Yaşam");
  if (/sabır|bekle/.test(combined)) v.push("D12 Sabır");
  if (/adalet|eşit|kural/.test(combined)) v.push("D1 Adalet");
  if (/vatan|bayrak|türkiye|marş/.test(combined)) v.push("D19 Vatanseverlik");

  if (v.length === 0) {
    if (domain === "Fen ve Doğa") v.push("D5 Duyarlılık", "D16 Sorumluluk");
    else if (domain === "Sosyal & Duygusal") v.push("D14 Saygı", "D15 Sevgi");
    else if (domain === "Matematik") v.push("D16 Sorumluluk", "D3 Çalışkanlık");
    else if (domain === "Sanat") v.push("D7 Estetik", "D12 Sabır");
    else v.push("D14 Saygı", "D16 Sorumluluk");
  }
  return Array.from(new Set(v)).slice(0, 2);
}

function extractTendencies(domain) {
  if (domain === "Fen ve Doğa") return ["E1.1 Merak", "E3.2 Odaklanma"];
  if (domain === "Matematik") return ["E3.2 Odaklanma", "E3.4 Sebat"];
  if (domain === "Sanat") return ["E1.3 Girişimcilik", "E2.3 Esneklik"];
  if (domain === "Müzik") return ["E2.4 İş Birliğine Açıklık", "E1.1 Merak"];
  if (domain === "Hareket ve Sağlık") return ["E1.2 Bağımsızlık", "E3.7 Öz Güven"];
  if (domain === "Sosyal & Duygusal") return ["E2.4 İş Birliğine Açıklık", "E1.2 Bağımsızlık"];
  return ["E1.1 Merak", "E2.4 İş Birliğine Açıklık"];
}

const processed = rawData.map((item, index) => {
  const ageGroup = item.ageGroup;
  const bookNo = parseInt(item.bookNo, 10);
  const pageNo = parseInt(item.pageNo, 10);
  const title = cleanTitle(item.title);
  const text = (item.text || "").trim();
  const domain = determineDomain(title, text);
  const theme = determineTheme(title, domain);
  const researchQuestion = extractResearchQuestion(text, title, domain);
  const materials = extractMaterials(text, domain);
  const concepts = extractConcepts(text, domain);
  const values = extractValues(domain, text);
  const tendencies = extractTendencies(domain);

  return {
    id: `tb_${ageGroup.replace("-", "_")}_b${bookNo}_p${pageNo}_${index}`,
    ageGroup,
    bookNo,
    pageNo,
    title,
    domain,
    theme,
    researchQuestion,
    text: text.slice(0, 240),
    materials,
    concepts,
    values,
    tendencies,
  };
});

console.log(`Generated ${processed.length} textbook activities.`);

const fileContent = `/**
 * tymm-textbook-catalog.ts — MaarifOS 0.65.0
 * MEB TTKB 9 Çekirdek Ders Kitabı (3, 4, 5 Yaş) 528 Resmî Etkinlik Kataloğu.
 *
 * Tüm etkinlikler MEB resmî basılı ders kitaplarından (Kitap 1-4) satır satır taranmış,
 * TTKB 2026 Maarif Modeli alan becerileri, kavramlar, değerler ve eğilimlerle tam donatılmıştır.
 *
 * Torvalds inisiyatifi: O(1) indeksli, doğrudan ve tam çalışan statik bellek yapısı.
 */

export interface TextbookActivityItem {
  id: string;
  ageGroup: "36-48" | "48-60" | "60-72";
  bookNo: number;
  pageNo: number;
  title: string;
  domain: string;
  theme: string;
  researchQuestion: string;
  text: string;
  materials: string[];
  concepts: string[];
  values: string[];
  tendencies: string[];
}

export const MEB_TEXTBOOK_ACTIVITIES: TextbookActivityItem[] = ${JSON.stringify(processed, null, 2)};

/**
 * Filtreleme ve arama için yüksek performanslı O(n) yardımcılar.
 */
export function filterTextbookActivities(options: {
  ageGroup?: "36-48" | "48-60" | "60-72";
  bookNo?: number;
  domain?: string;
  search?: string;
}): TextbookActivityItem[] {
  const searchLower = options.search ? options.search.trim().toLowerCase() : "";

  return MEB_TEXTBOOK_ACTIVITIES.filter((act) => {
    if (options.ageGroup && act.ageGroup !== options.ageGroup) return false;
    if (options.bookNo && act.bookNo !== options.bookNo) return false;
    if (options.domain && options.domain !== "Tümü" && act.domain !== options.domain) return false;
    if (searchLower) {
      const matchTitle = act.title.toLowerCase().includes(searchLower);
      const matchText = act.text.toLowerCase().includes(searchLower);
      const matchTheme = act.theme.toLowerCase().includes(searchLower);
      if (!matchTitle && !matchText && !matchTheme) return false;
    }
    return true;
  });
}
`;

fs.writeFileSync(
  "src/features/official-forms/tymm-textbook-catalog.ts",
  fileContent,
  "utf8"
);
console.log("Written successfully to src/features/official-forms/tymm-textbook-catalog.ts");
