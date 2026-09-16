import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_CLASSROOM_SETTING_ID,
  ACTIVE_CLASSROOM_SETTING_TYPE,
} from "../../src/core/domain/classroom.ts";
import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  appendTeacherOwnedPlanMonths,
  createTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanGraph,
  loadTeacherOwnedPlanStarterDraft,
  reviseTeacherOwnedPlan,
} from "../../src/features/planning/teacher-owned-plan-service.ts";
import {
  buildNeutralTeacherYearOutline,
  buildTeacherFullYearMonthDrafts,
} from "../../src/features/planning/teacher-year-outline.ts";

class MemoryStore {
  constructor(snapshot = createEmptySnapshot()) {
    this.snapshot = structuredClone(snapshot);
  }

  async transaction(mode, collections, task) {
    const working = structuredClone(this.snapshot);
    const transaction = {
      getAll: async (collection) => structuredClone(working[collection]),
      putMany: async (collection, records) => {
        const byId = new Map(
          working[collection].map((record) => [record.id, record]),
        );
        for (const record of records) {
          byId.set(record.id, structuredClone(record));
        }
        working[collection] = [...byId.values()];
      },
      clear: async (collection) => {
        working[collection] = [];
      },
    };
    const result = await task(transaction);
    if (mode === "readwrite") {
      for (const collection of collections) {
        this.snapshot[collection] = working[collection];
      }
    }
    return structuredClone(result);
  }

  async readSnapshot() {
    return structuredClone(this.snapshot);
  }

  close() {}
}

const yearId = "00000000-0000-4000-8000-000000000b01";
const classroomId = "00000000-0000-4000-8000-000000000b02";
const otherClassroomId = "00000000-0000-4000-8000-000000000b03";
const base = {
  createdAt: "2026-09-01T06:00:00.000Z",
  updatedAt: "2026-09-01T06:00:00.000Z",
  civilDate: "2026-09-01",
  deletedAt: null,
  schemaVersion: 1,
};

function activeStore() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push({
    ...base,
    id: yearId,
    name: "2026–2027 Eğitim Yılı",
    startDate: "2026-09-07",
    endDate: "2027-06-25",
    status: "active",
  });
  snapshot.classrooms.push(
    {
      ...base,
      id: classroomId,
      academicYearId: yearId,
      name: "Kurgu A Sınıfı",
    },
    {
      ...base,
      id: otherClassroomId,
      academicYearId: yearId,
      name: "Kurgu B Sınıfı",
    },
  );
  snapshot.settings.push({
    ...base,
    id: ACTIVE_CLASSROOM_SETTING_ID,
    settingType: ACTIVE_CLASSROOM_SETTING_TYPE,
    academicYearId: yearId,
    classroomId,
  });
  return new MemoryStore(snapshot);
}

