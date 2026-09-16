# Günün çıkışı, malzeme kutuları ve aile dönüşleri — 12 Eylül 2026

Yerel uygulama sürümü **0.43.0**. Yeni araçlar **Belgeler → Sınıfta kullanılacak belgeler** bölümündedir. Önceki dört belge aracı korunur. Canlı sürüm bu çalışma sırasında değiştirilmez.

## Tamamlanan ürün akışları

### Günün çıkış paketi

Günün gerçek yoklaması, düzeltilmiş teslimleri ve okul takvimine göre sonraki öğretim günü bir arada gösterilir. Devamsız çocuktan teslim beklenmez; kaydı olmayan çocuk gelmiş sayılmaz. Eksik yoklama ve teslim, doğrudan mevcut gerçek kayıt ekranına açılır. Teslim kaydı yalnız bugünün gerçek saatinde oluşturulur; geçmiş gün seçimi bugüne sessizce taşınmaz, geçmişte okuma ve bugüne açık geçiş vardır.

Sonraki öğretim gününde plan yoksa hazır iş paketi aynı yerde plan zincirini oluşturur. Gerçek plan ve etkinliklerdeki malzeme/hazırlık seçimi mevcut öğretmen takip listesine kaydolur. Plan oluşturulduktan sonra geri alma düğmesinin durumu korunur. Aynı kaynaklardan yatay A4 kontrol PDF'i alınır; belge kendi geçmişine kaydolunca açık önizleme geçersizleşmez.

### Malzeme kutusu etiketleri

Açık öğrenme merkezi düzenleri ve ayrılmış gerçek stoklar etiketin kaynağıdır. Her A4'te üç sütun × dört satır, toplam 12 kesim alanı bulunur. Merkez/kutu adı, tam içerik ve aynı malzemeyi kullanan kayıtlı etkinlikler gösterilir. Uzun içerik numaralı devam etiketlerine geçer; kaynak metin kesilmez.

Öğretmenin seçtiği eksik malzemeler mevcut haftalık hazırlık kayıtlarına eklenir. Kutuyu hazır işaretleme, malzemeyi tüketilmiş veya etkinliği uygulanmış saymaz; ayrı `learning-centers-v1/center-box-check` kaydıdır. Malzeme hareketi sonrasında hazırlık durumu yeniden değerlendirilir. Boş merkez ve plan durumlarında ilgili gerçek hazırlama ekranına düğmeyle geçilir.

### Aile dönüş panosu

Hazırlanmış aile oyun kartları ve gerçekten gelen yanıtlar birlikte görünür. Yanıt seçilince önümüzdeki uygun öğretim günlerinden birine kaynak etkinliği ilgili çocuk için yeniden planlama veya gerçek veli görüşmesinin gündemine ekleme seçenekleri hazırlanır. Aynı gün için ikinci günlük plan oluşturulmaz. Kayıtlı yakın ve saat seçimiyle yeni görüşme; uygun mevcut görüşmeye gündem ekleme desteklenir.

Eylem `home-game-card-v1/response-action` kaydıyla gerçek yanıt ve hedef plan/etkinlik/randevuya bağlanır. Uzun yanıt, kısa randevu başlığına sıkıştırılmaz; görüşme formu gerçek kaynaktan tam metni okur. Planlama, aile yanıtının okul gözlemi veya gerçekleşmiş etkinlik olduğu anlamına gelmez. Boş panodan aile kartı hazırlama; eksik yakın bilgisinden çocuk profiline doğrudan geçiş vardır.

## Ortak davranışlar

Altı belge/iş paneli seçilince yüklenir. Panel değiştirmek açık aile kartının taslağını kaybettirmez. Gerçek kaynaktan hazırlanan seçeneklerin kaydı ikinci inceleme kuyruğuna girmez. Yeni işlemler mevcut yerel şifreli veri/yedek sözleşmesini kullanır. Tekrar tıklama, kaynak değişikliği, başarısız fiziksel yazma ve kalıcı çocuk silme kabul kapsamındadır.

Çıkış paketi ile malzeme etiketi aynı hazırlık kayıtlarını kullanır. Diğer ekrandan kaydedilmiş aynı kaynak/madde tekrar oluşturulmaz; yalnız eksik kalan maddeler tamamlanır. Kaynak sürümü veya ilgili kayıt değişmişse eski seçim yeniden hazırlanır.

Aile panosunda ilk boş öğretim günü otomatik seçilir; ilk beş boş gün ayrıca düğme olarak sunulur. Öğretmenin elle seçtiği tarih korunur; dolu güne ikinci günlük plan yazılmaz.

