# Masa belgeleri ve takvimden tamamlanan işler

Sürüm: 0.41.0 · 10 Eylül 2026

Bu çalışma, önceki tek sayfa sınıf listesi ve seçerek iş tamamlama akışını koruyarak dört yeni kullanım ekler. Kabul kayıtları aşağıdaki test ve örnek çıktı yollarında tutulur. Örneklerde yalnız kurgu öğrenci, okul ve veli bilgileri kullanılır.

## Uygulamada erişim

- **Belgeler → Masa belgeleri ve aylık takvim:** haftanın bir gününü seçerek haftalık masa planı; ay seçerek duvar takvimi; öğrenci seçerek bireysel özet.
- **Öğrenci profili → Öğrencinin tek sayfalık özetini hazırla:** doğrudan o çocuğun PDF önizlemesi ve Word çıktısı.
- **Takvimde öğretim gününe dokun → hazır etkinliği seç → kaydet:** gereken plan bağlantıları birlikte oluşturulur. Kaydedilen gün ve plan aynı yerde açılır. Geri alma, sonraki bağımsız değişiklikler izin verdiğinde yalnız bu paketin yazmalarını kaldırır.
- **Hazır veli adımı veya aile iletişimindeki randevu → gündem, sonuç ve görev formu:** kaynak gündem hazır gelir. Öğretmenin girdiği sonuç ve seçtiği görevler tek kaydetme düğmesiyle takip kayıtlarına dönüşür.

## Belge düzenleri

| Belge | Düzen | İçerik |
|---|---|---|
| Haftalık masa planı | Yatay A4, beş gün sütunu | Kayıtlı etkinlikler, gözlem odağı, materyaller, okul/sınıf/öğretmen ve hafta |
| Aylık duvar takvimi | Yatay A4, pazartesi başlayan ay ızgarası | Kaydedilmiş planlar ve okul takvimi; boş ve öğretim dışı günler |
| Öğrenci özeti | Dikey A4 | Kimlik/sınıf, seçilen iletişim alanı, son üç bireysel gözlem, iki devam eden destek ve takip adımı; tam ayrıntı seçeneği |
| Veli görüşme formu | Dikey A4 | Solda kaynak gündem, sağda gerçek görüşme notları; altta sorumlu, görev, tarih ve durum |

Normal uzunluktaki örnekler bir sayfadır. Uzun kaynak metinleri kırpılmaz; devam sayfası kullanılır. Öğrenci özetindeki dar görünümün 3 gözlem / 2 destek sınırı belgede açıkça yazılır; tam ayrıntı görünümü uygun kayıtların tamamını içerir. Ortak gözlemdeki diğer çocukların metni bireysel özete taşınmaz.

## Kabul kanıtları

Nihai kabul: **1.349/1.349 özellik testi**, **29/29 tarayıcı senaryosu**, gerçek derlenmiş uygulamada **çevrimdışı 1 uçtan uca senaryo**. Bu senaryoda plan yerleştirme, 3 PDF ve 2 Word indirme, kaynak metinlerin aynı olması, yeniden açılınca kaydın korunması ve profilden doğrudan özet doğrulandı. TypeScript/lint, derleme, 152 parça için gzip ≤180 KiB bütçe, 36 korunan runtime dosyası ve 3 runtime kilit testi geçti. Uzak yayın yapılmadı.

Aynı gün içindeki gözlem ve destek sırası kayıt zamanıyla belirlenir. Veli çıktısının kendi tarihçe kaydı indirmeyi bozmaz; gerçek kaynak değişikliği eski çıktıyı durdurur. Takvim önce geniş düzende hazırlanır; bir sayfayı aşarsa aynı metinlerle daha sıkı düzende tekrar üretilir.

Örnekler: [haftalık masa planı](../app/output/planning-calendar-2026-09-10/weekly-desk-plan.pdf), [aylık takvim](../app/output/planning-calendar-2026-09-10/monthly-wall-calendar.pdf), [öğrenci özeti](../app/output/student-summary/brief.pdf), [veli görüşme sonucu](../app/output/family-meeting-form-qa/veli-gorusmesi-sonuc.pdf).


