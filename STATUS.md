# MaarifOS kanonik yetenek durumu

**Sürüm:** 0.19.0
**Durum tarihi:** 27 Ağustos 2026
**Kapsam:** Bu dosya çalışan ürün kabiliyetinin tek kanonik özetidir. `PROJECT.md`
ürün niyetini, `docs/ROADMAP.md` gelecek sırayı anlatır; menü adları ve plan
başlıkları bitmiş özellik kanıtı değildir.

## Durum sözlüğü

| Durum | Anlamı |
|---|---|
| `IMPLEMENTED` | Kullanıcı akışı, kalıcılık ve ilgili test kanıtı vardır. |
| `PARTIAL` | Çekirdeğin bir bölümü çalışır; vaat edilen uçtan uca akış tamam değildir. |
| `SCHEMA_ONLY` | Veri tipi/koleksiyonu vardır; kullanıcı yeteneği sayılmaz. |
| `PLANNED` | Yol haritasındadır; çalışan sürümde sunulmaz. |
| `HIDDEN` | Kod yatırımı korunur fakat Hediye Alpha ana akışında gösterilmez. |
| `RETIRED` | Tarihsel uyumluluk dışında çalışma zamanı veya kullanıcı yüzeyi yoktur. |

## Emine Öğretmen ürün sınırı

Ana akış şudur:

`Bugünü hazırla → Etkinliği uygula ve gözlemle → Yazdır veya paylaş`

Ana deneyim yalnız Türkiye Yüzyılı Maarif Modeli'ni gösterir. Ortak altı haneli
davet kodu bir üyelik veya kimlik doğrulama sistemi değildir; ağsız ve kotasız
yerel uygulama erişimi verir. Sınıf, plan, etkinlik ve çıktı işleri beş alt
menüde kalır; okul ve öğretmen bilgileri bir kez girildikten sonra belgelere
otomatik yerleşir. Eski kayıtlar silinmez; TYMM eğitim yılına güvenli taşıma
sırasında arşivlenir veya korunur.

## Yetenek matrisi

