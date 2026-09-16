# MaarifOS Mega Master Eleştiri ve Dönüşüm Planı

**Kanonik tarih:** 11 Ağustos 2026

**Ürün:** MaarifOS

**Hedef kullanıcı:** Emine Öğretmen gibi okul öncesi öğretmenleri
**Planın hükmü:** Mevcut ürün güçlü bir mühendislik alfasıdır; henüz profesyonel, tam yıllık ve gerçek çocuk verisiyle pilotsuz kullanılabilecek olgunlukta değildir.

Bu belge tek bir ekranın sadeleştirme listesi değildir. Ürünün öğretmen işi, pedagojik güven,
veri bütünlüğü, belge üretimi, yıllık içerik, premium ticaret, erişilebilirlik, çevrimdışı
çalışma, güvenlik, yayın operasyonu ve MARİF ajan davranışını tek bir dönüşüm programında
birleştirir. Eski `ROADMAP.md` tarihsel bir kayıttır; yeni kararlar için bu belge,
`MARIF_REQUIREMENT_LEDGER.md` ve `STATUS.md` birlikte otoritedir.

---

## 1. Yönetici hükmü

### 1.1 Yeterli mi?

Hayır. Ürünün önemli parçaları vardır ve bazı zincirler teknik olarak güçlüdür; fakat kullanıcı
deneyimi ile ürün olgunluğu bu teknik gücü henüz görünür, anlaşılır ve güvenilir bir öğretmen
ürününe dönüştürmemiştir.

Bugünkü durumun doğru tanımı:

- Plan, gözlem, haftalık/aylık değerlendirme ve belge için ciddi bir domain temeli vardır.
- Gelecek plan düzenleme, append-only değerlendirme, anekdot, Ek 18 ve cihaz bağlı premium gibi
  zor problemler üzerinde anlamlı mühendislik yapılmıştır.
- Ana kullanım hâlâ çok sayıda alt yüzey, uzun sheet, hazırlık kilidi ve teknik durum metni arasında
  dağılmaktadır.
- Boş veya devre dışı eylemler çoğu yerde tıklanabilir görünmektedir. Bu, kullanıcının
  “hiçbir düğme çalışmıyor” hükmünü doğuracak kadar temel bir affordance kusurudur.
- Ekim–Haziran içerikleri gerçek değildir; yalnız Eylül içeriği hazırdır. Ürün bütün yıl varmış gibi
  konumlandırılamaz.
- Gerçek ücretli satın alma, makbuz, yenileme, iptal ve cihaz taşıma zinciri yoktur.
- Cihaz içi ana veri deposu şifreli değildir. Bu kapanmadan gerçek çocuk verili pilot `NO-GO`dur.
- MARİF ajan sözleşmesi vardır; fakat repo kökünden gerçek native çağrı ve kalıcı kalite döngüsü henüz
  kanıtlanmamıştır.
- `Prototype.tsx` ve tek parça CSS, değişiklik hızını ve regresyon güvenini artık doğrudan sınırlayan
  mimari borçtur.

### 1.2 Ana ürün hedefi

MaarifOS’un değeri “çok form” veya “çok rapor” değildir. Değer şudur:

> Öğretmen bir bilgiyi bir kez kaydeder; aynı kanıt planı uygulamaya, değerlendirmeyi sonraki plana,
> resmi belgeyi kalıcı kayda bağlar. Sistem öğretmeni çocuktan koparmaz, öğretmenin yerine pedagojik
> hüküm vermez ve veri kaybetmez.

### 1.3 Kuzey yıldızı akış

`Hazırla → Planla → Uygula → Gözle → Bağla → Değerlendir → Sonraki kararı ver → Belgele → Yedekle/geri yükle`

Bu akışta aynı `academicYearId / classroomId / planId / activityId / observationId /
curriculumLinkId / evaluationId / documentManifestId` izi kopmadan korunmalıdır.

### 1.4 Kod ve kanıt anlık görüntüsü

| Kanıt | 11 Ağustos 2026 durumu | Eleştirel anlamı |
|---|---:|---|
| `Prototype.tsx` | 10.739 satır | UI, navigation, persistence ve use-case orkestrasyonu fazla merkezileşmiş. Yeni workbench'ler ayrı lazy feature olsa da bağlama callbackleri monoliti büyütüyor. |
| `prototype.css` | 9.207 satır | Tasarım tokenı ve feature izolasyonu yetersiz; onboarding CSS'i ayrılsa da görsel drift riski yüksek. |
| Premium Plan Merkezi | 2.009 satır | Plan, değerlendirme, içerik ve lisans yüzeyi tek bileşende ağırlaşıyor. |
| Bugün ekranı | 771 satır | Temiz cihaz durumu ayrı onboarding bileşenine devredildi; üst orkestratörle bağ yine mimari sınır yaratıyor. |
| Sınıfım ekranı | 518 satır | Görev merkezi yönü doğru; yoğun sınıf ve erişilebilirlik kabulü tamamlanmamış. |
| Son yerel ana JS | 709.933 bayt | Plan akışı, sınıf araçları ve Kurucu Premium paneli lazy ayrıldı; proje denetleyicisinde 19 JS chunk'ının tamamı gzip ≤180 KiB bütçesini geçti. Vite'ın genel ham >500 kB uyarısı sürüyor. |
| Gereksinim defteri | 4 `VERIFIED`, 18 `IMPLEMENTED_UNVERIFIED`, 3 `IN_PROGRESS`, 4 `OPEN` | Kod hacmi yüksek olsa da ürün kanıtının çoğu hâlâ fiziksel cihaz/üretim/pilot kapısında. |

Bu tablo “çok kod = çok ürün” yanılgısını önler. En büyük açık artık yalnız özellik eksikliği değil;
mevcut parçaların kullanıcıya dürüst, hızlı, güvenli ve kesintisiz bir sistem olarak sunulamamasıdır.

### 1.5 Eşanlı yürütme ve yeniden eleştiri kaydı

Bu plan statik bir yapılacaklar listesi değildir. Her geliştirme dalgası aynı anda iki çıktı üretir:

1. çalışan, test edilen ürün değişikliği;
2. değişikliğin ürettiği yeni riskleri de içeren güncel eleştiri kaydı.

11 Ağustos 2026 yerel yürütmesinde ilk yedi dalga şu duruma gelmiştir:

| Dalga | Uygulanan sonuç | Yeniden eleştiride açık kalan ana risk | Hüküm |
|---|---|---|---|
| 1 — Profesyonel ana yüzeyler | Bugün ilk katı, beşli navigasyon, Sınıfım/Kayıt boş ve kilitli durumları gerçek eylemlerle hizalandı. | Fiziksel cihaz, 200% zoom, ekran okuyucu ve kurulum sırası kabulü açık. | `LOCAL_VERIFIED` |
| 2 — Planlar workbench | `/plans` kalıcı route; Yıl/Ay/Hafta/Gün yalnız gerçek çalışma döngüsü kayıtlarından türetiliyor. | Haftalık gün şeridi ve uzun Premium Plan Merkezi bağlamsal ayrıştırması yok; ana bundle büyümeye devam ediyor. | `LOCAL_VERIFIED` |
| 3 — Belgeler workbench | `/documents` kalıcı route; dört belge grubu hazır/işlem/başlangıç ve kaynak zinciriyle ayrıldı. | Kalıcı çıktı manifesti, stale tespiti, sürümlü geçmiş ve bağımsız belge ayrıntı route'ları yok. | `LOCAL_VERIFIED` |
| 4 — Temiz cihaz başlangıç planı | Sınıf → çocuk → plan → şifreli yedek sırası gerçek kalıcı kayıtlardan türetilen 0/4 ilerlemeyle Bugün'ün tek ana işi oldu. | Fiziksel öğretmen süresi, temiz cihaz kurtarma, tam ekran okuyucu/200% zoom ve uzun modalın gerçek adımlara ayrılması açık. | `LOCAL_VERIFIED` |
| 5 — Sınıf ve resmî dönem geçişi | Dönem → Program → Düzen alt adımları, eski yılı arşivleyip öğrencileri açık onayla yeni yıla taşıyor; tehlikeli cihaz silme günlük akıştan çıkarıldı. | Resmî takvim kaynak sürümü, fiziksel öğretmen süresi ve dönem geçişinde gerçek veri kabulü açık. | `LOCAL_VERIFIED` |
| 6 — Kurtarma sağlığı | Mevcut kriptografik `BackupManifest` üzerine, exact şifreli dosya/payload karması ve aynı dosyayla restore tatbikatını ayıran sürümlü yerel sağlık makbuzu eklendi. | Temiz fiziksel cihaz, dosyayı bulma, cihaz kaybı ve off-device saklama kabulü açık. | `LOCAL_VERIFIED` |
| 7 — Öğretmen günü kapanışı | Günün yoklama, günlük plan, etkinlik ve bekleyen program bağı kanıtını aynı sınıf/tarih kapsamında özetleyen; eksik işi sessiz tamamlamayan, yarına not isteyen ve sonradan değişen kanıtta `stale` olan append-only kapanış domain'i, Bugün kartı ve mobil sheet'i tamamlandı. Sıfır gözlem tek başına eksik sayılmıyor. | 390×844 canlı IAB'de eksik durum → notla taşıma → yeniden açma → yoklamayı düzeltme → otomatik `stale` zinciri; backup exact round-trip/tamper reddi ve otomatik kalite kapıları geçti. Fiziksel öğretmen süresi, 320×568/200%, VoiceOver/TalkBack, geç kapanış ve biriken not yaşam döngüsü açık. | `LOCAL_VERIFIED` |

Ayrıntılı önce/sonra bulguları, kabul edilen ekranları ve her dalganın ürettiği yeni açıkları
`MARIFOS_CONTINUOUS_CRITIQUE_LOG_2026-08-11.md` taşır. Buradaki `LOCAL_VERIFIED`, üretim veya fiziksel öğretmen
kabulü değildir.

---

## 2. Tanısal olgunluk puanı

Bu puanlar istatistiksel kullanıcı araştırması sonucu değildir; mevcut kod, test, belge, canlı/yerel
ekran ve açık gereksinimlerden türetilmiş yönlendirici ürün tanısıdır.

| Boyut | 5 üzerinden | Hüküm |
|---|---:|---|
| Günlük öğretmen faydası | 2.5 | Temel işler var; ilk ekran ve kilitler ana işi geciktiriyor. |
| Plan sürekliliği | 2.5 | Eylül zinciri güçlü; tam yıl ve tek çalışma tezgâhı yok. |
| Gözlem ve kanıt bütünlüğü | 3.0 | Domain güçlü; hız, bağlam seçimi ve gerçek kullanıcı süresi açık. |
| Değerlendirme kalitesi | 3.0 | Çoklu kanıt ve üç boyutlu aylık kayıt var; dönemsel gelişim zinciri eksik. |
| Belge merkezi | 2.5 | Plan/Ek 18/anekdot çıktı temeli var; hazır olma ve genel belgeler eksik. |
| İlk kurulum ve boş durumlar | 3.0 | Dört gerçek adımlı sıra, güvenli dönem geçişi ve kilit nedenleri var; fiziksel öğretmen süresi ve temiz cihaz kabulü açık. |
| Görsel profesyonellik | 2.5 | Temiz cihaz ilk katı belirgin biçimde iyileşti; uzun sheet'ler, yoğun üretim durumları ve tutarsız teknik kopyalar sürüyor. |
| Erişilebilirlik | 2.0 | ARIA çalışmaları var; gerçek WCAG 2.2, VoiceOver/TalkBack/200% kapısı yok. |
| Çevrimdışı ve kurtarma | 3.5 | SW/backup temeli ile exact dosya sağlık makbuzu ve aynı-digest restore tatbikatı var; fiziksel temiz cihaz/felaket kurtarma kanıtı eksik. |
| Gizlilik ve veri güvenliği | 1.5 | Fail-closed bazı sınırlar var; at-rest şifreleme olmadan gerçek veri pilotu olmaz. |
| Premium içerik olgunluğu | 1.5 | Eylül gerçek, kalan dokuz ay yayınlanmamış. |
| Ticari ürün | 0.5 | Yetki modeli var; gerçek ödeme yaşam döngüsü yok. |
| Mimari sürdürülebilirlik | 1.5 | Domain modülleri gelişiyor; 10 bin satırlık orkestratör ve 9 bin satırlık CSS sınır oldu. |
| MARİF ajan olgunluğu | 1.5 | Sözleşme/ledger var; gerçek çağrılabilir otonom kalite döngüsü kanıtı yok. |
| Üretim/pilot hazırlığı | 1.5 | Otomatik test hacmi iyi; gerçek öğretmen ve gerçek veri kapıları açık. |

**Toplam ürün sınıfı:** kontrollü teknik alfa. “Profesyonel öğretmen işletim sistemi” iddiası için
önce aşağıdaki P0/P1 kapıları kapanmalıdır.

---

## 3. Kanıtla doğrulanan ekran eleştirisi

11 Ağustos 2026 tarihli 390×844 yerel mobil denetimde altı ana durum incelendi.

### 3.1 Bugün — üst görünüm

- Hazırlık uyarısı, büyük başlık ve “Şimdi” alanı ilk ekranın çoğunu tüketiyor.
- Yeni öğretmen çalışma döngüsü doğru yönde olsa da ilk katın altında kalıyor.
- Devre dışı satırlarda chevron kullanımı, tıklanabilirlik algısını sürdürüyor.
- Aynı hazırlık uyarısı farklı ana yüzeylerde yineleniyor; kullanıcı göreve değil sisteme bakıyor.

**Karar:** İlk mobil kat yalnız üç şeyi yanıtlamalıdır: “Şimdi ne yapacağım?”, “hangi iş eksik?”,
“sıradaki plan ne?”. Teknik durum ve hazırlık ayrıntısı ikinci kat olmalıdır.

### 3.2 Öğretmen çalışma döngüsü

- `Planla → Uygula → Gözle → Değerlendir → Belgele` modeli ürünün doğru omurgasıdır.
- Tarihler ham ISO biçimindedir; öğretmen dili değildir.
- “Canlı cihaz kayıtları” gibi teknik kopya öğretmen zihinsel modeline ait değildir.
- Renk farkları soluktur; kontrast yalnız görsel bakışla değil ölçümle doğrulanmalıdır.
- Döngü kartları bilgi verir, fakat her kartın tek “sonraki doğru eylemi” daha belirgin olmalıdır.

### 3.3 Sınıfım

- Görev merkezi yaklaşımı doğru ve önceki çocuk listesine göre daha profesyoneldir.
- Boş durumda `İlk çocuğu ekle` ve `Çocuk ekle` aynı işi yineler.
- Sıfır çocuk varken `Gözlem dökümü` eyleminin görünmesi anlamlı değildir.
- İki küçük üst durum kartı dar ekranda fazla sıkışıktır.
- Temiz cihazda sınıf, çocuk, plan ve yedek sırasını gösteren ilerleme merkezi artık vardır; buna karşın
  mevcut uzun sınıf formu henüz gerçek çok-adımlı akışa bölünmemiştir ve tamamlanan kurulum geçmişi görünmez.

### 3.4 Kayıt Ekle

- Gözlem, yoklama ve etkinlik satırları kilitliyken görsel olarak etkin beyaz kart ve chevron taşır.
- Kullanıcı bunun kilit olduğunu ancak dokunmaya çalışınca veya küçük açıklamayı okuyunca anlar.
- Her satırın engel nedeni aynı görünürlükte değildir.
- Merkezi eylem fikri doğru; ancak “hızlı eylem” yüzeyi gerçekten hızlı değildir.

**P1 hüküm:** Devre dışı eylem; düşük kontrastlı ikon, kilit işareti, chevron kaldırma, kısa neden ve
doğrudan “eksik adımı tamamla” bağlantısıyla görünmelidir.

### 3.5 Belgeler

- Plan ve değerlendirme belgelerinin tek yüzeyde toplanması doğru yöndedir.
- `Yıllık omurga kayıtlı`, `0 günlük plan`, `aylık değerlendirme yok` durumları varken export CTA'ları
  hazırmış gibi görünmektedir.
- Belge başına “hazır / eksik / eski / yeniden üretilebilir” durumu yoktur.
- Sürüm, oluşturulma zamanı, kaynak aralığı, imza/manifest ve geçmiş indirme görünümü yoktur.
- Uzun sheet, belge arama/filtreleme olmadan büyümeye devam edemez.

### 3.6 Planlar

- Büyük yeşil “Günlük plan oluştur” eylemi kilitliyken etkin görünmektedir. Bu ana güven kusurudur.
- `Bugünün planı` başlıklı sheet içinde yıllık plan kütüphanesi ve eğitim takvimi bulunması bilgi
  mimarisi çelişkisidir.
- Boş durum plan olmadığını söyler fakat öğretmenin ilk doğru adımını tek CTA ile çözmez.
- Plan kütüphanesi, takvim ve günlük editör tek çalışma tezgâhı gibi davranmıyor.

---

## 4. Dünya örneklerinden alınacak ve alınmayacak dersler

### 4.1 Pedagojik döngü

ACECQA, gözlem–analiz–plan–uygulama–değerlendirme döngüsünü ve her adımda eleştirel yansıtmayı
vurgular. Tek bir zorunlu belge şablonu veya kayıt kotası dayatmaz. MaarifOS bu esnekliği almalı;
öğretmeni form kotasına sokmamalıdır.

### 4.2 Öğretmeni çocuktan koparmama

İngiltere DfE rehberi, biçimlendirici değerlendirmenin öğretmeni çocukla etkileşimden uzun süre
ayırmaması gerektiğini vurgular. Hızlı gözlem için hedef yalnız teknik başarı değil, gerçek öğretmen
süresidir.

### 4.3 Sürekli ve çoklu kanıt

Head Start değerlendirmeyi zaman içindeki sürekli süreç olarak tanımlar; gözlem bunun parçasıdır.
NAEYC, etik, gelişimsel, kültürel ve dilsel olarak uygun çoklu kanıtı öne çıkarır. MaarifOS tek
gözlemden tanı, kesin gelişim etiketi veya yüksek riskli otomatik karar üretmemelidir.

### 4.4 Bir kez gir, çok yerde kullan

Brightwheel plan içinden gözlem başlatır; Storypark plan ve öğrenme hikâyelerini ilişkilendirir.
MaarifOS bunu daha sıkı yapmalıdır: plan bağlamı, tarih, çocuk ve etkinlik gözleme otomatik gelir;
öğretmen aynı bilgiyi tekrar yazmaz.

### 4.5 Portfolyo ve öğrenme hikâyesi

Te Whāriki portfolyolarda açıklamalı fotoğraf, çocuk ürünü, konuşma dökümü, gözlem ve öğrenme
hikâyesi gibi farklı kanıtları; `notice → recognise → respond → record → revisit` sürekliliğini
önerir. MaarifOS portfolyoyu otomatik veri yığınına değil, öğretmen/çocuk seçimine dayalı anlamlı
kanıt derlemesine dönüştürmelidir.

### 4.6 Alınmaması gerekenler

- Gözlem kotası ve “checkpoint doldurma” baskısı.
- Her kaydı aynı uzun forma zorlayan şablonculuk.
- Aile paylaşımını varsayılan açık hale getirmek.
- Tek olaydan gelişim puanı veya tanı üretmek.
- Çocuk verisini reklam/analitik amacıyla üçüncü taraflara taşımak.
- Çevrimdışı eski kaydın yeni kaydı sessizce ezmesi.

