import assert from "node:assert/strict";
import test from "node:test";
import { documentOutputPresets, selectDocumentOutputPreset } from "../../src/features/documents/document-output-presets.ts";
import { validatePdfSelection } from "../../src/features/documents/pdf-preview-model.ts";

const recipe = {
  supportsAppearance: true, fields: [{id:"notes"}, {id:"summary"}],
  students: [{id:"kurgu"}], period: {min:"2026-09-01",max:"2026-09-30"},
  templates: [{id:"report"},{id:"card"}], fieldsForTemplate: {card:[{id:"identity"}]},
  fieldPresets: [{id:"notes", label:"Gözlemler", fields:["notes"], templates:["report"]}],
};
const selection = { fields:["notes"], studentIds:["kurgu"], template:"report", periodStart:"2026-09-08", periodEnd:"2026-09-09" };
test("baskı düzeni öğrenci, tarih ve içerik kapsamını değiştirmez", () => {
  const next = selectDocumentOutputPreset(recipe, selection, "ink-saving");
  assert.deepEqual(next, {...selection, appearance:"ink-saving"});
  assert.deepEqual(selection.fields,["notes"]);
  assert.deepEqual(selectDocumentOutputPreset(recipe,next,"complete"), {...next,fields:["notes","summary"]});
});
test("hazır bölümler yalnız etkin şablona uygulanabilir", () => {
  const card = {...selection,template:"card",fields:["identity"]};
  assert.deepEqual(documentOutputPresets(recipe,card).map(p=>p.id),["color","ink-saving"]);
  assert.throws(()=>selectDocumentOutputPreset(recipe,card,"fields:notes"),/uygun değil/);
  assert.deepEqual(selectDocumentOutputPreset(recipe,{...selection,fields:["notes","summary"]},"fields:notes"),selection);
});
test("desteklenmeyen görünüm veya geçersiz kaynak seçimi hazır düzenle aşılamaz", () => {
  assert.throws(()=>validatePdfSelection({...recipe,supportsAppearance:false},{...selection,appearance:"ink-saving"}),/desteklenmiyor/);
  assert.throws(()=>selectDocumentOutputPreset(recipe,{...selection,studentIds:["başka"]},"color"),/öğrenci/);
  assert.throws(()=>selectDocumentOutputPreset(recipe,{...selection,periodEnd:"2026-10-01"},"color"),/dönemi/);
  assert.equal(documentOutputPresets({...recipe,supportsAppearance:false},selection).some(p=>p.id==="ink-saving"),false);
});
test("sayfa düzeni desteklenen şablonla sınırlıdır ve hazır alan seçiminde korunur", () => {
  const layouts = {...recipe,layouts:[{id:"daily-classroom",label:"Günlük"}],layoutTemplates:["report"]};
  assert.throws(()=>validatePdfSelection(layouts,{...selection,layout:"foreign"}),/desteklenmiyor/);
  assert.throws(()=>validatePdfSelection(layouts,{...selection,template:"card",fields:["identity"],layout:"daily-classroom"}),/desteklenmiyor/);
  const next=selectDocumentOutputPreset(layouts,{...selection,layout:"daily-classroom"},"ink-saving");
  assert.equal(next.layout,"daily-classroom");
  assert.deepEqual(next.studentIds,selection.studentIds);
});

test("tek sayfalık listeden ayrıntı seçimi bütün alanları koruyup klasik çizelgeyi hazırlar",()=>{
 const roster={fields:[{id:"name"},{id:"address"}],layouts:[{id:"single-page-roster",label:"Tek sayfa"}],layoutTemplates:["contact-list"],templates:[{id:"contact-list"}]};
 const selected={fields:["name"],layout:"single-page-roster",template:"contact-list"};
 const next=selectDocumentOutputPreset(roster,selected,"complete");
 assert.deepEqual(next.fields,["name","address"]);assert.equal(next.layout,undefined);assert.equal(selected.layout,"single-page-roster");
});
