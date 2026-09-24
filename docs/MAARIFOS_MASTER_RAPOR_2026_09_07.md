# MaarifOS kapsamlı master raporu

**7 Eylül 2026 | Yerel sürüm 0.25.0 | Ürün, mimari ve kabul planı | HALİS / MARİF**

Bu rapor son kullanıcı isteğini, çalışan kod üzerinde yapılan denetimi ve uygulanan düzeltmeleri birleştirir. Temel hedef: öğretmenin aynı bilgiyi bir kez girdiği, bütün ekran ve belgelerin aynı kayıt gerçeğini kullandığı, okul öncesine uygun ve profesyonel bir çalışma sistemi.

## 01. Yönetici kararı ve kapsam

MaarifOS'un önceliği yeni menü sayısını artırmak değil; mevcut öğrenci, plan, gözlem, belge ve yedek zincirini tutarlı bir ürün hâline getirmektir. İnceleme yalnız mizanpajla sınırlanmadı. Günlük payda, üyelik geçmişi, takvim, aktarım, kaynak kapsamı, erişilebilirlik, veri güvenliği ve sürdürülebilir mimari birlikte ele alındı.

Bu turdaki somut ürün işleri: anne/baba soyadı önerisi, görünür adres alanı, üçüncü kişinin ana iletişim tablosuna alınması. Kaynak incelemesinde bulunan ve aynı turda ele alınan hesaplama işleri: mükerrer yoklama özeti, sonradan katılan öğrencinin geçmiş paydası, çoğul gözlem katılımcıları, yeniden kayıt dönemleri, yıl dışı yeniden kayıt ve yıl adına bağlı tatil hesabı.

**Karar:** Yerel düzeltmeler ve ayrıntılı yol haritası teslim edilir. Saha kabulü tamamlanmış bütün ürün, bütün hassas koleksiyonları şifreli sistem veya uzaktan yayımlanmış yeni sürüm iddiası yapılmaz. Test sonuçları son bölümde kendi kapsamlarıyla yer alır.

Öneriler üç düzeyde okunmalıdır:

- **Uygulandı:** Bu turun kod değişikliği ve hedefli test kanıtı vardır.
- **Sıradaki iş:** Sorun veya fırsat, sorumlu modül ve kabul ölçütü bellidir; uygulandığı iddia edilmez.
- **Sahada doğrulanmalı:** Öğretmen süresi, gerçek yazıcı, fiziksel telefon veya bağımsız güvenlik incelemesi gerekir.

Önceki 11 Ağustos master planı tarihsel başlangıçtır. Bu rapor 7 Eylül öğrenci/iletişim istekleri için yeni karar kesitidir; eski gereksinim defterinin açık pilot maddelerini topluca kapatmaz.

## 02. Denetim yöntemi ve kanıtın sınırı

Çalışma dört kanaldan yürütüldü: öğrenci deneyimi, belge üretimi, sistem/matematik incelemesi ve kök entegrasyon. Gerçek kaynak kodu okundu; bellekte kurgu kayıtlarla hesaplar çalıştırıldı; uygulama içi tarayıcıda ayrı localhost kökeninde kurgu sınıf kuruldu; değişen akışlar otomatik tarayıcı senaryolarıyla sınandı.

İncelenen temel yüzeyler: Sınıfım, Çocuk ekle, Bilgiler/Yakınlar, Excel önizleme, Bugün bildirimleri, sınıf belgesi, öğrenci dosyası, gün kapanışı, eğitim yılı geçişi ve öğretim günü çözümleyicisi. Güvenlik ve içerik bölümleri kod ile mevcut proje kabul kayıtlarından türetildi. Bu, her düğmenin fiziksel cihazda sınandığı bütün ürün sertifikası değildir.

**Kanıt sınıfları:** K1 çalışan fonksiyon veya regresyon testi; K2 bu turda gözlenen ekran/PDF; K3 statik kod akışından çıkarım; K4 ölçülmesi gereken öneri. Bir K3 kapasite riski, ölçülmüş performans sonucu gibi sunulmaz. Yaş grubu uygunluğu teknik eşleme testinden ibaret değildir; pedagojik uzman değerlendirmesi ayrı kalır.

İnceleme anında Prototype.tsx yaklaşık 14.900 satır, features altında 190 dosya bulunuyordu. Bunlar olgunluk puanı değildir; değişikliklerin neden büyük orkestratöre dokunduğunu ve modül sınırlarının önemini gösterir.

**Örnek sınırı:** Kullanıcının 2025 XLS dosyası önceki entegrasyonda yerel ve salt okunur incelendi; 21 öğrenci ve 13 sütun eşlendi. Bu raporda çocukların gerçek adları, numaraları, adresleri veya aile bilgileri yoktur. Ekran ve regresyon kanıtları kurgu veridir.

## 03. Öğretmenin uçtan uca işi

Ana ürün döngüsü: **Sınıfı hazırla → öğrenciyi tanı → günü planla → uygula → gözle → öğretmen kararı ver → belgeyi üret → yedekle.** Her ekran bu zincirdeki bir işe hizmet etmelidir.

| An | Öğretmenin ihtiyacı | Ana eylem | Başarı kanıtı |
| --- | --- | --- | --- |
| İlk kurulum | Okul, öğretmen, sınıf ve yaş bandı | Sınıfımı hazırla | Reload sonrası aynı kapsam |
| Liste hazırlama | Tek çocuk veya XLS listesi | Çocuk ekle / Excel'den ekle | Kaynak satırlarıyla kayıt mutabakatı |
| Güne başlama | O gün kime/neye dikkat edeceği | Yoklama ve ilgili öğrenci dosyası | O günün gerçek üyeleri |
| Uygulama | Malzeme, adım, farklılaştırma | Etkinliği aç | Plan ve etkinlik kimliği korunur |
| Gözlem | Kısa, gerçek olay kaydı | Kayıt Ekle | Ham gözlem değişmez, tarihli |
| Gün sonu | Eksiklerin anlamını bilmek | Değerlendir / yarına taşı | Aynı kaynak kümesinden hesap |
| Belgeleme | Okunaklı ve doğru belge | Önizle ve indir | Aynı öğrenci ve dönem |
| Cihaz değişimi | Veriyi kaybetmemek | Şifreli yedek ve geri yükle | Karşı cihazda tam mutabakat |

Ana ekranda öncelik önerisi: tamamlanmamış kayıt işlemi, bugünkü çalışma, doğum günü gibi zamanlı bilgi, hazırlık ve kaynak keşfi. Bir bildirim çocuğun dosyasına götürmeli; aile durumunu genel kart üzerinde ifşa eden bir etiket hâline gelmemelidir.

Ürün dili kısa ve eyleme dönük tutulmalı. Öğretmene internal enum, schemaVersion veya hash gösterilmesi günlük akışın amacı değildir; teknik makbuz gerektiğinde ayrı ayrıntıdan erişilir.

## 04. Ad, soyadı ve aile ilişkisi tasarımı

**Uygulanan yaklaşım:** Çocuğun soyadı anne/baba için önerilir. Tek sözcüklü veli adı girildiğinde öneri eylemi görünür. Öğretmen dokununca adın sonuna soyadı eklenir. Girilmiş farklı veya çok sözcüklü veli adı değiştirilmez. Çocuğun soyadı sonradan değişince kayıtlı anne/baba adlarına sessiz toplu güncelleme yapılmaz.

