import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  classroomStudentProfileMissingFields,
  createClassroomTaskCenterSummary,
  resolveClassroomPriorityTask,
} from "../../src/features/classroom/classroom-screen-model.ts";

const students = [
  {
    id: "student-1",
    name: "Kurgu Ada Öğrencisi",
    preferredName: "Ada",
    status: "present",
    attendanceMarked: true,
  },
  {
    id: "student-2",
    name: "Kurgu Bora Öğrencisi",
    status: "late",
    attendanceMarked: true,
  },
  {
    id: "student-3",
    name: "Kurgu Ceren Öğrencisi",
    status: "present",
    attendanceMarked: false,
  },
];

const summary = {
  activeStudentCount: 3,
  presentStudentCount: 1,
  observedStudentCount: 1,
  attendanceMarkedStudentCount: 2,
  attendanceCompleted: false,
};

const completedAttendanceSummary = {
  ...summary,
  attendanceMarkedStudentCount: 3,
  attendanceCompleted: true,
};

test("sınıf kartı kimlik ve veli alanlarını ham değer göstermeden eksik sayar", () => {
  assert.deepEqual(
    classroomStudentProfileMissingFields(students[0]),
    ["doğum tarihi", "öğrenci no", "T.C. kimlik", "veli iletişimi"],
  );
  assert.deepEqual(
    classroomStudentProfileMissingFields({
      ...students[0],
      birthDate: "2020-05-10",
      optionalCode: "27",
      nationalIdentityNumber: "10000000146",
      contacts: [{ phone: "+905551112233" }],
    }),
    [],
  );
});

test("sınıf görev merkezi yoklama açığını ve çocuk bazlı gözlem izini ayrı gösterir", () => {
  const result = createClassroomTaskCenterSummary({
    summary,
    students,
    hasActiveSearch: false,
  });

  assert.deepEqual(result.attendance, {
    state: "needs-attention",
    title: "1 yoklama işareti eksik",
    detail: "3 çocuk · 1 geldi · 1 geç · 0 gelmedi",
    unmarkedStudentCount: 1,
  });
  assert.deepEqual(result.evidence, {
    state: "needs-attention",
    title: "2 çocukta gözlem izi yok",
    detail: "1/3 çocuk için en az bir gözlem kayıtlı",
    missingStudentCount: 2,
  });
});

test("arama açıkken yoklama ayrıntısı sınıf geneli gibi sunulmaz", () => {
  const result = createClassroomTaskCenterSummary({
    summary,
    students: [students[2]],
    hasActiveSearch: true,
  });

  assert.equal(result.attendance.title, "1 arama sonucunda yoklama eksik");
  assert.match(result.attendance.detail, /^1 arama sonucu/);
  assert.equal(result.attendance.unmarkedStudentCount, 1);
  assert.equal(result.evidence.missingStudentCount, 2);
});

test("boş ve izleri tamamlanmış sınıf durumları açık, kısa metin üretir", () => {
  const empty = createClassroomTaskCenterSummary({
    summary: {
      activeStudentCount: 0,
      presentStudentCount: 0,
      observedStudentCount: 0,
      attendanceMarkedStudentCount: 0,
      attendanceCompleted: false,
    },
    students: [],
    hasActiveSearch: false,
  });
  const ready = createClassroomTaskCenterSummary({
    summary: { ...completedAttendanceSummary, observedStudentCount: 3 },
    students: students.map((student) => ({
      ...student,
      attendanceMarked: true,
    })),
    hasActiveSearch: false,
  });

  assert.equal(empty.attendance.state, "empty");
  assert.equal(empty.evidence.title, "Henüz gözlem izi yok");
  assert.equal(ready.attendance.state, "ready");
  assert.equal(ready.attendance.title, "Yoklama tamamlandı");
  assert.equal(ready.evidence.title, "Her çocukta gözlem izi var");
});

test("yoklama eksik veya onay bekliyorsa diğer sınıf işlerinden önce gerçek yoklama eylemini seçer", () => {
  const incomplete = resolveClassroomPriorityTask({
    summary,
    students,
    hasActiveSearch: false,
    educationalWritesDisabled: false,
    observationCountFor: () => 0,
  });
  const waitingForConfirmation = resolveClassroomPriorityTask({
    summary: {
      ...completedAttendanceSummary,
      attendanceCompleted: false,
    },
    students: students.map((student) => ({
      ...student,
      attendanceMarked: true,
    })),
    hasActiveSearch: false,
    educationalWritesDisabled: false,
    observationCountFor: () => 0,
  });
  const inconsistentCompletedRecord = resolveClassroomPriorityTask({
    summary: {
      ...summary,
      attendanceCompleted: true,
    },
    students,
    hasActiveSearch: false,
    educationalWritesDisabled: false,
    observationCountFor: () => 0,
  });

  assert.deepEqual(incomplete, {
    kind: "open-attendance",
    title: "1 çocuğun yoklamasını tamamla",
    detail: "Eksik işaretleri gözden geçirip bugünün devam durumunu kaydet.",
    actionLabel: "Yoklamayı tamamla",
  });
  assert.equal(waitingForConfirmation.kind, "open-attendance");
  assert.equal(waitingForConfirmation.title, "Bugünün yoklamasını tamamla");
  assert.equal(waitingForConfirmation.actionLabel, "Yoklamayı tamamla");
  assert.equal(inconsistentCompletedRecord.kind, "open-attendance");
  assert.equal(inconsistentCompletedRecord.actionLabel, "Yoklamayı düzelt");
});

