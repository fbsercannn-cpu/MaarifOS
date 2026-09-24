# MaarifOS 2026–2027 Yıllık Değerler Matrisi

> **Sürüm:** 1.0.0 · 8 Ağustos 2026
> **Program profili:** TYMM Okul Öncesi · 60–72 ay
> **Statü:** `planned_target` · authored planlama adayı
> **Yayın hükmü:** Bu belge makine doğrulaması, insan uzman onayı, öğretmen onayı
> veya çocuğun bir değeri “kazandığı” iddiası değildir.

Makine-okunur authored karşılık
`premium-content/releases/tymm-6072/2026-2027/annual-values-release-profile.v1.json`,
strict parser `app/src/features/premium-plans/annual-release-set.ts` içindedir.
Ekim ayı ayrıca `premium-content/releases/tymm-6072/2026-10/reference-blueprint.v1.json`
ile yalnız `planned_reference_blueprint` olarak somutlaştırılmıştır. Bu üç
artefaktın hiçbiri release-set manifesti veya insan karar defteri değildir.

## 1. Ana karar

MaarifOS'ta değerler eğitimi ayrı bir tema saati değil, yıllık planın işletim
sistemidir. Her aylık içerik şu değişmez izi kurmalıdır:

```text
değer → resmî eylem → yaşantı/ikilem → gözlenebilir kanıt → öğretmen yansıtması → sonraki plan
```

Yıllık tasarımın karar çekirdeği **saygı–sorumluluk–adalet**tir. Bununla birlikte
TYMM'nin D1–D20 değerlerinin tamamı her iki dönemde de yalnız ana değerler üzerinden
kapsanır. Destekleyici değerler kapsam açığını kapatmak için kullanılamaz.

Türk-İslam kültürel birikimi; adalet, emanet, kul hakkı, merhamet, edep ve
nezaket, helal emek, şükür ve kanaat, israf etmeme, aile ve komşuluk, imece,
temizlik, vatan ve kültürel miras ile yaratılmışlara merhamet köprüleri üzerinden
saygın ve görünür biçimde yaşatılır. Bu köprüler TYMM değer kodu değildir. İnanç,
ibadet, mezhep, kıyafet, aile biçimi veya ritüel katılımı hiçbir zaman çocuğun
değer kanıtı, puanı ya da karakter hükmü yapılamaz.

## 2. Statü katmanları

| Katman | Anlamı | Kapsama katkısı |
|---|---|---|
| `planned_target` *(belge etiketi; serialize edilmez)* | Yazarın yıllık dağılım hedefi | Yalnız planlama görünümü |
| `machine_validated_pending_human_review` | Şema, katalog, hash ve güvenlik kapıları geçti | Makine kapsam görünümü |
| `approved` *(insan sicili aggregate sonucu)* | Altı bağımsız rol aynı exact digest'i kabul etti | İnsan inceleme görünümü |
| `teacherConfirmed` | Öğretmen plan niyetini kendi sınıfı için benimsedi | Yerel uygulama kararı |

Bu katmanlar birbirinin yerine geçmez. İnsan incelemesi öğretmen onayı değildir;
öğretmen onayı da içerik yayını veya çocuk hakkında değer sonucu değildir.

## 3. Yıllık dağılım

Bir etkinlikte tam bir ana değer, anayasanın izin verdiği tam bir çatı değeri ve
en çok iki destekleyici değer bulunur. Her ana değer için resmî Ek-14 kataloğundan
en az bir doğrulanmış gösterge exact snapshot olarak materialize edilir.

