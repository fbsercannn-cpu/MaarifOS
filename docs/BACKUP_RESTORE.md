# Yedekleme ve Geri Yükleme

## İlkeler

- Kullanıcı yedeğin gerçekten tamamlandığını anlayabilmelidir.
- Yedek biçimi sürümlü olmalıdır.
- Yedek dosyasının bozulup bozulmadığı kontrol edilmelidir.
- Geri yükleme geri alınabilir veya işlem öncesi otomatik güvenlik yedeği alınabilir.

## V11 resmî işlem ve oyun aile zinciri sözleşmesi

- `official-appointment-transition-v1` kaydı yerel görüşme hazırlığını, öğretmenin resmî sistemde gördüğü referansı ve exact önceki resmî işlem kimliğini ayrı tutar. Yerel randevu kendi başına resmî tamamlanma üretmez. Referans, tarih, öğretmen onayı, sınıf/yıl/çocuk ilişkisi ve dallanmayan olay geçmişi geri yüklemeden önce doğrulanır.
- `play-family-cycle-v1` kayıtları uygulama, yansıtma, aile önerisi ve aile geri bildirimi olaylarını append-only zincirde saklar. Materyal, uyarlama ve uygulama notu tamamlanmış etkinliğe; yansıtma seçilmiş değişmez ham gözlemlere; aile önerisi güncel bildirilmiş iletişim tercihine; geri bildirim exact öneriye bağlıdır. Hiçbir aşama otomatik puan veya beceri edinimi üretmez.
- Yeni iki kayıt türü mevcut `settings` koleksiyonunda saklanır; IndexedDB store migration'ı yoktur. V10 ve daha eski manifest etiketiyle bu kayıtlar kabul edilmez. Bozuk, yetim, çapraz çocuk/sınıf/yıl bağı veya dallanmış zincir hedef veritabanına yazılmadan bütünüyle reddedilir.
- V6–V10 eski yedeklerin payload ve checksum'u değiştirilmez; yalnız doğrulanmış manifest sürümü V11'e taşınır ve eksik yeni olay uydurulmaz. Yeni V11 yedeği eski uygulamaya geri yüklenemez; önce uygulama güncellenmelidir.
- `tests/core/recommendations-workflows-backup.spec.ts` gerçek IndexedDB üzerinde iki zinciri şifreli dışa aktarır, boş karşı kasaya geri yükler ve exact kaydı karşılaştırır. Aynı test V10'a geri etiketlenen yeni kaydı ve bozuk ilişkiyi atomik olarak reddeder; mevcut hedef kaydın değişmediğini doğrular.

## V8 öğretmen gözlem özeti sözleşmesi

- `settings` içinde `settingType: development-report` türü; çocuk/sınıf/yıl ve
  açık dönem kapsamını, öğretmenin seçtiği kaynak kimliklerini, değişmeyen ham
  gözlem kopyalarını, onaylı program hedefi/kaynak/destek snapshot'larını ve ayrı
  öğretmen değerlendirmesi/sonraki destek metnini korur.
- Taslak SHA-256 içerik mührü taşır. Açık onay ayrıca yerel öğretmen UUID'sini,
  UTC onay anını ve revision'ı mühürler. Bu yerel bütünlük denetimidir; dijital
  imza, resmî MEB/e-Okul onayı veya otomatik gelişim derecesi değildir.
- WebCrypto özeti IndexedDB işlemi dışında hazırlanır; yazma/onay işlemi içinde
  kaynak ve taslak yeniden okunup tam karşılaştırılır. Kaynak ya da revision
  değiştiyse işlem geri alınır. Onaylı kayıt düzenlenmez; yeni çalışma ayrı
  taslak olarak korunur ve yeniden açık onay ister.
- UI kaydetme isteği, öğretmenin ekranda gördüğü seçili gözlem snapshot'larını
  `expectedEvidenceSnapshots` ile iletir. Daha önce başka sekmede değişmiş
  kaynak da sessizce taslağa alınmaz. Gözlemin olay günündeki sınıf üyeliği
  doğrulanır; kaynağın bir başka çocukla ortak ham not olması kabul edilmez.
