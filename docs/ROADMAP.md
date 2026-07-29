# MaarifOS Mega Master Planı

> Ürün sıfırlama kararı, EÇE/TYMM çift program mimarisi ve güncel araştırma için
> [PRODUCT_RESET_BLUEPRINT.md](./PRODUCT_RESET_BLUEPRINT.md) kanonik kaynaktır.

- **Plan tarihi:** 22 Temmuz 2026
- **Plan ufku:** 18 ay
- **Birincil kullanıcı:** Emine Öğretmen
- **Ürün sahibi:** Sercan
- **Kök orkestrasyon:** HALİS
- **Baş koordinasyon:** MARİF
- **Kanonik kapsam:** `PROJECT.md` ve bu belge
- **Kapsam dışı:** Eski tek dosyalık HTML demo

Bu belge mevcut çalışan React + TypeScript + Vite + IndexedDB + PWA ürününü
sıfırdan kurmayı değil, güvenli dikey dilimlerle büyütmeyi tarif eder. Bir fazın
takvimde bitmiş sayılması yeterli değildir; ilgili kalite kapısı kanıtla geçmeden
sonraki fazın veri veya gizlilik kapsamı açılmaz.

---

## 1. Yönetici kararı

MaarifOS bir “özellik koleksiyonu” değil, öğretmenin sınıfta bir kez oluşturduğu
kanıtı yoklama, gözlem, plan, öğrenci zaman çizelgesi, portfolyo, veli belgesi ve
dönem raporunda güvenle yeniden kullanmasını sağlayan **yerel öncelikli öğretmen
işletim sistemi** olacaktır.

Ürün büyüme sırası değişmez:

```text
Güvenli yerel çekirdek
  → gerçek sınıf ve öğrenci yönetimi
  → tarihsel yoklama ve kanıta dayalı gözlem
  → şifreli kurtarma ve kontrollü Emine pilotu
  → sürümlü Maarif kataloğu, plan ve medya
  → rapor, portfolyo ve analiz paketi
  → kapalı öğretmen pilotu
  → iOS / Google Play ücretli 1.0
  → yalnız ayrı kararla opsiyonel E2EE bulut
```

Hız uğruna atlanmayacak üç kapı:

1. Veri kaybı ve geri yükleme kanıtı
2. Pedagojik doğruluk ve öğretmen onayı
3. Gerçek çocuk verisi için hukuk/gizlilik kararı

---

## 2. Mevcut doğrulanmış temel

### 26 Temmuz 2026 uygulama durumu

- D0 aktif sınıf/eğitim yılı yalıtımı ve eski veri karantinası tamamlandı.
- Eğitim yılı kapanışı, salt-okunur arşiv özeti ve aynı öğrenci kimliğiyle yeni
  yıla yeniden kayıt çekirdeği tamamlandı.
- D1 plan → etkinlik → değiştirilemez ham gözlem → ayrı öğretmen onayı →
  kaynaklı pending değerlendirme taslağı veri ve servis zinciri tamamlandı.
- D1 zinciri gerçek tam ekran telefon akışına bağlandı. Yeni kayıt yolu artık
  plansız legacy gözlem üretmiyor; plan, etkinlik, çocuk, gözlem notu, açık
  program onayı ve öğretmen değerlendirmesi aynı izlenebilir akışta ilerliyor.
- Program katalog kimliği ve kaynak sürümü sınıf profilinde öğretmen beyanı
  olarak tutuluyor; resmî katalog doğrulaması yapılmış gibi gösterilmiyor.
- Eğitim yılı tarih sınırı, aynı gün tek aktif etkinlik, cihazda kalıcı öğretmen
  UUID'si ve yalnız bugünkü D1 kanıtlarından türetilen sayaçlar doğrulandı.
- IndexedDB sürümü 2, yedek veri şeması V2 ve V1→V2 uyumluluk geçidi eklendi.
- D1 yedek grafı; gözlem, program bağlantısı, atıf ve değerlendirme dönemi
  kopukluklarını geri yükleme başlamadan reddediyor.

### Çalışan özellikler

- React 19, strict TypeScript ve Vite tabanı
- Windows, Android ve iOS tarayıcılarında gerçek ekran PWA
- Kurulabilir ve çevrim dışı açılabilen uygulama kabuğu
- IndexedDB tabanlı 17 koleksiyonlu yerel kasa
- UTC zaman damgası + `Europe/Istanbul` sivil gün modeli
- Tarihsel günlük yoklama: `studentId + civilDate`
- Geldi, geç ve yok durumları
- Günlük yoklama tamamlama durumu
- Son yoklama değişikliğini geri alma
- Çok sekmeli yazmada dar kayıt güncellemesi
- Etkinliğe bağlı değiştirilemez gözlem notu ve program bağlantısı iş akışı
- Öğretmen yazarlı, tarihli kanıta atıf yapan değerlendirme taslağı
- Sürümlü, SHA-256 doğrulamalı JSON yedek
- Atomik replace ve çakışma raporlu merge restore
- Restore sırasında CS-001 mükerrer işaretleme
- Google hesabı için güvenli hazırlık sözleşmesi; gerçek OAuth yok
- Otomatik domain, migration, backup, runtime, PWA ve offline testleri

