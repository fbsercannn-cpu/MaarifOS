# Yıl başlangıcı ve çocuk gelişim gözlemi — 31 Ağustos 2026

Yerel sürüm: **0.20.1**. Bu belge canlı yayın makbuzu veya ürünün bütününe verilmiş bir kalite puanı değildir.

## Düzeltilen kullanıcı sorunları

Sınıf kurulumu tamamlandıktan sonra hazırlık yılını başlatan servis vardı, fakat sade Bugün ekranına bu işlemin bağlantısı aktarılmıyordu. Hazırlık önerileri de başlangıç eyleminin önüne geçiyordu. `Eğitim yılını başlat` şimdi hazırlık durumundaki ana eylemdir. Çalışmanın başladığı tarih ayrı tutulur; resmî eğitim yılı tarihleri değiştirilmez. Yeniden açılışta başlangıç durumu korunur.

| Yüzey | Yeni davranış |
|---|---|
| Bugün | Bir ana eylem, en çok iki takip eylemi. Ayrıntılar kapalı başlar. |
| Sınıfım | Çocuğun adı profilini, yanındaki `Gözlem` doğrudan o çocuğun gözlem ekranını açar. |
| Sınıf işlemleri | İndirme, yoklama, yönetim, arşiv ve toplu gözlem kapalı bir bölümde korunur. |
| Gözlem | Seçili çocuk özetlenir; öğrenme alanı ve üç davranış örneği gösterilir. Ek alanlar kapalıdır. |
| Çocuk dosyası | Kaydın Maarif çıktısı ve varsa verilen destek `Maarif gelişim bilgisi` altında okunur. |

Ana yol: **Sınıfım → çocuk satırında Gözlem → gözlenen davranış → gerekiyorsa notu düzelt → Gözlemi kaydet**. Alan değiştirmek ve destek belirtmek isteğe bağlıdır. Serbest metin ve çocuk sözüyle kayıt yolları korunur.

## Pedagojik kapsam

36–48, 48–60 ve 60–72 ay için yedi öğrenme alanında toplam **63 özgün, gözlenebilir davranış örneği** bulunur; her yaş bandında 21 örnek vardır. Bunlar resmî bir gelişim kontrol listesi, tüm programın tamamlanma çizelgesi veya bir olgunluk ölçeği değildir.

