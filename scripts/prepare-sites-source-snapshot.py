"""Copy current app source into an empty Sites checkout without touching the working app."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument("target", nargs="?")
args = parser.parse_args()
app = Path(__file__).resolve().parent.parent
repo = app.parent
directories = ("src", "public", "scripts", "worker", "tests", "design", "docs")
skip_parts = {"__pycache__", "node_modules", "test-results", "playwright-report", "output", "tmp", ".git"}
root_names = {".gitignore", ".gitattributes", ".env.founder-production"}
root_suffixes = {".json", ".ts", ".js", ".mjs", ".html", ".md", ".css", ".yml", ".yaml"}
sources = {}

def add(path, relative):
    if path.is_symlink():
        raise RuntimeError(f"Symbolic link is not a source input: {relative}")
    if path.is_file():
        sources[str(relative).replace("\\", "/")] = path

for directory in directories:
    root = app / directory
    if not root.exists():
        continue
    for path in root.rglob("*"):
        relative = path.relative_to(app)
        if not any(part in skip_parts for part in relative.parts):
            add(path, relative)
for path in app.iterdir():
    if path.is_file() and (path.name in root_names or (path.suffix in root_suffixes and not path.name.startswith(".env"))):
        add(path, path.name)
add(app / ".openai/hosting.json", ".openai/hosting.json")
assert json.loads((app / ".openai/hosting.json").read_text(encoding="utf-8"))["project_id"] == "appgprj_6a60733e774c8191bbeeb1cca335281d"

build_inputs = (
    "premium-content/releases/tymm-6072/2026-09/content.v2.json",
    "premium-content/releases/tymm-6072/2026-09/content.v3.json",
    "premium-content/releases/tymm-6072/2026-09/manifest.v3.json",
    "premium-content/releases/tymm-6072/2026-10/reference-blueprint.v1.json",
)
for relative in build_inputs:
    path = repo / relative
    assert path.is_file(), f"Missing canonical build input: {relative}"
    add(path, "sites-build-inputs/" + relative)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

inventory = {relative: digest(path) for relative, path in sorted(sources.items())}
if not args.target:
    print(json.dumps({"sourceFiles": len(inventory), "sourceBytes": sum(path.stat().st_size for path in sources.values()), "mode": "read_only_inventory"}))
    raise SystemExit(0)

target = Path(args.target).resolve()
assert target != app and not target.is_relative_to(repo), "Use an isolated checkout outside the source project."
assert target.is_dir(), "Create the empty --no-checkout Sites clone first."
assert (target / ".git").exists(), "Target must own its Sites Git metadata."
assert all(path.name == ".git" for path in target.iterdir()), "Target must be empty apart from .git. Nothing is removed by this script."
for relative, source in sources.items():
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    assert digest(destination) == inventory[relative]

# The unchanged build scripts resolve canonical content relative to the app's parent.
# Keep identical copies inside the committed source and in that expected build location.
for relative in build_inputs:
    destination = target.parent / relative
    assert not destination.exists(), f"Build location already exists: {relative}"
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(repo / relative, destination)
    assert digest(destination) == inventory["sites-build-inputs/" + relative]

receipt = {"version": json.loads((app / "package.json").read_text(encoding="utf-8"))["version"], "sourceFiles": len(inventory), "allCopiedBytesEqual": True, "files": inventory}
receipt_path = target / "sites-build-inputs/source-snapshot.json"
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"sourceFiles": len(inventory), "copiedFiles": len(inventory), "mismatches": 0, "target": str(target), "receiptSha256": digest(receipt_path)}))