- `app/tests/desk-document-ui.spec.ts`: gerçek IndexedDB, hızlı çift tıklamada tek plan, takvim gününün dolması, geri alma sonrası bütün snapshot'ın önceki veriyle aynı olması, 320 piksel taşma kontrolü ve öğrenci PDF önizlemesi.
- `app/tests/desk-documents-production.spec.ts`: gerçek uygulama kurulumu, çevrimdışı plan yerleştirme, haftalık/aylık/öğrenci PDF indirme ve sayfa yönü, yeniden açınca kaydın korunması.
- `app/tests/student-summary-ui.spec.ts`: öğrenci ve daraltılmış alan seçimi korunarak kaynak yenileme; gerçek PDF ve Word indirme.
- `app/tests/features/planning-calendar-document.test.mjs`: antetli yatay A4 tek sayfa, kaynak/alan/dönem kapsamı, aynı kayıt zamanıyla değişmiş gövdenin reddi ve beş sütunlu Word.
- `app/output/planning-calendar-2026-09-10/`: haftalık ve aylık PDF; gerçek Word üzerinden bir yatay A4 ve 13/13 kaynak değer kontrolü.
- `app/output/student-summary/`: kısa PDF, uzun PDF ve gerçek Word üzerinden oluşturulmuş baskı örnekleri.
- `app/output/family-meeting-form-qa/`: görüşme öncesi ve kaydedilmiş görüşme PDF/Word örnekleri.
- `app/output/desk-documents-2026-09-10/`: gerçek uygulamadan çevrimdışı üretilen belgeler ve ekranlar.

Test günlükleri: `app/output/desk-documents-features-final.log`, `desk-documents-browser-final.log`, `desk-documents-preview-final.log`, `desk-documents-desk-final.log`, `desk-documents-offline-final.log`, `desk-documents-build-final.log`.

## Sonraki geliştirmeler için somut öneriler

Bu bölüm yeni öneridir; aşağıdakiler bu sürümün uygulanmış özellikleri olarak sunulmaz.

1. **Günlük teslim çizelgesi.** Yatay A4; okul, sınıf ve tarih anteti. Sütunlar: sıra, çocuk, kayıtlarda teslim almaya yetkili kişi, yakınlık, telefon, teslim saati ve imza. Bilinen bilgiler hazır gelir; gerçekleşen teslim kaydedilince saat ve kişi belgeye yerleşir. Geniş imza alanıyla sınıf kapısında kullanılabilir.
2. **Küçük grup çalışma kartları.** Bir yatay A4 üzerinde altı kesilebilir kart. Her kartta grup çocukları, seçilmiş etkinlik, materyaller ve boş gözlem alanı bulunur. Ekranda karta dokunmak aynı gruba ait etkinliği ve gözlem kaydını açar; isimler tekrar seçilmez.
3. **Aileye ev oyunu kartı.** Dikey A4 üzerinde iki A5 kart; çocuk adı, kayıtlı etkinliğe bağlı evde uygulanabilir öneri, kısa malzeme listesi, iki adım ve ailenin geri bildirim alanı. Öğretmen seçtiği kartı hazırlar; gelen yanıt doğrudan ilgili çocuk ve etkinliğe bağlanır.
4. **Öğretmen klasörü kapak ve ayraçları.** Aynı okul antetinden kapak, ay ayraçları ve klasör sırt etiketi. Seçilen belgeler içindekiler listesine son güncelleme tarihleriyle yerleşir; yeniden hazırlamada aynı belge seçimi korunur.

Kalıcı tasarım ilkesi: Bir öneri, seçildiğinde gerçek kaydı ve bağlı sonraki adımı tamamlamalı; çıktı da aynı kayıt ve seçimden üretilmelidir.