### 4.7 Gün sonu ritüeli için güncel karşılaştırmalı hüküm

Gün sonu kapanışı bir “öğretmen performans puanı” veya “bugün mutlaka gözlem girdin mi?” kontrolü değildir.
[ACECQA](https://www.acecqa.gov.au/latest-news/blog/documenting-assessment-and-planning-cycle), dokümantasyon için tek
şablon, zorunlu miktar veya süre dayatılmadığını ve bağlama uygun mesleki muhakemeyi açıkça vurgular.
[İngiltere DfE](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/send-assessment/carrying-out-an-assessment),
biçimlendirici değerlendirme için yazılı kayıt zorunluluğu olmadığını ve gözlem/değerlendirmenin çocukla etkileşimden
uzun süre ayırmaması gerektiğini belirtir. Bu nedenle MaarifOS:

- sıfır gözlemi otomatik kusur saymamalı ve kayıt kotası üretmemeli;
- öğretmenin gün içinde zaten girdiği yoklama, plan, etkinlik ve program bağını yeniden istememeli;
- eksikleri “tamamlandı” diye yeşile boyamamalı; açık öğretmen notuyla yarına taşımalı;
- kapanıştan sonra kanıt değişirse eski hükmü güncelmiş gibi sunmamalı;
- kapanışı, pedagojik değerlendirmeden ayrı bir operasyonel devir teslim kaydı olarak tutmalıdır.

[W3C WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) özellikle `Redundant Entry`,
`Focus Not Obscured` ve en az 24×24 CSS piksel hedef kriterlerini ekler. Gün sonu sheet'i bu nedenle daha önce
girilmiş bilgiyi tekrar yazdırmamalı, ekran klavyesinin ardında odak/CTA bırakmamalı ve tüm eksik-göreve git
eylemlerini dokunulabilir hedeflerle sunmalıdır. Kurtarma tarafında [NIST'in backup rehberleri](https://csrc.nist.gov/pubs/other/2020/04/24/protecting-data-from-ransomware-and-other-data-los/final)
backup dosyalarını oluşturmanın yanında koruma ve test etmeyi de önerir; kapanış kayıtlarının gerçekten korunmuş
sayılması için şifreli backup → restore → aynı kapanış/evidence grafı karşılaştırması gerekir.

### 4.8 Dalga 7 mega yeniden eleştiri: “kapatmak” hangi riski doğurur?

| Risk alanı | Eleştirel hüküm | Kodda görülen koruma | Hâlâ gerekli kabul kapısı |
|---|---|---|---|
| Sahte/cebri gözlem baskısı | “Günü kapatmak için gözlem gir” kuralı öğretmeni kanıt uydurmaya ve çocuktan kopmaya iter. | `observationCount` görünür evidence'dır; sıfır olması issue üretmez. Yalnız gerçekten var olan fakat program bağı bekleyen gözlem açık iş olur. | 20 okul günü boyunca gözlem sayısı ile kapanış başarısını KPI'a çevirmeme; öğretmen görüşmesinde “sistem beni kayıt girmeye zorladı mı?” sorusu. |
| Sessiz eksik kapanış | Eksik yoklama/plan/etkinlik/program bağı varken yeşil “tamamlandı” veri doğruluğunu bozar. | Eksiklerde durum `carried-forward`; en az 10 karakterlik öğretmen notu olmadan kayıt reddedilir. | Renk dışında ikon+metin; ekran okuyucuda durum; notun boş/genel/geçersiz sınırları ve yanlışlıkla çift dokunma testi. |
| Eski (`stale`) kapanış | Kapanıştan sonra yoklama, etkinlik veya program bağı değişirse eski sonuç artık doğru değildir. | Evidence eşitliği ve ilgili kayıtların `updatedAt > closedAt` kontrolü `stale` üretir; yeni kayıt öncekinin üstüne yazılmaz. | Gece yarısı, offline sıra, silme/tombstone, saat kayması ve restore edilmiş eski kaydın stale hesabı; UI'da “yeniden kontrol et” tekincil değil birincil eylem. |
| Yarına taşıma yükü | Her gün devreden notlar çözümsüz görev çöplüğüne dönüşebilir; eski notun görünmesi çözülmediği anlamına gelmeyebilir. | En son önceki `carried-forward` not görünümü tasarlanmıştır. | Not için `açık/çözüldü/ertelendi` yaşam döngüsü, kaynak issue kimliği, yaş rozeti ve en fazla üç görünür öncelik; aynı notun günlerce kopyalanmasını önleme. |
| Öğretmen zaman bütçesi | “60 saniye” yalnız pazarlama iddiası olarak kalırsa yeni bir form yükü doğar. | Sayaçlar mevcut kayıtlardan türetilir; aynı bilgi yeniden girilmez. | 10 öğretmen × 5 gün: medyan ≤60 sn, p90 ≤90 sn; eksiksiz günde en çok 1 karar, eksikli günde en çok 1 not+1 karar; geri dönüş/yanlış dokunma kaydı. |
| Erişilebilirlik | Alt sheet, sticky CTA ve klavye; odak, ekran okuyucu ve dar ekran kullanımını bozabilir. | Domain bu riski çözmez. | 320×568 ve 390×844; 200% zoom; klavye-only; VoiceOver/TalkBack; focus trap/return; WCAG 2.2 2.4.11, 2.5.8 ve 3.3.7. |
| Offline ve çoklu yazım | Çevrimdışı kapanış ile sonradan gelen daha yeni kayıt sıraya göre yanlış “kapalı” görünebilir. | Tek transaction ve append-only kayıt temel koruma sağlar. | Offline kill/reload, iki sekme/iki cihaz çatışması, idempotent aynı tekrar, farklı evidence ile yeni revizyon ve deterministik sıralama testi. |
| Backup/restore bütünlüğü | UI'da kapanış görünmesi, felaket sonrası geri geleceğini kanıtlamaz. | Kapanış strict setting şemasına ve scope'a bağlanmıştır; backup şema entegrasyonu kodlanmıştır. | Şifreli export → temiz store replace restore → closure/evidence/issue/note/kimlik exact karşılaştırması; tahrif edilmiş evidence ve scope fail-closed. |
| Geç kapanış | Öğretmen telefonu kapanırsa ertesi sabah dünü kapatamaz; yalnız bugün kuralı işi kilitleyebilir. | Yazım yalnız açık İstanbul takvim gününe izin verir; yanlış güne sessiz yazmayı önler. | Yetkili “dünü kapat” akışı: en fazla tanımlı pencere, gerçek `civilDate`, ayrı `closedAt`, açık “geç kapatıldı” izi; şimdilik `OPEN`. |
| Pedagojik sınır | Operasyonel kapanış “çocuk değerlendirildi” anlamına gelemez. | Kanıt sayıları tutulur; otomatik gelişim hükmü yoktur. | UI kopyasında “günlük iş kontrolü” ile haftalık/aylık pedagojik değerlendirme ayrımı; analitiklerde kapanış oranını öğretmen/çocuk performans puanına dönüştürmeme. |

**Hüküm:** Dalga 7'nin domain yaklaşımı, sahte gözlem kotası ve sessiz yeşil tamamlama risklerine karşı doğru
korumaları kodlamış; domain negatif testleri, gerçek 390×844 arayüz zinciri ve backup/restore round-trip'i yerelde
doğrulanmıştır. Bu nedenle hüküm `LOCAL_VERIFIED`dır; production veya fiziksel öğretmen başarısı değildir. `VERIFIED`
olması için Emine Öğretmen zaman/erişilebilirlik kabulü, 320×568 ve 200% zoom, VoiceOver/TalkBack, offline kill/retry,
geç kapanış politikası ve çok günlük carry-forward yaşam döngüsü birlikte kapanmalıdır.

### 4.9 Dalga 8 mega yeniden eleştiri: ana ekranı sıkıştırmak yetmez

Dalga 8, önceki iyileştirmeyi yeniden eleştirdi ve dört dar-kapsam yanılgısını kapattı:

| Yeniden bulunan risk | Uygulanan sistem kararı | Dürüst kalan sınır |
|---|---|---|
| Sınıf oluşturulunca 0/4 kurulum merkezi ilk mobil görünümü işgal ediyordu. | Temiz cihazda dört adımlı rehber korunuyor; herhangi bir sınıf oluşunca merkez tek sıradaki işi gösteren kompakt karta dönüşüyor. 390×844'te `Şimdi`, devam ve plan başlangıcı ilk görünümde. | Eski/uygunsuz resmî dönemde `0/4` ifadesi “sınıfım silindi” algısı yaratabilir; fiziksel öğretmen dili testi gerekir. |
| Tek plan veya eski yedek zamanı “hazır” sayılabiliyordu. | Plan hazırlığı yalnız doğrulanmış Yıl→Ay→Hafta→Gün zinciriyle; kurtarma yalnız geçerli v2 bütünlük makbuzu + exact dosya restore tatbikatıyla tamamlanıyor. | Makbuzun presentation katmanına doğrudan enjekte edilmesi ileride controller refactor'ında yapılmalı. |
| Gün kapanışının sayaç/timestamp eşitliği semantik değişikliği kaçırabiliyordu; ham fingerprint kişisel metni çoğaltabilirdi. | Minimal kanonik projeksiyon sabit `sha256:<64hex>` özetiyle korunuyor. Aynı sayaç ve eski timestamp ile anlam değişimi `stale`; ham not/devamsızlık nedeni kapanış kaydına kopyalanmıyor. | Homegrown senkron SHA-256 yalnız transaction-safety gerekçesiyle kullanılıyor; known-vector testi kalıcı release kapısıdır. |
| Yarına taşınan not çözülse de hayalet görev olabiliyor veya geleceğe ertelense de bugünün önceliğinde kalabiliyordu. | Tek `sourceIssueId` altında occurrence zinciri; append-only `open/deferred/resolved/reopened`; vade öncesi erteleme ana öncelikten düşer; son beş çözülmüş zincir geri açılabilir. | Azami erteleme ufku ve geç kapanış grace-window politikası henüz kanonik değildir. |
| Öğretmenin kendi planı ve temel belgesi premium kapıya düşebiliyordu. | Cihazdaki öğretmen plan zinciri ayrı `Plan zincirim` ekranında entitlement'sız okunur ve temel PDF/DOCX üretir; sağlayıcı şablon/içeriği ayrı premium kapıda kalır. | Yıllık/aylık/haftalık serbest düzenleme domaini henüz yoktur; read-only sınır dürüstçe gösterilir, sahte editör üretilmez. |
| Aynı gün iki günlük plan varsa ilk başlık ile birleşik etkinlik sayıları sahte tamamlanma üretiyordu. | Read-model `conflict` üretir; hiçbir planı authoritative seçmez, sayaçları sıfırlar ve incelemeye yönlendirir. | Çakışmayı çözme/merge politikası ayrı ürün kararıdır; sessiz otomatik seçim yasaktır. |

**Dalga 8 hükmü:** ana ekran ilk bakışta daha profesyoneldir; fakat “dünyanın en iyi uygulaması” hükmü hâlâ
verilemez. Açık en yüksek risk cihazdaki açık metin IndexedDB'dir (`MM-060`). Ardından fiziksel öğretmen
kullanılabilirliği, temel Yıl/Ay/Hafta düzenleme domaini, geç kapanış politikası, çakışma çözümü, 200% zoom ve
VoiceOver/TalkBack gelir. Dalga 8 bu riskleri gizlemez; her birini ölçülebilir yayın kapısında tutar.

Dalga 8 birleşik kanıtı: feature/migration 520/520, setup+carry gerçek mobil akış 2/2 ve 409,1 saniyelik kesintisiz
`quality:gate` geçmiştir. Lisans API 15/15, browser smoke 10/10, Sites 26/26 ve production PWA/offline 4/4'tür.
İlk kalite turunda yakalanan yaklaşık 5 KiB gzip bütçe aşımı eşik artırılarak gizlenmemiş; Today/yoklama yüzeyleri
lazy chunk'lara ayrılmış ve ana JS gzip ölçümü 176,4 KiB ile 180 KiB sınırının altına indirilmiştir.

---

## 5. Mega eleştiri ve çözüm matrisi

Öncelik tanımı:

- `P0`: veri güvenliği, kalıcı veri kaybı, yanlış pedagojik hüküm veya pilot/yayın engeli.
- `P1`: ana öğretmen işini ciddi biçimde bozan, ürünü profesyonel olmaktan çıkaran sorun.
- `P2`: verimlilik, ölçeklenebilirlik veya kalite iyileştirmesi.
- `P3`: ileri aşama farklılaştırma.

### A. Ürün vaadi, kapsam ve bilgi mimarisi

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-001 | P0 | Ürün, teknik olarak var olan özelliklerle gerçek kullanıcıya hazır yeteneği ayırmıyor. | Her yetenek için `taslak / yerel doğrulandı / fiziksel cihaz doğrulandı / üretimde` durum sözleşmesi. | UI, STATUS ve ledger aynı durumu gösterir; drift testi geçer. |
| MM-002 | P1 | Ana görevler sheet ve menüler arasında parçalıdır. | Beş ana hedef korunur; her hedef tek iş alanı olur: Bugün, Sınıfım, Kayıt, Planlar, Belgeler. | Her temel iş en çok iki dokunuş; rota E2E matrisi. |
| MM-003 | P1 | `Bugünün planı` yüzeyi yıllık kütüphane ve takvimi aynı başlıkta taşır. | `Planlar` kalıcı workbench: Yıl/Ay/Hafta/Gün + Takvim + Değerlendirme sekmeleri. | Kullanıcı testinde 5 öğretmenden 4'ü gelecek planı yardımsız bulur. |
| MM-004 | P1 | Hazırlık durumu farklı ekranlarda yinelenerek görevi bastırır. | Tek global hazırlık durumu + bağlama özel kısa neden. | Aynı uyarı bir ekranda en fazla bir kez; snapshot testi. |
| MM-005 | P2 | Teknik kopyalar öğretmen diline sızıyor. | Kopya sözlüğü: cihaz kaydı→kaydedilen çalışma, projection→görünüm vb. | Yasaklı teknik terim linti; öğretmen dili incelemesi. |
| MM-006 | P2 | Eski roadmap, status ve yeni ledger arasında otorite belirsizdir. | Belge otorite sırası ve otomatik link/drift denetimi. | Tek release hükmü; çelişkili durum kalmaz. |

### B. İlk kurulum, boş durum ve rehberli başlangıç

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-007 | P1 | Yeni öğretmen boş ekranda hangi sırayla başlayacağını bilmiyordu. | Uygulandı: eğitim yılı+sınıf → çocuklar → ilk plan → şifreli yedek; durum yalnız kalıcı kayıtlardan türetilir. Önceki eğitim yılı yeni plan zincirini hazır saymaz; sınıf formu Dönem → Program → Düzen alt adımlarına ayrıldı. | Yerel 390×844 akışta eski dönem 0/4'e düştü; güvenli dönem geçişi, 3 çocuk taşıma, Eylül+yıllık plan kurulumu, şifreli yedek üretme/doğrulama, 4/4 kapanış ve reload kalıcılığı geçti. Otomatik browser exact indirilen dosyayı yeniden seçip restore+reload yaptı; fiziksel öğretmen, temiz cihaz ve yardımcı teknoloji kabulü hâlâ gerekir. |
| MM-008 | P1 | Boş durumlarda yinelenen CTA'lar var. | Her yüzeyde tek birincil CTA, bir ikincil açıklama. | Zero-state görsel regresyon; yinelenen hedef yok. |
| MM-009 | P1 | Kilitli eylem etkin görünüyor. | Kilit görseli, chevron yok, açık neden, eksik adımı tamamlama CTA'sı. | 390×844 ve 200% zoom’da kilit/etkin ayrımı %100 doğru. |
| MM-010 | P1 | Hazırlık modu gerçek günlük çalışmayı gereğinden fazla kapatabilir. | Gelecek plan hazırlığı ile mevcut yıl yazma sınırını ayrı kural olarak göster. | Sınır tarihleri, gece yarısı, offline ve clock-skew testleri. |
| MM-011 | P2 | İlk kurulumda örnek veri ile gerçek veri sınırı belirsiz olabilir. | Açık “örnek sınıf” sandbox; tek işlemle temizle; üretim verisine karışmaz. | Örnek veri manifesti ve temizleme testi. |

### C. Bugün — profesyonel kontrol merkezi

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-012 | P1 | İlk mobil kat fazla yüksek; çalışma döngüsü aşağıda kalıyordu. | **Yerelde uygulandı:** temiz cihaz rehberi korunur; sınıf oluşunca kurulum tek eylemli kompakt karta döner ve `Şimdi` öne gelir. | 320×568 ve 390×844 taşmasız; 390×844'te `Şimdi`, devam ve plan başlangıcı ilk görünümde; fiziksel öğretmen/200% açık. |
| MM-013 | P1 | Birden çok kart aynı öncelikte görünür. | Tek önerilen sonraki eylem; diğerleri ikincil durum. | Aynı anda birden fazla primary CTA yok. |
| MM-014 | P1 | Devre dışı Today satırları chevron taşıyor. | Disabled satır navigasyon affordance'ını kaldırır. | Pointer/keyboard testinde çağrı yok; görsel açık. |
| MM-015 | P2 | Ham ISO tarih öğretmen dostu değil. | `7–11 Eylül 2026`, `Bugün`, `Yarın`, hafta etiketi. | tr-TR tarih snapshotları ve timezone testi. |
| MM-016 | P1 | Gün sonu kapanış ritüeli yoktu; ham bir checkbox ise sahte gözlem, sessiz eksik, eski kapanış ve hayalet devir işi riski yaratır. | **Yerelde doğrulandı:** exact sınıf/tarih kapsamı, sıfır gözlem kotası olmadan append-only kapanış, minimal semantik SHA-256, `stale`, tek `sourceIssueId` occurrence zinciri ve `open/deferred/resolved/reopened` yaşam döngüsü. | Domain 16/16 + migration 514/514 + backup replace-restore/tamper 1/1 geçti. Kalan kapı: UI yaşam döngüsü, 10 öğretmen×5 gün süre, geç kapanış politikası, offline/iki sekme ve fiziksel yardımcı teknoloji. |

### D. Sınıfım, yoklama ve çocuk odaklı iş

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-017 | P1 | Sıfır çocukta anlamsız gözlem/döküm eylemleri görünüyor. | Veri yoksa bağlama uygun tek kurulum CTA'sı. | 0/1/20/40 çocuk state matrisi. |
| MM-018 | P1 | Yoklama, kapsama açığı ve değerlendirme kuyruğu ayrı zihinsel işlerdir. | Öncelik sıralı sınıf görev kuyruğu; her görev exact veriden türetilir. | Yoklama tamamlanınca sıradaki iş deterministik değişir. |
| MM-019 | P1 | Yoğun sınıfta çocuk listesi uzun ve eylem kalabalığı yaratır. | Arama, filtre, son gözlem, kanıt açığı; toplu seçim progressive disclosure. | 40 çocukta 60 fps scroll ve <2 sn bulma. |
| MM-020 | P2 | Kayıt/arşiv tarihçesi net değil. | Enrollment dönemleri ve değerlendirme-anı kadro snapshot'ı. | Sonradan gelen/ayrılan çocuk geçmişi bozmaz. |
| MM-021 | P2 | Çocuk dosyası kanıt durumunu özetlemiyor. | Zaman çizgisi: ham gözlem, onaylı bağ, değerlendirme, belge, portfolyo. | Her kart kaynak kimliğine geri izlenebilir. |

### E. Planlama — yıl, ay, hafta, gün

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-022 | P0 | Ürün bütün yıl izlenimi veriyor ama yalnız Eylül gerçek içerik. | Ekim–Haziran `Henüz yayımlanmadı`; sahte içerik ve grant yok. | İmzalı 10 aylık release-set; null ay negatif testleri. |
| MM-023 | P1 | Plan katmanları tek workbench değil. | Yıllık omurga→ay→hafta→gün drill-down ve breadcrumb. | Her katmandan geri dönüş kimliği/tarih korunur. |
| MM-024 | P1 | Kilitli “Günlük plan oluştur” etkin görünüyor. | Button gerçekten disabled, kilit nedeni ve çözüm eylemi. | Görsel + DOM + click test üçü birlikte geçer. |
| MM-025 | P1 | Haftalık karar ve aylık öneri görünür ama plan taslağında karşılaştırma zayıf. | `Önceki karar / önerilen değişiklik / öğretmen kararı` üçlü görünüm. | Sessiz otomatik uygulama yok; kabul/ret audit kaydı. |
| MM-026 | P1 | 24 pedagojik lens seçiliyor ama çıktıyı değiştirmiyor. | Her lens yalnız ölçülebilir plan kararı üretiyorsa gösterilir. | Snapshotta çevre, soru, materyal veya öğretmen rolü değişir. |
| MM-027 | P1 | Gelecek planı bulma var; seri plan üretimi ve hafta düzeni zayıf. | Haftalık toplu taslak, kopyala/uyarla, çakışma görünümü. | Beş günlük hafta <10 dk; kimlik/provenance korunur. |
| MM-028 | P2 | Plan hazır olma durumu belge hazır olma ile ayrışıyor. | Plan için `taslak / uygulanabilir / uygulandı / değerlendirildi / belgelendi`. | Durum yalnız kalıcı kayıtlardan türetilir. |
| MM-029 | P2 | Takvim plan ve kurum olaylarını ayırmıyor. | Plan, tatil, etkinlik, değerlendirme son tarihi katmanları. | Renk+ikon dışında metinsel ayrım; klavye/ekran okuyucu. |

### F. Uygulama, gözlem, anekdot ve program bağı

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-030 | P1 | Hızlı kayıt yüzeyi kilitli/etkin durumları ayırt etmiyor. | Ön koşul özeti + tek dokunuşta eksik adıma gitme. | Sahte aktif kontrol kalmaz. |
| MM-031 | P1 | Gözlem hızının teknik testi insan kullanışlılığını kanıtlamıyor. | Emine Öğretmen zaman testi: medyan ≤25 sn, P95 ≤45 sn. | 20 gerçek görev; hata ve vazgeçme oranı raporu. |
| MM-032 | P1 | Plan bağlı ve plan dışı gözlem zihinsel modeli açık olmalı. | Üstte kalıcı bağlam bannerı; seçilebilir gerçek etkinlik. | Yanlış activity/plan bağlama oranı sıfır. |
| MM-033 | P1 | Çoklu çocuk kaydı veri olarak güçlü, insan akışı henüz ağır olabilir. | “Aynı olay” onayı, hızlı öğrenci arama, seçili sayı, undo. | 3→2 daraltma, reload, backup, belge E2E. |
| MM-034 | P1 | Anekdot formu ile hızlı gözlem ilişkisi kullanıcıya tam açıklanmıyor. | Ham gözlem değişmez; anekdot öğretmen değerlendirmesi ayrı yaşam döngüsü. | UI ham metni değiştiremez; seal tamperi reddedilir. |
| MM-035 | P1 | Program bağı hızlı kayıt sırasında yük olmamalı. | Kaydet sonra bağla; bekleyen bağ görev kuyruğu. | Hızlı kayıt sırasında zorunlu program alanı yok. |
| MM-036 | P1 | Tek olaydan gelişim hükmü riski. | Çoklu gün/hafta/bağ kanıt kapısı ve yetersiz veri dili. | Tek gözlemde kesin gelişim düzeyi üretilemez. |
| MM-037 | P2 | Medya kanıtı domain şemasında, ürün zincirinde değil. | Offline foto/ses ekleme, açık seçim, EXIF/konum temizleme, manifest. | İzin, boyut, silme, restore, export ve gizlilik testleri. |
| MM-038 | P2 | Çocuğun sesi ayrı zorunlu alan olmamalı ama gerektiğinde kaybolmamalı. | Gözlem türü “Çocuk sözü” seçilirse ana metin aynı immutable kanıttır. | Yinelenen alan yok; verbatim korunur. |

### G. Değerlendirme ve sonraki karar

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-039 | P1 | Haftalık değerlendirme tek kanıtla tamamlanabilir algısı yaratmamalı. | Çocuk/gün/plan kapsaması ve eksik kanıt görünümü. | Kapsam matrisi; sıfır uydurma yüzde. |
| MM-040 | P1 | Aylık üç boyut karmaşık ve uzun form riskidir. | Çocuklar, program, öğretmen ayrı progressive disclosure; kanıt yanında. | 390×844, 200% zoom, klavye, yeniden açma. |
| MM-041 | P1 | Değerlendirme ile yüksek riskli tanı/sınıflandırma sınırı görünür değil. | “Pedagojik yansıtma, tanı değildir” dili; öğretmen onayı. | Otomatik tanı/etiket alanı yok; model linti. |
| MM-042 | P1 | Sonraki kararın uygulanıp uygulanmadığı izlenmiyor. | Öneri kuyruğu: bekliyor/kabul/uyarlandı/reddedildi/uygulandı. | Plan kimliğine bağlanan append-only karar geçmişi. |
| MM-043 | P2 | Dönemlik gelişim raporu eksik. | Çoklu aylık kanıt, güçlü yön, ilgi, destek ve öğretmen notu. | Kaynak kimlikli PDF/DOCX; tek olaydan hüküm yok. |
| MM-044 | P2 | Değerlendirme önyargısı görünür değil. | Dil/kültür/bağlam ve karşı-kanıt kontrol soruları. | NAEYC uyumlu öğretmen review checklist. |

### H. Belgeler, dışa aktarma ve portfolyo

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-045 | P1 | Export düğmeleri veri eksikken hazır görünür. | Belge başına readiness ve exact eksik listesi. | Eksikte disabled + neden; tamda gerçek download. |
| MM-046 | P1 | Belgeler uzun tek sheet olarak ölçeklenemez. | Belge merkezi: tür, çocuk, dönem, durum, son üretim filtreleri. | 100 belge fixture'ında hızlı arama. |
| MM-047 | P1 | Belge kaynağı ve sürümü öğretmene görünmüyor. | Kaynak aralığı, üretim zamanı, manifest, revizyon, yeniden üret. | Aynı input aynı manifest; değişiklik yeni revizyon. |
| MM-048 | P1 | Genel gözlem özeti, gelişim raporu ve portfolyo açık. | Aynı kanıt grafından ayrı belge türleri. | PDF/DOCX, reload, offline ve restore E2E. |
| MM-049 | P1 | Raster PDF erişilebilir değildir. | Resmi görsel çoğaltım için dürüst etiket; mümkün belgelerde searchable/tagged PDF. | Metin seçimi, okuma sırası, PDF/UA hedef raporu. |
| MM-050 | P1 | Portfolyo otomatik veri dökümü riski taşır. | Öğretmen/çocuk seçimi, amaç ve açıklama; aile paylaşımı varsayılan kapalı. | Açık onay olmadan export paketine girmez. |
| MM-051 | P2 | Toplu anekdot dışa aktarma yok. | Seçili çocuk/dönem için ayrı immutable anekdot formları + indeks. | İçerik seal, sayfalama, kaynak ID testi. |
| MM-052 | P2 | İndirme sonrası dosya yönetimi yok. | Dosya adı standardı, paylaşım öncesi uyarı, yeniden üretim geçmişi. | Türkçe dosya adı, iOS/Android gerçek indirme. |

### I. Premium, lisans ve ticaret

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-053 | P0 | Premium içerik tam yıl değildir. | İnsan incelemeli Ekim–Haziran aylık paketleri. | Her ay source version, pedagojik sign-off, imza ve rollback. |
| MM-054 | P0 | Gerçek satın alma yaşam döngüsü yok. | Teklif→ödeme→makbuz→entitlement→yenileme→iptal→iade→cihaz taşıma. | Sandbox ve üretim webhook E2E; çift teslim yok. |
| MM-055 | P1 | Kurucu kodu ile ücretli ürün algısı karışabilir. | Kurucu/staff erişimi ayrı yüzey; satın alma politikasına sızmaz. | Purchased default cihaz limiti değişmez. |
| MM-056 | P1 | İki fiziksel telefon kabulü tamamlanmadan erişim güvenilir sayılmaz. | Sercan ve Emine telefonunda aktivasyon, reload, offline, update. | D1 audit + iki fiziksel cihaz + üçüncü generic ret. |
| MM-057 | P1 | Lisans hataları tek genel mesaja indirgenirse kullanıcı çözemez. | Faz, güvenli destek kodu, kontrollü yerel lisans sıfırlama. | PIN/key/thumbprint loglanmaz; her hata recovery testli. |
| MM-058 | P1 | Süresi dolan premium planlarda emek kaybı algısı oluşabilir. | Var olan öğretmen planları salt okunur; yeni premium yazma kapanır. | expired/revoked/refresh-required mutasyon negatif testleri. |
| MM-059 | P2 | Paket güncelleme ve içerik güncelleme aynı algılanıyor. | Uygulama sürümü, içerik paketi, lisans durumu üç ayrı gösterge. | Her biri bağımsız güncellenir ve geri alınır. |

### J. Gizlilik, güvenlik ve hukuk

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-060 | P0 | IndexedDB ana kayıtları cihazda açık metindir. | Şifreli gölge depo, güvenli anahtar yönetimi, migration ve kurtarma. | At-rest tehdit modeli; disk incelemede kişisel veri okunamaz. |
| MM-061 | P0 | Uygulama PIN'i veri şifrelemesi değildir. | UI ayrımı korunur; cihaz anahtarı OS/WebCrypto güven sınırında. | PIN değişimi veriyi bozmaz; yanlış anahtar fail-closed. |
| MM-062 | P0 | Gerçek çocuk pilotu için hukuki/operasyonel temel eksik. | Veri envanteri, saklama süresi, silme, ihlal, veli/kurum süreçleri. | Hukuk danışmanı onayı ve imzalı pilot protokolü. |
| MM-063 | P0 | Backup güçlü parola olsa bile veri yaşam döngüsü tam sınanmamış olabilir. | Şifreli backup, checksum, schema, restore preview, rollback; ayrıca dış şifreli dosya karması ve exact restore tatbikatı sağlık makbuzu. | Yanlış parola/tahrif/eski/yarım restore regresyonları ile exact dosya restore+reload yerelde geçti; process-kill ve fiziksel temiz cihaz açık. |
| MM-064 | P1 | Harici AI dosyası çocuk kimliği sızdırabilir. | Takma ad, tüm sınıf redaksiyonu, şüpheli kimlikte fail-closed. | Case/Unicode/telefon/akraba/akran negatif testleri. |
| MM-065 | P1 | Çocuk verisi analytics/crash loglarına sızabilir. | Allowlist telemetri; içerik ve kimlik yok; cihazda consent/status. | Log/telemetri DLP testi. |
| MM-066 | P1 | Medya konum/cihaz metadata'sı taşıyabilir. | EXIF temizleme, konum yok, explicit medya paylaşımı. | Binary metadata regresyonu. |
| MM-067 | P1 | Veri silme, arşiv ve yasal saklama çatışabilir. | Silme politikası: tombstone, belge/backup etkisi, audit. | Tek çocuk/sınıf/yıl yaşam döngüsü testi. |
| MM-068 | P2 | App Store/Google Play çocuk verisi beyanları hazır değil. | Privacy policy, Data Safety, App Privacy ve hesap silme metinleri. | Store ön kontrol checklist; hukuk sınıflandırması. |

### K. Çevrimdışı, güncelleme, backup ve kurtarma

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-069 | P0 | Yazma başarılı, read refresh başarısız olduğunda mükerrer risk oluşur. | Committed-success + refresh-required ayrımı tüm mutasyonlarda ortak. | Aynı ID ile tekrar yazılmaz; exact ID doğrulama. |
| MM-070 | P0 | Uygulama öldürme ve güç kesintisi gerçek akışta sınanmadı. | Transaction ortasında process kill/fault injection. | Açılışta tutarlı son committed generation. |
| MM-071 | P1 | Offline çakışma tek cihaz bugün sınırlı; gelecekte sync riski büyür. | Version/CAS, conflict ekranı, asla sessiz overwrite yok. | İki sekme/iki cihaz çakışma simülasyonu. |
| MM-072 | P1 | SW güncellemesi işlev var ama öğretmen dili ve zamanlaması kritik. | Ders ortasında zorunlu reload yok; gün sonu güvenli update. | 0.10→sonraki sürüm, IDB korunumu, offline fallback. |
| MM-073 | P1 | Backup yalnız var olmasıyla güvence değildir. | Uygulandı: periyodik hatırlatma, exact encrypted/payload SHA-256 sağlık makbuzu, şema/sürüm, doğrulama zamanı ve aynı-digest test restore. | 30 gün sonra fiziksel temiz cihaz geri yüklenebilirlik ve off-device dosya bulma kanıtı. |
| MM-074 | P2 | Depolama kotası ve düşük disk davranışı görünür değil. | Quota izleme, medya temizliği, export önerisi. | QuotaExceededError ve düşük alan senaryosu. |

### L. Erişilebilirlik ve tasarım sistemi

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-075 | P1 | Görsel etkin/disabled farkı güvenilir değil. | Design token: enabled/pressed/selected/disabled/read-only. | DOM ve görsel durum eşleşir; no false affordance. |
| MM-076 | P1 | Uzun sticky dock ve sheet odakları klavyeyi örtebilir. | WCAG 2.2 focus-not-obscured, safe-area ve keyboard inset. | Android/iOS klavye + 200% zoom. |
| MM-077 | P1 | Dokunma hedefleri ve sıkışık kartlar ölçülmedi. | En az 24×24 CSS px WCAG 2.2 tabanı; ürün hedefi 44×44. | Otomatik target-size audit + cihaz testi. |
| MM-078 | P1 | Renk tek durum taşıyıcısı olabilir. | İkon, metin ve `aria` ile çoklu kodlama. | Gri ton ve renk körlüğü incelemesi. |
| MM-079 | P1 | VoiceOver/TalkBack ana akış kanıtı yok. | Okuma sırası, heading, live region, modal focus trap. | Beş ana akış ekran okuyucuyla tamamlanır. |
| MM-080 | P2 | 9 bin satırlık tek CSS tutarlı sistem üretmiyor. | Token, primitives, layout, feature style katmanları. | Görsel regression ve kullanılmayan CSS bütçesi. |
| MM-081 | P2 | Kapatma düğmesi bazı sheet'lerde içerikten daha baskın. | Tek sheet chrome standardı; tutarlı 44 px close. | Tüm modal/sheet snapshot matrisi. |

### M. Mimari, performans ve kalite

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-082 | P0 | `Prototype.tsx` 10 bin satırı aşarak mutasyon, navigation ve state'i birleştiriyor. | Route/use-case orkestratörlerine kademeli bölme; strangler yaklaşımı. | Hiçbir yeni feature Prototype'a domain yazmaz; boyut sürekli düşer. |
| MM-083 | P1 | Tek parça CSS feature izolasyonunu engelliyor. | Design tokens + feature CSS modules/layers. | Kritik selector çakışması sıfır; bundle ölçümü. |
| MM-084 | P1 | Ana JS >500 kB; ilk açılış maliyeti büyüyor. | Route lazy loading, PDF/DOCX ve premium editör ayrı chunk. | Mobil 4G'de LCP/INP bütçesi; ana JS <350 kB hedefi. |
| MM-085 | P1 | Durum/komut ayrımı her feature'da tutarlı değil. | Command, transaction, read-model, presentation katmanı şablonu. | Yazma sonrası exact committed ID sözleşmesi. |
| MM-086 | P1 | Çok sayıda test var ama gerçek kullanıcı kanıtı dağınık. | Test piramidi + traceability: requirement→test→screenshot→release. | Her P0/P1 için otomatik ve cihaz kanıtı. |
| MM-087 | P1 | STATUS, ledger ve kod drift edebilir. | CI'da capability-state validator ve doküman linti. | Stale “canlı/verified” iddiası build'i durdurur. |
| MM-088 | P2 | Paket/runtime sürüm pinleri tam değildir. | Node/packageManager/engines ve reproducible build. | Temiz makinede lockfile-only build aynı hashleri verir. |
| MM-089 | P2 | Hata gözlemlenebilirliği kullanıcı verisi riski taşır. | Typed error taxonomy + redacted local support bundle. | VKN/TCKN/ad/ham metin logda yok. |

### N. MARİF ajanı, içerik operasyonu ve yönetişim

| ID | P | Eleştiri | Hedef çözüm | Kabul kanıtı |
|---|---|---|---|---|
| MM-090 | P1 | MARİF tanımlı ama native çağrılabilirlik kanıtı yok. | Repo kökünden gerçek `marif` spawn smoke ve görev çıktısı. | Ajan öğretmen rolüyle tüm zinciri denetler. |
| MM-091 | P1 | Son kullanıcı geri bildirimi dar bir patch'e dönüşebiliyor. | Her geri bildirim ledger satırına bağlanır; etkilediği zincir otomatik taranır. | “Bağlam alanını kaldır” değişikliği belge/değerlendirme etkisini de raporlar. |
| MM-092 | P1 | MARİF eleştirisi çözüm kanıtı olmadan tamam sayılabilir. | `Bulgula → riskle → düzelt → test et → gerçek akış → yeniden eleştir`. | Her kapatılan P1 için negatif regresyon. |
| MM-093 | P1 | Yıllık içerik tek kişi/ajan üretimiyle yayımlanamaz. | Pedagoji, MEB kaynak, öğretmen kullanılabilirlik, dil, belge ve güvenlik sign-off. | Altı imzalı rol olmadan paket published olmaz. |
| MM-094 | P1 | MEB kaynakları güncellenebilir; ürün etkisi izlenmiyor. | Source watcher, checksum, semantik diff ve migration kararı. | 2025 ortak metin güncellemesi gibi değişiklik issue üretir. |
| MM-095 | P2 | Mega plan tekrar eskiyebilir. | Aylık ürün konseyi: ledger, saha kanıtı, P0/P1, içerik ve metrik review. | Her ay karar günlüğü ve kapanmayan riskler. |
| MM-096 | P2 | MARİF'in otomatik düzeltme yetkisi sınırsız olmamalı. | Veri silme, hukuk, ödeme ve prod deploy için açık insan kapısı. | Yetki matrisi ve audit log. |

---

## 6. Hedef ürün mimarisi

### 6.1 Kullanıcı yüzeyi

```text
Bugün
  ├─ Şimdi: yoklama / sıradaki plan / kritik iş
  ├─ Öğretmen döngüsü: planla → uygula → gözle → değerlendir → belgele
  └─ Gün sonu kapanış

Sınıfım
  ├─ Yoklama ve kapsam
  ├─ Çocuklar
  ├─ Bekleyen kanıt/değerlendirme
  └─ Çocuk zaman çizgisi

Kayıt Ekle
  ├─ Gözlem
  ├─ Yoklama
  ├─ Etkinlik/plan
  └─ Hızlı not

Planlar
  ├─ Yıllık
  ├─ Aylık
  ├─ Haftalık
  ├─ Günlük
  ├─ Takvim
  └─ Değerlendirme/karar kuyruğu

Belgeler
  ├─ Plan belgeleri
  ├─ Ek 18
  ├─ Anekdot
  ├─ Gelişim/gözlem özeti
  ├─ Portfolyo
  └─ Geçmiş, manifest ve yeniden üretim
```

### 6.2 Kod mimarisi

```text
app/
  routes/                 yalnız yönlendirme ve yüzey orkestrasyonu
  features/
    attendance/
    planning/
    observation/
    assessment/
    documents/
    premium/
    teacher-cycle/
  domain/                 saf kurallar, immutable kayıtlar
  application/            command/use-case/transaction
  read-models/             ekrana ve belgeye özel doğrulanmış okumalar
  infrastructure/         IndexedDB, crypto, SW, license HTTP
  design-system/          token, primitive, form, sheet, status
  test-support/           deterministic fixtures ve fault injection
```

`Prototype.tsx` tek seferde yeniden yazılmayacaktır. Her yeni iş, ilgili use-case ve route'a taşınır;
eski handler strangler yöntemiyle sökülür. Amaç “daha az satır” değil, domain yazımı ile UI yaşam
döngüsünü birbirinden ayırmaktır.

### 6.3 Veri sözleşmesi

- Ham gözlem değişmezdir.
- Öğretmen değerlendirmesi ayrı sürümlü kayıttır.
- Onay, tam içerik seal'ine bağlıdır.
- Plan/değerlendirme/belge read-model'i kaynak kimliklerini korur.
- Her kalıcı yazma exact committed ID döndürür.
- Read refresh hatası yazma hatası gibi gösterilmez.
- Değerlendirme-anı kadro snapshot'ı tarihsel raporu korur.
- Silme fiziksel sessiz silme değil, tanımlı tombstone/retention işlemidir.
- Backup ve restore aynı exact grafı doğrular.

---

## 7. Fazlı uygulama programı

Süreler taahhüt değil, bağımlılık sırasını gösteren büyüklüklerdir. Bir sonraki faz, önceki fazın
çıkış kapısı geçmeden “tamam” sayılmaz.

### Faz 0 — Ürün gerçeğini kilitle (XS–S)

**Amaç:** Yanlış “hazır/canlı/tam yıl” iddiasını bitirmek.

- Bu mega planı kanonik yol haritası yap.
- STATUS, ledger, eski roadmap ve premium status driftini düzelt.
- Capability durumlarını UI'ya aynı kaynaktan taşı.
- Eylül dışındaki ayları açıkça yayımlanmamış göster.
- P0/P1 requirement→test→release kanıt tablosunu oluştur.

**Çıkış kapısı:** Kod, UI ve belgede aynı yetenek durumu; sahte hazır CTA veya sahte ay yok.

### Faz 1 — Profesyonel kullanılabilirlik temeli (S–M)

**Amaç:** Kullanıcının “düğmeler çalışmıyor, ana ekran profesyonel değil” hükmünü kökten kapatmak.

- Tüm disabled/read-only/selected durum tokenları.
- Bugün ilk katını üç karara indir.
- Kurulum kontrol listesi ve doğru zero-state'ler.
- Planlar workbench bilgi mimarisi.
- Belgelerde readiness.
- Sheet chrome, tarih dili, teknik kopya temizliği.
- 320×568, 390×844, tablet, 200% zoom ve klavye matrisi.

**Çıkış kapısı:** Görsel olarak etkin görünen devre dışı düğme sıfır; her ana iş en çok iki dokunuş.

### Faz 2 — Tek öğretmen döngüsünü eksiksiz kapat (M–L)

**Amaç:** Bir haftanın gerçek işini kopmadan tamamlamak.

- Kurulum→plan→yoklama→uygulama→gözlem→bağ→haftalık değerlendirme→sonraki karar→belge.
- Gözlem insan zaman testi.
- Çoklu çocuk backup/restore/belge.
- Gün sonu ve hafta sonu kapanış.
- Read refresh/commit truth standardını tüm mutasyonlara yay.
- Dönemlik gelişim raporu ve genel belge merkezi temeli.

**Çıkış kapısı:** Emine Öğretmen sentetik sınıfla beş günlük senaryoyu yardım almadan tamamlar;
veri/ID kaybı ve yinelenen giriş yoktur.

### Faz 3 — Güvenli gerçek çocuk pilotu (L)

**Amaç:** Gerçek veri için teknik ve operasyonel NO-GO'yu kaldırmak.

- At-rest şifreleme ve anahtar yönetimi.
- Şifreli backup/restore, migration, kurtarma.
- Saklama/silme/ihlal prosedürü.
- Log/telemetri DLP.
- Medya gizliliği ve EXIF.
- Hukuki veri envanteri ve pilot protokolü.
- Fiziksel Android+iPhone PWA/update/offline/kill testleri.

**Çıkış kapısı:** Güvenlik review + restore tatbikatı + hukuk onayı olmadan gerçek çocuk verisi girilmez.

### Faz 4 — Tam yıllık içerik ve belge sistemi (XL)

**Amaç:** Eylül demosunu tam eğitim yılı ürününe dönüştürmek.

- Ekim–Haziran immutable aylık paketler.
- Altı rollü içerik inceleme ve kaynak sürüm zinciri.
- Yıl/ay/hafta/gün plan workbench.
- Ek 18, plan, gelişim, gözlem özeti, anekdot ve portfolyo merkezi.
- Searchable/tagged PDF hedefi; düzenlenebilir DOCX.
- Yıllık release-set production entegrasyonu ve geri alma.

**Çıkış kapısı:** 10 aylık package manifesti, insan sign-off ve örnek yıl E2E; uydurma içerik sıfır.

### Faz 5 — Gerçek premium ticaret (L)

**Amaç:** Kurucu kodundan bağımsız, hukuken ve operasyonel olarak gerçek ücretli ürün.

- Fiyat/plan ve hak matrisi.
- Ödeme sağlayıcı ve mağaza politikası kararı.
- Makbuz/webhook/idempotency.
- Yenileme, grace, iptal, iade, cihaz taşıma.
- Destek, fatura ve anlaşılır hata yüzeyi.
- Kurucu iki cihaz istisnasının ticari hesaba sızmaması.

**Çıkış kapısı:** Sandbox + gerçek düşük tutarlı işlem + iptal/iade + entitlement E2E.

### Faz 6 — Kurum, aile ve güvenli paylaşım (XL, isteğe bağlı)

**Amaç:** Tek öğretmen ürününün kanıtı tamamlandıktan sonra çok aktörlü kullanım.

- Roller/kurum yönetimi.
- Aileye seçili paylaşım ve onay.
- Çok cihazlı sync ve çatışma çözümü.
- Kurum raporları ve denetim izi.

**Çıkış kapısı:** Yetki izolasyonu, yanlış aile/çocuk paylaşımı negatif testleri ve DPA süreçleri.

---

## 8. Gerçek kabul ve stres test matrisi

### 8.1 Öğretmen işi

1. Temiz telefonda sınıf ve eğitim yılı kur.
2. 20 çocuk ekle; iki çocuk sonradan kayıt olsun, biri ayrılsın.
3. Bir haftalık planı kur, iki günü değiştir, bir günü sonraki tarihe taşı.
4. Her gün yoklama al; geç/yok/işaretlenmedi durumlarını düzelt.
5. 20 tekli, 5 çoklu, 3 plan dışı gözlem kaydet.
6. Bağ bekleyen gözlemleri programa bağla.
7. Bir yetersiz ve bir yeterli haftalık değerlendirme yap.
8. Ay sonu çocuk/program/öğretmen değerlendirmesini tamamla.
9. Sonraki kararları kabul et, uyarla ve reddet.
10. Plan, Ek 18, anekdot, gelişim özeti ve portfolyo üret.
11. Offline kapan/aç; uygulamayı öldür; güncelle; cihazı yeniden başlat.
12. Şifreli backup al, yeni temiz profile geri yükle ve aynı ID'leri doğrula.

### 8.2 Hata enjeksiyonu

- IndexedDB open blocked/timeout/versionchange.
- Transaction commit sonrası read refresh failure.
- QuotaExceededError.
- Saat ileri/geri, İstanbul gece yarısı ve yanlış cihaz saati.
- SW waiting/active worker ve eski cache.
- Ağ challenge sonrası kesinti, redeem retry, idempotency.
- Bozuk/tahrifli/yarım backup.
- PDF/DOCX üretiminde yarım download.
- İki sekme aynı planı düzenler.
- Stale entitlement, revoked, expired, refresh-required.

### 8.3 Cihaz ve erişilebilirlik

- Android Chrome PWA ve iPhone Safari/PWA.
- 320×568, 390×844, tablet ve masaüstü.
- 200% zoom, büyük yazı, ekran döndürme.
- TalkBack ve VoiceOver.
- Donanım klavyesi ve ekran klavyesi.
- Düşük güç, düşük depolama, yavaş CPU ve yavaş ağ.

### 8.4 Belge görsel kalite

- Tüm PDF sayfalarını raster render ve görsel inceleme.
- DOCX'i Microsoft Word ve mümkünse LibreOffice'te sayfa sayfa render.
- Türkçe karakter, uzun metin, uzun çocuk adı, 40 çocuk ve boş veri.
- Başlık yetimi, sayfa taşması, kesilme, footer çakışması.
- Searchable metin, okuma sırası ve form alanı erişilebilirliği.

---

## 9. Başarı metrikleri

### 9.1 Kullanılabilirlik

- Hızlı tekli gözlem: medyan ≤25 sn, P95 ≤45 sn.
- 20 çocuk yoklama: medyan ≤30 sn.
- Gelecek planı bulup düzenleme: ≤45 sn.
- Hazır belgeyi bulup indirme: ≤20 sn.
- Ana görevlerde yanlış/ölü dokunma oranı <%2.
- Yardımsız görev tamamlama: ≥%90.

### 9.2 Veri bütünlüğü

- Yetim observation/link/evaluation/document ID: 0.
- Başarılı commit sonrası mükerrer retry: 0.
- Backup→restore exact kimlik korunumu: %100.
- Offline kapan/aç veri kaybı: 0.
- Sessiz overwrite: 0.

### 9.3 Pedagojik kalite

- Tek gözlemden kesin hüküm: 0.
- Yetersiz kanıtta açık yetersizlik mesajı: %100.
- Sonraki plan kararında kaynak değerlendirme izi: %100.
- Program bağı öğretmen onayı olmadan kesinleşmez: %100.

### 9.4 Güvenlik ve gizlilik

- At-rest disk incelemede okunabilir çocuk içeriği: 0.
- Log/telemetride kişisel veri: 0.
- Harici AI paketinde kimlik/yakın/telefon: 0.
- Yanlış çocuk/aile paylaşımı: 0.
- Restore tatbikatı başarı oranı: %100.

### 9.5 İçerik ve ticaret

- Yayınlanmış ayların insan sign-off oranı: %100.
- Null ayda görünen sahte içerik: 0.
- Webhook çift teslimde çift entitlement: 0.
- İptal sonrası öğretmen emeğinin okunabilirliği: %100.

---

## 10. Yayın kapıları

### Gate A — Tasarım ve davranış

- Sahte aktif düğme yok.
- Beş ana hedef ve ana görevler gerçek tıklama testinden geçer.
- 390×844, 320×568 ve 200% zoom geçer.
- VoiceOver/TalkBack ana akış geçer.

### Gate B — Veri bütünlüğü

- Tüm mutasyonlar committed ID sözleşmesini uygular.
- Fault injection, offline ve kill testleri geçer.
- Backup/restore exact grafı geçer.

### Gate C — Gerçek veri güvenliği

- At-rest şifreleme tamam.
- Hukuki/pilot protokolü onaylı.
- Log ve paylaşım sınırı doğrulanmış.

### Gate D — İçerik

- Ay paketi gerçek MEB kaynağına bağlı.
- Altı rol sign-off.
- İmza, rollback ve source version izlenebilir.

### Gate E — Fiziksel pilot

- Emine ve Sercan telefonlarında güncelleme, premium, offline ve reload.
- En az 20 okul günü sentetik/izinli veriyle kullanım.
- P0=0, açık P1 için kabul edilmiş risk kaydı.

### Gate F — Ticari yayın

- Satın alma, makbuz, entitlement, yenileme, iptal/iade.
- Store privacy beyanları ve hesap/veri silme.
- Destek ve felaket kurtarma runbook.

---

## 11. İlk yürütme sırası — sonraki 12 karar

1. Bu planı ve requirement ledger'ı tek otorite olarak sabitle.
2. Tüm sahte etkin görünümlü disabled kontrolleri düzelt ve regresyon testi ekle.
3. Bugün ilk katını “yoklama + sıradaki plan + kritik iş” olarak sıkıştır.
4. Planlar için sheet yerine kalıcı Yıl/Ay/Hafta/Gün workbench oluştur.
5. Belgelerde readiness, eksik veri ve sürüm geçmişi ekle.
6. Temiz cihaz ilk kurulum kontrol listesini tamamla. **Yerel 0/4→4/4, resmî dönem geçişi, plan kurulumu, şifreli yedek doğrulaması ve reload geçti; otomatik browser exact dosya restore+reload yaptı. Fiziksel öğretmen ve uygulama kaldırılmış temiz cihaz kapısı açık.**
7. Gerçek öğretmen hız/kullanılabilirlik oturumunu ölç; varsayım yerine veri üret.
8. `Prototype.tsx` için strangler refactor sınırını uygula; yeni domain yazımını yasakla.
9. At-rest şifreleme uygulamasını ayrı P0 programı olarak başlat.
10. Ekim içeriğini tam insan inceleme zinciriyle ilk production monthly bundle olarak üret.
11. Emine ve Sercan fiziksel telefon premium/güncelleme kabulünü kapat.
12. Gerçek ücretli satın alma mimarisini hukuki/store kararıyla başlat.

---

## 12. MARİF çalışma sözleşmesi

MARİF bundan sonra bir kullanıcı cümlesini dar patch'e dönüştürmeyecektir. Her talepte:

1. Talebi kanonik ledger satırına bağlar.
2. Etkilenen bütün zinciri çıkarır: veri, UI, değerlendirme, belge, offline, güvenlik.
3. Dünya örneği gerekiyorsa güncel resmî kaynağı doğrular.
4. Emine Öğretmen rolünde en az normal, boş, kilitli ve hata durumunu yürütür.
5. P0/P1 riskini çözer; yalnız görsel düzeltmeyle yetinmez.
6. Negatif regresyon testi olmadan bug kapatmaz.
7. Ekran görüntüsünü davranış kanıtı yerine kullanmaz.
8. `VERIFIED` demeden fiziksel cihaz/üretim/restore gereğini kontrol eder.
9. Gerçek veride yetki, gizlilik ve geri dönüş kapısını aşmaz.
10. Kapanmayan işi “tamamlandı” diye gizlemez.

---

## 13. Kaynaklar

### Türkiye ve program kaynağı

- [MEB 2024 Okul Öncesi Eğitim Programı](https://mus.meb.gov.tr/meb_iys_dosyalar/2024_06/23141641_okuloncesiogretimprogrami.pdf)
- [MEB öğretim programları dizini](https://mufredat.meb.gov.tr/programlar.aspx)
- [Türkiye Yüzyılı Maarif Modeli Ortak Metni 2025 güncellemesi](https://ttkb.meb.gov.tr/www/turkiye-yuzyili-maarif-modeli-ortak-metni-yeni-alan-becerileri-ile-birlikte-guncellendi/icerik/767)

### Pedagoji ve öğretmen iş döngüsü

- [ACECQA — Documenting the assessment and planning cycle](https://www.acecqa.gov.au/latest-news/blog/documenting-assessment-and-planning-cycle)
- [ACECQA — Element 1.3.1](https://www.acecqa.gov.au/element-131-assessment-and-planning-cycle)
- [New Zealand Ministry of Education — Te Whāriki assessment, planning and evaluation](https://tewhariki.tahurangi.education.govt.nz/te-whariki-online/assessment-planning-and-evaluation/5637165598.p)
- [UK DfE — Carrying out an assessment](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/send-assessment/carrying-out-an-assessment)
- [UK DfE — Reducing paperwork](https://help-for-early-years-providers.education.gov.uk/support-for-practitioners/reducing-paperwork)
- [NAEYC — Developmentally Appropriate Practice recommendations](https://www.naeyc.org/resources/position-statements/dap/recommendations)
- [Head Start — Screening, assessment, evaluation and observation](https://www.headstart.gov/child-screening-assessment/article/screening-assessment-evaluation-observation)
- [Head Start — Child observation and individualization](https://www.headstart.gov/child-screening-assessment/child-observation-heart-individualizing-responsive-care-infants-toddlers/child-observation-heart-individualizing)

### Ürün örnekleri

- [Storypark planning area](https://help.storypark.com/en/articles/443166-educators-an-introduction-to-the-planning-area)
- [Storypark educator app and offline limits](https://help.storypark.com/en/articles/56187-educators-using-the-storypark-for-educators-app-on-an-iphone-or-ipad)
- [Brightwheel — observations from lesson plans](https://help.mybrightwheel.com/en/articles/11899456-log-observations-to-assess-student-development)
- [Brightwheel — learning report](https://help.mybrightwheel.com/en/articles/998639-learning-report)
- [Teaching Strategies GOLD user guide](https://teachingstrategies.com/wp-content/uploads/2023/04/GOLD-User-Guide-for-Teachers.pdf)

### Erişilebilirlik ve güvenlik

- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C — What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [OWASP MASVS — Secure storage](https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-1/)
- [NIST NCCoE — Conduct, maintain and test backup files](https://csrc.nist.gov/pubs/other/2020/04/24/protecting-data-from-ransomware-and-other-data-los/final)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [KVKK güncel gelişmeler](https://www.kvkk.gov.tr/Icerik/8688/secilmis-guncel-gelismeler)

---

## 14. Son karar

MaarifOS’un yönü doğrudur, fakat mevcut hâli “biraz daha sadeleştirilecek hazır ürün” değildir.
Önümüzde üç ayrı dönüşüm vardır:

1. **Kullanılabilir ürün:** sahte affordance'ları kaldıran, tek öğretmen döngüsü ve profesyonel iş alanları.
2. **Güvenilir sistem:** şifreli veri, kurtarma, erişilebilirlik, fiziksel cihaz ve gerçek pilot kanıtı.
3. **Tam ürün işletimi:** on aylık insan onaylı içerik, gerçek ticaret, destek ve yayın yönetişimi.

Bu üçü birlikte tamamlanmadan “MaarifOS öğretmenin bütün işini yapan ultra sistem oldu” denmeyecektir.
Doğru kısa vadeli hedef, daha fazla yüzey eklemek değil; mevcut güçlü domain parçalarını görünür,
ölçülebilir ve güvenli tek öğretmen döngüsünde birleştirmektir.

---

## 15. Dalga 9 — Parça özellikten kanonik öğretmen haftasına geçiş

### 15.1 Neden yön değişti?

Önceki dalgalar önemli veri bütünlüğü ve kullanılabilirlik sorunlarını kapattı; ancak farklı test sınıfları,
farklı tarihler ve ayrı ekran başarıları “Emine Öğretmen pazartesiden cumaya aynı sınıfla işini yürütebilir mi?”
sorusunu cevaplamıyordu. Dalga 9'un otoritesi özellik sayısı değil, tek `KW-2026-09-W1-v1` kurgu haftasıdır.
Her yeni kod aynı hafta üzerinde plan → uygulama → kanıt → değerlendirme → belge → kurtarma zincirine bağlanacaktır.

### 15.2 İlk uygulanan dikey dilim

| Katman | Uygulanan davranış | Kanıt | Dürüst sınır |
|---|---|---|---|
| Öğretmen üst plan domaini | Premiumdan bağımsız `teacher-authored` Yıl→Ay→Hafta grafiği; exact aktif sınıf/yıl kapsamı; sivil dönem yuvalaması; tek transaction; mükerrer/çakışma fail-closed | Node 8/8 service testi | Günlük plan henüz teacher week ID'sine doğrudan bağlanmıyor. |
| Revizyon | `expectedUpdatedAt` optimistic concurrency; eski sürüm immutable snapshot olarak sona eklenir; çağıran nesne mutasyonu kaydı değiştirmez | Stale/iki ardışık revizyon negatifleri geçti | Alan-bazlı merge yok; eşzamanlı değişiklikte kullanıcı son sürümü yeniden açar. |
| Giriş yüzeyi | Yerel üst plan yokken premium kapısı yerine üç mesleki karar: yıllık öncelik, aylık odak, haftalık akış; dönemler etkin eğitim yılından otomatik | 390×844 create→revise→reload gerçek browser 1/1 | 200% zoom, ekran okuyucu ve fiziksel telefon açık. |
| Premium sınırı | Sağlayıcı alanları teacher kaydında yasak; hazır içerik kütüphanesi ayrı CTA ve mevcut ücretli kuralıyla kalır | Guard ve kaynak sözleşmesi testli | Sağlayıcı planı ile teacher planı yan yana olduğunda ürün dili gerçek pilotta ölçülmeli. |
| Belge | Teacher graph'tan bağımsız PDF/DOCX; annual/monthly/weekly kayıt ID'leri, dönem, revizyon ve öğretmen metni taşınır; eksik içerik uydurulmaz | Paragraf negatif testi + gerçek DOCX ZIP indirme | PDF tüm-sayfa görsel QA ve fiziksel dosya açma açık. |
| Yedek/restore | Backup data schema v6; teacher alan exact allowlist; ebeveyn/çocuk grafiği ve revision history doğrulaması; orphan restore fail-closed | Backup 27/27; yeni gerçek IndexedDB replace-restore testi 1/1 | Şifreli fiziksel temiz cihaz restore ve at-rest şifreleme açık. |

### 15.3 Eşanlı yeniden eleştiri — yeni kırmızı liste

1. **P0 · Teacher-owned daily lineage:** Günlük planın `sourceAnnualPlanId/sourceMonthlyPlanId/sourceWeeklyPlanId`
   bağı teacher-owned grafiğe güvenle yazılamıyorsa haftalık sayaç ve değerlendirme eksik kalır.
2. **P0 · Premiumdan bağımsız haftalık karar:** Gözlem seçimi, kanıt özeti, öğretmen yansıtması ve W2 önerisi
   provider ekranına veya entitlement'a bağlı kalmamalıdır.
3. **P0 · Premiumdan bağımsız aylık değerlendirme:** Üç eksenli öğretmen değerlendirmesi yalnız gerçek iki hafta,
   aktif roster snapshot'ı ve teacher-confirmed bağlarla oluşmalı; ay ortasında yeterlilik uydurulmamalıdır.
4. **P0 · Tek hafta offline continuity:** Parça offline testleri yerine aynı ID'lerle beş gün, kill/reload ve online
   dönüşte mükerrer=0 kanıtlanmalıdır.
5. **P0 · Gerçek çocuk pilot engeli:** IndexedDB at-rest açık metindir; şifreli gölge-store/migration tamamlanmadan
   gerçek çocuk verisiyle pilot NO-GO kalır.
6. **P1 · Plan genişletme:** İlk oluşturma bir ay/bir hafta ile başlar; yeni ay/hafta ekleme ve dönem kaydırma için
   ayrı atomik servis/UX gerekir. Mevcut revise yalnız metin ve başlığı güvenle değiştirir.
7. **P1 · Çatışma çözümü:** Günlük çakışma görünür ama öğretmen kontrollü merge/arşiv kararı yoktur; otomatik seçim
   yasak kalmalıdır.
8. **P1 · Belge doğruluğu:** Standalone PDF/DOCX ilk temel çıktıdır; MEB resmî formu gibi sunulamaz. Aranabilir PDF,
   düzenlenebilir preview ve tüm-sayfa QA ayrı kapıdır.
9. **P1 · Kurtarma:** Backup graf testi geçti diye fiziksel dosya bulma, yanlış parola, uninstall ve temiz restore
   geçmiş sayılmaz.
10. **P1 · Mesleki zaman bütçesi:** “Üç kısa karar” metni ancak 10 öğretmen×5 gün ölçümünde ≤10 dakika kurulum ve
    sonraki haftalarda ≤2 dakika revizyon hedefiyle doğrulanır.

### 15.4 Sonraki yürütme sırası

1. Teacher-owned günlük planı seçili üst hafta kimliğine bağla; bugün/takvim ve conflict guard'ını koru.
2. Aynı W1 üzerinde 5 günlük plan, 15 yoklama, 5 uygulama ve 5 immutable gözlem üret.
3. Generic teacher-owned weekly evaluation + W2 `pending-teacher-review` carry yazımını bağla.
4. Ay bağlamını ve yeterlilik reddini aynı kayıt grafiğinden göster; aylık değerlendirmeyi premiumdan ayır.
5. Plan + Ek 3 + hazırsa Ek 18 belge ailesini aynı evidence ID'leriyle doğrula.
6. Aynı haftayı production PWA offline/reload diliminde ve şifreli clean restore'da yeniden çalıştır.
7. Her adımın MARİF eleştiri tablosunu bulgu kapandığında değil, kod yazılırken güncelle.

### 15.5 Dalga 9 şimdiki hükmü

İlk kez öğretmen kendi üst planını premium olmadan **oluşturabiliyor, düzenleyebiliyor, belgeleyebiliyor ve
restore edebiliyor**. Bu önemli bir P0 kopukluğu kapatır; fakat tek başına “öğretmen haftası tamam” değildir.
Durum `IMPLEMENTED_UNVERIFIED/IN_PROGRESS` kalır. Bir sonraki otorite, aynı teacher-owned hafta kimliğinin günlük
plan, gözlem ve haftalık karara kesintisiz taşınmasıdır.

---

## 16. Dalga 10 — Teacher-owned günlük bağ ve haftalık mesleki karar

### 16.1 Aynı anda eleştirilen etki alanı

Bu dalga “haftalık değerlendirme formu ekleme” işi olarak ele alınmadı. Günlük planın üst plan kimliği,
etkinlik ve immutable gözlem kanıtı, optimistic concurrency, W2 önerisinin sessiz uygulanmaması, belge,
backup/restore ve Today yönlendirmesi birlikte denetlendi.

| Eleştiri | Uygulanan sistem davranışı | Kanıt | Kalan sınır |
|---|---|---|---|
| Günlük plan teacher-owned W1'e bağlanmıyordu; sayaç ve değerlendirme zinciri kopuyordu. | Günlük plan ve tek gerçek etkinlik aynı transaction içinde exact annual/monthly/weekly kimliklerini alır. Sıfır eşleşmede bağımsız günlük davranış korunur; iki hafta veya bozuk ebeveyn sıfır yazımla reddedilir. | Pozitif/negatif lineage ve rollback testleri geçti. | Aynı gün mükerrer daily için öğretmen kontrollü çözüm/merge politikası açık. |
| Today haftalık/aylık işi yine premium merkezine götürüyordu. | Haftalık ve aylık aşamalar `Plan zincirim`e gider; hazır sağlayıcı kütüphanesi ayrı premium eylemdir. | Kaynak yönlendirme ve 390×844 gerçek tıklama zinciri testli. | Teacher-owned aylık değerlendirme henüz yok; aylık CTA yalnız kayıtları görür. |
| Haftalık karar yalnız provider/premium modelindeydi. | Gerçek günlük activity ve immutable observation seçilerek teacher-authored kanıt özeti, yansıtma ve karar append-only yazılır. Stale weekly `updatedAt`, sahte activity bağı veya yanlış scope fail-closed kalır. | W1 değerlendirme pozitif; stale/forged negatifleri geçti. | Beş günlük gerçek haftada 5 gözlem ve confirmed program link matrisi henüz tek journey değildir. |
| Sonraki hafta önerisi otomatik uygulanabilirdi veya kaynaksız kalabilirdi. | W2 yalnız `pending-teacher-review` context alır; kaynak evaluation ID, W1/W2 revizyonları ve karar saklanır. Sonradan W2 revize edilirse öneri eski target revision'a bağlı görünür, içerik değişmez. | Revizyon drift'i ve pending görünüm testli. | Öneriyi kabul et/düzenle/reddet için ayrı öğretmen onay komutu açık P1. |
| Backup yalnız shape'e bakıp sahte değerlendirme/carry kabul edebilirdi. | Restore; teacher evaluation shape, immediate-next week, source/target revision, scope, daily→activity→observation bağı ve W2 context eşitliğini doğrular. | Gerçek IndexedDB replace-restore + revision tamper reddi geçti. | Fiziksel şifreli temiz cihaz restore açık. |
| Öğretmenin kendi grafiğiyle provider grafiği aynı dönemde belirsiz seçilebilirdi. | Salt-okunur teacher cycle, aynı tarihte teacher-authored grafiği provider grafiğinden önce seçer; kayıtlar birleştirilmez. | Negatif/pozitif seçim testi geçti. | Öğretmen dilinde iki kaynağın birlikte görünümü fiziksel kullanıcıyla ölçülmeli. |
| Temel belge haftalık mesleki kararı taşımıyordu. | Standalone PDF/DOCX metni evidence summary, reflection, karar, observation ID'leri, source revision ve W2 bekleyen önerisini taşır. | Belge paragraf sözleşmesi ve mobil DOCX akışı testli. | Güncel PDF tüm-sayfa görsel QA ve fiziksel Word/PDF açma açık. |

### 16.2 Kalite kanıtı

- Feature/migration matrisi: `539/539` geçti.
- Teacher-owned odak matrisi: `33/33` geçti.
- Backup/recovery matrisi: `33/33` geçti; teacher graph, değerlendirme ve carry exact restore edildi.
- 390×844 gerçek browser: create/revise/export/reload ve gerçek observation→W1 review→W2 pending akışları `2/2` geçti.
- TypeScript typecheck, policy lint ve `36/36` protected runtime integrity geçti.
- Kesintisiz `npm run quality:gate` baştan sona geçti: License API `15/15`, browser smoke `10/10`,
  Sites `26/26`, production PWA/offline `4/4` ve bundle bütçesi `gzip/chunk ≤180 KiB`.
- Seri iş akışları tek 60 saniyelik toplam torbaya sıkıştırılmadı; çekirdek workflow `55,1 sn`, teacher-plan
  workflow `13,9 sn` olarak ayrı ve görünür bütçelerle geçti.
- Commit, push veya production deploy yapılmadı.

### 16.3 Eşanlı yeniden eleştiri — güncel kırmızı liste

1. **P0 · Teacher-owned aylık değerlendirme:** Ay sonu üç eksenli değerlendirme, aktif roster snapshot'ı,
   en az iki hafta ve teacher-confirmed program bağlarıyla premiumdan bağımsız yazılmalıdır.
2. **P0 · Kanonik beş günlük journey:** `KW-2026-09-W1-v1` aynı sınıfta 15 yoklama, 5 uygulama,
   5 gözlem/bağ, 5 kapanış, W1 kararı ve W2 önerisini tek kimlik zincirinde henüz tamamlamadı.
3. **P0 · Offline ve temiz restore:** Parça testleri yerine aynı hafta production service worker altında
   offline kill/reload ve şifreli clean restore sonrası exact ID karşılaştırması gerekir.
4. **P0 · At-rest güvenlik:** IndexedDB açık metin kaldığı için gerçek çocuk verisi pilotu NO-GO'dur.
5. **P1 · Carry uygulama kararı:** W2 önerisi doğru biçimde bekliyor; kabul/düzenle/reddet ve idempotent uygulama
   komutu olmadan öğretmen döngüsü tamamlanmış sayılmaz.
6. **P1 · Günlük çakışma çözümü:** Sistem doğru biçimde conflict gösterir fakat hangisinin korunacağına dair
   öğretmen kontrollü birleştirme/arşivleme yoktur; otomatik seçim yasak kalmalıdır.
7. **P1 · Erişilebilirlik ve zaman bütçesi:** 200% zoom, VoiceOver/TalkBack, fiziksel iki telefon ve gerçek
   öğretmen süreleri hâlâ otomasyonla ikame edilemez.

### 16.4 Dalga 10 hükmü

Teacher-owned plan artık yalnız üst düzey bir belge değildir: günlük plan aynı W1 kimliğine bağlanır, gerçek
gözlem haftalık karara dönüşür ve W2'ye kaynaklı fakat uygulanmamış öneri taşınır. Bu, iki gerçek P0 kopukluğu
kapatır. Yine de ürünün bütünü hazır değildir; aylık değerlendirme ve tek beş günlük offline/restore journey
tamamlanana kadar kanonik hafta `IN_PROGRESS`, ürün ise `IMPLEMENTED_UNVERIFIED` kalır.

---

## 17. Dalga 11 — Çalışan yerel kasa ve premiumdan bağımsız aylık mesleki hüküm

### 17.1 Yerel önizleme neden “çalışmıyor” görünüyordu?

Sunucu ve uygulama bundle'ı sağlıklıydı; bütün ekranı kilitleyen neden ana öğretmen verisi değil,
eski bir cihaz-içi kurtarma snapshot'ının güncel şema doğrulamasından geçememesiydi. Tek bir yardımcı
liste yükleyicisinin `Promise.all` içindeki hatası sınıf, plan, gözlem ve belge yazımını da global olarak
durduruyordu. Bu güvenli değil, aşırı geniş fail-closed davranışıydı.

Yeni sınır:

- sınıf, plan, kanıt, takvim, çalışma döngüsü, kapanış ve uygulama kilidi kritik yükleyicilerdir;
  hata halinde sabit, kişisel verisiz `HYD-*` destek koduyla yazım durur;
- bozuk kurtarma listesi ana öğretmen kayıtlarını kilitlemez, kayıt silinmez, yedek alanında açık
  “inceleme gerekiyor” uyarısı kalır;
- kullanıcıya site verisini temizleme veya uygulamayı kaldırma önerilmez;
- bozuk snapshot otomatik onarılmaz veya sessizce atılmaz.

Yerel açık oturumda aynı bozuk kurtarma kaydı korunurken persistence gate kalktı; kayıtlı sınıf,
üç çocuk, plan döngüsü ve beşli alt navigasyon yeniden açıldı. Bu bulgu, “uygulama açıldı” ile
“kurtarma sağlıklı” hükümlerinin ayrı tutulması gerektiğini yeniden kanıtladı.

### 17.2 Teacher-owned aylık değerlendirme

| Eleştiri | Uygulanan davranış | Kanıt | Kalan sınır |
|---|---|---|---|
| Aylık üç yönlü değerlendirme provider/premium ekranına bağlıydı. | `Plan zincirim` içindeki teacher-authored aylık kayıt, entitlement olmadan Çocuklar → Program → Öğretmen formunu açar. | Domain 2/2, teacher-owned odak 25/25 ve 390×844 UI akışı geçti. | Fiziksel telefon ve gerçek ay sonu öğretmen süresi açık. |
| Az kanıtla bütün sınıf hakkında genelleme yapılabilirdi. | “Yeterli” hükmü için en az 2 immutable gözlem, 2 sivil gün, 2 farklı teacher-owned hafta, seçili her gözleme teacher-confirmed program bağı ve evaluation-anı aktif sınıfın tamamının temsili gerekir. | Üç çocuk/two-week pozitif; bir çocuk eksik negatifinde transaction sıfır yazımla kaldı. | Enrollment tarihçesi olmadan aktif roster evaluation-anı snapshot'ıdır. |
| Kanıt yetersizliği öğretmeni sahte gözlem girmeye itebilirdi. | “Kanıt yetersiz” ayrı ve kalıcı bir mesleki hükümdür; sıfır gözlemle bile eksiklik açıklaması, program/öğretmen yansıtması ve sonraki ay kanıt planı kaydedilebilir. | 390×844 gerçek formda yeterli radio kapalı, yetersiz değerlendirme reload sonrası korundu. | Dilin öğretmende baskı üretip üretmediği pilotta ölçülmeli. |
| Program ve öğretmen değerlendirmesi serbest metne indirgenebilirdi. | Program için 11, öğretmen için 12 ölçüt; `İşliyor / Uyarlama gerekiyor / Gözlenmedi` exact sıra ve status sözleşmesiyle saklanır. | Parser/guard ve tam criteria sayısı testli. | Resmî Ek 18 değildir; öğretmen eki olarak ayrı kalmalıdır. |
| Aylık kayıt export/restore'da kaybolabilirdi. | Değerlendirme ID, plan revizyonu, üç yön, coverage, observation/link ID'leri ve sonraki ay önerisi standalone PDF/DOCX paragraf modeline girer; backup restore source graph ve coverage'ı yeniden hesaplar. | Gerçek IndexedDB replace-restore ve source revision tamper reddi geçti. | Güncel PDF tüm-sayfa görsel QA ve fiziksel Word/PDF açma açık. |

### 17.3 Eşanlı yeniden eleştiri — yeni öncelik sırası

1. **P0 · Kanonik beş günlük teacher journey:** Aylık domainin yeşil olması aynı sınıfta 15 yoklama,
   5 uygulama, 5 gözlem/bağ, 5 kapanış, W1 kararı ve W2 önerisinin tek akışta geçtiği anlamına gelmez.
2. **P0 · At-rest şifreleme:** Yerel IndexedDB hâlâ açık metindir; gerçek çocuk verisi pilotu NO-GO kalır.
3. **P0 · Uygulama içi öğretmen orkestrasyonu:** Today kartları deterministik read-modeldir; öğretmenin
   “bu hafta neyi değiştirmeliyim?” niyetini kanıtla açıklayan, taslak öneri → öğretmen onayı → uygula → geri al
   komuta katmanı henüz yoktur.
4. **P0 · Production offline/clean restore:** Aynı beş günlük kimlik zinciri service worker altında kill/reload,
   online dönüş ve temiz profile şifreli restore ile byte-exact karşılaştırılmalıdır.
5. **P1 · Sonraki ay önerisi:** Kayıt korunuyor fakat yeni aya kabul et/düzenle/reddet komutu ve idempotent
   uygulama izi yoktur; öneri sessiz uygulanmamalıdır.
6. **P1 · Bozuk recovery yönetimi:** Ana uygulama doğru açılıyor; fakat bozuk snapshot'ı dışa alma, destek için
   kişisel verisiz tanı ve açık kullanıcı onayıyla karantinaya alma akışı henüz yoktur.
7. **P1 · Plan çakışma çözümü:** Conflict görünür, otomatik seçim yok; öğretmen kontrollü arşivle/birleştir
   kararı eksiktir.
8. **P1 · Erişilebilirlik/zaman bütçesi:** 200% zoom, VoiceOver/TalkBack, 320×568, iki fiziksel telefon ve
   gerçek öğretmen süreleri otomasyonla ikame edilemez.

### 17.4 Dalga 11 hükmü

Yerel uygulama artık bozuk bir yardımcı kurtarma kaydı yüzünden bütün öğretmen işini kilitlemiyor ve aylık
mesleki değerlendirme premiumdan bağımsız, kanıta bağlı, üç yönlü ve export/restore izli çalışıyor. Bu iki
somut P0/P1 kopukluğu kapatır. Yine de “dünyanın en mükemmel uygulaması” hükmü verilmez: tek beş günlük journey,
at-rest kasa, gerçek öğretmen komuta katmanı ve fiziksel clean restore tamamlanmadan ürün
`IMPLEMENTED_UNVERIFIED` kalır.

## 23. Dalga 18 — beklenen öğretim günü, kaynak izi ve öğretmen dili

### 23.1 Uygulanan fakat henüz fiziksel olarak doğrulanmayan dikey dilim

Dalga 18, “oluşturulmuş plan sayısı = öğretim günü sayısı” varsayımını kaldırdı. Yeni
`resolveTeacherWeekTeachingDays`; haftalık plan aralığını etkin eğitim yılı, Pazartesi–Cuma günleri,
MEB 2026–2027 uyum/dönem/ara tatil tarihleri, tam gün resmî tatiller ve kaynaklı okul-olmayan dönemlerle
çözüyor. Son beklenen gün ile sınıf çalışma düzeninin bitiş saati `Europe/Istanbul` zamanında birleşerek
haftalık değerlendirmenin en erken açılma anını üretiyor. Resmî profilde MEB ve tatil kaynağı; özel eğitim
yılında öğretmen kaydı ile açık okul-olmayan dönem kaynakları provenance olarak korunuyor.

`loadTeacherWeeklyReviewContext` ile `recordTeacherWeeklyEvaluation` aynı kanonik coverage hesabını
kullanıyor. Beklenen günde plan eksikliği, aynı günde mükerrer plan, öğretim dışı güne plan, eksik/güncel
olmayan kapanış ve sınıf bitiş saatinden önce karar ayrı blocker'dır. Normal dönem 14–18 Eylül 2026
senaryosunda beş beklenen günün beşinin de kapanması ve kararın 18 Eylül sınıf bitiş saatinden sonra açılması
hedefli root kanıtta doğrulandı. Beklenen gün resolver'ı, normal/uyum/öğretmen çalışma/ara tatil/resmî tatil
negatifleri, günlük lineage ve haftalık karar birlikte `30/30` geçti; typecheck, policy lint ve runtime
integrity de geçti. Bu kanıtın dürüst statüsü `IMPLEMENTED_UNVERIFIED`dır; üretim UI yolculuğu değildir.

Kullanıcı yüzeyinde “MARİF ajanı/eleştirileri” markalı geliştirme dili kaldırıldı. Ana karar `Sıradaki iş`,
hafta özeti `Bu hafta` öğretmen diliyle sunuluyor. Haftalık değerlendirme paneli `tamamlanan/beklenen öğretim
günü`, exact beklenen tarihler ve `MEB 2026–2027 çalışma takvimi ve sınıf bitiş saati` kaynağını görünür
kılıyor. Ek düzeltmede Today öğretmen haftası da sabit `/5` paydasından çıkarıldı: öğretmen-owned current week
varsa aynı `resolveTeacherWeekTeachingDays` sonucundan `expectedDayCount`, exact günler ve resmî/özel provenance
alıyor; çözümleme hatasında sahte fallback üretmek yerine `invalid` kalıyor. MEB ara tatilinde `0 öğretim günü`
ve sıfır gün kartı gösteriyor; haftalık plan yoksa kapsamı uydurmadan dürüst Pazartesi–Cuma fallback etiketi
kullanıyor. Başlık `Öğretim günlerini tek zincirde izleyin`, coverage dayanağı görünürdür. Teacher-week workspace
ve teaching-days hedefli kanıtı `10/10`, typecheck ve policy lint geçti. Karar motoru içeride kalıyor; öğretmen,
ajan terminolojisini öğrenmek zorunda bırakılmıyor.

Takvim CRUD'ına `no_school` / `Okulda eğitim yok` türü eklendi. Kayıt oluşturma, durumu `cancelled` yapma,
yeniden etkinleştirme ve tombstone ile kaldırma yeni bir yan kanal açmadan mevcut scope-guard'lı takvim
servisi/UI akışını kullanıyor. Yalnız aynı `academicYearId/classroomId` kapsamındaki canlı ve cancelled olmayan
yerel kapanışlar `localNoSchoolPeriodsFromCalendarEntries` ile kanonik resolver'a giriyor. Provenance
`teacher-local` ve `urn:maarifos:calendar-entry:<id>` kaynağını taşıyor; Today paydası ile haftalık değerlendirme
read/commit kapısı aynı excluded gün listesini tüketiyor. Backup strict enum'u `no_school` kabul ediyor ve browser
backup roundtrip fixture'ı türün korunmasını bekliyor. `Kayıt Ekle → Takvime not ekle` geçişindeki native-history
yarışı `surfaceTransitionRef.current="calendar"` ile kapatıldı; geri navigasyon artık yanlış yüzeyi yeniden
açmıyor. Açık IAB oturumunda 16 Eylül için gerçek formdan `no_school` oluşturuldu ve reload sonrasında aynı
kayıt/payda korundu. Runtime-integrity `8/8`; hedef domain/UI `24/24`; full migration `578/578`;
typecheck/lint/runtime `36/36` ve build geçti. Browser backup testi bu tur çalıştırılmadığı için statü
`IMPLEMENTED_UNVERIFIED`dır.

Gerçek UI öğretmen haftası için `teacher-week-real-ui.spec.ts`, paket kalite zincirine
`test:runtime:ui:workflows:teacher-week` olarak bağlandı. Senaryo gerçek düğmelerle üç çocuk, beş gün, 15
yoklama, beş plan/uygulama/gözlem/program bağı/kapanış, haftalık karar, W2 öğretmen kararı, PDF/DOCX ve aynı
profilde şifreli replace restore bekliyor; mutation için doğrudan servis seed kullanmıyor ve tek
`page.evaluate` yalnız final salt-okunur invariant oracle'ıdır. Product Design browser kuralı nedeniyle CLI
spec bu tur çalıştırılmadı; dosya ve package kaydı başarı kanıtı değildir.

### 23.2 Eşanlı MARİF after-critique — kapanmayan kırmızı kapılar

1. **KOPUK P0 · Çalıştırılmamış gerçek UI haftası:** Mutation seed kullanmayan gerçek UI spec ve kalite zinciri
   artık vardır; fakat bu tur çalıştırılmadı. PASS, artifact ve hata durumları görülmeden kanonik öğretmen haftası
   `VERIFIED` sayılamaz.
2. **KOPUK P0 · Offline ve temiz restore:** Aynı UI haftasının pazartesi–çarşamba yazımları sonrası process
   kill + ağsız yeni süreçte perşembe–cuma devamı ve gerçek dosya seçicili boş profil restore'u yoktur.
3. **RİSKLİ P0 · At-rest kasa:** Canlı IndexedDB ve recovery snapshot açık metindir. Şifreli dış yedek bu açığı
   kapatmaz; gerçek çocuk verili pilot `NO-GO` kalır.
4. **EKSİK P1 · Temel tam-gün formu:** Premium hazır içeriğin paralı kalması doğrudur; fakat öğretmenin
   premiumdan bağımsız olarak kendi 10 bloklu tam/yarım gün akışını kuracağı boş mesleki form hâlâ yoktur.
   Çekirdek günlük plan tek etkinlik merkezlidir.
5. **GEREKSİZ P1 · Üst plandan miras:** Haftalık program kapsamı, çocuk kapsamı ve akış varsayılanları günlük
   taslağa taşınmadığı için aynı seçimler gün gün yeniden yapılabilir. Öğretmen yalnız istisnayı değiştirmelidir.
6. **EKSİK P1 · Yerel kapanış belgesi ve çok-gün UI:** Tek günlük gerçek UI create+reload, güncelle-iptal/tombstone
   ve kanonik tüketim uygulandı; fakat UI yalnız seçili tek günü kaydediyor. Çok günlük kapanış aralığı, kaynak
   belge eki ve denetlenebilir karar/audit notu yoktur. Browser backup fixture güncel olsa da çalıştırılmadı.
7. **RİSKLİ P1 · Fiziksel kabul:** 320×568, %200 zoom, VoiceOver/TalkBack, iki gerçek telefon, PDF/DOCX açma ve
   Emine Öğretmen süre/anlaşılabilirlik testi otomasyonla ikame edilemez.

### 23.3 Exact kabul kapıları

| Kapı | Başarı ölçütü |
|---|---|
| UI-WEEK-01 | `IMPLEMENTED_UNVERIFIED`: `teacher-week-real-ui.spec.ts` gerçek UI ve salt-okunur final oracle sözleşmesiyle package kalite zincirine bağlıdır; bu tur koşulmadı. PASS/artifact olmadan kabul kapanmaz. Ayrıca aynı-profile replace restore, clean-profile restore veya offline continuity değildir. |
| CAL-NEG-01 | `IMPLEMENTED_UNVERIFIED`: MEB takvim negatifleri ve same-scope canlı `no_school` ortak paydaya bağlıdır. IAB'de 16 Eylül `no_school` gerçek formdan oluşturulup reload'da korundu; native-history geçiş yarışı kapandı. Runtime-integrity `8/8`, hedef `24/24`, migration `578/578`, typecheck/lint/runtime `36/36`, build PASS. Browser backup ve fiziksel kabul açık. |
| WEEK-TIME-01 | 18 Eylül sınıf bitiş saatinden bir saniye önce haftalık kayıt sıfır yazımla reddedilir; eşik anında yalnız beş expected gün tekil ve güncel complete kapanmışsa açılır. Perşembe planı/closure'ı silme negatifi değerlendirmeyi kapatır. |
| TODAY-PROJ-01 | `IMPLEMENTED_UNVERIFIED`: Today current teacher week, değerlendirme paneli ve commit aynı resolver/paydayı kullanıyor; ara tatilde `0 öğretim günü`, haftasız durumda etiketli Mon–Fri fallback, hatada fail-closed `invalid`. Teacher-week+teaching-days `10/10`, typecheck/lint yeşil; gerçek/fiziksel UI kabulü açık. |
| OFFLINE-01 | Çarşamba sonunda süreç kapatılır; ağ kapalı yeni süreç aynı profilde açılır ve perşembe–cuma yalnız UI'dan tamamlanır. Ağ veya servis seed bağımlılığı testi düşürür. |
| RESTORE-01 | UI haftasından indirilen şifreli dosya boş `userDataDir`a gerçek file input+parola+replace ile yüklenir; sınıf, kimlikler, 15 yoklama, 5 gün/etkinlik/gözlem/bağ/kapanış, haftalık karar ve belge projeksiyonu exact eşleşir. |
| VAULT-01 | Ham IndexedDB/recovery store denetiminde çocuk adı, gözlem, yoklama ve plan metni okunamaz; anahtar yönetimi, kesinti güvenli migration/rollback, kilit ve recovery tehdit modeli testlidir. |
| FULLDAY-01 | Ücretsiz öğretmen kendi boş tam/yarım gün bloklarını ekler, sıralar ve belgelendirir; premium hazır içerik ayrı entitlement altında kalır. Sınıf saatini aşan/çakışan/boşta bırakan akış görünür uyarı üretir. |
| INHERIT-01 | Hafta kapsamı günlük taslağa varsayılan gelir; beş gün aynı hedef/çocuk bilgisini yeniden yazmayı gerektirmez, öğretmen değişikliği açıkça override eder. |

### 23.4 Dalga 18 hükmü

Beklenen öğretim günü ve cuma sınıf-bitiş-saatinden önce hüküm verme açıkları domain katmanında kapandı;
öğretmen de aynı payda ve resmî/özel dayanağı haftalık değerlendirme paneli ile Today'de görebiliyor. Buna rağmen
tek gerçek UI/offline/clean-restore acceptance ve cihaz-at-rest şifreleme kapanmadı. Bu nedenle MR-033
`IN_PROGRESS`, ilgili dikey dilimler `IMPLEMENTED_UNVERIFIED`, ürün bütünü `NO-GO FOR REAL CHILD DATA`dır.

## 24. Dalga 19 — Bugün karar hiyerarşisi ve tekrar borcu

### 24.1 Kapatılan görünür tekrarlar

Hazırlık modunda öğretmenin henüz kullanamayacağı `Dönem kayıtları` ve eski çalışma döngüsü tamamen gizlendi;
yalnız gerçek hazırlık kararını taşıyan `Sıradaki iş` kaldı. Etkin dönemde beş adımlı stepper ile aynı ilerlemeyi
ikinci kez anlatan açıklama kaldırıldı; yıllık, aylık, haftalık ve günlük düzeyler 2×2 kompakt
`Dönem kayıtları` yüzeyinde aynı kalıcı kayıtlardan gösteriliyor. Gün kapanışında ayrıca gösterilen carry note,
zaten ayrı taşıma yaşam döngüsünde bulunduğu için tekrar edilmeden kaldırıldı; taşıma kaydının kendisi ve
append-only durumu korunuyor.

390×844 canlı IAB kanıtında yatay taşma yoktur (`scrollWidth=390`); kompakt dönem yüzeyi yaklaşık `281,8 px`,
gün kapanışı `78 px` yüksekliğindedir ve tekrarlanan carry metni yoktur. Hazırlık görünümünde
`nextAction=true`, `periodCards=false`, `oldCycle=false` ölçüldü. Odak testler `13/13`, profesyonel ana ekran
matrisi `5/5`, typecheck ve policy lint geçti. Bu kanıt görünür tekrarların kaldırıldığını gösterir; öğretmenin
doğru işi daha hızlı seçtiğini tek başına kanıtlamaz.

### 24.2 Eşanlı MARİF eleştirisi — açık kalan ana karar sorusu

1. **KAPANDI · GEREKSİZ P1:** Hazırlık modunda aynı dönem kilidini anlatan dönem kartları ve eski çalışma
   döngüsü render edilmiyor; tek gerçek `Sıradaki iş` kalıyor.
2. **KAPANDI · GEREKSİZ P1:** Etkin dönemde beş-adım stepper, tekrar açıklaması ve gün kapanışındaki ikinci
   carry metni kaldırıldı; kayıt veya görev yaşam döngüsü silinmedi.
3. **AÇIK · RİSKLİ P1:** Etkin dönemde `Sıradaki iş` + `Şimdi` + taşıma + `Bu hafta` + `Dönem kayıtları`
   birlikte kalır. Her bölüm tek başına doğru olsa da öğretmenin ilk bakışta hangi katmanı eylem, hangisini
   durum/bağlam olarak okuyacağı gerçek kullanım süresi ve yanlış dokunma oranıyla ölçülmedi.
4. **AÇIK · RİSKLİ P1:** 390×844 geometrisi; 320×568, %200 zoom, VoiceOver/TalkBack, metin büyütme ve gerçek
   sınıf yoğunluğunda bilişsel yük kabulünün yerine geçmez.

### 24.3 Ölçülebilir kabul kapısı

`TODAY-HIERARCHY-01 — IMPLEMENTED_UNVERIFIED`: Hazırlıkta yalnız bir ana eylem görünür; dönem kartı/eski döngü
DOM sayısı sıfırdır. Etkin dönemde 10 öğretmen, her biri en az beş farklı canlı durum senaryosunda, dış yardım
almadan doğru sıradaki işi medyan ≤10 saniye ve P90 ≤20 saniyede seçer; yanlış yüzeye ilk dokunma ≤%5,
geri dönüş gerektiren dolaşma ≤%10 ve görev tamamlama ≥%95 olur. Aynı kabul 320×568, %200 zoom ve en az bir
ekran okuyucuyla tekrarlanır. Bu kapı geçmeden ana ekran hiyerarşisi `VERIFIED` değildir.

### 24.4 Dalga 19 hükmü

Ana ekranın gözle görülür tekrar borcu önemli ölçüde azaltıldı ve hazırlık modu tek karara indirildi. Ancak
“profesyonel ve kullanışlı ana ekran” yalnız kart yüksekliği veya test sayısıyla kapanmaz. Etkin dönemde kalan
beş karar/durum katmanının öğretmen zihninde doğru önceliği kurduğu fiziksel pilotla ölçülene kadar bu dikey
dilim `IMPLEMENTED_UNVERIFIED` kalır; Dalga 18'in gerçek UI hafta, offline/clean restore ve at-rest P0 kapıları
aynen açıktır.

---

## 21. Dalga 17 — yüzey azaltma değil, kanıt yoğunluğunu artırma

Bu dalgada hedef “daha sade ekran” değildi. Hazırlık döneminde öğretmenin yapamayacağı günlük işleri tekrar
eden kartlar kaldırıldı; kalan alan gerçek planlama kararına bağlandı. Aynı turda premiumdan bağımsız öğretmen
plan grafiği gerçek UI üzerinden oluşturuldu, yeniden yüklemede korundu ve temel belge okuma modeli exact
plan→etkinlik→gözlem→öğretmen-onaylı program bağı zinciriyle sertleştirildi.

### 21.1 Kapanan dilimler

1. Hazırlıkta aynı eğitim-yılı kilidini tekrar eden `Şimdi`, gün kapanışı, boş gün planı ve gün içi çalışma
   yüzeyleri ilk görünümden çıkarıldı; MARİF uyarısı ve gerçek planlama eylemi korundu.
2. Tamamen boş cihazda kurulum merkezi ile MARİF'in aynı `Sınıfı kur` çağrısını tekrarlaması kaldırıldı;
   sınıf oluşana kadar yalnız dört adımlı kurulum merkezi ve tek etkin ana eylem render ediliyor.
3. `Planlamaya başla` gerçek `/plans` çalışma alanını açtı; öğretmen yıllık→aylık→haftalık omurgayı premium
   entitlement olmadan oluşturdu ve aynı IndexedDB oturumunda reload sonrasında geri açtı.
4. Plan omurgası mevcutken hazırlık metni artık yeni plan varmış gibi davranmıyor; günlük uygulamanın dönem
   başlangıcında açılacağını dürüstçe söylüyor.
5. Standalone export yalnız ID yazmakla yetinmiyor; activity, observation ve curriculum link scope/tarih/parent
   lineage bütünlüğünü yeniden kuruyor. `teacher-confirmed` olmayan link belge kanıtı sayılmıyor.

### 21.2 Mega yeniden eleştiri — sıradaki kırmızı kapılar

1. **P0 · Cihaz-at-rest güvenlik:** IndexedDB canlı kayıtları açık metindir. Şifreli yedek bunu telafi etmez;
   anahtar yönetimi, migration, rollback ve kurtarma kanıtı olmadan gerçek çocuk pilotu NO-GO'dur.
2. **P0 · Gerçek UI öğretmen haftası:** Aynı sınıfın Pazartesi–Cuma gerçek ekranlarla 15 yoklama, 5 günlük
   plan/uygulama, 5 gözlem+program bağı, 5 kapanış, haftalık karar, offline kill/reload ve temiz restore zinciri
   tek acceptance olarak hâlâ geçmemiştir.
3. **P0/P1 · Beklenen öğretim günleri:** Haftalık hazır olma yalnız mevcut daily planları saymamalı; eğitim
   takvimi, tatil ve beklenen öğretim günleri tanımlanmadan eksik gün sessizce yok sayılabilir.
4. **P0/P1 · Aylık nihai hüküm:** Dönem sonu kontrolü eklendi; ancak ayın beklenen tüm hafta/gün kapanışları
   olmadan sıfır kanıtlı `insufficient-evidence` kaydının nihai aylık kayıt sayılması ayrıca ürün politikasıyla
   sınırlandırılmalıdır.
5. **P1 · Tam günlük öğretmen modeli:** Premium snapshot dışında öğretmenin 10 bloklu tam gün akışını kuracağı
   genel model yok; çekirdek günlük plan hâlâ tek etkinlik merkezlidir.
6. **P1 · Belge gerçekliği:** Uygulama PDF üretim mesajını verdi, fakat IAB indirme olayı yakalanmadı. Fiziksel
   PDF/DOCX yeniden açma, günlük/haftalık/aylık mesleki form uygunluğu ve tüm-sayfa görsel QA tamamlanmalıdır.
7. **P1 · Erişilebilirlik ve süre:** 390×844 taşmasızdır; 320×568, %200, VoiceOver/TalkBack ve Emine Öğretmen
   süre/anlaşılabilirlik kabulü açık kalır.

### 21.3 Dalga 17 hükmü

Hazırlık ekranı artık daha az konuşup daha doğru karar gösteriyor; öğretmen plan omurgası gerçek UI'da var ve
kalıcıdır. Bu ürünün tamamlandığı anlamına gelmez. `LOCAL_UI_VERIFIED` ve `LOCAL_DOMAIN_VERIFIED` seviyesindeyiz;
at-rest kasa ile tek gerçek beş günlük UI/offline/restore journey kapanmadan `PRODUCT NO-GO` sürer.

---

## 22. Dalga 16 — kanonik haftanın veri omurgası ve yeni kırmızı liste

### 22.1 Bu dalgada kanıtlanan

Tek kurgu sınıfta Pazartesi–Cuma aynı IndexedDB zinciri; 15 yoklama, 5 günlük kayıt, 5 gerçek etkinlik,
5 değişmez gözlem, 5 öğretmen-onaylı program bağı, Çarşamba taşıma + Perşembe tarihsel uzlaştırma dahil
6 append-only kapanış, 5 güncel `complete` gün, W1 değerlendirmesi ve W2 `pending-teacher-review` önerisi
üretti. Aynı kaynak grafından gerçek PDF ve DOCX baytları oluşturuldu. Şifreli yedek ayrı hedef IndexedDB'ye
`replace` restore edildi; kanonik kayıt içeriği eşleşti. Weekly curriculum-link tahrifi, bir günün kapanışını
silme ve canonical biçimli sahte closure fingerprint ayrı ayrı reddedildi; hedef DB değişmedi. Aynı güne bağlı
ikinci daily plan hem değerlendirme commit'inde hem restore ilişkisinde fail-closed oldu. PASS artık bu
koşullardan bağımsız yazılamaz.

### 22.2 Eşanlı MARİF eleştirisi

1. **P0 · UI journey:** Bu kanıt domain/IndexedDB seviyesindedir; öğretmenin gerçek ürün düğmeleriyle beş gün
   yürüdüğünü kanıtlamaz.
2. **P0 · Gerçek günlük plan:** Fixture her gün tek 40 dakikalık etkinlik taşır. Tam/yarım günlük 10 bölümlü
   öğretmen planı veya dürüst `Etkinlik planı` ayrımı olmadan “5 günlük plan” hükmü eksiktir.
3. **P0 · Restore provenance yaşam döngüsü:** Weekly link, eksik kapanış ve closure fingerprint tahrifi kapandı.
   Kapanıştan sonra meşru semantik düzeltme yapılırsa geçmiş weekly evaluation'ın `stale → öğretmen yeniden
   onayı` yaşam döngüsü henüz kanonik değildir.
4. **P0 · Aylık final:** Ay-sonu tarih kapısı eklendi; ayın günlük kapanışları ve haftalık kararlarının tümünü
   isteyen nihai hazır-olma politikası tamamlanmadı.
5. **P0 · Güvenli kasa:** IndexedDB at-rest açık metindir; gerçek çocuk verisi pilotu NO-GO'dur.
6. **P1 · Mesleki belge:** PDF/DOCX gerçek bayttır fakat tek teknik yıllık dökümdür. Günlük, haftalık ve aylık
   seçili kapsam; öğretmen/okul/sınıf/imza alanları ve erişilebilir metin katmanı eksiktir.
7. **P1 · Zaman kuralı:** Aynı gün kapanışı sınıf çalışma saati bitmeden yazılabilir; erken kapanış için gerekçe
   ve ayrı durum yoktur.
8. **P1 · Takvim:** Tatil/öğretim dışı gün modeli yoktur; plan/yoklama yokluğu yanlış borca dönüşebilir.
9. **P1 · Tarihsel kadro:** `enrollmentDate` ve sürümlü enrollment geçmişi başlangıç tarafını düzeltti;
   history taşımayan legacy ayrılış için güvenilir `endedOn` migrationı gerekir.
10. **P1 · Kullanılabilirlik:** Today aynı kanıtı MARİF, Şimdi, hafta, çalışma döngüsü ve kapanışta tekrar edebilir;
    tek ana iş + kompakt hafta + progressive disclosure yeniden tasarımı fiziksel öğretmenle ölçülmelidir.
11. **Kapatılan yanlış güven · hazırlık haftası:** Eğitim yılı başlamadan önce takvimdeki geçmiş hafta artık
    `5 açık iş günü` sayılmaz; closure/week read-model'i seçili yılın sivil tarih sınırı dışında `not-configured`
    döner ve domain yazımı da kapanır. Hazırlık ekranındaki diğer disabled kart tekrarları yine P1'dir.

### 22.3 Sonraki yürütme sırası

`P0-A` gerçek UI beş günlük journey → `P0-B` tam günlük öğretmen plan modeli → `P0-C` production offline
kill/reload + clean file restore → `P0-D` at-rest encryption → `P0-E` stale değerlendirme yeniden-onay yaşam
döngüsü. Bunlarla eşanlı olarak
mesleki günlük/haftalık/aylık belge ailesi ve ana ekran karar yoğunluğu yeniden eleştirilecektir.

---

## 21. Dalga 15 — tek sınıfın beş günlük görünümü ve haftalık hüküm güvenliği

### 21.1 Uygulanan dikey dilim

Bugün ekranına bağımsız bir takvim süsü değil, aktif sınıfın aynı kayıtlarından türeyen Pazartesi–Cuma
çalışma görünümü eklendi. Her gün; plan tekilliği, yoklama, etkinlik, gözlem, program bağı ve gün kapanışını
aynı `academicYearId/classroomId/civilDate` kapsamında çözer. Eksiksiz kapanan gün, eksikle taşınan gün,
stale kapanış ve mükerrer günlük plan ayrı durumdur. Bugünün zaman-kritik işi geçmişteki sıradan eksikten
önce gelir; geçmiş `conflict/stale` güvenlik işleri ayrıca önceliklidir. Gün satırı gerçek takvim gününü açar.

### 21.2 Eşanlı MARİF eleştirisiyle aynı turda kapatılan P0'lar

| Eleştiri | Müdahale | Dürüst durum |
|---|---|---|
| Tek gözlem, devam eden hafta/ayı erken “değerlendir” görevine çeviriyordu. | Haftalık/aylık nihai değerlendirme yalnız dönem sonu veya geçmişte `attention`; dönem sürerken `izle`. | Domain/test yerel geçti. |
| Yetim ay/hafta başka planlarla aynı zincir gibi birleştirilebiliyordu. | Annual→monthly→weekly exact parent bağı zorunlu; günlük, seçili haftaya bağlıysa yalnız exact lineage'dan alınır. | Negatif testli. |
| İki günlük planın etkinlikleri birleşip gün complete kapanabiliyordu. | `daily-plan-conflict` ayrı kapanış issue'su; mükerrer günlük plan fail-closed. | Negatif testli. |
| Haftalık karar öğretmen-onaylı program bağı ve gün kapanışını atlayabiliyordu. | Her seçili gözlem için teacher-confirmed link; haftanın her gerçek günlük planı için güncel `complete` kapanış; hafta bitiş tarihi zorunlu. | Servis ve belge izi testli. |
| Yeni W1 değerlendirmesi hedef W2 karar geçmişini ezebilirdi. | Hedef haftada mevcut `nextPlanDecisionContext` varsa yeni öneri sıfır yazımla reddedilir. | Kod kapısı var; birleşik ikinci-öneri regresyonu sonraki kalite turunda ayrıca sabitlenecek. |
| Haftalık belge evaluation/link kimliğini göstermiyordu. | Yeni kayıtta `curriculumLinkIds`; belgeye evaluation ID + observation ID + program-link ID. Legacy kayıt salt-okunur kalır. | Kaynak ve odak testli. |
| Standalone PDF/DOCX ekranda görünen günlük planları ve gerçek etkinlikleri dışarıda bırakıyordu. | Export anında store'dan exact annual/monthly/weekly lineage yeniden okunur; günlük plan, gerçek etkinlik, varsa doğrulanmış 10 akış bölümü, observation ID ve program-link ID aynı belgeye girer. | Pozitif lineage/document testi yeşil; fiziksel PDF/DOCX açma ve tüm-sayfa görsel QA açık. |

### 21.3 Kalan mega kırmızı liste

1. **P0 · Gerçek beş günlük journey:** Yeni read-model beş günü doğru çözüyor; fakat production servisleriyle
   15 yoklama + 5 uygulama + 5 immutable gözlem/link + 5 kapanış tek IndexedDB yolculuğunda henüz çalıştırılmadı.
2. **P0 · At-rest güvenlik:** IndexedDB açık metin olduğu sürece gerçek çocuk verisi pilotu NO-GO.
3. **P1 · Belge kabulü:** Günlük kayıt zinciri export'a girdi; fakat fiziksel PDF/DOCX açma, tüm-sayfa görsel QA,
   belge önizleme ve son öğretmen onayı henüz yok.
4. **P1 · Today hiyerarşisi:** MARİF, Şimdi, hafta, çalışma döngüsü ve kapanış aynı kanıtı tekrar edebilir.
   Tek ana sıradaki iş korunup ikincil bağlam progressive disclosure ile sıkılaştırılmalıdır.
5. **P1 · Dönem işletimi:** Var olan teacher graph'a ay/hafta ekleyen atomik servis ve plan çatışması için
   öğretmen kontrollü koru/arşivle kararı yok.
6. **P1 · Belge önizleme:** PDF/DOCX indirmeden önce düzenlenebilir önizleme/son öğretmen onayı yok.
7. **P1 · Erişilebilirlik/fiziksel kanıt:** 320×568, %200, VoiceOver/TalkBack ve Emine Öğretmen süre ölçümü açık.

### 21.4 Dalga 15 hükmü

Beş günlük hafta artık ana ekranda gerçek kayıt durumlarıyla görünür ve üç yanlış güven yolu kapatılmıştır.
Haftalık karar da program bağı ile gün kapanışını atlayamaz. Standalone plan belgesi artık aynı lineage'daki
günlük plan/etkinlik/kanıt kimliklerini de taşır. Buna rağmen tek gerçek Pazartesi–Cuma journey,
fiziksel belge kabulü, offline kill/restore ve at-rest güvenlik
kapanmadan MR-033 `IN_PROGRESS`, ürün bütünü `NO-GO FOR REAL CHILD DATA` kalır.

---

## 19. Dalga 13 — MARİF öneri → öğretmen kararı → plan revizyonu döngüsü

### 19.1 Kapatılan kök kopukluk

MARİF'in ilk brifingi yalnız doğru ekrana yönlendiriyordu. Haftalık değerlendirme W2'ye kanıt ve
öğretmen yansıtması taşısa da öğretmen öneriyi kabul edemiyor, reddedemiyor veya geri alamıyordu.
Bu nedenle uygulama “öneren ajan” değil, yalnız bildirim panosu düzeyinde kalıyordu.

Yeni dikey dilim:

1. W1'in değişmez gözlem kimlikleri ve öğretmen değerlendirmesi W2'ye kaynaklı öneri üretir.
2. W2 içeriği öğretmenin kararı gelene kadar byte olarak değişmez.
3. Öğretmen kanıt özetini ve yansıtmayı görür; W2'ye yazılacak son metni kendisi düzenler.
4. `Düzenleyip kabul et` yeni bir plan revizyonu oluşturur; önceki plan içeriği değişmez snapshot olarak kalır.
5. `Gerekçeyle reddet` plan içeriğini değiştirmez fakat karar izini append-only saklar.
6. `Kararı yeniden aç ve geri al`, kabulden sonra başka revizyon yoksa kabul öncesi plan içeriğini geri yükler;
   araya başka revizyon girdiyse fail-closed durur.
7. Aynı kararın ağ/yenileme sonrası tekrar gönderimi yeni revizyon üretmez.

### 19.2 Eleştiri → müdahale → yeniden eleştiri

| Eleştiri | Müdahale | Yerel kanıt | Açık kalan |
|---|---|---|---|
| Öneri “sihirli” ve gerekçesiz görünüyordu. | Kanıt özeti, öğretmen yansıtması, kaynak değerlendirme UUID'si ve hedef revizyon birlikte görünür. | W1→W2 domain senaryosu ve kaynak UI sözleşmesi geçti. | Kayıt kimliği ayrıntılarını öğretmen dilinde açan ayrı iz paneli yok. |
| Ajan öğretmen adına sessiz plan değiştirebilirdi. | `pending-teacher-review` durumunda W2 içeriği değişmez; yalnız explicit kabul planı revize eder. | Kabul öncesi içerik eşitliği ve kabul sonrası revision `1→2` testli. | Aylık öneride aynı komut yaşam döngüsü yok. |
| Ret kaybolabilir veya yalnız ekranda kalabilirdi. | Ret gerekçesi append-only `reviewHistory` olayına ve belge metnine girer. | Guard, doküman üretimi ve reload sözleşmesi testli. | Fiziksel PDF/DOCX yeniden açma bu dalgada tekrarlanmadı. |
| Yanlış kabul geri alınamazdı. | Kabul öncesi snapshot bulunursa `reopened` olayıyla içerik geri yüklenir; ara revizyon varsa otomatik overwrite yasaktır. | Kabul→idempotent retry→geri aç testinde revision `1→2→3`, özgün içerik exact döndü. | Birden fazla ardışık önerinin aynı hedef haftada birleştirme politikası yok. |
| Backup restore kararı bekliyormuş gibi yanlış gösterebilirdi. | `accepted/rejected/pending`, review history ve `teacherReviewRequired` birbirine bağlı strict doğrulanır. | Şema source/evaluation/target revision zincirini ve status tutarlılığını doğrular. | In-app Browser kuralı gereği bu turda ayrı Playwright CLI backup testi çalıştırılmadı; mevcut runtime backup testi sonraki birleşik kapıda yeniden koşturulmalı. |
| Hazırlık ekranı planın şimdi kurulabileceğini söylüyor fakat kalıcı yazım bunu reddediyordu. | Öğretmen plan grafiği oluşturma komutu, yalnız kendi dönem başlangıç tarihi için tanımlı hazırlık istisnasını commit anında yeniden doğrular. Günlük uygulama ve değerlendirme yazımları bu istisnayı almaz. | Temiz origin'de sınıf+çocuk kurulup 2026–2027 plan grafiği gerçek düğmelerle oluşturuldu. | Fiziksel cihaz ve gece yarısı/clock-skew kapıları açıktır. |
| Başlangıç sihirbazı yalnız W1 üretiyor, dolayısıyla W1→W2 önerisi normal UI'den erişilemiyordu. | Aynı ay sınırları içinde sığan W2 otomatik başlangıç taslağına ve atomik grafa eklendi; W1 ve W2 metinleri öğretmen tarafından ayrı girilir. | Temiz 390×844 oturumda `1–6 Eylül` ve `7–13 Eylül` haftaları aynı `Plan zincirim` ekranında revision 1 olarak açıldı. | Gerçek kanıt üretimi dönem başlamadan yapılmadı; carry karar paneli sentetik kayıtla PASS sayılmadı. |

### 19.3 Eşanlı mega yeniden eleştiri

1. **P0 · Komut kapsamı:** İlk gerçek yaşam döngüsü yalnız haftalık carry içindir. Günlük plan önerisi, aylık
   sonraki-ay önerisi, belge hazırlama ve kanıt açığı için aynı taslak/önizleme/onay/geri-al sözleşmesi yoktur.
2. **P0 · Beş günlük kanonik yolculuk:** Tek domain senaryosu bütün öğretmen haftası değildir. 15 yoklama,
   5 uygulama, 5 gözlem/bağ, 5 kapanış ve W1→W2 kararı aynı cihaz kimlikleriyle çalıştırılmalıdır.
3. **P0 · At-rest güvenlik:** Yerel IndexedDB hâlâ açık metindir; gerçek çocuk verisi pilotu NO-GO kalır.
4. **P0 · Offline/restore:** Kabul sırasında process kill, refresh read failure, offline reload ve temiz profile
   restore sonrasında aynı event/revision kimlikleri kanıtlanmalıdır.
5. **P1 · Öneri birleşimi:** Aynı hedef haftaya birden fazla kaynak öneri gelirse otomatik son-yazan-kazan
   yapılamaz; öğretmen kontrollü karşılaştır/merge politikası gereklidir.
6. **P1 · Anlaşılabilirlik:** “Revizyon”, “kaynak değerlendirme UUID'si” ve “geri aç” dili Emine Öğretmen ile
   ölçülmeden profesyonel görünüm kullanılabilirlik kanıtı değildir.
7. **P1 · Görsel yoğunluk:** Today'deki hazırlık kartı, dönem uyarısı ve MARİF brifingi aynı eksikliği kısmen
   tekrar ediyor; ilk mobil görünümde bilgi tekrarını azaltan fakat kanıtı saklamayan hiyerarşi gerekir.
8. **P1 · Haftalık ekran yoğunluğu:** İki hafta görünür ve eylemler gerçek olsa da her haftada iki tam genişlik
   düğmesi aynı ağırlıktadır. Aktif hafta, değerlendirme hazır oluşu ve yalnız okunur durum tek bakışta daha güçlü
   ayrıştırılmalıdır.

### 19.4 Dalga 13 hükmü

MARİF ilk kez salt yönlendirmeden çıkarak kanıta dayalı bir öneriyi öğretmenin düzenleme, kabul, ret ve geri alma
kararına bağlamaktadır. Bu önemli ama dar bir dikey dilimdir. Ultra-agent hedefi tamamlanmış sayılmaz; aynı güvenli
komut modeli günlük, aylık, belge ve kanıt açıklarına genişletilmeden ve kanonik öğretmen haftası/fiziksel cihaz
kapıları geçmeden durum `IMPLEMENTED_UNVERIFIED` kalır.

---

## 18. Dalga 12 — MARİF cihaz-içi öğretmen brifingi

### 18.1 Neden yeni bir kart değil, komuta katmanı?

Önceki Today ekranı öğretmen çalışma döngüsünü doğru sayaçlarla gösteriyordu; ancak önem sırasını öğretmenin
kendisi dört kart arasında kuruyordu. Kullanıcının istediği ajan davranışı; sınıfın canlı durumunu okumak,
çelişkileri eleştirmek, nedenini göstermek ve tek bir sonraki gerçek eyleme yönlendirmektir. İlk dikey dilim
üretken yapay zekâ veya dış servis kullanmaz; kanonik cihaz kayıtlarından deterministik ve denetlenebilir bir
brifing üretir.

| Eleştiri | Uygulanan davranış | Kanıt | Kalan sınır |
|---|---|---|---|
| Dashboard durum gösteriyor fakat “önce ne yapmalıyım?” kararını öğretmene bırakıyordu. | MARİF; kurulum → eğitim yılı güvenliği → taşınan iş → yoklama → daily conflict/plan → uygulama → program bağı → kapanış → haftalık → aylık → belge sırasını canlı read-modelden çözer ve tek ana eylem sunar. | Saf karar matrisi 4/4; komşu Today kontrolüyle toplam 7/7. | Öncelik politikası gerçek öğretmen pilotunda süre ve yanlış öneri oranıyla ölçülmeli. |
| Öneri gerekçesiz “sihirli” görünebilirdi. | Her brifing kurulum, yoklama, bekleyen program bağı ve taşınan iş sayılarını gösterir; en fazla dört eleştiri başlık+gerekçeyle açılır. | Canlı yerel oturumda `Kurulum 2/4`, `Yoklama 0/3`, eksik plan ve hazırlık kilidi aynı kartta doğrulandı. | Kanıtların kayıt kimliği seviyesinde ayrıntılı iz görünümü sonraki dilimdir. |
| Ajan öğretmen adına sessiz kayıt yapabilirdi. | Brifing salt-okunurdur; yalnız mevcut gerçek akışa yönlendirir ve “siz açıp onaylamadan kayıt oluşturmaz” sınırını açık yazar. | Planlamaya başla eylemi canlı oturumda `/plans` çalışma alanını açtı; persistence gate yoktu ve yeni kayıt yazılmadı. | Taslak öneri → etki önizleme → açık onay → uygula → geri al komut modeli henüz yok. |
| “MARİF” adı dış yapay zekâya veri gönderildiği izlenimi yaratabilirdi. | İlk sürüm cihaz içi, deterministik ve veri göndermeyen öğretmen asistanı olarak etiketlendi. | Kod bağımlılığı veya network çağrısı yok; fonksiyon yalnız mevcut read-model girdilerini alır. | Uygulama anayasasında geliştirme ajanı MARİF ile cihaz-içi öğretmen asistanı ad ayrımı ADR ile kanonikleştirilmeli. |

### 18.2 Eşanlı yeniden eleştiri — yeni kırmızı liste

1. **P0 · Ajan komut yaşam döngüsü:** Brifing yönlendiriyor; henüz öğretmenin niyetinden taslak plan/değerlendirme
   önerisi üretip kanıtlarını gösteren, düzenle/onayla/reddet, etkileri önizle, uygula ve geri al zinciri yok.
2. **P0 · Kanonik beş günlük journey:** MARİF'in doğru öneri sırası ancak aynı sınıfta beş gün boyunca gerçek
   kayıtlarla yanlış öncelik/duplicate üretmeden kanıtlanabilir.
3. **P0 · At-rest şifreleme:** Cihaz-içi olmak tek başına güvenli kasa değildir; IndexedDB açık metin kaldığı için
   gerçek çocuk verisi pilotu NO-GO'dur.
4. **P0 · Production offline/clean restore:** Ajan brifingi offline reload ve temiz restore sonrasında aynı kayıt
   kimliklerinden aynı kararı üretmelidir.
5. **P1 · Kaynak ayrımı:** Geliştirme orkestratörü MARİF ile uygulama içindeki deterministik öğretmen asistanı
   aynı adla anılıyor; yetki ve veri sınırı ayrı ADR/UI metniyle netleştirilmelidir.
6. **P1 · Gerçek plan başlangıcı:** Canlı sınıfta teacher-owned graf yoksa aylık/haftalık iş create formuna düşer;
   kurulu provider planını öğretmenin kendi kararlarıyla güvenli bir çalışma kopyasına dönüştürme akışı eksiktir.
7. **P1 · Erişilebilirlik ve fiziksel süre:** Kartın 320×568/200%, VoiceOver/TalkBack ve Emine Öğretmen karar süresi
   fiziksel cihazda ölçülmeden görünür başarı `VERIFIED` sayılamaz.

### 18.3 Dalga 12 hükmü

MARİF artık yalnız geliştirme belgelerinde bir eleştirmen değildir; uygulamada da canlı sınıf kayıtlarından
tek sonraki işi, dayanağı ve eşanlı risk eleştirisini gösteren ilk cihaz-içi dikey dilime sahiptir. Bu, kullanıcının
“öğretmen rolüyle agentlik” beklentisine gerçek bir başlangıçtır; fakat ultra-agent tamamlanmış değildir.
Taslak/önizleme/onay/uygula/geri-al komut yaşam döngüsü ve beş günlük kanonik yolculuk kapanmadan durum
`IMPLEMENTED_UNVERIFIED` kalır.

---

## 20. Dalga 14 — aylık değerlendirme → sonraki ay önerisi → öğretmen hükmü

### 20.1 Kapatılan zincir kopukluğu

Öğretmene ait üç yönlü aylık değerlendirme daha önce yalnız `nextMonthRecommendation` metni üretiyordu.
Öneri belirli bir sonraki ay planına bağlanmıyor; öğretmen düzenleyip kabul, gerekçeyle ret veya geri açma
kararı veremiyordu. Bu dalga, haftalık karar sözleşmesini aylık döneme genişletti:

1. Yıllık grafikte kaynak ayın hemen ardındaki hedef ay exact kimlikle bulunur; ay atlama veya başka yıllık
   plana taşıma reddedilir.
2. Aylık değerlendirme, hedef ayın öneri anındaki revizyonunu da mühürler.
3. Hedef ay `pending-teacher-review` olur fakat plan içeriği öğretmen kararı gelene kadar değişmez.
4. Öğretmen öneriyi kendi aylık plan metnine dönüştürerek kabul eder veya gerekçeyle reddeder.
5. Kabul, ret ve yeniden açma append-only geçmişe yazılır; aynı ağ tekrarında yeni revizyon oluşmaz.
6. Kabulden sonra başka plan revizyonu varsa otomatik geri alma fail-closed kalır.
7. Karar durumu, kaynak değerlendirme kimliği ve geçmiş; temel PDF/DOCX paragraf modeline ve şifreli yedeğe girer.

### 20.2 Eşanlı eleştiriyle bulunan ve aynı dalgada düzeltilen kullanım hatası

Temiz gerçek tarayıcı oturumunda eğitim yılı başlamadan aylık form açılıyor, öğretmen 23 ölçüt ve dört anlatı
alanını doldurduktan sonra commit-time dönem kilidiyle reddediliyordu. Veri güvenliği doğruydu; kullanım davranışı
yanlıştı. Yeni görünüm plan omurgası oluşturma ve revizyonunu hazırlıkta açık bırakırken haftalık/aylık
değerlendirme ile carry kararlarını önceden kilitler, aynı ekranda açık gerekçe ve `aria-describedby` sunar.
Plan revizyonu da planın kendi `periodStart` değeriyle hazırlık istisnasını commit anında yeniden doğrular.

### 20.3 Kanıt matrisi

| Kapı | Sonuç | Dürüst sınır |
|---|---|---|
| Domain kabul→idempotent retry→geri aç→ret | Geçti; hedef ay içeriği pending/ret durumunda değişmedi, geçmiş append-only kaldı. | Çoklu kaynak aylık öneri merge politikası yok. |
| Strict backup/restore | Gerçek IAB/IndexedDB probunda accepted durum, evaluation ID ve karar geçmişi exact döndü; kaynak/target recommendation tahrifi reddedildi, hedef DB değişmedi. | Fiziksel telefonda şifreli dosya indirme→temiz cihaz restore turu bu dalgada yapılmadı. |
| Normal 390×844 UI | Temiz origin'de sınıf+çocuk kuruldu; Eylül iki hafta + Ekim bir hafta grafiği gerçek düğmelerle oluşturuldu. | Aktif ay sonu gerçek iki haftalık kanıt bu tarihte yok; sufficient-evidence sahte veriyle PASS sayılmadı. |
| Hazırlık modu | Formu doldurup en sonda ret veren akış yeniden eleştirildi; değerlendirme düğmeleri en baştan görünür nedenle disabled, plan revizyonu revision 2 olarak çalıştı. | Emine Öğretmen ve ekran okuyucu fiziksel kabulü açık. |
| Yerel kalite | Feature/migration, typecheck, policy lint ve runtime bütünlük kapıları geçti. | Production deploy yapılmadı. |

### 20.4 Mega yeniden eleştiri — sonraki kırmızı liste

1. **P0 · Beş günlük tek journey:** Aylık kararın çalışması, aynı sınıfın 15 yoklama, 5 uygulama, 5 gözlem/bağ,
   5 kapanış ve haftalık kararını tek kimlik zincirinde doğrulamaz.
2. **P0 · At-rest güvenlik:** IndexedDB açık metin kaldığı sürece gerçek çocuk verisi pilotu NO-GO'dur.
3. **P0 · Production offline/clean restore:** Aylık karar sırasında process-kill, offline retry ve temiz fiziksel
   cihaz restore exact revision/event kimlikleriyle kanıtlanmalıdır.
4. **P1 · Çoklu öneri çatışması:** Bir hedef aya birden fazla kaynak değerlendirme gelirse otomatik overwrite
   yasaktır; öğretmen kontrollü karşılaştır/birleştir politikası gerekir.
5. **P1 · Dönem seçimi:** Başlangıç sihirbazı bugün yalnız mevcut ay + sonraki ay üretir. Tam eğitim yılı aylarını
   öğretmenin takvim sınırlarıyla oluşturup kapatacağı dönem editörü eksiktir.
6. **P1 · Görsel yoğunluk:** Plan zincirinde her ay ve haftanın düzenle/değerlendir düğmeleri aynı ağırlıktadır;
   aktif dönem, değerlendirme hazır oluşu ve karar bekleyen hedef ay daha güçlü ayrıştırılmalıdır.
7. **P1 · Belge kullanılabilirliği:** Kaynak paragraf modeli güncel olsa da aylık karar içeren gerçek PDF/DOCX'in
   tüm sayfa görsel ve Word yeniden-açma QA'sı bu dalgada tekrarlanmadı.
8. **P1 · MARİF komut kapsamı:** Güvenli karar yaşam döngüsü haftalık ve aylıkta var; günlük kanıt açığı,
   belge hazırlama ve sınıf görev önerilerinde aynı taslak/etki/onay/geri-al sözleşmesi yoktur.

### 20.5 Dalga 14 hükmü

MARİF artık önceki ay değerlendirmesini belirli bir sonraki ay planına bağlayıp öğretmenin açık hükmüyle
revizyona dönüştürebilir. Bu, ultra-agent hedefine gerçek bir ikinci komut dikey dilimidir; fakat bütün öğretmen
haftası, güvenli yerel kasa, fiziksel cihaz ve çoklu öneri çatışması kapanmadan durum
`IMPLEMENTED_UNVERIFIED` kalır.
## Dalga 20 — öğretmen günlük akışı master kapıları

Dalga 20'nin hedefi yeni bir kart eklemek değil, öğretmenin premiumdan bağımsız günlük planını kalıcı ve
kanıtlanabilir bir iş ürünü hâline getirmektir. Yerel uygulama artık 10 bölümü sınıf çalışma süresine bağlar,
öğretmenin açık inceleme onayını UTC+yerel öğretmen kimliğiyle saklar, revizyon geçmişini korur ve tek gerçek
etkinliği çoğaltmaz.

### Uygulanan kapılar

- `PROV-01 · IMPLEMENTED_UNVERIFIED`: explicit 10 blok + `teacher-reviewed` onay olmadan create yok;
  revizyonda önceki onay snapshot'ı korunur.
- `SEMANTIC-01 · IMPLEMENTED_UNVERIFIED`: en az bir uygulanacak bölüm; exact sınıf süresi; bozuk sıra,
  süre, UUID, sağlayıcı alanı ve all-skipped fail-closed.
- `RESTORE-DAILY-01 · LOCAL_VERIFIED`: exact flow/revision/onay restore; tahrif ret; target değişmez;
  flowsuz eski günlük plan korunur.
- `A11Y-DAILY-01 · IMPLEMENTED_UNVERIFIED`: ayırt edilebilir summary adı, ≥44 px kontroller ve canlı-anons
  gürültüsünün azaltılması; fiziksel ekran okuyucu kanıtı açık.

### Sıradaki master sıra

1. Etkinliği exact günlük akış bölümüyle bağla; bozuk/eksik bağ backup ve export'ta fail-closed olsun.
2. Haftadan/önceki günden akış getir; öğretmen yalnız istisnaları değiştirerek sonraki gün planını ≤90 sn'de kursun.
3. Günlük, haftalık, aylık ve birleşik belge türlerini önizleme→öğretmen onayı→PDF/DOCX akışına ayır.
4. Güncellenmiş seedless 5 günlük UI acceptance'ı aynı browser profilinde çalıştır; sonra production offline kill
   ve boş profile file-picker restore.
5. At-rest kasa/migration/anahtar kurtarma kapanmadan gerçek çocuk pilotu açma.

Bu dalga günlük planı “tek etkinlikten ibaret” olmaktan çıkardı; dünya seviyesinde öğretmen iş akışı hükmü
henüz verilmez. İş yükü, belge uygunluğu, exact uygulama-bölüm bağı ve gerçek beş günlük süre kanıtı açık kalır.

## Dalga 21 — öğretmen akışını uygulama ve belgeyle kapatma

Dalga 21'in ana kararı, günlük akış bölümünü yalnız bir form satırı olmaktan çıkarıp gerçek uygulama kanıtının
kimliği hâline getirmektir. Etkinlik artık aynı planın uygulanacak bölümüne bağlanır; Today, gözlem, yedek,
restore ve belge aynı `flowBlockId` değerini doğrular. Bu bağ bozuksa sessiz fallback veya başka bölüm seçimi
yoktur.

### Uygulanan master kapılar

- `LINK-01 · IMPLEMENTED_UNVERIFIED`: exact activity→flowBlock bağı; yabancı/bilinmeyen/skipped bağda sıfır
  yazım; Today'de on bölüm ve tek gerçek etkinlik; observation yalnız bağlı bölümden; restore/export exact bağ.
- `COPY-DAY-01 · IMPLEMENTED_UNVERIFIED`: aynı haftadaki en yakın önceki gün için fark önizlemeli `Dünden
  getir`; yeni UUID; activity/observation kopyalamama; yeniden öğretmen onayı.
- `DOC-SCOPE-01 · IMPLEMENTED_UNVERIFIED`: günlük/haftalık/aylık/birleşik kapsam, önizleme, exact revizyon
  imzası, açık öğretmen onayı ve ardından PDF/DOCX; Türkçe öğretmen gövdesi + teknik denetim eki.
- `NOOP-BALANCE-01 · IMPLEMENTED_UNVERIFIED`: zaten eşit dağılımda dengeleme eylemi pasif; no-op öğretmen
  onayını düşürmez.
- `LEGACY-TRUTH-01 · IMPLEMENTED_UNVERIFIED`: flowsuz eski kayıt “1 akış bölümü” diye uydurulmaz; açıkça
  eski tek-etkinlik planı olarak gösterilir.

### Yeniden önceliklendirilmiş master sıra

1. `WEEK-TEMPLATE-01`: Haftadan getir/önceki gün karşılaştırması, yalnız istisnaları değiştir ve sonraki gün
   P90 ≤90 sn saha bütçesi.
2. `DELTA-DURATION-01`: Seçilen esnek bölümden dakika aktarımı; optional/skipped/gap semantiğinin belge ve
   kapanışta aynı yorumu.
3. `REAL-WEEK-UI-01`: mutation seed olmadan beş gün, 15 yoklama, beş uygulama/gözlem/bağ/kapanış, haftalık
   karar, scoped document, offline kill ve temiz profile file-picker restore.
4. `DOC-RENDER-01`: günlük/haftalık/aylık Türkçe form mizanpajı, önizlenen revizyonla byte çıktısı, tüm sayfa
   PDF render, gerçek Word yeniden-açma ve fiziksel telefon indirme.
5. `AT-REST-01`: şifreli yerel kasa, migrasyon, anahtar kurtarma, crash-safe rollback; kapanmadan gerçek çocuk
   verisiyle pilot yok.
6. `PHYSICAL-A11Y-01`: 320×568, %200, VoiceOver/TalkBack, Android+iPhone ve Emine Öğretmen süre/yanlış-dokunma
   kabulü.

Bu dalga üç önceki kırmızıyı — uygulama-bölüm kopukluğu, her günü sıfırdan yazma ve teknik belgeyi öğretmen
formu gibi sunma — dar ama gerçek dikey zincirlerle kapattı. Sonraki çalışma artık daha fazla kart değil;
öğretmen süresini azaltma, tam haftayı gerçek cihazda yürütme ve yerel veriyi şifreleme eksenindedir.

## Dalga 22 — istisna odaklı planlama ve mobil yeniden eleştiri

Dalga 22, “dünden getir” kolaylığını haftanın tüm önceki öğretmen planlarına genişletti. Öğretmen kaynak günü
ve planı görür, fark sayısını inceleyip taslağı uygular; yeni gün yeni bölüm kimlikleri alırken kaynak plan,
hafta ve revizyon kalıcı provenance olarak korunur. Yanlış revizyon veya başka hafta kaynağı yazımdan önce
reddedilir; etkinlik ve gözlem kopyalanmaz.

### Uygulanan master kapılar

- `WEEK-TEMPLATE-01 · IMPLEMENTED_UNVERIFIED`: haftadaki tüm geçerli önceki günler deterministik listelenir;
  kaynak gün/plan/revizyon kalıcıdır; sahte revizyon sıfır yazımla reddedilir.
- `DELTA-DURATION-01 · IMPLEMENTED_UNVERIFIED`: süre farkı için tek esnek bölümde exact dakika ekle/azalt
  eylemi; bütün kişiselleştirmeyi sıfırlayan eşit dağıt ikincil kalır.
- `SKIPPED-TRUTH-01 · IMPLEMENTED_UNVERIFIED`: uygulanmayacak dakikalar “uygulandı” sayılmaz; takvimde açık
  zaman olarak görünür.
- `MOBILE-REFLOW-01 · LOCAL_VERIFIED`: gerçek 390 px tarayıcı denetiminde bulunan yatay taşma aynı turda
  düzeltildi; süre uyarısı ve eylemleri dar ekranda satır kırar, yatay kaydırma oluşturmaz.

### Dalga 22 sonrası dürüst açık sıra

1. `REAL-WEEK-UI-01`: seed olmadan beş gün ve fiziksel öğretmen süre bütçesi; P90 ≤90 saniye iddiası henüz yok.
2. `OFFLINE-CLEAN-RESTORE-01`: aynı haftanın offline kill/reload ve boş profilde dosya seçicili restore kanıtı.
3. `DOC-RENDER-01`: günlük/haftalık/aylık PDF tüm sayfa render, Word yeniden açma ve fiziksel indirme.
4. `PHYSICAL-A11Y-01`: %200, VoiceOver/TalkBack, Android+iPhone ve 320×568.
5. `AT-REST-01`: yerel kasa/migration/anahtar kurtarma; kapanmadan gerçek çocuk verisi pilotu yok.

Bu dalga öğretmenin her yeni günü elli alanı yeniden doldurmasını azaltır ve süre istisnasını tek eyleme
indirir. Ancak otomatik test, yerel IAB ve responsive ekran kanıtı öğretmen saha süresi yerine geçmez.