test("yoklama tamamlandıktan sonra öncelikli görev gerçek ekran handler'larıyla tamamlanabilecek en yakın işi seçer", () => {
  const observationCounts = new Map([
    ["student-1", 2],
    ["student-2", 0],
    ["student-3", 0],
  ]);
  const result = resolveClassroomPriorityTask({
    summary: completedAttendanceSummary,
    students,
    hasActiveSearch: false,
    educationalWritesDisabled: false,
    observationCountFor: (studentId) => observationCounts.get(studentId) ?? 0,
  });

  assert.deepEqual(result, {
    kind: "observe-student",
    studentId: "student-2",
    title: "Kurgu Bora Öğrencisi için ilk gözlemi ekle",
    detail: "Sınıftaki kanıt dağılımını dengelemek için en kritik açık iş.",
  });
});

test("boş, filtrelenmiş, salt okunur ve tamamlanmış sınıf durumları güvenli göreve düşer", () => {
  const empty = resolveClassroomPriorityTask({
    summary: {
      activeStudentCount: 0,
      presentStudentCount: 0,
      observedStudentCount: 0,
      attendanceMarkedStudentCount: 0,
      attendanceCompleted: false,
    },
    students: [],
    hasActiveSearch: false,
    educationalWritesDisabled: false,
    observationCountFor: () => 0,
  });
  const filtered = resolveClassroomPriorityTask({
    summary: completedAttendanceSummary,
    students: [],
    hasActiveSearch: true,
    educationalWritesDisabled: false,
    observationCountFor: () => 0,
  });
  const readOnly = resolveClassroomPriorityTask({
    summary: completedAttendanceSummary,
    students,
    hasActiveSearch: false,
    educationalWritesDisabled: true,
    observationCountFor: () => 0,
  });
  const complete = resolveClassroomPriorityTask({
    summary: { ...completedAttendanceSummary, observedStudentCount: 3 },
    students,
    hasActiveSearch: false,
    educationalWritesDisabled: false,
    observationCountFor: () => 1,
  });

  assert.equal(empty.kind, "add-student");
  assert.equal(filtered.kind, "clear-search");
  assert.equal(readOnly.kind, "review-profile");
  assert.equal(readOnly.studentId, "student-1");
  assert.equal(complete.kind, "export-observations");
});

test("Sınıfım yoklama CTA'sı gerçek attendance sheet handler'ına ve erişilebilir engel nedenine bağlıdır", () => {
  const screenSource = readFileSync(
    new URL("../../src/features/classroom/ClassroomScreen.tsx", import.meta.url),
    "utf8",
  );
  const prototypeSource = readFileSync(
    new URL("../../src/Prototype.tsx", import.meta.url),
    "utf8",
  );
  const simpleScreenSource = readFileSync(
    new URL(
      "../../src/features/simple-experience/SimpleClassroomScreen.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(screenSource, /onOpenAttendance: \(\) => void/);
  assert.match(
    screenSource,
    /priorityTask\.kind === "open-attendance"[\s\S]{0,160}onOpenAttendance\(\)/,
  );
  assert.match(screenSource, /disabled=\{priorityActionDisabled\}/);
  assert.match(screenSource, /priorityDisabledReasonId/);
  assert.match(
    prototypeSource,
    /attendanceMarkedStudentCount: counts\.marked,[\s\S]{0,100}attendanceCompleted/,
  );
  assert.match(
    prototypeSource,
    /onOpenAttendance=\{\(\) => changeAttendanceOpen\(true\)\}/,
  );
  assert.match(screenSource, /Bilgileri düzenle/);
  assert.match(screenSource, /Veli \/ yakınlar/);
  assert.match(screenSource, /onOpenProfile\(student\.id, "details"\)/);
  assert.match(screenSource, /onOpenProfile\(student\.id, "contacts"\)/);
  assert.match(simpleScreenSource, /Bilgileri düzenle/);
  assert.match(simpleScreenSource, /Veli \/ yakınlar/);
  assert.match(
    simpleScreenSource,
    /onOpenProfile\([\s\S]{0,80}student\.id,[\s\S]{0,40}"details",[\s\S]{0,80}event\.currentTarget/,
  );
  assert.match(
    simpleScreenSource,
    /onOpenProfile\([\s\S]{0,80}student\.id,[\s\S]{0,40}"contacts",[\s\S]{0,80}event\.currentTarget/,
  );
});