Bu tercih adın çok anlamlı yapısını korur: bir anne farklı soyadı taşıyabilir; çift ad ile ad-soyad her zaman otomatik ayırt edilemez. Çocuğun soyadı üçüncü kişiye uygulanmaz. Anne/Annesi ve Baba/Babası yazımları aynı kanonik ilişkiyi ifade eder; yakınlık serbest metni üçüncü kişi için korunur.

| Girdi | Önerilen davranış | Kayıt etkisi |
| --- | --- | --- |
| Çocuk Ada Kurgu; anne Ayla | Ayla Kurgu önerisini göster | Yalnız dokununca değişir |
| Anne Ayla Deniz | Otomatik ekleme yapma | Farklı soyadı korunur |
| Baba adı boş | Önce adın girilmesini bekle | Soyadından kişi uydurulmaz |
| Üçüncü kişi Nehir | Soyadı çıkarma | Yakın bilgisi olduğu gibi |
| Çocuğun soyadı değişti | Yeni öneriler yeni soyadından | Mevcut kişiler aynen |

**Sıradaki iyileştirme:** İki sözcüklü veli adında isteğe bağlı, açıkça seçilen “Bu kişinin soyadını çocuktan ekle” aracı tasarlanabilir. Bu, varsayılan otomatik düzeltme olmamalı; önizleme eski ve yeni adı göstermelidir.

İsimler aramada Türkçe yerel kuralla karşılaştırılır. Görünen kaynak değerlerinin büyük harfe çevrilmesi veya kısaltılması bir veri düzeltmesi sayılmamalıdır. Öneri, bilgi doğruluğunun kanıtı değildir.

## 05. Adres ve ayrıntılı öğrenci dosyası

**Uygulanan yaklaşım:** Açık adres yeni öğrenci ekleme, profil ve Excel satır düzenleme akışında erişilebilir olur. Aynı bilgi `careDetails.homeAddress` alanında tutulur; ikinci bir adres kopyası oluşturulmaz. Çok satırlı giriş, 500 karakter sınırı ve uzun metnin kayıpsız korunması birlikte ele alınır.

Profilin önerilen bilgi mimarisi beş parçadır: kimlik ve eğitim bilgisi; anne/baba; diğer yakınlar ve acil iletişim; adres ve günlük bakım; öğretmene özel ayrıntı. “Telefon yok” ile “veli yok” aynı durum değildir. Adı veya mesleği bilinen veli telefonsuz kaydedilebilir; telefon yokken arama önceliği tanımlanamaz.

Mevcut özel alanlar: çocuk özel bilgi notu, aile açıklaması, ayrı yaşama, anne/baba vefatı, şehit/gazi çocuğu bilgisi. Bu alanlar kullanıcı talebiyle isteğe bağlıdır. Boş alan bilinmiyor anlamına gelir; olumlu/olumsuz bir aile durumu çıkarımı yapılmaz.

**Sıradaki model iyileştirmesi:** Basit evet/hayır yerine gerektiğinde “bilinmiyor / aile bildirdi / doğrulandı / güncellendi” kaynak ve tarih bilgisi eklenmeli. Ancak her günlük kaydı belge yüklemeye bağlayan ağır bir akış kurulmamalı. Bilgi kaynağı ve son görüşme tarihi, öğretmenin notun güncelliğini değerlendirmesine yardım eder.

Çocuk teslim alma yetkisi telefon rehberindeki yakınlıktan çıkarılmaz. Velayet, iletişim kurulacak kişi ve teslim yetkisi farklı alanlardır. Bu rapor hukuki karar otomasyonu önermemektedir; kurumun kaydettiği yetkinin gösterilmesi ve değişiklik tarihçesinin korunması önerilir.

Genel iletişim listesi ad/telefon/meslek/adresi taşır. Çocuk özel notu ve aile açıklaması genel listeye kendiliğinden eklenmez. Kullanıcının istediği raporda seçilen gerçek bilgiler kısaltılmadan korunur; kayıt günlüğüne kişisel değerler yazılmaz.

## 06. Excel aktarımının ayrıntılı sözleşmesi

Akış: **Dosya seç → sayfa ve başlık satırı → sütun eşleştirme → satır düzeltme → mükerrer inceleme → seçilenleri ekle → sonuç.** Eski XLS ile yeni XLSX aynı öğrenci domain kurallarına bağlanır. Dosyadaki boş hücre tahminle doldurulmaz; formül çalıştırılmaz.

Kanonik eşleme: öğrenci no, ad soyad, kimlik, doğum tarihi; anne adı/telefonu/mesleği; baba adı/telefonu/mesleği; üçüncü kişi adı/telefonu/yakınlığı; varsa adres, özel not, aile açıklaması ve kayıt yılı. Kaynaktaki grup başlıkları ile gerçek başlık satırı ayrılır. Kullanıcının örnek dosyasındaki 13 sütun bunun temel kabul örneğidir.

Mevcut sınırlama: 10 MB dosya, en çok 20 sayfa, 80 sütun, 1.000 öğrenci. Bunlar kullanım üst sınırıdır; 1.000 öğrencinin gerçek telefonda hızlı işlendiği iddiası değildir. Sayı olarak gelen telefon ve kimlik alanlarında sıfır kaybı veya bilimsel gösterim uyarısı, satır önizlemesinde anlaşılır olmalıdır.

Mükerrer eşleşmesi silme talimatı değildir. Aynı ad, kod veya kimlik olası eşleşme üretir. Öğretmen ayrı öğrenci olduğuna karar verirse `_MUKERRER_INCELE` kaynak satırı, UTC karar zamanı ve aday kimlikleriyle korunur. Düzenleme yeni bir mükerrer doğurursa önceki seçim tekrar inceleme gerektirir.

**Matematiksel mutabakat:** Kaynak veri satırı = seçilip eklenen + kullanıcıca dışarıda bırakılan + hata nedeniyle bekleyen. Boş satır/başlık/toplam satırı ayrıca sayılır. “21 satır bulundu” ile “21 öğrenci kaydedildi” aynı sonuç metni olmamalıdır.

Toplu kayıt tek transaction olmalı; ortada bir satır hata verirse diğerleri sessizce eklenmiş kalmamalıdır. Yeniden deneme aynı kimlikleri çoğaltmamalı. Sınıf veya eğitim yılı değişmişse eski önizleme başka kapsama yazılmamalıdır. Mevcut aktarım bu kontrollerle kurulmuştur.

## 07. Profesyonel sınıf listesi ve üçüncü kişi

**Uygulanan sonuç:** Anne, baba ve üçüncü kişi aynı ana iletişim çizelgesinde buluşur. A4 yatay ana tabloda sıra, öğrenci, anne adı/telefon/meslek, baba adı/telefon/meslek ve üçüncü kişi adı/yakınlık/telefon yer alır. Öğretmen ünvanı **Okul Öncesi Öğretmeni** olur.

Üçüncü kişi için az sayıda piksele metin sıkıştırmak yerine hücre genişliği ve satır kırılması birlikte hesaplanır. Bir çocuğun birden fazla ek yakını varsa devam satırları aynı çocukla görünür biçimde ilişkilendirilir. Satır, sırf sayfa sayısını düşürmek için okunamaz yazı boyutuna indirilmez.

Kimlik, doğum tarihi, öğrenci numarası ve 500 karaktere kadar açık adres ayrıntı çizelgesinde korunur. Ana çizelge iletişim sırasında hızlı tarama içindir; ayrıntı çizelgesi kaydı tamamlar. Üçüncü kişinin asıl iletişim bilgisi yalnız ayrıntı sayfasına bırakılmaz.

