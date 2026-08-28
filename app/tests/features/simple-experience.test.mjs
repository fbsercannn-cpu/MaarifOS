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
const planCreationSource = readFileSync(
  new URL("../../src/features/planning/PlanCreationFlow.tsx", import.meta.url),
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
const teacherPlanSource = readFileSync(
  new URL("../../src/features/planning/TeacherOwnedPlanScreen.tsx", import.meta.url),
  "utf8",
);
const premiumCenterSource = readFileSync(
  new URL("../../src/features/premium-plans/PremiumPlanCenterScreen.tsx", import.meta.url),
  "utf8",
);
const planWorkspaceSource = readFileSync(
  new URL("../../src/features/planning/PlanWorkspaceScreen.tsx", import.meta.url),
  "utf8",
);
const anecdoteCenterSource = readFileSync(
  new URL("../../src/features/anecdote/AnecdoteCenterPanel.tsx", import.meta.url),
  "utf8",
);
const documentWorkspaceModelSource = readFileSync(
  new URL("../../src/features/documents/document-workspace-model.ts", import.meta.url),
  "utf8",
);
const sensitivePdfShareSource = readFileSync(
  new URL("../../src/features/documents/sensitive-pdf-share.ts", import.meta.url),
  "utf8",
);

test("kişisel asistan ana ekranı tek gerekçeli eylem ve yinelenmeyen öğretmen masasıyla ilerletir", () => {
  assert.match(todaySource, /createMarifTeacherAgentBrief/);
  assert.match(todaySource, /Bugün için kısa özet/);
  assert.match(todaySource, /Sıradaki en iyi adım/);
  assert.match(todaySource, /assistantBrief\.rationale, \.\.\.assistantBrief\.evidence/);
  assert.match(todaySource, /\.slice\(0, 2\)/);
  assert.match(todaySource, /actions\.onOpenAttendance\(\)/);
  assert.match(todaySource, /actions\.onOpenDayClosure\(\)/);
  assert.match(todaySource, /actions\.onOpenPendingObservation\(\)/);
  assert.match(todaySource, /void actions\.onOpenCalendar\(\)/);
  assert.match(todaySource, /onOpenQuickObservation/);
  assert.match(todaySource, /Hızlı gözlem/);
  assert.equal(todaySource.match(/Hızlı gözlem/gu)?.length, 1);
  assert.match(todaySource, /assistantOwnsObservationAction/u);
  assert.match(todaySource, /simple-today__brief-action/);
  assert.match(todaySource, /ÖĞRETMEN MASASI/);
  assert.match(todaySource, /Bugünün işi tek yerde/);
  assert.match(todaySource, /Yaş bandı ve tarih rotasyonuna göre çevrimdışı fikirler/);
  assert.match(todaySource, /Bugünün akışını ve haftayı aç/);
  assert.match(todaySource, /advancedSupportOpen/);
  assert.match(todaySource, /Özgün etkinlik fikirleri/);
  assert.match(todaySource, /pedagojik\s+uygunluğu öğretmen sınıfın o günkü durumuna göre belirler/);
  assert.match(todaySource, /Öğretmen akışı/);
  assert.match(todaySource, /actions\.onOpenWeekDay\(day\.civilDate\)/);
  assert.doesNotMatch(todaySource, /simple-today__steps/);
  assert.doesNotMatch(todaySource, /simple-today__prepared|Ben hazırladım/);
  assert.doesNotMatch(todaySource, /premium|demo|alpha|kurucu|EÇE/iu);
});

test("eksik yaş bandı etkinlik, pedagojik akış ve TYMM hedeflerini fail-closed tutar", () => {
  assert.match(todaySource, /const dailySuggestions = suggestedAgeBand\s*\?/u);
  assert.match(todaySource, /const pedagogicalDay = suggestedAgeBand\s*\?/u);
  assert.match(todaySource, /Yaş bandı seçilmeden etkinlik önerisi gösterilmez/u);
  assert.match(todaySource, /sistem eksik\s*bilgiyi 48–60 ay olarak tahmin etmez/u);
  assert.match(todaySource, /actions\.onOpenSetupStep\("classroom"\)/u);
  assert.match(planCreationSource, /curriculumTargetsForResolvedAgeBand\(curriculumProfile, curriculumAgeBand\)/u);
  assert.match(planCreationSource, /Resmî yaş bandı seçilmeden hedef gösterilmez/u);
  assert.match(planCreationSource, /code: "plan\.age-profile"/u);
});

test("kişisel asistan 320 piksel telefonda dokunma ve yoğunluk sözleşmesini korur", () => {
  assert.match(todayStyleSource, /@media \(max-width: 360px\)/u);
  assert.match(todayStyleSource, /\.simple-icon-button \{[^}]*width: 48px;[^}]*height: 48px;/su);
  assert.match(todayStyleSource, /\.simple-today__brief-action \{[^}]*min-height: 44px;/su);
  assert.match(todayStyleSource, /\.simple-focus__action \{[^}]*min-height: 44px;/su);
  assert.match(todayStyleSource, /\.simple-today__desk-grid > button \{[^}]*min-height: 106px;/su);
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
  assert.match(plansSource, /Gelişmiş plan desteğini aç/);
  assert.match(plansSource, /advancedSupportOpen/);
  assert.match(plansSource, /simple-workspace__priority/u);
  assert.match(plansSource, /presentation\.priority\.levelId/u);
  assert.match(plansSource, /collectionItemCount/);
  assert.doesNotMatch(plansSource, /premium|EÇE|onay kutusu/iu);
});

