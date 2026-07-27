# Program, Kanıt ve Değerlendirme Mimarisi

## Amaç

Bu sözleşme TYMM ile MEB 2024 Okul Öncesi Eğitim Programı'nı aynı serbest
metin listesine indirgemeden şu zinciri kurar:

`program hedefi → plan → etkinlik → planlı öğrenci kapsamı → ham gözlem →
öğretmen onaylı bağ → dört düzeyli değerlendirme → dönem/yıl raporu`

Toplu işlem yalnız **planlı takip** üretir. Bir hedefin tüm sınıfa dağıtılması,
çocukların hedefi öğrendiği, gerçekleştirdiği veya başardığı anlamına gelmez.

## İki ayrı program ontolojisi

### TYMM

- Alan becerileri
- Öğrenme çıktıları
- Alt öğrenme çıktıları / süreç bileşenleri
- Kavramsal beceriler
- Sosyal-duygusal öğrenme becerileri
- Değerler
- Okuryazarlık becerileri
- Eğilimler

### MEB 2024 Okul Öncesi Eğitim Programı (EÇE)

- Bilişsel gelişim
- Sosyal-duygusal gelişim ve değerler
- Dil gelişimi
- Fiziksel gelişim ve sağlık
- Kazanımlar
- Göstergeler

Bir kayıt iki ontolojiyi veya iki katalog sürümünü karıştıramaz. Program
öğeleri kaynak adresi, katalog kimliği, sürüm ve kontrol tarihiyle snapshot
olarak plan ve etkinlikte saklanır. Katalog sonradan güncellense bile eski
planın anlamı değişmez.

## Katalog kapsamı

`app/src/features/curriculum/curriculum-catalog.ts` içindeki ilk set,
akışın güvenli biçimde uygulanması için hazırlanmış **kısmi başlangıç
setidir**; tam resmî katalog olarak sunulmaz.

Başlıca resmî kaynaklar:

- TYMM 60–72 Ay Eylül Ayı Planı:
  https://tymm.meb.gov.tr/okul-oncesi/unite/479
- TYMM Öğrenme Kanıtları:
  https://tymm.meb.gov.tr/olcme-degerlendirme
- MEB 2024 Okul Öncesi Eğitim Programı:
  https://tegm.meb.gov.tr/dosya/okuloncesi/guncellenenokuloncesiegitimprogrami.pdf
- Beceri Edinim Raporu öğretmen kılavuzu:
  https://tegm.meb.gov.tr/meb_iys_dosyalar/2025_05/30110609_beceriedinimraporu1.pdf
- Gelişim Raporu öğretmen kılavuzu:
  https://tegm.meb.gov.tr/meb_iys_dosyalar/2025_05/30110555_gelisimraporu1.pdf

Tam katalog içe aktarımı ayrı bir doğrulama işi olacaktır. Her sürümde kod ve
başlık tekilliği, ebeveyn ilişkisi, yaş grubu, kaynak bütünlüğü ve değişiklik
özeti test edilmeden `complete` olarak yayımlanamaz.

## Plan ve toplu dağıtım

Plan/etkinlik şu ek snapshot alanlarını taşır:

- `curriculumTargets[]`
- `maarifRefs[]`
- `studentIds[]`
- `assignmentMode: whole-class | selected-students`
- `assignmentSnapshotAt`
- `coverageStatus: planned`
- `targetAssignments[]`
  - `studentId`
  - `targetId`
  - `referenceCode`
  - `status: planned`
  - `assignedAt`

`whole-class`, yaşayan bir sorgu değildir. İşlem anındaki aktif sınıf
üyelerinin UUID listesi sabitlenir. Sonradan gelen çocuk geçmiş etkinliğe
otomatik eklenmez; ayrılan çocuğun tarihsel plan kaydı da silinmez.

## Gözlem ve program bağı

Ham gözlem:

- Tek çocuk, tek plan ve tek etkinliğe bağlıdır.
- `rawText` ilk kayıttan sonra değişmez.
- `context` ile etkinlik bağlamını, `childQuote` ile çocuğun özgün sözünü
  ayrı saklar.
- Etkinliğin planlı öğrenci kapsamı dışına yazılamaz.

Program bağı:

- Ham gözlemden ayrı ve eklemeli kayıttır.
- Yeni planlarda yalnız etkinlikte önceden seçilen hedeflerden kurulur.
- Öğretmenin açık onayı olmadan oluşmaz.
- Eski D1 kayıtları veri kaybı olmaması için `teacher-declared-unverified`
  fallback yolunda kalır.

## Dört düzey ve değerlendirilmeme durumu

Resmî kılavuzlardaki dört düzey:

1. Henüz gerçekleştiremedi.
2. Kısmen gerçekleştiriyor; sıklıkla destek gerekiyor.
3. Bazen hata yapsa da büyük oranda gerçekleştiriyor.
4. Bağımsız şekilde başarıyla gerçekleştiriyor.

MaarifOS ayrıca teknik `not_assessed` durumunu saklar. Bu, beşinci başarı
düzeyi değildir. Hedef dönem içinde ele alınmadıysa veya yeterli kanıt yoksa
boş/değerlendirilmemiş kalmasını sağlar; kanıt yokluğunu başarısızlık olarak
yorumlamaz.

## Dönem sonu ve yıl sonu — sonraki güvenli dilim

Tam rapor ekranından önce ayrı `AssessmentJudgment` sözleşmesi eklenecektir:

- `studentId`
- `curriculumTargetSnapshot`
- `periodId`
- `periodKind: first-term | second-term | academic-year`
- `assessmentLevel`
- `evidenceObservationIds[]`
- `teacherText`
- `generalEvaluation?`
- `reviewStatus`
- `approvedByUserId?`
- `approvedAt?`

Dönem sonu yalnız dönem içinde planlanan hedefleri gösterir. Her hüküm aynı
çocuğa ve dönem aralığına ait en az bir kanıta döner. Öğretmen ele alınmayan
hedefleri boş bırakabilir.

Yıl sonu birinci ve ikinci dönem snapshot'larını ezmez. İki dönem ile yıl
içindeki ek kanıtları yeni, sürümlü bir sentez kaydında birleştirir. Otomatik
tanı, psikolojik etiket veya kanıtsız kesin hüküm üretmez.

## Yedek, arşiv ve güvenlik kapıları

- Yeni plan hedefleri, öğrenci kapsamı ve tüm planlı atamalar yedekte korunur.
- Yetim öğrenci, hedef veya çapraz sınıf ilişkisi restore başlamadan reddedilir.
- Hatalı restore mevcut veriye yazmaz.
- Eğitim yılı kapanınca yeni plan, atama, gözlem, bağ veya değerlendirme
  yazılamaz.
- Öğrenci arşivi yalnız seçilen çocuğun çok yıllı kanıtlarını içerir.

