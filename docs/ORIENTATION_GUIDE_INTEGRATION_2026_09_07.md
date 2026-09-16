# Okula Uyum Rehberi entegrasyonu · 7 Eylül 2026

Kullanıcının sağladığı `Okul Öncesi Eğitim Okula Uyum Rehberi 2026-2027.pdf`,
MaarifOS **Belgeler → Okula uyum rehberi** okuyucusuna bütün sayfalarıyla eklendi.
Bu ek kaynak mevcut 38 uzak resmî TYMM kaynağı kataloğundan ayrı tutulur. Kapakta
T.C. Millî Eğitim Bakanlığı / Temel Eğitim Genel Müdürlüğü beyanı bulunur; sağlanan
yerel dosyanın internette resmî yayımlanma doğrulamasının yapılmış olduğu iddia edilmez.

## Tamamlık kanıtı

| Denetim | Sonuç |
|---|---|
| Özgün dosya boyutu | 13.514.036 bayt |
| Özgün dosya SHA-256 | `353b9e91e3f140b96dc3e3f110815e5592a809750caa6bbb8575274a100059a4` |
| Kaynak ve kopya | Bayt düzeyinde aynı; pypdf ile 35 sayfa |
| Sayfa kapsamı | Kapak ve basılı 1–34 sayfalar; PDF sayfa 1–35 |
| Sayfa görselleri | 35 tam sayfa; PDFium, 144 dpi, 6.046.440 bayt WebP |
| Aranabilir metin | 35 sayfanın tamamı, 44.316 karakter; kısaltma veya yeniden yazım yok |
| Ekler | Ek-1 aile notu, Ek-2 çizelge, Ek-3 Okulda İlk Haftam |
| Etkinlik kapsamı | Kaynaktaki 1–25 numaralı etkinliklerin tamamı |
| Kaynak bağlantıları | Kapaktaki e-posta ve son sayfadaki 10 farklı materyal bağlantısı |
| Manifest SHA-256 | `e5cec876447e9692beaf45c128849daa19f26d7af0bb038ae6257edad80beb13` |

Tam kaynak `app/public/assets/resources/orientation-guide-2026-2027/` klasöründedir.
`manifest.json`, her sayfanın metin ve görsel SHA-256 özetini, boyutunu, PDF sayfa
numarasını, basılı sayfa numarasını ve özgün bağlantılarını taşır. Bölüm etiketleri
PDF başlıklarına göre MaarifOS gezinme metadata'sıdır; kaynak içeriği veya yeni
resmî eğitim programı değildir.

Özgün PDF tekrar yazdırılmadı veya yeniden dışa aktarılmadı. Kullanıcının verdiği
baytlar aynen kopyalandı. Tüm sayfalar ayrıca görüntülendi; üç kontakt görseli
`app/tmp/pdfs/orientation-review/` altında bulunur. Otomatik metin çıkarımı özellikle
gölge yazılı kapak, döndürülmüş çizelge ve karekod sayfasında görsel okuma sırasını
koruyamayabilir. Bu sınırlama okuyucuda görünürdür. Özgün sayfa görünümü ve indirilen
PDF, çizelgeleri, resimleri ve bütün sayfa düzenini korur.

## Okuyucu

- Bütün rehberde Türkçe harf duyarlı olmayan, satır aralarını birleştiren arama.
- Her arama sonucu tam ilgili sayfayı açar; sonuç listesi bir özet yerine gezinme yardımcısıdır.
- 35 sayfalı bölüm seçimi, önceki/sonraki gezinme ve ayrı PDF/basılı sayfa numarası.
- Özgün sayfa görseli ile 16 px, seçilebilir ve yeniden akabilen tam metin görünümü.
- Her zaman erişilebilir özgün PDF açma ve indirme bağlantıları. Normal dokunuşta
  dosya tam GET ile alınır, bayt boyutu ve SHA-256 doğrulanır, ardından PDF Blob'u
  açılır/indirilir. Böylece tarayıcının çevrim dışı Range isteğine bağımlılık yoktur.
  Yeni sekme engellenirse aynı özgün dosya indirilir; yanlış/eksik PDF açılmaz.
