# MARİF — belge ve mizanpaj denetimi

Tarih: 7 Eylül 2026. Kapsam: sınıf iletişim listesi 3.1; ortak PDF motorunun diğer plan, gözlem, anekdot, aylık değerlendirme ve gelişim raporu tüketicileri. Bu rapor HALİS'in bütün sistem raporunun belge bölümüdür. Gerçek çocuk verisi kullanılmadı; ekran ve PDF kanıtlarının tamamı kurgu sınıftır.

Öğretmen işi: sınıfta bir çocuğun annesine, babasına veya diğer yetkili yakınına ulaşırken kişi–yakınlık–telefon eşleşmesini aynı satır grubunda bulmak, gerektiğinde kayıt/adres sayfasını açmak ve okunabilir belgeyi indirmek.

## Karar ve uygulanan değişiklik

3.0 tasarımında üçüncü kişi iletişimi ayrı ayrıntı tablosundaydı. Kullanıcının yeniden belirttiği ihtiyacı karşılamak için **3.1'de üçüncü kişinin adı, yakınlığı/ünvanı ve telefonu anne ve babayla aynı ana iletişim tablosuna alındı**. Her ek yakın kendi fiziksel satırını alır; sıra numarası, çocuk adı ve anne/baba iletişimi aynı satırda yinelenir. Bir çocuğun grubu taze sayfaya sığıyorsa birlikte taşınır. Tek satır bir sayfadan uzunsa PDF satırı devam bağlamı ve tekrarlanan başlıkla sürdürür; sınıf çıktısında çocuk adı devam bağlamında da kısaltılmaz.

Tablo A4 yatay 297 × 210 mm'dir. Her kenardaki 10 mm payla ana tabloya **277 mm** ayrılır. Sütun ve gövde yazısı 8,5 pt'dir; kaynağı sığdırmak için yazı küçültme, hücreyi kesme, üç nokta veya kişi düşürme uygulanmaz.

| Ana iletişim sütunu | Genişlik, mm |
|---|---:|
| Sıra | 10 |
| Çocuk adı soyadı | 31 |
| Anne adı soyadı | 31 |
| Anne telefonu | 25 |
| Anne mesleği | 20 |
| Baba adı soyadı | 31 |
| Baba telefonu | 25 |
| Baba mesleği | 20 |
| 3. kişi adı soyadı | 31 |
| Yakınlığı / Ünvanı | 28 |
| 3. kişi telefonu | 25 |
| **Toplam** | **277** |

Öğrenci numarası, T.C. kimlik numarası, doğum tarihi, kayıt yılı, diğer yakınların meslekleri ve açık adres ikinci bölümün ayrı sütunlarındadır. Adrese 80 mm ayrılır. Ebeveyn meslekleri `contacts[].occupation`, üçüncü kişinin ünvanı `contacts[].relationship`, adres `careDetails.homeAddress` alanlarından gelir. Eski kaydın kayıt tarihi gerektiğinde kayıt yılına dönüştürülür; eksik bilgi uydurulmaz. Kaynak isimler, telefonlar, kimlik ve adresler kendiliğinden maskelenmez.

`childPrivateNotes`, aile durumları ve aile özel notları genel sınıf iletişim belgesine eklenmez; bu belgelerin kaynağı seçili sınıfın iletişim/kayıt alanlarıdır. Yeni bireysel özel alanların form ve kalıcılık kabulü öğrenci denetiminin kapsamındadır.

Öğretmen ünvanı sınıf listesi başlığı/metadata'sı ve imzasında **Okul Öncesi Öğretmeni** olarak sabitlendi. Bu tur basit gözlem belgesinin imzası ve öğretmenin hazırladığı planların imza bloğu da aynı tam ünvanı taşır. `src` içinde `Sınıf Öğretmeni` / `Sınıf öğretmeni` kalmadığı doğrulandı. Resmî formun özgün kaynak metinleri değiştirilmedi.

