# MaarifOS 0.27.0 yayın kabulü

7 Eylül 2026 tarihinde dokuz geliştirme mevcut adreste yayımlandı:
https://maarifos-emine-akis-pusulasi.fbsercannn.chatgpt.site

Dağıtım sonucu **succeeded**, Sites sürümü **35**. Kaynak commit'i `4cfa13720ae3140ecfabc778d2d7d2050650ff69`. Önceki 0.26.0 kaynağı ve yayını korunmaktadır. Kullanıcının çalışma alanındaki diğer değişiklikler geri alınmadı; yayın izole kaynak dizininden üretildi. Mevcut public erişim politikası değiştirilmedi.

Yeni sürüm şifreli kasa/kurtarma, ortak takvim ve üyelik hesabı, gerçek PDF önizlemesi, iletişim güncelliği, teslim defteri, veli görüşmeleri, haftalık hazırlık, özgün uyum rehberi adımları ve öğretmenin gözlem–karar–plan–değerlendirme akışını içerir. Önceki dört alanlı adres, soyadı önerisi, Excel aktarımı, öğrenci yaşam döngüsü ve profesyonel belge özellikleri korunmuştur.

Üretim kontrolünde sınıf rotası `Accept: text/html` ile 200 döndü. Canlı precache manifesti ve ana JS/PDF worker SHA-256 değerleri test edilmiş yerel üretim sürümüyle aynı. Worker 0.27.0; PDF worker `text/javascript` ile sunuluyor. PWA güncellemesi veri korunarak, çevrimdışı yeniden açılış ve yeni tarayıcı sürecinde ağsız soğuk başlangıçla sınandı.

Yerel arşiv 202 dosya içerir; kaynak kod ağacı, testler, sentetik yedekler ve .xls girdileri dağıtım arşivine alınmadı. Yerel gzip arşivi ile Sites'ın kendi arşiv temsili ayrı hashlerle makbuza yazıldı; canlı eşitlik iddiası tar üstbilgilerine değil dağıtılan uygulama dosyalarının byte karşılaştırmasına dayanır.

Tam test matrisi `DOKUZ_GELISTIRME_KABUL_2026_09_07.md`; makbuz `app/output/publish-0.27.0-receipt.json`; hash doğrulamalı on zorunlu gereksinim kabulü `app/output/completion-2026-09-07/acceptance-live/evaluation.json` içinde **READY**. Bilinen kabul hataları kapatıldı; sıfır hata garantisi veya fiziksel telefon pilotu iddiası yoktur.
