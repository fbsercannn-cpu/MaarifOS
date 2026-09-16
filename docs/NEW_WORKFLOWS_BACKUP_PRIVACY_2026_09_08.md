# V10 yedek, yeni iş akışları ve kalıcı silme kabul kaydı

Tarih: 8 Eylül 2026. Uygulama adayı: 0.28.0. Kapsam sahibi: MARİF belge/veri güvenliği alt görevi. Bu kayıt, ortak veri katmanının kabulüdür; tüm uygulamanın mobil veya üretim kabulü yerine geçmez. Bütün test verileri kurgudur.

## Uygulanan sözleşme

- Veri şeması V10. Yayımlanmış V9 ayrı `TEACHER_FOLLOWUP_DATA_SCHEMA_VERSION` sabitiyle korunur. V6–V9 geçişi payload ve checksum değiştirmeyen kimlik geçişidir; önceki V1–V5 dönüşüm yolları korunmuştur.
- `settings` koleksiyonunda `growth-measurement-v1`, `consent-trip-v1` ve `classroom-admin-v1` kayıtları kendi kesin alan/tür ve ilişkisel doğrulayıcılarından geçer. Bilinmeyen alanlar sessizce atılmaz. Yeni üç tür V10 öncesi etikette reddedilir. Önceden yayımlanan `teacher-followup-v1` eşiği V9 olarak kalır.
- Yeni fiziksel koleksiyon eklenmedi. Mevcut 20 koleksiyon, yeni kayıtların tamamı ve kurtarma kopyaları aynı yerel AES-GCM kasa hattından geçer. Dışa aktarma/geri yükleme kanonik veriyi taşır.
- Öğrencinin doğrudan sahip olduğu ölçüm, düzeltme, seçim, izin kararı ve sayım olayları kalıcı silmede kaldırılır. Diğer çocuğun ölçümleri değişmez.
- Ortak gezi planı ve başlangıç kadrosunda yalnız hedef çocuğun üyeliği çıkarılır; anonim katılımcı sayısı artırılır. Kalan gezi olaylarının `previousEventId` bağı silinmiş olayları atlayarak yeniden bağlanır. Gezi tamamlanma durumu ve tarihsel toplam korunur.
- Devam eden gezide dönüşü henüz görülmemiş çocuk kalıcı silinemez. Hata anlaşılır Türkçe metinle bildirilir; ana veri ve kurtarma kopyası değişmez. Dönüş doğrulandıktan sonra silme yeniden uygulanabilir.
- Malzeme adetleri, hareketler ve borç/emanet geçmişi korunur. Hedef çocuğun emanet tarafı `removed` olur; kimlik boşaltılır. Devir planı ve bütün revizyonlardaki ilişkili maddeler `Kişisel kayıt kaldırıldı` metnine dönüştürülür; madde kimliği ve kontrol geçmişi korunur. Diğer çocuğun emanet ve takip bağları değişmez.
- Ana veri değişikliği ve hedef çocuğu içeren kurtarma kopyalarının temizlenmesi tek ana IndexedDB işlemiyle yapılır.

## Bulunan ve giderilen P1 hataları

### Kota iptalinden sonra eski kaydın kilitlenmesi

Önce: ana veri işlemi `QuotaExceededError` nedeniyle iptal edildiğinde ayrı anahtar veritabanına önceden yazılmış silme hazırlığı kalıyordu. Fiziksel eski veri korunmasına rağmen sonraki okuma `LOCAL_VAULT_REPLAY_DETECTED` ile duruyordu.

Sonra: hazırlık çağrısı yalnız bellekte yaşayan, aynı veritabanına bağlı bir makbuz üretir. İptal uzlaştırması ancak ana işlem hiç başlamamışsa veya gerçek `abort` olayı görülmüşse, özel kasa yazma kilidi hâlâ eldeyken ve ana veri/kurtarma ön görüntüsünün tamamı değişmemişse yürür. Makbuzdaki nesil durumu anahtar veritabanındaki durumla birebir eşleşmelidir. Yalnız bu çağrının hazırlıkları kaldırılır; ayrılmış nesil/nonce sayacı geri sarılmaz. Başlangıçta otomatik iptal yolu yoktur. Önceki hazırlık, değişmiş nesil, finalize edilmiş tombstone, sahte veya yeniden kullanılan makbuz iptal edilemez.

Senkron `put()` hatasından önce oluşturulan IndexedDB istekleri de izlenerek iptal sırasında işlenmemiş Promise reddi bırakılmaz.

### Gerçek IDB'de devir revizyonunun anahtar sırasına takılması

