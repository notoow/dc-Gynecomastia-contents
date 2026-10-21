"""Preserve real captures and add embedded Korean text for legible printing."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/youtube/print'
OUT.mkdir(exist_ok=True)
FONT = 'Malgun'
pdfmetrics.registerFont(TTFont(FONT, 'C:/Windows/Fonts/malgun.ttf'))
style = ParagraphStyle('body', fontName=FONT, fontSize=11, leading=17, wordWrap='CJK')
title_style = ParagraphStyle('title', parent=style, fontSize=12, leading=18)
items = json.loads((ROOT/'youtube.json').read_text(encoding='utf-8'))['comments']
W = 515

def layout(item, number, text):
    image = ROOT / f'assets/youtube/{item["id"]}-original.png'
    supplied = item.get('sourceType') == 'user-provided' and not item.get('captureFile')
    image_h = 0
    if not supplied:
        iw, ih = Image.open(image).size
        image_h = (W-24) * ih / iw
    title = Paragraph(escape(f'{number:02}  {item["title"]}'), title_style)
    _, th = title.wrap(W-24, 1000)
    # Unsupported emoji stay in the untouched screenshot above the transcript.
    glyphs = pdfmetrics.getFont(FONT).face.charToGlyph
    full_body = item['body'] + ''.join(f'\n\n대댓글 {r["author"]} · {r["publishedLabel"]}\n{r["body"]}' for r in item.get('replies', []))
    if supplied:
        full_body += f'\n\n촬영 포인트: {item["focus"]}'
    body = ''.join(c if ord(c) in glyphs or c=='\n' else '[이모지]' for c in full_body)
    paragraph = Paragraph(escape(body).replace('\n', '<br/>'), style)
    _, bh = paragraph.wrap(W-24, 2000)
    h = 12+th+10+image_h+12+(bh+24 if text or supplied else 0)+22
    return image, image_h, title, th, paragraph, bh, h

def draw(c, item, number, text):
    image, ih, title, th, paragraph, bh, h = layout(item, number, text)
    c.setPageSize((W,h))
    c.setFillColorRGB(1,1,1);c.rect(0,0,W,h,fill=1,stroke=0)
    y=h-12-th;title.drawOn(c,12,y)
    supplied = item.get('sourceType') == 'user-provided' and not item.get('captureFile')
    y-=10+ih
    if not supplied:
        c.drawImage(str(image),12,y,W-24,ih)
    y-=12
    if text or supplied:
        c.setFont(FONT,8);c.setFillColorRGB(.4,.4,.4)
        c.drawString(12,y-8,'사용자 제공 원문 · 실제 캡처 미확보' if supplied else '원문 텍스트 · 이모지는 위 실제 캡처 참고')
        y-=20+bh;paragraph.drawOn(c,12,y)
    c.setFont(FONT,8);c.setFillColorRGB(.4,.4,.4)
    source_label = item.get('sourceLinkLabel', '실제 댓글 캡처 / 원문 보기')
    c.drawString(12,10,f'{item["author"]} · {item["publishedLabel"]} · {source_label}')
    c.linkURL(item['url'],(12,8,W-12,22),relative=0)
    c.showPage()

for mode in ['readable','capture']:
    master=canvas.Canvas(str(OUT/f'{mode}-source.pdf'))
    master.setTitle('YouTube comments - print source')
    for i,item in enumerate(items,1):
        draw(master,item,i,mode=='readable')
        if mode=='readable':
            single=canvas.Canvas(str(OUT/f'{item["id"]}.pdf'))
            draw(single,item,i,True);single.save()
    master.save()

# A ready-to-download full set, laid out with the same A4 margins as the UI.
from pypdf import PdfReader, PdfWriter, Transformation
reader = PdfReader(OUT/'readable-source.pdf')
writer = PdfWriter()
page = None
y = 0
for source in reader.pages:
    width, height = float(source.mediabox.width), float(source.mediabox.height)
    scale = min(515.28/width, 761.89/height, 1)
    h = height*scale
    if page is None or y-h < 40:
        page = writer.add_blank_page(width=595.28,height=841.89)
        y = 801.89
    page.merge_transformed_page(source,Transformation().scale(scale).translate(40,y-h))
    y -= h+18
with (OUT/'youtube-print-all.pdf').open('wb') as target:
    writer.write(target)
print(f'Built print sources for {len(items)} comments.')
