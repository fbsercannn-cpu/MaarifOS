import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sources = {
  roster: new URL(
    "../../src/features/classroom/class-roster-document.ts",
    import.meta.url,
  ),
  observation: new URL(
    "../../src/features/reports/simple-observation-document.ts",
    import.meta.url,
  ),
  printable: new URL(
    "../../src/features/activity-studio/printable-templates.ts",
    import.meta.url,
  ),
  prototype: new URL("../../src/Prototype.tsx", import.meta.url),
  drawingPad: new URL(
    "../../src/features/activity-studio/ActivityDrawingPad.tsx",
    import.meta.url,
  ),
  teacherPlan: new URL(
    "../../src/features/planning/TeacherOwnedPlanScreen.tsx",
    import.meta.url,
  ),
  premiumCenter: new URL(
    "../../src/features/premium-plans/PremiumPlanCenterScreen.tsx",
    import.meta.url,
  ),
  premiumExport: new URL(
    "../../src/features/premium-plans/export-document.ts",
    import.meta.url,
  ),
};

async function source(name) {
  return readFile(sources[name], "utf8");
}

test("insan odaklı HTML çıktılar A4 ve dar ekran kalite sözleşmesini birlikte taşır", async () => {
  const [roster, observation, printable] = await Promise.all([
    source("roster"),
    source("observation"),
    source("printable"),
  ]);

  for (const [name, contents] of Object.entries({ roster, observation, printable })) {
    assert.match(contents, /@page\s*\{[^}]*size:\s*A4/isu, `${name}: A4 sözleşmesi eksik`);
    assert.match(contents, /@media screen and \(max-width:/u, `${name}: dar ekran sözleşmesi eksik`);
    assert.match(contents, /break-inside|page-break-inside/u, `${name}: sayfa kırılma kuralı eksik`);
  }

  assert.match(roster, /counter\(page\)/u);
  assert.match(roster, /counter\(pages\)/u);
  assert.match(roster, /paginateRosterRows/u);
  assert.match(roster, /content:\s*attr\(data-label\)/u);
  assert.match(observation, /orphans:\s*3;\s*widows:\s*3/u);
  assert.match(printable, /grid-template-columns:\s*1fr/u);
});

test("mobil indirmelerde Blob URL yaşam süresi eşzamanlı indirmeyi yarıda kesmez", async () => {
  const files = await Promise.all([
    source("prototype"),
    source("drawingPad"),
    source("teacherPlan"),
    source("premiumCenter"),
  ]);

  for (const contents of files) {
    assert.doesNotMatch(contents, /URL\.revokeObjectURL\([^)]*\);/u);
    assert.doesNotMatch(
      contents,
      /setTimeout\(\(\)\s*=>\s*URL\.revokeObjectURL\([^)]*\),\s*0\s*\)/u,
    );
  }
});

test("plan dosya adı yaş ve ay bağlamından üretilir; demo sabiti taşımaz", async () => {
  const premiumExport = await source("premiumExport");

  assert.match(premiumExport, /ageFileLabel/u);
  assert.match(premiumExport, /monthFileLabel/u);
  assert.doesNotMatch(premiumExport, /TYMM_6072_Eylul_2026/u);
});
