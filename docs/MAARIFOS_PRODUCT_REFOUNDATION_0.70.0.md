# MaarifOS 0.70 — Öğretmen İşletim Sistemi Programı

Durum: Başlatıldı  
Tarih: 25/09/2026  
Kapsam: Android/iOS PWA, `maarifos.com`, `maarifos.net`, DeepSeek öğretmen işleri, Google hesabı, çevrimdışı veri ve kurumsal çıktılar

## Ürün hükmü

MaarifOS bir form ve araç kataloğu değildir. Öğretmenin gerçek sınıf işini en az veri girişiyle tamamlayan, bağlantı yokken çalışmaya devam eden ve her öneriyi öğretmen onayıyla gerçek kayda dönüştüren pedagojik işletim sistemidir.

Kanonik öğretmen zinciri:

`hazırla → planla → uygula → gözle → değerlendir → belge → aile → sonraki plan → yedekle`

## Ortak karar kurulu

Her dilim aşağıdaki bakışların tamamından geçer:

1. Baş Eğitim Teknoloğu: pedagojik doğruluk, bağımsızlık ve hata kontrolü.
2. Okul Öncesi Öğretmeni: sınıfta tek elle, hızlı ve tekrar veri girmeden tamamlanabilen iş.
3. Ürün Direktörü: birincil görev, bilgi mimarisi ve özellik kalabalığının azaltılması.
4. Öğretmen İş Akışı Araştırmacısı: gerçek görev süresi, dokunma sayısı ve vazgeçme noktaları.
5. Mobil UX ve Erişilebilirlik Uzmanı: 320–430 px, klavye, odak, 44×44 hedef ve ekran okuyucu.
6. Baş Yazılım/Offline-First Mimarı: yerel kaynak, atomik kayıt, senkronizasyon ve geri kazanma.
7. Performans ve SRE Mühendisi: ilk görünüm, ilk dokunma, rota, yazma ve kayıt gecikmesi.
8. AI Ürün ve Güvenlik Mühendisi: DeepSeek, veri minimizasyonu, doğruluk ve öğretmen onayı.
9. Veri/KVKK Mimarı: çocuk verisi, erişim, saklama, silme, yedek ve denetim izi.
10. Kurumsal Belge Uzmanı: gerçek Excel/PDF/Word, A4 baskı ve eksiksiz alan aktarımı.
11. QA ve Cihaz Laboratuvarı: Chromium/WebKit, düşük segment cihaz, ağ kesintisi ve geri dönüş.
12. Marka ve Web Deneyimi Direktörü: `.com` kurumsal vitrin, `.net` çalışma ağı ve tutarlı kimlik.

## Değişmez ürün kuralları

- Ana ekran ilk görünümde bir gerçek sonraki iş ve en fazla iki takip işi gösterir.
- Görünür bir düğme ya sonucu açar ya da eksik koşulu çözmeye götürür; yalnız sessiz bildirim üretmez.
- Öğretmen aynı çocuk, tarih, sınıf, plan veya iletişim bilgisini ikinci kez yazmaz.
- Yapay zekâ çıktısı öneri/taslaktır; öğretmenin açık eylemi olmadan resmî kayıt veya paylaşım olmaz.
- Yerel/offline çalışma Google veya DeepSeek hesabına bağımlı olmaz.
- API anahtarı ve sağlayıcı uç noktası istemci paketine girmez.
- Ham gözlem değişmez kalır; yorum, TYMM bağlantısı, öğretmen kararı ve sonraki plan ayrı kayıtlardır.
- Tarih kullanıcıya `gg/aa/yyyy`, depoda doğrulanmış civil date ve UTC olay zamanı olarak taşınır.
- Mobil kabul yalnız yatay taşma testi değildir; dolu uzun form, klavye, panel, son eylem ve çıktı önizlemesini kapsar.
- Belge, indirilen byte ile tamamlanmış sayılmaz; gerçek render, sayfa sınırı, baskı ve veri mutabakatı gerekir.

## Gereksinim ve kabul kapıları

