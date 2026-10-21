"""Build the curated YouTube Q&A page and downloadable comment cards.

Requires Pillow and Windows Malgun Gothic for image generation.
Original screenshots are retained unchanged; dark cards are labelled transcriptions.
"""
import json
import re
from html import escape as esc
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/youtube'
data = json.loads((ROOT / 'youtube.json').read_text(encoding='utf-8'))
font_path = 'C:/Windows/Fonts/malgun.ttf'
font = ImageFont.truetype(font_path, 30)
meta_font = ImageFont.truetype(font_path, 24)
small_font = ImageFont.truetype(font_path, 23)

def wrap(text, draw, width):
    lines = []
    for paragraph in text.split('\n'):
        line = ''
        for char in paragraph:
            if draw.textlength(line + char, font=font) > width:
                lines.append(line)
                line = char
            else:
                line += char
        lines.append(line)
    return lines

cards = []
for n, item in enumerate(data['comments'], 1):
    ident = item['id']
    source = ASSETS / f'{ident}.jpg'
    # Tighten only empty right margin of the browser screenshot; preserve pixels.
    original = Image.open(source).convert('RGB')
    background = original.getpixel((original.width - 1, original.height // 2))
    diff = ImageChops.difference(original, Image.new('RGB', original.size, background))
    box = diff.point(lambda p: 255 if p > 55 else 0).getbbox()
    if box:
        original = original.crop((0, 0, min(original.width, box[2] + 16), original.height))
    original.save(ASSETS / f'{ident}-original.png')
    category, title = esc(item['category']), esc(item['title'])
    url = esc(item['url'], quote=True)
    cards.append(f'''<article class="youtube-card" data-category="{category}">
      <div class="question-meta"><span class="number">{n:02}</span><span>{category}</span><a href="{url}" target="_blank" rel="noopener noreferrer" class="source-link">원문 댓글 ↗</a></div>
      <h2><a class="post-title" href="{url}" target="_blank" rel="noopener noreferrer">{title}</a></h2>
      <a href="assets/youtube/{ident}-original.png" target="_blank" rel="noopener" aria-label="{title} 실제 캡처 크게 보기"><img class="comment-preview" src="assets/youtube/{ident}-original.png" alt="{esc(item['body'], quote=True)}" loading="lazy" width="{original.width}" height="{original.height}"></a>
      <p class="filming"><b>촬영 포인트</b> {esc(item['focus'])}</p>
      <div class="downloads"><a href="assets/youtube/{ident}-original.png" download="{n:02}-댓글-원본캡처.png">원본 캡처 PNG ↓</a><button type="button" data-edit-comment data-author="{esc(item["author"], quote=True)}" data-date="{esc(item["publishedLabel"], quote=True)}" data-replies="{re.search(r"[0-9]+", item["replyLabel"]).group()}" data-avatar-source="assets/youtube/{ident}-original.png">편집기에 불러오기</button></div>
      <details><summary>댓글 원문 · 영상 정보</summary><blockquote>{esc(item['body'])}</blockquote><p>{esc(item['author'])} · {esc(item['publishedLabel'])}<br>{esc(item['video'])}</p><a href="assets/youtube/{ident}-original.png" target="_blank" rel="noopener">실제 Studio 캡처 보기 ↗</a></details>
    </article>''')

with ZipFile(ASSETS / 'youtube-qna-images.zip', 'w', ZIP_DEFLATED) as archive:
    for n, item in enumerate(data['comments'], 1):
        for style, label in [('original', '원본캡처')]:
            archive.write(ASSETS / f'{item["id"]}-{style}.png', f'{n:02}-{label}.png')
    archive.writestr('읽어주세요.txt', '실제 YouTube Studio 댓글 원본 캡처 19장입니다. 확인일: 2026-10-21. 편집기에서 만든 이미지는 포함하지 않습니다.')

categories = list(dict.fromkeys(c['category'] for c in data['comments']))
options = ''.join(f'<option>{esc(c)}</option>' for c in categories)
editor = (ROOT / 'comment-editor.html').read_text(encoding='utf-8')
html = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>유튜브 댓글 Q&A · 하이스트</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="youtube.css"><link rel="stylesheet" href="comment-editor.css"><script src="youtube.js" defer></script><script src="comment-editor.js" defer></script><script src="platform.js" defer></script></head><body>
<a class="skip-link" href="#youtube-list">질문 목록으로 이동</a><div class="page">
<header class="masthead"><img class="logo" src="assets/highst-logo.png" alt="하이스트 비뇨의학과"><div class="page-label"><h1>유튜브 댓글 Q&A</h1><span>황인성 원장</span></div><a class="open-all" href="assets/youtube/youtube-qna-images.zip" download>원본 캡처 전체 ZIP ↓</a></header>
<nav class="source-nav" aria-label="질문 출처"><a href="index.html">디시</a><a href="youtube.html" aria-current="page">유튜브</a><a href="instagram.html">인스타</a></nav>
{editor}
<div class="youtube-intro"><p><strong>닥터 황의 인성수업 · 실제 댓글 {len(cards)}개</strong><br>감량·진단 → 수술 → 회복·재수술 질문을 촬영용으로 정리했습니다.</p><p>2026.10.21 확인 · 최근~약 5개월 전 게시 댓글 중 선별<br>제목은 질문 요약, 답변 대신 원장님께 여쭐 촬영 포인트입니다.</p></div>
<p class="image-note">아래 이미지는 프로필을 바꾸지 않은 실제 댓글 캡처입니다. 테마·내용 변경은 상단 편집기에서 별도 이미지로 만들 수 있습니다.</p>
<div class="filters"><label>질문 검색 <input id="comment-search" type="search" placeholder="감량, 마취, 재수술…"></label><label>주제 <select id="category"><option value="">전체 주제</option>{options}</select></label><span id="result-count" role="status">{len(cards)}개 질문</span></div>
<main id="youtube-list" class="youtube-grid">{''.join(cards)}</main><p id="empty" hidden>검색 결과가 없습니다. 검색어나 주제를 바꿔주세요.</p>
<footer class="footer"><span>전체 댓글의 전수 목록이 아닌 촬영 후보입니다. 댓글 원문은 수정·삭제될 수 있습니다.</span><a href="index.html">디시 질문 보기 ↗</a></footer></div></body></html>'''
(ROOT / 'youtube.html').write_text(html, encoding='utf-8')
print(f'Built editor and {len(cards)} original comment captures.')
