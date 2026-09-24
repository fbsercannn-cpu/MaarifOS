# Sistem ve matematik denetimi — 7 Eylül 2026

Kapsam: sivil gün/yaş, üyelik aralıkları, yoklama ve gözlem paydaları, öğretim günü çözümleme, etkinlik rotasyonunun gerçek ana sayfa girdisi, yıl kapsamı ve yedek mimarisi. İnceleme yerel kaynak kodu ve sentetik, kimlik bilgisi içermeyen bellek depolarıyla yapıldı. Hukuki takvim tarihleri yeniden doğrulanmadı; aşağıdaki takvim bulgusu uygulamanın kendi iki projeksiyonu arasındaki tutarsızlıktır.

Kaynak yolları `app/` köküne göredir. Satırlar keşif anındaki sürüme aittir; eşzamanlı root düzeltmeleri satırları kaydırabilir. P0 veri kaybı bulgusu doğrulanmadı. P1 sonuç/veri anlamını etkiler; P2 kapsam, kullanıcıya açıklama veya ölçek riskidir. Efor yalnız mühendislik tahminidir. Bu dosya yazıldığı anda 01–03 root tarafından düzeltiliyor; 04–05 core alt görevi olarak uygulandı ve aşağıdaki testlerle doğrulandı.

## Bulgular

### SYS-01 — YANLIŞ / P1: Dossier devam özeti mükerrer satırları gün gibi sayıyor

- Kanıt: `src/features/reports/student-dossier.ts:846` içindeki `attendanceSummary` ham satır sayıyor; `:1088` filtresi CS-001 işaretini/kanonik kayıt çözümünü uygulamıyor. `src/features/archive/academic-year-archive.ts:547` arşive bütün yoklamaları alıyor. UI geçmişi ise `src/features/attendance/attendance-history.ts:99` ile kanonik kayıtları kullanıyor.
- Örnek: aynı çocuk ve gün için eski Geldi ve yeni Gelmedi kayıtları varsa belgede Geldi:1 + Gelmedi:1 görünebilir; gerçek gün sayısı birdir. Ham kayıtları korumak doğrudur; toplamda iki kez saymak değildir.
- Öneri: tarih/sınıf kapsamı içinde `resolveAttendanceRecords().latestByKey` üzerinden özet üret; arşivde bütün kaynak satırlarını koru.
- Kabul: aynı günün iki statülü mükerrerleri belge toplamında bir gün; kaynağın iki satırı ve CS-001 bilgisi korunur; belge ile UI geçmişi aynı kanonik sonucu verir.
- Efor: 2–4 saat. Durum: root uygulaması sürüyor.

### SYS-02 — YANLIŞ / P1: Geç katılan öğrenci eski günün kapanış paydasına giriyor

- Kanıt: `src/features/day-closure/teacher-day-closure.ts:381` içindeki `studentWasEnrolledOn`, `:398–402` koşulunda her aktif üyeliğe operasyon başlangıcı istisnası tanıyor. Çağrıda `:926` effective year start her zaman sağlanıyor. Karşı kanıt: `src/features/development/development-overview.ts:104` istisnayı yalnız resmî yıl başlangıcına hazırlanmış üyelik için uyguluyor.
- Çalıştırılan prob: üyelik başlangıcı `2026-10-01`, hesap günü `2026-09-15` → kapanış `expectedStudentCount=1`; gelişim kapsamı `students.length=0`.
- Öneri: ortak sivil gün üyelik çözümleyicisi kullan; erken başlama istisnasını yalnız resmî ilk güne hazırlanmış üyeliklerle sınırla. Sonradan katılanın kendi başlangıcını koru.
- Kabul: 1 Ekim öğrencisi 15 Eylül paydasına eklenmez; resmî başlangıç için önceden hazırlanmış çocuk açık erken yıl başlatma ile dahil olur; eski kapanış parmak izi sırf gelecekte katılım yüzünden değişmez.
- Efor: 3–5 saat. Durum: root uygulaması sürüyor.

### SYS-03 — YANLIŞ / P1: Gün sonu gözlem filtresi çoğul öğrenci sözleşmesini okumuyor

