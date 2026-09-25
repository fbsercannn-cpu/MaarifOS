# MaarifOS üç rol ekosistem planı

Tarih: 24/09/2026

Bu plan “en iyi” ifadesini mutlak bir sıralama olarak değil, doğrulanabilir başarıları MaarifOS için yararlı tasarım ilkelerine dönüştüren üç rol modeli olarak kullanır.

## Rol modelleri

### Rouble Nagi — öğretmen ve öğrenme tasarımcısı

2026 Global Teacher Prize sahibi Rouble Nagi, erişimi düşük topluluklarda 800'den fazla öğrenme merkezi ve etkileşimli eğitim duvarları kurdu. MaarifOS'a çevrilen ilke: öğrenme; pahalı, karmaşık veya bağlantıya bağımlı olmadan sınıfın gerçek bağlamında erişilebilir olmalı.

Kaynak: https://globalteacherprize.org/pages/winners-globalteacherprize

### Margaret Hamilton — güvenilir yazılım mühendisi

NASA'nın Apollo uçuş yazılım ekibini yöneten Margaret Hamilton'ın yaklaşımında önceliklendirme, uçtan uca test ve insanın karar döngüsünde kalması öne çıkar. MaarifOS'a çevrilen ilke: öğretmen verisi kaybolmaz; kritik iş sessizce tahmin edilmez; hata, açık kurtarma yoluyla görünür olur.

Kaynak: https://science.nasa.gov/people/margaret-hamilton/

### Luke Wroblewski — mobil ürün tasarımcısı

Luke Wroblewski'nin Mobile First yaklaşımı küçük ekranda içerik, eylem, giriş ve düzen önceliklerini yeniden kurar. MaarifOS'a çevrilen ilke: öğretmen sınıfta tek elle, kısa bakışlarla ve klavye açıkken de ana işi tamamlayabilmeli.

Kaynaklar: https://www.lukew.com/about/ ve https://www.lukew.com/resources/mobile_first.asp

## Ürün omurgası

1. **Bugün:** Yoklama, günün planı, sıradaki etkinlik ve hızlı gözlem. Öğretmen ilk ekranda karar verir; rapor menülerine gitmez.
2. **Sınıfım:** Çocuk profili, aile iletişimi, sağlık/acil durum, teslim yetkisi ve arşiv. Aynı veri ikinci kez yazdırılmaz.
3. **Gözlem:** 500 ms içinde görünür yüzey, klavye gecikmesi olmadan yazım, cihazda taslak, tek dokunuşla kesin kayıt.
4. **Planla–uygula–gözle–değerlendir:** Her kayıt gerçek günlük etkinliğe ve öğretmenin doğruladığı program bağına dayanır.
5. **Belgeler:** Uygulamadaki kanonik veriden PDF/Word/Excel; ek elle veri girişi yoktur.
6. **Maarif AI:** DeepSeek varsayılan, yerel motor çevrimdışı yedek. AI yalnız taslak önerir; resmî kaydı öğretmen onayı olmadan değiştirmez.

## Mobil kabul sözleşmesi

- 320, 360, 390 ve 412 piksel genişlikte yatay taşma sıfır.
- Alt menü, modal, klavye, uzun metin, dolu form ve çıktı önizlemesi birlikte test edilir.
- Dokunma hedefleri en az 44×44 piksel.
- Ana eylem başparmak bölgesinde; ikincil araçlar açılır alanda.
- Gözlem görünürlük bütçesi 1,5 saniye; hazır olma bütçesi 6 saniye; kesin kayıt bütçesi 5 saniye.
- Yazı yazarken kök ekran veya büyük liste yeniden çizilmez.
- Ağ yokken temel sınıf, yoklama, gözlem ve plan görüntüleme çalışır.

## Yapay zekâ sözleşmesi

- Varsayılan sağlayıcı DeepSeek; model ve anahtar sunucu yapılandırmasındadır.
- Kimlik doğrulama Google hesabı üzerinden; oturum yoksa çağrı yapılmaz.
- T.C. kimlik, telefon ve e-posta istemden ayıklanır.
- Her AI çıktısında kaynak bağlamı, taslak niteliği ve öğretmen onayı gereği görünürdür.
- Zaman aşımı 45 saniye; iptal ve güvenli yerel geri dönüş açıkça gösterilir.
- Pedagojik dil çocuğu etiketlemez; gözlenen davranış ile yorumu ayırır.

## Web ekosistemi

### maarifos.com

Kurumsal ürün sitesi ve güven merkezi:

- Ana sayfa: öğretmenin gerçek günlük akışı.
- Ürün: Bugün, Sınıfım, Gözlem, Planlar, Belgeler, Maarif AI.
- Güven: yerel veri, şifreli yedek, API anahtarının sunucuda tutulması, hesap silme ve veri dışa aktarma.
- Destek: 60 saniyelik görev videoları ve sorun giderme.
- Uygulamayı aç çağrısı; pazarlama sitesi uygulama kabuğu gibi görünmez.

### maarifos.net

Kısa ve kalıcı yönlendirme alanı. Tek kanonik adres `https://www.maarifos.com` olur; yinelenen içerik barındırmaz.

### Uygulama

- PWA olarak kurulabilir.
- Güncelleme öncesi bekleyen yazmaları tamamlar.
- Google hesabı yalnız bulut yedek/AI gibi açıkça belirtilen hizmetlerde kullanılır.
- Çevrimdışı durumda öğretmen işi durmaz.

## Veri ve belge ekosistemi

- Tek öğrenci profili bütün ekran ve çıktıları besler.
- Veli çizelgesi resmî 13 sütunlu şablondur; 19 çocuk/sayfa ve üç sayfa kapasitesiyle 57 çocuğa kadar eksiksiz çıktı verir.
- Tarihlerin kullanıcı sözleşmesi `gg/aa/yyyy`; depolama sözleşmesi kanonik civil date/UTC'dir.
- Belge yayımlama kapısı: veri tamlığı, biçim, baskı alanı, Microsoft Excel açılışı, mobil indirme ve yeniden açma.

## Yol haritası

### P0 — yayın kapısı

- Gözlem yazma/kayıt gecikmesi ölçümü.
- Google OAuth gerçek hesap testi.
- DeepSeek gerçek yanıt testi.
- Veli Excel şablon/parite testi.
- 320–412 px yatay taşma testi.
- Sürüm, PWA ve önbellek bütünlüğü.

### P1 — öğretmen iş yükü

- Sınıf verisinden otomatik hazır seçenekler.
- Seçimin gerçek plan/gözlem/iletişim kaydına atomik yazılması.
- Eksik veli verisini çıktı öncesi çocuk bazında gösteren tamamlama merkezi.
- Gözlemden haftalık değerlendirme ve veli bültenine tek akış.

### P2 — güven ve ölçek

- Cihazlar arası şifreli yedek ve kurtarma tatbikatı.
- Erişilebilirlik uzmanı denetimi ve gerçek cihaz pilotu.
- Okul bazlı yönetici rolleri; en az yetki.
- Performans telemetrisi yalnız anonim süre/başarı ölçümleriyle, öğrenci verisi olmadan.

## “Oldu” ölçütü

Bir özellik yalnız derlenince değil; gerçek öğretmen akışında, dolu veriyle, dar telefonda, çevrimdışı/yeniden açma senaryosunda ve indirilen belgenin hedef uygulamada açılmasıyla tamamlanmış sayılır.
