import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const planFlowSource = await readFile(
  new URL("../../src/features/planning/PlanCreationFlow.tsx", import.meta.url),
  "utf8",
);
const prototypeSource = await readFile(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);
const scheduledSource = await readFile(
  new URL("../../src/features/planning/scheduled-plan-workspace.ts", import.meta.url),
  "utf8",
);
const evidenceSource = await readFile(
  new URL("../../src/features/evidence/evidence-flow.ts", import.meta.url),
  "utf8",
);
const todaySource = await readFile(
  new URL("../../src/features/today/today-data.ts", import.meta.url),
  "utf8",
);
const teacherPlanScreenSource = await readFile(
  new URL("../../src/features/planning/TeacherOwnedPlanScreen.tsx", import.meta.url),
  "utf8",
);
const teacherPlanDocumentSource = await readFile(
  new URL("../../src/features/planning/teacher-owned-plan-document.ts", import.meta.url),
  "utf8",
);
const prototypeCssSource = await readFile(
  new URL("../../src/prototype.css", import.meta.url),
  "utf8",
);

test("öğretmen planı gerçek haftada 10 bölümlü düzenleme yüzeyini açar ve komuta taşır", () => {
  assert.match(planFlowSource, /data-testid="teacher-owned-daily-flow-editor"/);
  assert.match(planFlowSource, /introHeadingRef/);
  assert.match(planFlowSource, /scroll\.scrollTop = 0/);
  assert.match(planFlowSource, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(planFlowSource, /placeholder="Örn\. Bahçede gölge incelemesi"[\s\S]{0,120}autoFocus/);
  assert.match(prototypeCssSource, /\.plan-save-dock\s*\{[\s\S]{0,80}position:\s*fixed/);
  assert.match(prototypeCssSource, /\.d1-flow-scroll \.d1-flow-content[\s\S]{0,100}176px/);
  assert.match(planFlowSource, /<\/MobileScroll>[\s\S]{0,120}<section[\s\S]{0,100}className="plan-save-dock"/);
  assert.match(planFlowSource, /defaultTeacherOwnedDailyFlowBlockDrafts/);
  assert.match(planFlowSource, /teacherOwnedDailyFlowBlocks/);
  assert.match(prototypeSource, /teacherOwnedDailyFlowContext=\{/);
  assert.match(prototypeSource, /weeklyPlanId: teacherWorkCycle\.weekly\.id/);
});

test("varsayılan akış ayrı onay kutusu olmadan güncel revizyonu kaydeder", () => {
  assert.doesNotMatch(planFlowSource, /10 bölümlü günlük akışı gözden geçirdiğinizi onaylayın/);
  assert.doesNotMatch(planFlowSource, /teacherOwnedDailyFlowEnabled && !teacherOwnedDailyFlowReviewed/);
  assert.doesNotMatch(planFlowSource, /Bir alan değişirse yeniden onay gerekir/);
  assert.match(planFlowSource, /Günün 10 bölümlük akışı hazırdır/);
  assert.match(planFlowSource, /Günün akışı hazır/);
  assert.match(planFlowSource, /İsterseniz düzenleyin/);
  assert.match(planFlowSource, /Süreleri sınıf gününe eşit dağıt/);
  assert.match(planFlowSource, /block\.status === "planned"/);
  assert.match(planFlowSource, /\{index \+ 1\}\. \{block\.title\} — bölümü düzenle/);
});

test("gelecek plan editörü teacher-owned akışı premiumdan ayırır ve atomik revizyona taşır", () => {
  assert.match(scheduledSource, /teacherOwnedDailyFlowBlocks:/);
  assert.match(scheduledSource, /isTeacherOwnedDailyFlow\(plan\.teacherOwnedDailyFlow\)/);
  assert.match(evidenceSource, /reviseTeacherOwnedDailyFlow/);
  assert.match(
    evidenceSource,
    /Premium akış ile öğretmenin günlük akışı aynı revizyonda birleştirilemez/,
  );
});

test("gerçek etkinlik exact öğretmen akış bölümüne bağlanır ve Today aynı bağı tüketir", () => {
  assert.match(planFlowSource, /teacherOwnedActivityBlockKind/);
  assert.match(planFlowSource, /Gerçek etkinlik hangi bölümde uygulanacak/);
  assert.match(evidenceSource, /teacherOwnedFlowBlockId/);
  assert.match(todaySource, /kind: "teacher-flow-block"/);
  assert.match(todaySource, /record\.teacherOwnedFlowBlockId === block\.id/);
});

test("önceki gün taslağı yalnız fark önizlemesiyle taşınır ve güncel revizyona kaydedilir", () => {
  assert.match(planFlowSource, /data-testid="teacher-owned-flow-copy"/);
  assert.match(planFlowSource, /Dünden getir/);
  assert.match(planFlowSource, /gözlem ve kayıt kimlikleri kopyalanmaz/);
  assert.match(planFlowSource, /Haftadan seç/);
  assert.match(planFlowSource, /teacherOwnedDailyFlowTemplateSource/);
  assert.match(scheduledSource, /loadTeacherOwnedDailyFlowCopySources/);
  assert.match(prototypeSource, /teacherOwnedDailyFlowCopySources/);
  assert.match(evidenceSource, /sourceFlowRevisionNumber/);
});

test("süre farkı tek esnek bölümle kapatılır ve skipped zaman uygulanmış gibi sunulmaz", () => {
  assert.match(planFlowSource, /teacherOwnedDurationAdjustmentBlock/);
  assert.match(planFlowSource, /dk uygulanmayacak açık zaman/);
  assert.match(planFlowSource, /teacher-owned-flow-adjust-one/);
  assert.match(planFlowSource, /Gün takvimi sınıfın çalışma süresiyle tam eşleşiyor/);
});

test("belge kapsamı tek tıkla indirilir; bütünlük denetimi içeride ve onay kutusuz kalır", () => {
  assert.match(teacherPlanScreenSource, /Tek tıkla çıktı/);
  assert.match(teacherPlanScreenSource, /Görsel PDF hazırla/);
  assert.match(teacherPlanScreenSource, /Word hazırla/);
  assert.match(teacherPlanScreenSource, /şema, tarih, kaynak/);
  assert.doesNotMatch(teacherPlanScreenSource, /Belgeyi önizle/);
  assert.doesNotMatch(teacherPlanScreenSource, /documentApproved/);
  assert.match(teacherPlanDocumentSource, /buildStandaloneTeacherOwnedPlanPreview/);
  assert.match(teacherPlanDocumentSource, /Denetim eki · kayıt ve kanıt kimlikleri/);
  assert.match(teacherPlanDocumentSource, /includeAuditAppendix/);
});
