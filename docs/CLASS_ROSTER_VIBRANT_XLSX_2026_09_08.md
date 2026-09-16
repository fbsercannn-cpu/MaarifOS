# Canlı Sınıf Listesi XLSX Tasarımı — 8 Eylül 2026

## Sonuç

Sınıf listesi Excel çıktısına okul öncesi kullanıma uygun, canlı ve yüksek
kontrastlı bir renk ile tipografi katmanı eklendi. PDF ile aynı alan rolleri
aynı renkleri kullanır. Öğrenci seçimi, sütun seçimi, veri hücreleri, dört
yatay baskı bandı ve uzun metin davranışı değiştirilmedi.

Bu aşamada örnek vergi tablosunun logosu veya kurum kimliği kullanılmadı.
Bütün kabul dosyaları sentetik `Kurgu` kayıtlarla üretildi. Önceki 0.29
işlevsel kanıtları değiştirilmeden ayrı dizinde korundu.

## Ortak renk sözleşmesi

Gövde, başlık ve etiket metni `#17324D` koyu laciverttir.

| Alan grubu | Canlı başlık | Açık veri bandı | En düşük metin kontrastı |
|---|---:|---:|---:|
| Öğrenci | `#42C7BD` | `#CFEFEB` | 6,34:1 |
| Anne | `#72B7F2` | `#D7E8FF` | 6,11:1 |
| Baba | `#F28C74` | `#FFE0D8` | 5,49:1 |
| Diğer yakınlar | `#F4C95D` | `#FFF0C2` | 8,35:1 |
| İletişim ve adres | `#B8E9E5` | `#E8F8F6` | 9,89:1 |

Bütün canlı ve açık zeminlerde koyu lacivert metin en az 4,5:1 koşulunu
sağlar; ölçülen en düşük oran 5,49:1'dir. Başlık satırı koyu lacivert zemin
üzerinde beyazdır. Çalışma sayfası sekmesi Öğrenci turkuazını kullanır.

## Tipografi

OOXML stil kaydı aşağıdaki hiyerarşiyi tanımlar:

- belge başlığı: Roboto, 18 punto, kalın,
- okul adı: Roboto, 12 punto, kalın,
- grup ve sütun başlıkları: Roboto, 10,5 punto, kalın,
- belge ayrıntıları ve veri hücreleri: Roboto, 10,5 punto,
- koyu lacivert metin ve metin kaydırma.

Microsoft Excel 16.0 ile gerçek `ExportAsFixedFormat` çıktısındaki font adı
`Roboto-Regular` olarak doğrulandı. Kalın görünüm OOXML hücre stilindeki
`b=true` özelliğinden gelir. Excel çıktısı için gömülü `Roboto Bold 700`
iddiası yoktur ve sistem fontu kurulmamıştır.

Excel baskısında veri içeriğinin en küçük boyutu 8,40 punto, altbilgi dâhil
genel en küçük boyut 8,04 puntodur. Başlıkların kalın ağırlığı, renk ayrımı ve
kontrast bu ölçekte görsel olarak korunur.

## Korunan işlevsel sözleşme

- Çalışma sayfası başlığı `Sınıf Listesi` olarak kalır.
- Satır 6 birleşimsizdir; her seçili sütun tam grup etiketini taşır.
- Satır 7 filtre başlığıdır; `D8` sabit bölmesi korunur.
- Varsayılan 20 sütun dört yatay A4 banda yayılır.
- Yalnız seçili `Sıra numarası`, `Okul numarası` ve `Adı soyadı` sütunları
  baskı bantlarında tekrar eder; kapalı alan eklenmez.
- Okul numarası, T.C. kimlik numarası ve telefonlar metin hücresidir.
- Baştaki sıfırlar korunur; formül hücresi üretilmez.
- İç öğrenci UUID'leri, özel çocuk notları ve özel aile notları dışa aktarılmaz.
- Veri satırlarının metin kaydırması ve uzunluğa bağlı yüksekliği korunur.

Stres örneğindeki 516 karakterlik adres 176 punto satırda görünürdür ve
`Son_Adres_Kurgu` son belirteci Excel baskısında eksiksiz yer alır.

