import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  CLASS_ROSTER_DOCUMENT_MIME_TYPE,
  CLASS_ROSTER_HTML_FILE_SIGNATURE,
  CLASS_ROSTER_PDF_FILE_SIGNATURE,
  CLASS_ROSTER_PDF_MIME_TYPE,
  classRosterDocumentBlob,
  classRosterDocumentOutputContract,
  classRosterPdfDocumentBlob,
  classRosterPdfDocumentOutputContract,
  createClassRosterDocument,
  createClassRosterPdfDocument,
} from "../../src/features/classroom/class-roster-document.ts";

const yearId = "00000000-0000-4000-8000-000000008101";
const classroomId = "00000000-0000-4000-8000-000000008102";
const otherClassroomId = "00000000-0000-4000-8000-000000008103";
const generatedAt = "2026-08-21T10:30:00.000Z";

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
    record(yearId, { name: "2026-2027 Eğitim Öğretim Yılı", status: "active" }),
  );
  snapshot.classrooms.push(
    record(classroomId, {
      academicYearId: yearId,
      name: "Güneş Sınıfı",
    }),
    record(otherClassroomId, {
      academicYearId: yearId,
      name: "Deniz Sınıfı",
    }),
  );
  return snapshot;
}

function create(snapshot) {
  return createClassRosterDocument({
    scope: { academicYearId: yearId, classroomId },
    snapshot,
    schoolName: "Cumhuriyet Anaokulu",
    teacherName: "Emine Akış",
    generatedAt,
  });
}

function fakePdfRuntime() {
  const drawnText = [];
  const context = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    lineWidth: 1,
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    measureText(value) {
      return { width: [...String(value)].length * 9 };
    },
    fillText(value) {
      drawnText.push(String(value));
    },
  };
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0xff, 0xd9]);
  const canvas = {
    width: 0,
    height: 0,
    getContext(kind) {
      return kind === "2d" ? context : null;
    },
    toDataURL() {
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    },
  };
  return {
    drawnText,
    runtime: {
      createCanvas: () => canvas,
      waitForFonts: async () => {},
    },
  };
}

test("sınıf listesi yalnız aktif sınıf öğrencilerini kapsar", () => {
  const snapshot = fixture();
  snapshot.students.push(
    record("00000000-0000-4000-8000-000000008201", {
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: "Ayşe Yılmaz",
    }),
    record("00000000-0000-4000-8000-000000008202", {
      academicYearId: yearId,
      classroomId: otherClassroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: "Başka Sınıf Öğrencisi",
    }),
    record("00000000-0000-4000-8000-000000008203", {
      academicYearId: yearId,
      classroomId,
      active: false,
      enrollmentStatus: "left",
      displayName: "Ayrılmış Öğrenci",
    }),
    record("00000000-0000-4000-8000-000000008204", {
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: "Silinmiş Öğrenci",
      deletedAt: "2026-08-20T08:00:00.000Z",
    }),
  );

  const file = create(snapshot);

  assert.equal(file.rowCount, 1);
  assert.match(file.html, /Ayşe Yılmaz/);
  assert.doesNotMatch(file.html, /Başka Sınıf Öğrencisi/);
  assert.doesNotMatch(file.html, /Ayrılmış Öğrenci/);
  assert.doesNotMatch(file.html, /Silinmiş Öğrenci/);
  assert.deepEqual(file.scope, { academicYearId: yearId, classroomId });
});

