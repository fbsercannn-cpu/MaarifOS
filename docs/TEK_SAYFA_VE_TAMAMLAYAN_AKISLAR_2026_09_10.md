# Tek sayfa sınıf listesi ve tamamlayan akışlar — 0.40.0

Yerel uygulama geliştirmesi; gerçek çocuk verileri testlerde kullanılmadı.

## Yapılanlar

- Sınıf listesi varsayılanı tek sayfalık yatay A4; okul/sınıf anteti, 12 seçilmiş sütun ve öğretmen imza bandı. Üçüncü kişi mesleği bu amaçta bulunmaz. PDF ve kaynağa bağlı Excel aynı kapsamı kullanır; önceki günlük/iletişim/ayrıntılı düzenler korunur.
- Hazır öğretmen adımları gerçek kaynakları göstererek destek takibini gelecek haftaya taşır, yeni gözlem takibi açar veya kapatır. Gözlem odağı gerçek çocuk ve günlük plan/etkinlik kimlikleriyle saklanır. Aile görüşmesi gerçek uygun saate yerel hazırlık kaydı oluşturur; davet ayrıca PDF olarak hazırlanır.
- Sınıf listesi önizlemesi aynı öğrenci, alan, dönem ve düzenle güncel kaynaktan yenilenir. PDF sürümleri yerel veride saklanır, yedeğe girer ve ilgili çocuk kalıcı silinirse bağlı sürümler temizlenir.
- Belgeler'deki Ay sonu dosyam seçilen aya ait planlar ve değerlendirmeleri PDF/Word olarak ZIP'e koyar. İstenirse saklanan PDF sürümleri seçilerek eklenir. İçindekiler dosyası üretilir; kaynak değişirse eski ve yeni kayıtlar karıştırılmaz.

## Yeni geliştirme önerileri

1. **Haftalık masa planı:** yatay A4, beş gün sütunu; her gün karşılama, ana etkinlik, açık hava, gözlem odağı ve malzeme. Öğretmen masasında tek bakışta kullanılacak baskı.
2. **Aylık duvar takvimi:** yatay A4/A3, gerçek planlardan tarih hücreleri; etkinlik adı, özel gün, aile katılımı. Boş tarihe dokununca uygun kayıtlı etkinlik seçenekleri.
3. **Tek sayfalık öğrenci özeti:** üstte kimlik/iletişim, ortada son gerçek gözlemler ve bağlı alanlar, altta süren destek ve sıradaki tarih. Özel bakım ayrıntıları ayrı seçilebilir bölüm.
4. **Görüşme hazırlık ve sonuç formu:** solda kaynaklı gündem, sağda görüşmede alınacak notlar; altta aile/öğretmen görevleri ve sonraki görüşme tarihi. Kaydet seçimi takip kayıtlarını oluştursun.
5. **Amaçtan belgeye:** “İdareye vereceğim”, “Masamda kullanacağım”, “Aile görüşmesine götüreceğim” seçenekleriyle uygun alan, sayfa ve imza düzeni hazır gelsin; son kapsam görünür kalsın.

## Kabul

- 1.339/1.339 özellik testi; tür kontrolü ve politika lint'i geçti.
- 21/21 bütünleşik tarayıcı senaryosu: mevcut PDF önizleme/search/export korumaları, gerçek ZIP, kapatılan/devre dışı panelde indirme iptali, belge güncelleme/geçmiş/yedek/kalıcı silme.
- Derlenmiş sürümde 320 px ve internet kapalıyken dört düzenin gerçek PDF/Excel indirmesi geçti.
- Hazır öğretmen adımları: 5 yeni birim, 3 bileşen, 3 gerçek IndexedDB testi; işlem geri dönüşü, tekrar tıklama, aynı haftayı kullanma, şifreli yedek ve kalıcı öğrenci silme.
- Microsoft Excel COM baskısı normal 30 ve uzun 15 öğrencide 1/1 yatay A4, 0 formül hatası. Native PDF'de 333/333 ve 168/168 kaynak değer bulundu. İlk baskıda görülen satır kesilmesi gerçek shrinkToFit/ölçülen satır yüksekliğiyle düzeltildi; yetkili native kanıt v2 dosyalarıdır.
- PDF uzun adlar için dengeli iki satır kullanır; 30 öğrenci üstü veya aşırı sıkışan içerik sessizce kesilmez. Seçilmeyen hücreler bilgi taşımaz. Ayrıntı isteyen hazır seçimler bütün alanları koruyarak klasik çizelgeye geçer.
- Derleme, 147 JavaScript parçası paket bütçesi, 36 korunan dosya ve 3 çalışma zamanı kilit testi geçti.

## Örnek dosyalar (tamamı kurgu)

[30 öğrencilik tek sayfa PDF](../app/output/class-roster-single-page-2026-09-10-final/normal-30.pdf), [kaynağa bağlı Excel](../app/output/class-roster-single-page-2026-09-10-final/normal-30.xlsx), [doğrulanmış gerçek Excel baskısı](../app/output/class-roster-single-page-2026-09-10-final/normal-30-excel-native-v2.pdf).

## Sınır ve tasarım ilkesi

Tek sayfa düzeni en fazla 30 öğrenci içindir; sığmayan içerik için mevcut iletişim/ayrıntı düzenleri kullanılabilir. Aile görüşmesi yerel hazırlıktır; davet kendiliğinden gönderilmez. Pedagojik sonuç ve yapılmamış gözlem üretilmez. Belge geçmişi sınıf başına 20 sürüm/10 MB ve PDF başına 2 MB ile sınırlıdır; geçmiş kapasitesi dolduğunda asıl dışa aktarma sürer ve durum görünür kalır. Kalıcı ders: bir işi tamamlanmış saymak için kaydı, kapsamı ve gerçek çıktıyı birlikte doğrulamak gerekir.
