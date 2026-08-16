import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  closeTeacherDay,
  isTeacherDayClosureSetting,
  loadTeacherDayClosureWorkspace,
  resolveTeacherDayCarryForwardLifecycle,
  resolveTeacherDayClosureWorkspace,
  teacherDayCarryForwardSourceIdentity,
  transitionTeacherDayCarryForward,
} from "../../src/features/day-closure/teacher-day-closure.ts";

const ids = {
  academicYear: "00000000-0000-4000-8000-00000000d701",
  classroom: "00000000-0000-4000-8000-00000000d702",
  studentA: "00000000-0000-4000-8000-00000000d703",
  studentB: "00000000-0000-4000-8000-00000000d704",
  attendanceA: "00000000-0000-4000-8000-00000000d705",
  attendanceB: "00000000-0000-4000-8000-00000000d706",
  completion: "00000000-0000-4000-8000-00000000d707",
  plan: "00000000-0000-4000-8000-00000000d708",
  activity: "00000000-0000-4000-8000-00000000d709",
  observation: "00000000-0000-4000-8000-00000000d710",
  link: "00000000-0000-4000-8000-00000000d711",
};

const civilDate = "2026-08-11";
const recordTime = "2026-08-11T08:00:00.000Z";
const closeTime = new Date("2026-08-11T15:00:00.000Z");

function record(id, extra = {}) {
  return {
    id,
    academicYearId: ids.academicYear,
    classroomId: ids.classroom,
    civilDate,
    createdAt: recordTime,
    updatedAt: recordTime,
    deletedAt: null,
    schemaVersion: 1,
    ...extra,
  };
}

function configuredSnapshot({ complete = false, linked = false } = {}) {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(
    record(ids.academicYear, {
      name: "2026 Ağustos canlı öğretmen dönemi",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      status: "active",
    }),
  );
  snapshot.classrooms.push(
    record(ids.classroom, {
      name: "Kurgu Güneş Sınıfı",
      schedule: {
        kind: "full_day",
        startTime: "08:30",
        endTime: "16:30",
        timeZone: "Europe/Istanbul",
      },
    }),
  );
  snapshot.settings.push(
    record(ACTIVE_CLASSROOM_SETTING_ID, {
      settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    }),
  );
  snapshot.students.push(
    record(ids.studentA, { active: true, firstName: "Kurgu", lastName: "Ada" }),
    record(ids.studentB, { active: true, firstName: "Kurgu", lastName: "Efe" }),
  );
  if (complete) {
    snapshot.attendanceRecords.push(
      record(ids.attendanceA, { studentId: ids.studentA, status: "present" }),
      record(ids.attendanceB, { studentId: ids.studentB, status: "absent" }),
    );
    snapshot.settings.push(
      record(ids.completion, {
        settingType: "attendance-day-completion",
        attendanceCompleted: true,
      }),
    );
    snapshot.plans.push(
      record(ids.plan, {
        planType: "daily",
        title: "Bugünün kurgu planı",
        status: "active",
      }),
    );
    snapshot.activities.push(
      record(ids.activity, {
        planId: ids.plan,
        title: "Kurgu araştırma etkinliği",
        status: "completed",
      }),
    );
    snapshot.observations.push(
      record(ids.observation, {
        studentId: ids.studentA,
        studentIds: [ids.studentA],
        activityId: ids.activity,
        planId: ids.plan,
        rawText: "Kurgu çocuk iki nesneyi karşılaştırdı.",
        rawTextImmutable: true,
        observedAt: "2026-08-11T09:00:00.000Z",
      }),
    );
    if (linked) {
      snapshot.evidenceCurriculumLinks.push(
        record(ids.link, {
          observationId: ids.observation,
          referenceCode: "KB1",
          title: "Karşılaştırma",
          confirmationMethod: "teacher-confirmed",
        }),
      );
    }
  }
  return snapshot;
}

class MemoryStore {
  #snapshot;

  constructor(snapshot) {
    this.#snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.#snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((item) => [item.id, item]),
        );
        for (const item of records) byId.set(item.id, structuredClone(item));
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.#snapshot[collection] = working[collection];
      }
    }
    return result;
  }

  async readSnapshot() {
    return structuredClone(this.#snapshot);
  }

  mutate(collection, id, update) {
    this.#snapshot[collection] = this.#snapshot[collection].map((item) =>
      item.id === id ? { ...item, ...update } : item,
    );
  }

  close() {}
}

