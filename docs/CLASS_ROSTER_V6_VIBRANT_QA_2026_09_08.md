# Sınıf listesi 6.0 — canlı tasarım ve gerçek kalın font

8 Eylül 2026. Kullanıcının istediği sıra korundu: 0.29 işlevsel kabulü tamamlandıktan sonra görsel aşama açıldı. Önceki `class-roster-v5-2026-09-08` kanıtları değiştirilmedi. Bu aşamanın bütün yeni çıktıları `app/output/class-roster-vibrant-2026-09-08/` altındadır.

## Uygulanan tasarım

Soluk görünümün iki somut nedeni giderildi: tablo gövdesi eski gri meta renginden koyu laciverte geçti; başlıklar gerçek 700 ağırlıklı fontla çiziliyor. Tek “Sınıf Listesi” başlığı, ayrı etiketli kurum/sınıf/yıl/tarih bilgileri, 14 ana sütun, aynı çocuğa bağlı tam adres bandı ve “Okul Öncesi Öğretmeni” imza başlığı korunur. Referans görselin logosu veya vergiyle ilgili metni kullanılmadı. Okul logosu yalnız kullanıcının kayıtlı okul şablonundan gelebilir; testte görülen düz yeşil kare kurgu şablon logosudur.

PDF ile XLSX için rol-renk eşlemesi iki üretici arasında kararlaştırıldı:

| Kullanım | Canlı grup zemini | Açık yaprak zemini | Koyu metinle grup kontrastı |
|---|---|---|---|
| Öğrenci | `#42C7BD` | `#CFEFEB` | 6,34:1 |
| Anne | `#72B7F2` | `#D7E8FF` | 6,11:1 |
| Baba | `#F28C74` | `#FFE0D8` | 5,49:1 |
| Diğer yakınlar | `#F4C95D` | `#FFF0C2` | 8,35:1 |

Gövde/başlık/etiket metni `#17324D`, ayrıntı bandı `#EAF8F5`, tablo çizgileri `#607D91` kullanır. Açık canlı dolgular üzerinde beyaz yazı kullanılmaz. Ana tablo yatay 8,5 punto, dikey 9 punto; başlık ve yaprak/grup/imza başlıkları gerçek kalındır. Başlığın küçük/büyük harf düzeni önceki TDK kabulüyle aynı kalır. HTML görünümü de aynı renklerle eşleştirildi.

## Geriye uyumlu motor ve gerçek font

`SemanticTaggedPdfDocument.theme` opt-in bir renk/yazı ağırlığı sözleşmesidir. `headerGroups[].colorIndex` alanı, seçilmeyen gruplar kaldırıldığında kalan grubun renk kimliğini korur. Renkler sonlu üç RGB kanalı ve 0–1 sınırlarıyla; grup renk dizileri ve indisler açıkça doğrulanır. Hiç tema vermeyen mevcut belgelerde font yükleme/nesne ayırma/çizim yolu değişmez; eski PDF baytları birebir korunur.

`SemanticTaggedPdfRuntime.boldFontBytes` ve `loadBoldFontBytes`, test veya gömülü kullanımın gerçek fontu sağlamasını mümkün kılar. Tarayıcıda yalnız kalın başlık isteyen tema yerel `/assets/fonts/MaarifOSSans-Bold.ttf` dosyasını yükler. Kaynak hazır değilse, bozuksa veya ağırlığı 700’ün altındaysa Türkçe hata ile durur; regular fontu kalınmış gibi sunmaz ve sahte kalınlaştırma yapmaz.

Yeni font, kilitli `@fontsource/roboto@5.2.10` paketindeki 700 normal Latin ve Latin Extended WOFF2 kaynaklarından fontTools 4.62.1 ile birleştirildi. Lisans mevcut SIL OFL 1.1 bildirimidir. Kaynak ve dağıtılan TTF SHA-256 değerleri `public/assets/fonts/README.md` ve `bold-font-provenance.json` içindedir. Dağıtılan TTF özeti `dd4aa64a09bfcb5723dadae87b2376547558a7578134deae545c772f559cef3d`; OS/2 ağırlığı 700’dür.

