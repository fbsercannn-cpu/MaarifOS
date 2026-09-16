import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import { classRosterFixture, classRosterExtremeFixture } from "../fixtures/class-roster-fixture.mjs";
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

const boldFontBytes = new Uint8Array(readFileSync(new URL("../../public/assets/fonts/MaarifOSSans-Bold.ttf", import.meta.url)));
const yearId = "00000000-0000-4000-8000-000000008101";
const classroomId = "00000000-0000-4000-8000-000000008102";
const otherClassroomId = "00000000-0000-4000-8000-000000008103";
const generatedAt = "2026-08-21T10:30:00.000Z";
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const pdfFontBytes = new Uint8Array(readFileSync(path.resolve(
  testDirectory,
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
)));
const hasPdfToText = !spawnSync("pdftotext", ["-v"], { encoding: "utf8" }).error;

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

function extractPdfText(bytes, layout = true) {
  if (!hasPdfToText) return "";
  const directory = mkdtempSync(path.join(tmpdir(), "maarifos-roster-pdf-"));
  try {
    const pdfPath = path.join(directory, "roster.pdf");
    const textPath = path.join(directory, "roster.txt");
    writeFileSync(pdfPath, bytes);
    execFileSync("pdftotext", [layout ? "-layout" : "-raw", "-enc", "UTF-8", pdfPath, textPath]);
    return readFileSync(textPath, "utf8").replaceAll("\r", "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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
  assert.match(file.html, /Özlem Işık/);
  assert.match(file.html, /Acil iletişim: Anne/u);
  assert.match(file.html, /0532 444 55 66/);
  assert.match(file.html, /A &amp; B &lt;Veli&gt;/);
  assert.match(file.html, />Vasi/);
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
  assert.match(file.fileName, /^MaarifOS_Sinif_Listesi_Güneş_Sınıfı_2026–2027\.html$/u);
  assert.match(file.html, /Cumhuriyet Anaokulu/);
  assert.match(file.html, /Güneş Sınıfı/);
  assert.match(file.html, /2026–2027/);
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
  assert.match(file.html, /@page \{ size: A4 landscape; margin: 10mm; \}/);
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
    const rowCells = file.html.match(/data-label="Sıra numarası"/gu) ?? [];
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
    if (studentCount === 1) assert.equal(file.pageCount, 1);
    assert.equal((file.html.match(/class="student-detail-band"/gu) ?? []).length, studentCount);
    if (studentCount >= 30) assert.ok(file.pageCount >= 2);
    assert.match(file.html, new RegExp(`Öğrenci sayısı: ${studentCount}`, "u"));
  });
}

