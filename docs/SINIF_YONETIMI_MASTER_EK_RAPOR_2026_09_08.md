# MaarifOS — ölçüm ve sınıf yönetimi genişletmesi

Tarih: 8 Eylül 2026. Tamamlanan yerel sürüm: 0.28.0 — VERIFIED_LOCAL; yedek veri şeması: 10. Canlı sürümün ayrı kaydı: 0.27.0 / Sites 35. Bu belge yeni yayın makbuzu değildir. Gereksinim kimlikleri MR-097–MR-108.

## Uygulamanın ortak mantığı

Yeni on araç aynı sınıf, eğitim yılı ve öğrenci kimliğini kullanır. Öğretmen yeni bir çocuk listesi tutmaz. Bugün ve Sınıfım içindeki Sınıf yönetimi alanı ölçüm, izin, gezi, malzeme, devir, randevu, merkez, rutin kartları, iletişim tercihleri ve okul şablonunu açar. Mevcut beş ana gezinme alanı korunur. Çocuk profilinden boy–kilo ve izinlere doğrudan geçilir.

Kayıt, düzeltme ve kontrol ayrı tarihli olaylardır. Bir hatayı düzeltmek eski dayanağı silmez. Aynı anda iki ekranda yapılan işlemlerde eski defter başına dayanarak stok tüketme veya aynı sayımı fark edilmeden değiştirme engellenir. Başarısız yazma işleminde yarım kayıt kullanıcıya başarı olarak gösterilmez.

Veri şeması 10 eski yedekleri geçerli göç zinciriyle kabul eder. Yeni kayıtlar mevcut yerel şifreli kasanın kapsamındadır. Çocuk kalıcı kaldırılırken kendisine bağlı ölçüm ve izin olayları temizlenir; başka çocukların gezi sayımı ve sınıfın malzeme miktarı korunur. Bir emanetten kişi kimliğinin kaldırılması emanetin iade edilmiş sayılması anlamına gelmez. Aktif gezide dönüşü doğrulanmamış çocuğun silinmesi sayım açığını gizleyemez.

## 1. Boy–kilo: matematik ve yorum

Eylül, aralık, mart ve haziran dönemleri eğitim yılının gerçek tarihleriyle oluşturulur. Boy ve kilo aynı gün ölçülmemiş olabilir; her değerin kendi tarihi ve kaynağı vardır. Boy tam sayı milimetre, kilo tam sayı gram olarak saklanır; ekranda cm ve kg görünür. Virgüllü Türkçe giriş desteklenir. Boş hücre sıfır değildir.

Her alan için ölçülen çocuk sayısı, ortalama ve medyan ayrı hesaplanır. Boyu bulunan ama kilosu bulunmayan çocuk yalnız boy paydasına katılır. Başlangıç ve son dönem farkı yalnız iki dönemde de geçerli ölçümü bulunan aynı çocuklarla hesaplanır. Örneğin sınıfa martta katılan çocuk haziran sınıf ortalamasına girebilir; eylül–haziran boy artışı hesabına eylül ölçümü varmış gibi alınamaz. Sınıf ortalamalarının farkı çocukların ortalama büyümesi diye sunulmaz.

Tek çocuğun ölçümleri çizgi grafikte gösterilir; eksik dönemler uydurma ölçümle doldurulmaz. Çocukların boy ve kilolarına göre başarı sıralaması, tanı, yetişkin BKİ sınıflaması veya otomatik sağlık hükmü üretilmez. Bu ekran öğretmenin ölçüm defteridir. Ayrıntılı alan, düzeltme ve Excel tasarımı `BOY_KILO_MODUL_TASARIMI_2026_09_08.md` içindedir.

## 2. İzin: belgenin sürümü belirleyicidir

Belge; amaç, sürüm, geçerlilik aralığı, metin ve gerekiyorsa belirli etkinlik ile kaydedilir. Veli kararı bu belgeye bağlanır. Yeni belge sürümü eski imzayı kendiliğinden yeni metne taşımaz. Geri çekme ve süre bitimi, sonraki kullanımın kararına etki eder. İmzalayan/kaynak alanları öğretmen kaydıdır; uygulama imzanın hukuken veya kriptografik olarak doğrulandığını iddia etmez.

Eski profil izin işaretleri korunur. Yeni belge sistemi kullanılmışsa portfolyo dosyası güncel belge kararını denetler. Fotoğraf ve portfolyo durumları çocuk profilinde görünür. Gezi başlangıcı tam olarak o gezi planına bağlı izin belgesini ister; başka etkinliğin izni yeterli olmaz.

## 3. Gezi: yoklamadan farklı gerçek sayım

Gezi planında tarih, yer, sorumlu, seçilen çocuklar ve izin belgesi vardır. Başlangıçta tarihli sınıf üyeliği ve güncel belge kararı birlikte doğrulanır; katılımcı listesi sabitlenir. Çıkış, ara kontrol ve dönüşte görülen/görülmeyen çocuk gerçek kontrol saatiyle işaretlenir. Henüz sayılmamış çocuk devamsız sayılmaz. Dönüş eksikse tamamlanma engellenir. Düzeltme, iptal ve gerekçeli yeniden açma geçmişi saklanır.

