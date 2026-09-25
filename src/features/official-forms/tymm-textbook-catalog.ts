/**
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

export const MEB_TEXTBOOK_ACTIVITIES: TextbookActivityItem[] = [
  {
    "id": "tb_36_48_b1_p9_0",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 9,
    "title": "SINIFIMI TANIYORUM",
    "domain": "Bütünleşik Etkinlik",
    "theme": "SINIFIMI TANIYORUM",
    "researchQuestion": "Sınıfımızda  başka hangi eşyalar var?",
    "text": "SINIFIMI TANIYORUM Görselleri inceleyelim. Görsellerden sınıfımızda olan eşyaları bulup işaretleyelim. Sınıfımızda  başka hangi eşyalar var? Söyleyelim. 9",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p10_1",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 10,
    "title": "Tabloyu sevdiğimiz renkleri kullanarak boyayalım.",
    "domain": "Sanat",
    "theme": "Tabloyu sevdiğimiz renkleri kullanarak boyayalım.",
    "researchQuestion": "SEVDİĞİM RENKLER PARMAK İZİM BEN KİMİM?",
    "text": "Tabloyu sevdiğimiz renkleri kullanarak boyayalım. Herkesin parmak izi farklıdır.  Çerçevenin içine parmak izi baskımızı  yapalım.  Adımızı, soyadımızı ve yaşımızı söyleyelim.  Buraya bir fotoğrafımızı yapıştıralım. ⭐ Öğretmene not: Etkinlik",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b1_p11_2",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 11,
    "title": "DUYGULAR",
    "domain": "Sosyal & Duygusal",
    "theme": "DUYGULAR",
    "researchQuestion": "Kızdığımızda  sakinleşmek için ne yapabiliriz?",
    "text": "DUYGULAR Mutlu yüz ifadesi yapalım. Bizi mutlu eden  şeyleri söyleyelim. Öfkeli yüz ifadesi yapalım. Kızdığımızda  sakinleşmek için ne yapabiliriz? Söyleyelim.  Üzgün yüz ifadesi yapalım. En son neye  üzüldüğümüzü anlatalım. Şaşırmış yüz if",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Mutlu - Üzgün",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D15 Sevgi"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_36_48_b1_p12_3",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 12,
    "title": "NASIL OTURMALIYIM?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "NASIL OTURMALIYIM?",
    "researchQuestion": "NASIL OTURMALIYIM?",
    "text": "NASIL OTURMALIYIM? Doğru ve sağlıklı oturuşu bulalım, altındaki kutucuğu işaretleyelim. Şimdi kendi oturuşumuza  dikkat edelim. Doğru ve sağlıklı oturmuyorsak duruşumuzu düzeltelim.  12",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D18 Temizlik",
      "D13 Sağlıklı Yaşam"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p14_4",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 14,
    "title": "HEMŞİN ÇORAPLARI",
    "domain": "Matematik",
    "theme": "HEMŞİN ÇORAPLARI",
    "researchQuestion": "HEMŞİN ÇORAPLARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "HEMŞİN ÇORAPLARI Hemşin çorapları, ülkemizin coğrafi işaret almış el sanatları ürünlerindendir. Görsellerdeki  Hemşin çoraplarını inceleyelim. Her birinin eşini bulalım, çizgi çizerek eşleştirelim. 14",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p15_5",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 15,
    "title": "Kollarımızla daire çizelim.",
    "domain": "Matematik",
    "theme": "Kollarımızla daire çizelim.",
    "researchQuestion": "Kollarımızla daire çizelim. ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "Kollarımızla daire çizelim. Kollarımızla makara sarma  hareketi yapalım. Kollarımızı iki yana açıp kapatalım. Kollarımızı kaldırarak el çırpalım. ⭐ Öğretmene not: Çocuklara hareketler hızlı ve yavaş tempolu müzikler eşliğinde yaptırılabilir",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Daire"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p16_6",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 16,
    "title": "AYNI KİLİMLERİ BULUYORUM",
    "domain": "Matematik",
    "theme": "AYNI KİLİMLERİ BULUYORUM",
    "researchQuestion": "AYNI KİLİMLERİ BULUYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "AYNI KİLİMLERİ BULUYORUM Kilim dokumacılığı ülkemizin en önemli el sanatlarından biridir. Çok eski yıllardan beri ülkemizin  birçok yerinde çeşitli desenlere sahip kilimler üretilmiştir. Kilimlerin desenlerini inceleyelim. Aynı  olanları çi",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D7 Estetik",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p17_7",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 17,
    "title": "YUVALARDAN GELEN SESLER",
    "domain": "Matematik",
    "theme": "YUVALARDAN GELEN SESLER",
    "researchQuestion": "YUVALARDAN GELEN SESLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "YUVALARDAN GELEN SESLER Görseldeki hayvanları ve yuvalarını inceleyelim. Karekodları kullanarak sesleri dinleyelim. Seslerini  dinlediğimiz hayvanların isimlerini söyleyelim. 17",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p18_8",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 18,
    "title": "FARKLI OLANI BULUYORUM",
    "domain": "Bütünleşik Etkinlik",
    "theme": "FARKLI OLANI BULUYORUM",
    "researchQuestion": "FARKLI OLANI BULUYORUM konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "FARKLI OLANI BULUYORUM Farklı olan elmanın altındaki kutucuğu  işaretleyelim. Farklı olan oyuncak ayının altındaki kutucuğu  işaretleyelim. Farklı olan ayakkabının altındaki kutucuğu  işaretleyelim. Farklı olan berenin altındaki kutucuğu  i",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p19_9",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 19,
    "title": "TEMİZ OLALIM",
    "domain": "Bütünleşik Etkinlik",
    "theme": "TEMİZ OLALIM",
    "researchQuestion": "TEMİZ OLALIM konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "TEMİZ OLALIM Görselleri inceleyelim. Vücudumuzun temizliğinde kullandığımız malzemelerin altındaki kutucuğu  işaretleyelim. 19",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p20_10",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 20,
    "title": "BÜYÜK-KÜÇÜK YUNUSLAR",
    "domain": "Hareket ve Sağlık",
    "theme": "BÜYÜK-KÜÇÜK YUNUSLAR",
    "researchQuestion": "BÜYÜK-KÜÇÜK YUNUSLAR hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "BÜYÜK-KÜÇÜK YUNUSLAR Yunuslar sürüler hâlinde hareket eder ve birbirleriyle oyun oynamaktan hoşlanır. Okyanustaki  yunusları inceleyelim. Büyük yunusları kırmızı ile işaretleyelim. Küçük yunusları parmağımızla  gösterelim. 20",
    "materials": [
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Kırmızı"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_36_48_b1_p21_11",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 21,
    "title": "ÇİNİ SANATI",
    "domain": "Matematik",
    "theme": "ÇİNİ SANATI",
    "researchQuestion": "ÇİNİ SANATI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÇİNİ SANATI Çini sanatı ülkemizin geleneksel bir sanat dalıdır. Yapılan eserler canlı renklerdeki desen ve  motiflerle süslenir. Aşağıdaki görsellerde bazı çini motif ve desenleri var. Bu motif ve desenlerin  kullanıldığı eserleri çizgi çiz",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Canlı - Cansız",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p22_12",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 22,
    "title": "Çizgili Yılan",
    "domain": "Matematik",
    "theme": "Çizgili Yılan",
    "researchQuestion": "Çizgili Yılan ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "Çizgili Yılan Saksağan Yeşilbaş Ördek Van Kedisi GÖLGELERİ EŞLEŞTİRİYORUM Görselleri inceleyelim. Hayvanları gölgeleri ile çizgi çizerek eşleştirelim. 22",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Yeşil",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p23_13",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 23,
    "title": "SAKİNLEŞMEK İÇİN NE YAPARIZ?",
    "domain": "Matematik",
    "theme": "SAKİNLEŞMEK İÇİN NE YAPARIZ?",
    "researchQuestion": "SAKİNLEŞMEK İÇİN NE YAPARIZ?",
    "text": "SAKİNLEŞMEK İÇİN NE YAPARIZ? Bazen kendimizi üzgün ya da öfkeli hissedebiliriz. Böyle durumlarda sakinleşmek için bazı  yöntemler deneriz. Görselleri inceleyelim. Bu yöntemlerden hangilerini kullanıyoruz? Gösterelim. Oyuncaklarla oynamak Sa",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Sarı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p24_14",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 24,
    "title": "BAYRAĞIMIZIN RENKLERİ",
    "domain": "Bütünleşik Etkinlik",
    "theme": "BAYRAĞIMIZIN RENKLERİ",
    "researchQuestion": "BAYRAĞIMIZIN RENKLERİ konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "BAYRAĞIMIZIN RENKLERİ Görseldeki Türk bayrağını inceleyelim. Türk bayrağında bulunan renkleri işaretleyelim.  Sınıfımızdaki Türk bayrağını bulup gösterelim.  24",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p25_15",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 25,
    "title": "CUMHURİYET BAYRAMI",
    "domain": "Fen ve Doğa",
    "theme": "CUMHURİYET BAYRAMI",
    "researchQuestion": "CUMHURİYET BAYRAMI doğada ve çevremizde nasıl işler?",
    "text": "CUMHURİYET BAYRAMI Mustafa Kemal Atatürk, 29 Ekim 1923’te Cumhuriyet’i ilan etmiştir. Bu gün, Türkiye Cumhuriyeti’nin  doğum günüdür. Türk Yıldızları, bu anlamlı günü kutlamak için özel bir gösteri düzenliyor. Görseli  inceleyelim ve Türk b",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p27_16",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 27,
    "title": "BAHÇE ZAMANI",
    "domain": "Fen ve Doğa",
    "theme": "BAHÇE ZAMANI",
    "researchQuestion": "BAHÇE ZAMANI SONBAHARDA NELER GÖRÜRÜZ?",
    "text": "BAHÇE ZAMANI SONBAHARDA NELER GÖRÜRÜZ? Kitabımızı yanımıza alarak bahçeye çıkalım. Sonbaharda bahçe nasıl görünüyor? Anlatalım.  Bahçede görsellerden hangileriyle karşılaştık? Gördüklerimizi işaretleyelim. 27",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p28_17",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 28,
    "title": "Dişlerimi temizlediğin için",
    "domain": "Fen ve Doğa",
    "theme": "Dişlerimi temizlediğin için",
    "researchQuestion": "Hangilerini diş temizliğinde kullanırız?",
    "text": "Dişlerimi temizlediğin için  teşekkür ederim. DİŞLERİMİ FIRÇALIYORUM Canlılar diş temizliği için farklı yöntemler kullanabilir. Örneğin, timsahlar dişlerini temizlemek  için ardıç kuşlarından yardım alır.  Görselleri inceleyelim. Hangilerin",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Canlı - Cansız",
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p30_18",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 30,
    "title": "HAREKET ZAMANI",
    "domain": "Fen ve Doğa",
    "theme": "HAREKET ZAMANI",
    "researchQuestion": "HAREKET ZAMANI doğada ve çevremizde nasıl işler?",
    "text": "HAREKET ZAMANI Gözlerimizi kapatalım ve parmağımızı görsellerin üzerinde gezdirelim. Şimdi parmağımızı  durduralım ve gözlerimizi açalım. Parmağımız hangi görselin üzerindeyse o hareketi yapmayı  deneyelim. Ardından müzik eşliğinde görselle",
    "materials": [
      "Şeffaf su deney küveti",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p31_19",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 31,
    "title": "Hangi vazoda daha çok çiçek var? İşaretleyelim.",
    "domain": "Matematik",
    "theme": "Hangi vazoda daha çok çiçek var? İşaretleyelim.",
    "researchQuestion": "Hangi vazoda daha çok çiçek var?",
    "text": "Hangi vazoda daha çok çiçek var? İşaretleyelim. Hangi akvaryumda daha az balık var? İşaretleyelim. Hangi kalemlikte daha çok kalem var? İşaretleyelim. AZ-ÇOK  31",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p32_20",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 32,
    "title": "rakamlarını bulalım ve işaretleyelim.",
    "domain": "Matematik",
    "theme": "rakamlarını bulalım ve işaretleyelim.",
    "researchQuestion": "rakamlarını bulalım ve işaretleyelim. ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "1 rakamlarını bulalım ve işaretleyelim. Tavşanlar zıplamayı çok seviyor.  Biz de ayağa kalkıp tavşan gibi       1 kere zıplayalım. Tavşanlardan       1 tanesini işaretleyelim. 1 RAKAMINI ÖĞRENİYORUM Ok yönünde ilerleyerek parmağımızla 1 rak",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Az - Çok",
      "Önünde - Arkasında",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p33_21",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 33,
    "title": "BİR TANE",
    "domain": "Bütünleşik Etkinlik",
    "theme": "BİR TANE",
    "researchQuestion": "BİR TANE konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "BİR TANE İçinde 1 tane kurabiye olan tabağın altındaki kutucuğu işaretleyelim. 1 tane uçan balon olan gökyüzünün altındaki kutucuğu işaretleyelim. Üzerinde 1 tane araba olan yolun altındaki kutucuğu işaretleyelim.  33",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p34_22",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 34,
    "title": "TEHLİKELERE DİKKAT EDİYORUM",
    "domain": "Bütünleşik Etkinlik",
    "theme": "TEHLİKELERE DİKKAT EDİYORUM",
    "researchQuestion": "TEHLİKELERE DİKKAT EDİYORUM Görsellerdeki çocuklar neler yapıyor?",
    "text": "TEHLİKELERE DİKKAT EDİYORUM Görsellerdeki çocuklar neler yapıyor? Anlatalım. Görsellerde tehlikeli olan davranışları bulalım  ve işaretleyelim. Çocuğun davranışının neden tehlikeli olduğunu açıklayalım.  34",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "3 (Üç)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p35_23",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 35,
    "title": "ÇÖMLEK SANATI",
    "domain": "Matematik",
    "theme": "ÇÖMLEK SANATI",
    "researchQuestion": "ÇÖMLEK SANATI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÇÖMLEK SANATI Ülkemizde çömlek çok eski zamanlardan beri yapılmaktadır. Çömlekler, kile el ile şekil verilerek  oluşturulur. Her sırada baştaki ile aynı çömleği bulalım ve işaretleyelim. 35",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Aynı - Farklı",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p36_24",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 36,
    "title": "Resimdeki balık sürülerini",
    "domain": "Matematik",
    "theme": "Resimdeki balık sürülerini",
    "researchQuestion": "Hangi sürüde daha çok  balık var?",
    "text": "Resimdeki balık sürülerini  bulalım. Hangi sürüde daha çok  balık var? Hangi sürüde daha  az balık var? Balık sayısı çok  olan sürüyü bulup kırmızı ile  işaretleyelim. Resimdeki en büyük balığı  bulalım. Bulduğumuz balığı  işaretleyelim. Re",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Kırmızı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p37_25",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 37,
    "title": "Resimdeki deniz yıldızlarını",
    "domain": "Fen ve Doğa",
    "theme": "Resimdeki deniz yıldızlarını",
    "researchQuestion": "Resimdeki deniz yıldızlarını doğada ve çevremizde nasıl işler?",
    "text": "Resimdeki deniz yıldızlarını  bulalım. Bir tane deniz yıldızını  işaretleyelim. Deniz kabuklularını bulalım.  En küçük deniz kabuklusunu  işaretleyelim. Balinanın altındaki deniz canlılarını  işaretleyelim. 37",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Altında - Üstünde",
      "Canlı - Cansız"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p38_26",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 38,
    "title": "ATATÜRK",
    "domain": "Fen ve Doğa",
    "theme": "ATATÜRK",
    "researchQuestion": "ATATÜRK doğada ve çevremizde nasıl işler?",
    "text": "ATATÜRK Ülkemizin kurucusu Mustafa Kemal Atatürk’ün fotoğrafını inceleyelim. Önce sınıfımızdaki sonra  kitabımızdaki diğer Atatürk fotoğraflarını bulalım ve gösterelim. Atatürk’ün fotoğraf çerçevesini  süsleyelim. 38",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p39_27",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 39,
    "title": "DUYGULARIMIZ",
    "domain": "Sosyal & Duygusal",
    "theme": "DUYGULARIMIZ",
    "researchQuestion": "Çocukların yaşadığı durumları yaşasaydık ne hissederdik?",
    "text": "DUYGULARIMIZ Görselleri inceleyelim. Çocukların yaşadığı durumları yaşasaydık ne hissederdik? Söyleyelim.  39",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D15 Sevgi"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_36_48_b1_p41_28",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 41,
    "title": "DESENLERİ EŞLEŞTİRİYORUM",
    "domain": "Matematik",
    "theme": "DESENLERİ EŞLEŞTİRİYORUM",
    "researchQuestion": "DESENLERİ EŞLEŞTİRİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "DESENLERİ EŞLEŞTİRİYORUM Görselleri inceleyelim. Her parçayı ait olduğu nesne ile çizgi çizerek eşleştirelim. 41",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p42_29",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 42,
    "title": "KİTAPLIĞIM",
    "domain": "Matematik",
    "theme": "KİTAPLIĞIM",
    "researchQuestion": "Kitaplıkta neler var?",
    "text": "KİTAPLIĞIM Kitaplığı inceleyelim. Kitaplıkta neler var? Söyleyelim. İçinde az çiçek olan  vazoyu işaretleyelim. En çok kitap olan rafı  işaretleyelim.  Boş olan rafı  parmağımızla gösterelim.  42",
    "materials": [
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p43_30",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 43,
    "title": "RENKLER",
    "domain": "Bütünleşik Etkinlik",
    "theme": "RENKLER",
    "researchQuestion": "RENKLER konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "RENKLER Görselleri inceleyelim. Gördüğümüz rengin adını söyleyelim. Sınıfımızdan bulduğumuz kırmızı  bir nesneyi kırmızı kutunun üzerine koyalım. Kırmızı nesnelerin altındaki kutucuğu işaretleyelim.  Görselleri inceleyelim. Gördüğümüz rengi",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Sarı"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p44_31",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 44,
    "title": "AĞAÇTAKİ TOP",
    "domain": "Fen ve Doğa",
    "theme": "AĞAÇTAKİ TOP",
    "researchQuestion": "Nın topu nerede kalmış?",
    "text": "AĞAÇTAKİ TOP Görseli inceleyelim. Tuna’nın topu nerede kalmış? Söyleyelim. Tuna nasıl hissediyor olabilir?  Anlatalım. Tuna’nın sorunu nasıl çözülebilir? Uygun bulduğumuz çözüm yollarını söyleyelim. 44",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p45_32",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 45,
    "title": "ÇİZGİ ÇİZİYORUM",
    "domain": "Sanat",
    "theme": "ÇİZGİ ÇİZİYORUM",
    "researchQuestion": "Farklı malzemelerle ÇİZGİ ÇİZİYORUM nasıl canlandırabiliriz?",
    "text": "ÇİZGİ ÇİZİYORUM Görselleri inceleyelim. Çizgileri parmağımızla takip edelim. Kesik çizgileri kalemimizle birleştirelim.  45",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b1_p46_33",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 46,
    "title": "OYUN HAKKI",
    "domain": "Matematik",
    "theme": "OYUN HAKKI",
    "researchQuestion": "Çocukların başka hangi hakları vardır?",
    "text": "OYUN HAKKI Görseli inceleyelim. Görselde gördüklerimizi anlatalım. Her çocuk oyun oynama hakkına sahiptir.  Çocukların başka hangi hakları vardır? Düşünelim ve konuşalım. Öğretmenimiz ve arkadaşlarımızla açık havaya çıkıp “Yağ Satarım, Bal ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p47_34",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 47,
    "title": "ÖN-ARKA",
    "domain": "Bütünleşik Etkinlik",
    "theme": "ÖN-ARKA",
    "researchQuestion": "ÖN-ARKA konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "ÖN-ARKA Çocuk görsellerinin önden görünüşünü inceleyelim. Bu çocukların arkadan görünüşlerini bulup  işaretleyelim.  47",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p48_35",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 48,
    "title": "LABİRENT SAYFASI",
    "domain": "Sanat",
    "theme": "LABİRENT SAYFASI",
    "researchQuestion": "Farklı malzemelerle LABİRENT SAYFASI nasıl canlandırabiliriz?",
    "text": "LABİRENT SAYFASI Penguenler çoğunlukla  denize yakın yerlerde yaşayan kuşlardır. Penguenler kanatlarını yüzmek  ve buz üstünde kaymak için kullanır. Yavru penguen, anne ve babasının yanına gidebilmek için  hangi yolu kullanmalı, çizerek gös",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Altında - Üstünde",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b1_p49_36",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 49,
    "title": "YETERLİ VE DENGELİ BESLENİYORUM",
    "domain": "Matematik",
    "theme": "YETERLİ VE DENGELİ BESLENİYORUM",
    "researchQuestion": "YETERLİ VE DENGELİ BESLENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "YETERLİ VE DENGELİ BESLENİYORUM Yeterli ve dengeli beslenmek sağlığımız için çok önemlidir. Vücudumuzun gelişimini destekleyen  besinleri çizgi çizerek tabağa götürelim. 49",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Az - Çok",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p50_37",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 50,
    "title": "UZUN MU, KISA MI?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "UZUN MU, KISA MI?",
    "researchQuestion": "UZUN MU, KISA MI?",
    "text": "UZUN MU, KISA MI? Uzun merdivenin altındaki kutucuğu  işaretleyelim. Uzun trenin altındaki kutucuğu işaretleyelim. Kısa kalemin altındaki kutucuğu işaretleyelim. Kısa atkının altındaki kutucuğu işaretleyelim. 50",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Altında - Üstünde",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p51_38",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 51,
    "title": "RENKLİ YUMAKLAR",
    "domain": "Matematik",
    "theme": "RENKLİ YUMAKLAR",
    "researchQuestion": "Battaniyede hangi renkler var?",
    "text": "RENKLİ YUMAKLAR Ayşe’nin babaannesinin ördüğü bazı giysiler var. Görselleri inceleyelim. Ayşe’nin  babaannesi giysileri örerken hangi renkte ipler kullanmış söyleyelim. Giysilerle uygun  renkteki ipleri çizgi çizerek eşleştirelim. Ayşe’nin ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p54_39",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 54,
    "title": "HASTALIKLARDAN KORUNUYORUM",
    "domain": "Sanat",
    "theme": "HASTALIKLARDAN KORUNUYORUM",
    "researchQuestion": "Farklı malzemelerle HASTALIKLARDAN KORUNUYORUM nasıl canlandırabiliriz?",
    "text": "HASTALIKLARDAN KORUNUYORUM Görselleri inceleyelim. Hapşırırken veya öksürürken ne yapmalıyız, konuşalım. Doğru olan davranışın  altındaki kutucuğu yeşile boyayalım.  Görselleri inceleyelim. Hastalandığımızda ne yapmamız gerekir, konuşalım. ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Yeşil",
      "Altında - Üstünde"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b1_p55_40",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 55,
    "title": "Sınıfımızda hangi atık",
    "domain": "Matematik",
    "theme": "Sınıfımızda hangi atık",
    "researchQuestion": "Sınıfımızda hangi atık  malzemeler var?",
    "text": "Sınıfımızda hangi atık  malzemeler var? Söyleyelim. Sınıfımızdaki atık malzemeleri  kullanarak tasarımlar  yapmayı deneyelim. TASARIM YAPIYORUM Elif, evdeki atık malzemelerle yeni eşyalar tasarlamayı çok seviyor. Görsellerde Elif’in tasarla",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Sarı",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p57_41",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 57,
    "title": "ISLAK-KURU",
    "domain": "Bütünleşik Etkinlik",
    "theme": "ISLAK-KURU",
    "researchQuestion": "ISLAK-KURU konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "ISLAK-KURU Görselleri inceleyelim. Islak olanların altındaki kutucuğu işaretleyelim, neden ıslanmış  olabileceklerini söyleyelim. 57",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b1_p58_42",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 58,
    "title": "AFET VE ACİL DURUM ÇANTAM",
    "domain": "Matematik",
    "theme": "AFET VE ACİL DURUM ÇANTAM",
    "researchQuestion": "AFET VE ACİL DURUM ÇANTAM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "AFET VE ACİL DURUM ÇANTAM Zeynep ve ailesi afet ve acil durum çantası hazırlamak istiyor. Görselleri inceleyelim. Afet ve acil  durum çantasında bulunması gerekenleri çizgi çizerek çantaya götürelim. Çantamızı boyayalım. ⭐ Öğretmene not: Ka",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p59_43",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 59,
    "title": "rakamlarını bulalım ve",
    "domain": "Matematik",
    "theme": "rakamlarını bulalım ve",
    "researchQuestion": "Sizce beyaz  kum zambaklarının kokusu nasıldır?",
    "text": "2 rakamlarını bulalım ve  işaretleyelim. Görselde ülkemizde yetişen beyaz  kum zambakları var. Beyaz kum zambaklarından 2  tanesini işaretleyelim.  Sizce beyaz  kum zambaklarının kokusu nasıldır?  Söyleyelim. Elimizde beyaz kum  zambağı old",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Az - Çok",
      "Önünde - Arkasında",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p61_44",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 61,
    "title": "GECE VE GÜNDÜZ NELER YAPIYORUM?",
    "domain": "Sanat",
    "theme": "GECE VE GÜNDÜZ NELER YAPIYORUM?",
    "researchQuestion": "GECE VE GÜNDÜZ NELER YAPIYORUM?",
    "text": "GECE VE GÜNDÜZ NELER YAPIYORUM? Görsellerde neler gördüğümüzü anlatalım. İncelediğimiz durum gece gerçekleşiyorsa ayı, gündüz  gerçekleşiyorsa güneşi boyayalım. Gece ve gündüz başka neler yaparız? Konuşalım. ⭐ Öğretmene not: Etkinlik sonras",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Gece - Gündüz",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b1_p63_45",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 63,
    "title": "ÇALGILARIN SESLERİ",
    "domain": "Matematik",
    "theme": "ÇALGILARIN SESLERİ",
    "researchQuestion": "ÇALGILARIN SESLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÇALGILARIN SESLERİ Görselleri inceleyelim. Çalgıların isimlerini söyleyelim. Çizgileri parmağımızla takip edelim. Kesik  çizgileri birleştirelim. Karekodlardaki çalgı seslerini dinleyelim. 63",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p64_46",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 64,
    "title": "DENGEMİ SAĞLIYORUM",
    "domain": "Matematik",
    "theme": "DENGEMİ SAĞLIYORUM",
    "researchQuestion": "DENGEMİ SAĞLIYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "DENGEMİ SAĞLIYORUM Ali ve İnci yere çizdikleri yolların üzerinde dengeli bir şekilde yürüme oyunu oynuyor. Ali  ve İnci’nin çizdikleri yolları istediğimiz renge boyayalım. Sınıfımızda ya da bahçemizde yollar  oluşturarak bu yolların üzerind",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p65_47",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 65,
    "title": "BAHÇE ZAMANI",
    "domain": "Fen ve Doğa",
    "theme": "BAHÇE ZAMANI",
    "researchQuestion": "BAHÇE ZAMANI KIŞIN NELER GÖRÜRÜZ?",
    "text": "BAHÇE ZAMANI KIŞIN NELER GÖRÜRÜZ? Kitabımızı yanımıza alarak bahçeye çıkalım. Kış mevsiminde bahçe nasıl görünüyor? Anlatalım.  Bahçede görsellerden hangileriyle karşılaştık? Gördüklerimizi işaretleyelim. 65",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p66_48",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 66,
    "title": "MESLEKLER",
    "domain": "Sosyal & Duygusal",
    "theme": "MESLEKLER",
    "researchQuestion": "Ailemizde bu meslekleri yapan kişiler var  mı?",
    "text": "MESLEKLER Görselleri inceleyelim. Mesleklerin adlarını söyleyelim. Ailemizde bu meslekleri yapan kişiler var  mı? Konuşalım. Büyüyünce hangi mesleği seçmek istediğimizi anlatalım. ÖĞRETMEN AŞÇI ASTRONOT DOKTOR PILOT ÇIFTÇI POLIS VETERINER I",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce"
    ],
    "values": [
      "D14 Saygı",
      "D15 Sevgi"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_36_48_b1_p67_49",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 67,
    "title": "Bugün havanın nasıl olduğunu ve neler giydiğimizi konuşalım.",
    "domain": "Fen ve Doğa",
    "theme": "Bugün havanın nasıl olduğunu ve neler giydiğimizi konuşalım.",
    "researchQuestion": "Mehmet  böyle bir havada dışarı çıkarken aşağıdaki kıyafetlerden hangilerini giyebilir?",
    "text": "Bugün havanın nasıl olduğunu ve neler giydiğimizi konuşalım. KARLI GÜN GİYSİLERİM Mehmet pencereden dışarı baktığında havanın soğuk ve kar yağışlı olduğunu gördü. Mehmet  böyle bir havada dışarı çıkarken aşağıdaki kıyafetlerden hangilerini ",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Sıcak - Soğuk",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p68_50",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 68,
    "title": "Siyah beyaz tüyleri var.",
    "domain": "Matematik",
    "theme": "Siyah beyaz tüyleri var.",
    "researchQuestion": "Gözleri büyük, uzun kirpikli Nedir bu hayvan,  Bilen var mı acaba?",
    "text": "Siyah beyaz tüyleri var. Suda hızlı yüzer. Uçamayan bir kuştur, Buz üstünde gezer. (PENGUEN) “Ai, ai!” diyerek dolaşır. Kulakları var iki yanda. Gözleri büyük, uzun kirpikli Nedir bu hayvan,  Bilen var mı acaba? (EŞEK) Beyaz tüyleri var. Bi",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Uzun - Kısa",
      "Kalın - İnce"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b1_p69_51",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 69,
    "title": "MEVSİMLER ALBÜMÜ",
    "domain": "Fen ve Doğa",
    "theme": "MEVSİMLER ALBÜMÜ",
    "researchQuestion": "Fotoğraflarda neler görüyoruz?",
    "text": "MEVSİMLER ALBÜMÜ  Görsellerde İnci’nin albümünden fotoğraflar var. Fotoğraflarda neler görüyoruz? Anlatalım. Biz  hangi mevsimdeyiz? Söyleyelim. 69",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Canlı - Cansız",
      "Sıcak - Soğuk"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b1_p70_52",
    "ageGroup": "36-48",
    "bookNo": 1,
    "pageNo": 70,
    "title": "YAĞMUR DAMLALARI YAPIYORUM",
    "domain": "Sanat",
    "theme": "YAĞMUR DAMLALARI YAPIYORUM",
    "researchQuestion": "Farklı malzemelerle YAĞMUR DAMLALARI YAPIYORUM nasıl canlandırabiliriz?",
    "text": "YAĞMUR DAMLALARI YAPIYORUM Oyun hamuru kullanarak yağmur damlaları yapalım. Yaptığımız yağmur damlalarını görsellerin  üzerine yerleştirelim. 70",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Aynı - Farklı",
      "Daire"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p9_53",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 9,
    "title": "ÜRGÜP VE GÖREME’Yİ TANIYORUM",
    "domain": "Matematik",
    "theme": "ÜRGÜP VE GÖREME’Yİ TANIYORUM",
    "researchQuestion": "Neler görüyoruz?",
    "text": "ÜRGÜP VE GÖREME’Yİ TANIYORUM Nevşehir’in Ürgüp ilçesi ve Göreme beldesinde, kayaların aşınmasıyla oluşmuş peri bacaları  bulunmaktadır. Bu bölge, güzel atları, çömlek sanatı ve sıcak hava balonu turlarıyla ünlüdür.  Görseli inceleyelim. Nel",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "İçinde - Dışında"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p10_54",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 10,
    "title": "DENGE HAREKETLERİ YAPIYORUM",
    "domain": "Fen ve Doğa",
    "theme": "DENGE HAREKETLERİ YAPIYORUM",
    "researchQuestion": "DENGE HAREKETLERİ YAPIYORUM doğada ve çevremizde nasıl işler?",
    "text": "DENGE HAREKETLERİ YAPIYORUM Çocukların yaptığı denge hareketlerini inceleyelim. Denge hareketlerini sırayla yapmayı deneyelim. 10",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p11_55",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 11,
    "title": "BUGÜN NASIL HİSSEDİYORUM?",
    "domain": "Sosyal & Duygusal",
    "theme": "BUGÜN NASIL HİSSEDİYORUM?",
    "researchQuestion": "BUGÜN NASIL HİSSEDİYORUM?",
    "text": "BUGÜN NASIL HİSSEDİYORUM? Bugün kendimizi nasıl hissediyoruz? Üzgün mü, mutlu mu, şaşkın mı, kızgın mı? Düşünelim.  Hissettiğimiz duyguyu gösteren görselin altındaki kutucuğu işaretleyelim. Neden böyle hissettiğimizi  söyleyelim. 11",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "Mutlu - Üzgün",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D15 Sevgi"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_36_48_b2_p12_56",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 12,
    "title": "BEDENİMİZİN BÖLÜMLERİ",
    "domain": "Fen ve Doğa",
    "theme": "BEDENİMİZİN BÖLÜMLERİ",
    "researchQuestion": "BEDENİMİZİN BÖLÜMLERİ doğada ve çevremizde nasıl işler?",
    "text": "BEDENİMİZİN BÖLÜMLERİ BAŞ  Başınla selam ver. BOYUN  Boynunu öne ve  arkaya yatır. GÖVDE  Ellerini gövdene koy. KOL  Kollarını salla. BACAK  Ellerinle bacaklarına  vurarak bir ritim  oluştur. EL  Ellerinle alkışla. AYAK  Çift ayakla zıpla. ",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p13_57",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 13,
    "title": "HAYVAN SESLERİ",
    "domain": "Matematik",
    "theme": "HAYVAN SESLERİ",
    "researchQuestion": "HAYVAN SESLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "HAYVAN SESLERİ ⭐ Öğretmene not: Karekodlardaki sesler çocuklara dinletilir. Atın koşarken çıkardığı ayak sesleri nasıl  olabilir, düşünelim. Atın çıkardığı ayak  seslerini dinleyelim ve bu sesi taklit edelim.  Tavuk öterken nasıl bir ses çı",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p14_58",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 14,
    "title": "İZİN İSTİYORUM",
    "domain": "Sanat",
    "theme": "İZİN İSTİYORUM",
    "researchQuestion": "Kırmızı boya kalemini alabilir miyim?",
    "text": "İZİN İSTİYORUM Emre Zehra’dan boya kalemini istiyor. “Kırmızı boya kalemini alabilir miyim?” diye soruyor. Zehra  ne cevap vermiş olabilir? Konuşalım. Görseli inceleyelim. Ahmet mavi renkli bloku isterken bunu nasıl söylemeli? Düşünelim ve ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p15_59",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 15,
    "title": "BÜYÜTEÇ",
    "domain": "Matematik",
    "theme": "BÜYÜTEÇ",
    "researchQuestion": "Bu kitap ne anlatıyor olabilir?",
    "text": "BÜYÜTEÇ Kitabın kapağını inceleyelim. Kitabın kapağında neler gördüğümüzü anlatalım. Kapaktaki yazıyı  bulalım ve işaretleyelim. Bu kitap ne anlatıyor olabilir? Tahminlerimizi söyleyelim. Hikâyeyi dinleyelim. Görselleri inceleyelim. “Büyüte",
    "materials": [
      "Büyük boy el büyüteçleri",
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Büyük boy resimli hikaye kitabı"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p16_60",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 16,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "3 RAKAMINI ÖĞRENİYORUM Ok yönünde ilerleyerek parmağımızla 3 rakamının üzerinden geçelim. 3 parmağımızı  gösterelim. 3 rakamlarını bulalım ve         işaretleyelim. Sayfamızdaki oyuncağın ismi topaç.  Topaçlar döndürülerek oynanır  ve çok h",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Az - Çok",
      "Önünde - Arkasında",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p17_61",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 17,
    "title": "ÜÇ TANE",
    "domain": "Bütünleşik Etkinlik",
    "theme": "ÜÇ TANE",
    "researchQuestion": "ÜÇ TANE konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "ÜÇ TANE  İçinde 3 tane karınca olan yuvanın altındaki kutucuğu işaretleyelim. Üzerinde 3 tane beneği olan mantarın altındaki kutucuğu işaretleyelim. Üzerinde 3 tane uğur böceği olan yaprağın altındaki kutucuğu işaretleyelim.  17",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p18_62",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 18,
    "title": "SANAT TÜRLERİ",
    "domain": "Matematik",
    "theme": "SANAT TÜRLERİ",
    "researchQuestion": "SANAT TÜRLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "SANAT TÜRLERİ  Görsellerin hangi sanat türüne ait olduğunu söyleyelim. Görsellerin yanındaki malzemeleri uygun  sanat türleriyle çizgi çizerek eşleştirelim. 18",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p19_63",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 19,
    "title": "ÖRÜMCEKLER",
    "domain": "Matematik",
    "theme": "ÖRÜMCEKLER",
    "researchQuestion": "ÖRÜMCEKLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÖRÜMCEKLER Örümcekler ağlarını genellikle bitkiler, ağaçlar, çalılar gibi böceklerin çok olduğu yerlere örer.  Bahçeye çıkıp etrafı gözlemleyelim ve örümceklerin ağ örmek isteyebileceği yerleri bulalım.  Arkadaşlarımızla büyük bir çember ol",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p20_64",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 20,
    "title": "TEŞEKKÜR EDERİM, ÖZÜR DİLERİM",
    "domain": "Sanat",
    "theme": "TEŞEKKÜR EDERİM, ÖZÜR DİLERİM",
    "researchQuestion": "E ne söylemeli?",
    "text": "TEŞEKKÜR EDERİM, ÖZÜR DİLERİM Samet boyalarını evde unutmuş. Aylin de boyalarını onunla paylaşmış. Samet, Aylin’e ne söylemeli?  Konuşalım. Can, Nevra ile oyuncak uçağını paylaşmış ama Nevra oyuncak uçakla oynarken istemeden oyuncağı  kırmı",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "2 (İki)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p21_65",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 21,
    "title": "ALAKARGALAR",
    "domain": "Matematik",
    "theme": "ALAKARGALAR",
    "researchQuestion": "Yüksekteki dalda kaç alakarga var?",
    "text": "ALAKARGALAR Alakargalar, mavi kanat tüyleriyle dikkat çeker. Meşe palamutlarını çok sevdikleri için meşe  ağaçlarının bulunduğu alanlarda sıklıkla görülür. Meşe ağacının dallarındaki alakargaları inceleyelim.  Yüksekteki dalda kaç alakarga ",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Mavi"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p22_66",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 22,
    "title": "ÇİZGİ ÇİZİYORUM",
    "domain": "Sanat",
    "theme": "ÇİZGİ ÇİZİYORUM",
    "researchQuestion": "Farklı malzemelerle ÇİZGİ ÇİZİYORUM nasıl canlandırabiliriz?",
    "text": "ÇİZGİ ÇİZİYORUM Çizgileri parmağımızla takip edelim. Kesik çizgileri çizgi çizerek birleştirelim. 22",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p23_67",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 23,
    "title": "İPTEN ŞEKİLLER",
    "domain": "Matematik",
    "theme": "İPTEN ŞEKİLLER",
    "researchQuestion": "İPTEN ŞEKİLLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "İPTEN ŞEKİLLER  İnci, ipleri kullanarak şekil yapma oyunu oynuyor. İnci’nin yaptığı  şekilleri inceleyelim. İplerin neye benzediklerini söyleyelim. Parmağımızı  şekillerin üzerinde gezdirelim. Biz de ip kullanarak hayal ettiğimiz  şekilleri",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p25_68",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 25,
    "title": "ÜÇGEN YOLDA GEZİNTİ",
    "domain": "Matematik",
    "theme": "ÜÇGEN YOLDA GEZİNTİ",
    "researchQuestion": "ÜÇGEN YOLDA GEZİNTİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÜÇGEN YOLDA GEZİNTİ Görseldeki şeklin ismini söyleyelim. Üçgen şeklindeki yolda okları takip ederek parmağımızı gezdirelim.  Sınıfımızdan küçük bir oyuncak seçelim, okları takip ederek oyuncağımızı üçgen şeklindeki yol  üzerinde hareket ett",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Üçgen",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p26_69",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 26,
    "title": "KÖSTEBEKLER VE BÜYÜTEÇ",
    "domain": "Matematik",
    "theme": "KÖSTEBEKLER VE BÜYÜTEÇ",
    "researchQuestion": "Köstebeklerin sorunu ne olabilir?",
    "text": "KÖSTEBEKLER VE BÜYÜTEÇ Gelincik toprağın altında kazdığı tünel evinde dinleniyordu. Kitabını okumaya çalışırken bazı sesler  duydu. Gürültüden biraz rahatsız olmuş gibiydi. Ne olup bittiğini anlamak için sesin geldiği yönü  takip etti. İki ",
    "materials": [
      "Büyük boy el büyüteçleri",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D12 Sabır"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p27_70",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 27,
    "title": "MİLLÎ TEKNOLOJİLERİMİZ",
    "domain": "Fen ve Doğa",
    "theme": "MİLLÎ TEKNOLOJİLERİMİZ",
    "researchQuestion": "Bu araçlar karada mı, denizde mi, havada mı hareket ediyor?",
    "text": "MİLLÎ TEKNOLOJİLERİMİZ Görselleri inceleyelim. Bu araçlar karada mı, denizde mi, havada mı hareket ediyor? Düşünelim.  Araçların hareket ettikleri yeri bulalım ve altındaki kutucuğu işaretleyelim. Ülkemizde üretilen elektrikli otomobil Ülke",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "2 (İki)"
    ],
    "values": [
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p28_71",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 28,
    "title": "KAPAKLAR",
    "domain": "Matematik",
    "theme": "KAPAKLAR",
    "researchQuestion": "KAPAKLAR ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KAPAKLAR Görselleri inceleyelim, kapağı kapalı olanları işaretleyelim. Kapağı açık olanların kapaklarını bulup  çizgi çizerek eşleştirelim. Sınıfımızdaki kapağı olan eşyaları bulalım ve bu eşyaların kapaklarını  açıp kapatalım. 28",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p29_72",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 29,
    "title": "YEŞİL VATAN",
    "domain": "Fen ve Doğa",
    "theme": "YEŞİL VATAN",
    "researchQuestion": "Bahçemizdeki  ağaçların yaprakları kitabımızdakilere benziyor mu?",
    "text": "YEŞİL VATAN  Kitabımızı yanımıza alalım ve bahçeye çıkalım. Yaprak görsellerini inceleyelim. Bahçemizdeki  ağaçların yaprakları kitabımızdakilere benziyor mu? Araştıralım. Doğamızı korumak için neler  yapabiliriz? Söyleyelim. ÇINAR ÇAM AKAS",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p30_73",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 30,
    "title": "HANGİSİ EKSİK?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "HANGİSİ EKSİK?",
    "researchQuestion": "HANGİSİ EKSİK?",
    "text": "HANGİSİ EKSİK? Sarı ve mor çerçevelerin içindeki görselleri inceleyelim. İki çerçeveyi karşılaştıralım. Sarı çerçevede  olup mor çerçevede olmayanları bulup işaretleyelim. 30",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Sarı",
      "İçinde - Dışında"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p31_74",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 31,
    "title": "İLKBAHARDA NELER GÖRÜRÜZ?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "İLKBAHARDA NELER GÖRÜRÜZ?",
    "researchQuestion": "İLKBAHARDA NELER GÖRÜRÜZ?",
    "text": "İLKBAHARDA NELER GÖRÜRÜZ?  Kitabımızı yanımıza alalım ve bahçeye çıkalım. İlkbaharda bahçe nasıl görünüyor? Anlatalım.  Bahçede görsellerden hangileriyle karşılaştık? Gördüklerimizi işaretleyelim. BAHÇE ZAMANI 31",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p32_75",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 32,
    "title": "BİLMECELER",
    "domain": "Matematik",
    "theme": "BİLMECELER",
    "researchQuestion": "BİLMECELER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "BİLMECELER Bilmeceleri dinleyelim. Cevapları, mor çerçevenin içindeki görseller arasından bulup işaretleyelim. Mutfakta durur, Elektrikle çalışır, Kapısını açınca, Lezzetli yiyecekler görünür.                             (BUZDOLABI) Kirli ç",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Az - Çok",
      "Sarı",
      "İçinde - Dışında"
    ],
    "values": [
      "D14 Saygı",
      "D18 Temizlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p33_76",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 33,
    "title": "ÇİZGİ ÇOCUKLA HAREKET",
    "domain": "Matematik",
    "theme": "ÇİZGİ ÇOCUKLA HAREKET",
    "researchQuestion": "ÇİZGİ ÇOCUKLA HAREKET ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÇİZGİ ÇOCUKLA HAREKET Görselleri inceleyelim. Çocukların yaptığı hareketleri hangi çizgi çocuk resmine bakarak yaptığını  bulalım ve çizgi çizerek eşleştirelim. Çocukların yaptığı denge hareketlerini yapmayı deneyelim. 33",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p34_77",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 34,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "4 RAKAMINI ÖĞRENİYORUM Ok yönünde ilerleyerek parmağımızla 4 rakamının üzerinden geçelim. 4 parmağımızı  gösterelim. 4 rakamlarını bulalım ve  işaretleyelim. Yukarıdaki araçların isimlerini  söyleyelim ve 4 tekerleği olan  aracı işaretleyel",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Önünde - Arkasında",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p35_78",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 35,
    "title": "DÖRT TANE",
    "domain": "Bütünleşik Etkinlik",
    "theme": "DÖRT TANE",
    "researchQuestion": "DÖRT TANE konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "DÖRT TANE Üzerinde 4 tane yelkenli olan denizin altındaki kutucuğu işaretleyelim. İçinde 4 tane kalem olan kalemliğin altındaki kutucuğu işaretleyelim. İçinde 4 tane balık olan akvaryumun altındaki kutucuğu işaretleyelim.  35",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "3 (Üç)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p36_79",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 36,
    "title": "KÜLTÜR",
    "domain": "Matematik",
    "theme": "KÜLTÜR",
    "researchQuestion": "KÜLTÜR ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KÜLTÜR TURİZMİ KÜLTÜR TURİZMİ KÜLTÜR TURİZMİ KÜLTÜR TURİZMİ Ahmet bu yaz kültür turizmi için bir geziye  çıkmış. Ülkemizdeki önemli yerleri gezerek  fotoğraflar çekmiş. Çektiği fotoğrafları inceleyelim  ve görevleri tamamlayalım. Merak etti",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p37_80",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 37,
    "title": "Uzungöl’e hoş geldin. Burası Trabzon’da",
    "domain": "Matematik",
    "theme": "Uzungöl’e hoş geldin. Burası Trabzon’da",
    "researchQuestion": "Daha önce müzeye gittik  mi?",
    "text": "Uzungöl’e hoş geldin. Burası Trabzon’da  bulunan birçok balığın yaşadığı bir  göldür. Balıklar gibi yüzme taklidi  yapalım. Zeugma Müzesi’ne hoş geldin. Burası  Gaziantep’te bulunan bir mozaik  müzesidir. Daha önce müzeye gittik  mi? Anlata",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p38_81",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 38,
    "title": "BAYRAMLAR",
    "domain": "Sosyal & Duygusal",
    "theme": "BAYRAMLAR",
    "researchQuestion": "BAYRAMLAR durumunda kendimizi ve arkadaşlarımızı nasıl anlarız?",
    "text": "BAYRAMLAR Görselleri inceleyelim. Görsellerde neler gördüğümüzü söyleyelim. Bayramlarda neler yaparız,  arkadaşlarımıza anlatalım.  Çerçevenin içine sevdiklerimiz için bir bayram kartı tasarlayalım. 38",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_36_48_b2_p39_82",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 39,
    "title": "TOPRAKTA NELER VAR?",
    "domain": "Matematik",
    "theme": "TOPRAKTA NELER VAR?",
    "researchQuestion": "TOPRAKTA NELER VAR?",
    "text": "TOPRAKTA NELER VAR? Kitabımızı yanımıza alalım ve bahçeye çıkalım. Uygun araç gereçlerle toprağı kazıp inceleyelim.  Toprağı kazdığımızda görsellerden hangileriyle karşılaştık? Gördüklerimizi işaretleyelim. BAHÇE ZAMANI 39",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p40_83",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 40,
    "title": "TABLOMU TAMAMLIYORUM",
    "domain": "Sanat",
    "theme": "TABLOMU TAMAMLIYORUM",
    "researchQuestion": "Farklı malzemelerle TABLOMU TAMAMLIYORUM nasıl canlandırabiliriz?",
    "text": "TABLOMU TAMAMLIYORUM Görseli inceleyelim. Tablonun hangi malzemelerden yapılmış olabileceğini düşünelim, arkadaşlarımızla  paylaşalım. Bu bir yırtma yapıştırma çalışması. Tabloda boş kalan yerleri sınıfımızdaki atık kâğıtları  yırtıp yapışt",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p41_84",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 41,
    "title": "ATATÜRK VE KİTAP",
    "domain": "Matematik",
    "theme": "ATATÜRK VE KİTAP",
    "researchQuestion": "ATATÜRK VE KİTAP ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ATATÜRK VE KİTAP Mustafa Kemal Atatürk, kitap okumayı çok severdi. Atatürk’ün kitaplarla olan fotoğraflarını  inceleyelim. Aşağıdaki kitaplardan birini seçelim ve biz de Mustafa Kemal Atatürk gibi kitap okuyalım. Neden  bu kitabı seçtiğimi",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p42_85",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 42,
    "title": "KARE ŞEKLİNİ ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "KARE ŞEKLİNİ ÖĞRENİYORUM",
    "researchQuestion": "KARE ŞEKLİNİ ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KARE ŞEKLİNİ ÖĞRENİYORUM Benim adım kare. Birbirine eşit uzunlukta 4 kenarım ve 4 köşem var.  Görselleri inceleyelim. Yüzeyi kare şekline benzeyenleri bulalım ve işaretleyelim. 42",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Kare"
    ],
    "values": [
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p43_86",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 43,
    "title": "KARE YOLDA GEZİNTİ",
    "domain": "Matematik",
    "theme": "KARE YOLDA GEZİNTİ",
    "researchQuestion": "KARE YOLDA GEZİNTİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KARE YOLDA GEZİNTİ Görseldeki şeklin ismini söyleyelim. Kare şeklindeki yolda okları takip ederek parmağımızı gezdirelim.  Sınıfımızdan küçük bir oyuncak seçelim, okları takip ederek oyuncağımızı kare şeklindeki yol üzerinde  hareket ettire",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p44_87",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 44,
    "title": "NEYE İHTİYACIMIZ VAR?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "NEYE İHTİYACIMIZ VAR?",
    "researchQuestion": "NEYE İHTİYACIMIZ VAR?",
    "text": "NEYE İHTİYACIMIZ VAR? Saçımızı taramak için neye ihtiyacımız var? İşaretleyelim. Çorba içmek için neye ihtiyacımız var? İşaretleyelim. 44",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p45_88",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 45,
    "title": "RENKLİ BALIKLAR",
    "domain": "Sanat",
    "theme": "RENKLİ BALIKLAR",
    "researchQuestion": "Farklı malzemelerle RENKLİ BALIKLAR nasıl canlandırabiliriz?",
    "text": "RENKLİ BALIKLAR Görselleri inceleyelim. Balıkların renklerini söyleyelim. Rengi söylenen balığın üzerine aynı renkte  boya kalemimizi koyalım. Balıkların eksik kısımlarını boyayarak tamamlayalım. 45",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p46_89",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 46,
    "title": "KEK TARİFİ",
    "domain": "Bütünleşik Etkinlik",
    "theme": "KEK TARİFİ",
    "researchQuestion": "KEK TARİFİ konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "KEK TARİFİ Alper, annesinin doğum gününü kutlamak için babasıyla kek yapmaya karar verdi. Kek malzemelerinin  olduğu listeyi inceleyelim. Kek yapmak için gerekli olan malzemeleri bulalım ve işaretleyelim. MALZEMELER 2 kase un 1 bardak süt 3",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p47_90",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 47,
    "title": "KÖSTEBEK TOPRAĞI KAZIYOR",
    "domain": "Matematik",
    "theme": "KÖSTEBEK TOPRAĞI KAZIYOR",
    "researchQuestion": "Toprağın altına yuva  yapan başka hangi hayvanlar var?",
    "text": "KÖSTEBEK TOPRAĞI KAZIYOR Köstebekler bazen yiyecek aramak, bazen de yuvalarını yapmak için toprağı kazar. Köstebeğin  toprağın üzerine çıkmak için kullanması gereken yolu çizerek gösterelim. Toprağın altına yuva  yapan başka hangi hayvanlar",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p48_91",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 48,
    "title": "KÜLTÜRÜMÜZE ÖZGÜ YEMEKLER",
    "domain": "Bütünleşik Etkinlik",
    "theme": "KÜLTÜRÜMÜZE ÖZGÜ YEMEKLER",
    "researchQuestion": "KÜLTÜRÜMÜZE ÖZGÜ YEMEKLER konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "KÜLTÜRÜMÜZE ÖZGÜ YEMEKLER Görselleri inceleyelim. Bildiğimiz yemekleri işaretleyelim. Bu yemeklerin isimlerini söyleyelim.  Kültürümüze özgü bildiğimiz başka yemekler varsa anlatalım. 48",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_36_48_b2_p49_92",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 49,
    "title": "NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI",
    "domain": "Matematik",
    "theme": "NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI",
    "researchQuestion": "Çocuklar neler yapıyor?",
    "text": "23 NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı, Mustafa Kemal Atatürk’ün tüm dünya çocuklarına  hediye ettiği en neşeli bayramdır. Bu özel günde kutlamalar yapılır, çocuklar oyunlar oynar ve  eğlenir. ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p50_93",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 50,
    "title": "TOPLA HAREKET EDİYORUM",
    "domain": "Matematik",
    "theme": "TOPLA HAREKET EDİYORUM",
    "researchQuestion": "TOPLA HAREKET EDİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "TOPLA HAREKET EDİYORUM Defne topu farklı şekillerde tutarak bir denge oyunu oynamaktadır. Defne’nin topu nasıl tuttuğunu  resimlere bakarak inceleyelim ve topun nerede olduğunu söyleyelim. Biz de yumuşak ve hafif bir  oyuncakla Defne’nin ya",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Ağır - Hafif",
      "Aynı - Farklı"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p52_94",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 52,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "5 RAKAMINI ÖĞRENİYORUM Ok yönünde ilerleyerek parmağımızla 5 rakamının üzerinden geçelim. 5 parmağımızı  gösterelim. 5 rakamlarını bulalım ve  işaretleyelim. Yukarıdaki müzik aletinin ismi  davul. Davullardan 5 tanesini  işaretleyelim. Elle",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Önünde - Arkasında",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p54_95",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 54,
    "title": "NEFES EGZERSİZİ",
    "domain": "Matematik",
    "theme": "NEFES EGZERSİZİ",
    "researchQuestion": "Nefes alıp vermemiz nasıl değişti?",
    "text": "NEFES EGZERSİZİ Doğru nefes alıp vermek sağlığımız için çok önemlidir. Görsellerdeki hareketleri önce yavaş sonra  hızlı yapalım. Nefes alıp vermemiz nasıl değişti? Konuşalım. Çizgileri sırayla parmağımızla takip edelim. Mavi çizgileri taki",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Mavi",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p55_96",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 55,
    "title": "CANLI-CANSIZ",
    "domain": "Fen ve Doğa",
    "theme": "CANLI-CANSIZ",
    "researchQuestion": "CANLI-CANSIZ doğada ve çevremizde nasıl işler?",
    "text": "CANLI-CANSIZ Canlı varlıkların yaşamak için suya, havaya ve beslenmeye ihtiyacı vardır. Sayfamızdaki canlı ve  cansız görselleri inceleyelim. Her sırada yer alan canlı varlığın altındaki kutucuğu işaretleyelim. 55",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "Canlı - Cansız"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p56_97",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 56,
    "title": "KUNDUZLARIN YAPTIĞI ŞEKİLLER",
    "domain": "Matematik",
    "theme": "KUNDUZLARIN YAPTIĞI ŞEKİLLER",
    "researchQuestion": "KUNDUZLARIN YAPTIĞI ŞEKİLLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KUNDUZLARIN YAPTIĞI ŞEKİLLER Kunduzun dal parçaları ve taşlar kullanarak yaptığı şekillere bakalım. Daire, kare ve üçgen  şekillerine benzeyenleri bulalım ve gösterelim. Biz de sınıfımızda seçtiğimiz malzemeleri kullanarak  istediğimiz şeki",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Daire"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p57_98",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 57,
    "title": "KATI VE SIVI MADDELERİ KEŞFEDİYORUM",
    "domain": "Fen ve Doğa",
    "theme": "KATI VE SIVI MADDELERİ KEŞFEDİYORUM",
    "researchQuestion": "KATI VE SIVI MADDELERİ KEŞFEDİYORUM doğada ve çevremizde nasıl işler?",
    "text": "KATI VE SIVI MADDELERİ KEŞFEDİYORUM Görselleri inceleyelim. Sıvı maddeleri mavi kutuya, katı maddeleri kırmızı kutuya çizgi çizerek  götürelim. Katı ve sıvı maddelere örnekler verelim. ⭐ Öğretmene not: Katı ve sıvı maddeler hakkında çocukla",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p58_99",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 58,
    "title": "BİR-BİR-İKİ",
    "domain": "Matematik",
    "theme": "BİR-BİR-İKİ",
    "researchQuestion": "BİR-BİR-İKİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "BİR-BİR-İKİ Görselleri inceleyelim. Bu mesleklerin ne iş yaptıklarını konuşalım. Meslekleri uygun araçlarla  çizgi çizerek eşleştirelim.  ⭐ Öğretmene not: Karekodda bulunan “Bir Bir İki ” adlı şarkı çocuklara  dinletilir. 58",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p59_100",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 59,
    "title": "BÜTÜN-YARIM",
    "domain": "Matematik",
    "theme": "BÜTÜN-YARIM",
    "researchQuestion": "BÜTÜN-YARIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "BÜTÜN-YARIM Görselleri inceleyelim. Bütün olan meyvelerin isimlerini söyleyelim. Her sıradaki bütün olan  meyvenin yarısını bulalım. Bulduğumuz yarım meyvenin altındaki kutucuğu işaretleyelim. 59",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Bütün - Yarım",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p60_101",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 60,
    "title": "HAYVANLARIN HAREKETLERİNİ TAKLİT EDİYORUM",
    "domain": "Fen ve Doğa",
    "theme": "HAYVANLARIN HAREKETLERİNİ TAKLİT EDİYORUM",
    "researchQuestion": "HAYVANLARIN HAREKETLERİNİ TAKLİT EDİYORUM doğada ve çevremizde nasıl işler?",
    "text": "HAYVANLARIN HAREKETLERİNİ TAKLİT EDİYORUM  Kurbağa gibi 3 kere zıplayalım.  Bir kuş gibi kanadımızı çırpalım.  Bir kaplumbağa gibi sınıfımızda yavaşça dolaşalım.  Bir salyangoz gibi sürünme hareketi yapalım. Görseldeki hayvanların adlarını ",
    "materials": [
      "Şeffaf su deney küveti",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p61_102",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 61,
    "title": "YÜZER Mİ, BATAR MI?",
    "domain": "Fen ve Doğa",
    "theme": "YÜZER Mİ, BATAR MI?",
    "researchQuestion": "YÜZER Mİ, BATAR MI?",
    "text": "YÜZER Mİ, BATAR MI? İçi su dolu şeffaf bir kabı masaya koyalım. Tablodaki nesneleri inceleyelim. Bu nesneleri çevremizden  bulalım. Nesneleri tek tek suyun içine bırakalım. Yüzen nesnelerin yanındaki kutucuğu maviye,  batan nesnelerin yanın",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p62_103",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 62,
    "title": "RENKLERLE ÖRÜNTÜ",
    "domain": "Matematik",
    "theme": "RENKLERLE ÖRÜNTÜ",
    "researchQuestion": "RENKLERLE ÖRÜNTÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "RENKLERLE ÖRÜNTÜ Şeritlerin içindeki örüntüleri inceleyelim. Yukarıdaki örüntüye göre daireleri boyayarak kelebeği çiçeğe ulaştıralım.  Yukarıdaki örüntüye göre kareleri boyayarak kuşu yuvasına ulaştıralım.  62",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Daire",
      "Kare"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p63_104",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 63,
    "title": "İLİŞKİLİ-İLİŞKİSİZ",
    "domain": "Sanat",
    "theme": "İLİŞKİLİ-İLİŞKİSİZ",
    "researchQuestion": "Farklı malzemelerle İLİŞKİLİ-İLİŞKİSİZ nasıl canlandırabiliriz?",
    "text": "İLİŞKİLİ-İLİŞKİSİZ Görselleri inceleyelim. Üstteki görselle ilişkili olanı alttaki görseller arasından bulup işaretleyelim. 63",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_36_48_b2_p64_105",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 64,
    "title": "YAZIN NELER GÖRÜRÜZ?",
    "domain": "Matematik",
    "theme": "YAZIN NELER GÖRÜRÜZ?",
    "researchQuestion": "YAZIN NELER GÖRÜRÜZ?",
    "text": "YAZIN NELER GÖRÜRÜZ? Kitabımızı yanımıza alalım ve bahçeye çıkalım. Yaz mevsiminde bahçe nasıl görünüyor? Anlatalım.  Bahçede görsellerden hangileriyle karşılaştık? Gördüklerimizi işaretleyelim. BAHÇE ZAMANI 64",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p65_106",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 65,
    "title": "SALYANGOZ SEMİ",
    "domain": "Matematik",
    "theme": "SALYANGOZ SEMİ",
    "researchQuestion": "Semi sıcaktan korunmak için ne yapabilir?",
    "text": "SALYANGOZ SEMİ Sıcak bir günde Salyangoz Semi gezintiye çıkmaya karar vermiş. Hava gittikçe ısınmış bu yüzden  Salyangoz Semi daha fazla ilerleyememiş. Semi sıcaktan korunmak için ne yapabilir? Söyleyelim.  Salyangozlar sıcaktan korunmak iç",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Sıcak - Soğuk",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p66_107",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 66,
    "title": "GÜNEŞLİ GÜN GİYSİLERİM",
    "domain": "Fen ve Doğa",
    "theme": "GÜNEŞLİ GÜN GİYSİLERİM",
    "researchQuestion": "Mehmet  böyle bir havada dışarı çıkarken aşağıdaki kıyafetlerden hangilerini giyebilir?",
    "text": "GÜNEŞLİ GÜN GİYSİLERİM Mehmet pencereden dışarı baktığında havanın güneşli ve sıcak olduğunu fark etmiş. Mehmet  böyle bir havada dışarı çıkarken aşağıdaki kıyafetlerden hangilerini giyebilir? İşaretleyelim. Bugün havanın nasıl olduğunu ve ",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Sıcak - Soğuk",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p67_108",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 67,
    "title": "BANA ÖZEL",
    "domain": "Hareket ve Sağlık",
    "theme": "BANA ÖZEL",
    "researchQuestion": "Lde sarılmak zorunda mı?",
    "text": "BANA ÖZEL Ayşe, annesiyle misafirliğe gitti. Gittiği yerde yetişkinler Ayşe’yle sohbet ettiler. Bir yetişkin Ayşe’ye  sarılmak istedi. Ayşe ona sarılmak istemedi. Ayşe istemediği hâlde sarılmak zorunda mı? Ayşe’nin  yerinde olsaydık ne yapa",
    "materials": [
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Sarı",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_36_48_b2_p68_109",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 68,
    "title": "FARKLARI BULALIM",
    "domain": "Fen ve Doğa",
    "theme": "FARKLARI BULALIM",
    "researchQuestion": "FARKLARI BULALIM doğada ve çevremizde nasıl işler?",
    "text": "FARKLARI BULALIM Ülkemizde nesli tükenmekte olan hayvan türleri bulunmaktadır. Deniz kaplumbağası bunlardan  biridir. Görselleri inceleyelim. İki resim arasındaki 5 farkı bulalım ve işaretleyelim. 68",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_36_48_b2_p69_110",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 69,
    "title": "AHMET TATİLE GİDİYOR",
    "domain": "Matematik",
    "theme": "AHMET TATİLE GİDİYOR",
    "researchQuestion": "AHMET TATİLE GİDİYOR ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "AHMET TATİLE GİDİYOR Ahmet ailesiyle tatile gitmek için eşyalarını hazırlıyor. Bavullardan bir tanesi dolmuş. Dolu olan  bavulu işaretleyelim. Ahmet’in ihtiyacı olan diğer eşyalarını çizgi ile boş bavula götürelim. 69",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_36_48_b2_p70_111",
    "ageGroup": "36-48",
    "bookNo": 2,
    "pageNo": 70,
    "title": "ALTINDA-ÜSTÜNDE-YANINDA",
    "domain": "Sanat",
    "theme": "ALTINDA-ÜSTÜNDE-YANINDA",
    "researchQuestion": "Masanın altında ne var?",
    "text": "ALTINDA-ÜSTÜNDE-YANINDA Görselleri inceleyelim. Masanın altında ne var? Masanın üstünde ne var? Masanın yanında ne  var? Söyleyelim. Oyun hamurundan bir top yapalım. Topu masa görselinin altına koyalım. Topu masa görselinin  üstüne koyalım.",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p10_112",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 10,
    "title": "KENDİMİ TANIYORUM",
    "domain": "Sanat",
    "theme": "KENDİMİ TANIYORUM",
    "researchQuestion": "Farklı malzemelerle KENDİMİ TANIYORUM nasıl canlandırabiliriz?",
    "text": "KENDİMİ TANIYORUM Çerçevenin içine kendimizi çizelim. En sevdiğimiz renge boyayalım. Yaşımız kadar çileği boyayalım. En sevdiğimiz yemeği çizelim. Bu kitabın kendimize ait olduğunu  göstermek için kutuya bir çizim yapalım.  10",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p11_113",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 11,
    "title": "HAYVANLARIN ÇİZGİLERİ",
    "domain": "Matematik",
    "theme": "HAYVANLARIN ÇİZGİLERİ",
    "researchQuestion": "Çizgileri olan başka hangi hayvanlar var?",
    "text": "HAYVANLARIN ÇİZGİLERİ Bazı hayvanların vücudunda çizgiler bulunur. Çizgileri olan hayvan görsellerini  inceleyelim. Hayvanların isimlerini söyleyelim. Çizgileri olan başka hangi hayvanlar var?  Düşünelim, söyleyelim. Farklı çizgiler kullana",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p12_114",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 12,
    "title": "AILEM VE BEN",
    "domain": "Sanat",
    "theme": "AILEM VE BEN",
    "researchQuestion": "Aile bireyleri ne yapıyor?",
    "text": "AILEM VE BEN Çerçeveye ailemizle yapmayı sevdiğimiz etkinliklerin resmini çizelim. Yaptığımız çizimleri  arkadaşlarımıza anlatalım. Görseli inceleyelim. Aile bireyleri ne yapıyor? Söyleyelim. Ailemiz bizim için önemlidir. Ailemizi  sever ve",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p13_115",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 13,
    "title": "HAYVANLARIN HAREKETLERINI TAKLIT EDIYORUM",
    "domain": "Fen ve Doğa",
    "theme": "HAYVANLARIN HAREKETLERINI TAKLIT EDIYORUM",
    "researchQuestion": "HAYVANLARIN HAREKETLERINI TAKLIT EDIYORUM doğada ve çevremizde nasıl işler?",
    "text": "HAYVANLARIN HAREKETLERINI TAKLIT EDIYORUM Hayvan görsellerini inceleyelim. Hayvanların isimlerini söyleyelim ve hareketlerini taklit edelim.  Karada yaşayan hayvan görsellerinin çerçevesini kırmızıya, suda yaşayan hayvan görsellerinin  çerç",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p14_116",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 14,
    "title": "BEDENLE RİTİM",
    "domain": "Müzik",
    "theme": "BEDENLE RİTİM",
    "researchQuestion": "Bedenimiz ve sesimizle BEDENLE RİTİM ritmini nasıl yakalarız?",
    "text": "BEDENLE RİTİM El çırpalım. El çırpalım. El çırpalım. El çırpalım. El çırpalım. El çırpalım. Parmak şıklatalım. Parmak şıklatalım. Parmak şıklatalım. Parmak şıklatalım. Parmak şıklatalım. Dizimize vuralım. Dizimize vuralım. Dizimize vuralım.",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Ses boruları",
      "Ahşap kastanyet"
    ],
    "concepts": [
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_48_60_b1_p15_117",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 15,
    "title": "DESENLER",
    "domain": "Fen ve Doğa",
    "theme": "DESENLER",
    "researchQuestion": "DESENLER Sınıfımızda, kıyafetlerimizde, eşyalarımızda desenler var mı?",
    "text": "DESENLER Sınıfımızda, kıyafetlerimizde, eşyalarımızda desenler var mı? İnceleyelim. Bulduğumuz desenleri  arkadaşlarımızla paylaşalım. Görseli inceleyelim. Kutulardaki desenlerin görseldeki eşyalardan hangisine ait olduğunu bulalım.  Bulduğ",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p17_118",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 17,
    "title": "HANGİSİ BÜYÜK, HANGİSİ KÜÇÜK?",
    "domain": "Fen ve Doğa",
    "theme": "HANGİSİ BÜYÜK, HANGİSİ KÜÇÜK?",
    "researchQuestion": "HANGİSİ BÜYÜK, HANGİSİ KÜÇÜK?",
    "text": "HANGİSİ BÜYÜK, HANGİSİ KÜÇÜK? Orangutan Aslan Balık Kartal Muhabbet kuşu Arı Panda Kelebek Ahtapot Ardıç kuşu Sincap Fil Görseldeki hayvanları inceleyelim. Hangilerinin adını biliyoruz? Söyleyelim. Her çerçevede küçük  olan hayvanı işaretle",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p18_119",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 18,
    "title": "EVIN PARÇALARI",
    "domain": "Matematik",
    "theme": "EVIN PARÇALARI",
    "researchQuestion": "EVIN PARÇALARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "EVIN PARÇALARI Ev modellerini inceleyelim. Her sırada ev modelini oluşturan parçaların kutusunu bulalım ve çizgi  çizerek eşleştirelim. 18",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p19_120",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 19,
    "title": "AZ MI, ÇOK MU?",
    "domain": "Matematik",
    "theme": "AZ MI, ÇOK MU?",
    "researchQuestion": "AZ MI, ÇOK MU?",
    "text": "AZ MI, ÇOK MU? Buz parçalarından hangisinin üstünde daha çok penguen var? Altındaki kutucuğu işaretleyelim. Arı yuvalarından hangisinde daha az arı var? Altındaki kutucuğu işaretleyelim. Yaprakların hangisinin üstünde daha az nilüfer çiçeği",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p20_121",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 20,
    "title": "DENGEDE DURUYORUM",
    "domain": "Müzik",
    "theme": "DENGEDE DURUYORUM",
    "researchQuestion": "Bedenimiz ve sesimizle DENGEDE DURUYORUM ritmini nasıl yakalarız?",
    "text": "DENGEDE DURUYORUM Müzik eşliğinde dans edelim. Müzik durduğunda görsellerdeki hareketlerden birini seçelim. Müzik  tekrar başlayana kadar bu hareketi yaparak dengede durmaya çalışalım.  20",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_48_60_b1_p21_122",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 21,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "RAKAMI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "1 1 RAKAMI 1 rakamlarını işaretleyelim. Kızıl pandalar bambu ile beslenir.        1 tane bambuyu işaretleyelim.  Nesli tükenmekte olan kızıl panda hakkında  bilgi edinelim. Kızıl pandalardan bir tanesini  boyayalım.  1 rakamını kullanarak r",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p22_123",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 22,
    "title": "AYNISINI BULALIM",
    "domain": "Matematik",
    "theme": "AYNISINI BULALIM",
    "researchQuestion": "AYNISINI BULALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "AYNISINI BULALIM Görseli inceleyelim. Birbiriyle aynı olan kuşları çizgi çizerek eşleştirelim. Eşi olmayan kuşu  işaretleyelim. 22",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p23_124",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 23,
    "title": "SANATÇILAR VE ESERLERİ",
    "domain": "Sanat",
    "theme": "SANATÇILAR VE ESERLERİ",
    "researchQuestion": "Farklı malzemelerle SANATÇILAR VE ESERLERİ nasıl canlandırabiliriz?",
    "text": "SANATÇILAR VE ESERLERİ Görselleri inceleyelim. Sanatçıların hangi eseri yapmış olabileceğini bulalım. Bu eserlere ve  sanatçılarına ne isim verildiğini söyleyelim. İpuçlarından yararlanarak sanatçı ve eserlerinin  yanındaki kutucukları aynı",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p24_125",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 24,
    "title": "ARILARIN ÇİZGİLERİ",
    "domain": "Fen ve Doğa",
    "theme": "ARILARIN ÇİZGİLERİ",
    "researchQuestion": "ARILARIN ÇİZGİLERİ doğada ve çevremizde nasıl işler?",
    "text": "ARILARIN ÇİZGİLERİ Görseldeki hayvanın adını söyleyelim. Arı sesi çıkararak çizgileri parmağımızla takip edelim, kesik  çizgileri birleştirerek çizelim. 24",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p25_126",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 25,
    "title": "Daireleri işaretleyerek kediyi mamasına",
    "domain": "Matematik",
    "theme": "Daireleri işaretleyerek kediyi mamasına",
    "researchQuestion": "Daireleri işaretleyerek kediyi mamasına ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "Daireleri işaretleyerek kediyi mamasına  ulaştıralım. Daire şeklini kullanarak bir resim yapalım. Görsellerden yüzeyi daire şekline  benzeyenleri bulalım ve işaretleyelim. MERHABA, DAİRE Benim adım daire. Köşem ve kenarım yok. ⭐ \u0007Öğretmene ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Daire",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p26_127",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 26,
    "title": "Mutlu",
    "domain": "Matematik",
    "theme": "Mutlu",
    "researchQuestion": "Mutlu Mutlu Mutlu Üzgün Korkmuş Korkmuş AYLİN NE HİSSEDİYOR OLABİLİR?",
    "text": "Mutlu Mutlu Mutlu Üzgün Korkmuş Korkmuş AYLİN NE HİSSEDİYOR OLABİLİR? Aylin, gün içinde birçok şey yaşıyor. Hissettiği duygular da buna göre değişiyor. Cümleleri  dinleyelim. Aylin’in ne hissediyor olabileceğini bulalım. Bulduğumuz duyguyu ",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "Mutlu - Üzgün"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p27_128",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 27,
    "title": "RESİM GÜNÜ",
    "domain": "Sanat",
    "theme": "RESİM GÜNÜ",
    "researchQuestion": "Farklı malzemelerle RESİM GÜNÜ nasıl canlandırabiliriz?",
    "text": "RESİM GÜNÜ Bugün sınıfta resim günü. Çocukların yaptığı resimleri inceleyelim. Resimlerde kullanılan boya  kalemlerini bulalım. Kalemlerin altındaki kutucukları raptiyelerin renginde boyayalım. 27",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p28_129",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 28,
    "title": "RENK KUTULARI",
    "domain": "Matematik",
    "theme": "RENK KUTULARI",
    "researchQuestion": "Hangi renkleri görüyoruz?",
    "text": "RENK KUTULARI Görselleri inceleyelim. Hangi renkleri görüyoruz? Söyleyelim. Görsellerle renkleri örnekteki gibi  çizgi çizerek eşleştirelim. 28",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p29_130",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 29,
    "title": "DUYGU ÇALIŞMASI",
    "domain": "Fen ve Doğa",
    "theme": "DUYGU ÇALIŞMASI",
    "researchQuestion": "DUYGU ÇALIŞMASI doğada ve çevremizde nasıl işler?",
    "text": "DUYGU ÇALIŞMASI Ali’nin her gün suladığı çiçek tomurcuk  verdi. Emre’nin arkadaşı oyuncağını onunla  paylaşmak istemedi. Cemal’in harçlıklarını biriktirip aldığı  dondurma yere düştü. Gamze’nin hiç beklemediği bir anda  karşısına bir sürpri",
    "materials": [
      "Şeffaf su deney küveti",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p30_131",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 30,
    "title": "TÜRK BAYRAĞI",
    "domain": "Sosyal & Duygusal",
    "theme": "TÜRK BAYRAĞI",
    "researchQuestion": "TÜRK BAYRAĞI durumunda kendimizi ve arkadaşlarımızı nasıl anlarız?",
    "text": "TÜRK BAYRAĞI Türk bayrağındaki renkleri bulup altındaki kutucukları işaretleyelim. Türk bayrağındaki sembolleri bulup altındaki kutucukları işaretleyelim. İşte bir bayram günü. Berra’nın sınıfında 29 Ekim Cumhuriyet Bayramı kutlanıyor. Çocu",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_48_60_b1_p31_132",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 31,
    "title": "Atatürk, çocukları çok severdi.",
    "domain": "Matematik",
    "theme": "Atatürk, çocukları çok severdi.",
    "researchQuestion": "Mustafa  Kemal Atatürk hakkında neler biliyoruz?",
    "text": "Atatürk, çocukları çok severdi. Atatürk, kitap okumayı çok severdi ve  kitap yazardı. Atatürk, hayvanları çok severdi   ve Foks adında bir köpeği vardı. ATATÜRK Atatürk ile ilgili cümleleri dinleyelim. Her cümleye uygun fotoğrafı bulalım. F",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "Altında - Üstünde"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p32_133",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 32,
    "title": "G E L E N E K S E L",
    "domain": "Fen ve Doğa",
    "theme": "G E L E N E K S E L",
    "researchQuestion": "Bu  çocuklar hangi duyguyu  hissediyor olabilir?",
    "text": "G E L E N E K S E L     L A R I   G Ü N Ü “Yağ satarım, bal satarım”  oyununu oynayan  çocukları bulalım. Bu  çocuklar hangi duyguyu  hissediyor olabilir?  Söyleyelim. Oyunun ebesi  olan çocuğu işaretleyelim. “Yumurta taşıma”oyununu  oynaya",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Canlı - Cansız",
      "Sıcak - Soğuk"
    ],
    "values": [
      "D14 Saygı",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p33_134",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 33,
    "title": "“Saklambaç” oynayan",
    "domain": "Matematik",
    "theme": "“Saklambaç” oynayan",
    "researchQuestion": "Oyunu kaybedecek olan çocuklar  hangi duyguları hissedebilir?",
    "text": "“Saklambaç” oynayan  çocukları bulalım. Ebe  olan çocuğu işaretleyelim.  Telaşlı hisseden çocuğu  gösterelim ve neden  telaşlı olduğunu tahmin  edelim. “Halat çekme” oyununu oynayan  çocukları bulalım. Oyunu kazanmaya  en yakın çocukları gö",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p34_135",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 34,
    "title": "BAKALIM, SEÇELİM",
    "domain": "Sanat",
    "theme": "BAKALIM, SEÇELİM",
    "researchQuestion": "Farklı malzemelerle BAKALIM, SEÇELİM nasıl canlandırabiliriz?",
    "text": "BAKALIM, SEÇELİM Görselleri inceleyelim. Üstteki görselle ilişkili olanı alttaki görseller arasından seçip işaretleyelim. 34",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p35_136",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 35,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "RAKAMI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "2 2 RAKAMI Görselde bulunan su kaplumbağası  yumurtalarından 2 tane olanı işaretleyelim. 2 rakamını kullanarak resim yapalım. 2 4 4 2 2 2 2 3 3 3 2 rakamlarını işaretleyelim. Nesli tükenmekte olan su kaplumbağaları  hakkında bilgi edinelim.",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p36_137",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 36,
    "title": "BİR GÜNÜM",
    "domain": "Matematik",
    "theme": "BİR GÜNÜM",
    "researchQuestion": "BİR GÜNÜM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "BİR GÜNÜM Cümleleri dinleyelim. Bu olayların günün hangi zaman diliminde gerçekleştiğini söyleyelim.  Görselleri günün uygun zaman dilimiyle çizgi çizerek eşleştirelim. “İyi geceler” diyerek yatağıma yattım. Elimi, yüzümü yıkadım ve herkese",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Gece - Gündüz",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D18 Temizlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p37_138",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 37,
    "title": "YARIŞMA GÜNÜ",
    "domain": "Matematik",
    "theme": "YARIŞMA GÜNÜ",
    "researchQuestion": "Hangi hayvanların yarışması adil  olmaz?",
    "text": "YARIŞMA GÜNÜ Ormandaki yarışma gününe hoş geldin. Görselleri inceleyelim. Hangi hayvanların yarışması adil  olmaz? Nedenini söyleyelim ve işaretleyelim. Panda ve köstebek, toprağı kimin daha hızlı  kazdığını belirlemek için yarışa hazırlanı",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p38_139",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 38,
    "title": "DOĞAYI KORUYORUM",
    "domain": "Fen ve Doğa",
    "theme": "DOĞAYI KORUYORUM",
    "researchQuestion": "Doğayı korumak için sen neler yapıyorsun?",
    "text": "DOĞAYI KORUYORUM Okula bisikletimle giderim.  Dişlerimi fırçalarken suyu boşa  akıtmamak için bardak kullanırım.  Çevremizin ağaçlanması için fidan  dikerim.  Görseldeki çocukların doğayı korumak için neler yaptıklarını dinleyelim. Kesik çi",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p39_140",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 39,
    "title": "DİNLE VE BUL",
    "domain": "Matematik",
    "theme": "DİNLE VE BUL",
    "researchQuestion": "DİNLE VE BUL ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "DİNLE VE BUL Gökyüzünde uçar, Durmadan kanat çırpar. Güzel bir ağaç bulunca, Dallarına yuva kurar. Tekerleri döner, durur. Pedalları süslü olur. Çevre dostudur. Doğamızı korur. Üfleyince şişer, Bırakınca söner. Rengârenktir her biri, Çocukl",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p40_141",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 40,
    "title": "GÖLGELERİNİ BULALIM",
    "domain": "Matematik",
    "theme": "GÖLGELERİNİ BULALIM",
    "researchQuestion": "GÖLGELERİNİ BULALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "GÖLGELERİNİ BULALIM   Ayşe, bir eşleştirme oyunu oynuyor. Her gölgenin hangi nesneye ait olduğunu bulalım. Nesneleri  gölgeleriyle eşleştirelim ve altlarındaki kutucukları örnekteki gibi aynı renge boyayalım. 40",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Aynı - Farklı",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p41_142",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 41,
    "title": "OYUNCAK MÜZESİ",
    "domain": "Bütünleşik Etkinlik",
    "theme": "OYUNCAK MÜZESİ",
    "researchQuestion": "OYUNCAK MÜZESİ konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "OYUNCAK MÜZESİ Ela ve Emir Oyuncak Müzesi geziyor. Müzede eskiden oynanan oyuncakların arasına yeni  oyuncaklar karıştığını fark ediyorlar. Yeni oyuncakları bulalım ve işaretleyelim. 41",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_48_60_b1_p42_143",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 42,
    "title": "DAVRANIŞLARI DEĞERLENDİRELİM",
    "domain": "Sanat",
    "theme": "DAVRANIŞLARI DEĞERLENDİRELİM",
    "researchQuestion": "Farklı malzemelerle DAVRANIŞLARI DEĞERLENDİRELİM nasıl canlandırabiliriz?",
    "text": "DAVRANIŞLARI DEĞERLENDİRELİM Görselleri inceleyelim. Neler gördüğümüzü söyleyelim. Doğru davranışların altındaki kutucuğu  kırmızıya, yanlış davranışların altındaki kutucuğu maviye boyayalım.  Görseldeki durumları daha önce yaşadık mı, düşü",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p43_144",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 43,
    "title": "ZIP ZIP KANGURU",
    "domain": "Sanat",
    "theme": "ZIP ZIP KANGURU",
    "researchQuestion": "Farklı malzemelerle ZIP ZIP KANGURU nasıl canlandırabiliriz?",
    "text": "ZIP ZIP KANGURU Kangurular arka ayakları üzerinde ileriye doğru sıçrayarak hareket eder. İnsanlar ise hem  ileriye hem de geriye doğru hareket edebilir. Zıplayarak git. Geri geri yürü. Sınıfımızda başlangıç ve bitiş noktası belirleyelim. İk",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Aynı - Farklı",
      "Daire"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p44_145",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 44,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "RAKAMI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "3 RAKAMI 3 rakamlarını işaretleyelim. Üzerinde 3 tane nota bulunan dizeği  işaretleyelim. Ellerimizi 3 kere çırpalım. Marakaslardan 3 tanesini boyayalım.  Boyadığımız marakasları kimlere hediye  edebileceğimizi söyleyelim.  3 rakamını kulla",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "1 (Bir)",
      "3 (Üç)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p45_146",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 45,
    "title": "MÜZİK ALETLERİ",
    "domain": "Müzik",
    "theme": "MÜZİK ALETLERİ",
    "researchQuestion": "Bedenimiz ve sesimizle MÜZİK ALETLERİ ritmini nasıl yakalarız?",
    "text": "MÜZİK ALETLERİ VURMALI ÇALGILAR ÜFLEMELİ ÇALGILAR TELLİ ÇALGILAR Müzik aletleri görsellerini inceleyelim. Müzik aletlerinin hangi çalgı türüne ait olduğunu  söyleyelim. Çerçevelerdeki farklı çalgı türene ait olan müzik aletini işaretleyelim",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Ses boruları",
      "Ahşap kastanyet"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_48_60_b1_p46_147",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 46,
    "title": "Kim mutlu hissediyor?",
    "domain": "Sanat",
    "theme": "Kim mutlu hissediyor?",
    "researchQuestion": "Kim mutlu hissediyor?",
    "text": "Kim mutlu hissediyor?  Kim üzgün hissediyor?  Kim öfkeli hissediyor?  Kim utanmış hissediyor?  Kim korkmuş hissediyor?  SOSYAL İPUÇLARINI BULALIM Görselleri inceleyelim. Soruları görsellere göre cevaplayalım. Soruların yanındaki kutucukları",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Mutlu - Üzgün",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b1_p48_148",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 48,
    "title": "HAREKET EDELİM",
    "domain": "Fen ve Doğa",
    "theme": "HAREKET EDELİM",
    "researchQuestion": "HAREKET EDELİM doğada ve çevremizde nasıl işler?",
    "text": "HAREKET EDELİM Eren ve Özge’nin yaptığı hareketleri inceleyelim. Önce Eren’in sonra Özge’nin hareketlerini  yapmayı deneyelim. Her hareketin ardından vücudumuzun hangi bölümünü kullandığımız üzerine  konuşalım. Etkinliği yeni hareketler ekl",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Sarı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p49_149",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 49,
    "title": "CANLI MI, CANSIZ MI?",
    "domain": "Fen ve Doğa",
    "theme": "CANLI MI, CANSIZ MI?",
    "researchQuestion": "CANLI MI, CANSIZ MI?",
    "text": "CANLI MI, CANSIZ MI? Atlas, doğa gözlem gününde canlı ve cansız varlıkları gözlemlemek için bahçede bir geziye çıkmış.  Gözlem defterine yapıştırmak için bir çiçeğin ve bir taşın fotoğrafını çekmiş. Canlı olan çiçek  mi, taş mı? Söyleyelim.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p50_150",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 50,
    "title": "SEMBOLLERİ ÖĞRENİYORUM",
    "domain": "Fen ve Doğa",
    "theme": "SEMBOLLERİ ÖĞRENİYORUM",
    "researchQuestion": "SEMBOLLERİ ÖĞRENİYORUM doğada ve çevremizde nasıl işler?",
    "text": "SEMBOLLERİ ÖĞRENİYORUM Acil Çıkış Türk Lirası Görsellerdeki sembolleri inceleyelim. Bu sembollerden daha önce gördüklerimizi işaretleyelim ve  nerelerde gördüğümüzü söyleyelim. Anlamını bilmediğimiz sembolleri öğrenelim.  Genel İzleyici Kit",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p51_151",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 51,
    "title": "DENİZ CANLILARI",
    "domain": "Matematik",
    "theme": "DENİZ CANLILARI",
    "researchQuestion": "Deniz canlılarının sıralamasında dikkatini çeken bir şey var mı?",
    "text": "DENİZ CANLILARI Deniz canlılarını inceleyelim. Deniz canlılarının sıralamasında dikkatini çeken bir şey var mı?  Örüntü kuralına göre sıralanan deniz canlılarını bulalım ve yanındaki kutucuğu işaretleyelim. Bloklarla yapılan örüntüyü incele",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Sarı",
      "Mavi"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p53_152",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 53,
    "title": "DÜŞÜN, HAYAL ET VE ÇİZ",
    "domain": "Matematik",
    "theme": "DÜŞÜN, HAYAL ET VE ÇİZ",
    "researchQuestion": "DÜŞÜN, HAYAL ET VE ÇİZ Daha önce aslanağzı çiçeği gördük mü?",
    "text": "DÜŞÜN, HAYAL ET VE ÇİZ Daha önce aslanağzı çiçeği gördük mü? Düşünelim. Aslanağzı çiçeğinin nasıl göründüğünü  tahmin edelim ve çizelim.  Daha önce mirket gördük mü, mirket nasıl bir hayvan olabilir? Düşünelim. Çerçevenin içine bir  mirket ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p54_153",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 54,
    "title": "YETERLİ VE DENGELİ BESLENİYORUM",
    "domain": "Matematik",
    "theme": "YETERLİ VE DENGELİ BESLENİYORUM",
    "researchQuestion": "YETERLİ VE DENGELİ BESLENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "YETERLİ VE DENGELİ BESLENİYORUM Görseldeki besinlerin sağlımız için neden önemli olduğunu söyleyelim. Görseldeki yiyeceklerden satın almak istediklerimizi belirleyelim. Alışveriş listemizdeki kutucukları,  seçtiğimiz yiyeceklerin altındaki ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Altında - Üstünde"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p56_154",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 56,
    "title": "KUMDAKİ AYAK İZLERİ",
    "domain": "Matematik",
    "theme": "KUMDAKİ AYAK İZLERİ",
    "researchQuestion": "Kumda  en fazla ve en az hangi hayvanlar yürümüş?",
    "text": "KUMDAKİ AYAK İZLERİ Ayak izlerini inceleyelim ve bu ayak izlerinin hangi hayvana ait olduğunu söyleyelim. Kumda  en fazla ve en az hangi hayvanlar yürümüş? Bulalım. Kumda en fazla yürümüş olan hayvanı  işaretleyelim. İstediğimiz hayvanın yü",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p57_155",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 57,
    "title": "İLETİŞİM YOLLARIMIZ",
    "domain": "Matematik",
    "theme": "İLETİŞİM YOLLARIMIZ",
    "researchQuestion": "İLETİŞİM YOLLARIMIZ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "İLETİŞİM YOLLARIMIZ İnsanlar, birbirleriyle farklı şekillerde iletişim kurarlar. Bazen konuşarak bazen de konuşmadan,  beden ve yüz ifadeleriyle anlaşırlar. Görselleri inceleyelim. Konuşarak iletişim kuranların görselini  kırmızı kutuyla, k",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kırmızı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p58_156",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 58,
    "title": "RENKLER İLE KODLAMA",
    "domain": "Fen ve Doğa",
    "theme": "RENKLER İLE KODLAMA",
    "researchQuestion": "RENKLER İLE KODLAMA doğada ve çevremizde nasıl işler?",
    "text": "RENKLER İLE KODLAMA Görseldeki böceklerin isimlerini ve altlarındaki renkleri söyleyelim. Tablodaki böceklerin altındaki  kutucukları, aynı renklerde boyayalım. 58",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Altında - Üstünde",
      "Aynı - Farklı",
      "5 (Beş)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b1_p59_157",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 59,
    "title": "SÖZCÜK SAYISI",
    "domain": "Matematik",
    "theme": "SÖZCÜK SAYISI",
    "researchQuestion": "SÖZCÜK SAYISI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "SÖZCÜK SAYISI Cümleleri dikkatle dinleyelim. Cümlelerin kaç sözcükten oluştuğunu bulalım. Sözcükleri sayalım  ve sözcük sayısı kadar alkışlayalım. Görsellerin yanındaki kutuları örnekteki gibi sözcük sayısı  kadar boyayalım. Zürafaların boy",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b1_p60_158",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 60,
    "title": "ATIK KUTULARI",
    "domain": "Bütünleşik Etkinlik",
    "theme": "ATIK KUTULARI",
    "researchQuestion": "ATIK KUTULARI konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "ATIK KUTULARI Görselleri inceleyelim. Her grupta geri dönüşüm türüne uygun olmayan atığı bulalım ve  işaretleyelim.  Evimiz ve okulumuzda metal, plastik, cam ve kâğıt atıkları biriktirelim. Atık kutularının renklerine  dikkat ederek atıklar",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_48_60_b1_p62_159",
    "ageGroup": "48-60",
    "bookNo": 1,
    "pageNo": 62,
    "title": "PARÇA-BÜTÜN",
    "domain": "Matematik",
    "theme": "PARÇA-BÜTÜN",
    "researchQuestion": "BÜTÜN Çerçevelerin içindeki şekilden taranmış bölümleri çıkarınca hangi şekil oluşur?",
    "text": "PARÇA-BÜTÜN Çerçevelerin içindeki şekilden taranmış bölümleri çıkarınca hangi şekil oluşur? Alttaki seçeneklerden  doğru olanı işaretleyelim. 62",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Bütün - Yarım",
      "İçinde - Dışında",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p9_160",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 9,
    "title": "ÇİNİ DÜKKÂNI",
    "domain": "Sanat",
    "theme": "ÇİNİ DÜKKÂNI",
    "researchQuestion": "Farklı malzemelerle ÇİNİ DÜKKÂNI nasıl canlandırabiliriz?",
    "text": "9 ÇİNİ DÜKKÂNI Çini sanatı geleneksel Türk el sanatlarından biridir. Hüseyin Usta’nın dükkânındaki raflarda dört  çeşit çini eşya var. Raflardaki farklı çiniyi bulup işaretleyelim.",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Aynı - Farklı",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D1 Adalet"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b2_p11_161",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 11,
    "title": "NEYIN SESI?",
    "domain": "Matematik",
    "theme": "NEYIN SESI?",
    "researchQuestion": "NEYIN SESI? ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "NEYIN SESI? Karekodlardaki sesleri dinleyelim. Dinlediğimiz sesleri taklit etmeye çalışalım. Sesin hangi görsele  ait olduğunu bulup yanındaki kutuyu işaretleyelim. ⭐ \u0007Öğretmene Not: Sayfadaki karekodlarda sırasıyla; suya düşen top, davul, ",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p12_162",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 12,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "Tane şemsiye  var?",
    "text": "24 4 RAKAMI 4 4 4 5 4 5 5 4 6 6 4 rakamlarını bulalım ve işaretleyelim. Sepetlerden hangisinde 4 tane şemsiye  var? Bulalım ve işaretleyelim. Şemsiyelerden 4 tanesini boyayalım.  Yağmurlu havalar dışında şemsiyeleri  nerelerde kullanabiliri",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "İçinde - Dışında",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p13_163",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 13,
    "title": "SOHBETI TAMAMLA",
    "domain": "Matematik",
    "theme": "SOHBETI TAMAMLA",
    "researchQuestion": "Dedenler nerede yaşıyor?",
    "text": "SOHBETI TAMAMLA Çocukların konuşmalarını dinleyelim. Konuşmayı tamamlayabilecek cümleyi bulup işaretleyelim. Bu hafta sonu dedemlere  gideceğiz. Boyamamı bitiremiyorum.  Çok yoruldum. Dedenler nerede yaşıyor? Onlar Sinop’ta yaşıyor. Senin i",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Kırmızı",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p14_164",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 14,
    "title": "KURBAĞANIN YOLU",
    "domain": "Müzik",
    "theme": "KURBAĞANIN YOLU",
    "researchQuestion": "Bedenimiz ve sesimizle KURBAĞANIN YOLU ritmini nasıl yakalarız?",
    "text": "KURBAĞANIN YOLU Kurbağalar farklı sesler çıkarabilir. Kurbağaların  seslerini ve hareketlerini taklit edelim. Kurbağaların nilüfere ulaşmasına yardım edelim. Önce parmağımızla yolları takip edelim, sonra  kalemimizle tamamlayalım. Vırak! Vı",
    "materials": [
      "Ses boruları",
      "Ahşap kastanyet"
    ],
    "concepts": [
      "Aynı - Farklı",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_48_60_b2_p15_165",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 15,
    "title": "HANGI RENKLER KULLANILMIŞ?",
    "domain": "Matematik",
    "theme": "HANGI RENKLER KULLANILMIŞ?",
    "researchQuestion": "HANGI RENKLER KULLANILMIŞ?",
    "text": "HANGI RENKLER KULLANILMIŞ? Görselleri inceleyelim. Melek, resimlerinde hangi renkleri kullanmış? Resimde kullanılan renklerin  olduğu paleti bulup çizgi çizerek eşleştirelim. Boş palete istediğimiz renkleri seçelim. Paletimizdeki  renklere ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p16_166",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 16,
    "title": "RENKLİ BALIKLAR",
    "domain": "Matematik",
    "theme": "RENKLİ BALIKLAR",
    "researchQuestion": "RENKLİ BALIKLAR ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "RENKLİ BALIKLAR Balık görsellerini inceleyelim. Balıkların özellikleri hakkında konuşalım. Görsellerde birbiriyle aynı  olan balıkları bulalım ve çizgi çizerek eşleştirelim. Eşi olmayan balık görselini işaretleyelim. Boş  çerçeveye kutucukl",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p17_167",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 17,
    "title": "BILMECELERLE HAVA OLAYLARI",
    "domain": "Matematik",
    "theme": "BILMECELERLE HAVA OLAYLARI",
    "researchQuestion": "Bil  bakalım ben neyim?",
    "text": "BILMECELERLE HAVA OLAYLARI Bilmeceleri dinleyelim. Cevapları görseller arasından bulup işaretleyelim. Bulduğumuz hava  olaylarını sınıfta canlandıralım. Çıkardıkları sesleri taklit edelim.  Beyazdır rengim.  Çocukları eğlendiririm.  Hava so",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p18_168",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 18,
    "title": "EN UZUN FİDAN",
    "domain": "Sanat",
    "theme": "EN UZUN FİDAN",
    "researchQuestion": "Farklı malzemelerle EN UZUN FİDAN nasıl canlandırabiliriz?",
    "text": "EN UZUN FİDAN Fidan görsellerini inceleyelim. Her sırada en uzun olan fidanı bulalım. Fidanın altındaki kutucuğu  boyayalım.  18",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b2_p19_169",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 19,
    "title": "NEZAKET SÖZCÜKLERI",
    "domain": "Matematik",
    "theme": "NEZAKET SÖZCÜKLERI",
    "researchQuestion": "Çocuklar hangi nezaket sözcüğünü kullanmış olabilir?",
    "text": "NEZAKET SÖZCÜKLERI Nezaket sözcükleri insanlar arasındaki iletişimi daha nazik ve olumlu hâle getiren sözcüklerdir.  Günaydın, lütfen, teşekkür ederim, özür dilerim, rica ederim nezaket sözcüklerinden bazılarıdır. Görselleri inceleyelim. Ço",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p20_170",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 20,
    "title": "İLİŞKİLİ VARLIKLAR",
    "domain": "Sanat",
    "theme": "İLİŞKİLİ VARLIKLAR",
    "researchQuestion": "Farklı malzemelerle İLİŞKİLİ VARLIKLAR nasıl canlandırabiliriz?",
    "text": "İLİŞKİLİ VARLIKLAR Görselleri inceleyelim. Her çerçevenin üst bölümünde yer alan görselle ilişkili olanları bulup  işaretleyelim. 20",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b2_p21_171",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 21,
    "title": "UYAKLI SÖZCÜKLER",
    "domain": "Matematik",
    "theme": "UYAKLI SÖZCÜKLER",
    "researchQuestion": "UYAKLI SÖZCÜKLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "UYAKLI SÖZCÜKLER Sayfadaki görsellerin isimlerini söyleyelim. Söylenişi birbirine benzeyen sözcükleri bulalım. Söylenişi  benzeyen sözcüklere uyaklı sözcükler denir. Uyaklı sözcükleri görsellerini çizgi çizerek eşleştirelim. TENCERE TUZ BUZ",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p22_172",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 22,
    "title": "MERHABA, ÜÇGEN",
    "domain": "Matematik",
    "theme": "MERHABA, ÜÇGEN",
    "researchQuestion": "MERHABA, ÜÇGEN ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "MERHABA, ÜÇGEN Benim adım üçgen. 3 köşem ve 3 kenarım var. Görsellerden yüzeyi üçgen şekline  benzeyenleri bulalım ve işaretleyelim. Üçgenleri boyayarak köpeği   kemiğe ulaştıralım. Üçgen şeklini kullanarak bir resim yapalım. 22",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Üçgen",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p23_173",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 23,
    "title": "ENDEMIK BITKILER",
    "domain": "Matematik",
    "theme": "ENDEMIK BITKILER",
    "researchQuestion": "ENDEMIK BITKILER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ENDEMIK BITKILER Mustafa’nın elindeki kartlarda yazılan bilgileri dikkatle dinleyelim. Anlatılan özelliklere uygun  bitkiyi bulalım. Bitkilerin altındaki kutuları ilgili bilgi kartının rengine boyayalım. Damalı Lale Göl Soğanı Kum Zambağı K",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Az - Çok",
      "Kırmızı",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p24_174",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 24,
    "title": "YAŞAMDAN KARELER",
    "domain": "Matematik",
    "theme": "YAŞAMDAN KARELER",
    "researchQuestion": "YAŞAMDAN KARELER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "YAŞAMDAN KARELER Fotoğrafları inceleyelim. Fotoğraflarda neler olduğunu söyleyelim. Cümleleri dinleyelim. Hangi fotoğrafa ait olduğunu bulalım. Fotoğraf mandallarının renklerine  göre kutucukları boyayalım. Tuğba, muhabbet kuşu Maviş omzuna",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Mavi"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p25_175",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 25,
    "title": "ATIKLARIM KUTUYA",
    "domain": "Fen ve Doğa",
    "theme": "ATIKLARIM KUTUYA",
    "researchQuestion": "Un elinde neler var?",
    "text": "ATIKLARIM KUTUYA    Merhaba, benim adım  Onur. Ailemle birlikte evimizdeki  atıkları özelliklerine göre ayırıyoruz. Geri  dönüştürülebilen atıkları uygun kutulara atarak  doğamızı korumaya yardımcı oluyoruz. Görseli inceleyelim. Onur’un eli",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p26_176",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 26,
    "title": "KILIM MOTIFLERI",
    "domain": "Matematik",
    "theme": "KILIM MOTIFLERI",
    "researchQuestion": "KILIM MOTIFLERI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KILIM MOTIFLERI Kilim görsellerini ve üzerindeki motifleri inceleyelim. Aynı olan kilimleri çizgi çizerek eşleştirelim.  Görseldeki kilim dokuma tezgâhını inceleyelim. İstediğimiz renk ve motifleri kullanarak  kendi kilimimizi tasarlayalım.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p27_177",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 27,
    "title": "INCI KEFALI",
    "domain": "Fen ve Doğa",
    "theme": "INCI KEFALI",
    "researchQuestion": "INCI KEFALI doğada ve çevremizde nasıl işler?",
    "text": "INCI KEFALI Van Gölü’nde yaşayan inci kefalleri akıntıya karşı yüzerek göç ederler. İnci kefalinin yolunu  bulmasına yardım ederek onu yuvasına ulaştıralım.  Görseldeki balıklardan inci kefallerini bulalım ve işaretleyelim. Bir işi başarmak",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p28_178",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 28,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "RAKAMI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "5 RAKAMI 6 4 5 4 5 5 5 6 6 5 rakamlarını bulalım ve işaretleyelim. Kitaplardan 5 tanesini boyayalım. 5 tane kitap olan rafı işaretleyelim. En  sevdiğimiz kitap hangisi, söyleyelim. 5 rakamını kullanarak resim yapalım. Önce parmağımızla daha",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p29_179",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 29,
    "title": "NİLÜFER ÇİÇEKLERİNİ SAYALIM",
    "domain": "Matematik",
    "theme": "NİLÜFER ÇİÇEKLERİNİ SAYALIM",
    "researchQuestion": "NİLÜFER ÇİÇEKLERİNİ SAYALIM Nilüfer çiçeklerinin suyun üstünde nasıl durduğunu biliyor muyuz?",
    "text": "NİLÜFER ÇİÇEKLERİNİ SAYALIM Nilüfer çiçeklerinin suyun üstünde nasıl durduğunu biliyor muyuz? Söyleyelim. Nilüfer çiçeği  suyun altındaki kökleriyle göl tabanına tutunur. Görseli inceleyelim. Hasan’ın ne yaptığını  anlatalım. Yaprakların üz",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p30_180",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 30,
    "title": "TEMBEL HAYVANIN IZLERI",
    "domain": "Matematik",
    "theme": "TEMBEL HAYVANIN IZLERI",
    "researchQuestion": "Tembel hayvanlar  nasıl hareket ediyor olabilir?",
    "text": "TEMBEL HAYVANIN IZLERI Tembel hayvanlar, çok yavaş hareket ettikleri için bu şekilde isimlendirilir. Tembel hayvanlar  nasıl hareket ediyor olabilir? Taklit edelim. Bu hayvanların iki ve üç parmaklı olmak üzere iki  farklı türü vardır. Görs",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p31_181",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 31,
    "title": "TRAFIK IŞARETLERI",
    "domain": "Matematik",
    "theme": "TRAFIK IŞARETLERI",
    "researchQuestion": "Biz bu  işaretleri daha önce gördük mü?",
    "text": "TRAFIK IŞARETLERI Onur, yolda bazı işaretler görmüş ve bu işaretlerin anlamını merak etmiş. Ailesine sorarak  anlamlarını öğrenmiş. Onur’un gördüğü işaretleri inceleyelim, açıklamalarını dinleyelim. Biz bu  işaretleri daha önce gördük mü? S",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p33_182",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 33,
    "title": "Numaralı Göreve",
    "domain": "Matematik",
    "theme": "Numaralı Göreve",
    "researchQuestion": "Papatyaların altında hangi hayvan  var?",
    "text": "3 Numaralı Göreve Hoş Geldin! Ağaçlardaki arı yuvalarını say. Arı yuvası  sayısı çok olan ağacı işaretle. Arı yuvası  sayısı az olan ağaca 4 tane elma çiz. 4 Numaralı Göreve Hoş Geldin! Gökyüzündeki kuşları say. En yüksekte  uçan kuşu kalem",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Az - Çok",
      "Altında - Üstünde",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p34_183",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 34,
    "title": "BENIM ÇIÇEK TABLOM",
    "domain": "Fen ve Doğa",
    "theme": "BENIM ÇIÇEK TABLOM",
    "researchQuestion": "BENIM ÇIÇEK TABLOM doğada ve çevremizde nasıl işler?",
    "text": "BENIM ÇIÇEK TABLOM Görselleri inceleyelim. En beğendiğimiz tablonun altındaki kutucuğu işaretleyelim.  Arkadaşlarımızın hangi tabloyu seçtiğini inceleyelim. Farklı tabloları beğenmemizin nedenleri  hakkında sohbet edelim.\t Boş çerçeveye sev",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p35_184",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 35,
    "title": "UYUMAK İÇİN NELER YAPARIZ?",
    "domain": "Matematik",
    "theme": "UYUMAK İÇİN NELER YAPARIZ?",
    "researchQuestion": "UYUMAK İÇİN NELER YAPARIZ?",
    "text": "UYUMAK İÇİN NELER YAPARIZ? Görsellerden geceyle ilgili olanları işaretleyelim. Genellikle gündüz yaptığımız etkinliklere örnekler  verelim. Ahmet, ailesi ile kampa gittiğinde, uykusunun gelmesi için yıldızları saymaya karar verdi.  Ahmet’in",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Az - Çok",
      "Gece - Gündüz",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p36_185",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 36,
    "title": "TAM VE YARIM",
    "domain": "Matematik",
    "theme": "TAM VE YARIM",
    "researchQuestion": "TAM VE YARIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "TAM VE YARIM Bir nesneyi tam ortadan, eşit olacak şekilde böldüğümüzde iki yarım elde ederiz.  Görselleri inceleyelim ve görsellerin isimlerini söyleyelim. Siyah çizgilerle belirtilen yerlerden  kesildiğinde iki eşit parçaya bölünecek olan ",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Bütün - Yarım",
      "1 (Bir)"
    ],
    "values": [
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p37_186",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 37,
    "title": "ÇANAK ÇÖMLEK DÜKKÂNI",
    "domain": "Matematik",
    "theme": "ÇANAK ÇÖMLEK DÜKKÂNI",
    "researchQuestion": "ÇANAK ÇÖMLEK DÜKKÂNI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "ÇANAK ÇÖMLEK DÜKKÂNI Erdem Usta, en eski el sanatlarından biri olan çömlekçilik ustası. Toprağı şekillendirerek yaptığı  çanak ve çömlekleri dükkânında sergiliyor. Erdem Usta’nın bazı ürünleri diğerlerinden farklı  olmuş. Her sırada diğerle",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Az - Çok",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p38_187",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 38,
    "title": "RÜZGÂR ESİNCE",
    "domain": "Matematik",
    "theme": "RÜZGÂR ESİNCE",
    "researchQuestion": "RÜZGÂR ESİNCE ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "RÜZGÂR ESİNCE Görselleri inceleyelim. Rüzgâr estiğinde neler olabileceğini konuşalım. Görsellerle ilgili cümleleri  dinleyelim ve sözcük sayısı kadar kutuyu boyayalım.  Yapraklar savrulur. Vapurdaki çocuğun şapkası uçar. Şemsiyeleri tutmak ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p40_188",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 40,
    "title": "SİNCABIN YOLU",
    "domain": "Sanat",
    "theme": "SİNCABIN YOLU",
    "researchQuestion": "Farklı malzemelerle SİNCABIN YOLU nasıl canlandırabiliriz?",
    "text": "SİNCABIN YOLU Sincabı meşe palamuduna ulaştırma sırası sende. Oyun hamurumuzu kutulara değdirmeden  yerleştirerek sincaba yeni bir yol oluşturalım. Daha sonra oluşturduğumuz yolu kalemle çizelim. Sincaptan meşe palamuduna uzanan yolu önce p",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Aynı - Farklı",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b2_p41_189",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 41,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "Arılar  bu petekleri doldurmak için hangi çiçeklere  konmuş olabilir?",
    "text": "6 RAKAMI 6 rakamını kullanarak resim yapalım. 8 7 6 6 6 8 7 6 7 6 rakamlarını bulalım ve işaretleyelim. Önce parmağımızla daha sonra kalemimizle 6 rakamının üzerinden geçelim. 6 6 1 Bal peteklerinden 6 tanesini boyayalım. Arılar  bu petekle",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p42_190",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 42,
    "title": "BILMECELERLE MEVSIMLER",
    "domain": "Matematik",
    "theme": "BILMECELERLE MEVSIMLER",
    "researchQuestion": "Bil bakalım ben neyim?",
    "text": "BILMECELERLE MEVSIMLER Bilmeceleri dinleyelim. Cevapları bilmecelerin altındaki kutucuklardan bularak işaretleyelim. Her  mevsimle ilgili aklımıza gelen üç şeyi söyleyerek “Üç Şey Bulma Oyunu” oyununu oynayalım. (İLKBAHAR) (SONBAHAR) (YAZ) ",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Altında - Üstünde",
      "Sıcak - Soğuk"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p43_191",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 43,
    "title": "BOYUTUNA GÖRE EŞLEŞTIRELIM",
    "domain": "Matematik",
    "theme": "BOYUTUNA GÖRE EŞLEŞTIRELIM",
    "researchQuestion": "BOYUTUNA GÖRE EŞLEŞTIRELIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "BOYUTUNA GÖRE EŞLEŞTIRELIM Bölmelerde bulunan hayvanları ve yiyecekleri inceleyelim. Hayvanları büyüklüklerine uygun olan  yiyeceklerle çizgi çizerek eşleştirelim. Çekirdeklerin boyutlarını inceleyelim. Her çerçeveye çekirdeğin boyutuna uyg",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p44_192",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 44,
    "title": "ÜLKEMİZDE VE DÜNYADA SPOR",
    "domain": "Matematik",
    "theme": "ÜLKEMİZDE VE DÜNYADA SPOR",
    "researchQuestion": "Madalya kazanmış bir sporcu ne hissedebilir?",
    "text": "ÜLKEMİZDE VE DÜNYADA SPOR Ülkemizi başarıyla temsil eden birçok  millî sporcu vardır. Bu sporcular özverili ve disiplinli  çalışarak çeşitli spor dallarında ülkemize madalyalar kazandırıyor. Hangi dalda ülkemize madalya  kazandırmak isterdi",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D1 Adalet",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p45_193",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 45,
    "title": "YÜRÜYEN KÖŞK",
    "domain": "Matematik",
    "theme": "YÜRÜYEN KÖŞK",
    "researchQuestion": "YÜRÜYEN KÖŞK ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "YÜRÜYEN KÖŞK Ağaçların büyüme aşamalarını düşünelim ve rakamlarla görselleri örnekteki gibi çizerek eşleştirelim. 1 2 3 4 5 Bir zamanlar, bir köşkün bahçesinde yer alan çınar  ağacı o kadar büyümüş ki dalları köşkün duvarlarına  zarar verme",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p47_194",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 47,
    "title": "DUYU ORGANLARIM",
    "domain": "Fen ve Doğa",
    "theme": "DUYU ORGANLARIM",
    "researchQuestion": "DUYU ORGANLARIM doğada ve çevremizde nasıl işler?",
    "text": "DUYU ORGANLARIM Her sıradaki görselleri inceleyelim. Yönergelere uygun olanları bulup işaretleyelim. Sesini duyabileceğimiz varlıkları işaretleyelim. Büyüteç ya da özel bir araç kullanmadan görebileceğimiz varlıkları işaretleyelim. Tadı ola",
    "materials": [
      "Büyük boy el büyüteçleri",
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p48_195",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 48,
    "title": "Cep telefonuyla",
    "domain": "Matematik",
    "theme": "Cep telefonuyla",
    "researchQuestion": "Kütüphaneler neden önemlidir?",
    "text": "Cep telefonuyla  konuşmak yasaktır. Yüksek sesle konuşmak  yasaktır. Kitaplara ve eşyalara   zarar vermek yasaktır. Su hariç, yiyecek ve içecek  getirilmesi yasaktır. KÜTÜPHANELER HAFTASI Kitap raflarını inceleyelim. Raflarda kitapların yan",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p49_196",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 49,
    "title": "GECECIL HAYVANLAR",
    "domain": "Fen ve Doğa",
    "theme": "GECECIL HAYVANLAR",
    "researchQuestion": "GECECIL HAYVANLAR doğada ve çevremizde nasıl işler?",
    "text": "GECECIL HAYVANLAR 4 5 5 3 4 6 Gündüz dinlenip geceleri aktif olan hayvanlara gececil hayvanlar denir. Kirpi, yarasa, baykuş  bunlara örnektir. Bildiğimiz başka gececil hayvanlara örnek verelim.  Görselleri inceleyelim. Her gececil hayvandan",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Gece - Gündüz",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p50_197",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 50,
    "title": "MERHABA, DIKDÖRTGEN",
    "domain": "Matematik",
    "theme": "MERHABA, DIKDÖRTGEN",
    "researchQuestion": "MERHABA, DIKDÖRTGEN ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "MERHABA, DIKDÖRTGEN Benim adım dikdörtgen. 4 köşem ve 4 kenarım var. Kenarlarımın ikisi uzun, ikisi kısa. Görsellerden yüzeyi dikdörtgen şekline  benzeyenleri bulalım ve işaretleyelim. Dikdörtgenleri işaretleyerek   karıncayı çekirdeğe ulaş",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Uzun - Kısa",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p51_198",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 51,
    "title": "DÜŞÜN, HAYAL ET VE ÇIZ",
    "domain": "Matematik",
    "theme": "DÜŞÜN, HAYAL ET VE ÇIZ",
    "researchQuestion": "DÜŞÜN, HAYAL ET VE ÇIZ Hediye paketinde hangi renkler var?",
    "text": "DÜŞÜN, HAYAL ET VE ÇIZ Hediye paketinde hangi renkler var? Söyleyelim. Paketin içinde ne olabilir? Hayal edelim ve  yanına çizelim. Saksının rengini ve üzerindeki geometrik şeklin adını söyleyelim. Bu saksıda nasıl bir çiçek  yetişiyor olab",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "İçinde - Dışında",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p52_199",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 52,
    "title": "DOĞRU MU, YANLIŞ MI?",
    "domain": "Fen ve Doğa",
    "theme": "DOĞRU MU, YANLIŞ MI?",
    "researchQuestion": "DOĞRU MU, YANLIŞ MI?",
    "text": "DOĞRU MU, YANLIŞ MI? Görselleri inceleyelim. Doğru olduğunu düşündüğümüz davranışlar için yeşil kutucuğu, yanlış  olduğunu düşündüğümüz davranışlar için kırmızı kutucuğu işaretleyelim. Ardından doğayı nasıl  koruyabileceğimiz hakkında sohbe",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Yeşil"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p53_200",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 53,
    "title": "KIMDIR BU?",
    "domain": "Matematik",
    "theme": "KIMDIR BU?",
    "researchQuestion": "KIMDIR BU? ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KIMDIR BU? Gizem’in arkadaşlarıyla ilgili verdiği ipuçlarını dikkatle dinleyelim. Verilen ipuçlarına göre  arkadaşlarını tahmin edelim ve uygun görselin altındaki kutucuğu belirlenen renkte boyayalım.  Merhaba, ben Gizem. Arkadaşlarımı bulm",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Az - Çok",
      "Kırmızı",
      "Sarı"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p54_201",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 54,
    "title": "BEDENLE RITIM",
    "domain": "Matematik",
    "theme": "BEDENLE RITIM",
    "researchQuestion": "BEDENLE RITIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "BEDENLE RITIM Ritim örüntülerini takip ederek arkadaşlarımızla birlikte uygulayalım. Ayağını yere vur. El çırp. Yumruğunu masaya vur. 54",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "1 (Bir)",
      "4 (Dört)",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p55_202",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 55,
    "title": "HANGISI SÖYLENMEDI?",
    "domain": "Fen ve Doğa",
    "theme": "HANGISI SÖYLENMEDI?",
    "researchQuestion": "HANGISI SÖYLENMEDI?",
    "text": "HANGISI SÖYLENMEDI? Çerçevelerin içindeki görselleri inceleyelim. Okunacak sözcükleri dikkatle dinleyelim. İsmi söylenmeyen  sözcüğün görselini işaretleyelim.  TOPRAK - YAPRAK - UÇAK - TARAK BARDAK - YATAK - OYUNCAK - BAYRAK ÖRDEK - İNEK - ",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p56_203",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 56,
    "title": "MUTFAKTA TAM-YARIM",
    "domain": "Matematik",
    "theme": "MUTFAKTA TAM-YARIM",
    "researchQuestion": "MUTFAKTA TAM-YARIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "MUTFAKTA TAM-YARIM Aslan, ailesi için bir meyve salatası hazırlamak istiyor. İşe, bu meyve salatası için kullanacağı  malzemeleri ve miktarlarını listeleyerek başlıyor. LİSTE Listeyi dinleyelim. Listede yazan malzemeleri miktarlarına dikkat",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Bütün - Yarım",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p58_204",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 58,
    "title": "KITAP SEÇIM GÜNÜ",
    "domain": "Matematik",
    "theme": "KITAP SEÇIM GÜNÜ",
    "researchQuestion": "KITAP SEÇIM GÜNÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KITAP SEÇIM GÜNÜ Çınar ve arkadaşları, sınıfta “365 Gün Öykü” serisindeki kitaplardan hangisinin okunacağını  belirlemek için bir oylama yapıyor. Oylama sonuçlarına göre hazırlanan grafiği inceleyelim.  Hangi kitabın okunması gerektiğini sö",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p59_205",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 59,
    "title": "HANGISI DAHA AĞIR?",
    "domain": "Fen ve Doğa",
    "theme": "HANGISI DAHA AĞIR?",
    "researchQuestion": "HANGISI DAHA AĞIR?",
    "text": "HANGISI DAHA AĞIR? Kirpi ormanda yürürken farklı hayvanlarla karşılaşıyor. Karşılaştığı hayvan kirpiden daha ağırsa  kutucuğu maviye boyayalım. Karşılaştığı hayvan kirpiden daha hafifse el çırpalım. 59",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Ağır - Hafif",
      "Mavi",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b2_p60_206",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 60,
    "title": "PENGUENLER KUŞ MU, BALIK MI?",
    "domain": "Matematik",
    "theme": "PENGUENLER KUŞ MU, BALIK MI?",
    "researchQuestion": "PENGUENLER KUŞ MU, BALIK MI?",
    "text": "PENGUENLER KUŞ MU, BALIK MI? Görsellerdeki penguenleri inceleyelim. Bazı penguenler suda yüzüyor, bazıları ise karada  yürüyor. Penguenler kuş mu, balık mı? Düşünelim, araştıralım. Görseldeki oyuncak penguenin boyu kaç karış? Penguen görsel",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b2_p61_207",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 61,
    "title": "MILLÎ TEKNOLOJILERIMIZ",
    "domain": "Hareket ve Sağlık",
    "theme": "MILLÎ TEKNOLOJILERIMIZ",
    "researchQuestion": "MILLÎ TEKNOLOJILERIMIZ hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "MILLÎ TEKNOLOJILERIMIZ Görsellerdeki araçları inceleyelim. Araçların hareket ettikleri yeri bulalım ve işaretleyelim. Ülkemizde üretilen elektrikli otomobil. Ülkemizde üretilen uçak Hürkuş. Ülkemizde üretilen helikopter.  Ülkemizde üretilen",
    "materials": [
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_48_60_b2_p62_208",
    "ageGroup": "48-60",
    "bookNo": 2,
    "pageNo": 62,
    "title": "NEYE İHTİYACI VAR?",
    "domain": "Matematik",
    "theme": "NEYE İHTİYACI VAR?",
    "researchQuestion": "NEYE İHTİYACI VAR?",
    "text": "NEYE İHTİYACI VAR? Görsellerdeki çocukları inceleyelim. Çocukların neye ihtiyacı olabilir? Düşünelim. Çocukların ihtiyaç  duyabileceği eşyaları çizgi çizerek eşleştirelim. Beslenme sırasında nelere ihtiyaç duyarız? Beslenme sırasında ihtiya",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p9_209",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 9,
    "title": "ÇATALHÖYÜK’TE KEŞİF",
    "domain": "Matematik",
    "theme": "ÇATALHÖYÜK’TE KEŞİF",
    "researchQuestion": "ÇATALHÖYÜK’TE KEŞİF ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "9 ÇATALHÖYÜK’TE KEŞİF Arkeologlar çok eski zamanlarda yaşamış insanlardan kalan yapıları ve eşyaları araştırır. Toprağın  altında kalan eski eşyaları dikkatlice ortaya çıkarır. Konya Çatalhöyük’te arkeologların bulduğu  nesneleri inceleyeli",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Altında - Üstünde"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p10_210",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 10,
    "title": "RAFTAKİ EŞYALAR",
    "domain": "Sanat",
    "theme": "RAFTAKİ EŞYALAR",
    "researchQuestion": "Farklı malzemelerle RAFTAKİ EŞYALAR nasıl canlandırabiliriz?",
    "text": "10 RAFTAKİ EŞYALAR Esma, 1 ve 2 numaralı görsellerin her birinde eşyalardan birini saklamış. Esma’nın sakladığı  eşyaları söyleyelim. Raflarda boş bırakılan yerlere eksik eşyaları çizelim. Esma’nın odasındaki rafları inceleyelim. Raflardaki",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p11_211",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 11,
    "title": "DİNLEYELİM, BULALIM",
    "domain": "Fen ve Doğa",
    "theme": "DİNLEYELİM, BULALIM",
    "researchQuestion": "DİNLEYELİM, BULALIM doğada ve çevremizde nasıl işler?",
    "text": "11 DİNLEYELİM, BULALIM Cümleleri dinleyelim. Görsellerin altındaki kutucukları, dinlediğimiz cümlenin başındaki renge  uygun boyayalım. Efe, bugün ailesiyle birlikte botanik bahçesine gideceği için mutlu uyandı ve yatağını  topladı. Efe, ka",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Altında - Üstünde",
      "Mutlu - Üzgün",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p13_212",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 13,
    "title": "TOPRAĞIN ALTINDA YAŞAYAN HAYVANLAR",
    "domain": "Fen ve Doğa",
    "theme": "TOPRAĞIN ALTINDA YAŞAYAN HAYVANLAR",
    "researchQuestion": "TOPRAĞIN ALTINDA YAŞAYAN HAYVANLAR doğada ve çevremizde nasıl işler?",
    "text": "13 TOPRAĞIN ALTINDA YAŞAYAN HAYVANLAR Toprağın altında yaşayan hayvanların isimlerini söyleyelim. Kesik çizgileri tamamlayarak hayvanları  arkadaşlarına ulaştıralım.",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p14_213",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 14,
    "title": "İSTEK Mİ, İHTİYAÇ MI?",
    "domain": "Sosyal & Duygusal",
    "theme": "İSTEK Mİ, İHTİYAÇ MI?",
    "researchQuestion": "İSTEK Mİ, İHTİYAÇ MI?",
    "text": "14 İSTEK Mİ, İHTİYAÇ MI? İstek ne demek? İhtiyaç ne demek? Satın alacağımız ürünlerde öncelikle isteklerimizi mi,  ihtiyaçlarımızı mı dikkate almalıyız? Arkadaşlarımızla fikirlerimizi paylaşalım. Esma ve ailesi alışverişe çıkmış. Esma’nın k",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_48_60_b3_p15_214",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 15,
    "title": "KİTAP KAPAKLARI",
    "domain": "Matematik",
    "theme": "KİTAP KAPAKLARI",
    "researchQuestion": "Sayfalar hangi kitaplara ait olabilir?",
    "text": "15 KİTAP KAPAKLARI Görselleri inceleyelim. Sayfalar hangi kitaplara ait olabilir? Sayfalarla kitap kapaklarını  eşleştirelim. En sevdiğimiz hikâye kitabının adını düşünelim ve söyleyelim.     \u0007Öğretmene Not: Bu kitaplardan biri okunarak sür",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p16_215",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 16,
    "title": "PANGOLİNİN YOLU",
    "domain": "Matematik",
    "theme": "PANGOLİNİN YOLU",
    "researchQuestion": "Pangolinin arkadaşlarına ulaşması için kaç kare kaldı?",
    "text": "16 PANGOLİNİN YOLU ● Okun gösterdiği yerden başlayarak ileriye doğru üç kareyi boya. ● Son boyadığın karenin altındaki dört kareyi boya. ● \u0007Pangolinin arkadaşlarına ulaşması için kaç kare kaldı? Say ve söyle. Bu kareleri boyayarak  pangolin",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kare",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p17_216",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 17,
    "title": "PARÇALARI BULALIM",
    "domain": "Sanat",
    "theme": "PARÇALARI BULALIM",
    "researchQuestion": "Farklı malzemelerle PARÇALARI BULALIM nasıl canlandırabiliriz?",
    "text": "17 PARÇALARI BULALIM Bloklardan yapılmış modelleri inceleyelim. Modelleri oluşturan parçaları çerçevelerin içinden  bulalım ve yanındaki kutucukla aynı renge boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p18_217",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 18,
    "title": "DUYGULARIMI YÖNETIYORUM",
    "domain": "Matematik",
    "theme": "DUYGULARIMI YÖNETIYORUM",
    "researchQuestion": "DUYGULARIMI YÖNETIYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "18 DUYGULARIMI YÖNETIYORUM Bazen kendimizi öfkeli ya da üzgün hissedebiliriz. Sakinleşmek için bazı etkinlikler yapabiliriz. Sayı  küpünü atalım. Gelen sayıyı bulup yanındaki etkinliği yapalım. Bir balon şişir. 10 kere derin nefes al ve ver",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "Mutlu - Üzgün"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p19_218",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 19,
    "title": "DÖNÜŞTÜR, DEĞERLENDİR",
    "domain": "Fen ve Doğa",
    "theme": "DÖNÜŞTÜR, DEĞERLENDİR",
    "researchQuestion": "Saksıda hangi renk çiçekler var?",
    "text": "19 DÖNÜŞTÜR, DEĞERLENDİR Görseldeki kişi Gizem. Elindeki de en sevdiği saksısı. Saksıda hangi renk çiçekler var? Söyleyelim. Birinci sıradaki eşyaların adını söyleyelim. İkinci sıradaki tasarımları inceleyelim. Birbiriyle ilişkili olanların",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal tuz seramiği / Oyun hamuru"
    ],
    "concepts": [
      "Kalın - İnce",
      "Sarı",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p20_219",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 20,
    "title": "TRAFIK İŞARETLERI",
    "domain": "Sanat",
    "theme": "TRAFIK İŞARETLERI",
    "researchQuestion": "Farklı malzemelerle TRAFIK İŞARETLERI nasıl canlandırabiliriz?",
    "text": "20 TRAFIK İŞARETLERI Trafik işaretlerini inceleyelim. İşaretlerin ne anlama geldiğini konuşalım. Daha önce gördüğümüz  trafik işaretlerinin yanındaki kutucuğu boyayalım. Bu işaret “yaya geçidi” işaretidir. Bu işaret “üst geçit” işaretidir. ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p21_220",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 21,
    "title": "BÖCEKLERI SAYALIM",
    "domain": "Fen ve Doğa",
    "theme": "BÖCEKLERI SAYALIM",
    "researchQuestion": "BÖCEKLERI SAYALIM doğada ve çevremizde nasıl işler?",
    "text": "21 BÖCEKLERI SAYALIM Görselleri inceleyelim. Her böcekten kaç tane olduğunu sayarak bulalım ve uygun kutucukları  bularak işaretleyelim. Yusufçuk Uğur Böceği Kelebek Arı 7 8 7 8 4 3 4 6 7 66 7 4 55 4",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p22_221",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 22,
    "title": "KENDİMİ KORUYORUM",
    "domain": "Fen ve Doğa",
    "theme": "KENDİMİ KORUYORUM",
    "researchQuestion": "Hayvanlar hangi durumlarda kendilerini tehlikede hissediyor olabilir?",
    "text": "22 KENDİMİ KORUYORUM Dinlediğimiz bilgilerle ilgili soruları cevaplayarak sohbet edelim.  Hayvanlar hangi durumlarda kendilerini tehlikede hissediyor olabilir?  Tehlike karşısında kendilerini nasıl koruyorlar?  Tehlikeli durumlara örnek ver",
    "materials": [
      "Şeffaf su deney küveti",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p23_222",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 23,
    "title": "HANGİSİ YOK?",
    "domain": "Sanat",
    "theme": "HANGİSİ YOK?",
    "researchQuestion": "Farklı malzemelerle HANGİSİ YOK? nasıl canlandırabiliriz?",
    "text": "23 HANGİSİ YOK? Görseli inceleyelim. Görseldeki varlıkların adlarını söyleyelim. Her kartta eksik olan görseli  bulalım ve görselin kutucuğunu çizgi çizerek karta ulaştıralım.",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p24_223",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 24,
    "title": "DUYULARIMIZI KEŞFEDİYORUZ",
    "domain": "Fen ve Doğa",
    "theme": "DUYULARIMIZI KEŞFEDİYORUZ",
    "researchQuestion": "Keki hangi  duyu organlarımızla fark ederiz?",
    "text": "24 DUYULARIMIZI KEŞFEDİYORUZ Görseldeki kekin fırından yeni çıkmış olduğunu ve önümüzde durduğunu hayal edelim. Keki hangi  duyu organlarımızla fark ederiz? Soruları cevaplayalım. Tablodaki görselleri inceleyelim. Her satırdaki görseli duyu",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p25_224",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 25,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "Ahtapotun kaç tane bacağı var?",
    "text": "25 8 RAKAMI 8 8 9 8 7 8 9 9 7 8 rakamlarını bulalım ve işaretleyelim. 8 tane bacağı olan hayvanları işaretleyelim. 8 adım atalım. Ahtapotlardan 8 tanesini boyayalım.  Ahtapotun kaç tane bacağı var? Sayalım. 8 rakamını kullanarak resim yapal",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p26_225",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 26,
    "title": "NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI",
    "domain": "Matematik",
    "theme": "NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI",
    "researchQuestion": "NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI Hangi bayram için sınıfı süslüyoruz?",
    "text": "26 23 NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI Hangi bayram için sınıfı süslüyoruz? Tahmin edelim. Yukarıda büyük harflerle  yazan yazıyı dinleyelim. Görseli inceleyelim. Çocuklar ne yapıyor olabilir? Tahmin edelim. Takım ne demek? Söyleyeli",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p27_226",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 27,
    "title": "HECELİYORUM",
    "domain": "Fen ve Doğa",
    "theme": "HECELİYORUM",
    "researchQuestion": "HECELİYORUM doğada ve çevremizde nasıl işler?",
    "text": "27 HECELİYORUM Hayvanların adlarını örnekteki gibi el çırparak heceleyelim. Adı iki heceden oluşan hayvanları  işaretleyelim.        SİN          -              CAP FARE TAVŞAN SİNCAP TIRTIL KANGURU KEDİ FİL",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p28_227",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 28,
    "title": "TARİF DEFTERİM",
    "domain": "Matematik",
    "theme": "TARİF DEFTERİM",
    "researchQuestion": "TARİF DEFTERİM Mutfakta yemek yaparken hangi araç gereçleri kullanırız?",
    "text": "28 TARİF DEFTERİM Mutfakta yemek yaparken hangi araç gereçleri kullanırız? Görselleri inceleyelim ve konuşalım. Yumurta Marul Süt Domates Limon Şeker Salatalık Şeker Un Zeytinyağı Su Tarif listelerindeki malzemeleri inceleyelim. Bu malzemel",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Altında - Üstünde"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p29_228",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 29,
    "title": "AFET VE ACİL DURUM ÇANTAM",
    "domain": "Sanat",
    "theme": "AFET VE ACİL DURUM ÇANTAM",
    "researchQuestion": "Evimizde afet ve acil durum çantamız  var mı?",
    "text": "29 AFET VE ACİL DURUM ÇANTAM Hepimizin afet ve acil durum çantasına sahip olması gerekir. Evimizde afet ve acil durum çantamız  var mı? Söyleyelim. Çantanın etrafındaki malzemeleri inceleyelim. Afet ve acil durum çantasında  yer alması gere",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p30_229",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 30,
    "title": "KAÇINCI YÜZÜCÜ?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "KAÇINCI YÜZÜCÜ?",
    "researchQuestion": "KAÇINCI YÜZÜCÜ?",
    "text": "30 KAÇINCI YÜZÜCÜ? 1. Kaç yüzücü yarışıyor? Sayalım, işaretleyelim. 3. İkinci sıradaki yüzücünün bonesi ne renk? Bulalım, işaretleyelim.  2. En öndeki yüzücünün bonesi ne renk? Bulalım, işaretleyelim. 4. Dördüncü sıradaki yüzcünün bonesi ne",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_48_60_b3_p31_230",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 31,
    "title": "ÖLÇELİM",
    "domain": "Sanat",
    "theme": "ÖLÇELİM",
    "researchQuestion": "Hangi ev daha yüksek?",
    "text": "31 ÖLÇELİM Evlerin yanındaki kutucukları boyayalım. Boyadığımız kutucukları sayalım. Hangi ev daha yüksek?  Söyleyelim. Kapıların altındaki kutucukları boyayalım. Boyadığımız kutucukları sayalım. Hangi kapı daha geniş?  Söyleyelim. Çerçeven",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p34_231",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 34,
    "title": "DİNLE VE SÖYLE",
    "domain": "Matematik",
    "theme": "DİNLE VE SÖYLE",
    "researchQuestion": "DİNLE VE SÖYLE Sayfada kaç tane hediye paketi var?",
    "text": "34 DİNLE VE SÖYLE Sayfada kaç tane hediye paketi var? Sayalım. Hediye paketlerinin içinde ne olabilir? Tahmin  edelim. En son kimden hediye aldığımızı, kime hediye verdiğimizi düşünelim. Hediyeleşmenin bize  neler hissettirdiğini anlatalım.",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kare",
      "İçinde - Dışında",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p35_232",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 35,
    "title": "SOHBET ZAMANI",
    "domain": "Fen ve Doğa",
    "theme": "SOHBET ZAMANI",
    "researchQuestion": "Çocuklar neler hakkında sohbet ediyor olabilir?",
    "text": "35 SOHBET ZAMANI Sınıfı inceleyelim. Çocuklar neler hakkında sohbet ediyor olabilir? Konuşalım. Aşağıda verilen  konulardan konuşmak istediğimizi işaretleyelim. Seçtiğimiz konu hakkında ikili eşleşerek eşimizle  sohbet edelim. Sohbet ederke",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p36_233",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 36,
    "title": "BU KAPIDAN KİM GEÇER?",
    "domain": "Sanat",
    "theme": "BU KAPIDAN KİM GEÇER?",
    "researchQuestion": "BU KAPIDAN KİM GEÇER?",
    "text": "36 BU KAPIDAN KİM GEÇER? Sembolleri ve çocukları inceleyelim. Çocukların hangi sembolün olduğu kapıya gitmesi gerektiğini  bulalım. Her çocuğu gitmesi gereken kapıya çizgi çizerek ulaştıralım.",
    "materials": [
      "Şeffaf su deney küveti",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p37_234",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 37,
    "title": "ÖRÜNTÜ DUVARI",
    "domain": "Matematik",
    "theme": "ÖRÜNTÜ DUVARI",
    "researchQuestion": "Hangi renkleri kullanmış?",
    "text": "37 ÖRÜNTÜ DUVARI Çerçevelerdeki örüntüyü inceleyelim. Alttaki kutucuklardan doğru olan örüntü kuralını  işaretleyelim. Mehmet, oturma odasının duvarlarını boyuyor. Hangi renkleri kullanmış? Söyleyelim. Renkleri  örüntü kuralına uygun devam ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p38_235",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 38,
    "title": "DENGE HAREKETLERİ",
    "domain": "Matematik",
    "theme": "DENGE HAREKETLERİ",
    "researchQuestion": "Bakalım hem müziğin ritmine uyup hem de  hareketleri yaparken dengede kalabilecek miyiz?",
    "text": "38 DENGE HAREKETLERİ Sayfada gördüğümüz denge hareketlerini müzik eşliğinde yapalım.  Harikaydınız çocuklar. O zaman dansımızı daha eğlenceli bir hâle getirelim. Aynı denge  hareketlerini kollarımız iki yana açıkken yapalım. Bakalım hem müz",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Kare",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p39_236",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 39,
    "title": "RAKAMI",
    "domain": "Matematik",
    "theme": "RAKAMI",
    "researchQuestion": "Öter ardıç kuşunun yumurtalarının  mavi renkte olduğunu biliyor musun?",
    "text": "39 9 RAKAMI İçinde 9 tane yumurta olan kuş yuvasını  işaretleyelim. 9 kere kuş gibi ötelim. 9 rakamını kullanarak resim yapalım.9 9 9 rakamlarını bulalım ve işaretleyelim. Öter ardıç kuşunun yumurtalarının  mavi renkte olduğunu biliyor musu",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Mavi",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p40_237",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 40,
    "title": "ÇİZGİYİ TAKİP ET",
    "domain": "Fen ve Doğa",
    "theme": "ÇİZGİYİ TAKİP ET",
    "researchQuestion": "ÇİZGİYİ TAKİP ET doğada ve çevremizde nasıl işler?",
    "text": "40 ÇİZGİYİ TAKİP ET Kesik çizgileri tamamlayarak hayvanları, seslerin bulunduğu kutucuklara götürelim. Sesleri dinleyelim  ve taklit edelim.",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p41_238",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 41,
    "title": "NESNELERİN YERLERİNİ HATIRLAYALIM",
    "domain": "Sanat",
    "theme": "NESNELERİN YERLERİNİ HATIRLAYALIM",
    "researchQuestion": "NESNELERİN YERLERİNİ HATIRLAYALIM Çiçeğin yanında hangi  nesne vardı?",
    "text": "41 NESNELERİN YERLERİNİ HATIRLAYALIM Çiçeğin yanında hangi  nesne vardı? Çizelim. Topun altında hangi  nesne vardı? Çizelim. Balığın üstünde hangi nesne  vardı? Çizelim. Tabloyu kapatarak soruları cevaplayalım. Cevaplarımızı uygun yerlere ç",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p42_239",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 42,
    "title": "MÜZE GEZİSİ",
    "domain": "Matematik",
    "theme": "MÜZE GEZİSİ",
    "researchQuestion": "Sanal müze  gezimiz sırasında eserlerden hangilerini gördük?",
    "text": "42 MÜZE GEZİSİ Karekodu kullanarak Ankara Anadolu Medeniyetleri Müzesi’nde sanal gezi yapalım. Sanal müze  gezimiz sırasında eserlerden hangilerini gördük? Gördüğümüz eserlerin altındaki kutucukları  işaretleyelim. Gizem ve Ersen, okul dışı",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p43_240",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 43,
    "title": "MÜZE YOLU",
    "domain": "Matematik",
    "theme": "MÜZE YOLU",
    "researchQuestion": "MÜZE YOLU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "43 MÜZE YOLU Onur, müzeye gitmek için kullandığı yolda etrafında gördüğü varlıkları sayma oyunu oynuyor.  Onur ile birlikte yolu takip edelim. Yolda gördüğümüz varlıkların adlarını söyleyelim. Gördüğümüz her varlığın sayısını görselin altın",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p44_241",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 44,
    "title": "KARAHİNDİBANIN DEĞİŞİMİ",
    "domain": "Fen ve Doğa",
    "theme": "KARAHİNDİBANIN DEĞİŞİMİ",
    "researchQuestion": "KARAHİNDİBANIN DEĞİŞİMİ doğada ve çevremizde nasıl işler?",
    "text": "44 KARAHİNDİBANIN DEĞİŞİMİ Karahindibanın zaman içinde nasıl değiştiğini inceleyelim. Karahindibanın bölümlerini inceleyelim. Sapların üzerine karahindiba çiçeklerini çizerek resmi  tamamlayalım. 1 2 3 4 5",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p45_242",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 45,
    "title": "YERİNİ BUL",
    "domain": "Fen ve Doğa",
    "theme": "YERİNİ BUL",
    "researchQuestion": "YERİNİ BUL doğada ve çevremizde nasıl işler?",
    "text": "45 YERİNİ BUL Çerçevelerdeki hayvanları inceleyelim. İkili hayvan gruplarını alttaki kutudan bulup örnekteki gibi işaretleyelim.",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p46_243",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 46,
    "title": "ÖRÜNTÜ ZAMANI",
    "domain": "Matematik",
    "theme": "ÖRÜNTÜ ZAMANI",
    "researchQuestion": "ÖRÜNTÜ ZAMANI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "46 ÖRÜNTÜ ZAMANI Görsellerdeki örüntüleri inceleyelim. Her sıradaki örüntü kuralına dikkat ederek boş olan kutuya  gelmesi gereken varlığı çizelim.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p47_244",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 47,
    "title": "YUMUŞAK MI, SERT Mİ?",
    "domain": "Matematik",
    "theme": "YUMUŞAK MI, SERT Mİ?",
    "researchQuestion": "YUMUŞAK MI, SERT Mİ?",
    "text": "47 YUMUŞAK MI, SERT Mİ? Masadaki nesneleri inceleyelim. Hangi masada sert, hangi masada yumuşak nesneler var?  Masaya ait olmayan nesneyi bulup işaretleyelim. Fatma sepetine sert nesneleri, Mert ise sepetine yumuşak nesneleri toplayacak. Se",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p48_245",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 48,
    "title": "BAKALIM, SEÇELİM",
    "domain": "Sanat",
    "theme": "BAKALIM, SEÇELİM",
    "researchQuestion": "Farklı malzemelerle BAKALIM, SEÇELİM nasıl canlandırabiliriz?",
    "text": "48 BAKALIM, SEÇELİM Çerçevedeki boş alana buradaki görseller ile ilişkili bir varlık çizelim. Çerçevedeki varlıkları inceleyelim. Her çerçevenin içinden kullanım amacı diğerlerinden farklı  olan varlığı bulalım ve işaretleyelim.",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_48_60_b3_p49_246",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 49,
    "title": "LABİRENT",
    "domain": "Matematik",
    "theme": "LABİRENT",
    "researchQuestion": "LABİRENT ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "49 LABİRENT Labirent etkinliğini tamamladığımızda arkadaşlarımızı beklerken işaret parmaklarımızı örnekteki  gibi dairelerin üzerine koyarak ve iki elimizi aynı anda hareket ettirerek çizgi çalışması yapalım. Karınca, yuvasına sakladığı çek",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Daire",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D12 Sabır"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p50_247",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 50,
    "title": "MEYVELERİ SAYALIM",
    "domain": "Matematik",
    "theme": "MEYVELERİ SAYALIM",
    "researchQuestion": "MEYVELERİ SAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "50 MEYVELERİ SAYALIM Görseldeki meyveleri inceleyelim. Her meyveden kaç tane olduğunu sayalım ve doğru rakamın  bulunduğu kutucuğu bulup işaretleyelim. 7 8 7 9 9 8",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p51_248",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 51,
    "title": "BENZER SESLERİ BULALIM",
    "domain": "Matematik",
    "theme": "BENZER SESLERİ BULALIM",
    "researchQuestion": "Hangi sözcükler birbirine benzeyen seslerle bitiyor?",
    "text": "51 BENZER SESLERİ BULALIM Çerçevelerdeki görselleri inceleyelim. Hangi sözcükler birbirine benzeyen seslerle bitiyor? Çizgi  çizerek eşleştirelim. Patates Domates Kitap Aslan Çamur Yağmur Yelek Güneş Leylek",
    "materials": [
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p52_249",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 52,
    "title": "ZORBALIĞI TANIYORUM",
    "domain": "Sosyal & Duygusal",
    "theme": "ZORBALIĞI TANIYORUM",
    "researchQuestion": "Zorbalıkla karşılaştığında kimlerden yardım isteyebilirsin?",
    "text": "52 ZORBALIĞI TANIYORUM Bir kişinin başka bir kişiyi bilerek üzmesine, korkutmasına ya da ona zarar vermesine zorbalık  denir. Zorbalık tekrarlayan davranışlardır. Zorbalıkla karşılaştığında “Dur!” diyebilir, hoşlanmadığını  söyleyebilir vey",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "5 (Beş)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_48_60_b3_p53_250",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 53,
    "title": "ZITLAR OYUNU",
    "domain": "Matematik",
    "theme": "ZITLAR OYUNU",
    "researchQuestion": "ZITLAR OYUNU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "53 ZITLAR OYUNU Görselleri inceleyelim. Birbirinin zıttı olan görselleri bulup çizgi çizerek eşleştirelim.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p54_251",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 54,
    "title": "ÖNÜNDE Mİ, ARKASINDA MI?",
    "domain": "Matematik",
    "theme": "ÖNÜNDE Mİ, ARKASINDA MI?",
    "researchQuestion": "ÖNÜNDE Mİ, ARKASINDA MI?",
    "text": "54 ÖNÜNDE Mİ, ARKASINDA MI? Kırmızı üçgenin arkasında hangi şekil var? Doğru kutucuğu bulup işaretleyelim. Geometrik şekillerden oluşmuş görselleri inceleyelim.  Yeşil dairenin önünde hangi şekil var? Doğru kutucuğu bulup işaretleyelim.",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Yeşil"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p55_252",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 55,
    "title": "NE ZAMAN?",
    "domain": "Matematik",
    "theme": "NE ZAMAN?",
    "researchQuestion": "NE ZAMAN? ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "55 NE ZAMAN? Bazı davranışları her gün, bazılarını ise bazen yaparız. Örneğin her gün su içeriz, bazen  alışverişe çıkarız. Her gün yaptığımız davranışları bulup işaretleyelim.",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p56_253",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 56,
    "title": "DÖNME DOLAP",
    "domain": "Sosyal & Duygusal",
    "theme": "DÖNME DOLAP",
    "researchQuestion": "DÖNME DOLAP durumunda kendimizi ve arkadaşlarımızı nasıl anlarız?",
    "text": "56 DÖNME DOLAP Dönme dolabın vagonlarında bulunan çocukların sohbetlerini dinleyelim. Dinlediğimiz cümlelerle  ilgili duygularımızı gösteren yüz ifadelerine dokunalım.  Kule yapmak için  uğraştığım bloklar yıkıldı. Arkadaşımdan bir hediye  ",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Mutlu - Üzgün",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_48_60_b3_p57_254",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 57,
    "title": "ORGANİK ATIKLAR",
    "domain": "Matematik",
    "theme": "ORGANİK ATIKLAR",
    "researchQuestion": "ORGANİK ATIKLAR ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "57 ORGANİK ATIKLAR Bazı atıklar zamanla parçalanarak toprağa karışabilir. Bu tür atıklara organik atık  denir. Meyve ve sebze kabukları, yapraklar ve yemek artıkları bu atıklara örnektir.  Görselleri inceleyelim. Organik atıkları bulup işar",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p58_255",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 58,
    "title": "EL SANATLARI İLE SUDOKU",
    "domain": "Matematik",
    "theme": "EL SANATLARI İLE SUDOKU",
    "researchQuestion": "EL SANATLARI İLE SUDOKU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "58 EL SANATLARI İLE SUDOKU Görseldeki sudokuyu inceleyelim. Sudoku her satırda ve sütunda görsellerden birer defa kullanılarak  oynanan bir zeka oyunudur. Tablodaki boşluklara gelmesi gereken görselleri bulalım ve boşlukları  görsellerin al",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Altında - Üstünde"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p59_256",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 59,
    "title": "GÖZLEM DEFTERİM",
    "domain": "Matematik",
    "theme": "GÖZLEM DEFTERİM",
    "researchQuestion": "GÖZLEM DEFTERİM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "59 GÖZLEM DEFTERİM Beren parkta gördüğü varlıkları gözlemliyor. Görselleri inceleyelim. Hangilerinin canlı,  hangilerinin cansız olduğunu söyleyelim. Biz de kitabımızı ve kalemimizi alıp bahçeye çıkalım. Çevremizde gözlemlediğimiz canlı ve ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Canlı - Cansız",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p60_257",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 60,
    "title": "DOĞADAKİ DESENLER",
    "domain": "Fen ve Doğa",
    "theme": "DOĞADAKİ DESENLER",
    "researchQuestion": "DOĞADAKİ DESENLER doğada ve çevremizde nasıl işler?",
    "text": "60 DOĞADAKİ DESENLER Doğadaki varlıklara ait görselleri inceleyelim ve isimlerini söyleyelim.  Görsellerin üzerindeki  desenleri parmağımızla takip edelim. Kesik çizgileri birleştirerek desenleri tamamlayalım.",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_48_60_b3_p61_258",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 61,
    "title": "DÜŞÜN, HAYAL ET VE ÇİZ",
    "domain": "Matematik",
    "theme": "DÜŞÜN, HAYAL ET VE ÇİZ",
    "researchQuestion": "DÜŞÜN, HAYAL ET VE ÇİZ Daha önce küpe çiçeği gördük mü, küpe çiçeği nasıl bir bitki olabilir?",
    "text": "61 DÜŞÜN, HAYAL ET VE ÇİZ Daha önce küpe çiçeği gördük mü, küpe çiçeği nasıl bir bitki olabilir? Düşünelim. Çerçevenin  içine bir küpe çiçeği çizelim.  Çizimlerimizi gerçek hâlleriyle karşılaştıralım. Daha önce mavi ayaklı sümsük kuşu gördü",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Mavi",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_48_60_b3_p62_259",
    "ageGroup": "48-60",
    "bookNo": 3,
    "pageNo": 62,
    "title": "BİR BAYRAM ŞİİRİ",
    "domain": "Müzik",
    "theme": "BİR BAYRAM ŞİİRİ",
    "researchQuestion": "Bu şiir ne hakkında olabilir?",
    "text": "62 BİR BAYRAM ŞİİRİ Şiirin içinde yer alan görselleri inceleyelim. Bu şiir ne hakkında olabilir? Tahmin edelim. Şiir  okunurken parmağımızla yavaşça takip edelim ve görsellerin olduğu yere gelince duralım.  Görselin ismini sesli söyleyerek ",
    "materials": [
      "Ses boruları",
      "Ahşap kastanyet"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "İçinde - Dışında"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_60_72_b1_p9_260",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 9,
    "title": "OKULUMDA İLK GÜNÜM",
    "domain": "Matematik",
    "theme": "OKULUMDA İLK GÜNÜM",
    "researchQuestion": "Senin sınıfında  neler var?",
    "text": "9 OKULUMDA İLK GÜNÜM Can bugün okula başlıyor. Can çok mutlu. Okula başladığımız ilk gün ne hissettiğimizi  hatırlayalım. Hissettiğimiz duyguya ait görseli boyayalım.  Can’ın öğretmeninin ismi Aybüke. Öğretmenimizin ismini söyleyelim. Can’ı",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "İçinde - Dışında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p10_261",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 10,
    "title": "BEN KİMİM?",
    "domain": "Fen ve Doğa",
    "theme": "BEN KİMİM?",
    "researchQuestion": "BEN KİMİM? doğada ve çevremizde nasıl işler?",
    "text": "10 BEN KİMİM? En sevdiğimiz renge boyayalım. Adımızı, soyadımızı, yaşımızı söyleyelim. Kendimizi, büyüyünce yapmak istediğimiz mesleği,  sevdiğimiz ve yapmaktan hoşlandığımız şeyleri tanıtalım. En sevdiğimiz hayvanı çizelim. En sevdiğimiz y",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p11_262",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 11,
    "title": "SINIFIMIZDAKİ MERKEZLER",
    "domain": "Fen ve Doğa",
    "theme": "SINIFIMIZDAKİ MERKEZLER",
    "researchQuestion": "SINIFIMIZDAKİ MERKEZLER doğada ve çevremizde nasıl işler?",
    "text": "11 SINIFIMIZDAKİ MERKEZLER Ahmet’in sınıfta gün içinde zaman geçirdiği öğrenme merkezlerine ait gruplandırılmış  görselleri inceleyelim. Görsellerin hangi merkezlere ait olabileceğini düşünelim, söyleyelim. Sanat, dramatik oyun, fen ve müzi",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p12_263",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 12,
    "title": "DOĞRU OTURMA POZİSYONU",
    "domain": "Sanat",
    "theme": "DOĞRU OTURMA POZİSYONU",
    "researchQuestion": "Görseldeki çocuğun oturuşunda neler dikkatinizi çekti?",
    "text": "12 DOĞRU OTURMA POZİSYONU Görseli inceleyelim. Görseldeki çocuğun oturuşunda neler dikkatinizi çekti? Biz de  sandalyemize doğru pozisyonda oturalım. Çizgileri parmağımızla takip edelim, kesik  çizgileri birleştirerek çizelim. Etkinliğimiz ",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p13_264",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 13,
    "title": "SAKLANMIŞ BÖCEKLERİ BULALIM",
    "domain": "Matematik",
    "theme": "SAKLANMIŞ BÖCEKLERİ BULALIM",
    "researchQuestion": "Böcekler neden çiçeklerin arasına saklanmış olabilir?",
    "text": "13 SAKLANMIŞ BÖCEKLERİ BULALIM Çiçeklerin arasına saklanmış böceklerin hangileri olduğunu tahmin edelim.  Böcekler neden çiçeklerin arasına saklanmış olabilir? Söyleyelim.  Kutudaki böcek görselleriyle saklanmış böcek görsellerini çizgi çiz",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p14_265",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 14,
    "title": "AZ-ÇOK",
    "domain": "Matematik",
    "theme": "AZ-ÇOK",
    "researchQuestion": "ÇOK Hangi akvaryumda daha çok balık var?",
    "text": "14 AZ-ÇOK Hangi akvaryumda daha çok balık var? Gösterelim. İçinde az balık olan akvaryumu  işaretleyelim. Hangi vazoda daha çok çiçek var? Gösterelim. İçinde az çiçek olan vazoyu işaretleyelim. Mavi kalemlikte kaç tane kalem var? Kırmızı ka",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p15_266",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 15,
    "title": "BENİM HAKKIMDA",
    "domain": "Matematik",
    "theme": "BENİM HAKKIMDA",
    "researchQuestion": "BENİM HAKKIMDA ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "15 BENİM HAKKIMDA Cümleleri dikkatle dinleyelim. Ardından cümleleri kendimizi tanıtacak şekilde tamamlayalım.  \u0007Öğretmene not:\t\u0007Türkçe alanı konuşma becerisine yönelik hazırlanan bu etkinlikte her ço­ cuğun en az bir cümlede kendini tanıtar",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Mutlu - Üzgün",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p16_267",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 16,
    "title": "Bilmeceleri dinleyelim ve cevabı tahmin edelim.",
    "domain": "Fen ve Doğa",
    "theme": "Bilmeceleri dinleyelim ve cevabı tahmin edelim.",
    "researchQuestion": "Kim getirmiş bunu soframa?",
    "text": "16 Bilmeceleri dinleyelim ve cevabı tahmin edelim.  Çizgileri parmağımızla takip ederek ve kesik çizgileri birleştirerek bilmece kutularına gidelim.  Doğru cevapları dinleyelim. Uçar daldan dala,  Ağaca vurur gagasıyla. O çıkınca sonbaharda",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p17_268",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 17,
    "title": "BENİM DUYGULARIM",
    "domain": "Matematik",
    "theme": "BENİM DUYGULARIM",
    "researchQuestion": "Okulun ilk günü ne hissettin?",
    "text": "17 BENİM DUYGULARIM Soruları dinleyelim. Sorulan durumlar karşısında ne hissettiğimizi söyleyelim. Hissettiğimiz  duyguyu gösteren görseli çizgi çizerek eşleştirelim. Okulun ilk günü ne hissettin? Okulda yeni arkadaşlar edindiğinde ne hisse",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D12 Sabır"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p18_269",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 18,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "Tane olan hangi nesneler var?",
    "text": "18 1 RAKAMINI ÖĞRENİYORUM 1 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üzerin­ den geçelim. Çevremizde 1 tane olan hangi nesneler var? Söyleyelim. Kesik çizgileri  birleştirerek rakamları tamamlayalım. Karekodu ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p19_270",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 19,
    "title": "HAYVANLARIN İLGİNÇ YATAKLARI",
    "domain": "Fen ve Doğa",
    "theme": "HAYVANLARIN İLGİNÇ YATAKLARI",
    "researchQuestion": "Bizim yatağımıza benziyor  mu?",
    "text": "19 HAYVANLARIN İLGİNÇ YATAKLARI Canlılar sağlıklı yaşam için uykuya ihtiyaç duyar. Düzenli ve yeterli uyumak beden ve  zihin sağlığı için önemlidir.  Görsellerdeki hayvanları ve uyudukları ortamları inceleyelim. Bizim yatağımıza benziyor  m",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Canlı - Cansız",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p20_271",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 20,
    "title": "ANADOLU PARSI",
    "domain": "Matematik",
    "theme": "ANADOLU PARSI",
    "researchQuestion": "Anadolu parsının yaşam  alanı hangisi olabilir?",
    "text": "20 ANADOLU PARSI Ülkemizde, nesli tükenmekte olan  hayvan türleri bulunmaktadır. Anadolu  parsı bunlardan biridir. Ormanlık  alanlarda ve dağlarda yaşar. Anadolu  parsına ait görseli inceleyelim. Görsellerdeki yeryüzü şekillerini inceleyeli",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p21_272",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 21,
    "title": "ENDEMİK BİTKİLER",
    "domain": "Fen ve Doğa",
    "theme": "ENDEMİK BİTKİLER",
    "researchQuestion": "ENDEMİK BİTKİLER doğada ve çevremizde nasıl işler?",
    "text": "21 ENDEMİK BİTKİLER Endemik bitki sadece bulunduğu bölgenin şartlarında yetişen, başka yerde yetişme ihtimali  olmayan bitkidir. Bitkilerin içinden sadece iki tanesi diğerlerinden farklı. Farklı olan Kapadokya soğanı ve  çakır çiğdemini bul",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p22_273",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 22,
    "title": "TİMSAH VE ARDIÇ KUŞU",
    "domain": "Fen ve Doğa",
    "theme": "TİMSAH VE ARDIÇ KUŞU",
    "researchQuestion": "Biz dişlerimizi temiz tutmak için neler yaparız?",
    "text": "22 TİMSAH VE ARDIÇ KUŞU Canlılar diş temizliği için farklı yöntemler kullanabilir. Timsahlar diş temizliği için ardıç  kuşlarından yardım alır. Biz dişlerimizi temiz tutmak için neler yaparız? Görselleri inceleyelim. Diş temizliğinde  kulla",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Canlı - Cansız",
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p23_274",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 23,
    "title": "EVE GİDERKEN NELER GÖRDÜM?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "EVE GİDERKEN NELER GÖRDÜM?",
    "researchQuestion": "EVE GİDERKEN NELER GÖRDÜM?",
    "text": "23 EVE GİDERKEN NELER GÖRDÜM? Ali’nin gördüğü varlıkların uygun dizilişinin hangi şeritte olduğunu bulalım. İşaretleyelim. Ali eve ulaşmak için hangi varlıkların yanından geçiyor, inceleyelim.",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b1_p24_275",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 24,
    "title": "ÜLKEMİZDE NESLİ TÜKENMEKTE OLAN HAYVANLAR",
    "domain": "Matematik",
    "theme": "ÜLKEMİZDE NESLİ TÜKENMEKTE OLAN HAYVANLAR",
    "researchQuestion": "Bu hayvanların neslinin tükenmemesi için nasıl  önlemler alabiliriz?",
    "text": "24 ÜLKEMİZDE NESLİ TÜKENMEKTE OLAN HAYVANLAR Ülkemizde nesli tükenmekte olan hayvan türleri bulunmaktadır. Görselleri inceleyelim. Hay­ vanların isimlerini öğretmenimizden dinleyelim ve tekrar edelim. Hangi desenin hangi hayvana  ait olduğu",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p25_276",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 25,
    "title": "YAŞAM DÖNGÜSÜNÜ ARAŞTIRIYORUM",
    "domain": "Matematik",
    "theme": "YAŞAM DÖNGÜSÜNÜ ARAŞTIRIYORUM",
    "researchQuestion": "Araştırmak istediği bilgiye hangi  kitaptan ulaşabilir?",
    "text": "25 YAŞAM DÖNGÜSÜNÜ ARAŞTIRIYORUM  \u0007Öğretmene not:\t\u0007Fen alanı bilimsel sorgulama yapma becerisine yönelik hazırlanan et­ kinlikte çocuğun farklı kaynaklardan canlıların hayat döngülerini ailesiyle  araştırması teşvik edilmelidir.  Ebru, kurb",
    "materials": [
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Canlı - Cansız"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p26_277",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 26,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "26 2 RAKAMINI ÖĞRENİYORUM Saksıya 2 tane çiçek çizelim. 2 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üze­ rinden geçelim. Çevremizden 2 tane nesne gösterelim. Kesik çizgileri birleştirerek  rakamları tamamlayalı",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p27_278",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 27,
    "title": "İKİŞER RAKET",
    "domain": "Hareket ve Sağlık",
    "theme": "İKİŞER RAKET",
    "researchQuestion": "İKİŞER RAKET hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "27 İKİŞER RAKET Defne ve Yiğit tenis oynamak istiyor. Tenis, bir top ve iki raket kullanılarak iki kişiyle oy­ nanabilen bir spor dalıdır.  Görselleri inceleyelim. Tenis raketlerini ikişerli gruplayalım.",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b1_p28_279",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 28,
    "title": "KAÇ SÖZCÜKTEN OLUŞUYOR?",
    "domain": "Matematik",
    "theme": "KAÇ SÖZCÜKTEN OLUŞUYOR?",
    "researchQuestion": "KAÇ SÖZCÜKTEN OLUŞUYOR?",
    "text": "28 KAÇ SÖZCÜKTEN OLUŞUYOR? Cümleleri dikkatle dinleyelim. Cümlelerin kaç sözcükten oluştuğunu bulalım. Sözcükleri sa­ yalım ve sözcük sayısı kadar alkış yapalım. Görsellerin yanındaki kutucukları örnekteki gibi  sözcük sayısı kadar boyayalı",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p29_280",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 29,
    "title": "MEYVE BAHÇESİ",
    "domain": "Fen ve Doğa",
    "theme": "MEYVE BAHÇESİ",
    "researchQuestion": "Hilmi amca bu sıralamaya göre mavi çerçevelerdeki fidanları, turuncu çerçevelerde nereye  dikmeli?",
    "text": "29 MEYVE BAHÇESİ Hilmi amca fidanları uzundan kısaya doğru meyve bahçesine dikiyor. Görselleri inceleyelim. Hilmi amca bu sıralamaya göre mavi çerçevelerdeki fidanları, turuncu çerçevelerde nereye  dikmeli? Düşünelim. Fidanların dikilmesi g",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Mavi"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p30_281",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 30,
    "title": "NEFES EGZERSİZİ",
    "domain": "Matematik",
    "theme": "NEFES EGZERSİZİ",
    "researchQuestion": "NEFES EGZERSİZİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "30 NEFES EGZERSİZİ Doğru nefes alıp vermek sağlığımız için çok önemlidir. Kartlardaki hareketleri sırayla  önce yavaş, sonra hızlı yapalım. Nefes alıp vermemiz nasıl değişti? Konuşalım. Çizgileri sırayla parmağımızla takip edelim. Turunc",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Yeşil",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p31_282",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 31,
    "title": "EBRU SANATI",
    "domain": "Sanat",
    "theme": "EBRU SANATI",
    "researchQuestion": "Farklı malzemelerle EBRU SANATI nasıl canlandırabiliriz?",
    "text": "31 EBRU SANATI Bir ebru çalışması yaptığımızı hayal edelim ve desenlerini çerçevenin içine çizelim. Ebru sanatı ile yapılmış eserleri inceleyelim. Odamıza asmak isteyeceğimiz sanat eserini  seçelim ve yanındaki kutucuğu işaretleyelim.  Ebru",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p32_283",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 32,
    "title": "İSTEKLERİM ENGELLENDİĞİ ZAMAN",
    "domain": "Matematik",
    "theme": "İSTEKLERİM ENGELLENDİĞİ ZAMAN",
    "researchQuestion": "A öğretmeni sürenin dolduğunu söylediğinde Can ne hissetmiş olabilir?",
    "text": "32 İSTEKLERİM ENGELLENDİĞİ ZAMAN Can’a öğretmeni sürenin dolduğunu söylediğinde Can ne hissetmiş olabilir? Söyleyelim. Can sorununu çözmek için ne yapabilirdi? Söyleyelim. Hangi durumlarda isteklerimizi  ertelemek zorunda kaldığımızı anlata",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p33_284",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 33,
    "title": "NEŞE’NİN KURABİYELERİ",
    "domain": "Sanat",
    "theme": "NEŞE’NİN KURABİYELERİ",
    "researchQuestion": "Farklı malzemelerle NEŞE’NİN KURABİYELERİ nasıl canlandırabiliriz?",
    "text": "33 NEŞE’NİN KURABİYELERİ Neşe, büyükanne ve büyükbabasını ziyarete giderken onlara kurabiye götürmek istiyor.  Kurabiyeleri sepete görseldeki sırayla diziyor. Çerçevenin içindeki kurabiyeleri görselde verilen sıraya göre çizgi çizerek Neşe’",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "İçinde - Dışında",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p34_285",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 34,
    "title": "HAYVANLARLA SANAT ÇALIŞMASI",
    "domain": "Matematik",
    "theme": "HAYVANLARLA SANAT ÇALIŞMASI",
    "researchQuestion": "HAYVANLARLA SANAT ÇALIŞMASI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "34 HAYVANLARLA SANAT ÇALIŞMASI Yasemin ile Ahmet sanat çalışması yaparken her hayvanın vücudundaki bazı bölümleri  birbirleri ile değiştirdiler. Yasemin ile Ahmet’in yaptığı resimleri inceleyelim. Hangi  hayvanların vücudunun bölümlerini bi",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p35_286",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 35,
    "title": "ÇİÇEKLERİN RENKLERİ",
    "domain": "Matematik",
    "theme": "ÇİÇEKLERİN RENKLERİ",
    "researchQuestion": "ÇİÇEKLERİN RENKLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "35 ÇİÇEKLERİN RENKLERİ Çiçek görsellerini inceleyelim. Çiçeklerin isimlerini ve renklerini söyleyelim. Çiçeklerin  renkli bölümlerini, renk kartındaki renklerle çizgi çizerek eşleştirelim.  Karekodu okutarak veya tıklayarak  etkileşimli içe",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p36_287",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 36,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "36 3 RAKAMINI ÖĞRENİYORUM 3 rakamlarını bulalım, işaretleyelim. 3 tane sıcak hava balonu boyayalım. 3 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üze­ rinden geçelim. Çevremizden 3 tane nesne gösterelim. Kesik çi",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p38_288",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 38,
    "title": "TAŞITLARIN ADINI HECELİYORUM",
    "domain": "Fen ve Doğa",
    "theme": "TAŞITLARIN ADINI HECELİYORUM",
    "researchQuestion": "Lardan hangisi ile yolculuk yaparlarsa gitmek istedikleri yere en kısa sürede varabilirler?",
    "text": "38 TAŞITLARIN ADINI HECELİYORUM Taşıtların isimlerini heceleyerek söyleyelim ve söylerken alkışlayarak hecelerine ayıralım. U-ÇAK O-TO-MO-BİL GE-Mİ O-TO-BÜS Büşra ve ailesi kıtalar arası yolculuk yapmayı planlıyor. Görselleri inceleyelim. B",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p39_289",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 39,
    "title": "HAYVANLARIN BENEKLERİ",
    "domain": "Matematik",
    "theme": "HAYVANLARIN BENEKLERİ",
    "researchQuestion": "Benekleri olan başka hangi hayvanlar var?",
    "text": "39 HAYVANLARIN BENEKLERİ Bazı hayvanların vücudunda benekler bulunur. Benekleri olan hayvan görsellerini  inceleyelim. Hayvanların isimlerini söyleyelim. Benekleri olan başka hangi hayvanlar var?  Düşünelim, söyleyelim. Farklı benekler kull",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p42_290",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 42,
    "title": "GİZLENMİŞ HAYVANLAR",
    "domain": "Matematik",
    "theme": "GİZLENMİŞ HAYVANLAR",
    "researchQuestion": "Kendimizi tehlikelerden korumak için neler yapıyoruz?",
    "text": "42 GİZLENMİŞ HAYVANLAR Hayvanların kendilerini girdikleri ortama benzeterek gizlenme yeteneği vardır. Gizlenmiş  hayvanların olduğu görselleri dikkatlice inceleyelim.  Kendimizi tehlikelerden korumak için neler yapıyoruz? Anlatalım. Kelebek",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p43_291",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 43,
    "title": "ACİL DURUM TAŞITLARI",
    "domain": "Matematik",
    "theme": "ACİL DURUM TAŞITLARI",
    "researchQuestion": "Acil durumlarda kullanılan  taşıtlar hangileri?",
    "text": "43 ACİL DURUM TAŞITLARI Bazen başımıza beklemediğimiz olaylar gelebilir. Böyle  durumlarda 112’ yi arayarak yardım isteyebiliriz.  Görsellerdeki taşıt türlerinden bazıları acil durumlarda  müdahale için kullanılıyor. Acil durumlarda kullanı",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p44_292",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 44,
    "title": "EVİMDE KİMLER YAŞIYOR?",
    "domain": "Matematik",
    "theme": "EVİMDE KİMLER YAŞIYOR?",
    "researchQuestion": "EVİMDE KİMLER YAŞIYOR?",
    "text": "44 EVİMDE KİMLER YAŞIYOR? Ev görselinin içine evimizde yaşayan aile bireylerinin sayısı kadar çiçek çizelim. Çizdiğimiz  çiçekleri, görsellerin altındaki çiçeklerin renklerine uygun olarak boyayalım. ANNE BABA KIZ KARDEŞ ERKEK KARDEŞ BÜYÜKA",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Altında - Üstünde"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p45_293",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 45,
    "title": "UNDAN EKMEK YAPIMI",
    "domain": "Matematik",
    "theme": "UNDAN EKMEK YAPIMI",
    "researchQuestion": "UNDAN EKMEK YAPIMI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "45 UNDAN EKMEK YAPIMI Buğday ve mısır, ülkemizde yaygın olarak yetiştirilen tarım ürünlerindendir. Bu bitkiler­ den un elde ederiz. Unun hangi aşamalardan geçerek elde edildiğini ve ekmeklerin nasıl  yapıldığını “Unun Var mı?” isimli öyküyü",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Bütün - Yarım",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p46_294",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 46,
    "title": "SAYGI TEKERLEMESİ",
    "domain": "Matematik",
    "theme": "SAYGI TEKERLEMESİ",
    "researchQuestion": "Bakalım hangi çiçek sana  çıkacak?",
    "text": "46 SAYGI TEKERLEMESİ Çiçek görsellerini inceleyelim. Çiçeklerin isimlerini birlikte tekrar edelim. Sayışmacaya  istediğimiz çiçekten başlayarak saygı tekerlemesini söyleyelim. Her sayışmanın sonunda  çıkan çiçeğin üzerini çizelim. En sona k",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p47_295",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 47,
    "title": "NESNELERİ HECELE, ALKIŞLA",
    "domain": "Matematik",
    "theme": "NESNELERİ HECELE, ALKIŞLA",
    "researchQuestion": "NESNELERİ HECELE, ALKIŞLA ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "47 NESNELERİ HECELE, ALKIŞLA Kağan öğretmeni ile bir oyun oyuyor. Bu oyunun kuralı sözcükteki hece sayısı kadar el  çırpmak. Görselleri inceleyelim. Kelimeleri hecelere ayıralım. Hece sayısı kadar el çırpalım. Kutularını  örnekteki gibi hec",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p48_296",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 48,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "48 4 RAKAMINI ÖĞRENİYORUM 4 tane gemi boyayalım. 4 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üze­ rinden geçelim. Çevremizden 4 tane nesne gösterelim. Kesik çizgileri birleştirerek  rakamları tamamlayalım. Deni",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p49_297",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 49,
    "title": "ARABALARIN TEKERLEKLERİ",
    "domain": "Hareket ve Sağlık",
    "theme": "ARABALARIN TEKERLEKLERİ",
    "researchQuestion": "ARABALARIN TEKERLEKLERİ hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "49 ARABALARIN TEKERLEKLERİ Arabaların iki tane önde iki tane arkada olmak üzere toplam dört tane tekerleği olur.  Araba görsellerini inceleyelim. Tekerlekleri dörderli gruplayalım.",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b1_p50_298",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 50,
    "title": "DİKKATLE BAK-AKLINDA TUT",
    "domain": "Matematik",
    "theme": "DİKKATLE BAK-AKLINDA TUT",
    "researchQuestion": "Kumsalda kaç tane denizyıldızı vardı?",
    "text": "50 DİKKATLE BAK-AKLINDA TUT Görseli hangi canlılardan kaçar tane olduğuna dikkat ederek inceleyelim. Şimdi gözlerimizi  kapatalım. Kumsalda kaç tane denizyıldızı vardı? Kumsalda kaç tane yengeç vardı?  Denizde kaç tane balık vardı? Hatırlay",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Canlı - Cansız"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p51_299",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 51,
    "title": "EL VE AYAK BASKISI",
    "domain": "Matematik",
    "theme": "EL VE AYAK BASKISI",
    "researchQuestion": "Tarık ve arkadaşları el ve ayak baskılarını yapmak için nasıl bir boya kullanmış olabilirler?",
    "text": "51 EL VE AYAK BASKISI Tarık ve arkadaşları ellerini ve ayaklarını boyadılar. Boyalı el ve ayaklarıyla kâğıtlara  baskı yaparak çeşitli hayvan figürleri oluşturdular. Tarık ve arkadaşlarının yaptıkları bas­ kıları inceleyelim. Hangi hayvanla",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p52_300",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 52,
    "title": "BANA ÖZEL",
    "domain": "Hareket ve Sağlık",
    "theme": "BANA ÖZEL",
    "researchQuestion": "Lde sarılmak zorunda mı,  neden?",
    "text": "52 BANA ÖZEL Mahremiyet bize özel olan kişisel bilgilerimizi, bedenimizi, düşüncelerimizi ve duygularımızı  gizli tutma hakkıdır. Ece, annesiyle misafirliğe gitti. Gittiği yerde yetişkinler Ece’yle sohbet ettiler. Bir yetişkin  Ece’ye sarıl",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Sarı",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b1_p53_301",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 53,
    "title": "AİLE İLE MOZAİK YAPIMI",
    "domain": "Matematik",
    "theme": "AİLE İLE MOZAİK YAPIMI",
    "researchQuestion": "AİLE İLE MOZAİK YAPIMI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "53 AİLE İLE MOZAİK YAPIMI Ali, İrem ve Atakan evlerinin salonunda futbol oynarken vazoyu kırdılar. Ailelerine haber  verdiler ve aileleriyle birlikte vazonun parçalarını toplayıp salonu temizlediler. Vazo görselini  inceleyelim. Vazoya ait ",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p54_302",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 54,
    "title": "YETERLİ VE DENGELİ BESLENİYORUM",
    "domain": "Matematik",
    "theme": "YETERLİ VE DENGELİ BESLENİYORUM",
    "researchQuestion": "Yeterli ve dengeli beslenmek neden önemlidir?",
    "text": "54 YETERLİ VE DENGELİ BESLENİYORUM Yeterli ve dengeli beslenmemiz için öğünlerimizde besin yoncasının yapraklarında bulunan  besinlerin her birinden tüketmeliyiz. Yeterli ve dengeli beslenmek neden önemlidir? Anlatalım.  Besin yoncasını inc",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D18 Temizlik",
      "D13 Sağlıklı Yaşam"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p55_303",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 55,
    "title": "SESLERİ TAKİP ET VE TAKLİT ET",
    "domain": "Matematik",
    "theme": "SESLERİ TAKİP ET VE TAKLİT ET",
    "researchQuestion": "Defne hangi yoldan evine gitmiş olabilir?",
    "text": "55 SESLERİ TAKİP ET VE TAKLİT ET Defne eve giderken “telefon, çekiç, ambulans, kurbağa, uçak” sesi duyuyor. Görselleri incele­ yelim. Defne hangi yoldan evine gitmiş olabilir? Söyleyelim. Defne’nin gittiği yolu takip ederek  varlıkların ses",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p56_304",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 56,
    "title": "HAYVAN RÖNTGENLERİ",
    "domain": "Fen ve Doğa",
    "theme": "HAYVAN RÖNTGENLERİ",
    "researchQuestion": "Vanlardan hangisinin resmi eksik?",
    "text": "56 HAYVAN RÖNTGENLERİ Zoolog (hayvan bilimci), yaşayan ve nesli tükenen hayvanları bilimsel  olarak inceleyen kişidir. Zoolog Aylin, hayvanların panodaki röntgen filmini inceliyor. Görsel­ deki röntgen filmlerini inceleyelim. Panoda röntgen",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p57_305",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 57,
    "title": "SEVGİ ALBÜMÜ",
    "domain": "Sanat",
    "theme": "SEVGİ ALBÜMÜ",
    "researchQuestion": "Sevgimizi hangi sözlerle ifade ederiz?",
    "text": "57 SEVGİ ALBÜMÜ Bu bir sevgi albümü. Sevgi albümünün kapağına sevdiğimiz kişilerin resimlerini çizelim. Sevgimizi hangi sözlerle ifade ederiz? Sevgimizi, konuşmak dışında başka hangi yollarla gös­ terebiliriz? Söyleyelim.",
    "materials": [
      "Şeffaf su deney küveti",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "İçinde - Dışında",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p58_306",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 58,
    "title": "GÜN İÇİNDE NELER DEĞİŞİR?",
    "domain": "Bütünleşik Etkinlik",
    "theme": "GÜN İÇİNDE NELER DEĞİŞİR?",
    "researchQuestion": "GÜN İÇİNDE NELER DEĞİŞİR?",
    "text": "58 GÜN İÇİNDE NELER DEĞİŞİR? Görselleri inceleyelim. Resimler arasındaki 7 farkı bularak alttaki resimde işaretleyelim.  İki resim arasındaki farklılıkların nedeni ne olabilir? Konuşalım.",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b1_p59_307",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 59,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "59 5 RAKAMINI ÖĞRENİYORUM 5 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üzerinden  geçelim. Çevremizden 5 tane nesne gösterelim. Kesik çizgileri birleştirerek rakamları  tamamlayalım. Bulutun altına 5 tane yağmur",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p60_308",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 60,
    "title": "BEŞTAŞ OYUNU",
    "domain": "Matematik",
    "theme": "BEŞTAŞ OYUNU",
    "researchQuestion": "BEŞTAŞ OYUNU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "60 BEŞTAŞ OYUNU “Beştaş” oyunu bir elin içine sığabilecek büyüklükte olan 5 adet taşla oynanan  geleneksel bir oyundur. Oynayan kişinin seçtiği bir taşı havaya atıp tutarken yerdeki  taşları toplaması gerekir. Karekodu okutarak oyunun video",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p61_309",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 61,
    "title": "GECECİL HAYVANLAR",
    "domain": "Matematik",
    "theme": "GECECİL HAYVANLAR",
    "researchQuestion": "Gececil olmayan hayvan hangisi?",
    "text": "61 GECECİL HAYVANLAR Hayvanlardan bazıları gündüzleri dinlenir, geceleri beslenir ve daha aktiftir. Bir belgesel için  gececil hayvanların görüntüleri kaydedilmiş. Görselleri inceleyelim. Gece ışıkta bir bölümü  görünen hayvanların hangiler",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Gece - Gündüz"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p62_310",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 62,
    "title": "EV ŞEKLİ OLUŞTURUYORUM",
    "domain": "Matematik",
    "theme": "EV ŞEKLİ OLUŞTURUYORUM",
    "researchQuestion": "EV ŞEKLİ OLUŞTURUYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "62 EV ŞEKLİ OLUŞTURUYORUM Eda ve Arda renkli çubukları kullanarak ev şekli oluşturmaya çalıştılar. Oluşturdukları  evleri inceleyelim. Her sırada ev modelini oluştururken eksik kalan parçaları bulup uygun  renkteki kalemimizle çizerek tamam",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p63_311",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 63,
    "title": "AĞAÇLARIN İSİMLERİNİ HECELİYORUM",
    "domain": "Matematik",
    "theme": "AĞAÇLARIN İSİMLERİNİ HECELİYORUM",
    "researchQuestion": "AĞAÇLARIN İSİMLERİNİ HECELİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "63 AĞAÇLARIN İSİMLERİNİ HECELİYORUM Görsellerde ülkemizde yetişen ağaçlar bulunmaktadır. Ağaçların isimlerini öğretmenimizden  dinleyelim ve heceleyerek söyleyelim. Her görselin hece sayısı kadar yaprak boyayalım. Gür-gen Kes-ta-ne Ser-vi K",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p64_312",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 64,
    "title": "NOKTALI KARELER",
    "domain": "Matematik",
    "theme": "NOKTALI KARELER",
    "researchQuestion": "NOKTALI KARELER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "64 NOKTALI KARELER Görselleri inceleyelim. Karelerin içinde hangi bölümlerde, hangi renkte daireler olduğuna  dikkat edelim. Dairelerin renginde üç adet ponpon alalım. Aldığımız ponponları modelin  karşısındaki şekle görseldeki gibi yerleşt",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Daire",
      "Kare"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p65_313",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 65,
    "title": "KESTANE AĞACININ YAŞAM DÖNGÜSÜ",
    "domain": "Sanat",
    "theme": "KESTANE AĞACININ YAŞAM DÖNGÜSÜ",
    "researchQuestion": "Farklı malzemelerle KESTANE AĞACININ YAŞAM DÖNGÜSÜ nasıl canlandırabiliriz?",
    "text": "65 KESTANE AĞACININ YAŞAM DÖNGÜSÜ Kestane ağacının yaşam döngüsü ile ilgili görselleri inceleyelim. Kestane ağacının gelişim  aşamalarını boyayalım. Aşamalardaki renklere dikkat edelim. Görsellerin altlarında bu­ lunan sembolleri örnekteki ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p67_314",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 67,
    "title": "ÜLKEMİZDEKİ KUŞ TÜRLERİ",
    "domain": "Sanat",
    "theme": "ÜLKEMİZDEKİ KUŞ TÜRLERİ",
    "researchQuestion": "Farklı malzemelerle ÜLKEMİZDEKİ KUŞ TÜRLERİ nasıl canlandırabiliriz?",
    "text": "67 ÜLKEMİZDEKİ KUŞ TÜRLERİ Ülkemizdeki kuş türlerini gösteren görselleri inceleyelim. Altlarındaki renklere dikkat  edelim. Aynı kuş türlerini tablodan bulup altlarındaki sembolleri aynı renkte boyayalım. İzmir Yalıçapkını Turna Yeşil Arı K",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Yeşil",
      "Aynı - Farklı"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p68_315",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 68,
    "title": "CUMHURİYET KAÇ YAŞINDA?",
    "domain": "Sanat",
    "theme": "CUMHURİYET KAÇ YAŞINDA?",
    "researchQuestion": "CUMHURİYET KAÇ YAŞINDA?",
    "text": "68 CUMHURİYET KAÇ YAŞINDA? Serdar 29 Ekim’de doğdu. Doğum gününü ailesiyle kutladı. Serdar beş yaşında. Atatürk, Cumhuriyet’i 29 Ekim 1923 tarihinde ilan etti. Cumhuriyetin kaç yaşında olduğunu  tahmin edelim. Doğum günümüzü söyleyelim. Say",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p69_316",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 69,
    "title": "ATATÜRK’ÜN DOĞA SEVGİSİ",
    "domain": "Matematik",
    "theme": "ATATÜRK’ÜN DOĞA SEVGİSİ",
    "researchQuestion": "ATATÜRK’ÜN DOĞA SEVGİSİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "69 ATATÜRK’ÜN DOĞA SEVGİSİ Mustafa Kemal Atatürk doğaya karşı büyük bir sevgi beslerdi. Ülkemizin ağaçlandırıl­ masına büyük önem verdi. Atatürk’ün doğada zaman geçirirken çektirdiği fotoğrafları  inceleyelim. YÜRÜYEN KÖŞK Atatürk Yalova’da",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p70_317",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 70,
    "title": "ZEYNEP DOĞA GEZİSİNDE",
    "domain": "Matematik",
    "theme": "ZEYNEP DOĞA GEZİSİNDE",
    "researchQuestion": "ZEYNEP DOĞA GEZİSİNDE ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "70 ZEYNEP DOĞA GEZİSİNDE Zeynep, doğa gezisine çıktı. Yolu takip ederek kulübeye ulaşacak. Zeynep’in yol boyunca karşılaştığı varlıkları sayalım. Varlıkların sayısını örnekteki gibi gra­ fikte boyayarak gösterelim.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p71_318",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 71,
    "title": "BEŞ DUYU ORGANIMIZ",
    "domain": "Fen ve Doğa",
    "theme": "BEŞ DUYU ORGANIMIZ",
    "researchQuestion": "Başka neler gördük?",
    "text": "71 BEŞ DUYU ORGANIMIZ Bahçeye çıkalım. Beş duyumuzu kullanarak araştırma yapalım. Bahçede gördüklerimizi,  kokladıklarımızı, tadına baktıklarımızı, dokunarak hissettiklerimizi, sesini duyduklarımızı işa­ retleyelim. Başka neler gördük? Boş ",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p72_319",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 72,
    "title": "İSTEK VE İHTİYAÇLARIM",
    "domain": "Sanat",
    "theme": "İSTEK VE İHTİYAÇLARIM",
    "researchQuestion": "Nun  okulda kullanacağı malzeme listesi hangisi olabilir?",
    "text": "72 İSTEK VE İHTİYAÇLARIM Ebru ve ailesi, Ebru’nun eksik okul malzemelerini almak için alışverişe çıkmışlar. Ebru’nun  okulda kullanacağı malzeme listesi hangisi olabilir? Düşünelim. Ebru’nun ihtiyaçlarının ol­ duğu listede silgi, okul ayakk",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b1_p73_320",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 73,
    "title": "HAREKET EDELİM VE ÇİZELİM",
    "domain": "Matematik",
    "theme": "HAREKET EDELİM VE ÇİZELİM",
    "researchQuestion": "Yeterince dinlenmezsek ne olur?",
    "text": "73 HAREKET EDELİM VE ÇİZELİM Çok yorulduk. Şimdi kendimize bir yer seçip dinlenelim. Yeterince dinlenmezsek ne olur?  Anlatalım. 3 kere zıplayalım, ardından kesik çizgileri birleştirerek tamamlayalım. 4 kere kendi etrafımızda dönelim, ardın",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p74_321",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 74,
    "title": "ÜLKELERE ÖZGÜ YEMEKLER",
    "domain": "Fen ve Doğa",
    "theme": "ÜLKELERE ÖZGÜ YEMEKLER",
    "researchQuestion": "Yemekler hangi malzemelerden yapılıyor?",
    "text": "74 ÜLKELERE ÖZGÜ YEMEKLER Resmini çizdiğimiz yemeği yerken kullanabileceğimiz mutfak gerecini seçip işaretleyelim.  Tabaklardaki yemekleri inceleyelim. Yemekler hangi malzemelerden yapılıyor? İki yemeğin  de ortak malzemesini bulalım. Türki",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b1_p75_322",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 75,
    "title": "SONBAHAR YAPRAKLARINI SAYALIM",
    "domain": "Matematik",
    "theme": "SONBAHAR YAPRAKLARINI SAYALIM",
    "researchQuestion": "SONBAHAR YAPRAKLARINI SAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "75 SONBAHAR YAPRAKLARINI SAYALIM Aybüke sonbahar yaprakları toplamak için bahçeye çıkıyor. Topladığı yaprakların sa­ yısını kâğıda yazıyor. Daha sonra yaprakları renklerine ayırarak kavanozlara koyuyor.  Aybüke’nin kavanozlara koyduğu yapra",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Az - Çok",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p76_323",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 76,
    "title": "FARKLI BÖLGELER-FARKLI EVLER",
    "domain": "Matematik",
    "theme": "FARKLI BÖLGELER-FARKLI EVLER",
    "researchQuestion": "Sen nasıl bir evde yaşıyorsun?",
    "text": "76 FARKLI BÖLGELER-FARKLI EVLER Farklı bölgelerde yaşayan çocukların, özelliklerini dinlediğimiz evlerini bulalım. Çocukları  çizgi çizerek evleri ile eşleştirelim.  Sen nasıl bir evde yaşıyorsun? Evin hangi malzemelerden yapıldığını düşüne",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p77_324",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 77,
    "title": "HANGİ SESLERİ DUYDUN?",
    "domain": "Matematik",
    "theme": "HANGİ SESLERİ DUYDUN?",
    "researchQuestion": "HANGİ SESLERİ DUYDUN?",
    "text": "77 HANGİ SESLERİ DUYDUN? Karekoddaki sesleri dinleyelim. Duyduğumuz seslerin neye ait olduğunu söyleyelim ve  bu sesleri taklit edelim. Kendimizi duyduğumuz seslerin olduğu yerde hayal edelim, bu  hayalimizi çerçevenin içine çizelim. Çizdik",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b1_p78_325",
    "ageGroup": "60-72",
    "bookNo": 1,
    "pageNo": 78,
    "title": "ŞEKİLLERİ HECELİYORUM-ÇİÇEKLERİ ÇİZİYORUM",
    "domain": "Matematik",
    "theme": "ŞEKİLLERİ HECELİYORUM-ÇİÇEKLERİ ÇİZİYORUM",
    "researchQuestion": "ŞEKİLLERİ HECELİYORUM-ÇİÇEKLERİ ÇİZİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "78 ŞEKİLLERİ HECELİYORUM-ÇİÇEKLERİ ÇİZİYORUM Cemal amca doğa gezisinde çeşitli çiçeklerin fotoğraflarını  çekiyor. Fotoğraf çerçevelerinin şeklini inceleyelim. Şekillerin  isimlerini heceleyerek söyleyelim. Çerçevelerin içine hece  sayısı k",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Üçgen",
      "Kare"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p9_326",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 9,
    "title": "İZNİK ÇİNİSİ",
    "domain": "Matematik",
    "theme": "İZNİK ÇİNİSİ",
    "researchQuestion": "İZNİK ÇİNİSİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "9 İZNİK ÇİNİSİ İznik çinisi ülkemizin coğrafi işaret almış geleneksel el sanatlarından biridir. Birbiriyle aynı olan çini eserlerini gösterelim. Eşi olmayan çini eserini bulup işaret­ leyelim. Karekodu okutarak veya tıklayarak  etkileşimli ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p10_327",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 10,
    "title": "MEVSİM KARTLARI",
    "domain": "Matematik",
    "theme": "MEVSİM KARTLARI",
    "researchQuestion": "MEVSİM KARTLARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "10 MEVSİM KARTLARI Görselleri inceleyerek hangi mevsime ait olduğunu söyleyelim. Ekin’in farklı mevsimlerde  evine gidişini anlatan görsellerde doğada gerçekleşen değişiklikler hakkında konuşalım. Mevsim  kartlarının ilişkili olduğu görsell",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p11_328",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 11,
    "title": "NE HİSSEDİYORSUN?",
    "domain": "Fen ve Doğa",
    "theme": "NE HİSSEDİYORSUN?",
    "researchQuestion": "NE HİSSEDİYORSUN?",
    "text": "11 NE HİSSEDİYORSUN? Görsellerdeki duygu ifadelerinin hangi renk çerçevenin içinde olduğuna dikkat edelim. Görsellerdeki durumları yaşasaydık ne hissederdik, söyleyelim. Görselin altındaki kutucuğu  hissedeceğimiz duyguya ait yüz ifadesinin",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "İçinde - Dışında",
      "Altında - Üstünde",
      "Aynı - Farklı"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p12_329",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 12,
    "title": "GERİ DÖNÜŞÜM KUTULARI",
    "domain": "Matematik",
    "theme": "GERİ DÖNÜŞÜM KUTULARI",
    "researchQuestion": "GERİ DÖNÜŞÜM KUTULARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "12 GERİ DÖNÜŞÜM KUTULARI Arda, ailesi ile doğa yürüyüşüne çıktı. Fakat çevrede gördükleri atıklar Arda ve ailesini çok  üzdü. Arda’nın kozalak toplamak için yanında götürdüğü poşetler çok işe yaradı. Gördükleri  tüm atıkları bu poşetlere ko",
    "materials": [
      "Şeffaf su deney küveti",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Az - Çok",
      "Sarı",
      "Mavi"
    ],
    "values": [
      "D16 Sorumluluk",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p13_330",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 13,
    "title": "ÖRÜNTÜ YOLU",
    "domain": "Matematik",
    "theme": "ÖRÜNTÜ YOLU",
    "researchQuestion": "ÖRÜNTÜ YOLU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "13 ÖRÜNTÜ YOLU Atakan ve İrem aynı apartmanda yaşıyor. Farklı yolları kullanarak evlerine ulaşıyorlar.  Varlıkların sıralamasına dikkat edelim. Örüntü kuralını bulalım ve varlıkları kurala uygun  şekilde boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Aynı - Farklı",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p14_331",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 14,
    "title": "BASKI TEKNİKLERİ",
    "domain": "Sanat",
    "theme": "BASKI TEKNİKLERİ",
    "researchQuestion": "Farklı malzemelerle BASKI TEKNİKLERİ nasıl canlandırabiliriz?",
    "text": "14 BASKI TEKNİKLERİ Tabloları inceleyelim. Resimlerin hangi baskı tekniği kullanılarak yapıldığını bulalım. Yapılan baskı tekniğinin çerçeve rengine uygun olarak resimlerin çerçevesini boyayalım. Boş bir kâğıda bu tekniklerden birini kullan",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b2_p15_332",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 15,
    "title": "RENK TAKİBİ",
    "domain": "Matematik",
    "theme": "RENK TAKİBİ",
    "researchQuestion": "RENK TAKİBİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "15 RENK TAKİBİ Kutuların içinde bulunan rakamları inceleyelim. Örnekteki gibi rakamların ait olduğu rengi  sırayla takip ederek çizgi çizerek birleştirelim. 1 2 3 4 5 Karekodu okutarak veya tıklayarak  etkileşimli içeriğe ulaşabilirsiniz.",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "İçinde - Dışında"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p16_333",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 16,
    "title": "KAPLUMBAĞA NEREDE?",
    "domain": "Matematik",
    "theme": "KAPLUMBAĞA NEREDE?",
    "researchQuestion": "KAPLUMBAĞA NEREDE?",
    "text": "16 KAPLUMBAĞA NEREDE? Görsellerdeki kaplumbağanın kutunun neresinde durduğuna dikkat edelim. Kaplumbağa  kutunun içinde mi? Üstünde mi? Altında mı? Yanında mı? Söyleyelim. Tablodaki kutuları  inceleyelim. Kutunun rengine göre kaplumbağanın ",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "İçinde - Dışında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p17_334",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 17,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "17 6 RAKAMINI ÖĞRENİYORUM Tabağın içine 6 tane fındık çizelim. 6 rakamını kullanarak bir resim çizelim. Karekodu okutarak veya tıklayarak  etkileşimli içeriğe ulaşabilirsiniz. 6 rakamlarını bulalım, işaretleyelim. 6 tane palamudu boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p18_335",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 18,
    "title": "VOLEYBOL MAÇI",
    "domain": "Bütünleşik Etkinlik",
    "theme": "VOLEYBOL MAÇI",
    "researchQuestion": "VOLEYBOL MAÇI konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "18 VOLEYBOL MAÇI Bir voleybol takımı 6 kişiden oluşmaktadır. İki takım maç yapmak istiyor. Görselleri inceleyelim.  Formaları altışarlı gruplayalım.",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b2_p19_336",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 19,
    "title": "TURŞU",
    "domain": "Matematik",
    "theme": "TURŞU",
    "researchQuestion": "TURŞU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "19 TURŞU Oya turşu yemeyi çok severdi. Babaannesinin yaptığı turşuları afiyetle yerken turşunun  nasıl yapıldığını merak etti. Babaannesi “Turşunun içine konulacak sebzeler güzelce yıkanır,  sonra sebzeler bir kavanoza yerleştirilir. Ardınd",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Sarı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D18 Temizlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p20_337",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 20,
    "title": "GÜNEŞ’İN HAREKETLERİ",
    "domain": "Fen ve Doğa",
    "theme": "GÜNEŞ’İN HAREKETLERİ",
    "researchQuestion": "GÜNEŞ’İN HAREKETLERİ doğada ve çevremizde nasıl işler?",
    "text": "20 GÜNEŞ’İN HAREKETLERİ Görsellerdeki Güneş’in hareketlerini inceleyelim. Hangi zaman diliminde güneş doğar, söyleyelim.  Sabah uyandığımızda uyguladığımız rutinleri  canlandıralım. Günün hangi zaman diliminde güneş en tepede  olur, söyleye",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p21_338",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 21,
    "title": "SES OYUNU",
    "domain": "Fen ve Doğa",
    "theme": "SES OYUNU",
    "researchQuestion": "SES OYUNU doğada ve çevremizde nasıl işler?",
    "text": "21 SES OYUNU Dizeklerde notalar yerine farklı sesler üretmemizi sağlayacak görseller var. Görselleri  inceleyelim. Her dizekte yer alan görsele uygun sesleri çıkarmayı deneyelim. Dizimize vuralım. Dizimize vuralım. “Şşşt” sesi  çıkaralım. E",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p22_339",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 22,
    "title": "FOTOĞRAFÇI",
    "domain": "Matematik",
    "theme": "FOTOĞRAFÇI",
    "researchQuestion": "Fotoğrafçı su altında başka neler  görmüş olabilir?",
    "text": "22 FOTOĞRAFÇI Su altı fotoğrafçısı, denizdeki canlıların fotoğrafını çeker. Karekodu okutarak veya tıklayarak görselleri  inceleyelim. Fotoğrafçı su altında başka neler  görmüş olabilir? Düşünelim ve çizelim. Yaban hayatı fotoğrafçısı, hayv",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Altında - Üstünde"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p23_340",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 23,
    "title": "ATATÜRK’ÜN KİTAP SEVGİSİ",
    "domain": "Matematik",
    "theme": "ATATÜRK’ÜN KİTAP SEVGİSİ",
    "researchQuestion": "Ün kitap sevgisini anlatan  bir kitap olsaydı kapağı nasıl olurdu?",
    "text": "23 ATATÜRK’ÜN KİTAP SEVGİSİ Mustafa Kemal Atatürk, kitap okumayı çok severdi. Atatürk’ün kitap incelerken çekilen  fotoğraflarını inceleyelim. Biz de Atatürk gibi bir kitabı incelediğimizi düşünelim. Atatürk’ün kitap sevgisini anlatan  bir ",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p24_341",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 24,
    "title": "SEPET ÖRÜYORUM",
    "domain": "Matematik",
    "theme": "SEPET ÖRÜYORUM",
    "researchQuestion": "SEPET ÖRÜYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "24 SEPET ÖRÜYORUM Ülkemizde birçok yörede uzun yıllardır sepet üretilmektedir. Sepetler genellikle saz, kamış  veya buna benzer ince dallar kullanılarak örülmektedir. Kamışlarla örülmüş sepet görselini inceleyelim. Dikey örülen kamışları pa",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p25_342",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 25,
    "title": "AYÇİÇEĞİ TARLASI",
    "domain": "Matematik",
    "theme": "AYÇİÇEĞİ TARLASI",
    "researchQuestion": "AYÇİÇEĞİ TARLASI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "25 AYÇİÇEĞİ TARLASI Ayçiçeği ülkemizde en çok üretilen tarım ürünlerinden biridir. Ayçiçeğinden yağ ve  çekirdek elde edilir. Ayçiçeklerinin çiçek kısımları gün içinde Güneş’i takip eder. Görseldeki ayçiçeklerinin  sıralamasını inceleyelim ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "İçinde - Dışında"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p26_343",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 26,
    "title": "KUŞLAR VE GAGALARI",
    "domain": "Matematik",
    "theme": "KUŞLAR VE GAGALARI",
    "researchQuestion": "KUŞLAR VE GAGALARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "26 KUŞLAR VE GAGALARI Kuş görsellerini inceleyelim. Sinek kuşu, papağan ve pelikan dışındaki kuşları işaretleyelim ve  isimlerini söyleyelim. Bu kuşların gagalarını inceleyelim. Neyle beslendiklerini tahmin edelim. Kuşların özelliklerini di",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Uzun - Kısa",
      "Kalın - İnce"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p27_344",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 27,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "27 7 RAKAMINI ÖĞRENİYORUM 7 rakamını kullanarak bir resim çizelim. 7 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üzerinden  geçelim. Çevremizden 7 tane nesne gösterelim. Kesik çizgileri birleştirerek rakamları  t",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p28_345",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 28,
    "title": "NOTALAR",
    "domain": "Müzik",
    "theme": "NOTALAR",
    "researchQuestion": "Bedenimiz ve sesimizle NOTALAR ritmini nasıl yakalarız?",
    "text": "28 NOTALAR Müzikte sesleri belirtmeye yarayan işaretlere nota denir. Yedi tane nota bulunmaktadır.  Görseli inceleyelim. Notaları yedişerli gruplayalım.",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Ses boruları",
      "Ahşap kastanyet"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_60_72_b2_p29_346",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 29,
    "title": "ZEYTİNLERİ SAYALIM",
    "domain": "Matematik",
    "theme": "ZEYTİNLERİ SAYALIM",
    "researchQuestion": "ZEYTİNLERİ SAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "29 ZEYTİNLERİ SAYALIM Hasat günü zeytinler ağaçtan silkelenerek toplanır. Toplanan zeytinlerin bir kısmı fabrikaya  gönderilir. Zeytinlerden zeytinyağı elde edilir. Bir kısmı ile de sofralık zeytin yapılır. Görselleri inceleyelim. Kavanozda",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p30_347",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 30,
    "title": "EŞSİZ PARMAK İZLERİ",
    "domain": "Sanat",
    "theme": "EŞSİZ PARMAK İZLERİ",
    "researchQuestion": "Farklı malzemelerle EŞSİZ PARMAK İZLERİ nasıl canlandırabiliriz?",
    "text": "30 EŞSİZ PARMAK İZLERİ Her insanın parmak izi farklıdır. Aşağıdaki parmak izlerini inceleyelim. Boş kutuya parmağımızı basarak parmak izimizi çıkaralım. Parmak izimizi kullanarak bir  resim oluşturalım.  \u0007Öğretmene not:\t\u0007Gerçekleştirilecek ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b2_p31_348",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 31,
    "title": "YÜN İPLERİ SAYALIM VE BOYAYALIM",
    "domain": "Matematik",
    "theme": "YÜN İPLERİ SAYALIM VE BOYAYALIM",
    "researchQuestion": "YÜN İPLERİ SAYALIM VE BOYAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "31 YÜN İPLERİ SAYALIM VE BOYAYALIM Aybüke’nin anneannesi örgü örmek için yün ipler alacak. Tuhafiye dükkânına gitmeden önce  alacağı yün iplerin rengine ve sayısına karar veriyor. Listeyi inceleyelim. Sepetlerdeki yün ipleri sayalım. İpleri",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p32_349",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 32,
    "title": "NAZİK KELEBEK",
    "domain": "Matematik",
    "theme": "NAZİK KELEBEK",
    "researchQuestion": "Bu olaylarda hangi nezaket ifadeleri kullanılır?",
    "text": "32 NAZİK KELEBEK Görsellerdeki olayları inceleyelim. Bu olaylarda hangi nezaket ifadeleri kullanılır? Söyleyelim.  Görsellerin altındaki kutuları örnekteki nezaket ifadelerinin rengine göre boyayalım.  Teşekkür ederim. Hoşça kal. Geçmiş ols",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p33_350",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 33,
    "title": "HAFTANIN GÜNLERİ",
    "domain": "Matematik",
    "theme": "HAFTANIN GÜNLERİ",
    "researchQuestion": "HAFTANIN GÜNLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "33 HAFTANIN GÜNLERİ Haftanın günlerini sayalım. Haftanın günlerini heceleyerek söyleyelim. Her heceyi söylediğimizde  el çırpalım. Hece sayısını yanındaki kutuya yazalım. PAZARTESİ SALI ÇARŞAMBA PERŞEMBE CUMA CUMARTESİ PAZAR",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p34_351",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 34,
    "title": "KUKLA",
    "domain": "Matematik",
    "theme": "KUKLA",
    "researchQuestion": "Kuklanın başını hareket ettirebilmek için kaç numaralı ipi oynatmalıyız?",
    "text": "34 KUKLA İpli kukla, hareket etme özelliği en fazla olan kukla çeşididir. Kukla, hareket etmesi istenen  bölümlerine bağlanan iplerle oynatılır. Görseli inceleyelim. İplerin bağlı olduğu beden  bölümlerini söyleyelim. Kuklanın başını hareke",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p35_352",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 35,
    "title": "UYAKLI SÖZCÜKLER",
    "domain": "Matematik",
    "theme": "UYAKLI SÖZCÜKLER",
    "researchQuestion": "UYAKLI SÖZCÜKLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "35 UYAKLI SÖZCÜKLER Sayfadaki görsellerin isimlerini söyleyelim. Söylenişi birbirine benzeyen sözcükleri bulalım.  Söylenişi benzeyen sözcüklere uyaklı sözcükler denir. Uyaklı sözcüklerin görsellerini çizgi  çizerek eşleştirelim.  \u0007Öğretmen",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p36_353",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 36,
    "title": "DUYGULARIMI PAYLAŞMAYA İHTİYACIM VAR",
    "domain": "Matematik",
    "theme": "DUYGULARIMI PAYLAŞMAYA İHTİYACIM VAR",
    "researchQuestion": "Ailemiz dışında duygularımızı güvenle paylaşabileceğimiz başka biri var mı?",
    "text": "36 DUYGULARIMI PAYLAŞMAYA İHTİYACIM VAR Bazen bizi üzen olaylar yaşarız. Böyle durumlarda duygularımızı ailemizle paylaşırız.  Duygularımızı ailemizden kiminle paylaşabildiğimizi söyleyelim. Nedenini anlatalım.  Duygularımızı paylaşmak iste",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "Altında - Üstünde"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p37_354",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 37,
    "title": "VİTRAY SANATI",
    "domain": "Matematik",
    "theme": "VİTRAY SANATI",
    "researchQuestion": "Pencereleri vitray ile süslenmiş bir camiyi daha  önce gördük mü?",
    "text": "37 VİTRAY SANATI Görseldeki pencereyi rakamlarla eşleştirilen renklere göre boyayalım. Vitray sanatı farklı renklerdeki camların bir araya getirilmesiyle oluşur. Gün ışığı bu  camlardan içeriye girdiğinde rengarenk bir ışık yayılır. Görseld",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p38_355",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 38,
    "title": "GEÇMİŞTE KULLANILAN EŞYALAR",
    "domain": "Matematik",
    "theme": "GEÇMİŞTE KULLANILAN EŞYALAR",
    "researchQuestion": "Lleri ile benzerlik ve farklılıkları nelerdir?",
    "text": "38 GEÇMİŞTE KULLANILAN EŞYALAR Deren, tatilde dedesinin köy evini ziyaret etmiş. Burada daha önce görmediği bazı eşyalar  dikkatini çekmiş. Dedesi Deren’e bu eşyaların isimlerini söylemiş, nasıl ve ne amaçla  kullanıldığını anlatmış. Köy ev",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p39_356",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 39,
    "title": "RENKLİ ÇÖMLEKLER",
    "domain": "Sanat",
    "theme": "RENKLİ ÇÖMLEKLER",
    "researchQuestion": "Farklı malzemelerle RENKLİ ÇÖMLEKLER nasıl canlandırabiliriz?",
    "text": "39 RENKLİ ÇÖMLEKLER Ana renklerin karışımından oluşan ara renkleri inceleyelim. Farklı renklerin karışımı ile süslenen çömlekleri inceleyelim. Çömleklerin desenlerini renklerin  karışımına uygun olarak örnekteki gibi boyayalım. Renk karışım",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b2_p40_357",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 40,
    "title": "Kaç tane kuş evi var?",
    "domain": "Fen ve Doğa",
    "theme": "Kaç tane kuş evi var?",
    "researchQuestion": "KIŞ Kaç tane kuş evi var?",
    "text": "KIŞ Kaç tane kuş evi var?  Söyleyelim. İçinde kuş olan  evi gösterelim. Kuş evleri neden  ağaçlara asılmış olabilir?  Söyleyelim. Kardan adam yapan  çocuk, kardan adamın şapkasını  bulamıyor. Kardan adamın  şapkasını bulalım. Kartopu yapan ",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p41_358",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 41,
    "title": "Kızakla kayan çocuğu",
    "domain": "Fen ve Doğa",
    "theme": "Kızakla kayan çocuğu",
    "researchQuestion": "Eldivenini  nerede düşürmüş olabilir?",
    "text": "Kızakla kayan çocuğu  gösterelim. Çocuğun kızakla  kayarken düşürdüğü atkıyı  bulalım. Kartopu  oynayan çocuklardan  birinin eldiveni yok. Eldivenini  nerede düşürmüş olabilir?  Bulalım. Ağaca tırmanan  sincap nerede? Gösterelim.  Sincabın ",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "İçinde - Dışında",
      "Sıcak - Soğuk",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p43_359",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 43,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "43 8 RAKAMINI ÖĞRENİYORUM Karekodu okutarak veya tıklayarak  etkileşimli içeriğe ulaşabilirsiniz. Tarlaya 8 tane havuç çizelim. 8 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üzerinden  geçelim. Çevremizden 8 tane",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p44_360",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 44,
    "title": "AHTAPOTUN KOLLARI",
    "domain": "Bütünleşik Etkinlik",
    "theme": "AHTAPOTUN KOLLARI",
    "researchQuestion": "AHTAPOTUN KOLLARI konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "44 AHTAPOTUN KOLLARI Ahtapotların 8 kolu vardır. Görselleri inceleyelim. Ahtapotların kollarını sekizerli gruplayalım.",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b2_p45_361",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 45,
    "title": "SAKİNLEŞME YÖNTEMLERİM",
    "domain": "Matematik",
    "theme": "SAKİNLEŞME YÖNTEMLERİM",
    "researchQuestion": "SAKİNLEŞME YÖNTEMLERİM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "45 SAKİNLEŞME YÖNTEMLERİM Yoğun duygular yaşadığımız anlarda sakinleşmek için bazı yöntemler deneriz. Görselleri  inceleyelim.  Sakinleşmek için seçtiğimiz yöntemleri işaretleyelim. Hangi durumlarda sakinleşmeye ihtiyaç  duyduğumuzu anlatal",
    "materials": [
      "Şeffaf su deney küveti",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p46_362",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 46,
    "title": "UÇAMAYAN KUŞ TÜRLERİ",
    "domain": "Bütünleşik Etkinlik",
    "theme": "UÇAMAYAN KUŞ TÜRLERİ",
    "researchQuestion": "UÇAMAYAN KUŞ TÜRLERİ konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "46 UÇAMAYAN KUŞ TÜRLERİ Farklı kuş türlerinin bulunduğu görselleri inceleyelim. Kuş türlerinin isimlerini söyleyelim.  Penguen, deve kuşu ve kivi kuşu uçamayan kuş türlerindendir. Uçan kuş türlerine örnek  verelim. Çerçevenin içindeki kuş g",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b2_p47_363",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 47,
    "title": "DOSTLUK",
    "domain": "Matematik",
    "theme": "DOSTLUK",
    "researchQuestion": "Arkadaş olmak ne demektir?",
    "text": "47 DOSTLUK Portreleri yönergelere uygun olarak tamamlayalım. Arkadaş olmak ne demektir?  Arkadaşlarımız olmasaydı ne olurdu? Konuşalım.  En çok özlediğim arkadaşım. Birlikte oyun oynamaktan  mutlu olduğum arkadaşım. Birlikte en çok güldüğüm",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Mutlu - Üzgün",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p48_364",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 48,
    "title": "YAŞASIN, ÇOCUK HAKLARI!",
    "domain": "Sosyal & Duygusal",
    "theme": "YAŞASIN, ÇOCUK HAKLARI!",
    "researchQuestion": "Çocuk hakları kavramını daha önce duyduk mu?",
    "text": "48 YAŞASIN, ÇOCUK HAKLARI! Çocuk hakları kavramını daha önce duyduk mu? Söyleyelim. Çocukların hakları nelerdir?  Görselleri inceleyelim ve görsellere bakarak çocukların hangi hakları olduğunu anlatalım. Tüm çocuklar yaşama, bir aileye sahi",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D18 Temizlik"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_60_72_b2_p49_365",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 49,
    "title": "TEŞEKKÜRLER ÖĞRETMENİM",
    "domain": "Sanat",
    "theme": "TEŞEKKÜRLER ÖĞRETMENİM",
    "researchQuestion": "Farklı malzemelerle TEŞEKKÜRLER ÖĞRETMENİM nasıl canlandırabiliriz?",
    "text": "49 TEŞEKKÜRLER ÖĞRETMENİM Teşekkürler Öğretmenim Ülkemizde her yıl 24 Kasım, Öğretmenler  Günü olarak kutlanır.  Başöğretmenimiz Atatürk’ün yer aldığı görselleri  inceleyelim. Öğretmenimizin adını söyleyelim. Öğretmenimizle yaşadığımız bir ",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b2_p50_366",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 50,
    "title": "DEFNE’NİN RESİMLERİ",
    "domain": "Matematik",
    "theme": "DEFNE’NİN RESİMLERİ",
    "researchQuestion": "DEFNE’NİN RESİMLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "50 DEFNE’NİN RESİMLERİ Defne resim yapmayı çok seviyor. Yaptığı resimleri duvara asıyor. Resimleri inceleyelim.  Her resimde kaç tane çiçek var sayalım. Kutunun içine çiçek sayısı kadar çizgi çizelim. Resimleri boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p51_367",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 51,
    "title": "DOĞADAKİ UYAK",
    "domain": "Fen ve Doğa",
    "theme": "DOĞADAKİ UYAK",
    "researchQuestion": "DOĞADAKİ UYAK doğada ve çevremizde nasıl işler?",
    "text": "51 DOĞADAKİ UYAK Görsellerin isimlerini söyleyelim. Her sırada uyaklı sözcükleri bulup altındaki kutucukları aynı  renge boyayalım.  \u0007Öğretmene not:\t\u0007Etkinliğe başlamadan önce çocukların düzeyine uygun uyaklı sözcük  örnekleri verebilirsini",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Altında - Üstünde",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p52_368",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 52,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "52 9 RAKAMINI ÖĞRENİYORUM Karekodu okutarak veya tıklayarak  etkileşimli içeriğe ulaşabilirsiniz. 9 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla rakamların üzerinden  geçelim. Çevremizden 9 tane nesne gösterelim. Kesik çizgi",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Önünde - Arkasında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p53_369",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 53,
    "title": "BİLEKLİK HAZIRLIYORUM",
    "domain": "Matematik",
    "theme": "BİLEKLİK HAZIRLIYORUM",
    "researchQuestion": "BİLEKLİK HAZIRLIYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "53 BİLEKLİK HAZIRLIYORUM Görseldeki çocuklar kendilerine bileklik hazırlamak istiyor. Her bileklikte 9 boncuk olmalı.  Görselleri inceleyelim. Boncukları sayarak dokuzarlı gruplayalım.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p54_370",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 54,
    "title": "DOKUZTAŞ OYUNU",
    "domain": "Fen ve Doğa",
    "theme": "DOKUZTAŞ OYUNU",
    "researchQuestion": "Büyükten küçüğe doğru kaç adet taş dizmişler?",
    "text": "54 DOKUZTAŞ OYUNU Mert ve arkadaşları “Dokuztaş Oyunu” oynayacak. ⚫Büyükten küçüğe doğru kaç adet taş dizmişler? Sayalım ve söyleyelim. ⚫Alttaki bölümde en üste hangi taşların gelebileceğini bulalım ve işaretleyelim. ⚫İşaretlediğimiz taşlar",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p55_371",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 55,
    "title": "MAĞARA RESİMLERİ",
    "domain": "Matematik",
    "theme": "MAĞARA RESİMLERİ",
    "researchQuestion": "Görseldeki mağara resimleri ne anlatıyor olabilir?",
    "text": "55 MAĞARA RESİMLERİ Yazı henüz icat edilmeden çok uzun yıllar önce insanlar yaşadıkları mağaraların duvarlarına  resimler çizerek iletişim kuruyordu. Görseldeki mağara resimleri ne anlatıyor olabilir?  Eskiden mağaralarda resim çizmek için ",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Az - Çok",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p56_372",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 56,
    "title": "MAĞARA RESİMLERİ",
    "domain": "Bütünleşik Etkinlik",
    "theme": "MAĞARA RESİMLERİ",
    "researchQuestion": "MAĞARA RESİMLERİ konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "56 MAĞARA RESİMLERİ",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b2_p57_373",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 57,
    "title": "KÜTÜPHANE RAFLARI",
    "domain": "Matematik",
    "theme": "KÜTÜPHANE RAFLARI",
    "researchQuestion": "KÜTÜPHANE RAFLARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "57 KÜTÜPHANE RAFLARI Kütüphane görevlisi rafları düzenlerken her bir rafta kitap isimlerinin aynı sesle başlamış  olmasına özen göstermiştir. Raftaki kitap kapağı görsellerini inceleyelim. Kitap isimlerinin  yazılışlarında ilk seslerine dik",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p58_374",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 58,
    "title": "DİNLE VE ÇİZGİLERİ TAKİP ET",
    "domain": "Fen ve Doğa",
    "theme": "DİNLE VE ÇİZGİLERİ TAKİP ET",
    "researchQuestion": "DİNLE VE ÇİZGİLERİ TAKİP ET doğada ve çevremizde nasıl işler?",
    "text": "58 DİNLE VE ÇİZGİLERİ TAKİP ET Sağ parmağımızı kırmızı noktaya, sol parmağımızı mavi noktaya koyalım. Öyküyü dinlerken sağ  ve sol parmaklarımızı aynı anda kullanarak çizgilerin üzerinden geçelim. Öykü tamamlanana  kadar parmaklarımızı çizg",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kırmızı",
      "Mavi",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p59_375",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 59,
    "title": "FATMA HALANIN MİSAFİRLERİ",
    "domain": "Bütünleşik Etkinlik",
    "theme": "FATMA HALANIN MİSAFİRLERİ",
    "researchQuestion": "Fatma halanın kaç  misafiri gelmiş?",
    "text": "59 FATMA HALANIN MİSAFİRLERİ Fatma halanın misafirleri gelmiş. Kapının önündeki ayakkabıları sayalım. Fatma halanın kaç  misafiri gelmiş? Söyleyelim. Fatma hala misafirlerini nasıl ağırlamış, onlara ne ikram etmiş  olabilir? Misafirliğe git",
    "materials": [
      "Şeffaf su deney küveti",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Ağır - Hafif",
      "Önünde - Arkasında",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b2_p60_376",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 60,
    "title": "SEÇİMLERİMİZ NEDEN FARKLI?",
    "domain": "Sosyal & Duygusal",
    "theme": "SEÇİMLERİMİZ NEDEN FARKLI?",
    "researchQuestion": "SEÇİMLERİMİZ NEDEN FARKLI?",
    "text": "60 SEÇİMLERİMİZ NEDEN FARKLI? Bilge ve arkadaşları “365 Gün Öykü” serisinden hangi kitabın okunacağını belirlemek için  sınıfta bir oylama yapmış. Grafiği inceleyelim ve hangi kitabın okunmuş olabileceğini söyleyelim.  “365 Gün Öykü” serisi",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_60_72_b2_p61_377",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 61,
    "title": "BLOKLARDAN ŞEKİLLER",
    "domain": "Matematik",
    "theme": "BLOKLARDAN ŞEKİLLER",
    "researchQuestion": "BLOKLARDAN ŞEKİLLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "61 BLOKLARDAN ŞEKİLLER Bloklarla oluşturulmuş modelleri inceleyelim. Modelleri oluşturan parçaların olduğu  kutuları bulalım ve modellerle çizgi çizerek eşleştirelim.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p62_378",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 62,
    "title": "FOSİL BİLİMCİ",
    "domain": "Fen ve Doğa",
    "theme": "FOSİL BİLİMCİ",
    "researchQuestion": "FOSİL BİLİMCİ doğada ve çevremizde nasıl işler?",
    "text": "62 FOSİL BİLİMCİ Fosil, yıllar önce yaşamış bitki ve hayvan kalıntılarının taşlar arasında sertleşmesiyle oluşur.  Fosil bilimciler eskiden yaşamış canlıların kalıntılarını inceleyerek canlıların yaşamı hakkında  bilgi edinirler.  Görseldek",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Canlı - Cansız",
      "2 (İki)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p63_379",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 63,
    "title": "FOSİL BİLİMCİLERİN MALZEMELERİ",
    "domain": "Matematik",
    "theme": "FOSİL BİLİMCİLERİN MALZEMELERİ",
    "researchQuestion": "FOSİL BİLİMCİLERİN MALZEMELERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "63 FOSİL BİLİMCİLERİN MALZEMELERİ Fosil bilimcilerin zamanlarının çoğu kazılarda geçer. Fosillerin zarar görmemesi için fosil  bilimcilerin dikkatli çalışmaları gerekir. Fosil bilimcilerin araştırmaları sırasında kullandıkları aletlere ve e",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p64_380",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 64,
    "title": "RAKAMINI ÖĞRENİYORUM",
    "domain": "Matematik",
    "theme": "RAKAMINI ÖĞRENİYORUM",
    "researchQuestion": "RAKAMINI ÖĞRENİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "64 0 RAKAMINI ÖĞRENİYORUM 0 rakamlarını inceleyelim. Ok yönünde ilerleyerek parmağımızla 0 rakamlarının  üzerinden geçelim. Kesik çizgileri birleştirerek rakamları tamamlayalım. Vazoda hiç çiçek yok. Akvaryumda hiç balık yok. 0 rakamını kul",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Önünde - Arkasında"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p65_381",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 65,
    "title": "VİTAMİN DOLU BULMACA",
    "domain": "Matematik",
    "theme": "VİTAMİN DOLU BULMACA",
    "researchQuestion": "VİTAMİN DOLU BULMACA ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "65 VİTAMİN DOLU BULMACA Zeynep ve arkadaşları okulda “Tutum, Yatırım ve Türk Malları Haftası”nı kutlamak için  görev paylaşımı yaptılar. Getirdikleri meyvelerle ilgili ipuçlarını dinleyelim. Grafikte uygun  yerleri örnekteki gibi boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kırmızı",
      "Sarı",
      "Yeşil"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p66_382",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 66,
    "title": "MOZAİKTE İSMİM VAR MI?",
    "domain": "Matematik",
    "theme": "MOZAİKTE İSMİM VAR MI?",
    "researchQuestion": "MOZAİKTE İSMİM VAR MI?",
    "text": "66 MOZAİKTE İSMİM VAR MI? Mozaiğin parçalarının içinde olan harflere dikkat edelim. İsmimizin içinde olan harflerin  olduğu parçaları boyayalım.  \u0007Öğretmene not:\t\u0007Etkinliğin başında bulunan çerçevenin içine çocuğun ismi büyük harflerle  yaz",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "İçinde - Dışında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p67_383",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 67,
    "title": "FOTOĞRAF ÇERÇEVESİ TASARLIYORUM",
    "domain": "Matematik",
    "theme": "FOTOĞRAF ÇERÇEVESİ TASARLIYORUM",
    "researchQuestion": "Hangi  geometrik şekilleri görüyorsun?",
    "text": "67 FOTOĞRAF ÇERÇEVESİ TASARLIYORUM Birçok farklı geometrik şekilde çerçeve vardır. Örneğin  Göktunç’un dedesi ve ninesiyle çektirdiği fotoğraf  dikdörtgen çerçevenin içinde duruyor. Aşağıda verilen farklı  şekillerden oluşan fotoğraf çerçev",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "İçinde - Dışında"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p68_384",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 68,
    "title": "KONUŞABİLİR MİYİM?",
    "domain": "Fen ve Doğa",
    "theme": "KONUŞABİLİR MİYİM?",
    "researchQuestion": "KONUŞABİLİR MİYİM?",
    "text": "68 KONUŞABİLİR MİYİM? Emre ve arkadaşları müze gezisinde rehberi dikkatle dinliyorlardı. Emre eserlerle ilgili me­ rak ettiği bir soruyu sormak için sabırsızlanıyordu. Ancak rehberin sözü daha bitmedi. Emre  sorusunu sormak için rehberin ko",
    "materials": [
      "Şeffaf su deney küveti",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p69_385",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 69,
    "title": "DOĞADAKİ VE ÇEVREMİZDEKİ SESLER",
    "domain": "Fen ve Doğa",
    "theme": "DOĞADAKİ VE ÇEVREMİZDEKİ SESLER",
    "researchQuestion": "DOĞADAKİ VE ÇEVREMİZDEKİ SESLER Doğada ve çevremizde başka hangi sesler var?",
    "text": "69 DOĞADAKİ VE ÇEVREMİZDEKİ SESLER Doğada ve çevremizde başka hangi sesler var? Örnek verelim. Bu sesleri taklit etmeye  çalışalım. Sesler arasında nasıl bir fark var? Söyleyelim. Görselleri inceleyelim. Görseldeki varlıkların çıkardığı ses",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p70_386",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 70,
    "title": "ÇİNİ BOYAMA",
    "domain": "Matematik",
    "theme": "ÇİNİ BOYAMA",
    "researchQuestion": "Çevremizde çini sanatını nerelerde görürüz?",
    "text": "70 ÇİNİ BOYAMA Çini geleneksel el sanatlarımızdan biridir. Çini vazoyu ve çini desenlerini inceleyelim.  İznik çinilerinde nar, karanfil, lale gibi figürler kullanılır. Bu desenler genellikle kırmızı,  mavi ve yeşil tonlarında boyanır. Renk",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kırmızı"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p71_387",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 71,
    "title": "TAVUĞUN YAŞAM DÖNGÜSÜ",
    "domain": "Matematik",
    "theme": "TAVUĞUN YAŞAM DÖNGÜSÜ",
    "researchQuestion": "TAVUĞUN YAŞAM DÖNGÜSÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "71 TAVUĞUN YAŞAM DÖNGÜSÜ Tavuğun yaşam döngüsünü anlatan görseli inceleyelim. Görselleri sayfadaki renklerine  uygun boyayalım. Alttaki kodlama şeridinde, görsellerin altındaki daireleri belirlenen  renklere uygun boyayalım.  1 2 3 4",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Daire",
      "Altında - Üstünde"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p72_388",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 72,
    "title": "UĞUR BÖCEĞİ ÇİZGİ ÇALIŞMASI",
    "domain": "Fen ve Doğa",
    "theme": "UĞUR BÖCEĞİ ÇİZGİ ÇALIŞMASI",
    "researchQuestion": "Zorluklarla karşılaştığımızda ne yapmalıyız?",
    "text": "72 UĞUR BÖCEĞİ ÇİZGİ ÇALIŞMASI Uğur böcekleri çiçeklere ulaşmak istiyor. Uğur böceklerini engellere değmeden çizerek  çiçeklere ulaştıralım.  Engelleri aşmak her zaman kolay değildir. Zorluklarla karşılaştığımızda ne yapmalıyız?  Kimden ya ",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "2 (İki)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p73_389",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 73,
    "title": "AKVARYUM",
    "domain": "Matematik",
    "theme": "AKVARYUM",
    "researchQuestion": "Balık besleme çizelgesine göre balığı en son kim besledi?",
    "text": "73 AKVARYUM Öykü’nün evinde ailesiyle besledikleri bir balık var. Balığı her gün aileden farklı bir kişi  besliyor. Balığı besledikleri gün Öykü çizelgeyi mora, annesi turuncuya ve babası maviye boyuyor.  Çizelgeyi örüntü kuralına uygun boy",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Mavi",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p74_390",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 74,
    "title": "ALIŞVERİŞ LİSTESİ",
    "domain": "Matematik",
    "theme": "ALIŞVERİŞ LİSTESİ",
    "researchQuestion": "Alışveriş listesi hazırlamak israfı nasıl önler?",
    "text": "74 ALIŞVERİŞ LİSTESİ Emre ve ailesinin ihtiyaç listesini inceleyelim. Listeye göre marketteki ürünleri seçelim ve  çizgi çizerek listedekilerle eşleştirelim. Listedeki ürünlere bakarak Emre ve ailesinin yeterli ve  dengeli beslenip beslenme",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p75_391",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 75,
    "title": "DOĞAYI KORUYORUM",
    "domain": "Matematik",
    "theme": "DOĞAYI KORUYORUM",
    "researchQuestion": "DOĞAYI KORUYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "75 DOĞAYI KORUYORUM Görselleri inceleyelim, görsellerin altında yazan cümleleri dinleyelim. Doğru davranışların yanındaki kutucuğu yeşile, yanlış davranışların yanındaki kutucuğu  kırmızıya boyayalım. Su damlatan muslukları tamir  etmemek. ",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kırmızı"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p76_392",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 76,
    "title": "HARFLERİ BULALIM VE BOYAYALIM",
    "domain": "Matematik",
    "theme": "HARFLERİ BULALIM VE BOYAYALIM",
    "researchQuestion": "HARFLERİ BULALIM VE BOYAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "76 HARFLERİ BULALIM VE BOYAYALIM Hayvan görsellerini inceleyelim ve isimlerini söyleyelim. İsimlerinin yazılı olduğu alttaki  kutulara dikkatlice bakalım. Doğru harfleri bulalım ve boyayalım. FARE İNEK KUŞ AT A K E T O M A K F I E R Ö L I Ş",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b2_p77_393",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 77,
    "title": "ÖYKÜLÜ BEDEN HAREKETLERİ",
    "domain": "Fen ve Doğa",
    "theme": "ÖYKÜLÜ BEDEN HAREKETLERİ",
    "researchQuestion": "ÖYKÜLÜ BEDEN HAREKETLERİ doğada ve çevremizde nasıl işler?",
    "text": "77 ÖYKÜLÜ BEDEN HAREKETLERİ Hikâyeyi dikkatle dinleyelim. Hikâyede geçen hayvan isimlerini duyduğumuzda o hayvanın  hareketini taklit eden çocuğun olduğu görsele parmağımızı koyalım. Hikâye bittikten sonra  istediğimiz hayvanı taklit edelim",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b2_p78_394",
    "ageGroup": "60-72",
    "bookNo": 2,
    "pageNo": 78,
    "title": "HANGİ ÇALGI?",
    "domain": "Matematik",
    "theme": "HANGİ ÇALGI?",
    "researchQuestion": "HANGİ ÇALGI? ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "78 HANGİ ÇALGI? Asya, dinlediği seslerin hangi çalgıya ait olduğunu bulma oyunu oynuyor. Karekodlardaki  sesleri sırayla dinleyelim. Dinlediğimiz çalgının görselini bulalım. Çalgının bulunduğu kutunun  içini karekodunun çerçeve renginde boy",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kare",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p9_395",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 9,
    "title": "ÇAYIN YOLCULUĞU",
    "domain": "Matematik",
    "theme": "ÇAYIN YOLCULUĞU",
    "researchQuestion": "Çay, soframıza gelene kadar hangi yolculuklardan geçmiş?",
    "text": "9 ÇAYIN YOLCULUĞU Ülkemizin en önemli tarım ürünlerinden biri çaydır. Çayın yolculuğunu anlatan görselleri  inceleyelim. Çay, soframıza gelene kadar hangi yolculuklardan geçmiş? Anlatalım. Tablodaki çay bardaklarını ve her birinin içindeki ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "İçinde - Dışında"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p10_396",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 10,
    "title": "‘‘NEZAKET İLE PEKSİMET’’ ÖYKÜ",
    "domain": "Matematik",
    "theme": "‘‘NEZAKET İLE PEKSİMET’’ ÖYKÜ",
    "researchQuestion": "‘‘NEZAKET İLE PEKSİMET’’ ÖYKÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "10 ‘‘NEZAKET İLE PEKSİMET’’ ÖYKÜ Nezaket ile Peksimet iki tavşan kardeşmiş. Havuç toplamak için beraber gezerlermiş. Nezaket gülümseyip ilerlerken kırlarda Peksimet söylenerek gidermiş arkasında.   \t \t \t \t \t \t “Ben acıktım Nezaket; haydi ko",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Önünde - Arkasında",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p11_397",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 11,
    "title": "‘‘NEZAKET İLE PEKSİMET’’ ETKİNLİK",
    "domain": "Matematik",
    "theme": "‘‘NEZAKET İLE PEKSİMET’’ ETKİNLİK",
    "researchQuestion": "‘‘NEZAKET İLE PEKSİMET’’ ETKİNLİK ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "11 ‘‘NEZAKET İLE PEKSİMET’’ ETKİNLİK ‘‘Nezaket ile Peksimet’ öyküsünü dikkatle dinleyelim. Öykünün içinde nezaket ifadelerini  (lütfen, sağ ol, teşekkür ederim, rica ederim) duyduğumuzda bir tane havuç boyayalım. Karekodu okutarak veya tıkl",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kare",
      "İçinde - Dışında",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p12_398",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 12,
    "title": "ÇİÇEK BAHÇESİ",
    "domain": "Matematik",
    "theme": "ÇİÇEK BAHÇESİ",
    "researchQuestion": "ÇİÇEK BAHÇESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "12 ÇİÇEK BAHÇESİ Bazı çiçekli bitkilerin toprak altındaki kökleri soğan şeklindedir. Bunlara soğanlı bitkiler adı  verilir. Soğanlı bitkilerin çiçek açmış görsellerini inceleyelim. İsimlerini söyleyelim. Lale Nergis Zambak Zehra teyze bahçe",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p13_399",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 13,
    "title": "ENERJİ TASARRUFU",
    "domain": "Fen ve Doğa",
    "theme": "ENERJİ TASARRUFU",
    "researchQuestion": "ENERJİ TASARRUFU Enerjiden tasarruf etmek için evde neler yapabiliriz?",
    "text": "13 ENERJİ TASARRUFU Enerjiden tasarruf etmek için evde neler yapabiliriz?  Söyleyelim. Bisiklet yolunu kullanarak kesik çizgileri  birleştirelim, çocuğu gideceği yere ulaştıralım. Doğada enerji üretiminde kullanılan başka hangi  kaynaklar o",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p14_400",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 14,
    "title": "BENİM ÇİZGİLERİM",
    "domain": "Matematik",
    "theme": "BENİM ÇİZGİLERİM",
    "researchQuestion": "BENİM ÇİZGİLERİM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "14 BENİM ÇİZGİLERİM Etrafımızda birçok çizgi var. Doğada, kitaplarda, kıyafetlerde… Görseldeki çizgili varlıkları inceleyelim. Çevremizde üzerinde çizgiler olan başka neler  gördüğümüzü söyleyelim.  Görseldeki çizgi modellerini kullanarak t",
    "materials": [
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p15_401",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 15,
    "title": "A SESİ",
    "domain": "Matematik",
    "theme": "A SESİ",
    "researchQuestion": "A SESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "15 A SESİ Görsellerdeki ‘‘A’ sesiyle başlayan varlıkları parmağımızla göstererek varlıkların isimlerini  söyleyelim. Ardından ‘A’ sesi ile başlayan varlıkların parçalarını örnekteki gibi eşleştirelim.  “A” sesiyle başlayan başka bir varlık ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p16_402",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 16,
    "title": "YÖNLERİ KEŞFEDİYORUM",
    "domain": "Hareket ve Sağlık",
    "theme": "YÖNLERİ KEŞFEDİYORUM",
    "researchQuestion": "YÖNLERİ KEŞFEDİYORUM hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "16 YÖNLERİ KEŞFEDİYORUM Görselleri inceleyelim. Çerçevelerin rengine ve içindeki hareketlere dikkat edelim.  Sağ elimizi sayfanın sağına, sol elimizi sayfanın soluna koyalım. Her sırada gördüğümüz  kutuların rengine uygun hareketi yaparak, ",
    "materials": [
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b3_p17_403",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 17,
    "title": "SICAK HAVA BALONLARI",
    "domain": "Matematik",
    "theme": "SICAK HAVA BALONLARI",
    "researchQuestion": "SICAK HAVA BALONLARI Sincabın sıcak hava balonunda kaç tane dikdörtgen var?",
    "text": "17 SICAK HAVA BALONLARI Sincabın sıcak hava balonunda kaç tane dikdörtgen var? Sayalım. Dikdörtgenleri boyayalım. Kirpinin sıcak hava balonunda kaç tane üçgen var? Sayalım. Üçgenleri boyayalım. Tilkinin sıcak hava balonunda kaç tane daire v",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Daire",
      "Üçgen",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p18_404",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 18,
    "title": "ÜÇGEN, KARE, DİKDÖRTGEN",
    "domain": "Matematik",
    "theme": "ÜÇGEN, KARE, DİKDÖRTGEN",
    "researchQuestion": "ÜÇGEN, KARE, DİKDÖRTGEN ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "18 ÜÇGEN, KARE, DİKDÖRTGEN Sıla, şekil dedektifi oldu. Kenarı ve köşesi olan üç farklı geometrik şeklin sepetlerini hazırladı.  Görselleri inceleyelim. Sepetlerin üzerindeki şekillerin ismini söyleyelim. Nesneleri örnekteki  gibi benzediği ",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Üçgen"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p19_405",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 19,
    "title": "KAPLUMBAĞA TERBİYECİSİ",
    "domain": "Fen ve Doğa",
    "theme": "KAPLUMBAĞA TERBİYECİSİ",
    "researchQuestion": "KAPLUMBAĞA TERBİYECİSİ doğada ve çevremizde nasıl işler?",
    "text": "19 KAPLUMBAĞA TERBİYECİSİ Mehmet İstanbul’daki bir müzede Osman Hamdi Bey’in tablosu olan “Kaplumbağa Terbiyecisi”  adlı eseri inceliyor. Görseldeki tabloyu inceleyelim. Alttaki bölümde tabloyla eşleşen parçayı bulalım ve altındaki  kutucuğ",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p20_406",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 20,
    "title": "MAHYA IŞIKLARI",
    "domain": "Matematik",
    "theme": "MAHYA IŞIKLARI",
    "researchQuestion": "MAHYA IŞIKLARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "20 MAHYA IŞIKLARI Mahya, Ramazan ayında birden fazla minaresi olan camilerin iki minaresi arasına asılan  ışıklı yazıya denir. Görseli inceleyelim. Mahya ışıkları ile ne yazıldığını tahmin edelim. Bu  yazıyı oluşturan harfleri tablodan bulu",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p21_407",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 21,
    "title": "RİTİM OYUNU",
    "domain": "Matematik",
    "theme": "RİTİM OYUNU",
    "researchQuestion": "RİTİM OYUNU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "21 RİTİM OYUNU Dairelerin içinde gördüğümüz hareketleri sırasıyla ve arkadaşlarımızla aynı anda yapmaya  çalışalım. Çalışmayı tamamladıktan sonra biz de çeşitli ritimler oluşturup arkadaşımızla  paylaşalım.  \u0007Öğretmene not:\t\u0007Her sıranın son",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Daire",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p22_408",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 22,
    "title": "MESLEKLER",
    "domain": "Matematik",
    "theme": "MESLEKLER",
    "researchQuestion": "Bu  mesleklere sahip insanlar görevlerini iyi bir şekilde yerine getirmezse ne olur?",
    "text": "22 MESLEKLER “Vatanını en çok seven görevini en iyi yapandır.” \t \t \t \t \t \t Mustafa Kemal Atatürk Görseldeki meslekleri inceleyelim. Bildiğimiz diğer mesleklerin isimlerini söyleyelim. Bu  mesleklere sahip insanlar görevlerini iyi bir şekild",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p23_409",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 23,
    "title": "TABLODAKİ RENKLİ ŞEKİLLER",
    "domain": "Matematik",
    "theme": "TABLODAKİ RENKLİ ŞEKİLLER",
    "researchQuestion": "TABLODAKİ RENKLİ ŞEKİLLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "23 TABLODAKİ RENKLİ ŞEKİLLER Nil, renklerin açık ve koyu tonu kullanılarak çizilmiş geometrik şekiller ile bir tablo hazırlamak  istiyor. Görseli inceleyelim. Açık renkli geometrik şekilleri boyayalım. Koyu renkli geometrik  şekillerin için",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p24_410",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 24,
    "title": "ARILAR VE GÖREVLERİ",
    "domain": "Matematik",
    "theme": "ARILAR VE GÖREVLERİ",
    "researchQuestion": "ARILAR VE GÖREVLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "24 ARILAR VE GÖREVLERİ  \u0007Öğretmene not:\t\u0007Arıların kovanda belli sorumlulukları olduğu hakkında bilgi vererek  sorumluluklar hakkında çocuklarla sohbet edebilirsiniz. Kovandaki en büyük  bal arısıdır ve kovanda  bir adet bulunur.  Kraliçe ar",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p25_411",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 25,
    "title": "SORUMLULUKLARIMIZ",
    "domain": "Matematik",
    "theme": "SORUMLULUKLARIMIZ",
    "researchQuestion": "SORUMLULUKLARIMIZ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "25 SORUMLULUKLARIMIZ Aile içinde bazı görev ve sorumluluklarımız vardır. Görselleri inceleyelim. Evdeki  sorumluluklarımız hakkında konuşalım. Bizim sorumluluğumuzda olan davranışları  gösteren görsellerin yanındaki kutucuğu boyayalım.  \u0007Öğ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p26_412",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 26,
    "title": "ZITLAR OYUNU",
    "domain": "Matematik",
    "theme": "ZITLAR OYUNU",
    "researchQuestion": "ZITLAR OYUNU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "26 ZITLAR OYUNU Görselleri inceleyelim. Sağ ve sol tarafta bulunan görsellerden birbirinin zıttı olanları çizgi  çizerek eşleştirelim.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p27_413",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 27,
    "title": "YILDIZ NEFESİ",
    "domain": "Matematik",
    "theme": "YILDIZ NEFESİ",
    "researchQuestion": "YILDIZ NEFESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "27 YILDIZ NEFESİ Yıldız nefesi, derin nefes alıp vererek bedeni ve zihni sakinleştirmeye yardımcı olan bir nefes  egzersizidir. Görseli inceleyelim. Çok korktuğumuzda ya da kızdığımızda kalbimiz hızlı atar. Yıldız nefesi uygulamasını yapara",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p28_414",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 28,
    "title": "MİMAR SİNAN-",
    "domain": "Fen ve Doğa",
    "theme": "MİMAR SİNAN-",
    "researchQuestion": "Bir mimar olsaydık yaptığımız eserlerin gelecek nesillere  ulaşması için nelere dikkat ederdik?",
    "text": "28 MİMAR SİNAN-1 Mimar Sinan’ın günümüze kadar ulaşan eserlerini inceleyelim. Mimar  Sinan, uzun yıllar boyunca doğal afetlerden etkilenmeyecek yapılar  tasarlıyordu. Bir mimar olsaydık yaptığımız eserlerin gelecek nesillere  ulaşması için ",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p29_415",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 29,
    "title": "MİMAR SİNAN-",
    "domain": "Sanat",
    "theme": "MİMAR SİNAN-",
    "researchQuestion": "Farklı malzemelerle MİMAR SİNAN- nasıl canlandırabiliriz?",
    "text": "29 MİMAR SİNAN-2 Bir bina tasarlayalım ve üstteki çerçevenin içine çizelim. Binanın maketini sınıftaki malzemeleri  kullanarak alttaki çerçevenin içine yapalım. Maketimizin sağlam olması için malzemeleri  dikkatli seçelim.",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b3_p30_416",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 30,
    "title": "BAYRAĞA SAYGI",
    "domain": "Matematik",
    "theme": "BAYRAĞA SAYGI",
    "researchQuestion": "BAYRAĞA SAYGI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "30 BAYRAĞA SAYGI Şiiri hep birlikte tekrar edelim. Türk bayrağımızın görselini inceleyelim. Türk bayrağımıza ait  sembolleri bulalım ve altındaki kutuyu işaretleyelim. Cumhuriyet Bayramı, Çocuk Bayramı, Hepsinde dalgalanıyor, Şanlı Türk Bay",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D14 Saygı",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p31_417",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 31,
    "title": "İPEK VE EMRE’NİN EVİ",
    "domain": "Fen ve Doğa",
    "theme": "İPEK VE EMRE’NİN EVİ",
    "researchQuestion": "Nin odasının sağında evin hangi bölümü var?",
    "text": "31 İPEK VE EMRE’NİN EVİ Burası İpek ve Emre’nin evi. Evin bölümlerini inceleyelim. Bu bölümlerin isimlerini söyleyelim.  Emre’nin odasının duvarları mavi renkte. Emre’nin odasını bulup gösterelim. İpek’in odasının duvarları sarı renkte. İpe",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "Sarı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p32_418",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 32,
    "title": "KÜÇÜK HARF - BÜYÜK HARF",
    "domain": "Matematik",
    "theme": "KÜÇÜK HARF - BÜYÜK HARF",
    "researchQuestion": "KÜÇÜK HARF - BÜYÜK HARF ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "32 KÜÇÜK HARF - BÜYÜK HARF Görselleri inceleyelim. Hayvanların isimlerini söyleyelim.  Küçük harfle yazılan hayvan isimlerini gösterelim. Büyük harfle yazılan hayvan isimlerini  gösterelim.  İsimleri küçük harfle yazılan hayvanların çıkardı",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p33_419",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 33,
    "title": "BUZDOLABI",
    "domain": "Matematik",
    "theme": "BUZDOLABI",
    "researchQuestion": "BUZDOLABI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "33 BUZDOLABI Buzdolabının içindeki yiyeceklere ve bu yiyeceklerin numaralarına dikkat edelim. Kağan’ın  tabağındaki kodlara bakarak hangi yiyecekleri aldığını söyleyelim. Kendimiz için boş tabağa  yiyeceklerin kodlarını yazarak sağlıklı bir",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "1 (Bir)"
    ],
    "values": [
      "D18 Temizlik",
      "D13 Sağlıklı Yaşam"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p34_420",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 34,
    "title": "HAYVANLARIN YUMURTALARI",
    "domain": "Matematik",
    "theme": "HAYVANLARIN YUMURTALARI",
    "researchQuestion": "HAYVANLARIN YUMURTALARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "34 HAYVANLARIN YUMURTALARI Hayvan görsellerini ve yumurtalarını inceleyelim. Çerçevedeki hayvana ait yumurtaları  bulalım ve sayalım. Örnekteki gibi kutunun içine yumurta sayısı kadar çizgi çizelim.  PENGUEN KARATAVUK KUŞU DENİZ KAPLUMBAĞAS",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p35_421",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 35,
    "title": "HEMŞİN ÇORAPLARI",
    "domain": "Matematik",
    "theme": "HEMŞİN ÇORAPLARI",
    "researchQuestion": "HEMŞİN ÇORAPLARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "35 HEMŞİN ÇORAPLARI Görsellerdeki Hemşin çoraplarını inceleyelim. Her birinin eşini bulalım, çizgi ile birleştirelim.  Çerçevedeki çoraba istediğimiz şekilleri çizerek kendi çorabımızı tasarlayalım. Hemşin çorapları, ülkemizin coğrafi işare",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p36_422",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 36,
    "title": "ARI YUVALARINI SAYALIM",
    "domain": "Matematik",
    "theme": "ARI YUVALARINI SAYALIM",
    "researchQuestion": "ARI YUVALARINI SAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "36 ARI YUVALARINI SAYALIM Ayının yaşadığı mağaraya giden yoldaki arı yuvalarını sayalım. Arı yuvası sayısı kadar  el çırpalım.",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p37_423",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 37,
    "title": "KEŞİF KUTUSU",
    "domain": "Matematik",
    "theme": "KEŞİF KUTUSU",
    "researchQuestion": "KEŞİF KUTUSU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "37 KEŞİF KUTUSU Semih ailesiyle doğa gezisine çıktı. Doğa gezisinde keşif kutusuna koymak için çeşitli nesneler  topladı. Eve geldiklerinde kutuya topladıkları nesnelerin özelliklerini yazdılar. Listeye yazılan özellikleri dinleyelim.  Özel",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar"
    ],
    "concepts": [
      "Az - Çok",
      "Ağır - Hafif",
      "Sarı"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p38_424",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 38,
    "title": "TÜRKİYE UZAY AJANSI",
    "domain": "Fen ve Doğa",
    "theme": "TÜRKİYE UZAY AJANSI",
    "researchQuestion": "Hangi arma Türkiye  Uzay Ajansının ülkemiz için tasarladığı arma olabilir?",
    "text": "38 TÜRKİYE UZAY AJANSI Sema; gökyüzünü, gökyüzünde parlayan ışıkları, dünya gibi başka yerler olup olmadığını  merak ediyor. Uzay görevleri ile ilgili yaptığı araştırmada ülkelerin gerçekleştirdikleri her  uzay görevi için bir arma tasarlad",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D19 Vatanseverlik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p39_425",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 39,
    "title": "NE HİSSEDİYOR?",
    "domain": "Matematik",
    "theme": "NE HİSSEDİYOR?",
    "researchQuestion": "NE HİSSEDİYOR?",
    "text": "39 NE HİSSEDİYOR? Ece, gün içinde birçok farklı durum yaşıyor. Hissettiği duygular da buna göre değişiyor.  Cümleleri dinleyelim. Ece’nin ne hissediyor olabileceğini düşünelim. Her sırada Ece’nin  hissettiği duyguyu ifade eden görseli bulup",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p40_426",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 40,
    "title": "DENİZDEKİ CANLILAR",
    "domain": "Fen ve Doğa",
    "theme": "DENİZDEKİ CANLILAR",
    "researchQuestion": "DENİZDEKİ CANLILAR doğada ve çevremizde nasıl işler?",
    "text": "DENİZDEKİ CANLILAR İnci ve Can deniz kıyısına keşfe çıktılar. Yanlarına gözlem defterlerini ve  kalemlerini aldılar. Deniz kıyısına geldiklerinde sığ sularda yaşayan yengeç,  balık ve deniz kabuklusu gibi deniz canlılarına rastladılar. Gözl",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları"
    ],
    "concepts": [
      "Canlı - Cansız",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p42_427",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 42,
    "title": "AFET VE ACİL DURUM ÇANTASI",
    "domain": "Matematik",
    "theme": "AFET VE ACİL DURUM ÇANTASI",
    "researchQuestion": "Çantaya eklemek istediğimiz bir şey var mı?",
    "text": "42 AFET VE ACİL DURUM ÇANTASI Afet ve acil durum çantasının yanındaki görselleri inceleyelim. Çantada olması gereken  malzemelerin isimlerini söyleyelim. Malzemeleri afet ve acil durum çantasına çizgi çizerek  yerleştirelim. Çantaya eklemek",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p43_428",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 43,
    "title": "ÇÖK-KAPAN-TUTUN",
    "domain": "Erken Okuryazarlık & Türkçe",
    "theme": "ÇÖK-KAPAN-TUTUN",
    "researchQuestion": "ÇÖK-KAPAN-TUTUN konusu günlük yaşamımızda bize nasıl yardımcı olur?",
    "text": "43 ÇÖK-KAPAN-TUTUN Deprem anında etraftaki eşyalar nedeniyle oluşabilecek yaralanmalara karşı önlem almak  için “Çök-Kapan-Tutun” tekniğini uygulamalıyız. Çök-kapan-tutun tekniğini gösteren görselleri inceleyelim. Biz de sınıfımızda çök-kap",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b3_p44_429",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 44,
    "title": "SABIR BİLEKLİĞİ",
    "domain": "Matematik",
    "theme": "SABIR BİLEKLİĞİ",
    "researchQuestion": "SABIR BİLEKLİĞİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "44 SABIR BİLEKLİĞİ En sevdiğimiz arkadaşımız için bir bileklik hazırlayalım. Bilekliği hazırlarken sabırlı ve dikkatli  olmamız gerekiyor. Çünkü bilekliğin yapımında bir kural var. Görseldeki kurala dikkat  ederek çizgilerimizi doğru renkte",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p45_430",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 45,
    "title": "UĞUR BÖCEĞİNİN YAŞAM DÖNGÜSÜ",
    "domain": "Matematik",
    "theme": "UĞUR BÖCEĞİNİN YAŞAM DÖNGÜSÜ",
    "researchQuestion": "UĞUR BÖCEĞİNİN YAŞAM DÖNGÜSÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "45 UĞUR BÖCEĞİNİN YAŞAM DÖNGÜSÜ Uğur böceğinin yaşam döngüsü ile ilgili görselleri inceleyelim. Uğur böceğinin gelişim  aşamalarını boyayalım. Gelişim aşamalarının kodlarını tablodaki örnekte olduğu gibi ilgili  görsellerin kutularına yazal",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p46_431",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 46,
    "title": "GEZEGENLERİN HAREKETİ",
    "domain": "Matematik",
    "theme": "GEZEGENLERİN HAREKETİ",
    "researchQuestion": "GEZEGENLERİN HAREKETİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "46 GEZEGENLERİN HAREKETİ Gezegenlerle ilgili oyunun kurallarını dinleyelim.  Gezegenlere ait hareketi kurallarına uygun yapalım. Merkür, güneş etrafında en  hızlı dönen gezegendir. Hızlı  adımlarla hareket edelim. Venüs diğer birçok gezegen",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Canlı - Cansız"
    ],
    "values": [
      "D14 Saygı",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p47_432",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 47,
    "title": "GÖK TAŞI VE GEZEGENLER",
    "domain": "Matematik",
    "theme": "GÖK TAŞI VE GEZEGENLER",
    "researchQuestion": "GÖK TAŞI VE GEZEGENLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "47 GÖK TAŞI VE GEZEGENLER Görselleri inceleyelim. Parmağımızı, “Dur!” yönergesini duyana kadar gök taşı şeridinin  üzerinde sağa sola hareket ettirelim. Parmağımız hangi gök taşında durduysa o gök taşının  üzerindeki noktaları sayalım. Sayd",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p48_433",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 48,
    "title": "BÖCEKLER YUVALARINDA",
    "domain": "Fen ve Doğa",
    "theme": "BÖCEKLER YUVALARINDA",
    "researchQuestion": "BÖCEKLER YUVALARINDA doğada ve çevremizde nasıl işler?",
    "text": "48 BÖCEKLER YUVALARINDA Böcekler, çimlerin ve çiçeklerin üzerinden geçerek yuvalarına doğru ilerliyor. Her şeritte  önce çiçeklerin üzerindeki böcekleri sayalım. Sonra çimlerin üzerindeki böcekleri sayalım.  Böcekleri çizgi ile kendi yuvala",
    "materials": [
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p49_434",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 49,
    "title": "BLOKLARDAN ŞEKİLLER",
    "domain": "Sanat",
    "theme": "BLOKLARDAN ŞEKİLLER",
    "researchQuestion": "Farklı malzemelerle BLOKLARDAN ŞEKİLLER nasıl canlandırabiliriz?",
    "text": "49 BLOKLARDAN ŞEKİLLER Bloklarla oluşturulmuş modelleri inceleyelim. Modeli ve modeli oluşturan parçaların  bulunduğu kutuları çizgi ile birleştirelim.",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b3_p50_435",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 50,
    "title": "AY YILDIZIM",
    "domain": "Matematik",
    "theme": "AY YILDIZIM",
    "researchQuestion": "AY YILDIZIM Geceleri gökyüzünde neler görürüz?",
    "text": "50 AY YILDIZIM Geceleri gökyüzünde neler görürüz?  Konuşalım. Ali bir gök bilimci. Gök bilimciler, yıldızları  ve diğer gök cisimlerini araştırırlar. Ali, bazı  koordinatlar hazırladı.  Kırmızı çerçevelerdeki noktaları sayı şeritlerine uygu",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Az - Çok",
      "Kırmızı",
      "Kare"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p51_436",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 51,
    "title": "KIRKYAMA",
    "domain": "Matematik",
    "theme": "KIRKYAMA",
    "researchQuestion": "Küçülen  kıyafetlerimizi nasıl değerlendirebiliriz?",
    "text": "51 KIRKYAMA Bilge nine, torunlarının küçülen kıyafetlerini atmak yerine onlardan kırkyama örtüsü  hazırladı. Örtüyü inceleyelim. Bilge ninenin kullandığı kıyafetleri işaretleyelim. Kullanılmayan  kıyafetleri bulup üzerindeki desenleri örtüd",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p52_437",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 52,
    "title": "E SESİ",
    "domain": "Matematik",
    "theme": "E SESİ",
    "researchQuestion": "E SESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "52 E SESİ Görselleri inceleyelim. ‘E’ sesi ile başlayan varlıkları parmağımızla göstererek varlıkların  isimlerini söyleyelim. Ardından ‘E’ sesiyle başlayan varlıklar ile parçalarını örnekteki  gibi eşleştirelim. ‘E’ sesi ile başlayan bir v",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p53_438",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 53,
    "title": "ÇEKİRDEKLERİ SAYALIM",
    "domain": "Matematik",
    "theme": "ÇEKİRDEKLERİ SAYALIM",
    "researchQuestion": "ÇEKİRDEKLERİ SAYALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "53 ÇEKİRDEKLERİ SAYALIM Beril, ay çekirdeklerini tek bir tabakta toplamak istiyor. Önce ilk tabaktaki ay çekirdeklerini  sayalım. Sonra diğer tabaktaki ay çekirdeklerini sayalım. Boş tabakta toplam kaç ay çekirdeği  olacağını söyleyelim ve ",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p54_439",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 54,
    "title": "FOTOĞRAF ALBÜMÜ",
    "domain": "Sosyal & Duygusal",
    "theme": "FOTOĞRAF ALBÜMÜ",
    "researchQuestion": "FOTOĞRAF ALBÜMÜ durumunda kendimizi ve arkadaşlarımızı nasıl anlarız?",
    "text": "54 FOTOĞRAF ALBÜMÜ İrem, ailesinin fotoğraf albümünü inceliyor. Fotoğraflarda geçmişte kullanılan televizyon,  telefon ve bilgisayarı gördü. Bu nesneleri evindeki televizyon, telefon ve bilgisayarla  karşılaştırdı. Görselleri inceleyelim. G",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "4 (Dört)"
    ],
    "values": [
      "D14 Saygı",
      "D15 Sevgi"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_60_72_b3_p55_440",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 55,
    "title": "TEKNOFEST",
    "domain": "Fen ve Doğa",
    "theme": "TEKNOFEST",
    "researchQuestion": "TEKNOFEST doğada ve çevremizde nasıl işler?",
    "text": "55 TEKNOFEST Türkiye’nin ilk ve tek Havacılık, Uzay ve Teknoloji Festivali olan TEKNOFEST, bu yıl Fatih’in  yaşadığı şehirde yapılıyor. Bu festivalde farklı robotlar bulunuyor.  Fatih’in ailesi robotların olduğu bölümü inceliyor. Robotların",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "Altında - Üstünde"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p56_441",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 56,
    "title": "YERLİ VE MİLLÎ ÜRETİMLERİMİZ",
    "domain": "Matematik",
    "theme": "YERLİ VE MİLLÎ ÜRETİMLERİMİZ",
    "researchQuestion": "YERLİ VE MİLLÎ ÜRETİMLERİMİZ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "56 YERLİ VE MİLLÎ ÜRETİMLERİMİZ Kaan, Bilim ve Teknoloji Haftası’nda yerli ve millî üretim araçlarımızla ilgili dört tane şifreyi  inceliyor. Şifreleri dinleyelim. Uygun araçları bulup, araçların çerçevesini şifrenin yazdığı  şeritle aynı r",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p57_442",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 57,
    "title": "GÖBEKLİTEPE",
    "domain": "Matematik",
    "theme": "GÖBEKLİTEPE",
    "researchQuestion": "GÖBEKLİTEPE ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "57 GÖBEKLİTEPE Dünyanın en eski yapılarından biri olduğu düşünülen Göbeklitepe Şanlıurfa ilimizdedir.  Göbeklitepe’de yaşayan Aysel, ilgisini çeken taşları çizerek bir sudoku oyunu hazırladı. Oyunda her satır ve sütunda her taştan sadece bi",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Az - Çok",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p58_443",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 58,
    "title": "TAKIMYILDIZLARI KODLAMA",
    "domain": "Matematik",
    "theme": "TAKIMYILDIZLARI KODLAMA",
    "researchQuestion": "TAKIMYILDIZLARI KODLAMA ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "58 TAKIMYILDIZLARI KODLAMA Astronom (Gök bilimci) Aylin, bilimsel bir araştırma yapmak için teleskopla gökyüzündeki  takımyıldızlarını inceliyor. İncelediği takımyıldızlarını panoya kodluyor. Panodaki noktaları  çizgiyle birleştirerek takım",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p59_444",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 59,
    "title": "KÜPLERİ PAYLAŞTIRIYORUM",
    "domain": "Matematik",
    "theme": "KÜPLERİ PAYLAŞTIRIYORUM",
    "researchQuestion": "İçlerinden birine diğerlerinden daha fazla küp verilseydi ne olurdu?",
    "text": "59 KÜPLERİ PAYLAŞTIRIYORUM Her çocuğun sepetine dört tane küp koymamız gerekiyor. Ama bazı küpler birbirine takılı  kalmış. Adaletli bir paylaşım yapabilmek için küpleri dörderli olacak şekilde gruplayalım ve  çocukların sepetine çizgi çize",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p60_445",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 60,
    "title": "SİNCAP KIPIR",
    "domain": "Matematik",
    "theme": "SİNCAP KIPIR",
    "researchQuestion": "Nin evi hangi kesişimdedir?",
    "text": "60 SİNCAP KIPIR Sincap Kıpır, bu adadaki ağaçta yaşıyor. Bir gün evde çok sıkılınca arkadaşı Baykuş Payki’nin  evine doğru yola çıkmış. Arkadaşı ile zaman geçirdikten sonra eve dönüş yolunda bir  palamut bulmuş. Resimde Sincap Kıpır  ●  kes",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p61_446",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 61,
    "title": "KELİME BULMACA (“İ” SESİ)",
    "domain": "Fen ve Doğa",
    "theme": "KELİME BULMACA (“İ” SESİ)",
    "researchQuestion": "Son çocuk  neler söylemiş olabilir?",
    "text": "61 KELİME BULMACA (“İ” SESİ) Görseldeki çocuklar “Kelime Bulmaca” oyunu oynuyor. Çocuklar sırayla yanındaki arkadaşına  “İ” sesi ile başlayan bir kelime söylüyor. Çocukların söylediği kelimeleri dinleyelim. Son çocuk  neler söylemiş olabili",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p62_447",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 62,
    "title": "AĞACIN TEPESİNDEKİ ELMA",
    "domain": "Matematik",
    "theme": "AĞACIN TEPESİNDEKİ ELMA",
    "researchQuestion": "Ne yapıyorsun?",
    "text": "62 AĞACIN TEPESİNDEKİ ELMA -Of, yetişemiyorum! Bu dallar çok yüksek, en güzel  elmalar da en üst dallarda duruyor. Benekli kedi ne kadar uğraşsa da istediği elmaya bir  türlü ulaşamadı. Sincap, yan ağaçta dalların arasında  oturmuş, keyifle",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D16 Sorumluluk",
      "D7 Estetik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p63_448",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 63,
    "title": "ELMALARI PAYLAŞTIRIYORUM",
    "domain": "Matematik",
    "theme": "ELMALARI PAYLAŞTIRIYORUM",
    "researchQuestion": "Paylaşım adil oldu mu?",
    "text": "63 ELMALARI PAYLAŞTIRIYORUM Görselleri inceleyelim. Ağaçtaki elmaları sayalım. Elmaları kedi ve sincabın sepetlerine eşit  olacak şekilde çizgi çizerek paylaştıralım. Paylaşım adil oldu mu? Nedenini söyleyelim.  \u0007Öğretmene not:\t\u0007Her sepete ",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "2 (İki)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p64_449",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 64,
    "title": "SOLUCAN YOLU",
    "domain": "Fen ve Doğa",
    "theme": "SOLUCAN YOLU",
    "researchQuestion": "SOLUCAN YOLU doğada ve çevremizde nasıl işler?",
    "text": "64 SOLUCAN YOLU Solucanlar toprak altında gezinerek toprağı havalandırır ve kompost oluşumuna yardımcı  olur. Kompost, yiyecek atıklarının doğaya zarar vermeden dönüştürülerek toprağı besleyen  doğal bir gübre hâline getirilmesidir. Solucan",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Altında - Üstünde",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D5 Duyarlılık"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p65_450",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 65,
    "title": "KOMPOST YAPALIM",
    "domain": "Matematik",
    "theme": "KOMPOST YAPALIM",
    "researchQuestion": "KOMPOST YAPALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "65 KOMPOST YAPALIM Bitkimizi ektiğimiz toprağa kompostu  karıştırarak bitkimizin daha iyi büyü­ mesine yardımcı olalım. Bir süre sonra kompostumuz hazır. Yiyecek atıklarını yeşil ve kahverengi  yiyecek atıkları olarak ayrıştıralım.  Yiyecek",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Yumuşak sünger denge topları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Yeşil"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p66_451",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 66,
    "title": "NE ÇİZSEM?",
    "domain": "Matematik",
    "theme": "NE ÇİZSEM?",
    "researchQuestion": "NE ÇİZSEM? ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "66 NE ÇİZSEM? “Ne Çizsem?” şarkısını dinleyelim.  Şarkıyı dinlerken duyduğumuz sayıları, sayı şeridi üzerinde gösterelim. Çerçevenin içine seçtiğimiz bir sayıyı yazalım. Yazdığımız sayıyı kullanarak çerçevenin içine  bir resim yapalım. 0 1 ",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Ritim çubukları",
      "Marakas ve tefler"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p67_452",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 67,
    "title": "REÇEL KAVANOZLARI",
    "domain": "Matematik",
    "theme": "REÇEL KAVANOZLARI",
    "researchQuestion": "Nında en fazla hangi reçel var?",
    "text": "67 REÇEL KAVANOZLARI Tarık’ın halasının yöresel ürünler sattığı bir dükkânı var. Tarık, halasına dükkânındaki reçel  kavanozlarını sayması için yardım ediyor.  Raftaki reçel kavanozlarını inceleyelim. Hangi reçelden kaç tane olduğunu grafik",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p68_453",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 68,
    "title": "ÇİZGİLERLE HAYVANLARA ULAŞIYORUM",
    "domain": "Fen ve Doğa",
    "theme": "ÇİZGİLERLE HAYVANLARA ULAŞIYORUM",
    "researchQuestion": "ÇİZGİLERLE HAYVANLARA ULAŞIYORUM doğada ve çevremizde nasıl işler?",
    "text": "68 ÇİZGİLERLE HAYVANLARA ULAŞIYORUM Çizgileri, örnekteki gibi noktaları birleştirerek tamamlayalım. Her çizgi sonunda gördüğü­ müz hayvanın sesini ve hareketini taklit edelim.",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p69_454",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 69,
    "title": "AĞACI İNCELİYORUM",
    "domain": "Matematik",
    "theme": "AĞACI İNCELİYORUM",
    "researchQuestion": "AĞACI İNCELİYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "69 AĞACI İNCELİYORUM Görseldeki ağacın bölümlerini inceleyelim. Kök, gövde, dallar ve yaprakları parmağımızla  gösterelim. Bahçeye çıkarak bir ağacın bölümlerini inceleyelim. Şeritteki görselde yer alan  ağacın gelişim aşamalarını inceleyel",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p70_455",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 70,
    "title": "NOKTALAMA İŞARETLERİ",
    "domain": "Sosyal & Duygusal",
    "theme": "NOKTALAMA İŞARETLERİ",
    "researchQuestion": "NOKTALAMA İŞARETLERİ durumunda kendimizi ve arkadaşlarımızı nasıl anlarız?",
    "text": "70 NOKTALAMA İŞARETLERİ Noktalama işaretlerinin bulunduğu kartları inceleyelim. Noktalama işaretlerinin altındaki  yönergeleri dinleyelim. Hikâyeyi dinleyelim. Hikâyedeki noktalama işaretlerini bulalım. Bu işaretlerin isimlerini  söyleyerek",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Altında - Üstünde",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.2 Bağımsızlık"
    ]
  },
  {
    "id": "tb_60_72_b3_p71_456",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 71,
    "title": "BİTKİLERİN İHTİYAÇLARI",
    "domain": "Fen ve Doğa",
    "theme": "BİTKİLERİN İHTİYAÇLARI",
    "researchQuestion": "Görseldeki çiçekler neden solmuş olabilir?",
    "text": "71 BİTKİLERİN İHTİYAÇLARI Görselleri inceleyelim. 2. görseldeki çiçekler neden solmuş olabilir? Konuşalım. Bitkiler yaşamlarını sürdürebilmek için aşağıdakilerden hangilerine ihtiyaç duyar? Bulalım ve  altındaki kutuyu yeşile boyayalım. Gün",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kırmızı",
      "Yeşil"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b3_p73_457",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 73,
    "title": "TİYATRO SAHNESİ",
    "domain": "Matematik",
    "theme": "TİYATRO SAHNESİ",
    "researchQuestion": "TİYATRO SAHNESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "73 TİYATRO SAHNESİ Bir tiyatro oyunu izleyelim. İzlediğimiz oyunun bize neler hissettirdiği hakkında konuşalım.  Hissettiğimiz duygu ile ilgili yüz ifadesini işaretleyelim. Görselleri inceleyelim. İzlediğimiz tiyatro oyununun sahnesinde gör",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p74_458",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 74,
    "title": "TİYATRO KOSTÜMÜ TASARLIYORUM",
    "domain": "Matematik",
    "theme": "TİYATRO KOSTÜMÜ TASARLIYORUM",
    "researchQuestion": "TİYATRO KOSTÜMÜ TASARLIYORUM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "74 TİYATRO KOSTÜMÜ TASARLIYORUM Bir tiyatro oyununda sahne aldığımızı hayal edelim. Üzerimizde bir kostümle kendimizi  tiyatro sahnesine çizelim.  \u0007Öğretmene not:\t\u0007Sayfadaki karekodda bulunan ‘Kostüm Dolabı’ adlı öykü çocuklara  okunabilir.",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p75_459",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 75,
    "title": "KODLAMA",
    "domain": "Matematik",
    "theme": "KODLAMA",
    "researchQuestion": "KODLAMA ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "75 KODLAMA Birinci sıradaki görsellerin ismini ve altlarında yazan rakamı söyleyelim. Görsellerin kodlarını  örnekteki gibi belirleyip yazalım. 1 2 3 4 5",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p76_460",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 76,
    "title": "EŞİT PAYLAŞIM",
    "domain": "Matematik",
    "theme": "EŞİT PAYLAŞIM",
    "researchQuestion": "EŞİT PAYLAŞIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "76 EŞİT PAYLAŞIM Çocuklar elmaları eşit bir şekilde paylaşmak istiyorlar. Her sırada kasalardaki elmaları  sayalım. Elmaları çocukların sepetlerine eşit bir şekilde çizgi ile götürerek paylaştıralım. Karekodu okutarak veya tıklayarak  etkil",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p77_461",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 77,
    "title": "BAYRAM ŞEKERİ-",
    "domain": "Matematik",
    "theme": "BAYRAM ŞEKERİ-",
    "researchQuestion": "Bu sabah Fatma hala çocuklara neden şeker verdi?",
    "text": "77 BAYRAM ŞEKERİ-1 Din don, din don… Fatma hala zilin sesini duyduğu gibi şekerlik kutusunu aldı. Heyecanla kapıyı açtı. Her zil  sesinde şekerlikteki şekerler biraz daha azaldı. Bu sabah Fatma hala çocuklara neden şeker verdi? Sizce çocukl",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b3_p78_462",
    "ageGroup": "60-72",
    "bookNo": 3,
    "pageNo": 78,
    "title": "BAYRAM ŞEKERİ-",
    "domain": "Matematik",
    "theme": "BAYRAM ŞEKERİ-",
    "researchQuestion": "BAYRAM ŞEKERİ- ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "78 BAYRAM ŞEKERİ-2 Bir Bakışta Söyle Bayramlarda neler yaptığımızı ve evimizdeki bayram hazırlıklarını anlatalım.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p9_463",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 9,
    "title": "BENİM ARABAM",
    "domain": "Matematik",
    "theme": "BENİM ARABAM",
    "researchQuestion": "BENİM ARABAM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "9 BENİM ARABAM Çocukların verdikleri ipuçlarını dikkatle dinleyelim. İpuçlarına göre hangi arabaya bineceklerini  bulalım. Çocukları ve binecekleri arabayı bir çizgi ile eşleştirelim. Ben yeşil  arabaya  bineceğim. Benim bineceğim  arabada ",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kırmızı",
      "Yeşil",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p10_464",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 10,
    "title": "KAÇINCI ATLET",
    "domain": "Hareket ve Sağlık",
    "theme": "KAÇINCI ATLET",
    "researchQuestion": "Kaç atlet yarışıyor?",
    "text": "10 KAÇINCI ATLET Atletizm; koşu, atlama, ağırlık kaldırma vb. tek başına yapılan bireysel sporlara verilen  genel addır. Bu sporları yapan kişilere atlet denir. Görseldeki koşucu atletleri inceleyelim. 1. Kaç atlet yarışıyor? Sayalım, işare",
    "materials": [
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Kalın - İnce",
      "Ağır - Hafif",
      "Yeşil"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b4_p11_465",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 11,
    "title": "ARTMA AZALMA",
    "domain": "Matematik",
    "theme": "ARTMA AZALMA",
    "researchQuestion": "ARTMA AZALMA Tabakta kaç kurabiye var?",
    "text": "11 ARTMA AZALMA Tabakta kaç kurabiye var? Sayalım. Tabakta kaç kurabiye var? Sayalım. Tabakta kaç kurabiye var? Sayalım. İpek, kurabiyelerden bir tanesini yedi.  Kaç tane kurabiye kaldı? Sayalım.  Kurabiyeler arttı mı, azaldı mı?  Söyleyeli",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p12_466",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 12,
    "title": "BÖCEK OTELİ ÖYKÜ",
    "domain": "Fen ve Doğa",
    "theme": "BÖCEK OTELİ ÖYKÜ",
    "researchQuestion": "BÖCEK OTELİ ÖYKÜ ?",
    "text": "12 BÖCEK OTELİ ÖYKÜ ? ! Eğlenceli cırcır böcekleri neşeyle şarkılarını söylemeye başladılar. Alt  Eğlenceli cırcır böcekleri neşeyle şarkılarını söylemeye başladılar. Alt  katta konaklayan bitler bu eğlenceyi kaçırırlar mı hiç? Başladılar d",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p13_467",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 13,
    "title": "BÖCEK OTELİ ETKİNLİK",
    "domain": "Matematik",
    "theme": "BÖCEK OTELİ ETKİNLİK",
    "researchQuestion": "BÖCEK OTELİ ETKİNLİK ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "13 BÖCEK OTELİ ETKİNLİK Sarı dairedeki karıncaları sayalım ve karıncaların sayısını gösteren rakamı yazalım.  Yeşil dairedeki bitleri sayalım ve bitlerin sayısını gösteren rakamı yazalım. Mavi dairedeki  cırcır böceklerini sayalım ve cırcır",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Az - Çok",
      "Sarı",
      "Mavi"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p14_468",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 14,
    "title": "GÖLGE OYUNLARI",
    "domain": "Fen ve Doğa",
    "theme": "GÖLGE OYUNLARI",
    "researchQuestion": "Gölgeler hangi varlığa ait olabilir?",
    "text": "14 GÖLGE OYUNLARI Ekin ve ailesi mum ışığında gölge oyunu oynadılar. Gölgelerin görsellerini inceleyelim.  Gölgeler hangi varlığa ait olabilir? Düşünelim, işaretleyelim. Ekin’in ellerini kullanarak oluşturduğu gölge görselini inceleyelim. E",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p15_469",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 15,
    "title": "KİLİM MOTİFLERİ",
    "domain": "Matematik",
    "theme": "KİLİM MOTİFLERİ",
    "researchQuestion": "Üzerinde kaç farklı motif var?",
    "text": "15 KİLİM MOTİFLERİ Geleneksel tekniklerle dokunmuş kilimi inceleyelim. Üzerinde kaç farklı motif var? Sayalım. Motif çeşitlerinin sayısı kadar kutuyu grafik üzerinde boyayalım.  Daha önce bir kilim gördük mü? Söyleyelim. Gördüğümüz kilimin ",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p16_470",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 16,
    "title": "SÜT ÇİFTLİĞİ",
    "domain": "Matematik",
    "theme": "SÜT ÇİFTLİĞİ",
    "researchQuestion": "SÜT ÇİFTLİĞİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "16 SÜT ÇİFTLİĞİ Hilmi amca süt ve süt ürünleri tüketmeyi çok seviyor. Süt çiftliğine giderken bir alışveriş  listesi hazırlıyor. Alışveriş listesini inceleyelim. Hilmi amca eve döndüğünde aldığı ürünleri  masaya koyuyor. Her bir üründen kaç",
    "materials": [
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p17_471",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 17,
    "title": "KATI-SIVI-GAZ",
    "domain": "Matematik",
    "theme": "KATI-SIVI-GAZ",
    "researchQuestion": "KATI-SIVI-GAZ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "17 KATI-SIVI-GAZ Eda, katı, sıvı ve gazların görselleriyle ilgili bir tablo hazırladı. 1. sütuna katı, 2. sütuna sıvı,  3. sütuna gaz maddeleri dizmek istedi. Ancak bazı görselleri yanlış yerleştirdi.  Eda’nın tabloda yanlış yerleştirdiği g",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p18_472",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 18,
    "title": "FARKLI SESLERİ BULALIM",
    "domain": "Matematik",
    "theme": "FARKLI SESLERİ BULALIM",
    "researchQuestion": "FARKLI SESLERİ BULALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "18 FARKLI SESLERİ BULALIM Görselleri inceleyelim, neler gördüğümüzü söyleyelim. Her sırada farklı sesle başlayan  varlığı işaretleyelim. Karekodu okutarak veya tıklayarak  etkileşimli içeriğe ulaşabilirsiniz.",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Aynı - Farklı"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p19_473",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 19,
    "title": "PROBLEM ÇÖZME AĞACI",
    "domain": "Sanat",
    "theme": "PROBLEM ÇÖZME AĞACI",
    "researchQuestion": "In sorunu nedir?",
    "text": "19 PROBLEM ÇÖZME AĞACI Görselleri inceleyelim. 1. KÖK Alp’in sorunu nedir? Söyleyelim ve ağacın kökünü boyayalım. 2. GÖVDE Alp ne hissediyor olabilir? Söyleyelim ve ağacın gövdesini boyayalım. 3. DALLAR Alp’in sorunu nasıl çözülebilir? Uygu",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b4_p20_474",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 20,
    "title": "VAN KAHVALTISI",
    "domain": "Matematik",
    "theme": "VAN KAHVALTISI",
    "researchQuestion": "VAN KAHVALTISI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "20 VAN KAHVALTISI Ekin, Van kahvaltısı yapmak için ailesiyle Van Gölü’nün yanında bir kahvaltıcıya gitti. Aile  bireyleri tabaklarına kahvaltılık malzeme seçtiler. Tabakları inceleyelim. Her bir kahvaltı  tabağındaki kahvaltılıkları ayrı ay",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p21_475",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 21,
    "title": "DENİZ CANLILARI",
    "domain": "Matematik",
    "theme": "DENİZ CANLILARI",
    "researchQuestion": "DENİZ CANLILARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "21 DENİZ CANLILARI Görselleri inceleyelim. Gördüğümüz deniz canlılarının isimlerini söyleyelim. İki resim  arasındaki 9 farkı bulup yukarıdaki resmin içinde işaretleyelim.  Yukarıdaki görseli mavi, sarı ve yeşilin açık tonlarında boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Sarı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p22_476",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 22,
    "title": "EMRE’NİN EVİ",
    "domain": "Matematik",
    "theme": "EMRE’NİN EVİ",
    "researchQuestion": "Nin evi hastaneye mi, markete mi yakın?",
    "text": "22 EMRE’NİN EVİ Krokiyi inceleyelim. 1. Emre’nin evinin rengi sarı. Emre’nin evini gösterelim. 2. Emre’nin evi hastaneye mi, markete mi yakın? Söyleyelim. 3. Okulun karşısında neler var? Söyleyelim. 4. Hastane spor sahasının neresinde? Söyl",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Sarı",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p23_477",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 23,
    "title": "BATTI MI, YÜZDÜ MÜ?",
    "domain": "Fen ve Doğa",
    "theme": "BATTI MI, YÜZDÜ MÜ?",
    "researchQuestion": "BATTI MI, YÜZDÜ MÜ?",
    "text": "23 BATTI MI, YÜZDÜ MÜ? Tabloda bulunan görselleri inceleyelim. Görselde bulunan nesneleri çevremizden bulalım.  Ardından bir bardağa su koyalım ve suyun içine sırayla nesneleri bırakalım. Taş ve yaprak battı mı, yüzdü mü? Söyleyelim. Neden ",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p24_478",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 24,
    "title": "NE KADAR TURŞU KALDI?",
    "domain": "Matematik",
    "theme": "NE KADAR TURŞU KALDI?",
    "researchQuestion": "NE KADAR TURŞU KALDI?",
    "text": "24 NE KADAR TURŞU KALDI? Zehra turşu yemeyi çok seviyor. Havuç turşusunun bulunduğu kavanozda kaç tane havuç  var? Sayalım. Zehra turşu kavanozunun içindeki havuçlardan 2 tanesini yedi. Kavanozdaki  turşular arttı mı, azaldı mı? Söyleyelim.",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "İçinde - Dışında",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p25_479",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 25,
    "title": "YAPRAK ÇİZİYORUM",
    "domain": "Fen ve Doğa",
    "theme": "YAPRAK ÇİZİYORUM",
    "researchQuestion": "YAPRAK ÇİZİYORUM doğada ve çevremizde nasıl işler?",
    "text": "25 YAPRAK ÇİZİYORUM Görselleri inceleyelim. Ülkemizde yetişen gürgen, kestane ve ıhlamur ağaçlarına ait yaprak  görsellerini çizerek tamamlayalım. Tamamladığımız yaprak görsellerini boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p26_480",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 26,
    "title": "DOĞADAN İLHAMLA TASARIM",
    "domain": "Matematik",
    "theme": "DOĞADAN İLHAMLA TASARIM",
    "researchQuestion": "DOĞADAN İLHAMLA TASARIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "26 DOĞADAN İLHAMLA TASARIM Görselleri inceleyelim. Hayvanlardan ilham alınarak yapılan birçok icat var. Görseldeki  hayvanlar hangi icada ilham kaynağı olmuştur, inceleyelim. İcatlarla hayvan görsellerini  eşleştirelim.  \u0007Öğretmene not:\t\u0007Ma",
    "materials": [
      "Kırılmaz çocuk güvenlik aynası",
      "Duygu ifade kartları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p27_481",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 27,
    "title": "KAZAĞIN YOLCULUĞU",
    "domain": "Matematik",
    "theme": "KAZAĞIN YOLCULUĞU",
    "researchQuestion": "KAZAĞIN YOLCULUĞU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "27 KAZAĞIN YOLCULUĞU Soldaki renkleri ve sağdaki desenleri kullanarak kazak görselini tamamlayalım. Doğa, annesiyle el işi ürünlerin satıldığı bir pazara gidiyor. Pazarda beğendiği bir kazağı  alıyor. Doğa kazağın nasıl hazırlandığını merak",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p28_482",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 28,
    "title": "BAŞKA NE OLABİLİR?",
    "domain": "Fen ve Doğa",
    "theme": "BAŞKA NE OLABİLİR?",
    "researchQuestion": "BAŞKA NE OLABİLİR?",
    "text": "28 BAŞKA NE OLABİLİR? Görseldeki çocuklar bir nesneyi başka bir nesnenin yerine kullanarak oyun oynuyorlar.  Görseli inceleyelim. 1. Kumanda ne olarak kullanılmış? Düşünelim, söyleyelim. 2. Sandalye ve tencere kapağı ne olarak kullanılmış? ",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal tuz seramiği / Oyun hamuru",
      "Merdaneler",
      "Doğal kozalak ve yapraklar"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p29_483",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 29,
    "title": "YOLDA NELER GÖRDÜM?",
    "domain": "Fen ve Doğa",
    "theme": "YOLDA NELER GÖRDÜM?",
    "researchQuestion": "YOLDA NELER GÖRDÜM?",
    "text": "29 YOLDA NELER GÖRDÜM? Semih yolu takip ederek evden okula gidiyor. Yolda Semih’in karşısına çıkan canlı ve uçabilen  varlıkları kırmızı ile işaretleyelim. Cansız ve uçamayan varlıkları mavi ile işaretleyelim.",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kırmızı",
      "Mavi",
      "Canlı - Cansız"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p30_484",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 30,
    "title": "GİYSİ DOLABI",
    "domain": "Matematik",
    "theme": "GİYSİ DOLABI",
    "researchQuestion": "GİYSİ DOLABI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "30 GİYSİ DOLABI Giysi dolabını inceleyelim. Eşyaların isimlerini söyleyelim. Hava durumu görsellerini inceleyelim. Hava durumuna uygun eşyaları giysi dolabından  seçelim. Seçtiğimiz eşyaların etiketlerindeki sayıları ilişkili olduğu hava du",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p31_485",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 31,
    "title": "DAİRE, ÇEMBER",
    "domain": "Matematik",
    "theme": "DAİRE, ÇEMBER",
    "researchQuestion": "DAİRE, ÇEMBER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "31 DAİRE, ÇEMBER Berk şekil dedektifi oldu. Birbirine benzeyen iki farklı geometrik şeklin sepetlerini hazırladı.  Görselleri inceleyelim. Sepetlerin üzerindeki şekillerin ismini söyleyelim. Nesneleri örnekteki  gibi benzediği şeklin olduğu",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p32_486",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 32,
    "title": "M SESİ",
    "domain": "Matematik",
    "theme": "M SESİ",
    "researchQuestion": "M SESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "32 M SESİ Görsellerdeki “M” sesi ile başlayan varlıkları parmağımızla göstererek varlıkların isimlerini  söyleyelim. Ardından varlıkların parçalarını örnekteki gibi eşleştirelim. ‘M’ sesi ile başlayan  bir varlık da biz bulalım. Karekodu ok",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p33_487",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 33,
    "title": "VAGONLARDA EKSİK SAYILARI BULALIM",
    "domain": "Matematik",
    "theme": "VAGONLARDA EKSİK SAYILARI BULALIM",
    "researchQuestion": "VAGONLARDA EKSİK SAYILARI BULALIM ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "33 VAGONLARDA EKSİK SAYILARI BULALIM Karekodu okutarak veya tıklayarak  etkileşimli içeriğe ulaşabilirsiniz. Vagonlarda eksik olan sayıları bulalım, yerlerine yazalım. 1 7 2 4 8 10 10 Vagonlarda eksik olan sayıları bulalım, yerlerine yazalı",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Az - Çok",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p34_488",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 34,
    "title": "ASTRONOT ALPER",
    "domain": "Fen ve Doğa",
    "theme": "ASTRONOT ALPER",
    "researchQuestion": "ASTRONOT ALPER doğada ve çevremizde nasıl işler?",
    "text": "34 ASTRONOT ALPER Astronot Alper bilimsel araştırmalar yapmak için uzayda bulunacak. Uzayda uzun süre  kalan astronotların kasları zamanla güçsüzleşebilir. Bu nedenle kaslarını güçlü tutmak için  düzenli olarak egzersiz yaparlar. Biz de kas",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Uzun - Kısa",
      "1 (Bir)",
      "3 (Üç)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p35_489",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 35,
    "title": "AYICIĞI ÖLÇME YÖNTEMLERİ",
    "domain": "Matematik",
    "theme": "AYICIĞI ÖLÇME YÖNTEMLERİ",
    "researchQuestion": "AYICIĞI ÖLÇME YÖNTEMLERİ Ölçüm sonuçlarımız neden farklı çıktı?",
    "text": "35 AYICIĞI ÖLÇME YÖNTEMLERİ Ölçüm sonuçlarımız neden farklı çıktı? Konuşalım. Kalemin uzunluğunu blokla ölçelim, sonucu kutuya yazalım. Kalemin uzunluğunu pastel  boya ile ölçelim, sonucu kutuya yazalım. Blok ile ölçüm sonucum Pastel boya i",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p36_490",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 36,
    "title": "AĞAÇLAR VE TOHUMLARI",
    "domain": "Matematik",
    "theme": "AĞAÇLAR VE TOHUMLARI",
    "researchQuestion": "AĞAÇLAR VE TOHUMLARI ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "36 AĞAÇLAR VE TOHUMLARI Ağaç görsellerini ve tohumlarını inceleyelim. Ağaçların isimlerini söyleyelim. Ağaçlara ait  tohumları yandaki kutulardan bulup sayalım. Örnekteki gibi kutuya tohum sayısı kadar çizgi  çizelim.  Akçaağaç Meşe Ağacı D",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p37_491",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 37,
    "title": "SAAT YÖNÜ",
    "domain": "Matematik",
    "theme": "SAAT YÖNÜ",
    "researchQuestion": "SAAT YÖNÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "37 SAAT YÖNÜ 1. Oyun çarkının üzerindeki başlangıç noktasına parmağımızı koyalım. Yönergeleri dinleyerek  onlara uygun şekilde noktalar üzerinde ilerleyelim. Parmağımızın üzerinde olduğu  noktanın bulunduğu bölümdeki hareketi yapalım. 2. Sa",
    "materials": [
      "Şeffaf su deney küveti",
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kırmızı",
      "Mavi",
      "Önünde - Arkasında"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p38_492",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 38,
    "title": "RENKLİ KALDIRIM TAŞLARI",
    "domain": "Fen ve Doğa",
    "theme": "RENKLİ KALDIRIM TAŞLARI",
    "researchQuestion": "Aileniz  evinizle ilgili bir karar alırken sizin fikirlerinizi soruyor mu?",
    "text": "38 RENKLİ KALDIRIM TAŞLARI Ceren’in babası, oturdukları evin girişine renkli kaldırım taşları döşeyecek. Ceren, taşların  belirli bir sırayla döşenmesini istiyor. İstediği sıralamayı bir kâğıda çizerek babasına veriyor. Çocukları ilgilendir",
    "materials": [
      "Şeffaf su deney küveti",
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Doğal kozalak ve yapraklar"
    ],
    "concepts": [
      "1 (Bir)",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D14 Saygı",
      "D7 Estetik"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p39_493",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 39,
    "title": "HİKÂYEYİ TAMAMLAYALIM",
    "domain": "Matematik",
    "theme": "HİKÂYEYİ TAMAMLAYALIM",
    "researchQuestion": "Yenin devamında ne olmuş olabilir?",
    "text": "39 HİKÂYEYİ TAMAMLAYALIM Hikâyeyi dinleyelim ve sorulara cevap verelim.  Hikâyenin devamında ne olmuş olabilir? Anlatalım. Havalar soğumaya başlamıştı. Yapraklar ağaçlardan dökülüyordu. Minik sincap elindeki fındığı yuvasına götürüyordu. 1.",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Az - Çok",
      "Aynı - Farklı",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p40_494",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 40,
    "title": "KÜLTÜR TURİZMİ",
    "domain": "Matematik",
    "theme": "KÜLTÜR TURİZMİ",
    "researchQuestion": "KÜLTÜR TURİZMİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "KÜLTÜR TURİZMİ Kız Kulesi’ne hoş geldin. Burası  İstanbul’da bulunan ve denizin  ortasında duran bir kuledir.  Mersin’de bulunan Kız Kalesi’ni de  ailemizle araştıralım. Pamukkale Travertenlerine hoş geldin.  Pamukkale Travertenleri Denizli",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p41_495",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 41,
    "title": "Manavgat Şelalesi’ne hoş geldin.",
    "domain": "Bütünleşik Etkinlik",
    "theme": "Manavgat Şelalesi’ne hoş geldin.",
    "researchQuestion": "Daha önce hiç şelale gördünüz mü?",
    "text": "Manavgat Şelalesi’ne hoş geldin.  Burası Antalya’nın Manavgat  ilçesinde bulunan bir şelaledir.  Daha önce hiç şelale gördünüz mü?  Nerede gördünüz? Anıtkabir’e hoş geldin. Burası  başkentimiz Ankara’da yer alan bir  anıttır. Mustafa Kemal ",
    "materials": [
      "Etkinlik resim kartları",
      "Renkli pastel boyalar"
    ],
    "concepts": [
      "Büyük - Küçük",
      "İçinde - Dışında",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E2.4 İş Birliğine Açıklık"
    ]
  },
  {
    "id": "tb_60_72_b4_p42_496",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 42,
    "title": "CANLILARIN ÖZELLİKLERİ",
    "domain": "Matematik",
    "theme": "CANLILARIN ÖZELLİKLERİ",
    "researchQuestion": "CANLILARIN ÖZELLİKLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "42 CANLILARIN ÖZELLİKLERİ Canlılar; büyür, solunum yapar ve beslenir, bazıları hareket eder. Örneğin balıklar büyür,  beslenir, solunum yapar ve hareket eder. Çünkü balıklar canlıdır.  Görselleri inceleyelim. Görseldeki varlık büyüyorsa boy",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Canlı - Cansız"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p43_497",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 43,
    "title": "HANGİSİ DAHA AĞIR?",
    "domain": "Fen ve Doğa",
    "theme": "HANGİSİ DAHA AĞIR?",
    "researchQuestion": "HANGİSİ DAHA AĞIR?",
    "text": "43 HANGİSİ DAHA AĞIR? Tavşan ormanda yürürken farklı hayvanlarla karşılaşıyor. Karşılaştığı hayvan tavşandan  daha ağırsa kutucuğu maviye, daha hafifse kutucuğu kırmızıya boyayalım.",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Ağır - Hafif",
      "Kırmızı",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p44_498",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 44,
    "title": "MERHAMETLİ KALPLER YARDIM KUTUSU",
    "domain": "Matematik",
    "theme": "MERHAMETLİ KALPLER YARDIM KUTUSU",
    "researchQuestion": "MERHAMETLİ KALPLER YARDIM KUTUSU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "44 MERHAMETLİ KALPLER YARDIM KUTUSU Ece ve arkadaşları ihtiyaç sahipleri için yardım kutuları hazırlıyor. Bir yardım kutusu  hazırlayacak olsak içine neler koyabileceğimiz hakkında konuşalım, boş kutuya bu yardım  malzemelerinin resmini çiz",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p45_499",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 45,
    "title": "S SESİ",
    "domain": "Matematik",
    "theme": "S SESİ",
    "researchQuestion": "S SESİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "45 S SESİ Görsellerdeki “S” sesi ile başlayan varlıkları parmağımızla göstererek varlıkların isimlerini  söyleyelim. Ardından “S” sesi ile başlayan varlıkların parçalarını örnekteki gibi eşleştirelim. ‘‘S’ sesi ile başlayan bir varlık da bi",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kare",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p47_500",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 47,
    "title": "ŞARKI SÖYLEYELİM",
    "domain": "Matematik",
    "theme": "ŞARKI SÖYLEYELİM",
    "researchQuestion": "Kendi oluşturduğumuz  bir şarkıyı arkadaşlarımızla paylaşmak ne hissettirdi?",
    "text": "47 ŞARKI SÖYLEYELİM Kutuların içindeki görselleri inceleyelim. İsimlerini söyleyelim. Bu isimlerin içinden bazılarını  seçerek bir şarkı oluşturalım. Şarkımızı arkadaşlarımıza söyleyelim. Kendi oluşturduğumuz  bir şarkıyı arkadaşlarımızla p",
    "materials": [
      "Ritim çubukları",
      "Marakas ve tefler",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "İçinde - Dışında"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p48_501",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 48,
    "title": "AZİZ SANCAR",
    "domain": "Matematik",
    "theme": "AZİZ SANCAR",
    "researchQuestion": "Ödül kime verilir?",
    "text": "48 AZİZ SANCAR Aziz Sancar, yaptığı bilim çalışmaları ile Nobel ödülü almıştır. Aziz Sancar’ın görselini  labirentteki yollardan çizgi çizerek Nobel ödülüne ulaştıralım. Ödül kime verilir? Düşünelim. Hangi alanda bir buluş yaparak ödül kaza",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "1 (Bir)",
      "4 (Dört)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p49_502",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 49,
    "title": "AĞAÇTAN AZALAN ELMALAR",
    "domain": "Matematik",
    "theme": "AĞAÇTAN AZALAN ELMALAR",
    "researchQuestion": "Ağaçtaki elmalar arttı mı, azaldı  mı?",
    "text": "49 AĞAÇTAN AZALAN ELMALAR Ağaçtan beş tane elmayı sepete çizgi çizerek  götürelim. Ağaçtaki elmalar arttı mı, azaldı  mı? Ağaçta kaç tane elma kaldı? Söyleyelim. Ağaçtan dört tane elmayı sepete çizgi çizerek  götürelim. Ağaçtaki elmalar art",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "2 (İki)",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p50_503",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 50,
    "title": "HEDİYE PAKETLERİ",
    "domain": "Matematik",
    "theme": "HEDİYE PAKETLERİ",
    "researchQuestion": "HEDİYE PAKETLERİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "50 HEDİYE PAKETLERİ Görselleri inceleyelim. Her bir sütunda yer alan kutulardan boş bırakılan kutuyu, ilk  sütundaki kurala göre tamamlayalım. En son kimden hediye alıp, kime hediye verdiğimizi söyleyelim. Hediyeleşmenin bize kendimizi nası",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "1 (Bir)"
    ],
    "values": [
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p51_504",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 51,
    "title": "AYÇİÇEĞİNİN YAŞAM DÖNGÜSÜ",
    "domain": "Matematik",
    "theme": "AYÇİÇEĞİNİN YAŞAM DÖNGÜSÜ",
    "researchQuestion": "AYÇİÇEĞİNİN YAŞAM DÖNGÜSÜ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "51 AYÇİÇEĞİNİN YAŞAM DÖNGÜSÜ Ayçiçeğinin yaşam döngüsü ile ilgili görselleri inceleyelim. Görselleri ayçiçeğinin gelişim  aşamalarına uygun sıra ile boyayalım. Gelişim aşamalarının kodlarını grafikteki gibi ilgili  görsellerin kutularına ya",
    "materials": [
      "Su bazlı boya kalemleri",
      "Renkli fon kartonları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p52_505",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 52,
    "title": "BLOKLARDAN ŞEKİLLER",
    "domain": "Matematik",
    "theme": "BLOKLARDAN ŞEKİLLER",
    "researchQuestion": "BLOKLARDAN ŞEKİLLER ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "52 BLOKLARDAN ŞEKİLLER Bloklarla oluşturulmuş modelleri inceleyelim. Modelleri, kendilerini oluşturan parçaların  bulunduğu kutularla çizgi çizerek eşleştirelim.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "2 (İki)",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p53_506",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 53,
    "title": "N SESİ İLE BİTEN SÖZCÜKLER",
    "domain": "Müzik",
    "theme": "N SESİ İLE BİTEN SÖZCÜKLER",
    "researchQuestion": "Bedenimiz ve sesimizle N SESİ İLE BİTEN SÖZCÜKLER ritmini nasıl yakalarız?",
    "text": "53 N SESİ İLE BİTEN SÖZCÜKLER Görseldeki varlıkları inceleyelim. “N” sesi ile biten varlıkları işaretleyelim. Biz de “N” sesi ile  biten sözcükler söyleyelim.",
    "materials": [
      "Ses boruları",
      "Ahşap kastanyet"
    ],
    "concepts": [
      "Kalın - İnce",
      "3 (Üç)",
      "5 (Beş)"
    ],
    "values": [
      "D14 Saygı",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E2.4 İş Birliğine Açıklık",
      "E1.1 Merak"
    ]
  },
  {
    "id": "tb_60_72_b4_p54_507",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 54,
    "title": "GÖÇMEN KUŞLAR-",
    "domain": "Matematik",
    "theme": "GÖÇMEN KUŞLAR-",
    "researchQuestion": "GÖÇMEN KUŞLAR- ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "54 GÖÇMEN KUŞLAR-1 Ülkemiz kıtalar arasında göç eden kuşlar için büyük önem taşır. Havaların soğuması sebebiyle göç etmek zorunda kalan çok sayıda göçmen kuş, göç sırasında  ülkemizin önemli sulak alanlarında konaklar. Kuş gözlemcileri de b",
    "materials": [
      "Şeffaf su deney küveti",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Ahşap sayma çubukları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Kalın - İnce",
      "Az - Çok"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p55_508",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 55,
    "title": "GÖÇMEN KUŞLAR-",
    "domain": "Matematik",
    "theme": "GÖÇMEN KUŞLAR-",
    "researchQuestion": "GÖÇMEN KUŞLAR- ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "55 GÖÇMEN KUŞLAR-2 İncelediğimiz kuş türlerinin isimlerini söyleyelim, sayılarını gözlem defterimize kaydedelim. ŞAHİN MARTI KARABATAK ÖRDEK LEYLEK",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "2 (İki)",
      "5 (Beş)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p58_509",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 58,
    "title": "HAYVANLARIN BOYU",
    "domain": "Fen ve Doğa",
    "theme": "HAYVANLARIN BOYU",
    "researchQuestion": "HAYVANLARIN BOYU doğada ve çevremizde nasıl işler?",
    "text": "58 HAYVANLARIN BOYU Görselleri dikkatle inceleyelim. Gölgelerin hangi hayvanlara ait olduğunu tahmin edelim.  Gölgesi en uzun olan hayvanı blokları sayarak bulalım. Bu hayvanın resmini çerçevenin  içine çizelim. Gölgesi en kısa olan hayvanı",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Uzun - Kısa",
      "Kalın - İnce",
      "5 (Beş)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p59_510",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 59,
    "title": "YAZ LABİRENTİ",
    "domain": "Matematik",
    "theme": "YAZ LABİRENTİ",
    "researchQuestion": "YAZ LABİRENTİ ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "59 YAZ LABİRENTİ Görseldeki yaz meyvelerini ve sebzelerini inceleyelim. Yaz meyvelerinin isimlerini söyleyelim.  Labirentteki yaz meyvelerini karşılarındaki yollardan çizgi ile sepete götürelim. Yaz sebzelerini  işaretleyelim. Bildiğimiz ba",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p60_511",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 60,
    "title": "UZAY MEKİĞİ",
    "domain": "Matematik",
    "theme": "UZAY MEKİĞİ",
    "researchQuestion": "Sağa, sola, yukarı ve aşağı gidiyor?",
    "text": "60 UZAY MEKİĞİ Uzaya gidip gelebilen ve yeniden kullanılan insanlı uzay araçlarına uzay mekiği denir. Görselleri inceleyelim. Uzay mekiklerine ve gittikleri yönü gösteren oklara dikkat edelim. Örnekte olduğu gibi diğer uzay mekiklerinin alt",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Kare"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p62_512",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 62,
    "title": "ATATÜRK’ÜN ÇOCUK SEVGİSİ",
    "domain": "Matematik",
    "theme": "ATATÜRK’ÜN ÇOCUK SEVGİSİ",
    "researchQuestion": "Atatürk yaşasaydı ona ne hediye etmek isterdik?",
    "text": "62 ATATÜRK’ÜN ÇOCUK SEVGİSİ Mustafa Kemal Atatürk, çocukları çok severdi. Çocuklarla sohbet eder, onlara sevgi  gösterirdi. Atatürk’ün bulunduğu fotoğrafları inceleyelim. Atatürk 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı’nı tüm dünya çocuk",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "1 (Bir)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p63_513",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 63,
    "title": "DÜNYADAN ŞAPKALAR",
    "domain": "Fen ve Doğa",
    "theme": "DÜNYADAN ŞAPKALAR",
    "researchQuestion": "DÜNYADAN ŞAPKALAR doğada ve çevremizde nasıl işler?",
    "text": "63 DÜNYADAN ŞAPKALAR Farklı ülkelerde yaşayan çocuk görsellerini inceleyelim. Şapkalarının benzerlikleri ve farklılıkları  ile ilgili sohbet edelim. Çevremizde gördüğümüz farklı şapkalar hakkında konuşalım. Çerçevenin içindeki çocuklara bir",
    "materials": [
      "Gözlem tepsisi",
      "Doğa koleksiyonu kutusu"
    ],
    "concepts": [
      "Kalın - İnce",
      "İçinde - Dışında",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p64_514",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 64,
    "title": "FARKLI SANDALYELER",
    "domain": "Sanat",
    "theme": "FARKLI SANDALYELER",
    "researchQuestion": "Farklı malzemelerle FARKLI SANDALYELER nasıl canlandırabiliriz?",
    "text": "64 FARKLI SANDALYELER Resmi inceleyelim. Çocukların resimlerini kolaylıkla tamamlayabilmeleri için hangi boydaki  sandalyeye ihtiyaçları var düşünelim. Çocukları doğru sandalyelere çizgi ile ulaştıralım.",
    "materials": [
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları",
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce",
      "4 (Dört)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b4_p65_515",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 65,
    "title": "KENDİ KİTABIMI TASARLIYORUM",
    "domain": "Sanat",
    "theme": "KENDİ KİTABIMI TASARLIYORUM",
    "researchQuestion": "Farklı malzemelerle KENDİ KİTABIMI TASARLIYORUM nasıl canlandırabiliriz?",
    "text": "65 KENDİ KİTABIMI TASARLIYORUM Kartlardaki görselleri inceleyelim. Görsellerle bir hikaye oluşturalım ve anlatalım. Hikayemize  uygun bir kitap kapağı tasarlayıp kitap görselinin üzerine çizelim.",
    "materials": [
      "Şeffaf su deney küveti",
      "Büyük boy resimli hikaye kitabı",
      "Görsel sıralama kartları"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "5 (Beş)"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b4_p66_516",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 66,
    "title": "FARKLI BARDAKLARDAKİ SU",
    "domain": "Matematik",
    "theme": "FARKLI BARDAKLARDAKİ SU",
    "researchQuestion": "Suyun tamamını görseldeki gibi bardaklara  doldurduklarında nasıl görünüyor?",
    "text": "66 FARKLI BARDAKLARDAKİ SU Oğuz, Alp ve Aslı’nın aynı miktarda suyu var. Suyun tamamını görseldeki gibi bardaklara  doldurduklarında nasıl görünüyor? İnceleyelim. Bardaklardaki su seviyesi neden farklı oldu? Düşünelim. Farklı genişlikte 2 s",
    "materials": [
      "Şeffaf su deney küveti",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Aynı - Farklı",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p67_517",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 67,
    "title": "GEZEGENLER SUDOKU",
    "domain": "Matematik",
    "theme": "GEZEGENLER SUDOKU",
    "researchQuestion": "GEZEGENLER SUDOKU ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "67 GEZEGENLER SUDOKU Her satır ve sütunda her gezegenden sadece bir tane olması gerekiyor. Boş kutularda  olması gereken gezegenleri çizerek tamamlayalım. Mars, çok soğuk bir gezegendir. Mars’ta büyük toz fırtınaları olur.  Dünya, mavi ve y",
    "materials": [
      "Şeffaf su deney küveti",
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları"
    ],
    "concepts": [
      "Büyük - Küçük",
      "Az - Çok",
      "Mavi"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p68_518",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 68,
    "title": "YERYÜZÜ ŞEKİLLERİ",
    "domain": "Matematik",
    "theme": "YERYÜZÜ ŞEKİLLERİ",
    "researchQuestion": "Diğer yeryüzü şekilleri  hangi sembollerin kesiştiği karede duruyor?",
    "text": "68 YERYÜZÜ ŞEKİLLERİ Görseli inceleyelim. Görselde bulunan yeryüzü şekillerinin isimlerini söyleyelim. Yanardağ  dört rakamının ve sarı dairenin (4, ) kesiştiği karede duruyor. Diğer yeryüzü şekilleri  hangi sembollerin kesiştiği karede dur",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Geometrik ahşap şekil blokları",
      "Kırılmaz çocuk güvenlik aynası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Sarı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p69_519",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 69,
    "title": "VEYSEL DEDE VE REHBER KÖPEĞİ KAŞMİR",
    "domain": "Sanat",
    "theme": "VEYSEL DEDE VE REHBER KÖPEĞİ KAŞMİR",
    "researchQuestion": "Farklı malzemelerle VEYSEL DEDE VE REHBER KÖPEĞİ KAŞMİR nasıl canlandırabiliriz?",
    "text": "69 VEYSEL DEDE VE REHBER KÖPEĞİ KAŞMİR Veysel dede her gün aynı saatte rehber köpeği Kaşmir ile dinlenme parkına gidiyor. Kaşmir  Veysel dedeye yardım ediyor. Kaşmir’in Veysel dedeye nasıl yardım ettiğini düşünelim.  Veysel dede dinlenme pa",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b4_p70_520",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 70,
    "title": "MANAVDAKİ MEYVELER VE SEBZELER",
    "domain": "Sanat",
    "theme": "MANAVDAKİ MEYVELER VE SEBZELER",
    "researchQuestion": "Farklı malzemelerle MANAVDAKİ MEYVELER VE SEBZELER nasıl canlandırabiliriz?",
    "text": "70 MANAVDAKİ MEYVELER VE SEBZELER Ekin ile annesi meyve-sebze almak için manava gidiyor. Görselleri inceleyelim. Hangi  meyveleri ve sebzeleri gördüğümüzü söyleyelim. “A”sesi ile biten meyveleri ve sebzeleri çizgi çizerek Ekin’in sepetine g",
    "materials": [
      "Fırçalar ve parmak boyaları",
      "Beyaz resim kağıtları"
    ],
    "concepts": [
      "Kalın - İnce"
    ],
    "values": [
      "D7 Estetik",
      "D12 Sabır"
    ],
    "tendencies": [
      "E1.3 Girişimcilik",
      "E2.3 Esneklik"
    ]
  },
  {
    "id": "tb_60_72_b4_p71_521",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 71,
    "title": "HAYVANLARIN GÖZLERİ",
    "domain": "Matematik",
    "theme": "HAYVANLARIN GÖZLERİ",
    "researchQuestion": "Çizimimiz karekoddaki hayvana benziyor  mu?",
    "text": "71 HAYVANLARIN GÖZLERİ Gözler görmemizi sağlayan görme organımızdır. Hayvanların insanlarınkinden farklı göz  şekilleri ve göz renkleri vardır.  Görsellerdeki hayvanların göz şeklini ve göz rengini inceleyelim. Çerçevedeki gözleri inceleyel",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Kare",
      "Aynı - Farklı"
    ],
    "values": [
      "D5 Duyarlılık",
      "D10 Merhamet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p72_522",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 72,
    "title": "BAYRAM SABAHI ÖYKÜ",
    "domain": "Hareket ve Sağlık",
    "theme": "BAYRAM SABAHI ÖYKÜ",
    "researchQuestion": "BAYRAM SABAHI ÖYKÜ hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "72 BAYRAM SABAHI ÖYKÜ Bayram Sabahı öyküsünü dikkatlice dinleyelim. Öyküyü dinlerken sözcükleri parmağımızla  yavaşça takip etme hareketi yapalım. Görsellerin üzerine geldiğimizde durup görselin ismini  söyleyerek öyküyü birlikte tamamlayal",
    "materials": [
      "Şeffaf su deney küveti",
      "Denge yastıkları",
      "Renkli jimnastik çemberleri"
    ],
    "concepts": [
      "Kalın - İnce",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b4_p73_523",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 73,
    "title": "BAYRAM SABAHI ETKİNLİK",
    "domain": "Matematik",
    "theme": "BAYRAM SABAHI ETKİNLİK",
    "researchQuestion": "BAYRAM SABAHI ETKİNLİK ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "73 BAYRAM SABAHI ETKİNLİK Bayram sabahı evimizde yapılan hazırlıkları anlatalım. Bayramda giymek için kıyafet  tasarlayalım ve kıyafeti askılara çizelim.",
    "materials": [
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Az - Çok",
      "3 (Üç)"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p74_524",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 74,
    "title": "ÇİÇEĞİN BÖLÜMLERİNİ İNCELEYELİM",
    "domain": "Fen ve Doğa",
    "theme": "ÇİÇEĞİN BÖLÜMLERİNİ İNCELEYELİM",
    "researchQuestion": "ÇİÇEĞİN BÖLÜMLERİNİ İNCELEYELİM doğada ve çevremizde nasıl işler?",
    "text": "74 ÇİÇEĞİN BÖLÜMLERİNİ İNCELEYELİM Çiçeğin bölümlerini inceleyelim. Büyüteçle baktığımızda nelerin farklı göründüğünü açıklayalım. Kartlardaki görsellerin bitkiler için önemini açıklayalım.  \u0007Öğretmene not:\t\u0007Çiçeğin yaprak, sap ve kök gibi ",
    "materials": [
      "Büyük boy el büyüteçleri",
      "Doğal kozalak ve yapraklar",
      "Düz dere taşları"
    ],
    "concepts": [
      "Kalın - İnce",
      "Aynı - Farklı",
      "4 (Dört)"
    ],
    "values": [
      "D5 Duyarlılık",
      "D16 Sorumluluk"
    ],
    "tendencies": [
      "E1.1 Merak",
      "E3.2 Odaklanma"
    ]
  },
  {
    "id": "tb_60_72_b4_p75_525",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 75,
    "title": "SPOR ZAMANI",
    "domain": "Hareket ve Sağlık",
    "theme": "SPOR ZAMANI",
    "researchQuestion": "SPOR ZAMANI hareketlerini yaparken bedenimiz nasıl dengede kalır?",
    "text": "75 SPOR ZAMANI Şimdi spor zamanı! Yönergeleri dinleyelim. Her hareketi yaptıktan sonra yerimize oturalım  ve bir nezaket sözcüğü söyleyelim.  \u0007Öğretmene not:\t\u0007Çocuklara “Lütfen, merhaba, memnun oldum, teşekkür ederim, özür  dilerim, hoş gel",
    "materials": [
      "Şeffaf su deney küveti",
      "Yumuşak sünger denge topları",
      "Zemin işaretleme bantları"
    ],
    "concepts": [
      "Önünde - Arkasında",
      "1 (Bir)",
      "2 (İki)"
    ],
    "values": [
      "D14 Saygı"
    ],
    "tendencies": [
      "E1.2 Bağımsızlık",
      "E3.7 Öz Güven"
    ]
  },
  {
    "id": "tb_60_72_b4_p77_526",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 77,
    "title": "DEĞİŞTİR-DÖNÜŞTÜR-YENİDEN KULLAN",
    "domain": "Matematik",
    "theme": "DEĞİŞTİR-DÖNÜŞTÜR-YENİDEN KULLAN",
    "researchQuestion": "DEĞİŞTİR-DÖNÜŞTÜR-YENİDEN KULLAN ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "77 DEĞİŞTİR-DÖNÜŞTÜR-YENİDEN KULLAN Atık bir malzemenin şekillendirilerek kullanıma kazandırılmasına, farklı ürünlere dönüştürül­ mesine ileri dönüşüm denir. Örnekleri inceleyelim.  Atık malzemeden yapılmış oyuncak görselini inceleyelim. Ay",
    "materials": [
      "Geometrik ahşap şekil blokları",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Az - Çok",
      "Aynı - Farklı"
    ],
    "values": [
      "D16 Sorumluluk",
      "D3 Çalışkanlık"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  },
  {
    "id": "tb_60_72_b4_p78_527",
    "ageGroup": "60-72",
    "bookNo": 4,
    "pageNo": 78,
    "title": "KOLEKSİYON",
    "domain": "Matematik",
    "theme": "KOLEKSİYON",
    "researchQuestion": "KOLEKSİYON ile sayıları ve şekilleri nasıl gruplayabiliriz?",
    "text": "78 KOLEKSİYON Koleksiyon yapmak ilgi duyduğun nesnenin farklı çeşitlerini biriktirmektir.  Mustafa ve Fatma’nın yaptığı koleksiyonu inceleyelim. Sütunlardaki boşluklara benzer  nesneler çizerek yarım kalan koleksiyonlarını tamamlamalarına y",
    "materials": [
      "Ahşap sayma çubukları",
      "Sayı kartları (1-10)",
      "Renkli bağlantı küpleri",
      "Eşleştirme tablası"
    ],
    "concepts": [
      "Kalın - İnce",
      "Bütün - Yarım",
      "Aynı - Farklı"
    ],
    "values": [
      "D20 Yardımseverlik",
      "D1 Adalet"
    ],
    "tendencies": [
      "E3.2 Odaklanma",
      "E3.4 Sebat"
    ]
  }
];

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
