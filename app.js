'use strict';

const allLinks = [...document.querySelectorAll('.source-link')];
const questions = [...document.querySelectorAll('.question')];
const monthFilter = document.getElementById('month-filter');
const openedTabs = new Map();
const status = document.getElementById('status');
const notice = document.getElementById('popup-notice');
const blockedList = document.getElementById('blocked-links');

let opening = false;
const openAllButton = document.getElementById('open-all');
openAllButton.addEventListener('click', async () => {
  if (opening) return;
  opening = true;
  openAllButton.disabled = true;
  const pending = [];
  const links = allLinks.filter(link => !link.closest('article').hidden);
  const blocked = [];
  let opened = 0;
  for (const link of links) {
    const url = link.href;
    try {
      // Keep this synchronous: waiting between opens loses the user's activation.
      let tab = openedTabs.get(url);
      if (!tab || tab.closed) {
        tab = window.open('about:blank', '_blank');
        if (!tab) {
          blocked.push(link);
          continue;
        }
        tab.document.title = '원문 로딩 대기';
        tab.document.body.textContent = '3~6초 간격으로 순서대로 불러옵니다. 이 탭을 닫으면 건너뜁니다.';
        tab.opener = null;
        pending.push({tab, url});
        openedTabs.set(url, tab);
      }
      opened++;
    } catch {
      openedTabs.delete(url);
      blocked.push(link);
    }
  }
  blockedList.replaceChildren();
  for (const link of blocked) {
    const item = document.createElement('li');
    const fallback = document.createElement('a');
    fallback.href = link.href;
    fallback.target = '_blank';
    fallback.rel = 'noopener noreferrer';
    fallback.textContent = link.closest('article').querySelector('h2').textContent;
    item.append(fallback);
    blockedList.append(item);
  }
  notice.hidden = blocked.length === 0;
  let loaded = 0;
  try {
    for (let i = 0; i < pending.length; i++) {
      status.textContent = `순차 로딩 ${loaded}/${pending.length} · 3~6초 간격 · 목록 페이지를 열어 두세요.`;
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 3000 + Math.floor(Math.random() * 3001)));
      const {tab, url} = pending[i];
      try {
        if (!tab.closed && tab.location.href === 'about:blank') { tab.location.replace(url); loaded++; }
      } catch { /* Skip tabs closed or navigated manually. */ }
    }
    status.textContent = `${loaded}개 로딩 요청 완료 · 기존 탭 ${opened - pending.length}개 재사용${blocked.length ? ` · 팝업 차단 ${blocked.length}개` : ''}`;
  } finally { opening = false; openAllButton.disabled = false; }
});

function filterMonth() {
  let count = 0;
  for (const question of questions) {
    question.hidden = monthFilter.value !== 'all' && question.dataset.month !== monthFilter.value;
    if (!question.hidden) {
      count++;
      question.querySelector('.number').textContent = String(count).padStart(2, '0');
    }
  }
  document.getElementById('post-count').textContent = `${count}문항`;
  notice.hidden = true;
  status.textContent = '';
  document.getElementById('questions').classList.toggle('short-list', count <= 3);
}
monthFilter.addEventListener('change', filterMonth);
filterMonth();

document.getElementById('dismiss-notice').addEventListener('click', () => {
  notice.hidden = true;
  document.getElementById('open-all').focus();
});

const dialog = document.getElementById('sources-dialog');
document.getElementById('show-sources').addEventListener('click', () => dialog.showModal());
document.getElementById('close-sources').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
