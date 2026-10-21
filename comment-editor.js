'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const canvas = byId('editor-canvas');
  const ctx = canvas.getContext('2d');
  const text = byId('editor-text');
  const opacity = byId('editor-opacity');
  const transparent = byId('editor-transparent');
  const status = byId('editor-status');
  const dateInput = byId('editor-date');
  const dateSlider = byId('editor-date-slider');
  const dateSteps = ['방금',
    ...Array.from({length:23}, (_, i) => `${i + 1}시간 전`),
    ...Array.from({length:30}, (_, i) => `${i + 1}일 전`),
    ...Array.from({length:11}, (_, i) => `${i + 1}개월 전`),
    ...Array.from({length:10}, (_, i) => `${i + 1}년 전`)];
  dateSlider.max = String(dateSteps.length - 1);
  function syncDateSlider() {
    const value = dateInput.value.trim();
    const index = dateSteps.findIndex(step => step.replace(/\s/g, '') === value.replace(/\s/g, ''));
    if (index >= 0) dateSlider.value = String(index);
    byId('date-slider-value').textContent = index >= 0 ? dateSteps[index] : `직접 입력: ${value || '없음'}`;
    dateSlider.setAttribute('aria-valuetext', index >= 0 ? dateSteps[index] : `직접 입력: ${value || '없음'}`);
  }
  let avatar = null;
  let imageVersion = 0;
  let lastOpacity = 100;
  const scale = 2;
  const fontFamily = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  function linesFor(value, width) {
    const result = [];
    const segments = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', {granularity:'grapheme'}) : null;
    for (const paragraph of value.split('\n')) {
      let line = '';
      const chars = segments ? [...segments.segment(paragraph)].map(x => x.segment) : [...paragraph];
      for (const char of chars) {
        if (line && ctx.measureText(line + char).width > width) { result.push(line); line = ''; }
        line += char;
      }
      result.push(line);
    }
    return result;
  }
  const avatarMode = byId('avatar-mode');
  let randomAvatar;
  function createRandomAvatar() {
    const seed = crypto.getRandomValues(new Uint32Array(18));
    const tile = document.createElement('canvas'); tile.width = tile.height = 128;
    const g = tile.getContext('2d');
    const hue = seed[0] % 360;
    g.fillStyle = `hsl(${hue} 40% 88%)`; g.fillRect(0, 0, 128, 128);
    g.fillStyle = `hsl(${hue} 65% 38%)`;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
      if (seed[1 + y * 3 + x] % 2) {
        g.fillRect(14 + x * 20, 14 + y * 20, 20, 20);
        g.fillRect(14 + (4 - x) * 20, 14 + y * 20, 20, 20);
      }
    }
    return tile;
  }
  randomAvatar = createRandomAvatar();
  function drawAvatar(square) {
    const mode = avatarMode.value;
    const source = mode === 'random' ? randomAvatar : avatar || randomAvatar;
    ctx.save(); ctx.beginPath();
    if (square) ctx.rect(20, 20, 56, 56);
    else ctx.arc(48, 48, 28, 0, Math.PI * 2);
    ctx.clip();
    if (mode === 'default' || (mode === 'original' && !avatar)) {
      ctx.fillStyle = '#687b8b'; ctx.fillRect(20, 20, 56, 56);
      ctx.fillStyle = '#e7edf1'; ctx.beginPath(); ctx.arc(48, 42, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(48, 69, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mode === 'mosaic') {
      const tile = document.createElement('canvas'); tile.width = tile.height = 6;
      tile.getContext('2d').drawImage(source, 0, 0, 6, 6);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(tile, 20, 20, 56, 56);
    } else if (mode === 'blur') {
      ctx.filter = 'blur(7px)'; ctx.drawImage(source, 10, 10, 76, 76);
    } else ctx.drawImage(source, 20, 20, 56, 56);
    ctx.restore();
  }
  function render() {
    syncDateSlider();
    for (const name of ['likes', 'replies']) {
      byId(`editor-${name}-slider`).value = String(Math.max(0, Math.min(99999, Math.floor(Number(byId(`editor-${name}`).value) || 0))));
    }
    byId('editor-export').hidden = true;
    const platform = document.querySelector('[name="editor-platform"]:checked').value;
    const width = Number(byId('editor-width').value);
    const size = Number(byId('editor-font').value);
    const dark = document.querySelector('[name="editor-theme"]:checked').value === 'dark';
    const alpha = Number(opacity.value) / 100;
    const ink = dark ? '#f1f1f1' : '#0f0f0f', muted = dark ? '#aaa' : '#606060';
    ctx.font = `${size}px ${fontFamily}`;
    const lines = linesFor(text.value || '댓글 내용을 입력하세요.', width - 126);
    const lineHeight = Math.ceil(size * 1.45);
    const height = 100 + lines.length * lineHeight;
    canvas.width = width * scale; canvas.height = height * scale;
    canvas.style.aspectRatio = `${width} / ${height}`;
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = dark ? `rgba(15,15,15,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, width, height);
    drawAvatar(platform === 'dc');
    ctx.textBaseline = 'top';ctx.font = `18px ${fontFamily}`;ctx.fillStyle = muted;
    const handle = byId('editor-handle').value.trim().replace(/^@+/, '') || 'viewer';
    const meta = `${platform === 'youtube' ? '@' : ''}${handle}  ·  ${byId('editor-date').value.trim()}`;
    ctx.fillText(meta, 98, 20, width - 124);
    ctx.font = `${size}px ${fontFamily}`; ctx.fillStyle = ink;
    lines.forEach((line, i) => ctx.fillText(line, 98, 51 + i * lineHeight));
    const y = 63 + lines.length * lineHeight;
    const replies = Number(byId('editor-replies-slider').value);
    const likes = String(Math.max(0, Math.min(99999, Math.floor(Number(byId('editor-likes').value) || 0))));
    if (platform === 'instagram') {
      ctx.font = `bold 16px ${fontFamily}`; ctx.fillStyle = muted;
      ctx.fillText(`좋아요 ${likes}개    답글 달기    답글 ${replies}개 보기`, 98, y + 8, width - 145);
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.save(); ctx.translate(width - 43, 26);
      ctx.stroke(new Path2D('M12 21C10 19 1 13 1 7C1 0 9 -1 12 5C15 -1 23 0 23 7C23 13 14 19 12 21Z')); ctx.restore();
    } else if (platform === 'dc') {
      ctx.strokeStyle = dark ? '#414654' : '#d5d9e2'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(width - 20, y); ctx.stroke();
      ctx.font = `17px ${fontFamily}`; ctx.fillStyle = dark ? '#a8bfff' : '#3b4890';
      ctx.fillText(`답글 ${replies}    추천 ${likes}    비추천 0`, 98, y + 12);
    } else {
    ctx.fillStyle = dark ? `rgba(39,39,39,${alpha})` : `rgba(242,242,242,${alpha})`;
    ctx.beginPath();ctx.roundRect(98,y,69,35,18);ctx.fill();
    ctx.font = `17px ${fontFamily}`;ctx.fillStyle = ink;
    ctx.save();
    ctx.textAlign = 'center';ctx.textBaseline = 'alphabetic';
    const replyMetrics = ctx.measureText('답글');
    ctx.fillText('답글',98+69/2,y+35/2+(replyMetrics.actualBoundingBoxAscent-replyMetrics.actualBoundingBoxDescent)/2);
    ctx.restore();
    ctx.fillStyle = muted;ctx.fillText(`답글 ${replies}개`,192,y+7);
    ctx.strokeStyle = muted;ctx.lineWidth = 1.8;ctx.lineCap = 'round';ctx.lineJoin = 'round';
    const thumb = new Path2D('M2 10H6V22H2Z M6 10L11 3Q14 1 14 5L13 10H21Q24 10 23 13L20 21Q19 22 17 22H6');
    ctx.save();ctx.translate(326,y+4);ctx.stroke(thumb);ctx.restore();
    ctx.fillText(likes,358,y+7);
    const dislikeX = 358 + ctx.measureText(likes).width + 48;
    ctx.save();ctx.translate(dislikeX,y+29);ctx.rotate(Math.PI);ctx.stroke(thumb);ctx.restore();
    ctx.save();ctx.translate(dislikeX+30,y+6);ctx.stroke(new Path2D('M12 21C10 19 1 13 1 7C1 0 9 -1 12 5C15 -1 23 0 23 7C23 13 14 19 12 21Z'));ctx.restore();
    ctx.fillStyle = muted;for (let i=0;i<3;i++){ctx.beginPath();ctx.arc(width-27,y+9+i*7,1.6,0,Math.PI*2);ctx.fill();}
    }
    byId('opacity-value').textContent = `${opacity.value}%`;
    transparent.checked = Number(opacity.value) === 0;
    byId('editor-download').disabled = !text.value.trim();
  }
  document.querySelectorAll('.editor-controls input:not([type="file"]), .editor-controls textarea, .editor-controls select').forEach(el => {
    if (el !== transparent && el !== dateSlider && !/^editor-(likes|replies)(-slider)?$/.test(el.id)) el.addEventListener('input',render);
  });
  for (const name of ['likes', 'replies']) {
    const input = byId(`editor-${name}`), slider = byId(`editor-${name}-slider`);
    input.addEventListener('input', () => {
      if (input.value !== '') input.value = String(Math.max(0, Math.min(99999, Math.floor(Number(input.value) || 0))));
      render();
    });
    input.addEventListener('change', () => { if (!input.value) input.value = '0'; render(); });
    slider.addEventListener('input', () => { input.value = slider.value; render(); });
  }
  dateSlider.addEventListener('input', () => {
    dateInput.value = dateSteps[Number(dateSlider.value)];
    render();
  });
  transparent.addEventListener('change', () => {
    if (transparent.checked) { lastOpacity = Number(opacity.value) || 100; opacity.value = '0'; }
    else opacity.value = String(lastOpacity);
    render();
  });
  byId('random-handle').addEventListener('click', () => {
    const words = ['blue','daily','happy','mint','cloud','sunny','mellow','hello'];
    const random = crypto.getRandomValues(new Uint32Array(3));
    byId('editor-handle').value = `@${words[random[0] % words.length]}_${words[random[1] % words.length]}${1000 + random[2] % 9000}`;
    render();
  });
  byId('random-avatar').addEventListener('click', () => {imageVersion++;randomAvatar=createRandomAvatar();avatarMode.value='random';render();});
  avatarMode.addEventListener('change', () => {imageVersion++;render();});
  byId('editor-avatar').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    const version = ++imageVersion;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();img.src=url;await img.decode();
      const crop = document.createElement('canvas');crop.width=crop.height=128;
      const side=Math.min(img.naturalWidth,img.naturalHeight);
      crop.getContext('2d').drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,128,128);
      if(version===imageVersion){avatar=crop;avatarMode.value='original';render();status.textContent='선택한 프로필 사진을 적용했습니다.';}
    } catch {status.textContent='이미지를 읽을 수 없습니다. 다른 이미지 파일을 선택해주세요.';}
    finally {URL.revokeObjectURL(url);}
  });
  byId('editor-download').addEventListener('click', () => {
    if (!text.value.trim()) return;
    render();
    try {
      const a=document.createElement('a');
      a.href=canvas.toDataURL('image/png');
      byId('editor-export-image').src=a.href;byId('editor-export').hidden=false;
      a.download=`댓글-${document.querySelector('[name="editor-platform"]:checked').value}-${Number(opacity.value)===0?'투명':document.querySelector('[name="editor-theme"]:checked').value}.png`;
      document.body.append(a);a.click();a.remove();
      status.textContent=`PNG 다운로드 요청 · ${canvas.width} × ${canvas.height}px · 배경 불투명도 ${opacity.value}%`;
    } catch {status.textContent='이미지 저장에 실패했습니다. 프로필 사진을 다시 선택한 후 시도해주세요.';}
  });
  async function importComment(data) {
    text.value = String(data.text || '').slice(0, 4000);
    byId('editor-handle').value = String(data.author || '').slice(0, 60);
    byId('editor-date').value = String(data.date || '').slice(0, 30);
    byId('editor-replies').value = String(Math.max(0, Math.min(99999, Number(data.replies) || 0)));
    byId('editor-likes').value = String(Math.max(0, Math.min(99999, Number(data.likes) || 0)));
    const version = ++imageVersion;
    avatar = null;
    render();
    status.textContent = '댓글을 불러왔습니다. 수정 후 편집용 PNG로 저장할 수 있습니다.';
    if (!/^assets\/youtube\/[A-Za-z0-9_-]+-original\.png$/.test(data.avatarSource || '')) return;
    try {
      const img = new Image(); img.src = data.avatarSource; await img.decode();
      const crop = document.createElement('canvas'); crop.width = crop.height = 80;
      crop.getContext('2d').drawImage(img, 8, 10, 40, 40, 0, 0, 80, 80);
      if (version === imageVersion) { avatar = crop; avatarMode.value = 'original'; render(); }
    } catch { status.textContent = '댓글을 불러왔습니다. 프로필 사진은 직접 선택해주세요.'; }
  }
  render();
  if (location.hash.startsWith('#comment=')) {
    try { importComment(JSON.parse(decodeURIComponent(location.hash.slice(9)))); }
    catch { status.textContent = '댓글 정보를 읽을 수 없습니다. 내용을 직접 입력해주세요.'; }
  }
})();