test("öğrencileri tr-TR kurallarıyla sıralar ve kaynak hassas alanlarını aynen taşır", () => {
  const snapshot = fixture();
  snapshot.students.push(
    record("00000000-0000-4000-8000-000000008211", {
      academicYearId: yearId,
      classroomId,
      active: true,
      displayName: "Çınar Işık",
      optionalCode: "007",
      nationalIdentityNumber: "10000000146",
      contacts: [
        {
          id: "00000000-0000-4000-8000-000000008311",
          kind: "mother",
          relationship: "Anne",
          name: "Özlem Işık",
          phone: "+905321112233",
          isPrimary: true,
          isEmergencyContact: true,
          isAuthorizedPickup: true,
        },
      ],
    }),
    record("00000000-0000-4000-8000-000000008212", {
      academicYearId: yearId,
      classroomId,
      active: true,
      displayName: "Can Ak",
      optionalCode: "12-A",
      nationalIdentityNumber: "10000000146",
      contacts: [
        {
          id: "00000000-0000-4000-8000-000000008312",
          kind: "other",
          relationship: "Vasi",
          name: "A & B <Veli>",
          phone: "0532 444 55 66",
          isPrimary: true,
        },
      ],
    }),
  );

  const file = create(snapshot);
  const canIndex = file.html.indexOf("Can Ak");
  const cinarIndex = file.html.indexOf("Çınar Işık");

  assert.ok(canIndex > -1 && cinarIndex > canIndex, "C harfi Ç harfinden önce gelmeli");
  assert.match(file.html, /10000000146/);
  assert.match(file.html, /\+905321112233/);
  assert.match(file.html, /Özlem Işık \(Anne\) · Acil iletişim · Teslim yetkili/);
  assert.match(file.html, /0532 444 55 66/);
  assert.match(file.html, /A &amp; B &lt;Veli&gt; \(Vasi\)/);
  assert.doesNotMatch(file.html, /A & B <Veli>/);
});

test("boş isteğe bağlı alanları güvenli boş değerle ve imza bloğuyla üretir", () => {
  const snapshot = fixture();
  snapshot.students.push(
    record("00000000-0000-4000-8000-000000008221", {
      academicYearId: yearId,
      classroomId,
      active: true,
      displayName: "Duru Ada",
    }),
  );

  const file = create(snapshot);

  assert.equal(file.generatedAt, generatedAt);
  assert.equal(file.generatedCivilDate, "2026-08-21");
  assert.match(file.fileName, /^MaarifOS_Sinif_Listesi_Güneş_Sınıfı_2026-2027_Eğitim_Öğretim_Yılı\.html$/u);
  assert.match(file.html, /Cumhuriyet Anaokulu/);
  assert.match(file.html, /Güneş Sınıfı/);
  assert.match(file.html, /2026-2027 Eğitim Öğretim Yılı/);
  assert.match(file.html, /Emine Akış/);
  assert.match(file.html, /Üretim tarihi:<\/strong> 21\.08\.2026/);
  assert.match(file.html, /class="signature-line"/);
  assert.doesNotMatch(file.html, />undefined</);
  assert.doesNotMatch(file.html, />null</);
  assert.ok((file.html.match(/>—</gu) ?? []).length >= 3);
});

