# Sınıf listesi 5.0 — bağımsız alanlar ve belge kabulü

8 Eylül 2026; MARİF belge iş paketi. Bu rapor 0.29 adayındaki sınıf listesi değişikliğine aittir. Önceki 0.28 belge kabulünü veya kök ajanın üretim/çevrim dışı kabulünü kendi test sayısına eklemez.

## Sonuç

Sınıf listesi 20 standart alanı ve kapsam içindeki öğrencileri başlangıçta seçer. Okul numarası ayrı sütundur. Her alan PDF, HTML ve Excel için bağımsız seçilir; sıfır alan/öğrenci seçimi çıktı üretmez. Standart iletişim alanları sağlık ve özel aile notlarını içermez. Sınıf listesi şablon sürümü ve dosya adı 5.0 oldu; veritabanı şeması değişmedi.

Kaynaklar donduruldu. Bu iş paketinde PDF semantik motoruna veya korunan mobil çalışma zamanına değişiklik yapılmadı. Yazdırma ve Excel eylemlerinin ortak önizleme bağlantısı kök ajanın; XLSX dosya üreticisi ayrı MARİF iş paketinin sorumluluğundadır.

## Alan sözleşmesi

`app/src/features/classroom/class-roster-columns.ts` tek katalogdur. `columns` verilmediğinde ve eski `fields` grupları kullanılmadığında aşağıdaki 20 alan seçilir:

| Grup | Alan kimlikleri |
|---|---|
| Öğrenci | sequence, schoolNumber, name, nationalId, birthDate, enrollmentYear |
| Anne | motherName, motherPhone, motherOccupation |
| Baba | fatherName, fatherPhone, fatherOccupation |
| Diğer yakınlar | otherName, otherPhone, otherRelationship, otherOccupation |
| İletişim ve adres | priorityContact, emergencyContact, pickupAuthorization, address |

`createClassRosterExportModel(input)` seçilen katalog, metin hücreleri, iç ilişkilendirme için öğrenci anahtarları ve kurum üstverisini üretir. PDF/HTML/XLSX aynı seçim ve dönem çözümleyicisini kullanır. `schoolNumber`, mevcut kaynak kaydındaki `optionalCode` alanından gelir; yeni öğrenci numarası alanı icat edilmedi. Okul numarası, telefon ve kimlik sayıya çevrilmez; baştaki sıfırlar korunur. İç öğrenci UUID’leri XLSX’te gizli sütun veya sayfa olarak yayımlanmaz.

Yalnız seçilen kişi rollerinin alanları satır sayısını artırır. Örneğin okul numarası ve adı seçilen tek çocuk için, dört başka yakını bulunsa da tek model satırı vardır. Diğer yakın telefonu/mesleği/adı seçiliyse dört yakının tamamı korunur. İletişim tercihleri kişi rolü olarak gösterilir; kapatılan ad/telefon/yakınlık alanı bayrak metnine yeniden eklenmez.

`columns` ve `studentIds` için boş dizi, null, yanlış tip, bilinmeyen/yinelenen seçim açık Türkçe hatayla reddedilir. Geçersiz seçim hiçbir zaman sessizce tüm öğrenciler kapsamına dönüşmez. Eski `fields: identity|contacts|address|care` API’si ve bireysel/acil durum şablonları korunur. Şablon geçişi iletişim listesinde 20 alan; bireysel belgelerde dört grup ve başlangıçta seçili identity/contacts/address oluşturur. Özel sağlık grubu başlangıçta kapalıdır.

## Mizanpaj ve yazım

Varsayılan A4 yatay düzende öğrenci/anne/baba/aranacak üçüncü kişi grup başlıkları altında 14 ana sütun bulunur. Kayıt yılı, üçüncü kişi mesleği, iletişim yetkileri ve açık adres aynı çocuğun sonunda tam genişlikteki banttadır. Kaldırılan alan bantta, hücrede veya devam başlığında yeniden görünmez. Az alan seçiminde kalan alanlar genişler. Dikey okul şablonunda kişi bilgileri okunabilir öğrenci bloklarına dönüşür.

Ek yakın satırlarında seçilmiş sıra/çocuk adı bağlamı sürer; yatay tablodaki sabit okul numarası/T.C./doğum değerleri yalnız ilk satırda yazılır. Dikey ayrıntı bandında T.C. ve doğum tarihi yakın sayısı kadar tekrarlanmaz. Birden fazla üçüncü kişi mesleğinin tamamı korunur. Aşırı uzun sözcük, adres ve başlık kesilmez; sayfa devamı gerektiğinde grup başlıkları ve seçilmiş bağlam yinelenir.

