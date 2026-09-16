# Sınıf listesi v5 — seçilebilir alanlar, baskı ve Excel

8 Eylül 2026 · Yerel sürüm 0.29.0 · MR-109–111. İşlevsel kabulün son kanıtları aşağıdadır. Bu aşama uzak yayın değildir; kullanıcının istediği sırada, bundan sonra canlı renk/font tasarımı ve son yayın aşaması gelir.

## Öğretmenin kullanacağı akış

**Sınıfım → Sınıf işlemleri → Sınıf listesini indir** yolunda belge önizlemesi açılır. Standart yirmi alan başlangıçta seçilidir. Öğrenci, anne, baba, diğer yakınlar ve iletişim/adres grupları açılarak alanlar tek tek değiştirilebilir. **Tüm alanları seç** ve **Alan seçimini temizle** düğmeleri aynı seçimi topluca yönetir. Öğrenci kapsamı ve belge dönemi ayrıca seçilir.

| Grup | Seçilebilir içerik |
|---|---|
| Öğrenci | Sıra numarası, okul numarası, adı soyadı, T.C. kimlik numarası, doğum tarihi, kayıt yılı |
| Anne | Adı soyadı, telefonu, mesleği |
| Baba | Adı soyadı, telefonu, mesleği |
| Diğer yakınlar | Adı soyadı, telefonu, yakınlığı/ünvanı, mesleği; birden fazla yakın kaydı korunur |
| İletişim ve adres | Öncelikli iletişim rolü, acil iletişim rolü, teslim yetkisi rolü, tam ev adresi |

İletişim rolü seçimi, örneğin **Anne** veya **Baba ve 3. kişi** kaydını gösterir. Bu seçenek, kapatılmış kişi adı veya telefon sütununu arka planda yeniden açmaz. Böylece yalnız istenen bilgiler çıktıya girer. Sağlık ve aile özel notları bu standart iletişim çizelgesinin kapsamına karışmaz; ayrı bireysel/acil durum şablonundaki özel sağlık seçimi başlangıçta kapalı kalır.

**Yazdır**, **Excel'e çıkar** ve **Bu PDF'yi indir** aynı öğrenci, dönem ve alan seçimini kullanır. Alanlar boş bırakılırsa çıktı düğmeleri kapanır ve en az bir alan seçilmesi istenir. PDF sayfaları seçime göre yeniden hazırlanır; Excel hazırlanırken seçim kontrolleri geçici olarak kapanır. Kaynak değişimi veya önizlemenin kapanması geç gelen dosyanın dışarı verilmesini engeller.

## Belgenin düzeni ve yazımı

Okul adı, **Sınıf Listesi** başlığı, etiketli sınıf/eğitim yılı/yaş/sayı/tarih bilgileri, iletişim tablosu ve öğretmen imzası ayrı bir hiyerarşide yer alır. Öğretmen ünvanı **Okul Öncesi Öğretmeni** olarak korunur. Okul numarası ana tabloda ayrı sütundur; adres ve seçilen uzun ayrıntılar çocuğun kendi bandında yer alır. Sütun sayısı azaldığında kullanılmayan sütunlar ve boş grup başlıkları kaldırılır.

Yazım ve görsel karar aynı şey değildir:

| Eski görünüm | Yeni yaklaşım | Gerekçe |
|---|---|---|
| `SINIF LİSTESİ` | `Sınıf Listesi` | Tamamı büyük başlık tek başına yazım hatası sayılmadı; daha sakin ve tutarlı bir belge başlığı seçildi. |
| `60–72 Ay` | `60–72 ay` | Yaş birimi özel ad değildir; başlık biçimine dönüştürülmez. |
| Bir satırda noktayla birleştirilen sınıf/yıl/yaş/tarih | Ayrı etiketli bilgiler | Okuma sırası ve değişen uzunluklar belirginleşir. |
| Okul/öğretmen/iletişim başlığının tekrarı | Tek kurum başlığı, tek belge başlığı, düzenli imza | Üst alandaki tekrarlar azaltılır; tablonun alanı korunur. |