for (const studentCount of [1, 15, 30, 40]) {
  test(`${studentCount} öğrencilik PDF etiketli, aranabilir ve A4 içinde kayıpsız üretilir`, async () => {
    const snapshot = fixture();
    addRosterStudents(snapshot, studentCount, { verbose: studentCount === 40 });
    const file = await createClassRosterPdfDocument(
      {
        scope: { academicYearId: yearId, classroomId },
        snapshot,
        schoolName: "T.C. Millî Eğitim Bakanlığı Şehit Öğretmenler Anaokulu",
        teacherName: "Emine Nur Akış Özdemir",
        generatedAt,
      },
      { runtime: { fontBytes: pdfFontBytes, boldFontBytes } },
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
    assert.equal(output.preview.kind, "local-pdf");
    assert.deepEqual(output.preview.bytes, output.download.bytes);
    assert.notEqual(output.preview.bytes, output.download.bytes);
    assert.equal(output.preview.html, file.html);
    assert.notEqual(output.download.bytes, file.bytes);
    assert.deepEqual(output.capabilities, {
      preview: "local-pdf",
      download: "pdf-file",
      print: "pdf-viewer",
      share: "web-share-file-with-download-fallback",
      pdf: "generated",
    });
    assert.match(
      Buffer.from(file.bytes).toString("latin1"),
      new RegExp(`/Count ${file.pageCount}\\b`, "u"),
    );
    const decoded = Buffer.from(file.bytes).toString("latin1");
    assert.match(decoded, /\/Lang \(tr-TR\)/u);
    assert.match(decoded, /\/StructTreeRoot\b/u);
    assert.match(decoded, /\/FontFile2\b/u);
    assert.match(decoded, /\/ToUnicode\b/u);
    assert.match(decoded, /\/S \/Table\b/u);
    assert.match(decoded, /\/S \/TH\b/u);
    assert.match(decoded, /\/Scope \/Column\b/u);
    assert.match(decoded, /\/Scope \/Row\b/u);
    assert.doesNotMatch(decoded, /\/Subtype \/Image\b/u);
    const xmp = new TextDecoder().decode(file.bytes)
      .match(/<x:xmpmeta[\s\S]+?<\/x:xmpmeta>/u)?.[0] ?? "";
    assert.doesNotMatch(xmp, /Kurgu Öğrenci|Nurbanu Nazlıcan|10000000146|0555 000 00 00|\+90 \(532\)/u);
    if (studentCount === 1) assert.equal(file.pageCount, 1);
    if (studentCount >= 30) assert.ok(file.pageCount >= 2);
    const extracted = extractPdfText(file.bytes);
    if (hasPdfToText) {
      assert.match(extracted, /Sınıf Listesi/u);
      assert.match(extracted, /Emine Nur Akış Özdemir/u);
      assert.match(extracted, /10000000146/u);
      assert.match(extracted, /Çınaroğlu|Kahramanoğlu/u);
      assert.match(extracted, new RegExp(`(?:^|\\s)${studentCount}(?:\\s|$)`, "u"));
      const pages = extracted.replaceAll("\r", "").split("\f").filter((page) => page.trim());
      assert.equal(
        pages.filter((page) => page.includes("Kişisel veri içerir · Yetkisiz paylaşmayınız.")).length,
        file.pageCount,
        "kişisel veri uyarısı her PDF sayfasında artifact olarak görünmeli",
      );
      if (studentCount === 40) {
        for (const page of pages) {
          const danglingTail = page.indexOf("yetkili teslim kişisi)");
          if (danglingTail < 0) continue;
          const firstStudent = [page.indexOf("Kurgu Öğrenci"), page.indexOf("Nurbanu Nazlıcan")]
            .filter((index) => index >= 0)
            .sort((left, right) => left - right)[0] ?? -1;
          assert.ok(
            firstStudent >= 0 && firstStudent < danglingTail,
            "sayfa öğrenci kimliği olmadan önceki satırın veli artığıyla başlamamalı",
          );
        }
        assert.doesNotMatch(extracted, /Devam —/u, "taze sayfaya sığan öğrenci satırı bölünmemeli");
      }
    }
    assert.equal((await blob.arrayBuffer()).byteLength, file.bytes.byteLength);
  });
}

test("kalıcı snapshot yeniden yüklendiğinde PDF aynı öğrenci ve kapsamı korur", async () => {
  const snapshot = fixture();
  addRosterStudents(snapshot, 15);
  snapshot.students[7].displayName = "İpek Çağrı Öztürk";
  const restoredSnapshot = JSON.parse(JSON.stringify(snapshot));

  const file = await createClassRosterPdfDocument(
    {
      scope: { academicYearId: yearId, classroomId },
      snapshot: restoredSnapshot,
      schoolName: "Cumhuriyet Anaokulu",
      teacherName: "Emine Akış",
      generatedAt,
    },
    { runtime: { fontBytes: pdfFontBytes, boldFontBytes } },
  );

  assert.equal(file.rowCount, 15);
  if (hasPdfToText) assert.match(extractPdfText(file.bytes, false).replace(/\s+/gu, " "), /İpek Çağrı Öztürk/u);
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
    /data-label="Anne adı soyadı"><div class="cell-value"><span class="empty-value">—<\/span>/u,
  );
  assert.match(
    file.html,
    /data-label="Baba telefonu"><div class="cell-value"><span class="empty-value">—<\/span>/u,
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
  const repeatedTitleCount = file.html.match(/<h1>Sınıf Listesi<\/h1>/gu)?.length ?? 0;
  const lastPage = file.html.slice(
    file.html.lastIndexOf('<section class="roster-page roster-page--last"'),
  );
  const lastPageStudentRows = (lastPage.match(/class="student-detail-band"/gu) ?? []).length;

  assert.ok(pageCount >= 2, "çok satırlı liste birden fazla kontrollü sayfaya bölünmeli");
  assert.equal(repeatedTitleCount, pageCount, "kurum ve belge başlığı her sayfada yinelenmeli");
  assert.ok(lastPageStudentRows >= 1, "son sayfa yalnız imza veya tek satır bırakmamalı");
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

test("yatay iletişim çizelgesi her yakını, ayrı telefon ve meslekleri, kimlik ve açık adresi kayıpsız korur", async () => {
  const input = classRosterFixture(3);
  const html = createClassRosterDocument(input).html;
  const pdf = await createClassRosterPdfDocument(input, { runtime: { fontBytes: pdfFontBytes, boldFontBytes } });
  assert.match(Buffer.from(pdf.bytes).toString("latin1"), /\/MediaBox \[0 0 841\.89 595\.28\]/u);
  for (const field of ["Anne adı soyadı", "Anne telefonu", "Anne mesleği", "Baba adı soyadı", "Baba telefonu", "Baba mesleği", "3. kişi adı soyadı", "3. kişi yakınlığı / ünvanı", "3. kişi telefonu", "Ev adresi"]) {
    assert.ok(field === "Ev adresi" ? html.includes("Ev adresi:") : html.includes(`data-label="${field}"`), `ayrı hücre veya bant alanı: ${field}`);
  }
  const values = ["Kurgu Anne 1 Çınaroğlu", "Kurgu Baba 1 Çınaroğlu", "0532 000 00 01", "0532 000 00 02", "Üniversite öğretim görevlisi", "Elektrik mühendisi", "Kurgu Yakın 1 Çınaroğlu", "Kurgu İkinci Yakın", "Teyze", "Dede", "0532 000 00 03", "0532 000 00 04", "Eczacı", "Emekli", "10000000146", "10.09.2020", "2025", input.snapshot.students[0].careDetails.homeAddress, "Okul Öncesi Öğretmeni"];
  for (const value of values) assert.ok(html.includes(value), `HTML kaynak değeri: ${value}`);
  if (hasPdfToText) {
    const text = extractPdfText(pdf.bytes, false).replace(/\s+/gu, " ");
    for (const value of values) {
      // Physical line breaks can be inserted between words in narrow columns.
      assert.ok(text.includes(value), `PDF kaynak değeri: ${value}`);
    }
  }
  assert.doesNotMatch(html, /ÖZEL_ÇOCUK_NOTU|ÖZEL_AİLE_NOTU|Şehit çocuğu|Gazi çocuğu|Sınıf öğretmeni/iu);
  if (hasPdfToText) assert.doesNotMatch(extractPdfText(pdf.bytes), /ÖZEL_ÇOCUK_NOTU|ÖZEL_AİLE_NOTU|Şehit çocuğu|Gazi çocuğu|Sınıf öğretmeni/iu);
});

test("dört ek yakın aynı çocuğun anne babasıyla ana tabloda ve aynı sayfada kalır", async () => {
  const { turkishDocumentName, turkishDocumentAddress, turkishDocumentDescription } = await import("../../src/core/domain/turkish-document-display.ts");
  const input = classRosterExtremeFixture();
  const file = createClassRosterDocument(input);
  const sections = file.html.split('<section class="roster-page').filter((section) => section.includes('data-section="parents"'));
  const pagesWithFirstChild = sections.filter((section) => section.includes('data-student-sequence="1"'));
  assert.equal(pagesWithFirstChild.length, 1, "taze sayfaya sığan çocuk grubu bölünmemeli");
  const firstChildRows = [...pagesWithFirstChild[0].matchAll(/<tr data-student-sequence="1"[^>]*>([\s\S]*?)<\/tr>/gu)];
  assert.equal(firstChildRows.length, 4);
  for (const [index, row] of firstChildRows.entries()) {
    if (index === 0) {
      assert.match(row[1], /Kurgu Anne 1 Çınaroğlu/u);
      assert.match(row[1], /Kurgu Baba 1 Çınaroğlu/u);
    } else {
      assert.doesNotMatch(row[1], /Kurgu Anne 1 Çınaroğlu|Kurgu Baba 1 Çınaroğlu/u);
    }
    assert.ok(row[1].includes(input.snapshot.students[0].contacts.filter((contact) => contact.kind === "other")[index].phone));
  }
  assert.match(pagesWithFirstChild[0], /class="student-detail-band" data-student-sequence="1"/u);
  assert.ok(pagesWithFirstChild[0].includes(turkishDocumentAddress(input.snapshot.students[0].careDetails.homeAddress)));
  const pdf = await createClassRosterPdfDocument(input, { runtime: { fontBytes: pdfFontBytes, boldFontBytes } });
  if (hasPdfToText) {
    const pages = extractPdfText(pdf.bytes, false).split("\f").map((text) => text.replace(/\s+/gu, " "));
    const firstPage = pages.find((page) => page.includes("Kurgu Dördüncü Yakın"));
    assert.ok(firstPage);
    for (const value of ["Kurgu İkinci Yakın", "Kurgu Üçüncü Yakın", "Kurgu Anne 1 Çınaroğlu", "Kurgu Baba 1 Çınaroğlu", "0532 000 00 06"]) {
      assert.ok(firstPage.includes(value), `aynı sayfada iletişim: ${value}`);
    }
    const extracted = pages.join(" ").replace(/\s+/gu, "");
    const longStudent = input.snapshot.students[6];
    for (const value of [turkishDocumentName(longStudent.displayName), turkishDocumentAddress(longStudent.careDetails.homeAddress), ...longStudent.contacts.flatMap((contact) => [contact.name && turkishDocumentName(contact.name), contact.phone, contact.occupation && turkishDocumentDescription(contact.occupation)].filter(Boolean))]) {
      assert.ok(extracted.includes(value.replace(/\s+/gu, "")), "uzun kaynak değeri PDF'de eksiksiz korunmalı");
    }
  }
});
