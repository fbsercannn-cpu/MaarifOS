# Tam veri kasası ve yedek kurtarma kabulü — 7 Eylül 2026

Sorumlu: MARİF bağımsız güvenlik/kalıcılık iş dilimi. Bu belge uygulama ve yerel doğrulama kanıtıdır; yayın makbuzu değildir. Bütün testler kurgu veriyle çalıştırıldı.

## Uygulanan kapsam

- IndexedDB’nin 20 alan koleksiyonundaki kayıt gövdeleri mevcut v2 AES-GCM kasasına alındı. Öğrenciler için önceki v2 güvenliği, nonce rezervasyonu, nesil ve silme kayıtları korunarak diğer koleksiyonlara genişletildi. Kurtarma snapshot’larının bütün koleksiyon kayıtları da şifrelenir.
- Ham ana kayıtta yalnız opak kayıt kimliği ve şifreli zarf bulunur. Anahtar/örnek kimlikleri, nonce/nesil bilgileri ve kurtarma kopyasının tarih, sayı, hash gibi işletim metaverisi kalır. Alan içeriği, kişi adı, adres, telefon, öğretmen notu veya fotoğraf açık ana kayıt/index alanına yazılmaz.
- Fiziksel IndexedDB sürümü 8’dir. Eski v7 istemci yazmaları sürüm sınırında reddedilir. Önceki öğrenci geçişi korunur; diğer koleksiyonlar doğrulanmış gölge veriden tek atomik cutover ile geçer. Commit öncesi kesinti özgün kaynağı, commit sonrası kesinti tamamlanan şifreli kaynağı korur; yeniden açılış devam eder.
- Başlangıç geçişi, koleksiyon yazması ve recovery yazma/silme/kalıcı purge aynı origin Web Lock kullanır. Salt okunur işlemler ortak kilit alır; yazmalar dışlayıcıdır. Staged snapshot ve commit öncesi kaynak karşılaştırması kayıp güncellemeyi engeller. Web Locks olmayan ortam açık hata verir ve veri açıp yazmayı başlatmaz.
- Şifreli alan indeksleri, çözülmüş koleksiyon üzerinde önceki bileşik/multiEntry sorgu anlamıyla çalışır. Bu yaklaşım alan indekslerinin disk üzerinde kişisel veri açığa çıkarmasını önler; sorgu maliyeti ilgili koleksiyon büyüklüğüyle artar.
- Kayıt/store değiştirme, açık metne düşürme, hazır işareti silme, anahtar kaybı veya şifreleme hatası işlemi durdurur. Hata durumunda boş kayıt yaratılıp kaynak üzerine yazılmaz.

## Yedek ve kurtarma sözleşmesi

`backup-capacity.ts` dışa aktarma, dosya seçimi, parser, encrypted object girdisi ve kurtarma için ortak sınırdır: 64 MiB UTF-8 düz içerik; 96 MiB şifreli dosya. Karakter sayısı byte sayısı yerine kullanılmaz. Sınır aşılırsa işlem görünür hata verir; içerik kısaltılmaz.

3 MiB üzerindeki yeni yedekler 1 MiB parçalara bölünür. Her parça AES-256-GCM ile, header ve sıra numarasına bağlı AAD kullanılarak şifrelenir; dosyada toplam byte, parça sayısı ve tam içerik SHA-256 bilgisi vardır. UTF-8 karakteri parça sınırında bölünse de korunur. Eksik, fazla, yinelenmiş ve sırası değiştirilmiş parçalar reddedilir. PBKDF2-HMAC-SHA-256 / 600.000 yineleme ve mevcut parola sözleşmesi korunur.

Küçük yeni yedekler v1 biçimindedir. Önceden desteklenen eski veri yedeği geçişleri korunur; veri şeması 8 → 9 ek geçişi bulunur. Eski v1 ciphertext sözleşmesinin 32 MiB sınırı decoder ile uyumlu hâle getirildi; eski biçimde 16 MiB üstü geçerli ciphertext açılabilir. Küçük güvenlik alanlarının sabit boyut kontrolü ve varsayılan yardımcı sınırı gevşetilmedi.

Başarılı şifreli export, üretilen dosyayı aynı decoder/schema üzerinden tekrar açıp bütün koleksiyonların kayıt sayısı ve kanonik SHA-256 özetlerini karşılaştırır. Replace/merge işlemi commit sonrası depodan yeniden okuyarak beklenen sonuçla mutabakat yapar. `lastRestoreVerification` yalnız başarılı gerçek restore’un bu oturumdaki makbuzudur; kalıcı sertifika değildir.

`recoverySummary()` canlı kayıt/fotoğraf/boyut ve 20 koleksiyon sayısını verir. `verifyEncryptedRecovery()` seçilen dosyayı ayrı bellek deposuna gerçekten restore eder, canlı sınıfı değiştirmez ve aynı sayım/hash denetimini uygular.

## Öğretmen paneli

`features/backup/BackupRecoveryPanel.tsx` kapasite kontrolü, koleksiyon sayıları, dosya ve parola ile yerel kurtarma tatbikatı, son gerçek restore özeti sunar. Root bunu profil/ayar yüzeyine bağladı. Dosya seçimi ve parola Mobile KeyboardInput sözleşmesine uyar; en az 44 px kontroller, hata bildirimi, canlı durum bildirimi ve meşgulken tekrar işlem engeli vardır. Parola başarıda/hata sonrasında temizlenir; depolanmaz ve loglanmaz.