| Alan | Durum | Kullanıcıya söylenecek gerçek | Kanıt / kapı |
|---|---|---|---|
| PWA kurulumu ve çevrim dışı kabuk | `IMPLEMENTED` | Uygulama kurulabilir; ilk çevrim içi kurulumda Etkinlik Stüdyosu dâhil bütün derlenmiş varlıklar SHA-256 manifestiyle hazırlanır ve sonraki soğuk başlangıç çevrim dışı açılır. | `app/src/pwa.ts`, `app/public/sw.js`; ağsız ilk lazy ekran, 0.12.0→0.13.0 veri korumalı yükseltme ve kalıcı profil testleri |
| Ortak davet erişimi | `IMPLEMENTED` | Ortak altı haneli kod, sınırsız tarayıcı/telefon profilinde uygulamayı ağsız açar. Kod saklanmaz; bu erişim üyelik, öğretmen kimliği veya çocuk verisi güvenlik sınırı değildir. | `local-shared-access` birim testleri; üç izole profil, yenileme, eski `premiumPilot` ve sıfır lisans ağı tarayıcı testleri |
| Eğitim yılı ve sınıf kurulumu | `IMPLEMENTED` | Sınıf, eğitim yılı, çalışma düzeni ve program profili kalıcıdır. | repository + migration + runtime testleri |
| Öğrenci yaşam döngüsü | `IMPLEMENTED` | Ekleme, düzenleme, arşivleme, geri alma ve yıllar arası kimlik korunur. | student lifecycle testleri |
| Günlük yoklama | `IMPLEMENTED` | `Geldi / Geç geldi / Gelmedi` günlük kaydı sınıf üyeliğinden bağımsızdır. Giriş, çıkış, erken ayrılma, kısmi gün ve mazeret olayları; neden, öğretmen notu, geri alma, yeniden yükleme ve öğrenci geçmişi uçtan uca korunur. Olaylar şifreli yedek/restore kapsamındadır ve olay alanı bulunmayan N-1 kayıtları geriye uyumlu okunur. | `app/src/core/domain/attendance.ts`; `app/src/features/dashboard/dashboard-data.ts`; `app/src/features/attendance/attendance-history.ts`; `attendance-membership`, `attendance-events`, `attendance-history`, `core/backup` ve runtime kullanıcı akışı testleri |
| Plansız hızlı gözlem | `IMPLEMENTED` | Ham metin değişmeden saklanır; tekli ve toplu taslak öğrenci seçimiyle geri kazanılır. Toplu geri açılışta aynı `batchId`, çocuklar ve içerik korunur; ortak kayıt onayı yeniden istenir. Tam ekran akış kaydırılmış sayfada da tepeden açılır. Bağlam ve ikinci çocuk sözü tekrarları kaldırılmış, eski ayrıntılar açık karara bağlanmıştır. | evidence flow, 20 çevrim, toplu kesinti/geri açma ve legacy reload/runtime testleri |
| Öğretmene ait plan → etkinlik → kanıt | `IMPLEMENTED` | Premiumdan bağımsız yıllık, aylık, haftalık ve günlük plan; öğretmen onaylı 10 bölümlü akışı tek gerçek etkinlik, gözlem ve program bağıyla aynı kaynak zincirinde taşır. Gelecek plan Today'de erken başlamaz; Takvim'de bulunur ve kanıt bütünlüğü korunarak atomik revize edilir. | teacher-owned planning, daily-flow, scheduled workspace, gerçek hafta UI, backup/restore ve production-offline testleri |
| Bugünün etkinlik önerisi → gerçek günlük plan | `IMPLEMENTED` | Bugün önerisine dokunulduğunda 120 kartlık listenin başı değil seçilen etkinlik açılır. Yaş bandı, sınıf koşulu, katılım yolu, canlı uyarlama ve `değer → eylem → kanıt → yansıtma → sonraki plan` izi plan ile etkinliğe aynı atomik snapshot olarak yazılır; yedek/restore exact korur ve zincir tahrifi reddedilir. | `pedagogical-plan-bridge`, `pedagogical-plan-provenance`; birim, exact telefon akışı ve fail-closed backup/restore testleri |
| Haftalık ve aylık öğretmen değerlendirmesi | `IMPLEMENTED` | Beklenen öğretim günleri eksiksiz ve güncel kapanmadan haftalık karar yazılmaz. Çocuklar, program ve öğretmen yönündeki aylık değerlendirme append-only kaydedilir; yetersiz kanıt açık kalır ve öneriler sonraki plana öğretmen onayı olmadan uygulanmaz. | teacher-owned weekly/monthly, day-closure, roster snapshot, gerçek hafta UI ve backup/restore testleri |
| Değerler Pedagojisi Anayasası ve D1–D20 çekirdeği | `PARTIAL` | Makine-okunur anayasa, resmî Ek-14 kaynak zinciri, plan sözleşmeleri, altı rollü değişmez karar sözleşmesi ve iki dönemlik authored hedef profili çalışır. Gerçek altı rol kararı ve tamamlanmış Eylül–Haziran içerik seti olmadan yayımlanmış model sayılmaz. | `docs/DEGERLER_PEDAGOJISI_ANAYASASI.md`; values sözleşme/katalog/insan-inceleme testleri |
| 2026–2027 değerler yayın hedef profili ve Ekim referans blueprint'i | `HIDDEN` | On ay/iki dönem/108 etkinlik authored hedef sözleşmesi; iki dönemde ana değerler üzerinden D1–D20, 18/18/18 çatı ve ay bazlı kültürel köprü adayları için strict contract testlerinden geçer. Bu bir gerçek release doğrulaması değildir. Ekim yalnız 12 etkinliklik planlanmış referanstır; gelecek dokuz ayın gerçek içerik dosyaları, release-set manifesti ve insan kararları henüz yoktur. | `docs/DEGERLER_2026_2027_YILLIK_MATRIS.md`; annual release-set ve October reference testleri |
| Eski Plan Merkezi kullanıcı yüzeyi | `RETIRED` | Premium/kurucu ekranı ve `premiumPilot` girişi artık çalışma zamanında açılmaz. Eski plan köken bilgileri yalnız veri uyumluluğu için korunur. | normal ve `premiumPilot=1` açılışlarında aynı TYMM yüzeyi; lisans ağı isteği yok |
| Tarihsel içerik yayın seti | `HIDDEN` | Eski Eylül paketi ve yayımlanmamış ay sözleşmeleri geriye dönük test verisi olarak korunur; kullanıcıya üyelik veya ayrı plan ürünü olarak sunulmaz. | annual manifest/cache uyumluluk testleri |
| İki cihazlı kurucu lisans servisi | `RETIRED` | Uygulama artık cihaz yuvası, entitlement, yenileme veya üçüncü cihaz reddi kullanmaz. | ortak davet erişimi ve üç izole cihaz profili tarayıcı testi |
| Öğretmen onaylı değer kanıtı · veri şeması v5 | `HIDDEN` | Ham gözlemden otomatik ahlak sonucu üretmez; ayrı değer bağı, düzeltme/tombstone geçmişi ve yedek/restore çalışır. İnsan uzman ve sınıf pilotu tamamlanmamıştır. | `valueEvidenceLinks`, v5 migration/backup, öğretmen editörü testleri |
| TYMM 2024 kataloğu ve üç resmî yaş rehberi | `IMPLEMENTED` | 36–48, 48–60 ve 60–72 ay bantları; yedi öğrenme alanı, tam çıktı listesi, sayı özeti ve MEB kaynak iziyle sunulur. Karma yaş dördüncü resmî bant, 0–36 ay ise TYMM gibi gösterilmez. | curriculum catalog ve `tymm-age-guide` sözleşme testleri; 320–430 px mobil tarayıcı akışı |
| TYMM bütünsel model bileşenleri | `PARTIAL` | Öğrenme çıktıları ve yaş rehberleri tam katalogdan gelir. Öğrenci profili, beceriler çerçevesi, Erdem–Değer–Eylem ve programlar arası bileşenlerin tamamı henüz aynı resmî kapsam matrisiyle plan ve gözlem akışına bağlanmış değildir. | MEB TYMM ana model ve programlar arası bileşen kaynakları; bütünsel kapsam kabul matrisi açık |
| Gözetimli çocuk katılımı | `IMPLEMENTED` | Öğretmenin seçtiği yaş bandında üç büyük özgün seçenek, atlama/değiştirme ve korumalı öğretmene dönüş vardır. Dokunuş puan, teşhis veya değişmez kanıt üretmez; yalnız öğretmen onaylı gözlem taslağını başlatabilir. | `TymmChildParticipationDialog`; 320–430 px responsive tarayıcı akışı; fiziksel dokunma ve ekran okuyucu kabulü açık |
| Yıllık etkinlik ve öneri motoru | `PARTIAL` | 120 kartlık çevrimdışı envanter ve üç resmî yaş uyarlaması vardır. 2026–2027 rotasyonu, uyum haftası dâhil MEB takviminden türetilen 186 öğretim gününü kullanır; ara tatil, yarıyıl, tam gün tatiller ve yıl sonrasını fail-closed dışarıda bırakır. Envanterin tamamı bağımsız okul öncesi uzman kurulundan geçmiş authored yayın seti değildir. | etkinlik/yıllık rotasyon ve `teacher-week-teaching-days` testleri; 390×844 öğretim dışı gün düzeltme akışı; uzman içerik kabulü açık |
| Eski MEB kataloğu | `PARTIAL` | Yalnız desteklenen kısım vardır; tam resmî katalog diye sunulmaz. | katalog kaynak/sürüm görünürlüğü |
| Çocuk zaman çizelgesi | `PARTIAL` | Kanıt ve yoklama kayıtları vardır; tüm medya/çıktı türlerinin birleşik görünümü tamam değildir. | öğrenci dosyası/runtime |
| Portfolyo seçkisi | `PARTIAL` | Mevcut kanıt üzerinden seçim ve ayrı yansıtma alanları vardır; PDF/medya paketi tamam değildir. | portfolio testleri |
| Profil fotoğrafı | `IMPLEMENTED` | Küçük profil fotoğrafı yerel öğrenci kaydında tutulur. | student profile testleri |
| Hassas öğrenci ve veli kasası | `IMPLEMENTED` | Öğrenci numarası, T.C. kimlik numarası, veli adı ve telefonu ayrı IndexedDB kasasında, cihazda üretilmiş dışa aktarılamaz anahtarla AES-256-GCM şifreli tutulur. Ana kayıt ve loglarda düz metin bulunmaz. | kasa kalıcılığı, eşzamanlı yazma, taşıma ve reload testleri; sınıf listesi/veli-idare ayrım testleri |
| Genel medya/blob deposu | `SCHEMA_ONLY` | Fotoğraf/video belge yönetimi henüz kullanıcıya hazır değildir. | Blob/thumbnail/kota/backup kapısı |
| Genel PDF ve resmî belge merkezi | `PARTIAL` | Belgeler yüzeyinden öğretmen planının günlük, haftalık, aylık ve birleşik kapsamı PDF/DOCX; MEB Ek 3 ile Ek 18 üretilebilir. Gözlem özeti semantik HTML olarak onaylı telefon paylaşımı veya güvenli indirme sunar. Basit sınıf listesi ve bazı tek-tık PDF'ler görsel sayfa taşır; etiketli/seçilebilir metin katmanlı birleşik PDF, genel gelişim raporu ve portfolyo/medya paketi tamam değildir. | teacher-owned belge testleri, gözlem paylaşım matrisi, Ek 18 PDF/DOCX QA; tagged PDF kapısı açık |
| Tarihsel paket kaynaklı plan PDF/DOCX çıktısı | `HIDDEN` | Eski kayıtlardaki plan, blok, not ve değerlendirme kaynak kimlikleri veri kaybetmeden PDF/DOCX'e girer; yeni kullanıcı akışında ayrı paket veya satın alma yolu yoktur. | persisted export read-model, içerik kaybı, mizanpaj ve mobil indirme testleri |
| MEB Ek 3 anekdot belgesi | `IMPLEMENTED` | Değişmez gözlem, ayrı öğretmen değerlendirmesi ve onaylı program bağları içerik mührüyle korunur; eksikte fail-closed, hazır kayıtta PDF/DOCX ve öğrenci dosyası izi üretilir. Portfolyoya otomatik eklenmez. | domain, exact-seal tamper, backup/restore, 390×844 indirme, PDF ve Word açılış QA |
| MEB Ek 18 aylık plan kontrol çizelgesi | `IMPLEMENTED` | Altı resmî sayfanın alan sırası kalıcı aylık plan hedeflerinden üretilir; üç eksenli değerlendirme açıkça ayrı öğretmen ekidir. Uzun metin taşmaz ve ekte kayıpsız korunur. | 7 sayfalık gerçek PDF render/source karşılaştırması, Word 7 sayfa/11 tablo ve telefon testleri |
| Analiz dışa aktarımı | `PARTIAL` | Öğretmen kontrollü metin dışa aktarımı vardır. Haricî AI hedefinde sınıftaki çocuk/yakın kimlikleri ve telefon varyasyonları temizlenir; kalan kimlik şüphesinde çıktı kapanır. Çok dosyalı MD+JSON+medya paketi tamam değildir. | `docs/AI_EXPORT_SPEC.md`, student-dossier gizlilik ve negatif sızıntı testleri |
| Bildirim/hatırlatıcı motoru | `SCHEMA_ONLY` | Kural ve kullanıcı yüzeyi tamamlanmadan bildirim vaadi gösterilmez. | permission, threshold ve offline testleri |
| Şifreli JSON yedek | `IMPLEMENTED` | Parolalı AES-256-GCM yedek, doğrulama ve atomik restore vardır. | backup/crypto/runtime testleri |
| Medya dâhil streaming ZIP yedek | `PLANNED` | Genel medya açılmadan tam ZIP yedek vaadi verilmez. | manifest/hash/boyut/kota/path traversal kapısı |
| Uygulama kilidi | `IMPLEMENTED` | PIN kullanıcı arayüzünü kilitler; cihaz ele geçirilmesine karşı at-rest kasa değildir. | auth/runtime testleri |
| Cihaz içi at-rest şifreleme | `PARTIAL` | Hassas öğrenci/veli alanları ayrı AES-256-GCM kasasında şifrelidir; plan, gözlem ve tüm eski koleksiyonlar henüz tek bir genel şifreli depoya taşınmış değildir. | hassas kasa testleri tamam; tüm depo için ayrı tehdit modeli ve anahtar yönetimi kararı açık |
| Google hesabı | `HIDDEN` | Hazırlık sözleşmesi vardır; gerçek OAuth, token veya veri yükleme yoktur. | BFF/OAuth/KVKK kararı |
| Bulut senkronizasyonu ve kurum rolleri | `PLANNED` | Yerel kullanımın ön koşulu değildir. | ayrı ürün hipotezi ve G4 kapısı |