test("etkin sınıf yoksa gün sonunu fail-closed kullanılamaz gösterir", () => {
  const workspace = resolveTeacherDayClosureWorkspace(
    createEmptySnapshot(),
    civilDate,
  );

  assert.equal(workspace.status, "not-configured");
  assert.equal(workspace.evidence.expectedStudentCount, 0);
  assert.equal(workspace.latestClosure, null);
});

test("eğitim yılı başlamadan sahte kapanış işi üretmez ve kayıt yazmaz", async () => {
  const snapshot = configuredSnapshot();
  snapshot.academicYears[0].startDate = "2026-09-01";
  snapshot.academicYears[0].endDate = "2027-06-25";
  const workspace = resolveTeacherDayClosureWorkspace(snapshot, civilDate);
  assert.equal(workspace.status, "not-configured");
  assert.deepEqual(workspace.issues, []);
  assert.equal(workspace.evidence.expectedStudentCount, 0);

  const store = new MemoryStore(snapshot);
  const before = await store.readSnapshot();
  await assert.rejects(
    () => closeTeacherDay(store, {
      civilDate,
      nextDayNote: "Hazırlık döneminde kapanış yazılmamalıdır.",
      now: closeTime,
    }),
    /etkin eğitim yılı ve sınıf kapsamı/,
  );
  assert.deepEqual(await store.readSnapshot(), before);
});

test("eksikleri gerçek kayıtlarla sayar; gözlem üretmeyi zorunlu tutmaz", () => {
  const workspace = resolveTeacherDayClosureWorkspace(
    configuredSnapshot(),
    civilDate,
  );

  assert.equal(workspace.status, "open");
  assert.deepEqual(
    workspace.issues.map((issue) => issue.code),
    ["attendance-incomplete", "daily-plan-missing"],
  );
  assert.equal(workspace.evidence.observationCount, 0);
});

test("yoklama, plan, etkinlik ve program bağı tamamlanınca kapanışa hazırdır", () => {
  const workspace = resolveTeacherDayClosureWorkspace(
    configuredSnapshot({ complete: true, linked: true }),
    civilDate,
  );

  assert.equal(workspace.status, "open");
  assert.deepEqual(workspace.issues, []);
  assert.deepEqual(workspace.evidence, {
    expectedStudentCount: 2,
    attendanceMarkedCount: 2,
    attendanceCompleted: true,
    dailyPlanCount: 1,
    activityCount: 1,
    completedActivityCount: 1,
    observationCount: 1,
    pendingCurriculumLinkCount: 0,
  });
});

test("öğretmen onayı taşımayan program bağı gün kapanışını hazır göstermez", () => {
  const snapshot = configuredSnapshot({ complete: true, linked: true });
  snapshot.evidenceCurriculumLinks[0].confirmationMethod = "suggested";

  const workspace = resolveTeacherDayClosureWorkspace(snapshot, civilDate);

  assert.equal(workspace.evidence.pendingCurriculumLinkCount, 1);
  assert.deepEqual(workspace.issues.map((issue) => issue.code), [
    "curriculum-links-pending",
  ]);
});

test("aynı gün iki günlük plan varsa etkinlikler tam olsa bile kapanışı fail-closed çakışma sayar", () => {
  const snapshot = configuredSnapshot({ complete: true, linked: true });
  snapshot.plans.push(record("00000000-0000-4000-8000-00000000d712", {
    planType: "daily",
    title: "Çakışan ikinci plan",
  }));
  snapshot.activities.push(record("00000000-0000-4000-8000-00000000d713", {
    planId: "00000000-0000-4000-8000-00000000d712",
    title: "İkinci plan etkinliği",
    status: "completed",
  }));

  const workspace = resolveTeacherDayClosureWorkspace(snapshot, civilDate);
  assert.equal(workspace.evidence.dailyPlanCount, 2);
  assert.deepEqual(workspace.issues.map((issue) => issue.code), [
    "daily-plan-conflict",
  ]);
  assert.match(workspace.issues[0].detail, /2 günlük plan/);
});

test("eksik gün, öğretmen notu olmadan kapanmaz ve hiçbir kayıt yazmaz", async () => {
  const store = new MemoryStore(configuredSnapshot());

  await assert.rejects(
    closeTeacherDay(store, {
      civilDate,
      nextDayNote: "kısa",
      now: closeTime,
    }),
    /en az 10 karakterlik/,
  );
  assert.equal((await store.readSnapshot()).settings.length, 1);
});

