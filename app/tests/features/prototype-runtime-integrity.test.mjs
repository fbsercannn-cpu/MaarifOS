import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { resolveEvidenceWorkspace } from "../../src/features/evidence/evidence-workspace.ts";

const prototypeSource = readFileSync(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);

test("eğitim yılı yazma guardı hem enqueue hem commit anında canlı İstanbul gününü ve etkin sınıfı yeniden okur", () => {
  assert.match(prototypeSource, /assertEducationalWriteAllowedForContext\([\s\S]*new Date\(\)/);
  assert.match(
    prototypeSource,
    /const liveWorkspace = await loadTodayWorkspace\(store, \{ now \}\)/,
  );
  assert.match(
    prototypeSource,
    /await assertEducationalWriteAllowedAtCommit\(options\.educationalWrite\)/,
  );
  assert.doesNotMatch(prototypeSource, /^const currentCivilDate\s*=/m);
});

test("Kayıt Ekle gözlem seçimi chooser'ı async açılıştan önce kapatmaz ve evidence geçişini kilitler", () => {
  const captureOpenIndex = prototypeSource.indexOf("void openStudentObservation();");
  assert.notEqual(captureOpenIndex, -1);
  const captureAction = prototypeSource.slice(
    Math.max(0, captureOpenIndex - 500),
    captureOpenIndex + 100,
  );
  assert.match(captureAction, /void openStudentObservation\(\)/);
  assert.doesNotMatch(captureAction, /setCaptureMenuOpen\(false\)/);
  const observationOpen = prototypeSource.slice(
    prototypeSource.indexOf("const openStudentObservation = async"),
    prototypeSource.indexOf("const openCaptureEntry ="),
  );
  assert.match(
    observationOpen,
    /const liveEvidence = await loadEvidenceWorkspace\(store, \{ now: new Date\(\) \}\)/,
  );
  assert.match(observationOpen, /resolveObservationContext\(liveEvidence/);
  assert.match(observationOpen, /resolution\.kind === "choose-activity"/);
  assert.match(observationOpen, /await openSpontaneousObservation\(/);
  assert.match(observationOpen, /catch \(reason\) \{\s*surfaceTransitionRef\.current = null/);
});

function premiumEvidenceSnapshot(packSnapshot) {
  const snapshot = createEmptySnapshot();
  const academicYearId = "00000000-0000-4000-8000-000000009001";
  const classroomId = "00000000-0000-4000-8000-000000009002";
  const studentId = "00000000-0000-4000-8000-000000009003";
  const planId = "00000000-0000-4000-8000-000000009004";
  const activityId = "00000000-0000-4000-8000-000000009005";
  const stamp = "2026-09-15T06:00:00.000Z";
  const envelope = {
    academicYearId,
    classroomId,
    createdAt: stamp,
    updatedAt: stamp,
    civilDate: "2026-09-15",
    deletedAt: null,
    schemaVersion: 2,
  };
  const curriculumProfileSnapshot = {
    framework: "tymm",
    programLabel: "Türkiye Yüzyılı Maarif Modeli",
    catalogId: "tymm-2024-okul-oncesi-v1",
    sourceVersion: "2024.1",
    referenceOrigin: "teacher-declared",
    officialCatalogVerified: false,
  };
  snapshot.academicYears.push({
    ...envelope,
    id: academicYearId,
    name: "2026-2027 Eğitim Yılı",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    status: "active",
  });
  snapshot.classrooms.push({
    ...envelope,
    id: classroomId,
    name: "Kurgu Premium Sınıf",
    schedule: {
      kind: "morning",
      startTime: "08:30",
      endTime: "12:30",
      timeZone: "Europe/Istanbul",
    },
    curriculumProfileSnapshot,
  });
  snapshot.settings.push({
    ...envelope,
    id: "00000000-0000-4000-9000-000000000002",
    settingType: "active-classroom-selection",
  });
  snapshot.students.push({
    ...envelope,
    id: studentId,
    displayName: "Kurgu Çocuk",
  });
  const provenance = {
    sourceWeeklyPlanId: "00000000-0000-4000-8000-000000009006",
    sourceContentPackSnapshot: packSnapshot,
  };
  snapshot.plans.push({
    ...envelope,
    ...provenance,
    id: planId,
    planType: "daily",
    title: "Premium günlük plan",
    curriculumProfileSnapshot,
  });
  snapshot.activities.push({
    ...envelope,
    ...provenance,
    id: activityId,
    planId,
    title: "Premium etkinlik",
    startTime: "09:00",
    status: "in_progress",
    curriculumProfileSnapshot,
    curriculumTargets: [],
    studentIds: [studentId],
    assignmentMode: "selected-students",
  });
  snapshot.observations.push({
    ...envelope,
    id: "00000000-0000-4000-8000-000000009007",
    planId,
    activityId,
    studentIds: [studentId],
    rawText: "Çocuk iki parçayı yan yana getirdi.",
    rawTextImmutable: true,
    observedAt: "2026-09-15T06:10:00.000Z",
    observationType: "quick-note",
  });
  return snapshot;
}

test("premium kanıt provenance'ı exact target pack'i taşır; eksik alanı premium olmamış gibi geçirmez", () => {
  const pack = {
    sku: "maarifos-premium",
    contentReleaseId: "release-2026-09",
    id: "pack-2026-2027",
    version: "1.0.0",
    manifestDigest: `sha256:${"a".repeat(64)}`,
    academicRelease: "2026-2027",
  };
  const valid = resolveEvidenceWorkspace(
    premiumEvidenceSnapshot(pack),
    new Date("2026-09-15T09:00:00.000Z"),
  );
  assert.deepEqual(valid.activities[0].premiumProvenance, {
    status: "verified",
    pack,
  });
  assert.deepEqual(valid.pendingObservations[0].premiumProvenance, {
    status: "verified",
    pack,
  });

  const invalid = resolveEvidenceWorkspace(
    premiumEvidenceSnapshot({ ...pack, manifestDigest: "" }),
    new Date("2026-09-15T09:00:00.000Z"),
  );
  assert.deepEqual(invalid.activities[0].premiumProvenance, {
    status: "invalid",
    pack: null,
  });
  assert.deepEqual(invalid.pendingObservations[0].premiumProvenance, {
    status: "invalid",
    pack: null,
  });
});

test("plan commit başarısı refresh hatasından ayrılır ve duplicate retry yerine dürüst yenileme sunar", () => {
  assert.match(prototypeSource, /let refreshed:[\s\S]*refreshD1Workspaces\(\)[\s\S]*catch \{/);
  assert.match(
    prototypeSource,
    /const refreshedActivity = refreshed\?\.evidence\.activities\.find\([\s\S]*const committedReadRequiresRefresh =[\s\S]*!refreshedActivity/,
  );
  assert.match(prototypeSource, /Aynı planı yeniden kaydetmeyin, cihaz verilerini yenileyin/);
  assert.match(prototypeSource, /Aynı değişikliği yeniden kaydetmeyin, cihaz verilerini yenileyin/);
  assert.match(prototypeSource, /Cihaz verilerini yenile/);
  assert.doesNotMatch(
    prototypeSource,
    /const refreshed = await refreshD1Workspaces\(\);\s*if \(command\.civilDate/,
  );
  assert.doesNotMatch(prototypeSource, /Kaydedilen etkinlik yeniden açılamadı/);
});

test("gözlem commit başarısı refresh sonucundan ayrılır; form kapanışı duplicate retry çağrısı üretmez", () => {
  const actionsSource = prototypeSource.slice(
    prototypeSource.indexOf("const evidenceFlowActions: EvidenceFlowActions"),
    prototypeSource.indexOf("confirm: async (observation"),
  );
  assert.match(actionsSource, /verifyCommittedObservationRefresh\(/);
  assert.match(actionsSource, /setObservationRefreshNotice\(/);
  assert.match(
    actionsSource,
    /Aynı gözlemi yeniden kaydetmeyin, cihaz verilerini yenileyin/,
  );
  assert.match(
    actionsSource,
    /Aynı gözlemleri yeniden kaydetmeyin, cihaz verilerini yenileyin/,
  );
  assert.doesNotMatch(actionsSource, /Kaydedilen gözlem notu yeniden açılamadı/);
  assert.match(prototypeSource, /data-testid="observation-refresh-notice"/);
});

test("gözlem yenileme CTA'sı exact commit kimliklerini yeniden doğrular ve yalnız verified sonuçta kapanır", () => {
  const noticeSource = prototypeSource.slice(
    prototypeSource.indexOf('data-testid="observation-refresh-notice"'),
    prototypeSource.indexOf("<BottomSheet", prototypeSource.indexOf('data-testid="observation-refresh-notice"')),
  );
  assert.match(
    noticeSource,
    /verifyCommittedObservationRefresh\(\s*notice\.committedObservationIds/,
  );
  assert.match(
    noticeSource,
    /if \(refresh\.status === "verified"\) \{[\s\S]*setObservationRefreshNotice\(null\)/,
  );
  assert.match(
    noticeSource,
    /committedObservationIds:\s*refresh\.committedObservationIds/,
  );
  assert.match(noticeSource, /refresh\.reason === "read-failed"/);
  assert.doesNotMatch(
    noticeSource,
    /refreshD1Workspaces\(\)\s*\.then\(\(\) => \{\s*setObservationRefreshNotice\(null\)/,
  );
});

test("gece yarısı plan durumu modül yükleme gününden değil commit anındaki İstanbul gününden türetilir", () => {
  assert.match(prototypeSource, /const commitNow = new Date\(\)/);
  assert.match(prototypeSource, /commitCivilDate = civilDateInIstanbul\(commitNow\)/);
  assert.match(
    prototypeSource,
    /command\.civilDate === commitCivilDate \? "in_progress" : "planned"/,
  );
  assert.doesNotMatch(prototypeSource, /command\.civilDate === bootstrapCivilDate/);
});