test("A4 HTML dosya ve Blob sözleşmesi doğru imza ile başlar", async () => {
  const snapshot = fixture();
  const file = create(snapshot);
  const blob = classRosterDocumentBlob(file);
  const decoded = new TextDecoder().decode(file.bytes);

  assert.equal(file.format, "html");
  assert.equal(file.documentKind, "class-roster");
  assert.equal(file.containsSensitiveData, true);
  assert.equal(file.pageCount, 1);
  assert.equal(file.mimeType, CLASS_ROSTER_DOCUMENT_MIME_TYPE);
  assert.equal(blob.type, CLASS_ROSTER_DOCUMENT_MIME_TYPE);
  assert.equal(blob.size, file.bytes.byteLength);
  assert.ok(decoded.startsWith(CLASS_ROSTER_HTML_FILE_SIGNATURE));
  assert.equal(await blob.text(), file.html);
  assert.match(file.html, /@page \{ size: A4 portrait; margin: 12mm; \}/);
  assert.match(file.html, /thead \{ display: table-header-group; \}/);
  assert.match(file.html, /page-break-inside: avoid/);
  assert.match(file.html, /counter\(page\)/);
  assert.match(file.html, /counter\(pages\)/);
  assert.match(file.html, /@media screen and \(max-width: 700px\)/);
  assert.match(file.html, /content: attr\(data-label\)/);
  assert.match(file.html, /overflow-x: hidden/);
  assert.doesNotMatch(file.html, /https?:\/\//);
  assert.doesNotMatch(file.html, /<script/iu);
});

test("önizleme ve indirme aynı yerel HTML kaynağını kullanır; PDF veya paylaşım vaat etmez", () => {
  const snapshot = fixture();
  snapshot.students.push(
    record("00000000-0000-4000-8000-000000008231", {
      academicYearId: yearId,
      classroomId,
      active: true,
      displayName: "İpek Öztürk",
    }),
  );
  const file = create(snapshot);
  const output = classRosterDocumentOutputContract(file);

  assert.deepEqual(output.metadata, {
    documentKind: "class-roster",
    format: "html",
    rowCount: 1,
    pageCount: 1,
    generatedAt,
    generatedCivilDate: "2026-08-21",
    containsSensitiveData: true,
  });
  assert.equal(output.preview.kind, "local-html");
  assert.equal(output.preview.html, file.html);
  assert.equal(output.preview.mimeType, file.mimeType);
  assert.equal(output.download.kind, "html-file");
  assert.equal(output.download.fileName, file.fileName);
  assert.deepEqual(output.download.bytes, file.bytes);
  assert.notEqual(output.download.bytes, file.bytes, "indirme baytları güvenli bir kopya olmalı");
  assert.deepEqual(output.capabilities, {
    preview: "local-html",
    download: "html-file",
    print: "browser-dialog-after-open",
    share: "platform-dependent",
    pdf: "not-generated",
  });
  assert.match(file.html, /name="maarifos-output-format" content="html"/u);
  assert.match(file.html, /name="maarifos-page-count" content="1"/u);
  assert.match(file.html, /name="maarifos-contains-sensitive-data" content="true"/u);
  assert.match(file.html, /PDF dosyası değildir/u);
  assert.match(file.html, /\.screen-output-help \{ display: none; \}/u);
});

function addRosterStudents(snapshot, count, { verbose = false } = {}) {
  for (let index = 0; index < count; index += 1) {
    snapshot.students.push(
      record(`00000000-0000-4000-9100-${String(index).padStart(12, "0")}`, {
        academicYearId: yearId,
        classroomId,
        active: true,
        enrollmentStatus: "active",
        displayName:
          verbose && index % 5 === 0
            ? `Nurbanu Nazlıcan Su Elif İrem Uzunoğulları Kahramanoğlu ${index + 1}`
            : `Kurgu Öğrenci ${String(index + 1).padStart(2, "0")} Çınaroğlu`,
        optionalCode: String(1000 + index),
        nationalIdentityNumber: "10000000146",
        contacts:
          verbose && index % 7 === 0
            ? []
            : [
                {
                  id: `00000000-0000-4000-9200-${String(index).padStart(12, "0")}`,
                  relationship: verbose
                    ? "Anne ve okul çıkışında yetkili teslim kişisi"
                    : "Veli",
                  name: verbose
                    ? `Dr. Öğr. Üyesi Şehnaz Ayşegül Uzunoğulları ${index + 1}`
                    : `Kurgu Veli ${index + 1}`,
                  phone: verbose
                    ? "+90 (532) 111 22 33 / iş telefonu: 0258 444 55 66"
                    : "0555 000 00 00",
                },
              ],
      }),
    );
  }
}

for (const studentCount of [1, 15, 30, 40]) {
  test(`${studentCount} öğrencilik belge satırları kaybetmeden ve kontrollü sayfalarla üretir`, () => {
    const snapshot = fixture();
    addRosterStudents(snapshot, studentCount, { verbose: studentCount === 40 });

    const file = create(snapshot);
    const pageSections = file.html.match(
      /<section class="roster-page(?: roster-page--last)?"/gu,
    ) ?? [];
    const rowCells = file.html.match(/data-label="Sıra"/gu) ?? [];
    const declaredPageRows = [...file.html.matchAll(/data-row-count="(\d+)"/gu)]
      .map((match) => Number(match[1]));

    assert.equal(file.rowCount, studentCount);
    assert.equal(rowCells.length, studentCount);
    assert.equal(pageSections.length, file.pageCount);
    assert.equal(
      declaredPageRows.reduce((sum, count) => sum + count, 0),
      studentCount,
    );
    assert.ok(declaredPageRows.every((count) => count > 0));
    if (studentCount <= 15) assert.equal(file.pageCount, 1);
    if (studentCount >= 30) assert.ok(file.pageCount >= 2);
    assert.match(file.html, new RegExp(`${studentCount} öğrenci`, "u"));
  });
}

for (const studentCount of [1, 15, 30, 40]) {
  test(`${studentCount} öğrencilik gerçek PDF magic byte, A4 sayfa ve Türkçe çizim sözleşmesini korur`, async () => {
    const snapshot = fixture();
    addRosterStudents(snapshot, studentCount, { verbose: studentCount === 40 });
    const { runtime, drawnText } = fakePdfRuntime();
    const file = await createClassRosterPdfDocument(
      {
        scope: { academicYearId: yearId, classroomId },
        snapshot,
        schoolName: "T.C. Millî Eğitim Bakanlığı Şehit Öğretmenler Anaokulu",
        teacherName: "Emine Nur Akış Özdemir",
        generatedAt,
      },
      { runtime },
    );
    const output = classRosterPdfDocumentOutputContract(file);
    const blob = classRosterPdfDocumentBlob(file);
    const magic = Buffer.from(file.bytes.subarray(0, 5)).toString("ascii");

    assert.equal(magic, CLASS_ROSTER_PDF_FILE_SIGNATURE);
    assert.equal(file.format, "pdf");
    assert.equal(file.mimeType, CLASS_ROSTER_PDF_MIME_TYPE);
    assert.equal(blob.type, CLASS_ROSTER_PDF_MIME_TYPE);
    assert.equal(file.rowCount, studentCount);
    assert.match(file.fileName, /\.pdf$/u);
    assert.match(file.htmlFileName, /\.html$/u);
    assert.equal(output.download.kind, "pdf-file");
    assert.equal(output.download.mimeType, "application/pdf");
    assert.equal(output.preview.kind, "local-html");
    assert.equal(output.preview.html, file.html);
    assert.notEqual(output.download.bytes, file.bytes);
    assert.deepEqual(output.capabilities, {
      preview: "local-html",
      download: "pdf-file",
      print: "pdf-viewer",
      share: "web-share-file-with-download-fallback",
      pdf: "generated",
    });
    assert.match(
      Buffer.from(file.bytes).toString("latin1"),
      new RegExp(`/Count ${file.pageCount}\\b`, "u"),
    );
    if (studentCount <= 15) assert.equal(file.pageCount, 1);
    if (studentCount >= 30) assert.ok(file.pageCount >= 2);
    assert.ok(drawnText.includes("SINIF LİSTESİ"));
    assert.ok(drawnText.includes("Emine Nur Akış Özdemir"));
    assert.ok(
      drawnText.some((line) => line.includes("Öğrenci") || line.includes("Öğretmenler")),
      "Türkçe karakterli metin canvas çizim katmanına kayıpsız ulaşmalı",
    );
    assert.equal((await blob.arrayBuffer()).byteLength, file.bytes.byteLength);
  });
}

test("kalıcı snapshot yeniden yüklendiğinde PDF aynı öğrenci ve kapsamı korur", async () => {
  const snapshot = fixture();
  addRosterStudents(snapshot, 15);
  snapshot.students[7].displayName = "İpek Çağrı Öztürk";
  const restoredSnapshot = JSON.parse(JSON.stringify(snapshot));
  const { runtime, drawnText } = fakePdfRuntime();

  const file = await createClassRosterPdfDocument(
    {
      scope: { academicYearId: yearId, classroomId },
      snapshot: restoredSnapshot,
      schoolName: "Cumhuriyet Anaokulu",
      teacherName: "Emine Akış",
      generatedAt,
    },
    { runtime },
  );

  assert.equal(file.rowCount, 15);
  assert.ok(drawnText.includes("İpek Çağrı Öztürk"));
  assert.deepEqual(file.scope, { academicYearId: yearId, classroomId });
  assert.equal(file.generatedCivilDate, "2026-08-21");
});

test("eksik veli satırını uydurmadan iki basılı hücrede açık boş değerle gösterir", () => {
  const snapshot = fixture();
  snapshot.students.push(
    record("00000000-0000-4000-8000-000000008241", {
      academicYearId: yearId,
      classroomId,
      active: true,
      displayName: "Kurgu Veli Bilgisi Eksik Öğrenci",
      optionalCode: "18",
      nationalIdentityNumber: "10000000146",
      contacts: [],
    }),
  );

  const file = create(snapshot);
  assert.match(
    file.html,
    /data-label="Veli \/ yakın"><div class="cell-value"><span class="empty-value">—<\/span>/u,
  );
  assert.match(
    file.html,
    /data-label="Telefon"><div class="cell-value"><span class="empty-value">—<\/span>/u,
  );
  assert.doesNotMatch(file.html, /Bilinmiyor|Veli bilgisi yok/iu);
});

test("uzun sınıf listesinde kontrollü sayfalar, yinelenen başlık ve dolu son sayfa üretir", () => {
  const snapshot = fixture();
  for (let index = 0; index < 38; index += 1) {
    const contacts = [
      {
        id: `00000000-0000-4000-8001-${String(index).padStart(12, "0")}`,
        kind: "mother",
        relationship: "Anne ve okul çıkışında yetkili teslim kişisi",
        name: `Dr. Öğr. Üyesi Şehnaz Ayşegül Uzunoğulları ${index + 1}`,
        phone: "+90 (532) 111 22 33 / iş telefonu: 0258 444 55 66",
        isPrimary: true,
      },
    ];
    if (index % 6 === 0) {
      contacts.push({
        id: `00000000-0000-4000-8002-${String(index).padStart(12, "0")}`,
        kind: "other",
        relationship: "Acil durumda aranacak yakını",
        name: "Huriye Hanım - komşu ve yetkili teslim kişisi",
        phone: "0 532 999 88 77",
        isPrimary: false,
      });
    }
    snapshot.students.push(
      record(`00000000-0000-4000-9000-${String(index).padStart(12, "0")}`, {
        academicYearId: yearId,
        classroomId,
        active: true,
        enrollmentStatus: "active",
        displayName:
          index === 7
            ? "Nurbanu Nazlıcan Su Elif Uzunoğulları Kahramanoğlu"
            : `Öğrenci ${String(index + 1).padStart(2, "0")} Çınaroğlu`,
        optionalCode: String(100 + index),
        nationalIdentityNumber: "10000000146",
        contacts,
      }),
    );
  }

  const file = create(snapshot);
  const pageCount =
    file.html.match(/<section class="roster-page(?: roster-page--last)?"/gu)
      ?.length ?? 0;
  const repeatedTitleCount = file.html.match(/<h1>SINIF LİSTESİ<\/h1>/gu)?.length ?? 0;
  const lastPage = file.html.slice(
    file.html.lastIndexOf('<section class="roster-page roster-page--last"'),
  );
  const lastPageStudentRows = (lastPage.match(/data-label="Sıra"/gu) ?? []).length;

  assert.ok(pageCount >= 2, "çok satırlı liste birden fazla kontrollü sayfaya bölünmeli");
  assert.equal(repeatedTitleCount, pageCount, "kurum ve belge başlığı her sayfada yinelenmeli");
  assert.ok(lastPageStudentRows >= 5, "son sayfa yalnız imza veya tek satır bırakmamalı");
  assert.match(file.html, /Nurbanu Nazlıcan Su Elif Uzunoğulları Kahramanoğlu/);
  assert.match(file.html, /iş telefonu: 0258 444 55 66/);
  assert.match(file.html, /class="cell-value"/);
});

test("aktif sınıf ve zorunlu kurum alanları doğrulanmadan belge üretmez", () => {
  const snapshot = fixture();
  assert.throws(
    () =>
      createClassRosterDocument({
        scope: { academicYearId: yearId, classroomId: otherClassroomId },
        snapshot: { ...snapshot, classrooms: snapshot.classrooms.slice(0, 1) },
        schoolName: "Cumhuriyet Anaokulu",
        teacherName: "Emine Akış",
        generatedAt,
      }),
    /Aktif sınıf belge için doğrulanamadı/,
  );
  assert.throws(
    () =>
      createClassRosterDocument({
        scope: { academicYearId: yearId, classroomId },
        snapshot,
        schoolName: " ",
        teacherName: "Emine Akış",
        generatedAt,
      }),
    /Okul adı boş bırakılamaz/,
  );
});
