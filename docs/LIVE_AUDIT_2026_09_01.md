# MaarifOS canlı eleştiri ve düzeltme denetimi · 1 Eylül 2026

## Karar

Canlı `0.22.0` sürümü, sentetik öğretmen verisiyle temel akışları açsa da dünya
ölçeğinde bir ürün kabulü için yeterli değildi. Özellikle etkinlikten gelişim
kaydına geçişte yanlış varsayılan alan, gözlem sonrası tamamlanmayan etkinlik,
bitmiş yılda kadro yazımı, mobil yoğunluk ve pedagojik döngünün ilgisiz sayaçlarla
ilerlemesi kritik güven sorunlarıydı. Bu bulgular `0.23.0` adayında giderildi;
öğretmenin ilk görevleri kısaltıldı ve resmî TYMM kaynak kütüphanesi kapsamı
doğrulanmış kaynak makbuzuyla genişletildi. Tam kalite kapısı ve production yayını
bu kayıt hazırlanırken tamamlanmadığından sürüm hâlâ adaydır.

Gerçek çocuk verisiyle kullanım bu raporla onaylanmamıştır. Öğrenci koleksiyonu
şifreli olsa da gözlem metni, çocuk sözü, yoklama notu, medya, portfolyo ve rapor
kayıtlarının tamamı henüz cihaz içinde şifreli değildir. Bu nedenle gerçek çocuk
verili pilot `NO-GO` kalır.

## Canlı 0.22.0 bulguları ve uygulanan karşılıklar

| Öncelik | Canlı bulgu | 0.23.0 karşılığı | Kanıt durumu |
|---|---|---|---|
| P0 | Gerçek çocuk verisinin bütün yerel koleksiyonlarda at-rest korunması yok. | Sürüm notu ve ürün kabul sınırı açık tutuldu; gerçek veri pilotu kapatılmadı. | Dış güvenlik kapısı açık, `NO-GO`. |
| P1 | Etkinlikten açılan gözlem Türkçe alanını seçiyor; gerçek etkinlik Hareket ve Sağlık alanındaydı. | Doğrulanmış etkinlik alanı `observationDomainHint` olarak taşındı; exact resmî hedef varsa o daha yüksek öncelikli, bozuk/çelişkili ipucu fail-closed. | Alan, uygulama, kalıcılık ve reload testleri geçti. |
| P1 | Gözlem kaydedildikten sonra etkinlik hâlâ “Sırada” kalıyor ve bitirme eylemi yoktu. | Bugün akışına `Etkinliği tamamla` eylemi ve kalıcı `completed` durumu eklendi. | IndexedDB ve reload E2E testi geçti. |
| P1 | Alt menü ana işi saklayıp `Etkinlikler / Çıktılar` etiketlerine kaymıştı. | Beş sabit iş `Bugün / Sınıfım / Kayıt Ekle / Planlar / Belgeler` olarak geri getirildi. | Sözleşme ve yönlendirme testleri geçti. |
| P1 | Sınıf bilgileri hazır olmasına rağmen yeni eğitim yılına geçiş, ilk ekranda ikincil alanlar ve çok sayıda karar gösteriyordu. | İlk görünüm resmî dönem özeti ile tek `Yeni eğitim yılına geç` eylemine indirildi; ayrıntılı ayarlar kapalı isteğe bağlı bölümde tutuldu. | 320/390 px ilk görünüm, kaydırma ve klavye odağı senaryoları geçti; final production tekrarı bekleniyor. |
| P1 | Çocuk ekleme akışı, öğretmeni ad kaydından önce doğum tarihi, iletişim ve diğer ayrıntılara yöneltiyordu. | İlk adım yalnız ad ve `Kaydet ve kapat`; çocuk ve veli ayrıntıları kapalı `İsteğe bağlı çocuk ve veli bilgileri` bölümünde kaldı. Doğum tarihi yoksa sınıfın yaş bandı kullanılıyor. | Hızlı çocuk girişi ve 320/390 px form sözleşmeleri geçti; gerçek öğretmen süre ölçümü açık. |
| P1 | Çocuğa atanacak gelişim bilgileri sınıf satırından görünür ve anlaşılır bir eylem değildi. | Her çocuk satırında adıyla erişilebilir biçimde tanımlanan `Gelişim` eylemi gösteriliyor; 36–48, 48–60 ve 60–72 ay için yedi alanda toplam 63 puansız gözlem örneği açık kaydetmeyle bağlanıyor. | Üç yaş bandı model kapsamı ve hedefli gelişim akışı geçti; 63 seçeneğin tamamının ayrı ayrı UI tıklama matrisi açık. |
| P1 | Bitiş yılı sonrasında kadro değişikliği yapılabiliyordu. | Ekleme, düzenleme, arşivleme ve geri alma eğitim yılı durumu ile aynı transaction içinde doğrulanıyor. | Negatif durum ve yarış testleri geçti. |
| P1 | Yoklama ve dashboard gözlemi scope snapshot'ı ile yazım arasında yarış penceresi taşıyordu. | Eğitim yılı, sınıf, aktif seçim ve çocuk hedef yazımla aynı readwrite transaction içine alındı. | TOCTOU ve aktif dönem matrisi geçti. |
| P1 | Pedagojik `Yansıt / Uyarla / Sonraki plan` aşamaları genel sayaçlarla tamamlanabiliyordu. | Yalnız exact plan → etkinlik → odak çocuk gözlemi → değerlendirme → hedef plan → öğretmen kabul zinciri geçerli. | Pozitif/negatif exact-lineage testleri geçti. |
| P1 | 320 px çocuk profilinde beşinci sekme görünüm dışına taşıyordu. | Beş eşit sütun, 44 px hedef, görünür odak ve 12 px alt sınır uygulandı. | 320 px sözleşme ve erişilebilirlik testi geçti. |
| P2 | Pedagojik döngü yedi dar sütunda 8 px metinle sunuluyordu. | Ana görünüm yalnız şimdi+sıradaki aşamayı, ayrıntı yedi aşamalı dikey listeyi gösteriyor. | 320/390/430 px testi 3/3 geçti. |
| P2 | “120 uygun etkinlik” gibi pazarlama sayısı öğretmen kararını gölgeliyordu. | Sonuç dili sadeleştirildi; sayı ana karar yüzeyinden kaldırıldı. | Bileşen sözleşmeleri geçti. |
| P2 | Planlar yüzeyi aynı amaca giden kaynak, öneri ve örnek eylemlerini ayrı tıklama alanlarına bölüyordu. | Ana yüzeyde yalnız `Resmî TYMM kaynakları` eylemi bırakıldı; bağlamsal öneriler ve MEB plan örnekleri kütüphane diyaloğuna taşındı, ileri plan araçları kapalı destek bölümünde tutuldu. | Tek ana CTA sözleşmesi ile 320/390/430 px yerleşim senaryoları geçti; yayımdan sonra tekrar ölçülecek. |
| P2 | Dar ekranda kaynak diyaloğunun filtre, sonuç ve belge alanları birden fazla dikey kaydırma bölgesi oluşturuyor; belge seçimi ile kapatma sonrası odak belirsizleşiyordu. | WebKit kaydırma davranışını da güvenli tutmak için dar görünüm tek gövde kaydırıcısına indirildi. Belge seçilince başlığa, diyalog kapanınca açan düğmeye odak dönüyor. | 320/390/430 px tek-kaydırıcı ve odak dönüşü senaryoları geçti; fiziksel Safari/VoiceOver kabulü açık. |
| P2 | Resmî program bağlantısı güncel MEB adresine gitmiyordu; yaşa göre yayımlanmış örnekler görünmüyordu. | Tarihsel kaynak kimliği korunarak ayrı güncel erişim URL'si ve 3 yaş/12 örnek kaynak kataloğu eklendi. | 17/17 resmî URL canlı erişim makbuzu ve katalog testleri geçti. |

