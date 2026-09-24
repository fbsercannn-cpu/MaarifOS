# Çocuk gelişim kartı ve öğretmen gözlem özeti — 0.21.0

31 Ağustos 2026. Bu paket, önceki yıl başlangıcı ve dokunarak Maarif gözlemi çalışmasının devamıdır. Canlı yayın yapılmadı. Bütün ürünün 10/10 olduğu veya resmî gelişim kontrol listesinin tamamının uygulandığı ileri sürülmez.

## Kullanıcı akışı

1. **Sınıfım:** Bu hafta, bu ay veya eğitim yılı için hangi çocuklarda kayıt olduğu görülür. Çocuk listesi ayrıntısı kapalıdır; henüz kaydı olmayan bir çocuk için gözlem doğrudan açılır. Çocuk ekleme ve gözlem kaydetme sonrası kapsam yenilenir.
2. **Çocuğun adı:** Gelişim kartında son üç kayıt, tarih ve mevcut alan/destek bilgisi görünür. Eski arşiv, fotoğraf, kimlik, yakınlar ve profil işlemleri tek kapalı ayrıntıda korunur. Kayda dokunmak asıl değişmez gözlemi açar.
3. **Rapor hazırla:** Kartta seçili dönem taşınır. Öğretmen ham gözlemleri seçer, yorumunu ve isteğe bağlı sonraki desteği ayrı yazar. Taslak cihazda korunur.
4. **Özeti onayla → PDF indir:** Onay kutusu ve açık onay gerekir. Onaylı içerik salt okunur. Düzeltme yeni taslak oluşturur; eski onaylı kayıt korunur.

## Veri ve pedagojik sınırlar

- Sayılar yalnız kayıt kapsamıdır. Başarı puanı, tanı, kişilik etiketi, gelişim düzeyi veya otomatik yeterlilik kararı üretilmez.
- Kart ve rapor aynı çocuk/sınıf/eğitim yılı ve olay günündeki üyelik sınırını kullanır. Resmî başlangıçtan önce açıkça başlatılmış eğitim yılının çalışma tarihi desteklenir.
- Gerçek tek çocuk hızlı gözlemlerinin `studentIds` biçimi desteklenir. Çok çocuklu ortak ham kayıt bireysel rapora otomatik taşınmaz.
- Kanıt snapshot'ında yalnız ilgili çocuğun ataması tutulur. Bir çocuğun kalıcı silinmesi diğer çocuğun raporunu silmez; silme önizlemesi raporları sayar.
- Ham gözlem, varsa kaydedilmiş çocuk sözü, destek ve doğrulanmış program hedefi ayrı tutulur. Program bağı olmayan ham gözlem için bağlantı varmış gibi gösterilmez.
- Rapordaki açık ad **Öğretmen gözlem özeti**dir. Resmî MEB/e-Okul formu, otomatik gelişim raporu veya dijital imza değildir. SHA-256 yalnız yerel içerik bütünlüğü denetimidir.
- Onay ve PDF öncesi güncel kaynak okunur; PDF üretimi sonrası da kaynak ve onay tekrar kontrol edilir. Görünür kaynak değiştiyse sessiz otomatik kayıt yapılmaz; öğretmen metni korunarak kaynak yenileme ve yeniden inceleme gerekir.
- İki sekmedeki revision çatışmasında mevcut kayıt ezilmez; yerel öğretmen metni ayrı taslağa alınır. Güvenlik ekranı raporu gizlerken bellekteki kaydedilmemiş metni yok etmez. Açık rapor gece yarısında yeniden başlatılmaz.
- V8 yedek, taslak ve onaylı raporu içerir. V1–V7 kaynaklar kayıpsız okunur. Eski onaylı kaynak snapshot'ı korunabilir fakat güncel olmayan rapor PDF'e çıkamaz. Yeni V8 yedek eski uygulama sürümüne geri yüklenemez.

## Doğrulama kanıtları

