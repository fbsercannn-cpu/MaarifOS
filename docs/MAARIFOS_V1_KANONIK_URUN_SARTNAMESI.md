# MaarifOS Okul Öncesi — V1 Kanonik Ürün Şartnamesi

**Belge sürümü:** 1.1
**İlk karar tarihi:** 4 Ağustos 2026
**Son değişiklik:** 8 Ağustos 2026 — yalnız kurucu iç testi için iki cihazlı STAFF istisnası
**Durum:** Ürün, içerik, tasarım ve kabul testleri için bağlayıcı ana şartname
**Ürün vaadi:** MEB uyumlu, uygulamaya hazır ve eksiksiz okul öncesi plan sistemi

## 1. Belge otoritesi

Bu belge, önceki planlama belgeleriyle çelişen konularda üstündür. Uygulama kodu, mağaza ürünleri, içerik paketleri, öğretmen ve kurum akışları bu belgeye göre hizalanır. Bir özellik burada açıkça tanımlanmamışsa kullanıcı verisini, resmî programı veya satın alma hakkını genişleten bir varsayım yapılamaz.

Ürün hiçbir yerde resmî onay alınmadan “MEB onaylı” diye tanıtılmaz. Doğru ifade “MEB uyumlu”dur. “Kusursuz” gibi ölçülemeyen mutlak iddialar yerine “uzman incelemeli”, “sürümlü”, “kanıta dayalı” ve “uygulamaya hazır” ifadeleri kullanılır.

## 2. Ürün yapısı ve adlandırma

Ana ürün adı **MaarifOS Okul Öncesi**’dir. Kullanıcıya görünen temel alanlar:

- **Plan Kütüphanesi:** Yıllık, aylık, haftalık, günlük ve etkinlik planları.
- **Öğretmen Etkinlik Kütüphanesi:** Premium öğretmenlerin yayımladığı etkinlikler.
- **Kurum Yönetimi:** Müdür paneli, öğretmen görünürlüğü ve kurum arşivi.
- **Yapay Zekâya Hazırla:** Uygulama dışındaki bir yapay zekâ hizmetine güvenli aktarım ve geri alma.

Ürün iki kullanıcı biçimini destekler: öğretmen paketi ve kurum paketi. Her iki biçimde de planların ve öğretmen hesabına tanımlanan lisansın asli kullanıcısı öğretmendir.

## 3. Satılabilir paketler

Sekiz temel SKU ayrı ayrı sunulur:

| Program | 36–48 ay | 48–60 ay | 60–72 ay | Karma yaş |
|---|---|---|---|---|
| TYMM 2024 | TYMM-3648 | TYMM-4860 | TYMM-6072 | TYMM-MIXED |
| EÇE/2024 | ECE24-3648 | ECE24-4860 | ECE24-6072 | ECE24-MIXED |

Karma yaş bir yaş grubunun genişletilmiş kopyası değildir. Her plan 36–48, 48–60 ve 60–72 ay için aynı amaç etrafında üç açık uygulama dalı içerir.

### 3.1 Öğretmen fiyatları

- Tek program/yaş paketi: **1.453 TL**; karşılaştırma fiyatı **2.000 TL**.
- Sekiz paketin tamamı: **5.999 TL**; karşılaştırma fiyatı **10.000 TL**.
- Fiyatlar mağaza ekranında vergi dâhil ve açık biçimde gösterilir.
- Tam paket, sekiz SKU’nun tamamı yayın kapılarını geçmeden satışa açılmaz.

### 3.2 Kurum fiyatları

Tek paket için öğretmen başına kademeli fiyat:

| Öğretmen sayısı | Öğretmen başına fiyat |
|---:|---:|
| 1–4 | 1.453 TL |
| 5–9 | 1.299 TL |
| 10–19 | 1.149 TL |
| 20 ve üzeri | 999 TL |

Tam paket kurum alımında öğretmen başına **5.999 TL**’dir; adet indirimi uygulanmaz. Kurumun satın aldığı paketler seçilen öğretmen hesaplarına atanır. Toplu kurum alımında iade toplu işleme tabidir; tek bir öğretmenin lisansı ayrı iade edilmez.

### 3.3 Satın alma ve kodlar

