# MaarifOS Yaşayan Eleştiri ve Uygulama Günlüğü

Bu günlük, `MARIFOS_MEGA_MASTER_PLAN_2026-08-11.md` uygulanırken eleştirinin durmasını
engeller. Her geliştirme dalgası aynı döngüyle yürür:

`Önce kanıtla → uygula → negatif test et → aynı akışı yeniden yakala → yeniden eleştir → yeni işi sırala`

Bir dalga yalnız kod yazıldığı için kapanmaz. Görünür davranış, erişilebilir durum, kalıcı veri ve
gerçek görev sonucu birlikte doğrulanır.

## Durum sözleşmesi

- `FOUND`: mevcut üründe kanıtlandı.
- `IMPLEMENTING`: çözüm uygulanıyor.
- `LOCAL_VERIFIED`: kod, test ve aynı yerel akış yeniden doğrulandı.
- `DEVICE_PENDING`: fiziksel Android/iPhone kanıtı eksik.
- `PRODUCTION_PENDING`: yayın ortamı kanıtı eksik.
- `VERIFIED`: gerekli bütün kapılar geçti.

## Dalga 1 — Güvenilir affordance ve ilk mobil kat

### Önce kanıtı

| Akış | Bulgu | Öncelik | Durum |
|---|---|---:|---|
| Planlar | `Günlük plan oluştur` DOM'da disabled olmasına rağmen büyük yeşil etkin CTA gibi görünüyor. | P1 | `FOUND` |
| Kayıt Ekle | Gözlem, yoklama ve etkinlik DOM'da disabled; beyaz kart, renkli ikon ve chevron nedeniyle etkin görünüyor. | P1 | `FOUND` |
| Sınıfım | Sıfır çocukta `İlk çocuğu ekle` ve `Çocuk ekle` yineleniyor; arama ve `Gözlem dökümü` anlamsız kalıyor. | P1 | `FOUND` |
| Bugün | Başlık, ayrı akış etiketi, ayrı tarih ve hazırlık kartı ilk mobil katı büyütüyor; kilitli kartlar chevron taşıyor. | P1 | `FOUND` |

Önce ekranları:

1. `01-before-plans-disabled.png`
2. `02-before-capture-disabled.png`
3. `03-before-class-empty.png`
4. `04-before-today-first-fold.png`

Yerel kanıt klasörü:
`%LOCALAPPDATA%/Temp/maarifos-continuous-audit-2026-08-11/`

### Uygulama kararı

- Disabled kontrol opaklığı azaltılarak değil, ayrı nötr yüzey ve kilit ikonu ile gösterilecek.
- Disabled kontrolde chevron görünmeyecek.
- Her kilit exact kullanıcı eylemiyle açıklanacak.
- Sıfır çocuk durumunda tek kurulum CTA'sı kalacak.
- Bugün tarih bilgisi tek satıra sıkıştırılacak; kilitli öncelik kartları kilit taşıyacak.

### Yeniden eleştiri kapısı

- Aynı dört ekran 390×844 ölçüsünde yeniden yakalanacak.
- Görsel durum ile DOM `disabled` durumu birebir eşleşecek.
- 200% zoom, klavye odağı ve fiziksel telefon henüz bu dalganın yerel kanıtından ayrı tutulacak.
- Yeniden denetimde bulunan yeni P1/P2 maddeler bu dosyada Dalga 2 kuyruğuna eklenecek.

### Dalga 1 yeniden denetim sonucu

| Akış | Sonuç | Durum |
|---|---|---|
| Bugün | Tarih tek satıra indi; kilitli yoklama/plan kartlarında chevron yerine kilit var; çalışma döngüsünün başlığı ilk mobil katta görünür oldu. | `LOCAL_VERIFIED` |
| Kayıt Ekle | Üç kilitli eylem nötr yüzey, kilit ikonu ve exact neden taşıyor; tek aktif CTA eksik sınıf adımına gidiyor. | `LOCAL_VERIFIED` |
| Sınıfım | Sıfır çocukta arama ve gözlem dökümü gizlendi; yalnız `İlk çocuğu ekle` ana eylemi kaldı. | `LOCAL_VERIFIED` |
| Planlar | Sheet adı kapsamla hizalandı; kilitli günlük plan nötr, görünür nedenli ve `Eğitim yılını aç` çözüm eylemli. | `LOCAL_VERIFIED` |

Sonra ekranları:

1. `05-after-today-first-fold.png`
2. `07-after-class-empty.png`
3. `09-final-plans-disabled.png`
4. `10-final-capture-disabled.png`

Davranış kanıtı:

- `Sınıf listesini oluştur` gerçek tıklamada sheet'i kapattı, `Sınıfım` yüzeyine döndü ve tek
  kurulum eylemini görünür bıraktı.
- `Eğitim yılını aç` gerçek tıklamada plan sheet'ini kapattı ve dolu sınıf/eğitim-yılı formunu açtı.
- Görsel kilit durumları DOM `disabled` durumlarıyla birebir eşleşti.

### Yeniden eleştiride kalan ve yeni bulunan işler

1. `P1` Planlar hâlâ geçici sheet yapısındadır; Yıl/Ay/Hafta/Gün kalıcı workbench Dalga 2'nin ana işidir.
2. `P1` Belgeler readiness/sürüm/geçmiş göstermeden export yüzeyi sunmaktadır.
3. `P1` Temiz cihaz kurulumunun eğitim yılı, sınıf, çocuk, ilk plan ve yedek adımlarını birlikte
   gösteren ilerleme yüzeyi yoktur.
4. `P2` Bugün hazırlık uyarısı hâlâ yüksek yer kaplıyor; sınıf kurulduktan sonra daha kompakt
   bağlamsal uyarı varyantı gerekir.
5. `P2` “Canlı cihaz kayıtları” teknik kopyası öğretmen diline çevrilmelidir.
6. `P2` Gerçek kontrast, 200% zoom, VoiceOver/TalkBack ve fiziksel telefon bu yerel görsel
   denetimle kanıtlanmış değildir.
7. `P1` Dalga 1 kullanıcı güvenini artırırken monoliti büyüttü: `Prototype.tsx` 10.486 satıra,
   ana JS 712.066 bayta ve ana CSS 165.867 bayta ulaştı. Bu, çözümün yeni bir risk ürettiği somut
   kanıttır. Dalga 2 workbench kodu `Prototype.tsx` içine eklenmeyecek; ayrı route/use-case/read-model
   bileşenleriyle strangler refactor aynı dalganın zorunlu parçası olacaktır.

## Sonraki dalga adayları

1. Planlar için kalıcı Yıl/Ay/Hafta/Gün workbench ve sheet kapsam çelişkisinin kaldırılması.
2. Belgelerde hazır/eksik/eski durumları, kaynak manifesti ve geçmiş üretimler.
3. Temiz cihaz kurulum kontrol listesi.
4. Emine Öğretmen süre ölçümü ve 20 görevli gerçek kullanılabilirlik testi.
5. `Prototype.tsx` strangler refactor sınırı.
6. At-rest şifreleme P0 programı.

## Dalga 2 — Kalıcı Yıl/Ay/Hafta/Gün plan çalışma alanı

### Önce kanıtı

390×844 canlı akışta alt çubuktaki `Planlar`, ayrı bir bölüm açmak yerine Bugün ekranının üzerine geçici
bir sheet getiriyordu. Sheet içinde yıllık Plan Kütüphanesi, eğitim takvimi, günlük plan oluşturma ve
günlük etkinlik listesi aynı yüzeydeydi. Bu yapı öğretmene “Planlar bölümü” değil, “Bugünün planına ait
geçici işlem penceresi” hissi veriyordu.

| Bulgu | Öncelik | Durum |
|---|---:|---|
| `Planlar` kalıcı route değil; alt navigasyon bir modal açıyor. | P1 | `FOUND` |
| Yıl/Ay/Hafta/Gün hiyerarşisi birlikte görülemiyor. | P1 | `FOUND` |
| Genel plan merkezi ile seçili gün ayrıntısı aynı sheet başlığında karışıyor. | P1 | `FOUND` |
| Route yenileme/back davranışı Planlar için tanımlı değil. | P1 | `FOUND` |

Önce ekranı: `01-before-plans-modal.png`

### Uygulama kararı

- `/plans` kalıcı route'u ve ayrı `PlanWorkspaceScreen` oluşturuldu.
- Alt navigasyondaki `Planlar` artık modal değil gerçek bölüm açıyor; reload aynı route'u koruyor.
- Yıl, Ay, Hafta ve Gün düzeyleri yalnız kalıcı `TeacherWorkCycleWorkspace` kayıtlarından türetiliyor;
  olmayan plan uydurulmuyor.
- Her düzey gerçek Plan Kütüphanesi, haftalık/aylık değerlendirme veya günlük akış hedeflerine bağlandı.
- Seçili gün ayrıntısı ayrı `Gün planı` sheet'i olarak kaldı.
- Yeni ekran ve sunum modeli `Prototype.tsx` dışında, lazy-loaded ayrı feature/CSS dosyalarında tutuldu.

### Uygulama sırasında eşanlı yeniden eleştiri

İlk uygulama görselinde skor `0/4 hazır düzey` diyordu; oysa yıllık, aylık ve haftalık kayıtlar gerçekte
zincire bağlıydı, yalnız dönemleri başlamamıştı. Bu, teknik olarak hesaplanmış olsa da öğretmen açısından
yanlış bir başarısızlık sinyaliydi. Aynı turda skor `3/4 bağlı düzey` olarak düzeltildi.

İkinci görsel turunda yazım kilidi iki ayrı kartta yineleniyordu. Tekrar kaldırıldı; “sıradaki planlama işi”
kartı tek çözüm eylemi olarak bırakıldı. Ham ISO tarihler öğretmen diline çevrildi ve `Canlı cihaz kayıtları`
metni `Kaydedilmiş planlar` oldu.

### Dalga 2 yeniden denetim sonucu

| Akış | Sonuç | Durum |
|---|---|---|
| Planlar girişi | Alt çubuk gerçek `/plans` bölümüne gidiyor; sayfa yenilendiğinde bölüm ve veriler korunuyor. | `LOCAL_VERIFIED` |
| Plan hiyerarşisi | 3/4 bağlı katman, yaklaşan dönemler ve günlük yazım kilidi tek ekranda dürüst gösteriliyor. | `LOCAL_VERIFIED` |
| Düzey eylemi | `Yıllık omurgayı aç` gerçek Plan Kütüphanesini açıyor; no-op kontrol kalmadı. | `LOCAL_VERIFIED` |
| Mimari sınır | Workbench ayrı lazy route, model ve CSS dosyasında; monolite yeni ekran gömülmedi. | `LOCAL_VERIFIED` |

Bu dalganın kabul edilen ekranları:

1. `01-before-plans-modal.png` — eski geçici sheet.
2. `04-after-plan-level-opens-library.png` — gerçek yıllık hedefe geçiş.
3. `09-final-plans-workbench-refined.png` — ikinci eleştiri sonrası kalıcı mobil workbench.

Yerel kanıt klasörü:
`%LOCALAPPDATA%/Temp/maarifos-wave2-plan-workbench-2026-08-11/`

### Dalga 2 sonunda kalan ve yeni bulunan işler

1. `P1` Plan Kütüphanesi hâlâ tek ve çok uzun modal sayfadır; yıl/ay/hafta bağlamından açıldığında ilgili
   bölüme odaklansa da öğretmeni tekrar uzun kaydırmaya zorlayabilir. Ayrı bağlamsal başlık/geri dönüş izi gerekir.
2. `P1` Plan workbench yalnız bugünün günlük kaydını özetler; öğretmenin bu hafta içindeki diğer günleri
   aynı kalıcı ekranda tarayıp açacağı haftalık gün şeridi henüz yoktur.
3. `P1` Belgeler kalıcı route değildir; readiness, kaynak manifesti ve geçmiş üretim görünümü Dalga 3'te
   ayrı workbench olarak yapılmalıdır.
4. `P2` İlk mobil katta Yıl ve Ay kartlarının tamamı görünse de Hafta/Gün için kaydırma gerekir. Yoğun sınıf
   verisiyle kart yüksekliği ve taranabilirlik ayrıca ölçülmelidir.
5. `P2` 200% zoom, klavye-only, VoiceOver/TalkBack ve fiziksel Emine Öğretmen telefonu henüz
   kanıtlanmamıştır; `LOCAL_VERIFIED`, erişilebilirlik veya cihaz kabulü anlamına gelmez.
6. `P1` Yeni route lazy chunk üretse de toplam paket bütçesi ve `Prototype.tsx` orkestrasyon sorumluluğu
   devam etmektedir; Dalga 3 yeni ekranı da aynı strangler sınırını korumalıdır.

Derleme ölçümü bu hükmü somutlaştırır: yeni workbench ayrı 7.760 bayt JS ve 4.630 bayt CSS chunk'ı
olarak ayrıldı; buna rağmen route/callback orkestrasyonu nedeniyle `Prototype.tsx` 10.568 satıra ve ana
JS 713.315 bayta çıktı. Görsel başarı mimari borcu kapatmış sayılmadı.

## Dalga 3 — Kalıcı Belgeler çalışma alanı

### Önce kanıtı

390×844 canlı akışta alt çubuktaki `Belgeler`, bağımsız bir bölüm yerine Bugün ekranının üzerinde tek ve uzun
bir sheet açıyordu. Plan paketi, aylık değerlendirme/Ek 18, anekdot kayıtları ve öğrenci dosyaları aynı yüzeyde
birbirine eklenmişti. Öğretmen belgeye girmeden hangi grubun hazır, hangisinin eksik veya yalnız başlangıç
aşamasında olduğunu göremiyordu; sürüm ve geçmiş üretim izlenimi de gerçekte saklanan bir geçmişe dayanmıyordu.

| Bulgu | Öncelik | Durum |
|---|---:|---|
| `Belgeler` kalıcı route değil; alt navigasyon uzun bir hazırlama sheet'i açıyor. | P1 | `FOUND` |
| Plan, Ek 18, anekdot ve öğrenci dosyalarının hazır/eksik durumu girişte görünmüyor. | P1 | `FOUND` |
| Belge kaynağı ile üretilebilir çıktı arasındaki zincir öğretmen dilinde açıklanmıyor. | P1 | `FOUND` |
| Sürüm/geçmiş alanı varmış gibi algı oluşturma riski bulunuyor; kalıcı üretim manifesti henüz yok. | P1 | `FOUND` |

Önce ekranı: `01-before-documents-sheet.png`

### Uygulama kararı

- `/documents` kalıcı route'u ve lazy-loaded `DocumentWorkspaceScreen` oluşturuldu.
- Alt navigasyondaki `Belgeler`, Bugün çalışma döngüsündeki belge adımı ve Planlar içindeki belge eylemi aynı
  kalıcı çalışma alanına bağlandı.
- Plan belgeleri, aylık değerlendirme/Ek 18, anekdot kayıtları ve öğrenci dosyaları dört ayrı iş kartına ayrıldı.
- Kartlar yalnız kalıcı öğretmen çalışma döngüsünden türetilen `hazır`, `işlem bekliyor` ve `başlangıç` durumlarını
  gösteriyor; kaynak yoksa çıktı hazırmış gibi gösterilmiyor.
