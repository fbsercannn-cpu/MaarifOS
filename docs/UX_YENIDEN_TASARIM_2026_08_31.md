# Maarif öğretmen deneyimi — 31 Ağustos 2026

Durum: Tasarım incelemesi ve görsel yön çalışması. Bu belge yeni işlevlerin uygulandığı veya kullanılabilirliğin doğrulandığı anlamına gelmez. Üretim kodu ve çocuk kayıtları bu çalışmada değiştirilmedi.

## Kullanıcının beklediği sonuç

Sınıfı hazırladıktan sonra eğitim yılına başlayabilmek; az karar ve az dokunuşla günlük işi yürütmek; çocuk için Maarif bağlantılı, gözlenebilir davranışları seçerek kayıt oluşturmak. Önceki özelliklerin varlığı ürün memnuniyeti sağlamamıştır.

## Güncel ekran kanıtı

1. **Bugün — iyileştirme gerekli.** Ana ekranda bir ana eylem ve iki takip eylemi ile açık bir hiyerarşi bulunuyor. Ancak görünür içerik öğretmenin uygulayacağı oyunu, malzemeyi veya gözlem odağını göstermiyor. Büyük karşılama ve sınıf/tarih alanı ekranın üst bölümünü kaplıyor. "Gözlem kapsamı ve gün kapanışı henüz güvenilir değil" açıklaması eksik yoklamayı gereğinden ağır bir dille ifade ediyor. Alt menü beş hedef içeriyor. Kaynak: `app/output/design-audit-2026-08-31/01-today-current.png`.
2. **Bugün → Günün planı — erişim sorunu.** Kontrol açıldıktan sonra dinamik modül yüklenemedi ve ekran boşaldı. Yerel 4175 sunucusu dinlemiyordu; dosya ve import yolu mevcuttu. Sunucu paket predev akışıyla yeniden başlatıldı. Ana belge ve plan/rapor modülleri HTTP 200 döndü. Kurtarma sonrası tarayıcı yeniden yüklemesi tarayıcı güvenlik politikası tarafından engellendi. Bu engel aşılmadı; yeniden açılan planın görsel doğrulaması bu turda yapılamadı. Boş ekran görüntüsü yalnız hata kanıtıdır, plan tasarımı için kabul edilmiş referans değildir.
3. **Etkinlik → çocuk gözlemi — güncel görsel doğrulama eksik.** Kaynak kod incelemesinde seçicinin yaş ve alan üzerinden çalıştığı, yapılan etkinlik/materyal bağlamını almadığı; alan başına üç örneğin günlük davranış çeşitliliğini dar temsil ettiği görüldü. Bu bulgu kod incelemesidir; tamamlanmış kullanıcı akışı testi olarak sunulmaz.

## Tasarım kararı

- Ana ekran, öğretmenin gününe ait uygulanabilir bir sonraki işi ve içeriğini göstermeli. Ayrıntıları saklamak, işi saklamak anlamına gelmemeli.
- Etkinlikte malzeme, kısa uygulama adımları, destekleme ve gözlenecek davranış birbirine bağlı olmalı. Ayrı menülerde tekrar aranmamalı.
- Gözlem önerileri etkinliğin doğrulanmış program bağlantılarından gelmeli; eşleşme yoksa serbest not kullanılmalı. Seçim taslak oluşturmalı, açık Kaydet ile kayda dönüşmeli.
- Çocuk için skor, tanı, otomatik başarı veya gelişim etiketi oluşturulmamalı. Resmî alıntı ile öğretmen için yazılmış gözlem örneği ayrılmalı.
- Mevcut çevrim dışı kayıt, geri yükleme ve ham gözlem koruması sürdürülmeli. Yeni görsel yön mevcut mobil çalışma zamanı korunarak uygulanmalı.

## Gerçek öğretmenle kabul hedefleri

1. Fiziksel telefonda yardım almadan açılıştan itibaren 10 saniye içinde sıradaki işi anlayıp başlatma.
2. En fazla iki dokunuşta malzemeyi, kısa uygulama adımlarını ve uygun destek seçeneğini görme.
3. Çocuk seçildikten sonra en fazla üç işlemde bağlamı korunmuş gözlem kaydı; 20 gerçek kullanım tekrarında medyan en fazla 25 saniye, P95 en fazla 45 saniye. Kesinti ve internetsizlikte metin korunmalı; kayıt doğru çocukta bulunmalı.

Bunlar hedef değerlerdir; ölçüm yapılmış değildir. Otomatik test sayısı öğretmen başarısının yerine kullanılamaz.

## Erişilebilirlik ve kanıt sınırı

Ana eylemin büyük dokunma alanı ve metin etiketi olumlu. İkincil açıklamalar görünür ekranda küçük; telefon ve büyütme altında okunabilirliği ölçülmeli. Renk karşıtlığı, ekran okuyucu, klavye ve fiziksel cihaz bu turda tam denetlenmedi. WCAG uyumluluğu iddiası yoktur. Rakip ürünlerin güncel ekranları incelenmedi; rakip üstünlüğü veya eşdeğerliği sonucu çıkarılamaz.

## Önizleme kapsamı

Üç ayrı tasarım yönü, önizleme turunda kaydedilip açılarak incelenmiş Bugün ekranı ve mevcut lacivert/teal/krem tasarım dili üzerinden yerleşik Imagegen aracıyla üretildi. Görsellerdeki sınıf ve çocuklar kurgu, tarihler 31 Ağustos 2026 çıpalıdır. Görseller uygulanmış özellik veya resmî Maarif onayı değildir. Önizleme turu sonunda görsel yön seçimi henüz yoktu ve uygulama koduna geçilmemişti.

Sohbette görüntülenme sırasına göre kesin eşleme:

1. `app/output/design-audit-2026-08-31/concept-1.png` — Günün atölyesi.
2. `app/output/design-audit-2026-08-31/concept-2.png` — Oyun rehberi.
3. `app/output/design-audit-2026-08-31/concept-3.png` — Çocuktan gözleme.

Bu sıra araç sonuçlarının kullanıcıya gösterildiği sıradır. Üç görsel de incelendi. Görsel doğrulama gerçek etkileşim, içerik uzmanı incelemesi veya telefon kullanılabilirlik testi değildir.

## Sonraki uygulama turu — 0.22.0

Kullanıcı seçimi HALİS'e bıraktı. Üç yaklaşım mevcut uygulamada birleştirildi; kod ve paket kontrolleri geçti. Canlı mobil/görsel ve kayıt akışı kabulü tarayıcı URL güvenlik engeli nedeniyle açıktır. Güncel kapsam ve kanıt sınırı: [Günlük öğretmen deneyimi](GUNLUK_OGRETMEN_DENEYIMI_2026_08_31.md), [Design QA](../design-qa.md).

Kalıcı ders: Ürün kalitesi, özellik ve test sayısından önce öğretmenin gerçek işini doğru, hızlı ve rahat bitirebilmesiyle ölçülür.