## Geçerli kalite hükmü

### 0.19.0 — güncel otomatik doğrulama

`0.19.0`; eksik/geçersiz yaş bandında öneri üretimini fail-closed kapatır,
hassas öğrenci ve veli alanlarının kasa sözleşmesini genişletir, geçmiş kaynak
haftasının bugünün plan tarihini değiştirmesini önler ve sınıf kurulumu ile plan
adımlarındaki erişilebilirlik/reflow engellerini giderir.

`27 Ağustos 2026` tarihinde aynı kaynak üzerinde tam kanonik `quality:gate`,
çıkış kodu `0` ile tamamlandı. Otomatik doğrulanan kapsam şunlardır:

- özellik ve migration testleri `771/771`;
- kanonik runtime grupları `32/32`;
- Chromium/WebKit mobil smoke matrisi `54/54`;
- PWA sözleşmesi `10/10`;
- Sites güvenlik ve paket sözleşmesi `27/27`;
- production-offline PWA matrisi `3/3`;
- coverage: satır `91.40%`, dal `77.66%`, fonksiyon `93.26%`;
- production build içindeki `47` JavaScript parçasının her biri için kanonik
  gzip/chunk bütçesi `≤180 KiB`.

Bu sonuç, yukarıdaki otomatik sözleşmelerin ve regresyon kapılarının geçtiğini
kanıtlar; ürünün bütünsel veya mutlak `10/10` olduğu iddiası değildir. Fiziksel
iOS/Android paylaşma ve yazdırma sayfaları, VoiceOver/TalkBack, gerçek cihazda
büyütme ve tek elle parmak kullanımı, Emine Öğretmen sınıf pilotu, ayrıca okul
öncesi/TYMM uzman kurulunun içerik ve pedagojik kapsam kabulü ayrı saha ve insan
kanıtı olarak açıktır. Bu kanıtlar tamamlanmadan ilgili alanlara nihai saha veya
uzman kabulü verilmez.