- Her kart hangi kayıt zincirinden beslendiğini ve sıradaki gerçek eylemi açıkça yazıyor.
- Mevcut uzun hazırlama sheet'i geçiş dönemi ayrıntı yüzeyi olarak korundu; workbench kartları ilgili bağlama
  yönlendiriliyor. Anekdot kartı sheet'in genel başına değil doğrudan anekdot bölümüne odaklanıyor.
- `Belge geçmişi`, kalıcı sürümlü üretim kaydı bulunmadığını açıkça söylüyor; geçmiş belge uydurulmuyor.

### Uygulama sırasında eşanlı yeniden eleştiri

İlk uygulamada üst skor yalnız `hazır` ve `işlem bekliyor` gruplarını sayıyor, kaynak bulunmayan iki grubu görünmez
kılıyordu. Bu eksik kapsam öğretmene iş yükünü olduğundan küçük gösterirdi. Skor aynı turda `hazır`, `işlem` ve
`başlangıç` sayılarını birlikte gösterecek biçimde düzeltildi.

İkinci turda `Anekdot alanını aç` eyleminin gerçek sheet'i açtığı fakat öğretmeni yine sheet'in en üstüne bıraktığı
görüldü. Kontrol teknik olarak çalışsa da bağlamsal görev başarısızdı. Bölüm odaklama durumu ve kalıcı
`data-documents-section` hedefleri eklenerek eylem doğrudan anekdot alanına bağlandı.

### Dalga 3 yeniden denetim sonucu

| Akış | Sonuç | Durum |
|---|---|---|
| Belgeler girişi | Alt çubuk gerçek `/documents` bölümüne gidiyor; aktif navigasyon ve route yenilemesi korunuyor. | `LOCAL_VERIFIED` |
| Hazırlık görünürlüğü | Dört belge grubu hazır/işlem/başlangıç olarak tek bakışta ve kaynak zinciriyle gösteriliyor. | `LOCAL_VERIFIED` |
| Anekdot eylemi | `Anekdot alanını aç` gerçek hazırlama yüzeyini doğrudan ilgili bölüme odaklıyor. | `LOCAL_VERIFIED` |
| Dürüst geçmiş | Sürümlü çıktı geçmişi saklanmadığı açıkça belirtiliyor; eski belge varmış gibi davranılmıyor. | `LOCAL_VERIFIED` |
| Mimari sınır | Workbench ayrı lazy route, sunum modeli ve CSS dosyasında; ayrıntı sheet'i geçici uyumluluk katmanı olarak kaldı. | `LOCAL_VERIFIED` |

Bu dalganın kabul edilen ekranları:

1. `01-before-documents-sheet.png` — eski karışık ve uzun hazırlama sheet'i.
2. `04-final-documents-workbench.png` — yeniden eleştiri sonrası kalıcı belge çalışma alanı.
3. `05-final-anecdote-section-focus.png` — karttan doğru hazırlama bölümüne gerçek bağlamsal geçiş.

Yerel kanıt klasörü:
`%LOCALAPPDATA%/Temp/maarifos-wave3-documents-workbench-2026-08-11/`

### Dalga 3 sonunda kalan ve yeni bulunan işler

1. `P1` Üretilen PDF/DOCX dosyaları için kalıcı, sürümlü bir belge manifesti ve yeniden açılabilir üretim geçmişi
   henüz yoktur. Workbench bu açığı dürüstçe gösterir ama kapatmaz.
2. `P1` Ayrıntı hazırlama yüzeyi hâlâ tek ve uzun sheet'tir. Dört belge grubu için bağımsız ayrıntı route'ları,
   bağlamsal geri dönüş izi ve yalnız ilgili işin alanlarını gösteren daraltılmış ekranlar gerekir.
3. `P1` Kalıcı belge manifesti bulunmadığı için `eski/güncel değil` tespiti yapılamaz. Kaynak kayıt değiştiğinde
   önceki çıktının stale olduğu ancak yeni bir kaynak-hash/çıktı-hash zinciriyle kanıtlanabilir.
4. `P1` PDF/DOCX üretim başarısı ile cihazda dosyanın gerçekten açılması, paylaşılması ve tekrar bulunması aynı
   uçtan uca kabul senaryosunda henüz kanıtlanmamıştır.
5. `P2` 200% zoom, klavye-only, VoiceOver/TalkBack ve fiziksel Emine Öğretmen telefonu bu dalgada da
   kanıtlanmamıştır. `LOCAL_VERIFIED` yalnız yerel 390×844 etkileşim ve kaynak doğrulamasıdır.
6. `P1` Workbench'in lazy ayrılması mimari yönü iyileştirir; fakat ana bundle ve `Prototype.tsx` orkestrasyon borcu
   devam eder. Dalga 3 sonunda belge workbench'i ayrı 6.310 bayt JS ve 3.940 bayt CSS chunk'ı üretirken ana JS
   714.850 bayta, `Prototype.tsx` ise 10.642 satıra çıktı. Lazy route doğru sınırdır; monolit ve ilk yük bütçesi
   hâlâ ayrı bir performans/refactor dalgası gerektirir.

## Dalga 4 — Temiz cihaz başlangıç planı

### Önce kanıtı

390×844 temiz tarayıcı bağlamında uygulama sınıf formunu otomatik açıyor, ancak öğretmene bütün başlangıç
sırasını göstermiyordu. Formun varsayılanı 2025–2026 iken aynı yüzeyde resmî 2026–2027 takvimi yazıyor;
sınıf, çocuk, plan ve yedek işleri ayrı yüzeylerde keşfedilmeyi bekliyordu. Form kapatılınca Bugün ekranı,
henüz sınıf ve çocuk yokken dahi günlük çalışma kartlarını ve hazırlık ayrıntılarını birlikte göstererek ilk
kararı zorlaştırıyordu.

| Bulgu | Öncelik | İlk durum |
|---|---:|---|
| Resmî 2026–2027 durum kartı ile 2025–2026 form varsayılanı çelişiyor. | P1 | `FOUND` |
| Temiz cihazda sınıf → çocuk → plan → yedek sırası ve ilerleme görünmüyor. | P1 | `FOUND` |
| Tamamlanmamış adımlar tıklanabilir iş ile kilitli durum arasındaki farkı yeterince açıklamıyor. | P1 | `FOUND` |
| İlk kurulum sürerken normal Bugün kartları aynı anda görünerek birden çok birincil iş üretiyor. | P1 | `FOUND` |
| Şifreli yedek yüzeyi Ayarlar içinde bulunabiliyor, ancak başlangıç zincirinden doğrudan erişilemiyor. | P1 | `FOUND` |

Önce ekranı: `01-before-auto-setup-modal.png`.

### Uygulama kararı

- Bugün ekranına ayrı `onboarding` feature'ı olarak dört adımlı `Başlangıç planınız` merkezi eklendi.
- İlerleme yalnız kalıcı sinyallerden türetiliyor: yapılandırılmış sınıf, aktif çocuk, annual/monthly/weekly/daily
  plan zinciri ve doğrulanmış son şifreli yedek zamanı. Örnek veya tahmini tamamlanma kullanılmıyor.
- Bir adım `complete`, yalnız sıradaki adım `current`, sonraki adımlar `locked` olur. Kilitli adımlar gerçek
  `disabled` düğmedir; chevron taşımaz ve önceki adımın neden gerektiğini açıkça yazar.
- Temiz cihazda normal Bugün içeriği gizlenerek tek ana iş başlangıç merkezi bırakıldı; beşli alt navigasyon
  korunarak öğretmen kapalı bir sihirbaza hapsedilmedi.
- Sınıf adımı mevcut kalıcı forma, çocuk adımı Sınıfım içindeki gerçek çocuk kaydına, plan adımı `/plans`
  çalışma alanına ve yedek adımı Ayarlar'daki gerçek şifreli yedek bölümüne bağlandı.
- Sınıf formu resmî 2026–2027 takviminden besleniyor; hazırlık kopyası sınıf/çocuk/planın şimdi
  hazırlanabildiğini, yoklama ve gözlemin 1 Eylül 2026 Salı günü açılacağını doğru biçimde ayırıyor.
- Form ve yedek yüzeyi, kullanıcının hangi başlangıç adımında olduğunu gösteren bağlamsal başlık taşıyor.

### Uygulama sırasında eşanlı yeniden eleştiri

1. İlk görsel turda kilitli satır hem adım rozeti hem ayrı kilit ikonu taşıyarak gereksiz tekrar üretiyor ve
   dördüncü satırı alt navigasyonun arkasına itiyordu. Yinelenen ikon kaldırıldı, satır yoğunluğu azaltıldı ve
   dört adım ilk mobil katın içinde okunur hâle getirildi.
2. Sınıf ve çocuk tamamlandıktan sonra `Planlamaya başla`, hazırlık modundaki günlük yazma kilidini en yüksek
   öncelik sanarak öğretmeni çıkmaza götürüyordu. Plan workbench önceliği düzeltilerek annual/monthly/weekly
   omurga eksikliği günlük yazma kilidinden önce gösterildi; `Yıllık planları aç` gerçek plan kurulumunu açtı.
3. Yedek adımı doğru Ayarlar bölümüne kaydırıyordu ancak öğretmen başlangıç zincirinden geldiğini yüzeyde
   göremiyordu. `Başlangıç planı · 4. adım` bağlam etiketi eklendi.
4. 3/4 ekranında son kartın altı sabit navigasyona yaklaşmaktadır. Birincil başlık ve eylem görünür kalır;
   yine de 320×568 ve 200% zoom kabulü yapılmadan bu yoğunluk fiziksel cihaz için doğrulanmış sayılmaz.
5. Başlangıç merkezi 4/4 olduğunda tamamen kaybolur. Bu günlük işi sadeleştirir fakat tamamlanmış kurulumun
   görünür geçmişini bırakmaz; sonraki dalgada Ayarlar veya Bugün'de küçük, yeniden açılabilir sağlık özeti gerekir.

### Dalga 4 yeniden denetim sonucu

| Akış | Görünür ve davranışsal sonuç | Hüküm |
|---|---|---|
| Temiz cihaz | Bugün yalnız 0/4 başlangıç merkezi ve kalıcı alt navigasyonu gösteriyor. | `LOCAL_VERIFIED` |
| Sınıf | Gerçek sınıf kaydı sonrası aynı merkez 1/4 oluyor ve çocuk adımını tek current iş yapıyor. | `LOCAL_VERIFIED` |
| Çocuk | Gerçek çocuk kaydı sonrası 2/4 oluyor; önceki kimlikler kaybolmadan plan adımı açılıyor. | `LOCAL_VERIFIED` |
| Plan | Gerçek annual→monthly→weekly zinciri kurulduktan sonra 3/4 oluyor ve yedek adımı açılıyor. | `LOCAL_VERIFIED` |
| Yedek | Eylem doğru şifreli yedek formuna odaklanıyor; parola veya dosya üretimi yapılmadı. | `IMPLEMENTED_UNVERIFIED` |
| Tamamlama | Model 4/4 durumunu ve merkezin kapanmasını test ediyor; gerçek tarayıcı indirme kanıtı yok. | `IMPLEMENTED_UNVERIFIED` |

Kabul edilen ekranlar:

1. `04-final-setup-progress-center.png` — temiz cihaz 0/4, tek ana iş ve dört açık durum.
2. `05-final-guided-classroom-form.png` — resmî 2026–2027 kaynağı ve dürüst hazırlık sınırı.
3. `06-after-classroom-step-complete.png` — kalıcı sınıf sonrası 1/4.
4. `07-after-student-step-complete.png` — kalıcı çocuk sonrası 2/4.
5. `08-after-plan-step-complete.png` — gerçek plan zinciri sonrası 3/4.
6. `10-final-backup-step-context.png` — doğrudan şifreli yedek bölümü ve başlangıç bağlamı.

Yerel kanıt klasörü:
`%LOCALAPPDATA%/Temp/maarifos-wave4-onboarding-2026-08-11/`

### Dalga 4 sonunda kalan ve yeni bulunan işler

1. `P1` 4/4 gerçek yedek indirme, dosyayı yeniden seçme, restore ve reload aynı temiz cihaz senaryosunda
   kanıtlanmadı. Yedek zarfında kriptografik `BackupManifest` vardı; fakat 4/4 tamamlanması yalnız
   `lastSuccessfulBackupAt` sinyaline dayanıyor, dış dosya bütünlüğü ve restore tatbikatı cihaz sağlığında
   izlenmiyordu.
2. `P1` Sınıf formu ilerleme rayı kazanmasına rağmen hâlâ uzun bir modal içinde çok sayıda alan taşır. Gerçek
   çok-adımlı akış, geri/ileri, taslak ve hata odağı ayrıca tasarlanmalıdır.
3. `P1` Yedek formunun hemen altında `Tüm cihaz verilerini sil` tehlike alanı bulunur. İşlev açıkça kırmızıdır fakat
   ilk yedekleme anındaki kaygıyı artırır; ayrı `Tehlikeli işlemler` bölümü ve daha uzak bilgi mimarisi gerekir.
4. `P1` Fiziksel Emine Öğretmen süresi ölçülmedi. `10 dakika içinde yardımsız 4/4`, hata sayısı, geri dönüş ve
   anlaşılmayan terim ölçülmeden kullanılabilirlik doğrulanmış sayılmaz.
5. `P1` 320×568, 200% zoom, klavye-only, VoiceOver ve TalkBack kapıları açıktır. ARIA progressbar/ordered list ve
   disabled nedenleri uygulanmıştır; bunlar yardımcı teknoloji kabulünün yerine geçmez.
6. `P2` Resmî takvim 2026–2027 sürümlü sabit kaynaktır. Sonraki eğitim yılında yetkili takvim güncellemesi ve
   kaynak sürümü yayın sürecine bağlanmalıdır; tarih kendiliğinden tahmin edilmemelidir.
7. `P2` Hazırlık modu kopyası uygulamanın diğer yüzeylerinde hâlâ “aktif yılı seç” gibi daha genel ifadeler taşıyabilir.
   Sınır dili tek sözlükten üretilmeli ve çapraz ekran kopya testi eklenmelidir.
8. `P1` Onboarding bileşeni doğru feature sınırına ayrılmış olsa da ana JS 721.152 bayta çıktı ve >500 kB uyarısı
   sürüyor. `Prototype.tsx` 10.739 satırdır; bir sonraki mimari dalga route/use-case callbacklerini de strangler
   katmanına taşımalıdır.

### Dalga 4 kalite kanıtı

- `setup-progress` ve `plan-workbench` odak matrisi: 7/7 geçti.
- Bütün migration/feature matrisi: 489/489 geçti.
- Sites sözleşmesi: 26/26 geçti.
- TypeScript typecheck, lint, 36/36 runtime bütünlüğü ve production build geçti.
- Üretim derlemesi ana JS: 721.152 bayt; Vite >500 kB uyarısı açık performans borcu olarak korundu.
- Ortam hükmü `DEGRADED`: npm lock mevcut, ancak package manager/runtime pinleri eksik ve birden fazla Node adayı
  bulunuyor. Bu dalgada kurulum, ağ veya bağımlılık değişikliği yapılmadı.

## Dalga 5 — Kurulum zincirinin dönem, yedek ve tamamlama gerçeği

### Yeniden açılan eleştiri

