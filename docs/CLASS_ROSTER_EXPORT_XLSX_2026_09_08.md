# Sınıf Listesi XLSX Dışa Aktarımı — 8 Eylül 2026

## Amaç ve sonuç

Öğretmen, sınıf yönetiminde seçtiği dönem, öğrenciler ve alanlarla aynı veri
kapsamını hem PDF hem de düzenlenebilir Excel çıktısında kullanabilir. XLSX
çıktısı cihazda ve çevrim dışı üretilir; dış servise veri göndermez.

Üretim API'si:

```ts
createClassRosterSpreadsheet(
  input: ClassRosterDocumentInput,
): Promise<BrowserFileDownload>
```

Dosya türü gerçek OOXML XLSX'tir:

- MIME: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Dosya adı: `MaarifOS_Sinif_Listesi_<sınıf>_<eğitim-yılı>.xlsx`
- Çalışma sayfası: `Sınıf listesi`

## Tek veri ve seçim kaynağı

XLSX üreticisi öğrenci veya veli alanlarını yeniden projeksiyonlamaz.
`createClassRosterExportModel(input)` sonucunu kullanır. Böylece PDF ve Excel
şu girdiler bakımından aynı seçime dayanır:

- etkin sınıf ve eğitim yılı kapsamı,
- dönem başlangıç ve bitişi,
- seçili öğrenci kimlikleri,
- seçili sütun kimlikleri,
- aynı snapshot ve oluşturma zamanı.

Sütunlar kanonik katalog sırasında kalır. Varsayılan seçim katalogdaki 20
alanın tamamıdır. Açık sütun listesinde boş, bilinmeyen veya yinelenen kimlik
üretimden önce reddedilir. Başka eğitim yılına ait öğrenci kimliği, boş öğrenci
seçimi ve yinelenen öğrenci seçimi de ortak model doğrulamasında reddedilir.

Bir öğrenciye bağlı birden çok üçüncü kişi ayrı satırlarda korunur. Anne, baba
ve üçüncü kişi adları, telefonları, meslekleri; yakınlık, öncelikli/acil
iletişim, teslim yetkisi ve açık adres seçildikleri ölçüde eksiksiz aktarılır.
`rowStudentIds` yalnız iç mutabakat içindir; XLSX hücresine, gizli sütuna veya
özel özelliğe yazılmaz. Seçilmeyen ad, okul numarası, T.C. kimlik numarası ya da
başka öğrenci alanı baskı bağlamı için kendiliğinden eklenmez.

## Veri koruma davranışı

Okul numarası, T.C. kimlik numarası ve telefonlar açıkça metin hücresi (`t=s`)
olarak yazılır. Baştaki sıfırlar bu nedenle korunur. Kaynak değerler
kısaltılmaz, maskelenmez veya yıldızlanmaz.

Formül görünümündeki kaynak metinler için hiçbir `f` alanı oluşturulmaz.
Örneğin kurgu `=HYPERLINK(...)` değeri paylaşılan metin olarak kalır ve Excel
tarafından formül olarak çalıştırılmaz. Kurgu testinde bütün çalışma kitabındaki
formül hücresi sayısı sıfırdır.

Öğrenci dosyasındaki özel çocuk ve aile notları katalogda bulunmadığından sınıf
listesine eklenmez. Kanıt dosyalarında yalnız kurgu veriler kullanılmıştır.

## Çalışma sayfası düzeni

| Satır | İçerik |
|---:|---|
| 1 | `Sınıf Listesi` başlığı |
| 2 | Okul adı |
| 3 | Sınıf, eğitim yılı, yaş grubu ve öğrenci sayısı |
| 4 | Öğretmen adı ve unvanı |
| 5 | Seçili dönem ve oluşturma tarihi |
| 6 | Her seçili sütunda tam grup etiketi |
| 7 | Sütun başlıkları ve otomatik filtre |
| 8+ | Ortak modelin kaynak dizgileri |

Satır 6 hücreleri birleştirilmez. Bu karar, Excel'in yatay baskı sınırında
`Öğrenci`, `Diğer yakınlar` veya `İletişim ve adres` başlığını kesmesini ve
yinelenen kimlik sütunlarıyla üst üste bindirmesini önler.

Çalışma kitabında:

- üstteki yedi satır ve varsa seçili ilk kimlik sütunları sabittir,
- satır 7'den son veri satırına kadar otomatik filtre vardır,
- seçili sütunlara göre belirlenmiş genişlikler kullanılır,
- tüm başlık ve veri hücrelerinde metin kaydırma açıktır,
- uzun satır yüksekliği içeriğe göre hesaplanır,
- A4 baskı alanı, kenar boşlukları, tekrar eden üst satırlar ve sayfa altlığı
  tanımlıdır,
