# Hazır belge düzenleri — 0.38.0

PDF, Word ve Excel üreten mevcut uygulama yolları geliştirildi. Örnek dosyaların tamamı kurgu veridir; gerçek öğrenci kayıtları değiştirilmedi. Bu sürüm yereldir.

## Kullanım

PDF önizlemesinde **Şablon ve seçimleri düzenle → Hazır çıktı düzenleri** açılır. Belgenin desteklediği ayrıntılı veya hazır alan seçimi, renkli PDF ve az mürekkepli PDF seçenekleri belgeyi yeniden üretir. Etkin seçenek görünürdür; aynı seçeneğe tekrar basmak hazır belgeyi boşaltmaz. Öğrenci, dönem ve seçilmiş kaynak kapsamı korunur. Görünüm seçimi PDF içindir; Excel kendi düzenlenebilir veri ve baskı yapısını kullanır.

## Üreticiler

- PDF: ortak öğretmen belge teması, az mürekkepli görünüm, okul/sınıf/dönem bağlamı ve toplam sayfalı alt bilgi. Sınıf listesi ve gözlem çıktıları önizleme seçimini gerçek PDF üretimine taşır. Kaynak metni korunur; resmî kaynak PDF dosyaları yeniden tasarlanmaz.
- Word: ortak gerçek Title/Heading stilleri ve başlık anahattı, metinle birlikte kalan başlıklar, düzenlenebilir tablolar, devam eden tablo başlıkları ve gerçek PAGE/NUMPAGES alanları. Plan, anekdot ve Ek 18 üreticileri kullanır.
- Excel: boy-kilo baskısının ad, tarih ve ölçüm hücreleri veri sayfasına sabit ölçüm kimliği üzerinden bağlıdır. Sıralama ilişkiyi bozmaz. Eksik veya mükerrer kimlik yanlış değer göstermek yerine görünür hata üretir. Boş ve sıfır ayrımı, mm/g kaynak değerlerinin cm/kg sunumu ve baştaki sıfırlar korunur. Çocuğun dönemleri aynı sayfa grubunda kalır; imza son grupla birlikte yerleştirilir. Sınıf listesinin mevcut bağlı kompakt baskısı korunur.

## Gerçek dosya kabulü

- Word: 36 hedef test; Microsoft Word'de üç DOCX açıldı ve PDF'e dönüştürüldü. Anekdot 1, Ek 18 7, plan 2 sayfa; 10 sayfanın tümü görsel olarak incelendi. Metin, düzenlenebilir tablolar, başlıklar ve sayfa sınırları doğrulandı. Kanıt: `app/output/word-design-qa/`.
- Excel: 27 hedef test ve Microsoft Excel'de 20 kontrol. Değer/ad/tarih düzenleme, sıralama, eksik/mükerrer kimlik ve yeniden hesaplama sınandı. 64 büyüme kaydının tümü beş baskı sayfasında korundu; son sayfada tek kayıt veya ayrılmış imza kalmadı. Kanıt: `app/output/document-design-xlsx/`.
- PDF önizleme: 14 tarayıcı senaryosu; 320/390 px ilk görünüm, seçilmiş alanların PDF/Excel eşliği, kaynak değişiminde eski çıktının engellenmesi, gerçek indirme ve Türkçe metin araması geçti. Az mürekkepli PDF'nin metni renkli kaynakla aynı, baytları farklıdır. Dört sayfanın tümü Poppler ile oluşturulup görsel olarak incelendi. Son tekrar-tıklama düzeltmesi ve iki eşzamanlı üretim senaryosu ayrıca 3/3 geçti. Kanıt: `app/output/document-design/`.

Bu kabul Microsoft Office ve Chromium içindir; bu turda LibreOffice veya fiziksel yazıcı kabulü yapılmadı. Tasarım değişiklikleri kaynaksız pedagojik içerik veya değerlendirme üretmez.

## Son ortak kabul

1.317/1.317 özellik testi, TypeScript, politika lint, üretim derlemesi, 138 JavaScript parçasının paket bütçesi ve 36 korunan çalışma zamanı dosyası geçti. PDF önizleme 14/14; kaynak değişimi, yazdırma ve boy-kilo akışları 10/10; son tekrar-tıklama/eşzamanlı üretim kontrolü 3/3 başarılıdır.

Yeni HTML PDF yolu gerçek tarayıcıda ayrıca 2/2 geçti: semantik iki katmanlı tablo başlığı devam sayfalarında yinelendi, Türkçe ve URI bağlantıları korundu; çizim içeren raster yolda THEAD tekrar ederken 58 gövde işaretinin her biri tam bir kez bulundu. Paylaşılan sayfa planlayıcısı başlığa yer ayırırken kaynak aralığını kayıpsız böler. Kanıt: `tests/core/document-pdf-design.spec.ts` ve `app/output/pdf-design-2026-09-10/`.

Yerel geliştirme sunucusu, Windows Office'in açık tuttuğu geçici çıktı dosyalarını izlememesi için çıktı/test raporu klasörlerini izleme dışında tutar; kaynak dosyalarının canlı yenilenmesi korunur.
