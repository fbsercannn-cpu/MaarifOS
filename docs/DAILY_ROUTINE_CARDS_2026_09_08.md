# Görsel günlük rutin kartları — uygulama ve kabul

Bu modül 8 Eylül 2026 tarihli beş ek özellik paketinin görsel rutin kartı bölümüdür. Kullanıcı arayüzü Sınıf yönetimi → Görsel günlük rutin kartları yolundadır. Veri çocuk bilgisi içermez; sınıf ve eğitim yılına bağlıdır.

## Öğretmenin akışı

- Öğretmen günü ve kısa/tam gün düzenini seçer. Bu iki düzenin kayıtları ve sürüm zincirleri ayrıdır.
- Seçilen güne ait gerçek `plan.teacherOwnedDailyFlow` bulunursa öğretmen açıkça kaynak seçip taslak hazırlar. On bölümün id/order/kind/title/status/durationMinutes alanları kaynak sürümünün değişmez kopyasında korunur. Öğretmen notları ve geçiş notları kartlara aktarılmaz.
- Akış yoksa 6 kısa gün veya 10 tam gün kartı açıkça **TASLAK** gösterilir. Saat ve süreler boş kalır. Ekranı açmak hiçbir kayıt oluşturmaz.
- Kart başlığı, simgesi, süresi, durumu, görünürlüğü ve sırası düzenlenir; elle kart eklenebilir. Gizlemek kaydı silmez. Kart sırasını değiştirmek gerçek günlük planı değiştirmez.
- Açık **Rutin kartlarını kaydet** eylemi yeni sürüm ekler. Eski kayıtlar korunur; önceki her sürüm yeniden PDF olarak açılabilir. Gün/düzen seçimi değiştirilince kaydedilmemiş taslağın kapanacağı ekran üzerinde belirtilir.
- Kaynak plan değiştiğinde otomatik olarak karta yazılmaz. Uyarı gösterilir, eski kaynakla yeni sürüm kaydı durur; öğretmen güncel kaynaktan yeniden taslak hazırlar. Önceki kart sürümü kendi özgün kaynak sürümünü korur.

## Saat ve görünürlük

Başlangıç, kaynak akışın `scheduleSnapshot.startTime` alanından gelir; bilinen sürelerle ilerler. Elle hazırlanan kartlarda başlangıç ve süre isteğe bağlıdır. Bilinmeyen bir süreye ulaşıldığında sonraki saatler hesaplanmaz. Kaynak model bütün on bölümün süre toplamını çalışma düzenine eşit tuttuğundan, gizli/atlandı kartların süreleri zaman çizgisinde korunur; bu kural ekranda açıklanır. Gece yarısını aşan toplam kabul edilmez. Manuel süreler tam sayı 1–240 dakikadır.

## Belge

Tek çevrimdışı simge kaynağı UI'da SVG ve baskıda canvas Path2D çizimi olarak kullanılır. On çizim: güneş, oyun blokları, çember, sanat, beslenme, ağaç, kitap, dinlenme, arkadaşlar, ev.

- A4: **210 × 297 mm**, 2 sütun × 3 satır, sayfada en çok altı kart.
- A5: **148 × 210 mm**, sayfada tek büyük kart; A4 sayfasına küçük kart yerleştirme değildir.
- Kesik kesim sınırı, içerik için ayrı iç pay, büyük çizim, tam başlık, isteğe bağlı bilinen saat/süre; öğretmenin kart takımı başlığı ve sınıf/gün bilgisi üstte bulunur.
- Metin boşluklarda veya çok uzun sözcüklerde satıra alınır. Sığmayan başlık sessizce kesilmez; daha büyük A5 veya başlık düzenleme istenir.
- `pdf-lib` dinamik yüklenir, sayfa ölçüleri PDF point biriminde gerçek ölçülerdir. Yerel yazı tipi ve bütün simgeler çevrimdışı çalışır. Gerçek PDF canvas önizlemesi ve açık indirme aynı byte dizisini kullanır.
- Önizlemede A4/A5 şablonu ve saatlerin dahil edilmesi seçilir. Eski kaynaklı kayıt PDF'i açılırken uyarı bulunur; seçilmiş kayıtlı sürüm basılır.

## Kalıcı sözleşme

`settingType=daily-routine-cards-v1`, `schemaVersion=1`, `studentId=null`; ortak StoredRecord alanlarına `academicYearId`, `classroomId`, `workflow` eklenir. Workflow türü `routine-version` ve alanları: `routineId`, `previousEventId`, `routineOn`, `dayMode`, `title`, `startTime`, `source`, `cards`. Kaynakta plan UUID, plan UTC güncelleme zamanı, günlük akış UTC güncelleme zamanı/revizyonu, çalışma düzeni ve özgün altı alanlı on bölüm vardır.

