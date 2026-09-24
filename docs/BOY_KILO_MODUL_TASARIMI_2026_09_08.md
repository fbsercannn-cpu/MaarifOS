# Boy–kilo takibi: ürün ve hesap tasarımı

**Durum:** Tasarım ve kurgu verilerle çalışan etkileşimli örnek hazırlandı. Bu belge mevcut uygulamada boy/kilo kaydı varmış gibi bir uygulama veya yayın iddiası taşımaz. İnceleme tabanı MaarifOS 0.27.0'dır.

**İstek:** Eylül, aralık, mart ve haziran ölçümleri; çizelge, istatistik ve grafik. Hedef kullanıcı okul öncesi öğretmeni; amaç ölçümleri düzenli kaydetmek, eksikleri tamamlamak ve tarihli değişimi veliyle anlaşılır paylaşmaktır.

**Örnekte doğrulananlar:** Çocuk/sınıf görünümü, aynı çocuklarla hesaplanan 4,75 cm ve 1,65 kg değişim, eksik aralıkta kesilen çizgi, virgüllü giriş, boş kilo alanının ayrı tutulması, sıfır değer reddi ve boy/kilo için ayrı tarih. Açık/koyu temalar 360 ve 736 px genişlikte gözle incelendi; yatay taşma görülmedi. Kurgu örnek yalnız tarayıcı belleğinde çalışır; kalıcı kayıt, yedek ve PDF/Excel üretimi aşağıdaki uygulama kabul kapsamıdır.

## 1. Dört dönem, tek kayıt akışı

2026–2027 için dönemler **Eylül 2026, Aralık 2026, Mart 2027, Haziran 2027**. Başka yıllarda gerçek eğitim yılı başlangıç/bitiş tarihlerinden üretilir; görünen sınıf/yıl adının metni tarih kaynağı olmaz. Aynı ay birden fazla eğitim yılında tekrarlandığından anahtar tam `YYYY-MM` olmalıdır.

Önerilen erişim: **Sınıfım → Boy–kilo takibi**, çocuk profilinden aynı çocuğa açılan **Ölçümler** bağlantısı, ölçüm aylarında Bugün ekranında tek toplu hatırlatma. Alt menüye yeni ana sekme eklenmez.

| Ekran | Öğretmenin yaptığı iş |
|---|---|
| Dönem çizelgesi | Dönemi seçer, boy/kilo girer, aynı oturumda sıradaki çocuğa geçer. Önceki ölçüm yalnız karşılaştırma olarak görünür; yeni değere kopyalanmaz. |
| Çocuk görünümü | Dört dönem, iki ayrı grafik, gerçek tarihler ve seçilmiş iki dönem arasındaki değişim. |
| Sınıf özeti | Ölçülen/eksik/kapsam dışı çocuk sayıları, ayrı boy ve kilo ortalamaları, ortanca, eşleşen çocuklardaki değişim. |
| Eksik ölçümler | Boy bekleyen, kilo bekleyen, ikisi de bekleyen; doğrudan ilgili girişe açılır. |
| Çıktı hazırlama | Sınıf çizelgesi, bireysel veli belgesi veya boş ölçüm çizelgesi seçilir; gerçek PDF önizlemesi açılır. |

Durumlar: **Planlandı**, **Ölçüm bekliyor**, **Kısmen tamamlandı**, **Tamamlandı**, **Telafi ölçümü**, **Kapsam dışı**, **İnceleme bekliyor**. Gelecek mart ve haziran kayıtları bugün gecikmiş iş olarak gösterilmez.

## 2. Ölçümün kaynağı ve tarihi

Her boy/kilo alanı için ayrı değer, gerçek ölçüm tarihi ve kaynak saklanır. İkisi aynı gün ölçülürse tek eylemle aynı tarih seçilebilir; daha sonra kilo eklemek boyun eski tarihini değiştirmez.

