"""Inspect synthetic exported PDFs; never reads the user's student spreadsheet."""
import json
from pathlib import Path
import fitz

root = Path("output/new-workflows-2026-09-08/school-styled-admin")
results = []
for path in sorted(root.glob("*.pdf")):
    document = fitz.open(path)
    bounds, overlaps, signature_pages, table_pages = [], [], [], []
    full_text = ""
    for index, page in enumerate(document):
        text = page.get_text()
        full_text += text
        if "İmza:" in text:
            signature_pages.append(index + 1)
        if "Kurgu Devir Maddesi" in text or "Kurgu Çok Parçalı" in text:
            table_pages.append(index + 1)
        spans = [span for block in page.get_text("dict")["blocks"] if "lines" in block
                 for line in block["lines"] for span in line["spans"] if span["text"].strip()]
        for span in spans:
            rect = fitz.Rect(span["bbox"])
            if rect.x0 < 0 or rect.y0 < 0 or rect.x1 > page.rect.width + .5 or rect.y1 > page.rect.height + .5:
                bounds.append([index + 1, span["text"]])
        for position, first in enumerate(spans):
            for second in spans[position + 1:]:
                overlap = fitz.Rect(first["bbox"]) & fitz.Rect(second["bbox"])
                if not overlap.is_empty and overlap.width > 1 and overlap.height > min(first["size"], second["size"]) * .5:
                    overlaps.append([index + 1, first["text"], second["text"]])
        if index in (0, len(document) - 1):
            page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(root / f"{path.stem}-{index + 1}.png")
    result = dict(file=path.name, pages=len(document), bounds=bounds, overlaps=overlaps,
                  dimensions=[[round(p.rect.width, 2), round(p.rect.height, 2)] for p in document],
                  images=sum(len(p.get_images()) for p in document), signaturePages=signature_pages,
                  lastTablePage=table_pages[-1] if table_pages else None,
                  hasTeacher="Okul Öncesi Öğretmeni" in full_text,
                  hasPrincipal="Okul Müdürü" in full_text,
                  recipient="Kurgu Teslim Alan Öğretmen" in full_text)
    results.append(result)
(root / "inspection.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
assert len(results) == 4
assert all(not r["bounds"] and not r["overlaps"] and r["images"] == 1 and r["hasTeacher"] and r["hasPrincipal"] for r in results)
assert all(r["signaturePages"][-1] == r["lastTablePage"] for r in results), "Signature orphaned from final table page"
assert all(r["recipient"] for r in results if r["file"].startswith("handover"))
print(json.dumps({"status": "PASS", "files": len(results), "pages": sum(r["pages"] for r in results), "bounds": 0, "overlaps": 0, "orphanSignatures": 0}))