Panelin metni bellek tatbikatını başka bir fiziksel cihaz denemesiyle karıştırmaz. 320 ve 390 px tam sayfa görüntüleri incelendi; yatay taşma yoktur. Açılmış sayfada ağ kapatılarak doğru/yanlış parola ve canlı sınıfın değişmemesi doğrulandı.

## Kalıcı silmede destek adımı gizliliği

Bağımsız inceleme, serbest narrative içine kopyalanan bireysel destek metninin öğrenci silindikten sonra planda kalacağını gösterdi. Yayın öncesi root bu yeni aktarımı `teacherContent.followupSupportSteps` yapısına taşıdı. Silme hooku öğrenci/karar kimliğiyle yalnız ilgili adımları mevcut plandan ve bütün revizyonların teacherContent kopyalarından çıkarır. Boş adım alanı kaldırılır; serbest öğretmen metni, diğer çocuğun birebir aynı metni ve tarihçenin sürüm/zaman kimlikleri korunur. Eski hassas içeriği tekrar taşıyan yeni tarihçe kopyası yaratılmaz.

Bu temizlik, ana veri ve öğrenciyi içeren kurtarma kopyalarının atomik silme işleminin içindedir. Enjekte commit öncesi hata hem plan hem kurtarma kaynağını korudu. Başarılı silmeden sonra yeniden açılış, kalan çocuk ilişkileri ve tekrar yedek export/parse geçti.

## Doğrulama kanıtı

Son birleşik Playwright koşusu **49/49** geçti (1,3 dakika): 26 mevcut backup, 12 değişmeden korunmuş student-sensitive-vault, 2 adres, 4 tüm koleksiyon, 3 kapasite/şifreleme ve 2 mobil panel testi. Son yapısal silme eklentisi ayrı **1/1**, bütün 13 takip türünün birleşik yedek/restore kabulü ayrı **1/1** geçti; toplam **51 benzersiz Playwright testi**. İlgili repository entity ve öğrenci yaşam döngüsü Node testleri **22/22**; TypeScript ve 4 policy lint kuralı geçti. Önceki geliştirme koşusunda Vite HMR kaynaklı sayfa kesintisi, son koşuda HMR kapatılıp modül invalidasyonu açık tutularak giderildi; son birleşik koşuda kesinti veya retry yoktu.

13 tür kabulü, veli bilgi doğrulama, teslim yetki geçmişi, gerçek teslim/düzeltme, görüşme/takip, hazırlık listesi/tamamlaması, rehber adımı/gözlemi ve destek kararı/plana aktarım/sonraki değerlendirmeyi tek geçerli snapshot'ta birleştirir. Gerçek IDB → şifreli yedek veri şeması 9 → farklı IDB zincirinde tam deepEqual ve 20 koleksiyon count/hash doğrulandı. Kayıtların ham disk gövdeleri şifrelidir. Sonraki kalıcı öğrenci silmede çocuğun olayları ve plan adımları temizlenirken sınıfın hazırlık olayları korundu; kalan snapshot tekrar strict backup doğrulamasından geçti.

60 kurgu çocuk için her biri yaklaşık 400 bin karakterlik profil fotoğrafıyla gerçek ayrı IndexedDB deposuna restore sonucu:

| Kanıt | Sonuç |
|---|---:|
| UTF-8 yedek içeriği | 24.024.415 byte |
| Şifreli dosya | 32.033.665 byte |
| Şifreli parça | 23 |
| Kaynak/hedef kayıt | 60 / 60 |
| Kaynak/hedef fotoğraf | 60 / 60 |
| Mutabakat yapılan koleksiyon | 20 |
| Sayılar + kanonik hashler | Tam eşleşme |
| Ham kayıtlar ve kurtarma gövdeleri | Şifreli |

Kanıt dizini: `app/output/completion-2026-09-07/security/`. `large-photo-roundtrip.json`, `teacher-followup-roundtrip.json`, `recovery-panel-320.png`, `recovery-panel-390.png`, `final-core-ui/`, `followup-privacy/`, `teacher-followup-backup/` ve `acceptance-receipt.json` bu dilimin kanıtıdır. Üretim UI testine verilen `teacher-followup-production-fixture.maarifos` ve metadata dosyası yalnız sentetiktir; dağıtım içeriği değildir. Çalıştırma komutları makbuzdadır.

## Açık teknik sınırlar

64 MiB tam sınır ve +1 byte reddi kapasite birim kontrolüdür; gerçek tam çevrim 24 MB sınıfında yapıldı. Çözülen snapshot API’leri bellek içindedir; bu çalışma sıfır kopyalı, diske akan veya bellek sınırsız bir export mimarisi iddia etmez. Şifreleme parça büyüklüğü sınırlıdır fakat toplam uygulama/bellek kapasitesi fiziksel cihaza bağlıdır; gerçek düşük bellekli telefon pilotu yapılmadı. Kalıcı hedefte quota/işlem hataları atomik olarak korunur, uygulama başarı makbuzu üretmez.

Yerel kasa açık uygulama oturumundaki yetkili JS erişimini veya aynı origin’de çalışabilen kötü amaçlı kodu ortadan kaldırmaz; haricî güvenlik sertifikasyonu yapılmadı. Bu iş dilimi kaynak değiştirdi ve yerel test yaptı; commit, push, Sites veya canlı yayın yapmadı.
