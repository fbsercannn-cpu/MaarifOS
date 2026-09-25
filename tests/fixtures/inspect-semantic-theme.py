"""Read-only independent PDF font, geometry and contrast inspection for synthetic QA."""
import hashlib
import io
import json
import pathlib
import sys

import fitz
from fontTools.ttLib import TTFont


def luminance(rgb):
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in rgb]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(foreground, background):
    first, second = luminance(foreground), luminance(background)
    return (max(first, second) + 0.05) / (min(first, second) + 0.05)


path = pathlib.Path(sys.argv[1])
document = fitz.open(path)
fonts = {}
pages = []
for index, page in enumerate(document):
    drawings = [drawing for drawing in page.get_drawings() if drawing.get("fill") is not None]
    spans = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if not span["text"].strip():
                    continue
                box = fitz.Rect(span["bbox"])
                point = (box.tl + box.br) / 2
                background = (1.0, 1.0, 1.0)
                for drawing in drawings:
                    if drawing["rect"].contains(point):
                        background = tuple(drawing["fill"])
                color = span["color"]
                foreground = (((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255)
                spans.append({"text": span["text"], "font": span["font"], "size": span["size"],
                              "foreground": foreground, "background": background,
                              "contrast": contrast(foreground, background), "bbox": list(box)})
    for font in page.get_fonts(full=True):
        if font[0] in fonts:
            continue
        _, extension, _, data = document.extract_font(font[0])
        weight = None
        if data and extension in ("ttf", "otf"):
            parsed = TTFont(io.BytesIO(data))
            weight = parsed["OS/2"].usWeightClass
            parsed.close()
        fonts[font[0]] = {"baseFont": font[3], "resource": font[4], "weight": weight,
                          "embeddedBytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    outside = [span["bbox"] for span in spans if span["bbox"][0] < -0.1 or span["bbox"][1] < -0.1
               or span["bbox"][2] > page.rect.width + 0.1 or span["bbox"][3] > page.rect.height + 0.1]
    pages.append({"width": page.rect.width, "height": page.rect.height, "text": page.get_text(),
                  "spans": spans, "outside": outside, "rasterImages": len(page.get_images()),
                  "fills": [list(drawing["fill"]) for drawing in drawings]})
    if len(sys.argv) > 2 and sys.argv[2] == "1":
        page.get_pixmap(matrix=fitz.Matrix(1, 1)).save(path.with_name(path.stem + "-page-" + str(index + 1) + ".png"))
print(json.dumps({"metadata": document.metadata, "fonts": list(fonts.values()), "pages": pages}, ensure_ascii=True))
