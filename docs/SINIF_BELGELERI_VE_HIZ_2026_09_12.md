# Sınıf belgeleri, seçerek tamamlama ve hız — 12 Eylül 2026

Yerel sürüm: **0.42.0**. Bu çalışma mevcut canlı **0.41.0 / Sites 37** sürümüne henüz yayımlanmadı. Kabul senaryoları gerçek çocuk verisine dokunmadan kurgu kayıtlarla çalıştırıldı.

## Kullanım

**Belgeler → Sınıfta kullanılacak belgeler** bölümünde üç giriş bulunur: Teslim çizelgesi ve klasör, Küçük grup kartları, Aileye ev oyunu. Başlangıçta kapalıdır; seçilen panelin kodu ve kayıtları yüklenir. Paneller arasında geçiş form taslağını kaybettirmez.

### Günlük teslim çizelgesi

Yatay A4, okul/sınıf/öğretmen anteti; çocuk, kayıtlı yetkili kişi, telefon, gerçek teslim saati ve imza alanı. Yalnız açıkça teslim yetkilisi olarak kaydedilmiş kişiler yerleşir; anne/baba yakınlığı tek başına yetki sayılmaz. Düzeltilmiş teslim kayıtları hesaba katılır. Aynı ekran çocuğun gerçek teslim kaydını açar.

İmza alanını okunur tutmak için 20 çocuk örneği iki, 30 çocuk örneği üç A4 olur. Satırlar yaklaşık 11,6 mm, imza sütunu 65,4 mm, gövde 10 puntodur. Önceki tek sayfalık sınıf listesi ayrı çıktı olarak korunur.

### Küçük grup kartları

Bir A4 üzerinde iki sütun × üç satır; çocuklar, etkinlik, gerçek malzeme kaynağı, plan zamanı ve üç gözlem notu çizgisi. Altı normal kart örneği bir A4, gövde 10,5 punto. Uzun kaynak metinleri kesilmez.

Haftanın uygun kayıtlı günlük planını ve 2–8 çocuğu seçip grubu plana yerleştirme, aynı günlük planın ve etkinliğin atamasını tek işlemde günceller. Yeni hayalî plan türü veya uygulanmış gözlem üretilmez. Bugünün planı seçilebilir; geçmiş/uygulanmış/gözlem bağlı kayıtlar korunur. Bu sürümde kartlar kayıtlı günlük planlardan gelir; aynı günlük plan altında altı bağımsız eşzamanlı grup modeli değildir. Malzeme alanının boş olması grup atamasını kilitlemez.

### Aileye ev oyunu kartı

Seçilen gerçek etkinlikten başlık, malzeme ve aile oyunu adımları hazırlanır. Öğretmen düzenleyebilir; malzeme gerektirmeyen oyun için hazır seçim vardır. İki çocuk seçilirse her çocuk için bir A5; tek çocukta iki nüsha A4 üzerine yerleşir. Uzun içerik devam kartlarına aktarılır; 300 kaynak cümleli kabul örneği eksiksiz korundu.

Kart hazırlığı ayrı kayıttır. Ailenin gerçek yanıtı, tarihi ve iletişim biçimi ilgili çocuk/kart/etkinliğe kaydolur; yeniden açınca görünür. Kart hazırlamak kendiliğinden gönderildi/uygulandı/gözlendi sonucu üretmez.

### Klasör seti

Seçilen ayın gerçek plan ve kaydedilmiş belgelerinden içindekiler hazırlanır. Okul antetli kapak, içindekiler, aylık ayraç ve yaklaşık 43 mm sırt etiketi dört A4 oluşturur. Seçilen belgeler aynı setle gerçek ZIP dosyasında indirilir. İlgisiz yeni bir PDF sürümünün kaydı seçilmiş paketi geçersiz kılmaz.

## İşi tamamlayan seçimler

- Gözlem metninde sözcük eşleşmesi olmasa da uygun kanonik program/gelişim kaynakları seçilebilir. Öneriler doğrudan görünür seçim kutusundadır. Seçilen kaynak, kategori ve hazırlanmış destek adımları aynı kayıt işlemiyle tamamlanır.
- Uzun iş listesinde ilk altı iş çizilir; diğerleri sırayla açılır. İşler silinmez veya kapsam dışına çıkarılmaz.
- Mevcut günlük planın yıl/ay/hafta ilişkisi eksikse **Günlük planı bu haftaya bağla** eylemi aynı plan ve etkinliğin ilişkisini kaydeder. Planın akışı ve kendi kimliği korunur.
- Öğretmenin kendi kaynaklı değerlendirmesi **Değerlendirmeyi kaydet ve tamamla** ile kalıcı tamamlanır. Önceden bekleyen kendi değerlendirmeleri seçilerek tamamlanabilir; ikinci onay kuyruğu yoktur.
- Kaynak eşlemesinin uzman doğrulamasına sahip olduğu iddia edilmez. Teknik kaynak bilgisi ayrı açılır ayrıntıya taşındı; öğretmenin günlük işi bu bilgiden dolayı bekleyen görev gibi gösterilmez.

Ham gözlem, gerçek uygulama, öğretmenin değerlendirmesi ve uzman doğrulaması birbirinden ayrı tutulur. Eski seçim, başka sınıf/yıl ve kısmi yazma hatası sessizce kabul edilmez. Yinelenen tıklama yeni plan/etkinlik çoğaltmaz; uygun eski paket geri alma davranışı korunur.

## Ölçülen performans değişimi

Önceki yayımlanmış 0.41.0 önbellek manifestosu ile yerel 0.42.0 çıktısı karşılaştırıldı. Eski pakette 264 varlık ve 28.306.418 bayt bulunuyordu. Son ölçümün tam değerleri [performance.json](../app/output/print-workshop-2026-09-12/performance.json) dosyasındadır; yeni paket **8.803.208 bayt** (yaklaşık 8,8 MB), azalma **%68,9**.

