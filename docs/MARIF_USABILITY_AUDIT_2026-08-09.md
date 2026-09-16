# MaarifOS Öğretmen-Rolü Kullanılabilirlik Denetimi — 2026-08-09

## Hüküm

MaarifOS'un yerel vNext sürümü, önceki “özellik kartları gösteren prototip”
izleniminden öğretmenin o anki işini yöneten bir ürüne doğru belirgin biçimde
ilerledi. Bugün ekranı, beşli alt navigasyon, doğrudan kayıt menüsü, hızlı
gözlem hazırlık durumu, sticky plan kaydı ve premium salt-okunur sınırı yerelde
uygulanmıştır.

Buna rağmen ürün bütünü “tam profesyonel öğretmen sistemi” olarak kabul edilemez.
`Sınıfım` artık günlük görev ve kanıt durumunu yöneten bir kontrol merkezidir;
ancak değerlendirme → belge → reload/offline → restore zinciri bu vNext ile tek gerçek telefon oturumunda
yeniden geçilmemiştir; iki fiziksel telefon ve ücretli premium yolu açıktır.

Bu belge sadeleştirme raporu değildir. Eksik yeteneği, kopuk akışı, görünmez
durumu, yanlış erişim sınırını ve gereksiz bilişsel yükü birlikte ele alır.

## Denetim kapsamı ve kanıt sözleşmesi

- Kullanıcı rolü: sınıfta çalışan okul öncesi öğretmeni.
- Ana amaç: uygulamayı açıp günün durumunu anlamak; yoklama, plan, gözlem,
  değerlendirme ve belge işini telefon üzerinden kesintisiz tamamlamak.
- Görsel denetim: 390×844 yerel in-app Browser; aynı görünümde eylem sonrası DOM
  durumu ve karşılaştırma görüntüsü gereken yerlerde birlikte incelendi.
- Kod/test kanıtı: yalnız bu iş paketinde raporlanmış odak testleri, typecheck,
  lint, runtime koruması ve build sonuçları kullanıldı.
- `YEREL DÜZELTİLDİ`: kod ve yerel kanıt var; production/fiziksel telefon iddiası yok.
- `KISMİ`: riskin bir bölümü giderildi; temel kabul senaryosu açık.
- `AÇIK`: gerekli ürün davranışı henüz uygulanmadı veya doğrulanmadı.

Ekran görüntüsü tek başına canlı kabul sayılmaz. Eylem, görünür durum, kalıcı veri,
reload/offline ve gerekiyorsa belge çıktısı birlikte kanıtlanmalıdır.

## Mega bulgu ve çözüm matrisi

