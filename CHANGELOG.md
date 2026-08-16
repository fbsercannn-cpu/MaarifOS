# Değişiklik Günlüğü

Bu projedeki önemli değişiklikler bu dosyada tutulur. Biçim, Keep a Changelog
ilkelerine; sürümler SemVer 2.0.0'a dayanır. MaarifOS uygulaması ile ayrı dağıtılan
private lisans Worker'ı bağımsız sürümlenir.

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
