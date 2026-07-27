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
- Yeni gözlem yolu plansız veya etkinliksiz legacy kayıt üretmez; etkinlik
  yoksa önce plan oluşturma akışını açar.
- Plan, gözlem notu, program bağlantısı ve değerlendirme gerçek tam ekran
  telefon akışında tamamlanabilir; gözlem kaydından sonra çıkılırsa bağlantı
  bekleyen kayıt veri kaybı olmadan yeniden açılır.
- Program kodu ve başlığı öğretmen tarafından girilir; açık onay kutusu
  seçilmeden bağlantı oluşmaz.
- Öğretmen beyanı resmî katalog doğrulaması gibi gösterilmez.
- Değerlendirme ekranı tanı veya çocuk etiketi üretmediğini açıkça belirtir.
- Aynı sınıf ve İstanbul sivil gününde yalnız bir etkinlik `in_progress`
  olabilir.
- Plan günü aktif eğitim yılının başlangıç ve bitiş tarihleri dışında olamaz.
- Plan en az bir sürümlü program hedefi ve en az bir aktif çocuk kapsamı
  olmadan oluşturulamaz.
- Tüm sınıfa dağıtım işlem anındaki aktif çocuk UUID'lerini sabitler; sonradan
  gelen çocuğu geçmiş plana sessizce eklemez.
- Toplu dağıtım yalnız `planned` takip kaydı üretir; gözlem, program bağı,
  değerlendirme veya “öğrendi/başardı” hükmü üretmez.
- Seçili çocuk kapsamına başka sınıftaki, ayrılmış veya bilinmeyen çocuk
  eklenemez; hata plan ve etkinliği atomik olarak yazmadan bırakır.
- Yeni gözlem yalnız etkinliğin planlı öğrenci kapsamındaki çocuğa yazılabilir.
- Yeni program bağlantısı yalnız etkinlikte planlanan hedeflerden seçilir.
- Bağlam ve çocuğun özgün sözü ham gözlemden ayrı alanlarda yedek/geri
  yükleme boyunca korunur.
- Kısmi program kataloğu arayüzde tam resmî katalog gibi sunulmaz.

## Program değerlendirmesi

- TYMM ve MEB 2024 hedefleri aynı plan, bağ veya değerlendirmede karıştırılamaz.
- Dört resmî değerlendirme düzeyi gözleme dayanır.
- `not_assessed`, başarısızlık düzeyi değildir; ele alınmayan veya kanıtı
  yetersiz hedef boş/değerlendirilmemiş kalır.
- Dönem sonu yalnız dönem içinde ele alınan hedefleri ve aynı dönem kanıtlarını
  kullanır.
- Yıl sonu önceki dönem snapshot'larını değiştirmez; yeni ve kaynaklı bir
  sentez oluşturur.

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
- D1 yedeğinde değerlendirme atıfları gözlem kimlikleriyle birebir değilse,
  atıf bağlantısı yanlış gözleme aitse, gözlem değerlendirme dönemi dışındaysa
  veya katalog kaynak sürümleri karışıyorsa geri yükleme veri yazmadan reddedilir.

## Hesap ve kimlik

- Öğretmen Google hesabı olmadan yerel ve çevrimdışı kullanıma devam edebilir.
- Gerçek OAuth yapılandırması yokken arayüz sahte oturum veya sahte kullanıcı üretmez.
- OAuth erişim/yenileme belirteçleri localStorage, sessionStorage, IndexedDB veya
  MaarifOS yedeğine yazılmaz.
- Google bağlantısının çocuk verisini kendiliğinden Google'a yüklemediği açıkça belirtilir.

## Performans
- 20 öğrenci, 2.000 gözlem ve 5.000 fotoğraf önizlemesinde temel ekranlar kullanılabilir kalır.
- Uzun listeler kullanıcı arayüzünü kilitlemez.