| Ölçüt | Kabul |
| --- | --- |
| Kağıt | A4 yatay; yazdırılabilir alanla tutarlı |
| Başlık | Okul, sınıf, eğitim yılı ve belge adı |
| Öğretmen | Ad soyad + Okul Öncesi Öğretmeni |
| Metin | Kaynak ad, telefon, meslek ve adres eksiksiz |
| Sayfalama | Tekrarlanan başlık ve sayfa numarası |
| Uzun içerik | Güvenli satır kırılması; kesme/üç nokta yok |
| PDF | Türkçe font, aranabilir metin, kaynakla eşleşme |
| Örneklem | 0/1/15/30/40 öğrenci; uzun ad, çok yakın ve uzun adres |

**Saha kabulü:** Gerçek yazıcıda yüzde 100 ölçek, siyah-beyaz okunabilirlik, fotokopi ve imza alanı kontrolü gerekir. Tarayıcı/PDF taşma testi fiziksel yazıcı ayarının yerine geçmez.

## 08. Tarih, yaş ve doğum günü matematiği

Sistemde üç zaman farklı anlam taşır: gerçekleşen sivil gün, kaydın UTC oluşturulma zamanı, kaydın UTC güncellenme zamanı. Bir notun bugün düzenlenmesi olay gününü bugüne çevirmemelidir. Gün anahtarı `YYYY-MM-DD`, teknik iz kanonik UTC ISO olmalıdır.

Tamamlanmış ay hesabı: `12 × (yıl farkı) + ay farkı - (referans gün, doğum gününden küçükse 1)`. Referans tarihi görünür ve sabit olmalıdır. Çocuğu resmî yaş grubuna atamak ile o günkü ay yaşını göstermek farklı kararlardır; sistem ikisini sessizce eşitlememelidir.

Doğum günü bildirimi için bu yıl veya sonraki yıldaki bir sonraki kutlama günü seçilir; `0 ≤ kalan sivil gün ≤ 3` koşulu uygulanır. Tarih farkı UTC gece yarılarından hesaplanarak saat değişimleriyle kaymaz. Aralık/Ocak geçişi kapsanır. Eksik veya geçersiz doğum tarihinde tahmin üretilmez.

29 Şubat için mevcut kutlama politikası, artık olmayan yılda 28 Şubat ve açık açıklamadır. Bu, tamamlanmış ay hesabını değiştirmez. Örneğin 29.02.2024 doğum için 28.02.2027'de erken kutlama etiketiyle 3 yaş doğum günü ve 35 tamamlanmış ay bir arada bulunabilir; etiket saklanırsa kullanıcı bunu çelişki sanabilir.

**Bildirim tasarımı:** Bugün / yarın / 2 gün sonra / 3 gün sonra; çocuğun dosyasına tek eylem. Geçmiş veya arşivlenmiş sınıfın doğum günleri aktif sınıfı doldurmamalı. Bildirim uygulama içidir; uygulama kapalıyken işletim sistemi bildirimi bu kapsamda yapılmış sayılmaz.

Gelecek öneri: “Bugün gördüm” gibi gün bazlı kişisel kapatma; kaynak doğum tarihini değiştirmez. Bildirimi kapatma kalıcı çocuk susturmasına dönüşmemelidir.

## 09. Üyelik tarihçesi ve silme semantiği

Bir çocuk kimliği ile o çocuğun sınıfa üyeliği aynı varlık değildir. Aynı çocuk bir yıl içinde ayrılıp dönebilir veya başka sınıfa geçebilir. Her dönem bağımsız UUID, başlangıç, bitiş, sınıf ve eğitim yılı taşımalıdır.

**Örnek:** 1-5 Eylül sınıfta, 6-30 Eylül ayrılmış, 1 Ekim yeniden kayıtlı çocuk için iki dönem gerekir. Eski dönemin bitişini silip 1 Eylül'den beri kesintisiz aktif göstermek geçmiş yoklama paydasını bozar. Bu audit'te bu hata bulundu ve gerçek yeniden kayıt akışı düzeltme kapsamına alındı.

Silmeyi geri alma, gerçek yeniden kayıttan ayrıdır. Yanlışlıkla arşivlenen öğrencinin geri alınması aynı kimliği ve önceki üyelik gerçekliğini korur. Ekim ayında gerçek geri dönüş ise yeni dönem açar. Arşiv öğrenci geçmişini ve gözlem bağlantılarını korumalıdır.

Günlük üyelik kuralı: eşleşen sınıf/yıl dönemlerinden en az biri için `başlangıç ≤ gün ≤ bitiş` sağlanır; bitiş yoksa üst sınır açıktır. Erken operasyon başlangıcı yalnız resmî ilk güne önceden hazırlanmış üyeliğe uygulanır. Sonradan katılan bir öğrenciyi yılın başına taşımak için kullanılmaz.

Yeni dönem başlangıcı hedef yılın izinli başlangıcı ve son günü arasında olmalıdır. Çakışan üyelikler reddedilir; eski kaynak kayıtlar silinmez. Birden fazla dönem varsa “ilk eşleşen” yerine işlem amacına uygun en son aktif dönem seçilmelidir. Yıl arşivleme ve sınıf taşıma da aynı kurala bağlanır.

**Kabul:** Ayrılık aralığındaki payda sıfır; geri dönüş tarihinden sonra bir. Gelecekteki kayıt eski günün kapanışını bayatlatmaz. Yanlışlıkla silme/geri alma ilave hayalî kayıt dönemi üretmez.

## 10. Yoklama, gözlem ve oranların anlamı

Yoklama sayımı ham satırdan yapılamaz. Önce öğrenci, sınıf, eğitim yılı ve tarih aralığı süzülür; sonra her çocuk/gün için kanonik kayıt seçilir. Mükerrer adaylar kaynakta ve denetim izinde korunur. Bu tur öğrenci dosyasındaki iki kez sayım düzeltildi; rapor mükerrer ve geçersiz kayıt sayısını ayrıca açıklar.

Gün sonu paydası, o gün sınıf üyesi olan çocuk kümesidir. Sonradan katılan öğrenciler geçmiş günün eksik yoklaması hâline gelmez. Gözlem katılımcıları `studentIds` dizisiyle geldiğinde de bu küme uygulanır. Karma grup gözlemi, en az bir geçerli katılımcıyla tek olay sayılır; çocuk-gözlem sayısı isteniyorsa farklı metrik olarak adlandırılır.

| Ölçü | Tanım | Boş veri |
| --- | --- | --- |
| Yoklama tamlığı | İşaretli çocuk-gün / beklenen çocuk-gün | Payda 0 ise hesaplanamaz |
| Kaydedilmiş devam | Geldi veya geç geldi / kaydı olan uygun çocuk-gün | Kayıtsız gün absent değildir |
| Gözlem erişimi | En az bir geçerli gözlemi olan üye çocuk / dönem üyeleri | Kanıt yok açıkça görünür |
| Gün çeşitliliği | Tekil gözlem sivil günü sayısı | 0 gerçek sıfırdır |
| Program bağı kapsamı | Öğretmen onaylı kanıt bağı bulunan hedef / seçili hedef kümesi | Hedef kümesi görünür |