### 0.18.0 — tarihsel kalite ve yayın kanıtı

`0.18.0`, MaarifOS'ta plan, hızlı gözlem, program bağlantısı, değerlendirme ve
belge hazırlama uyarılarını tek öğretmen dili altında birleştirir. Pedagojik
kaynak günü ile plan günü artık aynı işlemde eşlenir; hafta, hedef, çocuk
kapsamı, sınıf saati, akış süresi ve çıktı kapsamı engelleri nedenleriyle
görünür ve güvenli olanları tek dokunuşla düzeltilebilir. Ham çalışma zamanı
hataları ana öğretmen metni olarak gösterilmez; temizlenmiş teknik ayrıntı ve
destek kodu varsayılan olarak kapalıdır.

`27 Ağustos 2026` tarihinde aynı kaynak üzerinde kanonik `quality:gate` tek ve
kesintisiz çalıştırmada geçti. Özellik ve migration testleri; License API
`15/15`, PWA sözleşmesi `10/10`, Chromium/WebKit mobil smoke `54/54`, Sites
sözleşmesi `27/27` ve production PWA `3/3` yeşildir. Coverage satırda `%91,41`,
dalda `%77,63`, fonksiyonda `%93,29`dur. Typecheck, politika lint'i, 36 dosyalık
runtime bütünlüğü, production build ve 45 JavaScript parçasının her biri için
`≤180 KiB` gzip bütçesi geçti. Windows'ta derin `npm` zincirinin `PATH`
şişirmesi, 32 yaprak runtime grubunu sabit Node yürütücüsüyle sıralayan ve ilk
hatada duran kanonik çalıştırıcıyla giderildi.

Mobil kabul matrisi 320, 360, 390, 412 ve 430 piksel genişliklerde görünür ve
etkin bütün kritik hedefleri Chromium ve WebKit'te en az 44×44 piksel olarak
doğruladı. Plan oluşturma telefon testleri; kaynak haftasını/gününü, sınıf
saatini ve çocuk kapsamını tek dokunuşla düzeltip veriyi kaybetmeden kaydetmeyi
kanıtlar. Axe kapısı bu yeni uyarı ve düzeltme durumlarında da temizdir. Uzun
gözlem/çizim akışı her iki motorda tamamlanır; değerlendirme ve çıktı düğmeleri
işlemden önce kesin eksik kapsamı gösterir.

Bu tarihsel kanıt setinde tanımlı otomatik kapılar geçmiştir; bu kayıt ürünün
bütünsel veya mutlak `10/10` olduğu anlamına gelmez. Fiziksel iOS/Android
paylaşma sayfası, VoiceOver/TalkBack, tek elle gerçek parmak kullanımı ve Emine
Öğretmen pilot gözlemi otomasyonla ikame edilmez; bu dört saha kapısı ayrıca
açıktır.

Aynı doğrulanmış kurucu üretimi `3a38ebe4adca9207c3a52ae4c0b8b0cf074aab54`
Sites kaynak commit'iyle, yerel SHA-256 özeti
`e61d78ec47202cc2bc661e817ae52f3a46c58d154923257e616946227174bf96`
olan üretim arşivinden public sürüm `29` olarak yayımlandı. Sites içerik özeti
`sha256:b2c7eb88e99d5880e76776c1ca5eebc0a94e8ca38cc78d15d62d4cbba2af6d81`
ve dağıtım dosya sayısı `84`tür. Canlı manifest `0.18.0` sürümünü gösterir;
manifestteki `75/75` varlık boyut ve SHA-256 bakımından yerel üretimle eşleşir,
service worker yalnız `0.18.0` kimliğini taşır ve zorunlu güvenlik başlıkları
eksiksizdir.