- Bütün ödemeler Apple App Store veya Google Play üzerinden yapılır.
- Satın alma, iade ve abonelik/hak doğrulaması mağaza altyapısıyla yürür.
- Promosyon, kurum, pilot, destek ve benzeri amaçlardaki benzersiz kodları sistem üretir.
- Kod ilk kullanan uygun hesaba bağlanır; kapsamı, süresi ve kullanım amacı yönetim ekranında tanımlanır.
- Kod kullanımı satın alma hakkını aşan paylaşılabilir bir hesap oluşturmaz.

## 4. Deneme sürümü

Deneme, öğretmen hesabı için eğitim-öğretim yılı başına bir kez verilir.

- Süre: **72 saat**.
- Kapsam: Öğretmenin seçtiği tek paket.
- Deneme sırasında bir kez paket değiştirme hakkı.
- PDF, Word ve yapay zekâ istemi dışa aktarma kapalı.
- Gerçek çocuk verisi gerektiren tanıtım yerine sentetik örnek sınıf ve çocuklar kullanılır.
- Deneme bitince kullanıcı verisi silinmez; seçilen paket premium alınırsa düzenleme ve kullanım yeniden açılır.
- Yeni sahte hesapları cihaz takibiyle kovalamaya yönelik ayrı bir engelleme sistemi kurulmaz.

## 5. Hesap, giriş, cihaz ve kurtarma

### 5.1 Kimlik doğrulama

- Öğretmen ve kurum yetkilisi için e-posta ile telefon birlikte zorunludur.
- Google veya Apple ile giriş seçilse de telefon doğrulaması tamamlanır.
- Şifreli, şifresiz bağlantılı ve cihaz destekliyorsa parmak izi/yüz tanıma seçenekleri sunulur.
- Biyometrik veri MaarifOS sunucusuna alınmaz; işletim sisteminin güvenli doğrulaması kullanılır.

### 5.2 Tek cihaz ilkesi

Öğretmen ve kurum yetkilisi hesabı aynı anda tek cihazda etkindir. Yeni cihazda giriş yapıldığında kullanıcıya önceki cihazın lisansının devre dışı bırakılacağı açıkça sorulur. Kullanıcı onaylarsa oturum aktarılır.

Dar kurucu iç test istisnasında, grant istemcide `staff-code` olarak kalırken yalnız Lisans API'deki `FOUNDER` politikası aynı anda en fazla **iki kayıtlı cihaz** bağlayabilir. Bu iki slot yalnız ürün sahibi ile Emine Öğretmen'in gerçek telefon kabul testi içindir; üçüncü cihaz sunucuda reddedilir ve cihaz değişimi yetkili admin reseti gerektirir. İstisna `purchased`, deneme, promosyon, kurum veya diğer STAFF haklarına yayılmaz; ücretli premium için tek cihaz ilkesi, mağaza doğrulaması ve satın alma kapısı aynen korunur. Frontend özellik bayrağı, gömülü kod veya yerel sayaç lisans yetkisi sayılmaz; erişim P-256 cihaz bağı ve ES256 imzalı entitlement ile sunucuda doğrulanır. Ayrıntılı karar: [`ADR_FOUNDER_PREMIUM_TWO_DEVICE.md`](ADR_FOUNDER_PREMIUM_TWO_DEVICE.md).

### 5.3 Hesap kurtarma

- Kurtarma e-posta ve telefonun birlikte doğrulanmasıyla yapılır.
- Kullanıcı ikisine de erişemiyorsa otomatik kurtarma yapılmaz.
- Müdür değişikliklerinde kurum erişiminin sürdürülebilmesi için ilk girişte kurumsal e-posta ve telefon kullanılması hatırlatılır.

## 6. Lisans mülkiyeti ve kurum ilişkisi

- Öğretmen paketi öğretmenindir.
- Kurum satın alsa bile atanmış paket ve öğretmenin oluşturduğu kişisel planlar öğretmen hesabında kalır.
- Öğretmen kurumdan ayrıldığında kendi planlarını ve kendisine atanmış satın alma hakkını kaybetmez.
- Kurum yalnız kendi satın almasıyla ilişkilendirilmiş öğretmenin kurumla paylaşmayı onayladığı planları görür.
- Kurum satın almamışsa öğretmen planını kuruma açma özelliği yoktur.
- Kurumun onayladığı planın salt okunur, sürümlü kurum arşivi kurumda kalır; öğretmenin kişisel kopyası düzenlenebilir biçimde devam eder.
- Kurum planında düzenleme yetkisi müdürdedir. Her değişiklik kim, ne zaman, hangi sürüm bilgisiyle kaydedilir.
- Kurum panelinde tek aktif yetkili vardır; yetkili devri doğrulamalı süreçle yapılır.

