# Kabul Kriterleri

## PWA
- Telefona kurulabilir.
- Tarayıcı çubuğu olmadan standalone açılır.
- İnternet kapalıyken daha önce yüklenmiş uygulama açılır.

## Öğrenci
- Yeni öğrenci 30 saniyeden kısa sürede eklenir.
- Öğrenci arşivlenebilir, geçmişi kaybolmaz.

## Sınıf ve çalışma düzeni
- Eğitim yılı, sınıf, yaş grubu, uygulanan program ve çalışma düzeni ilk kurulumda kaydedilir.
- Sabahçı, öğleci, tam gün veya özel saat düzeni yeniden açılışta ve yedek/geri yüklemede korunur.
- Çalışma düzeni Bugün ekranında bilgi olarak görünür; günlük seçim kontrolü bulunmaz.
- Eksik sınıf ayarında uygulama çalışma düzeni tahmin etmez ve kurulum ister.
- Aktif sınıf ve eğitim yılı değiştiğinde önceki sınıfın öğrencileri, yoklaması,
  gözlemleri, etkinlikleri ve planları hiçbir aktif ekranda görünmez.
- Başka sınıfa ait öğrenci, gözlem veya etkinlik aktif sınıf üzerinden
  değiştirilemez; başarısız işlem mevcut veriyi değiştirmez.
- Tek sınıflı eski kayıt göçü idempotenttir. Çok sınıflı belirsiz kayıt aktif
  sınıfa tahminle bağlanmaz ve silinmeden inceleme karantinasında korunur.
- Eğitim yılı kapanınca yıl ve sınıflar salt-okunur olur; hiçbir eğitimsel kayıt
  silinmez veya yeniden yazılmaz.
- Aynı öğrenci sonraki eğitim yılında aynı kalıcı kimlikle yeni sınıf üyeliği
  alır; önceki yıl üyeliği ve kanıtları korunur.
- İkinci yıl-kapanış çağrısı yeni audit veya timestamp üretmeyen idempotent
  işlemdir.
- Yıllar sonra oluşturulan öğrenci arşivi bütün üyelik yıllarını içerir ve başka
  çocuğun verisini içermez.

## Yoklama
- Varsayılan bütün öğrenciler geldi kabul edilir.
- Gelmeyen çocuk tek dokunuşla işaretlenir.
- Erken ayrılmada saat kaydedilir.
- Yanlış işlem geri alınabilir.
- Farklı İstanbul takvim günlerinin yoklamaları birbirinin üzerine yazılmaz.
- Günlük yoklama ve tamamlanma durumu yeniden açılışta ve JSON yedek/geri yüklemede korunur.
- Şüpheli mükerrer yoklama silinmez; inceleme bayrağıyla korunur.

## Gözlem
- Öğrenci + metin ile hızlı kayıt yapılır.
- Etiketler daha sonra eklenebilir.
- Ham metnin düzenleme geçmişi korunur.
- Tarih aralığına göre filtrelenir.
- D1 ham gözlemi oluşturulduktan sonra aynı kimlikle değiştirilemez.
- Program bağlantısı ham gözlemden ayrı tutulur ve yalnız öğretmen onayıyla
  oluşur.
- TYMM planına MEB 2024 referansı veya tersi bağlanamaz.
- Değerlendirme taslağı gözlem kimliklerine atıf yapar, öğretmen tarafından
  yazılır ve `pending` inceleme durumuyla başlar.

## Medya
- Kamera veya galeriden eklenir.
- Birden fazla öğrenciye bağlanır.
- Küçük önizleme oluşur.
- Paylaşım uygunluğu ayrı işaretlenir.

## Rapor
- Öğrenci ve tarih aralığı seçilir.
- Dahil edilecek gözlem ve fotoğraflar düzenlenir.
- PDF önizlenir.
- Başka öğrenciye ait hassas kayıt eklenmez.

## Analiz paketi
- Markdown ve JSON üretir.
- Anonimleştirme çalışır.
- Her gözlem görünür kanıt kimliği taşır.
- Veri eksikleri listelenir.

## Yedek
- Tam yedek oluşturulur.
- Uygulama temizlendikten sonra geri yüklenir.
- Kayıt ve medya sayıları eşleşir.
- Bozuk yedek anlaşılır hata verir.
- Bozuk veya checksum değeri değiştirilmiş yedek mevcut veriyi değiştirmez.
- Aynı yedeği iki kez birleştirmek mükerrer kayıt üretmez.
- Aynı UUID ve farklı içerik sessizce üzerine yazılmaz; çakışma raporlanır.
- Geri yükleme sırasında oluşan hata tüm işlemi geri alır.
- Çapraz sınıf öğrenci-yoklama-gözlem ilişkileri geri yükleme başlamadan
  reddedilir.
- Eski kapsamsız yedek tek sınıfta deterministik atanır; çok sınıfta belirsiz
  kayıtlar ham içerikleri korunarak karantinaya alınır.
- V1 yedek doğrulandıktan sonra V2'ye yükseltilir; D1 program-onay kayıtları ve
  çok yıllı öğrenci üyelikleri eksiksiz geri yüklenir.

## Hesap ve kimlik

- Öğretmen Google hesabı olmadan yerel ve çevrimdışı kullanıma devam edebilir.
- Gerçek OAuth yapılandırması yokken arayüz sahte oturum veya sahte kullanıcı üretmez.
- OAuth erişim/yenileme belirteçleri localStorage, sessionStorage, IndexedDB veya
  MaarifOS yedeğine yazılmaz.
- Google bağlantısının çocuk verisini kendiliğinden Google'a yüklemediği açıkça belirtilir.

## Performans
- 20 öğrenci, 2.000 gözlem ve 5.000 fotoğraf önizlemesinde temel ekranlar kullanılabilir kalır.
- Uzun listeler kullanıcı arayüzünü kilitlemez.
