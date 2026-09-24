import assert from "node:assert/strict";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE,
  SIMPLE_OBSERVATION_HTML_FILE_SIGNATURE,
  createSimpleObservationDocument,
  simpleObservationDocumentBlob,
} from "../../src/features/reports/simple-observation-document.ts";

const yearId = "00000000-0000-4000-8000-000000009101";
const classroomId = "00000000-0000-4000-8000-000000009102";
const otherClassroomId = "00000000-0000-4000-8000-000000009103";
const studentId = "00000000-0000-4000-8000-000000009201";
const otherStudentId = "00000000-0000-4000-8000-000000009202";
const studentTc = "10000000146";
const otherStudentTc = "11111111110";
const generatedAt = "2026-10-01T21:30:00.000Z";

function record(id, fields = {}) {
  return {
    id,
    createdAt: "2026-09-01T06:00:00.000Z",
    updatedAt: "2026-09-01T06:00:00.000Z",
    civilDate: "2026-09-01",
    schemaVersion: 1,
    ...fields,
  };
}

function fixture() {
  const snapshot = createEmptySnapshot();
  snapshot.academicYears.push(
    record(yearId, {
      name: "2026–2027 Eğitim Yılı",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
      status: "active",
    }),
  );
  snapshot.classrooms.push(
    record(classroomId, {
      academicYearId: yearId,
      name: "Güneş Sınıfı",
      status: "active",
    }),
    record(otherClassroomId, {
      academicYearId: yearId,
      name: "Deniz Sınıfı",
      status: "active",
    }),
  );
  snapshot.students.push(
    record(studentId, {
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: "Ada <Akış>",
      optionalCode: "17-A",
      nationalIdentityNumber: studentTc,
      contacts: [
        {
          id: "00000000-0000-4000-8000-000000009301",
          kind: "mother",
          relationship: "Anne",
          name: "Ayla Akış",
          phone: "+905321112233",
          isPrimary: true,
        },
      ],
    }),
    record(otherStudentId, {
      academicYearId: yearId,
      classroomId,
      active: true,
      enrollmentStatus: "active",
      displayName: "Gizli Çocuk",
      optionalCode: "99-X",
      nationalIdentityNumber: otherStudentTc,
      contacts: [
        {
          id: "00000000-0000-4000-8000-000000009302",
          kind: "father",
          relationship: "Baba",
          name: "Gizli Veli",
          phone: "+905559998877",
          isPrimary: true,
        },
      ],
    }),
  );
  return snapshot;
}

function create(snapshot, overrides = {}) {
  return createSimpleObservationDocument({
    audience: "parent",
    scope: { academicYearId: yearId, classroomId },
    snapshot,
    studentId,
    schoolName: "Cumhuriyet Anaokulu",
    teacherName: "Emine Akış",
    classroomName: "Güneş Sınıfı",
    academicYearName: "2026–2027 Eğitim Yılı",
    period: {
      startCivilDate: "2026-09-01",
      endCivilDate: "2026-09-30",
      label: "Eylül 2026",
    },
    generatedAt,
    ...overrides,
  });
}

