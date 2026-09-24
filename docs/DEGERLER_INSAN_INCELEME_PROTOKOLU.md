# Değerler İçeriği · Altı Rollü İnsan İnceleme Protokolü

> **Sürüm:** 1.1.0 · 8 Ağustos 2026
> **Kapsam:** Değerler Pedagojisi Anayasası, Eylül `content.v3`, plan
> sözleşmeleri, aile/toplum ve Orman Okulu/Montessori kültürel köprüleri
> **Karar:** Altı rolün tamamı yazılı kabul vermeden içerik
> `machine_validated_pending_human_review` durumundan çıkarılamaz.

## 1. Neden insan incelemesi zorunlu?

Şema doğrulaması; eksik alanı, sahte kaynağı, sürüm kaymasını ve açık kırmızı
çizgi dilini yakalayabilir. Bir etkinliğin çocuğun gelişim düzeyine uygun,
kültürel olarak sahici, çoğulculuğa saygılı ve TYMM bağlamında pedagojik olarak
yerinde olup olmadığı yalnız makine kapısıyla kesinleştirilemez.

Bu nedenle teknik olarak geçen içerik **yayına hazır** değil, yalnızca insan
incelemesine hazırdır. İnceleme bir pazarlama onayı değil; çocuk hakkı, kaynak
doğruluğu ve uygulama güvenliği kararıdır.

Eylül `content.v3` içindeki 20 kültürel bağlam bu nedenle `draft` durumundadır.
Bir URL'nin varlığı, o kaynağın “kul hakkı”, “helal emek”, “şükür/kanaat” veya
"imece" uyarlamasını gerçekten desteklediğini kanıtlamaz. Her kullanım R6 ve
ilgili diğer rollerce anlam, temsil, dönem, yöre ve yaş uyarlaması düzeyinde
tek tek doğrulanmadıkça `verified` yapılamaz.

## 2. Zorunlu altı rol

Her rol farklı bir gerçek kişi tarafından yürütülür. Bir kişi iki rolü aynı
pakette imzalayamaz.

### R1 — Erken çocukluk eğitimi uzmanı

- 60–72 ay gelişim uygunluğunu,
- oyun, hareket, dil ve özne olma dengesini,
- yetişkin müdahalesinin dozunu,
- gözlenebilirlik ile kişilik hükmü arasındaki sınırı,
- farklı gelişim ve iletişim ihtiyaçlarına uyarlamayı inceler.

### R2 — Okul öncesi uygulayıcı öğretmen

- etkinliğin gerçek sınıf süresi ve hazırlık yükünü,
- malzeme erişilebilirliğini ve düşük maliyetli eşdeğerleri,
- çocuk seçimi, geri çekilme ve sessiz katılım yollarının uygulanabilirliğini,
- gözlem istemlerinin öğretmen iş yükü altında anlaşılır kalmasını,
- bir sonraki plan kararının sınıf pratiğine çevrilebilirliğini inceler.

### R3 — Çocuk hakları ve koruma uzmanı

- gönüllülük, katılmama ve geri çekilme hakkını,
- mahremiyet, veri minimizasyonu ve güvenli kanıt dilini,
- utandırma, ceza, korkutma, zorlama ve akran teşhirini,
- inanç/vicdan ve aile çeşitliliği sınırını,
- fiziksel ve duygusal güvenliği inceler.

### R4 — TYMM program uzmanı

- D1–D20 değer ve çatı ilişkilerini,
- resmî Ek-14 eylem/gösterge kodu ile metnin tam eşleşmesini,
- programlar arası veya okul öncesi dışı göstergenin yanlış taşınmamasını,
- plan düzeyleri arasındaki niyet ve kaynak sürekliliğini,
- tek ay ile dönem kapsamı iddiasının karıştırılmamasını inceler.

### R5 — İçerik ve Türkçe dil editörü