Dalga 4 sonunda 0/4→3/4 zinciri görünür durumdaydı; ancak mevcut cihaz verisiyle gerçek öğretmen yolculuğu yeniden
yürütüldüğünde iki yeni P1 ortaya çıktı. Birincisi, yapılandırılmış bir sınıfın önceki 2025–2026 döneminde olması
`sınıf tamam` sayılıyor ve Eylül 2026 plan kurulumu açılıyordu; plan ekranı ancak son adımda eğitim yılı kapsam hatası
veriyordu. İkincisi, sınıf kurulur kurulmaz normal Bugün panosu da geri geliyor ve henüz 4/4 bitmemiş başlangıç işiyle
yarışıyordu. Dolayısıyla önceki uygulama görsel olarak ilerleme gösterse de baştan sona görev başarısını garanti etmiyordu.

| Yeni bulgu | Öncelik | İlk durum | Dalga 5 kararı |
|---|---:|---|---|
| Önceki eğitim yılı, yeni plan döneminin sınıf adımını yanlış tamamlıyordu. | P1 | `FOUND` | Kurulum tamamlanması exact resmî 2026–2027 dönemine bağlandı; eski dönem 0/4 ve `Yeni dönemi hazırla` üretir. |
| Eylül plan paketi dönem kapsamı uygun değilken kurulabilir görünüyordu. | P1 | `FOUND` | Sınıf adımı tamamlanmadan çocuk ve plan adımları gerçek disabled kalır; güvenli dönem geçişinden sonra plan açılır. |
| 4/4 bitmeden normal Bugün kartları başlangıç işiyle yarışıyordu. | P1 | `FOUND` | `data-setup-only`, yalnız sınıf varlığına değil bütün dört adımın tamamlanmasına bağlandı. |
| Sınıf formu tek uzun modalda dönem, program, provenance ve saatleri yığıyordu. | P1 | `FOUND` | Form Dönem → Program → Düzen adımlarına, geri/ileri ve bölüm bazlı doğrulamaya ayrıldı. |
| Sonraki adım sticky dock'u dar ekranda son alanın üstüne binebiliyordu. | P2 | `FOUND` | Üç kısa alt adımda sticky davranış kaldırıldı; geri/ileri eylemleri içerikten sonra doğal akışa alındı. |
| İlk yedek sırasında kalıcı silme eylemi aynı görüş hattındaydı. | P1 | `FOUND` | Silme, varsayılan kapalı `Gelişmiş cihaz işlemleri` alanına alındı. |

### Canlı 390×844 yürütme

1. Eski 2025–2026 sınıfı bulunan cihaz `0/4` gösterdi; çocuk, plan ve yedek gerçek disabled kaldı.
2. `Yeni dönemi hazırla` sınıf sihirbazını Dönem adımından açtı; resmî tarihler forma uygulandı.
3. Program ve günlük düzen doğrulandı; açık onayla eski yıl/sınıf arşivlendi ve 3 etkin çocuk yeni yıla taşındı.
4. Merkez `2/4` oldu. Plan adımı `/plans` çalışma alanını ve gerçek Plan Kütüphanesi'ni açtı.
5. Eylül 2026 paketi + yıllık omurga kalıcı cihaza kuruldu; merkez `3/4` oldu.
6. Yedek adımı Ayarlar'daki gerçek AES-GCM parola yüzeyine odaklandı. Uygulama yedeği üretti, aynı parola ile açıp
   doğruladı ve `İlk kurulum tamamlandı · 4/4` durumunu gösterdi.
7. `Bugüne dön` sonrasında başlangıç merkezi kapandı; normal öğretmen kontrolü ve çalışma döngüsü tek ana pano oldu.
8. Tam reload sonrasında başlangıç merkezi geri gelmedi; sınıf, üç çocuk ve Eylül yıllık/aylık/haftalık zinciri korundu.

### Kabul edilen görsel kanıt

Yerel kanıt klasörü:
`%LOCALAPPDATA%/Temp/maarifos-wave5-onboarding-2026-08-11/`

1. `01-before-2-of-4-dashboard-overload.png` — eksik kurulum ile normal panonun aynı anda yarıştığı önce durumu.
2. `02-before-long-class-form-calendar-drift.png` — önceki dönem ve resmî dönem ayrımını açıklamayan uzun form.
3. `03-after-period-step-with-safe-transition.png` — açık dönem/provenance ve güvenli geçiş dili.
4. `04-after-program-step.png` — program, yaş ve kaynak sürümünün ayrı işi.
5. `05-after-schedule-step.png` — günlük düzen ve açık arşiv/öğrenci taşıma onayı.
6. `06-after-period-gate-0-of-4.png` — eski dönemi tamamlanmış saymayan yeni 0/4 kapısı.
7. `08-after-backup-4-of-4.png` — yedek doğrulaması, 4/4 ve tehlikeli işlemlerin kapalı ileri alana taşınması.
8. `09-after-setup-complete-today.png` — kurulum sonrası profesyonel öğretmen panosuna dönüş.

### Eşanlı yeniden eleştirinin açık bıraktıkları

1. `P1` Tarayıcı kontrol katmanı indirme olayını yakalayamadı. Uygulama yedeği üretip aynı parola ile açarak
   doğruladı ve başarı zamanını sakladı; fakat indirilen `.maarifos` dosyasını aynı canlı turda yeniden seçme, restore
   ve exact kimlik grafı karşılaştırması yapılmadı. Bu nedenle fiziksel kurtarma kabulü hâlâ açıktır.
2. `P1` 4/4 sinyali `lastSuccessfulBackupAt` zamanına dayanırdı. Yedek zarfının zaten `BackupManifest` içinde veri
   şeması, uygulama sürümü, kayıt sayıları ve payload SHA-256 karmasını taşıdığı yeniden denetimde doğrulandı. Eksik
   olan; indirilen şifreli dosyanın SHA-256 karmasını, boyutunu ve aynı dosyayla yapılmış son restore tatbikatını
   cihazda saklayan ayrı kurtarma sağlık makbuzuydu. Önceki “manifest yok” hükmü bu nedenle düzeltilmiştir.
3. `P1` Fiziksel Emine Öğretmen kabulü yapılmadı: yardımsız tamamlama süresi, yanlış dokunma, geri dönme, anlaşılmayan
   terim ve dosyayı bulma ölçülmelidir. Yerel sentetik tarayıcı başarısı öğretmen doğrulamasının yerine geçmez.
4. `P1` 320×568, 200% zoom, klavye-only, VoiceOver ve TalkBack kabulü açıktır. Bölüm tabları ve form navigasyonu kaynak
   düzeyinde erişilebilir olsa da yardımcı teknoloji davranışı cihazda doğrulanmamıştır.
5. `P1` Normal ana pano kurulumdan sonra hâlâ 726.362 bayt ana JS chunk'ı üretir ve `Prototype.tsx` orkestrasyonu
   10.524 satırdır. Yeni onboarding modeli doğru feature sınırındadır; modal callbackleri bir sonraki strangler
   refactor dalgasında use-case katmanına taşınmalıdır.
6. `P2` 4/4 merkezi tamamen kaybolur. Ayarlar artık son yedek, dosya bütünlüğü ve restore tatbikatını gösterir;
   ancak sınıf + plan + backup sağlığını tek küçük kartta yeniden açan kalıcı `Kurulum ve kurtarma sağlığı` özeti
   ana ekranda yoktur.
7. `P2` Resmî 2026–2027 takvimi kanonik sabittir. 2027–2028 kaynağı yayınlanmadan sistem tarih tahmin etmemeli;
   takvim güncellemesi kaynak sürümü ve yayın kapısıyla yönetilmelidir.

### Dalga 5 kalite kanıtı

- Kurulum/sınıf/plan odak matrisi: 9/9 geçti.
- Bütün migration/feature matrisi: 494/494 geçti.
- Sites sözleşmesi: 26/26 geçti.
- TypeScript typecheck, policy lint, 36/36 runtime bütünlüğü, production build ve `git diff --check` geçti.
- Üretim ana JS: 726.362 bayt; Vite >500 kB uyarısı performans borcu olarak açık kaldı.
- Commit, push veya production deploy yapılmadı.

## Dalga 9 — Kanonik öğretmen haftası / ilk kırmızı kapının kapanışı

### Yeniden eleştiri kaydı

| Soru | Önceki gerçek | Müdahale | Yeni hüküm |
|---|---|---|---|
| Üst plan yokken öğretmen nereye gider? | Yıl/ay/hafta girişi premium kütüphanesine yönleniyor; “kendi planım premiumdan bağımsız” vaadi yalnız mevcut kaydı okuma/export düzeyinde kalıyordu. | Üst seviyeler her zaman `Plan zincirim`e gider. Sağlayıcı kütüphanesi yalnız açık ayrı eylemdir. | `LOCAL_VERIFIED`; paywall kopukluğu bu dilimde kapandı. |
| Öğretmen yıllık/aylık/haftalık planını gerçekten yazabilir mi? | Hayır; ekran eksik domaini dürüstçe salt-okunur gösteriyordu. | `teacher-authored` domain + aktif kapsam + sivil dönem + atomik annual/monthly/weekly grafik + üç karar başlangıç yüzeyi. | `LOCAL_VERIFIED`; yeni ay/hafta ekleme henüz açık. |
| Düzenleme eski mesleki kararı siliyor mu? | Üst plan düzenleme yoktu. | Optimistic concurrency ve append-only immutable revision snapshot. | `LOCAL_VERIFIED`; alan-bazlı merge yok. |
| Teacher planı premium sağlayıcı alanlarıyla karışabilir mi? | Önceki öğretmen ekranı export için premium preview pack resolver'ına bağlıydı. | Teacher record guard provider alanlarını reddeder; standalone export doğrudan teacher graph kullanır. Legacy kurulu sağlayıcı kayıt yolu ayrı korunur. | `LOCAL_VERIFIED`; iki kaynak birlikteyken gerçek öğretmen anlaşılırlık testi açık. |
| Yedek “kayıt var” deyip kopuk grafiği kabul eder mi? | Backup annual/monthly/weekly kayıtların tamamını premium sözleşmesi sanıyordu. | Data schema v6 union branch; exact child ID ve parent scope/period doğrulaması; orphan/tahrif restore öncesi ret. | `LOCAL_VERIFIED`; fiziksel şifreli clean restore açık. |
| Belge gerçekten teacher kaydından mı? | Temel belge provider snapshot'ına bağlıydı. | Standalone PDF/DOCX annual/monthly/weekly ID, tarih, revizyon ve teacherContent'ten oluşur; provider/premium alanı aramaz. | `LOCAL_VERIFIED`; PDF görsel/erişilebilirlik ve fiziksel Word açma açık. |
| Bu, öğretmen döngüsünü tamamladı mı? | Hayır. | Tek `KW-2026-09-W1-v1` senaryosu otorite olarak kaydedildi; ilk A2 kırmızı kapı kapatıldı. | `IN_PROGRESS`; A3–A11 henüz bütünleşik geçmedi. |

### Dalga 9 yerel kanıtı

- Teacher-owned service/access/export Node matrisi: 14/14 geçti.
- Gerçek IndexedDB backup/replace-restore + orphan ret: backup birleşik 27/27 geçti.
- 390×844 gerçek tarayıcı: aktif sınıf → Planlar → üç karar → atomik create → annual revise → DOCX download
  (`PK` ZIP magic) → reload → aynı kayıt ve revizyon 2: 1/1 geçti.
- TypeScript typecheck ve policy lint geçti.
- Bu kanıt fiziksel telefon, 200% zoom, VoiceOver/TalkBack, offline kill/retry veya production deploy değildir.

### Bir sonraki eleştiri-kod eşzamanı

Bir sonraki dilimde “haftalık değerlendirme ekranı ekle” diye dar başlanmayacaktır. Önce aynı W1 kimliği için:

1. teacher daily lineage,
2. günlük uygulama ve immutable observation,
3. confirmed curriculum link,
4. gün kapanışı/carry,
5. weekly evaluation ve W2 önerisi,
6. ay yeterlilik hükmü,
7. belge/offline/restore tüketicileri

tek etki haritasında birlikte eleştirilecek; yalnız gerekli ilk güvenli slice kodlanacaktır.

## Dalga 6 — Yedek üretmekten gerçek kurtarma sağlığına

### Eleştiri → uygulama → yeniden eleştiri

| Bulgudan doğan gereksinim | Uygulanan davranış | Yeniden eleştiride kalan sınır |
|---|---|---|
| “Yedek indirildi” sinyali tek başına felaket kurtarma kanıtı değildi. | Sürümlü `BackupHealthReceipt` şifreli dosya SHA-256 karması, iç payload karması, şema/uygulama sürümü, dosya adı, byte boyutu ve doğrulama zamanını kişisel veri/parola taşımadan saklıyor. | Makbuz aynı cihazdadır; cihaz kaybında kendisi kurtarma kaynağı değildir. Asıl kaynak güvenli yerde tutulan `.maarifos` dosyası ve öğretmenin bildiği paroladır. |
| Eski cihazlarda yalnız başarı zamanı vardı ve bu durum “sağlıklı yedek” gibi görünüyordu. | Eski kayıtlar sessizce yükseltilmiyor; `legacy-time-only` olarak amber uyarıyla yeni yedek ve restore tatbikatına yönlendiriliyor. | Kullanıcı dosyanın nerede saklandığını uygulamaya beyan etmiyor; dosya bulma fiziksel kabulü açık. |
| Dosya uygulama içinde açılarak doğrulansa da gerçekten restore edildiği kanıtlanmıyordu. | Restore tatbikatı yalnız üretilen şifreli dosyanın exact SHA-256 karması eşleşirse `drill-verified` oluyor; başka dosya sağlık makbuzunu yükseltmiyor. | Aynı cihazdaki replace/merge restore, telefon kaybı veya temiz cihaz kurtarmasının tam eşdeğeri değildir. Ayrı temiz cihaz tatbikatı gerekir. |
| Yeni sağlık kaydı başarılı yazılsa eski 4/4 zaman anahtarı reload'da gerileyebilirdi. | Yeni yedekte v1 uyumluluk zamanı ve v2 makbuz birlikte yazılıyor; açılışta v2 `createdAt` öncelikli okunuyor. | İki yerel kaydın ileride tek bir repository/use-case sınırına taşınması teknik borçtur. |

### Canlı ve otomatik kanıt

1. Mevcut 390×844 cihaz durumu `legacy-time-only` olarak doğru açıklandı; eski zaman damgası artık felaket kurtarma
   yeterliliği sayılmıyor.
2. Yeni şifreli yedek canlı arayüzde üretildi; UI `drill-required`, şema 5, uygulama 0.10.0 ve 383 KB dosya
   bilgisini gösterdi. Reload sonrasında aynı durum korundu.
3. Otomatik gerçek tarayıcı testi ve ayrı 390×844 canlı IAB turu indirilen `.maarifos` dosyasının fiziksel yolunu
   yeniden dosya alanına verdi, doğru parola ile açtı, `replace` restore yaptı, `drill-verified` durumunu doğruladı
   ve reload sonrasında tekrar gördü.
4. Domain matrisi; farklı digest'in sağlık kaydını yükseltmediğini, bozuk v2 makbuzun fail-closed kaldığını ve eski
   zaman kaydının yalnız `legacy-time-only` olduğunu doğruladı.
5. Mevcut yedek kripto regresyonu yanlış parola ve ciphertext/header tahrifini “parola yanlış veya dosya
   değiştirilmiş” sınırında reddediyor.

Görsel kanıt klasörü:
`%LOCALAPPDATA%/Temp/maarifos-wave6-recovery-health-2026-08-11/`