Yüzde 100 gözlem kapsamı “bütün kazanımlar gerçekleşti” demek değildir. Yoklama kaydı eksikse devam yüzdesi güvenilir tam dönem oranı gibi sunulmamalı. Mazeretli/geç/yarım gün politika seçimi ayrı açık tanım ister; öğretim süresinden keyfî kesir türetilmemelidir.

Gelecek P2: ters saatli giriş/çıkış ve çakışan yarım gün olayları için inceleme uyarısı. Kaynak saatleri sessizce sıralayıp düzeltmek yerine çelişkiyi öğretmene göstermek gerekir.

## 11. Takvim ve kapsam tutarlılığı

Bu tur somut hata: eğitim yılı adı “2026-2027” biçiminde değişince takvim ara tatili göstermeye devam ederken haftalık öğretim çözümleyicisi aynı haftayı beş öğretim günü sayabiliyordu. Görünen ad anahtar olarak kullanılıyordu. Resmî tarih aralığındaki yeniden adlandırma artık tatil hesabını değiştirmez; özel dönem fallback yolu korunur.

**Sıradaki P1 tasarım:** Kalıcı, sürümlü takvim profil kimliği. Takvim görünümü, haftalık değerlendirme, günlük kapanış, rotasyon ve belge aynı profil, yerel kapanışlar ve tarih kümesinden türemeli. Kullanıcının yıl adını düzenlemesi yalnız etiketi değiştirmelidir.

Tatil kümesi birleşim olarak ele alınmalı: hafta sonları, resmî ara tatiller ve kaynaklı yerel kapanışlar. Aynı gün iki nedenle kapalıysa iki kez çıkarılmaz. Yarım günün “gün sayısı” ve “planlanan dakika” üzerindeki etkisi ayrı tanımlanır. Eksik planın kendisi tatil kanıtı olamaz.

**Açık bulgu:** Gün kapanışı yıl sınırını kontrol ediyor fakat boş bir hafta sonu için de eksik yoklama ve günlük plan işi üretebiliyor. Öneri, öğretim olmayan günde olağan yükümlülük üretmemek; öğretmenin açıkça eklediği istisna çalışmayı ve ham kayıtları erişilebilir tutmak. Bu davranışın tüm bağımlılıkları bu tur yeniden tasarlanmadı.

186 günlük rotasyon sayısı bu repodaki mevcut takvim çözümleyicisinden elde edilen test evrenidir; evrensel okul günü sayısı veya yeniden doğrulanmış hukuki takvim hükmü değildir. Yerel kapanışlar ve kurum uygulaması evreni değiştirebilir. Kullanıcıya sunulan rapor, hesabın kullandığı gün kümesini ve kapsamını gösterebilmelidir.

## 12. Maarif içeriğini derinleştirme planı

İçerik genişliği belge sayısıyla ölçülmemeli. Her yaş bandında alan becerisi, kavramsal beceri, eğilim, sosyal-duygusal öğrenme, değerler ve okuryazarlık bağları aynı etkinlik içinde somut çocuk eylemine dönüşmelidir. MEB'nin okul öncesi girişinde 36-48, 48-60 ve 60-72 ay ayrımı bulunur. [MEB TYMM okul öncesi](https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi)

Her etkinliğin asgari içeriği: amaç ve resmî kaynak bağı; malzeme ve hazırlık; kısa uygulama adımları; açık uçlu soru; küçük/büyük grup seçeneği; destekleme ve zenginleştirme; güvenlik ve erişilebilirlik; aile bağlantısı; gözlenecek gerçek davranış; öğretmen yansıtması. Örnek çocuk sözü gerçek gözlem olarak kaydedilemez.

Mevcut mimaride resmî program, editoryal etkinlik paketi, pedagojik lens ve öğretmen planı ayrı katmanlardır. Bu ayrım korunmalı. Kullanıcının sağladığı uyum rehberi ek bilgi kaynağıdır; resmî programın tüm içeriğinin yerine geçirilmez.

**İçerik denetim kartı önerisi:** Kod ve sürüm; yaş bandı; kaynak sayfası; öğretmen için hazırlık süresi; uygulama seçenekleri; hangi durumda uygun olmayacağı; son editoryal kontrol; kullanılan/önerilen günler. Kaynak bağlantısını açmak öğretmenin planını değiştirmemelidir.

**Aileyle çalışma:** Aile durumuna göre otomatik çocuk profili veya başarı beklentisi üretmeyin. Etkinlik alternatifleri, çocuğun katılım gereksinimi ve öğretmen gözleminden seçilmeli. Genel aile katılımı davetleri tek tip anne-baba varsayımına bağlanmamalı; “aileden/yakınından bir kişi” gibi kapsayıcı seçenek bulunmalıdır.

Pedagojik kabul: En az iki okul öncesi öğretmeni, yaş bandı başına somut örnekleri uygulama anlaşılabilirliği, hazırlık yükü ve gözlem yapılabilirliği açısından incelemeli. Bu öneri, gerçekleşmiş uzman onayı olarak okunmamalıdır.

## 13. Etkinlik bankası ve gerçek kullanım kapsamı

Audit, yıllık kapsam testinin kullandığı havuzla Bugün ekranının havuzunun farklı olduğunu gösterdi. Bugün `hemen` filtresini kullanıyor; yıllık rotasyon testi bütün havuzu kullanıyor. Dolayısıyla bir helperın bütün bankayı dolaşması, ana sayfanın bütün bankayı kullandığını kanıtlamıyor.

| Yaş bandı | Uygun bankadaki etkinlik | Bugün yolunda görülen | Bu yoldan görülmeyen |
| --- | --- | --- | --- |
| 36-48 ay | 117 | 59 | 58 |
| 48-60 ay | 120 | 60 | 60 |
| 60-72 ay | 120 | 60 | 60 |

Bu sayılar mevcut gerçek UI filtresiyle 186 gün boyunca saf fonksiyon denemesidir. Stüdyodan elle erişim mevcuttur; etkinlikler silinmiş veya tamamen erişilemez değildir.

**Önerilen iki yol:** Bugün ekranı hazırlıksız/kısa deneyimleri önersin; haftalık plan hazırlığı daha uzun hazırlık isteyen deneyimleri önceki hafta göstersin. Aynı etkinliğin erken tekrarını sınırlamak, değer/alan dengesini izlemek ve öğretmenin reddetme nedenini yerel tutmak ikinci aşamadır.

Kapsam `görülen tekil etkinlik / önerilmeye uygun etkinlik` olarak ölçülür. Pedagojik kalite veya çocuk kazanımı yüzdesi olarak adlandırılmaz. 0 uygun içerikte kapsam oranı gösterilmez. Ölçüm ekranındaki havuz etiketi, filtre ve dönem açıkça görünür.

**Kabul:** Test gerçek UI filtresinden başlamalı; her yaş bandında dışarıda kalan kimlikleri üretmeli; haftalık yol bağlandığında iki yolun birleşim ve kesişimi ölçülmeli. Tatil, yerel kapanış, yeni öğretmen tercihi ve havuz sürümü değişikliği için deterministik sonuç beklenir.

## 14. Uyum rehberi: tam kaynak ve işe dönüşüm

Önceki entegrasyonda kullanıcının sağladığı 2026-2027 Okula Uyum Rehberi özgün 35 sayfalık PDF, tüm sayfa görselleri ve sayfa bazlı aranabilir metin olarak eklendi. Dosya 13.514.036 bayt; kaynak SHA-256 değeri `353b9e91e3f140b96dc3e3f110815e5592a809750caa6bbb8575274a100059a4`.