Canlı üretim kabulü, Chromium ve WebKit'te `24 + 24 = 48/48` gerçek kullanıcı
akışıyla kesintisiz geçti. Davet kodu üç bağımsız profil ve beş telefon
genişliğinde kotasız çalıştı; kaynak–plan günü düzeltmesi, çizimden gözlem,
Axe, 44×44 dokunma hedefleri, aylık PDF ve yeniden yükleme doğrulandı. Üretim
paketi kaynak TypeScript modüllerini yayımlamadığı için üç geliştirme-sunucusu
iç testi canlı matristen ayrıdır; bunları da içeren yerel Chromium/WebKit smoke
matrisi son değişikliklerden sonra yeniden `54/54` geçti.

Bir sonraki paragraftan başlayan kalite hükmü, `0.15.0` sürümünün tarihsel
kanıtıdır.

Bir önceki `0.15.0`, MaarifOS'u ortak altı haneli davet koduyla kotasız açılan, ticari
üyelik ve cihaz yuvası kullanmayan kişisel öğretmen asistanına dönüştürür. Ana
ekran tek bir sıradaki işi ve en fazla iki hazırlanmış kısayolu gösterir. Plansız
hızlı gözlem her ana bölümden tek dokunuşla erişilebilir; çocuk seçimi ve çizimi
yalnız öğretmenin düzenleyip kaydedebileceği gözlem taslağına taşınır. Sınıf,
öğrenci, öğrenci numarası, T.C. kimlik numarası ve veli bilgileri; gerçek
yazdırma akışları, imza alanlı sınıf listesi, günlük/haftalık/aylık/yıllık plan
ve gözlem çıktılarıyla aynı yerel veri zincirindedir.

`22 Ağustos 2026` tarihinde aynı son kaynak üzerinde kanonik kalite kapısı
kesintisiz geçti: toplam `909` otomatik test çalıştırması, özellik/migration
`693/693`, License API `15/15`, PWA sözleşmesi `10/10`, Chromium/WebKit mobil
smoke `26/26`, Sites sözleşmesi `27/27` ve production PWA `3/3` yeşildir.
Coverage satırda `%90,92`, dalda `%77,46`, fonksiyonda `%93,16`dır. Kurucu
production derlemesindeki 39 JavaScript parçasının en büyüğü `170,00 KiB` gzip
ile `180 KiB` sınırının altındadır.

Son Türkçe/Unicode denetimi 352 kaynak dosyasında bağımsız doğrulayıcıdan
`0` hatayla geçti; kesin bulgu yoktur. 390×844 kaynak/uygulama karşılaştırması,
320×568 ve 430×932 etkileşim kontrolleri; tek satır karşılama, en az 44 piksel
dokunma hedefi, çalışan beş ana rota ve boş tarayıcı hata günlüğüyle `passed`
sonucuna bağlandı.

Aynı doğrulanmış kaynak `e65c0d0f27c24c58bec742dddf2b7c93058f2d1d`
commit'i olarak Sites kaynak deposuna gönderildi. Yerel SHA-256 özeti
`8b0acb047cdf7206afae2c345b361ed0cc1d459031c81b99440db638bd1ff620`
olan üretim arşivi, Sites içerik özeti
`sha256:a94dcf00137abc65330ae6cdbfe19ec372045356209d2a91153ecdfdf65901e6`
ve dosya sayısı `74` olan sürüm `26` olarak production'a başarıyla dağıtıldı.
Canlı HTML'nin çağırdığı 14 derlenmiş varlığın tamamı ile manifest ve service
worker yerel üretim çıktısıyla bayt düzeyinde eşleşti; service worker yalnız
`0.15.0` kimliğini taşıdı. Canlı erişim kapısı 320×568, 390×844 ve 430×932
boyutlarında taşmadan açıldı; demo/premium/cihaz hakkı metni ve tarayıcı konsol
hatası görülmedi. Worker kayıtlarındaki tek 404, QA'nın bilerek sorguladığı ve
üründe bulunması beklenmeyen `/version.json` yoludur; çalışma sonucu `ok`tur.

Bir sonraki paragraftan başlayan kalite hükmü, `0.13.0` sürümünün tarihsel
kanıtıdır.

`0.13.0`, Emine Öğretmen için kodsuz ve TYMM'ye özel üç adımlı ana deneyimi;
36–48, 48–60 ve 60–72 ay etkinliklerini; oyun, çizim, boyama, kes-yapıştır,
hareket, açık hava ve materyal araçlarını; öğrenci/veli kasasını; sınıf listesi,
plan ve gözlem çıktılarını aynı telefon akışında birleştirir. Çocuk modu
gözetimli, puansız, reklamsız ve tanısızdır. Plan ve gözlem belgelerinde okul,
sınıf ve öğretmen imza alanları tek kayıt kaynağından gelir.

`21 Ağustos 2026` tarihinde 0.13.0 için korunan runtime, typecheck, politika
lint'i, özellik/migration `676/676`, PWA sözleşmesi `10/10`, Sites sözleşmesi
`27/27`, License API `15/15` ve bundle bütçesi geçti. Coverage toplamı satırda
`%90,97`, dalda `%77,55`, fonksiyonda `%93,25`tir. Üretim PWA'sı ağsız ilk
Etkinlik Stüdyosu açılışı, 0.12.0→0.13.0 veri korumalı yükseltme ve kalıcı
profil ile soğuk çevrim dışı başlangıç senaryolarında `3/3` geçti. 40 JavaScript
parçasının en büyük gzip boyutu `161,73 KiB` ile `180 KiB` sınırının altındadır.

