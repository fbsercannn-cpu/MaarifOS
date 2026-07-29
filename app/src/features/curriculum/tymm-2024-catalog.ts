export const TYMM_2024_AGE_BANDS = [
  "36-48",
  "48-60",
  "60-72",
] as const;

export type Tymm2024AgeBand = (typeof TYMM_2024_AGE_BANDS)[number];

export const TYMM_2024_DOMAINS = [
  "Türkçe",
  "Matematik",
  "Fen",
  "Sosyal",
  "Hareket ve Sağlık",
  "Sanat",
  "Müzik",
] as const;

export type Tymm2024Domain = (typeof TYMM_2024_DOMAINS)[number];

export interface Tymm2024LearningOutcome {
  ageBand: Tymm2024AgeBand;
  domain: Tymm2024Domain;
  code: string;
  title: string;
  sourcePage: number;
}

export interface Tymm2024CatalogMetadata {
  catalogId: string;
  catalogVersion: string;
  sourceVersion: string;
  sourceDocumentTitle: string;
  sourceFileName: string;
  sourceUrl: string;
  sourceSha256: `sha256:${string}`;
  catalogContentSha256: `sha256:${string}`;
  sourcePageCount: number;
  sourceCheckedOn: string;
  matrixPageRange: readonly [number, number];
  completeScope: string;
  excludedFromCompleteScope: readonly string[];
}

export const TYMM_2024_CATALOG_METADATA: Tymm2024CatalogMetadata = {
  catalogId: "meb-tymm-okul-oncesi-2024-learning-outcomes",
  catalogVersion: "1.0.0",
  sourceVersion: "2024.09.02",
  sourceDocumentTitle:
    "Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı",
  sourceFileName: "2024programokuloncesiOnayli.pdf",
  sourceUrl:
    "https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf",
  sourceSha256:
    "sha256:77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09",
  catalogContentSha256:
    "sha256:a67ab72bcbbe9b5bde8e9463c1c4b48b79fcdb582c6cd5a3df270fbd7aa74cec",
  sourcePageCount: 353,
  sourceCheckedOn: "2026-07-29",
  matrixPageRange: [245, 299],
  completeScope:
    "PDF'nin 245-299. sayfalarındaki yedi okul öncesi alan matrisinde, 36-48, 48-60 ve 60-72 ay yaş bantları için yayımlanan öğrenme çıktısı satırlarının tamamı.",
  excludedFromCompleteScope: [
    "alan becerileri",
    "bütünleşik beceriler",
    "süreç bileşenleri",
    "alt öğrenme çıktıları",
    "programlar arası bileşenler",
  ],
};

type OutcomeTuple = readonly [code: string, title: string];

function matrix(
  ageBand: Tymm2024AgeBand,
  domain: Tymm2024Domain,
  sourcePage: number,
  outcomes: readonly OutcomeTuple[],
): Tymm2024LearningOutcome[] {
  return outcomes.map(([code, title]) => ({
    ageBand,
    domain,
    code,
    title,
    sourcePage,
  }));
}

