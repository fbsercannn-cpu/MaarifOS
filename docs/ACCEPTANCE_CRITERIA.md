# Kabul Kriterleri

## PWA
- Telefona kurulabilir.
- Tarayıcı çubuğu olmadan standalone açılır.
- İnternet kapalıyken daha önce yüklenmiş uygulama açılır.

## Öğrenci
- Yeni öğrenci 30 saniyeden kısa sürede eklenir.
- Öğrenci arşivlenebilir, geçmişi kaybolmaz.

## Yoklama
- Varsayılan bütün öğrenciler geldi kabul edilir.
- Gelmeyen çocuk tek dokunuşla işaretlenir.
- Erken ayrılmada saat kaydedilir.
- Yanlış işlem geri alınabilir.

## Gözlem
- Öğrenci + metin ile hızlı kayıt yapılır.
- Etiketler daha sonra eklenebilir.
- Ham metnin düzenleme geçmişi korunur.
- Tarih aralığına göre filtrelenir.

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

## Hesap ve kimlik

- Öğretmen Google hesabı olmadan yerel ve çevrimdışı kullanıma devam edebilir.
- Gerçek OAuth yapılandırması yokken arayüz sahte oturum veya sahte kullanıcı üretmez.
- OAuth erişim/yenileme belirteçleri localStorage, sessionStorage, IndexedDB veya
  MaarifOS yedeğine yazılmaz.
- Google bağlantısının çocuk verisini kendiliğinden Google'a yüklemediği açıkça belirtilir.

## Performans
- 20 öğrenci, 2.000 gözlem ve 5.000 fotoğraf önizlemesinde temel ekranlar kullanılabilir kalır.
- Uzun listeler kullanıcı arayüzünü kilitlemez.
