import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { trimReferenceMedia } from "../../scripts/trim-reference-media.mjs";

test("only obsolete embedded media leaves distribution; text and unrelated assets survive", () => {
  const root = mkdtempSync(path.join(tmpdir(), "maarif-reference-build-"));
  const folder = path.join(root, "assets/resources/orientation-guide-2026-2027");
  mkdirSync(folder, { recursive: true });
  for (const name of ["page-01.webp", "okula-uyum-rehberi-2026-2027.pdf", "offline-assets.json", "manifest.json", "other.pdf"]) writeFileSync(path.join(folder, name), "source");
  assert.deepEqual(trimReferenceMedia(root), { removedFiles: 3, removedBytes: 18 });
  assert.equal(readFileSync(path.join(folder, "manifest.json"), "utf8"), "source");
  assert.equal(existsSync(path.join(folder, "other.pdf")), true);
  assert.deepEqual(trimReferenceMedia(root), { removedFiles: 0, removedBytes: 0 });
});

test("teacher surfaces no longer import the full guide reader", () => {
  for (const file of ["simple-experience/SimpleDocumentWorkspaceScreen.tsx", "teacher-followup/TeacherFollowupWorkspace.tsx"]) {
    const source = readFileSync(new URL(`../../src/features/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /OrientationGuidePanel/u);
  }
});
