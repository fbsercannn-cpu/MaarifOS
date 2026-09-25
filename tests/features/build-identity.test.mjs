import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createBuildIdentity } from "../../scripts/build-identity.mjs";

test("build identity changes with uncommitted source but excludes secrets", () => {
  const root = mkdtempSync(path.join(tmpdir(), "maarif-build-"));
  try {
    execFileSync("git", ["init", "--quiet", root]);
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "package.json"), '{"version":"1.2.3"}');
    writeFileSync(path.join(root, "src/main.ts"), "export const value = 1;");
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "fixture"], { cwd: root });
    const initial = createBuildIdentity(root);
    writeFileSync(path.join(root, ".env"), "NOT_A_REAL_SECRET=fixture");
    assert.equal(createBuildIdentity(root).sourceSha256, initial.sourceSha256);
    writeFileSync(path.join(root, "src/main.ts"), "export const value = 2;");
    const changed = createBuildIdentity(root);
    assert.notEqual(changed.sourceSha256, initial.sourceSha256);
    assert.equal(changed.revision, initial.revision);
    assert.equal(changed.version, "1.2.3");
    assert.equal(new Date(changed.builtAt).toISOString(), changed.builtAt);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("maarif-build-"));
    rmSync(root, { recursive: true, force: true });
  }
});