- Eski onaylı snapshot kaynak değişince silinmez. Yedek geçmişini kayıpsız taşır;
  rapor `stale` olarak görünür ve güncel kaynaklarla yeni öğretmen onayı olmadan
  PDF üretilemez. Sahte hedef/destek, yanlış çocuk/sınıf/dönem, bozuk içerik mührü
  ve bilinmeyen alanlar restore öncesi reddedilir.
- V1–V7 yedekleri okunur. V6/V7→V8 yalnız manifest sürümünü yükseltir; payload,
  UUID ve checksum aynen korunur. Eski gözlemlerden rapor veya onay uydurulmaz.
  V8 rapor kaydı V7 etiketiyle sunulamaz; eski uygulama güncellenmelidir.
  Var olan `settings` store kullanıldığından IndexedDB store migration'ı yoktur.
- `tests/core/development-report-backup.spec.ts`, gerçek IndexedDB üzerinde
  taslak/onay round-trip, V1–V7 kayıpsız okuma, tahrif, eski onayın korunması ve
  kimlik+onay atomik rollback'ini doğrular.

## V7 Maarif gelişim gözlemi sözleşmesi

- V7, mevcut `settings` taslağı ve `observations` kanıtına isteğe bağlı
  `developmentSelection` ekler. Ayrı `evidenceCurriculumLinks` kaydı öğretmen
  onayını, kanonik `targetSnapshot` alanını, kaynak sayfasını ve SHA-256 özetini
  korur. Anlık gözlem planına hedef veya planlı öğrenci ataması eklenmez.
- Ham öğretmen metni, olay sırasındaki destek bağlamı ve program kaynağı ayrı
  kalır; seçimden başarı puanı, gelişim hükmü veya dönem değerlendirmesi üretilmez.
- V1–V6 yedekleri okunmaya devam eder. V6→V7 yükseltmesi yalnız manifest
  sürümünü değiştirir; payload, UUID'ler ve özgün checksum değişmez. Eski
  gözlemlere kendiliğinden seçim veya program bağı eklenmez.
- V7 alanları V6 veya daha eski manifest etiketiyle sunulamaz. V7 yedeğinin eski
  uygulamaya geri yüklenmesi desteklenmez; yedeğin bulunduğu cihazdaki uygulama
  güncellenmelidir. Bu değişiklik yeni IndexedDB store veya veritabanı migration'ı
  gerektirmez.
- Seçim ile kaynak gözlem uyuşmazlığı, sahte kaynak snapshot'ı, uydurma
  `plannedTargetId` ve programsız kısmi kayıt restore öncesinde reddedilir.
  `tests/core/development-observation-backup.spec.ts` gerçek IndexedDB üzerinde
  taslak ve final round-trip, kaynak tahrifi, V6 yükseltmesi ve atomik rollback'i
  doğrular.

## Alpha JSON yedek sözleşmesi

Medya arşivli ZIP aşamasından önce Alpha sürümü, aynı güvenilirlik kurallarını
uygulayan tek bir sürümlü JSON zarfı kullanır. Zarf; `format`, `manifest`,
`collections` ve bütün koleksiyon verisini kapsayan SHA-256 `checksum` alanlarını
taşır. Manifest en az yedek biçimi sürümünü, uygulama sürümünü, UTC oluşturma
zamanını, `Europe/Istanbul` sivil tarihini ve koleksiyon kayıt sayılarını içerir.

- Dosya ayrıştırılmadan ve şema doğrulanmadan veritabanına yazılmaz.
- SHA-256 bütünlük doğrulaması başarısızsa hiçbir kayıt değiştirilmez.
- `replace` geri yüklemesi bütün hedef koleksiyonları tek IndexedDB işlemi içinde
  temizler ve doldurur; işlem hatasında tarayıcı işlemi bütünüyle geri alır.