İlişki doğrulaması aynı sınıf/yıl/gün kaynağını, kaynak bloklarını, kaynak saat düzenini ve mevcut/günlük-akış tarihçesindeki revizyonu doğrular. Nesne alanlarının JSON sırası anlam taşımadığından eşitlik alan değerleri üzerinden hesaplanır; şifreli IndexedDB kanonik anahtar sıralaması geçerli kaydı bozamaz. Üst ve iç ek alanlar, enum yerine dizi, sahte kaynaklar, yetim kayıtlar ve dallanmış geçmiş reddedilir.

`saveDailyRoutineCards` bütün koleksiyonları tek atomik `readwrite` işleminde okur, etkin scope ve eski başlığı karşılaştırır, doğrulanmış yeni olayı ekler. Saat önceki kayıttan 60 saniyeden fazla geri giderse işlem durur. UI açıldığı sınıfı tutar; sonraki sınıf değişimi eski taslağı başka sınıfa taşıyamaz. Gecikmiş asenkron okumalar ve kayıt sırasındaki yeniden yüklemeler sıra numarası/busy korumasından geçer.

## Kabul kanıtları

- `tests/features/daily-routine-cards.test.mjs`: **20/20 geçti**. Manuel taslak, gerçek akış izdüşümü, zaman belirsizliği, kaynak korunması, kısa/tam ayrımı, eşzamanlı kayıt, sınıf değişimi, tarihler, UTC/UUID/strict şema, yanlış kaynak saat düzeni, kaynak revizyonu/kaldırma, kaynak kapsamı, geri saat, disk hatası, sürüm zinciri, kanonik anahtar sırası, enum/iç şema ve iki minimum punto sınırı.
- `tests/daily-routine-cards-ui.spec.ts`: **3/3 geçti, 48,5 saniye**. Gerçek 390 px düzenle/sırala/simge/kayıt, gerçek A4/A5 önizleme+indirme, kısa/tam ayrımı, yeniden yükleme; ikinci sekme eski taslak ve scope değişimi; günlük akışın on kartı ve kaynak revizyonu sonrası yeni sürüm.
- PDF önizleme Blob'u ile indirilen dosyanın **SHA-256 eşitliği** iki şablon için doğrulandı. PDF parser: A4 bir sayfa, A5 altı sayfa; tüm sayfaların gerçek ebatları beklenen ölçüdedir.
- Son font sınırı düzeltmesi sonrası yerel fontla gerçek canvas + A4/A5/PDF/reload testi ayrıca **1/1 geçti, 17,5 saniye**. 19 puntoda sığmayan başlık 18 puntoda yeniden ölçülür; seçilen ölçüm ve çizim fontu aynıdır. Minimum 18 puntoda da sığmayan başlık açık hatayla durur.
- `tsc --noEmit` geçti. Mobil runtime bütünlük denetimi **36 korunan dosya** için geçti; korunan runtime değiştirilmedi.
- 390 px ve A4/A5 önizleme görselleri incelendi: yatay taşma, üst üste metin veya kesilen kart yok.
- Kök ajan ortak şema/yedek/öğrenci yaşam döngüsü kaydını entegre etti; yedi tip birleşik şifreli yedekte manuel rutin geri yükleme, çocuk silerken rutinin korunması ve bozuk sürüm zinciri reddi geçti.

Üretim çevrimdışı kabul tamamlandı: son 0.28.0 paketi, `http://127.0.0.1:4198`, **1 geçti, 2 geliştirme fixture testi atlandı; 9,9 saniye**. Aynı test dosyası `DAILY_ROUTINE_PRODUCTION=1` ile çalıştırıldı. PWA hazır olduktan sonra ağ kapandı; bütün yeni kayıtlar, A4/A5 PDF ve yeniden yükleme çevrimdışı yapıldı. Kaynak API kullanan iki fixture geliştirme koşumunda doğrulanmıştır. Üretim PDF'lerinin yedi sayfası ayrıca bağımsız render edildi, tüm sayfa boyutları ve önizleme/indirme SHA eşitliği doğrulandı. Kanıt: `production-final.txt`, `production/routine-A4.pdf`, `production/routine-A5.pdf` ve JSON makbuzları.

Kanıtlar: `app/output/daily-routine-cards-2026-09-08/`. Sorumlu kaynaklar: `src/core/domain/daily-routine-cards.ts`, `src/features/daily-routine-cards/**`; test/fixture/config bu modülün adını taşır. Release, shared şema ve ana ekran montajı kök ajana aittir.

Kalıcı ders: Şifreli veya kanonik JSON depolarında kaynak eşitliği, nesne anahtar sırasına bağlı JSON metniyle değil açık alan değerleriyle doğrulanmalıdır.