## Resmî TYMM kaynak denetimi

Kullanıcının verdiği [TYMM okul öncesi sayfası](https://tymm.meb.gov.tr/ogretim-programlari/ders/okul-oncesi) ile `tymm.meb.gov.tr` üzerindeki okul öncesi ve ortak model yüzeyleri kaynak türüne göre tarandı. Denetim 140 kaynak izini 137 tekil kanonik URL'de birleştirdi: 134 adres HTTP 200, önceden bilinen üç kılavuz PDF'si HTTP 500 verdi. Buna ek olarak 1 Eylül 2026 menü/API envanterindeki 36 resmî GET yüzeyi ve 13 katalog karşılaştırmasının tamamı eşleşti. Makbuz sonucu `PASS`; SHA-256 özeti `73e6aa2b6debcbeda17cbf09fb32e11acd1854fdb57a9481429d2f94552f495f`dir.

Başlık ve provenans denetiminde 60 resmî başlık kaydı incelendi, açık inceleme
sayısı `0` kaldı. Resmî MEB başlığı/bağlantısı ile MaarifOS'un özet, kapsam,
alan ve öneri metadata'sı ayrı alanlarda tutulur. Güncel program erişim bağlantısı
yalnız exact resmî URL, program PDF SHA-256 özeti ve `1..353` aralığında güvenli
tam sayı sayfa birlikte doğrulandığında üretilir. Geçersiz kaynak veya sayfa
girdisi fail-closed kalır; dışa aktarım ham şüpheli URL'yi taşımaz ve
`Güncel erişim: doğrulanamadı.` yazar.

| Kaynak sınıfı | Denetlenen kapsam | Uygulama karşılığı |
|---|---:|---|
| PDF | 38 toplam; 35 canlı, 3 erişilemez | Canlı PDF'ler MEB kaynağından isteğe bağlı gömülü okuyucuda açılır; aç/indir yedeği korunur. Erişilemeyen üç resmî PDF bağlantısı için belge uydurulmaz. |
| Kitap ve kılavuz | 17 | Tür, alan ve yaş filtresinde gösterilir; resmî başlık ile MaarifOS açıklaması ayrıdır. |
| Plan örneği | 12 | Üç yaş sayfasında Eylül, Aralık, Mayıs ve günlük örneğe gider; otomatik plan kurulmaz. |
| Video | 15 doğrudan okul öncesi + 11 ortak eğitim | Resmî MEB kayıt sayfasına gider; üçüncü taraf akış kaynak makbuzuna alınmaz. |
| Ortak çerçeve | 21 sayfa | İçerik çerçevesi, beceriler, eğilimler, EDE ve okuryazarlık gibi bileşenler doğrudan okul öncesi belge diye etiketlenmeden ayrı sunulur. |

Erişilebilir 35 PDF'nin toplamı 923.871.742 bayttır. Dosyalar uygulama paketine veya PWA önbelleğine kopyalanmaz. Bu nedenle belge görüntülemek ağ bağlantısı ve MEB kaynağının erişilebilir olmasını gerektirir. Temel eğitim veli kılavuzunda okul öncesi kapsamı doğrulanmadığı için öneri motorundan çıkarılmıştır. Erişilebilen beş öğretmen kılavuzunda üç yaş bandı PDF içinden doğrulanmış, MEB kartındaki `36–48 ay` yayıncı etiketi ayrıca korunmuştur. Beş PDF'nin tam bayt, SHA-256, sayfa sayısı ve ilk yaş-bandı satırlarını sabitleyen yaş kanıt makbuzu `PASS`tir; SHA-256 özeti `213066e4b8c8bab5ea08fbdd9e999750ef121ab13ed1f1a55c190fb2ffae573f`, kaynak kümesi özeti `ff0873d1f2a700bb71908c8b493f46673a32a114c55f34843ac3fbacdc576eb2`dir. Üç yaş bandındaki farklılaştırma ve öğretim materyali uçları boş olduğundan sahte kayıt eklenmemiştir.

Ayrıntılı kapsam ve sınırlar `docs/TYMM_OFFICIAL_SOURCE_INTEGRATION_2026_09_01.md`, ağ/katalog makbuzu `app/output/live-audit-2026-09-01/tymm-official-library-receipt.json`, PDF yaş-bandı metin makbuzu `app/output/live-audit-2026-09-01/tymm-teacher-guide-age-evidence-receipt.json` içindedir. Bu kaynak denetimi pedagojik bağların insan uzman onayı olduğu anlamına gelmez.

## Aday paket boyutu

Gelişim seçici ana çalışma alanından `React.lazy` ile ayrıldı ve yüklenirken
`Gelişim bilgileri hazırlanıyor…` durum metni gösteriliyor. Bu değişiklikten
sonra ana JavaScript parçası yaklaşık 180,2 KiB'den 157,9 KiB gzip düzeyine
indi; `180 KiB` bütçesi yükseltilmeden hedefli build ve bundle denetimi geçti.
Bu sonuç tam sürüm kalite kapısının tamamlandığı anlamına gelmez.

## Canlı ölçüm sınırı

`0.22.0` canlı turunda console error/warn kaydı gözlenmedi; Bugün, Planlar ve
Belgeler yüzeylerinde 320 px yatay taşma veya 44 px altı görünür ana hedef
bulunmadı. Çocuk profilindeki sekme taşması ve pedagojik döngü yoğunluğu bu
ölçümde ortaya çıktı. `0.23.0` adayında 320/390/430 px kütüphane yerleşimi,
tek dikey kaydırma bölgesi, 44 px hedefler, gerçek MEB PDF okuyucusu ve odak
dönüşü için hedefli yerel senaryolar çalıştırıldı. Tam temiz kalite koşumu,
service worker sürümü, çevrim dışı derin rota ve production yayını sonrası aynı
matris ayrıca doğrulanmalıdır; yayın kaydı daha sonra bu rapora bağlanacaktır.

## Kabul sınırları

- Otomatik test, gerçek öğretmen kullanılabilirlik testi değildir.
- Tarayıcı emülasyonu fiziksel iOS/Android, VoiceOver/TalkBack ve yüzde 200
  büyütme kabulünün yerine geçmez.
- İki bağımsız okul öncesi uzmanının bütüncül TYMM eşleme onayı yoktur; sistem
  bu onayı varmış gibi göstermez.
- “Dünyanın en iyisi” doğrulanabilir bir test sonucu değildir. Bu sürüm için
  yalnız ölçülen sentetik kapsam ve bilinen açık kapılar raporlanır.
