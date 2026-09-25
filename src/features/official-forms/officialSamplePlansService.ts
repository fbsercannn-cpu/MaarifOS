import { EK15_ITEMS } from "./ek15-catalog.ts";
import { programCodeCandidates } from "./planToChecklistSync.ts";
// MaarifOS örnek taslakları: öğretmen incelemesi gerektirir; birebir resmî belge değildir.
export const SAMPLE_DRAFT_LABEL = "MaarifOS örnek taslağı (öğretmen incelemesi)";

export interface SampleDailyPlan {
  id: string;
  ageGroup: "36-48 Ay" | "48-60 Ay" | "60-72 Ay";
  planTitle: string;
  pageRef: string;
  sourceNotice?: string;
  domainSkills: string;
  tendencies: string;
  socialEmotional: string;
  values: string;
  literacy: string;
  concepts: string;
  words: string;
  materials: string;
  learningEnvironments: string;
  startingDay: string;
  centersPlay: string;
  nutritionCleanup: string;
  activities: string;
  enrichment: string;
  support: string;
  dayEvaluation: string;
  familyEngagement: string;
  communityEngagement: string;
}

const RAW_DAILY_SAMPLE_PLANS: SampleDailyPlan[] = [
  {
    id: "meb-daily-60-72",
    ageGroup: "60-72 Ay",
    planTitle: "Lokomotif ve Renkli Vagonlar (1-20 Sayma, Sıra Sayısı & Hareket)",
    pageRef: "TTKB s. 137–140",
    domainSkills: `MATEMATİK: MAB.1. Sayıları farklı durumlarda doğru kullanabilme (1-20 ritmik sayma, sıra sayısı)
HAREKET VE SAĞLIK: HAB.1. Temel hareket becerilerini koordineli sergileyebilme (HAB.1.a, HAB.5.a)
TÜRKÇE: TAKB.1. Konuşma sürecini yönetebilme ve düşüncelerini açıklama
MÜZİK: MZB.1. Dinlediği müziğin ritmine uygun hareket edebilme (Ritim çubukları ile eşlik)`,
    tendencies: "E1.1. Merak, E2.5. Oyunseverlik, E3.2. Odaklanma, E3.6. Muhakeme",
    socialEmotional: "SDB1.2. Kendini Düzenleme (Öz Kontrol), SDB2.1. İletişim Becerileri",
    values: "D8.2. Mahremiyet (Kişisel alanları korumak), D12.1. Sabır, D14.1. Saygı (Nezaket), D16.1. Sorumluluk",
    literacy: "OB7. Veri Okuryazarlığı (Sıralama ve sayı eşleştirme)",
    concepts: "Sayı / Sayma: 1-20 arası sayılar, Önceki-Sonraki, Sıra sayısı (Birinci, İkinci...)",
    words: "Vagon, lokomotif, ray, tren, makas",
    materials: "Lokomotif görseli, 1'den 20'ye numaralandırılmış renkli vagon kartları, 20 zarf, 1-10 sayı kartları, ritim çubukları, 'Bir Biletim Olsaydı' şarkısı.",
    learningEnvironments: "Matematik ve Blok Merkezleri. Sınıfta lokomotif görseli panoya asılır, 20 vagon zarfı sınıfın farklı köşelerine gizlenir.",
    startingDay: "Çocuklar tren vagonu selamlama panosu ile karşılanır. Yoklama için her çocuk kendi fotoğrafının olduğu vagona çubuk yerleştirir. Takvim, hava durumu ve 'Bir Biletim Olsaydı' şarkısıyla güne başlama tamamlanır.",
    centersPlay: "Blok ve İnşa Merkezinde ray ve köprü kurguları; Sanat Merkezinde artık kutulardan vagon tasarımı; Kitap Merkezinde tren yolculuğu hikâyeleri incelenir.",
    nutritionCleanup: "Beslenme öncesi el hijyeni; dengeli atıştırmalık saati; materyallerin vagon vagon düzenle toplanması.",
    activities: `1. Matematik & Hareket (Büyük Grup Etkinliği): 'Lokomotif ve Gizemli Vagon Avı'
- Çocuklara bilmeceli ipuçları verilir ('Karada gider, ray üstünde yürür, çok tekerleği var'). Tren yanıtına ulaşıldıktan sonra müzik eşliğinde gizlenmiş 20 vagon zarfı aranır.
- Zarflar açılır; çocuklar ellerindeki vagon numaralarına göre 1'den 20'ye kadar sıraya girip lokomotifin arkasına dizilerek dev sınıf trenini oluşturur (1-20 sıra sayısı).
2. Müzik & Ritim (Küçük Grup Etkinliği): 'Raylarda Ritim Tut'
- Ritim çubuklarıyla tren hızlanma ('çuf çuf çuf') ve yavaşlama temposu çalışılır.`,
    enrichment: "20'den geriye doğru sayma kurgulanır. İki basamaklı sayıları tanıyan çocuklara vagonların çift/tek numaralandırılması görevi verilir.",
    support: "1-5 arası sayılarda zorlanan çocuklara akran rehberliği verilir; dokunsal kabartmalı sayı kartları sunulur.",
    dayEvaluation: "Tren istasyonu drama çemberi kurulur. 'Bugün en çok hangi vagonda eğlendin?' sorusuyla günün kazanımları özetlenir.",
    familyEngagement: "Ailelere evdeki çorap veya mandallarla '1'den 10'a Ev Treni' yapma önerisi bültenle gönderilir.",
    communityEngagement: "En yakın tren garı veya ulaşım müzesine sanal gezi düzenlenir.",
  },
  {
    id: "meb-daily-48-60",
    ageGroup: "48-60 Ay",
    planTitle: "Sonbahar Ağacı ve Rüzgarın Şarkısı (Doğa, Renkler & Ritim)",
    pageRef: "TTKB s. 133–136",
    domainSkills: `FEN: FAB.1. Fen olaylarına yönelik bilimsel gözlem yapabilme (Yaprak dökümü, hava soğuması)
SANAT: SNAB.4. Sanat etkinliğinde özgün ürünler oluşturabilme (Baskı ve kolaj)
TÜRKÇE: TADB.1. Dinledikleri şiir ve tekerlemelere dikkatini odaklayabilme
MÜZİK: MZB.2. Basit doğa şarkılarını grup halinde seslendirebilme`,
    tendencies: "E1.1. Merak, E3.2. Odaklanma, E2.2. Azim",
    socialEmotional: "SDB1.1. Kendini Tanıma, SDB2.1. İletişim",
    values: "D7. Estetik, D18. Temizlik ve Çevre Bilinci, D12. Sabır",
    literacy: "OB4. Görsel Okuryazarlık (Doğa kartlarını inceleme)",
    concepts: "Renk: Sarı, Kahverengi, Kırmızı | Boyut: Büyük-Küçük | Miktar: Çok-Az | Duyu: Kuru-Islak",
    words: "Sonbahar, rüzgar, meşe palamudu, dökülme",
    materials: "Bahçeden toplanmış yapraklar, büyüteçler, suluboya, rüzgar sesi kaydı, resim kâğıtları.",
    learningEnvironments: "Fen ve Doğa Merkezi, Sanat Merkezi, Okul Bahçesi.",
    startingDay: "Güne 'Rüzgar Nasıl Eser?' parmak oyunuyla başlanır. Hava durumu tablosuna rüzgarlı sonbahar simgesi eklenir.",
    centersPlay: "Fen Merkezinde yaprakların damarları büyüteçle incelenir; Sanat Merkezinde yaprak baskısı yapılır.",
    nutritionCleanup: "Mevsim meyvesi (mandalina/elma) tadımı ve kabukların kompost kutusuna ayrıştırılması.",
    activities: `1. Bütünleştirilmiş Fen-Bahçe Etkinliği: 'Sonbahar Dedektifleri'
- Okul bahçesinde renklerine ve boyutlarına göre yaprak avı yapılır.
2. Sanat & Ritim Etkinliği: 'Yaprakların Dansı'
- Toplanan yapraklarla büyük sınıf sonbahar ağacı kolajı tamamlanır.`,
    enrichment: "Yaprakları büyüklük sırasına göre 5 basamaklı serileme görevi verilir.",
    support: "Boya fırçası tutmakta zorlanan çocuğa sünger veya parmak boyası alternatifi sunulur.",
    dayEvaluation: "Çocukların yaptıkları yaprak baskıları sınıf sergisinde incelenir ve duygu durumu paylaşılır.",
    familyEngagement: "Hafta sonu aile yürüyüşünde dökülen yaprakların toplanması istenir.",
    communityEngagement: "TEMA Vakfı okul öncesi doğa eğitimi materyalleri sınıfa tanıtılır.",
  },
  {
    id: "meb-daily-36-48",
    ageGroup: "36-48 Ay",
    planTitle: "Duyularımla Keşfediyorum (Dokunma, Koklama & Neşeli Sesler)",
    pageRef: "TTKB s. 129–132",
    domainSkills: `FEN: FAB.1. Çevresindeki varlıkları duyularıyla gözlemleyebilme
TÜRKÇE: TADB.1. Sunulan seçenekler arasından dinleyeceklerini seçebilme
HAREKET: HAB.1. Temel motor hareketleri müzik eşliğinde deneyimleme`,
    tendencies: "E1.1. Merak, E2.5. Oyunseverlik",
    socialEmotional: "SDB1.1. Öz Farkındalık, SDB2.1. İletişim",
    values: "D14. Saygı, D18. Temizlik, D12. Sabır",
    literacy: "OB1. Erken Okuryazarlık (Ses ve doku farkındalığı)",
    concepts: "Zıt: Sıcak-Soğuk, Sert-Yumuşak, Islak-Kuru | Renk: Kırmızı",
    words: "Duyu, yumuşak, sert, ses",
    materials: "Duyusal doku kutusu (pamuk, taş, zımpara, sünger), koku şişeleri (limon, nane), ritim tefleri.",
    learningEnvironments: "Duyusal Keşif İstasyonu, Müzik Köşesi.",
    startingDay: "Yumuşak bir pelüş oyuncakla günaydın çemberi; isim selamlama şarkısı söylenir.",
    centersPlay: "Duygu aynasında yüz ifadeleri taklit edilir; yoğurma maddeleri ile serbest parmak oyunu oynanır.",
    nutritionCleanup: "Ilık su ve sabunla el yıkama; mendille kurulama becerisi pekiştirilir.",
    activities: `1. Fen & Oyun Etkinliği: 'Gizemli Duyu Torbası'
- Çocuklar gözlerini kapatıp torbadan çektikleri nesnenin sert mi yumuşak mı olduğunu tahmin eder.
2. Müzik & Hareket Etkinliği: 'Ses Nereden Geliyor?'
- Çıngırak sesi takip edilerek sınıfta ses yönü bulma oyunu oynanır.`,
    enrichment: "Koku ve ses eşleştirme oyunlarında ikili karşılaştırma yaptırılır.",
    support: "Birebir fiziksel temas ve şefkatli rehberlikle nesnelere dokunması cesaretlendirilir.",
    dayEvaluation: "En çok hangi nesneye dokunmaktan hoşlandıkları tek kelimeyle sorulur.",
    familyEngagement: "Evde çocuğa farklı dokulardaki giysileri dokundurarak hissettirme önerisi paylaşılır.",
    communityEngagement: "Okul bahçesindeki çim ve ağaç gövdelerine dokunma yürüyüşü yapılır.",
  }
];

