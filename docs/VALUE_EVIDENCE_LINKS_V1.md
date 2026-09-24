# Öğretmen Onaylı Değer Kanıtı Bağları · V1

> **Durum (7 Ağustos 2026):** Teknik iç pilot sözleşmesi. Değer eşlemeleri
> `machine_validated_pending_human_review` durumundadır; altı rollü insan
> incelemesi tamamlanmadan yayımlanmış veya pedagojik olarak onaylanmış sayılmaz.

## 1. Amaç

`valueEvidenceLinks`, tek bir değişmez ham gözlem ile uygulanmış etkinliğin
resmî TYMM değer eylemlerinden biri arasında öğretmenin açıkça kurduğu, kaynaklı
ve düzeltilebilir ilişkidir. Bu kayıt:

- çocuğa değer puanı, seviye, rozet veya başarı hükmü vermez,
- tek olaydan karakter ya da kalıcı kişilik sonucu çıkarmaz,
- inanç, mezhep, ibadet veya ritüel katılımını değer kanıtı yapmaz,
- ham gözlemi değiştirmez ve otomatik olarak oluşturulmaz,
- öğretmenin gerekçesini ham çocuk sözüymüş gibi göstermez.

Temel ayrım şudur:

```text
değişmez ham gözlem
  → öğretmenin isteğe bağlı ve açık seçimi
  → uygulanmış etkinlik snapshot'ındaki resmî değer eylemi
  → öğretmen gerekçesi
  → tarihli, sürümlü ve düzeltme geçmişi korunan bağlantı
```

Kanıt bulunmaması, değerin çocukta bulunmadığı anlamına gelmez.

## 2. Anayasal karar çekirdeği

Her bağlantı Saygı (`D14`) – Sorumluluk (`D16`) – Adalet (`D1`) karar
çekirdeğine ve [`DEGERLER_PEDAGOJISI_ANAYASASI.md`](./DEGERLER_PEDAGOJISI_ANAYASASI.md)
hükümlerine tabidir. Kayıt dili olay ve gözlenebilir eylem düzeyinde kalır.

Kabul edilen üç ilişki rolü:

| Teknik rol | Öğretmen dili | Anlamı |
|---|---|---|
| `supports` | Uyumlu olay örneği | Gözlenen somut eylem seçili göstergeyle uyumludur. |
| `contrasts` | Ayrışan/karşı olay örneği | Olay seçili göstergeyle gerilim veya ayrışma gösterir; çocuğa ahlaki etiket konmaz. |
| `context_only` | Yalnız bağlam | Kültürel veya ilişkisel bağlam kaydedilir; değer başarısı iddiası kurulmaz. |

Türk-İslam kültürüne ait anlatılar, mekânlar, sanat, dayanışma ve nezaket
örnekleri saygılı kültürel bağlam olarak yer alabilir. Çocuğun veya ailesinin
Müslüman olması, başka bir inanca mensup olması, dua/namaz/oruç/ibadet
katılımı ya da katılmaması `supports` veya `contrasts` kanıtı değildir.
Başkasının din ve vicdan özgürlüğüne alan açan gözlenebilir davranış ise kendi
inancını puanlamadan ele alınabilir.

## 3. Yetkili kaynak zinciri

Bağlantı hedefi ekrandaki güncel içerik paketinden veya serbest öğretmen
metninden alınmaz. Tek otorite, gözlemin bağlı olduğu etkinlik kaydındaki:

```text
activity.appliedActivityTemplateSnapshot.valuesDesign
```

alanıdır. Bu alan günlük plan, etkinlik, aylık/haftalık kaynak plan ve kanonik
premium v3 paket snapshot'larıyla tam eşleşir. Bağlantı tüm `valuesDesign`
nesnesini ikinci kez kopyalamaz; yalnız şu kimlik ve parmak izi kapsülünü taşır:

- paket kimliği, sürümü, yayın kimliği ve manifest SHA-256 özeti,
- uygulanmış etkinlik şablonu kimliği,
- `valuesDesign` kimliği, sürümü ve kanonik SHA-256 özeti,
- seçilen TYMM değer kodu ve resmî Ek-14 gösterge kodu.