test("eksik günü append-only yarına taşır ve aynı kapanışı idempotent döndürür", async () => {
  const store = new MemoryStore(configuredSnapshot());
  const note = "Sabah ilk iş yoklama ve günlük planı tamamlayacağım.";

  const first = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: note,
    now: closeTime,
  });
  const second = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: note,
    now: closeTime,
  });
  const snapshot = await store.readSnapshot();
  const closures = snapshot.settings.filter(isTeacherDayClosureSetting);

  assert.equal(first.closureStatus, "carried-forward");
  assert.equal(second.id, first.id);
  assert.equal(closures.length, 1);
  const tomorrow = resolveTeacherDayClosureWorkspace(snapshot, "2026-08-12");
  assert.deepEqual(tomorrow.previousCarryForward, {
    civilDate,
    note,
  });
  assert.equal(tomorrow.carryForwardItems.length, 2);
  assert.equal(
    new Set(tomorrow.carryForwardItems.map((item) => item.sourceIssueIdentity)).size,
    2,
  );
  assert.equal(tomorrow.carryForwardItems.every((item) => item.ageInDays === 1), true);
});

test("tam günü değişmez kanıt özetiyle kapatır", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );

  const closure = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });
  const workspace = await loadTeacherDayClosureWorkspace(store, { civilDate });

  assert.equal(closure.closureStatus, "complete");
  assert.equal(closure.nextDayNote, null);
  assert.match(closure.evidenceFingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(workspace.status, "closed");
  assert.equal(workspace.latestClosure?.id, closure.id);
  assert.equal(isTeacherDayClosureSetting(closure), true);
});

test("yedek kanonikleştirmesi alan sırasını değiştirse de aynı kanıt kapanışı bayatlatmaz", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );
  const closure = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });
  const reorderedEvidence = Object.fromEntries(
    Object.entries(closure.evidence).reverse(),
  );
  store.mutate("settings", closure.id, {
    evidence: reorderedEvidence,
  });

  const workspace = await loadTeacherDayClosureWorkspace(store, { civilDate });

  assert.deepEqual(workspace.latestClosure?.evidence, reorderedEvidence);
  assert.equal(workspace.status, "closed");
  assert.equal(workspace.latestClosure?.id, closure.id);
});

test("sonradan kaydolan çocuk geçmiş günün kapanışını ve parmak izini bayatlatmaz", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );
  const closure = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });
  const laterStudentId = "00000000-0000-4000-8000-00000000d799";
  await store.transaction("readwrite", ["students"], async (transaction) => {
    await transaction.putMany("students", [
      record(laterStudentId, {
        active: true,
        enrollmentStatus: "active",
        enrollmentDate: "2026-08-12",
        displayName: "Kurgu Sonradan Kayıt",
      }),
    ]);
  });

  const workspace = await loadTeacherDayClosureWorkspace(store, { civilDate });

  assert.equal(workspace.evidence.expectedStudentCount, 2);
  assert.equal(workspace.evidenceFingerprint, closure.evidenceFingerprint);
  assert.equal(workspace.status, "closed");
});

test("kapanıştan sonra kanıt değişirse eski kaydı silmeden stale işaretler", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );
  const closure = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });

  store.mutate("activities", ids.activity, {
    status: "in_progress",
    updatedAt: "2026-08-11T15:05:00.000Z",
  });
  const workspace = await loadTeacherDayClosureWorkspace(store, { civilDate });

  assert.equal(workspace.status, "stale");
  assert.equal(workspace.latestClosure?.id, closure.id);
  assert.deepEqual(
    workspace.issues.map((issue) => issue.code),
    ["activities-incomplete"],
  );
  assert.equal(
    (await store.readSnapshot()).settings.filter(isTeacherDayClosureSetting).length,
    1,
  );
});

test("aynı sayaç ve eski timestamp ile yoklama anlamı değişirse semantik parmak izi kapanışı fail-closed stale yapar", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );
  const closure = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });

  store.mutate("attendanceRecords", ids.attendanceB, {
    status: "present",
    updatedAt: recordTime,
  });
  const workspace = await loadTeacherDayClosureWorkspace(store, { civilDate });

  assert.equal(workspace.evidence.attendanceMarkedCount, 2);
  assert.deepEqual(workspace.evidence, closure.evidence);
  assert.notEqual(workspace.evidenceFingerprint, closure.evidenceFingerprint);
  assert.equal(workspace.status, "stale");
});

