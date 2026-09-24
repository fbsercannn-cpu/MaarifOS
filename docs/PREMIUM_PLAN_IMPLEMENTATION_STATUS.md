# Premium Yıllık Plan · Uygulama Durumu

> **Kanonik kapsam notu (8 Ağustos 2026):** Aşağıdaki bölüm mevcut çalışan dikey dilimi anlatır; nihai ürün kapsamı değildir. Bağlayıcı hedefler için [`MAARIFOS_V1_KANONIK_URUN_SARTNAMESI.md`](./MAARIFOS_V1_KANONIK_URUN_SARTNAMESI.md), içerik üretimi için [`TYMM_2024_2026_2027_YILLIK_PLAN_OMURGASI.md`](./TYMM_2024_2026_2027_YILLIK_PLAN_OMURGASI.md) geçerlidir.

**Tarih:** 8 Ağustos 2026
**Durum:** `INTERNAL REFERENCE · INTERNAL PILOT · NOT FOR SALE`

## Çalışan ilk dilim

- SKU: `TYMM-6072`
- Dönem: 7–30 Eylül 2026
- İçerik: dört hafta × iki ana + bir alternatif olmak üzere 12 özgün etkinlik, 10 bloklu tam gün akışı ve Eylül–Haziran yıllık omurga
- Yaklaşım: altı pilot lens arasındaki öğretmen tercihi plan katmanlarında
  `teacherPreferredLensId`, `teacherPreferredSupportingLensIds` (en fazla iki)
  ve `lensSelectionMode: preference_only` alanlarıyla saklanır. Etkinlik
  şablonunun `primaryLensId` ve `supportingLensIds` alanları yazara ait değişmez
  authored lens bilgisidir. Tercih değişikliği mevcut etkinlik metnini, çevre
  düzenini, materyali veya yetişkin rolünü otomatik dönüştürmez; uygulanmış
  yöntem, Montessori/Orman Okulu uygulaması ya da sertifika iddiası değildir.
  Eski plan `primaryLensId`/`supportingLensIds` alanları yalnız legacy
  uyumlulukla okunur ve yeni plan yazımında kullanılmaz.
  Tercih panosundaki güncelleme sonraki günlük seçimler içindir; daha önce
  oluşturulmuş günlük plan ve etkinlik, oluşturulma anındaki tercihi aynı
  tarihsel snapshot olarak korur ve sessizce yeniden yazılmaz.
- UI: Bugün ekranından yalnız geliştirme bayrağıyla açılan Plan Kütüphanesi
- Veri sözleşmesi ve servis zinciri: annual → monthly → weekly → daily → activity → raw observation → teacher evaluation → next-plan decision. Haftalık değerlendirme ekranı yalnız ilgili haftanın değişmez ham gözlemlerini kabul eder; karar sonraki haftanın öğretmen inceleme bağlamına taşınır.
- Öğretmen kontrolü: önerilen tarih otomatik gelir; tarih, hedefler, başlık ve saatle birlikte 10 bloğun süresi, uygulama durumu, geçiş notu ve öğretmen notu günlük plana aktarılmadan önce düzenlenebilir
- Alternatif ilkesi: haftalık kapasite tam `2 ana + 1 alternatif`tir; alternatif aday olarak görünür, açıkça etkinleştirilmeden uygulanmış etkinlik sayılmaz ve ana etkinlik gibi doğrudan başlatılamaz. Öğretmen alternatifi seçtiğinde hangi ana etkinliğin yerine geçtiği, kaynak ana etkinlik ve fiilen uygulanan etkinlik ayrı snapshot'larla kaydedilir; önerilen TYMM hedefleri alternatife göre yenilenir ve öğretmen kaydetmeden önce düzenleyebilir.
- Hazırlık dönemi: öğretmen gelecek tarihli premium planı eğitim yılı başlamadan hazırlayabilir; etkinlik ve gözlem plan gününden önce başlatılmaz
- Güven sınırı: etkinlik metni `app/src` ve üretim Vite bundle’ında bulunmaz
- Yedek: yıllık, aylık, haftalık ve günlük kayıtlar, öğretmenin 10 blok düzenlemeleri, kaynak/uygulanan etkinlik snapshot’ları, açık alternatif değiştirme ilişkisi ve birikimli haftalık değerlendirmeler temiz geri yüklemede korunur; bozuk blok sırası, rol dağılımı, alternatif ilişkisi, gözlem bağı veya premium kaynak ilişkisi yazma başlamadan reddedilir
- Çıktı politikası: denemede PDF/Word kapalıdır. Seçili paket kimliği ve sürümüyle eşleşen satın alma veya STAFF erişimi gerçek `.pdf` ve `.docx` üretir. DOCX UTF-8 OpenXML paketidir; PDF Türkçe karakterli A4 sayfaları cihaz içinde üretir. Geliştirme pilotunda dosya imzaları ve mobil indirme sınanır; üretimde doğrulanmış entitlement bağlanana kadar çıktı düğmeleri kapalıdır.
- Premium erişim istemcisi: ES256 imza; issuer/audience, cihaz parmak izi, exact SKU/release/paket/sürüm/manifest, 72 saatlik deneme, iptal nesli, çevrimdışı son tarih ve saat geri alma denetimleri uygulanır. Her kurulum, etkinlik ve çıktı işlemi anında exact paket ve karar süresi yeniden kontrol edilir.
- Cihaz bağı: ayrı lisans veritabanında tekil ve kalıcı, çıkarılamaz P-256 private key üretilir; public JWK parmak izi doğrulanır. Kod/deneme isteği exact şemalıdır ve kısa ömürlü challenge için cihaz sahipliği ispatı üretebilir.
- Veri ayrımı: entitlement tokenı, ham kod, kurtarma sırrı ve cihaz private key'i normal/şifreli öğretmen yedeğinin parçası değildir.

