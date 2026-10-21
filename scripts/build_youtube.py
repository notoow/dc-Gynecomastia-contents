"""Build the curated YouTube Q&A page and downloadable comment cards.

Requires Pillow for cropping original screenshots.
Editable cards are rendered on demand by the browser.
"""
import json
import re
import subprocess
import sys
from html import escape as esc
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/youtube'
data = json.loads((ROOT / 'youtube.json').read_text(encoding='utf-8'))
cards = []
for n, item in enumerate(data['comments'], 1):
    ident = item['id']
    source = ASSETS / f'{ident}.jpg'
    if item.get('sourceType') == 'user-provided' and not item.get('captureFile'):
        title, category = esc(item['title']), esc(item['category'])
        url = esc(item['url'], quote=True)
        replies = ''.join(f'<div class="supplied-reply"><b>{esc(r["author"])}</b> · {esc(r["publishedLabel"])}<p>{esc(r["body"])}</p></div>' for r in item.get('replies', []))
        likes = f' · 좋아요 {item["likes"]}개' if 'likes' in item else ''
        cards.append(f'''<article class="youtube-card" data-category="{category}" data-print-index="{n-1}">
        <label class="print-select"><input type="checkbox" class="print-check" aria-label="{title} 인쇄 선택"> 인쇄 선택</label>
        <div class="question-meta"><span class="number">{n:02}</span><span>{category}</span><a class="source-link" href="{url}" target="_blank" rel="noopener noreferrer">{esc(item['sourceLinkLabel'])} ↗</a></div>
        <h2>{title}</h2><div class="supplied-comment"><small>{esc(item['sourceLabel'])}</small><p><b>{esc(item['author'])}</b> · {esc(item['publishedLabel'])}</p><blockquote>{esc(item['body'])}</blockquote><small>{esc(item['replyLabel'])}{likes}</small>{replies}</div>
        <p class="filming"><b>촬영 포인트</b>{esc(item['focus'])}</p>
        <div class="downloads"><a href="assets/youtube/print/{ident}.pdf" download="{n:02}-인쇄용-원문.pdf">인쇄용 원문 PDF ↓</a></div>
        <p class="source-note">{esc(item['video'])}</p></article>''')
        continue
    # Tighten only empty right margin of the browser screenshot; preserve pixels.
    original = Image.open(ROOT/item['captureFile'] if item.get('captureFile') else source).convert('RGB')
    background = original.getpixel((original.width - 1, original.height // 2))
    diff = ImageChops.difference(original, Image.new('RGB', original.size, background))
    box = diff.point(lambda p: 255 if p > 55 else 0).getbbox()
    if box:
        original = original.crop((0, 0, min(original.width, box[2] + 16), original.height))
    original.save(ASSETS / f'{ident}-original.png')
    category, title = esc(item['category']), esc(item['title'])
    url = esc(item['url'], quote=True)
    reply_html = ''.join(f'<div class="supplied-reply"><b>{esc(r["author"])}</b> · {esc(r["publishedLabel"])}<p>{esc(r["body"])}</p></div>' for r in item.get('replies', []))
    video_button = ''
    if item.get('referencedVideo'):
        video_button = f'<button type="button" data-video-popup="{esc(item["referencedVideo"], quote=True)}">댓글 속 영상 보기 ▶</button>'
    cards.append(f'''<article class="youtube-card" data-category="{category}" data-print-index="{n-1}">
      <label class="print-select"><input type="checkbox" class="print-check" aria-label="{title} 인쇄 선택"> 인쇄 선택</label>
      <div class="question-meta"><span class="number">{n:02}</span><span>{category}</span><a href="{url}" target="_blank" rel="noopener noreferrer" class="source-link">원문 댓글 ↗</a></div>
      <h2><a class="post-title" href="{url}" target="_blank" rel="noopener noreferrer">{title}</a></h2>
      <a href="assets/youtube/{ident}-original.png" target="_blank" rel="noopener" aria-label="{title} 실제 캡처 크게 보기"><img class="comment-preview" src="assets/youtube/{ident}-original.png" alt="{esc(item['body'], quote=True)}" loading="lazy" width="{original.width}" height="{original.height}"></a>
      <p class="filming"><b>촬영 포인트</b> {esc(item['focus'])}</p>
      <div class="downloads"><a href="assets/youtube/print/{ident}.pdf" download="{n:02}-인쇄용-원문.pdf">인쇄용 원문 PDF ↓</a><a href="assets/youtube/{ident}-original.png" download="{n:02}-댓글-원본캡처.png">원본 캡처 PNG ↓</a><button type="button" data-edit-comment data-author="{esc(item["author"], quote=True)}" data-date="{esc(item["publishedLabel"], quote=True)}" data-replies="{re.search(r"[0-9]+", item["replyLabel"]).group()}" data-avatar-source="assets/youtube/{ident}-original.png">편집기에 불러오기</button></div>
      {video_button}<details><summary>댓글 원문 · 영상 정보 · 대댓글</summary><blockquote>{esc(item['body'])}</blockquote>{reply_html}<p>{esc(item['author'])} · {esc(item['publishedLabel'])}<br>{esc(item['video'])}</p><a href="assets/youtube/{ident}-original.png" target="_blank" rel="noopener">실제 Studio 캡처 보기 ↗</a></details>
    </article>''')

with ZipFile(ASSETS / 'youtube-qna-images.zip', 'w', ZIP_DEFLATED) as archive:
    for n, item in enumerate(data['comments'], 1):
        if item.get('sourceType') == 'user-provided' and not item.get('captureFile'):
            continue
        for style, label in [('original', '원본캡처')]:
            archive.write(ASSETS / f'{item["id"]}-{style}.png', f'{n:02}-{label}.png')
    archive.writestr('읽어주세요.txt', '실제 YouTube Studio 댓글 캡처입니다. 확인일: 2026-10-21. 편집기에서 만든 이미지는 포함하지 않습니다.')

categories = list(dict.fromkeys(c['category'] for c in data['comments']))
options = ''.join(f'<option>{esc(c)}</option>' for c in categories)
html = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>유튜브 댓글 Q&A · 하이스트</title><link rel="icon" href="assets/highst-favicon.png" type="image/png"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="youtube.css"><script src="assets/vendor/pdf-lib.min.js" defer></script><script src="youtube-pdf.js" defer></script><script src="comment-popup.js" defer></script><script src="youtube.js" defer></script><script src="platform.js" defer></script></head><body>
<a class="skip-link" href="#youtube-list">질문 목록으로 이동</a><div class="page">
<header class="masthead"><a class="home-link" href="index.html" aria-label="댓글 Q&A 메인으로 이동"><img class="logo" src="assets/highst-logo.png" alt="하이스트 비뇨의학과"></a><div class="page-label"><h1>유튜브 댓글 Q&A</h1><span>황인성 원장</span></div><div class="header-actions"><a class="editor-link" href="comment-editor.html">댓글 이미지 만들기</a><button class="group-button" id="open-group" type="button">새 그룹으로 열기</button><a class="open-all" href="assets/youtube/youtube-qna-images.zip" download>원본 캡처 전체 ZIP ↓</a></div></header>
<nav class="source-nav" aria-label="질문 출처"><a href="index.html">디시</a><a href="youtube.html" aria-current="page">유튜브</a><a href="instagram.html">인스타</a></nav>
<div class="youtube-intro"><p><strong>닥터 황의 인성수업 · 촬영용 댓글 {len(cards)}개</strong><br>Q&A와 재미·리액션·공감 댓글을 함께 정리했습니다.</p><p>프로필을 유지한 실제 댓글 캡처 수록<br>제목은 편집 요약이며, 촬영 포인트는 영상 활용 제안입니다.</p></div>
<p class="image-note">아래 이미지는 프로필을 바꾸지 않은 실제 댓글 캡처입니다. 테마·내용 변경은 헤더의 ‘댓글 이미지 만들기’에서 별도 이미지로 만들 수 있습니다.</p>
<div class="filters"><label>질문 검색 <input id="comment-search" type="search" placeholder="감량, 마취, 재수술…"></label><label>주제 <select id="category"><option value="">전체 주제</option>{options}</select></label><span id="result-count" role="status">{len(cards)}개 질문</span></div>
<section class="print-toolbar" aria-label="댓글 병합 인쇄">
<div class="print-actions"><button id="print-select-visible" type="button">검색 결과 전체 선택</button><button id="print-clear" type="button">선택 해제</button><strong id="print-count" role="status">0개 선택</strong></div>
<div class="print-actions"><label>인쇄 내용 <select id="print-mode"><option value="readable">캡처 + 선명한 원문 텍스트</option><option value="capture">캡처 우선 (미확보 댓글은 원문)</option></select></label><button id="print-download" type="button" disabled>선택 댓글 A4 병합 PDF ↓</button><a href="assets/youtube/print/youtube-print-all.pdf" download>전체 {len(cards)}개 인쇄용 PDF ↓</a></div>
<p>댓글을 선택하면 한 PDF에 순서대로 배치합니다. 원문 텍스트는 확대해도 선명합니다. 기존 캡처 자체의 해상도는 그대로입니다.</p><p id="print-status" role="status"></p><a id="print-save" hidden download="유튜브-선택댓글-인쇄.pdf">완성된 PDF 저장 ↓</a>
</section>
<main id="youtube-list" class="youtube-grid">{''.join(cards)}</main><p id="empty" hidden>검색 결과가 없습니다. 검색어나 주제를 바꿔주세요.</p>
<footer class="footer"><span>전체 댓글의 전수 목록이 아닌 촬영 후보입니다. 댓글 원문은 수정·삭제될 수 있습니다.</span><a href="index.html">디시 질문 보기 ↗</a></footer></div><dialog id="comment-popup" aria-labelledby="popup-title"><div class="popup-heading"><h2 id="popup-title"></h2><button type="button" id="popup-close" aria-label="캡처 팝업 닫기">닫기 ×</button></div><div class="popup-picture"><img id="popup-image" alt=""><iframe id="popup-video" title="댓글에 첨부된 YouTube 영상" hidden allow="fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div class="popup-actions"><a id="popup-save" download>실제 캡처 PNG 다운로드 ↓</a><a id="popup-source" target="_blank" rel="noopener noreferrer">YouTube 원문 ↗</a></div></dialog></body></html>'''
(ROOT / 'youtube.html').write_text(html, encoding='utf-8')
subprocess.run([sys.executable, str(ROOT/'scripts/build_print.py')], check=True)
print(f'Built editor and {len(cards)} comment cards.')