test("fingerprint öncesi v1 kapanış okunur fakat doğrulanmış kapalı sayılmayıp fail-closed stale olur", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );
  const closure = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });
  const legacy = { ...closure, schemaVersion: 1, evidenceFingerprint: undefined };
  store.mutate("settings", closure.id, legacy);

  assert.equal(isTeacherDayClosureSetting(legacy), true);
  assert.equal(
    (await loadTeacherDayClosureWorkspace(store, { civilDate })).status,
    "stale",
  );
});

test("gelecek takvim gününe kapanış yazmaz", async () => {
  const store = new MemoryStore(configuredSnapshot());

  await assert.rejects(
    closeTeacherDay(store, {
      civilDate: "2026-08-12",
      nextDayNote: "Açık işleri ertesi sabah tamamlayacağım.",
      now: closeTime,
    }),
    /gelecek İstanbul takvim günü/,
  );
});

test("geçmiş gün kanıtı tamamlandığında yeni append-only kapanışla uzlaştırılır", async () => {
  const store = new MemoryStore(configuredSnapshot());
  const carried = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "Yoklama ve plan kaydını ertesi gün tamamlayacağım.",
    now: closeTime,
  });
  const complete = configuredSnapshot({ complete: true, linked: true });
  await store.transaction(
    "readwrite",
    [
      "students",
      "attendanceRecords",
      "plans",
      "activities",
      "observations",
      "evidenceCurriculumLinks",
      "settings",
    ],
    async (transaction) => {
      await transaction.putMany("students", complete.students);
      await transaction.putMany("attendanceRecords", complete.attendanceRecords);
      await transaction.putMany("plans", complete.plans);
      await transaction.putMany("activities", complete.activities);
      await transaction.putMany("observations", complete.observations);
      await transaction.putMany(
        "evidenceCurriculumLinks",
        complete.evidenceCurriculumLinks,
      );
      await transaction.putMany(
        "settings",
        complete.settings.filter(
          (record) => record.settingType === "attendance-day-completion",
        ),
      );
    },
  );

  const reconciled = await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: new Date("2026-08-12T08:00:00.000Z"),
  });
  assert.notEqual(reconciled.id, carried.id);
  assert.equal(reconciled.closureStatus, "complete");
  assert.equal(reconciled.civilDate, civilDate);
  assert.equal(reconciled.closedAt, "2026-08-12T08:00:00.000Z");
  assert.equal(
    (await loadTeacherDayClosureWorkspace(store, { civilDate })).status,
    "closed",
  );
  const history = (await store.readSnapshot()).settings.filter(
    (record) => record.settingType === "teacher-day-closure",
  );
  assert.equal(history.length, 2);
  assert.equal(
    resolveTeacherDayCarryForwardLifecycle(
      await store.readSnapshot(),
      "2026-08-12",
    ).find((item) => item.sourceCivilDate === civilDate)?.state,
    "resolved",
  );
});

test("aynı kaynak eksik için çözüm geçişi append-only ve idempotenttir; çözülmüş not hayalet görev olmaz", async () => {
  const store = new MemoryStore(configuredSnapshot());
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "Yoklama ile günlük planı sabah ilk iş tamamlayacağım.",
    now: closeTime,
  });
  const sourceIssueIdentity = teacherDayCarryForwardSourceIdentity({
    academicYearId: ids.academicYear,
    classroomId: ids.classroom,
    sourceCivilDate: civilDate,
    sourceIssueCode: "attendance-incomplete",
  });
  const transitionInput = {
    sourceIssueIdentity,
    state: "resolved",
    note: "Yoklama kontrol edilerek tamamlandı.",
    now: new Date("2026-08-11T15:30:00.000Z"),
  };

  const first = await transitionTeacherDayCarryForward(store, transitionInput);
  const second = await transitionTeacherDayCarryForward(store, transitionInput);
  const snapshot = await store.readSnapshot();
  const lifecycle = resolveTeacherDayCarryForwardLifecycle(
    snapshot,
    "2026-08-12",
  );

  assert.equal(second.id, first.id);
  assert.equal(
    snapshot.settings.filter(
      (record) => record.settingType === "teacher-day-carry-forward-transition",
    ).length,
    1,
  );
  assert.equal(
    lifecycle.find((item) => item.sourceIssueIdentity === sourceIssueIdentity)?.state,
    "resolved",
  );
  assert.equal(
    resolveTeacherDayClosureWorkspace(snapshot, "2026-08-12").carryForwardItems.some(
      (item) => item.sourceIssueIdentity === sourceIssueIdentity,
    ),
    false,
  );
});

