/**
 * tymm-domain-chips.ts — MaarifOS 0.65.0 MEGA SÜRÜM
 * Türkiye Yüzyılı Maarif Modeli (TYMM) Okul Öncesi Eğitim Programı
 * 
 * Kaynaklar (Eksiksiz Resmî MEB Derlemesi):
 * 1. MEB TTKB Okul Öncesi Eğitim Programı Ana Metni (2026)
 * 2. EK-1 Alan Becerileri ve Süreç Bileşenleri Tablosu
 * 3. EK-6 Günlük Plan Şablonu ve Rutinler
 * 4. EK-7 Kavram Listesi (10 Kategori, 180+ Kavram)
 * 5. EK-8 Belirli Gün ve Haftalar (35 Gün/Hafta)
 * 6. EK-11 Sosyal-Duygusal Öğrenme Becerileri (SDB1-SDB3)
 * 7. EK-12 Erdem: Değer-Eylem Tabloları (D1-D20)
 * 8. EK-13 Eğilimler Tablosu (E1-E3, 21 Eğilim)
 * 9. EK-14 Okuryazarlık Becerileri Tablosu (OB1-OB8)
 * 10. 9 Öğrenme Merkezi (Blok, Kitap, Erken Okuryazarlık, Sanat, Fen, Matematik, Dramatik Oyun, Müzik, Açık Hava)
 * 11. MEB Çekirdek Ders Kitapları (3, 4, 5 Yaş - 9 Kitap Envanteri)
 */

// ─── 1. EĞİLİMLER (21 EĞİLİM - EK-13 & TYMM 2026 Tam Liste) ─────────────────
export interface TendencyChip {
  code: string;
  label: string;
  category: "benlik" | "sosyal" | "entelektuel";
}

export const TENDENCY_CHIPS: TendencyChip[] = [
  // E1. Benlik Eğilimleri
  { code: "E1.1", label: "Merak", category: "benlik" },
  { code: "E1.2", label: "Bağımsızlık", category: "benlik" },
  { code: "E1.3", label: "Azim ve Kararlılık", category: "benlik" },
  { code: "E1.4", label: "Kendine İnanma (Öz Yeterlilik)", category: "benlik" },
  { code: "E1.5", label: "Kendini Yansıtma (Öz Düşünüm)", category: "benlik" },
  { code: "E1.6", label: "Seçicilik", category: "benlik" },

  // E2. Sosyal Eğilimler
  { code: "E2.1", label: "Empati", category: "sosyal" },
  { code: "E2.2", label: "Sorumluluk Alma", category: "sosyal" },
  { code: "E2.3", label: "Yardımseverlik", category: "sosyal" },
  { code: "E2.4", label: "İş Birliğine Açıklık", category: "sosyal" },
  { code: "E2.5", label: "Oyunseverlik", category: "sosyal" },

  // E3. Entelektüel Eğilimler
  { code: "E3.1", label: "Muhakeme", category: "entelektuel" },
  { code: "E3.2", label: "Odaklanma", category: "entelektuel" },
  { code: "E3.3", label: "Yaratıcılık", category: "entelektuel" },
  { code: "E3.4", label: "Gerçeği Arama", category: "entelektuel" },
  { code: "E3.5", label: "Açık Fikirlilik", category: "entelektuel" },
  { code: "E3.6", label: "Analitiklik", category: "entelektuel" },
  { code: "E3.7", label: "Sistematiklik", category: "entelektuel" },
  { code: "E3.8", label: "Sorgulayıcılık", category: "entelektuel" },
  { code: "E3.9", label: "Şüphe Duyma", category: "entelektuel" },
  { code: "E3.10", label: "Eleştirel Bakma", category: "entelektuel" },
];

// ─── 2. SOSYAL-DUYGUSAL ÖĞRENME BECERİLERİ (EK-11 Tam Liste) ────────────────
export interface SdbChip {
  code: string;
  label: string;
  category: "benlik" | "sosyal" | "karar";
}

export const SDB_CHIPS: SdbChip[] = [
  { code: "SDB1.1", label: "Kendini Tanıma (Öz Farkındalık)", category: "benlik" },
  { code: "SDB1.2", label: "Kendini Düzenleme (Öz Düzenleme)", category: "benlik" },
  { code: "SDB1.3", label: "Kendini Uyarlama (Öz Uyarlama)", category: "benlik" },
  { code: "SDB2.1", label: "İletişim Becerileri", category: "sosyal" },
  { code: "SDB2.2", label: "İş Birliği", category: "sosyal" },
  { code: "SDB2.3", label: "Sosyal Farkındalık", category: "sosyal" },
  { code: "SDB3.1", label: "Uyum Becerisi", category: "karar" },
  { code: "SDB3.2", label: "Esneklik", category: "karar" },
  { code: "SDB3.3", label: "Sorumlu Karar Verme", category: "karar" },
];

// ─── 3. ERDEM: DEĞER-EYLEM ÇERÇEVESİ (20 DEĞER - EK-12 Tam Liste) ────────────
export interface ValueChip {
  code: string;
  label: string;
  subCodes?: string[];
}

export const VALUE_CHIPS: ValueChip[] = [
  { code: "D1", label: "Adalet", subCodes: ["D1.1", "D1.2", "D1.3"] },
  { code: "D2", label: "Aile Bütünlüğü", subCodes: ["D2.1", "D2.2", "D2.3"] },
  { code: "D3", label: "Barış", subCodes: ["D3.1", "D3.2"] },
  { code: "D4", label: "Çalışkanlık", subCodes: ["D4.1", "D4.2", "D4.3"] },
  { code: "D5", label: "Dostluk", subCodes: ["D5.1", "D5.2"] },
  { code: "D6", label: "Dürüstlük", subCodes: ["D6.1", "D6.2"] },
  { code: "D7", label: "Estetik", subCodes: ["D7.1", "D7.2"] },
  { code: "D8", label: "Mahremiyet", subCodes: ["D8.1", "D8.2"] },
  { code: "D9", label: "Merhamet", subCodes: ["D9.1", "D9.2"] },
  { code: "D10", label: "Mütevazılık", subCodes: ["D10.1", "D10.2"] },
  { code: "D11", label: "Özgürlük", subCodes: ["D11.1", "D11.2"] },
  { code: "D12", label: "Sabır", subCodes: ["D12.1", "D12.2"] },
  { code: "D13", label: "Sağlıklı Yaşam", subCodes: ["D13.1", "D13.2", "D13.3"] },
  { code: "D14", label: "Saygı", subCodes: ["D14.1", "D14.2", "D14.3"] },
  { code: "D15", label: "Sevgi", subCodes: ["D15.1", "D15.2"] },
  { code: "D16", label: "Sorumluluk", subCodes: ["D16.1", "D16.2", "D16.3"] },
  { code: "D17", label: "Tasarruf", subCodes: ["D17.1", "D17.2"] },
  { code: "D18", label: "Temizlik", subCodes: ["D18.1", "D18.2"] },
  { code: "D19", label: "Vatanseverlik", subCodes: ["D19.1", "D19.2", "D19.3"] },
  { code: "D20", label: "Yardımseverlik", subCodes: ["D20.1", "D20.2"] },
];

// ─── 4. OKURYAZARLIK BECERİLERİ (8 OKURYAZARLIK - EK-14 Tam Liste) ───────────
export interface LiteracyChip {
  code: string;
  label: string;
}

export const LITERACY_CHIPS: LiteracyChip[] = [
  { code: "OB1", label: "Bilgi Okuryazarlığı" },
  { code: "OB2", label: "Dijital Okuryazarlık" },
  { code: "OB3", label: "Finansal Okuryazarlık" },
  { code: "OB4", label: "Görsel Okuryazarlık" },
  { code: "OB5", label: "Kültür Okuryazarlığı" },
  { code: "OB6", label: "Sanat Okuryazarlığı" },
  { code: "OB7", label: "Veri Okuryazarlığı" },
  { code: "OB8", label: "Sürdürülebilirlik Okuryazarlığı" },
];

// ─── 5. EK-7 RESMÎ KAVRAM LİSTESİ (10 KATEGORİ, 180+ KAVRAM) ─────────────────
export interface ConceptGroup {
  category: string;
  title: string;
  concepts: string[];
}