- öğretmen, çocuk ve aile dilinin açık, yaşa uygun ve yargısız olmasını,
- gözlem ile yorumun, kültürel bağlam ile değer kanıtının ayrılmasını,
- Türkçe yazım, Unicode ve terim tutarlılığını,
- marka, sertifika, resmiyet veya uzman onayı çağrıştıran yanıltıcı ifadeleri,
- kaynak iddiası ile kaynakta gerçekten bulunan anlamın tutarlılığını inceler.

### R6 — Türk-İslam kültürü, ilahiyat ve çoğulculuk uzmanı

- kültürel örneğin sahiciliğini ve yaşa uygunluğunu,
- saygı, emanet, adalet, kul hakkı, merhamet, komşuluk, paylaşma ve nezaket
  gibi kavramların pedagojik köprü olarak doğru kullanımını,
- ibadet veya dinî kimliğin değer başarısı sayılmamasını,
- farklı inanç, mezhep, inançsızlık ve aile tercihlerine baskı kurulmamasını,
- kaynak ve sözlü kültür provenansını inceler.

R6 incelemesi kültürel görünürlüğü azaltma görevi değildir. Görevi, Türk-İslam
kültürünü sahici ve saygın biçimde görünür kılarken çocuğun din ve vicdan
özgürlüğünü aynı anda korumaktır.

## 3. İnceleme bağımsızlığı

İnceleyen kişi:

- içeriğin yazarıysa bunu beyan eder ve kendi yazdığı madde için nihai kabulü
  başka uzman verir,
- ücret, kurum ilişkisi veya kişisel yakınlık gibi çıkar çatışmasını kaydeder,
- kaynak görmeden “genel olarak uygun” onayı veremez,
- karşı oy veya çekince yazdığı için kararını değiştirmeye zorlanamaz.

Bir rolün reddi veya çözümlenmemiş çekincesi bütün paketi bloklar. Çoğunluk oyu
yeterli değildir.

## 4. İnceleme paketi

İnceleyene aşağıdaki değişmez paket birlikte verilir:

1. `DEGERLER_PEDAGOJISI_ANAYASASI.md` ve kanonik JSON sürümü,
2. resmî Okul Öncesi Ek-14 katalog sürümü ve kaynak PDF SHA-256 özeti,
3. `content.v3.json` ile `manifest.v3.json`,
4. 12 etkinliğin değer haritası,
5. yıllık–aylık–haftalık–günlük plan sözleşmeleri,
6. değer kanıtı V1 sözleşmesi ve yasak örnekler,
7. içerik güvenlik taraması ve hedef test çıktıları,
8. önceki inceleme kararları ile açık değişiklik günlüğü.

İnceleme sırasında dosya değişirse önceki kabul otomatik düşer. Yeni ham ve
kanonik özetlerle yeniden inceleme gerekir.

## 5. Karar birimi

İnceleme yalnız paket düzeyinde “güzel/uygun” değerlendirmesi değildir. Her
etkinlikte şu birimler ayrı ayrı kontrol edilir:

- başlık ve amaç,
- açılış, süreç adımları ve kapanış,
- yetişkin soruları ve model olma dili,
- çocuk seçimi, katılmama ve onarım yolu,
- ana/çatı/destekleyici değer ilişkisi,
- resmî eylem snapshot'ları,
- ikilem ve karşı kanıt,
- kültürel bağlam ile kaynak provenansı,
- aile/toplum bağlantısı,
- Orman Okulu veya hazırlanmış çevre/Montessori lensi,
- güvenlik, uyarlama ve gözlem seçenekleri,
- öğretmen yansıtma sorusu.

## 6. Karar kodları

Her birim yalnız şu kararlardan birini alır:

- `ACCEPTED`: Değişiklik gerektirmeden kabul.
- `ACCEPTED_WITH_EDITORIAL_FIX`: Anlamı değiştirmeyen yazım/biçim düzeltmesi;
  düzeltme sonrası aynı uzman exact diff'i yeniden görür.
- `REVISION_REQUIRED`: Pedagojik, kültürel veya kaynak değişikliği gerekir.
- `REJECTED_HARD_STOP`: Çocuk hakkı, zorlama, kaynak uydurma, inanç
  profillemesi veya başka anayasal kırmızı çizgi.
