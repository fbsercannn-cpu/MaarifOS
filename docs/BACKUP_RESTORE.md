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