export const EK7_CONCEPT_GROUPS: ConceptGroup[] = [
  {
    category: "renk",
    title: "1. Renkler ve Tonlar",
    concepts: [
      "Kırmızı", "Mavi", "Sarı", "Yeşil", "Turuncu", "Mor", "Pembe",
      "Kahverengi", "Siyah", "Beyaz", "Gri", "Açık", "Koyu", "Ton Farklılıkları"
    ]
  },
  {
    category: "geometri",
    title: "2. Geometrik Şekiller",
    concepts: [
      "Daire", "Üçgen", "Kare", "Dikdörtgen", "Çember", "Kenar", "Köşe",
      "Küp", "Silindir", "Küre", "Prizma"
    ]
  },
  {
    category: "boyut",
    title: "3. Boyut",
    concepts: [
      "Büyük - Orta - Küçük", "İnce - Kalın", "Uzun - Kısa", "Geniş - Dar",
      "Derin - Sığ", "Dev - Minik"
    ]
  },
  {
    category: "miktar",
    title: "4. Miktar & Ağırlık",
    concepts: [
      "Az - Çok", "Ağır - Hafif", "Boş - Dolu", "Tek - Çift", "Yarım - Tam",
      "Eşit", "Parça - Bütün", "Hepsi - Hiçbiri", "Birkaç - Çoğu", "Daha Fazla - Daha Az"
    ]
  },
  {
    category: "konum",
    title: "5. Yön ve Mekânda Konum",
    concepts: [
      "Ön - Arka", "Yukarı - Aşağı", "İleri - Geri", "Sağ - Sol",
      "Önünde - Arkasında", "Altında - Ortasında - Üstünde", "Arasında", "Yanında",
      "Yukarıda - Aşağıda", "İç - Dış", "İçinde - Dışında", "İçeri - Dışarı",
      "Uzak - Yakın", "Alçak - Yüksek", "Sağında - Solunda", "Çevresinde - Etrafında",
      "Karşısında", "Derinde", "Köşede"
    ]
  },
  {
    category: "sayi",
    title: "6. Sayı ve Sayma",
    concepts: [
      "1-5 Arası Sayılar", "6-10 Arası Sayılar", "11-20 Arası Sayılar", "Sıfır (0)",
      "İlk - Orta - Son", "Önceki - Sonraki", "Sıra Sayısı (Birinci, İkinci...)",
      "Geriye Ritmik Sayma", "İleriye Ritmik Sayma", "Birer Birer", "Eşleme - Sayma"
    ]
  },
  {
    category: "zaman",
    title: "7. Zaman",
    concepts: [
      "Gece - Gündüz", "Sabah - Öğle - Akşam", "Dün - Bugün - Yarın",
      "Önce - Şimdi - Sonra", "Erken - Geç", "Hafta İçi - Hafta Sonu",
      "Mevsimler (Sonbahar, Kış, İlkbahar, Yaz)", "Aylar", "Saat (Tam, Yarım)", "Gündoğumu - Günbatımı"
    ]
  },
  {
    category: "duyu",
    title: "8. Duyu & Doku & Tat",
    concepts: [
      "Tatlı", "Tuzlu", "Acı", "Ekşi",
      "Sıcak - Soğuk - Ilık", "Sert - Yumuşak", "Kaygan - Pütürlü", "Tüylü - Tüysüz",
      "Islak - Kuru", "Sivri - Küt", "Parlak - Mat", "Taze - Bayat",
      "Sesli - Sessiz", "Tiz - Bas Ses", "Hafif Ses - Kuvvetli Ses", "Kokulu - Kokusuz"
    ]
  },
  {
    category: "duygu",
    title: "9. Duygular",
    concepts: [
      "Mutluluk", "Üzüntü", "Öfke", "Korku", "Şaşkınlık", "Endişe",
      "İğrenme", "Pişmanlık", "Utanma", "Heyecan", "Gurur", "Huzur", "Merak", "Sabırsızlık"
    ]
  },
  {
    category: "zit",
    title: "10. Zıt Kavramlar & Nitelikler",
    concepts: [
      "Aynı - Farklı", "Açık - Kapalı", "Hızlı - Yavaş", "Canlı - Cansız",
      "Hareketli - Hareketsiz", "Kolay - Zor", "Karanlık - Aydınlık", "Ters - Düz",
      "Düzenli - Dağınık", "Eski - Yeni", "Başlangıç - Bitiş", "Kirli - Temiz",
      "Aç - Tok", "Düz - Eğri", "Doğru - Yanlış", "Yaşlı - Genç",
      "Açık Renk - Koyu Renk", "Kalabalık - Tenha", "Sağlam - Kırık", "Tehlikeli - Güvenli"
    ]
  }
];

// ─── 6. RESMÎ MEB 9 ÖĞRENME MERKEZİ VE 240+ MATERYAL SANDIĞI ─────────────────
export interface MaterialCenterGroup {
  id: string;
  name: string;
  icon: string;
  materials: string[];
}