- Kanıt: `src/features/day-closure/teacher-day-closure.ts:966` gözlem filtresi yalnız `record.studentId` kontrol ediyor; gözlemler `studentIds` dizisi taşıyor. Aynı tekil kontrol semantik parmak izi bölümünde de var (`:503` civarı).
- Çalıştırılan prob: 5 Eylül ayrılmış çocuk için 15 Eylül tarihli `studentIds:[id]` gözlem → `expectedStudentCount=0`, `observationCount=1`, `pendingCurriculumLinkCount=1`.
- Öneri: kanonik öğrenci kimliği dizisini okuyup hesap gününde üyeliği olan çocuklarla kesişim üzerinden aynı politikayı hem toplamda hem parmak izinde uygula. Karma grup gözlemi bir olay olarak sayılmalı.
- Kabul: üyelik dışı tek-çocuk gözlem sayılmaz; aktif ve ayrılmış çocuğun ortak gözlemi bir kez sayılır; toplam/parmak izi aynı kayıt kümesini kullanır.
- Efor: 2–4 saat. Durum: root uygulaması sürüyor.

### SYS-04 — YANLIŞ / P1: Gerçek yeniden kayıt ayrılık aralığını siliyor

- Kanıt: `src/features/archive/academic-year-archive.ts:443–462` aynı sınıf/yıl üyeliğini bulup eski `startedOn` değerini koruyor ve `endedOn` alanını siliyor.
- Çalıştırılan prob: 1–5 Eylül üyeliğinden sonra 1 Ekim gerçek yeniden kayıt → tek üyelik `{startedOn:'2026-09-01',status:'active'}`; 6–30 Eylül ayrılık aralığı kalmıyor.
- Öneri: gerçek yeniden kaydı yeni üyelik dönemi olarak ekle; yanlışlıkla silme sonrası geri al işlemi eski dönemi aynen geri yükleyen ayrı anlamsal işlem olsun.
- Kabul: gerçek yeniden kayıtta kapalı dönem değişmeden kalır, yeni UUID'li dönem başlar; ayrılık günleri paydalara girmez; yanlışlıkla silme/geri alma geçmişi parçalamaz.
- Efor: 4–8 saat. Durum: tamamlandı; yeni üyelik dönemi ve sınır testleri geçti.

### SYS-05 — EKSİK / P1: Yeniden kayıt başlangıcı hedef yıl aralığında doğrulanmıyor

- Kanıt: `src/features/archive/academic-year-archive.ts:398` yalnız YYYY-MM-DD geçerliliğini denetliyor; `:417–430` hedef yıl/sınıf durumunu kontrol edip tarih sınırı koymuyor.
- Çalıştırılan prob: bitişi `2027-08-31` olan yıla `startedOn:'2028-09-01'` kabul edildi.
- Öneri: hedef yılın geçerli başlangıç/bitişini ve açık effective operational start'ını kontrol et; yeni üyelik kendi geçerli eğitim yılı aralığında olmalı. Var olan üyelik dönemleriyle çakışmayı da reddet.
- Kabul: yıl sonrasına veya izinli başlangıç öncesine kayıt depoyu değiştirmeden reddedilir; izinli erken başlama ve yılın son günü kabul edilir; bozuk yıl aralığı reddedilir.
- Efor: 2–4 saat; SYS-04 ile birlikte. Durum: tamamlandı; yeni üyelik dönemi ve sınır testleri geçti.

### SYS-06 — KOPUK / P1: Resmî takvim görünümü ile öğretim günü paydası farklı profili seçiyor

- Kanıt: `src/features/planning/teacher-week-teaching-days.ts:202` `officialProfileMatches` yıl adının tam olarak `2026–2027 Eğitim Yılı` olmasını ister. `src/features/calendar/academic-calendar.ts:202` `loadAcademicCalendar` yalnız tarih örtüşmesini kullanır. Aynı dosyada `:131` üçüncü matcher tam başlangıç/bitiş eşleşmesi ister.
- Çalıştırılan prob: ad `2026-2027`, tarihler 01.09.2026–31.08.2027 → takvimde 8 resmî olay var; 16–20 Kasım için öğretim çözümleyicisi `custom-year-weekday-fallback` ile 5 gün sayıyor; uygulamadaki resmî olay aynı aralığı ara tatil olarak gösteriyor.
- Öneri: profil kimliğini veriye açık kaydet veya bütün yüzeylerin kullandığı ortak eşleştirici üret. Görünen ad bir takvim anahtarı olmasın; özel yıl seçiminin anlamı kullanıcıya açık olsun.
- Kabul: yıl adı değişikliği tatil günlerini sessizce paydaya geri koymaz; takvim görünümü, haftalık kapanış ve rotasyon aynı profil kimliğini raporlar; özel yıl bilinçli fallback olarak görünür.
- Efor: 4–8 saat.

