import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const prototypeSource = readFileSync(
  new URL("../../src/Prototype.tsx", import.meta.url),
  "utf8",
);
const prototypeStyleSource = readFileSync(
  new URL("../../src/prototype.css", import.meta.url),
  "utf8",
);
const observationPickerSource = readFileSync(
  new URL(
    "../../src/features/evidence/DevelopmentObservationPicker.tsx",
    import.meta.url,
  ),
  "utf8",
);
const planWorkspaceSource = readFileSync(
  new URL(
    "../../src/features/simple-experience/SimplePlanWorkspaceScreen.tsx",
    import.meta.url,
  ),
  "utf8",
);
const officialLibraryPanelSource = readFileSync(
  new URL(
    "../../src/features/curriculum/TymmOfficialLibraryPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);
const officialLibraryPanelStyleSource = readFileSync(
  new URL(
    "../../src/features/curriculum/tymm-official-library.css",
    import.meta.url,
  ),
  "utf8",
);
const developmentReportDialogSource = readFileSync(
  new URL(
    "../../src/features/development/DevelopmentReportDialog.tsx",
    import.meta.url,
  ),
  "utf8",
);
const developmentReportExportSource = readFileSync(
  new URL(
    "../../src/features/development/development-report-export.ts",
    import.meta.url,
  ),
  "utf8",
);

test("yaş rehberi seçili yaşın resmî sayfasını ve dört örneğini kapalı ayrıntıda gösterir", () => {
  assert.match(prototypeSource, /getTymmOfficialAgeResource\(/u);
  assert.match(prototypeSource, /Resmî program ve plan kaynağı/u);
  assert.match(prototypeSource, /Yaş bandına göre öğrenme çıktıları/u);
  assert.match(prototypeSource, />\s*Yaş rehberini aç\s*</u);
  assert.doesNotMatch(prototypeSource, /Yaş bandına göre gelişim çıktıları/u);
  assert.match(
    prototypeSource,
    /MaarifOS uygulama notu · resmî gelişim basamağı değildir/u,
  );
  assert.match(prototypeSource, /className="tymm-official-examples"/u);
  assert.match(prototypeSource, /<strong>Resmî örnek planlar<\/strong>/u);
  assert.match(prototypeSource, /selectedTymmOfficialAgeResource\.examples\.map/u);
  assert.match(prototypeSource, /Bu bağlantılar MEB’de yayımlanan örneklere gider/u);
  assert.match(prototypeSource, /uygulamaya otomatik kurulmaz/u);
  assert.match(prototypeSource, /sınıfınıza göre inceleyip/u);
  assert.doesNotMatch(
    prototypeSource,
    /<code>official-example<\/code>|<small>official-example/u,
  );
  assert.doesNotMatch(
    prototypeSource,
    /<details[\s\S]{0,120}className="tymm-official-examples"[\s\S]{0,80}\sopen(?:=|\s|>)/u,
  );
  assert.match(
    prototypeSource,
    /className="tymm-program-details"[\s\S]{0,180}<strong>Program ayrıntıları<\/strong>/u,
  );
  assert.doesNotMatch(
    prototypeSource,
    /<details[\s\S]{0,120}className="tymm-program-details"[\s\S]{0,80}\sopen(?:=|\s|>)/u,
  );
  assert.match(
    prototypeSource,
    /className="tymm-age-tabs" role="group" aria-label="TYMM yaş bandı"/u,
  );
  assert.match(
    prototypeSource,
    /className="tymm-domain-tabs" role="group" aria-label="Öğrenme alanları"/u,
  );
  assert.doesNotMatch(prototypeSource, /role="tablist"|role="tab"|role="tabpanel"/u);
  assert.match(prototypeSource, /aria-pressed=\{selectedTymmGuide\.ageBand === guide\.ageBand\}/u);
  assert.match(prototypeSource, /aria-pressed=\{tymmGuideDomain === item\.domain\}/u);
});

test("program ve gelişim gözlemi bağlantıları güncel erişim URL'sini kullanır", () => {
  assert.match(
    prototypeSource,
    /href=\{TYMM_OFFICIAL_RESOURCE_CATALOG\.programPdf\.url\}/u,
  );
  assert.match(
    observationPickerSource,
    /href=\{`\$\{TYMM_OFFICIAL_PROGRAM_PDF_URL\}#page=\$\{selected\.curriculumReference\.sourcePage\}`\}/u,
  );
  assert.doesNotMatch(
    observationPickerSource,
    /href=\{selected\.curriculumReference\.sourceUrl\}/u,
  );
  assert.match(
    observationPickerSource,
    /selected\.curriculumReference\.sourcePage/u,
  );
  assert.match(observationPickerSource, /\(yeni sekmede\)/u);
  assert.match(observationPickerSource, /Resmî öğrenme çıktısı/u);
  assert.doesNotMatch(observationPickerSource, /Resmî program çıktısı/u);
  assert.match(
    developmentReportDialogSource,
    /resolveTymmOfficialProgramAccessUrl\([\s\S]{0,80}target\.sourceUrl,[\s\S]{0,80}target\.sourceSha256,[\s\S]{0,80}target\.sourcePage/u,
  );
  assert.match(developmentReportDialogSource, /programAccessUrl\s*\?/u);
  assert.match(developmentReportDialogSource, /doğrulanmış erişim bağlantısı yok/u);
  assert.doesNotMatch(developmentReportDialogSource, /href=\{target\.sourceUrl\}/u);
  assert.match(developmentReportExportSource, /Kaynak kimliği:/u);
  assert.match(developmentReportExportSource, /Güncel erişim:/u);
  assert.match(developmentReportExportSource, /Güncel erişim: doğrulanamadı\./u);
  assert.match(developmentReportExportSource, /doğrulanmamış kayıtta saklı/u);
});

test("Planlar ana yüzeyi tek resmî kaynak CTA'sı bırakır; örnekler kütüphanede kalır", () => {
  assert.doesNotMatch(planWorkspaceSource, /getTymmOfficialAgeResource\(ageBand\)/u);
  assert.doesNotMatch(planWorkspaceSource, /className="simple-official-resources/u);
  assert.match(planWorkspaceSource, /<TymmOfficialLibraryPanel/u);
  assert.match(officialLibraryPanelSource, /getTymmOfficialAgeResource\(ageBand\)/u);
  assert.match(officialLibraryPanelSource, /<strong>Resmî TYMM kaynakları<\/strong>/u);
  assert.match(officialLibraryPanelSource, /<strong>MEB’de yayımlanmış plan örnekleri<\/strong>/u);
  assert.match(officialLibraryPanelSource, /officialAgeResource\.examples\.map/u);
  assert.match(officialLibraryPanelSource, /cihazda veri[\s\S]*?yazmaz ve planınıza otomatik aktarılmaz/u);
  assert.doesNotMatch(planWorkspaceSource, /official-example/u);
  assert.match(planWorkspaceSource, /MaarifOS’un özgün içeriği · TYMM’ye dayalı/u);
  assert.match(planWorkspaceSource, /Yaş bandını seç/u);
  assert.match(officialLibraryPanelSource, /aria-label=\{`\$\{officialAgeResource\.title\} \(yeni sekmede\)`\}/u);
  assert.match(officialLibraryPanelSource, /aria-label=\{`\$\{example\.title\} \(yeni sekmede\)`\}/u);
  assert.doesNotMatch(planWorkspaceSource, /HAZIR MAARİF İÇERİĞİ/u);
  const advancedStart = planWorkspaceSource.indexOf("{advancedSupportOpen && orchestratedDay && ageBand ? (");
  const toolsStart = planWorkspaceSource.indexOf('aria-labelledby="simple-plan-tools"');
  assert.ok(advancedStart >= 0 && toolsStart > advancedStart);
});

test("yeni resmî kaynak metinleri ve hedefleri dar telefonda erişilebilir kalır", () => {
  assert.match(
    prototypeStyleSource,
    /\.tymm-official-examples > summary \{[\s\S]*?min-height: 52px;/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-official-examples__links a \{[\s\S]*?min-width: 0;[\s\S]*?min-height: 44px;/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-official-examples > summary small,[\s\S]*?font-size: 12px;/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-official-examples__links a:focus-visible/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-program-details > summary \{[\s\S]*?min-height: 56px;/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-program-details > summary:focus-visible/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-age-tabs button\[aria-pressed="true"\]/u,
  );
  assert.match(
    prototypeStyleSource,
    /\.tymm-domain-tabs button\[aria-pressed="true"\]/u,
  );
  const ageGuideTextStyles = prototypeStyleSource.slice(
    prototypeStyleSource.indexOf("/* TYMM 2024"),
    prototypeStyleSource.indexOf(".tymm-child-overlay"),
  );
  assert.doesNotMatch(
    ageGuideTextStyles,
    /font-size:\s*(?:[0-9](?:\.\d+)?|1[01](?:\.\d+)?)px;/u,
  );
  assert.match(
    officialLibraryPanelStyleSource,
    /\.tymm-library-featured > summary,[\s\S]*?min-height: 52px;/u,
  );
  assert.match(
    officialLibraryPanelStyleSource,
    /\.tymm-library-plan-examples a \{[\s\S]*?min-width: 0;[\s\S]*?min-height: 48px;/u,
  );
  assert.match(
    officialLibraryPanelStyleSource,
    /\.tymm-library-featured > summary small,[\s\S]*?font-size: 12px;/u,
  );
  assert.match(
    officialLibraryPanelStyleSource,
    /\.tymm-library-dialog :is\(button, a, input, select, summary, h3\):focus-visible/u,
  );
});

test("resmî kaynak künyesi pedagojik eşleme onayından ayrılır ve pending durum görünürdür", () => {
  assert.match(officialLibraryPanelSource, /data-review-status="pending-human-review"/u);
  assert.match(
    officialLibraryPanelSource,
    /Kaynak ve eşleme bilgisi/u,
  );
  assert.match(
    officialLibraryPanelSource,
    /TYMM_PENDING_MAPPING_DISCLOSURE/u,
  );
  assert.match(
    officialLibraryPanelSource,
    /Resmî kaynak künyesi bu[\s\S]*?pedagojik onayın yerine geçmez/u,
  );
  assert.match(officialLibraryPanelSource, /Kaynak: MEB resmî/u);
  assert.doesNotMatch(
    officialLibraryPanelSource,
    /Pedagojik eşleme:[^\n]*(?:doğrulandı|onaylandı)/iu,
  );
});

test("seçilen resmî kaynak exact tarih, hash, sayfa, byte, erişim ve offline durumunu gösterir", () => {
  assert.match(officialLibraryPanelSource, /Resmî kaynak tarihi \/ sürümü/u);
  assert.match(officialLibraryPanelSource, /Exact SHA-256/u);
  assert.match(
    officialLibraryPanelSource,
    /sha256: TYMM_2024_CATALOG_METADATA\.sourceSha256/u,
  );
  assert.match(officialLibraryPanelSource, /TYMM_2024_CATALOG_METADATA\.sourcePageCount/u);
  assert.match(officialLibraryPanelSource, /Exact dosya boyutu/u);
  assert.match(officialLibraryPanelSource, /resource\.verifiedByteSize\.toLocaleString\("tr-TR"\)/u);
  assert.match(officialLibraryPanelSource, /Erişim durumu/u);
  assert.match(officialLibraryPanelSource, /Yerel çevrimdışı paket/u);
  assert.match(
    officialLibraryPanelSource,
    /Yok · bu sürümde doğrulanmış yerel TYMM PDF varlığı bulunmuyor/u,
  );
  assert.match(officialLibraryPanelSource, /Bu PDF için doğrulanmadı/u);
  assert.match(
    officialLibraryPanelStyleSource,
    /\.tymm-library-source-evidence code \{[\s\S]*?word-break: break-all;/u,
  );
  assert.match(
    officialLibraryPanelStyleSource,
    /@media \(max-width: 760px\)[\s\S]*?\.tymm-library-source-evidence \{[\s\S]*?grid-template-columns: 1fr;/u,
  );
});
