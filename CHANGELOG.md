# Değişiklik Günlüğü

Bu projedeki önemli değişiklikler bu dosyada tutulur. Biçim, Keep a Changelog
ilkelerine; sürümler SemVer 2.0.0'a dayanır. MaarifOS uygulaması ile ayrı dağıtılan
private lisans Worker'ı bağımsız sürümlenir.

## [0.19.0] - 2026-08-27

### Eklendi

- Veli ve idare gözlem özetlerine ayrı kişisel veri uyarısı, onaydan sonra
  telefonun yerel paylaşım ekranı ve desteklenmeyen cihazlarda byte-korumalı
  güvenli indirme zinciri eklendi. Paylaşım ekranını kapatmak sessiz indirme
  başlatmaz.
- Günlük plan tarihine resmî takvim kapısı eklendi. Öğretim dışı gün kaydı
  fail-closed durur; taslak korunarak en yakın öğretim gününe tek dokunuşla
  alınabilir.

### Değiştirildi

- Yıllık etkinlik rotasyonu sabit 180 hafta içi yerine MEB 2026–2027
  takviminden türetilen 186 okul öncesi öğretim gününü kullanır. Uyum haftası
  dâhil; ara tatil, yarıyıl, tam gün tatiller ve 25 Haziran sonrasındaki günler
  hariçtir.
- Öğrenci numarası ile veli/yakın adı AES-256-GCM hassas veri kasasına taşındı.
  Eski v1 kayıtlar ilk doğrulanmış okumada geriye uyumlu ve atomik biçimde
  yeniden mühürlenir; çakışan karma kayıtlar fail-closed reddedilir.
- Eksik veya geçersiz yaş bandı artık 48–60 ay varsayılmaz. Etkinlik, program
  hedefi ve günlük pedagojik öneri üretimi kapanır; öğretmen sınıf kurulumuna
  yönlendirilir.

### Düzeltildi

- Geçmiş bir pedagojik kaynak haftasının bugünün hızlı planına bağlanıp plan
  tarihini Haziran'a sıçratması giderildi. Yalnız seçili günü gerçekten kapsayan
  hafta kaynak olarak bağlanır.
- Plan sihirbazı adım geçişi ve Etkinlikler rotası odağı ekran okuyucu ve
  klavye için yeni başlığa taşınır.
- Sınıf kurulumundaki devre dışı kaydetme düğmesi kesin eksik alanı görünür ve
  programatik açıklamayla bildirir; yapışkan eylem alanı form içeriğini örtmez.
  256, 320 ve 390 piksel yeniden akışta yatay kırpılma giderildi.

### Doğrulama

- Özellik/migration testleri `771/771`, plan oluşturma zinciri `5/5`, takvim
  ve öğretim günü testleri `27/27`, gözlem belgesi/paylaşım senaryoları `38/38`
  geçti. TypeScript, politika lint'i ve 36 dosyalık mobil runtime bütünlüğü
  temizdir.
- Tam kanonik `quality:gate` çıkış kodu `0` ile tamamlandı: runtime grupları
  `32/32`, Chromium/WebKit mobil smoke `54/54`, PWA sözleşmesi `10/10`, Sites
  güvenlik ve paket sözleşmesi `27/27`, production-offline PWA `3/3` geçti.
- Coverage satır `91.40%`, dal `77.66%`, fonksiyon `93.26%` olarak ölçüldü.
  Production build içindeki `47` JavaScript parçasının her biri kanonik
  `≤180 KiB` gzip/chunk bütçesi içinde kaldı.
- Bu sayılar yalnız otomatik doğrulanan kapsamın kanıtıdır; mutlak ürün puanı
  değildir. Fiziksel cihaz paylaşma/yazdırma, VoiceOver/TalkBack, gerçek sınıf
  pilotu ve bağımsız okul öncesi/TYMM uzman kabulü ayrı kapılar olarak açıktır.

## [0.18.0] - 2026-08-27

> Tarihsel sürüm kaydıdır; güncel `0.19.0` kalite hükmü değildir.

### Eklendi

