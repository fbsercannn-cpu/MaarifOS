"""Import the supplied 35-page guide without altering its original PDF bytes.

Usage: python scripts/import-orientation-guide.py <source.pdf>
pdfplumber/pdfium render every page; extracted text is a secondary reading view.
"""
from pathlib import Path
import hashlib
import json
import logging
import sys

import pdfplumber
from PIL import Image, ImageDraw
from pypdf import PdfReader

EXPECTED_SHA256 = "353b9e91e3f140b96dc3e3f110815e5592a809750caa6bbb8575274a100059a4"
APP = Path(__file__).resolve().parents[1]
BASE = "/assets/resources/orientation-guide-2026-2027"
OUTPUT = APP / "public" / BASE.lstrip("/")
TITLES = [
    "Kapak", "Giriş", "Okula uyum süreci", "Uyum sürecinde kaçınılması gereken davranışlar",
    "Uyum sürecinde aileden beklentiler", "Uyum sürecinde öğretmenden beklentiler",
    "Uyum sürecinde okul yönetiminden beklentiler",
    "Uyum sürecinde psikolojik danışman / rehber öğretmenden beklentiler",
    "Uyum haftası uygulama çizelgesi ve uygulamanın açıklaması", "1. gün", "2, 3 ve 4. gün",
    "Ek-1: Okul sonrası rutini aile notu", "Ek-2: Çizelge", "5. gün", "Ek-3: Okulda ilk haftam",
    "Uyum haftası etkinlik örnekleri", "Etkinlik 1 ve 2: Aile tanışma etkinliği",
    "Etkinlik 3 ve 4: Aile tanışma etkinliği", "Etkinlik 5 ve 6: Aile tanışma etkinliği",
    "Etkinlik 7: Sınıfımız bir ağaç", "Etkinlik 8: Ağaçların yaprakları ve çocukların parmak izleri",
    "Etkinlik 9: Bahçemizdeki ağaçlar", "Etkinlik 10 ve 11: Öğretmenimle ve arkadaşlarımla tanışıyorum",
    "Etkinlik 12: Öğretmenimle ve arkadaşlarımla tanışıyorum",
    "Etkinlik 13: Öğretmenimle ve arkadaşlarımla tanışıyorum",
    "Etkinlik 14: Öğretmenimle ve arkadaşlarımla tanışıyorum",
    "Etkinlik 15 ve 16: Öğretmenimle ve arkadaşlarımla tanışıyorum",
    "Etkinlik 17 ve 18: Tanışma ve okul postanesi",
    "Etkinlik 19 ve 20: Sınıfımı / okulumu tanıyorum", "Etkinlik 21 ve 22: Okul pasaportu ve güven yolu",
    "Etkinlik 23 ve 24: Sınıfımı / okulumu tanıyorum", "Etkinlik 25: Sınıfımı / okulumu tanıyorum",
    "Okula uyum materyalleri platformu kullanma kılavuzu", "Şarkılar ve parmak oyunu",
    "Okul öncesi okula uyum materyalleri platformu bağlantıları",
]
LINK_LABELS = {
    "mailto:tegm@meb.gov.tr": "Temel Eğitim Genel Müdürlüğü e-posta",
    "https://meb.ai/U7vBvxg": "Okula uyum materyalleri platformunu EBA’da aç",
    "https://meb.ai/w0rfM8": "Okula uyum materyalleri platformunu indir",
    "https://meb.ai/IdwAz9": "Ailemle Okul Yolu Programı",
    "https://meb.ai/Ifajow": "Aile Etkinlik Takvimi",
    "https://meb.ai/reC9pj": "Çocuğumla Okula İlk Adım Defteri",
    "https://meb.ai/UbztYia": "Uyum Haftası Veli Sunumu",
    "https://meb.ai/3Pit0v": "Şarkılar",
    "https://meb.ai/cieb40": "Aile Eğitim Bülteni",
    "https://meb.ai/z1UsZW": "Okula Uyum Rehberi",
    "https://meb.ai/UTFWpqc": "Ben Okula Başladım parmak oyunu",
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    source = Path(sys.argv[1]).resolve()
    source_bytes = source.read_bytes()
    if sha256(source_bytes) != EXPECTED_SHA256:
        raise ValueError("Kaynak PDF beklenen sürümle eşleşmiyor; içeriği yeniden inceleyin.")
    reader = PdfReader(source)
    if len(reader.pages) != len(TITLES):
        raise ValueError("Kaynak PDF sayfa sayısı uyuşmuyor.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    pdf = OUTPUT / "okula-uyum-rehberi-2026-2027.pdf"
    pdf.write_bytes(source_bytes)
    if sha256(pdf.read_bytes()) != EXPECTED_SHA256:
        raise ValueError("Özgün PDF kopyası doğrulanamadı.")
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    pages = []
    thumbnails = []
    with pdfplumber.open(source) as document:
        for index, page in enumerate(document.pages):
            number = index + 1
            # Preserve the complete extraction: no truncation or editorial rewriting.
            text = page.extract_text(x_tolerance=1) or ""
            if not text.strip():
                raise ValueError(f"{number}. sayfanın metni çıkarılamadı.")
            image_name = f"page-{number:02d}.webp"
            rendered = page.to_image(resolution=144, antialias=True).original.convert("RGB")
            rendered.save(OUTPUT / image_name, format="WEBP", quality=88, method=6)
            thumbnail = rendered.copy()
            thumbnail.thumbnail((220, 310))
            thumbnails.append(thumbnail)
            links = {}
            for annotation in reader.pages[index].get("/Annots", []):
                action = annotation.get_object().get("/A")
                if action and action.get("/S") == "/URI":
                    url = str(action["/URI"])
                    if url not in LINK_LABELS:
                        raise ValueError("Kaynakta yeni bağlantı var; etiketi görsel incelemeyle doğrulayın.")
                    links[url] = {"url": url, "label": LINK_LABELS[url]}
            image_bytes = (OUTPUT / image_name).read_bytes()
            pages.append({
                "number": number, "printedPage": None if number == 1 else number - 1,
                "title": TITLES[index], "text": text, "textSha256": sha256(text.encode("utf-8")),
                "imageUrl": f"{BASE}/{image_name}", "imageSha256": sha256(image_bytes),
                "imageBytes": len(image_bytes), "imageWidth": rendered.width, "imageHeight": rendered.height,
                "links": list(links.values()),
            })
    manifest = {
        "schemaVersion": 1, "id": "orientation-guide-2026-2027",
        "title": "Okul Öncesi Eğitim Okula Uyum Rehberi 2026-2027",
        "sourceFileName": source.name, "sourceOrigin": "user-supplied-pdf",
        "publisherAsPrinted": "T.C. Millî Eğitim Bakanlığı · Temel Eğitim Genel Müdürlüğü",
        "officialPublicationVerified": False, "sourceSha256": EXPECTED_SHA256,
        "pdfUrl": f"{BASE}/{pdf.name}", "pdfBytes": len(source_bytes), "pageCount": len(pages),
        "importedOn": "2026-09-07", "textExtraction": "pdfplumber; x_tolerance=1; all page text; no rewriting",
        "imageRendering": "PDFium via pdfplumber; 144 dpi; WebP quality 88; full page",
        "navigationOrigin": "MaarifOS page navigation based on supplied PDF headings",
        "pages": pages,
    }
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
    (OUTPUT / "manifest.json").write_bytes(manifest_bytes)
    (OUTPUT / "offline-assets.json").write_text(json.dumps([
        f"{BASE}/manifest.json", manifest["pdfUrl"], *[p["imageUrl"] for p in pages],
    ], indent=2), encoding="utf-8")
    review = APP / "tmp" / "pdfs" / "orientation-review"
    review.mkdir(parents=True, exist_ok=True)
    for start in range(0, len(thumbnails), 12):
        sheet = Image.new("RGB", (960, 1050), "#dee6e5")
        draw = ImageDraw.Draw(sheet)
        for index, thumbnail in enumerate(thumbnails[start:start + 12]):
            left, top = (index % 4) * 240 + 10, (index // 4) * 350 + 25
            sheet.paste(thumbnail, (left, top))
            draw.text((left, top - 18), f"PDF {start + index + 1}", fill="black")
        sheet.save(review / f"contact-{start // 12 + 1}.jpg", quality=90)
    print(json.dumps({"pages": len(pages), "pdfBytes": len(source_bytes), "sourceSha256": EXPECTED_SHA256,
                      "manifestSha256": sha256(manifest_bytes), "textCharacters": sum(len(p["text"]) for p in pages),
                      "imageBytes": sum(p["imageBytes"] for p in pages), "uniqueSourceLinks": len(LINK_LABELS)}))


if __name__ == "__main__":
    main()
