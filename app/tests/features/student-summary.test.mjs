import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { createStudentSummaryModel } from "../../src/features/student-summary/student-summary-model.ts";
import { createStudentSummaryRecipe, studentSummaryNodes } from "../../src/features/student-summary/student-summary-document.ts";
import { studentSummaryFixture } from "../fixtures/student-summary-fixture.mjs";
import { getDevelopmentObservationPresets } from "../../src/features/evidence/development-observation-presets.ts";
const runtime = { fontBytes: new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Regular.ttf")), boldFontBytes: new Uint8Array(readFileSync("public/assets/fonts/MaarifOSSans-Bold.ttf")) };
test("only recorded canonical mapping is shown; completed support is no longer presented as ongoing", () => {
  const { input, child } = studentSummaryFixture();
  const preset = getDevelopmentObservationPresets("60–72")[0]; assert.ok(preset);
  input.snapshot.observations[0].developmentSelection = { presetId: preset.id, ageBand: preset.ageBand };
  const decision = input.snapshot.settings[0];
  input.snapshot.settings.push({ ...decision, id: "00000000-0000-4000-9500-000000000091", workflow: { kind: "learning-reflection", sourceId: decision.id, reflection: "Kayıtlı uygulama tamamlandı.", nextStep: "Yeni bir destek kaydı planlanmadı.", nextFollowupOn: null } });
  const model = createStudentSummaryModel(input.snapshot, { scope: input.scope, studentId: child.id, civilDate: "2026-09-10" });
  assert.equal(model.supports.length, 0);
  assert.match(model.observations.find(r => r.id === input.snapshot.observations[0].id).programSource, new RegExp(preset.curriculumReference.code));
  assert.equal(model.observations.filter(r => r.programSource).length, 1);
});
test("one child only, explicit brief counts, no private notes or other/shared child text", () => {
  const { input, child } = studentSummaryFixture();
  const model = createStudentSummaryModel(input.snapshot, { scope: input.scope, studentId: child.id, civilDate: "2026-09-10" });
  assert.equal(model.observations.length, 5); assert.equal(model.sharedObservationCount, 1); assert.equal(model.supports.length, 1);
  const text = JSON.stringify(studentSummaryNodes(model, { fields: ["identity", "contacts", "observations", "supports", "next-step"], template: "brief" }));
  assert.match(text, /3\/5/); assert.doesNotMatch(text, /DIGER_COCUK|ORTAK_COCUK|ÖZEL_ÇOCUK|ÖZEL_AİLE/);
  assert.doesNotMatch(text, /gözlem 1:/); assert.match(text, /gözlem 5:/);
  assert.throws(() => createStudentSummaryModel(input.snapshot, { scope: { ...input.scope, classroomId: "wrong" }, studentId: child.id, civilDate: "2026-09-10" }), /bulunmuyor/);
});
test("real portrait PDF fits normal brief and long source text flows to continuation; refresh keeps child", async () => {
  const { input, child, store } = studentSummaryFixture();
  const recipe = await createStudentSummaryRecipe(store, { scope: input.scope, studentId: child.id, generatedAt: "2026-09-10T09:00:00Z" }, runtime);
  const brief = await recipe.build(recipe.initial);
  const word = await recipe.exportActions[0].build(recipe.initial);
  assert.equal(Buffer.from(word.bytes.subarray(0, 4)).toString("hex"), "504b0304");
  assert.doesNotMatch(new TextDecoder().decode(word.bytes), /Öğretmen planı|DIGER_COCUK|ORTAK_COCUK|ÖZEL_ÇOCUK|ÖZEL_AİLE/);
  const pdf = await PDFDocument.load(brief.bytes); assert.equal(pdf.getPageCount(), 1); assert.ok(pdf.getPage(0).getHeight() > pdf.getPage(0).getWidth());
  await assert.rejects(recipe.build({ ...recipe.initial, studentIds: [input.snapshot.students[1].id] }), /öğrenci/);
  store.snapshot.observations[4].rawText += " Uzun kaynak cümlesi ve ayrıntılı gözlem metni.".repeat(100);
  await assert.rejects(recipe.assertExportAllowed(recipe.initial), /değişti/);
  const fresh = await recipe.refresh(recipe.initial); assert.deepEqual(fresh.initial.studentIds, recipe.initial.studentIds);
  const long = await fresh.build({ ...recipe.initial, template: "full" }); assert.ok((await PDFDocument.load(long.bytes)).getPageCount() > 1);
  if (process.env.STUDENT_SUMMARY_QA_DIR) { mkdirSync(process.env.STUDENT_SUMMARY_QA_DIR, { recursive: true }); writeFileSync(`${process.env.STUDENT_SUMMARY_QA_DIR}/brief.pdf`, brief.bytes); writeFileSync(`${process.env.STUDENT_SUMMARY_QA_DIR}/long.pdf`, long.bytes); writeFileSync(`${process.env.STUDENT_SUMMARY_QA_DIR}/brief.docx`, word.bytes); }
});

test("same-day brief uses creation time before UUID and repository order for observations and supports", () => {
  const { input, child } = studentSummaryFixture();
  const observations = input.snapshot.observations.slice(0, 5);
  observations.forEach((record, index) => { record.createdAt = `2026-09-10T0${9 - index}:00:00.000Z`; });
  const decision = input.snapshot.settings[0];
  input.snapshot.settings = [3, 1, 2].map(index => ({ ...decision,
    id: `00000000-0000-4000-9500-00000000009${index}`,
    createdAt: `2026-09-10T0${9 - index}:00:00.000Z`, updatedAt: `2026-09-10T0${9 - index}:00:00.000Z`,
    workflow: { ...decision.workflow, teacherDecision: `Destek ${index}` }
  }));
  const model = createStudentSummaryModel(input.snapshot, { scope: input.scope, studentId: child.id, civilDate: "2026-09-10" });
  assert.deepEqual(model.observations.slice(0, 3).map(record => record.id), observations.slice(0, 3).map(record => record.id));
  assert.deepEqual(model.supports.map(record => record.decision), ["Destek 1", "Destek 2", "Destek 3"]);
  const brief = JSON.stringify(studentSummaryNodes(model, { fields: ["observations", "supports"], template: "brief" }));
  assert.match(brief, /gözlem 1:/); assert.doesNotMatch(brief, /gözlem 5:|Destek 3|createdAt/);
  input.snapshot.observations.reverse(); input.snapshot.settings.reverse();
  assert.deepEqual(createStudentSummaryModel(input.snapshot, { scope: input.scope, studentId: child.id, civilDate: "2026-09-10" }), model);
});