- Plan, hızlı gözlem, program bağlantısı, değerlendirme ve belge hazırlama
  akışlarına ortak öğretmen uyarı merkezi eklendi. Ana metin öğretmenin ne
  yapacağını söyler; destek kodu ve temizlenmiş teknik ayrıntı varsayılan kapalı
  kalır.
- Hafta, hedef, çocuk kapsamı, sınıf saati, akış süresi ve çıktı kapsamı
  engellerine güvenli tek dokunuşlu düzeltmeler eklendi.

### Değiştirildi

- Haftalık ve aylık değerlendirme düğmelerinin bütün engelleri kaydetmeden önce
  görünür hâle getirildi; ilk eksik alan veya inceleme adımı tek dokunuşla açılır.
- Ham çalışma zamanı hataları öğretmen yüzeylerinden kaldırıldı. Taslak metin,
  seçim ve belge kapsamı korunur; uygun işlemler yeniden denenebilir.

### Düzeltildi

- Etkinlik Atölyesi'nden oluşturulan planın pedagojik kaynak gününün, öğretmenin
  sonradan seçtiği plan günüyle ayrışması giderildi. Plan ve gerçek etkinlik aynı
  işlemde yeni güne bağlanır; düzenleme ve yedek geri yükleme bütünlüğü korunur.
- Boş çıktı kapsamı, program bağı bulunmayan haftalık gözlem seçimi ve tarih
  sınırı uyarılarının ancak işlem sonrasında görünmesi giderildi.

### Doğrulama

- Kaynak günü, öğretmen uyarı sözleşmesi ve değerlendirme hazır olma kuralları
  birim testlerine; gelecek plan günü, çizimden gözlem taslağına aktarım ve tek
  dokunuşlu plan düzeltmeleri Chromium ile WebKit telefon testlerine bağlandı.
- Kanonik kalite kapısı tek kesintisiz çalıştırmada geçti: mobil smoke `54/54`,
  Sites `27/27`, PWA sözleşmesi `10/10`, production PWA `3/3` ve License API
  `15/15`. Coverage satır `%91,41`, dal `%77,63`, fonksiyon `%93,29`; 45
  JavaScript parçasının tamamı `180 KiB` gzip sınırının altındadır.
- Windows'ta derin iç içe `npm` komutlarında görülen `PATH` şişmesini önlemek
  için 32 yaprak runtime grubu aynı Node yürütücüsüyle sıralı ve ilk hatada
  duran tek çalıştırıcı altında toplandı.
- Public Sites sürüm `29` yayımlandı. Canlı `0.18.0` manifestindeki `75/75`
  varlık yerel üretimle SHA-256 düzeyinde eşleşti; güvenlik başlıkları ve service
  worker sürümü doğrulandı. Canlı Chromium/WebKit telefon kabulü `48/48`, canlı
  test donanımındaki son değişikliklerden sonra yerel smoke yeniden `54/54`
  geçti.

## [0.17.0] - 2026-08-27

### Eklendi

- Sınıf listesine, imza alanı ve Türkçe karakter desteğiyle gerçek A4 PDF
  üretimi; hassas veri onayından sonra telefonun yerel paylaşım sayfasını
  kullanma ve desteklenmeyen cihazlarda güvenli indirme zinciri eklendi.
- Plan oluşturma akışına etkinlik içeriği, yaş bandı, TYMM katalog izi ve
  öğrenme niyetini kullanan açıklanabilir hedef sıralaması eklendi. Öneri
  gerekçesi görünürdür; son hedef seçimi öğretmene aittir.
- Boş ve dolu ana durumları, kritik diyalogları ve 320/360/390/412/430 piksel
  telefon genişliklerini kapsayan erişilebilirlik ve dokunma hedefi kabul
  matrisi eklendi.

### Değiştirildi

- Haftalık plan varken de üç adımlı hızlı akış görünür tutuldu; on bölümlü
  pedagojik ayrıntı varsayılan kapalı ve isteğe bağlı hâle getirildi.
- Yüz yirmi çekirdek etkinliğin öğretmen adımları, katılım uyarlaması, gözlem
  odağı, aile köprüsü ve Çocuk Modu istemleri etkinliğe özgü kılındı.