- `01-today-preparation-mode.png` — dönem başlamadan yazmayı dürüstçe kapatan Bugün yüzeyi.
- `03-recovery-health-legacy-detail.png` — eski zaman kaydını tatbikat yapılmış gibi sunmayan önce durum.
- `04-recovery-health-drill-required.png` — exact dosya bütünlüğü doğrulandıktan sonraki yeni sağlık durumu.
- `05-recovery-health-drill-verified.png` — aynı dosyanın canlı replace restore ve reload sonrası doğrulanmış hali.
- `06-recovery-health-verified-after-reload.png` — restore tatbikatı zamanı ile iki sağlık kartının yeniden açılışta korunması.

### Dalga 6 açık kapıları

1. `P1` Fiziksel iPhone/Android'de dosyayı Dosyalar/İndirilenler içinden bulma, uygulama kaldırılmış temiz cihaza
   kurma, parolayı girme, restore ve öğrenci/plan/kanıt kimliklerini karşılaştırma yapılmadı.
2. `P1` 4/4 “ilk kurulum tamamlandı” sinyali ile “felaket kurtarma tatbikatı tamamlandı” sinyali artık ayrı ve
   dürüsttür; ancak yeşil 4/4 kartı amber kurtarma uyarısından görsel olarak daha baskın kalıyor. Fiziksel kullanıcı
   bunun iki farklı seviye olduğunu anlamazsa hiyerarşi yeniden ayarlanmalıdır.
3. `P1` 11 Ağustos canlı tarihindeki sınıf 1 Eylül'de başlayacağı için yoklama→uygulama→gözlem→değerlendirme tam
   öğretmen günü canlı yazma zinciri kasıtlı olarak kapalıdır. Bu doğruluk korunmalı; tarih değiştiren test fixture'ı
   gerçek üretim davranışı diye sunulmamalıdır.
4. `P2` Sağlık kartı dosya adını göstermiyor. Bu, gereksiz teknik yükü azaltıyor; fakat birden çok `.maarifos`
   dosyası olan öğretmenin doğru dosyayı bulmasını zorlaştırabilir. Maskesiz kişisel veri taşımayan kısa dosya adı ve
   oluşturma zamanı, dosya seçme yüzeyinde bağlamsal olarak gösterilebilir.
5. `P2` Tarayıcı kontrol katmanı canlı indirme olayını raporlamadı; ancak yeni `.maarifos` dosyası İndirilenler'de
   exact boyut/zamanla bulundu, aynı IAB turunda seçilip restore edildi. Bu araç olayı sapması ürün hatası değildir;
   yine de fiziksel cihaz kabulünün yerine geçmez.

### Dalga 6 kalite kanıtı

- Sağlık makbuzu domain matrisi: 13/13 geçti.
- Download → exact file input → decrypt → replace restore → reload UI zinciri: 1/1 geçti.
- Bütün migration/feature matrisi: 494/494 geçti.
- Sites sözleşmesi: 26/26 geçti.
- TypeScript typecheck, policy lint, 36/36 runtime bütünlüğü, production build ve `git diff --check` geçti.
- Üretim ana JS: 730,21 KB; Vite >500 kB uyarısı açık performans/mimari borç olarak büyümeye devam ediyor.
- Commit, push veya production deploy yapılmadı.

## Dalga 7 — Öğretmen gününü kapatmak, kanıtı kapatmamak

### Neden yeniden eleştirildi?