### SYS-07 — KOPUK / P2: 120 etkinliklik yıllık kapsam günlük öneri yoluna tam bağlı değil

- Kanıt: `src/features/simple-experience/SimpleTodayScreen.tsx:133–140` ana sayfa havuzunu `collection:'hemen'` ile sınırlar. `src/features/activity-studio/activity-year-program.ts:164` bu havuzdan seçer; yıllık kapsam testi `tests/features/activity-studio.test.mjs:354` ayrı `createActivityYearRotation` fonksiyonunu bütün yaş havuzuyla çalıştırır.
- Çalıştırılan prob: 186 resmî öğretim günü boyunca gerçek UI filtresi ile 36–48 yaş bandında 117 uygun etkinlikten 59'u; 48–60 ve 60–72 bantlarında 120'den tam 60'ı önerilir. Diğer 58/60 etkinlik bu yoldan hiç seçilemez. Stüdyodan elle erişim mevcut; iki farklı algoritmanın varlığı tek başına hata sayılmadı.
- Öneri: hazırlık gerektiren deneyimler için hafta/plan öneri yolunu bağla veya ana sayfa kapsamını hazırlıksız deneyim havuzu olarak açık tanımla. Tam yıl bankası coverage iddiasını yalnız test helperıyla kanıtlama.
- Kabul: gerçek UI giriş kümesinden 186 günlük test çalışır; kapsanan/kapsanmayan etkinlikler ve ikinci erişim yolu sayısal olarak raporlanır.
- Efor: 4–12 saat.

### SYS-08 — GEREKSİZ / P2: Öğretim olmayan günde kapanış eksik iş üretiyor

- Kanıt: `src/features/day-closure/teacher-day-closure.ts:896–934` yalnız yıl aralığı kontrol eder; öğretim günü veya yerel okul kapanışı çözümlemesi yok. Ana sayfa `src/features/simple-experience/SimpleTodayScreen.tsx:143` öneriyi yalnız operasyon aktifliğine bağlar.
- Çalıştırılan prob: 19.09.2026 Cumartesi, boş sınıf günü → kapanış `status:'open'`, `attendance-incomplete` ve `daily-plan-missing` sorunları.
- Öneri: ortak öğretim günü çözümünden normal yükümlülük üretilip üretilmeyeceğini belirle; öğretmenin açıkça planladığı tatil günü çalışmasını ayrıca koru.
- Kabul: hafta sonu/resmî tatil/yerel kapanış boş günlerinde eksik yoklama-plan uyarısı oluşmaz; açık istisna etkinliği ve ham kayıtlar erişilebilir kalır.
- Efor: 4–8 saat.

### SYS-09 — KOPUK / P2: Boylamsal arşivden belge üretimi güncel kök üyeliğe bağlanıyor

- Kanıt: `src/features/archive/academic-year-archive.ts:493–545` bütün üyelik yıllarını arşive alır; `src/features/reports/student-dossier.ts:1048–1061` belge kapsamını yalnız `archive.student.academicYearId/classroomId` üzerinden seçer. `StudentDossierOptions` bağımsız yıl/sınıf seçimi taşımaz (`:51`).
- Örnek: aynı öğrenci bir sonraki yıla kaydedildiğinde kök alanları yeni yıl olur. Önceki yılın arşivde bulunan dönemini bu builder'a vermek güncel yıl sınırı dışında hatası üretir. Bu bulgu kaynak akışından çıkarımdır; eski yıl ekranının bütün kullanıcı etkileşimleri çalıştırılmadı.
- Öneri: belge için açık, mevcut üyelikle doğrulanmış scope seçimi tanımla; varsayılan güncel scope kalsın.
- Kabul: iki yıllı öğrenci için her yıl ayrı doğru kurum/sınıf/dönem ve kayıtlarla çıktı üretilir; yıllar arası kayıt sızıntısı olmaz.
- Efor: 4–8 saat.

### SYS-10 — RİSKLİ / P1: Kalıcı veri kapasitesi ile taşınabilir yedek bütçesi ayrışıyor