Gösterge, uygulanmış snapshot içindeki aynı değer kodlu tam resmî eylem
snapshot'ıyla eşleşmek zorundadır. Paket adı, MEB kaynak URL'si, kontrol tarihi,
yaş profili ve değer eşleme durumu da Eylül v3 kanonik başlığına tam sabitlenir.

Uygulanmış snapshot içindeki `primaryLensId` ve `supportingLensIds`, yazarlı
etkinlik şablonunun değişmez authored lens bilgisidir. Öğretmen planındaki
`teacherPreferredLensId`, `teacherPreferredSupportingLensIds` ve
`lensSelectionMode: preference_only` yalnız tercihi kaydeder; etkinliğin bu
yöntemle uygulandığını veya herhangi bir Montessori/Orman Okulu yeterliği ya da
sertifikası bulunduğunu kanıtlamaz. Eski plan `primaryLensId`/
`supportingLensIds` alanları yalnız legacy uyumluluk için okunur; yeni plan
kaydına yazılmaz.

## 4. Oluşturma koşulları

Bir bağlantı ancak aşağıdaki koşulların tamamında oluşturulur:

1. Gözlem `rawTextImmutable: true` taşır.
2. Gözlem tam olarak bir çocuğa aittir; grup gözlemi bireysel kanıt yapılamaz.
3. Gözlem, günlük plan ve etkinlik aynı eğitim yılı/sınıf kapsamındadır.
4. Etkinlik kanonik premium v3 kaynak ve uygulanmış snapshot zincirine sahiptir.
5. Hedef, uygulanmış `valuesDesign` içindeki resmî eylemlerden seçilmiştir.
6. Rol ve gerekçe öğretmen tarafından ayrıca seçilip yazılmıştır.
7. Açık öğretmen onayı verilmiştir; form açılması veya haftalık seçim yeterli değildir.
8. Aynı gözlem–değer–gösterge için ikinci etkin bağlantı yoktur.

Onaylayan aktör bir hesap kullanıcısı olarak sunulmaz. Cihazdaki ayrılmış,
tekil `local-teacher-identity` ayarı kullanılır. Bu kimlik yalnız yerel
provenans aktörüdür; yetki, diploma veya gerçek kişi hesabı beyanı değildir.

## 5. Gerekçe güvenlik kapısı

Öğretmen gerekçesi kırpılmış NFC Unicode biçiminde ve en fazla sözleşmedeki
uzunlukta olmalıdır. Aşağıdaki içerikler yazma ve geri yükleme öncesinde
fail-closed reddedilir:

- sayı, yazıyla sayı, yüzde, kesir, yıldız, harf notu veya “X üzerinden Y” ile
  değer ölçme,
- rozet, sıra, seviye, ustalık, “kazandı/başardı” gibi kesinleştirme,
- “iyi/kötü/bencil/örnek/mükemmel karakter” türü kalıcı kişilik hükmü,
- `supports`/`contrasts` rolünde kişisel inanç, ibadet veya dinî kimlik kanıtı,
- zorlama, ceza, utandırma, mahremiyet ihlali veya çocuğun hakkını azaltan dil,
- zero-width, bidi override/isolate, BOM ve başka görünmez kontrol/format
  karakterleriyle güvenlik taramasını parçalama girişimi.

Gerekçe, ham gözlem metninin aynısı olamaz. Ham kayıt ile öğretmen yorumu ayrı
kalır.

## 6. Düzeltme ve kaldırma

Kayıt fiziksel olarak güncellenip geçmişi kaybettirmez.

- **Düzeltme:** Hedef değer ve gösterge sabit kalır; öğretmen rolü veya
  gerekçeyi değiştirir. Eski kayıt aynı onay zamanında tombstone edilir, yeni
  kayıt `supersedesLinkId` ile eski kayda bağlanır.