export interface SampleMonthlyPlan {
  id: string;
  ageGroup: "36-48 Ay" | "48-60 Ay" | "60-72 Ay";
  monthName: string;
  pageRef: string;
  sourceNotice?: string;
  planTitle: string;
  domainSkills: string;
  tendencies: string;
  socialEmotional: string;
  values: string;
  literacy: string;
  concepts: string;
  specialDays: string;
  learningExperiences: string;
  enrichment: string;
  support: string;
  familyCommunityEngagement: string;
  childEvaluation: string;
  programEvaluation: string;
  teacherEvaluation: string;
  teacherReflections: string;
}

const RAW_MONTHLY_SAMPLE_PLANS: SampleMonthlyPlan[] = [
  {
    id: "meb-monthly-60-72",
    ageGroup: "60-72 Ay",
    monthName: "Kasım 2026",
    pageRef: "TTKB s. 124–128",
    planTitle: "Atatürk, Bilimsel Keşif ve Sayıların Dünyası (Kasım Ayı Örnek Taslağı)",
    domainSkills: `TÜRKÇE: TADB.3, TAOB.2, TAKB.1, TAEB.1
MATEMATİK: MAB.1, MAB.2, MAB.4 (1-20 Sayılar, Örüntü, Nesne Grafiği)
FEN: FAB.1, FAB.3, FAB.5 (Gözlem, Tahmin, Deney, Doğa Olayları)
SOSYAL: SAB.1, SAB.4 (Atatürk'ü Anma, Millî Değerler, Zaman Algısı)
HAREKET: HAB.1, HAB.2 (Koordinasyon, Sağlıklı Yaşam)
SANAT: SNAB.2, SNAB.4 (Sanat Eseri İnceleme, Atatürk Portresi, Kolaj)
MÜZİK: MZB.1, MZB.3 (Ritim Çalgıları, Marşlar ve Şarkılar)`,
    tendencies: "E1.1. Merak, E2.2. Azim, E2.5. Oyunseverlik, E3.2. Odaklanma",
    socialEmotional: "SDB1.2. Kendini Düzenleme, SDB2.1. İletişim, SDB2.2. İş Birliği, SDB3.1. Empati",
    values: "D1. Adalet, D4. Dostluk, D10. Merhamet, D14. Saygı, D16. Sorumluluk, D17. Vatanseverlik",
    literacy: "OB1. Erken Okuryazarlık, OB4. Görsel Okuryazarlık, OB7. Veri Okuryazarlığı, OB8. Sürdürülebilirlik Okuryazarlığı",
    concepts: "Sayı: 1-20 arası sayılar | Zaman: Dün-Bugün-Yarın, Gece-Gündüz | Şekil: Üçgen, Dikdörtgen | Zıt: Hızlı-Yavaş, Ağır-Hafif",
    specialDays: "10 Kasım Atatürk'ü Anma Günü ve Atatürk Haftası, 24 Kasım Öğretmenler Günü, Dünya Çocuk Hakları Günü",
    learningExperiences: "1. Hafta: Atatürk'ün Hayatı, Fikirleri ve Cumhuriyet Sevgisi\n2. Hafta: Matematik Şehri, 1-20 Sayı İstasyonları ve Örüntü Avı\n3. Hafta: Dünya Çocuk Hakları, Farklılıklara Saygı ve Empati Atölyeleri\n4. Hafta: Öğretmenime Mektup, Sanatsal Teşekkür Kartı ve Bilim Deneyleri.",
    enrichment: "Gelişmiş problem çözme oyunları; harita ve pusula okuma çalışmaları; çift basamaklı örüntüler.",
    support: "Bireyselleştirilmiş görsel yönergeler; somut eşleme nesneleri (sayma pulları); akran destek çemberleri.",
    familyCommunityEngagement: "Atatürk ve öğretmenlik konulu aile sohbet pusulası; velilerin sınıfa meslek tanıtımı ziyareti (EK-10).",
    childEvaluation: "Çocukların süreç boyunca Atatürk ve cumhuriyet sevgisini, sayı kavramlarını ve sosyal kuralları kavrayış düzeyleri gözlem formlarıyla izlenmiştir.",
    programEvaluation: "Kasım ayı hedeflenen kazanımları belirli gün ve haftalarla dengeli biçimde bütünleştirilmiş, süreç verimli tamamlanmıştır.",
    teacherEvaluation: "Öğrenme merkezlerinde gözlem sıklığı artırılmış, farklılaştırma stratejileri her çocuğun hızına göre uyarlanmıştır.",
    teacherReflections: "Açık hava bahçe oyunlarına hava koşulları nedeniyle ek salon etkinlikleri dahil edilmesi olumlu sonuç vermiştir.",
  }
];