test("erteleme açık tarihe bağlanır, yaşı korunur ve sonraki çözüm önceki geçişe zincirlenir", async () => {
  const store = new MemoryStore(configuredSnapshot());
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "Günlük planı kurul toplantısından sonra tamamlayacağım.",
    now: closeTime,
  });
  const sourceIssueIdentity = teacherDayCarryForwardSourceIdentity({
    academicYearId: ids.academicYear,
    classroomId: ids.classroom,
    sourceCivilDate: civilDate,
    sourceIssueCode: "daily-plan-missing",
  });
  const deferred = await transitionTeacherDayCarryForward(store, {
    sourceIssueIdentity,
    state: "deferred",
    deferredUntilCivilDate: "2026-08-13",
    note: "Kurul sonrasına ertelendi.",
    now: new Date("2026-08-11T16:00:00.000Z"),
  });
  const due = resolveTeacherDayCarryForwardLifecycle(
    await store.readSnapshot(),
    "2026-08-13",
  ).find((item) => item.sourceIssueIdentity === sourceIssueIdentity);
  assert.equal(due?.state, "deferred");
  assert.equal(due?.ageInDays, 2);
  assert.equal(due?.isDeferredDue, true);

  const resolved = await transitionTeacherDayCarryForward(store, {
    sourceIssueIdentity,
    state: "resolved",
    note: "Plan tamamlandı.",
    now: new Date("2026-08-13T09:00:00.000Z"),
  });
  assert.equal(resolved.previousTransitionId, deferred.id);
  assert.equal(
    resolveTeacherDayCarryForwardLifecycle(
      await store.readSnapshot(),
      "2026-08-13",
    ).find((item) => item.sourceIssueIdentity === sourceIssueIdentity)?.state,
    "resolved",
  );
});

test("geleceğe ertelenen tek taşıma vadesinden önce Today önceliği üretmez", async () => {
  const snapshot = configuredSnapshot({ complete: true, linked: true });
  snapshot.plans = [];
  snapshot.activities = [];
  snapshot.observations = [];
  snapshot.evidenceCurriculumLinks = [];
  const store = new MemoryStore(snapshot);
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "Günlük planı belirlenen tarihte tamamlayacağım.",
    now: closeTime,
  });
  const sourceIssueIdentity = teacherDayCarryForwardSourceIdentity({
    academicYearId: ids.academicYear,
    classroomId: ids.classroom,
    sourceCivilDate: civilDate,
    sourceIssueCode: "daily-plan-missing",
  });
  await transitionTeacherDayCarryForward(store, {
    sourceIssueIdentity,
    state: "deferred",
    deferredUntilCivilDate: "2026-08-13",
    now: new Date("2026-08-11T16:00:00.000Z"),
  });

  const beforeDue = resolveTeacherDayClosureWorkspace(
    await store.readSnapshot(),
    "2026-08-12",
  );
  assert.equal(beforeDue.carryForwardItems[0].state, "deferred");
  assert.equal(beforeDue.previousCarryForward, null);
});

