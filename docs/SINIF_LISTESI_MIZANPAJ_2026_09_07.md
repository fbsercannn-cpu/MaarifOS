# Sınıf listesi 3.0 — mizanpaj ve veri bütünlüğü kanıtı

7 Eylül 2026 kullanıcı isteği: Öğretmen, çocuğun anne/baba ve diğer yakınının iletişim bilgisine basılı sınıf listesinde hızla ulaşabilmeli; telefonun hangi kişiye ait olduğunu çözmek için sıkışık çok satırlı bir hücreyi okumamalıdır.

## Karar ve uygulama

Önceki altı sütunlu A4 dikey liste, A4 yatay 3.0 şablonuna dönüştürüldü. İki birbirine bağlı çizelgede aynı öğrenci sıra numarası kullanılır:

1. Sıra, öğrenci numarası, çocuk adı soyadı; anne adı soyadı, anne telefonu, anne mesleği; baba adı soyadı, baba telefonu, baba mesleği.
2. Sıra, çocuk adı soyadı, T.C. kimlik numarası, doğum tarihi, okula kayıt yılı; üçüncü kişinin adı soyadı, yakınlığı/ünvanı, telefonu, mesleği; açık ev adresi.

Birden fazla ek yakın varsa her biri ayrı hizalı satırdadır. Telefon ve yakınlık başka kişinin görsel satırına kaymaz. Anne/baba iletişiminde birden fazla kayıt varsa bunlar da veri kaybetmeden ek satırlarla korunur. Öncelikli, acil ve teslim yetkili bilgileri aynı kişinin hücresinde bulunur. Kaynak adlar, numaralar, meslekler ve adresler maskelenmez veya kısaltılmaz.

Başlık ve imza ünvanı tam olarak **Okul Öncesi Öğretmeni** oldu. Uygulama kaynak taramasında yanlış `Sınıf öğretmeni` kalmadı; resmî program ve dış kaynak metinleri değiştirilmedi.

Çocuğun özel notu ve aile durumuna ilişkin not/işaretler bu genel iletişim çizelgesine otomatik konulmaz. Bu belgede eksik alan tahmin edilmez; açık çizgi kullanılır. Aktif sınıf, eğitim yılı, ayrılmış/silinmiş çocuk filtreleri, Türkçe sıralama, UTC üretim zamanı ve Türkiye sivil tarihi korunur.

## Dosya zinciri

- `app/src/features/classroom/class-roster-document.ts`: tek doğrulanmış veri modeli, iki çizelge, kayıpsız HTML ve etiketli PDF.
- `app/src/features/students/simple-class-roster-document.ts`: şablon 3.0, `v3_0` dosya adı ve sürüm üstverisi.
- `app/src/features/documents/semantic-tagged-pdf.ts`: isteğe bağlı A4 yatay, kenar boşluğu, 8–12 pt tablo tipi, dengeli sayfalar, imza için alan ve her sayfada sınıf bağlamı. Mevcut belge varsayılanları A4 dikey/54 pt/9 pt olarak korundu.
- Mevcut `class-roster-file-actions.ts` indirme ve paylaşma eylemleri bu güncel zinciri kullanır; yeni alternatif bir indirme yolu eklenmedi.

Önceki dosyada kullanılmayan eski raster/canvas çizim yolu kaldırıldı. İndirilen PDF seçilebilir Türkçe metin, gömülü TrueType font, ToUnicode ve tablo başlıkları taşır. PDF/UA sertifikasyonu iddia edilmez. Sınıf listesinde önceden DOCX yolu bulunmadığı ve bu ortamda Word render motoru bulunmadığı için doğrulanmamış bir Word indirme eylemi eklenmedi.

## Eleştiri ve düzeltme izi