- Bugün ekranındaki tekrarlı hazırlık alanı kaldırıldı; çevrimdışı önerinin
  yaş ve tarihe göre çalıştığı, canlı koşulu kendiliğinden bilmediği açıklandı.
- Otomatik erişilebilirlik kapısı Axe'ın bütün önem düzeylerini hata sayacak ve
  görünür etkileşim hedeflerinde en az 44×44 CSS pikseli doğrulayacak biçimde
  sıkılaştırıldı.

### Düzeltildi

- Planın yalnız genel gözlem veya belge varlığına bakarak uyarlama, aile
  köprüsü ve sonraki plan aşamalarını tamamlanmış saydığı yanlış pozitif durum
  kapatıldı.
- Sınıf listesi hazır olma kararı doğum tarihine değil, belgenin gerçekten
  gerekli okul, öğretmen, sınıf ve öğrenci alanlarına bağlandı.
- Dar telefonda 44 pikselin altında kalan gözlem filtreleri ile resmî takvim
  bağlantısının dokunma alanı büyütüldü.

## [0.16.0] - 2026-08-22

### Eklendi

- Etkinlik bankası 120 özgün çekirdek etkinliğe; 180 okul günü ve 540 günlük
  öneri yuvası üreten tam tarihli yıllık rotasyona genişletildi.
- On aylık pedagojik odak, aile köprüsü ve 9.996 bağlamsal yaş/sınıf/katılım
  uyarlaması kullanıcı yüzeylerinde görünür kapasiteye bağlandı.
- Sınıf listesine sürümlü `v2_0` dosya adı ve şablon üstverisi eklendi.

### Değiştirildi

- Çocuk Modu'nun son eylemleri 320 piksel telefonda sabit alt gezinmenin üstüne
  kaydırılabilir ve dokunulabilir olacak biçimde güvenli alan kazandı.
- Tek öğrencili sınıf listesi ile uzun Türkçe ad/veli alanlarının A4 ve 320
  piksel mizanpajı yenilendi.
- Plan, Ek 18 ve sınıf listesi indirmeleri mobil tarayıcıların Blob URL'yi
  devralabilmesi için ortak 30 saniyelik güvenli indirme ömrüne bağlandı.

### Düzeltildi

- Aynı ay günü farklı aylarda aynı etkinlikleri ve aynı pedagojik akışı seçen
  eksik tarih tohumu giderildi.
- Kurulu telefonların eski arayüz ve eski sınıf listesi üreticisinde kalmasına
  yol açan PWA sürüm eşzamanlama açığı kapatıldı.

## [0.15.0] - 2026-08-22

### Eklendi

- Ağ isteği, cihaz kimliği, süre sonu veya cihaz kotası kullanmayan ortak davet
  erişimi eklendi. Kod saklanmaz; yalnız şema sürümü, doğrulayıcı kimliği ve UTC
  erişim zamanı bu tarayıcı profilinde tutulur.
- `Bugün` ekranına sınıf, yoklama, plan, gözlem, gün kapanışı ve belge
  kaynaklarını önem sırasına koyan yerel kişisel öğretmen asistanı eklendi.
  Öneri en fazla iki toplu gerekçe gösterir ve öğretmen dokunmadan kayıt yazmaz.
- OECD TALIS 2024, resmî MEB/TYMM kaynakları ile dünya öğretmen ürünlerinden
  çıkarılan kararlar `app/docs/PERSONAL_ASSISTANT_RESEARCH_2026-08-22.md`
  belgesinde kaynaklarıyla kaydedildi.

### Değiştirildi

- Ana ekran sakin günlük brifing, tek “sıradaki en iyi adım” ve en fazla iki
  `Ben hazırladım` kartı etrafında yeniden düzenlendi.
- Eski premium plan köken işaretleri yedek/geri yükleme uyumluluğu için
  korunurken, öğretmenin eski kayıtları ticari erişim durumuna bağlı olmadan
  düzenleyebilmesi sağlandı.

### Kaldırıldı

- Premium, demo, deneme, kurucu üyelik, üçüncü cihaz reddi ve cihaz hakkı
  kullanıcı akışından kaldırıldı. `premiumPilot=1` artık ayrı ekran veya lisans
  ağı başlatmaz.