Bu kaynağın eksiksiz bulunması ile bütün içeriğin otomatik bir uyum planına dönüştürülmesi farklı teslimlerdir. Rehber şu an okunabilir ek kaynaktır. Önerilen sonraki adım, öğretmenin seçtiği sayfa veya bölümden kendi uyum kontrol listesini oluşturmasıdır; her madde kaynak sayfasına geri döner.

Uyum alanı için önerilen çalışma birimleri: ilk aile görüşmesi, sınıfla tanışma, ayrılık ve karşılama rutini, günlük bakım bilgisi, çocuğun katılım gözlemi, aileye günlük kısa geri bildirim, hafta sonu öğretmen yansıtması. Bunlar bu raporun ürün önerileridir; rehberden birebir alıntı veya resmî zorunlu form gibi sunulmaz.

Kayıt ile kaynak ayrılmalı: rehber metni salt okunur; öğretmen notu kendi verisidir; çocuk özel notu kaynak metnin içine yazılmaz. PDF sürümü değişirse öğretmenin eski notu silinmez. Kaynak güncellemesi sürüm ve hash ile görünür olur.

**Çevrim dışı sınır:** Yerel uyum rehberi kurulu güncel pakette çevrim dışıdır. Diğer resmî TYMM kitapları çoğunlukla uzak MEB PDF bağlantılarıdır ve internet isteyebilir. “Tüm kaynaklar çevrim dışı” genel vaadi verilmemeli. Her kaynak için indirildi/çevrim dışı hazır/bağlantı gerektirir durumu açık olmalıdır.

## 15. Kanıttan değerlendirmeye, değerlendirmeden plana

Önerilen değerlendirme modeli üç katmanlıdır: tarihli ham gözlem, öğretmenin yorumu, sonraki eğitim kararı. Ham gözlem ile yorum aynı alanda karışmamalı. Bir kaynak değiştiğinde önceki onaylı metin bayat olarak işaretlenmeli; yeniden onay alınmadan güncel sonuç gibi paylaşılmamalıdır.

