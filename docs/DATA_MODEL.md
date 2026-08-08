# Veri Modeli

Tüm tablolarda `id`, `createdAt`, `updatedAt`, `deletedAt?`, `schemaVersion` bulunur.

Öğretmen verisine ait `Student`, `AttendanceRecord`, `Observation`, `Activity`,
`Plan` ve günlük yoklama-tamamlanma ayarları ayrıca `classroomId` ile
`academicYearId` taşır. Aktif ekranlar yalnız iki alanı da aktif sınıf kapsamıyla
eşleşen kayıtları okur ve değiştirir.

Kapsamsız eski kayıtlar sistemde tek geçerli sınıf varsa kimlikleri ve ham
içerikleri korunarak bu sınıfa atanır. Birden çok sınıf varsa aktif sınıf geçmiş
verinin kanıtı sayılmaz; kesin öğrenci ilişkisinden kapsam türetilemiyorsa kayıt
silinmeden `legacyAssignmentStatus: needs-review` ile karantinaya alınır.

## AcademicYear
- id
- name
- startDate
- endDate
- status: active | archived

## Classroom
- id
- academicYearId
- name
- ageGroup: 36-48 | 48-60 | 60-72 | mixed
- teacherName
- schoolName
- curriculumProgram
- curriculumCatalogLabel
- schedule
  - kind: morning | afternoon | full_day | custom
  - startTime
  - endTime
  - timezone: Europe/Istanbul

`schedule`, günlük planın geçici bir tercihi değildir. Eğitim yılına bağlı sınıf
kurulumunun parçasıdır; Bugün ekranı bu bilgiyi yalnız bağlam olarak gösterir.
Değişiklik sınıf ayarlarından yapılır. Ayar yoksa uygulama sabahçı/öğleci/tam gün
tahmini üretmez ve sınıfı `not_configured` olarak açar.

## Student
- id
- classroomId
- academicYearId
- enrollments[]
  - id
  - classroomId
  - academicYearId
  - startedOn
  - endedOn?
  - status: active | left | completed | transferred
- firstName
- lastName
- displayName (`firstName + lastName` geriye uyumlu birleşik görünümü)
- optionalCode
- birthDate? 
- profileMediaId?
- active
- notes?
- contacts?
  - name?
  - relationship
  - phone (`+905XXXXXXXXX` kanonik saklama; arayüzde `05XX XXX XX XX`)

`Student.id`, çocuğun yıllar boyunca değişmeyen kimliğidir. Sınıftan ayrılma
veya eğitim yılı kapanışı kök öğrenci kaydını silmez. Yıllık sınıf üyelikleri
`enrollments` içinde eklemeli geçmiş olarak tutulur. Normal yıl sonu üyeliği
`completed`, yıl içi ayrılma `left` yapar. Aynı öğrenci yeni yılda aynı `id` ile
yeni bir `active` üyelik alır.

Eski yalnız `displayName` taşıyan kayıtlar son sözcük soyadı kabul edilerek
geriye uyumlu okunur; öğretmen profilde adı ve soyadı ayrı alanlarda doğrular.
Öğrenci araması ad, soyad, birleşik ad ve tercih edilen adda Türkçe
büyük/küçük harf ile diakritik işaretlerden bağımsız çalışır.

## AttendanceRecord
- id
- studentId
- classroomId
- academicYearId
- date
- status: present | absent | late
- events[]?
  - id
  - schemaVersion: 1
  - type: check_in | check_out | early_departure | partial_day | excuse
  - occurredAtUtc
  - civilDate
  - localTime?
  - reason?
  - teacherNote?
  - partialDayPeriod?: morning | afternoon | custom
  - fromLocalTime?
  - toLocalTime?
- `_MUKERRER_INCELE`?
- duplicateOf?

Aynı öğrenci ve gün için tek ana kayıt seçilir. Giriş, çıkış, erken ayrılma, kısmi gün
ve mazeret bilgileri ana kaydın sürümlü `events` dizisinde eklemeli olaylar olarak
tutulur. Olay zamanı UTC ve İstanbul sivil günü birlikte taşınır. Olay alanı olmayan
N-1 kayıtları geriye uyumlu kabul edilir.

### Alpha uygulama sözleşmesi

Mevcut Alpha akışında günlük yoklama, öğrencinin üzerinde geçici bir alan olarak
değil `attendanceRecords` koleksiyonunda `studentId + civilDate` anahtarıyla
saklanır. Desteklenen durumlar `present | late | absent` değerleridir. Aynı gün
için güncelleme mevcut kaydın `id` ve `createdAt` değerlerini korur. Aynı
öğrenci/gün için birden fazla kayıt bulunursa hiçbir kayıt silinmez; en güncel
kayıt ana kayıt seçilir, diğerleri `_MUKERRER_INCELE` ve `duplicateOf` ile
CS-001 incelemesine alınır. Günün tamamlanma durumu da `settings` içinde
`attendance-day-completion` türünde ve kendi `civilDate` değeriyle tutulur.