## 7. Plan motoru

### 7.1 İlk kurulum

Uygulama yıllık planı varsayılan başlangıç noktası olarak açar; ancak önce öğretmene aşağıdaki bilgileri sorar:

- Program: TYMM 2024 veya EÇE/2024.
- Yaş: 36–48, 48–60, 60–72 veya karma.
- Şehir ve ilçe.
- Tam gün/yarım gün çalışma biçimi; v1 üretim modeli tam gün akışıdır.
- Haftalık/aylık çalışma tercihi.
- Ana ve destekleyici pedagojik yaklaşım tercihleri.
- Sınıfın işlevsel ihtiyaçları ve uygulanabilirlik koşulları.

Sistem uygun varsayılanları otomatik yerleştirir; öğretmen ve yetkili kurum bunları değiştirebilir.

### 7.2 Plan hiyerarşisi

Yıllık plan → aylık plan → haftalık akış → günlük tam gün akışı → etkinlik → gözlem → değerlendirme → sonraki plan ilişkisi kesintisiz tutulur. Kullanıcı bir üst katmandaki değişikliğin hangi alt planları etkilediğini önizlemeden toplu değişiklik uygulayamaz.

### 7.3 Günlük tam gün akışı

Gün akışı otomatik fakat esnektir. Temel yapı:

1. Karşılama, sağlık ve iyi oluş kontrolü.
2. Serbest seçim/öğrenme merkezleri.
3. Güne başlama ve çocukların planını görünür kılma.
4. Ana etkinlik 1.
5. Beslenme, öz bakım ve geçiş.
6. Açık hava/hareket.
7. Ana etkinlik 2.
8. Dinlenme ve sakinleşme.
9. Küçük grup veya bireysel destek.
10. Gün sonu değerlendirme ve aileye geçiş.

Her hafta iki ana etkinlik ile uygulanabilir bir alternatif içerir. Öğretmen bu üç modülü önerilen günlerinde kullanabilir veya sınıf akışına göre başka bir güne taşıyabilir; günlük plan aynı günde üç etkinliğin birden uygulanmasını zorunlu kılmaz. Rutinler, geçişler, materyal özeti, düşük maliyetli alternatif, farklılaştırma, sağlık-güvenlik ve öğretmen yansıtması otomatik olarak planın görünür parçalarıdır. Açık hava etkinliği için kapalı alan eşdeğeri sunulur.

### 7.4 Takvim

- Güncel MEB çalışma takvimi otomatik yerleşir.
- Hafta sonları varsayılan olarak kapalıdır.
- Öğretmen veya yetkili kurum resmî tarihleri değiştirebilir; sistem açık uyum uyarısı gösterir.
- Şehir/ilçe hava durumu yalnız haftalık veya günlük uygulama önerisini etkileyebilir; resmî yıllık planı sessizce değiştiremez.
- Sonradan gelen takvim ve içerik güncellemeleri öğretmen onayı olmadan mevcut planı değiştirmez.

## 8. Pedagojik yaklaşım sistemi

Her premium pakette bütün yaklaşım lensleri bulunur. Öğretmen:

- Bir ana, en fazla iki destekleyici yaklaşım seçer.
- Uygulama yoğunluğunu hafif, dengeli veya yoğun belirler.
- Yaklaşımı yıl, ay, hafta veya etkinlik düzeyinde değiştirebilir.
- Değişikliğin etkisini önizler; uygulanabilirlik sorusunu yanıtlar.

Kullanıcıya açıklayıcı Türkçe adlar gösterilir. Kaynak yaklaşım/ekol isimleri, kanıt düzeyi ve kullanım sınırları içerik editörlerinin kaynak-onay kaydında korunur. Lensler resmî program değildir; TYMM veya EÇE hedeflerini değiştiremez.