| Öncelik | Alan | Öğretmen açısından sorun | Entegre çözüm / karar | Durum | Kapanış kapısı |
|---|---|---|---|---|---|
| P0 | Bugün ana ekranı | Premium tanıtım kartı ilk görünümü işgal ediyor; öğretmen “bugün kim geldi, sırada ne var, hangi iş bekliyor?” sorularının yanıtını taramak zorunda kalıyordu. | İlk görünüm `Öğretmen kontrolü · Şimdi` olarak yeniden düzenlendi: yoklama, sıradaki gerçek plan, bekleyen program bağlantısı, taslak/cihaz durumu ve eğitim-yılı modu aynı karar alanında. Premium ikincil katmana çekildi. | `YEREL DÜZELTİLDİ` | Gerçek aktif eğitim yılı, dolu sınıf, planlı/plansız gün, hata ve offline durumları fiziksel telefonda geçmeli. |
| P0 | Bilgi mimarisi | Yalnız `Bugün / Sınıfım / Kayıt Ekle` navigasyonu öğretmenin plan ve belge işini gizliyor; alt çubuk ürünün gerçek kapsamını yansıtmıyordu. | Beş kalıcı hedef: `Bugün / Sınıfım / Kayıt Ekle / Planlar / Belgeler`. Merkez kayıt eylemi görsel olarak ayrıldı; aktif hedef semantik olarak işaretleniyor. | `YEREL DÜZELTİLDİ` | Her hedef eylem + yeni DOM + geri dönüş odağı + deep-link/reload ile aynı mobil turda kanıtlanmalı. |
| P0 | “Düğmeler çalışmıyor” algısı | Kontrol tıklansa bile seçimin sonucu görünmüyor veya kaydet düğmesi neden kapalı olduğunu söylemiyordu; kullanıcı bunu arıza olarak algılıyordu. | Seçili fikir/hedef/çocuk için `Seçildi` ve `aria-pressed`; kayıt alanında tek, somut engel nedeni; hazır durumda görünür onay; route ve sheet açılışlarında duyuru eklendi. Canlı denetimde anlık gözlem bağlamının plan başlatmayı engellediği ve hata görünmesine rağmen planın kısmen yazıldığı ayrıca bulundu; plan+ilk etkinlik artık tek atomik işlemde başlıyor ve anlık gözlem bağlamı gerçek etkinlik çakışması sayılmıyor. | `KISMİ` | Bütün birincil kontroller için başarılı, bloke, yükleniyor ve hata durumları etkileşim matrisiyle taranmalı. |
| P0 | Eğitim-yılı güvenliği | Ekran açılırken kontrol edilse bile bekleyen gözlem, program bağı, değerlendirme veya plan kaydı daha sonra eğitim-yılı dışına yazılabiliyordu. | Gözlem, toplu gözlem, program bağı, değerlendirme ve plan girişlerinde kapı; kalıcı yazım callback'inde İstanbul sivil günüyle canlı store/sınıf/eğitim-yılı yeniden okuması; yalnız tanımlı gelecek premium hazırlık planına istisna. Modül yüklenirken sabitlenen gün kaldırıldı. | `YEREL DÜZELTİLDİ` | Gerçek saatle modal gece yarısını geçme, stale sekme, saat sapması, reload ve offline senaryoları geçmeli. |
| P0 | Premium yetki sürekliliği | Süresi dolmuş/iptal edilmiş erişimde plan emeğini tümden kapatmak veri kaybı algısı; yazmayı açık bırakmak ise yetki ihlali üretir. | Kurulu plan ve geçmiş okunabilir; lens, etkinlik, haftalık/aylık değerlendirme ve yeni premium yazımlar kapanır. İşlem anındaki entitlement, mutasyon hedefinin plan+etkinlik snapshot'ından türetilen exact altı alanlı paket referansına karşı yeniden denetlenir; tutarsız provenance fail-closed olur. Neden görünür ve canlı bölgeyle duyurulur. | `YEREL DÜZELTİLDİ` | Expired, refresh-required, revoked, offline refresh ve entitlement'ın form açıkken değişmesi gerçek tarayıcıda geçmeli. |
| P0 | Premium giriş yolu | `Planları aç` öğretmeni genel hesap/güvenlik ayarına götürüyordu; amaç ve erişim sorunu birbirine karışıyordu. | Yalnız `Plan Kütüphanesi erişimi` için odaklı sheet; planlar ile güvenlik ayarlarının ayrıldığı açık kopya; kurucu erişimi ücretli üyelikten ayrı tutuldu. | `YEREL DÜZELTİLDİ` | Kod girmeden odaklı kapı, geçerli erişimle plan merkezi ve hatalı/üçüncü cihaz reddi fiziksel cihazlarda doğrulanmalı. |
| P1 | Kayıt Ekle | Merkez `+` eyleminin hangi kaydı oluşturduğu yeterince belirgin değildi; genel gözlem, çalışan gerçek plan varken sentetik “Anlık gözlemler” bağlamına düşüp kanıt zincirini koparabiliyordu. | Tek dokunuşta üç açık iş: `Gözlem yaz`, `Yoklama al`, `Etkinlik planla`. Gözlem her açılışta canlı workspace'ten önce gerçek `in_progress`, sonra gerçek `planned` bağlamı çözüyor; tek aday otomatik açılıyor, eş öncelikli çoklu adayda öğretmen seçiyor, aday yoksa `Plan dışı anlık gözlem` açıkça etiketleniyor. Native geri tuşu gözlemden seçim yüzeyine dönüyor. | `YEREL DÜZELTİLDİ` | Küçük ekran, ekran okuyucu, klavye/Escape, yavaş store ve çoklu gerçek etkinlik seçimi fiziksel telefonda geçmeli. |
| P1 | Hızlı gözlem | Ayrı “bağlam” ve ikinci “çocuğun sözü” alanı aynı bilgiyi yeniden istiyor; ana görev ayrıntı formuna dönüşüyordu. | Ana ham not tek kaynak; çocuk sözü türü aynı alanı uygun soruya dönüştürüyor; tür ve alan isteğe bağlı ayrıntıda; eski taslak ayrıntısı kaybolmadan öğretmen kararı istiyor. | `YEREL DÜZELTİLDİ` | Emine Öğretmen ile medyan 25 sn/P95 45 sn hedefi, hata oranı ve bilişsel yük ölçülmeli. |
| P1 | Çoklu çocuk gözlemi | Ortak etkinlik olayında aynı gözlemi tekrar tekrar yazma riski vardı; tek toplu nesne çocuk kayıtlarını karıştırabiliyor, A+B+C seçimini A+B'ye daraltmak C taslağını çatışma sayabiliyor ve bağımsız A taslağı grup metniyle ezilebiliyordu. | `Tek çocuk / Birden çok çocuk`, en az iki seçim, “aynı olay” açık onayı ve çocuk başına ayrı immutable kayıt. Batch yazımı yalnız aynı `batchId` üyelerini güncelliyor; A/B kimlikleri korunuyor, çıkarılan C aynı transaction'da tombstone oluyor, bağımsız tekli taslak değişmiyor ve mükerrer açık batch üyesi fail-closed reddediliyor. 390×844 canlı turda üçten iki çocuğa daraltma, final kayıt ve reload çakışmasız geçti. | `KISMİ` | Ayrı observationId'lerin backup/restore, anekdot ve belge tüketimi özel mobil senaryoyla geçmeli. |
| P1 | Plan formu | Uzun hedef listesinden sonra kaydetme görünmüyor; seçilen fikir/hedefin işlendiği anlaşılmıyor; kapalı CTA arıza gibi görünüyordu. | Sticky `Planı kaydet` alanı; `2 adım kaldı / 1 adım kaldı / Kaydetmeye hazır`; seçili fikir/hedef geri bildirimi; çocuk kapsamı eksikliği için kesin açıklama. | `YEREL DÜZELTİLDİ` | Hatalı tarih/saat, gün değişimi, uzun içerik, klavye açılması, yavaş depolama, çift dokunma ve kayıt hatası geçmeli. |
| P1 | Planlar ve Belgeler | Plan takvimi ve resmi belgeler ana navigasyonda yoktu; kullanıcı nereden tekrar bulacağını öğrenmek zorundaydı. | Her ikisi kalıcı alt hedef. `Planlar` gün sheet'i ve `Plan Kütüphanesi` yolunu; `Belgeler` kayıt/belge merkezini açar. Yerel canlı turda iki hedef, geri dönüş geçmişi, odaklı premium kapı ve gerçek gözlem kayıtlarının Belgeler'de görünmesi doğrulandı. | `YEREL DÜZELTİLDİ` | Belge üret/indir/reload/offline ve fiziksel telefon kabulü tamamlanmalı. |
| P1 | Sınıfım | Yüzey çocuk listesi olarak çalışsa da büyük boşluk, simge ağırlıklı satır eylemleri ve yetersiz günlük operasyon özeti “bitmemiş ekran” izlenimi veriyordu; yoklama açığı gösterildiği halde eyleme dönüşmüyordu. | `Öğretmen kontrolü · Sınıf görev merkezi`; gerçek yoklama ve kanıt durumu, tek kritik sonraki iş, aktif/geldi/arşiv özeti, klavye uyumlu arama ve her çocukta açık `Dosya / Gözlem / İşlemler` eylemleri eklendi. Eksik yoklama diğer görevlerden önce geliyor ve gerçek devam panelini açan `Yoklamayı tamamla/düzelt` CTA'sı sunuyor; tamamlanınca CTA kaybolup sıradaki işe geçiyor. Bu davranış 390×844 IAB'de üç çocuğun yoklaması tamamlanarak doğrulandı. | `YEREL DÜZELTİLDİ` | Fiziksel telefonda 320×568, 200% zoom, ekran okuyucu ve yoğun sınıf kabulü tamamlanmalı; değerlendirme kuyruğunun ayrı birleşik zinciri açık. |
| P1 | Kayıt doğruluğu | Plan veya gözlem IndexedDB'ye başarıyla yazıldıktan sonra projection yenilemesi hata verirse arayüz “kaydedilemedi” diyerek aynı kaydı yeniden denetebiliyor; bu özellikle toplu gözlemde mükerrer immutable kayıt riskiydi. | Commit ile read-model refresh ayrıldı. Commit başarılıysa form kapanıyor; refresh hata veya committed kayıt eksikliği `Cihazda kayıtlı · ekran yenilemesi gerekli` olarak gösteriliyor, aynı kaydı yeniden göndermeme uyarısı ve `Cihaz verilerini yenile` eylemi sunuluyor. Davranışsal testlerde zorunlu read failure altında tekli store sayısı 1, toplu store sayısı 2 kaldı. | `YEREL DÜZELTİLDİ` | Gerçek IndexedDB hata enjeksiyonu, stale sekme ve uygulama öldürme/yeniden açma fiziksel cihazda geçmeli. |
| P1 | Spontan gözlem bütünlüğü | Yalnız `activityKind` alanına güvenmek, tahrifli/legacy normal etkinliği “spontan” gösterip Today'den gizleyebilir ve ikinci gerçek `in_progress` etkinliğe izin verebilirdi. | Ortak fail-closed predicate; etkinlik işareti, bağlı tek gerçek plan, gerçek plan türü, targetsızlık, canlı kayıtlar ve aynı eğitim-yılı/sınıf/tarih koşullarının tamamını arıyor. Today gizleme ve etkinlik çakışma istisnası aynı doğrulamayı kullanıyor. | `YEREL DÜZELTİLDİ` | Tahrifli backup/restore ve legacy migration senaryosu birleşik kabulte ayrıca çalıştırılmalı. |
| P1 | Değerlendirme ve belge sürekliliği | Özellikler ayrı ayrı mevcut olsa bile öğretmenin gözlemden resmi anekdot formuna, haftalık/aylık değerlendirmeye ve belgeye nasıl ilerleyeceği ana yüzeyden bütün olarak kanıtlanmış değil. | Belgeler kalıcı hedefe taşındı; bekleyen program bağlantıları Bugün kontrol merkezine alındı. Mevcut anekdot/Ek 18 veri zincirleri korunuyor. | `KISMİ` | Aynı sınıfta gözlem → bağ → onay → değerlendirme → PDF/DOCX → reload/offline → restore tek telefon oturumunda geçmeli. |
| P2 | Erişilebilirlik | Görsel geri bildirim iyileşse de ekran görüntüsü klavye, ekran okuyucu, yeniden akış ve kontrast uyumunu kanıtlamaz. | `aria-current`, `aria-pressed`, `role=status`, `aria-live`, engel açıklaması ve odak görünümü iyileştirmeleri eklendi. | `KISMİ` | Klavye, TalkBack/VoiceOver, 200% zoom, 320×568 reflow, dokunma hedefi ve kontrast ölçümü gerekir; tam WCAG iddiası yoktur. |
| P2 | Güven ve hata kurtarma | “Kaydedildi / çevrim dışı hazır” mesajı olumlu; ancak yavaş/yetersiz depolama, save başarısızlığı ve çakışma bütün yeni akışlarda aynı kaliteyle görünür değil. | Bugün kontrol merkezinde taslak/cihaz durumu; gözlem ve planda yükleniyor/bloke/hazır durumları. Persistence katmanındaki fail-closed davranış korunuyor. | `KISMİ` | Depolama kotası, IndexedDB hatası, stale write, çift dokunma ve uygulama yeniden açma senaryoları görünür hata + veri geri alma ile geçmeli. |