## [0.14.0] - 2026-08-22

### Eklendi

- Etkinlik Stüdyosu, alt menüden doğrudan açılan bağımsız bir ana rota oldu;
  36–48, 48–60 ve 60–72 ay filtreleri ile oyun, çizim, boyama, kes-yapıştır,
  hareket, açık hava ve materyal araçları aynı ekranda çalışır.
- Öğrenci kaydına “Kaydet ve sıradakini ekle” akışı; ilk TYMM yıl → ay → hafta
  planına düzenlenebilir başlangıç önerileriyle tek dokunuşlu kayıt eklendi.

### Değiştirildi

- Ana ekran, üç büyük ve tekrarlı adımdan yalnız gerçek “Sıradaki iş” kartına
  ve iki kısa işleme indirildi; sınıf, öğrenci ve günlük plan durumuna göre
  doğru eylem kendiliğinden öne gelir.
- Sınıf kurulumu okul, öğretmen, sınıf ve yaş grubunu tek ekranda toplar; TYMM
  programı, resmî 2026–2027 takvimi ve tam gün çalışma düzeni otomatik gelir.
- Çıktı satırları hazır, bilgi eksik, içerik gerekli ve tamamlanmalı durumlarını
  gerçek kayıtlardan hesaplar; yalnız gerçekten hazır belgede PDF veya
  yazdırılabilir dosya eylemi gösterilir.
- Yeni PWA sürümü, öğretmen başka bir alanı düzenlemiyorsa güvenli bekleme
  sonrasında uygulanır; güncelleme bildirimi sürüm ve tek “Şimdi yenile” eylemiyle
  sadeleştirildi.

### Düzeltildi

- Arka plandaki mobil sahnelerin ekran okuyucu ve klavye odağı alması, Çocuk
  Modu dönüş odağı, azaltılmış hareket tercihi ve çizim tuvalinin klavye
  eşdeğerlerinin eksikliği giderildi.
- Resmî veri dönemi ağustos sonuna kadar saklansa da öğretmen plan omurgasının
  temmuz ve ağustos aylarını yanlışlıkla ekleyip “12/10 ay” göstermesi önlendi;
  öğretim planı Eylül–Haziran 10 ay olarak kaldı.

## [0.13.0] - 2026-08-21

### Eklendi

- 36–48, 48–60 ve 60–72 ay için oyun, materyal, çizim, boyama, yazdırma ve
  gözetimli Çocuk Modu içeren çevrimdışı Etkinlik Stüdyosu eklendi.
- Okul, öğretmen, sınıf, öğrenci numarası, isteğe bağlı TCKN ve veli bilgisini
  tek mobil akışta alan hızlı kayıt; imzalı sınıf listesi ve veli/idare gözlem
  özeti eklendi.
- Yıllık, aylık, haftalık ve günlük öğretmen planlarına okulun ek etkinliklerini
  ekleyip tek dokunuşla PDF veya Word hazırlama akışı eklendi.

### Değiştirildi

- Ana öğretmen deneyimi yalnız Türkiye Yüzyılı Maarif Modeli ve seçilen üç
  resmî yaş bandına indirildi; günlük planın hazır 10 bölümü isteğe bağlı
  ayrıntıya taşındı.
- Yıllık plan omurgası, 60–72 ay sağlayıcı paketinden bağımsız nötr eğitim yılı
  aylarından üretilir; belge yalnız yapısal TYMM hedef kodu varsa resmî plan
  temeli olarak etiketlenir.
- Ana `?native=1` açılışı premium yapılandırma veya lisans isteği başlatmaz;
  plan, etkinlik ve çıktı akışında aktivasyon kodu gerekmez.

### Düzeltildi

- Aynı eğitim yılındaki eski EÇE sınıfı, geçmiş plan ve gözlemleri silmeden
  arşivlenip aktif öğrenciler yeni kimlikli TYMM sınıfına taşınabilir.
- Öğrenci sayısında arşivli kayıtların görünmesi, plan PDF'inde teknik taslak
  alanlarının basılması ve Çocuk Modu dönüşünde gözlem bağlamının kaybolması
  giderildi.
