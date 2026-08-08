# MaarifOS kanonik yetenek durumu

**Sürüm:** 0.8.0
**Durum tarihi:** 8 Ağustos 2026
**Kapsam:** Bu dosya çalışan ürün kabiliyetinin tek kanonik özetidir. `PROJECT.md`
ürün niyetini, `docs/ROADMAP.md` gelecek sırayı anlatır; menü adları ve plan
başlıkları bitmiş özellik kanıtı değildir.

## Durum sözlüğü

| Durum | Anlamı |
|---|---|
| `IMPLEMENTED` | Kullanıcı akışı, kalıcılık ve ilgili test kanıtı vardır. |
| `PARTIAL` | Çekirdeğin bir bölümü çalışır; vaat edilen uçtan uca akış tamam değildir. |
| `SCHEMA_ONLY` | Veri tipi/koleksiyonu vardır; kullanıcı yeteneği sayılmaz. |
| `PLANNED` | Yol haritasındadır; çalışan sürümde sunulmaz. |
| `HIDDEN` | Kod yatırımı korunur fakat Hediye Alpha ana akışında gösterilmez. |

## Hediye Alpha ürün sınırı

Ana pilot akışı şudur:

`Kurulum → Sınıf → Yoklama → Plansız hızlı gözlem → Çocuk zaman çizelgesi → Şifreli yedek/geri yükleme → Uygulama kilidi`

Bu akış dışındaki yetenekler tamamlanmış ve test edilmiş olsalar bile ilk pilotun
başarı ölçütünü genişletmez. Gerçek çocuk verisiyle pilot; P0/P1 açıkları,
kurumsal KVKK kararı, cihaz güvenliği ve restore tatbikatı kapanmadan başlamaz.

## Yetenek matrisi