| Ay | Tema | Ana değer hedefleri | Destek havuzu | Hafta / etkinlik | D1 / D14 / D16 | Yön |
|---|---|---|---|---:|---:|---:|
| 2026-09 | Aidiyet, sınıf topluluğu ve keşif | D1, D3, D4, D5, D6, D8, D11, D12, D13, D14, D16 | Mevcut v3 authored eşlemeleri | 4 / 12 | 4 / 4 / 4 | 6 / 6 |
| 2026-10 | Değişen çevre, malzeme ve ortak yaşam | D5, D7, D9, D17, D18, D19 | D3, D13, D14, D16, D20 | 4 / 12 | 4 / 4 / 4 | 6 / 6 |
| 2026-11 | İlişki, topluluk ve ortak hafıza | D2, D4, D14, D15, D19, D20 | D6, D8, D11, D16 | 3 / 9 | 3 / 3 / 3 | 5 / 4 |
| 2026-12 | Işık, ses, örüntü ve yapı | D1, D3, D6, D10, D11, D16 | D7, D12, D14, D17 | 4 / 12 | 4 / 4 / 4 | 6 / 6 |
| 2027-01 | Kış, bakım ve dönem yansıtması | D5, D9, D12, D13, D17, D20 | D6, D14, D18, D19 | 3 / 9 | 3 / 3 / 3 | 4 / 5 |
| 2027-02 | İletişim, duygu ve hikâye | D4, D6, D8, D11, D14, D15 | D1, D12, D16, D20 | 3 / 9 | 3 / 3 / 3 | 5 / 4 |
| 2027-03 | Su, toprak, orman ve büyüme | D5, D9, D13, D16, D17, D18 | D7, D12, D14, D20 | 3 / 9 | 3 / 3 / 3 | 4 / 5 |
| 2027-04 | Çoklu ifade ve sürdürülebilir tasarım | D3, D5, D7, D10, D11, D12 | D8, D14, D17, D18 | 4 / 12 | 4 / 4 / 4 | 6 / 6 |
| 2027-05 | Hareket, üretim ve yerel toplum | D2, D3, D4, D16, D19, D20 | D6, D11, D14, D15 | 4 / 12 | 4 / 4 / 4 | 6 / 6 |
| 2027-06 | Geçiş, süreklilik ve yılın anlamı | D1, D5, D13, D14, D15, D16 | D4, D8, D9, D12 | 4 / 12 | 4 / 4 / 4 | 6 / 6 |

`Yön` sütununda ilk sayı `value_led`, ikinci sayı
`learning_outcome_led` etkinlik sayısıdır. Değerler önceliklidir; resmî öğrenme
çıktıları bastırılmaz ve dekoratif bir eklentiye de dönüştürülmez.

## 4. Dönem kapıları

### Birinci dönem · Eylül–Ocak

- Ayların ana değer birleşimi exact D1–D20'dir.
- 54 etkinlik hedeflenir.
- Çatı dağılımı exact 18 D1, 18 D14 ve 18 D16'dır.
- Tasarım yönü exact 27 `value_led` ve 27 `learning_outcome_led`dir.

### İkinci dönem · Şubat–Haziran

- Ayların ana değer birleşimi exact D1–D20'dir.
- 54 etkinlik hedeflenir.
- Çatı dağılımı exact 18 D1, 18 D14 ve 18 D16'dır.
- Tasarım yönü exact 27 `value_led` ve 27 `learning_outcome_led`dir.

### Yıl toplamı

- 10 ay, 36 hafta profili ve 108 etkinlik hedefi bulunur.
- Çatı dağılımı 36 D1, 36 D14 ve 36 D16'dır.
- Destek havuzları dönem kapsamına sayılmaz.
- Bir dönemin değer kümesi serbest metinden değil, yalnız ilgili ayların gerçek
  içeriklerindeki ana değerlerin birleşiminden türetilir.

## 5. Aylık pedagojik yay

### Eylül · Aidiyet ve güvenli topluluk

Çocuk sınıfa ait olmayı; sessiz katılım, kişisel sınır, erişilebilir seçim,
ortak düzen ve akranı dinleme yaşantılarıyla kurar. Bu ayın makine doğrulamalı
v3 dikey dilimi insan uzman incelemesi beklemektedir.

### Ekim · Değişen çevre ve ortak varlıklar

Duyarlılık, estetik, merhamet, tasarruf, temizlik ve vatanseverlik ikişer farklı
yaşantıda derinleştirilir. 29 Ekim; ezber, itaat veya tek doğru siyasi cevap
sınavı değil, millî bayramın anlamı, çocuk sözü, ortak iyilik ve kültürel mirasa
özen bağlamıdır. Başka halkları veya kültürleri küçülten dil hard-stop'tur.

### Kasım · İlişki ve ortak hafıza

Aile bütünlüğü, dostluk, saygı, sevgi, vatanseverlik ve yardımseverlik; aile
biçimlerini sıralamadan, gönüllü paylaşım ve ortak hafıza üzerinden ele alınır.

### Aralık · Emek, doğruluk ve yapı

Adalet, çalışkanlık, dürüstlük, mütevazılık, özgürlük ve sorumluluk; tasarlama,
deneme, hata fark etme, kaynak paylaşımı ve emeğe saygı yaşantılarıyla kurulur.