Doğa temelli, rehberli oyun, hazırlanmış çevre, araştırma-atölye, planla-uygula-değerlendir, proje, bilimsel sorgulama, erken STEM, çoklu erişim-ifade, kapsayıcı katılım, duygu-ilişki, müzik-hareket, hikâye-drama, yerel kültür-topluluk ve diğer onaylı lensler aynı kalite sözleşmesine tabidir.

## 9. Resmî program ve içerik güvenliği

- TYMM ve EÇE ayrı program profilleridir; kodları birbiriyle çevrilmez.
- Resmî öğrenme çıktısı/kazanım kodu yalnız doğrulanmış, sürümlenmiş katalogdan seçilebilir.
- Uygulama, içerik editörü veya dış yapay zekâ resmî kod oluşturamaz, değiştiremez ya da uyduramaz.
- Kaynak PDF, katalog sürümü, doğrulama tarihi ve içerik sürümü editör kaydında bulunur; kullanıcı ekranında gereksiz teknik yük oluşturmaz.
- Programla çelişen veya kanıtsız eşleme yayımlanmaz.
- İçerik editör onayı olmadan resmî premium paket yayınlanmaz.

### 9.1 Yaş sözleşmeleri

- **36–48 ay:** Kısa yönerge, büyük ve güvenli materyal, yüksek yetişkin eş düzenlemesi, nesne/işaret/hareketle ifade.
- **48–60 ay:** İki-üç adımlı süreç, artan akran iş birliği, çizim/sembol/sözle planlama.
- **60–72 ay:** Daha uzun araştırma, karşılaştırma, kanıta dayalı açıklama, çok aşamalı proje ve yansıtma.
- **Karma:** Ortak amaç ve ortam içinde üç açık dal; çocuklar yaş etiketiyle sıralanmaz veya birbirine puanla kıyaslanmaz.

## 10. Çıktı ve yazdırma

Premium öğretmen aşağıdaki kapsamları PDF ve Word olarak dışa aktarabilir:

- Yıllık, aylık, haftalık ve günlük plan.
- Seçili etkinlik veya etkinlik paketi.
- Gelişim raporu ve izin verilen gözlem özeti.
- Kurumca onaylanmış plan sürümü.

Çıktıda öğretmen/kurum başlığı, program, yaş grubu, tarih aralığı, sürüm, sayfa numarası ve oluşturulma zamanı bulunur. Kaynak çocuk bilgileri kullanıcı açıkça maskele demedikçe yetkili çıktıda aynen korunur; buna karşılık log, telemetri ve hata raporunda hassas veri bulunmaz.

## 11. Çocuk gözlemi, süreklilik ve raporlama

- Öğretmenin tek sınıfı vardır; kendi çocuklarını görür.
- Ham gözlem ile yorum ayrı alanlarda tutulur.
- Haftalık, aylık ve dönemlik süreklilik görünürdür.
- Sistem çelişkili kanıtı gizlemez; ek gözlem görevi oluşturur veya “ek gözlem gerekli” uyarısı verir.
- Gözlem yetersizse kesin gelişim sonucu yayımlanmaz.
- Sistem tanı koymaz, resmî etiket üretmez ve uzman değerlendirmesinin yerine geçmez.
- Sağlık ve işlevsel ihtiyaçlar hem öğrenci bilgilerinde hem sağlık-güvenlik bölümünde uygun yetkiyle görünür.
- Özel uyarlamalar, ham gözlem ve medya yalnız öğretmene görünür.
- Öğretmen kendi çocuğa ilişkin görünümü, sınıf ortalamasını ve diğer çocukları inceleyebilir; sıralama, puan veya rekabet tablosu oluşturulmaz.
- Müdür yalnız öğretmenin kuruma yayımladığı raporu görür.

## 12. Aile katılımı