Türkçe/Unicode proje denetimi bağımsız doğrulayıcıdan geçti; kesin bulgu sayısı
`0`dır. Python golden vektörleri `166/166`, JavaScript golden vektörleri
`182/182` ve `tr-TR` locale kabiliyeti geçti. `PROBABLE` ve `CANDIDATE`
statik işaretler kesin hata sayılmadan bağlam incelemesinde tutulur.

Aynı doğrulanmış kaynak `03b92fddef547e042c09e3128ce77c99dde5525a`
commit'i olarak Sites kaynak deposuna gönderildi. 74 dosyalık yayın arşivinin
içerik özeti `sha256:0c927c90433df032fc5bbd812e7f09c002ae8de2d9e79e84b786fe8f33492928`
olan sürüm `25`, production'a başarıyla dağıtıldı. Canlı 320×568, 390×844 ve
430×932 kontrollerinde yatay taşma, 44 piksel altı görünür düğme, premium/kod
yüzeyi, lisans ağ isteği veya konsol hatası bulunmadı. Ana sayfa, üç resmî yaş
bandı, Etkinlik Stüdyosu, dokunmatik boyama, planlar, öğrenci ekleme ve çıktılar
canlı olarak açıldı; 0.13.0 güncellemesi mevcut cihaz verisini koruyarak
etkinleştirildi.

Bir sonraki paragraftan başlayan kalite hükmü, `0.12.0` sürümünün tarihsel
kanıtıdır.

`0.12.0` sürüm adayı; TYMM Okul Öncesi Eğitim Programı'nın üç resmî yaş
bandını tek kaynaklı öğretmen rehberinde görünür kılar ve yaşa bağlı çocuk
katılımını öğretmen gözetimli, puansız ve tanısız bir taslak akışına bağlar.
Resmî MEB içeriği ile MaarifOS'un özgün etkileşimleri ayrı iddia statüleriyle
taşınır; yaş sınırı ve nihai gözlem kararı öğretmende kalır.

`20 Ağustos 2026` tarihinde `0.12.0` için korunan mobil runtime, typecheck,
politika lint'i, `629/629` Node testi, PWA sözleşmesi `9/9`, Sites sözleşmesi
`26/26`, License API `15/15` ve bundle bütçesi geçti. Coverage toplamı satırda
`%90,82`, dalda `%77,16`, fonksiyonda `%93,12`dir. Kurucu production build'i
attestation ile üretildi; 31 JavaScript parçasının en büyük gzip boyutu
`166,11 KiB` ile `180 KiB` sınırının altında kaldı.

Aynı doğrulanmış kaynak, geçici ve ayrı Sites kaynak deposuna
`828f46a44d2bd15fd753bed479cf25f31e19c2f8` commit'i olarak gönderildi. Tek
opaque shell taşıyan, `dist/client/index.html` içermeyen arşivin yerel SHA-256
özeti `32dc3baa8d8cc96dcba9f736ec8da496074e94404cd222519674bd6157e2cbfd`dir.
Sites içerik özeti
`sha256:9f264409d3d39b12b3c900e5d59e5be8ddcc9164145e075ed189f42f43b28372`
ve dosya sayısı `64` olan sürüm `24`, production'a başarıyla dağıtıldı.

Canlı production adresinde üç resmî yaş sekmesi tek tek açıldı. Çocuk akışı
320×568, 390×844 ve 430×932 görünümde yeniden ölçüldü: üç seçim görünür,
dokunma hedefleri en az 56 px, yatay taşma yok, kısa dokunuş iki aşamalı
yetişkin doğrulamasını açıyor ve sistem geri hareketi çocuk yüzeyini kapatmıyor.
Aynı seçim iki kez aktarıldığında taslak 161 karakter ve tek tohum olarak kaldı;
öğretmen kaydetmeden değişmez gözlem oluşmadı. Bu tarayıcı kanıtı fiziksel
telefon, VoiceOver/TalkBack ve cihaz içi at-rest şifreleme kabulinin yerine
geçmez; gerçek çocuk verisiyle pilot bu kapılar kapanana kadar `NO-GO`dur.

Bir sonraki paragraftan başlayan kalite hükmü, `0.11.0` sürümünün tarihsel
kanıtıdır.

`0.11.0` sürüm adayı; premiumdan bağımsız öğretmen plan omurgasını, on bölümlü
günlük akışı, tek gerçek etkinlik, değişmez gözlem, öğretmen onaylı program bağı,
gün kapanışı, haftalık karar, önizlemeli belge ve şifreli geri yükleme zincirini
aynı ürün akışında birleştirir. Öğretmen plan kimlikleri artık sağlayıcı içerik
paketi işareti sayılmaz; gerçek premium paket bütünlüğü ise fail-closed kalır.

`16 Ağustos 2026` tarihinde güncel `0.11.0` çalışma ağacı bütünleşik
`npm run quality:gate` kapısından kesintisiz geçti. Kanonik 390×844 öğretmen
haftası; UI üzerinden 3 çocuk, 15 yoklama, 5 günlük plan, 50 günlük akış bölümü,
5 etkinlik, 5 değişmez gözlem, 5 öğretmen onaylı program bağı, 5 tam gün kapanışı,
haftalık değerlendirme, sonraki hafta kararı, PDF/DOCX, şifreli yedek, geçici veri
değişikliği ve atomik geri yüklemeyi tek senaryoda doğruladı. Ayrıca License API
15/15, PWA sözleşmesi 9/9, Chromium/WebKit smoke 10/10, Sites sözleşmesi 26/26 ve
production PWA yükseltme/offline matrisi 4/4 geçti.

