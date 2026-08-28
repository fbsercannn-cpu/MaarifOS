import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createEmptySnapshot } from "../../src/core/domain/model.ts";
import {
  generateStandaloneTeacherOwnedPlanExportFile,
  teacherOwnedPlanDocumentBasisLabel,
} from "../../src/features/planning/teacher-owned-plan-document.ts";

const annualId = "00000000-0000-4000-8000-000000000a03";
const monthlyId = "00000000-0000-4000-8000-000000000a04";
const weeklyId = "00000000-0000-4000-8000-000000000a05";
const dailyId = "00000000-0000-4000-8000-000000000a06";
const pdfFontBytes = new Uint8Array(readFileSync(new URL(
  "../../public/assets/fonts/MaarifOSSans-Regular.ttf",
  import.meta.url,
)));

const base = {
  planOrigin: "teacher-authored",
  status: "active",
  academicYearId: "00000000-0000-4000-8000-000000000a01",
  classroomId: "00000000-0000-4000-8000-000000000a02",
  createdAt: "2026-09-02T06:00:00.000Z",
  updatedAt: "2026-09-02T06:00:00.000Z",
  deletedAt: null,
  schemaVersion: 1,
  revisionNumber: 1,
  revisionHistory: [],
};

function syntheticGraph() {
  return {
    annual: {
      ...base,
      id: annualId,
      planType: "annual",
      title: "2026–2027 Öğretmen Yıllık Planı",
      civilDate: "2026-09-07",
      periodStart: "2026-09-07",
      periodEnd: "2027-06-25",
      teacherContent: { narrative: "Oyun, gözlem ve birlikte yaşam" },
      monthlySectionIds: [monthlyId],
    },
    months: [
      {
        monthly: {
          ...base,
          id: monthlyId,
          planType: "monthly",
          annualPlanId: annualId,
          title: "Eylül Öğretmen Planı",
          monthKey: "2026-09",
          civilDate: "2026-09-07",
          periodStart: "2026-09-07",
          periodEnd: "2026-09-30",
          teacherContent: {
            narrative: "Uyum ve aidiyet",
            tymmTargetCodes: ["TADB.1.a"],
          },
          weeklySectionIds: [weeklyId],
        },
        weeks: [
          {
            ...base,
            id: weeklyId,
            planType: "weekly",
            annualPlanId: annualId,
            monthlyPlanId: monthlyId,
            title: "7–11 Eylül Haftası",
            weekKey: "2026-09-07_2026-09-11",
            civilDate: "2026-09-07",
            periodStart: "2026-09-07",
            periodEnd: "2026-09-11",
            teacherContent: { narrative: "Karşılama, oyun ve gözlem" },
          },
        ],
      },
    ],
  };
}

const context = {
  schoolName: "Kurgu İlkokulu",
  teacherName: "Emine Akış",
  classroomName: "Güneş Sınıfı",
  academicYearName: "2026–2027",
  ageGroup: "48–60",
  curriculumProgram: "Türkiye Yüzyılı Maarif Modeli",
};

const emptyStore = {
  async readSnapshot() {
    return createEmptySnapshot();
  },
};

const planStore = {
  async readSnapshot() {
    const snapshot = createEmptySnapshot();
    snapshot.plans.push({
      ...base,
      id: dailyId,
      planType: "daily",
      title: "9 Eylül Günlük Öğretmen Planı",
      civilDate: "2026-09-09",
      periodStart: "2026-09-09",
      periodEnd: "2026-09-09",
      sourceAnnualPlanId: annualId,
      sourceMonthlyPlanId: monthlyId,
      sourceWeeklyPlanId: weeklyId,
      teacherContent: { narrative: "Gölge izleri ve özgür oyun" },
    });
    snapshot.activities.push({
      ...base,
      id: "00000000-0000-4000-8000-000000000a07",
      planId: dailyId,
      title: "Gölge izleri",
      status: "planned",
      civilDate: "2026-09-09",
      sourceAnnualPlanId: annualId,
      sourceMonthlyPlanId: monthlyId,
      sourceWeeklyPlanId: weeklyId,
      curriculumTargets: [],
    });
    return snapshot;
  },
};

const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

test("tek tık Word çıktısı kurum, öğretmen ve imza bağlamını taşır; standart belgede UUID göstermez", async () => {
  const file = await generateStandaloneTeacherOwnedPlanExportFile(
    syntheticGraph(),
    emptyStore,
    "word",
    { kind: "monthly", monthlyPlanId: monthlyId },
    context,
  );
  const text = file.paragraphs.map((paragraph) => paragraph.text).join("\n");

  assert.equal(new TextDecoder().decode(file.bytes.slice(0, 2)), "PK");
  assert.equal(file.fileName, "MaarifOS_Ogretmen_Plani_Aylik_2026-09.docx");
  assert.match(text, /TYMM resmî plan temeli/);
  assert.match(text, /TADB\.1\.a/);
  assert.match(text, /Aylık Eğitim Planı · Eylül Öğretmen Planı/);
  assert.match(text, /Okul: Kurgu İlkokulu/);
  assert.match(text, /Sınıf: Güneş Sınıfı/);
  assert.match(text, /Öğretmen: Emine Akış/);
  assert.match(text, /Eğitim yılı: 2026–2027/);
  assert.match(text, /Yaş grubu: 48–60 ay/);
  assert.match(text, /Adı soyadı: Emine Akış/);
  assert.match(text, /İmza: _+/);
  assert.doesNotMatch(text, uuidPattern);
  assert.doesNotMatch(text, /Denetim eki|Kayıt zinciri/);
  assert.doesNotMatch(text, /teacher-review-required|Taslak durumu|sourceOutlineMonthKey/);
});

