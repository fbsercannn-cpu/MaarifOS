# MaarifOS 0.28.0 — sınıf yönetimi ve belge kabulü

8 Eylül 2026. Kapsam: MR-097–MR-108. Durum: **VERIFIED_LOCAL — yerel uygulama ve son üretim paketi doğrulandı.** Uygulama 0.28.0; son uzak yayın kaydı 0.27.0 / Sites 35.

## Öğretmenin kullanacağı özellikler

Sınıfım ve Bugün ekranlarındaki **Sınıf yönetimi** alanı aşağıdaki araçları açar. Çocuk profilinden boy–kilo ve belgeye bağlı izinlere geçilir. Mevcut beş ana gezinme alanı korunur.

| Araç | Tamamlanan davranış |
|---|---|
| Boy–kilo | Eylül, aralık, mart, haziran; ayrı boy/kilo tarihleri ve kaynakları, seri giriş, düzeltme ve tekrar geçmişi, bireysel grafik, sınıf istatistiği, PDF, XLSX ve önizlemeli içe aktarma. |
| Belgeye bağlı veli izni | Belgenin amacı, sürümü, geçerliliği, imzalayan ve kaynak; karar/geri çekme geçmişi; güncel kararın gezi ve portfolyo kullanımına etkisi. |
| Gezi sayımı | Tarihli üyelik ve izin denetimi, sabit katılımcılar, çıkış/ara kontrol/dönüş, gerekçeli düzeltme, eksik dönüşte kapanış engeli, PDF. |
| Malzeme ve emanet | Birim bazlı stok, kısmi iade, hasar/onarım, geçmiş ve düzeltme, haftalık hazırlık bağlantısı, PDF. |
| Dönem sonu devir | Açık takip ve emanet kaynakları, öğretmenin ek maddeleri, sorumlu, kontrol geçmişi, kaynak değişince yeniden kontrol, gerekçeli yeniden açma, tutanak. |
| Veli randevuları | Uygun zaman aralığı, öğretmenin bütün sınıflarında çakışma kontrolü, iptal/değişiklik geçmişi, gerçek veli görüşmesine bağlantı, kişiye özel davet ve isimsiz ortak pano. |
| Öğrenme merkezleri | Tarihli düzen, önceki haftadan taslak, gerçek stoktan birlikte ayırma, ortam gözlemi, sonraki düzenleme ve kalan miktarı doğru iade eden kapanış. |
| Görsel rutin kartları | Gerçek öğretmen günlük akışından kaynaklı veya açıkça manuel taslak, kısa/tam gün, sıra/başlık/simge/süre/görünürlük düzenleme, sürüm geçmişi, A4/A5 PDF. |
| Aile iletişim tercihleri | Anne/baba/üçüncü kişi kimliğiyle bağlı kanal, zaman, dil ve erişim biçimi; bildirimin kaynağı, değişiklik/geri çekme; yakın bilgisi değişince güncellik kontrolü. |
| Okul belge şablonu | Cihazdan logo, üst başlıklar, öğretmen/müdür imzası ve kâğıt yönü; sınıf, ölçüm, stok ve devir çıktıları. |

Uygulama ailelere kendiliğinden mesaj göndermez. Tercih kaydı iletişim izni veya otomatik gönderim hizmeti diye gösterilmez. Öğretmenin gözlem ve kararları, kaynağı belli tarihli kayıt olarak tutulur.

Kullanım: sınıf belgesi için **Sınıfım → Sınıf işlemleri → Sınıf listesini indir** yolunu açın. Gerçek PDF önizlemesinde çocukları, dönemi ve belge alanlarını seçebilirsiniz. Okul logosu ve imza yerleşimi **Sınıf yönetimi → Okul belge şablonu** alanında kaydedilir. Rutin kartlarında A4/A5 seçimi PDF önizlemesindeki **Şablon ve belge kapsamı → Hazır şablon** alanındadır.

## İstenen sınıf listesi