- `merge` modunda aynı UUID ve aynı içerik atlanır. Aynı UUID ve farklı içerik
  sessizce üzerine yazılmaz; çakışma raporuna eklenir.
- Eski prototipin UUID olmayan kimlikleri ilk açılışta UUID'ye taşınır ve
  öğrenci-gözlem ilişkileri yeniden bağlanır. Öğrencisi bulunamayan ham gözlem
  silinmez; `requiresStudentReview` ve `legacyStudentId` ile inceleme için
  karantinada korunur.
- Tanınmayan koleksiyon, eksik zorunlu alan, desteklenmeyen sürüm veya kayıt sayısı
  uyuşmazlığı öğretmenin anlayacağı Türkçe hata ile reddedilir.
- Aynı yedeğin tekrar yüklenmesi mükerrer kayıt üretmemelidir.
- Yoklama kayıtlarında durum, `studentId`, UTC zamanlar ve İstanbul sivil günü
  doğrulanır; bilinmeyen öğrenciye bağlı yoklama restore edilmeden reddedilir.
- Günlük yoklama geçmişi ve tarihe bağlı tamamlanma ayarı diğer koleksiyonlarla
  birlikte aynı checksum ve atomik restore kapsamındadır.
- Yoklama `events` dizisindeki giriş, çıkış, erken ayrılma, kısmi gün ve mazeret
  olayları; UTC zaman, İstanbul sivil günü, neden ve öğretmen notuyla aynı şifreli
  checksum kapsamındadır. Olay alanı bulunmayan N-1 kayıtlar geriye uyumlu okunur;
  bozuk olay içeren yedek hedef veritabanına yazılmadan bütünüyle reddedilir.
- Öğrenciye özel hızlı gözlem taslakları `settings` koleksiyonunda; gözlem türü,
  nötr kategoriler, ham metin, bağlam ve çocuğun özgün sözü ise gözlem kaydıyla
  aynı sürümlü checksum kapsamında korunur. Restore öncesinde taslağın
  öğrenci-plan-etkinlik-sınıf ilişkileri doğrulanır.
- Seçili çocuklara toplu hızlı gözlemde öğrenci başına ayrı taslak ve ayrı
  gözlem korunur. Ortak `batchId` UUID'si ile `captureScope:
  selected-children` birlikte bulunmak zorundadır; eksik veya bozuk toplu
  metadata hedef veritabanına yazılmadan reddedilir.
- Eğitim yılına bağlı sınıf programı ve kalıcı çalışma düzeni `classrooms`
  koleksiyonunda yedeklenir. Restore öncesinde `academicYearId` bağı doğrulanır;
  kopuk sınıf kaydı hiçbir koleksiyona yazılmadan reddedilir.
- Checksum her zaman dosyadaki özgün payload üzerinde doğrulanır. Bütünlük
  doğrulamasından sonra eski kapsamsız kayıtlar bellekte dönüştürülür: tek
  sınıfta atanır, çok sınıfta kesin öğrenci ilişkisi yoksa `needs-review`
  karantinasına alınır. Bu dönüşüm doğrulanmadan hedef veritabanına yazılmaz.
- Öğrenci-sınıf, yoklama-öğrenci-sınıf ve gözlem-öğrenci-sınıf ilişkileri ile
  etkinlik, plan ve günlük yoklama ayarlarının sınıf/eğitim yılı kapsamı birlikte
  doğrulanır. Çapraz sınıf bağı geri yükleme başlamadan reddedilir.
- Veri şeması V3; `evidenceCurriculumLinks`, çok yıllı öğrenci üyelikleri, ayrı
  ad-soyad görünümü ve D1
  kanıt grafını taşır. V1 yedeğin özgün checksum'u önce doğrulanır, eksik yeni
  koleksiyon bellekte eklenir ve yalnız ardından V3 ilişkileri doğrulanır.
- Plan → etkinlik → değiştirilemez ham gözlem → ayrı öğretmen onayı → kaynaklı
  değerlendirme taslağı zinciri restore başlamadan bütün olarak doğrulanır.
- Arşivlenmiş yılda etkin öğrenci üyeliği veya canlı aktif-sınıf ayarı bulunamaz.
- Merge sırasında cihaz + yedek birleşik aday snapshot'ı önce ilişki
  doğrulamasından geçer; bağımlı D1 grafı kısmi ve kopuk yazılmaz.

Alpha JSON zarfı tam ZIP yedeğinin yerini kalıcı olarak almaz. Medya eklendiğinde
aynı manifest ve bütünlük ilkeleri ZIP içindeki `manifest.json`, veri dosyaları ve
medya checksum listesine taşınacaktır.

## Tam yedek

```text
maarifos-backup-YYYY-MM-DD.zip
  manifest.json
  database/
    academic-years.json
    classrooms.json
    students.json
    attendance.json
    observations.json
    activities.json
    plans.json
    reports.json
    settings.json
  media/
  thumbnails/
  checksums.json
