# Kabul Kriterleri

## PWA
- Telefona kurulabilir.
- Tarayıcı çubuğu olmadan standalone açılır.
- İnternet kapalıyken daha önce yüklenmiş uygulama açılır.

## Mobil etkileşim ve gezinme

- `320×568`, `360×800`, `390×844` ve `430×932` telefon görünümlerinde
  yatay taşma, sabit başlık/alt menü çakışması veya erişilemeyen içerik oluşmaz.
- Native PWA modunda dikey kaydırma, atalet ve dokunma tıklaması tarayıcının
  yerel davranışına bırakılır; sürükleme sonrasında hayalet tıklama oluşmaz.
- Telefonun geri işlemi çocuk profili → sınıf listesi → Bugün ekranı sırasını
  aynı URL içinde izler; uygulama içi ekran varken görevden çıkmaz.
- Tam ekran alt panellerde açık kapatma eylemi bulunur; kapanan panelin animasyon
  katmanı alttaki içeriğin tıklamasını engellemez.
- Görünür temel dokunma hedefleri en az `44×44 px` boyutundadır.
- Sınıf listesi arama, sınıf özeti, çocuk profili ve hızlı gözlem eylemlerini
  birincil; sınıftan ayırmayı geçmişin korunacağını belirten ikincil işlem olarak
  sunar.
- Sınıftan ayrılan çocuklar silinmez; daraltılabilir arşiv bölümünde geçmişleri
  korunarak geri alınabilir.
- Bugün ekranındaki `Öğrenci ara` eylemi ad veya soyadla eşleşir; Türkçe
  büyük/küçük harf ve diakritik farkları sonucu değiştirmez.

## Öğrenci
- Yeni öğrenci 30 saniyeden kısa sürede eklenir.
- Öğrenci arşivlenebilir, geçmişi kaybolmaz.
- Öğrenci profilinde adı ve soyadı ayrı alanlarda düzenlenir; birleşik görünüm
  geriye uyumlu korunur.
- Yakın cep telefonu yalnız `05` ile başlayan 11 hane olarak kabul edilir ve
  `0532 532 32 32` biçiminde gösterilir.
- Öğrenci profilinde yalnız gözlem, medya veya portfolyo seçimi bulunan aylar
  `YYYY-MM` anahtarıyla oluşturulur; boş ay klasörü gösterilmez.
- Akademik yıl takvim yılı sınırını geçtiğinde `2026-09` ile `2027-01` ayrı
  klasörlerdir ve başka eğitim yılına ait kanıt sayaçlara girmez.

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
- Ana sayfadaki çocuk kartından açılan hızlı gözlem ilgili çocuğu açıkça
  önseçer; genel kayıt girişinden açıldığında öğretmen çocuğu açıkça seçer.
- Her öğrencinin yarım kalan hızlı gözlem taslağı diğer öğrencilerin
  taslaklarından ayrı tutulur ve yeniden açılışta geri gelir.
- Gözlem türü ve nötr kategoriler hazır seçeneklerden seçilebilir; bunlar
  kendiliğinden başarı veya gelişim hükmü üretmez.
- Final kayıt başarısız olursa taslak kaybolmaz; başarılı kayıtta ilgili taslak
  aynı yerel işlem içinde kapanır.
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
- Ham metin, bağlam ve çocuğun özgün sözü hızlı gözlem taslağından final kanıta
  aktarılırken öğretmenin yazdığı biçimiyle korunur.
- Öğretmen tek çocuk ve seçili çocuklar kapsamı arasında geçebilir; tüm sınıf
  seçimi işlem anındaki uygun çocuk listesini açıkça işaretler.
- Toplu gözlem en az iki farklı aktif çocuk ve “her birini gözlemledim” öğretmen
  doğrulaması olmadan finalleşmez.
- Toplu işlem, öğrenci başına ayrı UUID'li ve tek-öğrencili ham gözlem üretir;
  ortak `batchId` yalnız işlem ilişkisini taşır.
- Bir çocuk bile başka sınıfta, pasif veya etkinliğe atanmamışsa bütün toplu
  yazım atomik olarak reddedilir; açık taslaklar korunur.