const codedFields = ["domainSkills", "tendencies", "socialEmotional", "values", "literacy"] as const;
/** Keep only exact, age-supported codes. Unknown codes are never guessed or aliased. */
export function prepareTeacherSamplePlan<T extends SampleDailyPlan | SampleMonthlyPlan>(plan: T): T {
  const next = { ...plan };
  const excluded: string[] = [];
  const catalog = new Map(EK15_ITEMS.filter(item => item.category !== "kavram").map(item => [item.code, item.description]));
  for (const key of codedFields) {
    const candidates = programCodeCandidates(plan[key]);
    const valid = plan.ageGroup === "60-72 Ay" ? candidates.filter(code => catalog.has(code)) : [];
    excluded.push(...candidates.filter(code => !valid.includes(code)));
    next[key] = valid.map(code => `${code}. ${catalog.get(code)}`).join("\n");
  }
  next.pageRef = SAMPLE_DRAFT_LABEL;
  next.planTitle = plan.planTitle.replace(/Resmî Planı/g, "Örnek Taslağı");
  next.sourceNotice = `${SAMPLE_DRAFT_LABEL}. Bu metin MEB belgesinin birebir aktarımı veya gerçekleşmiş gözlem değildir. ${plan.ageGroup === "60-72 Ay" ? "Kodlar güncel EK-15 kataloğuyla tam eşleşerek doğrulandı." : "Bu yaş bandının kaynak matrisi doğrulanmadığı için kod alanları boş bırakıldı."}${excluded.length ? ` Kaynağı doğrulanmayan kodlar uygulanmadı: ${[...new Set(excluded)].join(", ")}.` : ""}`;
  // Planning examples cannot assert that children achieved an outcome or an activity was completed.
  if ("childEvaluation" in next) { next.childEvaluation = ""; next.programEvaluation = ""; next.teacherEvaluation = ""; next.teacherReflections = ""; }
  return next;
}
export const MAARIFOS_DAILY_SAMPLE_DRAFTS = RAW_DAILY_SAMPLE_PLANS.map(prepareTeacherSamplePlan);
export const MAARIFOS_MONTHLY_SAMPLE_DRAFTS = RAW_MONTHLY_SAMPLE_PLANS.map(prepareTeacherSamplePlan);
