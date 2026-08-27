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
  schoolName: "Deneme Anaokulu",
  teacherName: "Emine Akış",
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
    schoolName: "",
    teacherName: "",
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

  assert.equal(
    classroomSetupReadiness({ ...completeInput, schoolName: "" }).period,
    false,
  );
  assert.equal(
    classroomSetupReadiness({ ...completeInput, teacherName: "" }).period,
    false,
  );
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

test("arayüz dört temel bilgiyi tek formda toplar ve tehlikeli işlemleri başlangıçtan ayırır", async () => {
  const [prototypeSource, prototypeCss, globalCss] = await Promise.all([
    readFile(new URL("../../src/Prototype.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../src/prototype.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/styles.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(prototypeSource, /classroom-form-stepper/);
  assert.match(prototypeSource, /classroom-form-simple-intro/);
  assert.match(prototypeSource, /classroom-advanced-settings/);
  assert.match(prototypeSource, /Sınıfımı hazırla/);
  assert.match(prototypeSource, /scheduleKind: "full_day"/);
  assert.match(prototypeSource, /2026–2027 dönemini hazırla/);
  assert.match(prototypeSource, /eski yılı sessizce değiştirmez/);
  assert.match(prototypeSource, /Başlangıç planı · tamamlandı/);
  assert.match(prototypeSource, /İlk kurulum tamamlandı · 4\/4/);
  assert.match(prototypeSource, /Gelişmiş cihaz işlemleri/);
  assert.match(prototypeCss, /classroom-form-navigation/);
  assert.match(prototypeCss, /security-advanced-zone/);
  assert.match(
    prototypeSource,
    /aria-describedby="classroom-setup-submit-hint"/,
  );
  assert.match(
    prototypeSource,
    /<small id="classroom-setup-submit-hint" aria-live="polite">/,
  );
  assert.match(
    prototypeSource,
    /Okul adı, öğretmen adı soyadı, sınıf adı ve eğitim yılı bilgilerini tamamlayın\./,
  );
  assert.match(
    prototypeSource,
    /36–48, 48–60 veya 60–72 ay yaş bandını seçin\./,
  );
  assert.match(
    prototypeSource,
    /Bütün zorunlu bilgiler tamamlandı; sınıfı kaydedebilirsiniz\./,
  );
  assert.match(
    prototypeCss,
    /\.classroom-form-navigation\s*\{[\s\S]*?position:\s*static;/u,
  );
  assert.match(
    prototypeCss,
    /@media \(max-width: 359px\)[\s\S]*?\.settings-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/u,
  );
  assert.match(globalCss, /body\s*\{[\s\S]*?min-width:\s*0;/u);
  assert.doesNotMatch(globalCss, /body\s*\{[\s\S]*?min-width:\s*320px;/u);
});