test("tek-tık çıktılar sınıf, plan ve tek çocuk gözlem belgelerini birlikte sunar", () => {
  assert.match(documentsSource, /Sınıf listesi/);
  assert.match(documentsSource, /görsel A4 PDF/u);
  assert.match(documentsSource, /Görsel PDF indir/u);
  assert.match(documentsSource, /Sınıf listesini görsel PDF olarak paylaş/u);
  assert.match(documentsSource, /önce açık uyarı gösterilir/u);
  assert.match(documentsSource, /Dosya paylaşımı yoksa görsel PDF indirilir/u);
  assert.doesNotMatch(documentsSource, /A4 HTML dosyası/u);
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
  assert.match(prototypeSource, /ensureActivityStudioApplication/u);
  assert.match(prototypeSource, /request\.application\.sourceActivityId !== request\.activity\.id/u);
  assert.match(prototypeSource, /data-plan-item-actionable="false"/u);
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
  assert.match(plansSource, /Görsel PDF ve yazdırılabilir belgeleri hazırla/u);
});

test("canvas tabanlı uygulama çıktıları kullanıcıya tutarlı biçimde görsel PDF olarak adlandırılır", () => {
  assert.match(documentsSource, /return "Görsel PDF"/u);
  assert.match(prototypeSource, /plan görsel PDF belgesi hazırlandı/u);
  assert.match(prototypeSource, /sınıf listesi görsel PDF olarak indirildi/u);
  assert.match(prototypeSource, /görsel PDF veya DOCX alın/u);
  assert.match(teacherPlanSource, /Görsel PDF hazırlanıyor…/u);
  assert.match(teacherPlanSource, /Görsel PDF hazırla/u);
  assert.match(premiumCenterSource, /Ek 18 görsel PDF hazırlanıyor…/u);
  assert.match(premiumCenterSource, /Ek 18 ve ekini görsel PDF olarak indir/u);
  assert.match(premiumCenterSource, /Görsel PDF ve düzenlenebilir Word dosyası/u);
  assert.match(planWorkspaceSource, /Görsel PDF, DOCX, değerlendirme ve Ek 18/u);
  assert.match(anecdoteCenterSource, /Görsel PDF indir/u);
  assert.match(documentWorkspaceModelSource, /Onaylı formlar görsel PDF ve DOCX/u);
  assert.match(sensitivePdfShareSource, /sınıf listesi · görsel PDF/u);
  assert.match(sensitivePdfShareSource, /sınıf listesi görsel PDF belgesi/u);

  assert.doesNotMatch(documentsSource, /gerçek A4 PDF/u);
  assert.doesNotMatch(premiumCenterSource, />Gerçek PDF ve Word dosyası</u);
  assert.match(prototypeSource, /Resmî program PDF’sini aç/u);
});

test("sınıf listesi indirme düğmesi yaptığı işi dürüstçe adlandırır", () => {
  const classroomSource = readFileSync(
    new URL("../../src/features/simple-experience/SimpleClassroomScreen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(classroomSource, /Sınıf listesini indir/u);
  assert.doesNotMatch(classroomSource, /Sınıf listesini yazdır/u);
  assert.match(prototypeSource, /downloadSimpleClassRosterPdf/u);
  assert.match(prototypeSource, /shareSimpleClassRosterPdf/u);
  assert.match(prototypeSource, /onShareClassRoster=\{shareSimpleClassRoster\}/u);
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

test("Emine ana akışı ortak kodla hazır Maarif içeriklerini kapısız açar", () => {
  assert.match(
    prototypeSource,
    /import\("\.\/features\/access\/InviteAccessScreen\.tsx"\)/u,
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
  assert.match(plansSource, /onOpenBuiltInMaarifLibrary/u);
  assert.match(plansSource, /built-in-maarif-library-entry/u);
  assert.match(plansSource, /const builtInMaarifPlanEligible = ageBand === "60-72"/u);
  assert.match(plansSource, /Kaynak bütünlüğü doğrulanmış içerikler/u);
  assert.match(plansSource, /Hazır tam plan paketi yalnız 60–72 ay için yayımlandı/u);
  assert.match(plansSource, /\? onOpenAgeBandSetup[\s\S]{0,120}\? onOpenBuiltInMaarifLibrary[\s\S]{0,120}onOpenActivityStudio/u);
  assert.match(prototypeSource, /onOpenBuiltInMaarifLibrary=\{\(\) => openPremiumPlans\("overview"\)\}/u);
  assert.match(prototypeSource, /showProviderLibrary=\{\s*premiumPlanEntryEnabled && currentClassTymmAgeBand === "60-72"/u);
  assert.match(
    prototypeSource,
    /onOpenProviderLibrary=\{\(\s*initialSection = "overview",\s*builtInPackReference,\s*\) =>/u,
  );
  assert.match(
    prototypeSource,
    /openPremiumPlans\(\s*initialSection,\s*builtInPackReference \?\? null,\s*\)/u,
  );
  assert.match(prototypeSource, /sharedBuiltInAccess=\{!premiumLegacyRequested\}/u);
  assert.match(prototypeSource, /const premiumPlanEntryEnabled = true;/u);
  assert.match(prototypeSource, /if \(currentClassTymmAgeBand !== "60-72"\)/u);
  assert.doesNotMatch(
    prototypeSource,
    /Yıllık, aylık, haftalık ve günlük premium planlar/u,
  );
});
