# Aile katılımı — veli randevuları ve iletişim tercihleri

8 Eylül 2026. Yalnız kurgu veriyle geliştirme ve kabul denetimi yapıldı. Korunan mobil çalışma zamanı, yayın dosyaları ve kullanıcı verileri bu modül çalışmasında değiştirilmedi.

## Teslim edilen davranış

Öğretmen sınıf ve eğitim yılına bağlı bir gün için görüşme saatlerini açar. Aralık 10/15/20/30/45/60 dakikalık görüşmelere bölünür. Çocuğun gerçek kayıtlı anne, baba veya üçüncü kişi kaydı seçilir; görüşme yeri/yöntemi ve amacı açıkça girilir. Öğretmenin aynı yerel profildeki bütün sınıf ve eğitim yılları ortak çakışma kontrolüne katılır. Sınıf değişmişse eski ekrandan gelen komut reddedilir. Başka cihazın verisinin bilindiği iddia edilmez.

Randevunun saat değişikliği, iptali ve gerçekleşmiş görüşmeye bağlanması yeni olaylarla saklanır. Önceki kaynak değişmez. Aktif randevulu saat aralığı doğrudan kapatılamaz. Çocuğun arşivlenmesi, öğretmenin saatini iptal edilemez biçimde kapalı bırakmaz. Geçmiş saate yeni rezervasyon yapılamaz; gerçekleşmiş görüşme gelecekte veya farklı günde kaydedilemez.

Görüşme sonucu, mevcut `teacher-followup-v1 / family-meeting` kaydı ile `appointment-meeting` bağlantısını aynı IndexedDB işlemi içinde oluşturur. Katılan kişiler, görüşülen konu, birlikte alınan karar ve sonraki takip günü gerçek öğretmen takip ekranında yeniden kullanılır. Disk kesintisinde iki kayıttan yalnız biri kalmaz.

Takvim ortak `resolveSchoolDay` servisidir. Hafta sonu, resmî tatil, ara tatil ve öğretmenin yerel okul kapanışı görünür. Çalışılmayan güne saat veya randevu açılacaksa öğretmen gerekçe girer. Geçersiz takvim ve eğitim yılı dışı tarih kabul edilmez.

Anne, baba ve üçüncü kişinin tercihi gerçek contact UUID’sine ve kaydedildiği sıradaki kişi bilgisine bağlıdır. Kanal, uygun gün/saat, dil ve metin/ses/büyük yazı tercihlerinin hepsi açık bildirime dayanır. Boş alan bildirilmemiş kalır. İsimden veya aile durumundan bilgi çıkarılmaz. Bildirim günü ve sözlü/yazılı kaynak seçilir; açık bildirim teyidi olmadan UI kaydetmez. Yeni bildirim/geri çekme eski kaydı silmez. Kişi bilgisi değiştiğinde eski tercih güncel kişiye uygulanmaz. Tercihler randevu planlaması sırasında görünür; bunlar izin veya teslim yetkisi sayılmaz. Otomatik çeviri, ses üretimi ve mesaj gönderimi bu modülün işlevi değildir.

## Belgeler

- Kişiye özel davet yalnız seçilen randevunun çocuk/yakın bilgisi, gün/saat, yer/yöntem ve amacını içerir.
- Ortak saat çizelgesi yalnız saat ve doluluk durumunu içerir; çocuk veya veli adı, telefon ve görüşme amacı bulunmaz.
- Her iki belge gerçek PDF önizlemesi, canvas render ve açık indirme eylemi kullanır. Türkçe gömülü yazı tipi, A4 dikey sayfa ve `Okul Öncesi Öğretmeni` alt bilgisi vardır.

## Kalıcı sözleşme ve kayıt güvenliği

`src/core/domain/family-engagement.ts` otoritedir. `SETTING_TYPE = family-engagement-v1`, `schemaVersion = 1`; üst alanlar `settingType`, `academicYearId`, `classroomId`, `studentId`, `workflow` ve ortak StoredRecord alanlarıdır. Olay UUID, UTC oluşturulma zamanı, İstanbul sivil günü ve `deletedAt:null` içerir; `updatedAt` oluşturulma zamanıyla aynıdır. Bilinmeyen alanlar ve akış türleri reddedilir.

