"""Build a dependency-free, statically rendered filming reference page."""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / 'content.json').read_text(encoding='utf-8'))
months = sorted({post['publishedAt'][:7] for post in data['posts']}, reverse=True)
default_month = months[0]
default_count = sum(post['publishedAt'].startswith(default_month) for post in data['posts'])
month_options = ''.join(f'<option value="{month}">{month[:4]}년 {int(month[5:])}월</option>' for month in months) + '<option value="all">전체 게시월</option>'
cards = []
for number, post in enumerate(data['posts'], 1):
    title, url = escape(post['title']), escape(post['url'], quote=True)
    month = post['publishedAt'][:7]
    hidden = '' if month == default_month else ' hidden'
    cards.append(f'''      <article class="question" data-post-id="{post['id']}" data-month="{month}"{hidden}>
        <div class="question-meta"><span class="number">{number:02}</span><span>{escape(post['category'])}</span><time datetime="{post['publishedAt']}">{post['publishedAt'].replace('-', '.')}</time><a class="source-link" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="{title} 원문 새 탭에서 열기">원문 <span aria-hidden="true">↗</span></a></div>
        <h2><a class="post-title" href="{url}" target="_blank" rel="noopener noreferrer">{title}</a></h2>
        <div class="answer"><span class="answer-label">예상 답변</span><p>{escape(post['answer'])}</p></div>
      </article>''')
refs = ''.join(f'<li><a href="{escape(r["url"], quote=True)}" target="_blank" rel="noopener noreferrer">{escape(r["title"])} ↗</a></li>' for r in data['references'].values())
html = (ROOT / 'index.template.html').read_text(encoding='utf-8')
html = html.replace('{{POSTS}}', '\n'.join(cards)).replace('{{REFERENCES}}', refs).replace('{{VERIFIED_AT}}', data['verifiedAt'].replace('-', '.'))
html = html.replace('{{MONTH_OPTIONS}}', month_options).replace('{{DEFAULT_COUNT}}', str(default_count))
(ROOT / 'index.html').write_text(html, encoding='utf-8')
print(f'Built index.html with {len(cards)} verified post links.')