`16 Ağustos 2026` tarihinde aynı kaynak commit'i
`c7401f7f25feb5b89782517b5f34745dc1ecf43a`, kurucu production profiliyle
yeniden üretilerek Sites sürüm `23` olarak production'a dağıtıldı. Yayımlanan
paketin Sites içerik özeti
`sha256:c6e65d7d32327cfc7a5913ae070f80f9dd64e786fb27e0152e460ead3b3db70a`
ve dosya sayısı `62`dir. Canlı kök/derin rota, hassas ve eksik yol matrisi,
service worker `0.11.0` kimliği ve HTML'nin çağırdığı 13 JS/CSS/görsel varlığın
yerel production build'iyle SHA-256 eşitliği doğrulandı. Temiz canlı tarayıcıda
`MaarifOS 0.11.0 hazır` ve `Şimdi güncelle` görünür; `0.10.0` artık güncel diye
sunulmaz. Bu otomatik/canlı tarayıcı kanıtı fiziksel telefonda öğretmen onaylı
güncelleme, yeniden açılış ve yerel veri korunumu kabulinin yerine geçmez.

Bir sonraki paragraftan başlayan kalite hükmü, `0.10.0` sürüm adayının tarihsel
kanıtıdır.

`0.10.0` kararlı sürüm adayı, `dbaa779` tabanı üzerinde hazırlanan profesyonel öğretmen
çalışma yüzeylerini ve gerçek PWA güncelleme durumunu kapsar. Bugün öğretmen kontrol
merkezi, Sınıfım görev alanı, plan ön koşulları ve hızlı gözlem zinciri geriye uyumlu
özellik artışı olarak sürüme alınmıştır. PWA; çalışan `0.9.1` worker'dan bekleyen
`0.10.0` worker'a sağlık denetimi, öğretmen onayı, `controllerchange`, reload ve
IndexedDB veri korunumu sırasını otomatik production testinde doğrular. Kurucu
aktivasyonu cihaz/depo/ağ/doğrulama aşamalarını güvenli destek kodlarıyla ayırır ve
geçici yerel yazma hatasında doğrulanmış erişimi korur. Bu satır
release hazırlık durumudur; production dağıtımı, tag'i veya GitHub Release'i tek
başına kanıtlamaz.

`9 Ağustos 2026` tarihinde güncel `0.10.0` çalışma ağacı bütünleşik
`npm run quality:gate` kapısından kesintisiz `324.3 s` içinde geçti. License API/D1
güvenlik matrisi 15/15, PWA sözleşmesi 9/9, kalıcı veri arayüzleri 7/7, eğitim yılı
ve öğretmen iş akışları 6/6, hızlı gözlem ve gelecek plan düzenleme 4/4, Chromium ve
WebKit mobil smoke 10/10, Sites güvenlik/paket sözleşmesi 26/26 ve gerçek production
PWA yükseltme/offline matrisi 4/4 yeşildir. Kurucu cihaz anahtarı iki tarayıcı motorunda
IndexedDB yeniden açılışı, imza öz sınaması, blocked ve versionchange koşullarıyla
doğrulandı. Bu kanıt fiziksel Emine telefonu kabulünün yerine geçmez; ikinci üretim
yuvası tüketilmeden cihaz üzerindeki tek canlı aktivasyon denemesi açık kabul kapısıdır.

Bir sonraki paragraftan başlayan dağıtım ve tüm kalite kapısı kanıtı, yayımlanmış
`0.9.1` sürümünün tarihsel kanıtıdır.

`9 Ağustos 2026` tarihinde 0.9.1 sürüm adayı bütünleşik `npm run test:quality`
kapısından `317.7 s` içinde geçti: MARİF ajan ve mobil giriş sözleşmeleri,
Founder License API/D1 güvenlik matrisi, korunan runtime, lint, typecheck, auth,
coverage, backup/restore, tüm runtime veri/UI akışları, PWA, production build,
bundle bütçesi, Chromium ve WebKit mobil smoke, Sites Worker ve gerçek service
worker ile çevrim dışı production PWA birlikte yeşildir. Lisans API 15/15,
PWA sözleşmesi 9/9, mobil belge/tam plan smoke 6/6, Sites 20/20 ve production
PWA 3/3 geçti. Ana başlangıç paketi gerçek tembel yükleme ile 173,22 KiB gzip'a
indi; 14 JavaScript parçasının her biri 180 KiB sınırının altındadır.

0.9.1 yaması, bekleyen service worker sağlık sorgusunu salt okunur hale getirir;
çalışan sürümün çevrim dışı cache'leri yeni sürüm etkinleşmeden temizlenemez.
Tamamlanma marker'ı yalnız HTML, manifest, ikonlar ve aynı-origin derlenmiş
JavaScript/CSS kaynakları başarıyla kurulduktan sonra yazılır. Noktalı/statik
görünümlü bilinmeyen rotalar çevrimdışıyken uygulama kabuğuna düşmez.