## Son yerel kabul

- 1.362/1.362 özellik testi; TypeScript ve politika lint denetimi geçti.
- Birleşik 30 tarayıcı senaryosunun 28 geliştirme senaryosu kabul edildi; üretime ayrılan iki senaryo kendi üretim koşusunda geçti. İlk birleşik koşudaki tek hata, testin çevrimdışı tanılama amacıyla yeni bir geliştirme modülü indirmeye çalışmasıydı. Fixture mevcut statik okuyucusunu dışa açacak şekilde düzeltildi; ilgili senaryo aynı 4187 sunucusunda çevrimdışı kontroller değiştirilmeden yeniden geçti.
- Gerçek IndexedDB üzerinde tekrar tıklama, değişmiş kaynak, fiziksel yazma hatasında geri alma, şifreli yedekten geri yükleme ve ilgili çocuk silindiğinde belge kapsamı sınandı. Teslim için seçilen geçmiş tarih sessizce bugüne taşınmıyor.
- Çıkış paketi ve etiket PDF'leri 320 px ekranda çevrimdışı iki kez indirildi; iki indirme byte eşit, belge geçmişi tek kayıt. Yatay A4 çıkış paketi ve 12 kesim alanlı etiket A4'ü görsel olarak incelendi. Uzun etiket içeriği devam kartında korunuyor.
- Son 0.43.0 derlemesi ve 161 JavaScript parçasının gzip ≤180 KiB bütçesi geçti. Korunan 36 runtime dosyası doğrulandı. Yeni runtime bağımlılığı eklenmedi.
- Aile yanıtı kaydından sonra olay, doğrudan yenileme ve üst ekran yenilemesinden gelen aynı okuma istekleri 50 ms içinde birleştirilir. Mevcut gerçek IndexedDB kabulü panelin tek plan işlemi sonrasında yalnız bir snapshot okuduğunu doğrular; eski okumaların sonucu ve hatası yeni seçimi değiştiremez.
- Son derlenmiş uygulamada 320 px çevrimdışı geniş üretim senaryosu 1/1 geçti: dört PDF'nin her biri iki kez byte eşit indirildi; klasör ZIP'i açılabilir imzasını korudu; küçük grup gerçek plana atandı; gerçek aile yanıtından yalnız ilgili çocuğa `planned` etkinlik kaydoldu ve gerçek gün planı açılıp kapandı. Yanıt yeniden yükleme sonrasında korundu. `production-workflows.log` toplam 50,1 saniyelik koşuyu içerir. Aynı senaryoda aile planlama tıklaması → kayıtlı sonuç görünümü 5.741 ms'den 3.501 ms'ye indi; bu tek karşılaştırma ölçümüdür, genel cihaz performansı vaadi değildir.
- 0.42.0 önbellek manifestosu 231 varlık / 8.803.208 bayt; 0.43.0 239 varlık / 8.872.870 bayt. Üç aracın toplam paket farkı 69.662 bayt. Önceki ağır rehber PDF/görsel çıkarımı korunur; araştırma PDF'i üretime gömülmez. Bu ölçüm indirme/önbellek hacmidir, tüm cihazlar için gecikme garantisi değildir.

Kanıtlar `app/output/teacher-operations-2026-09-12/` altındaki `features.log`, `integration.log`, `production-lazy.log`, `coalesced-final-build.log`, `bundle.log`, `bundle-metrics.json` ve runtime/sözleşme kayıtlarıdır. Etiket düzeltmesinin ayrı tekrar koşusu `material-offline-regression.log` içinde 1/1 geçti. PDF ve mobil kanıtları `app/output/day-exit-package-2026-09-12/` ve `app/output/material-box-labels-qa/` altındadır. Yalnız sentetik kabul verisi kullanıldı.

Yerel sürüm **0.43.0 — VERIFIED_LOCAL**. Bu görevde yayın yapılmadı; canlı **0.41.0 / Sites 37** korunur.

## Yeni rapor önerileri

Kullanıcının istediği günlük, haftalık, aylık, dönemlik ve yıllık idare dosyaları için resmî kaynaklı ayrı ürün önerisi hazırlandı: [TYMM idare raporları](TYMM_IDARE_RAPOR_ONERILERI_2026_09_12.md).

Öncelik aylık idare dosyasını mevcut aylık plan/değerlendirme/klasör setiyle birleştirmek; ardından çocuk bazında dönem sonu Ek 4 hazırlığıdır. Rapor merkezi bu sürümde uygulanmış sayılmaz. Yeni raporlar zorunlu resmî form veya otomatik e-Okul aktarımı diye sunulmaz.