Uygulama izleri: [sınıf tablosu ve sayfalama](../../app/src/features/classroom/class-roster-document.ts), [3.1 dosya sürümü](../../app/src/features/students/simple-class-roster-document.ts), [PDF satır gruplama ve tam devam bağlamı](../../app/src/features/documents/semantic-tagged-pdf.ts), [gözlem imzası](../../app/src/features/reports/simple-observation-document.ts), [plan imzası](../../app/src/features/planning/teacher-owned-plan-document.ts).

## Eleştiri → iyileştirme → kanıt

| Kimlik / sınıf / önem | Gözlenen sorun ve etkisi | Uygulanan karşılık | Sonuç / kanıt |
|---|---|---|---|
| DOC-01 · KOPUK · P1 | 3.0'da üçüncü kişinin telefonu anne/baba iletişim tablosundan ayrıydı; öğretmen aynı çocuğun yakını için ikinci bölüm arıyordu. | 11 sütunlu ana tablo; çocuk başına ek yakın satırları; tekrar eden çocuk ve ebeveyn bağlamı. | **Kapandı.** `roster-extreme.pdf` sayfa 1: aynı çocuğun dört ek yakını ve ebeveynleri aynı sayfada. Chromium/WebKit aynı satırda telefon–ünvan eşleşmesini doğruladı. |
| DOC-02 · YANLIŞ · P1 | Çok kişili hücrede satır kırılımları kişi ile telefonu görsel olarak yanlış eşleştirebiliyordu. | Her ek yakını ayrı fiziksel tablo satırına taşıma; diğer sütunları aynı öğrenci grubuna bağlama. | **Kapandı.** Dört kişinin dört farklı telefonu ayrı satırlarda; hem PDF metin çıkarımı hem DOM hücre testi geçti. |
| DOC-03 · RİSKLİ · P1 | Uzun isim/meslek/adreste sabit bir sayfalama bütçesi kullanıldığında HTML baskısı fiziksel A4 yüksekliğini aşabiliyordu. | Ana bölüm için 120 mm muhafazakâr satır bütçesi; grup bazlı dengeleme; ayrıntıda imza payı; PDF'de gerçek font ölçümü. | **Kapandı, sınanmış korpus için.** 62 gerçek PDF sayfasında sayfa dışı karakter 0; 34 HTML baskı sayfasında beklenmeyen kırılma 0. En yüksek HTML içeriği 704,17 CSS px; 190 mm sınırı yaklaşık 718,11 px. |
| DOC-04 · YANLIŞ · P2 | Genel/yanlış öğretmen ünvanı profesyonel belge isteğini karşılamıyordu. | Sınıf, gözlem ve öğretmen planı imzalarında tam ünvan. | **Kapandı.** Sınıf PDF/HTML görünümü ve 11 plan/gözlem regresyon testi. |
| DOC-05 · GEREKSİZ · P2 | Önceki sınıf dosyasında artık kullanılmayan canvas/raster PDF hattı duruyordu; iki farklı mizanpajın bakımını gerektiriyordu. | Sınıf belgesinin ölü çizim hattı kaldırıldı; kanonik satır modelinden HTML ve semantik PDF üretimi korundu. | **Kapandı.** Kamuya açık dosya/Blob/preview sözleşmeleri, eski öğrenci kapsamı ve diğer PDF tüketicilerinin testleri geçti. |

## Yeniden üretilebilir kabul kanıtı

Kanonik kurgu girdi: [class-roster-fixture.mjs](../../app/tests/fixtures/class-roster-fixture.mjs). Uç senaryo: 15 çocuk, ilk çocukta dört ek yakın, boşluksuz uzun Türkçe ad/soyadlar, uzun meslek, iş/dahili/alternatif telefon ve tam 500 karakterlik adres. Fixture'ın 500 karaktere ayarlanması test girdisinin hazırlanmasıdır; üretim kodunda adres kesilmez.