### Bugünkü stratejik açıklar

1. Eğitim yılı arşivine kullanıcı arayüzünden erişim ve yıl geçiş sihirbazı eksiktir.
2. Yoklamada erken ayrılma, kısmi gün, saat, neden ve geçmiş görünümü eksiktir.
3. Gözlem zaman çizelgesi, bağlam/alıntı alanları ve resmî sürümlü katalog
   içe aktarımı henüz kullanıcı arayüzünde değildir.
4. Çocuklar, Arşiv ve Raporlar menüleri tam işlevli değildir.
5. Uygulama kilidi ve şifreli yedek yoktur.
6. Medya/blob, portfolyo, PDF ve tam ZIP yedek yoktur.
7. Maarif referansları sürümlü bir katalog değildir.
8. `Prototype.tsx` ve dashboard veri servisi fazla sorumluluk taşımaktadır.
9. Gerçek migration registry, CI, lint/format ve erişilebilirlik kapısı eksiktir.
10. Gerçek Google OAuth, senkronizasyon ve bulut özellikle ertelenmiştir.

---

## 3. Kuzey yıldızı ve başarı tanımı

### Kuzey yıldızı

**Haftalık aktif öğretmen başına, güvenli biçimde yeniden kullanılan kanıtlı
kayıt sayısı.**

Bu metrik çocuk içeriğini veya kimliğini telemetriye göndermez. İlk pilotta
uzaktan telemetri yerine öğretmen kontrollü görev günlüğü kullanılır.

### Ürün vaadi

> Bir kez kaydet; yoklamada, gözlemde, portfolyoda ve raporda yeniden kullan.

### 1.0 başarı eşiği

- 20 öğrencilik yoklama medyanı ≤30 saniye
- Öğrenci + ham gözlem medyanı ≤15 saniye
- İlk değer üretme süresi ≤10 dakika
- Test edilen normal ve arıza senaryolarında veri kaybı: 0
- Yanlış öğrenci verisi içeren çıktı: 0
- Yedek ve temiz kurulum restore başarı oranı: %100
- Çökmesiz oturum: ≥%99,5
- Dört haftalık pilotta aktif öğretmen oranı: ≥%80
- “İşimi hızlandırdı” pilot yanıtı: ≥%70
- WCAG 2.2 AA ve kritik dokunma hedeflerinde 44×44 CSS px
- P0/P1 açık hata: 0

---

## 4. Değişmez ürün ve etik ilkeleri

1. Kullanıcı öğretmendir; çocuk uygulamaya bağlanacak bir “son kullanıcı” değildir.
2. Ürün çocuğu puanlamaz, sıralamaz, teşhis etmez veya risk skoru üretmez.
3. Ham gözlem otomasyonla değiştirilmez; yorum ve kanıt ayrı tutulur.
4. Kanıt azlığı, çocukta beceri yokluğu olarak gösterilmez.
5. Maarif eşlemesi öğretmen onayı olmadan kesinleşmez.
6. Rapor öğretmen onayı olmadan oluşmuş kabul edilmez veya gönderilmez.
7. Başka öğrenciye ait hassas veri, bireysel çıktıya giremez.
8. Reklam, çocuk profilleme, yüz/duygu tanıma ve veri satışı yoktur.
9. Hesap, internet ve bulut yerel kullanımı hiçbir zaman zorunlu kılmaz.
10. Yedek, restore, veri dışa aktarma ve hesap silme güvenlik özellikleridir;
    ücret duvarının arkasına konmaz.
11. Gerçek çocuk verisi G1 hukuk/gizlilik kapısından önce kullanılmaz.
12. Uygulama içine otonom üretken yapay zekâ eklenmez. Haricî analiz paketi
    ayrı, görünür, kullanıcı kontrollü ve kanıt indeksli olur.

---

## 5. Kanonik değer zinciri ve modül haritası

```text
Eğitim yılı / sınıf / öğrenci
  → günlük yoklama
  → ham gözlem ve çocuk sözü
  → etkinlik / plan / öğretmen yansıtması
  → medya ve ürün kanıtı
  → öğretmen onaylı Maarif ilişkisi
  → öğrenci zaman çizelgesi
  → portfolyo / veli belgesi / dönem raporu
  → eğitim yılı arşivi
  → doğrulanmış yedek ve geri yükleme
```

