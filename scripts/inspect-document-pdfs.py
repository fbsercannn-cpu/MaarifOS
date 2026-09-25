"""Reopen and render actual acceptance PDFs; fail on measured regressions."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

root = Path(sys.argv[1]).resolve()
root.relative_to(Path("output").resolve())
renders = root / "renders"
renders.mkdir(exist_ok=True)
results, failures = [], []
files = sorted(root.rglob("*.pdf"))
if not files:
    raise SystemExit("No generated PDFs found")
for file in files:
    relative = file.relative_to(root).as_posix()
    key = relative[:-4].replace("/", "__")
    pages, texts, tiles = [], [], []
    with fitz.open(file) as doc:
        for index, page in enumerate(doc):
            text = page.get_text()
            texts.append(text)
            spans = [span for block in page.get_text("dict")["blocks"] if "lines" in block for line in block["lines"] for span in line["spans"] if span["text"].strip()]
            outside = [span["bbox"] for span in spans if span["bbox"][0] < -0.5 or span["bbox"][1] < -0.5 or span["bbox"][2] > page.rect.width + 0.5 or span["bbox"][3] > page.rect.height + 0.5]
            pix = page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4))
            image_path = renders / f"{key}-{index + 1}.png"
            pix.save(image_path)
            with Image.open(image_path) as source:
                visual_ink = source.convert("L").getextrema()[0] < 245
                thumb = source.convert("RGB")
                thumb.thumbnail((590, 780))
                tile = Image.new("RGB", (620, 825), "#dddddd")
                tile.paste(thumb, ((620-thumb.width)//2, 30))
                ImageDraw.Draw(tile).text((10, 6), f"{file.name} | page {index + 1}", fill="black")
                tiles.append(tile)
            pages.append({"page": index + 1, "size": [page.rect.width, page.rect.height], "textCharacters": len(text), "outside": outside, "replacementCharacters": text.count("\ufffd"), "visualInk": visual_ink, "links": len(page.get_links())})
            if outside or "\ufffd" in text or not visual_ink:
                failures.append(f"{relative} page {index + 1}: bounds/replacement/blank-page check")
        all_text = "\n".join(texts)
        metadata_title = (doc.metadata or {}).get("title", "")
        if "growth" in relative and file.stem.startswith("individual") and not re.fullmatch(r"MaarifOS Bireysel Boy-Kilo Belgesi · (?:Tüm yıl|(?:Eylül|Aralık|Mart|Haziran) \d{4})", metadata_title):
            failures.append(f"{relative}: individual growth metadata must use the technical document title and a valid period")
        # Keep the real browser printer trace distinguishable, but require its text too.
        is_printer_capture = file.name == "browser-print-three-pages.pdf" and file.parent.name == "print"
        if not all_text.strip():
            failures.append(f"{relative}: no searchable text")
        if is_printer_capture and (len(pages) != 3 or any(f"KAYNAK_{i + 1}" not in text or "İrem Işık" not in text for i, text in enumerate(texts))):
            failures.append(f"{relative}: printed Unicode source or page scope missing")
        if file.name == "roster-name-only.pdf" and len(pages) != 1:
            failures.append(f"{relative}: short list must fit one page")
        if file.name == "student-record-three.pdf" and (len(pages) != 3 or any("İmza:" not in text or not re.search(r"Kayıt yılı\s+2025", text) for text in texts)):
            failures.append(f"{relative}: independent form identity/signature")
        tokens = re.findall(r"KANIT\d{3}", all_text)
        if file.name == "development-long.pdf" and (len(tokens) != 170 or len(set(tokens)) != 170):
            failures.append(f"{relative}: source tokens lost or duplicated")
        if file.name.startswith("development-") and not any(page["links"] for page in pages):
            failures.append(f"{relative}: source URI annotations missing")
        results.append({"file": relative, "metadataTitle": metadata_title, "printerCapture": is_printer_capture, "searchable": bool(all_text.strip()), "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "pages": pages, "tagged": doc.xref_get_key(doc.pdf_catalog(), "StructTreeRoot")[1] != "null", "observedTokens": len(tokens), "uniqueTokens": len(set(tokens))})
        (renders / f"{key}.txt").write_text(all_text, encoding="utf-8")
    for start in range(0, len(tiles), 4):
        group = tiles[start:start+4]
        sheet = Image.new("RGB", (620 * min(2, len(group)), 825 * ((len(group)+1)//2)), "white")
        for index, tile in enumerate(group):
            sheet.paste(tile, ((index%2)*620, (index//2)*825))
        sheet.save(renders / f"{key}-overview-{start//4+1}.png")
receipt = {"checkedAtUtc": datetime.now(timezone.utc).isoformat(), "files": results, "failures": failures, "passed": not failures}
(root / "pdf-inspection.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"files": len(results), "pages": sum(len(row["pages"]) for row in results), "passed": not failures, "failures": failures}, ensure_ascii=False))
raise SystemExit(1 if failures else 0)