| Alan | Durum | Kullanıcıya söylenecek gerçek | Kanıt / kapı |
|---|---|---|---|
| PWA kurulumu ve çevrim dışı kabuk | `IMPLEMENTED` | Uygulama kurulabilir ve daha önce yüklenmiş kabuk çevrim dışı açılır. | `app/src/pwa.ts`, PWA/offline testleri |
| Eğitim yılı ve sınıf kurulumu | `IMPLEMENTED` | Sınıf, eğitim yılı, çalışma düzeni ve program profili kalıcıdır. | repository + migration + runtime testleri |
| Öğrenci yaşam döngüsü | `IMPLEMENTED` | Ekleme, düzenleme, arşivleme, geri alma ve yıllar arası kimlik korunur. | student lifecycle testleri |
| Günlük yoklama | `IMPLEMENTED` | `Geldi / Geç geldi / Gelmedi` günlük kaydı sınıf üyeliğinden bağımsızdır. Giriş, çıkış, erken ayrılma, kısmi gün ve mazeret olayları; neden, öğretmen notu, geri alma, yeniden yükleme ve öğrenci geçmişi uçtan uca korunur. Olaylar şifreli yedek/restore kapsamındadır ve olay alanı bulunmayan N-1 kayıtları geriye uyumlu okunur. | `app/src/core/domain/attendance.ts`; `app/src/features/dashboard/dashboard-data.ts`; `app/src/features/attendance/attendance-history.ts`; `attendance-membership`, `attendance-events`, `attendance-history`, `core/backup` ve runtime kullanıcı akışı testleri |
| Plansız hızlı gözlem | `IMPLEMENTED` | Ham metin değişmeden saklanır; öğrenci seçimi ve taslak geri kazanımı vardır. | evidence flow/runtime testleri |
| Plan → etkinlik → kanıt | `IMPLEMENTED` | D1 zinciri ve öğretmen onaylı program bağı vardır; Alpha ana menüsünde ikincildir. | planning/evidence testleri |
| Değerler Pedagojisi Anayasası ve D1–D20 çekirdeği | `PARTIAL` | Makine-okunur anayasa, resmî Ek-14 kaynak zinciri, plan sözleşmeleri, altı rollü değişmez karar sözleşmesi ve iki dönemlik authored hedef profili çalışır. Gerçek altı rol kararı ve tamamlanmış Eylül–Haziran içerik seti olmadan yayımlanmış model sayılmaz. | `docs/DEGERLER_PEDAGOJISI_ANAYASASI.md`; values sözleşme/katalog/insan-inceleme testleri |
| 2026–2027 değerler yayın hedef profili ve Ekim referans blueprint'i | `HIDDEN` | On ay/iki dönem/108 etkinlik authored hedef sözleşmesi; iki dönemde ana değerler üzerinden D1–D20, 18/18/18 çatı ve ay bazlı kültürel köprü adayları için strict contract testlerinden geçer. Bu bir gerçek release doğrulaması değildir. Ekim yalnız 12 etkinliklik planlanmış referanstır; gelecek dokuz ayın gerçek içerik dosyaları, release-set manifesti ve insan kararları henüz yoktur. | `docs/DEGERLER_2026_2027_YILLIK_MATRIS.md`; annual release-set ve October reference testleri |
| Premium Plan Merkezi · Eylül v3 | `HIDDEN` | Geliştirme bayrağı altındaki teknik dikey dilimdir; durum `machine_validated_pending_human_review`, iç pilot ve satışa kapalıdır. | premium content/manifest, runtime hash, plan akışı ve mobil smoke testleri |
| Öğretmen onaylı değer kanıtı · veri şeması v5 | `HIDDEN` | Ham gözlemden otomatik ahlak sonucu üretmez; ayrı değer bağı, düzeltme/tombstone geçmişi ve yedek/restore çalışır. İnsan uzman ve sınıf pilotu tamamlanmamıştır. | `valueEvidenceLinks`, v5 migration/backup, öğretmen editörü testleri |
| TYMM 2024 kataloğu | `IMPLEMENTED` | 2024 okul öncesi kataloğu sürüm ve bütünlük özetiyle saklanır. | curriculum catalog testleri |
| Eski MEB kataloğu | `PARTIAL` | Yalnız desteklenen kısım vardır; tam resmî katalog diye sunulmaz. | katalog kaynak/sürüm görünürlüğü |
| Çocuk zaman çizelgesi | `PARTIAL` | Kanıt ve yoklama kayıtları vardır; tüm medya/çıktı türlerinin birleşik görünümü tamam değildir. | öğrenci dosyası/runtime |
| Portfolyo seçkisi | `PARTIAL` | Mevcut kanıt üzerinden seçim ve ayrı yansıtma alanları vardır; PDF/medya paketi tamam değildir. | portfolio testleri |
| Profil fotoğrafı | `IMPLEMENTED` | Küçük profil fotoğrafı yerel öğrenci kaydında tutulur. | student profile testleri |
| Genel medya/blob deposu | `SCHEMA_ONLY` | Fotoğraf/video belge yönetimi henüz kullanıcıya hazır değildir. | Blob/thumbnail/kota/backup kapısı |
| Genel PDF ve resmî belge merkezi | `PLANNED` | Alpha genel belge merkezi henüz çalışmaz; arayüz “Paylaşım taslakları / Dışa aktarımlar” dilini kullanır. | PDF izolasyon ve önizleme testleri |
| Premium plan PDF/DOCX çıktısı | `HIDDEN` | Exact entitlement ile eşleşen premium plan için yerel PDF/DOCX üretimi vardır; üretim entitlement servisi ve insan içerik incelemesi tamamlanmadan görünür değildir. | premium export, entitlement ve dosya imzası testleri |
| Analiz dışa aktarımı | `PARTIAL` | Öğretmen kontrollü metin dışa aktarımı vardır; çok dosyalı MD+JSON+medya paketi tamam değildir. | `docs/AI_EXPORT_SPEC.md` uyum kapısı |
| Bildirim/hatırlatıcı motoru | `SCHEMA_ONLY` | Kural ve kullanıcı yüzeyi tamamlanmadan bildirim vaadi gösterilmez. | permission, threshold ve offline testleri |
| Şifreli JSON yedek | `IMPLEMENTED` | Parolalı AES-256-GCM yedek, doğrulama ve atomik restore vardır. | backup/crypto/runtime testleri |
| Medya dâhil streaming ZIP yedek | `PLANNED` | Genel medya açılmadan tam ZIP yedek vaadi verilmez. | manifest/hash/boyut/kota/path traversal kapısı |
| Uygulama kilidi | `IMPLEMENTED` | PIN kullanıcı arayüzünü kilitler; cihaz ele geçirilmesine karşı at-rest kasa değildir. | auth/runtime testleri |
| Cihaz içi at-rest şifreleme | `PLANNED` | IndexedDB uygulama seviyesinde şifreli değildir; işletim sistemi cihaz kilidi varsayılır. | ayrı tehdit modeli ve anahtar yönetimi kararı |
| Google hesabı | `HIDDEN` | Hazırlık sözleşmesi vardır; gerçek OAuth, token veya veri yükleme yoktur. | BFF/OAuth/KVKK kararı |
| Bulut senkronizasyonu ve kurum rolleri | `PLANNED` | Yerel kullanımın ön koşulu değildir. | ayrı ürün hipotezi ve G4 kapısı |

## Geçerli kalite hükmü

