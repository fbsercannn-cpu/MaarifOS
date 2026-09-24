# Okul şablonu ve sınıf listesi — MARİF doğrulaması

Tarih: 8 Eylül 2026. Gerçek çocuk veya veli verisi kullanılmadan doğrulandı.

## Uygulanan davranış

- Sınıf listesi şablonu **4.0**. A4 yatay ana tablo, kullanıcının XLS düzenindeki 13 sütunu izler: sıra, ad soyad, T.C. kimlik no, doğum tarihi; anne adı/telefonu/mesleği; baba adı/telefonu/mesleği; aranacak üçüncü kişinin adı/telefonu/yakınlığı. Birden fazla yakın, aynı çocuğa bağlı ek satırlarda korunur.
- XLS’deki dört grup HTML’de gerçek `colspan`, PDF’de gerçek birleşik `TH /ColSpan` başlıklarıdır: Öğrencinin (4), Annenin (3), Babanın (3), Aranacak 3. kişinin (3). Grup ve alt sütun başlıkları her tablo sayfasında yinelenir. Ek öğrenci numarası, kayıt yılı, yakın mesleği ve eksiksiz açık adres, ilgili çocuğun son iletişim satırının hemen altında, **aynı tablonun tam genişlikte ayrıntı bandında** bulunur; ayrı adres eki yoktur. İlave yakın satırlarında çocuk bağlamı korunur, anne/baba ve kimlik bilgileri gereksiz yere tekrarlanmaz.
- Açık A4 dikey tercihi, iletişim tablosunu 5 geniş sütuna dönüştürür: öğrenci, yakını, adı soyadı, telefonu, mesleği/ünvanı. Aynı çocuğun yakınları beraber tutulur; kimlik ve adres ayrıntıları korunur. Yatay ana metin 8,5 pt; dikey ana metin 9 pt. Metin kesme veya ellipsis uygulanmaz.
- Ad soyad, adres ve meslek/yakınlık gösterimi ayrı Türkçe kurallarla hazırlanır. Telefonlar ve kimlik numaraları aynen taşınır. `T.C.`, `MEB`, `PTT`, `TOKİ`, `No.` gibi kısaltmalar korunur. Kalıcı öğrenci kayıtları değiştirilmez.
- Okul şablonu: yerel PNG/JPEG logo, en fazla üç üst başlık, resmî/sade logo konumu, öğretmen solda/sağda veya öğretmen+müdür imzası, otomatik/dikey/yatay A4 yönü. Kaydetmeden tam gerçek PDF önizlemesi ve aynı baytların indirilmesi mümkündür.
- Şablon kayıtları `settings` içinde `school-document-template-v1`, schemaVersion 1, sınıf/yıl kapsamı, `studentId:null`, `template-set` olayları ve önceki sürüm kimliğiyle saklanır. Ana şema/backup entegrasyonu kök ajan sahipliğindedir.
- Eş zamanlı yazma kontrolü: zorunlu `expectedScope`, önceki head kimliği, eksik/çapraz kapsamlı zincir reddi, geriye alınmış tarih ve 60 saniyeden fazla geri saat reddi. UI açıldığı sınıfı sabitler; sınıf değişirse açık taslağın yeni sınıfa kaydını durdurur. Başarılı yazma sonrası güncel snapshot beklenir.
- Logo en fazla 256 KiB ve 1024×1024 piksel olabilir. Raster imzası, base64 ve gerçek boyut alanları denetlenir; UI yerelde decode/yeniden kodlama yapar. Haricî logo URL’si ve SVG kabul edilmez. Logo kaldırma yeni sürüm olarak kaydedilir.
- Korunan mobil runtime değiştirilmedi. Ortak semantik PDF motoruna yalnız açıkça seçilen `headerGroups` ve `rowDetails` özellikleri eklendi. Yeni seçenek bulunmayan eski belgeler, değişiklik öncesi üç bağımsız sabit örnekle bayt bayt aynıdır. Birleşik hücrelerin PDF Table `ColSpan` etiketleri, font/ToUnicode ve mantıksal okuma sırası korunur. Logo için semantik akışta 58 pt Figure alanı ayrılır, yerel `pdf-lib` yalnız logo varsa tembel yüklenir ve resmi o alana yerleştirir. Şablon kaydı yoksa eski renderer’ın baytları birebir korunur. Başlık ve imza ayrı içerik akışındadır, gövde üzerine bindirilmez.

## Referans XLS’nin salt okunur incelemesi

Kaynak: kullanıcı tarafından belirtilen `VELİ İLETİŞİM BİLGİLERİ 2025.xls`.
SHA-256: `fa594a927e70604ebadeefc80d95d046842a015580cee37fd3cfc536366c98a5`.

Yalnız 2–3. satırdaki alan başlıkları ve biçim bilgileri kaydedildi. Öğrenci/veli satırları, okul/öğretmen başlık metni ve çalışma sayfası adları rapora veya fixture’a aktarılmadı. Kaynak dosya değiştirilmedi.

Bir dolu sayfa, 13 sütun; A1:M1 ana başlık. İkinci satır A:D öğrenci, E:G anne, H:J baba, K:M üçüncü kişi grupları. Grup başlıkları 11 pt, sütun başlıkları 10 pt kalın. K:L imza birleşimleri. Kanıt: `app/output/new-workflows-2026-09-08/school-template/xls-layout-only.json`.