## Öğretmen-rolü gerçek kabul senaryoları

### 1. Güne başlama

1. Uygulama 390×844 telefonda açılır.
2. İlk görünüm sınıf/eğitim-yılı durumunu, beklenen/mevcut/yok/geç/işaretlenmedi
   ayrımını, sıradaki planı, bekleyen kanıt işini ve cihaz/taslak durumunu gösterir.
3. Plan yoksa uydurma içerik değil, doğru sonraki eylem görünür.
4. Hazırlık modu veya eğitim-yılı dışı durum, hangi yazımın neden kapalı olduğunu
   açıklar.

### 2. Tekli ve çoklu gözlem

1. `Kayıt Ekle → Gözlem yaz` en çok iki dokunuşta açılır.
2. Çalışan gerçek etkinlik varsa plan/hedef zincirine bağlanır; eş öncelikli birden
   çok etkinlikte öğretmen seçer, gerçek aday yoksa plan dışı durum açıkça görünür.
3. Çocuk seçilmeden kayıt kapalıdır ve kesin neden görünür.
4. Tekli gözlem bir ham kayıt üretir; reload sonrası aynı metin ve kimlik korunur.
5. Çoklu gözlem en az iki çocuk ve ortak olay onayı ister; her çocukta farklı
   observationId oluşur; toplu nesneyle çocuklar birbirine bağlanmaz.
