# Değerler-First Plan Modelleri

**Durum:** Kanonik uygulama sözleşmesi, sürüm 1.0
**Üst norm:** `DEGERLER_PEDAGOJISI_ANAYASASI.md`
**Öncelik:** Değerler eğitimi, planların ek alanı değil bütün plan zincirinin işletim sistemidir.

## 1. Değişmez iz

Her plan ve uygulama kaydı aşağıdaki izi korur:

```text
resmî program profili ve kaynak snapshot'ı
  -> birincil değer + çatı değer ankrajı + en çok iki destekleyici değer
  -> resmî okul öncesi eylem kodu snapshot'ı
  -> yaşa ve bağlama uygun yaşantı / ikilem
  -> yetişkinin model oluşu + çocuğun gerçek seçimi
  -> gözlenen eylem + çocuk sesi + ihtiyaç duyulan destek
  -> onarma / katkı / aile-toplum-doğa aktarımı
  -> öğretmen yansıtması
  -> sonraki plan kararı
```

Değer, program hedefi ve pedagojik lens farklı eksenlerdir:

- **Değer:** Neyi yaşamayı ve hangi eylemi desteklediğimizi söyler.
- **Resmî program:** Hangi TYMM veya EÇE kazanım/çıktı ontolojisinin kullanıldığını söyler.
- **Yazarlı şablon lensi:** Ortamı, yetişkin rolünü, materyali ve ifade yolunu
  tasarımda değiştirir; resmî kodu veya değeri değiştiremez.
- **Öğretmen lens tercihi:** Yalnız öğretmenin inceleme/uyarlama niyetini
  kaydeder; uygulanmış yöntem veya şablon dönüşümü değildir.

## 2. Ortak veri tipleri

```text
ValuePlanMapping
  designDirection: learning_outcome_led | value_led
  primaryValueCode: D1..D20
  roofValueCode: D1 | D14 | D16
  supportingValueCodes: D1..D20[]          // 0..2, benzersiz
  officialActionSnapshots[]                // kod + metin + kaynak sürümü + sayfa
  culturalBridgeIds[]                      // 0..2; anayasadaki köprülerden, resmî değer kodu değildir
  rationale
  livedContextOrDilemma
  adultModelActions[]
  childAgencyOptions[]
  repairOrContributionOptions[]
  familyCommunityTransfer?
  natureStewardshipTransfer?
  observationPrompts[]
  counterEvidencePrompt
  reflectionPrompt
  nextPlanDecisionRule

TeacherLensPreference
  teacherPreferredLensId
  teacherPreferredSupportingLensIds[]      // 0..2, benzersiz
  lensSelectionMode: preference_only
```

Her mapping bir ana değer taşır. Destekleyici değerler içeriği kalabalıklaştırmak için kullanılamaz. `roofValueCode`, ana değer çatı değer değilse pedagojik bağın hangi çatı altında kurulduğunu gösterir; üç çatı değer otomatik olarak her etkinliğe yapıştırılmaz.

Yazarlı etkinlik şablonundaki `primaryLensId` ve `supportingLensIds` sürümlü,
değişmez authored lens alanlarıdır. Öğretmenin plan zincirindeki kayıtları yalnız
`TeacherLensPreference` alanlarını kullanır. Tercih değişikliği şablon metnini,
çevreyi, materyali veya yetişkin rolünü otomatik değiştirmez; uygulama iddiası
değildir. Eski plan kayıtlarındaki `primaryLensId` ve `supportingLensIds` yalnız
legacy uyumlulukla okunup yeni tercih alanlarına göçürülür; yeni plan yazımında
kullanılmaz. Bu kural şablonun aynı adlı authored alanlarını kaldırmaz.
Yıllık/aylık/haftalık tercih güncellemesi yalnız sonraki seçimlere yön verir;
daha önce oluşturulmuş günlük plan ve etkinlik, oluşturulma anındaki
`teacherPreferred*` tercih snapshot'ını birlikte ve değişmez tarihsel provenans
olarak korur. Günlük plan ile ona bağlı etkinlik tercihi her zaman birebir aynıdır.

## 3. Yıllık Değerler Planı

