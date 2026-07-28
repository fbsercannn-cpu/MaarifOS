export type PreschoolActivityArea =
  | "all"
  | "mathematics"
  | "science"
  | "language-literacy"
  | "values-social"
  | "movement-health"
  | "art-music"
  | "play-drama"
  | "outdoor";

export type PreschoolActivitySuggestion = {
  id: string;
  area: Exclude<PreschoolActivityArea, "all">;
  title: string;
  teacherPrompt: string;
};

export const PRESCHOOL_ACTIVITY_AREAS: ReadonlyArray<{
  id: PreschoolActivityArea;
  label: string;
}> = [
  { id: "all", label: "Tümü" },
  { id: "mathematics", label: "Matematik" },
  { id: "science", label: "Fen" },
  { id: "language-literacy", label: "Türkçe ve okuryazarlık" },
  { id: "values-social", label: "Değerler ve sosyal yaşam" },
  { id: "movement-health", label: "Hareket ve sağlık" },
  { id: "art-music", label: "Sanat ve müzik" },
  { id: "play-drama", label: "Oyun ve drama" },
  { id: "outdoor", label: "Açık hava" },
];

/**
 * Öğretmene başlangıç fikri verir; resmî program hedefi veya değerlendirme
 * hükmü değildir. Program hedefi öğretmen tarafından ayrıca seçilir.
 */