export const TYMM_MATERIAL_CENTERS: MaterialCenterGroup[] = [
  {
    id: "blok",
    name: "Blok Merkezi",
    icon: "🧱",
    materials: [
      "Ahşap blok seti", "Köpük bloklar", "Karton bloklar", "Mimari sütun ve kemer blokları",
      "Minyatür insan figürleri (aile, meslekler)", "Minyatür hayvan figürleri (çiftlik, vahşi, deniz)",
      "Minyatür araçlar (arabalar, kamyonlar, itfaiye, ambulans)", "Tren seti ve raylar",
      "Yol ve sokak halısı / şeritleri", "Trafik işaret levhaları", "Köprü ve rampa elemanları",
      "Geçmeli yapı oyuncakları (Lego, Duplo)", "Manyetik yapı blokları", "Büyük boy hafif inşaat süngerleri",
      "Mukavva rulolar ve kutular", "Tahta kalaslar ve çıtalar", "Kablo makaraları (ahşap)",
      "Ahşap dişliler ve tekerlekler", "Düzenleme sepetleri ve plastik kutular",
      "Geri dönüşüm kutuları ve kasalar", "Blok planlama kartları / mimari çizim kartları",
      "Metre ve şerit ölçü aleti", "İnşaat baretleri ve yelekleri"
    ]
  },
  {
    id: "sanat",
    name: "Sanat Merkezi",
    icon: "🎨",
    materials: [
      "Parmak boyası", "Sulu boya seti", "Guaj boya", "Akrilik boya", "Pastel boya seti",
      "Kuru boya kalemleri", "Keçeli kalemler (kalın ve ince uçlu)", "Farklı numaralarda kıl fırçalar",
      "Sünger rulo ve sünger fırçalar", "Boya paletleri ve su kapları", "Resim şövalesi (çift taraflı)",
      "Resim kâğıtları (A3, A4, A2)", "Kraft kâğıdı / ambalaj kâğıdı rulosu", "Renkli fon kartonları",
      "Oluklu mukavva", "Elişi kâğıtları (parlak, mat)", "Grapon kâğıdı", "Şeffaf asetat ve aydınger",
      "Çocuk güvenlik makasları (düz)", "Desenli şekilli makaslar", "Yaylı / solak çocuk makası",
      "Katı yapıştırıcı (stick pritt)", "Sıvı beyaz okul tutkalı", "Şeffaf koli bandı ve kâğıt maskeleme bandı",
      "Doğal killi çamur", "Renkli oyun hamurları", "Seramik hamuru (havayla kuruyan)",
      "Modelaj spatulaları ve hamur merdaneleri", "Hamur şekillendirme kalıpları",
      "Renkli yün ipler ve rafyalar", "Kumaş parçaları ve keçe tabakaları", "Düğmeler, boncuklar ve pullar",
      "Patates ve havuç baskı kalıpları", "Yaprak ve doku baskı materyalleri", "Şöniller (tüylü tel) ve ponponlar",
      "Boya önlükleri", "Kurutma rafları ve askılıklar", "Ünlü ressamların eser kartları / röprodüksiyonlar"
    ]
  },
  {
    id: "fen",
    name: "Fen ve Doğa Merkezi",
    icon: "🔬",
    materials: [
      "Büyük boy el büyüteçleri", "Masaüstü çocuk mikroskobu", "El dürbünü",
      "Düz ve bükey aynalar", "Işık prizması", "Çocuk stetoskopu", "Manyetik pusula",
      "Oda ve açık hava termometresi", "Dijital ve analog kronometre", "Kum saati seti (1-3-5 dk)",
      "Cetvel, tahta metre ve mezura", "Eşit kollu terazi ve pirinç ağırlıklar",
      "Plastik dereceli silindirler ve ölçü kapları", "Damlalıklar ve plastik pipetler", "Deney tüpleri ve tüplük",
      "Plastik huniler ve süzgeçler", "Mıknatıs seti (çubuk, at nalı, yuvarlak)", "Pil, duy ve mini ampul devresi",
      "El fenerleri ve renkli ışık filtreleri", "Farklı boyutta balonlar", "İğnesiz plastik şırıngalar",
      "Akvaryum veya teraryum", "Böcek inceleme kavanozu (büyüteçli kapak)", "Böcek oteli", "Kuş yemliği",
      "Saksılar, çimlendirme kapları ve sulama kabı", "Tohum çeşitleri (fasulye, nohut, mercimek, çim)",
      "Bahçe toprağı, kum ve çakıl taşları", "Doğal deniz kabukları ve deniz taşları",
      "Çam kozalakları ve ağaç kabukları", "İnsan vücudu ve iskelet maketi", "Diş fırçalama eğitim modeli",
      "Dünya yerküresi ve kabartma Türkiye haritası", "Güneş sistemi ve gezegenler modeli",
      "Bilim insanı kartları ve çocuk bilim ansiklopedileri"
    ]
  },
  {
    id: "matematik",
    name: "Matematik Merkezi",
    icon: "🔢",
    materials: [
      "1-20 kabartmalı ve dokunsal sayı kartları", "Sayı çubukları ve sayma fasulyeleri",
      "Birim küpler (birbirine geçmeli onluk küpler)", "Abaküs (ahşap, 10 telli)",
      "Cuisenaire renkli sayı çubukları", "Domino taşları seti", "Örüntü blokları ve örüntü görev kartları",
      "Geometri tahtası (geoboard) ve renkli lastikler", "Tangram setleri (ahşap/plastik)",
      "3 Boyutlu geometrik cisimler (küp, küre, silindir, koni, prizma)", "Geometrik şekil eşleştirme kutusu",
      "Ahşap yapbozlar (sayı ve miktar eşlemeli)", "Sayma ayıcıkları ve renkli sınıflandırma kâseleri",
      "Büyük boy renkli zarlar (noktalı ve rakamlı)", "Analog öğrenme saati modeli (hareketli yelkovan)",
      "Sınıf takvimi panosu (gün, ay, mevsim, hava)", "Eşit kollu denge terazisi",
      "Dijital mutfak terazisi", "Temsilî Türk Lirası madenî ve kâğıt para seti",
      "Yön ve konum kartları (sağ, sol, ön, arka)", "Basit labirent ve koordinat halısı",
      "Kroki ve yön bulma görev kartları", "Grafik oluşturma cepli panosu", "Sayı tepsisi ve kinetik kum"
    ]
  },
  {
    id: "dramatik",
    name: "Dramatik Oyun Merkezi",
    icon: "🎭",
    materials: [
      "Kukla perdesi (ahşap / kumaş)", "El kuklaları (aile fertleri, hayvanlar)",
      "Parmak kuklası seti", "Çomak kuklalar ve gölge oyunu figürleri (Hacivat & Karagöz)",
      "Karakter ve hayvan maskeleri", "Rol kostümleri (doktor, itfaiyeci, polis, aşçı, astronot, veteriner)",
      "Kostüm aksesuarları (şapkalar, kasklar, taçlar, pelerinler, fularlar)",
      "Çantalar, cüzdanlar, gözlük çerçeveleri, bastonlar",
      "Geleneksel Türk kültürüne ve dünya kültürlerine ait kıyafetler",
      "Ahşap evcilik mutfağı (ocak, fırın, lavabo)", "Tencere, tava, çaydanlık seti (metal/ahşap)",
      "Yemek takımı (tabaklar, çatal, kaşık, bardaklar)", "Ahşap cırt cırtlı kesilebilen meyve-sebzeler",
      "Bez bebekler, oyuncak puset ve beşik", "Ütü masası ve oyuncak ahşap ütü",
      "Temizlik arabası (küçük süpürge, faraş, kova, toz bezi)",
      "Doktor muayene çantası (stetoskop, tansiyon aleti, termometre, sargı)",
      "Tamir tezgâhı ve alet çantası (ahşap çekiç, tornavida, anahtar, testere)",
      "Market / manav tezgâhı ve alışveriş arabası", "Yazar kasa ve oyuncak barkod okuyucu",
      "Oyuncak tartı ve para kasası", "Telefon, telsiz ve eski klavyeler", "Mikrofon ve mini sahne"
    ]
  },
  {
    id: "muzik",
    name: "Müzik Merkezi",
    icon: "🎵",
    materials: [
      "Ritim çubukları (ahşap klaveler - her çocuğa 1 çift)", "Marakas seti (ahşap, plastik, tohumlu)",
      "Kastanyetler (saplı ve parmak)", "Parmak zilleri ve el zilleri", "Zilli tef ve zilsiz tef",
      "Büyük el davulu ve tokmak", "Bongo / Djembe / Darbuka", "Renkli ksilofon (metal/ahşap tuşlu)",
      "Metalofon ve glockenspiel", "Boomwhackers (renkli akortlu ses boruları)",
      "Üçgen zil (triyangel)", "Kazoo", "Yağmur çubuğu (rainmaker)", "Okyanus davulu (içi boncuklu)",
      "Ses çıkaran doğal materyaller (ceviz kabukları, tohum kutuları, çıngıraklar)",
      "Ses blokları (farklı tonlarda ahşaplar)", "Müzik çalar / Bluetooth hoparlör",
      "Ses kayıt cihazı / mikrofon", "Çocuk kulaklıkları", "Ritim ve nota sembol kartları",
      "Müzik aletleri tanıtım kartları", "Türk halk çalgıları tanıtım görselleri (bağlama, ney, kaval, kemençe)",
      "Klasik batı müziği ve Türk müziği besteci portreleri", "Dans tülleri ve ritim kurdeleleri"
    ]
  },
  {
    id: "kitap",
    name: "Kitap & Dinleme Merkezi",
    icon: "📚",
    materials: [
      "Büyük boy resimli hikâye kitapları", "3 Boyutlu (pop-up) hareketli kitaplar",
      "Kumaş ve dokunsal bebek kitapları", "Sessiz kitaplar (yalnız görsel içeren)",
      "Şiir, tekerleme ve bilmece kitapları", "Kavram kitapları (renk, sayı, şekil)",
      "Çocuk ansiklopedileri ve tematik atlaslar", "TÜBİTAK popüler bilim çocuk kitapları ve dergileri",
      "Kültürel masal kitapları (Nasrettin Hoca, Keloğlan, Dede Korkut hikâyeleri)",
      "Çocukların kendi yazdığı ve resimlediği kitaplar", "Broşürler, menüler, tiyatro afişleri, gezi rehberleri",
      "Hikâye anlatım kartları (olay sıralama)", "Karakter kuklaları ve hikâye önlüğü",
      "Kitap ayraçları ve büyüteçler", "Minderler, armut koltuklar ve okuma halısı",
      "Açık yüzlü kitap sergileme rafları", "'Bugün Ne Okudum?' görüş ve oy panosu",
      "Sesli kitaplar ve sesli öykü dinleme tableti", "Kulaklık çoklayıcı ve dinleme istasyonu"
    ]
  },
  {
    id: "erken_okuryazarlik",
    name: "Erken Okuryazarlık Merkezi",
    icon: "✍️",
    materials: [
      "Resimli alfabe kartları ve harf posteri", "Manyetik harfler ve manyetik tahta",
      "Ahşap harf blokları ve zımpara harf kartları", "Harf ve sembol damga / mühür setleri",
      "Yazı tahtası (tebeşirli ve beyaz emaye)", "Renkli tahta kalemleri ve silgiler",
      "Çizgi takip ve el-göz koordinasyon kartları", "Çeşitli boyutlarda kâğıtlar, bloknotlar ve çizgisiz defterler",
      "Ergonomik üçgen kurşun kalemler", "Parmak tutuş aparatları (kalem tutucu)",
      "Sözcük ve logo piktogram kartları", "Sınıf içi etiketler ve yönlendirici tabelalar",
      "Sınıf posta kutusu, zarflar, mektup kâğıtları ve pullar", "Dikte ve ses kayıt aygıtı",
      "Işıklı çizim masası (light box)", "Şablon cetveller (harf, rakam, şekil)",
      "Kendi ismini yazma kartları / fotoğraflı isimlikler", "Tekerleme ve mani kartları"
    ]
  },
  {
    id: "acik_hava",
    name: "Açık Hava & Çamur Mutfağı",
    icon: "🌳",
    materials: [
      "Çamur mutfağı ahşap tezgâhı", "Eski metal tencere, tava, çırpıcı ve kepçeler",
      "Su pompası, hortum ve su kanalları", "Kum havuzu ve temiz kum",
      "Kum kovaları, kürekler, tırmıklar ve kum kalıpları", "Plastik elekler ve su çarkları",
      "Denge kütükleri ve ahşap atlama taşları", "Denge tahtası ve tırmanma rampası",
      "Büyük boy açık hava inşaat blokları (ahşap kalaslar, kasalar)",
      "Otomobil lastikleri ve brandalar", "Bahçe tarhı / yükseltilmiş ekim yatağı",
      "Çocuk bahçe kürekleri, tırmıkları ve el arabası", "Çocuk sulama kapları ve bitki etiketleri",
      "Dış mekân şeffaf pleksi boyama duvarı", "Açık hava resim şövalesi",
      "Böcek inceleme büyüteçleri ve toplama sepetleri", "Rüzgâr gülü ve rüzgâr tulumu",
      "Yağmur ölçer ve dış ortam termometresi", "Gözlem çadırı ve açık hava gölgeliği",
      "Piknik örtüleri ve açık hava minderleri", "Karasal doğa koleksiyonu tepsileri"
    ]
  }
];

// ─── 7. ÖĞRENME ORTAMLARI & MERKEZLER LİSTESİ (40+ ORTAM) ────────────────────
export interface LearningEnvOption {
  id: string;
  name: string;
  category: "sabit" | "gecici" | "acik_hava" | "okul_disi";
}