6. Seçim daraltılırsa çıkarılan taslak atomik tombstone olur; kalan ve bağımsız
   taslak kimlikleri/metinleri değişmez.
7. Commit başarılı, ekran yenilemesi başarısızsa kayıt yeniden gönderilmez; cihazda
   kayıtlı olduğu ve yenileme gerektiği açıkça gösterilir.
8. Program bağı daha sonra tamamlandığında ham gözlem değişmez.

### 3. Planlama

1. `Planlar` en çok bir dokunuşta gün/takvim yüzeyini; en çok iki dokunuşta
   Plan Kütüphanesi'ni açar.
2. Fikir ve hedef seçimi görünür; eksik adım sayısı her seçimde güncellenir.
3. Kaydetme alanı form kaydırılırken görünür kalır.
4. Geçersiz tarih/saat kesin nedenle bloklanır; modal gün değiştirirse kayıt
   anında yeniden doğrulanır.
5. Kaydedilen gelecek plan Today'de erken başlamaz; Takvim'de bulunur, düzenlenir
   ve reload/offline sonrası korunur.

### 4. Değerlendirme ve belge

1. Bekleyen program bağlantısı Bugün'den açılır.
2. Öğretmen gözlemi değiştirmeden program bağı ve ayrı değerlendirme oluşturur.
3. Haftalık ve üç boyutlu aylık değerlendirme yalnız yeterli tarihli kanıtla
   kaydedilir; veri yetersizliği görünür.