Uyum rehberinin PDF'i, 35 sayfa görseli ve bunların eski çevrimdışı varlık listesi üretim paketinden çıkarıldı: toplam 37 dosya / 19.562.905 bayt. Kaynak arşivi yerelde korunur; mevcut kayıtlara bağlı 35 sayfanın hafif tam metni ve kaynak kimliği çevrimdışı kalır. Belgeler ve öğretmen takip ekranı ağır PDF okuyucusunu artık açmaz.

Yeni üç belge panelinin JavaScript'i kapalıyken çalıştırılmaz; aile kartı açılınca yalnız onun panel kodu yüklenir. Masa takvimi ve iş paketi ilk açılışındaki iki ayrı snapshot okuması bire indirildi. Eylem merkezi modeli aynı snapshot için yeniden hesaplanmaz.

Bu ölçüm dosya indirme/önbellek hacmini anlatır; %68,9 daha kısa ekran açılış süresi iddiası değildir. Geliştirme sunucusu ve yayımlanan profil farklı olduğundan karşılaştırma gerçek paket manifestolarına dayanır.

## Veri ve belge bütünlüğü

Yeni aile kartları ve gerçek geri bildirimler mevcut şifreli settings/yedek düzenindedir. Yeni bağımsız veri sunucusu kurulmadı. Grup ataması mevcut plan ve etkinliğe atomik yazılır; ikinci fiziksel yazım hatası her ikisini geri alır. Yedek dışa aktarma, geri yükleme ve kalıcı çocuk silme gerçek servislerle sınandı.

Küçük grup PDF'i seçilen kartlardaki gerçek çocukların tamamını belge geçmişine taşır; gruptan çocuk çıkarılmış çıktı seçimi reddedilir. Kalıcı çocuk silme o çocuğu içeren PDF sürümünü temizler; diğer çocukların esas kayıtları kalır. Aile kartı için de çocuk/kart/geri bildirim ilişkileri ve silme kapsamı doğrulandı.

## Kabul kanıtları

- 1.358 / 1.358 özellik testi: `app/output/print-workshop-features-final.log`.
- Birleşik belge/bağlama tarayıcı kabulü: 36 geçti; yalnız üretimde çalışması gereken lazy testi geliştirme koşusunda atlandı. `app/output/print-workshop-browser-final.log`.
- Gerçek uygulamada gözlem → kanonik kaynak seçimi → öğretmen değerlendirmesini tamamla: `app/output/print-workshop-assessment-real-ui-final.log`.
- Üretimde çevrimdışı ağır medya yokluğu ve 35 kaynak metninin SHA-256 eşliği: `app/output/print-workshop-light-pwa-final.log`.
- Gerçek derlemede 320 px, çevrimdışı dört belge, kayıtlı günlük gruba atama, gerçek aile yanıtı ve yeniden açılış: `app/tests/print-workshop-production.spec.ts`, `app/output/print-workshop-production/final-acceptance.log` (1/1, 41,4 saniye). Dört PDF ikişer kez birebir aynı baytlarla indirildi; ilk indirme sonrası yanlış kaynak değişimi uyarısı yok. Gerçek kaynak değişikliğinde eski belgeyi durdurma ayrıca `home-game-cards-ui.spec.ts` içinde doğrulandı.
- Üretim lazy panel kabulü: `app/playwright.click-completion-2026-09-12-production.config.ts`, `app/output/click-completion-sept12-production/`.
- Önceki masa belgelerinin derlenmiş çevrimdışı PDF/Word akışı: `app/output/print-workshop-production-offline.log`.
- Tür/lint, MARİF 5, UI sözleşmesi 2, PWA sözleşmesi 10, runtime kilidi 3 testi geçti. Korunan 36 dosya ve 156 JavaScript parçasında gzip/parça ≤180 KiB sınırı korundu.

Görsel örnekler: [altı grup kartı](../app/output/small-group-cards-2026-09-12/six-real-plan-cards.pdf), [teslim çizelgesi](../app/output/teacher-print-kit-qa/teslim.pdf), [klasör seti](../app/output/teacher-print-kit-qa/klasor.pdf), [iki aile kartı](../app/output/home-game-cards/two-cards.pdf). Bunlar kurgu kabul verileridir.

## Sonraki üç öneri

1. **Günün çıkış paketi:** Günün yoklaması, teslim kayıtları ve ertesi günün planından tek ekran hazırlanır. Tamamlananlar otomatik işaretlenir; öğretmen gerçek teslimi kaydeder, seçtiği ertesi gün hazırlığını plana ekler. Aynı seçimlerden yatay A4 masa kontrol sayfası çıkar.
2. **Malzeme kutusu etiketleri:** Öğrenme merkezlerindeki kayıtlı malzemelerden A4 üzerinde 12 kesilebilir etiket; kutu adı, içerik ve ilgili etkinlikler. Eksik malzemeyi seçince haftanın hazırlık listesine doğrudan ekler; hazırlanmış kutu tek tıkla işaretlenir.
3. **Aile dönüş panosu:** Hazırlanmış oyun kartları ve gelmiş gerçek yanıtlar bir arada görünür. Seçilen yanıttan mevcut etkinliği yeniden planlama veya veli görüşmesine gündem ekleme seçenekleri hazırlanır. Yanıt gelmeyen çocuk hakkında sonuç üretilmez; öğretmen seçtiği takip işini doğrudan kaydeder.

Kalıcı mühendislik dersi: Belge indirme kendi geçmiş kaydını oluştururken açık önizlemeyi eski saymamalı; gerçekten değişen kaynak ise aynı kapsamla yenilenmelidir.