Örnekler [MEB 2024 okul öncesi eğitim programındaki](https://tegm.meb.gov.tr/meb_iys_dosyalar/2024_09/20104013_2024programokuloncesionayli.pdf) öğrenme çıktılarıyla yaş, kod, başlık, sayfa, kaynak sürümü ve SHA-256 üzerinden ilişkilidir. Kaynak PDF SHA-256: `77c1ea4771d83cca5bceeb43912770d52bf62a49d45cbbd109e584828bb5ea09`.

Bir davranışa dokunmak yalnız düzenlenebilir taslak oluşturur. Kalıcı gözlem ve öğretmenin onayladığı program bağlantısı ancak `Gözlemi kaydet` ile birlikte yazılır. Tek gözlem, çocuğun kazanımı tamamladığı sonucunu üretmez. İsteğe bağlı destek bilgisi ham gözlem metninden ayrı tutulur; puan, teşhis veya çocuklar arası sıralama yoktur.

## Veri güvenliği ve uyumluluk

- Gözlem, program bağlantısı ve taslak kapatma aynı işlemde yazılır; başarısız kayıt kısmi kanıt bırakmaz. Yeniden deneme aynı kaydı çoğaltmaz.
- Plansız gözlemler için sahte plan hedefi oluşturulmaz.
- Kapatılan tekli/toplu taslak yeniden açılabilir. Toplu kayıtta çocuklar ve içerik korunur, ortak kayıt onayı yeniden istenir.
- Başka bir program çıktısının grafik referansını takmak veya ilişkileri eksiltmek, yedeğin checksum'ı yeniden hesaplansa bile reddedilir. Doğrulama hem kayıt katmanında hem yedek içe aktarmada yapılır.
- Yedek biçimi V7'dir. V1–V6 yedekler okunur ve önceki içerik korunur. **Yeni V7 yedeği eski uygulama sürümüne geri yüklemek desteklenmez.**
- Gerçek çocuk verisiyle test yapılmadı; kurgu sınıf ve çocuklar kullanıldı. Kullanıcının mevcut kayıtları silinmedi veya dönüştürülerek kısaltılmadı.

## Kabul kanıtları

| Kontrol | Sonuç |
|---|---|
| Domain, kaynak eşleme, taslak, read-model ve diğer özellik testleri | 870/870 |
| Gelişim ve önceki şemalar dâhil tam çekirdek veri/yedek/restore testleri | 34/34 |
| Hazırlık yılını başlatma, yeniden açılış, gözlem ve yoklama | 2/2 |
| Gelişim seçimi: üç yaş bandı, destek, not düzenleme ve çocuk dosyası | Geliştirme sunucusunda 4/4; derlenmiş çevrimdışı sürümde 4/4 |
| Serbest not, çocuk sözü, 20 kayıt çevrimi ve toplu taslak kurtarma | 4/4 |
| Sürüm güncelleme akışları | 5/5 |
| Derlenmiş PWA: çevrimdışı açılış, veri koruyan güncelleme, yeni tarayıcı sürecinde soğuk başlangıç | 3/3 |
| TypeScript, build, politika lint'i, UI sözleşmesi ve ajan sözleşmesi | Geçti |
| Mobil çalışma zamanı bütünlüğü | 36 korunan dosya doğrulandı; yalnız sürüm etiketleri için kilit hash'leri güncellendi |
| Derleme boyutu | 57 JavaScript parçası, parça başına gzip ≤180 KiB |

Üç yaş bandı ve 320 piksel telefon için yeni uçtan uca test `app/tests/development-observation-ui.spec.ts` içindedir. Üretim derlemesinde çevrimdışı doğrulama `app/playwright.development-production.config.ts` ile çalıştırılır. Kayıt oluşmadan önceki taslak durumu, düzenlenen ham not, destek bilgisi, aynı davranışa yeniden dokunma, çocuk dosyası ve yeniden açılış bu testin kapsamındadır.

Yeni testler kalıcı kalite akışına bağlandı: `npm run test:runtime:core:data`, `npm run test:runtime:ui:workflows:development-observation` ve `npm run test:pwa:development`. PWA gelişim testi `test:pwa:production` sonunda da çalışır.

Son derlemenin PWA kabulü 4180 portunda `node scripts/run-pwa-tests.mjs --output=output/playwright/pwa-final-release-2026-08-31` ile 3/3 geçti (12,5 saniye). 4190 portundaki önceki deneme testler başlamadan önizleme sağlık kontrolü zaman aşımında sonlandı; uygulama testi sonucu olarak sayılmadı. Son geliştirme gözlem koşusu 4/4 (72,7 saniye, 120 saniye bütçe), üretim gözlem koşusu 4/4 (25,5 saniye) tamamlandı.

Test sırasında Playwright Clock'un reload sonrasında `performance.now()` ile `document.timeline` başlangıçlarını ayrıştırıp kapatılmış profilin DOM'dan kaldırılmasını geciktirdiği bağımsız olarak ölçüldü. Yalnız `Date` tarihini kaydıran test fixture'ı kullanıldı; gerçek animasyon saatleri, `toBeHidden()` kontrolü ve korunan BottomSheet kodu değiştirilmedi. Gerçek saatte sorun tekrarlanmadı; izole Date-only kontrolde profil 869 ms içinde DOM'dan kalktı.

20 çevrim otomasyon ölçümü gerçek öğretmen kullanılabilirlik testi değildir. Fiziksel telefonda klavye/dokunma, ekran okuyucu ve gerçek öğretmenle sınıf içi pilot ayrıca gereklidir. Bütün program bileşenleri, genel gelişim raporu ve portfolyo kapsamının açık sınırları `STATUS.md` içinde korunur. Bu çalışmada tam `quality:gate` veya canlı yayın yapılmadı.

Kalıcı ders: Hazırlık önerileri çalışmaya başlamayı kilitlememeli; davranış seçimi de öğretmen kaydetmeden çocuk hakkında hüküm üretmemeli.