- Boy gösterimi **cm**, kilo gösterimi **kg**; virgüllü Türkçe sayı girişi kabul edilir.
- Önerilen kalıcı hassasiyet boyda tam sayı **mm**, kiloda tam sayı **g**. `112,5 cm → 1125 mm`, `19,40 kg → 19400 g`. Değerler hesap sırasında erken yuvarlanmaz; gösterim katmanında yuvarlanır.
- Ölçülmeyen alan boştur; `null` sıfıra dönüştürülmez. Sıfır, negatif, NaN ve belirsiz sayısal yazım kayıt öncesi açıklanır.
- Kaynak: **Okulda ölçüldü / Aile bildirdi / Belgeden aktarıldı**. İsteğe bağlı ölçen kişi, kullanılan araç, koşul notu ve belgenin tarihi tutulur. Aile beyanı okul ölçümü gibi gösterilmez.
- Ölçüm dönemi ve gerçek tarih ayrı tutulur. Aralık ölçümü ocakta tamamlanırsa öğretmen açıkça **Aralık telafisi** seçer; grafikte gerçek ocak tarihi yer alır. Gelecekte yapılmış ölçüm kaydedilmez.
- Geç ölçüm döneme atanırken öğrencinin hedef dönemde ve gerçek ölçüm gününde sınıf kapsamı kontrol edilir. Martta katılan çocuğa eylül kaydı uydurulmaz.
- Tekrar ölçüm yeni olaydır; önceki kayıt korunur. Düzeltme gerekçe ve önceki kayıt kimliği taşır. Aynı çocuk/dönem/alan için geçerli sonuç açıkça seçilir; çift kayıt sessizce silinmez veya ortalanmaz.
- Beklenmedik değişim öğretmene yalnız **Ölçümü kontrol et** görevi açabilir. Değer kendiliğinden değiştirilmez; onaylanan gerçek değer istatistikten sessizce çıkarılmaz.
- Yaş, ölçüm tarihindeki tamamlanmış ay üzerinden türetilir. Doğum tarihi yoksa ölçüm alınabilir; yaş tahmin edilmez.

## 3. Paydalar ve istatistik sözleşmesi

Dönemin beklenen öğrenci kapsamı, o ay için belirlenen ölçüm penceresi ile tarihli sınıf üyeliği kesişen çocuklardan oluşur. İlk varsayılan pencere ayın tamamıdır; okul isterse somut gün aralığını değiştirir. Geçmiş dönem paydasına bugünün aktif öğrenci listesi uygulanmaz. Ayrılan çocuk geçmişte kalır, sonraki dönem iş listesine girmez. Belirsiz üyelik ayrı inceleme gösterir.

Her dönemde dört sayı ayrı gösterilir: **kapsamdaki çocuk n**, **boyu ölçülen n**, **kilosu ölçülen n**, **ikisi de tamam n**. Sadece boyu girilmiş çocuk tamamlanmış boy hesabına katılır, kilo hesabına katılmaz.

| Ölçüt | Hesap ve sınır |
|---|---|
| Boy ortalaması | Geçerli boyların toplamı / boyu ölçülen çocuk sayısı. |
| Kilo ortalaması | Geçerli kiloların toplamı / kilosu ölçülen çocuk sayısı. |
| Ortanca | Geçerli değerler sıralanır; çift sayıda ortadaki iki değerin ortalaması alınır. |
| En küçük–en büyük | Ölçülen değer aralığı; çocuğu sıralayan bir yarışma tablosuna dönüşmez. |
| Çocuğun değişimi | Sonraki gerçek değer − önceki gerçek değer; iki değer de varsa. |
| Sınıfta ortalama değişim | Her iki dönemde ölçümü bulunan aynı çocukların bireysel farklarının ortalaması. Boy ve kilo için eşleşen n ayrı. |
| Tamamlama oranı | İkisi de tamam çocuk / dönem kapsamı. Payda sıfırsa yüzde yerine “Kapsamda çocuk yok”. |
| Ölçümler arası süre | Gerçek iki tarih arasındaki gün sayısı; dönem adından otomatik 90 gün üretilmez. |

**Hesap örneği:** Kurgu A'nın eylül–haziran boy farkı 5 cm, B'nin farkı 4,5 cm ise eşleşen iki çocukta ortalama **4,75 cm**. Martta katılan C'nin haziran değeri sınıf haziran ortalamasına katılır; eylül–haziran değişimine katılmaz. Eylül sınıf ortalaması 111 cm, haziran ortalaması 117 cm olsa bile **6 cm “ortalama büyüme” değildir**; çocuk kümeleri farklıdır.