4. `Belgeler` hedefinden anekdot, plan ve uygun değerlendirme PDF/DOCX çıktısı
   alınır.
5. Reload/offline/backup/restore sonrası kaynak kimlikleri değişmez.

### 5. Premium sınırı

1. Erişim yoksa odaklı plan erişim açıklaması açılır; genel güvenlik ayarına
   sessiz yönlendirme olmaz.
2. Kurucu iki cihaz istisnası ve normal ücretli premium birbirine karışmaz.
3. Erişim form açıkken sona ererse kalıcı yazım fail-closed olur.
4. Süresi dolmuş/iptal edilmiş erişimde öğretmenin mevcut planı ve geçmişi
   okunabilir; yeni premium yazım yapılamaz.

## 2026-08-09 yerel kanıt matrisi

| Kanıt | Sonuç | Kapsam sınırı |
|---|---|---|
| Feature migration matrisi | 463/463 geçti | Geniş Node/domain regresyonu; fiziksel telefon değildir. |
| UX odak matrisi | 34/34 + 31/31 geçti | Bağlam çözümü, commit/refresh tekliği, evidence/spontan/Today regresyonları. |
| Today kontrol merkezi model testi | 3/3 geçti | Domain/model; fiziksel telefon değil. |
| Today + premium salt-okunur + shell router Node matrisi | 8/8 geçti | Odak regresyon; tam öğretmen zinciri değil. |
| Plan readiness 390×844 | 1/1 geçti | Sticky CTA, seçili durum, çocuk kapsamı ve reflow. |
| Premium plan mobil smoke | Chromium + WebKit 2/2 geçti | Yerel fixture; gerçek entitlement servisi/fiziksel cihaz değil. |
| Premium salt-okunur odak testi | 3/3 geçti | Kaynak/guard sırası; gerçek süre aşımı oturumu değil. |
| Typecheck, lint, runtime koruması, build | Geçti | Yayın veya kullanıcı kabulü değildir. |
| IAB Today önce/sonra | Görünür iyileşme kabul edildi | 390×844 yerel; aktif eğitim yılı/dolu gün varyantları açık. |
| IAB `Kayıt Ekle` ve doğrudan hızlı gözlem | Geçti | Native geri gözlemden seçim yüzeyine döndü. Üç kurgu çocuk → iki çocuk daraltma, ortak onay, final kayıt ve reload çakışmasız geçti. Aktif `Batar mı, yüzer mi?` planı varken genel gözlem doğru plan bağlamını gösterdi; Mina kaydı etkinlik kanıtını 1'e, bekleyen program bağını 6'ya çıkardı ve reload sonrası tek kaldı. Backup/restore açık. |
| IAB plan oluştur/başlat/reload | Geçti | Anlık gözlem sonrası atomik plan+etkinlik kaydı görünür başarıyla açıldı ve reload sonrası `Uygulanıyor` kaldı; offline bu turda yeniden çalıştırılmadı. |
| Planlar/Belgeler/premium kapı/Sınıfım birleşik turu | Geçti | Beşli navigasyon, sheet geçmişi, odaklı premium kapı ve kayıtların Belgeler'de görünmesi eylem + DOM ile doğrulandı. `Sınıfım` görev merkezi 390×844'te açıldı; `Yoklamayı tamamla` gerçek devam panelini açtı, üç çocuk geldi olarak kaydedilince CTA kaybolup `Dökümü denetle` işine geçti. Çocuk `Dosya`, `Gözlem` ve `İşlemler` kontrolleri de gerçek hedef yüzeyleri açtı. |
| İki fiziksel telefon | Bekliyor | Kurucu premium ve gerçek dokunma kabulü. |

