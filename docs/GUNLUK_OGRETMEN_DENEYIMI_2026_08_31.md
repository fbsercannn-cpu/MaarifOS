# Günlük öğretmen deneyimi — 0.22.0

Kullanıcı görsel seçimini HALİS'e bıraktı. Concept 1'in günlük akış hiyerarşisi, concept 2'nin uygulama rehberi ve concept 3'ün gözlem seçimi mevcut uygulama içinde birleştirildi. Yeni repo, çalışma zamanı, hesap/sunucu bağımlılığı veya veri şeması oluşturulmadı. Bütünsel ürün kalitesi veya canlı mobil kabul iddiası yoktur.

## Öğretmene görünen değişiklik

- **Bugün:** Sınıf ve tarih daha küçük bir alandadır. Kayıtlı akış varsa gerçek satır gösterilir; plan yoksa önerinin başlığı, süresi ve malzemeleri görünür, “Henüz günlük planınıza eklenmedi” denir. Tek ana eylem ve iki takip satırı korunur. Gerçek kayıt kimliği katalog kimliğine karıştırılmaz. Hazırlık yılı, kapalı yıl, boş sınıf, bekleyen gözlem, boş kayıtlı plan, plan çakışması/kopukluğu ve inceleme isteyen gün sonu bağımsız önceliklerdir.
- **Uygulama rehberi:** Katalog veya Bugün önerisi doğrudan seçilen etkinliğin rehberine gider. Malzemeler, mevcut üç öğretmen adımı, yaş ve katılım desteği, gözlem odağı görünür. Plan, yazdırma ve yetişkin eşlikli Çocuk Modu ayrıntıda korunur. Gözlem için Çocuk Moduna girme zorunluluğu kaldırılır.
- **Gözlem:** Exact etkinlik bağlamı korunur. Resmî hedef/profile snapshot eşleşirse en fazla üç örnek öne çıkar. Eşleşme yoksa “Yaşa göre genel örnekler” ile alan ve üç örnek açık kalır. Örnek resmî kontrol listesi/başarı/puan/tanı değildir. Seçim yalnız taslak oluşturur. Gözlenmiş dokunuş/çizim yoksa ham metin boş başlar; sistemin “taslak açıldı” açıklaması gözlem gibi kaydedilemez.
- **Görsel dil:** Krem, lacivert ve teal korunur; fotoğraf alanı küçük tutulur. Gerçek sınıfı temsil etmeyen dekoratif masa fotoğrafı ve Türkçe karakterleri kapsayan yerel Roboto fontları kullanılır. Beş mevcut alt gezinme hedefi korunur.

## Dosya kapsamı

Bugün: `app/src/features/simple-experience/TodayTeachingCard.tsx`, `today-teaching-focus.ts`, `today-teaching.css`, `teacher-workspace-type.css`, `SimpleTodayScreen.tsx`, `simple-today-model.ts`.

Rehber: `app/src/features/activity-studio/ActivityTeacherGuide.tsx`, `activity-teacher-guide.ts`, `activity-teacher-guide.copy.ts`, `activity-teacher-guide.css`, `ActivityStudio.tsx`, `activity-observation-seed.ts`.

Gözlem: `app/src/features/evidence/DevelopmentObservationPicker.tsx`, `development-observation-picker.css`, `activity-context-observation-model.ts`; ortak bağlantılar `app/src/Prototype.tsx`.

Varlık: `app/public/assets/teaching/teacher-workshop.webp`, 1280×512, 57.034 bayt. Kaynak/üretim/encoding bilgisi `docs/TEACHING_VISUAL_PROVENANCE_2026_08_31.md` içindedir. Geliştirme dosya yolları public varlık olarak paketlenmez.

## Bu tur doğrulananlar

| Kontrol | Sonuç |
|---|---|
| Bütün Node özellik testleri | 922/922 |
| PWA/runtime/klavye sözleşmeleri | 14/14 |
| TypeScript strict | Geçti |
| Politika lint | Geçti |
| Korunan mobil çalışma zamanı | 36/36 |
| Üretim build ve parça bütçesi | Geçti; 63 JS parçası, her biri gzip ≤180 KiB |
| Üretim önbellek manifesti | 110 varlığın uzunluğu ve SHA-256 eşleşti; yeni fotoğraf + 6 Türkçe font varlığı dahil |
| Veri şeması | V8 değişmedi; yeni kalıcı koleksiyon yok |