| Senaryo | Etiketli PDF sayfası | Gerçek HTML baskı PDF sayfası | Hücre taşması / sayfa dışı karakter |
|---|---:|---:|---|
| 0 çocuk | 1 | 1 | 0 / 0 |
| 1 çocuk, iki ek yakın | 2 | 2 | 0 / 0 |
| 15 çocuk | 5 | 5 | 0 / 0 |
| 30 çocuk | 7 | 9 | 0 / 0 |
| 40 çocuk | 8 | 11 | 0 / 0 |
| Uç veri | 5 | 6 | 0 / 0 |
| **Toplam** | **28** | **34** | **0 / 0** |

Etiketli PDF'lerin **28/28 sayfası** Poppler ile 1600 px rastere çevrilerek tek tek görsel incelendi: sağdaki üçüncü kişi/telefon sütunları, isim ve meslek kırılımları, dört yakının gruplanması, kayıt/adres satırları, bölüm devamları ve son imza denetlendi. HTML'nin Chromium ile basılmış 34 sayfasının fiziksel sınırı/sayfa sayısı ölçüldü; uç senaryonun ilk/son baskı sayfası ayrıca görsel incelendi. 320/390/430 px HTML önizlemesi ve 390 px üçüncü kişi mobil görüntüsü denetlendi. Fiziksel yazıcı testi yapılmadı.

Komutlar (çalışma dizini `app`):

```powershell
node scripts/generate-class-roster-v31-evidence.mjs
python scripts/verify-class-roster-v31.py
$env:ALPHA_SMOKE_PORT='4183'
node ./node_modules/@playwright/test/cli.js test --config=playwright.smoke.config.ts tests/smoke/class-roster-render.spec.ts --workers=1 --output=output/document-qa/class-roster-v31-master-2026-09-07/playwright-results
```

Doğrulama aracı PDF dilini `tr-TR`, etiket ağacını, her PDF sayfasındaki sınıf bağlamını, güvenlik altbilgisini, fiziksel sayfa sınırlarını, özel notların genel belgede bulunmadığını, dört ek yakının aynı sayfada kalmasını ve dosya SHA-256 değerlerini kaydeder. Birim testleri uzun kaynak değerlerini `pdftotext` ile çıkartıp özgün girdiye karşılaştırır. Bunlar tam PDF/UA sertifikası iddiası değildir; haricî PDF/UA denetimi ayrıca gerekir.

- Sınıf belgesi + basit çıktı + ortak PDF + insan çıktısı: **34/34** test.
- Chromium ve WebKit gerçek tarayıcı: **10/10** test.
- Plan, aylık değerlendirme, gelişim raporu, basit gözlem, belge çalışma alanı: **46/46** regresyon testi. Ünvan ekinden sonra ilgili 11 test yeniden geçti; toplam benzersiz test sayısı 80'dir.
- TypeScript `tsc --noEmit`: geçti. Runtime bütünlüğü: **36 korunan dosya** geçti; bu ajan runtime kilidini/korunan dosyaları değiştirmedi.

Kanıtlar: [üretim ve DOM ölçümleri](../../app/output/document-qa/class-roster-v31-master-2026-09-07/generation.json), [12 PDF SHA-256 ve 62 sayfa doğrulaması](../../app/output/document-qa/class-roster-v31-master-2026-09-07/verification.json), [15 çocuk PDF](../../app/output/document-qa/class-roster-v31-master-2026-09-07/roster-15.pdf), [uç veri PDF](../../app/output/document-qa/class-roster-v31-master-2026-09-07/roster-extreme.pdf), [uç veri HTML](../../app/output/document-qa/class-roster-v31-master-2026-09-07/roster-extreme.html), [ana tablo görseli](../../app/output/document-qa/class-roster-v31-master-2026-09-07/render-extreme-1.png), [uzun alan görseli](../../app/output/document-qa/class-roster-v31-master-2026-09-07/render-extreme-3.png), [adres ve imza görseli](../../app/output/document-qa/class-roster-v31-master-2026-09-07/render-extreme-5.png).