- Vite'ın `Vary: Origin` başlığı yüzünden çevrimdışı dinamik modülün cache'te
  bulunamaması düzeltildi.

### Güvenlik ve çevrimdışı çalışma

- TCKN ve veli telefonu, düz IndexedDB kaydı yerine ayrı AES-256-GCM cihaz
  kasasında çıkarılamaz anahtarla korunur; veli çıktısına hassas kimlik alanı
  taşınmaz.
- Bütün Vite varlıkları ve lazy ekran parçaları sürüm, boyut ve SHA-256 özetiyle
  manifestlenir; tek varlık eksik veya bozuksa çevrimdışı hazır işareti yazılmaz.

## [0.12.0] - 2026-08-20

### Eklendi

- 36–48, 48–60 ve 60–72 ay resmî TYMM 2024 yaş bantlarını; yedi öğrenme
  alanı, öğrenme çıktısı sayıları, tam çıktı listesi ve MEB kaynak iziyle sunan
  öğretmen rehberi eklendi.
- Her yaş bandı için üçer özgün, gözetimli çocuk katılımı şablonu; büyük dokunma
  hedefleri, seçimi değiştirme, etkinliği atlama ve korumalı öğretmene dönüş
  akışı eklendi.

### Değiştirildi

- 48 ve 60 aylık sınır durumlarında otomatik yaş ataması kapatıldı; sınıfın
  öğretmen tarafından seçilmiş resmî yaş bandı tek yetkili bağlam oldu.
- Çocuk seçimi, kendiliğinden değerlendirme veya değişmez kanıt yazmak yerine
  öğretmenin düzenleyip kaydedebileceği tarafsız gözlem taslağına bağlandı.

### Güvenlik ve doğruluk

- Çocuk yüzeyi öğretmen verilerini gizler; puanlama, doğru-yanlış, sıralama,
  tanılama ve otomatik pedagojik sonuç üretmez.
- Karma yaşın dördüncü bir resmî TYMM bandı olmadığı ve 0–36 ay programının
  TYMM kapsamı dışında kaldığı rehberde açıkça ayrıldı.

## [0.11.0] - 2026-08-16

### Eklendi

- Premium erişimden bağımsız yıllık → aylık → haftalık → günlük öğretmen planı
  oluşturma, yeniden açma ve iyimser eşzamanlılık korumalı revizyon zinciri eklendi.
- Günlük plana öğretmen onaylı, çalışma süresiyle birebir eşleşen 10 bölümlü akış;
  tek gerçek etkinlik, gözlem ve program bağıyla doğrulanabilir ilişki eklendi.
- Gün kapanışı, ertelenen iş yaşam döngüsü, haftalık ve aylık kanıt değerlendirmesi
  ile sonraki plan kararları için append-only öğretmen onayı eklendi.
- Günlük, haftalık, aylık ve birleşik kapsam seçimi; revizyon önizleme ve öğretmen
  onayı sonrasında PDF/DOCX üretimi eklendi.

### Değiştirildi

- Bugün, Sınıfım, Planlar ve Belgeler; aynı sayaçları tekrarlamak yerine sıradaki
  gerçek öğretmen işini ve kaynak kanıtını öne çıkaracak biçimde yeniden düzenlendi.
- Günlük plan hazırlığında önceki gün veya hafta akışını kaynak iziyle getirme,
  tek blok üzerinden süre dengeleme ve kalıcı yazarlık onayı sağlandı.
- Yedek/geri yükleme şeması öğretmen planı, günlük akış, kapanış, değerlendirme,
  karar ve belge kaynak ilişkilerini tahrife karşı daha sıkı doğrular.

### Düzeltildi

- Öğretmen planlarının premium kapısına yönlenmesi, haftalık planın öğretim günü
  yerine takvim haftasına göre erken/geç kapanması ve mükerrer günlük planın
  güvenilir plan seçilmiş gibi gösterilmesi giderildi.
- Dar telefonlarda günlük akış süre kartının yatay taşması, erişilebilir bölüm
  adlarının belirsizliği ve kaydetme öncesi 10 bölüm incelemesinin görünmez kalması
  giderildi.
