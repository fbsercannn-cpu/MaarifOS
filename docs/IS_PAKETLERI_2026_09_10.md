# Hazır iş paketleri — 0.37.0

Öğretmenin işi, kaydettiği gözlemler için hazırlanmış sonucu seçmek ve günlük planın eksiklerini aynı yerde tamamlamaktır. Bir öneriyi seçmek işlemi gerçekleştirir; ikinci bir onay veya boş form zorunlu değildir.

## Kabul kapsamı

1. Gözlem kategorisi, uygun kaynak bağlantısı, destek planı ve takip için hazırlanmış adımlar tek paketle uygulanır. Pakette yalnız gerçekten uygulanabilecek adımlar gösterilir.
2. Düğme ve önizleme hangi kaydın, başlığın ve tarihin değişeceğini açıklar.
3. Mevcut uygun kayıt yeniden kullanılır; aynı işi tekrar seçmek mükerrer plan üretmez.
4. Planlamada eksik halkalar mevcut planları koruyarak hazırlanır.
5. Birden fazla gözlem seçilip her birinin hazırlanmış yerleşimi tek işlemle kaydedilir.
6. Önceki açık seçimler sonraki önerilere yardımcı olur. Geri alma yalnız paketin değiştirdiği ve sonradan değiştirilmemiş kayıtları etkiler.

## Veri sınırları

Ham gözlem metni ve ilk kayıt zamanı korunur. Plan oluşturmak etkinliğin uygulanması veya çocuğun bir beceriyi edinmesi anlamına gelmez. Gözlemin asıl kaynak bağlantısı gelecekteki destek planından ayrıdır. Üretken yapay zekâ ve dış veri aktarımı eklenmez.

## Doğrulama

Gerçek çocuk verisi kullanılmadı. Uzak yayın yapılmadı.

- Telefon kabulü: `tests/work-packages-ui.spec.ts` 2/2; iki gözlemin kanonik bağlantılarla toplu kaydı, ilgisiz üçüncü gözlemi koruyan geri alma, eksik omurgadan günlük plana tek uygulama, mevcut haftanın tekrar kullanılması, yeni gözlem sonrası anında yenileme ve önceki destek seçiminin önerilmesi geçti.
- Üretim çevrimdışı kabulü: `tests/pwa/work-packages-offline.spec.ts` 1/1; eşleşen dil gözlemi → TAKB.2 bağlantısı → geri alma → yeniden uygulama → yenilemede kaynak doğrulaması geçti. 320 px görüntü `app/output/work-packages-production/offline-package-result.png`.
- Gerçek IndexedDB bileşen kabulü: 4 senaryo; yazma kilidi, gecikmeli okuma ve üst ekran yenilemesi, kayıt sonrası okuma hatası, kapsam değişimi, geri alma ve önceki küçük grup seçiminin sonraki gözleme önerilmesi geçti.
- Eski öğrenci silme/kategori/hazırlık akışları 8/8 geçti. TypeScript, üretim derlemesi, politika lint ve 137 JavaScript parçasının paket bütçesi geçti. Korunan mobil çalışma zamanı 36 dosyada doğrulandı.
- Son özellik paketi 1.310/1.310 geçti. `tests/core/work-package-atomic.spec.ts` ve `tests/core/work-packages.spec.ts` toplam 4/4 gerçek IndexedDB senaryosuyla dış işlemde hata enjeksiyonu, tamamen eski duruma dönme, değiştirilmiş/eski isteği reddetme, tekrar yazmama, ortak hafta kullanımı ve şifreli yedekten birebir dönüşü doğruladı. Sonradan değiştirilen plan, yeni hazırlık kaydı ve bağlı günlük plan bulunan durumda geri alma hiçbir kaydı değiştirmeden reddedildi.
- 390 px elle kontrolde dil gözlemi için hazırlanmış kategori + TAKB.2 kaynağı + mevcut haftada destek/takip paketi tek dokunuşla kaydedildi; gerçek sonuç bağlantıları ve tek dokunuşla geri alma doğrulandı. Sonunda normal görünüm boyutu geri getirildi.

Tercihler kaydedilmiş açık destek seçimlerinden türetilir; yeni gözlemin kategorisi kendi metninden hazırlanır. Geri alma makbuzu yalnız açık oturumda tutulur; ham veriyi yeni kalıcı bir alanda çoğaltmaz. Sayfa yenilenince uygulanmış iş korunur, oturumun geri alma düğmesi taşınmaz. Plan paketi eksik yıl–ay–hafta bağlantıları ve seçilen günlük hedefi tamamlar; yapılmış gözlem veya öğretmen yargısı üretmez.

Tek IndexedDB işlem sınırı için tasarım sözleşmesi `app/output/work-packages-atomic/commit-contract.json` dosyasındadır. Becerinin sözleşme denetleyicisi `ATOMIC`, sıfır bulgu döndürdü. Bu sonuç tasarım modelinin kontrolüdür; gerçek çalışma zamanı hata/geri alma testlerinin yerine geçmez.