## 4. Malzeme: miktarların korunumu

Her malzemenin birimi vardır. Kitap, adet, paket, kutu, set veya rulo farklı stok birimleridir; farklı birimler tek “toplam malzeme” sayısına eklenmez. Her malzeme için denklem:

`Toplam = Kullanılabilir + Emanette + Hasarlı`

Stok ekleme toplamı artırır; tüketim azaltır. Emanet verme kullanılabilir miktarı emanete taşır. İade, ilgili açık emanete bağlıdır ve kısmi olabilir. Hasarlıya ayırma ve onarım toplamı değiştirmez. Negatif stok, açık miktardan fazla iade, ikinci kez aynı geri alma ve geçersiz kaynak engellenir.

Hareket haftalık hazırlık listesinin gerçek kaynağına bağlanabilir. Kaynak plan veya etkinlik değişmişse eski hazırlığa yeni tüketim bağlanmadan önce hazırlığın güncellenmesi gerekir. Geri alınan hareket silinmez; gerekçesi görünür. Bağlı iade veya sonraki tüketim nedeniyle geri alma stok denklemini bozacaksa işlem reddedilir.

## 5. Devir: kontrol ile işin bitmesi ayrı kayıtlardır

Devir listesi açık veli/uyum/eğitim takiplerini, haftalık hazırlıkları ve açık emanetleri toplar. Anahtar, basılı dosya, yedek teslimi gibi maddeler elle eklenebilir. Teslim alacak kişi ve hedef tarih kaydedilir.

Bir kontrol maddesinin işaretlenmesi kaynak veli görüşmesini veya emaneti kapatmaz; bu işin devralan kişiyle gözden geçirildiğini gösterir. Yeni açık işler listeye eklenmeden, eksik kontroller tamamlanmadan ve kontrol sonrası değişen dayanaklar yeniden incelenmeden devir kapatılamaz. Tamamlanan devir gerekçeyle yeniden açılabilir. Tutanağın imza alanı basılı kullanım içindir.

## Belge ve mobil mizanpaj

Mobil girişlerde dikey alanlar ve en az 44 piksel eylemler kullanılır. Sayım ve ölçümde günlük işlem önce; geçmiş ve düzeltme ayrıntısı açılır bölümlerdedir. Uzun malzeme adları ve devir maddeleri hücre içinde satırlara bölünür. Basılı tabloda sütun başlıkları ve bağlam sonraki sayfada korunur. PDF önizlemesi gerçek dosyadan çizilir; indirilen dosya aynı belgeyi taşır. Öğretmen ünvanı Okul Öncesi Öğretmeni olarak yazılır.

Belge alan seçimi çıktının kapsamını belirler; seçilen isimler veya iletişim alanları kendiliğinden yıldızlanmaz/kısaltılmaz. Sadece stok seçilmiş belgeye açık emanetlerin kişi adları eklenmez. Devir tutanağında çocuk adları ve özel notlar ayrı kapsam seçimidir.

## Ek talimatla uygulama kapsamına alınan beş öneri

Kullanıcı 8 Eylül 2026'da bu beş önerinin de yapılmasını istedi. MR-103–MR-107 ile uygulama ve kabul kapsamına alındı. Aşağıdaki tablo iş tasarımını, son kabul raporu ise gerçekten tamamlanan doğrulamaları gösterir. Öncelik sırası ürün önerisidir; ölçülmüş etki veya resmî zorunluluk iddiası değildir.

| Öncelik | Öneri | Öğretmenin somut işi | Kabul ölçütü |
|---|---|---|---|
| 1 | Veli görüşme randevu planlayıcısı | Uygun saat aralıkları aç; çakışmasız randevu seç; değişiklik/iptal geçmişi tut; gerçekleşen randevuyu mevcut veli görüşmesi kaydına bağla. | Aynı öğretmene çakışan saat kaydı yok; tatil/okul kapanışı görünür; başka velinin adı ortak çizelgeye sızmaz; ileti metni yalnız öğretmen paylaşınca gönderilir. |
| 2 | Öğrenme merkezi ve materyal rotasyonu | Blok, sanat, kitap vb. merkezlere bu hafta hangi malzemenin konduğunu gör; çocuk ilgisine ilişkin öğretmen notundan sonraki hafta değişiklik kararı ver. | Mevcut malzeme stokuna bağlanır; aynı set iki yerde kullanılabilir gösterilmez; çocuk sıralaması yerine ortam düzenleme kararı üretir; geçmiş haftaya dönülebilir. |
| 3 | Düzenlenebilir görsel günlük rutin kartları | Günün gerçek akışından “karşılama, oyun, beslenme, açık hava, toparlanma” kartları üret; büyük simge ve kısa Türkçe metinle A4/A5 çıktı al. | Sıra öğretmenin planından gelir; öğretmen değiştirebilir; kısa/uzun gün düzeni ayrıdır; baskıda kesim payı ve büyük okunur yazı doğrulanır; internet olmadan açılır. |
| 4 | Aile iletişim ve erişim tercihleri | Tercih edilen iletişim kanalı/saatini, aile dilini ve metin-ses-büyük yazı gereksinimini isteğe bağlı kaydet; veli belgesini bu seçime göre hazırlamayı kolaylaştır. | Tercih açık veli bildirimine dayanır; dil veya telefon üzerinden varsayılmaz; ayrı yaşayan velilerin tercihleri ayrı tutulur; otomatik çevrinin doğruluğu garanti edilmez. |
| 5 | Okula özgü çıktı şablonları | Okul logosu, üst başlık, imza yerleşimi ve kâğıt yönünü bir kez düzenle; sınıf listesi, ölçüm ve devir belgelerinde aynı kurumsal görünümü kullan. | Alanlar güvenli hazır yerleşimlerle düzenlenir; uzun ad/adres ve son sayfa imzası için taşma kontrolü yapılır; seçilen sütunlarda kaynak bilgi korunur; şablon değişikliği öğrenci verisini değiştirmez. |