### P0 — Güvenilir günlük çekirdek

- Eğitim yılı, sınıf, öğrenci
- Günüm
- Yoklama 2.0
- Hızlı gözlem 1.0
- Öğrenci zaman çizelgesi
- Uygulama kilidi
- Şifreli yerel yedek ve restore

### P1 — Pedagojik omurga

- Sürümlü Maarif kataloğu
- Günlük/haftalık/aylık plan
- Etkinlik ve kanıt ilişkileri
- Çocuk/program/öğretmen yansıtmaları
- Kapsama pusulası
- Arama ve filtre
- Medya kabulünden önce V2 staging restore ve tam ZIP yedek

### P2 — Medya ve güvenli çıktı

- Kamera/galeri ve thumbnail
- Kullanım amacına göre paylaşım bayrakları
- Portfolyo
- Haftalık sınıf bülteni
- Bireysel veli görüşme belgesi
- Kanıt izli PDF rapor

### P3 — Yaşam döngüsü ve ölçek

- Medya dâhil şifreli tam ZIP yedek
- Eğitim yılı arşivi
- Bildirim ve hatırlatıcılar
- Haricî analiz paketi
- Mağaza paketleri ve abonelik
- Opsiyonel hesap ve E2EE senkronizasyon

---

## 6. Fazlar, kapılar ve rollback

| Faz | Hedef çıktı | Zorunlu çıkış kapısı | Rollback / güvenli dönüş |
|---|---|---|---|
| **F0 — Mevcut temeli dondur** | Bugünkü yoklama ve yedek teslimatını kanonik başlangıç yapmak | Tam kalite zinciri, build, runtime lock, offline PWA ve bağımsız P0/P1 inceleme yeşil | Veri şeması değişmez; yeni geliştirme başlamaz |
| **F1 — Hediye Alpha** | Gerçek eğitim yılı/sınıf/öğrenci, yoklama 2.0, gözlem 1.0, kilit ve şifreli kurtarma | Kurgu veride Emine ana akışları yardımsız tamamlar; yedek/restore tatbikatı geçer | Özellik bayrakları kapanır; veri silinmez |
| **F2 — Emine kontrollü pilotu** | Tek öğretmen, tek sınıf, tek ana cihaz; zaman çizelgesi ve günlük kullanım | G1 gizlilik kararı, 20 okul günü, 0 veri kaybı, aylık restore tatbikatı | Pilot durur; yerel veri dışa aktarılır, önceki immutable sürüm açılır |
| **F3 — Pedagojik Beta ve Backup V2** | Maarif kataloğu, plan/kanıt zinciri, medya öncesi staging restore ve tam ZIP yedek | Her yorumdan ham kanıta erişim; katalog sürümü korunur; zararlı/bozuk arşiv testleri geçer | Yeni katalog ve V2 ihracı pasifleşir; JSON V1 ve geçmiş referanslar korunur |
| **F4 — Kapalı öğretmen pilotu** | 8–12 öğretmen, farklı cihazlar, medya, rapor ve portfolyo | 10 ardışık okul günü veri kaybı 0; ≥%80 aktif pilot; başka öğrenci sızıntısı 0 | P0/P1 olayında pilot ve yayın otomatik durur |
| **F5 — Mağaza Beta** | TestFlight, Play kapalı test ve native platform değeri | Privacy/Data Safety, erişilebilirlik, gerçek cihaz matrisi ve PWA→native veri göçü kanıtlı | PWA ana yol olarak açık kalır; mağaza build’i geri çekilir |
| **F6 — Türkiye 1.0** | Ücretli, reklamsız öğretmen ürünü | G3 mağaza kapısı, ödeme isteği, destek kapasitesi ve pilot düzeltmeleri tamam | Önceki imzalı artifact; veri şeması uyumsuzsa düzeltme sürümü |
| **F7 — Opsiyonel bulut/kurum** | BFF OAuth, E2EE sync veya okul paketi | G4 hukuk, tehdit modeli, sızma testi, silme/dışa aktarma ve yurt dışı aktarım kararı | Sync kapanır; yerel kasa tek otorite olarak çalışır |

---

## 7. İlk üç sprint: icra emri

Her sprint iki haftadır. Takvim, kalite kapısı geçilmezse uzar; kapsam genişlemez.

### Sprint 1 — Gerçek sınıf omurgası

**Dikey akış:** Eğitim yılı oluştur → sınıf oluştur → öğrenci ekle/düzenle →
arşivle → geri al → reload → yedekle → temiz kurulum restore et.

Teslimatlar:

- `AcademicYear`, `Classroom`, `Student` tipli domain sözleşmeleri
- Aktif eğitim yılı ve aktif sınıf seçimi
- Öğrenci ekleme, düzenleme, arşivleme ve çöp kutusu
- Bağımlı yoklama/gözlem geçmişini koruma
- Kurgu başlangıç sınıfını gerçek onboarding akışına dönüştürme
- Repository portları ve dar transaction use-case’leri
- Backup ilişki doğrulaması ve round-trip
- Offline, çok-sekme ve soft-delete testleri

Sprint kapısı:

- Öğrenci ≤30 saniyede eklenir.
- Arşivlenen öğrencinin geçmişi silinmez.
- Geri alma, reload ve restore aynı sonucu verir.
- Gerçek çocuk verisi ve gizli anahtar repo/test/log içinde yoktur.

### Sprint 2 — Yoklama 2.0 ve gözlem 1.0

**Dikey akış:** Günün sınıfını aç → yoklama yap → geç/erken/kısmi saatini
kaydet → gözlem gir → düzelt → öğrenci zaman çizelgesinde gör.

Teslimatlar:

- `early_leave` ve `partial`
- Giriş/çıkış saati, neden ve not
- Günlük, haftalık ve öğrenci bazlı yoklama geçmişi
- Ham gözlem, bağlam, çocuk sözü ve kullanım bayrakları
- `ObservationRevision` ile düzenleme geçmişi
- Öğrenci zaman çizelgesi
- Arşivli öğrenci ilişkisi ve orphan karantina
- Tek elle kullanım ve ekran okuyucu akışları

Sprint kapısı:

- 20 öğrencilik yoklama medyanı ≤30 saniye.
- Hızlı gözlem medyanı ≤15 saniye.
- İstanbul gece sınırı, offline, iki gün, iki sekme ve CS-001 testleri geçer.
- Ham metni değiştiren otomasyon yoktur.

### Sprint 3 — Güven, kurtarma ve hediye deneyimi

**Dikey akış:** Uygulamayı kilitle → kurgu prova yap → şifreli yedek oluştur
→ veriyi temizle → geri yükle → Emine’ye rehberli akışı sun.

Teslimatlar:

- Uygulama kilidi ve görünür yerel kasa durumu
- Parola ile Web Crypto tabanlı şifreli JSON yedek V1.5
- Restore öncesi güvenlik snapshot’ı
- Şema, checksum, ilişki ve sayaç önizlemesi
- Salt okunur güvenli kurtarma modu
- Son başarılı yedek tarihi ve yedek hatırlatması
- Emine’ye özel, kurgu verili beş dakikalık rehber
- Windows, Android ve iPhone kurulum kartı
- Gizli veri içermeyen geri bildirim paketi

Sprint kapısı — **G0 Hediye:**

- Kurgu veri dışında çocuk verisi yok.
- Çevrim dışı açılış ve şifreli restore tatbikatı başarılı.
- Emine yoklama, gözlem ve yedek akışını yardım almadan tamamlar.
- P0/P1 hata yoktur.

---

## 8. 30–60–90 günlük plan

### Gün 0–30 — Alpha güvenilirliği

- Sprint 1 ve Sprint 2 çekirdeği
- Mimari karakterizasyon testleri
- Uygulama kilidi tasarımı
- Veri envanteri, saklama ve imha matrisi taslağı
- Kurgu veriyle hediye akışının kullanılabilirlik provası

**30. gün sonucu:** Emine kurgu veride günlük çekirdeği bağımsız kullanır.

### Gün 31–60 — Emine pilot kapısı

- Sprint 3 ve şifreli kurtarma
- G1 hukuk/gizlilik belgeleri ve sorumluluk kararı
- Önce üç takma adlı deneme öğrenci
- Zaman çizelgesi, yoklama geçmişi ve gözlem filtresi
- Düşük depolama, güncelleme ve temiz kurulum tatbikatı
- Günlük iki dakikalık öğretmen geri bildirimi

**60. gün sonucu:** G1 geçmişse dar gerçek veri pilotu; geçmemişse kurgu pilotu
devam eder.

### Gün 61–90 — Kapalı Beta hazırlığı

- Sürümlü Maarif katalog altyapısı
- Plan–etkinlik–kanıt zinciri
- Medya öncesi Backup V2, staging restore ve zararlı arşiv testleri
- Medya/thumbnail ve kanıt izli PDF için sözleşme ve prototipler
- 8–12 öğretmen kapalı pilot hazırlığı
- Native wrapper feasibility spike
- Destek, olay yönetimi ve fiyat görüşmeleri

**90. gün sonucu:** G2 GO/NO-GO; mağaza beta adayı veya yeni pilot döngüsü.

---

## 9. 12–18 aylık ürün ve ticari yol