- **Yanlış hedef:** Etkin bağ kaldırılır, ardından doğru hedefle yeni bağımsız
  bağlantı kurulur.
- **Kaldırma:** Fiziksel silme değildir. `deletedAt` ve `updatedAt` aynı UTC
  zamanda işaretlenir; kimlik, gerekçe ve provenans korunur.

Bir predecessor üzerinde ikinci düzeltme dalı, döngü, kendini supersede etme,
no-op düzeltme ve mevcut successor varken yeniden düzeltme/kaldırma reddedilir.
Readonly preimage ile readwrite yeniden okuma arasında değişiklik olursa hiçbir
yazma yapılmaz.

## 7. Depolama, yedek ve mahremiyet

- IndexedDB veri sürümü `v5`tir.
- `valueEvidenceLinks` ayrı koleksiyondur; gözleme, öğrenciye, etkinliğe,
  eğitim yılı+sınıfa ve aktif hedef anahtarına göre beş non-unique indeks taşır.
- V1–V4 yedekleri V5'e boş değer kanıtı koleksiyonuyla yükseltilir.
- Replace ve merge restore, kayıt biçimini, tam kaynak zincirini, digest'i,
  tek-çocuk sınırını, aktör kimliğini, düzeltme grafını ve öğrenci dosyası
  kapsamını yazmadan önce doğrular.
- Yeni öğrenci dosyası, oluşturulduğu anda etkin ve aynı çocuğa ait bağlantı
  kimliklerini provenans olarak taşır; değer gerekçesini veya puan benzeri bir
  metni rapora otomatik eklemez. Bağlantı daha sonra düzeltilir ya da tombstone
  edilirse eski dosya o tarihsel kimliği sessizce yeniden yazmaz; yedek doğrulaması
  bağlantının dosya oluşturulduğu anda canlı olduğunu zaman çizelgesinden kanıtlar.
- Arşivlenmiş öğrenci kalıcı silindiğinde ona ait değer bağlantıları da silinir.
  Recovery snapshot kaydı güncel veri preimage'ıyla aynı IndexedDB işleminde
  eşleşmek zorundadır; başarılı silme sonrasında öğrenci verisi taşıyan recovery
  snapshot'ları temizlenir. Başarısız silme recovery verisi kaybettirmez.

## 8. Öğretmen arayüzü kabul sözleşmesi

Arayüz premium haftalık incelemedeki tek-çocuklu değişmez gözlemden isteğe bağlı
açılır. Legacy program bağlantısı veya dört düzeyli öğretmen değerlendirme
ekranıyla birleştirilmez.

İlk açılışta:

- hedef seçili değildir,
- rol seçili değildir,
- gerekçe boştur,
- açık onay işaretli değildir,
- kayıt düğmesi pasiftir.

Ekranda sürekli şu sınır görünür: tek tarihli gözlem puan, değer düzeyi,
karakter veya inanç hükmü değildir. İnsan uzman incelemesi bekleyen iç pilot
eşlemesi “onaylı içerik” diye gösterilemez. Kaldırma işlemi ikinci bir açık
onay ister ve geçmişin korunduğunu söyler.

## 9. Yayın kapısı

Teknik codec ve testlerin geçmesi pedagojik yayın onayı değildir. Eylül v3
eşlemeleri için şu altı rolün insan incelemesi zorunludur:

1. erken çocukluk eğitimi (`early-childhood-education`),
2. okul öncesi uygulayıcı öğretmen (`practicing-preschool-teacher`),
3. çocuk hakları ve koruma (`child-rights-and-safeguarding`),
4. TYMM program uzmanlığı (`tymm-curriculum`),
5. içerik ve Türkçe dil editörü (`content-and-language-editor`),
6. Türk-İslam kültürü/ilahiyat ve çoğulculuk sınırı (`turkish-islamic-culture-and-theology`).

Bu incelemeler ile sınırlı kurgu/pilot kabulü tamamlanmadan özellik üretimde
açılmaz, satış vaadine dönüşmez ve çocuk hakkında otomatik sonuç üretmez.