test("veli belgesi yalnız seçili çocuğun tek-çocuk gözlemini taşır ve hassas veri sızdırmaz", () => {
  const snapshot = fixture();
  snapshot.observations.push(
    record("00000000-0000-4000-8000-000000009401", {
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      rawText: "Bloklarla <üçgen> kurdu & nedenini açıkladı.\n<script>alert('x')</script>",
      context: "Serbest <oyun>",
      childQuote: "Bunu ben yaptım & denedim.",
      observedAt: "2026-09-10T07:30:00.000Z",
      rawTextImmutable: true,
      civilDate: "2026-09-10",
    }),
    record("00000000-0000-4000-8000-000000009402", {
      academicYearId: yearId,
      classroomId,
      studentIds: [otherStudentId],
      rawText: `Gizli Çocuk kaydı ${otherStudentTc} +905559998877`,
      civilDate: "2026-09-11",
    }),
    record("00000000-0000-4000-8000-000000009403", {
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId, otherStudentId],
      rawText: "Birden fazla çocuk için ortak kayıt",
      civilDate: "2026-09-12",
    }),
    record("00000000-0000-4000-8000-000000009404", {
      academicYearId: yearId,
      classroomId: otherClassroomId,
      studentIds: [studentId],
      rawText: "Başka sınıf kaydı",
      civilDate: "2026-09-13",
    }),
    record("00000000-0000-4000-8000-000000009405", {
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      rawText: "Silinmiş kayıt",
      civilDate: "2026-09-14",
      deletedAt: "2026-09-15T08:00:00.000Z",
    }),
    record("00000000-0000-4000-8000-000000009406", {
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      rawText: "Dönem dışı kayıt",
      civilDate: "2026-10-01",
    }),
  );
  const before = structuredClone(snapshot);

  const file = create(snapshot);

  assert.deepEqual(snapshot, before, "belge üretimi ham gözlem zincirini değiştirmemeli");
  assert.equal(file.observationCount, 1);
  assert.match(file.html, /Ada &lt;Akış&gt;/u);
  assert.match(file.html, /Bloklarla &lt;üçgen&gt; kurdu &amp; nedenini açıkladı/u);
  assert.match(file.html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/u);
  assert.match(file.html, /Serbest &lt;oyun&gt;/u);
  assert.match(file.html, /Bunu ben yaptım &amp; denedim/u);
  assert.doesNotMatch(file.html, /<script/iu);
  assert.doesNotMatch(file.html, /Gizli Çocuk|Gizli Veli|Başka sınıf|Birden fazla|Silinmiş|Dönem dışı/u);
  assert.doesNotMatch(file.html, new RegExp(`${studentTc}|${otherStudentTc}|05321112233|0532998877|17-A|99-X`, "u"));
  assert.doesNotMatch(
    file.html,
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu,
  );
});

test("idare belgesi yalnız seçili çocuğun kimlik ve okul numarasını, öğretmen metni ile imza alanını içerir", () => {
  const snapshot = fixture();
  snapshot.observations.push(
    record("00000000-0000-4000-8000-000000009411", {
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      rawText: "Boyaları kendi seçti ve çalışmasını tamamladı.",
      civilDate: "2026-09-18",
    }),
    record("00000000-0000-4000-8000-000000009412", {
      academicYearId: yearId,
      classroomId,
      studentIds: [otherStudentId],
      rawText: "Gizli Çocuk başka gözlem",
      civilDate: "2026-09-18",
    }),
  );

  const file = create(snapshot, {
    audience: "administration",
    teacherSections: {
      strengths: "Seçeneklerini sözlü olarak açıkladı.",
      supportAreas: "Sırasını beklerken görsel hatırlatıcı kullanıldı.",
      homeSuggestions: "Birlikte resim hakkında açık uçlu konuşulabilir.",
    },
  });

  assert.equal(file.audience, "administration");
  assert.match(file.html, /İDAREYE SUNUM/u);
  assert.match(file.html, /Öğrenci no:<\/strong> 17-A/u);
  assert.match(file.html, new RegExp(`T\\.C\\. kimlik no:<\\/strong> ${studentTc}`, "u"));
  assert.match(file.html, /Cumhuriyet Anaokulu|Emine Akış|class="signature-line"/u);
  assert.match(file.html, /Seçeneklerini sözlü olarak açıkladı/u);
  assert.match(file.html, /Sırasını beklerken görsel hatırlatıcı kullanıldı/u);
  assert.match(file.html, /Birlikte resim hakkında açık uçlu konuşulabilir/u);
  assert.doesNotMatch(file.html, /Gizli Çocuk|11111111110|\+905559998877/u);
  assert.doesNotMatch(file.html, /\+905321112233|Ayla Akış/u);
});

test("seçili gözlem metninin içine yazılmış başka çocuk veya hassas bilgiyi fail-closed engeller", () => {
  const snapshot = fixture();
  snapshot.observations.push(
    record("00000000-0000-4000-8000-000000009415", {
      academicYearId: yearId,
      classroomId,
      studentIds: [studentId],
      rawText: "Ada, Gizli Çocuk ile birlikte kule kurdu.",
      civilDate: "2026-09-19",
    }),
  );

  assert.throws(
    () => create(snapshot),
    /başka bir çocuğa ait bilgi içerdiği/u,
  );

  snapshot.observations[0].rawText = `Ada çalışmasını bitirdi. ${studentTc}`;
  assert.throws(
    () => create(snapshot),
    /kimlik veya telefon bilgisi içerdiği/u,
  );

  snapshot.observations[0].rawText =
    "Teknik kaynak: 00000000-0000-4000-8000-000000009999";
  assert.throws(
    () => create(snapshot, { audience: "administration" }),
    /teknik kayıt kimliği içerdiği/u,
  );
});

