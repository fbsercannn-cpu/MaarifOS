"""Inspect only synthetic teacher-print-kit acceptance PDFs."""
from pathlib import Path
import json
import pdfplumber

folder = Path("output/teacher-print-kit-qa")
results = []
for count in (20, 30):
    with pdfplumber.open(folder / f"teslim-{count}.pdf") as pdf:
        numbers, heights, signature_widths, table_fonts = [], [], [], []
        for page in pdf.pages:
            assert abs(page.width - 841.89) < 1 and abs(page.height - 595.28) < 1
            for table in page.find_tables():
                table_fonts.extend(char["size"] for char in page.crop(table.bbox).chars)
                for row, values in zip(table.rows, table.extract()):
                    if values and (values[0] or "").strip().isdigit():
                        numbers.append(int(values[0]))
                        cell = row.cells[-1]
                        heights.append((cell[3] - cell[1]) * 25.4 / 72)
                        signature_widths.append((cell[2] - cell[0]) * 25.4 / 72)
        assert sorted(numbers) == list(range(1, count + 1)), numbers
        assert min(heights) >= 9, heights
        assert min(signature_widths) >= 50, signature_widths
        assert min(table_fonts) >= 9.99
        results.append({"students": count, "a4LandscapePages": len(pdf.pages), "rowsPerPage": [sum(1 for table in p.find_tables() for values in table.extract() if values and (values[0] or "").strip().isdigit()) for p in pdf.pages], "minimumSignatureHeightMm": round(min(heights), 2), "minimumSignatureWidthMm": round(min(signature_widths), 2), "minimumTableFontPt": min(table_fonts)})
text = json.dumps(results, ensure_ascii=False, indent=2)
(folder / "density-metrics.json").write_text(text, encoding="utf-8")
print(text)