```

## Şifreleme

İsteğe bağlı parola ile cihaz üzerinde şifreleme. Parola uygulama tarafından saklanmamalıdır. Parola unutulursa yedeğin açılamayacağı açıkça anlatılmalıdır.

## Geri yükleme modları

- Tümünü değiştir
- Mevcut veriye birleştir
- Yalnızca seçili eğitim yılı
- Yalnızca seçili öğrenci

## Çakışma çözümü

- Aynı UUID ve aynı içerik: atla
- Aynı UUID ve farklı içerik: kullanıcıya göster
- Farklı UUID ve muhtemel kopya: uyar

## Test senaryoları

1. Boş uygulamaya tam geri yükleme
2. Aynı yedeği iki kez yükleme
3. Eksik medya dosyası
4. Bozuk ZIP
5. Yanlış parola
6. Eski şema sürümü
7. Çok büyük medya arşivi
8. İşlem sırasında uygulamanın kapanması
9. JSON checksum uyuşmazlığı ve mevcut verinin değişmeden kalması
10. Kayıt sayısı uyuşmazlığı ve mevcut verinin değişmeden kalması
11. `replace` sırasında yazma hatası ve işlemin tamamının geri alınması
12. `merge` sırasında aynı UUID/farklı içerik çakışma raporu
13. İki farklı sivil gündeki yoklamanın JSON round-trip sonrasında ayrı kalması
14. Bilinmeyen öğrenciye bağlı yoklamanın hiçbir veriyi değiştirmeden reddedilmesi
15. Sabahçı/öğleci/tam gün/özel saat düzeninin JSON round-trip sonrasında aynen kalması
16. Bilinmeyen eğitim yılına bağlı sınıf kaydının hiçbir veriyi değiştirmeden reddedilmesi
17. Tek sınıflı eski yedeğin kapsam ataması sonrasında ham içeriği koruması
18. Çok sınıflı eski yedekte belirsiz kayıtların silinmeden karantinaya alınması
19. Öğrencisiyle sınıf kapsamı uyuşmayan yoklama ve gözlemin hedefi değiştirmeden reddedilmesi
20. V1/V2 JSON yedeğin özgün bütünlük özeti doğrulandıktan sonra V3'e güvenli yükseltilmesi
21. D1 kanıt grafının kimlik, ham metin, öğretmen onayı ve pending taslakla round-trip yapması
22. Arşivlenmiş yıl + yeni yıl üyeliklerinin tek kalıcı öğrenci kimliğiyle round-trip yapması
23. Canlı öğrenci taslağı ile tamamlanmış hızlı gözlemin ham metin, bağlam,
    çocuk sözü, tür ve kategorilerle round-trip yapması
24. Final gözlem yazımı başarısız olduğunda ilgili öğrenci taslağının etkin kalması
25. Yoklama olaylarının şifreli JSON round-trip sonrasında saat, neden ve öğretmen
    notunu aynen koruması
26. Olay alanı olmayan N-1 yoklama kaydının geriye uyumlu kabul edilmesi
27. Bozuk yoklama olayı içeren yedeğin hedef veriyi değiştirmeden reddedilmesi
