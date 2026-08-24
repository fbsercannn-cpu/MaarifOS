import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  CLASS_ROSTER_DOCUMENT_MIME_TYPE,
  CLASS_ROSTER_HTML_FILE_SIGNATURE,
  classRosterDocumentBlob,
  createClassRosterDocument,
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