## Diğer belge katmanlarında somut bulgular

Bu bölüm kaynak kodu ve çalışan regresyon testlerine dayanır. Sınıf listesi dışındaki bütün belge türleri bu tur yeniden görsel render edilmedi; testin içerik/kap sözleşmesi başarısı bütün mizanpajların görsel onayı değildir.

| Kimlik / sınıf / önem | Kanıt ve öğretmene etkisi | Önerilen müdahale / kabul kapısı | Durum |
|---|---|---|---|
| DOC-06 · KOPUK · P2 | `document-workspace-model.ts:89`, `sensitive-pdf-share.ts:82-83`, `TeacherOwnedPlanScreen.tsx:1110/2380`, `PremiumPlanCenterScreen.tsx:2242-2243` halen “görsel PDF” diyor. İlgili gerçek üreticiler `createSemanticTaggedPdf` kullanıyor. Ekran vaadi mevcut kabiliyeti yanlış anlatıyor. | Tek belge kabiliyet sözlüğünden “PDF” veya doğrulanmışsa “aranabilir, etiketli PDF” üretmek; düğme/paylaşım metni ve testleri aynı kaynağa bağlamak. | HALİS'e iletildi; bu dosyalarda sahiplik dışı düzenleme yapılmadı. |
| DOC-07 · KOPUK · P2 | Sınıf belgesinin HTML önizlemesi ve PDF aynı kayıtları içeriyor fakat font, renk, imza ve sayfa dağılımı farklı. Somut örnek: 40 çocuk HTML baskısı 11, uygulama PDF'si 8 sayfa. `buildHtml` ile `createClassRosterPdfDocument` ayrı mizanpaj motorlarıdır. | “HTML önizlemesi” etiketi korunmalı. Sonraki adımda gerçek PDF Blob'unun görünümü veya ortak tipografi/sayfa profili; önizleme sayfasını PDF sayfası diye vaat eden metin bırakılmamalı. | Mevcut dosya formatı dürüst etiketli; ortak görsel profil açık iyileştirme. |
| DOC-08 · GEREKSİZ · P2 | Tek çocukta iki bölüm iki sayfa üretiyor; `roster-1.pdf` gerçek renderinde geniş boş alan var. Çok kişili çizelge kuralı küçük sınıflara da aynen uygulanıyor. | 1–3 çocuk için iki tablonun ölçümle aynı sayfada birleştiği kısa belge profili. İmza ve 8,5 pt sınırı korunarak PDF/HTML beraber doğrulanmalı. | Veri kaybı/taşma yok; kâğıt ekonomisi için açık iyileştirme. |
| DOC-09 · GEREKSİZ · P2 | `createZip` üç kez uygulanmış: `anecdote/export-document.ts:81`, `premium-plans/export-document.ts:662`, `premium-plans/monthly-evaluation-export.ts:958`. DOCX kabı/CRC/XML ilişkilerindeki düzeltme üç yere ayrı taşınıyor. | Ortak test edilmiş DOCX paketleme yardımcısı; resmî form XML içeriğini değiştirmeden kap katmanını paylaşmak. Aynı girdinin çıkarılmış XML ve kaynak kimliği regresyonu gerekir. | Statik bakım bulgusu; büyük çaplı dönüşüm bu tur uygulanmadı. |
| DOC-10 · GEREKSİZ · P2 | Semantik PDF'ye geçilmiş olmasına rağmen anekdotta `wrapCanvasText` ve aylık değerlendirmede `layoutOfficialGeneralEvaluationCanvas`, `drawTableCanvas`, `drawAppendixCanvases` eski raster çizim zincirleri kaldı. Çağrı taramasında dışa aktarım girişi semantik motora gidiyor. | Kullanılmayan özel çizim işlevlerini kaldırıp kamuya açık runtime uyumluluk türlerini korumak; plan/aylık/anekdot export testlerini çalıştırmak. | Sınıf dosyasında temizlendi; diğer modüller için kapsamlı temizlik açık. |
| DOC-11 · KOPUK · P2 | `anecdote/export-document.ts:541` ve `premium-plans/export-document.ts:1007` PDF çağrıları ortak motorun `artifactHeaderText` alanını vermiyor. Uzun belgenin devam sayfasında sınıf/dönem gibi bağlamı üstbilgiden bulmak mümkün değil. Gelişim raporu güvenlik altbilgisi veriyor fakat özel üstbilgi vermiyor. | Belge türüne uygun kısa sınıf/dönem/belge başlığı profili; resmî form alanlarını değiştirmeden belge dışı üstbilgi olarak uygulamak. Her devam sayfasında test ve görsel inceleme. | Kaynakta doğrulandı; bu tur diğer türler için görsel kusur hükmü verilmedi. |
| DOC-12 · GEREKSİZ · P2 | `development-report-export.ts:87-94` aynı geçerli URL'yi “Kaynak kimliği” ve “Güncel erişim” olarak aynı paragrafta tekrar ediyor. Uzun kaynak adresleri belge gövdesinde tekrar yükü oluşturuyor. Aynı dosyada öğretmen onayı ve teknik iz satırları ayrı bölümde. | Kaynak kimliğini tek görünür atıfla sunup değişmez kimliği denetim ekinde korumak; ham gözlem, onaylı hedef ve öğretmen kararının ayrımını sürdürmek. | Statik tekrar bulgusu; kaynak izi sessizce kaldırılmadı. |
| DOC-13 · RİSKLİ · P2 | Bu ortamda Word/LibreOffice render motoru bulunmadı. Mevcut DOCX testleri geçerli ZIP/XML, resmî sayfa içeriği ve kaynak manifestini sınar; Word'deki gerçek tablo bölünmesini garanti etmez. | CI/yerel paketli LibreOffice veya Word ile DOCX→PDF; bütün sayfalarda font/taşma/imza ve resmî altı Ek 18 sayfasının görsel kabulü. | Bu tur DOCX görsel kabulü **verilmedi**. Sınıf listesi zaten HTML/PDF kabiliyeti sunar; yeni DOCX vaadi eklenmedi. |