## Eylül `content.v3` · teknik değerler dilimi

- Kanonik kimlikler: paket `maarifos-tymm-6072-2026-2027-v3`, sürüm `3.0.0`, yayın `tymm-6072-2026-09-v3`.
- Eylül paketindeki 12 etkinliğin 12'si de `valuesDesign` sözleşmesiyle eşlenmiştir. Bu eşlemeler, TYMM Ek-14 kataloğundan alınan toplam 36 tam ve kaynak sayfası izlenebilir resmî eylem snapshot'ı içerir.
- Paket, değerler katmanını Saygı (`D14`) – Sorumluluk (`D16`) – Adalet (`D1`) çatısı altında taşır; her etkinlikte birincil değer, çatı bağları, destekleyici değerler, ikilem, yetişkin modeli, çocuk öznesi, onarım yolu, gözlem/karşı kanıt/sonraki adım ve kaynak adayı bulunan kültürel bağlam birlikte snapshot'lanır. Yirmi kültürel kullanımın tamamı `draft` durumundadır; özellikle R6 kültür/ilahiyat incelemesi dâhil R1–R6 kararları tamamlanmadan `verified` sayılamaz.
- `manifest.v3` önizleme kapısı; manifestin ham UTF-8 SHA-256 özeti ile `content.manifestDigest` bağını, `manifestDigest` alanı çıkarılmış kanonik içerik payload'ının SHA-256 özetini ve bayt uzunluğunu, anayasa ile Ek-14 katalog kaynak özetlerini ve önceki `content.v2` ham dosya özetini kopyalamadan önce doğrular. Herhangi bir uyuşmazlık paket kabulünü durdurur.
- `content.v2` geriye dönük olarak değiştirilmemiştir: ham dosya SHA-256 değeri `f096c3d98990796c11e4b72747458248e2fd7a530dd54102acba9ddea996d8e5` olarak sabitlenmiştir. V2 kayıtları `legacy-unmapped` ve `valuesDesign: null` olarak okunur; geçmiş içeriğe sonradan değer eşlemesi icat edilmez.
- Teknik durum `machine_validated_pending_human_review` seviyesindedir. Bu,
  yayımlanmış içerik veya öğretmen onayı anlamına gelmez. İnsan incelemesi şu
  kanonik sıradaki altı rol tamamlanmadan yayın statüsü verilemez: erken çocukluk
  eğitimi (`early-childhood-education`), okul öncesi uygulayıcı öğretmen
  (`practicing-preschool-teacher`), çocuk hakları ve koruma
  (`child-rights-and-safeguarding`), TYMM program uzmanlığı
  (`tymm-curriculum`), içerik ve Türkçe dil editörü
  (`content-and-language-editor`), Türk-İslam kültürü/ilahiyat ve çoğulculuk
  sınırı (`turkish-islamic-culture-and-theology`).
- Tek aylık Eylül paketi, `D1–D20` değerlerinin dönem boyunca dengeli ve yeterli kapsandığını kanıtlamaz. Bu kanıt, Eylül–Haziran yayın seti üzerinde ayrıca yürütülecek dönem kapsam kapısına aittir.
- Ham gözlemden değer puanı, hüküm veya kanıt bağı otomatik üretilmez. Veritabanı `v5` içindeki ayrı `valueEvidenceLinks` koleksiyonu; yalnız tek çocuklu değişmez ham gözlemi, uygulanmış etkinliğin resmî değer eylemine öğretmenin açık onayıyla bağlar. `supports`, `contrasts` ve `context_only` rolleri, düzeltme/tombstone geçmişi, yerel öğretmen aktörü, kanonik snapshot özeti ve yedek/geri yükleme kapıları uygulanmıştır. İnanç/ibadet performansı, ahlak puanı, rozet, sıra ve kalıcı karakter hükmü fail-closed reddedilir.
- Haftalık kanıt özeti ve öğretmen yansıtması da aynı puan–karakter–inanç güvenlik çekirdeğinden geçer; yasak metin sonraki haftaya veya yedeğe taşınamaz.
- Öğretmen değer kanıtı editörü boş başlangıç, açık hedef/rol seçimi, ikinci onay, düzeltme, kaldırma ve tarihsel kayıt görünürlüğüyle çalışır. Otomatik değer bağı veya skor üretmez.

