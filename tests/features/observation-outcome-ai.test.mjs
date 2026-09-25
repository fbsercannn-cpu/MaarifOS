import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  generateObservationOutcomeWithDeepSeek,
  prepareObservationOutcomeAIRequest,
} from "../../src/features/action-center/observation-outcome-ai.ts";

const candidate = {
  studentId: "student-1",
  observationId: "observation-1",
  studentName: "Ayşe Yılmaz",
  periodStart: "2026-09-21",
  periodEnd: "2026-09-25",
  assessmentText: "Cihaz içi değerlendirme taslağı somut gözleme dayanır ve öğretmen tarafından incelenir.",
  familyBulletinText: "Cihaz içi veli bülteni taslağı öğretmen tarafından incelendikten sonra kullanılabilir.",
  sourceDisclosure: "Yerel kaynak",
  uncertaintyDisclosure: "Öğretmen incelemesi gerekir.",
  privacyDisclosure: "Ağa gönderilmedi.",
  generationMode: "local-safe-fallback",
  expectedSourceFingerprint: "fixture-fingerprint",
};

function snapshot(rawText) {
  const value = createEmptySnapshot();
  const base = {
    createdAt: "2026-09-25T08:00:00.000Z",
    updatedAt: "2026-09-25T08:00:00.000Z",
    civilDate: "2026-09-25",
    deletedAt: null,
    schemaVersion: 1,
  };
  value.students.push({ ...base, id: "student-1", displayName: "Ayşe Yılmaz", active: true, contacts: [{ name: "Fatma Yılmaz", kind: "mother" }] });
  value.students.push({ ...base, id: "student-2", displayName: "Mehmet Kaya", active: true });
  value.observations.push({ ...base, id: "observation-1", studentId: "student-1", rawText, rawTextImmutable: true });
  value.evidenceCurriculumLinks.push({
    ...base,
    id: "link-1",
    observationId: "observation-1",
    confirmationMethod: "teacher-confirmed",
    referenceCode: "EÇE.K1",
    referenceTitle: "Duygu ve düşüncelerini sözlü olarak ifade eder",
  });
  return value;
}

test("DeepSeek istemi bilinen çocuk ve yakını adlarını ve doğrudan iletişim kimliklerini çıkarır", () => {
  const data = snapshot("Ayşe Yılmaz, Mehmet Kaya'ya resmini anlattı. Fatma Hanımın 10000000146, 0532 123 45 67 ve veli@example.com bilgileri notta yazıyordu.");
  const request = prepareObservationOutcomeAIRequest(data, candidate);
  assert.doesNotMatch(request.prompt, /Ayşe|Yılmaz|Mehmet|Kaya|Fatma|10000000146|0532 123 45 67|veli@example\.com/iu);
  assert.match(request.prompt, /\[ÇOCUK ADI ÇIKARILDI\]/u);
  assert.match(request.prompt, /\[TCKN ÇIKARILDI\]/u);
  assert.match(request.prompt, /\[TELEFON ÇIKARILDI\]/u);
  assert.match(request.prompt, /\[E-POSTA ÇIKARILDI\]/u);
  assert.equal(request.redactionCount, 6);
});

test("sağlık, aile veya adres ayrıntısı olabilecek gözlem DeepSeek'e hazırlanmaz", () => {
  const data = snapshot("Çocuğun ilaç kullanımı ve ev adresi hakkında aile notu eklendi.");
  assert.throws(
    () => prepareObservationOutcomeAIRequest(data, candidate),
    /DeepSeek'e gönderilmedi/u,
  );
});

test("aday çocuk ile gözlemin gerçek çocuk kapsamı uyuşmuyorsa istem hazırlanmaz", () => {
  const data = snapshot("Resmini arkadaşına anlattı ve soruya yanıt verdi.");
  assert.throws(
    () => prepareObservationOutcomeAIRequest(data, { ...candidate, studentId: "student-2" }),
    /çocuk bağlantısı/u,
  );
});

test("doğrulanmış iki alanlı DeepSeek yanıtı öğretmen taslağına ve model kaynağına dönüşür", async () => {
  const data = snapshot("Resmini arkadaşına anlattı ve arkadaşının sorusuna kendi sözleriyle yanıt verdi.");
  let sentPrompt = "";
  const result = await generateObservationOutcomeWithDeepSeek(data, candidate, {
    async requestCompletion(prompt) {
      sentPrompt = prompt;
      return {
        model: "deepseek-flash",
        text: JSON.stringify({
          assessmentText: "Çocuk, hazırladığı resmi arkadaşına anlattı ve yöneltilen soruya kendi sözleriyle karşılık verdi. Benzer anlatım fırsatları izlenebilir.",
          familyBulletinText: "Bugün sınıfta hazırladığı resmi bir arkadaşına anlattı. Evde isterse seçtiği bir resmi size anlatması için sakin bir zaman sunabilirsiniz.",
        }),
      };
    },
  });
  assert.match(sentPrompt, /kimliksizleştirilmiş/u);
  assert.equal(result.generationMode, "deepseek");
  assert.equal(result.aiModel, "deepseek-flash");
  assert.match(result.privacyDisclosure, /çocuk adı/u);
  assert.match(result.familyBulletinText, /isterse/u);
});

test("DeepSeek adı geri üretirse yanıt kayda aday olamaz", async () => {
  const data = snapshot("Resmini arkadaşına anlattı ve soruya yanıt verdi.");
  await assert.rejects(
    () => generateObservationOutcomeWithDeepSeek(data, candidate, {
      async requestCompletion() {
        return {
          model: "deepseek-flash",
          text: JSON.stringify({
            assessmentText: "Ayşe Yılmaz resmi anlattı ve sorulara yanıt verdi; bu metin yeterince uzundur ancak isim içerir.",
            familyBulletinText: "Bugün sınıfta hazırladığı resmi anlattı; evde isterse başka bir resmi de anlatması için fırsat sunabilirsiniz.",
          }),
        };
      },
    }),
    /gizlilik veya pedagojik güven/u,
  );
});