Yalnız bir noktada değişim gösterilmez; iki eksik değer üzerinden tahmin üretilmez. Kısa bir ölçüm aralığı otomatik yıllık büyüme tahminine çevrilmez. Özetin yanında kullanılan n, kaynak karışımı ve dönem kapsamı görünür.

## 4. Grafik ve mizanpaj

Çocuk için **boy ve kilo iki ayrı çizgi grafiğidir**. Dikey eksenlerde cm/kg, yatay eksende gerçek ölçüm tarihleri bulunur. Eksik noktalar sıfıra indirilmez ve eksik dönem üzerinden kesintisiz çizgi çizilmez. Boy ile kilo farklı tarihlerde ölçüldüyse her grafikte kendi tarihi kullanılır. Aynı veriler renk okumaya ihtiyaç duymayan erişilebilir dönem listesinde de görünür.

Sınıf grafiği dönem ortalamalarını gösterir; her dönemin n değeri eşlik eder. Çocuk kümesi değişebileceği ve eşleşen değişimin ayrı hesap olduğu yazılır. Sınıf ortalaması tıbbi referans çizgisi gibi kullanılmaz.

**A4 yatay sınıf çizelgesi:** Üstte okul, sınıf, eğitim yılı; dört ay grubu. Satırda sıra ve öğrenci; her ayda boy/kilo, her değer altında kendi gerçek tarihi. İsim ve dönem başlıkları sonraki sayfalarda tekrar eder; bir çocuğun satır grubu sayfa arasında bölünmez. Uzun adlarda satır yüksekliği artar, yazı okunamaz boyuta küçültülmez. Alt bilgide sayfa numarası, üretim tarihi ve **Okul Öncesi Öğretmeni** ünvanı.

**A4 dikey bireysel belge:** Çocuk ve yıl; iki grafik; dört dönem tablosu; öğretmenin seçtiği açıklama ve kaynak bilgisi. Tek çocuğun velisine yalnız o çocuğun belge kapsamı gider. Başka öğrencilerin değerleri ve özel aile notları otomatik eklenmez.

**Excel:** Birleştirilmemiş başlıklardan oluşan aktarılabilir veri sayfası ve ayrı baskı çizelgesi. Veri sayfasında çocuk anahtarı, yıl/dönem, ölçüm türü/değer/birim, gerçek tarih, kaynak ve kayıt durumu. Girişte yalnız ad üzerinden otomatik eşleştirme yapılmaz; aynı ad, yıl ve çocuk kayıtları önizlemede doğrulanır. İçe aktarım ayrı öğrenci eklemekten farklı bir akıştır.

PDF uygulamadaki gerçek önizleme motoruyla üretilir; önizlenen ve indirilen/paylaşılan dosya aynı olmalıdır.

## 5. Eğitim uygulamasının sınırı

Temel modül **ölçüm, kayıt kalitesi, tarihli değişim ve öğretmen takibi** sunar. Çocuklara boy/kilo sırası, başarı puanı veya beden etiketi verilmez. Referans eğrisi/persentil istenirse yaş, cinsiyet, ölçüm yöntemi ve seçilen kaynak sürümü ayrı doğrulanmalıdır; yetişkin eşikleri çocuklara uygulanmaz.

CDC, büyüme grafiklerinin tek başına tanı aracı olmadığını açıklar. WHO'nun çocuk büyüme standartları ile 5–19 yaş referansları farklı kaynaklardır; bu yüzden okul öncesi yaş grubuna rastgele tek referans çizgisi eklemek doğru bir uygulama sözleşmesi oluşturmaz. [CDC büyüme grafikleri](https://www.cdc.gov/growthcharts/background.htm), [WHO çocuk büyüme standartları](https://www.who.int/toolkits/child-growth-standards/standards), [WHO 5–19 yaş göstergeleri](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators). Kaynaklar 8 Eylül 2026 tarihinde incelendi.

## 6. Uygulama mimarisi ve kabul planı

Yeni ölçümler dört profil hücresinin üzerine yazılmamalı; bağımsız, sürümlü alan kayıtları olmalıdır. Kayıtlar UUID, öğrenci, sınıf, eğitim yılı, dönem, ölçüm türü, tam sayı değer/birim, gerçek tarih, UTC kayıt zamanı, kaynak, düzeltme bağlantısı ve geçerli sonuç seçimini taşımalıdır.

