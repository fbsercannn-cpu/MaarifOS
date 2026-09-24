# MaarifOS Premium Plan Merkezi — Ürün ve Ticari Ana Tasarım

> **Kanonik durum notu (4 Ağustos 2026):** Bu belge tarihsel tasarım girdisidir. Adlandırma, fiyat, deneme, cihaz, öğretmen mülkiyeti, kurum, aile ve haricî yapay zekâ kararlarında [`MAARIFOS_V1_KANONIK_URUN_SARTNAMESI.md`](./MAARIFOS_V1_KANONIK_URUN_SARTNAMESI.md) üstündür. Kullanıcıya görünen alan adı “Plan Kütüphanesi”dir.

**Belge durumu:** Tarihsel ürün tasarım girdisi, sürüm 1.0
**İlk hedef eğitim yılı:** 2026–2027
**Kapsam:** TYMM 2024 ve MEB 2024 Okul Öncesi Eğitim Programı (EÇE/2024), dört yaş profili, 3 günlük deneme, benzersiz kodla erişim, çevrimdışı kullanım

## 1. Nihai ürün kararı

MaarifOS içinde yeni ana alanın adı **Premium Plan Merkezi** olacaktır. Kullanıcı önce resmî programı, ardından yaş profilini ve pedagojik plan lensini seçer. Satılan temel birim “program” değil, yanlış anlaşılmayı önlemek için **paket** olarak adlandırılır:

`1 paket = 1 resmî program × 1 yaş profili × o profile uygun tüm pedagojik lensler`

İki program ile dört yaş profili sekiz temel paket üretir. **Tam Paket**, sekiz paketin tamamını açar. Orman, proje, atölye veya hazırlanmış çevre gibi pedagojik yaklaşımlar ayrı resmî program gibi sunulmaz; satın alınan paketin içinde seçilebilen, resmî program eşlemesini değiştirmeyen **plan lensleridir**.

Bu seçim runtime'da yalnız öğretmen yaklaşım tercihi olarak saklanır:
`teacherPreferredLensId`, en fazla iki
`teacherPreferredSupportingLensIds` ve
`lensSelectionMode: preference_only`. Etkinlik şablonunun yazara ait
`primaryLensId`/`supportingLensIds` snapshot'ı değiştirilmez. Doğrulanmış bir
uygulama overlay'i bulunmadan tercih; Montessori, Orman Okulu veya başka bir
yaklaşımın uygulanmış olduğunu, uygulayıcı yeterliğini, tanınmayı ya da
sertifikayı kanıtlamaz. Eski plan lens alanları yalnız legacy okumadır.
Tercih panosundaki değişiklik yalnız sonraki günlük seçimlere uygulanır; mevcut
günlük plan ve etkinlik oluşturulma anındaki tercihi aynı tarihsel snapshot olarak
korur ve sessizce yeniden yazılmaz.

Bu yapı hem öğretmene onlarca plan seçeneği verir hem de aynı etkinliğin yüzlerce kopyasını üretme ve resmî programları birbirine karıştırma riskini önler.

Premium duvarı yalnız sağlayıcıya ait plan şablonları ve bunlardan yeni içerik üretme hakkını kapsar. Öğrenci/sınıf verisi, öğretmenin kendi planı, gözlem, yoklama, fotoğraf, yedekleme, geri yükleme ve temel dışa aktarma hiçbir koşulda ücret duvarına alınmaz. Özellik `Planlar → Yıllık Plan Merkezi` altında feature flag ile geliştirilir; hazır değilken ana menüde çalışmayan hedef gösterilmez.

## 2. Sekiz temel paket