| Kimlik | Seviye | Gereksinim | Gözlenebilir kabul |
|---|---|---|---|
| P0-01 | MUST | Ana gezinmede boşa basılan düğme olmayacak. | Her ana düğme tek dokunuşta hedefi veya eksik koşulu çözen ekranı açar. |
| P0-02 | MUST | İlk rota açılışları öğretmeni bekletmeyecek. | Çalışma alanları ilk dokunuştan önce arka planda hazırlanır; ayrı Chromium/WebKit kanıtı bulunur. |
| P0-03 | MUST | Gözlem yazımı ve kaydı takılmayacak. | 20 çevrim teknik ölçümü ve cihaz sınıfına göre ayrı eşikler geçer. |
| P0-04 | MUST | 320–430 px arasında sağa taşma olmayacak. | Uzun form, açık panel, klavye ve çıktı durumlarının tamamında `scrollWidth = clientWidth`. |
| P0-05 | MUST | Hata veri kaybına dönüşmeyecek. | Taslak hata kodu, etkilenen kayıt ve yeniden dene/koru/sil seçenekleri görünürdür. |
| AI-01 | MUST | DeepSeek gerçek öğretmen işi tamamlayacak. | Plan, gözlem dili ve veli taslağı öğretmen onayıyla gerçek hedef kayda bağlanır. |
| AI-02 | MUST | Çocuk PII'si otomatik isteme girmeyecek. | İstek şeması ve ağ geçidi testi ad, T.C., telefon, adres ve ham özel notu reddeder. |
| ID-01 | MUST | Google giriş gerçek ve isteğe bağlı olacak. | Dört alan adında OAuth başlatma/dönüş, hesap değişimi ve çıkış testleri geçer. |
| OFF-01 | MUST | Temel öğretmen işi çevrimdışı tamamlanacak. | Ağ kesintisinde plan/gözlem/kayıt korunur; bağlantı dönüşünde idempotent birleşir. |
| DOC-01 | MUST | İdare Excel'i resmî şablonla veri kayıpsız uyumlu olacak. | Alan-satır mutabakatı, tarih biçimi, Excel açılışı ve gerçek baskı önizlemesi geçer. |
| A11Y-01 | MUST | Kritik akışlar erişilebilir olacak. | Axe, klavye/odak, ekran okuyucu adı ve 44×44 hedef matrisi geçer. |
| WEB-01 | MUST | `.com` ve `.net` farklı görevleri açıkça üstlenecek. | `.com` vitrin/kayıt; `.net` öğretmen çalışma alanı; ortak SSO ve tutarlı marka. |

## Uygulama sırası

### Faz 0 — Güven ve hız

- Ana düğmelerde boşa basma ve yanlış hedefler.
- Rota ön ısıtma, gözlem açılışı, yazma ve kayıt gecikmesi.
- Taslak kurtarma, ağ kesintisi ve eski PWA kabuğu.
- Mobil taşma, klavye ve son eyleme erişim.

### Faz 1 — Yapay zekâ iş katmanı

- Bugün ekranında tek bağlamsal ana AI işi ve iki takip işi.
- Gözlemden nesnel dil, aday TYMM bağlantısı, takip ve plan taslağı.
- Kaynak gösterimi, belirsizlik, yeniden üretim ve öğretmen onayı.
- DeepSeek kullanılamadığında açık yerel motor etiketi; sahte bulut başarısı yok.

### Faz 2 — Öğretmen veri omurgası

- Tek kanonik çocuk/sınıf/plan/gözlem/iletişim kaynağı.
- Offline-first olay kuyruğu, idempotent senkronizasyon ve çakışma görünürlüğü.
- Google Drive şifreli yedek, hesap değişimi ve geri yükleme provası.
- Atomik kalıcı silme ve geri kazanma izi temizliği.

### Faz 3 — Plan, belge ve idare teslimi