İyi çalışan ve korunması gereken sözleşmeler de kontrol edildi: gelişim raporu `requireApprovedDevelopmentReport(structuredClone(snapshot), reportId)` ile onaylı revizyonu üretimden önce doğruluyor; testte font beklenirken snapshot değişse de rapor değişmiyor. Öğretmen planı ve Ek 18 testleri seçili tarihsel plan/değerlendirme kimliği, ham gözlem bağlantısı, program kaynağı ve manifesti doğruluyor. Basit veli gözlem çıktısı yalnız seçili çocuğun uygun kayıtlarını alıyor. Bu zincirler yeni bir “ortak belge tasarımı” yapılırken korunmalıdır.

## Teslim sınırı ve sonraki öncelik

Kullanıcının **üçüncü kişi bilgilerinin ana tabloya sığması** kabulü yerelde tamamlandı. P0 veya bu yeni sınıf iletişim işini engelleyen açık P1 bulunmadı. Açık P2'ler bütün uygulamanın kusursuz olduğu iddiasını engeller; master rapora ayrı iş kalemleri olarak taşınmalıdır. 3.1 kanıtı önceki 3.0 raporunu tarihsel olarak silmez, üçüncü kişi yerleşimi kabulünü günceller.

Bu ajan `Prototype.tsx`, ortak uygulama CSS'i ve korunan runtime dosyalarını değiştirmedi. Uzak yayın/commit/push yapılmadı. Son uygulama build'i ve sürüm kabulü HALİS'in bütünleştirme kapısıdır.

Kalıcı ders: İletişim çizelgesinde tasarım birimi hücreye yığılmış metin değil, adı ve telefonu birlikte izlenebilen aynı çocuğa bağlı kişi satırıdır.
