import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const todaySource = readFileSync(
  new URL("../../src/features/simple-experience/SimpleTodayScreen.tsx", import.meta.url),
  "utf8",
);
const todayStyleSource = readFileSync(
  new URL("../../src/features/simple-experience/simple-experience.css", import.meta.url),
  "utf8",
);
const plansSource = readFileSync(
  new URL("../../src/features/simple-experience/SimplePlanWorkspaceScreen.tsx", import.meta.url),
  "utf8",
);
const documentsSource = readFileSync(
  new URL("../../src/features/simple-experience/SimpleDocumentWorkspaceScreen.tsx", import.meta.url),
  "utf8",
);
const simpleWorkspacesStyleSource = readFileSync(
  new URL("../../src/features/simple-experience/simple-workspaces.css", import.meta.url),
  "utf8",
);
const prototypeSource = readFileSync(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);

test("kişisel asistan ana ekranı tek gerekçeli eylem ve iki bağlamsal hazırlıkla ilerletir", () => {
  assert.match(todaySource, /createMarifTeacherAgentBrief/);
  assert.match(todaySource, /Bugün için kısa özet/);
  assert.match(todaySource, /Sıradaki en iyi adım/);
  assert.match(todaySource, /Ben hazırladım/);
  assert.match(todaySource, /assistantBrief\.rationale, \.\.\.assistantBrief\.evidence/);
  assert.match(todaySource, /\.slice\(0, 2\)/);
  assert.match(todaySource, /TYMM günlük planı/);
  assert.match(todaySource, /Veli ve idare çıktıları/);
  assert.match(todaySource, /Oyun ve materyal fikirleri/);
  assert.match(todaySource, /actions\.onOpenAttendance\(\)/);
  assert.match(todaySource, /actions\.onOpenDayClosure\(\)/);
  assert.match(todaySource, /actions\.onOpenPendingObservation\(\)/);
  assert.match(todaySource, /void actions\.onOpenCalendar\(\)/);
  assert.match(todaySource, /onOpenQuickObservation/);
  assert.match(todaySource, /Hızlı gözlem/);
  assert.match(todaySource, /simple-today__brief-action/);
  assert.match(todaySource, /ÖĞRETMEN MASASI/);
  assert.match(todaySource, /Bugünün işi tek yerde/);
  assert.match(
    todaySource,
    /ACTIVITY_STUDIO_ITEMS\.length\} özgün etkinlik · \{ACTIVITY_YEAR_RECOMMENDATION_SLOT_COUNT\} yıllık öneri yuvası/,
  );
  assert.match(todaySource, /Hazır etkinlik önerileri/);
  assert.match(todaySource, /Öğretmen akışı/);
  assert.match(todaySource, /actions\.onOpenWeekDay\(day\.civilDate\)/);
  assert.doesNotMatch(todaySource, /simple-today__steps/);
  assert.doesNotMatch(todaySource, /premium|demo|alpha|kurucu|EÇE/iu);
});

test("kişisel asistan 320 piksel telefonda dokunma ve yoğunluk sözleşmesini korur", () => {
  assert.match(todayStyleSource, /@media \(max-width: 360px\)/u);
  assert.match(todayStyleSource, /\.simple-icon-button \{[^}]*width: 48px;[^}]*height: 48px;/su);
  assert.match(todayStyleSource, /\.simple-today__brief-action \{[^}]*min-height: 44px;/su);
  assert.match(todayStyleSource, /\.simple-focus__action \{[^}]*min-height: 44px;/su);
  assert.match(todayStyleSource, /\.simple-today__prepared-list > button \{[^}]*min-height: 78px;/su);
  assert.match(todayStyleSource, /grid-template-columns: minmax\(0, 1fr\) minmax\(116px, 132px\)/u);
  assert.match(todayStyleSource, /\.simple-today__context-item strong \{[^}]*white-space: normal;/su);
  assert.doesNotMatch(todayStyleSource, /linear-gradient|radial-gradient/iu);
});

test("planlar yalnız Maarif Modelini ve okulun manuel etkinliklerini öne çıkarır", () => {
  assert.match(plansSource, /Yalnız Türkiye Yüzyılı Maarif Modeli/);
  assert.match(plansSource, /TYMM RESMÎ TEMEL/);
  assert.match(plansSource, /DESTEK BELGESİ/);
  assert.match(plansSource, /Okul etkinliği ekle/);
  assert.match(plansSource, /Oyun ve materyaller/);
  assert.match(plansSource, /Hazır etkinlik koleksiyonları/);
  assert.match(plansSource, /Planı kaydetmeden önce/);
  assert.match(plansSource, /ACTIVITY_STUDIO_ITEMS\.length/);
  assert.match(plansSource, /collectionItemCount/);
  assert.doesNotMatch(plansSource, /premium|EÇE|onay kutusu/iu);
});

test("tek-tık çıktılar sınıf, plan ve tek çocuk gözlem belgelerini birlikte sunar", () => {
  assert.match(documentsSource, /Sınıf listesi/);
  assert.match(documentsSource, /Aylık eğitim planı/);
  assert.match(documentsSource, /Haftalık çalışma akışı/);
  assert.match(documentsSource, /Yıllık planlama panosu/);
  assert.match(documentsSource, /Veli veya idare özeti/);
  assert.match(documentsSource, /T\.C\. kimlik ve veli telefonu yalnız idare listesindedir/);
  assert.doesNotMatch(documentsSource, /premium|EÇE|etkinleştir/iu);
});