- varsayılan 20 sütun dört yatay A4 banda yayılır; zaten seçilmiş `Sıra
  numarası`, `Okul numarası` ve `Adı soyadı` sütunları her bantta tekrarlanır.

Uzun satır hesabının üst sınırı 210 puntodur. Son kabul fikstüründeki 518
karakterlik adres 176 punto satırda, son karakterine kadar görünür kalmıştır.
Daha uzun kaynak değer XLSX içinde kayıpsız saklanmaya ve kaydırılmaya devam
eder; görsel kabul kanıtı bu 518 karakterlik kurgu örneğinin sınırındadır.

## SheetJS ve OOXML uygulaması

`xlsx` 0.20.3 yalnız `createClassRosterSpreadsheet` çağrıldığında tembel olarak
yüklenir. SheetJS çalışma kitabını, paylaşılan metinleri, sütun genişliklerini,
birleşimleri, filtreyi, notları, özellikleri ve ZIP paketini üretir.

SheetJS Community Edition, yeni hücre stillerini, sabit bölmeleri ve sayfa
ayarlarını yalnız çalışma sayfası nesnesine alan ekleyerek yazmaz. Üretici bu
alanları sessizce kaybetmemek için aynı paketi SheetJS'in CFB ZIP yardımcısıyla
açar; yalnız `xl/worksheets/sheet1.xml` ve `xl/styles.xml` dosyalarına
deterministik, sabit OOXML düzenini uygular ve paketi yeniden kapatır. Kaynak
öğrenci dizgileri SheetJS'in kaçış ve shared-string hattında kalır.

## Kabul kanıtı

Kaynak ve birim testleri:

- `node --test tests/features/class-roster-spreadsheet.test.mjs`: **5/5 geçti**
- `npm run test:typecheck`: **geçti**
- politika lint denetimi: **geçti**
- ortak sınıf listesi PDF/XLSX regresyon koşusu: **24/24 geçti**

Yeni beş test şunları doğrular:

1. varsayılan 20 sütun, çoklu yakınlar ve ortak modelle birebir satırlar,
2. tek tek sütun, öğrenci ve dönem seçimi ile alan dışlama,
3. baştaki sıfırlar ve formül enjeksiyonuna kapalı metin hücreleri,
4. 500+ karakter adres ve uzun meslek için kaydırma/satır yüksekliği,
5. sahte, boş ve yinelenen seçimlerin üretimden önce reddi.

Bundled Python `openpyxl` yeniden okuması:

- `A1:T25`, 20 başlık ve 18 veri satırı,
- `D8` sabit bölme, `A7:T25` filtre,
- baskıda tekrar eden `$1:$7` ve yalnız seçili `$A:$C`,
- dört A4 yatay sayfa genişliği,
- sıfır formül hücresi,
- 518 karakter uzun adres ve 176 punto satır,
- Türkçe Unicode korunumu,
- özel çocuk/aile notu bulunmaması.

Microsoft Excel 16.0 `ExportAsFixedFormat` gerçek baskı sonucu:

- 12 A4 yatay sayfa, dört yatay bant,
- dört bandın ilk sayfaları: 1, 4, 7 ve 10,
- her sayfada `Sınıf Listesi` ve seçili kimlik başlıkları,
- bütün beklenen grup etiketleri tam; kesilme ve üst üste binme yok,
- gerçek baskıdaki en küçük metin 8,64 punto,
- sayfa sınırı dışında metin kutusu yok,
- uzun adres son belirteci 12. sayfada görünür.

Kanıt dizini:

`app/output/class-roster-v5-2026-09-08/xlsx/`

- `Kurgu_Sinif_Listesi.xlsx`
- `Kurgu_Sinif_Listesi_Excel.pdf`
- `xlsx-readback.json`
- `excel-render-qa.json`
- `excel-render-page-1.png`
- `excel-render-page-4.png`
- `excel-render-page-7.png`
- `excel-render-page-10.png`
- `excel-render-page-12.png`

## Kaynak dondurma kaydı

- `app/src/features/classroom/class-roster-spreadsheet.ts`
  - SHA-256: `C094ADF9124751BEF11F9357222B89B78FE721D63D6B641BEA9A2F9CB41F6620`
- `app/tests/features/class-roster-spreadsheet.test.mjs`
  - SHA-256: `6ED234D39E308EFC609DA6EA36EC3A98CA470F1807F83F3E42F9EE242D944784`

Bu kayıt işlevsel XLSX aşamasının dondurulmuş kaynağıdır. Sonraki renk ve font
çalışması ayrı bir görsel tasarım aşamasıdır ve bu kabul kaydına dahil değildir.
