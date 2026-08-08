# Değişiklik Günlüğü

Bu projedeki önemli değişiklikler bu dosyada tutulur. Biçim, Keep a Changelog
ilkelerine; sürümler SemVer 2.0.0'a dayanır. MaarifOS uygulaması ile ayrı dağıtılan
private lisans Worker'ı bağımsız sürümlenir.

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