```text
AnnualValuesPlan
  academicRelease
  programProfileId
  valueCatalogSnapshot
  terms[]
  monthlyCoverageTargets[]
  roofBalanceRationale
  culturalCalendarAnchors[]
  forestContinuityCycles[]
  familyCommunityPartnershipPrinciples[]
  inclusionAndSafeguardReview
  approvalLedger[]
```

Kabul koşulları:

1. Her dönemde `D1..D20` değerlerinin tamamına en az bir kez yer verilir.
2. Kapsama, bir değer adının takvime yazılmasıyla değil en az bir eylem kodu ve yaşantı niyetiyle oluşur.
3. Saygı, sorumluluk ve adalet yıl boyunca dengeli çatı ankrajı oluşturur; aynı değer bütün aylara mekanik olarak kopyalanmaz.
4. Millî ve dinî günler, yerel kültür, aile ve doğa döngüleri takvimde bağlam olabilir; çocuğun ritüel katılımı veya ailesinin inancı değerlendirme nesnesi olamaz.
5. TYMM ve EÇE yıllık planları aynı değer adlarını kullansalar bile ayrı program snapshot'ları taşır.

## 4. Aylık Değerler Planı

```text
MonthlyValuesPlan
  monthKey
  selectedValueCodes[]                     // en az 4
  primaryContextByValue{}
  officialActionSnapshotsByValue{}
  weeklyDistribution[]
  familyCommunityInvitations[]
  natureAndPlaceConnections[]
  coverageStatus: planned | observed | reviewed
  uncoveredValueRisk[]
```

Kabul koşulları:

- Her ay en az dört resmî değer seçilir.
- Seçilen her değer için en az bir somut bağlam, resmî eylem snapshot'ı ve gözlem niyeti bulunur.
- Ay sonu değerlendirmesi “değer kazanıldı” hükmü üretmez; hangi ortamların hangi eylemleri kolaylaştırdığı ve sonraki ay hangi desteğin gerektiğini kaydeder.
- Aile katılımı davettir; cevap vermemek çocuk veya aile için eksiklik sayılmaz.

## 5. Haftalık Plan

```text
WeeklyValuesPlan
  weekId
  focusValueCodes[]                         // 1..3
  repeatedActionOpportunities[]
  routineAndTransitionOpportunities[]
  plannedActivities[]
  responsiveMomentPolicy
  observationSamplingPlan
  repairAndContributionOpportunity
  weeklyReflection
  nextWeekDecision
```

Bir değerin haftalık planda yer alması için yalnız planlı etkinlik yetmez; karşılama, yemek, sıra bekleme, malzeme toplama, anlaşmazlık, açık hava ve vedalaşma gibi gündelik akışlarda da yaşanabilir fırsat tanımlanır.

## 6. Günlük Plan

```text
DailyValuesPlan
  civilDate
  plannedValueOpportunities[]
  routineValueOpportunities[]
  childInitiatedOpportunities[]
  adultLanguageAndModel[]
  inclusionAlternatives[]
  safetyAndSensitivityTags[]
  observationCapacity
```

Günlük plan çocuğu “doğru davranmaya” zorlayan senaryo kurmaz. Öğretmen gerçek hayat fırsatını görür, model olur, seçenek sunar ve gerektiğinde eş düzenleme sağlar. Bir çocuğun o gün gözlenmemesi başarısızlık değildir.

## 7. Etkinlik Planı

Her etkinlik `ValuePlanMapping` taşır ve iki resmî tasarım yönünden birini açıklar:

- `learning_outcome_led`: Önce öğrenme çıktısı seçilir; değer ve eylem çıktıyla doğrudan ilişkilendirilir.
- `value_led`: Önce değer ve eylem seçilir; öğrenme çıktılarından yaşantıyı zenginleştirmek için yararlanılır.

Ek kabul koşulları:

1. Tam bir ana değer, bir çatı ankrajı ve en fazla iki destekleyici değer bulunur.
2. En az bir resmî eylem kodu, kaynak sürümüyle snapshot alınır.
3. Yetişkin rolü emir/telkin listesinden ibaret olamaz; model olma ve dinleme eylemi içerir.
4. Çocuğa katılma, farklı yolla ifade etme ve gerektiğinde geri çekilme imkânı verilir.
5. Değer, bir onarma veya gerçek katkı davranışına bağlanır; rozet, puan ve ödül rekabetiyle ölçülmez.
6. Yazarlı şablon lensi ortam/yetişkin/materyal/ifade alanında görünür tasarım
   farkı üretir; değer ve program kodlarını değiştiremez. Öğretmenin
   `preference_only` tercihi bu farkın sınıfta uygulandığı anlamına gelmez.