Akışlar: `availability`, `availability-close`, `appointment`, `appointment-cancel`, `appointment-meeting`, `communication-preference`. Kişisel bilgi taşıyan olayların tamamında üst seviye `studentId` bulunur. Saat aralığı ve aralık kapatma olaylarında `studentId:null` kullanılır. Çocuk kalıcı silme ve yedek kaydı kök ajanın paylaşılan yaşam döngüsü/şema kapılarından geçer.

Yazma servisi bütün ilgili koleksiyonları tek `readwrite` işlemi içinde okuyup denetler. Eski olay başlığı, farklı çocuk/sınıf, sahte contact, yetim kaynak, aynı saat çakışması ve dallanmış geçmiş reddedilir. Kayıt sırasında cihaz saati önceki olaylardan bir dakikadan fazla geri gitmişse yeni işlem açılmaz.

## Kabul kanıtları

- `tests/features/family-engagement.test.mjs`: **21/21 geçti**. Saat dönüşümü, doluluk, başka sınıf, yarış, değişiklik, iptal, arşiv, tatil/kapanış, sahte contact, bağımsız tercihler, geri çekme, hatalı şema, gerçek görüşme bağlantısı, kesinti, yetim/dallanmış geçmiş ve PDF üretimi.
- `tests/family-engagement-ui.spec.ts`: geliştirme sunucusunda **3/3 geçti, 45,5 saniye**. 390 px gerçek form/PDF/değişiklik/görüşme/reload, açık taslakta sınıf değişimi ve gerçek iki IndexedDB sekmesi yarış/iptal/reload.
- Tür denetimi geçti; mobil runtime **36 korunan dosya** doğrulandı.
- PDF dosyaları bağımsız `fitz` ile açıldı; ikisi de tek A4 sayfa. Ortak çizelgede çocuk/veli adı ve amaç bulunmadığı, özel davette yalnız hedef ailenin bulunduğu doğrulandı. A4 görselleri ve 390 px ekranı gözle incelendi.
- Eşzamanlılık becerisinin salt okunur raporunda 10 korunan çakışma, 0 korumasız çakışma ve 0 kilit döngüsü var. Araç korunan çakışmaları `REVIEW_REQUIRED` olarak listeler; gerçek IDB iki sekme denetimi korumanın çalıştığını ayrıca doğruladı.
- Üretim/çevrimdışı kabul için aynı test dosyası `FAMILY_ENGAGEMENT_PRODUCTION=1` kullanır. PWA offlineReady sonrasında ağ kapatılır ve sayfa yeniden yüklenir; bütün yeni kayıtlar ve PDF'ler çevrimdışı üretilir. Sonuç, ayrı üretim logunda yer alır.

Kanıt klasörü: `app/output/family-engagement-2026-09-08/`. Loglar: `family-engagement-unit.log`, `family-engagement-ui-scope-final.log`, `family-engagement-typecheck-final.log`, `family-engagement-runtime-final.log`.

## Dosya sorumluluğu

Domain: `src/core/domain/family-engagement.ts`. Özellik: `src/features/family-engagement/` içindeki workspace, servis, belge, metin ve CSS. Test: iki test dosyası, `tests/fixtures/family-engagement-fixture.mjs`, `playwright.family-engagement.config.ts`. Paylaşılan şema, yedek, yaşam döngüsü, ana ekran montajı ve yayın kök ajan tarafından tamamlanır.

Kalıcı ders: Aynı kaynağı kullanan kardeş düzenleyici ve detay bileşenlerinin React anahtarları, kaynak UUID’si yanında bileşen rolünü de taşımalıdır; aksi hâlde yazı girişi sırasında yinelenen form oluşabilir.

Üretim kabulü tamamlandı: 0.28.0 ara paket üzerinde çevrimdışı 390 px kayıt/PDF/reload ile randevu/iptal akışları **2 geçti, 1 geliştirme fixture testi atlandı; 16,4 saniye**. Kanıt: app/output/family-engagement-2026-09-08/production-final.txt. Geliştirmeye özel sınıf değişimi aynı kaynakla önceki 3/3 koşumda doğrulandı.