Eski `students.attendanceStatus` alanı kendi kayıtlı `civilDate` gününe atomik
olarak taşınır; günlük kayıt başarıyla yazılmadan legacy alan kaldırılmaz ve
başka bir günün durumu bugüne devredilmez. Açık kalan uygulama İstanbul gün
sınırında veya yeniden görünür olduğunda yeni günlük defteri yükler.
Saat, neden ve öğretmen notu olay düzeyinde doğrulanır. Geçersiz veya bozuk olay
restore başlamadan reddedilir; aynı öğrenci/gün mükerrerleri silinmez, CS-001
uyarınca `_MUKERRER_INCELE` ile korunur.

## Observation
- id
- classroomId
- academicYearId
- studentIds[]
- observedAt
- rawText
- context?
- tone: positive | support_needed | neutral
- developmentDomains[]
- maarifRefs[]
- activityId?
- planId?
- mediaIds[]
- useFlags
  - portfolioCandidate
  - parentMeeting
  - termReport
- privacyLevel
- authorId

`schemaVersion: 2` ham gözlem create-only kanıttır. `rawTextImmutable: true`,
tek `studentId`, `planId` ve `activityId` zorunludur. Boşluklar dâhil ham metin
aynen korunur; program bağlantısı veya değerlendirme metni gözlem kaydının içine
yazılmaz.

Hızlı Gözlem 2.0 kayıtları ayrıca şu nötr sınıflandırmaları taşır:

- `observationType`: `quick-note | child-quote | anecdotal | systematic`
- `observationTaxonomyVersion: maarifos-observation-v2`
- `observationCategories[]`: `language-communication | cognitive-learning |
  social-emotional | values-dispositions-participation |
  physical-motor-health | self-care-daily-life | art-creativity |
  play-participation | interest-attention-curiosity | other`
- `context?`
- `childQuote?`
- toplu işlemde `batchId` ve `captureScope: selected-children`

Bu alanlar öğretmen kanıtını düzenlemek içindir; başarı, tanı veya gelişim hükmü
üretmez. `rawText`, `context` ve `childQuote` final kayıtta öğretmenin girdiği
biçimiyle korunur.

## QuickObservationDraft

Hızlı gözlem formunun otomatik taslağı `settings` koleksiyonunda
`settingType: quick-observation-draft` ve `schemaVersion: 1` ile tutulur:

- `studentId`
- `classroomId`
- `academicYearId`
- `planId`
- `activityId`
- `rawText`
- `context`
- `childQuote`
- `observationType`
- `categoryIds[]`
- toplu taslaklarda `batchId` ve `captureScope: selected-children`

Taslaklar öğrenci ve aktif sınıf kapsamına göre birbirinden yalıtılır. Final
gözlem ile taslağın kapanış kaydı aynı yerel veritabanı işlemi içinde yazılır;
gözlem kaydı başarısızsa taslak etkin kalır. Kapanan taslak fiziksel olarak
silinmez, `deletedAt` tombstone'u ile korunur.

Toplu hızlı gözlemde de her çocuk için ayrı taslak tutulur. Bütün çocuk
taslakları tek işlemde yazılır; finalde öğrenci başına ayrı gözlem ve taslak
tombstone'ları yine tek işlemde oluşturulur. Böylece toplu kullanıcı eylemi
kanıt modelini çok-öğrencili hâle getirmez ve kısmi başarı bırakmaz.

## EvidenceCurriculumLink

- id
- observationId
- classroomId
- academicYearId
- framework: tymm | meb_2024
- catalogId
- sourceVersion
- referenceCode
- referenceTitle
- confirmationMethod: teacher-confirmed
- approvedByUserId
- confirmedAt

TYMM ile Millî Eğitim Bakanlığı 2024 Okul Öncesi Eğitim Programı farklı program
ontolojileridir. Bağlantı yalnız öğretmenin açık onayıyla, ham gözlemden ayrı ve
eklemeli kayıt olarak oluşur.

## ObservationRevision
- id
- observationId
- previousRawText
- changedAt
- reason?

## Activity
- id
- classroomId
- academicYearId
- title
- date
- description?
- planId?
- studentIds[]
- mediaIds[]
- maarifRefs[]
- curriculumTargets[]
- assignmentMode: whole-class | selected-students
- assignmentSnapshotAt
- coverageStatus: planned
- targetAssignments[]
  - studentId
  - targetId
  - referenceCode
  - status: planned
  - assignedAt

