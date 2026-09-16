"""Bind the local 0.28 acceptance receipt to source, build and synthetic evidence."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

app = Path(__file__).resolve().parent.parent
repo = app.parent
destination = app / "output/new-workflows-2026-09-08/final"
receipt_path = destination / "acceptance-receipt.json"
receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
if receipt.get("status") != "VERIFIED_LOCAL" or receipt.get("version") != "0.28.0":
    raise SystemExit("The final local acceptance receipt is not ready.")

def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

frozen_sources = json.loads((app / "output/new-workflows-2026-09-08/school-template/source-freeze.json").read_text(encoding="utf-8"))["source"]
routine_receipt = json.loads((app / "output/daily-routine-cards-2026-09-08/acceptance-receipt.json").read_text(encoding="utf-8"))
frozen_sources.extend({"path": path, "sha256": digest} for path, digest in routine_receipt["sha256"].items() if path.startswith("src/"))
for line in (app / "output/growth-measurements-2026-09-08/growth-source-only-sha256.txt").read_text(encoding="utf-8-sig").splitlines():
    digest, relative = line.split(maxsplit=1)
    frozen_sources.append({"path": relative.replace("\\", "/"), "sha256": digest})
for source in frozen_sources:
    if sha(app / source["path"]) != source["sha256"]:
        raise SystemExit(f"Validated module source changed: {source['path']}")

paths = set()
for folder in (app / "src", app / "dist", app / "tests", app / "scripts"):
    if not folder.is_dir():
        raise SystemExit(f"Required source/build directory missing: {folder.name}")
    paths.update(p for p in folder.rglob("*") if p.is_file())
paths.update(app.glob("playwright*.config.ts"))
for name in ("package.json", "package-lock.json", "mobile-runtime.lock.json", "public/sw.js"):
    paths.add(app / name)
for relative in receipt["evidence"] + receipt["reports"]:
    path = (repo / relative).resolve()
    if not path.is_relative_to(repo.resolve()) or not path.is_file():
        raise SystemExit(f"Required acceptance file missing or outside repository: {relative}")
    paths.add(path)
paths.add(receipt_path)

source_receipt = app / "output/new-workflows-2026-09-08/school-template/xls-layout-only.json"
reference = json.loads(source_receipt.read_text(encoding="utf-8"))
original = Path("C:/Users/Asus/Desktop/VELİ İLETİŞİM BİLGİLERİ 2025.xls")
actual_hash = sha(original)
if actual_hash != reference["sourceSha256"]:
    raise SystemExit("The reference XLS changed since its read-only inspection.")
manifest = {
    "schemaVersion": 1,
    "status": "VERIFIED_LOCAL",
    "version": "0.28.0",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "civilDate": "2026-09-08",
    "published": False,
    "moduleSourceFreezeChecksPassed": len(frozen_sources),
    "scope": "Current complete source/build fingerprint and explicitly listed acceptance evidence; not a claim that all source files were changed in this task.",
    "referenceWorkbook": {"name": original.name, "sha256": actual_hash, "unchangedSinceInspection": True, "contentCopied": False},
    "files": [{"path": p.relative_to(repo).as_posix(), "bytes": p.stat().st_size, "sha256": sha(p)} for p in sorted(paths)],
}
output = destination / "sha256-manifest.json"
output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": manifest["status"], "files": len(paths), "manifestSha256": sha(output), "referenceXlsUnchanged": True}))