Gelişim değerlendirmesi bir kerelik puan değildir. NAEYC, gözlem ve değerlendirmenin sürekliliğini, farklı bağlamları ve aile/öğretim kararlarıyla bağını vurgular. Buradaki ürün önerisi, gün/ortam çeşitliliğini görünür kılmak ve tek gözlemden genel çocuk etiketi çıkarmamaktır. [NAEYC değerlendirme ilkeleri](https://www.naeyc.org/resources/position-statements/dap/assessing-development)

Her değerlendirme cümlesinin kanıt kümesi bulunmalı. Gözlenmeyen alan “başarısız” sayılmamalı. Otomatik öneri, “bu hafta iki farklı ortamda gözlem eklemeyi düşünün” gibi öğretmen işini destekleyebilir; çocuğa tanı veya kapasite etiketi koymamalıdır.

**Sonraki plan bağı:** Öğretmen “küçük grup ve görsel destek deneyeceğim” kararını onayladığında ilgili haftanın taslağına öneri taşınır. Kaynak karar kimliği korunur. Eski etkinlik uygulandı veya yeni gözlem oluştu gibi kayıt üretilmez. Öğretmen öneriyi kabul edebilir, değiştirebilir veya gerekçeyle bırakabilir.

Belge ailesi: günlük plan, haftalık/aylık değerlendirme, anekdot, öğrenci dosyası ve aile paylaşımı. Hepsi aynı kanıt havuzundan kendi amacına uygun alanları almalı. Bir belgede yeniden yazılmış serbest metni diğer belge için bağımsız gerçek kaynak kabul etmek veri çoğaltır.

**Kabul:** Kaynak gözlem UUID'si bütün zincirde izlenir; silinmiş/başka sınıfa ait kanıt kabul edilmez; kullanıcı incelemesi olmadan yapay zekâ taslağı öğretmen onaylı sonuca dönüşmez.

## 16. Mimari: tek doğru hesap, açık modül sınırı

Önerilen katmanlar: **Domain kuralları → kullanım senaryosu servisleri → kapsamlı okuma modelleri → ekranlar → belge projeksiyonları.** Ekran bir üyelik kuralını yeniden yazmamalı; belge farklı bir yoklama sayacı icat etmemeli. Bu audit'teki hataların ortak nedeni aynı anlamın farklı yüzeylerde yeniden kurulmasıdır.

| Modül | Tek sahip olması gereken anlam | Tüketen yüzeyler |
| --- | --- | --- |
| Öğrenci/üyelik | Profil, ilişki, üyelik aralığı | Sınıf, gün, aktarım, arşiv |
| Takvim | Öğretim günleri ve istisnalar | Plan, kapanış, rotasyon |
| Kanıt | Ham kayıt, revizyon, onay | Gelişim, dosya, değerlendirme |
| Belge | Şablon, mizanpaj, kaynak izi | PDF, Word, önizleme |
| Kalıcılık | Transaction, sıra, scope, backup | Bütün yazma işlemleri |

Prototype.tsx tek turda parçalanmamalı. Aşamalı ayrıştırma önerisi: öğrenci kullanım senaryoları ve form state'i; belge önizleme/export orkestrasyonu; gün okuma modelleri; eğitim yılı geçişi. Her dilim eski servis sözleşmesini ve yarış testlerini koruyarak taşınır. Sırf dosya satır sayısını azaltmak kabul ölçütü değildir.

Okuma performansı: ana sayfa çeşitli kartlar için bütün snapshot'ı tekrar tekrar okuyabiliyor. Önce okunan kayıt ve byte sayısı ölçülmeli; sonra tek tutarlı snapshot/revision veya indeksli sorgu paylaşılmalı. Farklı anda okunmuş kartları birleştirip tutarsız toplam üretmek hız uğruna kabul edilmez.

Her yazmada beklenen scope ve güncel revizyon kontrol edilmeli. İki sekme, hızlı çift tıklama ve aktarım ortasında sınıf değişimi standart negatif testlerdir. Başarılı toast, durable commit ve doğrulanan reload davranışına dayanmalıdır.

## 17. Yedek, kapasite ve kurtarma

Somut P1 kapasite riski: profil fotoğrafı tek başına 400.000 karaktere kadar kabul edilirken metin restore sınırı yaklaşık 20 Mi karakterdir. 60 sınır boyutlu fotoğraf, diğer geçmiş hariç yaklaşık 24 milyon karakter eder. Bu bir kapasite sözleşmesi çıkarımıdır; gerçek 60 fotoğraflı telefon stres testi yapılmış sayılmaz.

**Temel değişmez:** Başarıyla üretilip kullanıcıya verilen yedek, aynı desteklenen sürümün temiz deposunda geri yüklenebilir olmalıdır. Export ve import ayrı, çelişkili sınırlar kullanmamalı. UTF-8 byte ile JavaScript karakter sayısı ayrımı açık olmalıdır.

Önerilen çözüm sırası: ortak bütçe ve export ön kontrolü; metin/medya ayrımlı manifest; doğrulanmış parçalı paket; eksik parçayı yazmadan reddetme; temiz cihazda öğrenci/üyelik/gözlem/yoklama/medya mutabakatı. Sadece sınırı büyütmek mobil belleğin aynı anda JSON, şifreli metin ve kopyalar taşıması sorununu çözmez.

Kurtarma deneyimi: son yedek tarihi; dosyanın cihaz dışında saklanıp saklanmadığına ilişkin kullanıcı bildirimi; son gerçek geri yükleme tatbikatı. “Yedek alındı” ile “başka cihazda geri yüklenebildi” ayrı durumlar olmalıdır.

**Kabul matrisi:** sınır altı/üstü; çok yıllı veri; bozuk checksum; eksik medya; yanlış parola; yazma ortasında kesinti; aynı dosyayla tekrar; dolu hedefe yanlışlıkla replace; anahtar kaybı. Başarısızlıkta mevcut veri korunur. Transaction tamamlanmadan kaynak silinmez.

Bu çalışma riskin yerini ve çözüm planını ortaya koyar; parçalı yedek formatı bu sürümde üretilmiş değildir. Öncelik P1, tahmini ilk mühendislik dilimi 1-3 kişi-gün; fiziksel cihaz ve bağımsız inceleme ayrıca gerekir.

## 18. Gizlilik, erişim ve kurumsal kullanıma hazırlık

Mevcut proje kanıtı öğrenci kayıt gövdesi ve öğrenci kurtarma dilimini AES-GCM zarfıyla koruyor. Ancak plan, ham gözlem, yoklama notları, medya ve bütün diğer koleksiyonlar aynı kapsamda değildir. “Öğrenci kasası var” cümlesi “tüm uygulama verisi cihazda şifreli” anlamına gelmez. Projenin MR-056 gerçek veri pilot kapısı açıktır.

Önerilen güvenlik programı: bütün hassas koleksiyonların envanteri; saklama ve paylaşım amaçları; anahtar/nonce/AAD modeli; kesintili migration ve replay testleri; kurtarma; aynı-origin içerik güvenliği; cihaz erişimi; bağımsız inceleme. PIN tek başına depolama şifrelemesi değildir. Bu rapor hukuki uygunluk belgesi değildir.

Günlük kullanımda paylaşım hedefi ve belge kapsamı görünür olmalı. Veliye giden içerikte başka öğrencinin bilgisi bulunmamalı. Grup fotoğrafı izni tek çocuğun genel iznine indirgenmemeli. Kimin teslim alabileceği ile kimin aranabileceği aynı yetki değildir.

Kullanıcının veri bütünlüğü tercihi korunur: seçilen rapor/Excel/PDF alanları kendiliğinden maskelenmez veya kısaltılmaz. Teknik loglarda ad, kimlik, telefon, adres ve özel not tutulmaz. Haricî paylaşım veya yayın bu raporun hazırlanması nedeniyle otomatik yapılmaz.

Kurumsal açılıştan önce kurumun sorumlu kişisi, saklama süresi, yetki değişikliği ve olay müdahalesi açıkça belirlenmelidir. Bu kararlar ürün tasarımında yer tutar; geliştiricinin tek başına işaretlediği bir checkbox ile kapanmış sayılmaz.

## 19. Erişilebilirlik ve görsel sistem

Profesyonellik yalnız renk ve boşluk değildir: öğretmen tek elle, klavye açıkken ve uzun metinle işini bitirebilmelidir. Var olan mobil runtime bileşenleri, KeyboardInput/KeyboardTextarea, BottomSheet ve odak dönüşü korunmalıdır. Aynı iş için ikinci kaydırma sistemi eklenmemelidir.

Bu turdaki uygulama içi tarayıcı incelemesinde boş sınıf ekranı, dört alanlı kurulum ve isteğe bağlı ayrıntılı çocuk formu yakalandı. Akışın ana eylemleri okunur ve belirgin; aynı ağırlıktaki iki büyük “ekle” eylemi yer kaplıyor. İleri tasarım önerisi, dolu sınıfta birincil/ikincil eylem hiyerarşisi kurmak ve gözlem kartının listeye erişimi gereksiz uzatmamasını ölçmektir. Bu öneri bu tur tüm ana ekranın yeniden çizildiği anlamına gelmez.

W3C'nin WCAG 2.2 AA hedef boyutu ölçütü 24×24 CSS px ve tanımlı istisnalar içerir. Ürünün 44 px dokunma hedefi daha rahat mobil kullanım için seçilmiş iç tasarım hedefidir; 44 px değeri AA'nın değişmez asgari koşulu diye sunulmamalıdır. [W3C hedef boyutu açıklaması](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

| Sınama | Beklenen sonuç |
| --- | --- |
| 320/390 px | Yatay taşma yok; temel eylem erişilebilir |
| Yüzde 200 büyütme | Metin ve eylemler yeniden akar |
| Uzun Türkçe değer | Hücre/kart taşması veya kesme yok |
| Klavye açık | Son alan ve kaydet erişilebilir |
| Escape/geri/kapat | Taslak politikası açık; odak geri gelir |
| Ekran okuyucu | Alan etiketi, hata ve durum duyurusu anlamlı |
| Renk algısı | Hata ve başarı yalnız renkle anlatılmaz |

Otomatik dar ekran testleri fiziksel VoiceOver/TalkBack incelemesinin yerine geçmez. Özellikle Excel satır düzeltmesi ve uzun özel not bu cihazlarda denenmelidir.

## 20. Öncelikli uygulama iş listesi

P0, veri kaybı/sızıntısı veya kabulü durduran güvenlik olayıdır; P1 yanlış sonuç veya temel iş engeli; P2 kalite, açıklık ve ölçek iyileştirmesidir. Sıralama sadece efora bölünmüş puanla yapılmaz. Veri bütünlüğü ve bağımlılık önce gelir. Eforlar bir geliştiricinin odaklı kişi-gün tahminidir; takvim taahhüdü değildir.

| İş | Öncelik / durum | Efor | Bitiş ölçütü |
| --- | --- | --- | --- |
| A01 Soyadı önerisi | P1 / uygulandı | Bu tur | Farklı soyadı korunur, tıklama uygulanır |
| A02 Görünür adres | P1 / uygulandı | Bu tur | Add/edit/import aynı alan, reload |
| A03 Üçüncü kişi çizelgesi | P1 / uygulandı | Bu tur | Aynı ana tablo, taşmasız PDF |
| A04 Mükerrer devam özeti | P1 / uygulandı | Bu tur | Tek çocuk-gün, bütün kaynak izi |
| A05 Gün kapanışı kümesi | P1 / uygulandı | Bu tur | Üyelik ve katılımcı aynı hesap |
| A06 Yeniden kayıt dönemi | P1 / uygulandı | Bu tur | Ayrılık aralığı, yıl sınırı, restore |
| A07 Takvim adı hatası | P1 / uygulandı | Bu tur | Yeniden adlandırma tatili bozmaz |
| B01 Ortak takvim/üyelik servisleri | P1 / sıradaki | 2-4 | Ekran/belge/payda aynı küme |
| B02 Yedek bütçesi ve paket | P1 / sıradaki | 1-3 ilk dilim | Her başarılı export restore edilir |
| B03 Çok yıllı dosya kapsam seçimi | P1 / sıradaki | 1-2 | İki yıl ayrı, sızıntısız belge |
| B04 Tam hassas koleksiyon kasası | Pilot kapısı / açık | 5-10 ilk dilim | Migration, recovery, uzman incelemesi |
| C01 Öğretim dışı gün kapanışı | P2 / sıradaki | 1-2 | Boş tatilde hayalî yükümlülük yok |
| C02 Hazırlıklı etkinlik önerileri | P2 / sıradaki | 1-2 | Gerçek UI havuzunda kapsam testi |
| C03 Yoklama saat çelişkisi | P2 / sıradaki | 0,5-1 | Uyarı var, ham olay korunur |
| C04 Ortak belge çıktı merkezi | P2 / sıradaki | 2-4 | Önizleme/onay/sürüm/şablon ortak |
| C05 Tek snapshot / indeksli okuma | P2 / ölç ve uygula | 1-2 | Okunan byte ve tekrar azalır |
| C06 Profil kaynak/güncellik bilgisi | P2 / tasarım | 1-2 | Bilinmiyor ve beyan ayrılır |
| C07 Uyum kaynağından kontrol listesi | P2 / tasarım | 1-3 | Kaynak sayfası ve öğretmen kaydı ayrı |
| C08 Eski PDF vaat metinleri | P2 / temizlik | 0,5 | Görünen vaat gerçek exporter ile aynı |
| C09 QA çıktı/Vite yeniden yükleme | P2 / altyapı | 0,5 | Render çıktısı aktif UI testi bozmaz |

## 21. Aşamalı yol haritası ve karar kapıları

**Dalga 0 - bu teslim:** Öğrenci veri girişini ve sınıf çizelgesini tamamla; somut hesap hatalarını kapat; testleri ve raporu aynı kaynak sürümüne bağla. Kullanıcı yerel uygulamada inceleyebilir. Uzak yayın ayrı eylemdir.

**Dalga 1 - yaklaşık 1-2 çalışma haftası:** B01-B03, C01, C03. Önce ortak tarih/üyelik anlamı ve yedek kapasitesi, sonra çok yıllı belge. Bağımlılık: dönem/üyelik ortaklaşmadan geçmiş yıl dosyası için yeni UI çoğaltılmamalı. Kapanış tatil politikası haftalık çözümleyiciyle aynı sonuç kümesini kullanmalı.

**Dalga 2 - yaklaşık 1-2 çalışma haftası:** C02, C04-C07. Öğretmenin tam hafta işi, kaynakla bağlı etkinlik çeşitliliği, belge standardı, ölçülmüş okuma maliyeti. Her içerik için uzman incelemesi ayrıca takvimlenir. Tam yıl kapsamı gerçek UI yollarından ölçülür.

**Güvenlik hattı - paralel ve kapı niteliğinde:** B04, ikinci cihaz restore, fiziksel telefon, bağımsız inceleme, kurumsal veri sorumluluğu. Bunlar yalnız takvim doldu diye tamamlanmış sayılmaz. Mevcut gerçek veri pilotu kararı kendi kanıtıyla güncellenir.

**Pilot hattı:** Teknik engeller kapandıktan sonra en az iki farklı cihaz ailesi ve öğretmenlerle gerçek iş süresi ölçülür. Projedeki daha kapsamlı pilot protokolü geçerlidir; bu rapor onu daraltmaz. Öğretmenin tereddüt ettiği, geri döndüğü ve tekrar veri girdiği adımlar da sayılır.

Her dalga dört çıktı verir: çalışan davranış; negatif regresyon; güncellenmiş kabul defteri; yeniden eleştiri. Açık sorunlar bir sonraki dalgaya görünür aktarılır. Aynı hata giderilmeden yeni “her şey hazır” puanı veya toplu başarı etiketi üretilmez.

## 22. Ölçüm ve kabul matrisi

Aşağıdakiler gelecek kabul hedefleridir; bu rapordaki birim test süreleri öğretmen kullanım süresi değildir. Kullanıcıya yük bindiren ölçüm için yalnız işlem türü, süre, sonuç ve cihaz sınıfı tutulur; kişisel alan değerleri ölçüm günlüğüne girmez.

| Alan | Senaryo | Kabul hedefi |
| --- | --- | --- |
| Manuel kayıt | Tek/çift ad, farklı veli soyadı, boş telefon | Kaynak değer kaybı 0 |
| Adres | 1 ve 500 karakter, çok satır, Türkçe | Save/reload/backup aynı değer |
| Aktarım | XLS/XLSX/CSV/TSV; sütunlar yer değiştirmiş | Eşleme ve satır mutabakatı |
| Aktarım hatası | Mükerrer, yanlış tarih, sınıf değişimi, ara hata | Sessiz/kısmi commit 0 |
| Üyelik | Ayrıl/dön, yıl sonu, erken başlangıç | Gün bazında tek doğru payda |
| Yoklama | Aynı gün çok kayıt ve geçersiz statü | Kanonik sayım, kaynak korunur |
| Gözlem | Tek/çok çocuk, ayrılmış katılımcı | Aynı olay bir kez; doğru kapsam |
| Doğum günü | Bugün, +1/+3/+4, yıl geçişi, 29 Şubat | Bildirim aralığı exact |
| Belge | 0/1/15/30/40, uzun metin, çok yakın | Kesilen alan ve kayıp kaynak 0 |
| PWA | Yeni sürüm, offline aç, kill/reload | Kayıt kaybı ve sürüm karışması 0 |
| Kurtarma | Temiz ikinci depo, yanlış parola, bozuk paket | Başarıda tam mutabakat |
| Erişim | 320/390 px, büyütme, ekran okuyucu | Ana iş klavye/odakla tamamlanır |
| Performans | 30/100/1.000 öğrenci; 1/3/5 yıl | Önce ölç; bellek ve p95 raporla |
| Öğretmen işi | 20 çocuk yoklama, kısa gözlem | Proje pilot protokolü eşikleri |

Önerilen işletim göstergeleri: başarısız durable yazma sayısı, tekrar gereken aktarım satırı, son doğrulanmış yedek, çözümlenmemiş mükerrer aday, kanıtı eksik rapor ve açık eski sürüm. Bu göstergeler çocuk performans sıralaması değildir.

## 23. Görsel kanıt ve bu turun teslim sınırı

Bu turda uygulama içi tarayıcıyla alınan aşağıdaki iki görüntü ayrı localhost kökeninde kurgu sınıfa aittir. Öğrenci veya veli kişisel verisi taşımaz. İlk görüntü sınıfın boş durumundaki eylem hiyerarşisini; ikinci görüntü çocuk ekleme formunun başlangıcını gösterir. Değişmiş 320/390 px form ve PDF kanıtları ek kabul dosyalarında yer alır.

![Sınıfım boş durum - mevcut akış](../app/output/master-audit-2026-09-07/01-classroom-before.png)

![Çocuk ekle başlangıcı - mevcut akış](../app/output/master-audit-2026-09-07/02-add-before.png)

Görsel hüküm: temel işlerin adı ve hedefi anlaşılır; isteğe bağlı veli ayrıntısının keşfi, yoğun formu kaydırma ve belge sütun genişliği bu isteğin odaklarıdır. Yeni soyadı ve adres davranışlarının tamamlandığı, eski başlangıç ekranından çıkarılmaz; onların güncel test kanıtı ayrıca okunur.

## 24. Diğer belgeler için ayrıntılı iyileştirme kuyruğu

Sınıf listesi dışındaki bütün belge türleri bu tur yeniden görsel render edilmedi. Aşağıdaki bulgular kaynak kodu ve mevcut belge testlerine dayanır. DOCX ZIP/XML testinin geçmesi, Word'de her tablonun doğru bölündüğünü kanıtlamaz.

| Konu | Mevcut bulgu | Sonraki müdahale ve kabul |
| --- | --- | --- |
| Çıktı dili | Bazı ekranlar semantik üreticiye rağmen görsel PDF diyor | Ortak kabiliyet metni; vaat ve dosya tutarlı |
| Önizleme eşliği | HTML/PDF veri aynı; sayfa sayısı farklılaşabilir | Gerçek PDF önizleme veya ortak sayfa profili |
| Küçük sınıf | 1 çocuk için iki bölüm iki sayfa | 1-3 çocuk kısa profil; 8,5 pt ve imza korunur |
| DOCX kap katmanı | ZIP üretimi üç farklı modülde | Ortak paketleyici; XML ve kaynak kimliği regresyonu |
| Eski çizim kodu | Bazı anekdot/aylık modüllerde raster yardımcıları var | Çağrı taraması sonrası ölü kod temizliği |
| Devam sayfası | Bazı PDF tüketicileri özel üstbilgi vermiyor | Her sayfada sınıf/dönem/belge bağlamı |
| Kaynak tekrarı | Bazı gelişim çıktılarında URL iki kez | Tek görünür atıf; kimlik denetim ekinde |
| Word görsel kabul | Bu ortamda Word/LibreOffice render kanıtı yok | DOCX→PDF ve bütün sayfaları görsel inceleme |

Sınıf belgesinin bu tur ölçülen profili: 277 mm tablo alanı; 8,5 pt gövde; 11 ana sütun; 80 mm adres alanı. Etiketli üretim PDF'leri 28 sayfa, HTML'nin Chromium baskısı 34 sayfa; toplam 62 fiziksel sayfada taşma saptanmadı. 15 çocuk örneği her iki yolda beş sayfa; 30/40 çocukta sayfa sayıları farklıdır. Bu nedenle HTML sayfa numarası PDF'nin birebir sayfası gibi vaat edilmemeli.

Somut görsel öneri: Belge seçilirken “İletişim çizelgesi”, “Kayıt ve adres ayrıntısı”, “Her ikisi” kapsamı düşünülebilir. Seçilmeyen bölümün eksikliği açık belirtilir; tek standart çıktıdaki veri kullanıcıdan habersiz azaltılmaz. Dar ekran önizlemesi A4 kağıdını küçültürken gerçek okunabilir PDF'ye kolay geçiş sağlamalıdır.

## 25. Kaynaklar, kabul kayıtları ve kullanım notu

Yerel kaynak kökü `MaarifOS_Codex_Baslangic_Paketi/app` içindedir. Satır numarası eşzamanlı değişebilir; aşağıdaki dosya/fonksiyon adları kalıcı inceleme girişidir.

- Öğrenci: `core/domain/student.ts`, `features/students/student-spreadsheet-import.ts`, `student-import-service.ts`, `StudentImportSheet.tsx`.
- Matematik: `features/reports/student-dossier.ts`, `features/day-closure/teacher-day-closure.ts`, `features/development/development-overview.ts`, `features/planning/teacher-week-teaching-days.ts`.
- Üyelik: `features/archive/academic-year-archive.ts`, `features/today/today-data.ts`, `features/dashboard/dashboard-data.ts`.
- Derin inceleme: `docs/master-audit-2026-09-07/system-math-audit.md`, `student-profile-audit.md`, `document-audit.md`.
- Önceki entegrasyon: `docs/OGRENCI_YENIDEN_TASARIM_2026_09_07.md`, `docs/ORIENTATION_GUIDE_INTEGRATION_2026_09_07.md`.
- Güvenlik sınırı: `docs/MR-056_STUDENT_VAULT_PILOT_EVIDENCE.md`, `docs/SECURITY_AND_REAL_DATA_GATE_2026_09_01.md`.
- Ürün otoritesi: `docs/MARIF_REQUIREMENT_LEDGER.md`, `docs/MARIF_WORLD_BENCHMARK_2026.md`, `docs/PILOT_PROTOCOL.md`.
- Nihai doğrulama: `docs/MASTER_UYGULAMA_KABUL_2026_09_07.md`; test komutları, sürüm ve yerel kapsam burada sabitlenir.

Dış kaynaklar 7 Eylül 2026 tarihinde açıldı: MEB TYMM okul öncesi giriş sayfası; W3C WCAG 2.2 hedef boyutu açıklaması; NAEYC gözlem ve değerlendirme ilkeleri. Kaynak bağlantıları ilgili bölümlerdedir. Bu kaynaklar yazılımın bütününü onaylamaz; yalnız iliştirildikleri içerik veya tasarım ilkesini destekler.

**Son karar:** Önce bilginin doğruluğu ve tarihçesi, sonra aynı bilgiden üretilen belgenin okunabilirliği, ardından yeni içerik ve otomasyon genişliği. Bu sırayı uygulamak, öğretmenin daha fazla iş yapmasına değil aynı işi daha az tekrar ve daha fazla güvenle bitirmesine hizmet eder.

## 26. Son uygulama ve doğrulama sonucu

**Yerel sürüm 0.25.0 hazırdır.** Paket, release bilgisi ve service worker sürümü eşzamanlandı. Son derleme soyadı/adres ve Excel tam genişlik mizanpajını içerir. Uzak yayın yapılmadı. Önceki verilerin bulunduğu kullanıcı tarayıcı kökenine test verisi eklenmedi.

| Doğrulama | Sonuç | Anlamı |
| --- | --- | --- |
| Bütün özellik paketi | 1.030 / 1.030 | Node domain/servis regresyonu |
| Yeni mobil akışlar | 7 / 7 | Soyadı, adres, Excel ve hızlı kayıt |
| Son build offline yeni formlar | 4 / 4 | 320/390, save/reload, profil kapanışı |
| Son build offline aktarım | 3 / 3 | XLS, doğum günü, yeniden mükerrer |
| PWA üretim | 3 / 3 | 0.24→0.25, offline ve soğuk başlangıç |
| Üyelik şifreli restore | 1 / 1 | İki dönem karşı depoda aynı |
| Belge tarayıcı | 10 / 10 | Chromium ve WebKit |
| Sınıf PDF boyutu | 12 dosya / 62 sayfa | Taşan karakter0; 28 etiketli sayfa görsel |
| Derleme / tip / lint | Geçti | 77 JS parçası gzip <=180 KiB |
| Runtime / PWA sözleşmesi | 36 dosya / 10 test | Korunan runtime ve sürüm kapısı |

Alt test kümeleri toplam özellik sayısına tekrar eklenmez. Sürüm/gün sonu UI altı senaryoda doğrulandı; bir eski sürüm regex beklentisi 0.25'e güncellendikten sonra ilgili test geçti. Kök hesaplama değişiklikleri bağımsız ikinci ajan tarafından da incelendi; bu yeni difflerde P0/P1 saptanmadı.

Ek düzeltme: Profil değişiklik yapılmadan kaydedildiğinde ekranda boş kapalı pencere kalabiliyordu. Açık/kapalı profil sınırı düzeltilip pencerenin gerçekten kapanması, yeniden açılması ve sonraki öğrencinin açılması sınandı. Korunan mobil pencere bileşeni değiştirilmedi.

Yol haritasındaki yedek kapasitesi, ortak takvim modeli, tam koleksiyon kasası, fiziksel cihaz/Word/yazıcı kabulü açık kalır. Testlerin geçmesi bu önerileri uygulanmış veya bütün ürünü saha onaylı yapmaz. Ayrıntılı komut ve kanıt dizini: `docs/MASTER_UYGULAMA_KABUL_2026_09_07.md`.