Font PDF’de gerçek ikinci F1 FontFile2/CIDFontType2 nesnesi olarak gömülür. Satır ölçme ve kaydırmada bold fontun kendi ilerleme genişlikleri kullanılır. Türkçe karakterleri taşıyan ToUnicode eşlemesi ve semantik etiket ağacı korunur. Önizleme tarifine yüklenen font baytları da aktarılır. Tema varsayılanı diğer modüllere uygulanmadı; yalnız sınıf iletişim listesinin üreticisi seçer.

## İşlevsel kapsamın korunması

20 bağımsız alanın tümü ve öğrenciler başlangıçta seçilidir. Okul numarası ayrı alandır, baştaki sıfırları korur. Seçimi kaldırılan alan başka hücre/bant/başlıkta görünmez. Yalnız kimlik seçiliyken gizli yakınlar satırı çoğaltmaz; yakın alanları seçiliyken tüm ek yakınlar korunur. Özel sağlık/aile notları standart iletişim kapsamına girmez. Bireysel öğrenci ve acil durum şablonları eski dört grup API’siyle çalışır; özel sağlık grubu başlangıçta kapalıdır. Sınıf belgesi dosya sürümü `6.0 / v6_0` oldu; veritabanı şeması değişmedi.

## Doğrulama

- **58/58 Node:** 45 sınıf listesi/alan/okul şablonu/adres testi ve 13 mevcut semantik motor testi aynı koşumda geçti. `node-tests.txt`. Yirmi alanın her biri portre ve yatay gerçek PDF’de ayrıca sınanır.
- **7/7 gerçek tarayıcı:** 390px alan seçimi, sıfır seçim, PDF/XLSX, şablon geçişi ve canvas/indirilen bayt eşitliği; 0/1/15/30/40 kayıt, logolu portre/yatay; 320/390/430px HTML ve baskı yüksekliği. `render-results/.last-run.json`. İlk bağlantı hatası kapalı yerel 4186 sunucusundan kaynaklandı; sunucu açıldıktan sonraki tam koşum 23,1 saniyede geçti.
- **7 PDF / 33 sayfa:** 0/1/15/30/40 öğrenci sırasıyla 1/1/4/7/9 sayfa; uzun logolu 15 öğrenci portre 6, yatay 5 sayfa. `generated.json`, `pdf-render-audit.json`, `roster-*.pdf` ve bütün sayfa PNG’leri.
- **2.428 dolu seçili hücre değeri:** Gerçek PDF metninde eksik 0; bütün sayfalarda metin kutusu taşması 0, metin üst üste binmesi 0, özel not 0. Sayı benzersiz kişi sayısı değil, dolu hücre değeri kontrollerinin toplamıdır. Bütün sayfa montajları ve küçük/uzun/portre ilk-son sayfaları ayrıca görüntülendi.
- **TypeScript:** `tsc --noEmit` geçti.
- **Bağımsız Laplace:** `tests/features/semantic-theme-independent.test.mjs` dört test; iki eski PDF SHA/bayt eşitliği, gerçek gömülü 700 font, Türkçe metin/ToUnicode, bozuk/erişilemeyen/regular fontun kalın diye kullanılmaması, tema kapalı font yüklenmemesi ve gerçek PDF renkleri/kontrast. Bu dört test yukarıdaki 58 sayısına dahil değildir.

Ana örnekler: `roster-1-page-1.png`, `roster-15-all-pages.png`, `roster-40-all-pages.png`, `roster-styled-portrait-all-pages.png`, `roster-styled-landscape-all-pages.png`; yalnız okul numarası ve yalnız adres çıktıları da aynı köktedir. Tüm veri kurgudur. Mevcut gerçek XLS dosyası değiştirilmedi, satırları kopyalanmadı.

PDF becerisinin authoring marker komutu font/belge üretiminden hemen önce bu aşamada bir kez başarıyla çalıştı: `--operation-kind edit --expected-output-count 7 --output-format pdf`.

Bu kabul gerçek PDF/render ve yazılım testleridir. Fiziksel yazıcıda renkli/siyah-beyaz kâğıt baskısı yapılmadı; yazıcı sürücüsü, mürekkep ve kâğıt son rengi etkileyebilir. Rol grupları renk dışında metin ve çizgilerle de ayrıldığından anlam yalnız renge bağlı değildir. Üretim/çevrim dışı PWA ve yayın kapısı kök ajan tarafından ayrıca yürütülür.