TDK'nin [büyük harflerin kullanıldığı yerler](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/) ve [kısaltmalar](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) sayfaları 8 Eylül 2026'da doğrulandı. Kişi/kurum adları, başlık, etiket, yaş birimi ve makine kimliği ayrı değerlendirilir. Kaynak kayıtlara mekanik büyük/küçük harf dönüşümü yazılmaz. Bu belge resmî TDK onayı iddiası taşımaz.

## Veri ve çıktı bütünlüğü

Okul numarası, mevcut öğrenci numarası kaydının (`optionalCode`) gösterimidir; ikinci bir numara alanı veya yeni veri kopyası oluşturulmaz. Seçimler çıktı taslağına aittir. Öğrenci kaydı, aile verisi veya yedek şeması bu seçimlerle değiştirilmez.

Excel gerçek `.xlsx` dosyasıdır. Okul numarası, T.C. kimlik numarası ve telefonlar metin hücresi olarak korunur; baştaki sıfırlar düşmez. Formüle benzeyen kaynak metin çalıştırılabilir formüle çevrilmez. Satırlar ortak alan modelinden gelir; öğretmenin kapattığı bilgiler gizli sayfalara veya belge üstverisine taşınmaz.

Yazdırma, önizlemedeki PDF'nin değişmez baytlarını kullanır. Bütün sayfalar PDF.js ile 180 dpi çizilip gerçek kâğıt ölçülerinde tarayıcının yazdırma penceresine verilir. Kaynak ve seçim son kez kontrol edilir; PDF, geçici sayfa resimleri ve yazdırma çerçevesi işlem sonunda temizlenir. Bu işlem fiziksel yazıcının gerçekten baskı aldığını teyit etmez.

## Derin mantık ve tutarlılık denetimi

Kullanıcının “quantum zekâ ve mantık” vurgusu; birbirinden bağımsız veri, durum, geometri ve gerçek çıktı denetimleriyle uygulandı. Kontrol yalnız ekranın açılması veya test sayısı üzerinden yapılmadı.

| Değişmez | Sınama ve bulunan sonuca etkisi |
|---|---|
| Çıktı sütunları = seçilmiş geçerli katalog alanları | 20 alanın her biri ayrı PDF seçiminde; ayrıca 20→17→2 sütun PDF/XLSX akışında sınandı. Kapatılan içerik üstveriden veya ayrıntı bandından geri gelmez. |
| Bir çocuk, seçili yakın alanı yoksa bir Excel satırı | Gizli yakınların satır sayısını artırdığı gerçek regresyon bulundu ve ortak modelde düzeltildi. Birden fazla seçili yakın bilgisi varsa kayıtlar korunur. |
| Önizleme PDF baytları = indirilen ve yazdırılan PDF baytları | Gerçek tarayıcıda aynı Blob içeriği, sayfa sayısı, kâğıt ölçüsü ve tek yazdırma çağrısı kontrol edildi. |
| Eski kaynak veya kapanmış önizleme dışa aktarılamaz | Bekleyen izin kontrolü, geç tamamlanan Excel üretimi, kaynak değişimi ve pencere kapanışı ayrı yarış senaryolarıyla sınandı. |
| Kimlik, okul numarası ve telefon metin olarak korunur | Gerçek XLSX bağımsız okuyucuyla yeniden açıldı; baştaki sıfırlar ve Türkçe karakterler doğrulandı. Formüle benzeyen girdi çalıştırılabilir formül olmadı. |
| Sınıf mevcudu, veri satırı sayısı ve yakın sayısı farklı niceliklerdir | Birden fazla yakın, öğrenci sayısını artırmaz. Tek öğrenci seçildiğinde diğer öğrencinin hücreleri ve üstverisi dışarı verilmez. |
| Geometrik sınırlar ile görsel okunabilirlik ayrı kontrol edilir | PDF metin sınırı/örtüşme denetimine ek olarak sayfa resimleri incelendi. Excel'in sayfa içinde kalan fakat birleşik hücre sınırında kesilen başlığı yalnız görsel incelemede yakalandı; salt bbox testi yeterli kabul edilmedi. |
| Test edilen kaynak ile derlenen kaynak aynı kalır | Son doğrulamadan önce kaynak SHA-256 özeti alınır; kabul manifestosu son kaynak, derleme ve somut kanıtları eşleştirir. |

