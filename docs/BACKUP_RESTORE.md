# Yedekleme ve Geri Yükleme

## İlkeler

- Kullanıcı yedeğin gerçekten tamamlandığını anlayabilmelidir.
- Yedek biçimi sürümlü olmalıdır.
- Yedek dosyasının bozulup bozulmadığı kontrol edilmelidir.
- Geri yükleme geri alınabilir veya işlem öncesi otomatik güvenlik yedeği alınabilir.

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
- Veri şeması V2; `evidenceCurriculumLinks`, çok yıllı öğrenci üyelikleri ve D1
  kanıt grafını taşır. V1 yedeğin özgün checksum'u önce doğrulanır, eksik yeni
  koleksiyon bellekte eklenir ve yalnız ardından V2 ilişkileri doğrulanır.
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
20. V1 JSON yedeğin özgün checksum sonrasında V2'ye güvenli yükseltilmesi
21. D1 kanıt grafının kimlik, ham metin, öğretmen onayı ve pending taslakla round-trip yapması
22. Arşivlenmiş yıl + yeni yıl üyeliklerinin tek kalıcı öğrenci kimliğiyle round-trip yapması