- Kanıt: `src/core/domain/student.ts:12` tek profil fotoğrafına 400.000 karakter tanır. `src/core/backup/backup-service.ts:345` bütün geçmişi klonlayıp düz yedek üretir, export boyut kapısı yok; `:406` metin restore 20 Mi karakter sınırı koyar. `src/core/backup/encrypted-backup.ts:165–170` şifrelemeyi de aynı düz metin sınırında durdurur.
- Örnek: 60 adet izinli sınıra yakın profil fotoğrafı yaklaşık 24 milyon karakterdir; diğer bütün geçmiş hariç bile şifreli yedek sınırını aşar. Düz export nesnesi üretilebilirken metinden geri yükleme reddedilir. Bu kapasite sözleşmesi incelemesidir; 24 MB tarayıcı stres testi bu audit'te yapılmadı.
- Öneri: kabul edilen veri için geri yüklenebilir taşınabilir yedek garantisi koy; parçalara ayrılmış doğrulanmış medya/manifest paketi veya tek paylaşılan byte bütçesi/preflight tasarla. UTF-8 byte ve JS karakter sınırı aynı şey olarak sunulmamalı.
- Kabul: sınır altı ve üstü çok yıllı/çok fotoğraflı fixture için başarılı dışa aktarımın karşı depoda başarılı restore'u zorunlu; başarısız paket indirilebilir başarı gibi sunulmaz.
- Efor: 1–3 gün.

### SYS-11 — RİSKLİ / P2: Ana sayfa yenilemeleri bütün arşivi birden çok kez okuyor

- Kanıt: `src/core/repository/indexed-db.ts:672–679` `readSnapshot` bütün koleksiyonların tamamını okur. `src/Prototype.tsx:4380` açılışta dashboard/today/evidence/calendar/cycle/week/closure yüklemelerini paralel başlatır. Gelişim kartı ayrıca `src/features/development/DevelopmentPanels.tsx:29` bütün snapshot'ı okur. `LocalDataStore` yanında sınıf/tarih indeks API'leri mevcut (`src/core/repository/contracts.ts:100` civarı), bu kart bunları kullanmıyor.
- Örnek: sadece bu ayın gözlem sayısını göstermek için önceki yılların profil fotoğrafları, audit ve export paketleri de taşınır. Veri boyutuyla maliyet artar; bu rapor ölçülmüş gecikme iddiasında bulunmuyor.
- Öneri: tek hydration snapshot/revision veya ihtiyaç alanlarına göre indeksli read model paylaş; kapsam/snapshot tutarlılığını koru.
- Kabul: çok yıllı sentetik fixture üzerinde okunan koleksiyon ve kayıt sayısı ölçülür; tek sayfa açılışında yinelenen tam arşiv okumaları azaltılır; mevcut yarış/yenileme testleri korunur.
- Efor: 1–2 gün.

### SYS-12 — EKSİK / P2: Yoklama olay zaman çizelgesi kendi içindeki çelişkiyi göstermiyor

- Kanıt: `src/core/domain/attendance.ts:364` civarındaki `normalizeAttendanceEvents` yalnız tekil olay geçerliliği, en çok 64 olay ve UUID tekilliğini doğrular; olaylar arası saat sırasını/çakışmayı değerlendirmez. `src/features/attendance/attendance-history.ts:137` olayları girilen dizi sırasında özetler.
- Çalıştırılan prob: aynı gün `check_in 12:00`, `check_out 08:00` ikilisi kabul edilir.
- Öneri: çoklu giriş/çıkışı yasaklamadan zaman çelişkisini görünür inceleme uyarısı üret; audit zamanı ile gerçekleşme yerel saatini ayrı tut. Kaydı silme veya sessizce sırala-düzeltme yapma.
- Kabul: ters giriş/çıkış, çakışan kısmi gün, normal iki giriş-çıkış döngüsü ve sonradan girilen geçmiş olay için ayrı sonuçlar; kaynak olaylar aynen korunur.
- Efor: 3–6 saat.

## Çalıştırılan kanıtlar ve sınırlar

Node üzerinden gerçek TypeScript export'ları, yerel bellek deposu ve sentetik UUID'lerle çalıştırıldı. Tek komutta üyelik paydası, ayrılmış çocuk gözlemi, yeniden kayıt dönem aralığı, yıl dışı yeniden kayıt, hafta sonu kapanışı, artık gün yaşı, ters saatli olay dizisi ve takvim profil eşitliği kontrol edildi. Ayrı komutta gerçek ana sayfa filtresi 186 gün boyunca üç yaş bandında sayıldı. Üretim verisi okunmadı/değiştirilmedi; yeni bağımlılık kurulmadı; bu aşamada production dosyası değiştirilmedi.