- `0.10.0 → 0.11.0` geçişi, bekleyen worker sağlık denetimi, kullanıcı onayı,
  reload ve IndexedDB öğretmen verisinin korunmasıyla sınanır.

## [0.10.0] - 2026-08-09

### Eklendi

- Bugün ekranına günlük öncelik, plan, devam, takvim, sınıf ve bekleyen gözlem
  durumlarını bir araya getiren öğretmen kontrol merkezi eklendi.
- Sınıfım ekranına sınıf özeti, çocuk arama ve çocuk başına profil ile gözlem
  eylemlerini görev sırasına göre sunan çalışma alanı eklendi.
- Ayarlar'a çalışan çevrim dışı paket ile bekleyen worker sürümünü ayrı gösteren,
  öğretmenin elle güncelleme denetimi başlatabildiği gerçek PWA durum yüzeyi eklendi.
- Kurucu üretim paketi için yalnız açık doğrulama anahtarını kabul eden, eksik veya
  sürüklenmiş yapılandırmayı derlemeden önce durduran ve Sites paketini değer sızdırmayan
  SHA-256 doğrulamasıyla bağlayan yayın kapısı eklendi.

### Değiştirildi

- Plan oluşturma ve Premium Plan Merkezi; eksik ön koşulları, kaydedilmiş planı,
  değerlendirmeyi ve belge eylemlerini açık durumlarla ayıracak şekilde düzenlendi.
- Hızlı gözlem tek ham gözlem metnine odaklandı; seçilen çocuk ve varsa plan bağlamı
  aynı kayıt zincirinde korunurken yinelenen ayrıntı alanları ana akıştan çıkarıldı.

### Düzeltildi

- Ana ekrandaki güncelleme kartının bekleyen worker sürümü yerine uygulama sabitini
  göstermesi ve Ayarlar'ın gerçek worker durumuna bakmadan “Güncel” demesi giderildi.
- Güncelleme denetimi uygulama açılışına ek olarak odak, görünürlük ve ağa dönüşte
  beş dakikalık otomatik sınırla çalışır; elle denetim bu sınırı güvenle aşabilir.
- Kurucu premium aktivasyonunda cihaz anahtarı, yerel kasa, ağ ve sunucu doğrulama
  aşamaları güvenli destek kodlarıyla ayrıldı; geçici yerel yazma hatası önceki
  doğrulanmış erişimi artık silmiyor. Yalnız lisans alanını temizleyen iki aşamalı
  yerel onarım, öğrenci ve öğretmen kayıtlarına dokunmadan açık uyarıyla sunuluyor.
- `0.9.1 → 0.10.0` geçişi bekleyen worker sağlık kontrolü, kullanıcı onayı,
  `controllerchange`, reload ve IndexedDB veri korunumu zinciriyle sınanır.

## [0.9.1] - 2026-08-09

### Güvenlik

- Bekleyen service worker sağlık sorgusu salt okunur hale getirildi; yeni sürüm
  etkinleşmeden çalışan sürümün çevrim dışı cache'lerini silemez.
- Cache temizliği yalnız metadata'daki etkin sürüm ile worker sürümü eşleştiğinde
  çalışır; eski etkin ve doğrulanmış bekleyen sürümün sınırı korunur.
- Güncelleme kartı ve etkinleştirme komutu yalnız bekleyen worker'ın app-shell
  cache'i doğrulandıktan sonra sunulur.

### Düzeltildi

- Eski sürümden 0.9.0'a geçerken görülebilen geçici “çevrim dışı dosyalar
  doğrulanamadı” durumu ve aktif cache'in erken temizlenme riski giderildi.
- Service worker kurulumu yalnız doğru HTML MIME türü ile aynı-origin derlenmiş
  JavaScript ve CSS kaynakları bulunan uygulama kabuğunu kabul eder.

## [0.9.0] - 2026-08-09

### Eklendi

- Yıllık omurga, Eylül aylık planı, haftalar ve 10 bloklu günlük akıştan oluşan
  öğretmen plan zinciri; gelecek planı Takvim'de bulma ve güvenli atomik düzenleme.