test("çıktılar gerçek hazır olma durumunu ve dürüst eylemi gösterir", () => {
  assert.match(documentsSource, /"ready"\s*\|\s*"needs-setup"\s*\|\s*"needs-content"\s*\|\s*"incomplete"/u);
  assert.match(documentsSource, /outputStates\?: Partial<Record<SimpleDocumentOutputId, SimpleDocumentOutputState>>/u);
  assert.match(documentsSource, /outputStates\?\.\[output\.id\] \?\? defaultOutputState/u);
  assert.match(documentsSource, /Bilgileri tamamla/u);
  assert.match(documentsSource, /Planı hazırla/u);
  assert.match(documentsSource, /Gözlem ekle/u);
  assert.match(documentsSource, /Yılı tamamla/u);
  assert.match(documentsSource, /Yazdırılabilir dosya/u);
  assert.doesNotMatch(documentsSource, /className="simple-state is-ready"/u);
});

test("sade çıktı satırları küçük telefonda da okunabilir ve dokunulabilir kalır", () => {
  assert.match(simpleWorkspacesStyleSource, /\.simple-action-list small \{[^}]*font-size: 12px/su);
  assert.match(simpleWorkspacesStyleSource, /\.simple-state \{[^}]*font-size: 12px/su);
  assert.match(simpleWorkspacesStyleSource, /\.simple-classroom__archive summary \{[^}]*min-height: 44px/su);
  assert.match(simpleWorkspacesStyleSource, /\.simple-classroom__archive button \{\s*min-height: 44px/su);
  assert.match(simpleWorkspacesStyleSource, /"icon state arrow"/u);
  assert.doesNotMatch(simpleWorkspacesStyleSource, /\.simple-state \{\s*display: none/su);
});

test("uygulama yönlendiricisi sade ekranları ana gezinmeye bağlar", () => {
  assert.match(prototypeSource, /SimpleTodayScreen/);
  assert.match(prototypeSource, /SimpleClassroomScreen/);
  assert.match(prototypeSource, /SimplePlanWorkspaceScreen/);
  assert.match(prototypeSource, /SimpleDocumentWorkspaceScreen/);
  assert.match(prototypeSource, /ActivityStudio/);
  assert.match(prototypeSource, /SimpleObservationOutputSheet/);
  assert.match(prototypeSource, /downloadSimpleObservation/);
  assert.match(prototypeSource, /onOpenQuickObservation: \(\) =>/u);
  assert.match(prototypeSource, /createActivityStudioObservationSeed\(request\)/u);
  assert.match(
    prototypeSource,
    /initialStudentId === undefined \|\| initialStudentId === nextStudentId/u,
  );
});

test("plan hızlı araçları hedef yüzeyi görünür ve açıklanmış biçimde açar", () => {
  assert.match(
    prototypeSource,
    /onOpenCalendar=\{\(\) =>\s*void openAcademicCalendar\(attendanceCivilDate, true\)/u,
  );
  assert.match(prototypeSource, /calendarEntryTitleRef\.current\?\.focus\(\)/u);
  assert.match(prototypeSource, /ref=\{calendarEntryTitleRef\}/u);
  assert.match(prototypeSource, /setAnnouncement\("Çıktılar\."\)/u);
  assert.match(plansSource, /PDF ve yazdırılabilir belgeleri hazırla/u);
});

test("sınıf listesi indirme düğmesi yaptığı işi dürüstçe adlandırır", () => {
  const classroomSource = readFileSync(
    new URL("../../src/features/simple-experience/SimpleClassroomScreen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(classroomSource, /Sınıf listesini indir/u);
  assert.doesNotMatch(classroomSource, /Sınıf listesini yazdır/u);
});

test("eski EÇE sınıfı aynı dönemde arşivlenerek yeni TYMM kapsamına taşınır", () => {
  assert.match(prototypeSource, /samePeriodCurriculumTransitionRequired/);
  assert.match(prototypeSource, /same-period-curriculum/);
  assert.match(prototypeSource, /Eski EÇE sınıfı salt okunur arşivlendi/);
  assert.match(prototypeSource, /curriculumProfile\?\.framework !== "tymm"/);
  assert.match(prototypeSource, /Maarif Modeli sınıfını oluştur/);
  assert.doesNotMatch(prototypeSource, /className="classroom-setup-sequence"/u);
  assert.match(prototypeSource, /<details className="classroom-calendar-details">/u);
});

test("Emine ana akışı ortak davet erişimini kullanır ve geçmiş ücretli yüzeyi açmaz", () => {
  assert.match(
    prototypeSource,
    /import \{ InviteAccessScreen \} from "\.\/features\/access\/InviteAccessScreen\.tsx";/u,
  );
  assert.match(
    prototypeSource,
    /import \{ hasLocalSharedAccess \} from "\.\/features\/access\/local-shared-access\.ts";/u,
  );
  assert.match(
    prototypeSource,
    /const premiumLegacyRequested = false;/u,
  );
  assert.match(
    prototypeSource,
    /if \(sharedInviteRequired && !sharedInviteGranted\)/u,
  );
  assert.match(prototypeSource, /onAccessGranted=\{\(\) => setSharedInviteGranted\(true\)\}/u);
  assert.match(prototypeSource, /\{premiumLegacyRequested \? \(/u);
  assert.doesNotMatch(todaySource, /onOpenPremiumPlans/u);
  assert.doesNotMatch(plansSource, /onOpenPlanLibrary/u);
  assert.doesNotMatch(
    prototypeSource,
    /onOpenProviderLibrary=|showProviderLibrary=/u,
  );
});