export const TYMM_2024_LEARNING_OUTCOMES: readonly Tymm2024LearningOutcome[] = [
  ...matrix("36-48", "Türkçe", 245, [
    [
      "TADB.1",
      "Dinleyecekleri/izleyecekleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri yönetebilme",
    ],
    [
      "TADB.2",
      "Dinledikleri/izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri ile ilgili yeni anlamlar oluşturabilme",
    ],
    [
      "TAOB.1",
      "Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri seçebilme",
    ],
    ["TAOB.2", "Görsel materyallerden anlamlar üretebilme"],
  ]),
  ...matrix("36-48", "Türkçe", 246, [
    ["TAKB.1", "Konuşma sürecini yönetebilme"],
    ["TAKB.2", "Konuşma sürecinin içeriğini oluşturabilme"],
    [
      "TAEOB.1",
      "Yazı farkındalığına ilişkin becerileri gösterebilme",
    ],
    ["TAEOB.6", "Yazma öncesi becerileri kazanabilme"],
  ]),
  ...matrix("48-60", "Türkçe", 247, [
    [
      "TADB.1",
      "Dinleyecekleri/izleyecekleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri yönetebilme",
    ],
    [
      "TADB.2",
      "Dinledikleri/izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri ile ilgili yeni anlamlar oluşturabilme",
    ],
    [
      "TADB.3",
      "Dinledikleri/izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri çözümleyebilme",
    ],
    [
      "TAOB.1",
      "Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri seçebilme",
    ],
    ["TAOB.2", "Görsel materyallerden anlamlar üretebilme"],
    [
      "TAOB.3",
      "Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri çözümleyebilme",
    ],
  ]),
  ...matrix("48-60", "Türkçe", 248, [
    ["TAKB.1", "Konuşma sürecini yönetebilme"],
    ["TAKB.2", "Konuşma sürecinin içeriğini oluşturabilme"],
    [
      "TAEOB.1",
      "Yazı farkındalığına ilişkin becerileri gösterebilme",
    ],
    ["TAEOB.5", "Okuma öncesi becerileri kazanabilme"],
    ["TAEOB.6", "Yazma öncesi becerileri kazanabilme"],
  ]),
  ...matrix("60-72", "Türkçe", 249, [
    [
      "TADB.1",
      "Dinleyecekleri/izleyecekleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri yönetebilme",
    ],
    [
      "TADB.2",
      "Dinledikleri/izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri ile ilgili yeni anlamlar oluşturabilme",
    ],
  ]),
  ...matrix("60-72", "Türkçe", 250, [
    [
      "TADB.3",
      "Dinledikleri/izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri çözümleyebilme",
    ],
    [
      "TADB.4",
      "Dinledikleri/izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyaller ve dinleme/izleme ortamına ilişkin görüşlerini yansıtabilme",
    ],
  ]),
  ...matrix("60-72", "Türkçe", 251, [
    [
      "TAOB.1",
      "Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri seçebilme",
    ],
    ["TAOB.2", "Görsel materyallerden anlamlar üretebilme"],
  ]),
  ...matrix("60-72", "Türkçe", 252, [
    [
      "TAOB.3",
      "Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri çözümleyebilme",
    ],
    [
      "TAOB.4",
      "Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyaller ile ilgili görüşlerini yansıtabilme",
    ],
  ]),
  ...matrix("60-72", "Türkçe", 253, [
    ["TAKB.1", "Konuşma sürecini yönetebilme"],
    ["TAKB.2", "Konuşma sürecinin içeriğini oluşturabilme"],
  ]),
  ...matrix("60-72", "Türkçe", 254, [
    ["TAKB.3", "Konuşma sürecindeki kuralları uygulayabilme"],
    ["TAKB.4", "Konuşma sürecine ilişkin görüşlerini yansıtabilme"],
  ]),
  ...matrix("60-72", "Türkçe", 255, [
    [
      "TAEOB.1",
      "Yazı farkındalığına ilişkin becerileri gösterebilme",
    ],
    ["TAEOB.2", "Cümlelerin sözcüklerden oluştuğunu söyleyebilme"],
    ["TAEOB.3", "Ses bilgisel farkındalık becerileri gösterebilme"],
    ["TAEOB.4", "Sözcüklerin harflerden oluştuğunu fark edebilme"],
    ["TAEOB.5", "Okuma öncesi becerileri kazanabilme"],
    ["TAEOB.6", "Yazma öncesi becerileri kazanabilme"],
  ]),

  ...matrix("36-48", "Matematik", 256, [
    ["MAB.1", "Ritmik ve algısal sayabilme"],
    [
      "MAB.2",
      "Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme",
    ],
    [
      "MAB.3",
      "Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme",
    ],
    [
      "MAB.4",
      "Matematiksel problemler ve çözümlerine ilişkin açıklamalar ve stratejilerden yararlanabilme",
    ],
  ]),
  ...matrix("36-48", "Matematik", 257, [
    ["MAB.5", "Farklı matematiksel temsillerden yararlanabilme"],
    ["MAB.6", "Farklı matematiksel temsilleri değerlendirebilme"],
  ]),
  ...matrix("48-60", "Matematik", 258, [
    ["MAB.1", "Ritmik ve algısal sayabilme"],
    [
      "MAB.2",
      "Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme",
    ],
    [
      "MAB.3",
      "Matematiksel olgu, olay ve nesneleri yorumlayabilme",
    ],
    [
      "MAB.4",
      "Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme",
    ],
  ]),
  ...matrix("48-60", "Matematik", 259, [
    ["MAB.5", "Matematiksel problemleri çözümleyebilme"],
    ["MAB.6", "Matematiksel problemleri yorumlayabilme"],
    [
      "MAB.7",
      "Matematiksel problemler ve çözümlerine ilişkin açıklamalar ve stratejiler geliştirebilme",
    ],
    [
      "MAB.8",
      "Matematiksel problemlerin çözümüne ilişkin deneyimlerini, çıkarımlarını ve değerlendirmelerini yansıtabilme",
    ],
  ]),
  ...matrix("48-60", "Matematik", 260, [
    ["MAB.9", "Farklı matematiksel temsillerden yararlanabilme"],
    ["MAB.10", "Farklı matematiksel temsilleri değerlendirebilme"],
  ]),
  ...matrix("48-60", "Matematik", 261, [
    ["MAB.11", "Elde ettiği/eriştiği verileri düzenleyebilme"],
    ["MAB.12", "Poblemlerin çözümüne yönelik bulgulara ulaşabilme"],
    [
      "MAB.13",
      "Problemlerin çözümüne ilişkin bulguları yorumlayabilme",
    ],
  ]),
  ...matrix("60-72", "Matematik", 262, [
    ["MAB.1", "Ritmik ve algısal sayabilme"],
    [
      "MAB.2",
      "Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme",
    ],
    [
      "MAB.3",
      "Matematiksel olgu, olay ve nesneleri yorumlayabilme",
    ],
  ]),
  ...matrix("60-72", "Matematik", 263, [
    [
      "MAB.4",
      "Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme",
    ],
    ["MAB.5", "Matematiksel problemleri çözümleyebilme"],
  ]),
  ...matrix("60-72", "Matematik", 264, [
    ["MAB.6", "Matematiksel problemleri yorumlayabilme"],
    [
      "MAB.7",
      "Matematiksel problemler ve çözümlerine ilişkin açıklamalar ve stratejiler geliştirebilme",
    ],
    [
      "MAB.8",
      "Matematiksel problemlerin çözümüne ilişkin deneyimlerini, çıkarımlarını ve değerlendirmelerini yansıtabilme",
    ],
  ]),
  ...matrix("60-72", "Matematik", 265, [
    ["MAB.9", "Farklı matematiksel temsillerden yararlanabilme"],
    ["MAB.10", "Farklı matematiksel temsilleri değerlendirebilme"],
  ]),
  ...matrix("60-72", "Matematik", 266, [
    ["MAB.11", "Araştırılabilecek problemler belirleyebilme"],
    ["MAB.12", "Elde ettiği/eriştiği verileri düzenleyebilme"],
    ["MAB.13", "Poblemlerin çözümüne yönelik bulgulara ulaşabilme"],
    [
      "MAB.14",
      "Problemlerin çözümüne ilişkin bulguları yorumlayabilme",
    ],
  ]),

  ...matrix("36-48", "Fen", 267, [
    [
      "FAB.1",
      "Günlük yaşamında fenle ilgili olaylara/olgulara ve durumlara yönelik bilimsel gözlem yapabilme",
    ],
    [
      "FAB.2",
      "Fene yönelik nesne, olayları/olguları benzerlik ve farklılıklarına göre sınıflandırabilme",
    ],
    [
      "FAB.3",
      "Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme",
    ],
    [
      "FAB.4",
      "Fene yönelik olay ve/veya olgulara yönelik bilimsel veriye dayalı tahminlerde bulunabilme",
    ],
    [
      "FAB.6",
      "Merak ettiği konular/olay/durum hakkında deneyler yapabilme",
    ],
  ]),
  ...matrix("48-60", "Fen", 268, [
    [
      "FAB.1",
      "Günlük yaşamda fenle ilgili olaylara/olgulara ve durumlara yönelik bilimsel gözlem yapabilme",
    ],
    [
      "FAB.2",
      "Fene yönelik nesne, olayları/olguları benzerlik ve farklılıklarına göre sınıflandırabilme",
    ],
    [
      "FAB.3",
      "Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme",
    ],
    [
      "FAB.4",
      "Fene yönelik olay ve/veya olgulara yönelik bilimsel veriye dayalı tahminlerde bulunabilme",
    ],
    [
      "FAB.5",
      "Fene yönelik olay ve olguları operasyonel/işevuruk olarak tanımlayabilme",
    ],
    [
      "FAB.6",
      "Merak ettiği konular/olay/durum hakkında deneyler yapabilme",
    ],
  ]),
  ...matrix("60-72", "Fen", 269, [
    [
      "FAB.1",
      "Günlük yaşamında fene yönelik olaylara/olgulara ve durumlara yönelik bilimsel gözlem yapabilme",
    ],
    [
      "FAB.2",
      "Fene yönelik nesne, olayları/olguları benzerlik ve farklılıklarına göre sınıflandırabilme",
    ],
    [
      "FAB.3",
      "Günlük yaşamında fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme",
    ],
  ]),
  ...matrix("60-72", "Fen", 270, [
    [
      "FAB.4",
      "Fene yönelik olay ve/veya olgulara yönelik bilimsel veriye dayalı tahminlerde bulunabilme",
    ],
    [
      "FAB.5",
      "Fene yönelik olay ve olguları operasyonel/işevuruk olarak tanımlayabilme",
    ],
    [
      "FAB.6",
      "Merak ettiği konular/olay/durum hakkında deneyler yapabilme",
    ],
    [
      "FAB.7",
      "Günlük hayatındaki fene yönelik olaylar hakkında gözlemlerine dayalı basit düzeyde bilimsel çıkarımlar yapabilme",
    ],
  ]),
  ...matrix("60-72", "Fen", 271, [
    [
      "FAB.8",
      "Fene yönelik olay ve/veya olguları açıklamak için basit düzeyde bilimsel modellerden faydalanabilme",
    ],
    [
      "FAB.9",
      "Bilimsel olayları/olguları açıklamak için kanıtlar kullanabilme",
    ],
    [
      "FAB.10",
      "Fene yönelik günlük hayatla ilişkili olay, olgu ve/veya durumlara yönelik bilimsel sorgulama yapabilme",
    ],
  ]),

  ...matrix("36-48", "Sosyal", 272, [
    ["SAB.1", "Günlük hayatında zaman kavramını yerinde kullanabilme"],
    [
      "SAB.2",
      "Toplumsal yaşama yönelik kültürel unsurları/durumları çözümleyebilme",
    ],
  ]),
  ...matrix("48-60", "Sosyal", 273, [
    ["SAB.1", "Günlük hayatında zaman kavramını yerinde kullanabilme"],
    [
      "SAB.2",
      "Kendisine/ailesine/bir hikayeye ait görselleri oluş sırasına göre sıralayabilme",
    ],
    [
      "SAB.3",
      "Ailesi ve yakın çevresinde oluşan gruplarla sosyal temas oluşturabilme",
    ],
    [
      "SAB.4",
      "Günlük yaşamda merak ettiği coğrafi olay/olgu ve mekânlara/durumlara yönelik sorular sorabilme",
    ],
    ["SAB.5", "Nesnelerin veya kişilerin konumlarını algılayabilme"],
    [
      "SAB.6",
      "Toplumsal yaşama yönelik kültürel unsurları/durumları çözümleyebilme",
    ],
    [
      "SAB.7",
      "İhtiyaçların karşılanabilmesi için bir gelire ihtiyaç olduğunu anlayabilme",
    ],
  ]),
  ...matrix("60-72", "Sosyal", 274, [
    [
      "SAB.1",
      "Günlük hayatta olay/konu/durum/zamana ilişkin değişen ve benzerlik gösteren özellikleri karşılaştırabilme",
    ],
    [
      "SAB.2",
      "Yakın çevresindeki olay/dönem/kavramları kronolojik olarak sıralayabilme",
    ],
    [
      "SAB.3",
      "Olay/dönem ve kavramları zamanla değişen ve benzerlik gösteren özelliklerine göre değerlendirebilme",
    ],
    [
      "SAB.4",
      "Yakın çevresindeki yaşantılardan yola çıkarak merak ettiği konulara yönelik sorular sorabilme",
    ],
    ["SAB.5", "Merak ettiği konuya yönelik kaynakları inceleyebilme"],
    [
      "SAB.6",
      "Geçmişte veya günümüzde yakın çevresinde gerçekleşen bir olay/konu/durumla ilgili kaynaklardan dinlediklerini/izlediklerini kendi ifadeleriyle yorumlayabilme",
    ],
    [
      "SAB.7",
      "Günlük hayatta karşılaştığı nesne/yer/toplum/olay/konu/durumlara ilişkin zaman içerisinde değişen ve benzerlik gösteren özellikleri karşılaştırabilme",
    ],
  ]),
  ...matrix("60-72", "Sosyal", 275, [
    [
      "SAB.8",
      "Yakın çevresinde oluşan gruplarla sosyal temas oluşturabilme",
    ],
    [
      "SAB.9",
      "Yakın çevresindeki coğrafi olay, nesne, mekân ve kişilerin konumunu algılayabilme",
    ],
    [
      "SAB.10",
      "Yakın çevresinde yer alan mekânın coğrafi koşullarını tanımlayabilme",
    ],
    [
      "SAB.11",
      "Merak ettiği coğrafi olay/olgu ve mekân/durumlara yönelik sorular sorabilme",
    ],
  ]),
  ...matrix("60-72", "Sosyal", 276, [
    [
      "SAB.12",
      "Coğrafi gözlem ve saha çalışmasını gerçekleştirebilmek için gerekli olan hazırlığı yapabilme",
    ],
    [
      "SAB.13",
      "Coğrafi gözlem ve çalışma sahasında planlanan çalışmaları uygulayabilme",
    ],
    [
      "SAB.14",
      "Coğrafi gözlem ve çalışma sahasından elde edilen sonuçları sözlü/görsel yolla raporlaştırabilme",
    ],
    [
      "SAB.15",
      "Yakın çevresi ile ilgili olarak hazırlanmış olan basit krokiyi okuyabilme",
    ],
    [
      "SAB.16",
      "Yakın çevresinde bulunan bir kişi/nesne/mekânın konumunu belirlemek üzere takip edeceği krokiyi çözümleyebilme",
    ],
    [
      "SAB.17",
      "Yakın çevresinde bulunan belirli bir kişi/nesne/mekânın konumunu gösteren kendi krokisini oluşturabilme",
    ],
  ]),
  ...matrix("60-72", "Sosyal", 277, [
    [
      "SAB.18",
      "Coğrafi içerikli tablo, grafik, şekil ve diyagramı okuyabilme ve yorumlayabilme",
    ],
    [
      "SAB.19",
      "Coğrafi içerikli tablo, grafik, şekil ve diyagramı hazırlayabilme",
    ],
    [
      "SAB.20",
      "Toplumsal yaşama yönelik nesne, olgu ve olayları çözümleyebilme",
    ],
    [
      "SAB.21",
      "Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme",
    ],
    [
      "SAB.22",
      "İhtiyaçların karşılanabilmesi için bir gelire ihtiyaç olduğunu anlayabilme",
    ],
  ]),

  ...matrix("36-48", "Hareket ve Sağlık", 278, [
    [
      "HSAB.1",
      "Farklı çevre ve fiziksel etkinliklerde büyük kas becerilerini etkin bir şekilde uygulayabilme",
    ],
    [
      "HSAB.2",
      "Farklı ebat ve özellikteki nesneleri etkin bir şekilde kullanabilme",
    ],
    [
      "HSAB.3",
      "Jimnastik, dans ve hareket etkinliklerinde ritmik beceriler sergileyebilme",
    ],
    ["HSAB.4", "Beden farkındalığına dayalı hareket edebilme"],
  ]),
  ...matrix("36-48", "Hareket ve Sağlık", 279, [
    [
      "HSAB.6",
      "Günlük yaşamında yeterli sıvı tüketme davranışları gösterebilme",
    ],
    [
      "HSAB.7",
      "Aktif ve sağlıklı yaşam için gereken zindelik becerilerinin neler olduğunu söyleyebilme",
    ],
    ["HSAB.8", "Aktif ve sağlıklı yaşam için hareket edebilme"],
    [
      "HSAB.9",
      "Sağlıklı yaşam için temizliğe ve düzene dikkat edebilme",
    ],
    [
      "HSAB.10",
      "Tehlike ve kaza durumlarına karşı kendini koruyabilme",
    ],
  ]),
  ...matrix("48-60", "Hareket ve Sağlık", 280, [
    [
      "HSAB.1",
      "Farklı çevre ve fiziksel etkinliklerde büyük kas becerilerini etkin bir şekilde uygulayabilme",
    ],
    [
      "HSAB.2",
      "Farklı ebat ve özellikteki nesneleri etkin bir şekilde kullanabilme",
    ],
    [
      "HSAB.3",
      "Jimnastik, dans ve hareket etkinliklerinde ritmik beceriler sergileyebilme",
    ],
    ["HSAB.4", "Beden farkındalığına dayalı hareket edebilme"],
    [
      "HSAB.5",
      "Kişisel ve genel alanın farkında olarak hareket edebilme",
    ],
    ["HSAB.6", "Eşle/grupla hareket örüntüleri sergileyebilme"],
  ]),
  ...matrix("48-60", "Hareket ve Sağlık", 281, [
    [
      "HSAB.7",
      "Günlük yaşamında sağlıklı beslenme davranışları gösterebilme",
    ],
    [
      "HSAB.8",
      "Aktif ve sağlıklı yaşam için gereken zindelik becerilerinin neler olduğunu söyleyebilme",
    ],
    ["HSAB.9", "Aktif ve sağlıklı yaşam için hareket edebilme"],
    [
      "HSAB.10",
      "Sağlıklı yaşam için temizliğe ve düzene dikkat edebilme",
    ],
    [
      "HSAB.11",
      "Tehlike ve kaza durumlarına karşı kendini koruyabilme",
    ],
    ["HSAB.12", "Hareketli oyunlarda liderliği deneyimleme"],
  ]),
  ...matrix("60-72", "Hareket ve Sağlık", 282, [
    [
      "HSAB.1",
      "Farklı çevre ve fiziksel etkinliklerde büyük kas becerilerini etkin bir şekilde uygulayabilme",
    ],
    [
      "HSAB.2",
      "Farklı ebat ve özellikteki nesneleri etkin bir şekilde kullanabilme",
    ],
  ]),
  ...matrix("60-72", "Hareket ve Sağlık", 283, [
    [
      "HSAB.3",
      "Jimnastik, dans ve hareket etkinliklerinde ritmik beceriler sergileyebilme",
    ],
    ["HSAB.4", "Beden farkındalığına dayalı hareket edebilme"],
    [
      "HSAB.5",
      "Kişisel ve genel alanın farkında olarak hareket edebilme",
    ],
  ]),
  ...matrix("60-72", "Hareket ve Sağlık", 284, [
    [
      "HSAB.6",
      "Eşle/grupla ahenk içinde hareket örüntüleri sergileyebilme",
    ],
    [
      "HSAB.7",
      "Günlük yaşamında sağlıklı beslenme davranışları gösterebilme",
    ],
  ]),
  ...matrix("60-72", "Hareket ve Sağlık", 285, [
    [
      "HSAB.8",
      "Aktif ve sağlıklı yaşam için gereken zindelik becerilerinin neler olduğunu söyleyebilme",
    ],
    ["HSAB.9", "Aktif ve sağlıklı yaşam için hareket edebilme"],
  ]),
  ...matrix("60-72", "Hareket ve Sağlık", 286, [
    [
      "HSAB.10",
      "Sağlıklı yaşam için temizliğe ve düzene dikkat edebilme",
    ],
    [
      "HSAB.11",
      "Tehlike ve kaza durumlarına karşı kendini koruyabilme",
    ],
  ]),
  ...matrix("60-72", "Hareket ve Sağlık", 287, [
    [
      "HSAB.12",
      "Hareketli oyunların temel kurallarını açıklayabilme",
    ],
    [
      "HSAB.13",
      "Hareketli oyunlara özgü basit taktik ve strateji geliştirebilme",
    ],
    ["HSAB.14", "Hareketli oyunlarda liderliği deneyimleme"],
  ]),

  ...matrix("36-48", "Sanat", 288, [
    ["SNAB.1", "Temel sanat kavramlarını ve türlerini anlayabilme"],
    ["SNAB.2", "Sanat eseri inceleyebilme"],
  ]),
  ...matrix("36-48", "Sanat", 289, [
    ["SNAB.3", "Sanat eserlerine ve sanatçılara değer verebilme"],
    ["SNAB.4", "Sanat etkinliği uygulayabilme"],
  ]),
  ...matrix("48-60", "Sanat", 290, [
    ["SNAB.1", "Temel sanat kavramlarını ve türlerini anlayabilme"],
    ["SNAB.2", "Sanat eseri inceleyebilme"],
  ]),
  ...matrix("48-60", "Sanat", 291, [
    ["SNAB.3", "Sanat eserlerine ve sanatçılara değer verebilme"],
    ["SNAB.4", "Sanat etkinliği uygulayabilme"],
  ]),
  ...matrix("60-72", "Sanat", 292, [
    ["SNAB.1", "Temel sanat kavramlarını ve türlerini anlayabilme"],
    ["SNAB.2", "Sanat eseri inceleyebilme"],
  ]),
  ...matrix("60-72", "Sanat", 293, [
    ["SNAB.3", "Sanat eserlerine ve sanatçılara değer verebilme"],
    ["SNAB.4", "Sanat etkinliği uygulayabilme"],
  ]),

  ...matrix("36-48", "Müzik", 294, [
    [
      "MDB.1",
      "Çeşitli çocuk şarkılarını/çocuk şarkısı formlarını dinleyebilme",
    ],
    [
      "MDB.2",
      "Dinlediği çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    ["MDB.3", "Duyduğu seslerin kaynağını anlayabilme"],
    [
      "MDB.4",
      "Dinlediği sözlü/sözsüz müzik eserlerindeki/çocuk şarkılarındaki özellikleri fark edebilme",
    ],
    ["MSB.1", "Duyduğu sesleri kendi sesiyle taklit edebilme"],
    [
      "MSB.2",
      "Çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark ederek söyleyebilme",
    ],
    ["MSB.3", "Söyleme becerilerini sınıf içinde sergileyebilme"],
    [
      "MÇB.1",
      "Çalacağı çalgılara/ritimlere/ezgilere dair duygu ve düşüncelerini ifade edebilme",
    ],
    ["MÇB.2", "Çaldığı ritimlerdeki özellikleri fark edebilme"],
    ["MÇB.3", "Müziksel çalma becerilerini sergileyebilme"],
  ]),
  ...matrix("36-48", "Müzik", 295, [
    [
      "MHB.1",
      "Harekete ve dansa eşlik eden ritimlere/müzik eserlerine/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    [
      "MHB.2",
      "Harekete ve dansa eşlik eden ritimlerdeki/müzik eserlerindeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme",
    ],
    ["MHB.3", "Müzik ve ritimlerle hareket ve dans edebilme"],
  ]),
  ...matrix("48-60", "Müzik", 296, [
    [
      "MDB.1",
      "Çeşitli çocuk şarkılarını/çocuk şarkısı formlarını dinleyebilme",
    ],
    [
      "MDB.2",
      "Dinlediği çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    ["MDB.3", "Duyduğu seslerin kaynağını anlayabilme"],
    [
      "MDB.4",
      "Dinlediği sözlü/sözsüz müzik eserlerindeki/çocuk şarkılarındaki özellikleri fark edebilme",
    ],
    ["MSB.1", "Duyduğu sesleri kendi sesiyle taklit edebilme"],
    [
      "MSB.2",
      "Çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark ederek söyleyebilme",
    ],
    ["MSB.3", "Söyleme becerilerini sınıf içinde sergileyebilme"],
  ]),
  ...matrix("48-60", "Müzik", 297, [
    ["MÇB.1", "Duyduğu sesleri çalgıyla taklit edebilme"],
    [
      "MÇB.2",
      "Çalacağı çalgılara/ritimlere/ezgilere/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    [
      "MÇB.3",
      "Çaldığı ritimlerdeki/ezgilerdeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme",
    ],
    ["MÇB.4", "Müziksel çalma becerilerini sergileyebilme"],
    [
      "MHB.1",
      "Harekete ve dansa eşlik eden ritimlere/müzik eserlerine/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    [
      "MHB.2",
      "Harekete ve dansa eşlik eden ritimlerdeki/müzik eserlerindeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme",
    ],
    ["MHB.3", "Müzik ve ritimlerle hareket ve dans edebilme"],
  ]),
  ...matrix("60-72", "Müzik", 298, [
    [
      "MDB.1",
      "Çeşitli çocuk şarkılarını/çocuk şarkısı formlarını dinleyebilme",
    ],
    [
      "MDB.2",
      "Dinlediği çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    ["MDB.3", "Duyduğu seslerin kaynağını anlayabilme"],
    [
      "MDB.4",
      "Dinlediği sözlü/sözsüz müzik eserlerindeki/çocuk şarkılarındaki özellikleri fark edebilme",
    ],
    ["MSB.1", "Duyduğu sesleri kendi sesiyle taklit edebilme"],
    [
      "MSB.2",
      "Çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark ederek söyleyebilme",
    ],
    ["MSB.3", "Söyleme becerilerini sınıf içinde sergileyebilme"],
  ]),
  ...matrix("60-72", "Müzik", 299, [
    ["MÇB.1", "Duyduğu sesleri çalgıyla taklit edebilme"],
    [
      "MÇB.2",
      "Çalacağı çalgılara/ritimlere/ezgilere/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    [
      "MÇB.3",
      "Çaldığı ritimlerdeki/ezgilerdeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme",
    ],
    ["MÇB.4", "Müziksel çalma becerilerini sergileyebilme"],
    [
      "MHB.1",
      "Harekete ve dansa eşlik eden ritimlere/müzik eserlerine/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme",
    ],
    [
      "MHB.2",
      "Harekete ve dansa eşlik eden ritimlerdeki/müzik eserlerindeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme",
    ],
    ["MHB.3", "Müzik ve ritimlerle hareket ve dans edebilme"],
  ]),
];
