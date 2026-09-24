import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const beforePath = process.argv[2];
if (!beforePath) throw new Error("Previous published precache manifest path required.");
const before = JSON.parse(readFileSync(beforePath, "utf8"));
const after = JSON.parse(readFileSync("dist/client/maarifos-precache-manifest.json", "utf8"));
const total = manifest => manifest.assets.reduce((sum, asset) => sum + asset.size, 0);
const obsolete = asset => /orientation-guide-2026-2027\/(?:page-\d{2}\.webp|okula-uyum-rehberi-2026-2027\.pdf|offline-assets\.json)$/u.test(asset.path);
if (after.assets.some(obsolete)) throw new Error("Obsolete media still in distribution.");
const report = {
  previousRelease: "0.41.0", currentRelease: "0.42.0", measuredAt: new Date().toISOString(),
  before: { assets: before.assets.length, bytes: total(before) },
  after: { assets: after.assets.length, bytes: total(after) },
  removedReferenceMedia: { files: before.assets.filter(obsolete).length, bytes: before.assets.filter(obsolete).reduce((sum, asset) => sum + asset.size, 0) },
  reductionBytes: total(before) - total(after),
  reductionPercent: Number(((1 - total(after) / total(before)) * 100).toFixed(2)),
  scope: "Uncompressed verified assets in published 0.41.0 versus local 0.42.0 precache manifests; this is download/cache volume, not a claimed navigation latency.",
  componentReads: { deskCalendar: { before: 2, after: 1 }, workPackageInitialMount: { before: 2, after: 1 }, evidence: "tests/click-completion-ui-2026-09-12.spec.ts" },
};
mkdirSync("output/print-workshop-2026-09-12", { recursive: true });
writeFileSync(path.join("output/print-workshop-2026-09-12", "performance.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