| SKU | Kullanıcıya görünen ad | Program | Yaş profili |
|---|---|---|---|
| `TYMM-3648` | TYMM 2024 · 36–48 Ay | TYMM 2024 | 36–48 ay |
| `TYMM-4860` | TYMM 2024 · 48–60 Ay | TYMM 2024 | 48–60 ay |
| `TYMM-6072` | TYMM 2024 · 60–72 Ay | TYMM 2024 | 60–72 ay |
| `TYMM-MIXED` | TYMM 2024 · Karma Yaş | TYMM 2024 | Karma |
| `ECE24-3648` | EÇE/2024 · 36–48 Ay | MEB 2024 Okul Öncesi Eğitim Programı | 36–48 ay |
| `ECE24-4860` | EÇE/2024 · 48–60 Ay | MEB 2024 Okul Öncesi Eğitim Programı | 48–60 ay |
| `ECE24-6072` | EÇE/2024 · 60–72 Ay | MEB 2024 Okul Öncesi Eğitim Programı | 60–72 ay |
| `ECE24-MIXED` | EÇE/2024 · Karma Yaş | MEB 2024 Okul Öncesi Eğitim Programı | Karma |

EÇE paketlerindeki 36–48, 48–60 ve 60–72 ayrımı yeni bir resmî EÇE ontolojisi olduğu iddiası taşımaz; bunlar MaarifOS’un resmî EÇE hedeflerini koruyan **yaşa uygun içerik uyarlamalarıdır**. Bu ifade ürün kartı ve sözleşmede görünür olur.

### Karma yaş paketi kuralı

Karma yaş, üç yaş grubunun hedeflerini tek listede birleştiren veya ortalamasını alan bir paket değildir. Her günlük akışta ortak deneyim korunur; bunun altında ayrı ayrı:

- 36–48 ay için başlangıç desteği,
- 48–60 ay için temel uygulama,
- 60–72 ay için derinleştirme,
- öğretmenin çocuk bazında seçebileceği erişim ve katılım uyarlamaları

bulunur. Planın program hedefleri de çocuğun yaş profiline göre ayrı snapshot olarak saklanır.

## 3. Fiyat mimarisi

Kullanıcının verdiği lansman fiyatları değişmeden esas alınmıştır. Para değerleri uygulamada `Decimal` karşılığı olan **kuruş cinsinden tamsayı** ile saklanır; `float` kullanılmaz.

| Teklif | Kampanya fiyatı | Kullanıcının verdiği referans | İndirim | İçerik |
|---|---:|---:|---:|---|
| Tek Paket | **1.453 TL** | 2.000 TL | 547 TL / %27,35 | Seçilen 1 program × 1 yaş profili, tüm lensler |
| Tam Paket | **5.999 TL** | 10.000 TL | 4.001 TL / %40,01 | 8 paketin tamamı, tüm lensler |

Değer karşılaştırması:

- Sekiz paketi ayrı almak 11.624 TL’dir; Tam Paket 5.625 TL daha düşüktür (%48,39).
- Dört Tek Paket 5.812 TL’dir; Tam Paket beşinci paketten itibaren daha avantajlıdır.
- Bir Tek Paket alan kullanıcı 30 gün içinde Tam Paket’e yükselirse ödediği 1.453 TL mahsup edilir ve **4.546 TL** öder.

### Güncel fiyat gösterimi için zorunlu hukuk kapısı

`2.000 TL` ve `10.000 TL` değerleri arayüzde otomatik olarak üzeri çizili gösterilmeyecektir. 1 Ağustos 2026’da yürürlüğe giren reklam düzenlemeleri nedeniyle referans fiyatın hangi geçmiş fiyat ve süre koşullarını sağlaması gerektiği, satışın hukuki sınıfı ve kanıt kaydı doğrulanmalıdır. Kanıt yoksa kart yalnızca:

> Lansman fiyatı: 1.453 TL
> Lansman fiyatı: 5.999 TL