- `NOT_APPLICABLE`: Yalnız gerçekten kapsam dışı bir kontrol için; gerekçe
  zorunludur.

Sayısal ortalama veya toplam puan kullanılmaz. Bir hard-stop başka maddelerdeki
olumlu kararlarla dengelenemez.

## 7. Ortak kabul soruları

Her uzman kendi alanına ek olarak şu soruları yanıtlar:

1. Çocuk gerçek bir seçim yapabiliyor mu?
2. Katılmama veya farklı yanıt verme cezalandırılmadan mümkün mü?
3. Yetişkin davranışı model oluyor mu; çocuğu ahlaki performansa zorluyor mu?
4. Metin gözlenebilir eylem mi anlatıyor, karakter hükmü mü kuruyor?
5. Onarım ve yeniden deneme yolu var mı?
6. Resmî kod ve metin kaynakla tam aynı mı?
7. Kültürel köprü değer koduymuş gibi sunuluyor mu?
8. İnanç, ibadet, mezhep veya aile tercihi değer kanıtına dönüşüyor mu?
9. Farklı gelişim, dil, engel ve iletişim özellikleri için erişilebilir mi?
10. Etkinlik Orman Okulu/Montessori adını kullanıyorsa yaklaşımın özünü gerçekten
    taşıyor mu, yalnız dekor olarak mı kullanıyor?
11. Kanıt önerisi tek olaydan “kazandı/başardı/iyi çocuk” sonucu çıkarıyor mu?
12. Aile bağlantısı evde zorunlu görev veya mahrem bilgi talebi yaratıyor mu?

## 8. Anında yayın engeli oluşturan durumlar

Aşağıdakilerden biri görülürse madde `REJECTED_HARD_STOP` olur:

- çocuk veya aile hakkında ahlaki puan, sıra, rozet, seviye veya kalıcı profil,
- dua, namaz, oruç, dinî kimlik, mezhep ya da ritüel katılımından değer sonucu,
- katılmayan çocuğu utandırma, dışlama, ceza veya ödülle zorlama,
- korku, tehdit, fiziksel risk veya mahremiyet ihlali,
- resmî olmayan metni MEB/TYMM eylemi diye sunma,
- kültürel veya dinî kaynağı uydurma,
- aile biçimi, dil, engel, cinsiyet, inanç veya sosyoekonomik durum üzerinden
  üstünlük/aşağılama,
- doğada canlıya zarar, iz bırakma veya çocuğu denetimsiz riske açma,
- Montessori/Orman Okulu adını kullanıp yaklaşımın temel sınırlarını tersine
  çevirme,
- ham gözlemi sonradan yorumla değiştirme veya öğretmen yorumunu çocuk sözü
  gibi gösterme.

## 9. Lens bazlı özel kontroller

### Orman Okulu ve doğa temelli öğrenme

- Alan ve hava koşulu için gerçek risk–fayda değerlendirmesi var mı?
- “İz bırakmama”, canlı/habitat saygısı ve materyal iadesi somut mu?
- Riskli oyun yetişkin tarafından sıfırlanmadan, yaşa uygun sınırla mı sunuluyor?
- Doğa yalnız fon değil; süreklilik, ilişki ve yer duygusu taşıyor mu?
- Çocuğun dokunmama, yaklaşmama veya gözlemci kalma seçimi var mı?

### Hazırlanmış çevre ve Montessori köprüsü

- Materyal gerçek amacıyla ve düzenli, erişilebilir çevrede mi sunuluyor?
- Yetişkin gereksiz müdahale yerine kısa model ve gözlem kullanıyor mu?
- Çocuğun çalışma döngüsü, tekrar ve kendi hatasını fark etme fırsatı var mı?
- “Sessizlik/itaat” değer başarısı olarak kullanılmıyor mu?
- Yaklaşım etiketi resmî Montessori akreditasyonu iddiasına dönüşüyor mu?

