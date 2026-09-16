# Öğrenci aile profili ve geri alınabilir silme

Öğrenci profil sözleşmesi `profileSchemaVersion: 9` kullanır. Koleksiyon yapısı
değişmez; eski v2–v8 kayıtlar okunmaya devam eder. Eksik yeni alanlar bilinmeyen
bilgi olarak boş gösterilir, başka aile bilgilerinden çıkarım yapılmaz.

## İletişim ve aile alanları

`contacts` kişi bazındadır: anne `mother`, baba `father`, üçüncü ve sonraki
yakınlar `other`. Her kişi için `name`, `phone`, `relationship` ve isteğe bağlı
`occupation` (120 karakter) saklanır. Anne/baba mesleği ayrı tutulur; üçüncü
kişinin yakınlığı veya unvanı `relationship` alanıdır. Telefon bilinmiyorsa boş
kalabilir; ad veya meslek bulunması kaydı korumaya yeterlidir. Öncelikli ve acil
iletişim kişisinde geçerli telefon gerekir. Telefonu olmayan kişiye arama veya
WhatsApp bağlantısı üretilmez. Teslim alma yetkisi kişi için ayrıca işaretlenir.

`careDetails.homeAddress` açık adresi korur. Aile ve izinler bölümüne şu isteğe
bağlı alanlar eklenmiştir:

- `childPrivateNotes`: çocuğa özel destek ve bilgi notu, 2.000 karakter.
- `familySituationNotes`: aile durumu açıklaması, 1.000 karakter.
- `parentsSeparated`: anne ve baba ayrı yaşıyor.
- `motherDeceased`, `fatherDeceased`: anne/baba vefat durumu.
- `martyrChild`, `veteranChild`: şehit veya gazi çocuğu bilgisi.

İşaretler yalnız aileden bildirilen bilgiyle öğretmen tarafından kaydedilir.
İşaretlenmemiş alan doğrulanmış bir “hayır” sayılmaz. Aile biçimi, vefat veya
şehit/gazi bilgisi pedagojik puan, tanı ya da otomatik gelişim yorumuna dönüşmez.
Özel notlar standart gözlem çıktısına ve toplu veli belgelerine otomatik eklenmez.
Kayıtlar mevcut tam öğrenci kaydı AES-GCM kasası ve sürümlü yedek sözleşmesi
içinde korunur; gerçek öğrenci verisi log veya test fixture'ına yazılmaz.

## Öğrenciyi silme ve geri alma

Excel aktarımında öğretmenin ayrı öğrenci olduğuna açıkça karar verdiği
mükerrer adayının inceleme izi `spreadsheetImportReview` içinde saklanır:
`sourceRow`, `reviewedAtUtc`, `duplicateCandidateIds`, `_MUKERRER_INCELE: true`
ve `decision: "distinct-student-confirmed"`. Bu kayıt yalnız kaynak satır
numarası, UTC zamanı ve UUID taşır; kaynak ad/telefon veya dosya içeriği eklemez.
Karar zamanı öğrenci kayıt zaman aralığı içinde kalmalı; aday UUID'leri benzersiz
olmalı ve öğrencinin kendisini içermemelidir. Bilinmeyen ek anahtarlar, otomatik
karar ve boş aday listesi reddedilir. Geçmişte incelenen aday sonradan silinse de
inceleme izi korunur. Normal profil düzenleme, arşivleme ve yedek geri yükleme
bu alanı korur; yerel tam-kayıt kasasında şifrelenir.

Sınıfım → Sınıf işlemleri → öğrenci işlemleri → **Öğrenciyi sil**, açık bir
onay penceresi açar. Onay öğrenciyi aktif sınıf listesinden çıkarır ve
**Silinen / ayrılan öğrenciler** bölümüne taşır. Kimliği ve geçmiş dosyası,
aile bilgileri, gözlemler, yoklamalar, medya ve diğer ilişkileri korunur.
**Geri al** aynı öğrenci kimliğini yeniden aktifleştirir; yeni bir öğrenci
kopyası oluşturmaz. Silinen/ayrılan kayıtlar yedeğin içinde kalır.

Sınıf üyeliği değişiminde `preserveCurrentProfile: true`, transaction içindeki
en güncel öğrenci profilini kullanır. Onay penceresi açıkken başka sekmede
değişen aile bilgileri eski ekran verisiyle ezilmez. Sonuç ekranı tekrar
depodan yüklenir. Mevcut gelişmiş kalıcı silme ayrı, ad onaylı akıştır.

## Kabul kanıtı

- `tests/features/student-profile.test.mjs`: telefonsuz anne/baba meslekleri,
  isteğe bağlı aile durumları, metin sınırları ve eski kayıt okuma.
- `tests/core/student-family-recovery.spec.ts`: gerçek IndexedDB üzerinde
  şifreleme, yedek üretme/doğrulama, başka depoya geri yükleme, silme/geri alma,
  eşzamanlı profil değişiminin korunması ve değişmeyen yoklama kayıtları.
- `tests/student-safety-profile.spec.ts`: 320 piksel telefonda alanları
  kaydetme/yeniden açma, silmeden vazgeçme, onaylama, geri alma ve çevrim dışı
  profil okuma.