| Dönem | Ürün sonucu | Pilot/ticari sonuç |
|---|---|---|
| Ay 0–3 | Alpha: sınıf, öğrenci, yoklama, gözlem, kilit, şifreli yedek | Emine kontrollü pilotu |
| Ay 3–6 | Beta: Maarif, plan, medya, rapor, portfolyo, tam ZIP restore | 8–12 öğretmen kapalı pilot |
| Ay 6–9 | Native Android/iOS beta, erişilebilirlik ve performans sertleştirme | TestFlight ve Play kapalı test |
| Ay 9–12 | MaarifOS 1.0 | Türkiye ücretli lansmanı |
| Ay 12–15 | Eğitim yılı arşivi, rapor/portfolyo olgunluğu | Bireysel Pro büyümesi |
| Ay 15–18 | İsteğe bağlı E2EE sync veya okul paketi keşfi | G4 kurum/bulut kararı |

---

## 10. Hedef teknik mimari

Mevcut stack korunur. Hedef, yeni framework değil modüler yerel-öncelikli
monolittir.

```text
src/
  app/                 composition, navigation, providers, feature flags
  features/
    academic-year/
    classroom/
    student/
    attendance/
    observation/
    media/
    plan/
    portfolio/
    report/
    analysis-export/
    backup/
    archive/
  platform/            database, migrations, media, backup, crypto, pwa
  shared/              validation, dates, identifiers, errors, i18n, ui
```

Bağımlılık yönü:

```text
Presentation → Application use case → Domain rules ← Repository ports
                                               ↑
                             IndexedDB / Backup / Media adapters
```

Kurallar:

- React bileşeni doğrudan IndexedDB’ye erişmez.
- Domain saf TypeScript olur.
- Saat, UUID ve kullanıcı bağlamı enjekte edilir.
- Her kalıcı entity aynı teslimatta backup/restore kapsamına girer.
- Çok-sekme eski state’i tüm koleksiyona yazmaz.
- Yeni state kütüphanesi yalnız ölçülmüş ihtiyaç ve ADR ile eklenir.
- Üretimde telefon simülatör çerçevesi bulunmaz.

---

## 11. Şema, migration ve veri yaşam döngüsü

Bağımsız sürümler:

1. `DATABASE_VERSION`
2. `record.schemaVersion`
3. `BACKUP_VERSION`
4. `MAARIF_REFERENCE_VERSION`
5. `SYNC_PROTOCOL_VERSION` — yalnız ileride

Migration protokolü:

1. Expand
2. İdempotent migrate
3. Sayaç/ilişki/checksum verify
4. En az bir sürüm sonra contract

Zorunlu güvenlik:

- Migration öncesi recovery snapshot
- N-1 ve mümkünse N-2 fixture testleri
- Hata durumunda salt okunur güvenli mod
- Downgrade sırasında veri dönüştürmeme
- Bilinmeyen alanları eski sürümün silmemesi
- Soft delete, çöp kutusu ve geri alma
- Mükerreri silmeme; `_MUKERRER_INCELE`

Yedek evrimi:

- V1: mevcut doğrulanmış JSON
- V1.5: parola ile şifrelenmiş JSON kurtarma paketi
- V2: medya dâhil ZIP/container, dosya bazlı checksum ve staging restore
- V2 restore: boyut/adet limiti, zip-bomb ve path traversal savunması
- Parola ve kurtarma anahtarı uygulamada veya sunucuda saklanmaz

---

## 12. Maarif Modeli uyum stratejisi

Maarif kodları uygulama içine sabit yazılmaz. Sürüm kontrollü referans paketi:

- Yaş grubu: 36–48, 48–60, 60–72 ay
- Öğrenme alanı ve çıktıları
- Alan/kavramsal/fiziksel beceriler
- Eğilimler
- Sosyal-duygusal öğrenme
- Erdem–Değer–Eylem
- Okuryazarlıklar
- Öğrenme kanıtları
- Zenginleştirme ve destekleme
- Aile/toplum katılımı
- Çocuk/program/öğretmen yansıtması

Her referans resmî kaynak URL’si, yayın/yürürlük bilgisi, katalog sürümü ve
bütünlük özeti taşır. Katalog güncellemesi geçmiş gözlemleri değiştirmez.

Pedagojik işlem sırası:

```text
Ham olayı kaydet
  → sakin zamanda zenginleştir
  → olası Maarif referansını bul
  → öğretmen açıkça onaylar
  → kanıt ve yorum ayrı saklanır
```

---

## 13. Kalite sistemi ve Definition of Done

Her dikey dilim şu sıradan geçer:

1. Kabul kriteri ve tehdit/veri kaybı senaryosu
2. Başarısız domain testi
3. Domain ve çalışma zamanı doğrulayıcı
4. Application use case ve transaction sınırı
5. Repository ve gerekiyorsa migration
6. Backup/restore sözleşmesi
7. Mobil erişilebilir UI
8. Offline, reload ve çok-sekme testi
9. Türkçe hata/boş/yükleniyor durumları
10. Production build ve gerçek PWA testi
11. Bağımsız kalite ajanı incelemesi
12. Dokümantasyon ve rollback provası

Test piramidi:

- %60–70 domain/unit
- %20–30 IndexedDB, migration, backup ve service-worker integration
- %10 kritik gerçek kullanıcı E2E
- Chromium her değişiklikte
- WebKit/Firefox sürüm adayında
- Android/iPhone/Windows gerçek cihaz matrisi Pilot ve 1.0’da

### “Kusursuzluk” rubriği

Her boyut 0–4 puanlanır:

1. Veri bütünlüğü
2. Gizlilik ve güvenlik
3. Pedagojik doğruluk
4. Görev verimliliği
5. Çevrim dışı güvenilirlik
6. Açıklanabilirlik
7. Erişilebilirlik
8. Performans
9. Test edilebilirlik
10. Pilot değeri

Sürüm kapısı:

- Veri, gizlilik ve pedagoji mutlaka 4/4
- Diğer hiçbir boyut 3’ün altında değil
- Toplam ≥36/40
- P0/P1 hata 0
- Temiz kurulum restore tatbikatı başarılı

---

## 14. Performans ve erişilebilirlik bütçeleri

- İlk JS ≤250 KiB gzip
- Kritik CSS ≤75 KiB gzip
- Medya hariç app-shell cache ≤1,5 MiB
- LCP p75 ≤2,5 saniye
- INP p75 ≤200 ms
- CLS ≤0,05
- Sıcak offline açılış ≤1 saniye hedef
- Dokunma geri bildirimi ≤100 ms
- 30 öğrencilik yoklama yazımı ≤300 ms
- 5.000 gözlemde filtre ≤500 ms
- Normal metin kontrastı ≥4,5:1
- Kritik dokunma hedefi 44×44 CSS px
- %200 metin büyütmede görev tamamlanabilir
- Reduced-motion, klavye, VoiceOver, TalkBack ve Windows focus desteği

---

## 15. Güvenlik, KVKK ve mağaza kapıları

### G0 — Hediye

- Yalnız kurgu veri
- Reklam, telemetri ve haricî AI yok
- Çevrim dışı ve restore başarılı
- Gerçek ekran Windows/Android/iPhone doğrulanmış

### G1 — Gerçek veri pilotu

- Veri sorumlusu ve işleyen rolleri yazılı
- İşleme amaçları ve hukuki dayanak veri türü bazında kayıtlı
- Aydınlatma, saklama ve imha çizelgesi hazır
- Fotoğraf, mazeret/sağlık ve hassas notlar ayrı değerlendirilmiş
- Cihaz ve uygulama kilidi aktif
- Şifreli kurtarma kanıtlanmış
- İhlal müdahale sorumlusu ve prosedürü belirlenmiş
- Çocuk verisi log, test, destek paketi veya haricî servise gitmiyor

### G2 — Kapalı pilot

- 10 ardışık okul günü veri kaybı 0
- Her cihazda restore tatbikatı
- P0/P1 gizlilik veya yanlış öğrenci sızıntısı 0
- Kullanılabilirlik hedefleri geçilmiş

### G3 — Mağaza

- Gizlilik politikası uygulama içinde ve mağazada
- Apple Privacy ve Google Data Safety davranışla birebir uyumlu
- Tüm SDK’ların veri envanteri
- Hesap varsa uygulama içi ve web üzerinden hesap/veri silme
- Kurgu ekran görüntüleri ve inceleme demo modu
- Güncel Android hedef API ve Apple inceleme şartları yeniden doğrulanmış
- Salt WebView değil; kamera, paylaşım, güvenli saklama gibi platform değeri

### G4 — Bulut

- Bağımsız tehdit modeli ve sızma testi
- BFF + Authorization Code + PKCE S256 + state + nonce
- OAuth tokenları tarayıcı storage, log ve yedekte yok
- E2EE anahtar ve recovery tasarımı
- Silme, dışa aktarma ve hesap kapatma
- Yurt dışı aktarım ve veri işleyen sözleşmeleri
- Sync çatışmalarında sessiz last-write-wins yok

Bu kapılar hukuki görüş yerine geçmez. Gerçek pilot ve mağaza öncesi insan hukuk
danışmanı kararı zorunludur.

---

## 16. Dağıtım stratejisi

### Hediye ve pilot

- Tek HTTPS web artifact
- Windows: Edge/Chrome kurulabilir PWA
- Android: Chrome kurulabilir PWA
- iOS: Safari “Ana Ekrana Ekle”
- Tarayıcıdan kullanım kuruluma eşdeğer veri akışı sunar