test("tek tık PDF çıktısı haftalık/yıllık kapsamı destek belgesi diye doğru etiketler", async () => {
  const originalDocument = globalThis.document;
  const context2d = {
    fillStyle: "",
    font: "",
    textAlign: "left",
    fillRect() {},
    fillText() {},
    measureText(value) {
      return { width: String(value).length * 10 };
    },
  };
  globalThis.document = {
    fonts: { ready: Promise.resolve() },
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context2d,
      toDataURL: () => "data:image/jpeg;base64,/9j/2Q==",
    }),
  };
  try {
    const file = await generateStandaloneTeacherOwnedPlanExportFile(
      syntheticGraph(),
      emptyStore,
      "pdf",
      { kind: "weekly", weeklyPlanId: weeklyId },
      context,
      { fontBytes: pdfFontBytes },
    );
    const text = file.paragraphs.map((paragraph) => paragraph.text).join("\n");
    assert.equal(new TextDecoder().decode(file.bytes.slice(0, 4)), "%PDF");
    assert.match(text, /MaarifOS destek belgesi/);
    assert.match(text, /İmza: _+/);
    assert.doesNotMatch(text, uuidPattern);
    assert.equal(teacherOwnedPlanDocumentBasisLabel("daily"), "TYMM resmî plan temeli");
    assert.equal(teacherOwnedPlanDocumentBasisLabel("monthly"), "MaarifOS destek belgesi");
    assert.equal(
      teacherOwnedPlanDocumentBasisLabel("monthly", true),
      "TYMM resmî plan temeli",
    );
    assert.equal(teacherOwnedPlanDocumentBasisLabel("weekly"), "MaarifOS destek belgesi");
    assert.equal(teacherOwnedPlanDocumentBasisLabel("combined"), "MaarifOS destek belgesi");
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test("günlük, haftalık, aylık ve birleşik planların tamamı semantik PDF çekirdeğini kullanır", async () => {
  const cases = [
    [{ kind: "daily", dailyPlanId: dailyId }, /Gunluk_2026-09-09\.pdf$/u],
    [{ kind: "weekly", weeklyPlanId: weeklyId }, /Haftalik_2026-09-07\.pdf$/u],
    [{ kind: "monthly", monthlyPlanId: monthlyId }, /Aylik_2026-09\.pdf$/u],
    [{ kind: "combined" }, /Birlesik\.pdf$/u],
  ];
  for (const [scope, fileNamePattern] of cases) {
    const file = await generateStandaloneTeacherOwnedPlanExportFile(
      syntheticGraph(),
      planStore,
      "pdf",
      scope,
      context,
      { fontBytes: pdfFontBytes },
    );
    const bytesAsLatin1 = Buffer.from(file.bytes).toString("latin1");
    assert.match(file.fileName, fileNamePattern);
    assert.match(bytesAsLatin1, /\/Lang \(tr-TR\)/u);
    assert.match(bytesAsLatin1, /\/StructTreeRoot\b/u);
    assert.match(bytesAsLatin1, /\/MarkInfo << \/Marked true/u);
    assert.match(bytesAsLatin1, /\/FontFile2\b/u);
    assert.match(bytesAsLatin1, /\/ToUnicode\b/u);
    assert.doesNotMatch(bytesAsLatin1, /\/Subtype \/Image\b/u);
  }
});

test("teknik kimlikler yalnız açıkça istenen ayrı denetim ekinde korunur", async () => {
  const file = await generateStandaloneTeacherOwnedPlanExportFile(
    syntheticGraph(),
    emptyStore,
    "word",
    { kind: "combined" },
    { ...context, includeAuditAppendix: true },
  );
  const text = file.paragraphs.map((paragraph) => paragraph.text).join("\n");
  assert.match(text, /Denetim eki · kayıt ve kanıt kimlikleri/);
  assert.match(text, new RegExp(annualId));
  assert.match(text, new RegExp(monthlyId));
  assert.match(text, new RegExp(weeklyId));
});

test("öğretmenin takvime eklediği okul etkinliği ilgili plan çıktısına girer", async () => {
  const calendarStore = {
    async readSnapshot() {
      const snapshot = createEmptySnapshot();
      snapshot.calendarEntries.push({
        ...base,
        id: "00000000-0000-4000-8000-000000000a06",
        title: "Kütüphane ve masal günü",
        note: "Çocuklar sevdikleri kitabı getirecek.",
        entryType: "activity",
        startDate: "2026-09-09",
        endDate: "2026-09-09",
      });
      return snapshot;
    },
  };
  const file = await generateStandaloneTeacherOwnedPlanExportFile(
    syntheticGraph(),
    calendarStore,
    "word",
    { kind: "weekly", weeklyPlanId: weeklyId },
    context,
  );
  const text = file.paragraphs.map((paragraph) => paragraph.text).join("\n");
  assert.match(text, /Okulun ek etkinlikleri/);
  assert.match(text, /2026-09-09 · Okul etkinliği: Kütüphane ve masal günü/);
  assert.match(text, /Çocuklar sevdikleri kitabı getirecek/);
});
