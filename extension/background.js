'use strict';

function validSender(sender) {
  try {
    const url = new URL(sender.url);
    return sender.id === chrome.runtime.id && Number.isInteger(sender.tab?.windowId)
      && url.origin === 'https://notoow.github.io'
      && url.pathname.startsWith('/gynecomastia-contents/');
  } catch { return false; }
}

function allowedURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (url.hostname === 'gall.dcinside.com') return ['/mgallery/board/view/', '/board/view/'].includes(url.pathname) && /^\d+$/.test(url.searchParams.get('no') || '');
    if (url.hostname === 'www.youtube.com') return url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '');
    if (['www.instagram.com','instagram.com'].includes(url.hostname)) return /^\/(p|reel)\/[\w-]+\/?$/.test(url.pathname);
    return false;
  } catch { return false; }
}

let loading = false;
const pendingTabs = new Set();
chrome.tabs.onRemoved.addListener(id => pendingTabs.delete(id));
chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.url && change.url !== 'about:blank') pendingTabs.delete(id);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'HIGHST_OPEN_GROUP') return false;
  if (!validSender(sender) || !Array.isArray(message.urls) || !message.urls.length || message.urls.length > 100 || !message.urls.every(allowedURL)) {
    sendResponse({ok:false,error:'현재 목록의 원문 링크를 확인해주세요.'});
    return false;
  }
  if (loading) { sendResponse({ok:false,error:'이전 그룹을 순차 로딩 중입니다. 완료 후 다시 시도해주세요.'}); return false; }
  loading = true;
  const urls = [...new Set(message.urls)];
  const title = typeof message.title === 'string' ? message.title.slice(0, 80) : '하이스트 촬영';
  (async () => {
    const ids = [];
    let groupId;
    try {
      // Serial creation preserves the on-page filming order.
      for (const url of urls) {
        const tab = await chrome.tabs.create({windowId:sender.tab.windowId, url:'about:blank', active:false});
        ids.push(tab.id);
        pendingTabs.add(tab.id);
      }
      groupId = await chrome.tabs.group({tabIds:ids});
      await chrome.tabGroups.update(groupId,{title,color:'yellow',collapsed:false});
      sendResponse({ok:true,count:ids.length,title,queued:true});
      for (let i = 0; i < ids.length; i++) {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 3000 + Math.floor(Math.random() * 3001)));
        if (!pendingTabs.delete(ids[i])) continue;
        try { await chrome.tabs.update(ids[i], {url:urls[i]}); }
        catch { /* Closed tabs do not interrupt the remaining queue. */ }
      }
    } catch {
      // Roll back only tabs this request created; never touch existing user tabs.
      await Promise.allSettled(ids.map(id => chrome.tabs.remove(id)));
      sendResponse({ok:false,error:'브라우저 탭 그룹을 생성할 수 없습니다. Chrome 또는 Edge에서 다시 시도해주세요.'});
    } finally { ids.forEach(id => pendingTabs.delete(id)); loading = false; }
  })();
  return true;
});