Artık gün kontrolü: 29.02.2024 doğumlu çocuk 28.02.2027'de 35 tamamlanmış ay; doğum günü bildirimi açık `leapDayAdjusted:true` ile 3 yaş kutlaması gösteriyor. UI bunu erken kutlama olarak açıklıyorsa matematik hatası değildir; bu nedenle bulgu sayısına eklenmedi. Sivil gün hesapları UTC tabanlı ve ana sayfada 30 saniye/focus/visibility gün yenilemesi bulundu; naive yerel gün veya yalnız ayın gününe dayanan rotasyon iddiası rapora alınmadı.

Mevcut olumlu kontroller: yedek restore öncesi ve yazma transaction'ı içinde preimage karşılaştırması; CS-001 ham kayıt koruma; günlük yoklamada kanonik seçim; profile para hesabı olmaması; yaş bantlarını otomatik resmî kategoriye zorlamama. Bunların varlığı açık bulguları gidermiyor, fakat denetim kapsamındaki mevcut korumaları gösteriyor.

## Entegrasyon kaydı

- SYS-01–03: root'a erken bildirildi; root uygulama/test sahipliğini aldı.
- SYS-04–05: `halis_student_core` tarafından bounded uygulama/test görevi verildi; `academic-year-archive.ts` ve üyelik testleriyle sınırlandırıldı. Silmeyi geri alma ve gerçek yeniden kayıt ayrı semantik olarak korunacak.
- SYS-06–12: değerlendirme/ürün kararı bekleyen rapor bulguları; bu audit kapsamında üretim düzeltmesi yapılmadı.


## SYS-04–05 uygulama ve kabul kanıtı

- Gerçek `reenrollArchivedStudent` yeni UUID ile yeni dönem açar; önceki kapalı dönemleri değiştirmez. Aynı başlangıçlı tekrar çağrı yazmasız/idempotenttir. Açık üyelik, çakışan dönem, bozuk geçmiş, hedef yıl/effective operational start dışındaki başlangıç reddedilir.
- `latestStudentEnrollment` ile profil kaydı, yanlışlıkla silme/geri alma, yıl arşivi ve yeni yıla taşıma son aktif veya en son kapalı dönemi seçer. Geri alma yalnız yanlışlıkla kapatılan son dönemi eski açık durumuna getirir; geçmiş ayrılık dönemi aynen korunur.
- Yıl arşivi bitiş günü ve üyelik kapatma günü geçerli yıl/üyelik başlangıcına göre denetlenir; ters aralık yazılmaz.
- Üretim değişiklikleri: `src/features/archive/academic-year-archive.ts`; `src/features/dashboard/dashboard-data.ts` içinde yalnız üyelik helper import/seçimi ve ters aralık koruması; `src/features/today/today-data.ts` içinde yalnız helper import/seçimi. Eşzamanlı başka ajanların mevcut değişiklikleri korunmuştur.
- Yeni testler: `tests/features/student-enrollment-episodes.test.mjs`, `tests/core/student-enrollment-episodes.spec.ts`.
- Son Node koşumu: episodes + academic-year-archive + academic-year-transition + attendance-membership = **27/27 geçti**.
- Gerçek tarayıcı/IndexedDB koşumu: şifreli export, başka depoda restore ve son dönemin yanlışlıkla silinip geri alınması = **1/1 geçti**; iki dönem byte-kanonik eşitlikle korundu.
- `npm run test:typecheck` geçti; `npm run check:runtime` 36 korunan dosyada geçti.

## Kök entegrasyon sonucu

SYS-01,02,03 yerelde düzeltildi; 64 dossier/kapanış/öğretim günü testi ve bağımsız ikinci inceleme geçti. SYS-06'nın görünen yıl adına bağımlı hatası resmî tarih sınırı eşleşmesiyle düzeltildi; kalıcı ortak profil tasarımı açık. SYS-04,05 yukarıdaki üyelik kabulüyle kapandı. SYS-07..12 sonraki iş listesindedir; uygulanmış sayılmaz. Nihai kök kabul: ../MASTER_UYGULAMA_KABUL_2026_09_07.md.