- Bir çocuk için en fazla bir yetkili veli telefonu tanımlanır.
- Her amaç için ayrı bağlantı ve SMS doğrulama kodu gönderilir.
- Bağlantı varsayılan olarak yedi gün geçerlidir.
- Veli yalnız kendi çocuğu ve bağlantının konusu için soru yanıtlayabilir veya gelişim raporunu okuyabilir.
- Serbest sohbet, çocuklar arası görünürlük, dosya yükleme ve sınırsız erişim yoktur.
- Yanıt öğretmen inceleyene kadar veli tarafından değiştirilebilir.
- “Okudum” kaydı yeterlidir; puanlama yapılmaz.
- Dijital erişimi olmayan aileler için yanıt formu yazdırma ve öğretmenin “aile beyanı” girmesi özelliği yoktur.
- Aile katılımına yanıt verilmemesi çocuk veya veli hakkında olumsuz değerlendirme, puan veya otomatik uyarı oluşturmaz.
- Yanıtlandı/yanıtlanmadı ve oran istatistiği bulunur; bu veri yalnız süreç takibi içindir.

## 13. Uygulama dışı yapay zekâ iş akışı

MaarifOS içinde Gemini, ChatGPT veya başka bir modele API bağlantısı bulunmaz. Kullanıcı kendi yapay zekâ hesabını uygulama dışında kullanır.

### 13.1 Dışa hazırlama

Kapsam tek çocuk, seçili birden çok çocuk veya tüm sınıf olabilir. MaarifOS:

1. Kullanıcının amacını seçtirir.
2. Yalnız gerekli alanları toplar.
3. Çocuk adlarını `Çocuk-01`, `Çocuk-02` biçiminde takma adlara çevirir.
4. Fotoğraf, video, telefon, aile kimliği ve diğer doğrudan tanımlayıcıları dışarı çıkarmaz.
5. Kanıt kimlikleri, çelişki kuralları, tanı koymama ve resmî kod üretmeme sınırlarıyla yapılandırılmış istem oluşturur.
6. Çok büyük sınıf içeriğini anlamlı parçalara bölebilir.
7. Metin veya dosya olarak dışa aktarır.

### 13.2 Geri alma ve bütünleştirme

- Yanıt yapıştırma, dosya seçme veya mobil paylaşım sayfasıyla alınır.
- Sistem yapıyı, takma adları, eksik alanları, uygunsuz resmî kodları ve tanı dilini denetler.
- Ham yapay zekâ yanıtı, öğretmenin düzenlediği sürüm ve plana alınan son sürüm ayrı ayrı saklanır.
- Önizleme zorunludur; öğretmenin açık onayı olmadan plana yazılmaz.
- Tek tek, seçili çoklu veya tüm sınıf için bütünleştirme yapılabilir.
- Yapay zekâ çıktısı kaynak gözlem değildir; öğretmen değerlendirmesi olarak etiketlenir.

## 14. Öğretmen Etkinlik Kütüphanesi

- Yalnız etkinlik paylaşılır; plan, gözlem ve gelişim raporu paylaşılmaz.
- Yayınlamak premium öğretmene açıktır; satış veya ücretli içerik pazarı yoktur.
- Otomatik güvenlik ve çocuk verisi taraması başarılıysa etkinlik doğrudan yayımlanabilir.
- Durum açıkça “Editör Onaylı” veya “Henüz İncelenmedi” olarak görünür.
- Öğretmen yaş gruplarını yayın sırasında seçer.
- İçerik öğretmenin adı ve profiliyle yayımlanabilir; kaynak sahibinin bilgisi korunur.
- Başka öğretmen içeriği kendi adına açabilir ancak asıl kaynak ve uyarlama bilgisi görünür kalır.
- Yıldız ve açık yorum yoktur. Yararlı bulma, kaydetme, bildirme ve engelleme vardır.
- Yazar içeriğini kaldırabilir veya güncelleyebilir.
- Editör onaylı etkinlik değiştirildiğinde onay rozeti yeni incelemeye kadar kalkar.
- Çocuk verisi saptanan içerik yayımlanmaz.

## 15. Veri mimarisi, gizlilik ve yedekleme

### 15.1 Yerel şifreli kasa

Ham çocuk gözlemleri, özel uyarlamalar, sağlık/işlevsel ihtiyaç ayrıntıları ve medya cihazdaki şifreli kasada tutulur. Merkezi sunucuya gönderilmez.

### 15.2 Merkezi sistem

Merkezi sistem; hesap, lisans, mağaza hakkı, paket kataloğu, kurum iş akışı, etkinlik kütüphanesi ve öğretmenin açıkça yayımladığı onaylı raporları tutabilir. Medya merkezi sisteme alınmaz.