## Son kabul

| Denetim | Sonuç | Kanıt |
|---|---|---|
| Bütün özellik testleri | 1.210 PASS, 0 hata/atlama | [features.txt](../app/output/class-roster-v5-2026-09-08/final/features.txt) |
| Ajan/klavye/runtime-lock/PWA/Sites sözleşmeleri | 48 PASS | [contracts.txt](../app/output/class-roster-v5-2026-09-08/final/contracts.txt) |
| TypeScript, lint ve mobil runtime | PASS; 36 korunan dosya | `final/typecheck.txt`, `final/lint.txt`, `final/runtime.txt` |
| Son derleme ve gzip bütçesi | PASS; 125 JavaScript parçası | [build.txt](../app/output/class-roster-v5-2026-09-08/final/build.txt), [bundle.txt](../app/output/class-roster-v5-2026-09-08/final/bundle.txt) |
| Ortak PDF önizleme/kaynak değişimi/iptal kabulü | 12 PASS | [shared-ui-regression.txt](../app/output/class-roster-v5-2026-09-08/final/shared-ui-regression.txt) |
| Alan seçimi ve gerçek çıktılar, 320/390 px | 2 PASS | [Geliştirme kabulü](../app/output/class-roster-v5-2026-09-08/ui/development/run-4.log) |
| Üretim ve ağ kapalı gerçek sınıf akışı | 1 PASS; geliştirme fikstürü ayrı SKIP | [Üretim kabulü](../app/output/class-roster-v5-2026-09-08/ui/production/run-final.log) |
| PWA çevrim dışı açılış, yeni tarayıcı süreci ve 0.28→0.29 geçişi | 3 PASS | [pwa-production.txt](../app/output/class-roster-v5-2026-09-08/final/pwa-production.txt) |
| PDF alan ve mizanpaj kabulü | 7 PDF, 33 sayfa, 2.428 değer; kayıp/taşma/örtüşme 0 | [Belge kabul raporu](CLASS_ROSTER_V5_COLUMNS_QA_2026_09_08.md) |
| Baskı motoru | 8 Node + 4 tarayıcı testi; gerçek A4/A5/yatay ölçüleri | [Baskı makbuzu](../app/output/pdf-print-2026-09-08/acceptance-receipt.json) |

Excel bağımsız yeniden okuma ve Microsoft Excel üzerinden gerçek PDF baskısı, [XLSX kabul raporunda](CLASS_ROSTER_EXPORT_XLSX_2026_09_08.md) ayrıntılıdır. Yirmi sütun için okunabilir yatay baskı bantları, her bantta yalnız seçili kimlik bağlamının yinelenmesi, kesilmeyen grup başlıkları ve uzun adres sonunun korunması sınanır. Yeni renk tasarımı bu işlevsel aşamanın kabulüne karıştırılmaz.

Sayılar bağımsız bir genel toplam oluşturmaz; modül testleri birleşik özellik paketinin içinde de bulunabilir. Son kanonik kayıt `app/output/class-roster-v5-2026-09-08/final/acceptance-receipt.json`; kaynak/derleme/kanıt parmak izleri aynı klasördeki `sha256-manifest.json` dosyasındadır. Önceki deneme logları ve tarihsel 0.28 kabulü korunur; yalnız bu son makbuzda listelenen kanıtlar esas alınır.

Bu sürüm için fiziksel telefon/yazıcı ve gerçek öğretmen pilotu yapılmadı. Yerel testlerin kapsamı ve somut PDF/Excel örnekleri nihai makbuzda belirtilir; sınırsız içerik için mutlak kusursuzluk iddiası oluşturulmaz.
