# Büyüme belgeleri — bağımsız MARİF PDF kabulü

8 Eylül 2026; yalnız kurgu kayıtlar ve gerçek büyüme kayıt servisleri kullanıldı. Growth kaynak dosyaları bu bağımsız QA görevinde değiştirilmedi; bulgular modül sahibine iletildi ve onun düzeltmeleri yeniden denetlendi.

`app/tests/growth-pdf-qa.spec.ts`: 3/3 gerçek tarayıcı testi geçti (son koşu 23,9 saniye). Sınıf, boş ölçüm çizelgesi ve bireysel belge; 40 çocuk; 126 karakter çocuk adı, uzun okul adı ve 320 karakter açıklama; PNG logo, üç uzun başlık ve 146 karakter müdür adı denetlendi. Portre ve yatay kaydedilmiş okul şablonu uygulandı. Her çıktı PDF önizlemesinde gerçek canvas üzerinden açıldı, indirilen baytlar kaynak dosyayla birebir karşılaştırıldı. Bireysel belgede ayrıca `pdfPreviewRecipe(file.bytes).build(recipe.initial)` ile aynı seçim tekrar üretildi ve bayt eşitliği geçti.

Logolu altı PDF toplam 23 sayfadır: sınıf/boş portre altışar, sınıf/boş yatay üçer, bireysel portre iki, bireysel yatay üç. PyMuPDF bütün sayfaları render etti; A4 MediaBox yönleri doğru, aranabilir tablolarda sayfa dışı metin sınırı sıfır. Bireysel çıktı raster olduğundan metin tamlığı ve sınır denetimi kaynak canvas `fillText` ölçümleriyle yapıldı; bütün canvas sayfalarında taşma sıfır. Bu çıktı için aranabilir metin veya PDF/UA iddiası yoktur.

Boy (cm) ve kilo (kg) ayrı grafiklerdir; eksik ölçümler çizgiyle birleştirilmez, gerçek ölçüm tarihleri ve birimler ayrı doğrulandı. Boş sınıf hücreleri baskıda doldurulabilir kalır. Görsel incelemede portre sınıfın 7 sütunlu dönem satırları okunur, tarihler parçalanmaz, logo başlığa değmez ve uzun imza adı sütununda sarılır.

Bu denetimde düzeltilen somut kusurlar: uzun çocuk/okul metninin canvas dışına çıkması; müdür adının imza alanından taşması; bireyselde açık yatay tercihin uygulanmaması; portre sınıf çizelgesinde 18 dar sütunun tarih ve değerleri parçalaması; logo ile ilk başlık arası yetersiz boşluk. Son kaynakta açık bulgu kalmadı.

Kanıtlar: `app/output/new-workflows-2026-09-08/growth-pdf/styled-final-pdf-qa.json`, tüm PDF/PNG render’ları, `*-canvas.json` sınır kayıtları, `*-clipping.json` ve `final-test-results/`.
