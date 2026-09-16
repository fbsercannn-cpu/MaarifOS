# Ortak takvim, üyelik ve açıklanabilir devam hesabı

Tarih: 7 Eylül 2026. Kapsam: dokuz geliştirmeden madde 2. Uygulama kaynakları donduruldu; son yayın/PWA doğrulaması kök ajanın yayın kapısındadır.

## Kabul edilen hesap sözleşmesi

- Sivil tarih YYYY-AA-GG; takvim yürüyüşü UTC üzerinden yapılır. Öğretmenin görünen eğitim yılı adı bir takvim anahtarı değildir.
- `school-calendar.ts` resmî uyum/öğretim dönemlerini, hafta sonunu, mevcut kanonik tam gün tatillerini ve exact sınıf/yıl yerel `no_school` kayıtlarını tek yerde çözer. İptal edilmiş/silinmiş yerel kapanış bir günü dışlamaz. Özel yılda açıklanmış hafta içi politikası kullanılır.
- Erken çalışma başlangıcı yalnız resmî başlangıç için hazırlanmış aktif ilk üyeliği öne alır. Sonradan gelen çocuğun gerçek başlangıç tarihi öne çekilmez. Üyelik başlangıcı ve ayrılık günü dahildir; ayrılık ile yeniden kayıt arasındaki aralık korunur.
- Açık üyelik dizisi otoritedir: bozuk veya boş dizi güncel kök sınıfa sessizce dönmez. Aynı üyelik kimliğinin çelişen tarihleri sıra bağımsız olarak inceleme gerektirir. Üst üste üyelikler tek çocuk-gün sayılır, inceleme işareti korunur.
- Devam payı = Geldi + Geç geldi. Devam paydası = uygun günde geçerli işaret bulunan Geldi + Geç geldi + Gelmedi.
- Kayıt kapsamı payı = işaretli çocuk-gün; paydası = takvim ve üyelik bakımından beklenen çocuk-gün. Eksik yoklama Gelmedi kabul edilmez.
- Önce sınıf/yıl/tarih süzülür, sonra çocuk-gün kanonik kaydı seçilir. Başka sınıftaki daha yeni kayıt mevcut sınıfın sonucunu değiştiremez. Son kayıt silinmişse eski kayda geri dönülmez.
- Hiçbir raporlama hesabı kaynak gözlemi, planı, geçersiz veya mükerrer yoklama kaydını silmez. Sayılan/dışlanan/eksik günler ve kaynak incelemesi ayrı gösterilir. Gözlem için öğretim günü zorunluluğu çıkarılmaz; çocuğun olay günündeki üyeliği zorunludur.

## Bağlanan tüketiciler

| Tüketici | Son davranış |
|---|---|
| Günlük devam listesi ve ana sayfa sayıları | Kök montajı günlük beklenen öğrenci kimliklerini kullanır; güncel sınıf rehberi ayrı korunur. |
| Profil ve yoklama ayrıntısı | `AttendanceCalculationPanel` ay/yıl/özel dönem, öğrenci ve sayılan/eksik/dışlanan süzgeçleri sunar. Gün, neden, pay/payda ve kaynak kimlikleri incelenebilir. |
| Gün sonu | Ortak hesabın işaretli/beklenen toplamını kullanır. Kapalı günde boş sınıf/yoklama/günlük plan eksikliği üretmez; gerçek gözlem ve diğer işler korunur. |
| Kapanış kaydetme | `calendarEntries` aynı transaction snapshot'ına katılır. İsteğe bağlı `evidence.isTeachingDay` geçmiş kayıtları bozmadan saklanır. Takvim neden/kaynak kimliği semantik parmak izine katıldığı için sonraki kapanış değişikliği stale olur. |
| Haftalık plan kapsamı ve öğretmen haftası | Aynı öğretim günleri kullanılır. Henüz bağlı hafta planı bulunmayan ekran da yerel kapanışları ve tatilleri dışlar. |
| Plan günü seçimi ve düzenleme | Gerçek yıl/sınıf/yerel takvim bağlamıyla en yakın uygun gün önerilir. Tarih değişiminde mevcut çocukların yeni gün üyeliği doğrulanır. |
| Anlık ve normal değişmez gözlem kayıt kapısı | Gözlemin olay tarihindeki ortak üyelik kullanılır; kayıt zamanı olay gününün yerine geçmez. |
| Gelişim görünümü, kaynaklı rapor ve değerlendirme taslağı | Dönem ve kaynak gözlem günü aynı üyelik temeline dayanır. |
| Aylık öğretmen değerlendirmesi | Güncel aktif liste yerine dönem içinde kayıtlı çocuklar temsil kümesidir. Ayrılmış çocuğun üyeliği sırasında oluşmuş önceki kanıtı korunur; kayıt öncesi gözlem temsile eklenmez. |
| Boylamsal arşiv ve belge üreticileri | Arşiv scoped takvim kaynaklarını taşır; eski tek öğrenci gözlem bağı korunur. Belge ajanı sınıf/çocuk kapsamını üyelik yardımcısına, dossier devamını ortak hesap yardımcısına bağlamıştır. |
| Yoklama geçmişi | Tüm geçmiş istenirse her sınıf/yıl ayrı kanonikleştirilir; belirli kapsam isteği de desteklenir. Ham geçmiş kapalı gün kaydını saklar, hesapta dışlandığı ayrı dökümde açıklanır. |

## Önce / sonra ve somut kabul örnekleri

