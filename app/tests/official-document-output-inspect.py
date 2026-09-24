import argparse, json, pathlib, sys, zipfile, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')
p=argparse.ArgumentParser();p.add_argument('kind',choices=['docx','pdf']);p.add_argument('path');args=p.parse_args()
path=pathlib.Path(args.path)
if args.kind=='docx':
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  names=z.namelist(); assert '[Content_Types].xml' in names and 'word/document.xml' in names
  for n in names:
   if n.endswith(('.xml','.rels')): ET.fromstring(z.read(n))
  doc=ET.fromstring(z.read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
  text='\n'.join(''.join(n.itertext()) for n in doc.findall('.//w:t',ns))
  pg=doc.find('.//w:sectPr/w:pgSz',ns); attrs={k.split('}')[-1]:v for k,v in pg.attrib.items()}
  core=ET.fromstring(z.read('docProps/core.xml'));desc=core.find('{http://purl.org/dc/elements/1.1/}description').text
  tables=doc.findall('.//w:tbl',ns)
  table_layouts=[{'columns':[int(n.get('{'+ns['w']+'}w')) for n in table.findall('./w:tblGrid/w:gridCol',ns)],'spans':[int(n.get('{'+ns['w']+'}val')) for n in table.findall('.//w:gridSpan',ns)]} for table in tables]
  body=list(doc.find('w:body',ns)); adjacent_tables=sum(a.tag.endswith('}tbl') and b.tag.endswith('}tbl') for a,b in zip(body,body[1:]))
  print(json.dumps({'text':text,'entries':names,'page':attrs,'tables':len(tables),'tableLayouts':table_layouts,'adjacentTables':adjacent_tables,'provenance':desc},ensure_ascii=False))
else:
 import fitz
 doc=fitz.open(path);pages=[]
 for i,page in enumerate(doc):
  text=page.get_text();outside=[]
  for word in page.get_text('words'):
   x0,y0,x1,y1,*_=word
   if x0 < -1 or y0 < -1 or x1 > page.rect.width+1 or y1 > page.rect.height+1:outside.append(word[:4])
  pages.append({'page':i+1,'width':page.rect.width,'height':page.rect.height,'text':text,'outsideTextBounds':outside})
  if i in {0,len(doc)//2,len(doc)-1}: page.get_pixmap(matrix=fitz.Matrix(1.25,1.25)).save(path.with_name(path.stem+f'-page-{i+1}.png'))
 print(json.dumps({'pages':pages,'text':'\n'.join(p['text'] for p in pages)},ensure_ascii=False))