| Kontrol | Kanıt |
|---|---|
| Özellik testleri | `npm run test:migration`: 899/899 |
| Gerçek IndexedDB, şifreli yedek, restore ve yarışlar | `npm run test:data`: 36/36 |
| Rapor alan sözleşmesi | `development-report.test.mjs`: 10/10; kaynak tahrifi, immutable onay, yanlış kapsam, kaynak/revision yarışları |
| PDF sözleşmesi | `development-report-export.test.mjs`: 6/6 |
| Gelişim kartı/rapor ana akışı | `development-workspace-ui.spec.ts`: dev 4/4; kaynak değişiminde PDF kapanması dahil |
| Hata kurtarma | `development-report-recovery-ui.spec.ts`: dev 3/3; ikinci sekme ayrıca gerçek UI ile 1/1 tekrarlandı |
| Son üretim rapor/kurtarma paketi | `playwright.development-workspace-production.config.ts`: 7/7; gerçek iki sekme, hızlı geri dönüş, X/Escape geçmişi, 320 px soğuk çevrimdışı PDF, kota ve kaynak değişimi dahil |
| Eski yıl/gözlem akışları | `academic-year-preparation-ui`, `development-observation-ui`, `quick-observation-legacy-ui`: 8/8 |
| Tekrarlı ve toplu gözlem | `quick-observation-20cycle.spec.ts`: 2/2; 20 çevrimde tekil kayıt ve yarım kalan toplu taslağın korunması |
| Profil ve dar telefon | İlgili `maarifos-data-flow` ve `pwa-native` akışları: 4/4; 320 px taşma ve 44 px hedefler |
| Üretim PWA | Güncelleme/veri koruma/soğuk çevrimdışı açılış: 3/3; önceki gelişim gözlemi production paketi: 4/4 |
| Derleme ve koruma | TypeScript, policy lint, klavye sözleşmesi, MARİF sözleşmesi, 36 korumalı runtime dosyası ve build/bundle geçti; 63 JavaScript parçası, parça başına gzip ≤180 KiB |

Üretim rapor/kurtarma paketinin son yedi testi 1,3 dakikada geçti; sonuçlar `app/output/playwright/development-workspace-production-2026-08-31/` klasöründedir. Geliştirme ana akışı: `app/output/playwright/development-workspace-2026-08-31/`; yıl ve eski gözlem regresyonu: `app/output/playwright/development-workspace-regression-2026-08-31/`; tekrarlı/toplu akış: `app/output/playwright/development-workspace-20cycle-2026-08-31/`.

Üretim doğrulamasında bulunan hızlı geri dönüşte dokunma engeli, rapor→profil geçişinde temiz modal örneği kullanılarak düzeltildi; native X/Escape kapanışında yeni geçmiş girdisi eklenmez. Korumalı `BottomSheet` dosyasına veya küresel pointer-events davranışına müdahale edilmedi. Son derlemeden sonra hem yeni yedi test hem mevcut gelişim/PWA yedi testi yeniden geçti.

## PDF görsel kontrolü

`app/output/pdf/teacher-observation-summary-0.21.0.pdf` yalnız kurgu veri içerir. 10.158 karakter ham gözlem ve 3.592 karakter öğretmen değerlendirmesi beş A4 sayfada korunur. Bütün sayfalar render edilerek incelendi; tam Türkçe metin çıkarımı, gömülü font/ToUnicode, Tagged=yes, Suspects=no ve her sayfada güvenlik notu doğrulandı. SHA-256 ve kaynak dosya özetleri `app/output/document-qa/development-report-0.21.0/manifest.json` içindedir. PDF/UA uygunluğu iddia edilmez.

## Açık kalan kabul

Bu görevde tam `quality:gate` ve canlı dağıtım yapılmadı. Fiziksel iOS/Android, VoiceOver/TalkBack, gerçek yazıcı ve gerçek öğretmen/uzman saha kabulü açıktır. Rapor kayıtları dâhil bütün koleksiyonların cihazda tam şifrelenmiş olduğu iddia edilmez; mevcut öğrenci kasası ve parolalı yedek sınırları geçerlidir. Gerçek çocuk verili saha için mevcut güvenlik ve uzman kabul kapıları korunur.

Ders: Gelişim raporu, yeni kayıt yükü oluşturmadan öğretmenin gördüğü kaynaklara ve açık onayına bağlı kalmalıdır.