export const LEARNING_ENVIRONMENTS: LearningEnvOption[] = [
  // Sabit Merkezler
  { id: "merkez_blok", name: "Blok Merkezi", category: "sabit" },
  { id: "merkez_kitap", name: "Kitap Merkezi", category: "sabit" },
  { id: "merkez_erken_okur", name: "Erken Okuryazarlık Merkezi", category: "sabit" },
  { id: "merkez_sanat", name: "Sanat Merkezi", category: "sabit" },
  { id: "merkez_fen", name: "Fen ve Doğa Merkezi", category: "sabit" },
  { id: "merkez_matematik", name: "Matematik Merkezi", category: "sabit" },
  { id: "merkez_dramatik", name: "Dramatik Oyun Merkezi", category: "sabit" },
  { id: "merkez_muzik", name: "Müzik Merkezi", category: "sabit" },
  { id: "merkez_toplanti", name: "Toplantı ve Çember Halısı (Büyük Grup Alanı)", category: "sabit" },

  // Geçici & Tematik Merkezler
  { id: "gecici_posta", name: "Posta Ofisi ve Mektup Köşesi", category: "gecici" },
  { id: "gecici_hastane", name: "Sağlık Kliniği ve Eczane Köşesi", category: "gecici" },
  { id: "gecici_itfaiye", name: "İtfaiye İstasyonu", category: "gecici" },
  { id: "gecici_pazar", name: "Manav ve Semt Pazarı Alanı", category: "gecici" },
  { id: "gecici_arkeoloji", name: "Fosil ve Arkeolojik Kazı Masası", category: "gecici" },
  { id: "gecici_uzay", name: "Gözlemevi ve Uzay İstasyonu", category: "gecici" },
  { id: "gecici_muze", name: "Sınıf İçi Kültür ve Eser Müzesi", category: "gecici" },
  { id: "gecici_tamir", name: "Marangozluk ve Tamir Atölyesi", category: "gecici" },
  { id: "gecici_isik", name: "Gölge ve Işıklı Masa İstasyonu", category: "gecici" },
  { id: "gecici_sergi", name: "Sanat Galerisi ve Sergi Duvarı", category: "gecici" },
  { id: "gecici_dikis", name: "Dokuma ve Dikiş Atölyesi", category: "gecici" },
  { id: "gecici_matbaa", name: "Baskı ve Matbaa Masası", category: "gecici" },

  // Açık Hava Alanları
  { id: "acik_bahce", name: "Okul Bahçesi ve Doğal Keşif Alanı", category: "acik_hava" },
  { id: "acik_camur", name: "Çamur Mutfağı", category: "acik_hava" },
  { id: "acik_kum", name: "Kum Havuzu", category: "acik_hava" },
  { id: "acik_su", name: "Su Masası ve Akış Kanalları", category: "acik_hava" },
  { id: "acik_tarh", name: "Ekolojik Bahçe Tarhı ve Bostan", category: "acik_hava" },
  { id: "acik_hareket", name: "Fiziksel Hareket ve Engel Parkuru", category: "acik_hava" },
  { id: "acik_denge", name: "Tırmanma ve Denge Kütükleri Parkı", category: "acik_hava" },
  { id: "acik_cadir", name: "Gölgelikli Sessiz Dinlenme Çadırı", category: "acik_hava" },

  // Okul Dışı Öğrenme Ortamları (EK-3 / EK-4)
  { id: "dis_kutuphane", name: "Halk / Çocuk Kütüphanesi", category: "okul_disi" },
  { id: "dis_muze", name: "Müze (Arkeoloji, Etnografya, Bilim, Oyuncak)", category: "okul_disi" },
  { id: "dis_park", name: "Botanik Parkı / Orman / Tabiat Parkı", category: "okul_disi" },
  { id: "dis_kurum", name: "Kamu Kurumu (İtfaiye, Karakol, Sağlık Ocağı, PTT)", category: "okul_disi" },
  { id: "dis_esnaf", name: "Yerel Esnaf / Atölye (Fırın, Marangoz, Çömlekçi, Terzi)", category: "okul_disi" },
  { id: "dis_ciftlik", name: "Çiftlik / Sera / Hayvan Barınağı", category: "okul_disi" },
  { id: "dis_sanat_galerisi", name: "Sanat Galerisi / Tiyatro / Kültür Merkezi", category: "okul_disi" },
  { id: "dis_tarihi", name: "Tarihî Mekân / Ören Yeri", category: "okul_disi" }
];

// ─── 8. ETKİNLİK TÜRLERİ VE PEDAGOJİK STRATEJİLER ────────────────────────────
export interface ActivityTypeOption {
  id: string;
  name: string;
  category: "alan" | "yapisal" | "grup" | "mekan";
}

export const ACTIVITY_TYPES: ActivityTypeOption[] = [
  // Alan Bazında
  { id: "turkce", name: "Türkçe Etkinliği", category: "alan" },
  { id: "matematik", name: "Matematik Etkinliği", category: "alan" },
  { id: "fen", name: "Fen Etkinliği", category: "alan" },
  { id: "sosyal", name: "Sosyal Etkinlik", category: "alan" },
  { id: "sanat", name: "Sanat Etkinliği", category: "alan" },
  { id: "muzik", name: "Müzik Etkinliği", category: "alan" },
  { id: "hareket", name: "Hareket ve Sağlık Etkinliği", category: "alan" },
  { id: "drama", name: "Drama Etkinliği", category: "alan" },
  { id: "oyun", name: "Oyun Etkinliği", category: "alan" },

  // Yapısal
  { id: "tekil", name: "Tekil Etkinlik (Tek Alan Hedefli)", category: "yapisal" },
  { id: "butunlesik_2", name: "Bütünleştirilmiş Etkinlik (2 Alan)", category: "yapisal" },
  { id: "butunlesik_3", name: "Bütünleştirilmiş Etkinlik (3+ Alan / Disiplinlerarası)", category: "yapisal" },

  // Grup Organizasyonu
  { id: "buyuk_grup", name: "Büyük Grup Etkinliği (Tüm Sınıf)", category: "grup" },
  { id: "kucuk_grup", name: "Küçük Grup Etkinliği (İstasyon / Masa / 3-6 Çocuk)", category: "grup" },
  { id: "bireysel", name: "Bireysel Etkinlik (Bağımsız Çalışma)", category: "grup" },

  // Mekânsal
  { id: "sinif_ici", name: "Sınıf İçi Etkinlik", category: "mekan" },
  { id: "acik_hava_etk", name: "Açık Havada Etkinlik", category: "mekan" },
  { id: "okul_disi_etk", name: "Okul Dışı Öğrenme Etkinliği (Saha Gezisi)", category: "mekan" }
];

export interface PedagogicalMethod {
  id: string;
  name: string;
  description: string;
}

export const PEDAGOGICAL_METHODS: PedagogicalMethod[] = [
  { id: "oyun_temelli", name: "Oyun Yoluyla Öğrenme", description: "Oyunun çocuğun en doğal ve kalıcı öğrenme aracı olarak merkeze alınması" },
  { id: "sorgulama", name: "Sorgulamaya Dayalı Öğrenme", description: "Çocukların soruları, merakları ve hipotezleri üzerinden keşif süreci" },
  { id: "istasyon", name: "İstasyon Tekniği", description: "Sınıfın farklı masalarında eş zamanlı ve dönüşümlü öğrenme basamakları" },
  { id: "scamper", name: "SCAMPER Yaratıcı Düşünme", description: "Yer değiştirme, birleştirme, uyarlama ve dönüştürme sorularıyla yaratıcılık" },
  { id: "dusun_esles_paylas", name: "Düşün - Eşleş - Paylaş", description: "Önce bireysel düşünme, sonra akranla tartışma ve tüm sınıfa sunma" },
  { id: "5n1k", name: "5N1K Hikâye Çözümleme", description: "Kim, ne, nerede, ne zaman, nasıl, neden sorularıyla anlama ve analiz" },
  { id: "gosterip_yaptirma", name: "Model Olma ve Gösterip Yaptırma", description: "Öğretmenin hareketi/beceriyi sergileyip çocuğun adım adım denemesi" },
  { id: "rol_oynama", name: "Rol Oynama ve Canlandırma", description: "Farklı bir karakterin veya durumun duygusal ve sosyal olarak canlandırılması" },
  { id: "kavram_haritasi", name: "Görsel Kavram Haritası", description: "Çocukların bildiklerini semboller, resimler ve çizgilerle haritalandırması" },
  { id: "deney_gozlem", name: "Bilimsel Deney ve Gözlem", description: "Tahmin etme, değişkeni test etme ve gözlem kanıtını kaydetme" }
];

// ─── 9. MEB 4 GÜNLÜK PLAN RUTİNİ VE PRESETLERİ ────────────────────────────────
export interface RoutinePreset {
  id: string;
  title: string;
  description: string;
}