### Ocak · Bakım ve yansıtma

Duyarlılık, merhamet, sabır, sağlıklı yaşam, tasarruf ve yardımseverlik; kış
koşulları, canlı bakımı ve dönem kanıtlarına yargısız dönüşle derinleşir.

### Şubat · İletişim ve yeniden bağlanma

Dostluk, dürüstlük, mahremiyet, özgürlük, saygı ve sevgi; duygu dili, sınır,
çocuk sözü, farklı ifade yolları ve onarım üzerinden yaşanır.

### Mart · Uzun dönem doğa ilişkisi

Duyarlılık, merhamet, sağlıklı yaşam, sorumluluk, tasarruf ve temizlik; su,
toprak, habitat ve mevsimsel dönüşe bağlı bakım kararlarıyla görünür olur.
Mart doğa hattının başladığı ay değil, yoğunlaştığı aydır.

### Nisan · Çoklu ifade ve sürdürülebilir tasarım

Çalışkanlık, duyarlılık, estetik, mütevazılık, özgürlük ve sabır; fikirleri
sanat, yapı, hareket, söz ve sembolle ifade etme, yeniden deneme ve iyileştirme
yaşantılarıyla ele alınır.

### Mayıs · Üretim ve yerel toplum

Aile bütünlüğü, çalışkanlık, dostluk, sorumluluk, vatanseverlik ve
yardımseverlik; ortak üretim, yerel emek, komşuluk ve yaşanılan yere katkı
üzerinden derinleştirilir.

### Haziran · Geçiş ve süreklilik

Adalet, duyarlılık, sağlıklı yaşam, saygı, sevgi ve sorumluluk; yıllık kanıta
dönüş, vedalaşma, yeni ortama geçiş ve sürdürülmek istenen sorular üzerinden
ele alınır. Çocuk hakkında kalıcı karakter özeti üretilmez.

## 6. Kültürel köprü adayları

| Ay | Aday köprüler |
|---|---|
| Eylül | `emanet`, `kul-hakki`, `edep-nezaket`, `helal-emek-caliskanlik`, `sukur-kanaat-israf-etmeme`, `aile-sila-i-rahim-komsuluk`, `imece-yardimlasma` |
| Ekim | `sukur-kanaat-israf-etmeme`, `temizlik`, `vatan-kulturel-miras`, `yaratilmislara-dogaya-merhamet` |
| Kasım | `aile-sila-i-rahim-komsuluk`, `imece-yardimlasma`, `vatan-kulturel-miras` |
| Aralık | `kul-hakki`, `edep-nezaket`, `helal-emek-caliskanlik` |
| Ocak | `emanet`, `merhamet`, `temizlik` |
| Şubat | `emanet`, `edep-nezaket`, `aile-sila-i-rahim-komsuluk` |
| Mart | `sukur-kanaat-israf-etmeme`, `temizlik`, `yaratilmislara-dogaya-merhamet` |
| Nisan | `edep-nezaket`, `helal-emek-caliskanlik`, `sukur-kanaat-israf-etmeme` |
| Mayıs | `aile-sila-i-rahim-komsuluk`, `imece-yardimlasma`, `vatan-kulturel-miras` |
| Haziran | `kul-hakki`, `vatan-kulturel-miras`, `yaratilmislara-dogaya-merhamet` |

Yıllık authored profilde her global adayın exact kayıt biçimi:

```text
culturalBridgeId = <anayasa köprü kimliği>
provenanceStatus = draft
reviewDecisionId = null
humanReviewRequired = true
```

Ay kayıtları bu global adayları yalnız `culturalBridgeTargetIds` kimlik dizisiyle
seçer. Ekim `planned_reference_blueprint` ise ayrı bir planlama artefaktı olduğu
için adayları şu exact biçimde taşır:

```text
id = <anayasa köprü kimliği>
status = draft
checkedAtUtc = null
humanReviewRequired = true
officialTymmValue = false
```

Bir URL'nin bulunması doğrulama değildir. Her kullanım kaynak, dönem, yöre,
varyant, yaş uyarlaması ve çoğulculuk bakımından yetkili sicilde incelenmedikçe
`verified` yapılamaz.

## 7. Orman Okulu ve doğa sürekliliği

Yıllık hat yalnız `nature_based_continuity` iddiası taşır:

- aynı çekirdek çocuk grubu,
- en az 24 hafta ve en az 12 planlı oturum,
- tekrar ziyaret edilen aynı saha,
- mevsimsel dönüş ve çocuk öncüllü soru,
- bakım ve karşılıklılık,
- dinamik risk–fayda değerlendirmesi,
- gözlem–inceleme–yeniden planlama döngüsü.

Nitelikli uygulayıcı ve tanınma kanıtı bulunmadığı için Orman Okulu tanınması,
sertifikası veya resmî program iddiası kurulmaz. Tek bir doğa etkinliği bu
sürekliliği kanıtlamaz.

## 8. Hazırlanmış çevre ve Montessori köprüsü

Katman yalnız `montessori_inspired` olabilir ve `certificationClaimed=false`
kalır. Çocuk ölçeğinde erişim, gerçek yaşam işi, düzen ve yerine koyma, bağımsız
seçim, tekrar, öz düzeltme ve yetişkin müdahale eşiği içerikte somut görünmeden
salt lens etiketi uygulama kanıtı sayılmaz. Montessori okul, AMI onayı veya
sertifika iddiası kurulmaz.

## 9. İnsan inceleme kapısı

Her gerçek aylık paket aynı exact digest üzerinde altı ayrı gerçek kişi
tarafından incelenir:

1. erken çocukluk eğitimi,
2. uygulayıcı okul öncesi öğretmen,
3. çocuk hakları ve koruma,
4. TYMM programı,
5. içerik ve Türkçe dil,
6. Türk-İslam kültürü, ilahiyat ve çoğulculuk.

Bir kişi aynı pakette iki rolü imzalayamaz. Bir `red` veya çözülmemiş
`request_changes` bütün paketi bloklar. İçerik ya da manifestin bir baytı
değişirse eski karar yeni konuya taşınmaz.

## 10. Release-set üretim sırası

```text
yıllık planned profile
  → her ay için gerçek content + manifest
  → ay bazlı exact insan inceleme konusu ve karar sicili
  → 10 ayın gerçek raw/canonical özetlerini taşıyan release-set manifesti
  → yıllık release-set için ayrı altı rollü karar
  → teknik ve pilot kapıları
  → yayın tasdiki
```

Dokuz gelecek ayın gerçek dosyaları henüz yokken `null` digest taşıyan sahte bir
yıllık manifest üretilmez. Yıllık profil, hedefi kanıtlar; gerçek release-set
manifesti yalnız var olan ve doğrulanmış on aylık artefaktlardan türetilir.

## 11. Kabul kriterleri

Bir aylık paket ancak şu koşullarla makine doğrulamalı aday olabilir:

- ayın ana değer kümesi authored profile ile exact eşleşir,
- her ana değer en az bir doğrulanmış Ek-14 snapshot'ına bağlıdır,
- çatı kodu ilgili değerin anayasal `roofLinks` kümesindedir,
- destek değerleri dönem kapsamına sayılmaz,
- kültürel kullanımlar taslak veya yetkili sicille doğrulanmıştır,
- çocuk ajansı, katılmama, onarım ve karşı-kanıt yolları vardır,
- puan, rozet, karakter hükmü, inanç/ibadet profillemesi ve zorlama yoktur,
- doğa ve hazırlanmış çevre iddia sınırları korunur,
- ham içerik, manifest, kanonik payload ve kaynak zinciri özetleri doğrulanır.

Bir yıllık release-set ancak on gerçek ayın tamamı bu kapıyı geçtiğinde,
iki dönemin ana değer birleşimi exact D1–D20 olduğunda ve altı rollü karar sicili
aynı exact yıllık digest'i kabul ettiğinde yayın değerlendirmesine alınabilir.

## 12. Kanonik ilişkili kaynaklar

- `docs/DEGERLER_PEDAGOJISI_ANAYASASI.md`
- `docs/DEGERLER_FIRST_PLAN_MODELLERI.md`
- `docs/DEGERLER_INSAN_INCELEME_PROTOKOLU.md`
- `docs/TYMM_2024_2026_2027_YILLIK_PLAN_OMURGASI.md`
- `app/src/features/values/values-pedagogy-constitution.v1.json`
- `app/src/features/values/official-preschool-value-actions.v1.json`
- `premium-content/releases/tymm-6072/2026-09/content.v3.json`
- `premium-content/releases/tymm-6072/2026-09/manifest.v3.json`