Kaynak `C:\Users\Asus\Desktop\VELİ İLETİŞİM BİLGİLERİ 2025.xls` salt okunur incelendi. Gerçek öğrenci satırları testlere, günlük kayıtlarına veya web uygulaması paketine kopyalanmadı.

Yatay düzen, örneğin 13 sütununu ve dört grubunu izler: çocukta sıra/ad soyad/T.C. kimlik numarası/doğum tarihi; annede ad/telefon/meslek; babada ad/telefon/meslek; üçüncü kişide ad soyad/telefon/yakınlık. Tam adres, çocuğun kendi devam satırında yer alır. Öğretmen ünvanı **Okul Öncesi Öğretmeni** olarak görünür. Dikey kâğıt tercihinde bilgiler okunabilir genişlikte öğrenci ve yakın bloklarına yerleşir.

Kişi adları Türkçe `tr-TR` kurallarıyla baş harfleri büyük olarak gösterilir. `I/ı`, `İ/i`, `Ş/ş`, `Ğ/ğ`, `Ç/ç`, `Ö/ö`, `Ü/ü` dönüşümleri ve birleşik Unicode kontrol edilir. Telefon, kimlik numarası ve adres numarası bir ad gibi dönüştürülmez. Bilinen kısaltmalar korunur. Bu işlem kaynak öğrenci kaydını veya Excel dosyasını değiştirmez; adres ve kişi bilgilerini kısaltmaz.

Adres girişinde değiştirilebilir Acıpayam ve Denizli varsayılanları sürer. Mahalle üçüncü alan, cadde/sokak ve numara dördüncü alandır. Gösterim cadde/numara → mahalle → ilçe → il sırasındadır; örneğin `Pancar Caddesi No: 12 / 2 Aşağı Mahalle Acıpayam Denizli`.

## Hesap ve veri mantığı

Boy tam sayı milimetre, kilo tam sayı gram olarak tutulur; ekranda cm/kg gösterilir. Eksik değer sıfır sayılmaz. Her ölçü için payda ayrıdır. Dönemler arası değişim aynı çocukların eşleşmiş ölçümleriyle hesaplanır. Bağımsız gerçek servis denemesinde eylül–haziran eşleşmiş n=2 için ortalama boy değişimi **+4,75 cm**, kilo değişimi **+1,65 kg** bulundu. Sınıf ortalamalarının 111→117 cm değişmesi bu hesabın yerine kullanılmadı.

Stokta `toplam = kullanılabilir + emanet + hasarlı` eşitliği korunur. Merkez malzemeleri aynı stok defterini kullanır. Negatif stok, fazla iade ve aynı eski miktarı iki kez kullanma engellenir. Bir işlemin kaynakları değişmişse öğretmen güncel bilgiyi açar. Açık taslağın başka sınıfa kaydedilmesi ve geç gelen eski okumanın güncel ekranı geri alması ayrıca denetlendi.

Yedek şeması 10, yedi yeni kayıt türünü içerir: ölçüm, izin/gezi, sınıf defteri, aile randevu/tercihleri, merkez, okul şablonu ve rutin kartları. Bütün 20 koleksiyon yerel şifreli kasada kalır. Önceki V1–V9 göçleri korunur. Beklenmeyen alanlar, yanlış sürüm etiketi, bozuk kaynak ve dallanmış sürüm zinciri geri yüklemeden önce reddedilir.

Birleşik yedek farklı kasaya döndüğünde kayıt sayıları, koleksiyon hashleri ve tam içerik aynı bulundu. Çocuk kalıcı kaldırıldığında kendisine bağlı yeni kişisel kayıtlar kaldırıldı; başka çocuğun kayıtları, stok denklemi, ortak uygun saat, merkez ve rutin kartı korundu. Aktif gezide dönüşü eksik çocuğun silinmesi sayım açığını gizleyemez.

## Belgelerde somut kontroller

