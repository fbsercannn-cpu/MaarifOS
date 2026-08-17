import assert from "node:assert/strict";
import test from "node:test";

import {
  isAcademicYearPlanWriteAllowed,
  resolvePreparationPlanningWindow,
} from "../../src/features/planning/academic-year-planning-policy.ts";

test("hazırlık yılındaki bağlı haftayı yeni dönem sınırlarına kırpar", () => {
  assert.deepEqual(
    resolvePreparationPlanningWindow({
      operationalStatus: "preparation",
      academicYearStart: "2026-09-01",
      academicYearEnd: "2027-08-31",
      weeklyPeriodStart: "2026-08-31",
      weeklyPeriodEnd: "2026-09-04",
    }),
    { allowed: true, defaultCivilDate: "2026-09-01" },
  );
});

test("hazırlık modunda yalnız doğrulanmış gelecek plan bağlamını kabul eder", () => {
  const base = {
    operationalStatus: "preparation",
    academicYearStart: "2026-09-01",
    academicYearEnd: "2027-08-31",
    civilDate: "2026-09-01",
  };
  assert.equal(
    isAcademicYearPlanWriteAllowed({ ...base, hasPreparedPlanContext: true }),
    true,
  );
  assert.equal(
    isAcademicYearPlanWriteAllowed({ ...base, hasPreparedPlanContext: false }),
    false,
  );
  assert.equal(
    isAcademicYearPlanWriteAllowed({
      ...base,
      civilDate: "2026-08-31",
      hasPreparedPlanContext: true,
    }),
    false,
  );
});

test("sona ermiş yıl plan yazımını, etkin yıl ise plan bağlamından bağımsız yazımı ayırır", () => {
  const base = {
    academicYearStart: "2026-09-01",
    academicYearEnd: "2027-08-31",
    civilDate: "2027-06-01",
    hasPreparedPlanContext: false,
  };
  assert.equal(
    isAcademicYearPlanWriteAllowed({ ...base, operationalStatus: "active" }),
    true,
  );
  assert.equal(
    isAcademicYearPlanWriteAllowed({ ...base, operationalStatus: "ended" }),
    false,
  );
});

test("bağlı hafta yeni eğitim yılıyla kesişmiyorsa gelecek plan tarihi uydurmaz", () => {
  assert.deepEqual(
    resolvePreparationPlanningWindow({
      operationalStatus: "preparation",
      academicYearStart: "2026-09-01",
      academicYearEnd: "2027-08-31",
      weeklyPeriodStart: "2026-08-24",
      weeklyPeriodEnd: "2026-08-28",
    }),
    { allowed: false, defaultCivilDate: null },
  );
});
