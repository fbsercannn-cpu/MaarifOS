from pathlib import Path
import json
import pdfplumber

root = Path("output/material-box-labels-qa")
metrics = []
for name in ("normal", "long"):
    with pdfplumber.open(root / f"{name}.pdf") as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        assert len(pdf.pages) == 1
        page = pdf.pages[0]
        labels = [r for r in page.rects if 150 < r["width"] < 200 and 150 < r["height"] < 200]
        assert len(labels) == 12
        assert len({round(r["x0"], 1) for r in labels}) == 3
        assert len({round(r["top"], 1) for r in labels}) == 4
        for char in page.chars:
            if char["top"] < 82 or char["bottom"] > page.height - 54:
                continue
            assert any(char["x0"] >= r["x0"] - .1 and char["x1"] <= r["x1"] + .1
                       and char["top"] >= r["top"] - .1 and char["bottom"] <= r["bottom"] + .1
                       for r in labels), f"Cell overflow in {name}"
        if name == "normal":
            for index in range(1, 13):
                assert f"Kurgu merkez {index:02d}" in text
        else:
            for index in range(1, 26):
                assert f"Kurgu uzun içerik {index}:" in text
            assert "İçerik devamı 7/7" in text
        metrics.append({"document": name, "pages": len(pdf.pages), "cut_labels": len(labels),
                        "label_width_mm": round(labels[0]["width"] * 25.4 / 72, 2),
                        "label_height_mm": round(labels[0]["height"] * 25.4 / 72, 2),
                        "smallest_font_pt": min(c["size"] for c in page.chars), "cell_overflow": False})
(root / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(metrics, ensure_ascii=False))
