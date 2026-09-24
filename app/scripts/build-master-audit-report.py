"""Render the approved local Markdown audit into a browsable HTML and A4 PDF."""
from pathlib import Path
import html
import json
import re
import hashlib
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

APP = Path(__file__).resolve().parents[1]
SOURCE = APP.parent / 'docs/MAARIFOS_MASTER_RAPOR_2026_09_07.md'
OUT = APP / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / 'MaarifOS_Master_Rapor_2026_09_07.pdf'
HTML = OUT / 'MaarifOS_Master_Rapor_2026_09_07.html'
FONT_ROOT = Path('C:/Windows/Fonts')
for name, filename in [('Audit','arial.ttf'), ('AuditBold','arialbd.ttf'), ('AuditItalic','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_ROOT / filename)))
pdfmetrics.registerFontFamily('Audit',normal='Audit',bold='AuditBold',italic='AuditItalic',boldItalic='AuditBold')
INK = colors.HexColor('#183844')
TEAL = colors.HexColor('#27766f')
MUTED = colors.HexColor('#5f7279')
LINE = colors.HexColor('#d5e1e0')
W, H = 595.276, 841.89
CW = W - 96
STYLES = {
    'body': ParagraphStyle('body',fontName='Audit',fontSize=10,leading=15,textColor=INK,spaceAfter=10,splitLongWords=True),
    'small': ParagraphStyle('small',fontName='Audit',fontSize=8.6,leading=12,textColor=MUTED,spaceAfter=8),
    'h': ParagraphStyle('h',fontName='AuditBold',fontSize=21,leading=27,textColor=INK,spaceAfter=18),
    'cell': ParagraphStyle('cell',fontName='Audit',fontSize=8.3,leading=11.6,textColor=INK,spaceAfter=0),
    'th': ParagraphStyle('th',fontName='AuditBold',fontSize=8.4,leading=11.5,textColor=colors.white),
    'bullet': ParagraphStyle('bullet',fontName='Audit',fontSize=9.6,leading=14,textColor=INK,leftIndent=12,firstLineIndent=-10,spaceAfter=7),
    'cover': ParagraphStyle('cover',fontName='AuditBold',fontSize=38,leading=44,textColor=INK,spaceAfter=26),
    'deck': ParagraphStyle('deck',fontName='Audit',fontSize=15,leading=23,textColor=TEAL,spaceAfter=20),
}

def inline(text, pdf=True):
    text = html.escape(text)
    text = text.replace('&lt;br/&gt;', '<br/>')
    text = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', lambda m: f'<a href="{m[2]}" color="#27766f">{m[1]}</a>' if pdf else f'<a href="{m[2]}">{m[1]}</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text = re.sub(r'`([^`]+)`',r'\1',text)
    return text.replace('→',' - ').replace('≤',' &lt;= ').replace('≥',' &gt;= ').replace('×',' x ')

def paragraph(text, style='body'):
    return Paragraph(inline(text),STYLES[style])

def table(rows):
    n = len(rows[0])
    weights = {2:[.27,.73],3:[.23,.36,.41],4:[.20,.26,.16,.38]}.get(n,[1/n]*n)
    if n == 4 and rows[0][0] in ('An','Yaş bandı'):
        weights = [.20,.30,.25,.25]
    if n == 4 and rows[0][0] == 'İş':
        weights = [.31,.25,.14,.30]
    cells = [[paragraph(c,'th' if i==0 else 'cell') for c in row] for i,row in enumerate(rows)]
    t=Table(cells,colWidths=[CW*w for w in weights],repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),TEAL),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f0f6f4'),colors.white]),
        ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.35,LINE),
    ]))
    return t

raw=SOURCE.read_text(encoding='utf-8')
sections=re.split(r'^## ',raw,flags=re.M)[1:]
story=[]
html_sections=[]
story += [Spacer(1,66),paragraph('MAARİFOS / 2026','small'),paragraph('Kapsamlı<br/>master raporu','cover'),paragraph('Sistem mantığı, matematik, içerik,<br/>öğrenci deneyimi ve profesyonel belge tasarımı','deck')]
story += [paragraph('7 Eylül 2026 | Yerel uygulama ve kabul planı'),Spacer(1,22)]
story += [table([['Bu raporun üç çıktısı','Sonuç'],['Çalışan düzeltmeler','Soyadı önerisi, adres, üçüncü kişi tablosu ve doğrulanan hesaplama düzeltmeleri'],['Derin inceleme','Kod ve kurgu veriyle somut bulgular; güçlü yönler ve açık sınırlar'],['Uygulama planı','Öncelik, bağımlılık, efor ve ölçülebilir kabul kapıları']]),Spacer(1,25),paragraph('HALİS / MARİF\nKişisel öğrenci verisi içermez. Uzaktan yayın veya bütün ürün için saha kabul belgesi değildir.','small')]
story += [PageBreak(),paragraph('İçindekiler','h'),paragraph('Her bölüm ayrı sayfada; uygulananlar ve sıradaki işler kendi durumuyla belirtilmiştir.','small')]
toc_rows=[['Bölüm','Sayfa']]+[[sec.splitlines()[0],str(i+3)] for i,sec in enumerate(sections)]
toc_table=Table([[paragraph(c,'cell') for c in row] for row in toc_rows],colWidths=[CW-38,38])
toc_table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),.25,LINE)]))
story.append(toc_table)