export const GUNE_BASLAMA_PRESETS: RoutinePreset[] = [
  {
    id: "gb_selamlama_cemberi",
    title: "Selamlaşma Çemberi & Duygu Panosu",
    description: "Çocuklar kapıda tercih ettikleri selamlaşma biçimiyle (sarılma, el çakma, dans) karşılanır. Çemberde toplanılır, günün duygu durum panosuna mandal/kart takılır, günün hava durumu ve takvimi incelenir."
  },
  {
    id: "gb_gunun_sorusu",
    title: "Günün Merak Sorusu & Sabah Sohbeti",
    description: "Öğretmen panoya günün merak sorusunu (Örn: 'Kuşlar neden göç eder?') asar. Çocukların tahminleri ve önceki günün deneyimleri dinlenir, merkez seçimlerine geçiş yapılır."
  },
  {
    id: "gb_sabah_egzersizi",
    title: "Sabah Egzersizi & Beden Farkındalığı",
    description: "Müzik eşliğinde esneme, nefes egzersizleri ve hayvan taklitleri hareketleri yapılır. Çocukların güne zinde ve koordineli başlaması desteklenir."
  },
  {
    id: "gb_parmak_oyunu",
    title: "Parmak Oyunu & Ritim Tekerlemesi",
    description: "Çemberde oturulur, günün temasına uygun ritmik bir parmak oyunu veya bilmeceler eşliğinde dikkat toplama çalışması yürütülür."
  },
  {
    id: "gb_kitap_kesfi",
    title: "Güne Sessiz Kitap İncelemesiyle Başlama",
    description: "Girişte çocuklar kitap merkezinde kendi seçtikleri resimli öykü kitaplarını bağımsız olarak inceler; ardından çemberde kitapta gördükleri ilginç bir detayı arkadaşlarına anlatır."
  }
];

export const BESLENME_TEMIZLIK_PRESETS: RoutinePreset[] = [
  {
    id: "bt_sofra_duzeni",
    title: "Masa Hazırlama & Sofra Adabı",
    description: "Çocuklar sırayla yemek masasını hazırlar, peçete ve tabakları düzenler. Yemek öncesi doğru el yıkama adımları uygulanır; paylaşma, teşekkür etme ve sıra bekleme nezaket kuralları pekiştirilir."
  },
  {
    id: "bt_meyve_saati",
    title: "Meyve Günü & Sağlıklı Tabak",
    description: "Günün meyvesi incelenir (renk, koku, tat, çekirdek yapısı). Çocuklar meyvelerini kendileri soyup doğrarken öz bakım ve sağlıklı beslenme bilinci kazanır."
  },
  {
    id: "bt_sifir_atik",
    title: "Toplanma Sinyali & Sıfır Atık Ayrıştırma",
    description: "Ritimli toplanma şarkısı eşliğinde tüm merkezler sınıflandırılmış kutulara toplanır. Yemek artıkları kompost veya organik kutusuna, ambalajlar geri dönüşüme ayrıştırılır."
  }
];

export const GECIS_STRATEJILERI: RoutinePreset[] = [
  {
    id: "gc_ritim_sinyali",
    title: "Ritim ve Çan Sinyali",
    description: "Etkinlik bitimine 5 dakika kala hafif üçgen zil sesiyle haber verilir; bitişte ritim çubuğuyla çalınan ritim çocuklar tarafından alkışla tekrar edilerek toplanma başlatılır."
  },
  {
    id: "gc_hareket_oyunu",
    title: "Hayvan Yürüyüşü Treni",
    description: "Bir merkezden diğerine geçerken 'parmak ucunda yürüyen kediler' veya 'ağır adımlarla yürüyen filler' gibi imgesel hareketlerle sessiz ve eğlenceli intikal sağlanır."
  },
  {
    id: "gc_zamanlayici",
    title: "Kum Saati & Görsel Sayaç",
    description: "Masaya konan renkli kum saati çocukların süreyi somut olarak görmelerini sağlar; kum bittiğinde görev tamamlanmış olur."
  },
  {
    id: "gc_sarki",
    title: "Geçiş Şarkısı / Tekerleme",
    description: "Öğretmenin başlattığı bilindik toplanma tekerlemesi tüm sınıf tarafından söylenerek eşyalar yerlerine kaldırılır."
  }
];

// ─── 10. FARKLILAŞTIRMA BANKASI (ZENGİNLEŞTİRME & DESTEKLEME - MEB TYMM) ─────
export interface DifferentiationOption {
  id: string;
  dimension: "icerik" | "surec" | "urun" | "ortam";
  title: string;
  strategy: string;
}

export const ENRICHMENT_STRATEGIES: DifferentiationOption[] = [
  {
    id: "zen_ic_1",
    dimension: "icerik",
    title: "İçerik: Açık Uçlu Problem & Hipotez",
    strategy: "Kavramı hızlı kavrayan çocuklara 'Peki ya su olmasaydı ne olurdu?' gibi çok değişkenli sorgulama soruları yöneltilir; soyut bağlantılar kurması istenir."
  },
  {
    id: "zen_sur_1",
    dimension: "surec",
    title: "Süreç: Akran Liderliği & Kural Tasarımı",
    strategy: "Çocuğa küçük grup çalışmasında kolaylaştırıcı/rehber rolü verilir; oyunun veya deneyin kurallarını kendi yaratıcılığıyla yeniden tasarlamasına fırsat tanınır."
  },
  {
    id: "zen_ur_1",
    dimension: "urun",
    title: "Ürün: 3 Boyutlu Model & Kitap Tasarımı",
    strategy: "Yalnızca çizim yapmak yerine artık malzemelerle yapının 3 boyutlu maketini inşa etmesi veya hikâyeyi birden fazla sayfadan oluşan bir kitaba dönüştürmesi istenir."
  },
  {
    id: "zen_or_1",
    dimension: "ortam",
    title: "Ortam: Bilim ve Araştırma İstasyonuna Yönlendirme",
    strategy: "Çocuğa büyüteç, mikroskop, ölçüm aletleri veya dijital içeriklerin bulunduğu bağımsız keşif istasyonunda serbest araştırma yapma alanı açılır."
  }
];

export const SUPPORT_STRATEGIES: DifferentiationOption[] = [
  {
    id: "des_ic_1",
    dimension: "icerik",
    title: "İçerik: Somutlaştırma & Adım Adım Parçalama",
    strategy: "Karmaşık yönergeler tek tek ve somut nesnelerle gösterilerek verilir; piktogramlar ve görsel sıra kartlarıyla süreç basitleştirilir."
  },
  {
    id: "des_sur_1",
    dimension: "surec",
    title: "Süreç: Bire Bir Rehberlik & Ek Düşünme Süresi",
    strategy: "Öğretmen veya bir akran çocuğun yanına oturarak model olur; çocuğa acele ettirmeden kendi hızında denemesi için ek bekleme süresi tanınır."
  },
  {
    id: "des_ur_1",
    dimension: "urun",
    title: "Ürün: Çoklu İfade Yolu (İşaret, Seçim, Ses)",
    strategy: "Sözlü ifade etmekte zorlanan çocuğa kart göstererek seçme, nesneyi kutuya koyma veya jest-mimiklerle anlatma gibi alternatif ürün kanalları sunulur."
  },
  {
    id: "des_or_1",
    dimension: "ortam",
    title: "Ortam: Dikkat Dağıtıcıları Azaltma & Ergonomik Destek",
    strategy: "Çocuk hareket yoğunluğundan uzak, sakin bir köşede konumlandırılır; kalın tutuşlu üçgen kalemler, yaylı makaslar veya sınırlandırılmış tepsiler sunulur."
  }
];

// ─── 11. GÜNÜ DEĞERLENDİRME ÇEMBERİ SORU BANKASI (4 KATEGORİ - MEB TYMM) ────
export interface EvaluationQuestionGroup {
  category: "duyussal" | "surec" | "yasam" | "oz_degerlendirme";
  title: string;
  questions: string[];
}