Uzun ad, uzun meslek, 500 karakter adres, sıfır çocuk ve çok sayfalı kalabalık sınıf örnekleri kurgu verilerle denendi. Gerçek PDF önizlemesi ile indirme baytlarının eşliği ayrıca kontrol edildi. Logo yerel dosyadan okunur; belge üretimi için dış sunucuya gönderilmez.

Logolu stok ve devir belgelerinin dört dikey/yatay örneği toplam 15 sayfa olarak incelendi: sayfa dışında metin, belirgin metin çakışması veya tablodan ayrı son sayfaya düşen imza kalmadı. Üç uzun üst başlık, yerel logo ve öğretmen/müdür imzası birlikte kullanıldı. Teslim alanın adı ve imza alanı da devir belgesinde korundu.

Sınıf listesinin dokuz son PDF örneği toplam **40 sayfa** üzerinden kontrol edildi: **1.544/1.544 kaynak alanı** çıktı metninde bulundu; metin taşması ve çakışması sıfırdı. Dört birleşik başlık grubu sonraki sayfalarda tekrarlandı. Tam adres ve kayıt bilgileri kendi çocuğunun devam bandında kaldı. Ek tablo seçenekleri kullanılmayan eski belgelerde üç bağımsız örneğin baytları değişiklik öncesiyle aynı bulundu.

Boy–kilo belgelerinde altı logolu dikey/yatay örnek **23 sayfa** olarak denetlendi; uzun çocuk, okul ve müdür adları korundu. Rutin kartlarında gerçek A4 tek sayfada altı kart ve gerçek A5 altı büyük sayfa doğrulandı; yedi sayfanın tamamı çizdirildi. En küçük başlık yazı boyutunun ölçülen ve basılan değeri aynı olacak şekilde sınır kontrolü yapıldı.

## Son kabul kanıtları

Kaynaklar tamamlandıktan sonra derlenen **0.28.0 üretim paketi**, `http://127.0.0.1:4198` üzerinde izole tarayıcı bağlamlarıyla doğrulandı. Aşağıdaki sayılar ayrı test dilimleridir; tekrar çalıştırmalar ve örtüşen modül testleri toplanarak büyütülmedi.

| Denetim | Sonuç | Kanıt |
|---|---|---|
| Bütün özellik testleri | **1.189/1.189 PASS**, sıfır atlanan | `final/features.txt` |
| Ajan, klavye, runtime, PWA ve Sites sözleşmeleri | **48/48 PASS** | `contracts-final.txt` |
| TypeScript, politika ve korunan çalışma zamanı | PASS; 4 politika, 36 korunan dosya | `final/typecheck.txt`, `final/lint.txt`, `final/runtime.txt` |
| Son derleme ve paket bütçesi | PASS; 120 JavaScript parçası, her biri gzip ≤180 KiB | `final/build.txt`, `final/bundle.txt` |
| Şifreli yedek, belge önizlemesi ve logolu stok/devir | **17/17 senaryo doğrulandı**; ilk koşu 16 PASS, bir eski ad etiketi beklentisi düzeltilerek ayrı tekrar 1 PASS | `final/core-pdf-regression.txt`, `final/pdf-regression-repeat.txt` |
| Gerçek günlük akış → rutin revizyonu → farklı şifreli kasa | **1/1 PASS**; iki kaynak sürümü ve plan geçmişi aynı, JSON anahtar sırası değişimi anlamı bozmadı | `app/output/daily-routine-cards-2026-09-08/source-backed-encrypted-roundtrip.json` |
| Son üretim: stok/devir, izin/gezi, aile, merkez | **7 PASS**, yalnız geliştirme fixture'ına ait 3 senaryo üretimde atlandı | `final/management-production.txt` |
| Son üretim: boy–kilo | **3/3 PASS**; seri giriş, iki sekme yarışı, PDF ve XLSX | `app/output/growth-measurements-2026-09-08/growth-production-final.txt` |
| Son üretim: rutin kartları | **1 PASS**, yalnız geliştirme fixture'ına ait 2 senaryo üretimde atlandı | `app/output/daily-routine-cards-2026-09-08/production-final.txt` |
| Son üretim: okul şablonu | **1/1 PASS**; çevrim dışı yerel logo ve dikey/yatay PDF | `school-template/production/production-receipt.json` |
| Son üretim: gerçek Sınıfım → PDF | **1/1 PASS**; ağ kapalı, gerçek önizleme ve aynı baytlarla indirme | `final/pdf-production.txt` |
| Son üretim: PWA | **3/3 PASS**; çevrim dışı yeniden açılış, 0.27→0.28 güncellemede veri koruma, kalıcı profilde ağsız yeni tarayıcı süreci | `final/pwa-production.txt` |

