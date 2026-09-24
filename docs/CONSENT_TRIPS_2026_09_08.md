# Belgeye bağlı veli izinleri ve gezi sayımı

Uygulama dilimi: `src/core/domain/consent-trips.ts` ve `src/features/consent-trips/`. Ana ekran/profil montajı, ortak yedek doğrulaması ve kalıcı silme bağlantısı kök ajan ile güvenlik ajanının sahipliğindedir.

## Kalıcı sözleşme

`settings` içindeki `consent-trip-v1` olayları ortak UUID / UTC / civil date zarfını kullanır. `schemaVersion: 1`, `createdAt === updatedAt`, `deletedAt: null`; yıl ve sınıf zorunludur. `studentId`, izin kararı ve çocuk sayımında UUID; ortak belge, gezi ve gezi durum olaylarında `null` olur. Normal kullanım önceki kaydı değiştirmez. Bilinmeyen alan, hatalı tarih, mükerrer olay kimliği, kopuk kaynak ve farklı sınıf/yıl ilişkisi reddedilir.

Olay türleri:

| Tür | İçerik ve koşul |
|---|---|
| `consent-document` | Belge anahtarı, başlık, sürüm, önceki sürüm, amaç, etkinlik anahtarı/adı, isteğe bağlı tam metin, geçerlilik aralığı. |
| `consent-decision` | Belge sürümünün UUID'si; çocuk; grant/revoke; önceki karar; imza/beyan tarihi; izin tarihleri; imzalayan, sıfat, kaynak ve dosya açıklaması. Geri çekme gerekçelidir. |
| `trip-plan` | Ad, tarih, yer, sorumlu, exact izin belgesi, seçili çocuk UUID'leri ve anonimleştirilmiş tarihsel katılımcı sayısı. |
| `trip-start` | Gerçek UTC başlangıç; her çocuk için exact geçerli izin kararının UUID'siyle kilitlenen kadro. |
| `trip-check` | Çıkış/ara kontrol/dönüş; görüldü/görülmedi; gerçek UTC saat. Düzeltme önceki sayım UUID'si ve gerekçesiyle eklenir. |
| `trip-complete` | Bütün mevcut katılımcıların dönüşü görüldüyse tamamlar. |
| `trip-cancel` | Gerekçeli iptal. Başlamış gezide eksik dönüşü gizleyemez. |
| `trip-reopen` | Tamamlanmış sayımı gerekçeyle tekrar açar. Önceki kapanış ve sayımlar korunur. |

Gezi olaylarının `previousEventId` zinciri, aynı anda açık iki sekmenin eski kadro/sayım üzerinden yazmasını engeller. Her yazma aynı IndexedDB işlemi içinde güncel kapsam ve bütün ilişkilerle doğrulanır. Kayıt kesintisi önceki kaynakları değiştirmez.

## İzin nasıl kullanılır?

Amaçlar: `trip`, `photo-sharing`, `portfolio-sharing`, `other`. Gezi mutlaka bir etkinlik anahtarına bağlıdır. `resolveConsentForUse` amaç, etkinlik, belge sürümü, çocuk, sınıf, yıl ve kullanım tarihini birlikte eşleştirir. Geri çekilmiş, süresi dolmuş, henüz başlamamış ve eski sürüme ait izin kullanılamaz. Yeni belge sürümü önceki izinleri yeni metne taşımaz.

`documentedSharingConsentSummary(snapshot, {scope, studentId, purpose, civilDate})` fotoğraf/portfolyo tüketicilerine `state`, `allowed`, `reason`, `document`, `decision` verir. Eski üç profil boolean'ı değiştirilmez veya belge izni olarak yorumlanmaz. Kök ajan gerçek portfolyo dosyası üretiminde bu sonucu kontrol eder; açık geri çekme halinde çıktı ve export kaydı oluşmaz. Belge olmayan eski kurulumun mevcut davranışı korunur.

Okul açılmadan kayıtlı çocuk için izin hazırlanabilir. Gezi planı ve gerçek başlangıç ayrıca gezi günündeki ortak tarihli üyelik çözümlemesini kullanır. Başlangıçtan sonraki izin geri çekme kaynak geçmişini geriye dönük değiştirmez; yeni kullanım engellenir ve öğretmen dönüş güvenliği için sayımı sürdürebilir.

İmza/beyan alanları öğretmenin kaynak belgeden yaptığı kayıtları ifade eder; uygulama dijital imza oluşturmaz ve velinin hukuki yetkisine ilişkin karar vermez.

## Sayımın anlamı

Çıkış, ara kontrol ve dönüş ayrı aşamalardır. İşaretlenmemiş kayıt **sayım bekliyor**, öğretmenin açık olumsuz kaydı **görülmedi** olarak gösterilir. İkisi de yoklama devamsızlığına dönüştürülmez. Dönüş payı görüldü olarak kayıtlı çocuk sayısı; payda başlangıçta kilitlenen, gizlilik silmesiyle kimliği kaldırılmamış kadrodur. Tarihsel anonim katılımcı sayısı ayrıca gösterilir. Çıkışı görülmeden ara kontrol veya dönüş yazılamaz. Eksik dönüş varken tamamlama ve başlamış geziyi iptal etme devre dışıdır; servis de aynı koşulu tekrar doğrular.

