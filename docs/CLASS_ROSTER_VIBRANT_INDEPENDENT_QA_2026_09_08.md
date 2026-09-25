# Canlı sınıf listesi — bağımsız kabul

Bu denetim ürün kaynaklarını değiştirmeden, yalnız kurgu kayıtlarla yürütüldü. 0.29 işlevsel kabul dosyaları korunur; bütün yeni kanıtlar `output/class-roster-vibrant-2026-09-08/` altındadır.

## PDF motoru ve font: 4/4 geçti

Komut: `node --test tests/features/semantic-theme-independent.test.mjs`

- Tema kapalı portre ve yatay PDF'ler, tema eklenmeden önce yakalanan iki SHA-256 değeriyle birebir aynı. Kalın font yükleyicisi bu yolda çağrılmıyor.
- Yeni başlıklar gerçek 700 ağırlıklı TTF; gövde 400 ağırlıklı TTF. PDF içinden çıkarılan font baytlarının SHA-256 değerleri kaynak dosyalarıyla aynı. Başlık kalınlığı çizgi ekleyerek taklit edilmiyor.
- Türkçe karakterler ToUnicode metin çıkarımında korunuyor. Son öğrenci ve imza kaybolmuyor; metin sayfa sınırını aşmıyor.
- Bozuk, erişilemeyen veya normal ağırlıklı font kalın font gibi kabul edilmiyor; işlem açık Türkçe hatayla duruyor. Kalın başlık seçeneği kapalı tema yalnız normal font kullanıyor.
- Gerçek PDF arka planı üzerinde bütün metinler en az 4,5 kontrast sağlıyor. Rol paletinin tüm dolgu ve açık ton eşleşmeleri ayrıca ölçülüyor; örnek PDF'deki en düşük metin kontrastı 6,3297. Filtrelenmiş rol, sırası değişince rengini değiştirmiyor; devam sayfalarında grup başlıkları tekrarlanıyor.

Görsel inceleme: yatay ilk sayfa ve portre devam sayfasında belirgin başlıklar, okunur grup ayrımı ve taşmasız metin doğrulandı. Kullanıcı örneğindeki başka kuruma ait logo veya metin kullanılmadı.

Kanıtlar:

- `output/class-roster-vibrant-2026-09-08/independent/run-final.log`
- `output/class-roster-vibrant-2026-09-08/independent/acceptance-receipt.json`
- `output/class-roster-vibrant-2026-09-08/independent/legacy-baseline.json`
- `output/class-roster-vibrant-2026-09-08/independent/vibrant-landscape-page-1.png`
- `output/class-roster-vibrant-2026-09-08/independent/vibrant-portrait-page-2.png`

## Gerçek 0.27 → 0.30 yükseltmesi

Tek senaryo hazır; nihai 0.30 üretim paketiyle çalıştırılacak. Komut: `npx playwright test --config=playwright.roster-vibrant-upgrade.config.ts`.

Test gerçek yayımlanmış 0.27 HTML/JS/worker dosyalarıyla kendi geçici HTTP adresinde sınıf ve iki çocuk kaydını kullanıcı arayüzünden oluşturur. Aynı adres daha sonra nihai 0.30 dosyalarına geçirilir. Öğretmenin güncelleme düğmesi, mevcut kayıtların korunumu, çevrim dışı yeniden açma, 20 → 17 → 2 alan ve tek çocuk kapsamı, PDF/Excel/Yazdır bayt ve kapsam eşitliği, gerçek font/kontrast ve 320/390 piksel mobil görünüm aynı senaryoda sınanır.

Mevcut PWA testindeki önceki sürüm etiketini değiştirme simülasyonu bu gerçek sürüm geçişi kanıtıyla aynı iddia değildir. Yeni senaryoda dosya içerikleri veya sürüm etiketleri yeniden yazılmaz. Üretimde kaynak modülü veya fikstür enjeksiyonu yapılmaz. Fiziksel yazıcı ve bu test aracılığıyla yayın sınanmaz.