- Toplu gözlem program hedefini veya “öğrendi/başardı” hükmünü otomatik
  dağıtmaz; program bağlantısı her çocuk için ayrı öğretmen onayı ister.
- Kısmi program kataloğu arayüzde tam resmî katalog gibi sunulmaz.

## Portfolyo

- Portfolyo ayrı içerik girişi değildir; mevcut gözlem ve kanıtların kaynak
  kimlikleri korunarak oluşturulan seçkidir.
- Öğretmen kanıtı tek dokunuşla seçkiye ekleyebilir; seçimin öğretmen tarafından
  mı yoksa çocukla birlikte mi yapıldığı ayrı kaydedilir.
- Öğretmen notu, çocuğun seçime ilişkin sözü ve aile katkısı birbirinden ve
  kaynak gözlemden ayrı alanlarda tutulur.
- Kaynak gözlemin metni, tarihi, çocuk ilişkisi veya etkinlik ilişkisi portfolyo
  ekranından değiştirilemez.
- Başka çocuk, sınıf veya eğitim yılına ait kanıt seçkiye eklenemez.
- Seçkiden kaldırma fiziksel silme yapmaz; zaman damgalı kaldırma kaydıyla geri
  alınabilir geçmiş korunur.
- Portfolyo puan, sıralama, otomatik başarı hükmü, tıbbi veya psikolojik tanı
  üretmez.
- Seçkiler çevrim dışı kaydedilir; yeniden açılışta ve JSON yedek/geri
  yüklemede ayrı yansıtma alanlarıyla birlikte korunur.

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
- V1/V2 yedek doğrulandıktan sonra V3'e yükseltilir; D1 program-onay kayıtları,
  ayrı ad-soyad görünümü ve
  çok yıllı öğrenci üyelikleri eksiksiz geri yüklenir.
- D1 yedeğinde değerlendirme atıfları gözlem kimlikleriyle birebir değilse,
  atıf bağlantısı yanlış gözleme aitse, gözlem değerlendirme dönemi dışındaysa
  veya katalog kaynak sürümleri karışıyorsa geri yükleme veri yazmadan reddedilir.

## Hesap ve kimlik

- Öğretmen Google hesabı olmadan yerel ve çevrim dışı kullanıma devam edebilir.
- Gerçek OAuth yapılandırması yokken arayüz sahte oturum veya sahte kullanıcı üretmez.
- OAuth erişim/yenileme belirteçleri localStorage, sessionStorage, IndexedDB veya
  MaarifOS yedeğine yazılmaz.
- Google bağlantısının çocuk verisini kendiliğinden Google'a yüklemediği açıkça belirtilir.

## Performans
- 20 öğrenci, 2.000 gözlem ve 5.000 fotoğraf önizlemesinde temel ekranlar kullanılabilir kalır.
- Uzun listeler kullanıcı arayüzünü kilitlemez.
# 2026–2027 takvimi ve öğrenci paylaşım merkezi

- MEB 2026–2027 okul öncesi uyum ve dönem tarihleri kaynak bağlantısıyla
  takvimde görünür.
- Öğretmen seçili güne genel not, veli toplantısı, meyve günü, etkinlik veya
  uyum günü ekleyebilir; kaydı tamamlandı/iptal edildi olarak işaretleyebilir.
- Eğitim yılı değişikliği eski kapsamın üzerine yazmaz; arşivleme ve öğrenci
  taşıma tek transaction içinde gerçekleşir.
- Arşivlenen öğrenci geri alınabilir; kalıcı silme etki özeti ve tam ad
  doğrulaması olmadan çalışmaz.
- Öğrenci dosyası alıcı, tarih, kimlik ve içerik kapsamı seçilerek WhatsApp,
  dosya, ChatGPT veya Gemini için hazırlanabilir.
- Yapay zekâ hedefinde takma ad varsayılandır; tam kimlik açık kişisel veri
  onayı gerektirir.
- Haricî yapay zekâ geri bildirimi gözlemden ayrı, değişmez metin ve içerik
  özetiyle saklanır; dönem/yıl sonu kapsamı öğretmen tarafından işaretlenir.
- Takvim ve haricî geri bildirim kayıtları sürümlü yedekle kayıpsız
  dışa aktarılır ve geri yüklenir.