`8 Ağustos 2026` değerler/premium/v5 değişiklikleri ile yıllık authored profil,
altı rollü insan-inceleme sözleşmesi ve Ekim frozen referans blueprint'i
bütünleşik `quality:gate` koşusundan geçti: korunan runtime, lint, typecheck,
auth, coverage, tüm runtime veri/UI akışları, PWA, production build, bundle
bütçesi, Chromium ve WebKit mobil smoke, Sites ve çevrim dışı production PWA
kapıları birlikte yeşildir. Bu hüküm gerçek cihaz filosu, insan uzman kurulu
veya öğretmen pilotu kanıtı yerine geçmez.

- Korunan mobil runtime bütünlük kontrolü zorunludur.
- Domain, migration, backup, PWA, offline ve production build testleri tek kalite
  komutunda çalışmalıdır.
- Tek bir mega E2E senaryosunun süre sınırında geçmesi kaliteyi “tam yeşil”
  saydırmaz; test bölünmeli ve süre bütçesi ayrıca ölçülmelidir.
- CI yeşil olmadan sürüm etiketi veya pilot GO kararı verilmez.
- Menü etiketi ve doküman vaadi yalnız bu matristen türetilir.

## Tamamlananlar

1. Alan doğrulama hataları ile depolama bütünlüğü ve güvenlik hataları ayrıldı;
   yalnız bütünlük/güvenlik sınıfları küresel fail-closed açıyor.
2. Öğrenci üyeliği günlük yoklama kaydından ayrıldı; yeni üye, öğretmen o gün
   işaretleyene kadar devam sayısına girmiyor.
3. Eğitim yılı `active / preparation / ended` durumlarına ayrıldı; hazırlık ve
   bitmiş yıllarda pedagojik yazılar kapatıldı, boş sınıf metni düzeltildi.
4. Kalıcı depolama isteği, kota eşikleri, son başarılı şifreli yedek zamanı ve
   yedek hatırlatıcısı görünür kılındı.
5. Yoklama 2.0; günlük temel durum, giriş/çıkış, erken ayrılma, kısmi gün,
   mazeret/neden, öğretmen notu, geri alma, yeniden yükleme, öğrenci geçmişi ve
   şifreli yedek/restore ile N-1 uyumluluğunu birlikte tamamladı.
6. TypeScript, korunan runtime bütünlüğü, domain/migration, güvenlik, backup,
   PWA/offline, production build ve runtime akışlarını tek kanonik kalite kapısında
   toplayan CI temeli eklendi.
7. Hediye Alpha görünür kapsamı tek capability kaydına bağlandı; Google, portfolyo,
   PDF/belge, genel medya, bildirim ve bulut yüzeyleri gerekli kapılar kapanana kadar
   ana akıştan gizlendi.
8. Altı repository koleksiyonu `EntityMap` ile kesin tiplendirildi; koleksiyon bazlı
   fail-closed doğrulama ve bozuk kayıt negatif test matrisi eklendi.
9. TYMM katalog sürümü, kaynak kontrol tarihi ve içerik özetleri değişmez provenance
   snapshot'ında korunuyor; kaynak/katalog/sürüm etkisi ayrı sınıflandırılıyor.
10. Bugün ve Sınıfım gerçek tarayıcı rotalarına ayrıldı; geri/ileri, doğrudan URL,
    yenileme ve odak aktarımı testlendi. Sınıfım ayrı lazy chunk olarak yükleniyor.
    Plan oluşturma akışı da bağımsız dikey modüle taşındı; `Prototype.tsx` görev baz
    çizgisine göre 1.392 satır küçüldü.
11. Runtime akışları süre bütçeli parçalara bölündü; Chromium ve WebKit mobil smoke,
    Axe ciddi/kritik erişilebilirlik taraması, coverage eşikleri ve gzip chunk bütçesi
    kanonik kalite kapısına eklendi.

## Sonraki kapılar

1. Kalan `Prototype.tsx` orkestrasyonunu aynı davranış koruma yöntemiyle kurulum,
   ayarlar, gözlem ve öğrenci profili dikey dilimlerine ayır; her dilimi route veya
   kısa eylem sheet'i olarak açıkça sınıflandır.
2. Genel medya açılacaksa Blob/thumbnail/streaming ZIP temelini, kota ve restore
   tatbikatını aynı teslimde kur; bu kapı kapanmadan medya vaadini görünür yapma.
3. Gerçek çocuk verisi almadan önce kurumsal KVKK kararı, cihaz güvenliği,
   öğretmen pilot protokolü ve geri yükleme tatbikatını yazılı GO/NO-GO kapısına bağla.

## Güncelleme kuralı

Bir satır yalnız şu kanıtlarla üst duruma taşınabilir: mobil kullanıcı akışı,
kalıcılık, yedek/restore kapsamı, çevrim dışı sınır, Türkçe hata durumu ve geçen
test. Şema veya koleksiyon eklemek tek başına `IMPLEMENTED` sayılmaz.
