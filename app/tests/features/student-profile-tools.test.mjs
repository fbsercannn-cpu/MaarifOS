import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClassObservationExport,
  buildStudentObservationExport,
  contactActionLinks,
  formatObservationDateTime,
} from "../../src/features/students/student-profile-tools.ts";

const studentA = {
  id: "00000000-0000-4000-8000-000000000981",
  name: "Ayşe Çocuk",
};
const studentB = {
  id: "00000000-0000-4000-8000-000000000982",
  name: "Bora Çocuk",
};

function observation(id, studentId, observedAt, rawText, linked = false) {
  return {
    id,
    studentId,
    studentName: studentId === studentA.id ? studentA.name : studentB.name,
    planId: "00000000-0000-4000-8000-000000000983",
    activityId: "00000000-0000-4000-8000-000000000984",
    activityTitle: "Serbest oyun",
    rawText,
    context: "Blok köşesi",
    childQuote: "Bir tane daha ekleyelim.",
    observationType: "quick-note",
    observationCategories: [],
    observedAt,
    civilDate: observedAt.slice(0, 10),
    curriculumProfile: {
      framework: "tymm",
      programLabel: "TYMM",
      sourceVersion: "2026-test",
      catalogId: "test",
      catalogLabel: "Test",
    },
    plannedCurriculumTargets: [],
    confirmedCurriculumLinkIds: linked
      ? ["00000000-0000-4000-8000-000000000985"]
      : [],
  };
}

test("telefon bağlantıları yalnız doğrulanmış numaradan fail-closed üretilir", () => {
  assert.deepEqual(contactActionLinks("0555 123 45 67"), {
    tel: "tel:+905551234567",
    whatsapp: "https://wa.me/905551234567",
  });
  assert.equal(contactActionLinks("123"), null);
  assert.equal(contactActionLinks("javascript:alert(1)"), null);
});

test("gözlem dışa aktarımı UTC zamanı İstanbul bandında sıralar ve aile verisini sızdırmaz", () => {
  const observations = [
    observation(
      "00000000-0000-4000-8000-000000000986",
      studentA.id,
      "2026-07-29T09:30:00.000Z",
      "İkinci gözlem",
      true,
    ),
    observation(
      "00000000-0000-4000-8000-000000000987",
      studentA.id,
      "2026-07-28T07:15:00.000Z",
      "İlk gözlem",
    ),
    observation(
      "00000000-0000-4000-8000-000000000988",
      studentB.id,
      "2026-07-28T08:00:00.000Z",
      "Başka çocuk gözlemi",
    ),
  ];
  const text = buildStudentObservationExport(
    studentA,
    observations,
    new Date("2026-07-29T10:00:00.000Z"),
  );

  assert.ok(text.indexOf("İlk gözlem") < text.indexOf("İkinci gözlem"));
  assert.doesNotMatch(text, /Başka çocuk gözlemi/);
  assert.doesNotMatch(text, /0555|profilePhotoDataUrl|data:image/);
  assert.match(text, /Program bağı bekliyor/);
  assert.match(text, /Program bağı tamamlandı/);
  assert.equal(
    formatObservationDateTime("2026-07-29T09:30:00.000Z"),
    "29 Temmuz 2026 12:30",
  );
});

test("sınıf dışa aktarımı çok uzun gözlemi kesmeden çocuklara göre gruplar", () => {
  const longText = "Uzun gözlem ".repeat(500);
  const text = buildClassObservationExport(
    [studentA, studentB],
    [
      observation(
        "00000000-0000-4000-8000-000000000989",
        studentA.id,
        "2026-07-29T09:30:00.000Z",
        longText,
      ),
    ],
    new Date("2026-07-29T10:00:00.000Z"),
  );
  assert.match(text, /Ayşe Çocuk/);
  assert.match(text, /Bora Çocuk/);
  assert.match(text, new RegExp(longText.trim().slice(-60)));
  assert.match(text, /Toplam gözlem: 1/);
});