## 8. Gözlem ve Değer Kanıtı

```text
ValueEvidenceLink
  observationId
  activityValueMappingId?
  observedContext
  rawObservedAction
  childVoice?
  officialActionCode?
  evidenceRole: supports | contrasts | context_only
  supportProvided?
  teacherInterpretation?
  teacherConfirmed
  confirmedAt
```

Kurallar:

- Ham gözlem değişmez; değer bağlantısı ayrı ve öğretmen onaylıdır.
- Tek olaydan karakter, kişilik veya “değeri kazandı/kazanmadı” sonucu çıkarılmaz.
- Destekleyen, çelişen ve bağlam dışı kanıtlar birlikte korunur.
- “İyi/kötü çocuk”, “uslu”, “saygısız”, “tembel”, “günahkâr”, “inançsız” gibi etiketler yayın ve rapor kapısında reddedilir.
- Değer puanı, çocuk sıralaması, aile karşılaştırması ve otomatik ahlak profili üretilmez.

## 9. Haftalık ve Aylık Değerlendirme

Değerlendirme çocuğu hükme bağlamaz; planı değerlendirir:

1. Hangi bağlamlarda eylem görüldü?
2. Hangi çocuklar hangi katılım yolunu kullandı?
3. Yetişkinin modeli ve ortam düzeni neyi kolaylaştırdı veya zorlaştırdı?
4. Çelişen kanıt ya da gözlenmeyen alan var mı?
5. Onarma, katkı, aile veya doğa aktarımı gerçekleşti mi?
6. Sonraki planda ne tekrar edilecek, ne değiştirilecek, hangi destek azaltılıp artırılacak?

## 10. Aile ve Toplum Planı

```text
FamilyCommunityValuesPlan
  valueCodes[]
  invitationPurpose
  optionalParticipation: true
  homeLanguageOptions[]
  equivalentParticipationPaths[]
  privacyBoundary
  noFamilyAssessment: true
  communityPartnerSafeguards[]
```

Türk-İslam kültüründeki aile bağı, sıla-i rahim, komşuluk, misafirperverlik, vakıf/imece ve paylaşma gelenekleri yaşantı kaynağı olabilir. Aile yapısı, mezhep, ibadet, giyim, ekonomik imkân veya etkinliğe katılım düzeyi değer göstergesi sayılmaz. Aile bütünlüğü zararı, ihmali veya çocuğun yardım istemesini susturmak için kullanılamaz.

## 11. Orman Okulu ve Doğa Süreklilik Planı

Tek bir gezi “Orman Okulu” sayılmaz. Aşağıdaki kayıt yalnız dürüst bir
`nature_based_continuity` planını tarif eder; tek başına Orman Okulu tanınması,
sertifikası veya program yeterliği oluşturmaz:

```text
ForestContinuityPlan
  cohortId
  siteId
  cadence
  dateRange
  seasonalReturnPoints[]
  placeRelationshipQuestions[]
  childLedInquiryThreads[]
  careAndReciprocityCommitments[]
  dynamicRiskBenefitReviews[]
  accessibilityRoutes[]
  weatherAndEmergencyRules[]
  longitudinalEvidencePlan
  qualifiedPracticeBoundary
```

Doğadaki değer hattı yalnız “çevreyi seviyorum” cümlesi değildir: canlıya zarar vermeme, suyu ve malzemeyi israf etmeme, ortak alanı temiz bırakma, riskte kendini ve arkadaşını gözetme, aynı yere tekrar dönme, bakım verme ve doğadan alınana karşılık katkı sunma eylemleri aranır.

`recognised_or_certified_forest_school` iddiası serbest metin veya yerel belge
kimliğiyle kurulamaz. Yetkili sicil doğrulaması ürün akışına bağlanana kadar bu
seviye fail-closed kapalıdır. Kaynak gösterilen temel çerçeve Forest School
Association'ın altı ilkesidir; aynı çekirdek grup, uzun dönem, nitelikli lider,
risk–fayda, gözlem–uyarlama ve doğal alan ilişkisi birlikte aranır.

