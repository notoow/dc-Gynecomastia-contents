'use strict';

// Shared platform navigation and the optional browser tab-group companion.
(() => {
  const platform = location.pathname.endsWith('comment-editor.html') ? '편집기'
    : location.pathname.endsWith('youtube.html') ? '유튜브'
    : location.pathname.endsWith('instagram.html') ? '인스타' : '디시';
  const nav = document.querySelector('.source-nav');
  if (nav) {
    nav.replaceChildren(...[['디시', 'index.html'], ['유튜브', 'youtube.html'], ['인스타', 'instagram.html']].map(([name, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = name;
      if (platform === name) link.setAttribute('aria-current', 'page');
      return link;
    }));
  }
  // Preserve the existing YouTube page and add the same title-link interaction.
  for (const card of document.querySelectorAll('.youtube-card')) {
    const title = card.querySelector('h2');
    const source = card.querySelector('.source-link');
    if (!title || !source || title.querySelector('a')) continue;
    const link = document.createElement('a');
    link.href = source.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'post-title';
    link.textContent = title.textContent;
    title.replaceChildren(link);
  }

  let groupButton = document.getElementById('open-group');
  if (!groupButton && platform === '유튜브') {
    groupButton = document.createElement('button');
    groupButton.type = 'button';
    groupButton.id = 'open-group';
    groupButton.className = 'group-button';
    groupButton.textContent = '새 그룹으로 열기';
    document.querySelector('.masthead .open-all').before(groupButton);
  }
  if (!groupButton) return;
  let feedback = document.getElementById('status');
  if (!feedback) {
    feedback = document.createElement('p');
    feedback.id = 'status';
    feedback.className = 'status';
    feedback.setAttribute('role', 'status');
    document.querySelector('.footer').after(feedback);
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'group-help';
  dialog.setAttribute('aria-labelledby', 'group-help-heading');
  dialog.innerHTML = `<div class="dialog-header"><h2 id="group-help-heading">새 탭 그룹으로 열기</h2><button class="text-button" type="button" data-close>닫기 ×</button></div>
    <p>Chrome·Edge에서는 전용 확장을 한 번 설치하면, 이 버튼으로 현재 목록만 새 그룹에 모아 열 수 있습니다.</p>
    <ol><li><a href="downloads/highst-tab-groups.zip" download>하이스트 탭 그룹 확장 다운로드 ↓</a> 후 압축을 풉니다.</li><li>Chrome은 <code>chrome://extensions</code>, Edge는 <code>edge://extensions</code>를 주소창에 입력합니다.</li><li>‘개발자 모드’를 켜고 ‘압축해제된 확장 프로그램을 로드’에서 압축 푼 폴더를 선택합니다.</li><li>이 페이지를 새로고침한 뒤 ‘새 그룹으로 열기’를 누릅니다.</li></ol>
    <p>설치 없이도 각 질문의 원문 링크를 사용할 수 있습니다. 그룹 이름에는 플랫폼과 선택한 게시월이 표시됩니다.</p>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  let timer;
  groupButton.addEventListener('click', () => {
    if (document.documentElement.dataset.highstGroups !== 'ready') {
      dialog.showModal();
      return;
    }
    groupButton.disabled = true;
    feedback.textContent = '새 탭 그룹을 만들고 있습니다…';
    timer = setTimeout(() => {
      groupButton.disabled = false;
      feedback.textContent = '확장 연결을 확인하지 못했습니다. 페이지를 새로고침한 뒤 다시 눌러주세요.';
    }, 20000);
  });
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'HIGHST_GROUP_RESULT') return;
    clearTimeout(timer);
    groupButton.disabled = false;
    feedback.textContent = event.data.ok
      ? `‘${event.data.title}’ 새 그룹에 ${event.data.count}개 탭을 준비했습니다. 3~6초 간격으로 순서대로 불러옵니다.`
      : `그룹을 만들지 못했습니다. ${event.data.error || '확장을 확인하고 다시 시도해주세요.'}`;
  });
})();
