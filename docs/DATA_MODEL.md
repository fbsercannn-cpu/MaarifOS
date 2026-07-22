# Veri Modeli

Tüm tablolarda `id`, `createdAt`, `updatedAt`, `deletedAt?`, `schemaVersion` bulunur.

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

## Student
- id
- classroomId
- displayName
- optionalCode
- birthDate? 
- profileMediaId?
- active
- notes?

## AttendanceRecord
- id
- studentId
- date
- status: present | absent | late | early_leave | partial
- arrivalTime?
- departureTime?
- reasonTag?
- note?

Aynı öğrenci ve gün için tek ana kayıt bulunur; giriş/çıkış olayları ayrı `AttendanceEvent` olarak tutulabilir.

## Observation
- id
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

## ObservationRevision
- id
- observationId
- previousRawText
- changedAt
- reason?

## Activity
- id
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

- Observation: studentIds + observedAt
- AttendanceRecord: studentId + date
- MediaAsset: studentIds + capturedAt
- Activity: date
- Plan: date
- Full-text benzeri arama için normalize edilmiş metin alanları