Okul adı, tek “Sınıf Listesi” başlığı ve ayrı etiketli sınıf/eğitim yılı/yaş grubu/öğrenci sayısı/düzenleme tarihi satırları kullanılır. Öğretmen imza ünvanı tam “Okul Öncesi Öğretmeni”dir. Standart meslek sütunları “Elektrik mühendisi” örneğinde son harfi ayrı satıra düşürmez. Yatay ana tablo 8,5 punto, dikey ana tablo 9 punto; küçük sayfa altbilgisi 8 puntodur. Kaydedilmiş okul logosu, üst başlık, kâğıt yönü ve imza yerleşimi uygulanır.

TDK kuralları ile görsel tercihler ayrıdır: kişi/kurum özel adları ve “T.C.”, “No.” yazımları kurala; başlığın tamamı büyük harf yerine “Sınıf Listesi” olması görsel tutarlılık tercihine dayanır. “60–72 ay” içindeki birim küçük harfle yazılır. Yalnız tanınan eğitim yılı/yaş grubu son ekleri sadeleştirilir; özel sınıf/yıl isimleri kesilmez. Asıl öğrenci verisi değiştirilmez. Kök ajanın 8 Eylül 2026 tarihinde doğruladığı resmî kaynaklar: [TDK büyük harfler](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/), [TDK kısaltmalar](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/).

## Kabul kanıtları

Kanıt kökü: `app/output/class-roster-v5-2026-09-08/`.

- **45/45 Node testi:** `node-tests.txt`. Yeni yedi alan sözleşmesi testi; eski sınıf belgesi, sürümlü basit çıktı, okul şablonu ve dört parçalı adres testleri aynı koşumda. 20 alanın her biri portre/yatay gerçek PDF’ye çıkarılarak seçili değer varlığı ve diğer alanların yokluğu sınandı.
- **7/7 gerçek tarayıcı testi:** `final-render-results/.last-run.json`. `tests/class-roster-columns-ui.spec.ts` içindeki iki test ve `tests/smoke/class-roster-render.spec.ts` içindeki beş test; port 4186, tek worker. 390px gerçek canvas/indirilen PDF bayt eşitliği, tüm alanlar ve öğrenciler seçili, sıfır seçimde üç eylem kapalı, yalnız okul numarası PDF/XLSX, 20→4→20 şablon geçişi, adres seçimi. 320/390/430px HTML, A4 baskı yükseklikleri, dört ek yakın ve son imza da doğrulandı.
- **TypeScript:** `tsc --noEmit` geçti.
- **7 PDF, 33 sayfa:** `generated.json`, `pdf-render-audit.json`, `roster-*.pdf`, eş HTML ve her sayfanın PNG’si. 0/1/15/30/40 öğrenci sırasıyla 1/1/4/7/9 PDF sayfası; logolu uzun başlıklı 15 öğrenci portre 6, yatay 5 sayfa.
- **2.428 dolu seçili hücre değeri kontrolü:** Gerçek `pdftotext -raw` çıktısında model değerleri karşılaştırıldı. Bu sayı benzersiz kişi sayısı değildir; aynı değer farklı satırlarda kontrol edilebilir. Eksik değer 0. PyMuPDF ile bütün sayfalarda metin sınırı ihlali 0, metin üst üste binmesi 0, özel çocuk/aile notu 0. Piksel görselleri ve bütün sayfa montajları ayrıca gözle incelendi.

En küçük ve uzun örnekler: `roster-1-page-1.png`, `roster-15-all-pages.png`, `roster-styled-landscape-all-pages.png`, `roster-styled-portrait-all-pages.png`, `roster-30-all-pages.png`, `roster-40-all-pages.png`. Son portre `roster-styled-portrait-page-1.png` sabit kimlik bandının tekrar etmediğini gösterir. Testler bütünüyle kurgu veridir; kullanıcının gerçek XLS satırları fixture/log/depoya alınmadı.

Bağımsız Laplace kabulü ayrıca, yalnız okul numarası/adı/tek öğrenci seçimindeki XLSX çift satır regresyonunu ve gerçek PDF/XLSX/yazdırma akışını 2/2 UI testiyle doğruladı. Bu iki test yukarıdaki yedi tarayıcı testine eklenerek yeni bir toplam iddia edilmemiştir; bağımsız rapor kök ajan tarafından birleştirilir.

Bu rapor yerel geliştirme kaynağı kabulüdür. Üretim derlemesi, çevrim dışı PWA, yayın ve son birleşik kabul kök ajanın ayrı kapısıdır. Belge iş paketinde açık kaynak engeli yoktur.