Kısa kanıt yolları `app/output/new-workflows-2026-09-08/` köküne göredir. Geliştirme fixture'ına ait üretim atlamaları başarı sayılmadı; bu senaryolar kendi geliştirme testlerinde geçti. Eski `Kurgu PDF Öğrencisi` test etiketi, yeni kişi adı gösteriminde `Kurgu Pdf Öğrencisi` olur; testin kesin etiket beklentisi düzeltildi, hem geliştirme hem üretim tekrarları geçti. Bu düzeltme üretim kodunu değiştirmedi.

Ortak öğretmen takibi+sürüm+stok/devir UI **14/14**, geç dönen eski okumaya karşı snapshot kontrolü **1/1**, okul/öğretmen bilgisini çocuklarla aynı taze veri kesitinden alan gerçek sınıf PDF akışı **1/1** de geçti. Son birleşik şifreli yedek 64 kayıt ve yedi yeni türü farklı kasada tam içerik/sayı/hash eşliğiyle korudu. Rutin için ayrıca gerçek plan revizyonundan üretilen iki sürümün kaynak geçmişi sınandı.

Makine tarafından okunabilir kapanış kaydı `app/output/new-workflows-2026-09-08/final/acceptance-receipt.json`; kaynak, test, son derleme ve kanıt dosyalarının SHA-256 listesi aynı klasördeki `sha256-manifest.json` dosyasıdır. Çalışma alanında önceki görevlerden kalan değişiklikler vardır; bu parmak izi bütün değişikliklerin bu turda yapıldığı anlamına gelmez.

- [Ölçüm ve sistem tasarımı](SINIF_YONETIMI_MASTER_EK_RAPOR_2026_09_08.md)
- [Veri güvenliği ve eski yedek uyumu](NEW_WORKFLOWS_BACKUP_PRIVACY_2026_09_08.md)
- [İzin ve gezi kabulü](CONSENT_TRIPS_2026_09_08.md)
- [Aile iletişimi ve randevu kabulü](FAMILY_ENGAGEMENT_2026_09_08.md)
- [Öğrenme merkezi kabulü](LEARNING_CENTERS_2026_09_08.md)
- [Görsel rutin kartları](DAILY_ROUTINE_CARDS_2026_09_08.md)
- [Okul şablonu, XLS düzeni ve Türkçe gösterim](SCHOOL_TEMPLATE_ROSTER_QA_2026_09_08.md)
- [Boy–kilo kaynak ve hesap kabulü](../app/output/growth-measurements-2026-09-08/growth-source-freeze-report.md)
- Ham kanıtlar: `app/output/new-workflows-2026-09-08/` ve modül çıktı klasörleri.

## Sınırlar

Bu turda uzak yayın, git commit veya push yapılmadı. Yerel tarayıcı testleri fiziksel telefon, gerçek yazıcı veya sınıfta öğretmen pilotu yerine geçmez. PDF metin sınırı ve görsel kontrolleri test edilen örnekleri kapsar; sınırsız içerik için mutlak hatasızlık iddiası değildir. Boy–kilo aracı tanı veya çocukları başarıya göre sıralama üretmez.