### Diğer dünya yaklaşımları

Reggio Emilia, HighScope, Froebel, place-based learning, restorative practice,
service learning veya başka bir yaklaşım kullanılırsa:

- kaynak ve sürüm belirtilir,
- yaklaşımın özgün kavramı korunur,
- TYMM değer kodu yerine geçirilmez,
- Türk-İslam kültürel bağlamını silmek için değil, pedagojik imkânı büyütmek
  için kullanılır,
- çocuğun hakkı ve yerel bağlamla çatışan unsur aynen ithal edilmez.

## 10. Revizyon döngüsü

```text
inceleme paketi dondurulur
  → altı rol bağımsız karar verir
  → bulgular kimlikli değişiklik taleplerine çevrilir
  → yazar yalnız kabul edilen kapsamda düzeltir
  → manifest ve digest yeniden üretilir
  → ilgili uzman exact diff'i doğrular
  → tüm roller aynı sürüme kabul verir
  → sınırlı kurgu/pilot kabulüne geçilir
```

Her talep şu alanları taşır:

```text
reviewFindingId
reviewRole
contentPackId / version / manifestDigest
activityId / fieldPath
decisionCode
finding
constitutionalRule
sourceReference
requiredChange
raisedAtUtc
resolvedByChangeId
verifiedAtUtc
reviewerPseudonymousId
```

Gerçek imza veya kişisel iletişim bilgisi uygulama reposuna yazılmaz; kurumun
erişim kontrollü inceleme kasasında tutulur.
Uygulamadaki `verified` kültürel provenans, bu kasadaki `reviewFindingId` kararını
tam kaynak sürümü, SHA-256 özeti, bağlam kimliği, R6 rolü ve takma adlı aktörle
exact eşleştiren yetkili sicil çözümleyicisi olmadan kurulamaz. Sicil yanıtı yok,
uyuşmaz veya erişilemezse kaynak taslak kalır; URL kendi kendine onay değildir.

## 11. Pilot öncesi ortak kabul

Altı rollü inceleme tamamlandıktan sonra bile doğrudan üretim veya satış
açılmaz. Önce yalnız kurgu veri ve yetişkin uygulayıcılarla:

- 12 etkinliğin uçtan uca uygulanabilirlik provası,
- farklı yanıt ve katılmama senaryosu,
- erişilebilirlik/uyarlama provası,
- kültürel bağlamın yanlış anlaşılma denemesi,
- değer kanıtı oluşturma, düzeltme ve kaldırma denemesi,
- yedek/restore ve kalıcı silme mahremiyet tatbikatı,
- öğretmenin “değer düzeyi/iyi çocuk” algısına yönelip yönelmediği incelemesi

yapılır. Gerçek çocuk verisi hukuk/gizlilik kapısı ve açık pilot izni olmadan
kullanılmaz.

## 12. Yayın kararı ve geri çekme

Yayın kararı şu exact üçlüye bağlıdır:

```text
contentPackId + version + manifestDigest
```

İçerik değişirse karar taşınmaz. Yayından sonra çocuk hakkı, kaynak veya kültürel
saygı ihlali bildirilirse ilgili paket derhal pasifleştirilir; geçmiş kayıtlar
silinmez, exact snapshot provenansı korunur. Düzeltme yeni sürüm ve yeni altı
rollü inceleme gerektirir.

## 13. Kabul tutanağı

Nihai tutanakta en az şunlar bulunur:

- incelenen exact kimlik/sürüm/digest,
- altı rolün ayrı kararları ve tarihleri,
- açık veya kapatılmış bulgu sayıları,
- tüm hard-stopların kapalı olduğuna dair beyan,
- çözülmemiş çekince bulunmadığı beyanı,
- pilot kapsamı ve yasaklanan kullanım biçimleri,
- bir sonraki zorunlu yeniden inceleme koşulları.

“Genel olarak uygun”, “güzel olmuş” veya yalnız sözlü kabul yayın kapısını
açmaz.