## Bilinçli olarak kapalı

- Üretimde `premiumPlanCenter` kabiliyeti `false`
- Satış, 72 saatlik deneme ve fiyat gösterimi kapalı
- Kod kullanma arayüzü ve lisans servisi henüz bağlanmadı
- Atomik kod tüketimi, tek kullanımlık challenge otoritesi, hesap/yıl deneme kaydı, cihaz transferi, App Store/Play Store makbuz doğrulaması ve KMS imza servisi henüz kurulmadı
- İmzalı/şifreli premium içerik yayın artefaktı henüz tamamlanmadı
- EÇE/2024 paketleri katalog tamamlanana kadar satış engelli
- Eylül `content.v3`, altı rollü insan incelemesi tamamlanmadan yayınlanamaz
- Eylül–Haziran için iki dönem/on ay/108 etkinliklik authored hedef profili ve
  Ekim `planned_reference_blueprint` strict plan sözleşmesi testlerinden geçer;
  bu gelecek aylara release statüsü vermez. Ekim–Haziranın
  gerçek içerik dosyaları ile bunları tek zincirde doğrulayacak release-set
  manifesti üretilmediği için `D1–D20` dönem yayın kapısı henüz tamamlanmadı

## Geliştirme önizlemesi

Yerel geliştirmede `?premiumPilot=1` sorgusu pilot ekranı açar. `npm run dev` öncesinde dışarıdaki kanonik içerik, git tarafından izlenmeyen `premium-preview-cache` dizinine kopyalanır. Bu yol üretim build’ine yüklenmez ve gerçek entitlement yerine geçmez.

## Kanıtlanan kalite kapıları

- Eylül `content.v3` için manifest/kaynak zinciri, katı codec, 12 etkinliklik değer haritası, alternatif snapshot bütünlüğü, yedekten anlamsal geri yükleme ve değerler görünürlüklü çıktı senaryolarının hedefli testleri geçti.
- Önceki premium dikey dilimin typecheck, politika lint’i, yedek/runtime, mobil Playwright, PDF/DOCX ve üretim bundle kapıları kanıtlıdır.
- `STATUS.md` içindeki 8 Ağustos bütünleşik kalite hükmü Eylül v3,
  premium/v5 ve runtime zincirinin yanında yıllık authored profil,
  insan-inceleme sözleşmesi ve Ekim frozen referans blueprint'ini de kapsayan
  son ortak `quality:gate` tekrarıyla yenilenmiştir. Runtime, lint, typecheck,
  auth, coverage, yedek, PWA, production build, bundle, Chromium/WebKit mobil
  smoke, Sites ve çevrim dışı production PWA kapıları birlikte geçmiştir.

## Sonraki zorunlu dilim

Değerler öncelikli sırada önce Eylül `content.v3` için altı rollü insan incelemesi yürütülecek; kültürel kaynak adayları R6 ve diğer rollerce tek tek doğrulanacak veya revizyona gönderilecektir. Altı rol kararını içerik ve kaynak özetlerine bağlayan değişmez teknik sicil hazırdır fakat gerçek uzman kararı içermez. Ardından Ekim–Haziran gerçek aylık içerikleri üretilecek; authored yıllık hedef profili bu artefaktlardan türetilen tek release-set manifesti üzerinde yeniden doğrulanacak ve sınırlı öğretmen pilotunda değer kanıtı akışının sahada anlaşılabilirliği sınanacaktır. Teknik `valueEvidenceLinks`/veritabanı `v5` dilimi tamamlanmıştır; insan onayı veya dönem kapsamı yerine geçmez.

Ticari hazır oluş tarafında gerçek `license-api` üzerinde tek kullanımlık STAFF kodunun atomik tüketimi, challenge replay/amaç kontrolü, hesap ve eğitim yılı başına tek deneme, tek aktif cihaz transferi, mağaza makbuzu doğrulaması, KMS imzası ve iptal nesli tamamlanacaktır. Ardından imzalı/şifreli içerik yayını ve gerçek Safari/iOS ile Android cihaz kabul testi yapılacaktır. Sonraki belge kalite adımında PDF için aranabilir metin/erişilebilirlik katmanı, DOCX için yerel liste-sayfa alanları ve secretsiz çıktı makbuzu değerlendirilecektir. Bu kapılar geçilmeden 3 günlük deneme veya ücretli satış açılmayacaktır.