Test kaydı: `app/output/design-audit-2026-08-31/feature-tests-0.22.0.log`. Statik önbellek kanıtı: `static-precache-0.22.0.json`. Önceki değişiklikler korunmuştur; çalışma alanı temizlenmemiş veya eski düzenlemeler geri alınmamıştır.

Bağımsız MARİF incelemesinde plan çakışması/kopukluğunun yeni kartla örtülebileceği bulundu; fail-closed kontrol ve boş kayıtlı plan ayrımı eklenerek domain testleriyle düzeltildi. Görsel/telefon ölçümü yerine bu test sayıları kullanılmaz.

## Açık kabul kapısı

Bu tur tarayıcı aracı açık Maarif sekmesine erişimi URL güvenlik politikasıyla reddetti. Yeniden denemeler, farklı browser, alternatif port, ham otomasyon veya Playwright CLI ile aşma yapılmadı. Kullanıcıdan mevcut sekmeyi yenileyip açıldığını bildirmesi istendi. O aşama gelmediği için şunlar **yapılmadı**:

- Yeni sürümün 320/390/430 px canlı ekranı ve kaynak görsellerle karşılaştırma;
- Bugün→exact rehber→çocuk→davranış→açık Kaydet zincirinin gerçek IndexedDB doğrulaması;
- Yeniden yükleme, kilit/taslak, gerçek PWA çevrim dışı açılış ve restore regresyonu;
- Fiziksel telefon, ekran okuyucu ve gerçek öğretmen zaman/başarı ölçümü.

UI kabul senaryoları yazıldı/uyarlandı; çalıştırılmış gibi sunulmaz. Yeni `app/tests/teaching-workspace-ui.spec.ts` önerinin doğru rehberi açmasını, davranış seçiminin yalnız taslak kalmasını, açık kayıtta doğru çocuk/etkinlik kimliğini ve 320 px geri dönüşte aynı taslağın sürmesini sınar; gerçek tarayıcı koşusu bekler. `design-qa.md` sonucu `blocked`. Önceki 0.21.0 veya 0.15.0 ekranları bu sürümün görsel kabulü sayılmaz. Yayın/commit/tag/push yapılmadı.

## Devam

Test dosyası hazırlığı: `teaching-workspace-ui.spec.ts` ve güncellenen `today-setup-priority-ui.spec.ts` bağımsız strict TypeScript kontrolünü geçti. Üç eski stüdyo/persistence/mobil testinin yeni rehber menüsü ve tarih/çocuk etiketleri uyarlandı; sözdizimi kontrolleri geçti. Beş dosyayı genel CLI seçenekleriyle tek strict derlemeye alma denemesi eski testlerin tarayıcıya özgü `/src/...` import yolları ve kurulu olmayan Node `Buffer` tipleri nedeniyle geçmedi. Bu ayrı test yapılandırması sınırı giderilmedi; uygulamanın kendi strict typecheck sonucu geçerlidir. Hiçbir UI testinin yürütme sonucu varmış gibi sunulmaz.

Tarayıcı engeli kullanıcı tarafından giderilip uygulama açıldığında aynı kurgu sınıfta gerçek zincir çalıştırılmalı. Başlık/malzeme uzunluğunda ana eylemin ilk ekran içinde kalması özellikle ölçülmeli; uygulama rehberindeki son eylem, uzun metin ve klavye açıkken erişilebilir olmalı. Kaynak ve uygulama aynı karşılaştırma girdisinde incelenmeden görsel kabul verilmemeli.

## Sonraki yayın talimatı

Kullanıcının “Tamam yayınla” talimatıyla mevcut herkese açık Sites adresi 31 Ağustos 2026 tarihinde 0.22.0 ile güncellendi; sistem yayın sonucunu `succeeded` bildirdi. Yukarıdaki “yayın yapılmadı” ifadesi uygulama turunun son durumudur. Güncel yayın ve açık kabul sınırları [yayın kaydındadır](YAYIN_0.22.0_2026_08_31.md). Yayın, görsel/UI veya gerçek çocuk verili pilot kabulünü kapatmaz.

Kalıcı ders: Sadeleştirme, karar vermek için gereken etkinliği ve bağlamı gizlemek değil, onları doğru anda görünür kılmaktır.
