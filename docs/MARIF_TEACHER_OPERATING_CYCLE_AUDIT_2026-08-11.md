# MARİF Öğretmen İşletim Döngüsü Denetimi — 2026-08-11

## Hüküm

MaarifOS'taki temel sorun özellik eksikliğinden önce özelliklerin öğretmenin gerçek
iş sırasına bağlanmamasıydı. Günlük plan, haftalık değerlendirme, aylık değerlendirme,
anekdot ve belge üretimi ayrı ayrı bulunabiliyor; fakat öğretmen ana ekrandan
“neredeyim, sırada ne var, hangi kayıt eksik ve hangi belge hazır?” sorularını
yanıtlayamıyordu.

Bu turda özellikler yeni ve sahte bir veri katmanına kopyalanmadı. Aktif sınıfın aynı
kalıcı kayıt zinciri okunarak tek çalışma döngüsü kuruldu:

`Yıllık → aylık → haftalık → günlük → uygulama → gözlem/program bağı → değerlendirme → belge`

Durum `YEREL UYGULANDI`; production yayını veya fiziksel Emine Öğretmen telefonu
kabulü değildir.

## Mega eleştiri ve entegre çözüm matrisi

| Öncelik | Eleştiri | Öğretmen etkisi | Uygulanan çözüm | Durum |
|---|---|---|---|---|
| P0 | Ana ekran yalnız “şimdi”yi gösteriyor, gün–hafta–ay bağını göstermiyordu. | Öğretmen yaptığı günlük işin haftalık ve aylık plana nasıl bağlandığını göremiyordu. | Bugün ekranına `Planla → Uygula → Gözle → Değerlendir → Belgele` çalışma döngüsü ve günlük/haftalık/aylık/belge kartları eklendi. | Yerel uygulandı |
| P0 | Haftalık ve aylık durum, premium merkezinin derininde saklıydı. | Değerlendirme unutuluyor veya ancak menü bilgisi olan kullanıcı tarafından bulunuyordu. | Haftalık ve aylık kartlar doğrudan ilgili kalıcı değerlendirme bölümüne odaklanıyor. | Yerel uygulandı |
| P0 | Belgeler ekranı plan ve değerlendirme belgelerini göstermiyordu. | “Belgeler” adı ürün kapsamıyla çelişiyor; plan PDF/DOCX ve Ek 18 bulunamıyordu. | Belgeler merkezine yıllık omurga, aylık değerlendirme durumu, plan PDF/DOCX ve aylık değerlendirme/Ek 18 gerçek girişleri eklendi. | Yerel uygulandı |
| P0 | Kartlar farklı plan zincirlerini yanlışlıkla bir araya getirebilirdi. | Başka ay/hafta kaydı “mevcut plan” gibi görünerek pedagojik ve belge bütünlüğünü bozabilirdi. | Salt-okunur model annualId → monthlyId → weeklyId ilişkisini exact çözüyor; başka zinciri karıştırmıyor. | Testli |
| P0 | Gelecek plan dönemi “mevcut” gibi sunulabilirdi. | Hazırlık dönemindeki öğretmen başlamamış haftayı aktif sanabilirdi. | Dönem ilişkisi `current/upcoming/past`; gelecek ay ve hafta açıkça “henüz başlamadı” olarak gösteriliyor. | Testli |
| P1 | Eğitim yılı açılmadan “Günlük plan oluştur” çağrısı yanıltıcıydı. | Tıklama sonrasında engel görmek düğmenin bozuk olduğu algısını güçlendiriyordu. | Kart, hazırlık durumunda “Günlük yazım henüz açık değil” ve “Eğitim yılını aç” eylemi gösteriyor. | Yerel uygulandı |
| P1 | Plan kurulumu ve değerlendirme kaydı ana özeti yenilemiyordu. | Öğretmen başarılı işlemden sonra eski sayaçları görüp yeniden işlem yapabilirdi. | Kurulum, lens, haftalık ve aylık değerlendirme sonrası çalışma döngüsü sessizce yeniden okunuyor. | Testli |
| P1 | Kalıcı yazım başarılı, üst özet yenilemesi başarısız olduğunda işlem başarısız sanılabilirdi. | Mükerrer kayıt ve güven kaybı riski vardı. | Parent yenileme hatası kalıcı mutasyonu geri çevirmiyor veya “kaydedilemedi” demiyor; cihaz yenileme yolu ayrı kalıyor. | Testli |
| P1 | Anekdot belge sayaçları yalnız Belgeler açıldıktan sonra doğru olabiliyordu. | Bugün ekranı ilk açılışta eksik/hazır form sayısını sıfır gösterebilirdi. | Persistence hazır olur olmaz anekdot workspace yükleniyor; Belgeler açılması ön koşul değil. | Yerel uygulandı |
| P1 | Mobilde dört çalışma kartı iki sütunda sıkışıyor ve metin kesiliyordu. | Başlıklar okunmuyor, profesyonel görünüm bozuluyordu. | 520 px altında kartlar 92 px yüksekliğinde tek sütun yatay düzene geçirildi; 390 px'de taşma yok. | Görsel QA geçti |
| P1 | Eksik plan/değerlendirme için uydurma “hazır” durumu üretme riski vardı. | Öğretmen var olmayan belgeyi bekleyebilir veya yanlış kapsama güvenebilirdi. | Sınıf/plan yoksa null durum; plan belgesi yalnız gerçek annual+monthly zinciri varsa “kaynak hazır”; aylık değerlendirme sayısı yalnız persisted kayıt. | Testli |
| P2 | Tek ekran başarısı ürünün tamamı sanılabilirdi. | Görsel makyaj gerçek reload/offline/export sorunlarını gizlerdi. | Kabul sözleşmesi veri kimliği, tıklama hedefi, reload, belge ve restore kapılarıyla ayrıldı; fiziksel telefon açıkça açık kaldı. | Açık kapı |

## Gerçek kabul kanıtı

- 390×844 yerel mobil IAB: yatay taşma yok; kartlar 318 px genişlikte ve 92–98 px yükseklikte.
- Günlük, haftalık, aylık ve belge kartlarının dördü gerçek hedeflerini açtı.
- Eylül plan omurgası kurulunca ana ekran reload olmadan gelecek ay/hafta durumuna döndü.
- Reload sonrasında aynı annual/monthly/weekly kimlik zinciri korundu.
- Belgeler merkezi plan belgeleri ile aylık değerlendirme/Ek 18 girişlerini gösterdi.
- Öğretmen döngüsü ve Today odak testleri: 7/7.
- Plan/değerlendirme/export odak matrisi: 34/34.
- Feature migration matrisi: 475/475.
- TypeScript, politika lint'i, runtime bütünlüğü ve production derlemesi geçti.

## Kalan yayın kapıları

1. Fiziksel Emine Öğretmen telefonunda gün açılışı → yoklama → plan → gözlem → bağ →
   haftalık karar → aylık değerlendirme → PDF/DOCX zinciri tamamlanmalı.
2. Aynı zincir çevrimdışı kapan-aç ve backup/restore sonrasında kimlikleri değişmeden
   yeniden görünmeli.
3. Gerçek ücretli premium satın alma/yenileme/iptal yolu hâlâ ayrı açık gereksinimdir;
   kurucu iki-cihaz erişimi bunun yerine geçmez.
4. Production'a bu turda yayın yapılmadı. Canlı sitede bu yeni çalışma döngüsünün
   bulunduğu iddia edilmemelidir.