export const EVALUATION_QUESTION_BANK: EvaluationQuestionGroup[] = [
  {
    category: "duyussal",
    title: "1. Duyuşsal Sorular (Duygular ve Tutum)",
    questions: [
      "Bugün sınıfta kendini en çok mutlu hissettiğin an hangisiydi?",
      "Bugün seni en çok heyecanlandıran veya şaşırtan şey ne oldu?",
      "Bugün zorlandığın bir etkinlik oldu mu? O sırada nasıl hissettin?",
      "Arkadaşlarınla birlikte bir şey üretirken neler hissettin?",
      "Bugün en çok hangi öğrenme merkezinde oynamaktan keyif aldın? Neden?"
    ]
  },
  {
    category: "surec",
    title: "2. Süreç ve Betimleyici Sorular (Ne Yapıldı, Nasıl Yapıldı?)",
    questions: [
      "Bugün yaptığın yapıyı / resmi oluştururken ilk önce ne yaptın, sonra nasıl devam ettin?",
      "Merkezdeki oyunda bir problemle karşılaştığında bunu çözmek için ne yaptın?",
      "Kullandığın malzemelerin özellikleri nasıldı? (Sert, yumuşak, ağır, hafif vb.)",
      "Arkadaşınla ortak bir karar almanız gerektiğinde bunu nasıl belirlediniz?",
      "Öğrendiğimiz yeni kelimelerden (örneğin lokomotif, göç, terazi) hangilerini hatırlıyorsun?"
    ]
  },
  {
    category: "yasam",
    title: "3. Yaşamla İlişkilendirme Soruları (Günlük Hayata Aktarım)",
    questions: [
      "Bugün öğrendiğimiz / denediğimiz bu durumu evde veya dışarıda nerede görebilirsin?",
      "Sınıfta uyguladığımız bu nezaket kuralını ailende kiminle uygulayabilirsin?",
      "Doğada gördüğümüz bu değişimi sokağımızda veya parkta nasıl fark edebiliriz?",
      "Eğer bu etkinliği yarın tekrar yapsaydık, neyi daha farklı yapmak isterdin?",
      "Bugün sınıfta yaptığımız bu tasarımı evde hangi malzemelerle tekrar yapabilirsin?"
    ]
  },
  {
    category: "oz_degerlendirme",
    title: "4. Öz Değerlendirme Soruları (Kendini Değerlendirme)",
    questions: [
      "Bugün kendi davranışlarına veya çalışmana bir yıldız vermek isteseydin bunu ne için verirdin?",
      "Bugün hangi arkadaşına yardım ettin ya da kimden destek aldın?",
      "Bugün başladığın bir işi sonuna kadar tamamlayabildin mi?",
      "Bugün sınıfta bir kurala uymakta zorlandığın an oldu mu, bunu nasıl telafi ettin?",
      "Yarın okula geldiğinde ilk olarak hangi merkezde neyi denemek istersin?"
    ]
  }
];

// ─── 12. AİLE VE TOPLUM KATILIMI BANKASI (MEB TYMM 2026) ─────────────────────
export interface FamilyCommunityOption {
  id: string;
  type: "aile" | "toplum";
  title: string;
  description: string;
}

export const FAMILY_COMMUNITY_OPTIONS: FamilyCommunityOption[] = [
  // Aile Katılımı
  {
    id: "aile_renk_avi",
    type: "aile",
    title: "Evde Renk / Doku Avı",
    description: "Aileden çocukla birlikte evde o gün öğrenilen renkte veya dokuda (örneğin pütürlü, parlak) üç nesne bulup fotoğraflamaları veya resmini çizmeleri istenir."
  },
  {
    id: "aile_mutfak",
    type: "aile",
    title: "Mutfakta Matematik ve Ölçme",
    description: "Aileyle birlikte kek/salata yaparken bardakla su ölçme, kaşık sayma, büyük-küçük patatesleri ayırma gibi somut matematik deneyimi önerilir."
  },
  {
    id: "aile_kitap_okuma",
    type: "aile",
    title: "Etkileşimli Kitap Okuma Saati",
    description: "Okuldan ödünç alınan bir resimli öykü kitabı yatmadan önce aileyle resimlerine bakılarak ve sorular sorularak okunur."
  },
  {
    id: "aile_konuk",
    type: "aile",
    title: "Sınıfa Aile Konuğu (Meslek / Kültür / Masal)",
    description: "Bir veli sınıfa davet edilerek mesleğini tanıtır, yöresel bir masal anlatır veya çocuklarla birlikte geleneksel bir el sanatı çalışması yapar."
  },
  {
    id: "aile_bulten",
    type: "aile",
    title: "Haftalık Gelişim Bülteni & Evde Oyun Önerisi",
    description: "O hafta ele alınan kavramları, şarkıları ve 'Evde Oyun Rehberi'nden bir oyunu içeren bilgilendirme notu aileyle paylaşılır."
  },

  // Toplum Katılımı
  {
    id: "toplum_kutuphane",
    type: "toplum",
    title: "Kütüphane Ziyareti & Üyelik Kartı",
    description: "İlçe / mahalle kütüphanesine gezi düzenlenir, sessizlik kuralları ve ödünç kitap alma süreci yerinde deneyimlenir."
  },
  {
    id: "toplum_itfaiye_saglik",
    type: "toplum",
    title: "İtfaiye / Sağlık Ocağı Ziyareti",
    description: "Toplum güvenliği ve sağlığı çalışanları yerinde ziyaret edilir, acil durumlarda yapılacaklar uygulamalı öğrenilir."
  },
  {
    id: "toplum_esnaf",
    type: "toplum",
    title: "Yerel Esnaf / Pazar Yeri Alışverişi",
    description: "Mahalle manavından veya pazarından meyve alışverişi yapılır; tartı, para alışverişi ve esnafla nezaket iletişimi kurulur."
  },
  {
    id: "toplum_cevre_projesi",
    type: "toplum",
    title: "Doğa ve Kuş Yemliği Sosyal Sorumluluk Projesi",
    description: "Çocukların artık materyallerden hazırladığı kuş yemlikleri okul bahçesindeki ve mahalledeki ağaçlara asılır; doğaya duyarlılık pekiştirilir."
  }
];

// ─── 13. BELİRLİ GÜN VE HAFTALAR (EK-8 EKSİKSİZ 35 GÜN LİSTESİ) ─────────────
export interface SpecialDayRecord {
  code: string;
  name: string;
  dateRange: string;
  month: string;
}