## 12. Hazırlanmış Çevre / Montessori Esinli Plan

```text
PreparedEnvironmentValuesPlan
  environmentArea
  realLifeWork
  childSizedAccess
  orderAndReturnSequence
  independentChoice
  careOfSelfOthersEnvironment
  adultObservationThreshold
  interventionAndGraceCourtesyNotes[]
```

Bu plan bağımsızlığı yalnız “tek başına yapma” olarak görmez. Emanet, düzen, öz bakım, başkasının alanına saygı, işi tamamlama, malzemeyi yerine koyma ve ortak çevreye özen değerler hattına bağlanır. Montessori veya AMI sertifika/program iddiası yapılmaz.

## 13. Kültürel ve Dinî Bağlam Planı

Kültürel ankraj; hikâye, atasözü, mimari, zanaat, musikî, yerel kişi, millî gün veya dinî gün olabilir. Her ankraj şu alanları taşır:

```text
CulturalAnchor
  id, type, title, culturalContext
  sourceUrls[], sourceVersion, sourceSha256, rightsStatus
  ageAppropriateFraming
  valueCodes[]
  participationOptional: true
  equivalentExpressionPaths[]
  beliefAndPrivacyBoundary
  representationRisks[]
  provenanceStatus: draft | verified
  reviewEvidence{reviewerRole, reviewerActorId, reviewDecisionId, reviewedAt}
```

Emanet, kul hakkı, merhamet, edep/nezaket, helal emek, şükür-kanaat ve israftan kaçınma gibi Türk-İslam ahlak köprüleri davranış bağlamıdır; resmî TYMM kodu gibi sunulmaz. İbadet performansı, dinî bilgi seviyesi veya ritüel katılımı değer kanıtı değildir.
Bir URL'nin varlığı veya sözlü kaynak rolü `verified` statüsü üretmez. Bu statü,
tam kaynak kimliği ile bağımsız R6 kararını aynı kayıt üzerinde çözen yetkili
inceleme sicili olmadan verilemez; çözümleyici yoksa bağlam `draft` kalır.

## 14. Yayın kapıları

Bir plan veya içerik aşağıdaki koşullardan biri varsa yayımlanamaz:

- Değer kodu/eylem kaynağı eksik veya program profilleri karışmışsa
- Aylık en az dört değer ya da dönemlik D1–D20 kapsamı sağlanmıyorsa
- Etkinlik birden fazla ana değer veya ikiden fazla destekleyici değer taşıyorsa
- Yaş uyarlaması, katılım alternatifi veya mahremiyet sınırı yoksa
- Çocuk/ailenin inancı, ritüeli, aile biçimi veya ekonomik durumu puanlanıyorsa
- Saygı kör itaate, sabır zarara katlanmaya, mahremiyet tehlikeli sırrı saklamaya, aile bütünlüğü susmaya, vatanseverlik başka halkları küçümsemeye dönüştürülüyorsa
- Ham gözlem ile yorum ayrılmıyorsa veya tek olaydan kişilik hükmü çıkarılıyorsa
- Orman Okulu adı süreklilik ve nitelikli uygulama kanıtı olmadan kullanılıyorsa
- Yazarlı şablonda lens değişikliği yalnız metadata değiştiriyor ve gerçek
  tasarım farkı üretmiyorsa; öğretmenin `preference_only` değişikliği ise
  uygulanmış yöntem diye sunuluyorsa

## 15. Kaynak otoritesi

- [MEB Türkiye Yüzyılı Maarif Modeli — Erdem-Değer-Eylem Çerçevesi](https://tymm.meb.gov.tr/beceriler/erdem-deger-eylem-cercevesi)
- [MEB 2024 Okul Öncesi Eğitim Programı](https://tymm.meb.gov.tr/upload/program/2024programokuloncesiOnayli.pdf), özellikle s. 107–109 ve Ek-14
- [Forest School Association — tam ilkeler ve iyi uygulama ölçütleri](https://forestschoolassociation.org/full-principles-and-criteria-for-good-practice/)
- [Association Montessori Internationale — Montessori ortamları](https://montessori-ami.org/about-montessori/montessori-environments)
