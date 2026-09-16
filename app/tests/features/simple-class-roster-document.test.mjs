import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  SIMPLE_CLASS_ROSTER_FILE_VERSION_SEGMENT,
  SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION,
  createSimpleClassRosterDocument,
  createSimpleClassRosterPdfDocument,
  simpleClassRosterDocumentBlob,
  simpleClassRosterDocumentOutputContract,
  simpleClassRosterPdfDocumentOutputContract,
} from "../../src/features/students/simple-class-roster-document.ts";

const boldFontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
const yearId = "00000000-0000-4000-8000-000000009101";
const classroomId = "00000000-0000-4000-8000-000000009102";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const pdfFontBytes = new Uint8Array(readFileSync(path.resolve(
  testDirectory,
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
)));

function record(id, fields = {}) {
  return {
    id,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    civilDate: "2026-08-01",
    schemaVersion: 1,
    ...fields,
  };
}

function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(
    record(yearId, {
      name: "2026-2027 Eğitim Öğretim Yılı",
      status: "active",
    }),
  );
  snapshot.classrooms.push(
    record(classroomId, {
      academicYearId: yearId,
      name: "Çiçekler 60-72 Ay Tam Gün Sınıfı",
    }),
  );
  snapshot.students.push(
    record("00000000-0000-4000-8000-000000009201", {
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: "Nurbanu Nazlıcan Su Elif Uzunoğulları Kahramanoğlu",
      optionalCode: "Ö-001",
      nationalIdentityNumber: "10000000146",
      contacts: [
        {
          id: "00000000-0000-4000-8000-000000009301",
          kind: "mother",
          relationship: "Anne ve okul çıkışında yetkili teslim kişisi",
          name: "Dr. Öğr. Üyesi Şehnaz Ayşegül Uzunoğulları",
          phone: "+90 (532) 111 22 33 / iş telefonu: 0258 444 55 66",
          isPrimary: true,
        },
      ],
    }),
  );
  return snapshot;
}

function create() {
  return createSimpleClassRosterDocument({
    scope: { academicYearId: yearId, classroomId },
    snapshot: fixture(),
    schoolName:
      "T.C. Millî Eğitim Bakanlığı Denizli Merkezefendi Cumhuriyet Anaokulu Müdürlüğü",
    teacherName: "Emine Nur Akış Özdemir",
    generatedAt: "2026-08-21T10:30:00.000Z",
  });
}

function pdfRuntime() {
  return { fontBytes: pdfFontBytes, boldFontBytes };
}

test("sınıf listesi şablon 6.0 üstverisi ve görünür sürüm izi taşır", () => {
  const file = create();
  const output = simpleClassRosterDocumentOutputContract(file);

  assert.equal(file.templateVersion, SIMPLE_CLASS_ROSTER_TEMPLATE_VERSION);
  assert.match(file.html, /name="maarifos-document-kind" content="class-roster"/u);
  assert.match(file.html, /name="maarifos-template-version" content="6\.0"/u);
  assert.match(file.html, /Şablon 6\.0/u);
  assert.match(file.html, /class="template-version"/u);
  assert.equal(output.metadata.templateVersion, "6.0");
  assert.equal(output.metadata.documentKind, "class-roster");
  assert.equal(output.preview.html, file.html);
  assert.deepEqual(output.download.bytes, file.bytes);
  assert.equal(
    file.html.match(/name="maarifos-document-kind"/gu)?.length,
    1,
    "belge türü üstverisi tek otoriteden gelmeli",
  );
});

test("Android eski indirmeleriyle karışmayan sürümlü dosya adı üretir", () => {
  const file = create();

  assert.match(
    file.fileName,
    new RegExp(`^MaarifOS_Sinif_Listesi_${SIMPLE_CLASS_ROSTER_FILE_VERSION_SEGMENT}_`, "u"),
  );
  assert.match(file.fileName, /Çiçekler_60-72_ay_Tam_Gün_Sınıfı/u);
  assert.match(file.fileName, /2026–2027\.html$/u);
  assert.doesNotMatch(file.fileName, /^MaarifOS_Sinif_Listesi_Çiçekler/u);
});

test("tek öğrenci ve uzun Türkçe alanları kayıpsız, mobil kart uyumlu taşır", async () => {
  const file = create();
  const blob = simpleClassRosterDocumentBlob(file);

  assert.equal(file.rowCount, 1);
  assert.match(file.html, /Nurbanu Nazlıcan Su Elif Uzunoğulları Kahramanoğlu/u);
  assert.match(file.html, /Dr\. Öğr\. Üyesi Şehnaz Ayşegül Uzunoğulları/u);
  assert.match(file.html, /iş telefonu: 0258 444 55 66/u);
  assert.match(file.html, /@media screen and \(max-width: 700px\)/u);
  assert.match(file.html, /grid-template-columns: 96px minmax\(0, 1fr\)/u);
  assert.match(file.html, /overflow-x: hidden/u);
  assert.equal(blob.type, file.mimeType);
  assert.equal(await blob.text(), file.html);
});

test("A4 baskı, tekrar eden başlık, sayfa numarası ve imza sözleşmesini korur", () => {
  const file = create();

  assert.match(file.html, /@page \{ size: A4 landscape; margin: 10mm; \}/u);
  assert.match(file.html, /counter\(page\)/u);
  assert.match(file.html, /counter\(pages\)/u);
  assert.match(file.html, /class="document-heading-row"/u);
  assert.match(file.html, /class="document-meta-row"/u);
  assert.match(file.html, /class="column-head"/u);
  assert.match(file.html, /class="signature-line"/u);
  assert.doesNotMatch(file.html, /https?:\/\//u);
  assert.doesNotMatch(file.html, /<script/iu);
});

test("basit deneyimin resmî çıktısı sürümlü gerçek PDF ve aynı HTML önizlemeyi taşır", async () => {
  const file = await createSimpleClassRosterPdfDocument(
    {
      scope: { academicYearId: yearId, classroomId },
      snapshot: fixture(),
      schoolName:
        "T.C. Millî Eğitim Bakanlığı Denizli Merkezefendi Cumhuriyet Anaokulu Müdürlüğü",
      teacherName: "Emine Nur Akış Özdemir",
      generatedAt: "2026-08-21T10:30:00.000Z",
    },
    { runtime: pdfRuntime() },
  );
  const output = simpleClassRosterPdfDocumentOutputContract(file);

  assert.equal(Buffer.from(file.bytes.subarray(0, 5)).toString("ascii"), "%PDF-");
  assert.equal(file.mimeType, "application/pdf");
  assert.equal(file.templateVersion, "6.0");
  assert.match(
    file.fileName,
    new RegExp(`^MaarifOS_Sinif_Listesi_${SIMPLE_CLASS_ROSTER_FILE_VERSION_SEGMENT}_.*\\.pdf$`, "u"),
  );
  assert.match(file.htmlFileName, /v6_0_.*\.html$/u);
  assert.match(file.html, /name="maarifos-template-version" content="6\.0"/u);
  assert.equal(output.metadata.templateVersion, "6.0");
  assert.equal(output.download.fileName, file.fileName);
  assert.equal(output.download.mimeType, "application/pdf");
  assert.equal(output.preview.html, file.html);
});