## Görsel kanıt dizini

Bu çalışma sırasında kabul edilen geçici yerel görüntüler:

- `01-today-mobile.png` → `07-today-after-local.png`: tanıtım ağırlıklı ana
  görünümden öğretmen kontrol merkezine geçiş.
- `03-add-menu-mobile.png` → `08-add-menu-after.png`: üç doğrudan kayıt hedefi
  ve yeni beşli navigasyon bağlamı.
- `02-quick-observation-mobile.png` → `10-quick-observation-direct-after.png`:
  tekli eski görünümden tekli/çoklu kapsam ve kesin hazırlık nedenine geçiş.
- `11-group-observation-ready-after.png`: üç çocuk, ortak olay onayı ve sticky
  toplu kaydetme alanı.
- `04-plan-create-mobile.png` → `17-plan-ready-after.png`: görünmeyen kaydetmeden
  sabit, açıklanabilir ve hazır sticky eyleme geçiş.
- `05-plan-premium-gate-mobile.png` → `14-premium-gate-after.png`: genel
  hesap/güvenlik yüzeyinden odaklı Plan Kütüphanesi erişimine geçiş.
- `06-classroom-mobile.png` → `22-classroom-task-center-after.png`: geniş boşluk
  ve yalnız simgeli satırdan; günlük yoklama/kanıt durumu, kritik görev ve açık
  `Dosya / Gözlem / İşlemler` eylemleri taşıyan 390×844 görev merkezine geçiş.
- `23-classroom-attendance-complete.png`: gerçek yoklama tamamlandıktan sonra
  kritik görevin otomatik olarak sıradaki belge denetimine geçtiği durum.
- `24-plan-linked-observation.png`: genel kayıt menüsünden açılan gözlemin aktif
  `Batar mı, yüzer mi?` plan etkinliğine açıkça bağlandığı durum.
- `19-add-menu-active-after.png`, `20-today-desktop-after.png` ve
  `21-atomic-plan-save-after.png`: etkin sınıf kayıt menüsü, masaüstü kırılımı ve
  anlık gözlem sonrası atomik plan kaydının görünür kanıtları.

Geçici klasör:
`C:\Users\Asus\AppData\Local\Temp\maarifos-ux-audit-v21-20260809`

Bu görüntüler release paketi içinde değildir; kalıcı yayın kanıtı olarak
kullanılacaksa doğrulanmış artefakt deposuna exact dosyalar ve manifest ile
taşınmalıdır.

## Release kararı

- Yerel kod birleştirme kararı: son tam regresyon ve diff/gizli bilgi taraması
  geçerse `GO`.
- “Profesyonel öğretmen sistemi tamamlandı” iddiası: `NO-GO`.
- vNext production yayın iddiası: birleşik IAB turu ile gözlem/plan reload'u
  geçti; offline, fiziksel telefon ve yayın sonrası smoke tamamlanmadan `NO-GO`.
- Gerçek çocuk verili pilot: MR-014 kapanmadan kesin `NO-GO`.

## Sonraki uygulama sırası

1. Çoklu gözlem ayrı kimlik/backup/restore/anekdot/belge zincirini kapat.
2. Değerlendirme → belge → reload/offline → restore birleşik öğretmen senaryosunu
   gerçek telefonda çalıştır.
3. İki fiziksel telefon kurucu premium kabulünü, ardından ayrı ücretli premium
   satın alma/yenileme yolunu doğrula.
4. Gece yarısı açık form, stale sekme, yavaş/başarısız IndexedDB ve uygulama
   öldürme/yeniden açma hata enjeksiyonlarını fiziksel cihazlarda tamamla.
