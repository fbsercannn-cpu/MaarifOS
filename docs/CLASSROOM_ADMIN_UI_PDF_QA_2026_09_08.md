# Sınıf malzeme ve devir modülü UI/PDF kabulü

Tarih: 8 Eylül 2026. Sürüm adayı: 0.28.0. Bütün kayıtlar kurgudur. İnceleme, kök görevin domain/servis testlerinden bağımsız gerçek tarayıcı ve PDF çıktılarıyla yapılmıştır.

## Uygulanan düzeltmeler

- Devir tablosu son sayfada imza için alan ayırır. Önceki 36 maddelik belgede imza/not tek başına üçüncü sayfaya düşüyordu. Son belgede 29–36. maddeler ile imza aynı son sayfada bulunur.
- Malzeme ve devir PDF'lerinde tarihler `14.09.2026` biçimindedir; kaynak ve dosya kimliği tarihleri değiştirilmez.
- Mevcut okul, sınıf ve eğitim yılı belgeye eklenir. Sınıf/yıl bağlamı bütün sayfalarda tekrarlanır. Öğretmen unvanı `Okul Öncesi Öğretmeni` olarak kalır.
- Testler seçim kutularını erişilebilir rol/adıyla bulur. IndexedDB'ye yazıldıktan sonra güncellenen kontrollü onay kutularında fiziksel yazma ve görünür durum birlikte beklenir.
- Üretim testi geliştirme kaynaklarını içe aktarmaz. Native IndexedDB üzerinden yalnız şifreli `settings` kayıtlarının anahtar sayısı okunur; arayüzde gösterilen hesap ve durumlar ayrıca doğrulanır. `/src/` isteği ve işlenmemiş sayfa hatası test hatası sayılır.

Ürün kaynak değişikliği yalnız `app/src/features/classroom-admin/classroom-admin-document.ts` dosyasındadır. Domain, servis, kasa, mobil çalışma zamanı ve CSS değiştirilmemiştir.

## Geliştirme kabulü

`app/tests/classroom-admin-ui.spec.ts`: **3/3 PASS**, son tam koşum 55 saniye.

| Akış | Gerçek UI kabulü |
| --- | --- |
| 320 px malzeme/emanet | Sınıf ve çocuk kurulumu; 10 malzeme; çocuğa 4 emanet; 2 kısmi iade; elde kalan 8, açık emanet 2; 9 tüketimin stok yetersizliğiyle yazılmadan reddi; reload sonrasında aynı hesap; PDF önizleme ve indirme |
| 390 px devir | Liste oluşturma; eksik kontrol varken kapanışın kapalı olması; üç kontrolün ayrı kayıt oluşturması; tamamlanma; kapalı kontrollerin kilitlenmesi; tutanak indirme; gerekçeyle yeniden açma |
| Uzun belgeler | 36 malzeme ve 36 uzun devir maddesi; gerçek UI önizlemesi; aynı önizlemeden gerçek PDF indirme |

Her iki dar ekranın yatay taşma ölçümü geçti; ekran görüntüleri görsel olarak incelendi.

Kanıt: `app/output/new-workflows-2026-09-08/classroom-admin/final-development` ve `development` alt klasörü.

## PDF kabulü

PyMuPDF 1.27.2.2 ile dört PDF'nin bütün sekiz sayfası render edilip görsel olarak incelendi; metin, sınır ve kesişim kontrolleri yapıldı.

| Belge | Sayfa | Kanıt |
| --- | ---: | --- |
| `development/inventory-mobile.pdf` | 1 | 10 toplam = 8 kullanılabilir + 2 emanet + 0 hasarlı |
| `development/handover-mobile.pdf` | 1 | 3/3 tamamlanma, üç kontrol tarihi ve imza bölümü |
| `development/inventory-long.pdf` | 3 | İlk kitap ile 1–35 eğitim seti: toplam 36 satır, sıra ve metin eksiksiz |
| `development/handover-long.pdf` | 3 | 01–36 maddeler eksiksiz; son madde ve imza aynı sayfada |

- Sayfa dışına taşan metin: **0**.
- Birbiriyle kesişen metin parçası: **0**.
- Tablo gövdesi: **9 punto**. Sayfa başlığı 7,5 ve dip bilgi 8 puntodur; veri hücreleri küçültülmemiştir.
- A4 sayfa boyutu, gömülü Türkçe karakterler, yinelenen tablo başlıkları ve sayfa numaraları doğrulandı.
- Dört varsayılan PDF'de çocuk adı bulunmadığı doğrulandı; açık emanetlerde kişi bilgisi ayrıca seçilen belge alanıdır.
- Okul/sınıf/yıl ve Türkçe tarih metni doğrulandı; belge gövdesinde ISO tarih kalmadı.

Makine özeti, PDF SHA-256 değerleri ve sayfa bazlı ölçümler: `app/output/new-workflows-2026-09-08/classroom-admin/development/pdf-qa.json`.

## Üretim kabulü

Kök görevin güncel üretim derlemesinde, 4198 portunda yeni tarayıcı bağlamlarıyla **2/2 PASS**, 14,7 saniye. Kurulumdan sonra PWA `offlineReady` beklendi, bağlantı kesildi ve sayfa yeniden yüklendi. Stok/emanet/kısmi iade, negatif stok engeli, reload, devir kontrol/kapanış/yeniden açma ve iki PDF'nin hazırlanması/indirilmesi çevrim dışıyken tamamlandı.

Üretim koşusunda `/src/` isteği ve işlenmemiş sayfa hatası **0**. İndirilen iki tek sayfalık PDF de PyMuPDF ile render edilerek görsel olarak incelendi; taşma ve metin çakışması **0**, okul/sınıf/yıl, Türkçe tarihler ve varsayılan alanların çocuk adı içermemesi doğrulandı.

Kanıt: `app/output/new-workflows-2026-09-08/classroom-admin/final-production` ve `production/pdf-qa.json`. Üretim örnekleri `production/inventory-mobile.pdf` ve `production/handover-mobile.pdf` dosyalarıdır. Bu koşuda uzun kaynak fixture testi çalıştırılmamıştır; 36 satırlık belgeler geliştirme kabulünde ayrıca doğrulanmıştır.

Toplam: **5 gerçek UI kabul testi**, **6 PDF / 10 sayfa**. Son ürün kaynak değişikliği kök görev tarafından yeniden derlenerek bu üretim koşusuna dahil edilmiştir. TypeScript ve politika denetimi geçmiştir.

Bu alt görev dağıtım veya kaynak push işlemi yapmamıştır.