Ortak sınıf yönetimi doğrulayıcısındaki `JSON.stringify` karşılaştırması, kasa kanonik JSON'u nesne anahtarlarını sıraladığı için eşdeğer revizyonu reddediyordu. Kök görev domain ve serviste kanonik JSON karşılaştırmasına geçti. Gerçek IDB fixture'ı artık plan, revizyon, bütün kontroller ve kapanışı üretebiliyor.

### Aktif gezinin eksik sayımını silerek tamamlanmış gösterme riski

Dönüşü görülmeyen çocuğun kalıcı silinmesi kalan kadrodaki eksik sayısını yanlışlıkla sıfırlayabilirdi. Atomik silme içinde güncel gezi durumu kontrol edilir; eksik dönüş varken silme engellenir. Arşivleme davranışı ayrı kalır.

## Doğrulanmış kanıt

Gerçek tarayıcı IndexedDB'sinde, gerçek domain servisleriyle oluşturulmuş 55 kayıt; üç yeni tür; 20 koleksiyon; şifreli yedek; farklı veritabanına tam geri yükleme. Kaynak/hedef koleksiyon sayıları ve SHA-256 özetleri, kanonik deepEqual, gerçek geri yükleme makbuzu, ham kasa satırları ve kurtarma içeriğinin şifreli kalması doğrulandı.

Makinece okunabilir özet: `app/output/new-workflows-2026-09-08/roundtrip.json`.

| Kabul dilimi | Sonuç | Kanıt / test |
| --- | --- | --- |
| Yeni iş akışları: gerçek şifreli roundtrip, 13 bozuk aday, kota/yeniden deneme, ortak kayıtlı kalıcı silme, aktif gezi engeli | 5/5 PASS | `app/tests/core/new-workflows-backup.spec.ts`; `app/output/new-workflows-2026-09-08/final` |
| İptal güvenliği: senkron yazma, native abort, kurtarma clear, hazırlık hatası; restart/retry/replay; sahte/eski/yeniden kullanılan makbuz ve tombstone | 2/2 PASS | `app/tests/core/local-vault-abort.spec.ts`; aynı `final` çıktısı |
| Önceden var olan öğrenci/tam koleksiyon kasası, eşzamanlılık, nonce, anahtar kaybı, migration kesintileri, downgrade/swap ve tombstone replay | 16/16 PASS | `app/tests/core/student-sensitive-vault.spec.ts`, `all-collections-vault.spec.ts`; `app/output/new-workflows-2026-09-08/security-regression` |
| Eski yedekler, fotoğraflı yedek, restore ilişkileri, V5–V9 geçişi, sabit V9 takip eşiği, 13 takip türü ve önceki destek planı silme | 30/30 PASS | `backup.spec.ts`, `new-workflows-migration.spec.ts`, `student-followup-deletion.spec.ts`, `teacher-followup-backup.spec.ts`; `app/output/new-workflows-2026-09-08/legacy-final` |
| Kalıcı silme ve ortak entity registry Node regresyonu | 22/22 PASS | `app/tests/features/student-lifecycle.test.mjs`, `repository-entity-typing.test.mjs` |
| Politika denetimi | PASS | `node scripts/lint-policy.mjs` — 4 kural |

Toplam: 53 gerçek tarayıcı testi ve 22 Node testi. İç alt senaryolar ayrıca test sayısına eklenmemiştir. V9 öğretmen takip sentetik üretim fixture'ı V9 etiketiyle korunmuştur; güncel dışa aktarma V10'dur.

Kök görev hazırlık makbuzu, kesin abort ayrımı, tam ham ön görüntü karşılaştırması, nesil sayaçlarının korunması ve startup yolunun değişmemesini bağımsız salt okunur incelemiştir; bu dar değişiklikte ek engel bildirmemiştir.

## Sınırlar

- Gerçek kota dolması tarayıcı ve işletim sistemi davranışına bağlıdır. Kabul, native IndexedDB iptal olayı ile senkron kota ve hazırlık hatalarını enjekte eder; bu senaryolarda eski verinin okunabilirliği ve yeniden deneme doğrulanmıştır.
- Kesintiden sonra silme hazırlığı varsa önceki fail-closed davranış korunur. Bellekteki makbuz crash/reload sonrasında mevcut değildir; başlangıç eski ciphertext'i otomatik meşrulaştırmaz.
- Tam origin ile anahtar veritabanının birlikte geçmişe döndürülmesini ayırt etmek haricî güven kökü gerektirir; bu değişiklik böyle bir garanti üretmez.
- Mobil, üretim derlemesi, PWA/offline ve yayın kapısı kök görevin kapsamındadır. Bu alt görev yayın, commit veya kaynak push işlemi yapmamıştır.

Kalıcı ders: Ayrı veritabanındaki silme hazırlığını, yalnız kesinleşmiş ana işlem iptali ve değişmemiş ön görüntü kanıtıyla geri al; kota hatası eski veriyi erişilemez bırakmamalıdır.