export const PRESCHOOL_ACTIVITY_SUGGESTIONS: readonly PreschoolActivitySuggestion[] = [
  {
    id: "shape-hunters",
    area: "mathematics",
    title: "Sınıfın şekil avcıları",
    teacherPrompt: "Çocuklar sınıfta buldukları şekilleri karşılaştırır ve gruplaştırır.",
  },
  {
    id: "pattern-train",
    area: "mathematics",
    title: "Örüntü treni",
    teacherPrompt: "Renk, ses veya hareket dizilerini birlikte tamamlarlar.",
  },
  {
    id: "measure-our-room",
    area: "mathematics",
    title: "Sınıfımızı neyle ölçeriz?",
    teacherPrompt: "Standart olmayan araçlarla uzunluk tahmin edilir ve ölçülür.",
  },
  {
    id: "market-baskets",
    area: "mathematics",
    title: "Pazar sepetlerini hazırlıyoruz",
    teacherPrompt: "Nesneler sayılır, miktarlar karşılaştırılır ve istenen sayıda sepete ayrılır.",
  },
  {
    id: "treasure-directions",
    area: "mathematics",
    title: "Yönlerle hazine yolu",
    teacherPrompt: "Yakın, uzak, altında, yanında ve arkasında sözcükleriyle bir rota kurulur.",
  },
  {
    id: "favorites-graph",
    area: "mathematics",
    title: "Sınıfımızın tercih grafiği",
    teacherPrompt: "Çocukların seçimleri somut nesnelerle gruplanır, sayılır ve birlikte yorumlanır.",
  },
  {
    id: "sink-or-float",
    area: "science",
    title: "Batar mı, yüzer mi?",
    teacherPrompt: "Tahmin, deneme ve gözlem sonuçları birlikte kaydedilir.",
  },
  {
    id: "shadow-detectives",
    area: "science",
    title: "Işık ve gölge dedektifleri",
    teacherPrompt: "Gölgenin yönü ve büyüklüğü farklı zamanlarda incelenir.",
  },
  {
    id: "seed-journey",
    area: "science",
    title: "Tohumun yolculuğu",
    teacherPrompt: "Değişimler fotoğraf, çizim veya çocuk anlatımıyla izlenir.",
  },
  {
    id: "ice-rescue",
    area: "science",
    title: "Buzdaki oyuncağı kurtar",
    teacherPrompt: "Buzu eritmeye ilişkin tahminler güvenli araçlarla denenir ve sonuçlar karşılaştırılır.",
  },
  {
    id: "sound-laboratory",
    area: "science",
    title: "Ses laboratuvarı",
    teacherPrompt: "Malzeme, titreşim ve ses arasındaki ilişki dinleme ve denemelerle araştırılır.",
  },
  {
    id: "wind-builders",
    area: "science",
    title: "Rüzgâr mühendisleri",
    teacherPrompt: "Havanın farklı hafif nesneleri nasıl hareket ettirdiği tasarım kurarak incelenir.",
  },
  {
    id: "picture-story",
    area: "language-literacy",
    title: "Resimden hikâye",
    teacherPrompt: "Bir görselden yola çıkarak ortak hikâye oluşturulur.",
  },
  {
    id: "sound-hunt",
    area: "language-literacy",
    title: "Sınıfta ses avı",
    teacherPrompt: "Seçilen sesle başlayan nesne ve sözcükler aranır.",
  },
  {
    id: "story-continues",
    area: "language-literacy",
    title: "Hikâye nasıl devam eder?",
    teacherPrompt: "Çocuklar sırayla olayın devamına ilişkin tahminlerini söyler.",
  },
  {
    id: "story-bag",
    area: "language-literacy",
    title: "Hikâye torbasından ne çıktı?",
    teacherPrompt: "Torbadaki nesneler seçilerek başlangıcı, ortası ve sonu olan ortak anlatı kurulur.",
  },
  {
    id: "classroom-post-office",
    area: "language-literacy",
    title: "Sınıf postanesi",
    teacherPrompt: "Çizim, sembol ve erken yazı denemeleriyle arkadaşlara anlamlı iletiler hazırlanır.",
  },
  {
    id: "rhyme-path",
    area: "language-literacy",
    title: "Uyaklı sözcük yolu",
    teacherPrompt: "Benzer sesle biten sözcükler hareket, resim ve ritimle birlikte keşfedilir.",
  },
  {
    id: "kindness-circle",
    area: "values-social",
    title: "İyilik çemberi",
    teacherPrompt: "Gün içinde görülen yardım ve paylaşma davranışları konuşulur.",
  },
  {
    id: "responsibility-tree",
    area: "values-social",
    title: "Sorumluluk ağacı",
    teacherPrompt: "Sınıf görevleri çocukların önerileriyle görünür hâle getirilir.",
  },
  {
    id: "emotion-detectives",
    area: "values-social",
    title: "Duygu dedektifleri",
    teacherPrompt: "Yüz, ses ve beden ipuçlarından duygular üzerine konuşulur.",
  },
  {
    id: "classroom-council",
    area: "values-social",
    title: "Minik sınıf meclisi",
    teacherPrompt: "Sınıfa ilişkin gerçek bir konuda söz sırası, dinleme ve ortak karar deneyimi yaşanır.",
  },
  {
    id: "empathy-puppet",
    area: "values-social",
    title: "Kuklanın yerinde olsaydım",
    teacherPrompt: "Kısa bir olay üzerinden farklı duygular, ihtiyaçlar ve yardım yolları konuşulur.",
  },
  {
    id: "fair-sharing",
    area: "values-social",
    title: "Herkese yetecek mi?",
    teacherPrompt: "Sınırlı malzemenin adil paylaşımı için çocukların çözüm önermesi ve denemesi sağlanır.",
  },
  {
    id: "balance-trail",
    area: "movement-health",
    title: "Renkli denge parkuru",
    teacherPrompt: "Farklı hareket yolları çocuklarla birlikte denenir.",
  },
  {
    id: "heartbeat",
    area: "movement-health",
    title: "Kalbim nasıl hızlanır?",
    teacherPrompt: "Hareket öncesi ve sonrası beden sinyalleri karşılaştırılır.",
  },
  {
    id: "healthy-plate",
    area: "movement-health",
    title: "Renkli sağlıklı tabak",
    teacherPrompt: "Besinler özellikleri ve günlük seçimler üzerinden incelenir.",
  },
  {
    id: "breathing-detectives",
    area: "movement-health",
    title: "Nefes dedektifleri",
    teacherPrompt: "Farklı hareketlerden sonra nefes ve beden sinyalleri fark edilip sakinleşme yolları denenir.",
  },
  {
    id: "movement-dice",
    area: "movement-health",
    title: "Hareket zarının görevi",
    teacherPrompt: "Çocuklar hız, yön, seviye ve beden bölgesi içeren hareketleri birleştirerek uygular.",
  },
  {
    id: "clean-hands-lab",
    area: "movement-health",
    title: "Temiz eller araştırması",
    teacherPrompt: "El temizliği adımları görünür bir deney ve sıralama oyunu üzerinden ele alınır.",
  },
  {
    id: "nature-palette",
    area: "art-music",
    title: "Doğanın renk paleti",
    teacherPrompt: "Doğadan gözlenen renk ve dokular özgün çalışmaya dönüşür.",
  },
  {
    id: "rhythm-echo",
    area: "art-music",
    title: "Ritim yankısı",
    teacherPrompt: "Beden, nesne ve çalgılarla ritim dizileri oluşturulur.",
  },
  {
    id: "recycling-orchestra",
    area: "art-music",
    title: "Geri dönüşüm orkestrası",
    teacherPrompt: "Farklı malzemelerin sesleri keşfedilip ortak düzen kurulur.",
  },
  {
    id: "paint-the-sound",
    area: "art-music",
    title: "Sesi çizgiye dönüştür",
    teacherPrompt: "Dinlenen seslerin hız, güç ve duygusu renk, çizgi ve hareketle özgün biçimde anlatılır.",
  },
  {
    id: "clay-emotions",
    area: "art-music",
    title: "Kilden duygu heykelleri",
    teacherPrompt: "Çocuklar bir duyguyu biçim, doku ve beden duruşu üzerinden üç boyutlu ifade eder.",
  },
  {
    id: "quiet-loud-orchestra",
    area: "art-music",
    title: "Sessiz ve güçlü orkestra",
    teacherPrompt: "Sesin şiddeti, başlama-durma işaretleri ve birlikte üretme deneyimi oyunla kurulur.",
  },
  {
    id: "little-market",
    area: "play-drama",
    title: "Minik mahalle pazarı",
    teacherPrompt: "Roller, miktarlar, sıra bekleme ve iletişim oyun içinde kurulur.",
  },
  {
    id: "lost-puppet",
    area: "play-drama",
    title: "Kayıp kuklanın hikâyesi",
    teacherPrompt: "Sorun ve çözüm çocukların rol seçimleriyle canlandırılır.",
  },
  {
    id: "little-architects",
    area: "play-drama",
    title: "Mimarlar iş başında",
    teacherPrompt: "Bir yapının planı konuşulur, kurulur ve yeniden düzenlenir.",
  },
  {
    id: "repair-workshop",
    area: "play-drama",
    title: "Oyuncak tamir atölyesi",
    teacherPrompt: "Sorunu tanımlama, görev paylaşma ve çözümü anlatma süreçleri dramatik oyuna taşınır.",
  },
  {
    id: "space-station",
    area: "play-drama",
    title: "Uzay istasyonu görevi",
    teacherPrompt: "Çocuklar görev, araç, iletişim ve beklenmedik sorunları ortak bir oyun kurgusunda oluşturur.",
  },
  {
    id: "weather-studio",
    area: "play-drama",
    title: "Hava durumu stüdyosu",
    teacherPrompt: "Günlük hava gözlemleri sunucu, uzman ve izleyici rolleriyle canlandırılır.",
  },
  {
    id: "garden-map",
    area: "outdoor",
    title: "Bahçemizin keşif haritası",
    teacherPrompt: "Yer, yön ve dikkat çeken ayrıntılar ortak haritaya aktarılır.",
  },
  {
    id: "cloud-diary",
    area: "outdoor",
    title: "Bulut günlüğü",
    teacherPrompt: "Gökyüzündeki değişimler çizim ve çocuk sözleriyle izlenir.",
  },
  {
    id: "tiny-nature-collectors",
    area: "outdoor",
    title: "Minik doğa koleksiyoncuları",
    teacherPrompt: "Düşmüş doğal materyaller özelliklerine göre sınıflandırılır.",
  },
  {
    id: "tiny-neighbor-watch",
    area: "outdoor",
    title: "Minik canlı komşularımız",
    teacherPrompt: "Bahçedeki küçük canlılar dokunmadan gözlenir; hareketleri ve yaşam alanları konuşulur.",
  },
  {
    id: "puddle-laboratory",
    area: "outdoor",
    title: "Su birikintisi laboratuvarı",
    teacherPrompt: "Suyun akışı, derinliği ve çevrede bıraktığı izler güvenli açık hava denemeleriyle incelenir.",
  },
  {
    id: "our-tree-friend",
    area: "outdoor",
    title: "Ağaç arkadaşımızın günlüğü",
    teacherPrompt: "Seçilen bir ağacın mevsimsel değişimi gözlem, çizim ve çocuk sorularıyla uzun süre izlenir.",
  },
] as const;