### 15.3 Yedekleme

- Google Drive veya iCloud’a kullanıcı seçimiyle şifreli yedek.
- Otomatik günlük yedek.
- Saklama: 7 günlük, 8 haftalık, 12 aylık sürüm.
- Medya yedeği isteğe bağlıdır.
- Manuel korumalı yedek oluşturulabilir.
- Geri yüklemeden önce içerik, tarih ve çakışma önizlemesi gösterilir.
- Kullanıcı hangi yedeğe döneceğine karar verir.

Geçici aile paylaşımı süresi dolunca silinir. Silinme denetim kaydı, çocuk içeriği olmadan saklanabilir.

## 16. Bildirim, erişilebilirlik ve güvenli kullanım

- Kilit ekranında çocuk adı, sağlık bilgisi veya gözlem metni görünmez.
- Sessiz saatler vardır.
- Push bildirimleri izinli/isteğe bağlıdır.
- Pazarlama bildirimi varsayılan olarak kapalıdır.
- Yazı büyütme, ekran okuyucu etiketleri, renk dışı durum göstergeleri, yeterli kontrast ve klavye erişimi zorunludur.
- Acil sağlık-güvenlik bilgisi planlama ekranında açık görünür; gereksiz kullanıcı rollerinden gizlenir.

## 17. Pilot ve yayın kapıları

### 17.1 Kapalı pilot

- İlk pilot: TYMM 2024’ün dört yaş paketi birlikte.
- En az 12 öğretmen ve 2 kurum.
- Farklı şehir/ilçe ve kurum koşulları.
- En az dört okul haftası.
- TestFlight ve Google Play kapalı test kanalları.

Kritik çocuk verisi, gizlilik, program eşleme, lisans veya satın alma kusuru yayın engelidir. EÇE/2024 aynı kapıları TYMM pilotundan sonra geçer.

### 17.2 V1 yayın kapsamı

Halka açık v1 için zorunlu kapsam:

- Sekiz SKU ve tam paket.
- Öğretmen ile kurum satın alma akışları.
- PDF ve Word çıktıları.
- Aile bağlantıları ve yanıt istatistiği.
- Yapay Zekâya Hazırla dışa/geri alma akışı.
- Öğretmen Etkinlik Kütüphanesi.
- Yedekleme, geri yükleme ve tek cihaz yönetimi.

Sağlıksız bir içerik paketi veya özellik uzaktan kapatılabilir. Uzaktan kapatma kullanıcı verisini, sağlıklı satın alınmış içeriği ve daha önce oluşturulmuş planları silmez.

## 18. Kabul ölçütleri

V1 tamamlanmış sayılabilmesi için:

1. Her SKU kendi program ve yaş sözleşmesiyle yayın kapısını geçer.
2. Resmî kodlar doğrulanmış katalog dışında üretilemez.
3. Denemede hiçbir gerçek PDF/Word veya yapay zekâ istemi dışa aktarılamaz.
4. Öğretmen kurumdan ayrılsa da satın alma hakkı ve kişisel planları korunur.
5. Kurum arşivindeki onaylı sürüm değiştirilemez; yeni sürüm olarak ilerler.
6. Dış yapay zekâ aktarımında doğrudan tanımlayıcı veya medya bulunmaz.
7. Veli yalnız tek çocuk ve tek amaç kapsamını görebilir.
8. Aile yanıt vermediğinde olumsuz değerlendirme doğmaz; yalnız istatistik güncellenir.
9. Ham gözlem ve yorum birbirine karışmaz.
10. PDF/Word çıktısı görsel ve içerik bütünlüğü testinden geçer.
11. Satın alma, iade, geri yükleme, cihaz aktarma ve çevrimdışı kullanım kapalı testte doğrulanır.
12. Erişilebilirlik ve gizlilik kontrolleri kritik hata olmadan tamamlanır.

## 19. Normatif kaynaklar

- [MEB — Türkiye Yüzyılı Maarif Modeli Okul Öncesi Eğitim Programı](https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf)
- [MEB — 2026–2027 eğitim öğretim yılı takvimi](https://meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr)
- [Apple — App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play — User Generated Content Policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [KVKK — Kişisel Verileri Koruma Kurumu](https://www.kvkk.gov.tr/)