- Çocuklar, program ve öğretmen yönünden ayrı aylık değerlendirme; kanıt yeterliliği,
  aktif sınıf snapshot'ı ve sonraki hafta/ay için görünür öneri kuyruğu.
- Kalıcı öğretmen planı ve değerlendirmesinden PDF/DOCX üretimi; MEB Ek 18 Aylık
  Plan Kontrol Çizelgesi ve resmî formdan ayrı öğretmen değerlendirme eki.
- Aynı değişmez gözlemden öğretmen onaylı MEB Ek 3 anekdot kaydı, PDF/DOCX belgesi,
  yedek/geri yükleme ve öğrenci dosyası kanıt izi.
- İki ayrı cihazla sınırlı, P-256 cihaz ispatlı ve ES256 yetkili kurucu test erişimi
  için Cloudflare Worker + D1 lisans servisi.
- MARİF gereksinim/kanıt defteri, dünya örnekleri kıyası ve öğretmen-gölge denetim
  sözleşmesi.

### Değiştirildi

- Hızlı gözlemde bağlam ve ikinci çocuk sözü tekrarları kaldırıldı; eski ayrıntılar
  açık öğretmen kararı olmadan yeni kayda taşınmıyor.
- Today yalnız bugünün planını gösteriyor; gelecek planlar kendi tarihinde ve
  Takvim'de görünür kalıyor.
- Premium plan dışa aktarımı statik örnek yerine öğretmenin gerçekten kaydettiği
  plan, blok, not, haftalık ve aylık değerlendirme zincirini okuyor.
- Yayımlanmamış Ekim–Haziran ayları içerik varmış gibi gösterilmiyor; yıllık yayın
  modeli 10 sıralı ay yuvası ve bağımsız immutable aylık paketlerden oluşuyor.

### Güvenlik

- Onaylı anekdotun gözlem ve program bağlantısı içeriğe bağlı mühürle korunuyor;
  aynı kimlikle içerik değiştirme yedek, belge ve öğrenci dosyasında reddediliyor.
- Haricî AI dosyasında sınıftaki çocuk/yakın kimlikleri, Türkçe büyük-küçük harf ve
  telefon yazım varyasyonları temizleniyor; kalan kimlik şüphesinde çıktı kapanıyor.
- İptal edilen kurucu cihazının aynı kodla yeniden yuva alması engellendi; yıllık
  cache imza sınırı ile çıkış/reset sonrası tam premium içerik temizliği güçlendirildi.
- Lisans API origin'i production CSP'ye yalnız sabit, kanonik HTTPS build değeriyle
  ekleniyor; query/local storage kaynaklı origin kabul edilmiyor.
- Sites assets-first yönlendirmesinde ana HTML'in Worker güvenlik başlıklarını atlaması
  engellendi; yayın paketi public `index.html` yerine içerik-karmalı opak kabuk kullanıyor,
  Worker kabuğu doğrulamadan HTML üretmiyor ve ayrılmış ağ yolları fail-closed kalıyor.

### Düzeltildi

- Uzun plan başlıklarının telefonda kesilmesi, PDF bölüm başlığı yetimleri ve
  gereksiz sayfa kırımları giderildi.
- Ek 18'de sonradan değişen sınıf kadrosunun tarihsel değerlendirmeyi bozması ve
  uzun program anlatısının resmî sayfa altına taşması engellendi; tam metin ekte
  kayıpsız korunuyor.
- 10 bloklu günlük akışın tek etkinliği çoğaltması ve gelecek planın Today'de erken
  görünmesi giderildi.

### Bilinen sınırlar

- Gerçek yazılmış premium plan içeriği şu anda yalnız Eylül paketidir; diğer dokuz
  ay yayımlanmamıştır.
- Ücretli premium için mağaza/makbuz doğrulama, yenileme ve cihaz aktarımı kullanıcı
  yolu henüz yoktur; kurucu erişimi ticari satış akışı değildir.
- Uygulama PIN'i yalnız arayüz kilididir. IndexedDB cihaz içinde uygulama düzeyinde
  şifreli olmadığı için gerçek çocuk verili pilot hâlâ `NO-GO`dur.