Önerilen yeni alan `growth-measurements`; ortak üyelik `src/core/domain/student-membership.ts`, yaş `student.ts`, yedek sözleşmesi `src/core/backup/schema.ts`, öğrenci silme `src/features/students/student-lifecycle.ts`, çıktı önizlemesi `src/features/documents/pdf-preview-model.ts` ile bütünleşir. Yeni kalıcı veri şeması, eski yedeklerin geçişi ve restore testleri aynı teslimin parçasıdır.

Uygulama aşamaları:

1. Ölçüm ve düzeltme sözleşmesi; kapsam ve istatistik fonksiyonları.
2. Şifreli kayıt, yedek/geri yükleme, arşiv ve silme bağlantıları.
3. Dönem girişi, seri giriş, çocuk grafikleri ve eksik kayıt kuyruğu.
4. Sınıf istatistiği; PDF/Excel çıktıları ve açık eşleştirmeli aktarım.
5. Mobil, çevrimdışı, veri kaybı, hesap ve basılı sayfa denetimi.

Zorunlu kabul senaryoları:

- 2026–2027 dört dönemi doğru yıllara bağlı; önceki yıl kayıtları karışmıyor.
- Boyu boş/kilosu dolu kayıt iki ayrı paydayla hesaplanıyor; sıfır/negatif girişi engelleniyor.
- Virgüllü giriş kalıcı tam sayı birime kayıpsız dönüyor.
- Geç/erken üyelik geçmiş ve gelecek ölçüm iş listesini doğru etkiliyor.
- Tekrar ölçüm/düzeltme kaynak kaydı koruyor; iki sekmedeki çakışma son yazan kazanır şeklinde veri kaybettirmiyor.
- Kilo başka tarihte tamamlanınca eski boy tarihi korunuyor.
- Dönem ortalamaları farklı kümeler olsa bile eşleşen değişim 4,75 cm örneğindeki gibi doğru.
- Gelecek dönem gecikmiş görünmüyor; telafi kaydı gerçek tarihi koruyor.
- İnternet kapalıyken kayıt/reload; yedekten ayrı depoya tam geri yükleme; öğrenci silme ve geri alma sınırları doğru.
- 320/360/390 px alanlar, grafikler ve son kayıt düğmesi erişilebilir.
- 1 ve 30 çocuklu A4 çıktıda başlık tekrarı, uzun isim, eksik ölçüm ve çok sayfa düzeni okunaklı.
- Bireysel veli belgesinde başka çocuk veya kapsam dışı özel not bulunmuyor.

## 7. Ek ürün önerileri

Mevcut özellikler tekrar yeni öneri olarak sunulmadı: temel izin işaretleri, çocukla ortak portfolyo seçimi ve eğitim yılı arşivi zaten var.

| Öncelik | Yeni veya derinleştirilecek iş | Somut değer |
|---|---|---|
| 1 | **Belgeye bağlı veli izni ve geçerlilik** | İzin amacı/etkinliği, belge sürümü, başlangıç–bitiş ve geri çekme tarihi. Portfolyo/görsel çıktısı hazırlanırken ilgili kullanım kapsamı görünür. |
| 2 | **Gezi çıkış–dönüş sayımı** | Çocuk bazında çıkış, ara kontrol ve dönüş; anlık kişi mutabakatı, sorumlu kişi ve düzeltme geçmişi. Çevrimdışı çalışır. |
| 3 | **Malzeme ve emanet defteri** | Sınıf malzemesinin miktarı, kime verildiği, iade tarihi, hasar/onarım; mevcut haftalık hazırlıkla bağlantı. |
| 4 | **Dönem sonu devir kontrolü** | Açık veli/öğretmen takipleri, teslim edilen belgeler ve materyaller, eksik işler ve tarihli devir kaydı; mevcut arşive bağlanır. |

İlk iki öneri izin ve sınıf dışı hareketlerdeki günlük belirsizliği azaltır. Boy/kilo modülüyle birlikte hepsini tek büyük formda toplamak yerine ilgili işin ekranında kısa eylemlerle sunmak önerilir.

Kalıcı tasarım dersi: Aynı çocuklara ait eşleşmiş ölçüm farkı ile değişen sınıf grubunun dönem ortalamaları farklı istatistiklerdir; arayüz ve rapor bunu görünür kılmalıdır.