function validDraft() {
  return {
    title: "2026–2027 Öğretmen Yıllık Planı",
    periodStart: "2026-09-07",
    periodEnd: "2026-10-30",
    teacherContent: {
      purpose: "Sınıfın yıllık öğretmen planlama omurgası",
      priorities: ["oyun", "gözlem", "aile katılımı"],
    },
    months: [
      {
        title: "Eylül Öğretmen Planı",
        monthKey: "2026-09",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-30",
        teacherContent: { focus: "Uyum ve sınıf aidiyeti" },
        weeks: [
          {
            title: "7–11 Eylül Haftası",
            weekKey: "2026-W37",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { flow: ["karşılama", "oyun", "değerlendirme"] },
          },
          {
            title: "14–18 Eylül Haftası",
            weekKey: "2026-W38",
            periodStart: "2026-09-14",
            periodEnd: "2026-09-18",
            teacherContent: { flow: ["merkezler", "açık hava"] },
          },
        ],
      },
      {
        title: "Ekim Öğretmen Planı",
        monthKey: "2026-10",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-30",
        teacherContent: { focus: "Merak ve araştırma" },
        weeks: [
          {
            title: "5–9 Ekim Haftası",
            weekKey: "2026-W41",
            periodStart: "2026-10-05",
            periodEnd: "2026-10-09",
            teacherContent: { flow: ["fen", "sanat"] },
          },
        ],
      },
    ],
    now: new Date("2026-09-02T06:00:00.000Z"),
  };
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadMonthPackageInventory, generateMonthEndPackage } from "../../src/features/documents/month-end-package.ts";
import { createBinaryZip } from "../../src/features/documents/binary-zip.ts";
const runtime = {fontBytes:new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Regular.ttf",import.meta.url))), boldFontBytes:new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf",import.meta.url)))};
async function preparedStore() { const store=activeStore(); store.snapshot.classrooms[0].schoolName="Kurgu Anaokulu";store.snapshot.classrooms[0].teacherName="Kurgu Öğretmen";await createTeacherOwnedPlanGraph(store,validDraft());return store; }
function inspectZip(bytes) {const result=spawnSync("python",["-c","import sys,io,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:len(z.read(n)) for n in z.namelist()}))"],{input:bytes,encoding:"utf8"});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);}
test("ay sonu paketi exact ay ve seçimle gerçek PDF/Word ve içindekiler üretir",async()=>{const store=await preparedStore();const inventory=await loadMonthPackageInventory(store,"2026-09");assert.equal(inventory.items.length,1);assert.deepEqual(inventory.missing,["Aylık değerlendirmeyi tamamla"]);const file=await generateMonthEndPackage(store,inventory,inventory.items.map(i=>i.id),runtime);const entries=inspectZip(file.bytes);assert.equal(Object.keys(entries).length,3);assert.equal(Object.keys(entries).filter(n=>n.endsWith(".pdf")).length,1);assert.equal(Object.keys(entries).filter(n=>n.endsWith(".docx")).length,1);assert.ok(entries["00_ICINDEKILER.txt"]>50);assert.ok(Object.values(entries).every(n=>n>0));});
test("değişen kaynak ve yabancı seçim eski paketi indirmez",async()=>{const store=await preparedStore();const inventory=await loadMonthPackageInventory(store,"2026-09");await assert.rejects(generateMonthEndPackage(store,inventory,["unknown"],runtime),/geçerli/);store.snapshot.classrooms[0].schoolName="Değişen okul";await assert.rejects(generateMonthEndPackage(store,inventory,inventory.items.map(i=>i.id),runtime),/değişti/);});
test("eksik ay somut tamamlama verir; yanlış ay reddedilir",async()=>{const store=await preparedStore();const inventory=await loadMonthPackageInventory(store,"2026-11");assert.equal(inventory.items.length,0);assert.deepEqual(inventory.missing,["Bu ayın planını hazırla"]);await assert.rejects(loadMonthPackageInventory(store,"2026-13"),/Geçerli/);});
test("binary ZIP Türkçe dosya adı ve sıfır baytları kayıpsız korur",()=>{const file=createBinaryZip([{name:"Türkçe.bin",bytes:new Uint8Array([0,255,13,10,0])}]);assert.deepEqual(inspectZip(file),{"Türkçe.bin":5});});

import {saveDocumentVersion} from "../../src/features/documents/document-history-service.ts";
test("saklanan sürüm üretim tarihinden bağımsız belge ayına girer ve değişirse eski seçim durur",async()=>{
 const store=await preparedStore();
 const record=await saveDocumentVersion({store,scope:{classroomId,academicYearId:yearId}},{title:"Kurgu Eylül belgesi",file:{bytes:new TextEncoder().encode("%PDF-1.4\nKurgu\n%%EOF"),mimeType:"application/pdf",fileName:"Kurgu.pdf"},selection:{fields:["content"],periodStart:"2026-09-01",periodEnd:"2026-09-30"},now:new Date("2026-10-01T09:00:00Z")});
 const september=await loadMonthPackageInventory(store,"2026-09");assert.ok(september.items.some(i=>i.id===`saved:${record.id}`));
 const october=await loadMonthPackageInventory(store,"2026-10");assert.equal(october.items.some(i=>i.id===`saved:${record.id}`),false);
 const item=store.snapshot.settings.find(r=>r.id===record.id);item.title="Değişmiş sürüm";
 await assert.rejects(generateMonthEndPackage(store,september,[`saved:${record.id}`]),/değişti/);
});
