"""Verify every page of the fictional 3.1 PDF and actual browser-print corpus."""
import hashlib
import json
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

directory = Path(__file__).resolve().parent.parent / "output/document-qa/class-roster-v31-master-2026-09-07"
generation = {str(row["variant"]): row for row in json.loads((directory / "generation.json").read_text(encoding="utf-8"))}
results = []
for variant in ["0", "1", "15", "30", "40", "extreme"]:
    metrics = generation[variant]
    assert max(metrics["pageHeights"]) <= 719
    assert metrics["overflowingCells"] == 0
    assert metrics["firstStudentPages"] == ([] if variant == "0" else [0])
    for kind in ["roster", "html-print"]:
        path = directory / f"{kind}-{variant}.pdf"
        reader = PdfReader(path)
        outside = 0
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                assert 840 < page.width < 843 and 594 < page.height < 597, "A4 landscape required"
                outside += sum(c["x0"] < 0 or c["x1"] > page.width + 0.1 or c["top"] < 0 or c["bottom"] > page.height + 0.1 for c in page.chars)
        assert outside == 0, "Text outside physical page"
        expected_pages = metrics["htmlPages"] if kind == "html-print" else metrics["pdfPages"]
        assert len(reader.pages) == expected_pages, "Unexpected additional or missing page"
        page_texts = [page.extract_text() for page in reader.pages]
        text = " ".join(page_texts)
        assert "ÖZEL_ÇOCUK_NOTU" not in text and "ÖZEL_AİLE_NOTU" not in text
        assert "Okul Öncesi Öğretmeni" in text
        if kind == "roster":
            assert reader.trailer["/Root"]["/MarkInfo"]["/Marked"]
            assert reader.trailer["/Root"]["/Lang"] == "tr-TR"
            for page_text in page_texts:
                assert "Kişisel veri içerir" in page_text, "Missing footer"
                assert "Çiçekler Sınıfı" in page_text, "Missing classroom context"
        if variant == "extreme":
            flattened_pages = ["".join(page.split()) for page in page_texts]
            third_page = next(page for page in flattened_pages if "KurguDördüncüYakın" in page)
            assert all(value in third_page for value in ["KurguİkinciYakın", "KurguÜçüncüYakın", "KurguAnne1Çınaroğlu", "KurguBaba1Çınaroğlu", "05320000006"])
        results.append({"file": path.name, "variant": variant, "pages": len(reader.pages), "textOutsidePage": outside, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
(directory / "verification.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"files": len(results), "pages": sum(item["pages"] for item in results), "textOutsidePage": 0, "status": "PASS"}))