| Bulgu | Etki | Düzeltme |
|---|---|---|
| YANLIŞ/P1: Tüm veliler ortak kişi/telefon hücrelerinde | Anne/baba/ek yakın ve telefon eşleşmesi zor okunuyor | Ayrı anne/baba sütunları; her ek yakın için ayrı satır |
| YANLIŞ/P2: `Sınıf öğretmeni` ünvanı | Kullanıcının meslek ünvanı yanlış | Tam `Okul Öncesi Öğretmeni` |
| EKSİK/P1: Meslek, adres ve diğer profil ayrıntıları sınıf çizelgesinde yok | Excel'den gelen bilgi çıktı zincirinde kayboluyor | Meslek, açık adres, doğum/kayıt yılı ikinci çizelgede eksiksiz |
| YANLIŞ/P2: İlk yeni PDF render'da Sıra başlığı ikiye bölündü | Düzensiz tablo başlığı | İlk sütun genişliği 10,5 birim |
| RİSKLİ/P1: İki ek yakında isim/telefon satır yüksekliği ayrıştı | Telefon yanlış kişiye ait gibi görünebilir | Her yakına kendi tablo satırı; gerçek browser doğrulaması |
| YANLIŞ/P2: 30 kayıtlı HTML baskısında imza 190 mm alanı aştı | Ek veya imzasız son sayfa oluşabilir | Son sayfada imza alanı ayrıldı, sayfa yükü dengelendi |

## Doğrulama

Tüm fixture'lar kurgudur; gerçek çocuk/veli verisi teste, loga ve ekran görüntüsüne alınmadı.

- 33/33 odak birim testi: sınıf listesi, sürüm, semantik PDF ve insan odaklı çıktı sözleşmeleri.
- 8/8 Playwright testi: Chromium ve WebKit; 320/390/430 px; HTML taşmasız kart görünümü; son imzaya erişim; PDF dosyası oluşturma; her yakının telefon ve ünvanının aynı satırda kalması.
- TypeScript strict, policy lint ve 36 dosyalı runtime integrity kontrolü geçti.
- 1/15/30/40 zengin kayıt için dört gerçek PDF ve dört HTML üretildi. HTML'ler ayrıca Chromium yazdırma motoruyla PDF'ye çevrildi.
- Sekiz PDF dosyasının **42 sayfasında** A4 yatay boyut, sayfa dışına taşan karakter `0`, HTML'de taşan hücre `0`, planlanan/gerçek HTML sayfa sayısı eşitliği doğrulandı.
- Uygulamanın ürettiği dört etiketli PDF'nin **19/19 sayfası** Poppler PNG olarak render edilip görsel incelendi; kesilme, üst üste metin veya kayıp Türkçe karakter görülmedi. 15 öğrencili örnek ayrıca kök ajan tarafından bağımsız incelendi.
- `pdfinfo`: Tagged=yes, Suspects=no, JavaScript=no, A4 landscape. `pdffonts`: Roboto-Regular CID TrueType, emb=yes, uni=yes.
- `pdftotext -raw`: tam ad, anne/baba meslekleri, tüm ek yakınlar, telefonlar, kimlik numarası, doğum tarihi, kayıt yılı ve açık adres eksiksiz çıkar. Özel çocuk/aile notları yoktur.

| Kurgu öğrenci sayısı | Etiketli PDF sayfası | HTML / gerçek baskı sayfası | En yüksek HTML sayfası (sınır 718,1 px) |
|---:|---:|---:|---:|
| 1 | 2 | 2 / 2 | 446,44 px |
| 15 | 4 | 4 / 4 | 647,25 px |
| 30 | 6 | 8 / 8 | 643,58 px |
| 40 | 7 | 9 / 9 | 704,70 px |

HTML ve etiketli PDF farklı gerçek metin motorları kullandığından sayfa sayıları farklı olabilir; aynı kaynak alanları ve kayıt sırası korunur. Fiziksel yazıcı/telefon kabulü ve bağımsız ekran okuyucu/PDF-UA değerlendirmesi bu yerel otomasyon kanıtına dahil değildir.

## Tekrar üretim ve kanıt dosyaları

Çalışma dizini `app`:

```powershell
node scripts/generate-class-roster-v3-evidence.mjs
node scripts/audit-class-roster-v3.mjs
python scripts/verify-class-roster-v3.py
node --test tests/features/class-roster-document.test.mjs tests/features/simple-class-roster-document.test.mjs tests/features/semantic-tagged-pdf.test.mjs tests/features/human-output-quality.test.mjs
$env:ALPHA_SMOKE_PORT='4193'
node ./node_modules/@playwright/test/cli.js test --config=playwright.smoke.config.ts tests/smoke/class-roster-render.spec.ts --workers=1
```

Kanıt kökü: `app/output/document-qa/class-roster-v3-2026-09-07/`. `generation.json`, `browser-layout.json` ve dosya SHA-256'larını içeren `verification.json` birlikte saklanır. Temsilî dosyalar: `sinif-listesi-15.pdf`, `sinif-listesi-15.html`, `mobile-preview-390.png`.
