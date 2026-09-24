# MR-055 · Erişilebilir PDF motoru kanıtı

**Kanıt kesiti:** 28 Ağustos 2026
**Durum:** `IMPLEMENTED_UNVERIFIED`
**PDF/UA uygunluk iddiası:** **Yok**

## Uygulanan güvenli dilim

Ortak `semantic-tagged-pdf.ts` motoru artık günlük, haftalık, aylık ve birleşik
öğretmen planlarının yanında sınıf listesi, anekdot ve Ek 18 PDF'lerini de
canvas/JPEG yerine semantik metin akışıyla üretir. Sınıf listesi HTML önizlemesi
değişmemiştir; yalnız PDF üretim yolu ortak çekirdeğe taşınmıştır.

Motor aşağıdaki yapısal özellikleri üretir:

- seçilebilir ve aranabilir Türkçe metin;
- belge kataloğunda `/Lang (tr-TR)`;
- UTF-16 başlık metadata'sı ve XMP `dc:title`/`dc:language`;
- `/MarkInfo << /Marked true /Suspects false >>` ve `/StructTreeRoot`;
- sayfa başına `/StructParents`, `/Tabs /S`, `MCID` ve `ParentTree` eşlemesi;
- `Document`, `H1`–`H6`, `P`, `L`, `LI`, `Lbl`, `LBody`, `Table`, `TR`,
  `TH`, `TD` ve `Figure` rolleri;
- `Figure` için zorunlu `/Alt`; boş alternatif metin fail-closed reddedilir;
- tablo başlıklarında `TH` ve `/Scope /Column`, ağırlıklı sütun genişlikleri ve
  çok sayfada artifact olarak tekrarlanan görünür başlık satırları;
- tanımlanan ilk/kimlik sütunlarında `TH` ve `/Scope /Row`; boş matris
  hücrelerinde ekran okuyucuya yüzlerce tire okutmayan gerçek boş hücreler;
- taze sayfaya sığan tablo satırını bölmeden birlikte taşıma; yalnız tek satır
  kullanılabilir sayfadan uzunsa kimlikli `Devam` bağlamıyla kontrollü bölme;
- gömülü CID TrueType font, `/CIDToGIDMap`, `/CIDSet` ve `/ToUnicode`;
- header/footer gibi yardımcı sayfa öğeleri için `/Artifact` işaretlemesi;
- yapı ağacı, MCID ve fiziksel içerik üretiminde aynı mantıksal sıra.

Belgeye özel kanıt kapsamı şöyledir:

- sınıf listesi 1, 15, 30 ve 40 öğrenciyle; uzun okul, öğrenci ve veli
  alanlarıyla; başlık, tablo ve imza bölümüyle sınanmıştır;
- anekdotta değişmez ham gözlem/çocuk sözü ile öğretmenin sonradan yaptığı
  değerlendirme ayrı başlıklar ve açıklamalarla, ham kayıt önce gelecek şekilde
  tutulmuştur;
- Ek 18, resmî kaynak grupları ve çok sütunlu aylık tablolarla çok sayfaya
  bölünür; genel değerlendirme ve uzun program metni ayrı, devam edebilir
  bölümlerdir.

Kişisel bilgiler belgenin kullanıcı tarafından istenen görünür gövdesinde yer
alabilir; XMP/Info metadata'sına öğrenci adı, TCKN, telefon, çocuk sözü,
öğretmen yorumu veya kalıcı UUID kopyalanmaz. Ek 18 PDF metadata'sı yalnız
`semantic-accessible-reflow`, kaynak form sayfa sayısı ve içeriğe bağlı
sayfalama politikasını taşır; ham manifest veya manifest özeti taşımaz.

## Font lisansı ve provenans

PDF fontu, kilitli `@fontsource/roboto@5.2.10` paketinin OFL-1.1 lisanslı
`roboto-latin-400-normal.woff2` ve `roboto-latin-ext-400-normal.woff2`
kaynaklarından fontTools `4.62.1` ile üretilmiştir. Kaynak ve çıktı SHA-256
özetleri `app/public/assets/fonts/README.md`, tam telif ve OFL metni
`Roboto-OFL-1.1.txt` içindedir. Ürün fontunun kilitli özeti:

`FACE805FDEA05B1B45A7DB08F4422B1794B0940E4C7126C25EE28D766E073C61`

Font kapsamı dışındaki karakterler eksik glife çevrilmez; üretim açık hata ile
durur. Bu negatif davranış birim testlidir.

## Otomatik doğrulama kanıtı

Örnek çıktı:
`app/output/pdf/mr055-accessible-plan/plan-semantic-sample.pdf`

Örnek SHA-256:
`4F4CEE0E9E0466A4501F377F0D1C37EF262AA9DFDECE67AFF3E825AAAA0C8314`

Çalıştırılan kontroller:

```text
node --test tests/features/semantic-tagged-pdf.test.mjs
5/5 geçti; atlanan test 0

pdfinfo plan-semantic-sample.pdf
Tagged: yes
Suspects: no
Pages: 1
Page size: A4
PDF version: 1.7
JavaScript: no
Encrypted: no

pdffonts plan-semantic-sample.pdf
Roboto-Regular | CID TrueType | Identity-H | emb=yes | uni=yes

pdftotext -layout -enc UTF-8 plan-semantic-sample.pdf -
Türkçe başlık, paragraf, madde işaretleri, tablo hücreleri, şekil başlığı ve
sayfa altbilgisi kayıpsız ve beklenen sırada çıkarıldı.

pdftoppm -png -r 144 plan-semantic-sample.pdf ...
1/1 tam sayfa üretildi ve görsel olarak incelendi; kırpılma/taşma görülmedi.
```

Testler ayrıca metadata akışında gövde, tablo ve alternatif metin içeriğinin
sızmadığını; yalnız belge başlığı, `tr-TR` ve üretici bilgisinin bulunduğunu
kanıtlar. Günlük/haftalık/aylık/birleşik dört plan kapsamının tamamında
`/Lang`, `/MarkInfo`, `/StructTreeRoot`, `/FontFile2`, `/ToUnicode` varlığı ve
raster `/Image` yokluğu ayrı regresyon testidir.

### Kalan üç belge türünün otomatik kanıtı

Son QA dosyaları `app/output/pdf/mr055-remaining/` altında tutulur:

| Dosya | Sayfa | Boyut | SHA-256 |
| --- | ---: | ---: | --- |
| `anecdote-child-voice-and-teacher-assessment.pdf` | 1 | 99.321 bayt | `B2CE1FAE7C58445B4E1291035BE6D850764FC713EFDD4CC365DE819634C1B82D` |
| `class-roster-40-long-fields.pdf` | 4 | 214.726 bayt | `22B3770BB38E9814C8C72BD62D93ED0A2A6D4D1A2CD2D61B57B1E41DDAEC09CE` |
| `ek18-multipage-long-assessment.pdf` | 12 | 579.690 bayt | `CF028AD179C63A21AF704C07DCC0F91B0416617748D349E4A3F544103713CC83` |

Odak regresyon paketi `semantic-tagged-pdf`, sınıf listesi, Simple sınıf
listesi adaptörü, anekdot ve aylık değerlendirme testlerinde **51/51** geçti.
Gerçek Roboto font asset'i kullanıldı; font ve semantik davranış mock'lanmadı.
`test:typecheck`, policy lint, üretim build'i, 36 korumalı dosyalık mobil runtime
kontrolü ve 53 JavaScript chunk için gzip/chunk ≤180 KiB bundle bütçesi geçti.
Tam feature paketi aynı çalışma ağacında 816 testten 815'ini geçirdi; tek hata
PDF kapsamı dışındaki IndexedDB sürüm beklentisinin `6` kalması, ortak şemanın
ise başka çalışma diliminde `7` olmasıdır (`repository-entity-typing.test.mjs`).
Bu dış kapsamlı hata burada gizlenmemiş veya test zayıflatılarak geçirilmemiştir.

Her üç son dosyada Poppler kanıtı:

```text
pdfinfo
Tagged: yes | Suspects: no | A4 | PDF 1.7 | Encrypted: no

pdffonts
Roboto-Regular | CID TrueType | Identity-H | emb=yes | sub=no | uni=yes

pdftotext -raw -enc UTF-8
Türkçe gövde seçilebilir/aranabilir; sınıf listesinin ilk ve 40. kaydı,
anekdotun çocuk sözü → öğretmen yorumu sırası ve Ek 18'in uzun metin sonu
çıkarıldı.

pdftoppm -png -r 144
1 + 4 + 12 = 17/17 sayfa üretildi.
```

On yedi sayfanın tamamı görsel olarak incelendi. Uzun okul/öğrenci/veli
alanlarında, çok sayfalı sınıf listesinde ve Ek 18 tablolarında A4 dışına
taşma, kırpma veya bozuk Türkçe glif görülmedi. Tek başına sayfa sonunda kalan
`GENEL DEĞERLENDİRME` başlığı için başlıkla sonraki metni birlikte tutan akış
kuralı eklenip çıktı yeniden üretildi ve yeniden incelendi. Sınıf listesinin
3–4. sayfaları ayrıca yeniden incelendi: 31. öğrenci 3. sayfada bütün kalır,
4. sayfa 32. öğrencinin tam kimlik satırıyla başlar; bağlamsız veli artığı ve
`Devam` satırı yoktur. Kişisel veri uyarısı dört sayfanın tamamında artifact
footer olarak görünür.

## Neden VERIFIED değil?

`pdfinfo` içindeki `Tagged: yes` tek başına PDF/UA uygunluğu değildir. Bu kesitte
veraPDF/PDF/UA doğrulayıcısı kurulu değildir; NVDA, VoiceOver ve TalkBack ile
gerçek okuma; fiziksel iOS/Android yazdırma/paylaşma ve bağımsız erişilebilirlik
uzmanı kabulü yapılmamıştır. Ayrıca MR-054'ün bütünsel TYMM omurgası kapanmadan
MR-055 aşaması kabul edilemez.

Bu nedenle durum, yapısal ve görsel otomasyon kanıtı bulunmasına rağmen dürüstçe
`IMPLEMENTED_UNVERIFIED` olarak kalır.