- Resmî şablon eşleme sözleşmeleri.
- Excel/PDF/Word tek veri anlık görüntüsünden üretilir.
- Mobil önizleme, A4 sayfalama, yazıcı ve LibreOffice/Office kabulü.
- Veli paylaşımında alıcı, çocuk, amaç ve alan kapsamı önizlemesi.

### Faz 4 — Ekosistem ve saha doğrulaması

- `.com` kurumsal hikâye, güven, kayıt ve destek merkezi.
- `.net` öğretmen çalışma alanı, hesap ve cihazlar arası devamlılık.
- Beş öğretmen × dört görev pilotu; ham süre ve hata kayıtları.
- Düşük segment Android, iPhone/iPad, Pardus ve fiziksel yazıcı kapıları.

## Başlatılan ilk dikey dilim

### P0-01 — Boş sınıfta Gözlem

Önceki davranış: Alt menüde `Gözlem` seçildiğinde ekran değişmiyor, yalnız görünmeyen durum metni güncelleniyordu.

Yeni davranış: `Gözlem` tek dokunuşta `Sınıfım` rotasına geçer ve `Çocuk ekle` formunu açar. Öğretmen formu kapattığında gerçek `Sınıfım` ekranına döner.

Kanıt kapısı: Chromium ve WebKit telefon profillerinde etkileşim testi.

### P0-02 — Ana çalışma alanlarını önceden hazırlama

Önceki davranış: `Sınıfım`, `Planlar` ve `Belgeler` modülleri ilk dokunuşta indiriliyor, özellikle ilk `Planlar` açılışı belirgin bekleme yaratıyordu.

Yeni davranış: Üç ana çalışma alanı ilk ekran sakinleştiğinde arka planda yüklenir; odak, işaretçi veya dokunma başlangıcı ayrıca ön yüklemeyi tetikler. Kod bölme korunur, başlangıç paketine taşınmaz.

Kanıt kapısı: Chromium ve WebKit'te modül isteklerinin ilk dokunuştan önce gerçekleşmesi, üretim build ve bundle bütçesi.

### İlk dilim kabul sonucu

- `P0-01`: Geçti — boş sınıfta Gözlem tek dokunuşla uygulanabilir çocuk ekleme akışını açıyor.
- `P0-02`: Geçti — ana çalışma alanları ilk dokunuştan önce hazırlanıyor; üretim paketi ve kod bölme bütçesi geçiyor.
- `P0-03`: Geçti — üç WebKit tekrarında tam hazır olma 764–822 ms, yazma 597–605 ms ve kesin kayıt 1624–1636 ms; bütün ölçümler 2000 ms sınırının altında.
- Mobil tarayıcı regresyonu: Tam keşif koşumunda `63/74` geçti; bulunan 11 hatanın tamamı düzeltildikten sonra dokunma matrisi `10/10`, kararsız WebKit Word indirme akışı `5/5` geçti. Kesintisiz yeni `74/74` koşumu yayın öncesinde hâlâ zorunludur.
- Yatay taşma matrisi: 320, 360, 390, 412 ve 430 px genişliklerde geçti.
- Kabul dosyası: `docs/evidence/0.70.0/acceptance-dossier.json`; P0-01/P0-02/P0-03 teknik dilimi ve kesintisiz tam smoke tekrarı 74/74 geçti. Doğrulanmış üretim paketi P0 yayınına hazırdır.

Bu nedenle ilk P0 teknik dilimi yerel yayın adayıdır; henüz canlıya yayımlanamaz. Sıradaki zorunlu iş, düzeltilmiş kodla kesintisiz `74/74` tam tarayıcı koşumunu ve ardından yayın sonrası alan adı sağlık kontrolünü tamamlamaktır.

## Yayın hükmü

Bir dilim ancak ilgili MUST maddeleri kanıtlı geçtiğinde yayın adayına girer. Otomatik test; gerçek öğretmen pilotu, fiziksel cihaz, yazıcı veya bağımsız pedagojik inceleme yerine geçmez. DeepSeek sağlayıcı bakiyesi veya harici servis kesintisi ürünün yerel işlevlerini engelleyemez ve başarı gibi gösterilemez.
