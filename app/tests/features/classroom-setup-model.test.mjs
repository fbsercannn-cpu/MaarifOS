import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  classroomSetupReadiness,
  classroomSetupSectionAvailable,
  nextClassroomSetupSection,
  previousClassroomSetupSection,
} from "../../src/features/onboarding/classroom-setup-model.ts";

const completeInput = {
  classroomName: "Güneş Sınıfı",
  academicYearName: "2026–2027 Eğitim Yılı",
  academicYearStart: "2026-09-01",
  academicYearEnd: "2027-08-31",
  ageGroup: "60–72 ay",
  curriculumProgramSupported: true,
  curriculumCatalogId: "meb-tymm-okul-oncesi-2024-learning-outcomes",
  curriculumSourceVersion: "2024.09.02",
  scheduleKind: "morning",
  startTime: "08:30",
  endTime: "12:30",
};

test("sınıf sihirbazı dönem, program ve günlük düzeni sırayla açar", () => {
  const empty = classroomSetupReadiness({
    ...completeInput,
    classroomName: "",
    ageGroup: "",
    curriculumProgramSupported: false,
    curriculumCatalogId: "",
    curriculumSourceVersion: "",
    scheduleKind: "",
    startTime: "",
    endTime: "",
  });
  assert.deepEqual(empty, { period: false, program: false, schedule: false });
  assert.equal(classroomSetupSectionAvailable("period", empty), true);
  assert.equal(classroomSetupSectionAvailable("program", empty), false);
  assert.equal(classroomSetupSectionAvailable("schedule", empty), false);

  const complete = classroomSetupReadiness(completeInput);
  assert.deepEqual(complete, { period: true, program: true, schedule: true });
  assert.equal(classroomSetupSectionAvailable("schedule", complete), true);
});

test("geçersiz tarih ve ters saat aralığı tamamlanmış sayılmaz", () => {
  assert.equal(
    classroomSetupReadiness({
      ...completeInput,
      academicYearStart: "2027-09-01",
      academicYearEnd: "2026-08-31",
    }).period,
    false,
  );
  assert.equal(
    classroomSetupReadiness({
      ...completeInput,
      startTime: "12:30",
      endTime: "08:30",
    }).schedule,
    false,
  );
});

test("ileri ve geri sınıf ayarı sırası deterministiktir", () => {
  assert.equal(nextClassroomSetupSection("period"), "program");
  assert.equal(nextClassroomSetupSection("program"), "schedule");
  assert.equal(nextClassroomSetupSection("schedule"), null);
  assert.equal(previousClassroomSetupSection("schedule"), "program");
  assert.equal(previousClassroomSetupSection("program"), "period");
  assert.equal(previousClassroomSetupSection("period"), null);
});

test("arayüz dönem çelişkisini açıklar, üç alt adım kullanır ve tehlikeli işlemleri başlangıçtan ayırır", async () => {
  const [prototypeSource, onboardingCss, prototypeCss] = await Promise.all([
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../src/features/onboarding/setup-progress.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../src/prototype.css", import.meta.url), "utf8"),
  ]);

  assert.match(prototypeSource, /classroom-form-stepper/);
  assert.match(prototypeSource, /2026–2027 dönemini hazırla/);
  assert.match(prototypeSource, /eski yılı sessizce değiştirmez/);
  assert.match(prototypeSource, /Başlangıç planı · tamamlandı/);
  assert.match(prototypeSource, /İlk kurulum tamamlandı · 4\/4/);
  assert.match(prototypeSource, /Gelişmiş cihaz işlemleri/);
  assert.match(onboardingCss, /classroom-form-navigation/);
  assert.match(prototypeCss, /security-advanced-zone/);
});