test("beş günlük aynı eksik tek sourceIssueId zincirinde kalır; çözüm ve yanlış tıklama geri açma bütün zincire yazılır", async () => {
  const store = new MemoryStore(configuredSnapshot());
  const dates = [
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
  ];
  for (const date of dates) {
    await closeTeacherDay(store, {
      civilDate: date,
      nextDayNote: "Günlük plan eksikliğini aynı açık iş zincirinde izleyeceğim.",
      now: new Date(`${date}T12:00:00.000Z`),
    });
  }
  const before = resolveTeacherDayCarryForwardLifecycle(
    await store.readSnapshot(),
    "2026-08-16",
  ).find((item) => item.issueCode === "daily-plan-missing" && item.state === "open");
  assert.ok(before);
  assert.equal(before.sourceIssueId, before.sourceIssueIdentity);
  assert.deepEqual(before.occurrenceCivilDates, dates);
  assert.equal(before.occurrenceSourceIssueIdentities.length, 5);

  const resolved = await transitionTeacherDayCarryForward(store, {
    sourceIssueIdentity: before.sourceIssueId,
    state: "resolved",
    note: "Toplu açık iş çözüldü.",
    now: new Date("2026-08-16T12:00:00.000Z"),
  });
  const afterResolve = resolveTeacherDayCarryForwardLifecycle(
    await store.readSnapshot(),
    "2026-08-16",
  ).find((item) => item.sourceIssueId === before.sourceIssueId);
  assert.equal(afterResolve?.state, "resolved");
  assert.equal(afterResolve?.occurrenceCivilDates.length, 5);
  const resolvedWorkspace = resolveTeacherDayClosureWorkspace(
    await store.readSnapshot(),
    "2026-08-16",
  );
  assert.equal(
    resolvedWorkspace.carryForwardItems.some(
      (item) => item.sourceIssueId === before.sourceIssueId,
    ),
    false,
  );
  assert.equal(
    resolvedWorkspace.resolvedCarryForwardItems.find(
      (item) => item.sourceIssueId === before.sourceIssueId,
    )?.state,
    "resolved",
  );

  const reopened = await transitionTeacherDayCarryForward(store, {
    sourceIssueIdentity: before.sourceIssueId,
    state: "reopened",
    note: "Yanlış çözüm tıklaması geri alındı.",
    now: new Date("2026-08-16T12:05:00.000Z"),
  });
  assert.equal(reopened.previousTransitionId, resolved.id);
  const afterReopen = resolveTeacherDayCarryForwardLifecycle(
    await store.readSnapshot(),
    "2026-08-16",
  ).find((item) => item.sourceIssueId === before.sourceIssueId);
  assert.equal(afterReopen?.state, "open");
  assert.equal(afterReopen?.occurrenceCivilDates.length, 5);
  const reopenedWorkspace = resolveTeacherDayClosureWorkspace(
    await store.readSnapshot(),
    "2026-08-16",
  );
  assert.equal(
    reopenedWorkspace.resolvedCarryForwardItems.some(
      (item) => item.sourceIssueId === before.sourceIssueId,
    ),
    false,
  );
});

test("stale kapanış yeniden doğrulandığında eski kaynak korunur ama taşınan iş otomatik çözülür", async () => {
  const store = new MemoryStore(
    configuredSnapshot({ complete: true, linked: true }),
  );
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: closeTime,
  });
  store.mutate("activities", ids.activity, {
    status: "in_progress",
    updatedAt: "2026-08-11T15:05:00.000Z",
  });
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "Etkinlik kapanışını sınıf sonrasında tamamlayacağım.",
    now: new Date("2026-08-11T15:06:00.000Z"),
  });
  store.mutate("activities", ids.activity, {
    status: "completed",
    updatedAt: "2026-08-11T15:08:00.000Z",
  });
  await closeTeacherDay(store, {
    civilDate,
    nextDayNote: "",
    now: new Date("2026-08-11T15:10:00.000Z"),
  });
  const snapshot = await store.readSnapshot();
  const lifecycle = resolveTeacherDayCarryForwardLifecycle(
    snapshot,
    "2026-08-12",
  );

  assert.equal(lifecycle.length, 1);
  assert.equal(lifecycle[0].issueCode, "activities-incomplete");
  assert.equal(lifecycle[0].state, "resolved");
  assert.equal(
    resolveTeacherDayClosureWorkspace(snapshot, "2026-08-12")
      .previousCarryForward,
    null,
  );
});

test("UI, backup ve Prototype entegrasyon sözleşmeleri kaynakta bağlıdır", async () => {
  const [prototype, today, backup] = await Promise.all([
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../src/features/today/TodayScreen.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../src/core/backup/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(prototype, /loadTeacherDayClosureWorkspace/);
  assert.match(prototype, /closeTeacherDay\(store/);
  assert.match(prototype, /educationalWrite: \{\}/);
  assert.match(prototype, /data-testid="day-closure-sheet"/);
  assert.match(prototype, /KeyboardTextarea[\s\S]*id="day-closure-note"/);
  assert.match(today, /data-testid="teacher-day-close"/);
  assert.match(today, /onOpenDayClosure/);
  assert.match(backup, /isTeacherDayClosureSetting/);
  assert.match(backup, /TEACHER_DAY_CLOSURE_SETTING_TYPE/);
});