## Doğrulanmış kabul kanıtları

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Sınıf listesi, sürüm, şablon/TDK, ortak motor ve yeni birleşik tablo | 43 Node testi geçti | `class-roster-document`, `simple-class-roster-document`, `school-document-template`, `semantic-tagged-pdf`, `semantic-grouped-table`, `semantic-table-adversarial` testleri |
| Eski seçenek bulunmayan PDF bayt uyumu | Üç sabit örneğin SHA-256 değeri birebir aynı | `semantic-compat-before.json` ve bağımsız `daily-routine-cards-2026-09-08/semantic-audit/legacy-before.pdf` |
| Aşırı başlık/bant ve sayfa ilerlemesi | 2.400 benzersiz token sıralı/tam bir kez; 25 sayfalık uzun bağlam; taşan başlık kontrollü ret | Bağımsız `semantic-table-adversarial.test.mjs`, 3/3 |
| 390 px logo seçimi, tam PDF, kayıt, reload, logo kaldırma | Geliştirme ve son üretim/offline geçti | `app/tests/school-document-template-ui.spec.ts` ilk test; `production/production-receipt.json` |
| 0/1/15/30/40 kayıt, çoklu yakın, 500 karakter adres | Gerçek PDF preview/canvas/download ve byte eşitliği geçti | Aynı test dosyası ikinci test |
| Logolu, üç uzun üst başlık ve uzun müdür adı; dikey/yatay | Gerçek PDF ve HTML baskı yüksekliği sınırları geçti | Aynı test dosyası üçüncü test |
| Mevcut HTML 320/390/430 px ve A4 baskı sınırları | 5 browser testi geçti | `app/tests/smoke/class-roster-render.spec.ts` |
| Son gerçek PDF render | 9 PDF / 40 sayfa; sayfa dışı metin 0, metin örtüşmesi 0 | `grouped-final-pdf-qa.json`, `development/final-render/` |
| Aranabilir PDF tam değer mutabakatı | 1.544 / 1.544 değer bulundu, özel aile/çocuk notu yok | `school-template/development/full-display-reconciliation.json` |
| Logo sonrası PDF semantik korunum | `StructTreeRoot`, `MarkInfo`, gömülü font ve A4 sayfaları korundu | Yeni Node testinin logo/PDF testi |

Test çıktıları: `app/output/new-workflows-2026-09-08/school-template/`. Geliştirme PDF’leri, tam sayfa PNG render’ları ve son `grouped-final-pdf-qa.json` burada bulunur. Sınıf listesi PDF’lerinde kayıt sayısına göre ek sayfa oluşması bilinçlidir; yazıyı küçültüp kayıtları tek sayfaya sıkıştırma yapılmaz.

Bu tur yakalanıp düzeltilen ilk iki hata: boş sınıfın PDF recipe’sinde boş öğrenci seçimi engeli; yeni grup başlığı eklendiğinde HTML baskı yüksekliğinin yaklaşık 4 mm aşılması. İkisinin sınır testleri geçti. Dikeyde dar 13 sütunun görsel okunabilirliği, öğrenci/yakın bloklarıyla düzeltildi.

Yeni opt-in sayfalayıcıda uzun ilk çocuk bandının yalnız başlıklı kapak sayfası oluşturması, ilk sayfa üst başlıkları nedeniyle iki sayfaya yayılan ilk grubun ardından eski dengeleme hesabının boş alan bırakması ve aşırı uzun grup sonrası gereksiz son sayfa açılması bağımsız denetimde yakalandı ve düzeltildi. İlk tablo tam bir iletişim satırıyla başlayabilir; sığan sonraki öğrenci grupları birlikte kalır. İlk sayfada çok uzun okul üst başlığı yer kaplıyorsa çocuk bloğu devam edebilir. Son iletişim satırı ve ayrıntı bandı taze sayfaya beraber sığıyorsa beraber taşınır. Son çocuk ve satır bütçesi imza rezervini de içerir; logolu yatay uç örnekte son sayfa uzun çocuk, 500 karakter adres ve uzun müdür imzasını beraber taşır. Stilli yatay örnek 6, dikey 5 sayfadır; eski ara PNG’ler yerine `development/final-render/` son kanıt olarak kullanılmalıdır. Tek bir bant sayfadan uzunsa çocuk adı ve yinelenen başlık bağlamıyla tam metin bölünür; her geçiş en az bir satır ilerler. Yeni başlık veya devam bağlamı bir veri satırına yer bırakmıyorsa dosya üretilmeden açık hata döner.

Geliştirme, bağımsız render ve son üretim/offline kabulü tamamlandı. Kökün son derlemesi (`http://127.0.0.1:4198`) üzerinde yeni tarayıcı bağlamında 390 px testi 1/1 geçti (6,8 saniye): PWA hazır durumu beklendi, bağlantı kapatılıp yeniden yüklendi, yerel logo/şablon kaydedildi ve yeniden açıldı; logo kaldırıldı; gerçek portre/yatay PDF önizlemesi ve indirmesi geçti. Üretimde kaynak `/src` isteği gözlenmedi; test böyle bir isteği başarısızlık sayar. İki üretim PDF’si tekrar render edildi, A4 yönleri doğru ve metin taşması sıfır. Kanıt `app/output/new-workflows-2026-09-08/school-template/production/production-receipt.json`. Bu kabul yerel üretim paketini doğrular; dış yayın kök ajanın ayrı kabulündedir.

## Türkçe kaynaklar

Kök ajan tarafından 8 Eylül 2026’da doğrulanan birincil kaynaklar: [TDK büyük harflerin kullanıldığı yerler](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/), [TDK kısaltmalar](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/), [TDK noktalama işaretleri](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/). Kişi adlarındaki görüntü dönüşümü kullanıcının açık isteğidir; serbest açıklama metinlerinin her sözcüğüne mekanik büyük harf uygulanmaz.