“Gün sonu kapanışı” ilk bakışta küçük bir ana ekran özelliğidir; gerçekte yoklama, plan, etkinlik, gözlem,
program bağı, ertesi gün işi, offline sıra ve backup bütünlüğünü kesen bir operasyonel karar noktasıdır. Yanlış
tasarım öğretmeni gözlem uydurmaya, eksikleri yeşil bir başarı işaretinin arkasına saklamaya veya her gün büyüyen
bir not kuyruğu taşımaya zorlar. [ACECQA'nın resmî yaklaşımı](https://www.acecqa.gov.au/latest-news/blog/documenting-assessment-and-planning-cycle)
zorunlu kayıt miktarı/şablonu yerine bağlama uygun mesleki muhakemeyi; [DfE rehberi](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/send-assessment/carrying-out-an-assessment)
ise biçimlendirici değerlendirmede yazılı kayıt zorunluluğu olmadığını ve kayıt işinin öğretmeni çocukla
etkileşimden uzun süre ayırmaması gerektiğini vurgular. Bu nedenle kapanışın başarısı “kaç gözlem yazıldı?” değil,
gerçek işin dürüstçe devredilip devredilmediğidir.

### Eleştiri → kodlanan koruma → kanıt durumu

| Eleştiri | Kodlanan davranış | Durum | Kapanmadan doğrulanması gereken |
|---|---|---|---|
| Sıfır gözlemi eksik saymak, öğretmeni sahte/acele kanıt girmeye iter. | `observationCount` evidence içinde görünür; fakat tek başına issue değildir. Yalnız mevcut gözlemin program bağı bekliyorsa açık iş olur. | `LOCAL_VERIFIED` | 390×844 canlı sheet sıfır gözlemi bilgi olarak gösterdi ve kapanış engeli üretmedi. Öğretmen görüşmesinde baskı algısı ayrıca ölçülecek; haftalık/aylık değerlendirme ayrı kalacak. |
| Yoklama veya plan eksikken “gün tamamlandı” demek kanıtı çarpıtır. | Eksik sınıf listesi, yoklama, günlük plan, etkinlik veya program bağında `carried-forward`; en az 10 karakter yarına not olmadan yazım yok. | `LOCAL_VERIFIED` | Domain not sınırları geçti; canlı IAB iki exact issue ve öğretmen notuyla taşıdı. 200% zoom, ekran okuyucu ve yanlışlıkla çift dokunma fiziksel kabulü açık. |
| Kapanıştan sonra kayıt değişirse eski kapanış güncel sanılabilir. | Evidence değişimi veya ilgili kaydın kapanıştan daha yeni `updatedAt` değeri `stale` üretir. Yeni kapanış append-only revizyondur. | `LOCAL_VERIFIED` | Canlı IAB'de kapanış sonrası yoklama düzeltmesi eski kaydı silmeden `stale` yaptı. Tombstone, offline sonradan senkron, iki sekme, saat kayması ve eski restore matrisi açık. |
| Aynı kaydı tekrar kapatmak mükerrer devir teslim üretir. | Aynı evidence/durum/not ile güncel kapalı kayıt idempotent geri döner. | `LOCAL_VERIFIED` | Domain idempotency geçti; gerçek iki sekme/eşzamanlı UI yarışı hâlâ doğrulanmalı. |
| Yarına not görünmesi işin çözüldüğünü veya hâlâ açık olduğunu tek başına söylemez. | Önceki en yeni `carried-forward` notu bir sonraki çalışma alanına taşınır. | `PARTIAL_OPEN` | Kaynak issue kimliği, `açık/çözüldü/ertelendi`, yaş, sahip ve çözüm zamanı yok. Çözülmüş notun günlerce “hayalet görev” kalması önlenmeli. |
| Yalnız bugünü kapatma, gece yarısı/telefon arızasında dünü kilitler. | Commit yalnız açık İstanbul `civilDate` için kabul edilir; yanlış güne sessiz yazım engellenir. | `OPEN_PRODUCT_DECISION` | Sınırlı geç kapanış penceresi, ayrı `closedAt`, “geç kapatıldı” nedeni, yönetici politikası ve timezone/offline testleri. |
| Kapanış ayarı yanlış sınıfa veya bozuk backup'a karışabilir. | Kayıt UUID sınıf/eğitim yılı scope'u, strict schema, issue/evidence/status tutarlılığı ve append-only zaman izi taşır; backup allowlist/ilişki doğrulamasına bağlanmıştır. | `LOCAL_VERIFIED` | Backup round-trip ve tahrif edilmiş issue/evidence/scope reddi otomatik testte geçti. Fiziksel temiz cihaz restore ve off-device dosya kabulü açık. |
| “60 saniye” ölçülmemişse ürün iddiasıdır. | Sayaçlar mevcut kayıtlardan türetilir; öğretmene aynı veri yeniden yazdırılmaz. | `UNVERIFIED` | 10 öğretmen×5 gün: medyan ≤60 sn, p90 ≤90 sn; eksiksiz gün ≤1 karar, eksikli gün ≤1 not+1 karar; yanlış dokunma ve vazgeçme oranı. |
| Alt sheet ve sticky CTA dar ekranda/klavyede işlemi erişilemez yapabilir. | Domain katmanı bu sorunu çözmez. | `OPEN` | 320×568, 390×844, 200% zoom, klavye-only, VoiceOver, TalkBack; focus trap/return, görünür hata özeti ve ≥24×24 CSS px hedef. |

### Kanıt bütünlüğü sözleşmesi

Kapanış yalnız aşağıdaki anlamları taşımalıdır:

1. `complete`: kapanış anında tanımlı operasyonel issue yoktur; “çocukların pedagojik değerlendirmesi tamamlandı”
   anlamına gelmez.
2. `carried-forward`: issue'lar gizlenmemiş, aynı kayıtta exact issue kodları/evidence ve öğretmen notuyla yarına
   devredilmiştir; “mazeret kabul edildi” veya “iş çözüldü” anlamına gelmez.
3. `stale`: kapanıştan sonra ilgili kanıt değişmiştir; eski kapanış silinmez, güncel hüküm olarak da gösterilmez.
4. `observationCount`: günlük bilgi için sayaçtır; kota, öğretmen performansı veya çocuğa ilişkin gelişim puanı değildir.

Bu ayrım analitiklerde de korunmalıdır. `complete-day-rate`, öğretmen sıralama/prim/denetim metriği yapılamaz.
Kullanılabilecek operasyonel ölçüler; kapanış süresi, sessiz eksik sayısı, stale yakalama doğruluğu, yinelenen giriş,
yarına taşınan işin çözülme süresi ve kurtarma başarısıdır.

### Dalga 7 kabul matrisi

| Kapı | Ölçülebilir eşik | Şimdiki hüküm |
|---|---|---|
| Domain doğruluğu | issue üretimi, not sınırları, idempotency, append-only revizyon, stale ve yanlış tarih negatif testleri %100 | `LOCAL_VERIFIED — 9/9` |
| Arayüz zinciri | Bugün kartı → detay → eksik göreve git → geri dön → taşı/kapat → reload; görünür ve ekran okuyucu durumları tutarlı | `PARTIAL_LOCAL_VERIFIED — 390×844 taşıma/yeniden açma/stale geçti; eksik göreve yönlenme ve yardımcı teknoloji açık` |
| Öğretmen zaman bütçesi | 10 öğretmen×5 gün; medyan ≤60 sn, p90 ≤90 sn; aynı veri yeniden giriş=0 | `BEKLENİYOR` |
| Pedagojik güven | Sıfır gözlem nedeniyle engellenen kapanış=0; tek olaydan otomatik çocuk hükmü=0; “zorlandım” kritik bulgusu=0 | `PARTIAL_LOCAL_VERIFIED — ilk iki teknik kapı geçti; öğretmen görüşmesi açık` |
| Carry-forward sağlığı | Her devrin kaynak issue'su izlenir; çözülmüş not hayalet görev olmaz; >2 gün yaşlı not açık uyarı alır | `AÇIK_TASARIM` |
| Erişilebilirlik | WCAG 2.2 AA ilgili kriterleri + VoiceOver/TalkBack + 200% zoom + 320×568 geçer | `BEKLENİYOR` |
| Offline/yarış | kill/reload, iki sekme, retry, eski kayıt gelişi ve saat sınırı deterministik; veri kaybı/mükerrer=0 | `BEKLENİYOR` |
| Backup/restore | Şifreli dosyadan temiz restore sonrası kimlik, evidence, issue, not ve durum exact; tahrif fail-closed | `LOCAL_VERIFIED — round-trip/tamper reddi geçti; fiziksel temiz cihaz açık` |
| Geç kapanış | Ürün politikası ve izlenebilir veri modeli onaylanır; geriye dönük sessiz yazım yok | `AÇIK_KARAR` |

### Dalga 7 şimdiki dürüst hükmü

- Gün sonu domain'i, Bugün kartı/BottomSheet'i ve backup şema bağı yerelde bütünleşmiştir.
- Domain matrisi 9/9, 390×844 otomatik UI 1/1 ve 393,1 saniyelik kesintisiz `npm run quality:gate` geçti. Aynı canlı IAB turunda
  eksik kapanış, exact notla `carried-forward`, yeniden açma, yoklama düzeltmesi ve otomatik `stale` görünümü doğrulandı.
- Bu sonuç `LOCAL_VERIFIED`dır; fiziksel Android/iPhone, gerçek öğretmen süre ölçümü, 320×568/200%, VoiceOver/TalkBack,
  offline kill/iki sekme, geç kapanış ve çok günlük carry-forward yaşam döngüsü tamamlanmadan `VERIFIED` değildir.
- Quality gate sırasında gözlem finalizasyonundan sonra gecikmiş autosave'in taslağı diriltmesi yakalanıp kapatıldı;
  20 çevrimli gerçek tarayıcı testi exact 20 değişmez gözlemle geçti. Ana bundle üç ağır yüzeyin lazy ayrılmasıyla
  projenin gzip bütçesine döndü; Vite'ın genel ham >500 kB uyarısı sürüyor.
- Commit, push veya production deploy yapılmadı.

## Dalga 8 — Sıkıştır, yeniden kanıtla, paywall ve veri gerçeğini ayır

### Eşanlı yeniden eleştiri kayıtları

| Bulgu | İlk hüküm | Uygulama / yeniden eleştiri | Şimdiki durum |
|---|---|---|---|
| Sınıf kurulduktan sonra setup kartı gerçek işi ilk görünümün altına itiyor. | P1 kullanılabilirlik | No-class cihazda guided 4 adım korunuyor; sınıf varsa tek eylemli compact kart. 320×568/390×844 taşma ve 44 px hedef otomatik ölçüldü. | `LOCAL_VERIFIED`; fiziksel öğretmen ve 200% açık. |
| Tek plan veya eski `lastSuccessfulBackupAt`, setup'ı yanlış tamamlayabilir. | P1 veri/doğruluk | Yalnız bağlı Yıl→Ay→Hafta→Gün zinciri ve geçerli v2 makbuz + exact restore drill tamam kabul ediliyor. Legacy boolean/timestamp fail-closed. | `LOCAL_VERIFIED`; setup matrisi 7/7. |
| Aynı sayaç ve eski timestamp altında yoklama anlamı değişirse kapanış `closed` kalabilir. | P0 veri bütünlüğü | Minimal semantik projeksiyon `sha256:<64hex>`; same-count absent→present değişimi ve restore sonrası değişim `stale`. Ham not/reason özete kopyalanmıyor. | `LOCAL_VERIFIED`; day-closure 16/16, migration 514/514. |
| Taşınan iş çözülünce hayalet kalabilir; geleceğe erteleme bugünü işgal edebilir. | P1 iş kuyruğu | Tek `sourceIssueId`, occurrence zinciri, append-only `open/deferred/resolved/reopened`, vade filtresi ve son 5 resolved undo görünümü. Today eylemleri commit-time sınıf/yıl guard'ıyla kalıcı yazıma bağlandı. | `LOCAL_VERIFIED`; gerçek fiziksel cihaz ve offline kill açık. |
| Öğretmenin kendi planı veya temel belgesi premium kapıya düşüyor. | P1 ürün anayasası | `Plan zincirim` yerel öğretmen kaydını entitlement'sız açıyor; temel PDF/DOCX üretir. Hazır sağlayıcı içerik/şablonu premium kalır. | `LOCAL_VERIFIED`; Yıl/Ay/Hafta serbest edit domaini hâlâ `OPEN`. |
| Aynı gün iki daily plan, bir başlık ve birleşik sayaçla sahte “tamamlandı” üretiyor. | P1 veri/presentation | `daily.status=conflict`, deterministik ID listesi, sıfır sayaç; Today/Plan Workbench “İnceleme gerekli” gösterir ve yeni plan üretmez. | `LOCAL_VERIFIED`; otomatik merge yasak, çözüm politikası `OPEN`. |
| Cihazdaki kanonik öğrenci/öğretmen kayıtları açık metin. | P0 gizlilik / gerçek pilot engeli | Bu dalgada çözülmedi; önceki şifreli gölge-store/CAS/migration mimarisi ana programda kaldı. | `OPEN_P0`; gerçek çocuk verisiyle pilot için NO-GO. |

### Dalga 8 kabul matrisi

| Kapı | Ölçülebilir eşik | Hüküm |
|---|---|---|
| İlk mobil görünüm | 390×844'te `Şimdi` + devam + plan başlangıcı; yatay taşma 0; birincil hedef ≥44 px | `LOCAL_VERIFIED` |
| Setup doğruluğu | Yetim tek plan, legacy backup zamanı ve drillsiz makbuz tamam sayılmaz | `LOCAL_VERIFIED — 7/7` |
| Kapanış semantiği | Aynı sayaçlı anlam değişiminde stale kaçırma 0; fingerprint sabit 64 hex; ham not kopyası 0 | `LOCAL_VERIFIED — 16/16` |
| Carry lifecycle | Beş günlük aynı issue tek zincir; future deferred ana CTA değil; resolve/reopen append-only; refresh hatası mükerrer yazma üretmez | `LOCAL_VERIFIED — wiring dahil 22/22` |
| Öğretmen plan sahipliği | Entitlement'sız persisted zincir okunur ve temel PDF/DOCX alınır; sağlayıcı içeriği kilitli | `LOCAL_VERIFIED`; serbest üst-düzey edit açık |
| Günlük plan çakışması | Mükerrerde authoritative seçim, birleşik sayaç ve yeni plan yazımı 0 | `LOCAL_VERIFIED — odak/komşu 19/19` |
| At-rest veri güvenliği | IndexedDB/disk incelemede kişisel içerik 0; migration/restore/rollback kayıpsız | `OPEN_P0` |
| Fiziksel erişilebilirlik | 320×568, 200%, klavye, VoiceOver/TalkBack; Today→Plan→Carry→Belge tamam | `BEKLENİYOR` |

### Dalga 8 şimdiki dürüst hükmü

- Ürün “yalnız sadeleşmiş” değildir; setup, kapanış, devir işi, plan sahipliği ve çakışma doğruluğu birlikte ele alınmıştır.
- Birleştirilmiş feature/migration matrisi 520/520; yeni gerçek carry UI 1/1 ve setup+carry 2/2 geçti. İlk kesintisiz
  kalite turu ana JS gzip bütçesindeki yaklaşık 5 KiB aşımı yakaladı. Eşik gevşetilmedi; Today ve yoklama panelleri
  gerçek lazy chunk'lara ayrıldı. Ardından 409,1 saniyelik `npm run quality:gate` baştan sona geçti: lisans API 15/15,
  browser smoke 10/10, Sites 26/26 ve production PWA/offline 4/4. Ana JS bütçe ölçümü 176,4 KiB ile ≤180 KiB kapısını geçti.
- Bu dalga production'a çıkmış değildir. Yerel test sonucu fiziksel Emine Öğretmen kabulü veya gerçek çocuk verisi pilot izni değildir.
- Dünyanın en iyi uygulaması hedefinde bir sonraki teknik P0, at-rest şifrelemedir. Bir sonraki ürün P1'leri; temel Yıl/Ay/Hafta düzenleme, geç kapanış politikası, daily conflict çözümü ve fiziksel erişilebilirliktir.
- Commit, push ve production deploy bu dalgada yapılmadı.

## Dalga 10 — Günlük bağdan W2 öğretmen önerisine

### Eleştiri → kod → yeniden eleştiri

| Bulgu | Müdahale | Yerel hüküm | Hâlâ kapanmayan |
|---|---|---|---|
| Teacher daily W1'e bağlı değildi. | Plan+activity exact Yıl/Ay/Hafta kimliklerini aynı transaction'da alır; overlap/forged parent sıfır yazım. | `LOCAL_VERIFIED` | Daily conflict için öğretmen çözümü yok. |
| Today değerlendirme işi premium kapısına gidiyordu. | Weekly/monthly stage `Plan zincirim`e gider; provider kütüphanesi ayrı kalır. | `LOCAL_VERIFIED` | Generic teacher monthly evaluation açık. |
| W1 kararı gerçek kanıt ve revizyon izi taşımıyordu. | Immutable observation + matching activity + scope/date + optimistic concurrency; append-only evaluation. | `LOCAL_VERIFIED` | Beş günlük confirmed-link kapsamı tek journey'de açık. |
| W2 önerisi sessiz uygulanma riski taşıyordu. | Yalnız `pending-teacher-review`; source/target revision ve evaluation ID saklanır; W2 içeriği değişmez. | `LOCAL_VERIFIED` | Kabul/düzenle/reddet use-case'i açık. |
| Restore, teacher evaluation/carry grafını yeterince doğrulamıyordu. | Immediate-next week, revision, scope, observation/activity lineage ve W2 context exact kontrol. | `LOCAL_VERIFIED` | Fiziksel temiz cihaz restore açık. |
| Aynı dönemde provider/teacher seçimi belirsizdi. | Teacher-owned graph görünür öncelik alır; iki kayıt grafiği birleştirilmez. | `LOCAL_VERIFIED` | İki kaynak dilinin gerçek öğretmen anlaşılırlığı ölçülmedi. |

### Dalga 10 kanıtı

- Feature/migration: `539/539`.
- Teacher-owned odak: `33/33`.
- Backup/recovery: `33/33`.
- 390×844 gerçek browser: `2/2`; ikinci senaryo real daily/activity/observation → W1 değerlendirmesi → W2 pending önerisi.
- Typecheck, policy lint ve runtime integrity `36/36` geçti.
- Kesintisiz kalite kapısı baştan sona geçti: License API `15/15`, browser smoke `10/10`, Sites `26/26`,
  production PWA/offline `4/4` ve bundle bütçesi geçti. İlk denemede 9 seri workflow toplamı `66,8 sn` ile
  `60 sn` torba bütçesini aştı; eşik yükseltilmedi. Çekirdek (`55,1 sn`) ve planlama (`13,9 sn`) ayrı aynı
  60 saniyelik kapılara bölündü, ardından tam kalite turu sıfırdan geçirildi.
- Commit/push/deploy yapılmadı.

### Güncel yeniden eleştiri hükmü

1. `EKSİK P0`: premiumdan bağımsız teacher-owned aylık üç eksenli değerlendirme yok.
2. `KOPUK P0`: A3–A6 beş günlük yoklama/uygulama/gözlem-bağ/kapanış tek journey değil.
3. `RİSKLİ P0`: aynı haftanın production offline kill/reload ve şifreli clean restore kanıtı yok.
4. `RİSKLİ P0`: at-rest açık metin nedeniyle gerçek çocuk pilotu NO-GO.
5. `EKSİK P1`: W2 bekleyen önerisini kabul/düzenle/reddet use-case'i yok.
6. `EKSİK P1`: conflict daily için öğretmen kontrollü çözüm politikası yok.
7. `RİSKLİ P1`: fiziksel iki telefon, 200% ve yardımcı teknoloji kabulü yok.

Dar patch yanılsaması bu dalgada önlendi: günlük lineage, haftalık karar, sonraki hafta, belge, restore ve yönlendirme
aynı etki haritasında değişti. Buna rağmen “haftalık ekran çalıştı” bütün öğretmen haftası PASS sayılmadı.

## Dalga 13 — Haftalık önerinin öğretmen kararına dönüşmesi

| Bulgu | İlk hüküm | Uygulama / yeniden eleştiri | Şimdiki durum |
|---|---|---|---|
| W2 önerisi görünür fakat tıklanabilir bir öğretmen kararı değildir. | `KOPUK P0` | Kanıt+yansıtma+evaluation ID görünür; plan metni düzenlenerek kabul veya gerekçeyle ret edilir. | `LOCAL_VERIFIED`; fiziksel öğretmen anlaşılabilirliği açık. |
| Kabul öğretmen yerine sessiz uygulanabilir. | `RİSKLİ P0` | Pending durumda plan byte'ı değişmez; yalnız explicit kabul revision oluşturur. | `LOCAL_VERIFIED`. |
| Yanlış kabul geri alınamaz veya veri ezebilir. | `EKSİK P1` | Append-only `reopened`; kabulden sonra ara revizyon yoksa önceki snapshot exact geri gelir, varsa fail-closed. | `LOCAL_VERIFIED`; çoklu öneri merge açık. |
| Ağ tekrarında aynı karar ikinci revizyon olabilir. | `RİSKLİ P1` | Aynı action+gerekçe+accepted narrative idempotent olarak mevcut sonucu döndürür. | `LOCAL_VERIFIED`; process-kill/offline fiziksel kapı açık. |
| Belge yalnız “henüz uygulanmadı” diyebilir. | `YANLIŞ P1` | Pending/accepted/rejected ve karar geçmişi temel PDF/DOCX paragraf modeline girer. | Kaynak/test yeşil; güncel tüm-sayfa görsel QA açık. |

### Dalga 13 kanıtı ve kırmızı liste

- Domain+erişim+MARİF odak: `27/27`.
- Feature/migration: `547/547`.
- Typecheck, policy lint, runtime integrity `36/36`, production build ve bundle bütçesi geçti.
- Canlı yerel 390×844 akışta Today→Haftalık→`Plan zincirim` gerçek tıklaması çalıştı. Mevcut kurgu sınıfın
  eğitim yılı gelecekteydi. Denetim sırasında kurulum metninin plan hazırlamaya izin verdiği hâlde teacher graph
  commit'inin bunu reddettiği saptandı. Guard, yalnız hedef plan dönem başlangıcı için tanımlı hazırlık istisnasıyla
  düzeltildi; temiz origin'de sınıf, çocuk ve iki haftalı gerçek teacher graph düğmelerle oluşturuldu.
- İlk sihirbazın yalnız bir hafta üretmesi W1→W2 karar zincirini normal UI'de erişilemez bırakıyordu. Aynı aya
  sığan ikinci hafta başlangıç taslağına ve atomik grafa eklendi; 390×844 ekranda iki hafta revision 1 olarak
  doğrulandı. Dönem başlamadığı için gerçek gözlem/evaluation üretilmedi ve karar paneli sentetik veriyle PASS
  sayılmadı.
- Hazırlık uyarısı ile MARİF brifingi aynı dönem kısıtını iki ayrı büyük kartta yineliyordu. Uyarı semantiği,
  açıklama kimliği ve `Eğitim yılını aç` eylemi korunarak MARİF kartına kompakt bağlam satırı olarak alındı;
  sona ermiş dönem uyarısı bağımsız ve yüksek görünürlükte kalır.
- Sınıf kurulduktan sonra kompakt kurulum kartı ile MARİF aynı sonraki işi iki kez söylüyordu. Rehberli dört
  adımlı merkez yalnız temiz cihazda korunur; sınıf oluştuğunda MARİF tek sonraki işin sahibi olur ve `Şimdi`
  alanı ilk mobil görünümde yukarı taşınır.
- `OPEN_P0`: tam beş günlük aynı-kimlik journey, at-rest encryption, offline kill/restore.
- `OPEN_P1`: aylık öneri kararı, çoklu öneri merge, 200%/VoiceOver/TalkBack ve gerçek Emine Öğretmen süresi.

## Dalga 11 — Recovery sınırı ve aylık üç yönlü öğretmen değerlendirmesi

### Canlı hata → kök neden → güvenli davranış

| Gözlenen | Kök neden | Müdahale | Yeniden-test | Hüküm |
|---|---|---|---|---|
| Yerel URL açılıyor fakat hiçbir düğme kullanılamıyordu. | Eski bir kurtarma snapshot'ı doğrulanamadığında tek `Promise.all` bütün persistence gate'i kapatıyordu. | Kritik hydration adımları sabit `HYD-*` kodlarına ayrıldı; recovery listesi yardımcı/karantinada tutuldu, otomatik silinmedi. | Aynı bozuk recovery kaydıyla açık IAB oturumunda sınıf, 3 çocuk, Today döngüsü ve 5 nav açıldı. | `LOCAL_VERIFIED` |
| Recovery hatasını görmezden gelmek veri kaybını saklayabilirdi. | Listeyi boş göstermek “hiç recovery yok” sanılabilirdi. | Yedek yüzeyinde “kurtarma noktaları doğrulanamadı, silinmedi, inceleme gerekiyor” uyarısı kalıcı. | Kaynak regresyonu 2/2; typecheck/lint geçti. | `LOCAL_VERIFIED` |
| Teacher-owned aylık değerlendirme yoktu. | Generic weekly değerlendirme tamamlanmıştı; monthly domain/UI/provider modülüne bağlı kalmıştı. | Teacher-owned monthly append-only kayıt; üç yön; 11+12 ölçüt; next-month recommendation. | Domain pozitif/negatif 2/2; mobil form gerçek browser akışına eklendi. | `LOCAL_VERIFIED` |
| Yetersiz kanıt “yeterli” diye işaretlenebilirdi. | Teacher graph için iki hafta/roster/program-link coverage hesabı yoktu. | 2 gözlem + 2 gün + 2 hafta + her seçili gözleme teacher-confirmed link + tüm aktif çocuklar; eksikte sufficient disabled ve commit reddi. | Üç çocuk pozitif; eksik çocuk transaction rollback. | `LOCAL_VERIFIED` |
| Aylık kayıt belge/restore'da kaybolabilir veya tahrif kabul edebilirdi. | Teacher monthly evaluation backup branch'i yoktu; generic premium parser çağrılabilirdi. | Teacher monthly branch; ID/dönem/revizyon/scope/observation/link/coverage recompute; standalone PDF/DOCX paragraf izi. | Backup replace-restore ve revision tamper reddi; teacher UI+backup 3/3. | `LOCAL_VERIFIED` |

### Dalga 11 kanıtı

- Yerel açık oturum: persistence gate kalktı; öğretmen kayıtları silinmeden uygulama hazır oldu.
- Teacher monthly domain: `2/2`.
- Teacher-owned service/document odak matrisi: `25/25`.
- Gerçek IndexedDB backup + 390×844 teacher UI: `3/3`.
- TypeScript typecheck ve policy lint geçti.
- Commit, push ve production deploy yapılmadı.

### Güncel yeniden eleştiri hükmü

1. `KOPUK P0`: Kanonik beş günlük öğretmen haftası hâlâ tek UI/ID journey değil.
2. `RİSKLİ P0`: IndexedDB at-rest açık metin; gerçek çocuk pilotu NO-GO.
3. `EKSİK P0`: Uygulama içi öğretmen komuta/öneri/eleştiri/onay/geri-al katmanı yok.
4. `RİSKLİ P0`: Aynı hafta production offline kill/reload ve temiz profile şifreli restore ile kanıtlanmadı.
5. `EKSİK P1`: Sonraki ay önerisini kabul/düzenle/reddet ve yeni aylık plana idempotent uygula komutu yok.
6. `EKSİK P1`: Bozuk recovery snapshot için kullanıcı onaylı karantina/dışa-alma destek akışı yok.
7. `EKSİK P1`: Mükerrer günlük plan conflict'inde öğretmen kontrollü çözüm yok.
8. `RİSKLİ P1`: Fiziksel iki telefon, 200% zoom, VoiceOver/TalkBack ve gerçek öğretmen zaman bütçesi açık.

Aylık formun yeşil olması ürünün tamamı değildir. Bu dalga aylık P0'ı kapattı; eleştiri döngüsü bir sonraki
en büyük kopukluğa, tek beş günlük journey ve güvenli yerel kasa katmanına taşındı.

## Dalga 15 — beş günlük görünüm eklenirken yeniden eleştiri

| Yeni/tekrarlanan bulgu | Sınıf | Aynı turdaki karar | Yeniden-test / açık kapı |
|---|---|---|---|
| Hafta şeridi alt modellerdeki yetim lineage ve mükerrer günlük plan hatasını miras alıyordu. | `YANLIŞ/RİSKLİ P0` | Exact parent lineage ve `daily-plan-conflict` kapanış issue'su eklendi. | Odak/migration yeşil; gerçek conflict çözüm UI'si açık. |
| Pazartesi tek gözlemle “haftayı/ayı değerlendir” baskısı oluşuyordu. | `YANLIŞ P0` | Dönem sürerken `izle`; yalnız dönem sonu/geçmişte nihai değerlendirme çağrısı. | Erken tarih negatif testi yeşil. |
| Haftalık karar program bağını ve beş günlük kapanışı atlayabiliyordu. | `KOPUK P0` | Teacher-confirmed link ve her gerçek günlük plan için güncel eksiksiz kapanış zorunlu. | Link/kapanış tamper, process-kill ve 5 gün journey açık. |
| Eksikle kapanan gün “tamamlanan gün” sayılıyordu. | `YANLIŞ P0` | `closed-complete` ile `closed-with-carry`, sayaçlar ve dil ayrıldı. | Domain testi yeşil; fiziksel öğretmen anlaşılabilirliği açık. |
| Eski açık iş bugünün yoklamasını gölgeleyebiliyordu. | `GEREKSİZ/YANLIŞ P1` | Önce bugün; sonra geçmiş critical stale/conflict; sonra diğer geçmiş iş. | Pilot öncelik doğruluk oranı ölçülmeli. |
| Haftalık metrikler ekran okuyucudan gizliydi. | `RİSKLİ P1` | `aria-current=date`; buton etiketi yoklama/etkinlik/gözlem sayılarını taşır. | VoiceOver/TalkBack/%200 fiziksel kapı açık. |
| MARİF kartı öğretmene geliştirme dilinde “eleştiri ve riskler” gösteriyordu. | `GEREKSİZ P1` | Yüzey “Neden bu sıra? · canlı kontrol” diline çekildi; mega eleştiri bu defterde kaldı. | Gerçek öğretmen dili testi açık. |
| Plan ekranında günlük kayıtlar görünürken standalone PDF/DOCX yalnız Yıl→Ay→Hafta ve değerlendirmeleri taşıyordu. | `KOPUK P0` | Export store'dan exact öğretmen lineage'ını yeniden okuyor; günlük plan, gerçek etkinlik, 10 blok varsa akış, gözlem ve program bağı kimliklerini belgeye ekliyor. | Odak belge testi yeşil; fiziksel Word/PDF açma ve tüm-sayfa görsel QA açık. |

Bu dalganın sahte başarı kapısı: `teacher-week-workspace` için yeşil snapshot testi, beş günlük üretim
journey değildir. Tek sınıf/tek DB exact UUID'lerle servis yazımı, reload/offline ve clean restore birlikte
geçmeden “öğretmen haftası tamamlandı” denmeyecektir.

## Dalga 16 — tek IndexedDB öğretmen haftası ve sahte PASS tasfiyesi

| Yeniden eleştiri | Aynı turdaki müdahale | Şimdiki kanıt | Açık kapı |
|---|---|---|---|
| Runtime probu sonuçlardan bağımsız `PASS` yazıyordu. | PASS; 15 yoklama, 5 gün/etkinlik/gözlem/link, 6 append-only kapanış, 5 güncel complete kapanış, W2 pending karar, gerçek PDF/DOCX baytları, exact restore ve tahrif reddi assertlerinin sonrasına taşındı. | Açık IAB oturumunda tüm koşullar birlikte geçti. | Bu bir gerçek IndexedDB/domain yolculuğudur; production UI yolculuğu değildir. |
| Backup kanonikleştirmesi kapanış evidence alan sırasını değiştirince beş gün `stale` oluyordu. | Evidence eşitliği JSON property sırasından bağımsız exact alan karşılaştırmasına çevrildi. | Restore sonrası beş gün `closed/complete`; fingerprintler exact. | Closure fingerprint'in backup şemasında payloaddan bağımsız yeniden hesaplanması hâlâ açık. |
| Herhangi bir link gün sonunu hazır gösterebiliyordu. | Yalnız `teacher-confirmed` program bağı kapanış borcunu kapatır. | Pozitif ve `suggested` negatif regresyon geçti. | Öğretmen onayı dili fiziksel pilotta ölçülmeli. |
| Sonradan kaydolan çocuk geçmiş günün kadrosuna eklenip kapanışı bayatlatabiliyordu. | Enrollment geçmişi varsa `startedOn/endedOn`, legacy kayıtta `enrollmentDate` kullanılarak tarihsel kadro çözüldü. | Sonraki gün kayıtlı çocuk geçmiş fingerprinti değiştirmedi. | Ayrılış geçmişi olmayan legacy kayıtlar için ayrı migration/politika gerekir. |
| Ayın ilk haftasında nihai aylık değerlendirme yazılabiliyordu. | `periodEnd` öncesi nihai kayıt ve sonraki ay önerisi transaction başlamış olsa da sıfır yazımla reddedilir. | Erken tarih negatif testi ve snapshot eşitliği geçti. | Aydaki bütün öğretim günleri/haftalık kararlar için final-ready kapısı henüz tam değildir. |
| Haftalık evaluation link kimliği backup içinde değiştirilebiliyordu. | Restore; linkin seçili gözleme, aynı scope'a, `teacher-confirmed` kayda ve evaluation öncesi zamana bağlı olduğunu doğrular; her seçili gözleme en az bir link ister. | IAB tahrif denemesi reddedildi ve hedef DB değişmedi. | Program bağının içerik mühürü ve katalog sürümü yaşam döngüsü ayrıca izlenmelidir. |
| Haftalık karar yedeğinden bir günlük kapanış silinse veya closure fingerprint değiştirilse değerlendirme yine kabul edilebilirdi. | Restore; exact teacher-week lineage'daki her sivil günde tek günlük plan, evaluation öncesi son `complete` kapanış ve kapanış anındaki semantik kayıtlardan yeniden hesaplanan fingerprint ister. | IAB probunda kapanış silme ve canonical görünen sahte SHA-256 ayrı ayrı reddedildi; hedef DB değişmedi. | Kapanıştan sonra meşru semantik düzeltmenin geçmiş değerlendirmeyi nasıl yeniden-onaya taşıyacağı ürün politikası açık kalır. |
| Aynı sivil güne iki günlük plan bağlanmışsa haftalık servis ikisini aynı kapanışla değerlendirebilirdi. | Evaluation commit ve backup restore aynı gün tekilliğini fail-closed zorunlu kılar. | Yeni transaction regresyonunda ikinci daily plan sıfır yazımla reddedildi. | Öğretmen kontrollü çakışma çözüm ekranı hâlâ açık P1'dir. |
| Hazırlık döneminde Bugün, eğitim yılı başlamadan önceki takvim haftasını `5 açık iş günü` ve geçmiş plansız günler gibi gösteriyordu. | Gün kapanışı ve hafta read-model'i yalnız sivil gün seçili eğitim yılı sınırındaysa çalışır; hazırlık/sona-erme dışında sahte borç üretmez ve closure yazımı domain katmanında da kapanır. | 15 Ağustos hazırlık ekranında geçmiş 10–14 Ağustos hafta kartı kayboldu; hazırlık dönemi negatif testinde workspace `not-configured`, issue 0 ve yazım 0. | Disabled `Şimdi`, kapanış ve boş-plan kartlarının hazırlık görünümündeki bilgi tekrarı P1 kullanılabilirlik borcudur. |

### Dalga 16 dürüst hükmü

`LOCAL_DOMAIN_VERIFIED`: tek sınıf ve tek kaynak DB'de beş gün, şifreli backup, ayrı hedef DB replace-restore,
gerçek PDF/DOCX bayt üretimi; haftalık link, eksik kapanış ve closure-fingerprint tahrifi birlikte doğrulandı.
`PRODUCT NO-GO` devam eder: fixture
yoklama ve etkinlik durumlarını doğrudan domain API/transaction ile kuruyor; gerçek ekranlardan beş gün,
production service worker offline kill/reload, dosya seçicili temiz profil restore, günlük/haftalık/aylık ayrı
mesleki form ve cihaz-at-rest şifreleme henüz tamamlanmadı.

## Dalga 17 — hazırlık hiyerarşisi, gerçek UI plan omurgası ve kanıt sınırı

| Yeniden eleştiri | Aynı turdaki müdahale | Şimdiki kanıt | Açık kapı |
|---|---|---|---|
| Hazırlık modunda MARİF uyarısının altında aynı kilidi anlatan `Şimdi`, gün kapanışı, boş plan ve gün içi çalışma yüzeyleri tekrar ediyordu. | Hazırlık görünümünde yalnız gerçek hazırlık kararı ve öğretmen çalışma döngüsü bırakıldı; yazılamayan günlük operasyon kartları gizlendi. | 390×844 gerçek IAB önce/sonra karşılaştırmasında tekrarlar kalktı; hazırlık uyarısı ve planlama eylemi ilk görünümde kaldı. | Fiziksel 320×568, %200 ve ekran okuyucu kapısı açık. |
| Tamamen boş cihazda kurulum merkezi ile MARİF aynı `Sınıfı kur` çağrısını tekrarlıyor; kilitli günlük döngü ve çocuk alanları DOM'da kalıyordu. | Sınıf oluşana kadar yalnız dört adımlı kurulum merkezi render ediliyor; MARİF brifingi ve tüm operasyonel yüzeyler sınıf sonrasına ertelendi. | Ayrı, boş loopback origin'de tek kurulum merkezi; MARİF/çalışma döngüsü/gün kapanışı/çocuk alanı sayaçları 0 doğrulandı. | İlk sınıf kaydından sonraki odak ve geri dönüş fiziksel cihazda ölçülmeli. |
| “Plan zincirim”in gerçek kullanıcı yolundan kurulup kurulmadığı yalnız domain testlerinden anlaşılıyordu. | Hazırlık ekranındaki gerçek `Planlamaya başla` eylemiyle premiumdan bağımsız yıllık→aylık→haftalık grafik oluşturuldu. | Aynı IAB/IndexedDB oturumunda oluşturma, `/plans` yeniden yükleme ve aynı plan grafiğinin geri açılması geçti. | Beş günlük gerçek UI zinciri, offline kill/reload ve temiz profil restore hâlâ ayrı P0 kapısıdır. |
| Belge okuma modeli doğru ID'leri basarken activity/observation/link bağının tüm scope ve lineage alanlarını yeniden doğrulamıyordu. | Activity plan/scope/tarih/annual-monthly-weekly lineage; observation plan/activity/scope/tarih/immutable; curriculum link scope/tarih/observation ve `teacher-confirmed` koşullarıyla fail-closed yapıldı. | Pozitif link belgeye girdi; onaysız link dışlandı; activity lineage tahrifi reddedildi. | Uygulama üretim mesajını gösterdi; tarayıcı indirme olayı yakalanamadığı için fiziksel PDF/DOCX açma ve tüm-sayfa görsel QA kapanmış sayılmadı. |
| Hazırlıkta grafiği olan öğretmene “plan hazırlığı açık” denmesi, omurganın zaten hazır olduğu gerçeğini bulanıklaştırıyordu. | Metin, grafik varsa “Plan omurgası hazır; günlük uygulama dönem başlayınca açılır”, yoksa “Plan omurgası hazırlanabilir” diye ayrıldı. | Gerçek reload sonrası doğru hazır metni göründü. | Eğitim yılı başladığında aynı grafikten gün üretme/uygulama yolu tek journey'de doğrulanmalı. |

### Dalga 17 dürüst hükmü

`LOCAL_UI_VERIFIED`: temiz cihaz tek-CTA kurulumu, hazırlık hiyerarşisi, gerçek öğretmen plan grafiği oluşturma ve reload kalıcılığı.
`LOCAL_DOMAIN_VERIFIED`: export lineage ve yalnız öğretmen-onaylı program bağı.
`PRODUCT NO-GO`: canlı IndexedDB at-rest şifreli değildir; gerçek ekranlarla Pazartesi–Cuma 15 yoklama,
5 uygulama, 5 gözlem/bağ/kapanış, production offline, dosya seçicili temiz restore ve fiziksel cihaz
kabulü aynı zincirde geçmemiştir. Yeşil 565 test bu ürün kapılarının yerine geçmez.

## Dalga 12 — MARİF öğretmen asistanı ilk komuta dilimi

| Soru | Güncel kanıt | Eleştiri sınıfı | Sonraki kabul kapısı |
|---|---|---|---|
| Sistem yalnız durumu mu gösteriyor, yoksa işi önceliklendiriyor mu? | Canlı read-model; kurulum, dönem kilidi, carry, yoklama, plan, bağ, kapanış, hafta, ay ve belgeyi tek deterministik sırada çözüyor. | `KOPUK P0` kapatılmaya başlandı. | Aynı beş günlük journey'de doğru ana eylem oranı %100; yanlış scope/yeni duplicate 0. |
| Önerinin nedeni görülebiliyor mu? | Dört kişisel verisiz kanıt sayacı ve en fazla dört başlık+gerekçeli risk görünür. | `IMPLEMENTED_UNVERIFIED`. | Her önerinin kaynak record ID/read-model snapshot izi; stale değişimde anında yeniden hesaplama. |
| MARİF sessiz yazıyor mu? | Hayır; salt-okunur brifing yalnız gerçek akışa yönlendiriyor, açık onay olmadan kayıt yapmıyor. | Güvenli başlangıç. | Taslak→önizleme→onay/reddet→idempotent uygula→geri al komutu ve negatif testler. |
| Canlı yerel akış çalışıyor mu? | Bozuk recovery kaydı korunurken Today açıldı; MARİF `3/4 plan düzeyi bağlı` dedi; ana CTA `/plans` zincirini açtı, global kilit yok. | `LOCAL_VERIFIED`. | Reload/offline/kill, 320×568, 200%, VO/TalkBack ve iki fiziksel telefon. |
| Ürün istenen seviyede mi? | Hayır. Brifing var; niyet diyalogu, taslak üretimi, etki önizleme ve geri alma yok. | `EKSİK P0`. | İlk gerçek komut: “Bu haftayı eleştir ve W2 taslağı hazırla”; kanıtlı taslak, öğretmen düzenlemesi ve sıfır sessiz yazım. |

Bu dalganın dürüst hükmü: ekranlara yalnız yeni bir isim eklenmedi; mevcut kayıt zincirinden açıklanabilir bir
öncelik motoru ve gerçek hedefe giden ana eylem kuruldu. Buna rağmen cihaz-içi ultra-agent iddiası henüz yapılamaz.

## Dalga 14 — aylık karar döngüsü ve hazırlık modu kullanılabilirlik düzeltmesi

| Bulgu | İlk hüküm | Uygulama / yeniden eleştiri | Şimdiki durum |
|---|---|---|---|
| Sonraki ay önerisi metin olarak kaydoluyor fakat hedef ayla ilişkili bir öğretmen kararı olmuyordu. | `KOPUK P0` | Source evaluation + exact next-month target + source/target revision kilidi; pending/accepted/rejected context eklendi. | `LOCAL_VERIFIED`; fiziksel/offline açık. |
| Öneri hedef ayı sessiz değiştirebilirdi. | `RİSKLİ P0` | Pending durumda target content byte-eşit; yalnız explicit düzenle+kabul revision üretir. | `LOCAL_VERIFIED`. |
| Ret veya geri alma izi yedekte kaybolabilirdi. | `RİSKLİ P1` | Append-only history, idempotency ve strict backup graph ilişkisi; gerçek IAB IndexedDB restore/tamper probu geçti. | `LOCAL_VERIFIED`; şifreli fiziksel dosya turu açık. |
| Hazırlık modunda aylık form baştan açıktı, uzun doldurma sonunda commit reddediliyordu. | `YANLIŞ P1` | Plan hazırlığı açık; değerlendirme/carry düğmeleri önceden disabled ve açık gerekçeli. Plan revizyonu kendi dönem başlangıcıyla güvenli hazırlık istisnası alıyor. | 390×844 gerçek oturumda revizyon 2 ve erken engel doğrulandı. |
| İki ay arasında normal kullanıcı yolu yoktu. | `EKSİK P1` | Dört karar başlangıcı Eylül W1+W2 yanında Ekim ilk haftasını atomik kuruyor. | Temiz origin canlı UI'de 2 ay/3 hafta görüldü. |

### Dalga 14 kanıtı ve açık işler

- Aylık karar + erişim + starter odak testleri: `17/17`.
- Feature/migration: `548/548`.
- Typecheck, policy lint ve runtime integrity geçti.
- IAB runtime yedek probu: `restoredStatus=accepted`, history `1`, evaluation ID exact, tahrif ret ve hedef DB değişmezliği geçti.
- Görsel kanıt: `app/output/playwright/wave14-monthly-carry-audit-2026-08-15/`.
- `OPEN_P0`: beş günlük tek journey, at-rest encryption, production offline kill/clean restore.
- `OPEN_P1`: çoklu aylık öneri merge, tam yıl ay editörü, aylık karar içeren PDF/DOCX görsel QA,
  fiziksel 200%/VoiceOver/TalkBack ve Emine Öğretmen süre/anlaşılabilirlik testi.
- Commit, push ve deploy yapılmadı.

## Dalga 18 — beklenen öğretim günü resolver'ı ve uygulama sonrası yeniden eleştiri

### Önceki eleştiri → müdahale → güncel hüküm

| Dalga 18 bulgusu | Sınıf | Aynı turdaki müdahale ve exact kanıt | Şimdiki dürüst durum |
|---|---|---|---|
| Haftalık hazır olma yalnız oluşturulmuş günlük planları sayıyordu; eksik gün paydadan sessizce düşebiliyordu. | `YANLIŞ/KOPUK P0` | `resolveTeacherWeekTeachingDays` beklenen gün kümesini MEB 2026–2027 uyum+dönem hafta içleri eksi ara tatil/tam gün tatil ve kaynaklı okul-olmayan dönemlerden çözüyor. `resolveTeacherWeekCoverage`, eksik/mükerrer/beklenmeyen gün ile complete closure paydasını aynı kümeden üretiyor. | `IMPLEMENTED_UNVERIFIED`; domain kapısı var, gerçek UI beş günlük acceptance yok. |
| Haftalık değerlendirme cuma takvim günü başlar başlamaz açılabiliyordu. | `YANLIŞ P0` | Son expected gün + sınıf `schedule.endTime` + `Europe/Istanbul`, exact UTC açılış anına dönüştürüldü. Read-context ve commit aynı coverage/time kapısını kullanıyor. | 18 Eylül bitiş saatinden önce ret ve sonrasında kabul hedefli testli; fiziksel saat/uyku/yeniden açma kanıtı açık. |
| Öğretmen çalışma günü, uyum, normal dönem, ara tatil, tam gün tatil ve yerel okul kapanışı aynı “Pazartesi–Cuma” varsayımındaydı. | `YANLIŞ P0` | MEB/Diyanet provenance'ına ek olarak mevcut takvim CRUD/UI'sına `no_school` eklendi. Aynı scope'taki canlı, cancelled/tombstone olmayan kayıt `teacher-local`+calendar-entry URN ile Today ve weekly gate'in ortak resolver'ına giriyor. | `IMPLEMENTED_UNVERIFIED`: hedef `24/24`, migration `578/578`, typecheck/lint/runtime `36/36`, build PASS; canlı IAB create+reload PASS. Browser backup fixture güncel fakat test çalıştırılmadı. |
| Hafta hazır olma paydası öğretmene görünmiyordu. | `KOPUK P1` | Plan değerlendirme paneli `tamamlanan/beklenen öğretim günü`, exact tarihler ve `MEB 2026–2027 çalışma takvimi ve sınıf bitiş saati` dayanağını gösteriyor. | Ekran kaynağı görünür; Today hafta özeti aynı resolver'ı tüketmediği için bütün yüzeylerde henüz tek gerçek yok. |
| Ana ekran kullanıcıya “MARİF ajanı/eleştirisi” geliştirme dilini öğretiyordu. | `GEREKSİZ P1` | Görünür marka dili `Sıradaki iş`, açıklanabilir `Bu sıra neye dayanıyor?` ve `Bu hafta` öğretmen diline çevrildi; karar motoru iç uygulama ayrıntısı olarak kaldı. | 390×844 yerel görsel kanıt var; fiziksel Emine Öğretmen anlaşılabilirlik testi açık. |

### Kanıt özeti ve ek düzeltme

> **Ek düzeltme hükmü:** Yukarıdaki “Today hafta özeti aynı resolver'ı tüketmiyor” hücresi tarihsel
> Dalga 18 ilk denetimidir ve artık açık değildir. Today current teacher week, aynı
> `resolveTeacherWeekTeachingDays` sonucundan expected payda, exact tarihler ve official/custom provenance
> alıyor. MEB ara tatilinde `0 öğretim günü` ve sıfır gün kartı; weekly plan yokken etiketli Mon–Fri fallback;
> çözümleme hatasında fail-closed `invalid` durum gösteriliyor. Başlık `Öğretim günlerini tek zincirde izleyin`,
> coverage detail görünürdür. Statü `IMPLEMENTED_UNVERIFIED`dır.

- Expected-day resolver + provenance + tatil negatifleri + 14–18 Eylül normal dönem beş kapanış + sınıf
  bitiş saati kapısı için hedefli root kanıt: `30/30`.
- Today expected-day tüketimi ve ara tatilde sahte 0/5 kartının yokluğu için teacher-week workspace +
  teaching-days hedefli kanıt `10/10`; typecheck ve policy lint yeşil.
- `no_school` takvim CRUD/iptal/tombstone, `teacher-local` provenance ve Today+weekly gate ortak gün listesi
  domain/plan/Today hedefli kanıtta `24/24`; full migration `578/578`; typecheck/lint/runtime `36/36` ve build geçti.
- Backup strict enum ve browser roundtrip fixture'ı `no_school` korunumu için güncellendi; browser backup testi
  bu tur çalıştırılmadı ve başarı kanıtı sayılmadı.
- `Kayıt Ekle → Takvime not ekle` native-history yarışı `surfaceTransitionRef.current="calendar"` ile kapandı;
  runtime-integrity `8/8`. IAB'de 16 Eylül `no_school` gerçek formdan oluşturuldu, reload sonrası kayıt ve payda korundu.
- `teacher-week-real-ui.spec.ts`, `test:runtime:ui:workflows:teacher-week` ile package kalite zincirine eklendi.
  Product Design browser kuralı nedeniyle CLI spec koşulmadı; test dosyasının varlığı PASS değildir.
- Typecheck, policy lint ve runtime integrity geçti.
- Haftalık değerlendirme read-context ile commit aynı `resolveTeacherWeekCoverage` hesabını kullanıyor;
  yalnız UI'da açık görünen bir uyarı değil, kalıcı yazım kapısıdır.
- Görsel kanıt: `app/output/playwright/wave18-teacher-week-audit-2026-08-16/01-current-today-390x844.png`
  ve `02-next-action-after-390x844.png`.
- Statü `IMPLEMENTED_UNVERIFIED`; commit, push ve deploy bu belge görevinin parçası değildir.

### Dalga 18 after-critique — açık kırmızı liste

**Ek düzeltme:** Aşağıdaki tarihsel 6. madde kapanmıştır ve açık kırmızı listeye artık dahil değildir.
Today sabit `/5` kullanmıyor; `TODAY-PROJ-01` yerel olarak `IMPLEMENTED_UNVERIFIED`dır. Açık P1 listesi
yerel kapanışın çok-gün UI/kaynak belge-audit izi ve fiziksel kabul ile devam eder.

1. `KOPUK P0`: Mutation seed kullanmayan gerçek UI öğretmen-haftası spec'i ve package kalite bağlantısı vardır,
   fakat spec bu tur koşulmadı. PASS/artifact/hata kanıtı olmadan 3 çocuk × 5 gün; 15 yoklama; 5 plan/uygulama/
   gözlem/teacher-confirmed bağ/kapanış ve haftalık karar tamamlandı denemez.
2. `KOPUK P0`: Aynı UI zincirinin çarşamba process kill → ağsız perşembe/cuma devamı ve şifreli dosyayı boş
   tarayıcı profiline gerçek file input ile clean restore exact eşleşmesi yoktur.
3. `RİSKLİ P0`: Ana IndexedDB ve recovery store açık metindir. Gerçek çocuk verili pilot at-rest kasa,
   anahtar yönetimi ve kesinti güvenli migration tamamlanana kadar `NO-GO`dur.
4. `EKSİK P1`: Premium hazır içeriği bozmadan, her öğretmenin kendi temel 10 bloklu tam/yarım gün formunu
   kuracağı model yoktur; tek etkinlik kaydı tam günlük plan sayılmamalıdır.
5. `GEREKSİZ P1`: Haftalık hedef/çocuk/akış varsayılanları günlük plana miras olmadığı için aynı bilgi beş gün
   yeniden girilebilir. Varsayılan miras + açık öğretmen override'ı gerekir.
6. `KAPANDI · IMPLEMENTED_UNVERIFIED`: Today `Bu hafta` sabit `/5` kullanmıyor; current teacher week aynı
   expected-day resolver'dan payda/tarih/provenance alıyor, ara tatilde 0 gün ve hatada `invalid` gösteriyor.
7. `EKSİK P1`: Tek günlük `no_school` gerçek UI create+reload ile kanıtlandı; durum güncelleme/iptal ve tombstone
   aynı takvim akışında. Fakat çok günlük kapanış UI'si, kaynak belge eki ve denetlenebilir karar/audit notu yoktur.
   Browser backup roundtrip fixture'ı güncel olsa da çalıştırılmadı.
8. `RİSKLİ P1`: 320×568, %200, VoiceOver/TalkBack, iki fiziksel telefon, PDF/DOCX açma ve öğretmen süre ölçümü açıktır.

### Ölçülebilir sonraki kabul kapıları

- `TODAY-PROJ-01 — IMPLEMENTED_UNVERIFIED`: current teacher week, plan değerlendirme paneli ve commit aynı
  kanonik resolver/paydayı kullanıyor; ara tatil 0 gün, haftasız durum etiketli Mon–Fri fallback, hata
  `invalid`. Yerel `10/10`+typecheck/lint kanıtı var; gerçek/fiziksel UI kabulü açık.

- `UI-WEEK-01 — IMPLEMENTED_UNVERIFIED`: gerçek UI spec package kalite zincirindedir; mutation seed yok, yalnız
  final read-only oracle var. CLI spec koşulmadığı için PASS değildir; aynı-profile restore clean restore/offline sayılmaz.
- `CAL-NEG-01 — IMPLEMENTED_UNVERIFIED`: canlı same-scope `no_school` Today+weekly paydasından düşer;
  cancelled/tombstone düşmez. IAB 16 Eylül create+reload PASS; native-history yarış düzeltmesi `8/8`; hedef
  `24/24`, migration `578/578`, typecheck/lint/runtime `36/36`, build PASS. Browser backup/fiziksel kabul açık.
- `WEEK-TIME-01`: son sınıf bitiş anından bir saniye önce sıfır yazımla ret; eşikte yalnız exact beş gün complete ise kabul.
- `OFFLINE-01`: çarşamba kill; ağsız yeni süreç; perşembe/cuma UI'dan devam; ağ/seed bağımlılığında test kırılır.
- `RESTORE-01`: şifreli dosya boş `userDataDir`a UI file input ile restore; bütün kanonik projeksiyon exact eşit.
- `VAULT-01`: ham IndexedDB/recovery denetiminde çocuk adı, gözlem, yoklama ve plan metni okunamaz.
- `FULLDAY-01`: ücretsiz boş tam/yarım gün blok formu; premium hazır içerik ayrı entitlement; süre/çakışma/kapsama doğrulaması.
- `INHERIT-01`: hafta kapsamı günlük taslağa varsayılan gelir; öğretmen yalnız istisnayı değiştirir.

Dalga 18 beklenen gün ve erken haftalık hüküm riskini domain katmanında kapattı. Buna rağmen ürünün bütün
hükmü değişmedi: gerçek UI/offline/clean-restore zinciri ve at-rest şifreleme tamamlanmadan “öğretmen haftası
doğrulandı” veya “gerçek çocuk pilotuna hazır” denemez.

## Dalga 19 — Bugün yüzeyinde tekrar azaltma ve yeniden eleştiri

| Dalga 19 bulgusu | Sınıf | Aynı turdaki müdahale ve kanıt | Şimdiki dürüst durum |
|---|---|---|---|
| Hazırlık modunda gerçek `Sıradaki iş` kararının altında `Dönem kayıtları` ve eski çalışma döngüsü aynı kilidi yeniden anlatıyordu. | `GEREKSİZ P1` | Hazırlık render'ında yalnız `Sıradaki iş` bırakıldı. 390×844 canlı kontrolde `nextAction=true`, `periodCards=false`, `oldCycle=false`. | Görünür tekrar kapandı; fiziksel öğretmenin hazırlık karar süresi ölçülmediği için `IMPLEMENTED_UNVERIFIED`. |
| Etkin dönemde beş-adım stepper ve açıklama, yıllık/aylık/haftalık/günlük durumunu iki kez gösteriyordu. | `GEREKSİZ P1` | Stepper ve tekrar açıklaması kaldırıldı; dört düzey aynı kanonik kayıtlardan 2×2 kompakt `Dönem kayıtları` yüzeyine dönüştü. | 390×844'te `scrollWidth=390`, yüzey yüksekliği yaklaşık `281,8 px`; bilgi kaybı regresyonları yeşil. |
| Gün kapanışı carry notunu gösterirken ayrı taşıma bölümü aynı notu yeniden gösteriyordu. | `GEREKSİZ P1` | Kapanış kartındaki ikinci carry metni kaldırıldı; taşıma kaydı, durumu ve ayrı eylem yüzeyi korundu. | `dayCloseHeight=78`, `repeated carry=false`; gerçek taşıma görevinin bulunabilirliği fiziksel pilotta ölçülmeli. |
| Tekrarların kaldırılması “ana ekran profesyoneldir” sonucuna erken dönüştürülebilir. | `RİSKLİ P1` | Odak `13/13`, profesyonel yüzey `5/5`, typecheck/lint PASS olarak kaydedildi; bunlar yalnız uygulama/regresyon kanıtıdır. | Etkin dönemde `Sıradaki iş` + `Şimdi` + taşıma + `Bu hafta` + `Dönem kayıtları` arasındaki karar hiyerarşisi gerçek öğretmen pilotuyla doğrulanmadı. |

### Dalga 19 after-critique — daraltılmayan açık kapılar

1. `KAPANDI · GEREKSİZ P1`: Hazırlık modunda dönem kartları ve eski döngü görünmüyor; yalnız gerçek
   `Sıradaki iş` var.
2. `KAPANDI · GEREKSİZ P1`: Etkin dönem stepper/tekrar açıklaması ile kapanıştaki ikinci carry metni kaldırıldı.
3. `AÇIK · RİSKLİ P1`: Etkin dönemde kalan beş karar/durum katmanı gerçek öğretmenin ilk doğru eylem süresi,
   yanlış dokunma, geri dönüş ve görev tamamlama oranlarıyla ölçülmelidir. Geometrik küçülme bilişsel hiyerarşi
   kanıtı değildir.
4. `AÇIK · RİSKLİ P1`: 320×568, %200 zoom, VoiceOver/TalkBack, fiziksel Android/iPhone ve Emine Öğretmen
   kabulü olmadan ana ekran `VERIFIED` değildir.
5. `AÇIK P0`: Dalga 18'in gerçek beş günlük UI spec PASS/artifact, offline kill/devam, boş profile clean restore
   ve at-rest şifreleme kapıları bu görsel iyileştirmeyle kapanmaz.

### Ölçülebilir kabul

- `TODAY-HIERARCHY-01 — IMPLEMENTED_UNVERIFIED`: hazırlıkta `Sıradaki iş=1`, dönem kartı/eski döngü `=0`;
  etkin dönemde 10 öğretmen × en az 5 canlı durum, doğru ilk iş medyan ≤10 sn/P90 ≤20 sn, yanlış ilk dokunma
  ≤%5, geri dönüşlü dolaşma ≤%10, görev tamamlama ≥%95. Aynı matris 320×568, %200 ve en az bir ekran okuyucuyla
  geçmelidir.

Dalga 19, “sadeleştirme”yi amaç değil doğru karar yoğunluğunu kurmak için müdahale olarak kullandı. Görünür
tekrarlar azaldı; ürünün ana sayfa kullanılabilirliği gerçek öğretmen davranışı ölçülmeden tamamlanmış sayılmadı.

## Dalga 20 — öğretmenin 10 bölümlü günlük akışı ve yeniden eleştiri

| İlk bulgu | Sınıf | Aynı turdaki müdahale ve kanıt | Şimdiki dürüst durum |
|---|---|---|---|
| Tek etkinlik kaydı öğretmenin tam/yarım gün planı gibi sunulabiliyordu. | `EKSİK/KOPUK P0` | Premiumdan bağımsız 10 sıralı bölüm, sınıf saatine exact süre toplamı, tek gerçek etkinlik, değişmez bölüm kimlikleri ve append-only revizyon eklendi. | Domain + UI + belge + backup zinciri `IMPLEMENTED_UNVERIFIED`. |
| Sistem varsayılanı öğretmen hiçbir bölümü incelemeden `teacher-authored` diye kalıcılaştırabilirdi. | `YANLIŞ P0` | Servis artık explicit 10 blok olmadan sıfır yazımla reddediyor. UI onayı her değişiklikte sıfırlanıyor; kalıcı `teacher-reviewed`, UTC `confirmedAt` ve yerel öğretmen UUID'si her revizyonda saklanıyor. | Odak `37/37`, migration `587/587`; gerçek IAB form kaydı ve reload geçti. |
| On bölümün tamamı `skipped` olsa biçimsel plan geçebilirdi. | `YANLIŞ P1` | Domain guard, strict parser ve UI hazır-olma hesabı en az bir `planned` bölüm istiyor. | Negatif testli; skipped süre semantiği ve açık gün boşluğu politikası ayrıca geliştirilmeli. |
| 10 bölümde süre değişimi öğretmene gereksiz elle dengeleme yüklüyordu. | `GEREKSİZ P1` | `Süreleri sınıf gününe eşit dağıt` eylemi eklendi; bir dokunuşla exact schedule toplamına dönüyor ve yeniden öğretmen onayı istiyor. | İlk müdahale; önceki günden/haftadan kopyalama ve istisna odaklı düzenleme açık. |
| Bütün özetler ekran okuyucuda aynı “Bölümü düzenle” adıyla duyuluyordu. | `RİSKLİ P1` | Özet adı sıra + görünür başlık + eylem olarak değişti; sayısal girişte sürekli canlı-anons üreten toplam alanı kaldırıldı. | Kaynak ve gerçek DOM doğrulandı; %200, VoiceOver/TalkBack fiziksel kapısı açık. |
| Yedek restore strict akışı bozabilir veya eski tek-etkinlik plana uydurma blok ekleyebilirdi. | `RİSKLİ P0` | İzole gerçek IndexedDB probu 10 bölüm, iki revizyon ve öğretmen onayını exact restore etti; sıra tahrifi hedefi değiştirmeden reddedildi; legacy kayıt akış uydurulmadan korundu. | IAB probu `PASS`; kalite zincirine gerçek browser restore spec'i eklendi, CLI bu tur Product Design kuralı nedeniyle çalıştırılmadı. |

### Dalga 20 canlı ve yerel kanıt

- Gerçek IAB: Yıl→Ay→Hafta omurgası formdan oluşturuldu; 10 bölüm, etkinlik fikri, program hedefi ve açık
  öğretmen onayıyla günlük plan kaydedildi. Plan tek etkinlik olarak başladı; reload sonrası Planlar `4/4`,
  `1 günlük plan` ve aynı başlığı gösterdi.
- İzole IndexedDB probu: `flowBlockCount=10`, `revisionNumber=2`, `authorshipConfirmation=teacher-reviewed`,
  `activityCount=1`, `tamperRejected=true`, `targetUnchanged=true`, `legacyPreserved=true`.
- Odak Node `37/37`; migration `587/587`; typecheck, policy lint, runtime integrity `36/36`, build ve diff-check geçti.
- Görsel kanıt: `app/output/playwright/wave20-daily-flow-audit-2026-08-16/`.
- Commit, push veya deploy yapılmadı.

### Dalga 20 sonrası açık mega eleştiri

1. `KOPUK P1`: Gerçek etkinlik henüz exact bir `flowBlockId` taşımıyor; uygulamanın hangi bölümde gerçekleştiği
   revizyon/export zincirinde kanıtlanamıyor.
2. `GEREKSİZ P1`: 10 bölüm × ayrıntı alanları ilk plan için ağırdır. Haftadan/önceki günden getir, yalnız
   istisnaları değiştir ve süreyi akıllı dağıt akışları öğretmen süresiyle ölçülmelidir.
3. `EKSİK P1`: Günlük-only, haftalık-only ve aylık-only öğretmen formu; indirmeden önce önizleme/son onay;
   Türkçe ana gövde ve audit eki ayrımı yoktur. Mevcut birleşik çıktı teknik arşiv ağırlıklıdır.
4. `KOPUK P0`: Beş günlük gerçek UI spec'i yeni onay yüzeyine güncellendi fakat bu tur browser CLI ile
   koşulmadı. Tek gün IAB kanıtı, 5 gün/15 yoklama/offline kill/clean restore yerine geçmez.
5. `RİSKLİ P0`: At-rest plaintext IndexedDB ve recovery kayıtları nedeniyle gerçek çocuk verili pilot hâlâ NO-GO'dur.

## Dalga 21 — akış bölümü, gerçek uygulama ve belge hükmünü birleştirme

Dalga 20'nin açık bıraktığı en büyük kopukluk aynı turda tekrar eleştirildi: öğretmenin on bölümden oluşan
günlük akışı kalıcıydı, fakat tek gerçek etkinliğin hangi bölümde uygulandığı kanıtlanamıyordu. Dalga 21 bu
bağı yalnız görünümde değil create/update, Today, gözlem açma, yedek/restore ve belge read-model'inde aynı
`flowBlockId` ile kurdu.

| Dalga 21 bulgusu | Sınıf | Aynı turdaki müdahale ve kanıt | Şimdiki dürüst durum |
|---|---|---|---|
| Gerçek etkinlik, öğretmenin on akış bölümünden hiçbirine bağlı değildi. | `KOPUK P0` | Etkinlik exact `teacherOwnedFlowBlockId` taşır; yalnız aynı planın uygulanacak etkinlik bölümüne bağlanabilir. Yabancı, bilinmeyen veya `skipped` bölüm create/update/restore'da sıfır yazımla reddedilir. Today exact on bölümü gösterir; gerçek etkinlik yalnız bağlı bölümden gözleme açılır. | Domain/Today/export/backup odak testlerinde exact kimlik bağı geçti; gerçek beş günlük fiziksel telefon zinciri açık olduğu için `IMPLEMENTED_UNVERIFIED`. |
| İkinci gün de on bölüm sıfırdan düzenlenmek zorundaydı. | `GEREKSİZ P1` | Aynı haftadaki en yakın önceki öğretmen akışı salt-okunur yüklenir; `Dünden getir` önce fark sayısını gösterir, yalnız blok taslağını taşır, yeni gün için yeni UUID üretir ve etkinlik/gözlem kopyalamaz. Uygulama sonrası öğretmen onayı yeniden istenir. | Önceki-gün yolu uygulandı; haftadan şablon seçme ve gerçek P90 süre ölçümü açık. |
| Eşit dağıt eylemi zaten eşit durumda gereksiz onay kaybettirebiliyordu. | `GEREKSİZ P1` | Exact varsayılan dağılımda eylem pasif/no-op; değer değişmediğinde öğretmen inceleme durumu sıfırlanmaz. | Delta tabanlı akıllı dengeleme ve isteğe bağlı/atlanmış süre politikası açık. |
| Birleşik teknik çıktı günlük/haftalık/aylık öğretmen belgesi gibi sunuluyordu. | `EKSİK/KOPUK P1` | Günlük, haftalık, aylık ve birleşik kapsam seçimi; kalıcı paragraf önizlemesi; exact önizlenen revizyon için açık öğretmen onayı; sonra PDF/Word indirme eklendi. Türkçe ana gövde ile teknik kimlik/enum denetim eki ayrıldı. | IAB'de kapsam→önizleme→onay düğme zinciri ve 320×568 taşmasız düzen görüldü. IAB download event beklemesi zaman aşımına uğradığı için fiziksel indirme/açma ve tüm-sayfa render hâlâ açık. |
| Sistem başlangıcı öğretmen ürünü gibi gösterilebilirdi. | `YANLIŞ P0` | Servis explicit on blok, seçilmiş gerçek etkinlik bölümü ve kalıcı `teacher-reviewed` onayı olmadan yazmaz. Belge “otomatik üretilmemiştir” demek yerine sistem başlangıcının öğretmen tarafından incelenen revizyon olduğunu söyler. | Kaynak, reload ve restore kimliği korunuyor; başka olası yazma yüzeyleri sürekli negatif taramada kalmalı. |

### Dalga 21 yeniden eleştiri — açık kalan master kapılar

1. `AÇIK · GEREKSİZ P1`: `Dünden getir` var; haftadan şablon seçme, değişen alanları yan yana karşılaştırma,
   öğretmen P90 ≤90 sn ve toplam dokunuş bütçesi henüz kanıtlanmadı.
2. `AÇIK · YANLIŞ P1`: süre dengeleme hâlâ bütün bölümleri eşit dağıtır; +10/−10 dakika gibi istisna odaklı
   delta önerisi ve `optional/skipped` süresinin planlanan kapsama etkisi kanonikleştirilmedi.
3. `AÇIK · RİSKLİ P0`: gerçek seedless beş günlük UI acceptance browser CLI ile bu tur çalıştırılmadı;
   15 yoklama, beş uygulama/gözlem/bağ/kapanış, offline kill ve temiz profile restore birlikte PASS değildir.
4. `AÇIK · EKSİK P1`: sağlayıcı kaynaklı plan çıktısı aynı önizleme/onay merkezine henüz birleştirilmedi;
   günlük/haftalık/aylık öğretmen formlarının resmî mizanpaj ve tüm-sayfa PDF/Word QA'sı açık.
5. `AÇIK · RİSKLİ P0`: canlı IndexedDB at-rest şifrelenmeden gerçek çocuk verisi pilotu `NO-GO` kalır.
6. `AÇIK · RİSKLİ P1`: 200% reflow, VoiceOver/TalkBack ve iki fiziksel telefon doğrulaması yoktur.

Dalga 21, “on bölüm var” iddiasını gerçek uygulama ve kanıt kimliğiyle bağladı. Bu zincir artık teknik olarak
anlamlıdır; fakat öğretmen süresi, fiziksel cihaz, tam hafta, erişilebilirlik ve at-rest kasa kanıtı olmadan
“dünyanın en iyi uygulaması” hükmü verilmez.

## Dalga 22 — haftadan getir, dakika istisnası ve aynı turda görsel yeniden eleştiri

| Yeniden eleştiri | Sınıf | Müdahale | Dürüst hüküm |
|---|---|---|---|
| `Dünden getir` yalnız en yakın günü sunuyor; haftanın daha uygun planı seçilemiyordu. | `GEREKSİZ P1` | Tüm geçerli önceki günler tarih+başlıkla listelendi; fark önizlemesi ve kalıcı kaynak plan/hafta/revizyon provenance'ı eklendi. | Kaynak ve negatif revizyon testli; gerçek P90 süre ölçümü açık. |
| +10 dakika değişiklik bütün on bölümün eşit dağılımını sıfırlamayı gerektiriyordu. | `GEREKSİZ P1` | Farkı tek uygun esnek bölümden exact ekle/azalt eylemi eklendi; no-op eşit dağıt kapalı kalıyor. | Gerçek tarayıcıda 250/240→240/240 geçti. |
| `skipped` dakika planlanan uygulama süresi gibi algılanabilirdi. | `YANLIŞ P1` | Takvim toplamı ile uygulanmayacak açık zaman ayrı söyleniyor. | Kapanış/belge semantiği sürekli negatif taramada kalmalı. |
| İlk mobil denetimde süre uyarısı kart dışına taşıp yatay kaydırma oluşturdu. | `RİSKLİ P1` | Grid çocuklarına `min-width:0`, uyarı eylemine tam satır ve taşan metne güvenli kırılma uygulandı; 360 altında tek kolon. | 390 px tekrar ekran görüntüsünde yatay taşma yok; 320/%200/fiziksel cihaz açık. |

Kapatılmayan P0'lar değişmedi: gerçek seedless beş günlük UI koşusu, production offline kill, temiz profil restore,
fiziksel cihaz/a11y ve at-rest şifreli kasa tamamlanmadan gerçek çocuk verisiyle saha pilotu `NO-GO`dur.