Kalıcı silme entegrasyonu, dönmemiş aktif gezi katılımcısının silinerek paydadan düşmesini engeller. Güvenlik ajanının `student-lifecycle.ts` koruması kaynak üzerinde doğrulanmıştır. Tamamlanmış kaynaklarda hedef çocuğun karar/sayım olayları temizlenir; ortak plan/kadroda yalnız UUID satırı çıkarılır ve anonim tarihsel sayaç korunur. Kalan olay zinciri typed redaction ile yeniden bağlanır.

## Mobil akış ve belge

`ConsentTripsWorkspace` kökün `Sınıf yönetimi` BottomSheet alanına monte edilir. Props: `store`, `initialStudentId?`, `initialSection?: 'consents'|'trips'`, `refreshKey?`, `disabled?`, `onChanged?`. Metin alanları `KeyboardInput`/`KeyboardTextarea` kullanır; korunan mobil runtime değiştirilmemiştir.

İzin çizelgesi ve gezi sayım çizelgesi mevcut gerçek PDF önizleme motorunu kullanır. İzin çıktısının varsayılanı çocuk, karar durumu ve tarihlerdir; imzalayan/kaynak veya tam belge metni ancak çıktı bölümünde seçilirse eklenir. Özel aile notları, telefonlar ve kimlik numaraları bu çizelgelere alınmaz. Semantik A4 tabloları Türkçe gömülü font, yinelenen başlık/çocuk bağlamı ve `Okul Öncesi Öğretmeni` alt bilgisi içerir. Görünen PDF ile indirilen dosya aynı önizleme ürünüdür.

## Denetim kanıtı

- `tests/features/consent-trips.test.mjs`: **20/20 geçti**; güncel izin, geri çekme, sürüm, gezi üyeliği, eksik dönüş, gerekçeli düzeltme, iptal, iki sekme yarışı, kesinti, hatalı kaynak, gerçek portfolyo engeli, hazırlık dönemi, tarihsel üyelik ve son üç günlük izin hatırlatmasını kapsar. Log: `app/output/consent-trips-unit.log`.
- Son `npx tsc --noEmit` ve `npm run check:runtime` geçti; **36 korunan dosya** doğrulandı. Loglar: `app/output/consent-trips-typecheck-final.log`, `consent-trips-runtime-final.log`.
- `tests/consent-trips-ui.spec.ts`: **3/3 geliştirme testi geçti** (57,9 sn); 320/390 px gerçek uygulama formları, izin/PDF, gezi başlangıcı, eksik dönüş, düzeltme, tamamlama, reload ve iki ayrı IDB sekmesinde eski sürüm reddi. Log: `app/output/consent-trips-ui-final.log`.
- PDF testleri `data-pdf-rendered=true` sonrasında sayfayı yakalayacak biçimde güçlendirildi. Son **2/2 geliştirme render testi** geçti (48,3 sn). Log: `app/output/consent-trips-ui-rendered.log`.
- Kökün 0.28.0 üretim paketinde **320/390 px çevrimdışı 2/2 geçti** (19,1 sn). `offlineReady` sonrası ağ kapalıyken yeni belge, izin ve gezi yazıldı; gerçek izin PDF'si üretildi/indirildi ve reload ile aynı kayıtlar açıldı. Log: `app/output/consent-trips-production.log`.
- Gezi çizelgesinin de gerçek render/indirme kabulü aynı çevrimdışı 390 px akışına eklendi; **1/1 geçti** (9,1 sn). Log: `app/output/consent-trips-production-trip-pdf.log`.
- Görseller ve indirilen özgün PDF'ler: `app/output/consent-trips-2026-09-08/{dev,production}/`. Üretim A4 izin PDF'si ayrıca 1,5× çözünürlükte yeniden çizilip gözle incelendi; A4 yatay 841,89 × 595,28 pt, Türkçe metin ve okunur tablo doğrulandı. Gezi PDF'si A4 dikeydir.

İlk başarısız koşumların logları korunmuştur: paralel üretimde henüz yazılmamış growth UI/PDF importları, ana yönetim düğmesinin açıklama içeren erişilebilir adı ve IDB testinin başlangıç işlemi bitmeden kaynak kimliği okuması. Son ikisi test beklentilerinde düzeltildi; timeout artırılarak veya üretim koruması kaldırılarak geçiş sağlanmadı.

Kaynaklar ve kullanıcı kayıtları loglanmaz. Testler yalnız kurgu çocuk/veli verileri kullanır. Paylaşım, yayın, commit veya push bu dilimin kapsamında yapılmamıştır.
