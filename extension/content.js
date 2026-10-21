'use strict';
document.documentElement.dataset.highstGroups = 'ready';
let busy = false;
// Respond only to an actual user click in this site, never an arbitrary message.
document.addEventListener('click', async event => {
  if (!event.isTrusted || !event.target.closest('#open-group') || busy) return;
  busy = true;
  try {
    const urls = [...new Set([...document.querySelectorAll('.source-link')]
      .filter(link => !link.closest('article')?.hidden)
      .map(link => link.href))];
    const platform = location.pathname.endsWith('youtube.html') ? '유튜브' : '디시';
    const select = document.getElementById('month-filter');
    const month = select ? select.selectedOptions[0].textContent : '';
    const result = await chrome.runtime.sendMessage({type:'HIGHST_OPEN_GROUP', urls, title:`하이스트 · ${platform}${month ? ' · ' + month : ''}`});
    window.postMessage({type:'HIGHST_GROUP_RESULT', ...result}, location.origin);
  } catch (error) {
    window.postMessage({type:'HIGHST_GROUP_RESULT', ok:false, error:'확장을 새로고침한 뒤 다시 시도해주세요.'}, location.origin);
  } finally {
    busy = false;
  }
}, true);