export const SPECIAL_DAYS_CATALOG: SpecialDayRecord[] = [
  { code: "BG_ILKOGRETIM", name: "İlköğretim Haftası", dateRange: "Eylül ayının 3. haftası", month: "Eylül" },
  { code: "BG_HAYVANLAR", name: "Hayvanları Koruma Günü", dateRange: "4 Ekim", month: "Ekim" },
  { code: "BG_CUMHURIYET", name: "Cumhuriyet Bayramı", dateRange: "29 Ekim", month: "Ekim" },
  { code: "BG_KIZILAY", name: "Kızılay Haftası", dateRange: "29 Ekim - 4 Kasım", month: "Kasım" },
  { code: "BG_ATATURK", name: "Atatürk Haftası", dateRange: "10-16 Kasım", month: "Kasım" },
  { code: "BG_AFET", name: "Afet Eğitimi Hazırlık Günü", dateRange: "12 Kasım", month: "Kasım" },
  { code: "BG_COCUK_HAKLARI", name: "Dünya Çocuk Hakları Günü", dateRange: "20 Kasım", month: "Kasım" },
  { code: "BG_OGRETMENLER", name: "Öğretmenler Günü", dateRange: "24 Kasım", month: "Kasım" },
  { code: "BG_ENGELLILER", name: "Dünya Engelliler Günü", dateRange: "3 Aralık", month: "Aralık" },
  { code: "BG_INSAN_HAKLARI", name: "İnsan Hakları ve Demokrasi Haftası", dateRange: "10 Aralık haftası", month: "Aralık" },
  { code: "BG_TUTUM_YATIRIM", name: "Tutum, Yatırım ve Türk Malları Haftası (Yerli Malı)", dateRange: "12-18 Aralık", month: "Aralık" },
  { code: "BG_YENI_YIL", name: "Yeni Yıl", dateRange: "31 Aralık - 1 Ocak", month: "Ocak" },
  { code: "BG_ENERJI", name: "Enerji Tasarrufu Haftası", dateRange: "Ocak ayının 2. haftası", month: "Ocak" },
  { code: "BG_VERGI", name: "Vergi Haftası", dateRange: "Şubat ayının son haftası", month: "Şubat" },
  { code: "BG_YESILAY", name: "Yeşilay Haftası", dateRange: "1-7 Mart", month: "Mart" },
  { code: "BG_BILIM_TEKNO", name: "Bilim ve Teknoloji Haftası", dateRange: "8-14 Mart", month: "Mart" },
  { code: "BG_ISTIKLAL_MARSI", name: "İstiklâl Marşı'nın Kabulü ve Mehmet Akif Ersoy'u Anma", dateRange: "12 Mart", month: "Mart" },
  { code: "BG_SEHITLER", name: "Şehitler Günü (Çanakkale Zaferi)", dateRange: "18 Mart", month: "Mart" },
  { code: "BG_YASLILAR", name: "Yaşlılara Saygı Haftası", dateRange: "18-24 Mart", month: "Mart" },
  { code: "BG_TURK_DUNYASI", name: "Türk Dünyası ve Toplulukları Haftası (Nevruz)", dateRange: "21 Mart", month: "Mart" },
  { code: "BG_ORMAN", name: "Orman Haftası", dateRange: "21-26 Mart", month: "Mart" },
  { code: "BG_SU_GUNU", name: "Dünya Su Günü", dateRange: "22 Mart", month: "Mart" },
  { code: "BG_TIYATRO", name: "Dünya Tiyatrolar Günü", dateRange: "27 Mart", month: "Mart" },
  { code: "BG_KUTUPHANE", name: "Kütüphaneler Haftası", dateRange: "Mart ayının son pazartesi haftası", month: "Mart" },
  { code: "BG_OTIZM", name: "Dünya Otizm Farkındalık Günü", dateRange: "2 Nisan", month: "Nisan" },
  { code: "BG_SAGLIK", name: "Dünya Sağlık Günü", dateRange: "7-13 Nisan", month: "Nisan" },
  { code: "BG_DUNYA_KITAP", name: "Dünya Kitap Günü", dateRange: "23 Nisan haftası", month: "Nisan" },
  { code: "BG_23_NISAN", name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", dateRange: "23 Nisan", month: "Nisan" },
  { code: "BG_TRAFIK", name: "Trafik ve İlk Yardım Haftası", dateRange: "Mayıs ayının ilk haftası", month: "Mayıs" },
  { code: "BG_ANNELER", name: "Anneler Günü", dateRange: "Mayıs ayının 2. pazarı", month: "Mayıs" },
  { code: "BG_ENGELLILER_HAF", name: "Engelliler Haftası", dateRange: "10-16 Mayıs", month: "Mayıs" },
  { code: "BG_MUZELER", name: "Müzeler Haftası", dateRange: "18-24 Mayıs", month: "Mayıs" },
  { code: "BG_19_MAYIS", name: "19 Mayıs Atatürk'ü Anma Gençlik ve Spor Bayramı", dateRange: "19 Mayıs", month: "Mayıs" },
  { code: "BG_CEVRE", name: "Çevre Koruma Haftası", dateRange: "Haziran ayının 2. haftası", month: "Haziran" },
  { code: "BG_BABALAR", name: "Babalar Günü", dateRange: "Haziran ayının 3. pazarı", month: "Haziran" },
  { code: "BG_15_TEMMUZ", name: "15 Temmuz Demokrasi ve Millî Birlik Günü", dateRange: "15 Temmuz", month: "Temmuz" }
];

// ─── 14. 7 ALAN GRUBU VE BECERİ TANIMLARI (EK-1 Kataloğu) ───────────────────
export interface DomainGroup {
  id: string;
  name: string;
  color: string;
  skills: { code: string; label: string; processComponents: string[] }[];
}

export const DOMAIN_GROUPS: DomainGroup[] = [
  {
    id: "turkce",
    name: "Türkçe Alanı",
    color: "blue",
    skills: [
      { code: "TADB.1", label: "Dinleme/izleme materyallerini yönetebilme", processComponents: ["TADB.1.a", "TADB.1.b"] },
      { code: "TADB.2", label: "Dinledikleri/izledikleriyle yeni anlamlar oluşturabilme", processComponents: ["TADB.2.a", "TADB.2.b"] },
      { code: "TADB.3", label: "Dinlediklerini/izlediklerini özümleyebilme", processComponents: ["TADB.3.a"] },
      { code: "TADB.4", label: "Dinledikleri/izledikleri materyalleri değerlendirebilme", processComponents: ["TADB.4.a"] },
      { code: "TAOB.1", label: "Görsel okuma materyalleri seçebilme", processComponents: ["TAOB.1.a", "TAOB.1.b"] },
      { code: "TAOB.2", label: "Görsel okuma materyallerinden anlamlar oluşturabilme", processComponents: ["TAOB.2.a", "TAOB.2.b"] },
      { code: "TAOB.3", label: "Görsel okuma materyallerini özümleyebilme", processComponents: ["TAOB.3.a"] },
      { code: "TAOB.4", label: "Görsel okuma materyallerini değerlendirebilme", processComponents: ["TAOB.4.a"] },
      { code: "TAKB.1", label: "Konuşma sürecini yönetebilme", processComponents: ["TAKB.1.a", "TAKB.1.b"] },
      { code: "TAKB.2", label: "Konuşma sürecinin içeriğini oluşturabilme", processComponents: ["TAKB.2.a", "TAKB.2.b"] },
      { code: "TAKB.3", label: "Konuşma sürecinde Türkçeyi doğru kullanabilme", processComponents: ["TAKB.3.a", "TAKB.3.b", "TAKB.3.c", "TAKB.3.ç", "TAKB.3.d", "TAKB.3.e"] },
      { code: "TAKB.4", label: "Konuşma sürecini değerlendirebilme", processComponents: ["TAKB.4.a"] },
      { code: "TAEOB.1", label: "Yazı farkındalığına ilişkin beceriler", processComponents: ["TAEOB.1.a", "TAEOB.1.b"] },
      { code: "TAEOB.2", label: "Ses bilgisel farkındalık becerileri", processComponents: ["TAEOB.2.a", "TAEOB.2.b"] },
      { code: "TAEOB.3", label: "Sözcük-harf ilişkisini açıklayabilme", processComponents: ["TAEOB.3.a"] },
      { code: "TAEOB.4", label: "Okuma öncesi becerileri kazanabilme", processComponents: ["TAEOB.4.a"] },
      { code: "TAEOB.5", label: "Yazma öncesi becerileri kazanabilme", processComponents: ["TAEOB.5.a", "TAEOB.5.b"] },
    ]
  },
  {
    id: "matematik",
    name: "Matematik Alanı",
    color: "green",
    skills: [
      { code: "MAB6.1", label: "Sayıları farklı durumlarda doğru kullanabilme (Sayma)", processComponents: ["MAB.1.a", "MAB.1.b", "MAB.1.c", "MAB.1.ç", "MAB.1.d", "MAB.1.e", "MAB.1.f"] },
      { code: "MAB1.4", label: "Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme (Muhakeme)", processComponents: ["MAB.4.a", "MAB.4.b", "MAB.4.c", "MAB.4.d", "MAB.4.e"] },
      { code: "MAB2.8", label: "Problem çözme deneyimlerini yansıtabilme", processComponents: ["MAB.8.a", "MAB.8.b", "MAB.8.c"] },
      { code: "MAB3.9", label: "Matematikle ilgili temsillerden yararlanabilme", processComponents: ["MAB.9.a", "MAB.9.b", "MAB.9.c", "MAB.9.ç"] },
      { code: "MAB3.10", label: "Matematikle ilgili temsilleri değerlendirebilme", processComponents: ["MAB.10.a", "MAB.10.b"] },
    ]
  },
  {
    id: "fen",
    name: "Fen Alanı",
    color: "teal",
    skills: [
      { code: "FAB.1", label: "Doğal çevreye yönelik bilimsel gözlem yapabilme", processComponents: ["FAB.1.a", "FAB.1.b"] },
      { code: "FAB.2", label: "Bilimsel merak ve araştırma soruları oluşturabilme", processComponents: ["FAB.2.a"] },
      { code: "FAB.9", label: "Fene yönelik basit düzeyde bilimsel modellerden faydalanabilme", processComponents: ["FAB.9.a", "FAB.9.b"] },
      { code: "FAB.12", label: "Bilimsel olayları açıklamak için kanıtlar kullanabilme", processComponents: ["FAB.12.a", "FAB.12.b", "FAB.12.c"] },
    ]
  },
  {
    id: "sosyal",
    name: "Sosyal Alan",
    color: "orange",
    skills: [
      { code: "SAB.1", label: "Kendisini ve yakın çevresini tanıyabilme", processComponents: ["SAB.1.a", "SAB.1.b"] },
      { code: "SAB.2", label: "Farklılıklara saygı duyabilme", processComponents: ["SAB.2.a"] },
      { code: "SAB.7", label: "Mekânda konumlanabilme ve basit harita/krokilerden yararlanma", processComponents: ["SAB.7.a", "SAB.7.b"] },
      { code: "SAB.9", label: "Coğrafi gözlem ve okul dışı çalışmaları çevreye duyarlı biçimde yapma", processComponents: ["SAB.9.a", "SAB.9.b"] },
    ]
  },
  {
    id: "hareket",
    name: "Hareket ve Sağlık Alanı",
    color: "red",
    skills: [
      { code: "HSAB.1", label: "Temel hareket becerilerini sergileyebilme (Yer değiştirme/denge)", processComponents: ["HSAB.1.a", "HSAB.1.b"] },
      { code: "HSAB.2", label: "Nesne kontrolü gerektiren hareketleri yapabilme", processComponents: ["HSAB.2.a", "HSAB.2.b"] },
      { code: "HSAB.5", label: "Kişisel ve genel alanın farkında olarak hareket edebilme", processComponents: ["HSAB.5.a"] },
      { code: "HSAB.6", label: "Öz bakım ve temizlik becerilerini bağımsız uygulayabilme", processComponents: ["HSAB.6.a", "HSAB.6.b"] },
    ]
  },
  {
    id: "sanat",
    name: "Sanat Alanı",
    color: "purple",
    skills: [
      { code: "SNAB.1", label: "Farklı sanat tekniklerini ve malzemelerini deneyimleyebilme", processComponents: ["SNAB.1.a", "SNAB.1.b"] },
      { code: "SNAB.2", label: "Görsel sanat çalışmalarında özgün ürünler oluşturabilme", processComponents: ["SNAB.2.a"] },
      { code: "SNAB.3", label: "Sanat eserlerini inceleyebilme ve duygu/düşüncelerini ifade etme", processComponents: ["SNAB.3.a", "SNAB.3.b"] },
    ]
  },
  {
    id: "muzik",
    name: "Müzik Alanı",
    color: "blue",
    skills: [
      { code: "MDB.1", label: "Çeşitli müzik eserlerini dinleyebilme", processComponents: ["MDB.1.a", "MDB.1.b"] },
      { code: "MDB.3", label: "Müzik eserlerindeki temel özellikleri (hızlı-yavaş tempo) ifade etme", processComponents: ["MDB.3.a"] },
      { code: "MSB.1", label: "Şarkılara sesiyle doğru eşlik edebilme", processComponents: ["MSB.1.a"] },
      { code: "MÇB.1", label: "Duyduğu seslere/müziğe vurmalı çalgılarla eşlik edebilme", processComponents: ["MÇB.1.a", "MÇB.1.ç"] },
      { code: "MHB.1", label: "Müzik ile koordineli hareket ve dans edebilme", processComponents: ["MHB.1.a"] },
    ]
  }
];

export const SUB_SKILL_DESCRIPTIONS: Record<string, string> = {
  // Türkçe
  "TADB.1.a": "Dinlemeye/izlemeye hazırlık yapar",
  "TADB.1.b": "Dinleme/izleme sürecinde dikkatini sürdürür",
  "TADB.2.a": "Dinledikleriyle ilgili tahminlerde bulunur",
  "TADB.2.b": "Tahminlerini içerikle karşılaştırır",
  "TADB.3.a": "Dinlediklerini kendi cümleleriyle açıklar",
  "TADB.4.a": "İçeriği günlük hayatıyla ilişkilendirir",
  "TAOB.1.a": "Görsel materyalleri amaca uygun seçer",
  "TAOB.1.b": "Görsel materyalin özelliklerini inceler",
  "TAOB.2.a": "Görsellerden hareketle anlamlar çıkarır",
  "TAOB.2.b": "Görseller arasındaki ilişkileri açıklar",
  "TAOB.3.a": "Görsel okuma materyallerini özetler",
  "TAOB.4.a": "Görselleri estetik yönden değerlendirir",
  "TAKB.1.a": "Konuşmayı başlatır ve sürdürür",
  "TAKB.1.b": "Konuşurken sıra bekleme kuralına uyar",
  "TAKB.2.a": "Duygu ve düşüncelerini sözlü ifade eder",
  "TAKB.2.b": "Yeni öğrendiği sözcükleri konuşmada kullanır",
  "TAKB.3.a": "Ses tonunu ve vurguları ortama göre ayarlar",
  "TAKB.3.b": "Nezaket sözcükleri kullanır",
  "TAKB.3.c": "Beden dilini konuşmasına uygun kullanır",
  "TAKB.3.ç": "Cümle yapısına uygun konuşur",
  "TAKB.3.d": "Sözcükleri doğru telaffuz eder",
  "TAKB.3.e": "Konuşurken göz teması kurar",
  "TAKB.4.a": "Kendi konuşma sürecini değerlendirir",
  "TAEOB.1.a": "Yazının yönünü ve işlevini fark eder",
  "TAEOB.1.b": "Çevresindeki yazılı sembolleri ayırt eder",
  "TAEOB.2.a": "Sözcüklerin başlangıç seslerini fark eder",
  "TAEOB.2.b": "Uyaklı ve kafiyeli sözcükleri ayırt eder",
  "TAEOB.3.a": "Seslerle harfler arasındaki ilişkiyi açıklar",
  "TAEOB.4.a": "Kitap tutma ve sayfa çevirme becerisi gösterir",
  "TAEOB.5.a": "Yazma araçlarını ergonomik tutar",
  "TAEOB.5.b": "Temel çizgi ve karalama çalışmaları yapar",

  // Matematik
  "MAB.1.a": "1'den 20'ye kadar ileriye ritmik sayar",
  "MAB.1.b": "Nesne gruplarını sayarak miktarını belirtir",
  "MAB.1.c": "Nesne gruplarını bire bir eşler",
  "MAB.1.ç": "Sıra sayılarını (birinci, ikinci...) kullanır",
  "MAB.1.d": "Rakamları tanır ve adlandırır",
  "MAB.1.e": "Geriye doğru ritmik sayma yapar",
  "MAB.1.f": "Parça-bütün ilişkisini kavrar",
  "MAB.4.a": "Nesneleri niteliklerine göre karşılaştırır",
  "MAB.4.b": "Nesneleri belirli bir ölçüte göre sıralar",
  "MAB.4.c": "Nesne miktarına ilişkin tahminde bulunur",
  "MAB.4.d": "Tahminini sayarak kontrol eder",
  "MAB.4.e": "Geometrik şekilleri tanır ve eşleştirir",
  "MAB.8.a": "Problemi kendi cümleleriyle tanımlar",
  "MAB.8.b": "Probleme farklı çözüm yolları önerir",
  "MAB.8.c": "Çözüm yolunu dener ve sonucunu açıklar",
  "MAB.9.a": "Matematiksel durumları somut nesnelerle gösterir",
  "MAB.9.b": "Basit grafik ve tabloları okur",
  "MAB.9.c": "Matematiksel sembolleri modellerde kullanır",
  "MAB.9.ç": "Örüntüyü tanır ve devam ettirir",
  "MAB.10.a": "Farklı modelleri birbiriyle karşılaştırır",
  "MAB.10.b": "Matematiksel temsilin uygunluğunu değerlendirir",

  // Fen ve Doğa
  "FAB.1.a": "Doğal varlıkları beş duyusuyla inceler",
  "FAB.1.b": "Gözlem sonuçlarını çizim ve modellerle kaydeder",
  "FAB.2.a": "Doğa olaylarıyla ilgili merak soruları sorar",
  "FAB.9.a": "Basit bilimsel düzenek ve modeller kurar",
  "FAB.9.b": "Modeller üzerinden sebep-sonuç ilişkisi kurar",
  "FAB.12.a": "Deney sonuçları için kanıtlar sunar",
  "FAB.12.b": "Neden-sonuç bağlantılarını açıklar",
  "FAB.12.c": "Doğayı korumaya yönelik çözümler üretir",

  // Sosyal Alan
  "SAB.1.a": "Kişisel özelliklerini ve ilgi alanlarını ifade eder",
  "SAB.1.b": "Aile ve okul ortamındaki rolünü açıklar",
  "SAB.2.a": "Bireysel farklılıklara saygı duyar",
  "SAB.7.a": "Mekândaki konumunu tarif eder",
  "SAB.7.b": "Basit krokileri ve yön göstergelerini okur",
  "SAB.9.a": "Çevresindeki doğal ve tarihî varlıkları korur",
  "SAB.9.b": "Geri dönüşüm ve sıfır atık ilkelerine uyar",

  // Hareket ve Sağlık
  "HSAB.1.a": "Temel yer değiştirme (koşma, zıplama) yapar",
  "HSAB.1.b": "Statik ve dinamik denge hareketlerini sergiler",
  "HSAB.2.a": "Top atma, tutma, yuvarlama hareketleri yapar",
  "HSAB.2.b": "Küçük kas becerilerini gerektiren nesneleri yönetir",
  "HSAB.5.a": "Hareket ederken kişisel ve genel alanını korur",
  "HSAB.6.a": "El yıkama, diş fırçalama ve öz bakımını bağımsız yapar",
  "HSAB.6.b": "Mevsime ve ortama uygun giyinir",

  // Sanat
  "SNAB.1.a": "Farklı boyama, baskı ve kolaj tekniklerini dener",
  "SNAB.1.b": "Kil, hamur ve 3B şekillendirme malzemelerini kullanır",
  "SNAB.2.a": "Özgün duygu ve düşüncelerini sanatla ifade eder",
  "SNAB.3.a": "Sanat eserlerini renk, çizgi ve biçim yönünden inceler",
  "SNAB.3.b": "Sanat eseri hakkındaki duygularını paylaşır",

  // Müzik
  "MDB.1.a": "Farklı türdeki müzik eserlerini dinler",
  "MDB.1.b": "Çevresindeki doğal ve yapay sesleri ayırt eder",
  "MDB.3.a": "Müzikteki hızlı-yavaş ve kuvvetli-hafif ayrımını yapar",
  "MSB.1.a": "Şarkıları sözlerine ve melodisine uygun söyler",
  "MÇB.1.a": "Ritim çalgılarıyla tempo ve ritme eşlik eder",
  "MÇB.1.ç": "Beden perküsyonu ile ritim kalıpları oluşturur",
  "MHB.1.a": "Müziğin ritmine uygun hareket ve serbest dans eder",
};
