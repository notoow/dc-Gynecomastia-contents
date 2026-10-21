'use strict';

const links = [...document.querySelectorAll('.source-link')];
const openedTabs = new Map();
const status = document.getElementById('status');
const notice = document.getElementById('popup-notice');
const blockedList = document.getElementById('blocked-links');

document.getElementById('open-all').addEventListener('click', () => {
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
        // Detach before navigating to an external page; retain only our handle.
        tab.opener = null;
        tab.location.replace(url);
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
  status.textContent = blocked.length
    ? `${links.length}개 중 ${opened}개 열림 · ${blocked.length}개 차단됨. 팝업 허용 후 다시 눌러주세요.`
    : `${opened}개 게시글 탭이 준비되었습니다.`;
});

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
