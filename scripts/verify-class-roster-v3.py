"""Check every generated page; emits only aggregate fictional-fixture QA evidence."""
import hashlib
import json
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

directory = Path(__file__).resolve().parent.parent / "output/document-qa/class-roster-v3-2026-09-07"
layout = {row["students"]: row for row in json.loads((directory / "browser-layout.json").read_text(encoding="utf-8"))}
results = []
for count in [1, 15, 30, 40]:
    for kind in ["sinif-listesi", "html-print"]:
        path = directory / f"{kind}-{count}.pdf"
        reader = PdfReader(path)
        outside = 0
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                assert 840 < page.width < 843 and 594 < page.height < 597, "A4 landscape required"
                outside += sum(c["x0"] < 0 or c["x1"] > page.width + 0.1 or c["top"] < 0 or c["bottom"] > page.height + 0.1 for c in page.chars)
        assert outside == 0, "Text outside page"
        if kind == "html-print":
            assert len(reader.pages) == layout[count]["plannedPages"], "Unexpected print page break"
            assert max(layout[count]["pageHeights"]) <= 719 and layout[count]["overflowingCells"] == 0
        else:
            assert reader.trailer["/Root"]["/MarkInfo"]["/Marked"]
            assert reader.trailer["/Root"]["/Lang"] == "tr-TR"
            for page in reader.pages:
                assert "Kişisel veri içerir" in page.extract_text(), "Missing footer"
                assert "Çiçekler Sınıfı" in page.extract_text(), "Missing classroom context"
            text = " ".join(page.extract_text() for page in reader.pages)
            assert "ÖZEL_ÇOCUK_NOTU" not in text and "ÖZEL_AİLE_NOTU" not in text
        results.append({"file": path.name, "students": count, "pages": len(reader.pages), "textOutsidePage": outside, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
(directory / "verification.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"files": len(results), "pages": sum(item["pages"] for item in results), "textOutsidePage": 0, "status": "PASS"}))
