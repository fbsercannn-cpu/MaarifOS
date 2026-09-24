/** Verbatim EK-15 rows, TTKB 2026 source PDF pp.207–219. PDF line-wrap artifacts normalized only. */
export const EK15_SOURCE = { url: "https://tymm.meb.gov.tr/assets/pdf/okul-oncesi_20260916_085754_991.pdf", sha256: "44d900c53e359a61d44cc6b8ad2db6fad18d0de6d6b6be228763ade72b6fb3f4", ageBand: "60-72", firstPage: 207, lastPage: 219 } as const;
export interface ChecklistItem { id: string; category: "alan" | "egilim" | "sdb" | "deger" | "okuryazarlik" | "kavram"; subCategory: string; code: string; description: string; sourcePage: number }
export const EK15_ITEMS: ChecklistItem[] = [
  {
    "id": "tadb-1",
    "category": "alan",
    "subCategory": "Türkçe · Dinleme / İzleme",
    "code": "TADB.1",
    "description": "Dinleyecekleri / izleyecekleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri yönetebilme",
    "sourcePage": 207
  },
  {
    "id": "tadb-2",
    "category": "alan",
    "subCategory": "Türkçe · Dinleme / İzleme",
    "code": "TADB.2",
    "description": "Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyaller ile ilgili yeni anlamlar oluşturabilme",
    "sourcePage": 207
  },
  {
    "id": "tadb-3",
    "category": "alan",
    "subCategory": "Türkçe · Dinleme / İzleme",
    "code": "TADB.3",
    "description": "Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri çözümleyebilme",
    "sourcePage": 207
  },
  {
    "id": "tadb-4",
    "category": "alan",
    "subCategory": "Türkçe · Dinleme / İzleme",
    "code": "TADB.4",
    "description": "Dinledikleri / izledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri değerlendirebilme",
    "sourcePage": 207
  },
  {
    "id": "taob-1",
    "category": "alan",
    "subCategory": "Türkçe · Okuma",
    "code": "TAOB.1",
    "description": "Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini seçebilme",
    "sourcePage": 207
  },
  {
    "id": "taob-2",
    "category": "alan",
    "subCategory": "Türkçe · Okuma",
    "code": "TAOB.2",
    "description": "Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerinden anlamlar oluşturabilme",
    "sourcePage": 207
  },
  {
    "id": "taob-3",
    "category": "alan",
    "subCategory": "Türkçe · Okuma",
    "code": "TAOB.3",
    "description": "Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini çözümleyebilme",
    "sourcePage": 207
  },
  {
    "id": "taob-4",
    "category": "alan",
    "subCategory": "Türkçe · Okuma",
    "code": "TAOB.4",
    "description": "Resimli öykü kitabı, dijital içerikler, afiş, broşür gibi görsel okuma materyallerini değerlendirebilme",
    "sourcePage": 207
  },
  {
    "id": "takb-1",
    "category": "alan",
    "subCategory": "Türkçe · Konuşma",
    "code": "TAKB.1",
    "description": "Konuşma sürecini yönetebilme",
    "sourcePage": 207
  },
  {
    "id": "takb-2",
    "category": "alan",
    "subCategory": "Türkçe · Konuşma",
    "code": "TAKB.2",
    "description": "Konuşma sürecinin içeriğini oluşturabilme",
    "sourcePage": 207
  },
  {
    "id": "takb-3",
    "category": "alan",
    "subCategory": "Türkçe · Konuşma",
    "code": "TAKB.3",
    "description": "Konuşma sürecinde Türkçeyi doğru kullanabilme",
    "sourcePage": 207
  },
  {
    "id": "takb-4",
    "category": "alan",
    "subCategory": "Türkçe · Konuşma",
    "code": "TAKB.4",
    "description": "Konuşma sürecini değerlendirebilme",
    "sourcePage": 207
  },
  {
    "id": "taeob-1",
    "category": "alan",
    "subCategory": "Türkçe · Erken Okuryazarlık",
    "code": "TAEOB.1",
    "description": "Yazı farkındalığına ilişkin becerileri gösterebilme",
    "sourcePage": 207
  },
  {
    "id": "taeob-2",
    "category": "alan",
    "subCategory": "Türkçe · Erken Okuryazarlık",
    "code": "TAEOB.2",
    "description": "Ses bilgisel farkındalık becerileri gösterebilme",
    "sourcePage": 207
  },
  {
    "id": "taeob-3",
    "category": "alan",
    "subCategory": "Türkçe · Erken Okuryazarlık",
    "code": "TAEOB.3",
    "description": "Sözcük-harf ilişkisini açıklayabilme",
    "sourcePage": 207
  },
  {
    "id": "taeob-4",
    "category": "alan",
    "subCategory": "Türkçe · Erken Okuryazarlık",
    "code": "TAEOB.4",
    "description": "Okuma öncesi becerileri kazanabilme",
    "sourcePage": 207
  },
  {
    "id": "taeob-5",
    "category": "alan",
    "subCategory": "Türkçe · Erken Okuryazarlık",
    "code": "TAEOB.5",
    "description": "Yazma öncesi becerileri kazanabilme",
    "sourcePage": 207
  },
  {
    "id": "mab-1",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.1",
    "description": "Sayıları farklı durumlarda doğru kullanabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-2",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.2",
    "description": "Parça-bütün özelliklerini çözümleyebilme",
    "sourcePage": 208
  },
  {
    "id": "mab-3",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.3",
    "description": "Matematikle ilgili durumları yorumlayabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-4",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.4",
    "description": "Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-5",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.5",
    "description": "Matematikle ilgili problemleri çözümleyebilme",
    "sourcePage": 208
  },
  {
    "id": "mab-6",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.6",
    "description": "Matematikle ilgili problemleri yorumlayabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-7",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.7",
    "description": "Matematikle ilgili problemlere çözüm yolları geliştirebilme",
    "sourcePage": 208
  },
  {
    "id": "mab-8",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.8",
    "description": "Problem çözme deneyimlerini yansıtabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-9",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.9",
    "description": "Matematikle ilgili temsillerden yararlanabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-10",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.10",
    "description": "Matematikle ilgili temsilleri değerlendirebilme",
    "sourcePage": 208
  },
  {
    "id": "mab-11",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.11",
    "description": "Veriyle çalışabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-12",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.12",
    "description": "Bulguya ulaşabilme",
    "sourcePage": 208
  },
  {
    "id": "mab-13",
    "category": "alan",
    "subCategory": "Matematik",
    "code": "MAB.13",
    "description": "Bulguyu yorumlayabilme",
    "sourcePage": 208
  },
  {
    "id": "fab-1",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.1",
    "description": "Günlük yaşamında fenle ilgili olaylara / olgulara ve durumlara yönelik bilimsel gözlem yapabilme",
    "sourcePage": 208
  },
  {
    "id": "fab-2",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.2",
    "description": "Fene yönelik nesne / olay / olguları benzerlik ve farklılıklarına göre sınıflandırabilme",
    "sourcePage": 208
  },
  {
    "id": "fab-3",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.3",
    "description": "Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme",
    "sourcePage": 208
  },
  {
    "id": "fab-4",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.4",
    "description": "Fene yönelik olay ve / veya olgular hakkında bilimsel veriye dayalı tahminlerde bulunabilme",
    "sourcePage": 209
  },
  {
    "id": "fab-7",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.7",
    "description": "Merak ettiği konular / olay / durum hakkında deneyler yapabilme",
    "sourcePage": 209
  },
  {
    "id": "fab-8",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.8",
    "description": "Günlük hayatındaki fene yönelik olaylar hakkında gözlemlerine dayalı basit düzeyde bilimsel çıkarımlar yapabilme",
    "sourcePage": 209
  },
  {
    "id": "fab-9",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.9",
    "description": "Fene yönelik olay ve / veya olguları açıklamak için basit düzeyde bilimsel modellerden faydalanabilme",
    "sourcePage": 209
  },
  {
    "id": "fab-12",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.12",
    "description": "Bilimsel olayları / olguları açıklamak için kanıtlar kullanabilme",
    "sourcePage": 209
  },
  {
    "id": "fab-13",
    "category": "alan",
    "subCategory": "Fen",
    "code": "FAB.13",
    "description": "Fene yönelik günlük hayatla ilişkili olay, olgu ve / veya durumlara yönelik bilimsel sorgulama yapabilme",
    "sourcePage": 209
  },
  {
    "id": "sab-1",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.1",
    "description": "Günlük hayatta karşılaştığı kavram / nesne / yer / toplum / olay / kişilere ilişkin zaman içerisinde değişen ve benzerlik gösteren özellikleri karşılaştırabilme",
    "sourcePage": 209
  },
  {
    "id": "sab-2",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.2",
    "description": "Yakın çevresindeki olay / dönem / kavramları kronolojik olarak sıralayabilme",
    "sourcePage": 209
  },
  {
    "id": "sab-3",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.3",
    "description": "Olay / dönem ve kavramların zamanla geçirdikleri değişim / dönüşümleri karşılaştırarak ifade edebilme",
    "sourcePage": 209
  },
  {
    "id": "sab-4",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.4",
    "description": "Yakın çevresindeki yaşantılardan yola çıkarak ülkemizle ilgili merak ettiği konulara yönelik sorular sorabilme",
    "sourcePage": 209
  },
  {
    "id": "sab-5",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.5",
    "description": "Yakın çevresiyle / ülkemizle ilgili merak ettiği konuya yönelik kaynakları inceleyebilme",
    "sourcePage": 209
  },
  {
    "id": "sab-6",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.6",
    "description": "Yakın çevresinde yer alan mekânın coğrafi koşullarını tanımlayabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-7",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.7",
    "description": "Merak ettiği coğrafi olay / olgu ve mekân / durumlara yönelik sorular sorabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-8",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.8",
    "description": "Coğrafi gözlem ve saha çalışmasını gerçekleştirebilmek için gerekli olan hazırlığı yapabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-9",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.9",
    "description": "Coğrafi gözlem ve okul dışı planlanan çalışmaları çevreye duyarlı biçimde uygulayabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-10",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.10",
    "description": "Coğrafi gözlem ve çalışma sahasından elde edilen sonuçları sözel / görsel yolla sunabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-11",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.11",
    "description": "Yakın çevresi ile ilgili olan basit krokiyi / haritayı okuyabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-12",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.12",
    "description": "Yakın çevresinde bulunan kişi / nesne / mekânın konumunu belirlemek üzere takip edeceği krokiyi çözümleyebilme",
    "sourcePage": 210
  },
  {
    "id": "sab-13",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.13",
    "description": "Yakın çevresinde bulunan belirli bir kişi / nesne / mekânın konumunu gösteren kendi krokisini oluşturabilme",
    "sourcePage": 210
  },
  {
    "id": "sab-14",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.14",
    "description": "Toplumsal yaşama yönelik nesne, olgu ve olayları çözümleyebilme",
    "sourcePage": 210
  },
  {
    "id": "sab-15",
    "category": "alan",
    "subCategory": "Sosyal",
    "code": "SAB.15",
    "description": "Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme",
    "sourcePage": 210
  },
  {
    "id": "hsab-1",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.1",
    "description": "Farklı çevre ve fiziksel etkinliklerde temel hareket becerilerini sergileyebilme",
    "sourcePage": 210
  },
  {
    "id": "hsab-2",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.2",
    "description": "Farklı büyüklük ve özellikteki nesneleri kullanabilme",
    "sourcePage": 210
  },
  {
    "id": "hsab-3",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.3",
    "description": "Müzik ve ritim eşliğinde hareket örüntüleri sergileyebilme",
    "sourcePage": 210
  },
  {
    "id": "hsab-4",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.4",
    "description": "Beden farkındalığına dayalı doğru duruş sergileyebilme",
    "sourcePage": 210
  },
  {
    "id": "hsab-5",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.5",
    "description": "Kişisel ve genel alanın farkında olarak hareket edebilme",
    "sourcePage": 210
  },
  {
    "id": "hsab-6",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.6",
    "description": "Yeterli ve dengeli beslenebilme",
    "sourcePage": 211
  },
  {
    "id": "hsab-7",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.7",
    "description": "İç ve dış mekânda fiziksel aktivitelere katılabilme",
    "sourcePage": 211
  },
  {
    "id": "hsab-8",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.8",
    "description": "Temel kişisel hijyen ve bulunduğu ortamın düzeninin farkında olabilme",
    "sourcePage": 211
  },
  {
    "id": "hsab-9",
    "category": "alan",
    "subCategory": "Hareket ve Sağlık",
    "code": "HSAB.9",
    "description": "Kaza, afet ve tehlikeli durumlarda güvenli davranışları sergileyebilme",
    "sourcePage": 211
  },
  {
    "id": "snab-1",
    "category": "alan",
    "subCategory": "Sanat",
    "code": "SNAB.1",
    "description": "Sanat türlerini tanıyabilme",
    "sourcePage": 211
  },
  {
    "id": "snab-2",
    "category": "alan",
    "subCategory": "Sanat",
    "code": "SNAB.2",
    "description": "Sanat eserini eleştirebilme",
    "sourcePage": 211
  },
  {
    "id": "snab-3",
    "category": "alan",
    "subCategory": "Sanat",
    "code": "SNAB.3",
    "description": "Sanatın önemini fark edebilme",
    "sourcePage": 211
  },
  {
    "id": "snab-4",
    "category": "alan",
    "subCategory": "Sanat",
    "code": "SNAB.4",
    "description": "Sanat etkinliği uygulayabilme",
    "sourcePage": 211
  },
  {
    "id": "mdb-1",
    "category": "alan",
    "subCategory": "Müzik · Dinleme",
    "code": "MDB.1",
    "description": "Çeşitli müzik eserlerini dinleyebilme",
    "sourcePage": 211
  },
  {
    "id": "mdb-2",
    "category": "alan",
    "subCategory": "Müzik · Dinleme",
    "code": "MDB.2",
    "description": "Seslerin kaynağını anlayabilme",
    "sourcePage": 211
  },
  {
    "id": "mdb-3",
    "category": "alan",
    "subCategory": "Müzik · Dinleme",
    "code": "MDB.3",
    "description": "Müzik eserlerindeki temel özellikleri ifade edebilme",
    "sourcePage": 211
  },
  {
    "id": "msb-1",
    "category": "alan",
    "subCategory": "Müzik · Söyleme",
    "code": "MSB.1",
    "description": "Şarkılara kendi sesiyle eşlik edebilme",
    "sourcePage": 211
  },
  {
    "id": "msb-2",
    "category": "alan",
    "subCategory": "Müzik · Söyleme",
    "code": "MSB.2",
    "description": "Söyleme becerilerini sınıf içinde sergileyebilme",
    "sourcePage": 211
  },
  {
    "id": "mçb-1",
    "category": "alan",
    "subCategory": "Müzik · Çalma",
    "code": "MÇB.1",
    "description": "Duyduğu sesleri / müzik eserlerini çalabilme",
    "sourcePage": 211
  },
  {
    "id": "mçb-2",
    "category": "alan",
    "subCategory": "Müzik · Çalma",
    "code": "MÇB.2",
    "description": "Çalgıları çalma becerilerini sergileyebilme",
    "sourcePage": 211
  },
  {
    "id": "mhb-1",
    "category": "alan",
    "subCategory": "Müzik · Hareket",
    "code": "MHB.1",
    "description": "Harekete / dansa eşlik eden müzik eserlerinin temel özelliklerini ifade edebilme",
    "sourcePage": 211
  },
  {
    "id": "mhb-2",
    "category": "alan",
    "subCategory": "Müzik · Hareket",
    "code": "MHB.2",
    "description": "Müzik eserleriyle hareket / dans edebilme",
    "sourcePage": 211
  },
  {
    "id": "e1-1",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E1.1",
    "description": "Merak",
    "sourcePage": 212
  },
  {
    "id": "e1-2",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E1.2",
    "description": "Bağımsızlık",
    "sourcePage": 212
  },
  {
    "id": "e1-3",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E1.3",
    "description": "Azim ve Kararlılık",
    "sourcePage": 212
  },
  {
    "id": "e1-4",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E1.4",
    "description": "Kendine İnanma (Öz Yeterlilik)",
    "sourcePage": 212
  },
  {
    "id": "e1-5",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E1.5",
    "description": "Kendine Güvenme (Öz Güven)",
    "sourcePage": 212
  },
  {
    "id": "e1-6",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E1.6",
    "description": "Seçicilik",
    "sourcePage": 212
  },
  {
    "id": "e2-1",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E2.1",
    "description": "Empati",
    "sourcePage": 212
  },
  {
    "id": "e2-2",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E2.2",
    "description": "Sorumluluk",
    "sourcePage": 212
  },
  {
    "id": "e2-3",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E2.3",
    "description": "Girişkenlik",
    "sourcePage": 212
  },
  {
    "id": "e2-4",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E2.4",
    "description": "Güven",
    "sourcePage": 212
  },
  {
    "id": "e2-5",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E2.5",
    "description": "Oyunseverlik",
    "sourcePage": 212
  },
  {
    "id": "e3-1",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.1",
    "description": "Muhakeme",
    "sourcePage": 212
  },
  {
    "id": "e3-2",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.2",
    "description": "Odaklanma",
    "sourcePage": 212
  },
  {
    "id": "e3-3",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.3",
    "description": "Yaratıcılık",
    "sourcePage": 212
  },
  {
    "id": "e3-4",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.4",
    "description": "Gerçeği Arama",
    "sourcePage": 212
  },
  {
    "id": "e3-5",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.5",
    "description": "Açık Fikirlilik",
    "sourcePage": 212
  },
  {
    "id": "e3-6",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.6",
    "description": "Analitiklik",
    "sourcePage": 212
  },
  {
    "id": "e3-7",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.7",
    "description": "Sistematiklik",
    "sourcePage": 212
  },
  {
    "id": "e3-8",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.8",
    "description": "Soru Sorma",
    "sourcePage": 212
  },
  {
    "id": "e3-9",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.9",
    "description": "Şüphe Duyma",
    "sourcePage": 212
  },
  {
    "id": "e3-10",
    "category": "egilim",
    "subCategory": "Eğilimler",
    "code": "E3.10",
    "description": "Eleştirel Bakma",
    "sourcePage": 212
  },
  {
    "id": "sdb1-1",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB1.1",
    "description": "Kendini Tanıma (Öz Farkındalık)",
    "sourcePage": 212
  },
  {
    "id": "sdb1-2",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB1.2",
    "description": "Kendini Düzenleme (Öz Düzenleme)",
    "sourcePage": 212
  },
  {
    "id": "sdb2-1",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB2.1",
    "description": "İletişim",
    "sourcePage": 212
  },
  {
    "id": "sdb2-2",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB2.2",
    "description": "İş Birliği",
    "sourcePage": 212
  },
  {
    "id": "sdb2-3",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB2.3",
    "description": "Sosyal Farkındalık",
    "sourcePage": 212
  },
  {
    "id": "sdb3-1",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB3.1",
    "description": "Uyum",
    "sourcePage": 212
  },
  {
    "id": "sdb3-3",
    "category": "sdb",
    "subCategory": "Sosyal-Duygusal Öğrenme",
    "code": "SDB3.3",
    "description": "Sorumlu Karar Verme",
    "sourcePage": 212
  },
  {
    "id": "d1-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D1.1",
    "description": "Hak ve özgürlüklerini bilmek ve korumak",
    "sourcePage": 213
  },
  {
    "id": "d1-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D1.2",
    "description": "Hakkaniyetli davranmak",
    "sourcePage": 213
  },
  {
    "id": "d2-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D2.1",
    "description": "Aile içi dayanışma göstermek",
    "sourcePage": 213
  },
  {
    "id": "d2-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D2.2",
    "description": "Aile içi iletişimi güçlendirmek",
    "sourcePage": 213
  },
  {
    "id": "d2-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D2.3",
    "description": "Aile içi sorumlulukları yerine getirmek",
    "sourcePage": 213
  },
  {
    "id": "d3-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D3.1",
    "description": "Azimli olmak",
    "sourcePage": 213
  },
  {
    "id": "d3-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D3.2",
    "description": "Planlı olmak",
    "sourcePage": 213
  },
  {
    "id": "d3-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D3.3",
    "description": "Araştırmacı ve sorgulayıcı olmak",
    "sourcePage": 213
  },
  {
    "id": "d3-4",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D3.4",
    "description": "Çalışmalarda aktif rol almak",
    "sourcePage": 213
  },
  {
    "id": "d4-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D4.1",
    "description": "Arkadaşlarına destek olmak",
    "sourcePage": 213
  },
  {
    "id": "d4-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D4.2",
    "description": "Arkadaşları ile etkili iletişim kurmak",
    "sourcePage": 213
  },
  {
    "id": "d4-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D4.3",
    "description": "Güvene dayalı ilişkiler kurmak",
    "sourcePage": 213
  },
  {
    "id": "d4-4",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D4.4",
    "description": "Arkadaşlarını ve onlarla vakit geçirmeyi önemsemek",
    "sourcePage": 213
  },
  {
    "id": "d5-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D5.1",
    "description": "İnsana ve topluma değer vermek",
    "sourcePage": 213
  },
  {
    "id": "d5-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D5.2",
    "description": "Çevreye ve canlılara değer vermek",
    "sourcePage": 213
  },
  {
    "id": "d5-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D5.3",
    "description": "Afet bilincine sahip olmak",
    "sourcePage": 213
  },
  {
    "id": "d6-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D6.1",
    "description": "Samimi olmak",
    "sourcePage": 213
  },
  {
    "id": "d6-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D6.2",
    "description": "Doğru ve güvenilir olmak",
    "sourcePage": 213
  },
  {
    "id": "d7-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D7.1",
    "description": "Duyusal derinliği anlamak",
    "sourcePage": 213
  },
  {
    "id": "d7-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D7.2",
    "description": "Sanatsal ve görsel zevkleri hayatın bir parçası hâline getirmek",
    "sourcePage": 213
  },
  {
    "id": "d8-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D8.1",
    "description": "Kişisel özgürlük alanını korumak",
    "sourcePage": 214
  },
  {
    "id": "d8-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D8.2",
    "description": "Sosyal ilişkilerde kişisel alanları korumak",
    "sourcePage": 214
  },
  {
    "id": "d9-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D9.1",
    "description": "Vicdanlı olmak",
    "sourcePage": 214
  },
  {
    "id": "d9-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D9.2",
    "description": "Şefkatli olmak",
    "sourcePage": 214
  },
  {
    "id": "d9-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D9.3",
    "description": "İnsanı ve Doğayı Sevmek",
    "sourcePage": 214
  },
  {
    "id": "d10-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D10.1",
    "description": "İnsan ilişkilerinde yapıcı olmak",
    "sourcePage": 214
  },
  {
    "id": "d11-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D11.1",
    "description": "Kararlı olmak",
    "sourcePage": 214
  },
  {
    "id": "d11-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D11.2",
    "description": "Kişisel ve toplumsal haklara saygı göstermek",
    "sourcePage": 214
  },
  {
    "id": "d12-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D12.1",
    "description": "Düşünce, duygu ve davranışlarında kontrollü olmak",
    "sourcePage": 214
  },
  {
    "id": "d12-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D12.2",
    "description": "İstikrarlı olmak",
    "sourcePage": 214
  },
  {
    "id": "d13-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D13.1",
    "description": "Yeterli, dengeli ve sağlıklı beslenmek",
    "sourcePage": 214
  },
  {
    "id": "d13-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D13.2",
    "description": "Sosyal ve sportif etkinliklere katılmak",
    "sourcePage": 214
  },
  {
    "id": "d13-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D13.3",
    "description": "İnsan sağlığını önemsemek",
    "sourcePage": 214
  },
  {
    "id": "d14-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D14.1",
    "description": "Nezaketli olmak",
    "sourcePage": 214
  },
  {
    "id": "d14-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D14.2",
    "description": "Kendisine saygı duymak",
    "sourcePage": 214
  },
  {
    "id": "d14-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D14.3",
    "description": "Çevresine, millî ve manevi değerlerine saygı duymak",
    "sourcePage": 214
  },
  {
    "id": "d15-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D15.1",
    "description": "Anlayışlı ve barışçıl olmak",
    "sourcePage": 214
  },
  {
    "id": "d15-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D15.2",
    "description": "Özverili olmak",
    "sourcePage": 214
  },
  {
    "id": "d15-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D15.3",
    "description": "Misafirperverlik",
    "sourcePage": 214
  },
  {
    "id": "d16-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D16.1",
    "description": "Kendine karşı görevlerini yerine getirmek",
    "sourcePage": 215
  },
  {
    "id": "d16-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D16.2",
    "description": "Topluma karşı görevlerini yerine getirmek",
    "sourcePage": 215
  },
  {
    "id": "d16-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D16.3",
    "description": "Görev bilincine sahip olmak",
    "sourcePage": 215
  },
  {
    "id": "d17-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D17.1",
    "description": "Bilinçli tüketici olmak",
    "sourcePage": 215
  },
  {
    "id": "d17-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D17.2",
    "description": "İsraftan kaçınmak",
    "sourcePage": 215
  },
  {
    "id": "d17-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D17.3",
    "description": "Sahip olduklarının değerini bilmek",
    "sourcePage": 215
  },
  {
    "id": "d18-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D18.1",
    "description": "Kişisel temizlik ve bakımına önem vermek",
    "sourcePage": 215
  },
  {
    "id": "d18-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D18.2",
    "description": "Yaşadığı ortamın temizliğine dikkat etmek",
    "sourcePage": 215
  },
  {
    "id": "d18-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D18.3",
    "description": "Çevresel temizliğe ve sürdürülebilirliğe önem vermek",
    "sourcePage": 215
  },
  {
    "id": "d19-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D19.1",
    "description": "Millî bilinç sahibi olmak",
    "sourcePage": 215
  },
  {
    "id": "d19-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D19.2",
    "description": "Millî kimliğini tanımak",
    "sourcePage": 215
  },
  {
    "id": "d19-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D19.3",
    "description": "Ülke varlıklarına sahip çıkmak",
    "sourcePage": 215
  },
  {
    "id": "d19-4",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D19.4",
    "description": "Bağımsızlığı korumak",
    "sourcePage": 215
  },
  {
    "id": "d20-1",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D20.1",
    "description": "Cömert olmak",
    "sourcePage": 215
  },
  {
    "id": "d20-2",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D20.2",
    "description": "Dayanışma ve fedakârlık göstermek",
    "sourcePage": 215
  },
  {
    "id": "d20-3",
    "category": "deger",
    "subCategory": "Değer-Eylem",
    "code": "D20.3",
    "description": "İyiliksever olmak",
    "sourcePage": 215
  },
  {
    "id": "ob1",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB1",
    "description": "Bilgi Okuryazarlığı",
    "sourcePage": 216
  },
  {
    "id": "ob2",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB2",
    "description": "Dijital Okuryazarlık",
    "sourcePage": 216
  },
  {
    "id": "ob3",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB3",
    "description": "Finansal Okuryazarlık",
    "sourcePage": 216
  },
  {
    "id": "ob4",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB4",
    "description": "Görsel Okuryazarlık",
    "sourcePage": 216
  },
  {
    "id": "ob5",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB5",
    "description": "Kültür Okuryazarlığı",
    "sourcePage": 216
  },
  {
    "id": "ob6",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB6",
    "description": "Vatandaşlık Okuryazarlığı",
    "sourcePage": 216
  },
  {
    "id": "ob7",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB7",
    "description": "Veri Okuryazarlığı",
    "sourcePage": 216
  },
  {
    "id": "ob8",
    "category": "okuryazarlik",
    "subCategory": "Okuryazarlık",
    "code": "OB8",
    "description": "Sürdürülebilirlik Okuryazarlığı",
    "sourcePage": 216
  },
  {
    "id": "concept-162",
    "category": "kavram",
    "subCategory": "RENK",
    "code": "Kavram",
    "description": "Öğretmen ele aldığı renk ve renk tonlarını aylara göre kaydeder.",
    "sourcePage": 216
  },
  {
    "id": "concept-163",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Daire",
    "sourcePage": 216
  },
  {
    "id": "concept-164",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Üçgen",
    "sourcePage": 216
  },
  {
    "id": "concept-165",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Kare",
    "sourcePage": 216
  },
  {
    "id": "concept-166",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Dikdörtgen",
    "sourcePage": 216
  },
  {
    "id": "concept-167",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Çember",
    "sourcePage": 216
  },
  {
    "id": "concept-168",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Kenar",
    "sourcePage": 216
  },
  {
    "id": "concept-169",
    "category": "kavram",
    "subCategory": "GEOMETRİK ŞEKİL",
    "code": "Kavram",
    "description": "Köşe",
    "sourcePage": 216
  },
  {
    "id": "concept-170",
    "category": "kavram",
    "subCategory": "BOYUT",
    "code": "Kavram",
    "description": "Büyük-Orta-Küçük",
    "sourcePage": 217
  },
  {
    "id": "concept-171",
    "category": "kavram",
    "subCategory": "BOYUT",
    "code": "Kavram",
    "description": "İnce- Kalın",
    "sourcePage": 217
  },
  {
    "id": "concept-172",
    "category": "kavram",
    "subCategory": "BOYUT",
    "code": "Kavram",
    "description": "Uzun-Kısa",
    "sourcePage": 217
  },
  {
    "id": "concept-173",
    "category": "kavram",
    "subCategory": "BOYUT",
    "code": "Kavram",
    "description": "Geniş-Dar",
    "sourcePage": 217
  },
  {
    "id": "concept-174",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Az-Çok",
    "sourcePage": 217
  },
  {
    "id": "concept-175",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Ağır-Hafif",
    "sourcePage": 217
  },
  {
    "id": "concept-176",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Boş-Dolu",
    "sourcePage": 217
  },
  {
    "id": "concept-177",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Tek-Çift",
    "sourcePage": 217
  },
  {
    "id": "concept-178",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Yarım-Tam",
    "sourcePage": 217
  },
  {
    "id": "concept-179",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Eşit",
    "sourcePage": 217
  },
  {
    "id": "concept-180",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Parça-Bütün",
    "sourcePage": 217
  },
  {
    "id": "concept-181",
    "category": "kavram",
    "subCategory": "MİKTAR",
    "code": "Kavram",
    "description": "Hepsi-Hiçbiri",
    "sourcePage": 217
  },
  {
    "id": "concept-182",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Tatlı",
    "sourcePage": 217
  },
  {
    "id": "concept-183",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Tuzlu",
    "sourcePage": 217
  },
  {
    "id": "concept-184",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Acı",
    "sourcePage": 217
  },
  {
    "id": "concept-185",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Ekşi",
    "sourcePage": 217
  },
  {
    "id": "concept-186",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Sıcak-Soğuk-Ilık",
    "sourcePage": 217
  },
  {
    "id": "concept-187",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Sert-Yumuşak",
    "sourcePage": 217
  },
  {
    "id": "concept-188",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Kaygan-Pütürlü",
    "sourcePage": 217
  },
  {
    "id": "concept-189",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Tüylü-Tüysüz",
    "sourcePage": 217
  },
  {
    "id": "concept-190",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Islak-Kuru",
    "sourcePage": 217
  },
  {
    "id": "concept-191",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Sivri-Küt",
    "sourcePage": 217
  },
  {
    "id": "concept-192",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Parlak-Mat",
    "sourcePage": 217
  },
  {
    "id": "concept-193",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Taze-Bayat",
    "sourcePage": 217
  },
  {
    "id": "concept-194",
    "category": "kavram",
    "subCategory": "DUYU",
    "code": "Kavram",
    "description": "Sesli-Sessiz",
    "sourcePage": 217
  },
  {
    "id": "concept-195",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Mutluluk",
    "sourcePage": 218
  },
  {
    "id": "concept-196",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Üzüntü",
    "sourcePage": 218
  },
  {
    "id": "concept-197",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Öfke",
    "sourcePage": 218
  },
  {
    "id": "concept-198",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Korku",
    "sourcePage": 218
  },
  {
    "id": "concept-199",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Şaşkınlık",
    "sourcePage": 218
  },
  {
    "id": "concept-200",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Endişe",
    "sourcePage": 218
  },
  {
    "id": "concept-201",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "İğrenme",
    "sourcePage": 218
  },
  {
    "id": "concept-202",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Pişmanlık",
    "sourcePage": 218
  },
  {
    "id": "concept-203",
    "category": "kavram",
    "subCategory": "DUYGU",
    "code": "Kavram",
    "description": "Utanma",
    "sourcePage": 218
  },
  {
    "id": "concept-204",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Ön-Arka",
    "sourcePage": 218
  },
  {
    "id": "concept-205",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Yukarı-Aşağı",
    "sourcePage": 218
  },
  {
    "id": "concept-206",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "İleri-Geri",
    "sourcePage": 218
  },
  {
    "id": "concept-207",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Sağ-Sol",
    "sourcePage": 218
  },
  {
    "id": "concept-208",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Önünde-Arkasında",
    "sourcePage": 218
  },
  {
    "id": "concept-209",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Altında-Ortasında-Üstünde",
    "sourcePage": 218
  },
  {
    "id": "concept-210",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Arasında",
    "sourcePage": 218
  },
  {
    "id": "concept-211",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Yanında",
    "sourcePage": 218
  },
  {
    "id": "concept-212",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Yukarıda-Aşağıda",
    "sourcePage": 218
  },
  {
    "id": "concept-213",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "İç-Dış",
    "sourcePage": 218
  },
  {
    "id": "concept-214",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "İçinde-Dışında",
    "sourcePage": 218
  },
  {
    "id": "concept-215",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "İçeri-Dışarı",
    "sourcePage": 218
  },
  {
    "id": "concept-216",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Uzak-Yakın",
    "sourcePage": 218
  },
  {
    "id": "concept-217",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Alçak-Yüksek",
    "sourcePage": 218
  },
  {
    "id": "concept-218",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Sağında-Solunda",
    "sourcePage": 218
  },
  {
    "id": "concept-219",
    "category": "kavram",
    "subCategory": "YÖN / MEKÂNDA KONUM",
    "code": "Kavram",
    "description": "Çevresinde-Etrafında",
    "sourcePage": 218
  },
  {
    "id": "concept-220",
    "category": "kavram",
    "subCategory": "SAYI / SAYMA",
    "code": "Kavram",
    "description": "1-20 Arası Sayılar",
    "sourcePage": 219
  },
  {
    "id": "concept-221",
    "category": "kavram",
    "subCategory": "SAYI / SAYMA",
    "code": "Kavram",
    "description": "Sıfır",
    "sourcePage": 219
  },
  {
    "id": "concept-222",
    "category": "kavram",
    "subCategory": "SAYI / SAYMA",
    "code": "Kavram",
    "description": "İlk-Orta-Son",
    "sourcePage": 219
  },
  {
    "id": "concept-223",
    "category": "kavram",
    "subCategory": "SAYI / SAYMA",
    "code": "Kavram",
    "description": "Önceki-Sonraki",
    "sourcePage": 219
  },
  {
    "id": "concept-224",
    "category": "kavram",
    "subCategory": "SAYI / SAYMA",
    "code": "Kavram",
    "description": "Sıra Sayısı [Birinci, İkinci…]",
    "sourcePage": 219
  },
  {
    "id": "concept-225",
    "category": "kavram",
    "subCategory": "ZAMAN",
    "code": "Kavram",
    "description": "Gece-Gündüz",
    "sourcePage": 219
  },
  {
    "id": "concept-226",
    "category": "kavram",
    "subCategory": "ZAMAN",
    "code": "Kavram",
    "description": "Sabah- Öğle-Akşam",
    "sourcePage": 219
  },
  {
    "id": "concept-227",
    "category": "kavram",
    "subCategory": "ZAMAN",
    "code": "Kavram",
    "description": "Dün- Bugün- Yarın",
    "sourcePage": 219
  },
  {
    "id": "concept-228",
    "category": "kavram",
    "subCategory": "ZAMAN",
    "code": "Kavram",
    "description": "Önce-Şimdi-Sonra",
    "sourcePage": 219
  },
  {
    "id": "concept-229",
    "category": "kavram",
    "subCategory": "ZAMAN",
    "code": "Kavram",
    "description": "Erken-Geç",
    "sourcePage": 219
  },
  {
    "id": "concept-230",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Aynı-Farklı",
    "sourcePage": 219
  },
  {
    "id": "concept-231",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Açık-Kapalı",
    "sourcePage": 219
  },
  {
    "id": "concept-232",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Hızlı-Yavaş",
    "sourcePage": 219
  },
  {
    "id": "concept-233",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Canlı-Cansız",
    "sourcePage": 219
  },
  {
    "id": "concept-234",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Hareketli-Hareketsiz",
    "sourcePage": 219
  },
  {
    "id": "concept-235",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Kolay-Zor",
    "sourcePage": 219
  },
  {
    "id": "concept-236",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Karanlık-Aydınlık",
    "sourcePage": 219
  },
  {
    "id": "concept-237",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Ters-Düz",
    "sourcePage": 219
  },
  {
    "id": "concept-238",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Kalabalık-Tenha",
    "sourcePage": 219
  },
  {
    "id": "concept-239",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Düzenli-Dağınık",
    "sourcePage": 219
  },
  {
    "id": "concept-240",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Eski-Yeni",
    "sourcePage": 219
  },
  {
    "id": "concept-241",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Başlangıç-Bitiş",
    "sourcePage": 219
  },
  {
    "id": "concept-242",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Kirli-Temiz",
    "sourcePage": 219
  },
  {
    "id": "concept-243",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Aç-Tok",
    "sourcePage": 219
  },
  {
    "id": "concept-244",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Düz-Eğri",
    "sourcePage": 219
  },
  {
    "id": "concept-245",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Doğru-Yanlış",
    "sourcePage": 219
  },
  {
    "id": "concept-246",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Yaşlı-Genç",
    "sourcePage": 219
  },
  {
    "id": "concept-247",
    "category": "kavram",
    "subCategory": "ZIT",
    "code": "Kavram",
    "description": "Açık-Koyu",
    "sourcePage": 219
  }
];