test("legacy tekil studentId gözlemini korur, boş kayıtları atlar ve boş öğretmen alanı uydurmaz", () => {
  const snapshot = fixture();
  snapshot.observations.push(
    record("00000000-0000-4000-8000-000000009421", {
      academicYearId: yearId,
      classroomId,
      studentId,
      rawText: "Legacy gözlem metni aynen korunur.",
      civilDate: "2026-09-03",
    }),
    record("00000000-0000-4000-8000-000000009422", {
      academicYearId: yearId,
      classroomId,
      studentId,
      rawText: "   ",
      civilDate: "2026-09-04",
    }),
  );

  const file = create(snapshot);

  assert.equal(file.observationCount, 1);
  assert.match(file.html, /Legacy gözlem metni aynen korunur/u);
  assert.equal((file.html.match(/class="blank-lines"/gu) ?? []).length, 3);
  assert.doesNotMatch(file.html, /yaratıcı|başarılı|gelişim düzeyi|tanı|puan|sıralama/iu);

  snapshot.observations.length = 0;
  const emptyFile = create(snapshot);
  assert.equal(emptyFile.observationCount, 0);
  assert.match(emptyFile.html, /paylaşılabilir gözlem kaydı bulunmuyor/u);
});

test("scope, dönem, başlık ve UTC üretim zamanını fail-closed doğrular", () => {
  const snapshot = fixture();
  assert.throws(
    () => create(snapshot, { classroomName: "Başka Sınıf" }),
    /başlığı aktif sınıf ve eğitim yılı kaydıyla eşleşmelidir/u,
  );
  assert.throws(
    () =>
      create(snapshot, {
        period: {
          startCivilDate: "2026-09-30",
          endCivilDate: "2026-09-01",
        },
      }),
    /bitişi başlangıçtan önce olamaz/u,
  );
  assert.throws(
    () =>
      create(snapshot, {
        period: {
          startCivilDate: "2026-08-31",
          endCivilDate: "2026-09-05",
        },
      }),
    /aktif eğitim yılının içinde olmalıdır/u,
  );
  assert.throws(
    () => create(snapshot, { generatedAt: "2026-10-01T21:30:00+03:00" }),
    /UTC ISO-8601/u,
  );
  assert.throws(
    () =>
      create(snapshot, {
        scope: {
          academicYearId: yearId,
          classroomId: "00000000-0000-4000-8000-000000009999",
        },
      }),
    /Aktif sınıf ve eğitim yılı/u,
  );
});

test("dosya adı güvenli, HTML A4 baskıya hazır, dış kaynaksız ve Blob ile birebir aynıdır", async () => {
  const snapshot = fixture();
  snapshot.students.find((student) => student.id === studentId).displayName =
    "../Ada \\ : * ? \" < > | Akış..";
  const file = create(snapshot);
  const blob = simpleObservationDocumentBlob(file);
  const decoded = new TextDecoder().decode(file.bytes);

  assert.equal(file.generatedAt, generatedAt);
  assert.equal(file.generatedCivilDate, "2026-10-02");
  assert.equal(file.format, "html");
  assert.equal(file.mimeType, SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE);
  assert.equal(blob.type, SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE);
  assert.equal(blob.size, file.bytes.byteLength);
  assert.equal(await blob.text(), file.html);
  assert.ok(decoded.startsWith(SIMPLE_OBSERVATION_HTML_FILE_SIGNATURE));
  assert.doesNotMatch(file.fileName, /[\\/:*?"<>|]|\.\./u);
  assert.match(file.fileName, /^MaarifOS_Gozlem_Ozeti_Aile_.+_2026-09-01_2026-09-30\.html$/u);
  assert.match(file.html, /@page \{ size: A4 portrait; margin: 14mm; \}/u);
  assert.match(file.html, /page-break-inside: avoid/u);
  assert.match(file.html, /@media screen and \(max-width: 600px\)/u);
  assert.match(
    file.html,
    /\.context \{ grid-template-columns: minmax\(0, 1fr\)/u,
  );
  assert.match(
    file.html,
    /\.document-footer \{ grid-template-columns: minmax\(0, 1fr\)/u,
  );
  assert.match(file.html, /orphans: 3; widows: 3/u);
  assert.doesNotMatch(file.html, /https?:\/\//iu);
  assert.doesNotMatch(file.html, /<script/iu);
});
