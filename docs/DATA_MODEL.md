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
- displayName
- optionalCode
- birthDate? 
- profileMediaId?
- active
- notes?

`Student.id`, çocuğun yıllar boyunca değişmeyen kimliğidir. Sınıftan ayrılma
veya eğitim yılı kapanışı kök öğrenci kaydını silmez. Yıllık sınıf üyelikleri
`enrollments` içinde eklemeli geçmiş olarak tutulur. Normal yıl sonu üyeliği
`completed`, yıl içi ayrılma `left` yapar. Aynı öğrenci yeni yılda aynı `id` ile
yeni bir `active` üyelik alır.

## AttendanceRecord
- id
- studentId
- classroomId
- academicYearId
- date
- status: present | absent | late | early_leave | partial
- arrivalTime?
- departureTime?
- reasonTag?
- note?

Aynı öğrenci ve gün için tek ana kayıt bulunur; giriş/çıkış olayları ayrı `AttendanceEvent` olarak tutulabilir.

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
`early_leave`, saatler ve neden alanları sonraki yoklama diliminde bu sözleşmeye
eklenecektir.

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

## PortfolioSelection
- id
- studentId
- periodStart
- periodEnd
- itemType
- itemId
- order
- teacherCaption?

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