### Mağaza

- Ortak React/domain kodunu kullanan ince Capacitor kabuğu için spike
- Android’de TWA alternatifiyle veri göçü ve platform değeri karşılaştırması
- Windows’ta PWA ana yol; gerekirse MSIX
- PWA IndexedDB ile native WebView kasasının aynı olmadığı varsayılır
- PWA’dan şifreli export → native uygulamada doğrulanmış import gerçek cihazda test edilir
- İmzalama ve store secret’ları repo dışında tutulur

---

## 17. Fiyatlandırma ve iş modeli hipotezi

Ürün reklamsız olacaktır.

### Ücretsiz güvenlik çekirdeği

- Bir sınıf
- Yoklama
- Temel gözlem
- Yedek, restore ve tüm veriyi dışa aktarma
- Uygulama kilidi
- Arşivleme/silme

### Pro

- Gelişmiş gözlem ve zaman çizelgesi
- Çoklu sınıf/eğitim yılı
- Medya, portfolyo ve PDF
- Maarif plan/kanıt zinciri
- Analiz paketi
- Gelişmiş filtre ve hatırlatıcılar

Temmuz 2026 araştırma hipotezleri; fiyat taahhüdü değildir:

- 129 TL/ay veya 1.290 TL/yıl
- Alternatif test: 169 TL/ay veya 1.690 TL/yıl
- Kurucu öğretmen ilk yıl: 799–999 TL
- Okul paketi: 10 öğretmen için yıllık 12.000–18.000 TL

Fiyat kararı öncesi:

- 30 öğretmen görüşmesi
- 12 kapalı pilot
- En az 8 ödeme isteği
- En az 5 kurucu abonelik veya eşdeğer ön sipariş niyeti
- Mağaza komisyonu, vergi, iade ve destek maliyeti tablosu

---

## 18. KPI ve OKR

### O1 — Emine’nin günlük akışında vazgeçilmez ol

- 20 okul gününün en az 18’inde aktif kullanım
- Yoklama medyanı ≤30 saniye
- Haftada ≥5 anlamlı gözlem
- Kritik hata ve veri kaybı 0

### O2 — Güvenilirlik iddiasını kanıtla

- Her değişiklikte tam kalite zinciri
- Ayda bir temiz kurulum restore tatbikatı
- Şüpheli mükerrerlerin %100’ü silinmeden işaretli
- Kritik işlemlerde geri alma veya kurtarma

### O3 — Ücretli talebi doğrula

- 30 öğretmen görüşmesi
- 12 kapalı pilot
- ≥8 ödeme isteği
- ≥5 kurucu abonelik niyeti

Ticari hedef hipotezleri:

- Deneme → ücretli: %8–15
- Yıllık plan payı: ≥%60
- Aylık ücretli kayıp: <%4
- LTV/CAC: >3
- CAC geri ödeme: <6 ay
- Yerel ürün brüt marjı: >%75

---

## 19. Multi-agent Divan çalışma modeli

| Rol | Sorumluluk |
|---|---|
| Sercan | Vizyon, bütçe, nihai GO/NO-GO |
| Emine | Tasarım ortağı, gerçek görev ve pilot kabulü |
| HALİS | Kök mimari, güvenlik/kalite kapısı, nihai teslim |
| MARİF | Sprint koordinasyonu, kapsam ve sözleşme bütünlüğü |
| Ürün/Pedagoji ajanı | Öğretmen akışları, Maarif ve etik sınırlar |
| Veri/Domain ajanı | Şema, migration, CS-001, repository, backup |
| UX/Erişilebilirlik ajanı | Tek el, gerçek ekran, klavye ve ekran okuyucu |
| QA/Kırmızı Takım ajanı | Negatif test, offline, çok-sekme, veri kaybı |
| Güvenlik/Gizlilik ajanı | Tehdit modeli, SDK ve veri akışı envanteri |
| Release/Ops ajanı | CI, imzalama, TestFlight/Play ve rollback |
| İnsan hukuk danışmanı | KVKK, kurum/veli izinleri, sözleşmeler |
| Mali müşavir | Vergi, şirketleşme ve mağaza gelirleri |

İşleyiş:

1. MARİF dikey dilimin sözleşmesini dondurur.
2. Dosya sahipliği ayrılır; aynı dosyada iki ajan eşzamanlı çalışmaz.
3. Veri ve UI işleri paralel; entegrasyon sözleşme sonrası yapılır.
4. QA ajanı implementasyondan bağımsız inceler.
5. HALİS tüm test, gizlilik ve rollback kanıtını görmeden fazı kapatmaz.

---

## 20. Risk kaydı