1. Aynı çocuğun başka sınıfta daha yeni 14 Eylül yoklaması, aktif sınıfın kaydını ezebiliyordu. Artık kapsam kanonik seçimden önce süzülür; iki sınıfın geçmiş kaydı ayrı kalır.
2. Geç kayıt veya ayrılıp dönme aralığı günlük paydalarda tüketiciye göre farklı ele alınıyordu. 14–16 Eylül ilk üyelik, 18 Eylül dönüş örneğinde 17 Eylül dahil edilmez.
3. Kapalı okul gününde yoklama/plan eksik işi üretilebiliyordu. 15 Eylül yerel kapanışında beklenen devam sıfır olur, o günün kaydedilmiş gözlemi korunur.
4. Kapanış transaction'ı takvim kaynağını yüklemiyordu. Artık kaydetme ve ekranda okuma aynı kaynak kümesini kullanır; kapanış kaldırılırsa önceki gün sonu stale olur.
5. Aylık kapsam güncel aktif listeyi kullanıyor ve ay içinde ayrılan çocuğun temsilini düşürebiliyordu. Dönem üyeliği korunur, gözlem tarihindeki üyelik ayrıca doğrulanır.
6. Bağlı haftalık plan yoksa ekran sabit beş hafta içi gün gösteriyordu. Yerel kapanış bulunan örnek hafta artık dört öğretim günü gösterir.

Kurgu mutabakat örneği: 6 beklenen çocuk-gün, 3 geçerli işaret, 3 eksik yoklama. Bir geldi, bir geç geldi, bir gelmedi için devam 2/3; kayıt kapsamı 3/6. Mükerrer, geçersiz ve kapanış günündeki kaynaklar ayrı inceleme listesinde kalır.

## Test kanıtları

- Son sürüm yükseltmesinden önce birleşik özellik koşumu: **1074/1074 geçti**, `app/output/completion-2026-09-07/calendar/features-final.log`.
- Bu değişime özgü 13 takvim/üyelik/hesap testi ve 1 aylık dönem üyeliği regresyonu eklendi. Mevcut 77 dar takvim/arşiv/gelişim/gözlem/gün sonu testi de geçti.
- `npx tsc --noEmit` geçti. `npm run check:runtime`: 36 korumalı dosya doğrulandı.
- 320/390 px tarih süzme, kapanış/ayrılık/mükerrer açıklamaları, kayıtları yeniden açma: **2/2**.
- 390 px gerçek yoklama işaretle–tamamla–profil–yeniden yükle: **1/1**.
- Son UI birleşik koşumu: **5/5** (`ui-stable.log`). Ek iki gerçek bileşen ölçümünde 320/390 px yükleme ve tamamlanmış kart yüksekliği 300 px; alt öğrenci butonunun Y konumu aynı; yatay taşma yok.
- Son ortak release koşumu kök ajanın 0.27.0 sürüm yükseltmesine denk geldi: 1075 testin 1071'i geçti, yalnız `release.test.mjs` içindeki dört eski 0.26.0 beklentisi kaldı. Bu dört sürüm beklentisi kök yayın kapısı sorumluluğundadır; `features-release.log` hataları gizlemeden saklar.
- Bu alt görevin geliştirme koşumları çevrimdışı üretim başarısı olarak sunulmaz. `tests/calendar-accounting-ui.spec.ts` üretim modunda PWA offlineReady bekler, ağı kapatır ve yeniden yükler; son üretim/PWA koşumu kök yayın raporuna bağlanacaktır.

Ekran görüntüleri: `app/output/completion-2026-09-07/calendar/dev/attendance-breakdown-320.png`, `attendance-breakdown-390.png`, `attendance-saved-offline-390.png`. Son dosya adı testin üretim modunda da kullanılmasından gelir; `dev/` altındaki görüntü çevrimdışı üretim kanıtı değildir.

## Etki, kaynak ve geri alınabilirlik

`dependency-map.json`, `impact-input.json`, `impact-package.json`, `source-revision.json`, `test-receipt.json` aynı çıktı klasöründedir. Etki analizi 19 düğüm, HIGH risk, eşleşmeyen yol/eksik zorunlu test/döngü yok; bağımsız paket doğrulaması VALID. READY_FOR_CHANGE ifadesi etki kapsamının tamlığını belirtir; testlerin sonucu ayrıca makbuzdadır.

Kaynak veriye toplu düzeltme veya silme uygulanmadı. Ortak çözücüler salt okunur; eklenen gün sonu boolean alanı isteğe bağlıdır. Eski API girişleri re-export ile korunmuştur. Sürüm, son build, şifreli yedek/PWA ve yayın kök ajan sahipliğindedir.


## Son mobil regresyon: yükleme sırasında satırın sıçraması

Birleşik E2E'de profil tıklaması kayboldu. Trace, `ClassroomDevelopmentPanel` yerel veriyi beklerken null döndüğünü ve tam tıklama anında kapsam kartının öğrenci satırının üstüne yerleştiğini gösterdi. Kaynak düzeltmesi: yükleme/hata sırasında aynı kart alanını korumak, görünür “Gözlem kapsamı hazırlanıyor” durumu ve 300 px sabit minimum yükseklik. Öğretmen ayrıntıyı açtığında kart doğal biçimde büyür. Test guard'ı hazır alanı bekler; tekrar tıklama veya büyütülmüş zaman aşımı kullanılmaz. Önceki başarısız trace ve son 5/5 sonuç ayrı tutuldu.

Yeni görseller: `app/output/completion-2026-09-07/calendar/dev/loading-stable-320.png`, `loading-stable-390.png`. Bunlar üretim bileşenini geciktirilmiş yerel store ile ölçen kontrollü test yüzeyidir; ana uygulama ekranları ayrıca üç gerçek akış testinde doğrulanmıştır.

Kalıcı ders: Bir hesap kartının asenkron veri okuması sırasında kapladığı alanı korumak, altında duran öğrenci satırına yapılan tıklamanın yanlış yere gitmesini önler.
