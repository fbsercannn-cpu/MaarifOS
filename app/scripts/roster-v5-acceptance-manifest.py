"""Bind the tested roster v5 source to the final local 0.29 build and evidence."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

app = Path(__file__).resolve().parent.parent
repo = app.parent
output = app / "output/class-roster-v5-2026-09-08/final"
output.mkdir(parents=True, exist_ok=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source_paths():
    return sorted([path for path in (app / "src").rglob("*") if path.is_file()] + [app / path for path in ("package.json", "package-lock.json", "public/sw.js", "mobile-runtime.lock.json")])

def source_state():
    return {path.relative_to(repo).as_posix(): digest(path) for path in source_paths()}

snapshot_path = output / "source-before-validation.json"
if "--capture" in sys.argv:
    state = source_state()
    snapshot_path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"capturedSourceFiles": len(state), "snapshotSha256": digest(snapshot_path)}))
    raise SystemExit(0)

assert source_state() == json.loads(snapshot_path.read_text(encoding="utf-8")), "Source changed after final validation began."
receipt_path = output / "acceptance-receipt.json"
receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
assert receipt["status"] == "VERIFIED_LOCAL" and receipt["version"] == "0.29.0"
assert (app / "dist/client/index.html").is_file(), "Final built app is missing."
assert json.loads((app / "package.json").read_text(encoding="utf-8"))["version"] == "0.29.0"
paths = set(source_paths()) | {snapshot_path, receipt_path, Path(__file__).resolve()}
for folder in ("dist", "tests"):
    paths.update(path for path in (app / folder).rglob("*") if path.is_file())
paths.update(app.glob("*playwright*.config.ts"))
for relative in receipt["evidence"] + receipt["reports"]:
    path = (repo / relative).resolve()
    assert path.is_relative_to(repo) and path.is_file(), f"Evidence missing or outside workspace: {relative}"
    paths.add(path)
reference = json.loads((app / "output/new-workflows-2026-09-08/school-template/xls-layout-only.json").read_text(encoding="utf-8"))
original = Path("C:/Users/Asus/Desktop/VELİ İLETİŞİM BİLGİLERİ 2025.xls")
assert digest(original) == reference["sourceSha256"], "Read-only reference workbook changed."
manifest = {
    "version": "0.29.0", "status": "VERIFIED_LOCAL", "published": False,
    "generatedAtUtc": datetime.now(timezone.utc).isoformat(), "civilDate": "2026-09-08",
    "sourceUnchangedSinceValidation": True, "originalReferenceWorkbookUnchanged": True,
    "scope": "Current source, tests, build and named evidence. Earlier dirty changes are preserved; this is not attribution of every file to the current task.",
    "files": [{"path": path.relative_to(repo).as_posix(), "bytes": path.stat().st_size, "sha256": digest(path)} for path in sorted(paths)],
}
path = output / "sha256-manifest.json"
path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
assert all(digest(repo / item["path"]) == item["sha256"] for item in manifest["files"])
print(json.dumps({"status": manifest["status"], "verifiedFiles": len(paths), "mismatches": 0, "manifestSha256": digest(path)}))
