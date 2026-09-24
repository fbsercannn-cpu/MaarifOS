# Master denetim uygulaması - yerel kabul

Tarih: 7 Eylül 2026. Sürüm: **0.25.0**. Belge profili: **sınıf listesi 3.1**. Öğrenci profil şeması v9 korunur. Uzak yayın/commit/push yapılmadı. Önceden var olan çalışma alanı değişiklikleri korunmuştur.

## Kullanıcı isteğinin karşılığı

| İstek | Uygulanan davranış | Kanıt |
|---|---|---|
| Soyadını çocuktan öner | Tek isimli anne/babaya öneri eylemi; otomatik yazma yok; farklı soyadı ve üçüncü kişi korunur | `parent-surname-suggestion.test.mjs`, `student-parent-address-ui.spec.ts` |
| Adres giriş alanı | Yeni kayıt formunda görünür; Bilgiler ve Yakınlar aynı canonical alan; Excel'de tam genişlik çok satır | 320/390 add/edit/import/reload |
| Üçüncü kişi tabloya sığsın | 11 sütunlu ana tablo; her ek yakın ayrı öğrenciye bağlı satır; tam devam bağlamı | 12 PDF/62 sayfa; etiketli28 sayfa görsel |
| Her açıdan master rapor | 25 ana konu ve nihai kabul bölümü; somut teknik bulgular, formül ve kapsam, içerik, güvenlik, tasarım, efor/bağımlılık/kabul | `MAARIFOS_MASTER_RAPOR_2026_09_07.md` + PDF/HTML |

## Denetimde bulunan ve düzeltilen ek kusurlar

1. `student-dossier.ts`: aynı çocuk/günün mükerrerleri özet toplamını şişiriyordu. Önce scope, sonra `resolveAttendanceRecords`; kaynak kimlikleri, mükerrer/invalid adet ve izleri korunur.
2. `teacher-day-closure.ts`: gelecek katılım geçmiş paydasına giriyordu. Operasyon başlangıcı istisnası yalnız resmî ilk güne hazırlanmış üyelikte geçerlidir.
3. Aynı kapanıştaki tekil `studentId` filtresi `studentIds` dizisini atlıyordu. Toplam ve fingerprint ortak katılımcı filtresini kullanır; karma grup bir olaydır.
4. `academic-year-archive.ts`: gerçek yeniden kayıt kapalı üyeliğin bitişini siliyordu. Artık yeni dönem açar; yanlışlıkla silme/geri alma önceki kapalı dönemleri değiştirmez. Dashboard, arşiv ve yıl geçişi son aktif üyeliği seçer.
5. Yeniden kayıt hedef yıl dışındaki tarihi kabul ediyordu. Yıl/operasyon başlangıcı, bitiş ve çakışma kontrolü eklendi; aynı başlangıçlı tekrar yazmasızdır.
6. `teacher-week-teaching-days.ts`: yılın görünür adı tatil profilini değiştiriyordu. Resmî dönem sınırları esas; farklı özel dönem fallback yolu korunur. Bütün takvim yüzeylerini tek kalıcı profile taşıma işi master sırada açıktır.
7. Hızlı kayıt telefonsuz veli adını reddediyordu; profil/domain ile hizalandı. Anne/Annesi ve Baba/Babası aynı ilişkiyi ifade eder.
8. Profil değişikliksiz kaydedilince boş kapalı modal erişilebilir kalabiliyordu. Prototype profil sınırında açık/kapalı anahtar ayrımıyla giderildi; korunan BottomSheet değiştirilmedi.

## Doğrulama

| Kapı | Sonuç | Kapsam |
|---|---|---|
| Bütün özellik Node paketi | **1030/1030** | `node --test tests/features/*.test.mjs` |
| Yeni hesap düzeltmeleri | **64/64**, ana pakete dahil | Dossier, day-closure, teaching days; bağımsız ikinci inceleme |
| Öğrenci profil testleri | **26/26**, ana pakete dahil | Öneri/domain/aktarım |
| Üyelik ve yıl geçişi | **27/27**, ana pakete dahil | Yeniden kayıt dönemleri, geçerli tarih ve arşiv |
| Soyadı/adres ve hızlı giriş UI | **7/7** | 320/390 kurgu add/edit/import/reload; son Excel CSS **2/2** tekrar |
| Üyelik şifreli yedek/restore | **1/1** | Gerçek IndexedDB, karşı depoda iki dönem eşliği, undo |
| Belge birim ve regresyon | **80/80**, ana pakete dahil | Sınıf/ortak PDF/plan/gözlem/değerlendirme |
| Belge Chromium/WebKit | **10/10** | Hücre ve kişi/telefon eşliği, taşma |
| Fiziksel PDF boyut denetimi | **12 PDF / 62 sayfa** | Sayfa dışı karakter0, beklenmeyen baskı sayfası0 |
| Görsel PDF incelemesi | **28/28 etiketli sayfa** | Bütün sınıf senaryoları; fiziksel yazıcı hariç |
| Üretim PWA | **3/3** | Offline açma; 0.24→0.25 yükseltme; yeni ağsız süreç |
| Son build offline XLS/doğum günü | **3/3** | 320/390, düzeltme, atomic commit, yeni mükerrer |
| Son build offline soyadı/adres | **4/4** | 320/390 add/edit/import/reload; farklı soyadı, üçüncü kişi ve profil kapanışı |
| Sürüm ve gün kapanışı UI | **6/6** | Bir eski 0.24 regex beklentisi 0.25'e güncellendi ve hedef test geçti |
| TypeScript/build/lint | **PASS** | `npm run build`, `npm run lint` |
| Bundle bütçesi | **77/77 parça** | Her JS gzip parçası <=180 KiB |
| Runtime kilidi | **36/36 dosya** | Yalnız release.ts + sw sürüm metadata değişikliği, kilit güncel |

Test adetleri birbirine eklenmemelidir; Node alt kümeleri 1030 toplamına dahildir. Ek PWA/runtime sözleşme10/10, scoped diff kontrolü ve son typecheck geçti. Bütün quality:gate ve bütün ürünün fiziksel pilotu bu dar kabulün parçası olarak çalıştırılmış sayılmaz.

## Dosyalar

- Yeni profil akışı: `app/output/playwright/master-audit-2026-09-07/`.
- Sınıf belgeleri: `app/output/document-qa/class-roster-v31-master-2026-09-07/`.
- Kök test/derleme: `app/output/master-audit-2026-09-07/`.
- Master PDF/HTML: `app/output/pdf/MaarifOS_Master_Rapor_2026_09_07.*`.
- Ayrıntılı audit: `docs/master-audit-2026-09-07/`.

## Açık kalan kapsam

Master iş listesi B01-B04 ve C01-C09 planlanmış gelecek işlerdir. Özellikle yedek boyutu/parçalı paket, bütün koleksiyonların kasası, çok yıllı dosyada açık scope seçimi ve ortak öğretim günü modeli bu sürümün tamamlanmış özellikleri olarak sunulmaz. Fiziksel yazıcı, Word render ve gerçek VoiceOver/TalkBack kabulü açıktır. Kullanıcının 35 sayfalık rehberinin varlığı bütün TYMM kütüphanesinin çevrim dışı olduğu anlamına gelmez.