`whole-class`, işlem anındaki etkin sınıf üyelerinin sabit UUID snapshot'ıdır.
Toplu dağıtım başarı/öğrenme hükmü oluşturmaz; yalnız planlı takip açar.

## MediaAsset
- id
- blobKey
- thumbnailBlobKey
- mimeType
- originalName
- capturedAt
- studentIds[]
- activityId?
- caption?
- tags[]
- sharingFlags
  - classBulletinAllowed
  - individualReportAllowed
  - portfolioAllowed
- checksum?

## Plan
- id
- classroomId
- academicYearId
- date
- type: daily | weekly | monthly | special
- title
- content
- maarifRefs[]
- activityIds[]
- evaluationText?
- status

## MaarifReference
- id
- sourceVersion
- ageGroup
- category
- code
- title
- description?
- parentId?
- framework: tymm | meb_2024
- catalogId
- sourceUrl
- sourceCheckedOn
- catalogCompleteness: partial | complete

TYMM ve MEB 2024 türleri ayrı ontolojilerdir. Başlangıç kataloğu `partial`
olarak sunulur; tam resmî katalog olduğu iddia edilmez.

## PortfolioSelection
- id
- classroomId
- academicYearId
- studentId
- periodStart
- periodEnd
- itemType: observation
- itemId
- order
- teacherCaption?
- childReflection?
- familyContribution?
- selectedBy: teacher | teacher-child
- selectedAt

`schemaVersion: 2` portfolyo seçimi, değişmez kaynak gözlemi çoğaltmaz veya
düzenlemez; yalnız kaynak `itemId` değerine başvurur. Öğretmen yorumu, çocuğun
seçime ilişkin sözü ve aile katkısı birbirinden ayrı tutulur. Seçkiden kaldırma
`deletedAt` tombstone'u üretir. Başka çocuk, sınıf veya eğitim yılına ait kaynak
fail-closed reddedilir.

### Dinamik akademik ay görünümü

Ay klasörü kalıcı kayıt değildir. Aktif eğitim yılının `startDate`–`endDate`
aralığında ilgili çocuğa bağlı gözlem, medya veya portfolyo seçimi bulunan aylar
`YYYY-MM` anahtarıyla türetilir. Boş ay üretilmez; takvim yılı geçişi nedeniyle
`2026-09` ile `2027-01` birbirinden ayrılır.

## ReportDraft
- id
- reportType
- scope
- studentIds[]
- periodStart
- periodEnd
- selectedObservationIds[]
- selectedMediaIds[]
- editableSections
- generatedFileId?

`reportType: evidence-assessment` taslağı en az bir ham gözlem kimliğine ve
öğretmen onaylı program bağlantısına dayanır. D1 aşamasında metin öğretmen
tarafından yazılır; `authoredBy: teacher`, `teacherReviewRequired: true` ve
`reviewStatus: pending` değişmezleridir.

Kanıt düzeyi `not_assessed | not_yet | with_frequent_support |
mostly_independent | independent` değerlerinden biridir. `not_assessed`
resmî dört düzeyden ayrı teknik durumdur; ele alınmayan hedefi başarısız
saymaz. Dönem ve yıl sonu kesinleşmiş hükümleri sonraki dilimde ayrı
`AssessmentJudgment` kayıtları olarak, eski dönem snapshot'larını ezmeden
tutulacaktır. Ayrıntı: `CURRICULUM_EVIDENCE_ARCHITECTURE.md`.

## Eğitim yılı arşivi

Yıl kapanışı `AcademicYear.status = archived` ve sınıflarda
`archiveStatus = archived` üretir. Aktif sınıf seçimi kapatılır. Yoklama,
gözlem, revizyon, plan, etkinlik, medya, portfolyo ve rapor kayıtları
değiştirilmez. Kapsamı belirsiz `needs-review` kayıt varken kapanış durur.

## ExportPackage
- id
- type: ai_analysis | student_archive | class_bulletin_data
- studentIds[]
- periodStart
- periodEnd
- anonymizationMode
- includedEntityIds
- manifest
- createdFileIds[]

## NotificationRule
- id
- type
- enabled
- threshold
- scope

## BackupManifest
- backupVersion
- appVersion
- createdAt
- encryption
- entityCounts
- mediaCount
- checksums

## AuditLog
- id
- action
- entityType
- entityId
- timestamp
- metadata

## İndeksler

- Observation: academicYearId + classroomId + studentIds + observedAt
- AttendanceRecord: academicYearId + classroomId + studentId + civilDate
- MediaAsset: studentIds + capturedAt
- Activity: academicYearId + classroomId + date
- Plan: academicYearId + classroomId + date
- Full-text benzeri arama için normalize edilmiş metin alanları