## Makine yeniden okuması

`openpyxl 3.1.5` ile iki gerçek XLSX yeniden açıldı:

| Kontrol | Stres örneği | Temiz öğretmen örneği |
|---|---:|---:|
| Sütun | 20 | 20 |
| Veri satırı | 18 | 16 |
| Satır 6 birleşimi | 0 | 0 |
| Belge üst bilgisi birleşimi | 5 | 5 |
| Sabit bölme | `D8` | `D8` |
| Filtre | `A7:T25` | `A7:T23` |
| Baskı genişliği | 4 sayfa | 4 sayfa |
| Formül hücresi | 0 | 0 |
| Font ailesi | Roboto | Roboto |

Stres örneğinde `0012` okul numarası ve `00123456789` kurgu kimlik değeri
metin olarak baştaki sıfırlarıyla korundu. Temiz örnek 15 sentetik öğrenciden
oluşur; formül veya güvenlik uç girdisi içermez.

## Gerçek Excel baskı kabulü

Her iki çalışma kitabı Microsoft Excel 16.0 ile PDF'ye aktarıldı ve PyMuPDF
1.27.2.2 ile tüm sayfalarda denetlendi:

- stres örneği: 8 yatay A4 sayfa,
- temiz 15 öğrencilik örnek: 8 yatay A4 sayfa,
- her dosyada dört yatay bant ve bant başına iki dikey sayfa,
- her sayfada `Sınıf Listesi` ve seçili kimlik başlıkları,
- dört bandın ilk sayfalarında beklenen grup etiketlerinin tamamı,
- çalışma kitabındaki bütün veri değerlerinin PDF metninde bulunması,
- sayfa sınırı dışında sıfır metin kutusu,
- gerçek çıktı fontu yalnız `Roboto-Regular`,
- canlı ve açık renklerin PDF çizimlerinde bulunması,
- uzun adres son belirtecinin son stres sayfasında görünmesi.

Görsel kabulde stres örneğinin 1, 3, 5, 7 ve 8. sayfaları ile temiz örneğin
1, 3, 5, 7 ve 8. sayfaları incelendi. Renk hiyerarşisi, devam sayfası
başlıkları, grup ayrımı ve uzun metin sarma uygun bulundu.

## Doğrulama

- `node --test tests/features/class-roster-spreadsheet.test.mjs`: **5/5 geçti**
- `npm run test:typecheck`: **geçti**
- `npm run lint`: **geçti**
- palet renklerinin OOXML içine yazılması ve grup stil eşleşmesi: **geçti**
- koyu metin / renk zemini kontrast hesabı: **geçti**

## Kanıtlar

Kanonik kanıt dizini:

`app/output/class-roster-vibrant-2026-09-08/xlsx/`

- `Kurgu_Sinif_Listesi_Canli_Stres.xlsx`
- `Kurgu_Sinif_Listesi_Canli_Stres_Excel.pdf`
- `Kurgu_Sinif_Listesi_Canli_Temiz_15.xlsx`
- `Kurgu_Sinif_Listesi_Canli_Temiz_15_Excel.pdf`
- `xlsx-readback.json`
- `excel-render-qa.json`
- `stress-excel-page-1.png`, `stress-excel-page-3.png`,
  `stress-excel-page-5.png`, `stress-excel-page-7.png`,
  `stress-excel-page-8.png`
- `clean-15-excel-page-1.png`, `clean-15-excel-page-3.png`,
  `clean-15-excel-page-5.png`, `clean-15-excel-page-7.png`,
  `clean-15-excel-page-8.png`

## Kaynak dondurma kaydı

- `app/src/features/classroom/class-roster-spreadsheet.ts`
  - SHA-256: `B8A3E8E79E644E24B6D6EF1B58F5627BA967259D8B46CCF211BE1138C4D260BC`
- `app/tests/features/class-roster-spreadsheet.test.mjs`
  - SHA-256: `A3C8A09EF9402EBFE10D0AD6F49A8F52161E2059ACC91A4B048A6C482F404E45`