şeklinde gösterilir. `referencePriceEvidenceId`, kampanya başlangıç/bitiş tarihleri ve hukuk onayı bulunmadan üzeri çizili fiyat bileşeni render edilmez. Kaynak: [Ticaret Bakanlığı — Aldatıcı reklamlarla mücadelede yeni dönem](https://www.ticaret.gov.tr/haberler/aldaticici-reklam-ve-haksiz-ticari-uygulamalarla-mucadelede-yeni-donem-basliyor).

Fiyat kartında vergi dahil/hariç durumu, fatura bilgisi, lisans süresi, cihaz limiti, iade/cayma şartı ve kampanya tarihleri ödeme öncesinde açıkça gösterilir. Dijital içeriğin hemen sunulması ve cayma hakkı istisnası için tüketici hukuku uzmanının onayladığı açık rıza akışı gerekir. Kaynak: [Ticaret Bakanlığı — Mesafeli sözleşmeler rehberi](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme).

## 4. Lisans politikası

İlk sürüm için önerilen ve ürün sahibi onayıyla kesinleşecek politika:

- Abonelik ve otomatik yenileme yoktur.
- Satın alma, ilgili akademik yıl içerik sürümünü açar.
- Satın alınan içerik sürümü cihazda kalıcı olarak kullanılabilir ve arşivlenebilir.
- İçerik düzeltmeleri ve güncellemeleri ilgili akademik yıl boyunca dahildir.
- Yeni eğitim yılına özgü takvim ve yeni içerik sürümü ayrıca lisanslanabilir; eski satın alma silinmez.
- Tek Paket en fazla **2**, Tam Paket en fazla **3** etkin cihazda kullanılabilir.
- Cihaz değişimi için self-servis aktarım ve kurtarma kodu bulunur; çocuk verisi lisans sunucusuna gönderilmez.
- Eğitim kurumlarına toplu lisans ayrı bir fiyat ve sözleşme ürünüdür; bu iki bireysel fiyatın kapsamına gizlice eklenmez.

## 5. Üç günlük deneme

Deneme, kart istemeyen ve otomatik olarak ücretliye dönüşmeyen **72 saatlik** bir yetkidir.

### Deneme kapsamı

- Kullanıcı bir program, yaş profili ve yaklaşım tercihi seçer; bu seçim içerikte uygulanmış yöntem iddiası oluşturmaz.
- Plan Merkezi, aylık plan, günlük akış, uyarlama, aile katılımı ve değerlendirme akışları çalışır.
- Bir örnek PDF/çıktı üretilebilir.
- Toplu yıllık ZIP/PDF dışa aktarma, sınırsız şablon kopyalama ve içerik paketi indirme denemede kapalıdır.
- Deneme bitince yeni premium plan üretimi durur; öğretmenin kendi girdiği gözlem, fotoğraf, yoklama ve notlar asla kilitlenmez veya silinmez.
- Denemede düzenlenmiş planlar salt okunur kalır; satın alma sonrası kaldığı yerden devam eder.

### Deneme kötüye kullanım kontrolü

- Aktivasyon çevrimiçi yapılır; cihaz başına ve doğrulanmış iletişim/kurtarma kimliği başına bir kez verilir.
- Sunucu başlangıç ve bitiş anını UTC olarak imzalar. Arayüz ayrıca `Europe/Istanbul` sivil tarihini gösterir.
- Uygulama deneme süresinde günde en az bir defa sunucu zamanı doğrulamaya çalışır; uzun süre çevrimdışı kalırsa kısa ve açık bir “lisansı doğrulamak için internete bağlan” durumu gösterir.
- Cihaz saatini geri almak denemeyi uzatmaz.

## 6. Kullanıcı akışları

### 6.1 İlk keşif

1. Kullanıcı **Plan Merkezi**ne girer.
2. “Ücretsiz içerikler” ve “Premium Plan Merkezi” ayrımını görür.
3. Programı seçer: TYMM 2024 veya EÇE/2024.
4. Yaş profilini seçer: 36–48, 48–60, 60–72 veya Karma.
5. Lensleri, örnek haftayı, içerik kapsamını ve hangi resmî hedeflere bağlandığını inceler.
6. “3 gün dene”, “Kodum var” veya “Satın al” eylemlerinden birini seçer.

### 6.2 Benzersiz kodla açma

1. Kullanıcı kodu girer veya QR kodu tarar.
2. Arayüz kodu maskeli gösterir.
3. Sunucu kodu atomik olarak tek defa kullanır ve imzalı yetki belgesi döndürür.
4. Açılan paketler, eğitim yılı, cihaz hakkı ve kurtarma seçeneği özetlenir.
5. İçerik manifesti indirilir ve çevrimdışı kullanım hazırlanır.

Kod türleri: `FULL`, `SINGLE_SKU`, `TRIAL`, `PROMO_GIFT`, `STAFF`. Kod fiyat taşımaz; yalnızca hangi yetkileri açtığını taşır.

### 6.3 Planı sınıfa uygulama

1. Paket seçilir.
2. Sınıfın yaş profili ve varsa karma yaş dağılımı doğrulanır.
3. Pedagojik yaklaşım tercihi veya dengeli öneri seçilir; doğrulanmış overlay yoksa bu tercih etkinlik şablonunu otomatik dönüştürmez.
4. Eğitim takvimi, özel günler, okul imkânları ve öğretmenin malzeme sınırları uygulanır.
5. Sistem bir **Yıllık Planlama Panosu** ve buna bağlı aylık çalışma taslakları oluşturur.
6. Öğretmen aylık planı inceler, düzenler ve onaylar.
7. Aylık plan günlük planlara; günlük plan etkinlik, kanıt ve değerlendirmeye bağlanır.
8. Ay sonu öğretmen değerlendirmesi bir sonraki ayın taslağını bilgilendirir; sistem pedagojik kararı öğretmenin yerine vermez.

## 7. “Yıllık plan”ın resmî ve ürün içindeki anlamı

Okul öncesi resmî akış aylık ve günlük planlama üzerine kuruludur. Bu nedenle MaarifOS, resmî belgeymiş gibi tek ve donmuş bir “yıllık plan PDF’i” üretmez. Ürün içindeki **Yıllık Planlama Panosu** şunları yapar:

- 10 aylık kapsam ve denge görünümü sunar,
- resmî hedeflerin aylara dengeli dağılımını planlar,
- belirli gün/hafta, doğa döngüsü, okul takvimi ve aile/toplum katılımını gösterir,
- aylık planları ayrı ayrı üretir ve sürümler,
- uygulama kanıtlarına göre “planlandı / uygulandı / kanıt bekliyor / değerlendirildi” ayrımını korur,
- öğretmenin aylık değerlendirmesiyle sonraki ayı revize eder.

Kanonik zincir:

`Eğitim yılı → yıllık pano → aylık plan → günlük plan → etkinlik → ham kanıt → öğretmen değerlendirmesi → aylık yansıtma → sonraki ay`

TYMM’nin planlama, farklılaştırma, aile/toplum katılımı ve değerlendirme ilkeleri resmî programdan sürümlü olarak alınır: [TYMM Okul Öncesi Eğitim Programı PDF](https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf).

## 8. Her pakette bulunanlar

- 10 aylık yıllık planlama panosu
- Her ay için resmî biçime uyarlanabilir aylık plan taslağı
- Günlük eğitim akışları ve özgün etkinlik modülleri
- Her etkinlikte yaşa uygun uygulama, kolaylaştırma ve derinleştirme
- Karma yaşta üç ayrı yaş dalı
- Program hedefi/çıktısı snapshot’ları ve kaynak sürümü
- Öğretmen soruları, çocuk sözünü yakalama ve gözlem ipuçları
- Farklılaştırma, kapsayıcı erişim ve katılım seçenekleri
- Aile ve toplum katılımı
- Okul dışı öğrenme ve güvenlik/risk–fayda kontrolü
- Materyal listesi ve düşük maliyetli alternatifler
- Planlanan hedef ile gözlenen kanıtı ayıran değerlendirme alanları
- Aylık hedef/kavram/etkinlik denge görünümü
- Düzenlenebilir çıktı, öğretmen dosyası ve değişiklik geçmişi
- Çevrimdışı erişim ve satın alınan sürüm arşivi

## 9. İçerik sistemi

İçerik kopya çoğaltmayla değil, bileşenlerle kurulur:

- **8 resmî uyum çekirdeği:** program × yaş profili
- **80 aylık kapsam haritası:** 8 paket × 10 ay
- **En az 240 özgün etkinlik modülü:** yaş varyantları ve iki program için ayrı eşlemeler
- **24 pedagojik lens:** resmî eşlemeyi değiştirmeyen öğretmen tercihleri; uygulanmışlık yalnız ayrıca doğrulanmış overlay ile söylenebilir
- **Takvim katmanı:** MEB çalışma takvimi, yerel koşullar ve öğretmenin okul günleri
- **Kanıt katmanı:** planlanan hedef, uygulama ve öğretmen onaylı kanıtı birbirinden ayırır

24 lens × 8 temel paket, katalogda **192 olası tercih bileşimi** tanımlar; bu
sayı 192 ayrı, uygulanmış veya uzman onaylı yıllık plan bulunduğu anlamına
gelmez. Aylık ve günlük uyarlama ancak ilgili overlay ayrıca doğrulanmışsa
uygulanmış diye gösterilir. Veritabanında 192 kopya tutulmaz; aynı kaynak modül,
sürümlü kurallar ve açık program eşlemeleriyle korunur.

Lens kataloğu ve yayın standardı [`PREMIUM_CONTENT_STANDARD.md`](PREMIUM_CONTENT_STANDARD.md) belgesindedir.

Kod/deneme güvenliği [`PREMIUM_ENTITLEMENT_ARCHITECTURE.md`](PREMIUM_ENTITLEMENT_ARCHITECTURE.md), mevcut MaarifOS koduna aşamalı entegrasyon ise [`PREMIUM_PLAN_INTEGRATION_PLAN.md`](PREMIUM_PLAN_INTEGRATION_PLAN.md) belgesinde tanımlanmıştır. Uygulamanın okuyabileceği ilk ürün metadatası [`premium-plan-catalog.v1.json`](premium-plan-catalog.v1.json) dosyasındadır.

## 10. İlk yayın stratejisi

Kullanıcının önerisi kabul edilmiştir: ilk gerçek içerik paketi **TYMM 2024** olacaktır. Yayın sırası:

1. TYMM 2024 · 60–72 ay, Eylül dikey dilimi
2. TYMM 2024 · 36–48 ve 48–60 ay Eylül dilimleri
3. TYMM 2024 · Karma yaş Eylül dilimi
4. TYMM için 10 ayın tamamı
5. EÇE/2024 resmî kataloğunun tam aktarımı ve bağımsız doğrulaması
6. EÇE/2024 dört yaş profilinin 10 aylık içerikleri
7. Tüm lenslerin kademeli açılması

Mevcut kod deposundaki TYMM öğrenme çıktısı matrisi doğrulanmıştır; bu ifade programın tüm alt öğrenme çıktıları ve bütün programlar arası bileşenlerinin eksiksiz dijitalleştirildiği anlamına gelmez. TYMM yayınında da kullanılan bütün resmî bileşenler için kapsam beyanı çıkarılmalıdır. EÇE/2024 kataloğu ise açıkça **kısmi başlangıç kataloğu** olarak işaretlidir. EÇE paketleri “tam” adıyla satılmadan önce tüm kazanım/göstergelerin üst ilişki, kaynak, kod tekilliği ve sürüm doğrulaması tamamlanmalıdır.

## 11. Ürün durumları ve arayüz dili

Paket durumları:

- `locked`: Kilitli
- `trial_available`: 3 günlük deneme kullanılabilir
- `trial_active`: Deneme aktif
- `trial_expired`: Deneme sona erdi
- `entitled`: Satın alınmış / kodla açılmış
- `download_pending`: Çevrimdışı içerik hazırlanıyor
- `offline_ready`: Çevrimdışı hazır
- `update_available`: İçerik güncellemesi var
- `revoked`: Yetki güvenlik nedeniyle geri alınmış; kullanıcının kendi verileri etkilenmez

Plan durumları:

- Taslak
- İncelemeye hazır
- Onaylandı
- Uygulanıyor
- Kanıt bekliyor
- Değerlendirme bekliyor
- Tamamlandı
- Arşivlendi

“Başardı”, “öğrendi” veya “tamamladı” gibi çocuk hakkında kesin hüküm bildiren otomatik etiketler kullanılmaz.

## 12. Başarı ölçütleri

### Ticari

- Paket görüntüleme → deneme başlatma
- Deneme → kod kullanma/satın alma
- Tek Paket → 30 günlük Tam Paket yükseltme
- İade talebi ve yanlış paket satın alma oranı
- Lisans kurtarma başarı oranı

### Ürün

- İlk premium aylık planı 10 dakika içinde sınıfa uyarlayabilme
- Günlük planı en fazla 5 temel adımda başlatabilme
- Satın alınan içeriğin ilk indirme sonrası internetsiz açılması
- Deneme veya lisans bitiminde öğretmen verisi kaybının sıfır olması
- Plan → etkinlik → kanıt bağının korunması

### İçerik

- Resmî hedef kaynak/sürüm alanlarında %100 doluluk
- Karma yaş planlarında üç yaş dalında %100 doluluk
- Her etkinlikte farklılaştırma, aile katılımı, değerlendirme ve güvenlik alanlarında %100 doluluk
- Yayın öncesi öğretmen ve program uzmanı çift onayı
- Telif/varlık kaynağı belirsiz içeriğin sıfır olması

## 13. Yayın kapıları

Bir premium paket ancak aşağıdakilerin tamamı sağlanınca satışa açılır:

1. Resmî katalog `complete` ve sürümlü.
2. 10 aylık kapsam haritası program uzmanı tarafından onaylı.
3. Yaş profili ve karma yaş dalları eksiksiz.
4. Etkinlikler özgün veya yazılı lisanslı.
5. En az iki okul öncesi öğretmenle uygulanabilirlik incelemesi yapılmış.
6. Mobil, çevrimdışı, yedekleme ve geri yükleme testleri geçmiş.
7. Lisans kurtarma ve cihaz aktarımı test edilmiş.
8. Fiyat/reklam metni hukuk ve muhasebe kontrolünden geçmiş.
9. Örnek çıktı ile uygulama içi veri aynı sürümden üretilmiş.
10. Sürüm notu, kaynak listesi ve bilinen sınırlar yayımlanmış.

## 14. Açıkça yapılmayacaklar

- Dünya yaklaşımlarını “resmî program”, “sertifikalı Montessori”, “Reggio okulu” veya benzeri yanıltıcı adlarla satmak
- Çocuk verisini lisans doğrulama sunucusuna göndermek
- Premium içeriğin tamamını statik PWA paketine gömmek
- Sadece cihaz saatine güvenen deneme süresi yapmak
- Kodları düz metin saklamak veya loglamak
- Bir programın hedeflerini diğer programın ontolojisine sessizce dönüştürmek
- Karma yaş için yaş gruplarını birleştirip tek seviye sunmak
- Öğretmen ve program uzmanı incelemesi olmadan toplu üretilen içeriği “kusursuz/tam” diye yayımlamak

## 15. Kaynaklar ve kıyas noktaları

- [Oynaya Oynaya — sık sorulan sorular](https://oynayaoynaya.net/sik-sorulanlar/sik-sorulan-sorular/): 10 aylık içerik, aylık/günlük planlar, öğretmen dosyaları ve aylık yayın modeli için pazar kıyası.
- [Oynaya Oynaya — örnek plan](https://oynayaoynaya.net/ornek-plan/): satın alma öncesi örnekleme ve plan sunumu kıyası.
- [MEB — 2026–2027 eğitim öğretim yılı takvimi](https://meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr): uyum haftası, dönem başlangıcı ve bitişi için kanonik takvim kaynağı.
- [TYMM Okul Öncesi Eğitim Programı](https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf): planlama, öğrenme kanıtları, farklılaştırma, aile/toplum katılımı ve değerlendirme temeli.