İlk iki öneriye verilen öncelik mevcut ürün akışlarından çıkarılmıştır. Aileyle karşılıklı iş birliği, çocuğun ev dilini ve aile bağlamını dikkate alma ve öğrenme ortamını bilinçli düzenleme yaklaşımı NAEYC'nin [aile ortaklığı](https://www.naeyc.org/node/3810) ve [öğrenen topluluğu](https://www.naeyc.org/resources/position-statements/dap/creating-community) ilkeleriyle uyumludur. Bu kaynaklar yazılım modülü veya Türkiye mevzuatı tanımlamaz.

## Ek sınıf listesi kararı

MR-108, masaüstündeki özgün `VELİ İLETİŞİM BİLGİLERİ 2025.xls` dosyasının başlık/sütun/iletişim gruplarını örnek alır. Belge satırı anne, baba, ayrı telefonlar, üçüncü kişi ve tam ev adresi için yeterli alan sağlamalıdır. Kaynak dosya değiştirilmez; gerçek çocuk bilgileri test veya yayımlanan uygulama içeriğine taşınmaz.

Yatay iletişim tablosunun uygulanan düzeni 13 sütun ve dört üst gruptur. Grup başlıkları her sayfada tekrarlanır. Çocuğun bütün ek yakınları aynı çocuk bağlamında gösterilir; tam adres ile ek kayıt bilgileri çocuğun son iletişim satırını izleyen geniş bantta yer alır. Dikey kâğıt seçimi dar 13 sütuna sıkıştırılmaz: yakınlar geniş öğrenci/yakın satırlarına dönüşür. Boy–kilo belgesi de dikeyde çocuk başına dört dönem satırı, yatayda dönemleri yan yana gösterir. Her iki düzende ayrı ölçüm tarihleri ve eksik değerler korunur.

Kullanıcının açık biçim isteği ad/soyadın her sözcüğünde Türkçe ilk harf büyük, kalan harfler küçük gösterimdir. Kayıtlı özgün değer ayrı kalır. İnsan metni NFC ve `tr-TR` ile ele alınır; telefon, makine kimliği, kısaltma ve numara bu dönüşümün dışında kalır. Türkçe I/ı ve İ/i çiftleri birbirine karıştırılmaz. Adres özel adlarında mahalle, cadde ve sokak sözcüklerinin yazımı, bağlaçlar ve kısaltmalar bağlama göre ele alınır. Kaynaklar 8 Eylül 2026'da doğrulanan TDK [büyük harf kuralları](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/), [kısaltmalar](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) ve [noktalama kurallarıdır](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/). Mekanik harf dönüşümü resmî TDK onayı anlamına gelmez.

## Merkez ile stok arasındaki işlem bağı

Merkez düzeni kaydedildiğinde her malzeme için gerçek emanet hareketi ve merkez kaydı aynı veritabanı işleminde yazılır. Yetersiz stok veya disk hatasında paketin hiçbir parçası yazılmaz. Malzeme fiilen ayrıldığı anda kullanılabilir miktardan çıkar; gelecekte başlayacak merkez düzeni de şimdiden bu miktarı ayırır ve ekran bunu açıkça belirtir. Bitiş tarihinde otomatik iade yapılmaz. Öğretmen düzeni kapattığında yalnız kalan miktar aynı atomik işlemde iade edilir. Kısmi iade korunur; kapanmış merkezin iadesinin geri alınarak açık emanet yaratılması engellenir. Sonraki haftaya kopyalama yeni bir taslak oluşturur ve eski gözlem/karar geçmişini değiştirmez.

## Doğrulama kaydı

Son test sonuçları ve kısıtlar `SINIF_YONETIMI_KABUL_2026_09_08.md` dosyasında, ham çalıştırma çıktıları `app/output/new-workflows-2026-09-08/` altında tutulur. Kabul raporu tamamlanmadan bu tasarım belgesi tek başına test geçti kanıtı değildir.