0.9.1, Sites production sürüm `21` olarak
`https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site` adresinde
yayımlandı. Dağıtım `appgdep_6a77e241f54881918c946550a5965597`, doğrulanmış
kaynak `db07e001cf10f3af06c3bed74a49b9e04d885565` ve 42 dosyalık arşiv karması
`sha256:36ca05609ac889957fb3ca199a4d63833b1f19a0a51236254eb01f4047bce3ea`
ile eşleşir. Canlı eski→yeni worker geçişinde güncelleme öncesi çalışan sürüm
“Çevrim dışı hazır” kaldı; etkinleştirme, derin bağlantı ve ikinci reload sonrası
0.9.1 hazır kaldı ve yeni uyarı/hata kaydı oluşmadı. Kök, derin uygulama rotaları
ve fail-closed 404 yanıtları beş güvenlik başlığını taşır. Canlı `sw.js` karması
yerel production çıktısıyla birebir
`13962fea3c5ce7bd4eae5486b94ab827858b3f0bc1ccaeb006a2279becc2da64`tır;
manifest ile altı gerçek JavaScript/CSS kaynağı da bayt düzeyinde eşleşir.
Sites assets-first yolu statik manifest/SW/JS/CSS yanıtlarına `_headers`
kurallarını uygulamadığından bu alt kaynaklarda başlık paritesi yoktur; doğru
MIME ve exact içerik karması korunmakla birlikte bu durum P2 barındırma
sertleştirmesi olarak açık kalır.

Canonical canlı Lisans API
`https://maarifos-founder-license-api.otonom-hesaplama.workers.dev` ve uzak D1
kabulünde iki bağımsız P-256 cihaz kimliği etkinleştirildi, üçüncü cihaz genel
403 yanıtıyla reddedildi ve seçili slot için operator reset doğrulandı. Bu kanıt
sunucu altyapısını kapatır; iki gerçek fiziksel telefonda kurulu PWA kabulü,
insan uzman kurulu ve öğretmen pilotu yerine geçmez.

- Korunan mobil runtime bütünlük kontrolü zorunludur.
- Domain, migration, backup, PWA, offline ve production build testleri tek kalite
  komutunda çalışmalıdır.
- Tek bir mega E2E senaryosunun süre sınırında geçmesi kaliteyi “tam yeşil”
  saydırmaz; test bölünmeli ve süre bütçesi ayrıca ölçülmelidir.
- CI yeşil olmadan sürüm etiketi veya pilot GO kararı verilmez.
- Menü etiketi ve doküman vaadi yalnız bu matristen türetilir.

## Tamamlananlar

1. Alan doğrulama hataları ile depolama bütünlüğü ve güvenlik hataları ayrıldı;
   yalnız bütünlük/güvenlik sınıfları küresel fail-closed açıyor.
2. Öğrenci üyeliği günlük yoklama kaydından ayrıldı; yeni üye, öğretmen o gün
   işaretleyene kadar devam sayısına girmiyor.
3. Eğitim yılı `active / preparation / ended` durumlarına ayrıldı; hazırlık ve
   bitmiş yıllarda pedagojik yazılar kapatıldı, boş sınıf metni düzeltildi.
4. Kalıcı depolama isteği, kota eşikleri, son başarılı şifreli yedek zamanı ve
   yedek hatırlatıcısı görünür kılındı.
5. Yoklama 2.0; günlük temel durum, giriş/çıkış, erken ayrılma, kısmi gün,
   mazeret/neden, öğretmen notu, geri alma, yeniden yükleme, öğrenci geçmişi ve
   şifreli yedek/restore ile N-1 uyumluluğunu birlikte tamamladı.
6. TypeScript, korunan runtime bütünlüğü, domain/migration, güvenlik, backup,
   PWA/offline, production build ve runtime akışlarını tek kanonik kalite kapısında
   toplayan CI temeli eklendi.
7. Hediye Alpha görünür kapsamı tek capability kaydına bağlandı; Google, portfolyo,
   PDF/belge, genel medya, bildirim ve bulut yüzeyleri gerekli kapılar kapanana kadar
   ana akıştan gizlendi.
8. Altı repository koleksiyonu `EntityMap` ile kesin tiplendirildi; koleksiyon bazlı
   fail-closed doğrulama ve bozuk kayıt negatif test matrisi eklendi.
9. TYMM katalog sürümü, kaynak kontrol tarihi ve içerik özetleri değişmez provenance
   snapshot'ında korunuyor; kaynak/katalog/sürüm etkisi ayrı sınıflandırılıyor.
10. Bugün ve Sınıfım gerçek tarayıcı rotalarına ayrıldı; geri/ileri, doğrudan URL,
    yenileme ve odak aktarımı testlendi. Sınıfım ayrı lazy chunk olarak yükleniyor.
    Plan oluşturma akışı da bağımsız dikey modüle taşındı; `Prototype.tsx` görev baz
    çizgisine göre 1.392 satır küçüldü.
11. Runtime akışları süre bütçeli parçalara bölündü; Chromium ve WebKit mobil smoke,
    Axe ciddi/kritik erişilebilirlik taraması, coverage eşikleri ve gzip chunk bütçesi
    kanonik kalite kapısına eklendi.

## Sonraki kapılar

1. Kalan `Prototype.tsx` orkestrasyonunu aynı davranış koruma yöntemiyle kurulum,
   ayarlar, gözlem ve öğrenci profili dikey dilimlerine ayır; her dilimi route veya
   kısa eylem sheet'i olarak açıkça sınıflandır.
2. Genel medya açılacaksa Blob/thumbnail/streaming ZIP temelini, kota ve restore
   tatbikatını aynı teslimde kur; bu kapı kapanmadan medya vaadini görünür yapma.
3. Gerçek çocuk verisi almadan önce kurumsal KVKK kararı, cihaz güvenliği,
   öğretmen pilot protokolü ve geri yükleme tatbikatını yazılı GO/NO-GO kapısına bağla.

## Güncelleme kuralı

Bir satır yalnız şu kanıtlarla üst duruma taşınabilir: mobil kullanıcı akışı,
kalıcılık, yedek/restore kapsamı, çevrim dışı sınır, Türkçe hata durumu ve geçen
test. Şema veya koleksiyon eklemek tek başına `IMPLEMENTED` sayılmaz.
