import assert from "node:assert/strict";
import test from "node:test";

import { createDeepSeekTeacherWork } from "../../src/features/ai-work-center/deepseek-teacher-work.ts";

function input(overrides = {}) {
  return {
    civilDate: "2026-09-25",
    ageBand: "60-72",
    programLabel: "TYMM",
    studentCount: 22,
    attendance: { marked: 18, total: 22 },
    pendingObservationCount: 0,
    hasDailyPlan: false,
    ...overrides,
  };
}

test("plan yoksa DeepSeek iş merkezi planı tek ana iş yapar ve iki takip işiyle sınırlı kalır", () => {
  const tasks = createDeepSeekTeacherWork(input());
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].id, "prepare-daily-plan");
  assert.equal(tasks[0].kind, "plan");
  assert.match(tasks[0].title, /AI ile/u);
  assert.match(tasks[0].detail, /Onayınız olmadan kaydetmez/u);
  assert.equal(tasks[0].actionLabel, "Taslağı oluştur");
  assert.equal(tasks.filter((task) => task.primary).length, 1);
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
});

test("kayıtlı plan ve bekleyen gözlem varsa ana iş gözlemi anlamlandırmaktır", () => {
  const tasks = createDeepSeekTeacherWork(input({
    hasDailyPlan: true,
    pendingObservationCount: 4,
  }));
  assert.equal(tasks[0].id, "analyze-observation");
  assert.match(tasks[0].title, /^4 gözlemi/u);
  assert.equal(tasks[0].kind, "observation");
});

test("plan ve gözlem bağı hazırsa DeepSeek ana işi gün sonu yansımasına taşır", () => {
  const tasks = createDeepSeekTeacherWork(input({
    hasDailyPlan: true,
    pendingObservationCount: 0,
  }));
  assert.equal(tasks[0].id, "prepare-day-reflection");
  assert.equal(tasks[0].kind, "assistant");
  assert.ok(tasks.some((task) => task.id === "prepare-family-brief"));
});

test("DeepSeek istemleri yalnız anonim sınıf toplamlarını taşır", () => {
  const tasks = createDeepSeekTeacherWork(input({
    hasDailyPlan: true,
    pendingObservationCount: 0,
  }));
  const prompts = tasks.map((task) => task.query ?? "").join("\n");
  assert.match(prompts, /Kayıtlı çocuk sayısı: 22/u);
  assert.match(prompts, /Yoklama kapsamı: 18\/22/u);
  assert.doesNotMatch(prompts, /öğretmen adı|çocuk adı:|T\.C\.|telefon numarası|adres:/iu);
  assert.match(prompts, /kişisel veri|çocuk adı|telefon/u);
});

test("geçersiz sayılar isteme taşınmadan güvenli sınırlara çekilir", () => {
  const tasks = createDeepSeekTeacherWork(input({
    hasDailyPlan: true,
    studentCount: Number.NaN,
    attendance: { marked: 99, total: 3 },
    pendingObservationCount: -4,
  }));
  const prompts = tasks.map((task) => task.query ?? "").join("\n");
  assert.match(prompts, /Kayıtlı çocuk sayısı: 0/u);
  assert.match(prompts, /Yoklama kapsamı: 3\/3/u);
  assert.match(prompts, /Bağlantı bekleyen gözlem sayısı: 0/u);
});