for sec in sections:
    title,body=sec.split('\n',1)
    story += [PageBreak(),paragraph(title.strip(),'h')]
    blocks=re.split(r'\n\s*\n',body.strip())
    web=[f'<section id="s{title[:2]}"><h2>{html.escape(title)}</h2>']
    for block in blocks:
        if block.startswith('|'):
            rows=[[c.strip() for c in line.strip().strip('|').split('|')] for line in block.splitlines() if not re.match(r'^\|[\s:|\-]+\|$',line)]
            story += [table(rows),Spacer(1,13)]
            web.append('<table>'+''.join('<tr>'+''.join(f'<{"th" if i==0 else "td"}>{inline(c,False)}</{"th" if i==0 else "td"}>' for c in row)+'</tr>' for i,row in enumerate(rows))+'</table>')
        elif block.startswith('!['):
            match=re.match(r'!\[([^]]*)\]\(([^)]+)\)',block)
            if match:
                image_path=(SOURCE.parent/match[2]).resolve()
                iw,ih=ImageReader(str(image_path)).getSize()
                width=CW*.84
                story += [Image(str(image_path),width=width,height=width*ih/iw),paragraph(match[1],'small')]
                web.append(f'<figure><img src="{image_path.as_uri()}" alt="{html.escape(match[1])}"/><figcaption>{html.escape(match[1])}</figcaption></figure>')
        elif block.startswith('- '):
            for line in block.splitlines():
                story.append(paragraph('• '+line.removeprefix('- '),'bullet'))
            web.append('<ul>'+''.join(f'<li>{inline(line.removeprefix("- "),False)}</li>' for line in block.splitlines())+'</ul>')
        else:
            story.append(paragraph(block.replace('\n',' ')))
            web.append(f'<p>{inline(block,False)}</p>')
    web.append('</section>')
    html_sections.append(''.join(web))

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        self._saved=[]
    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()
    def save(self):
        total=len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            self.setStrokeColor(LINE)
            self.line(48,43,W-48,43)
            self.setFont('Audit',8)
            self.setFillColor(MUTED)
            self.drawString(48,29,'MAARİFOS  |  07.09.2026  |  YEREL MASTER RAPOR')
            self.drawRightString(W-48,29,f'{self._pageNumber} / {total}')
            if self._pageNumber>1:
                self.setFillColor(TEAL)
                self.rect(48,H-35,22,3,fill=1,stroke=0)
                self.setFont('Audit',8)
                self.drawString(79,H-36,'BULGU  /  KARAR  /  KABUL KANITI')
            super().showPage()
        super().save()

doc=SimpleDocTemplate(str(PDF),pagesize=(W,H),leftMargin=48,rightMargin=48,topMargin=62,bottomMargin=58,title='MaarifOS Kapsamlı Master Raporu - 7 Eylül 2026',author='HALİS / MARİF')
doc.build(story,canvasmaker=NumberedCanvas)
toc=''.join(f'<a href="#s{s[:2]}">{html.escape(s.splitlines()[0])}</a>' for s in sections)
css='''body{margin:0;background:#edf3f2;color:#183844;font:16px/1.65 Arial,sans-serif}header,main{max-width:1020px;margin:auto}header{padding:48px 32px}h1{font-size:44px;line-height:1.15}h2{font-size:28px;line-height:1.25;color:#183844}nav{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}a{color:#27766f}section{background:white;margin:0 0 24px;padding:36px 44px;border-radius:10px;border-top:5px solid #27766f}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px;border-bottom:1px solid #d5e1e0;text-align:left;vertical-align:top}th{background:#27766f;color:white}tr:nth-child(even){background:#f0f6f4}img{max-width:100%;height:auto}figcaption{font-size:13px;color:#5f7279}@media(max-width:700px){header,section{padding:22px}nav{grid-template-columns:1fr}table{display:block;overflow:auto}h1{font-size:32px}}@media print{nav{display:none}section{break-before:page;border:none}}'''
HTML.write_text(f'<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MaarifOS Master Raporu</title><style>{css}</style><header><p>07.09.2026 · HALİS / MARİF</p><h1>MaarifOS kapsamlı master raporu</h1><p>Uygulanan düzeltmeler, somut denetim bulguları ve öncelikli yol haritası.</p><nav>{toc}</nav></header><main>{"".join(html_sections)}</main></html>',encoding='utf-8')
reader=PdfReader(str(PDF))
assert all((page.extract_text() or '').strip() for page in reader.pages)
receipt={'source':str(SOURCE),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'pdf':str(PDF),'pdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'pages':len(reader.pages),'sections':len(sections),'html':str(HTML),'visualQa':'pending'}
(OUT/'master-report-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(receipt,ensure_ascii=False))