- Kaynak karekodlarının gömülü bağlantıları aynı URL'lerle adlandırılmış eylemlere dönüşür.
- Tek dikey kaydırıcı, sabit kapatma/gezinme alanı, en az 44 px kontroller ve kapatınca odak dönüşü.

Haricî materyaller dosyanın kendisinin parçası değildir; bu bağlantılardaki şarkı,
platform veya ayrı dosyalar otomatik indirilmez ve internet gerektirir. Bu sınır
bağlantı listesinin yanında açıklanır. Kaynaktaki etkinlikleri açmak plan, gözlem,
çocuk değerlendirmesi veya sınıf kaydı oluşturmaz.

## Çevrim dışı ve veri sözleşmesi

37 okuma kaynağı (manifest, PDF ve 35 WebP), `offline-assets.json` yardımcı listesiyle
birlikte mevcut `public/assets/` sürümlü önbellek zincirine girer. Mevcut
`prepare-sites-build.mjs` her dosyanın boyut ve SHA-256 özetini üretim precache
manifestine ekler. Yeni özel service worker, uzak istek veya kalıcı kullanıcı
verisi koleksiyonu eklenmedi. Rehber okuma/arama durumu oturumluk UI durumudur;
öğrenci yedeği biçimini değiştirmez. Rehber, uygulama kaynakları olarak yeniden
kurulur. İlk kurulum/güncelleme tamamlanmadan çevrim dışı erişim garanti edilmez.

## Doğrulama

- `node --test tests/features/orientation-guide.test.mjs`: 6/6 geçti. Bütün kaynak
  baytları, 35 metin/görsel digest'i, tüm etkinlikler/ekler, Türkçe arama,
  bozuk/eksik kaynak reddi, ağ hatası/yeniden deneme ve tam PDF hash doğrulaması geçti.
- `MOBILE_RUNTIME_TEST_PORT=4183` ile `tests/orientation-guide-ui.spec.ts`: geçti.
  Gerçek uygulama Belgeler girişi, arama, 35 bölüm, mobil 320/390/430 px, tek
  kaydırıcı, dokunma hedefleri ve odak dönüşü doğrulandı.
- Son görsel kontrol: `app/output/orientation-guide-2026-09-07/mobile-page-12.png`.
- TypeScript, policy lint ve korunan mobil runtime denetimi geçti.
- **0.24.0 final üretim build: çevrim dışı kabul PASS.**
  `PWA_PREVIEW_PORT=4183` ile `playwright.orientation-guide-production.config.ts`
  testi 5,6 saniyede geçti. Okuyucu çevrim içiyken hiç açılmadan kurulum tamamlandı;
  ağ kesilip uygulama yeniden yüklendi; rehber ilk kez çevrim dışıyken açıldı.
  35 sayfanın metin/görsel SHA-256 özetleri ve özgün PDF hash'i tarayıcıda doğrulandı.
  Ardından gerçek indirme olayıyla kaydedilen 13.514.036 bayt PDF'nin kaynakla aynı
  olduğu doğrulandı. Blob PDF yeni sekmede açıldı; Chromium PDF okuyucusu 35 sayfayı
  yükledi ve kapak/Giriş görsel olarak kontrol edildi. Popup engellenmesi benzetiminde
  aynı dosyanın indirilmesi ve hash eşitliği doğrulandı.
- Üretim PDF testi `channel: chromium` kullanır. Varsayılan `chrome-headless-shell`
  PDF yeni sekmesini `about:blank` olarak bırakırken tam Chromium aynı dosyayı
  yerleşik PDF okuyucusunda açmıştır. Bu ortam farkını gidermek için test beklentisi
  zayıflatılmadı; yerleşik okuyucunun 35 sayfayı yüklemesi ayrıca beklenir.
- Üretim görsel kanıtları:
  `app/output/orientation-guide-2026-09-07/offline-original-pdf.png` ve
  `app/output/orientation-guide-2026-09-07/offline-full-text.png`.
  Fiziksel iOS/Safari cihaz kabulü bu Chromium testinin kapsamında değildir.

Yeniden üretim: paketli Python ile
`python scripts/import-orientation-guide.py <kullanıcının-kaynak-PDF-yolu>`.
Script yalnız beklenen kaynak hash'i ve 35 sayfa eşleşirse çalışır; farklı sürüm
geldiğinde yeni içerik incelemesi gerekir.
