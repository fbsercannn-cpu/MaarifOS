# MR-056 · Öğrenci tam-kayıt yerel kasa pilotu

**Kanıt kesiti:** 28 Ağustos 2026

**Sürüm adayı:** MaarifOS `0.20.0`

**Durum:** `IN_PROGRESS / STUDENT_COLLECTION_ENGINEERING_PASS`

**Gerçek çocuk verili pilot:** `NO-GO`

Bu belge MR-056'nın tamamlandığını iddia etmez. Uygulanan dilim, ana
`students` koleksiyonu ile cihaz içi kurtarma snapshot'larındaki öğrenci
kayıtlarını tam-kayıt zarfına taşır. Plan, gözlem, yoklama, değerlendirme,
portfolyo, medya ve diğer kanonik koleksiyonlar henüz aynı kapsama alınmamıştır.

## Uygulanan güvenlik sınırı

- Öğrenci kaydının yalnız seçili hassas alanları değil, bütün kanonik kayıt
  gövdesi AES-256-GCM zarfında tutulur; dış kayıtta yalnız kimlik ile exact zarf
  metadata'sı kalır.
- 96 bit CSPRNG nonce, key-DB içindeki kalıcı rezervasyon/sayaç kaydıyla
  ayrılır. Aynı anahtar altında nonce yeniden kullanımı fail-closed kalır.
- Uzunluk çerçeveli AAD; uygulama veritabanı örneği, şema epoch'u, koleksiyon,
  kayıt kimliği, kayıt şeması, zarf/anahtar kimliği ve monoton kayıt neslini
  birlikte bağlar.
- Her şifreli kaydın monoton nesli ve zarf özeti key-DB ledger'ında tutulur.
  Eski nesil veya aynı nesilde farklı zarf saptandığında kayıt açılmaz.
- Kalıcı silme iki aşamalıdır: ana veritabanı commit'inden önce key-DB'ye
  `pending-retirement` niyeti ve yeni tombstone nesli yazılır; commit sonrasında
  emeklilik kesinleştirilir. Pending durumdaki eski ciphertext kabul edilmez.
- Açık metin/v1 kaynak → v2 gölge → doğrulama → atomik ana-DB cutover akışı;
  lease sahibi, revision ve süre sonu bağlı migration fence ile korunur.
- Hazır işareti ile journal ayrışması, missing-ready/all-v2 ve staging/verifying
  split-brain durumları idempotent ve fail-closed onarılır.
- Anahtar kaybı normal açılışa düşmez; yalnız exact şifreli yedek doğrulama,
  açık yıkıcı onay, kriptografik silme ve replace restore yoluna geçilir.
- Kriptografik silme anahtar veritabanını önce yok eder. Ana veritabanı silmesi
  başka sekme nedeniyle engellenirse sonlu sürede hata verir; kalan okunamaz
  ciphertext için aynı işlem güvenle yeniden denenebilir.

## Kurtarma ve eski veri göçü

React state'i çözülmüş backup payload'ı veya parolayı saklamaz. İlk doğrulama
sonrasında yalnız şifreli kaynak, dosya adı, kaynak SHA-256, payload checksum ve
kanonik varlık sayılarından oluşan makbuz tutulur. Restore anında parola yeniden
istenir; kaynak yeniden çözülür ve makbuzla exact eşlik doğrulanmadan mevcut
veri silinmez.

Eski `localStorage` v1 kaynağı aşağıdaki durumlarda silinmez:

- JSON bozuksa veya kök/collection şekli geçersizse;
- tek bir öğrenci, gözlem, arşiv ya da hassas profil alanı eksik/geçersizse;
- dolu IndexedDB ile non-UUID kayıt tekil ve exact eşleşmiyorsa;
- import commit'i veya yeniden okuma doğrulaması tamamlanmadıysa;
- doğrulanmış göçten sonra v1 anahtarının kaldırılması başarısızsa.

Commit tamamlanıp legacy anahtar silinmeden kesilen göç, sonraki açılışta kayıt
çoğaltmadan uzlaştırılır.

## Kanıt

Kaynak revizyonları:

- `fe81249` — tam-kayıt öğrenci zarfı, migration journal/fence, nonce ve kayıt
  nesli ledger'ı, replay/tombstone ve kriptografik silme.
- `1289759` — fail-closed legacy açık-metin göçü ve tam profil doğrulaması.
- `756cd4b` — anahtar kaybı kurtarma kapısı, geçici parola/payload belleği ve
  320 px klavye/odak davranışı.

Doğrulanan otomatik kapsam:

- çekirdek kasa güvenlik senaryoları `12/12`; üç ardışık tekrar `36/36`;
- backup/recovery çekirdeği `33/33`;
- legacy dashboard göçü `17/17`;
- kurtarma UI odak paketi `6/6`, tam dosya regresyonu `12/12`;
- TypeScript typecheck ve policy lint `PASS`;
- scoped `git diff --check` `PASS`.

Negatif matris; pending niyet + eski ana kayıt, pending + silinmiş ana kayıt,
silme sonrası eski ciphertext reinsert, meşru aynı-kimlik daha yüksek nesil,
blocked erase, anahtar silinmiş/ana DB kalmış retry, restore yazma hatası,
reset-without-backup, yanlış parola, dosya seçim/iptal odağı ve 320 px yatay
taşma durumlarını içerir.

## Neden MR-056 tamamlanmadı?

MR-056 bütün yerel koleksiyonları ister. Bu kesitte öğrenci kaydı ve recovery
snapshot öğrenci alt-kümesi korunur; kalan koleksiyonlar açık metin IndexedDB
kayıtlarıdır. Ayrıca:

- nonextractable IndexedDB anahtarı OS/hardware keystore değildir;
- aynı-origin XSS veya ele geçirilmiş süreç canlı anahtar ve açık metne
  erişebilir;
- ana ve key DB'nin birlikte koordineli tam rollback'i haricî güven kökü
  olmadan ayırt edilemez;
- IndexedDB fiziksel secure-wipe garantisi vermez; uygulanan garanti anahtarı
  önce silerek kalan ciphertext'i kriptografik olarak erişilemez kılmaktır;
- formal ispat/fuzz, Firefox/WebKit motorları, fiziksel telefon ve bağımsız
  kriptografi uzmanı kabulü yapılmamıştır.

Bu nedenle MR-056 `IN_PROGRESS`, gerçek çocuk verili saha MR-057 ise `NO-GO`
olarak kalır.