| Risk | Seviye | Ana kontrol |
|---|---:|---|
| Migration veri kaybı | Kritik | Recovery snapshot, N-2 fixture, expand/migrate/verify/contract |
| Eski service worker + yeni DB | Kritik | Uyumluluk matrisi ve kontrollü activation |
| Çok-sekme eski state ezmesi | Yüksek | Dar transaction, fresh-read, revision, BroadcastChannel |
| iOS depolama tahliyesi | Yüksek | Son yedek göstergesi ve düzenli restore tatbikatı |
| Medya depolama büyümesi | Yüksek | Thumbnail, kota alarmı, streaming export |
| Başka öğrenci verisi raporu | Kritik | Scope allowlist ve negatif izolasyon testleri |
| Zararlı restore arşivi | Kritik | Staging, boyut/adet limiti, zip-bomb/path traversal savunması |
| OAuth token sızıntısı | Kritik | BFF, HttpOnly cookie ve token denylist testleri |
| E2EE anahtar kaybı | Yüksek | Recovery kit doğrulaması ve açık uyarı |
| Sync çatışması | Kritik | `baseRevision`, çatışma kopyası ve manuel çözüm |
| PWA→native veri göçü | Yüksek | Şifreli export/import gerçek cihaz testi |
| Log/test gizlilik ihlali | Kritik | Kurgu veri ve otomatik hassas veri taraması |
| Eski telefonda performans | Yüksek | Bütçeler, gerçek cihaz ve thumbnail |
| Erişilebilirlik regresyonu | Yüksek | Otomasyon + VoiceOver/TalkBack/Windows smoke |
| KVKK rol/izin belirsizliği | Kritik | G1 hukuk ve kurum kapısı |
| Tek geliştirici bağımlılığı | Orta | ADR, runbook, migration kataloğu ve ajan sahipliği |

---

## 21. GO / NO-GO matrisi

| Kapı | GO | NO-GO |
|---|---|---|
| G0 Hediye | Kurgu veri, offline ve şifreli restore yeşil | Veri kaybı veya gerçek çocuk verisi |
| G1 Gerçek pilot | Roller, amaç, dayanak, aydınlatma, kilit ve kurtarma hazır | Hukuki dayanak veya veri sorumlusu belirsiz |
| G2 Kapalı pilot | 10 gün kayıpsız, restore ve görev metrikleri başarılı | P0/P1 olay veya restore başarısız |
| G3 Mağaza | Privacy/Data Safety, native değer, destek ve cihaz matrisi hazır | Salt web sarmalayıcı veya eksik politika |
| G4 Bulut | E2EE/BFF, sızma testi, sözleşme ve silme akışı hazır | Açık rıza varsayımıyla acele senkron |

---

## 22. Resmî ve temel başvuru kaynakları

- Türkiye Yüzyılı Maarif Modeli: https://tymm.meb.gov.tr/
- MEB temel eğitim programları: https://tymm.meb.gov.tr/ogretim-programlari/temel-egitim
- Okul öncesi 36–48 ay örneği: https://tymm.meb.gov.tr/okul-oncesi/unite/442
- 6698 sayılı Kanun ve KVKK yayınları: https://www.kvkk.gov.tr/
- Çocukların kişisel verilerinin korunması: https://www.kvkk.gov.tr/SharedFolderServer/CMSFiles/f506d8fe-9f36-4538-bce9-a05a5ca8d8e6.pdf
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP MASVS: https://mas.owasp.org/MASVS/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play Families: https://support.google.com/googleplay/android-developer/answer/9893335
- Microsoft Windows PWA: https://learn.microsoft.com/microsoft-edge/progressive-web-apps/ux
- MDN PWA iyi uygulamaları: https://developer.mozilla.org/docs/Web/Progressive_web_apps/Guides/Best_practices

---

## 23. İlk sonraki eylemler

1. Mevcut yoklama teslimatını kullanıcı isterse ayrı commit ile kanonik F0 yap.
2. Sprint 1 için `AcademicYear + Classroom + Student` domain sözleşmesini dondur.
3. Öğrenci CRUD/arşiv/geri alma E2E kabul senaryosunu koddan önce yaz.
4. Migration registry ve recovery snapshot ADR’sini hazırla.
5. Emine hediye akışının kurgu veri senaryosunu ve gerçek cihaz listesini belirle.
6. G1 için hukuk danışmanına sunulacak veri envanteri taslağını çıkar.
7. Her sprint sonunda bu belgeyi kanıtlar ve gerçek ilerlemeyle güncelle.

Bu planın başarı ilkesi: **önce Emine’nin işini görünmez biçimde kolaylaştır,
sonra güvenilirliğini kanıtla, daha sonra başka öğretmenlerde tekrarlandığını
ölç ve en son mağaza/bulut kapsamını aç.**
