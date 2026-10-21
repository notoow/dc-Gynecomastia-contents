'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const canvas = byId('editor-canvas');
  const ctx = canvas.getContext('2d');
  const text = byId('editor-text');
  const opacity = byId('editor-opacity');
  const transparent = byId('editor-transparent');
  const status = byId('editor-status');
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
  function render() {
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
    ctx.save(); ctx.beginPath(); ctx.arc(48, 48, 28, 0, Math.PI * 2); ctx.clip();
    if (avatar) ctx.drawImage(avatar, 20, 20, 56, 56);
    else {
      ctx.fillStyle = '#687b8b'; ctx.fillRect(20,20,56,56);
      ctx.fillStyle = '#e7edf1'; ctx.beginPath(); ctx.arc(48,42,10,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(48,69,20,15,0,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.textBaseline = 'top';ctx.font = `18px ${fontFamily}`;ctx.fillStyle = muted;
    const handle = byId('editor-handle').value.trim().replace(/^@+/, '') || 'viewer';
    const meta = `@${handle}  ·  ${byId('editor-date').value.trim()}`;
    ctx.fillText(meta, 98, 20, width - 124);
    ctx.font = `${size}px ${fontFamily}`; ctx.fillStyle = ink;
    lines.forEach((line, i) => ctx.fillText(line, 98, 51 + i * lineHeight));
    const y = 63 + lines.length * lineHeight;
    ctx.fillStyle = dark ? `rgba(39,39,39,${alpha})` : `rgba(242,242,242,${alpha})`;
    ctx.beginPath();ctx.roundRect(98,y,69,35,18);ctx.fill();
    ctx.font = `17px ${fontFamily}`;ctx.fillStyle = ink;ctx.fillText('답글',115,y+7);
    const replies = Math.max(0, Math.min(99999, Number(byId('editor-replies').value) || 0));
    ctx.fillStyle = muted;ctx.fillText(`답글 ${replies}개`,192,y+7);
    ctx.strokeStyle = muted;ctx.lineWidth = 1.8;ctx.lineCap = 'round';ctx.lineJoin = 'round';
    const thumb = new Path2D('M2 10H6V22H2Z M6 10L11 3Q14 1 14 5L13 10H21Q24 10 23 13L20 21Q19 22 17 22H6');
    ctx.save();ctx.translate(326,y+4);ctx.stroke(thumb);ctx.restore();
    ctx.save();ctx.translate(407,y+29);ctx.rotate(Math.PI);ctx.stroke(thumb);ctx.restore();
    ctx.save();ctx.translate(451,y+6);ctx.stroke(new Path2D('M12 21C10 19 1 13 1 7C1 0 9 -1 12 5C15 -1 23 0 23 7C23 13 14 19 12 21Z'));ctx.restore();
    ctx.fillStyle = muted;for (let i=0;i<3;i++){ctx.beginPath();ctx.arc(width-27,y+9+i*7,1.6,0,Math.PI*2);ctx.fill();}
    byId('opacity-value').textContent = `${opacity.value}%`;
    transparent.checked = Number(opacity.value) === 0;
    byId('editor-download').disabled = !text.value.trim();
  }
  document.querySelectorAll('.editor-controls input:not([type="file"]), .editor-controls textarea, .editor-controls select').forEach(el => {
    if (el !== transparent) el.addEventListener('input',render);
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
  byId('reset-avatar').addEventListener('click', () => {imageVersion++;avatar=null;byId('editor-avatar').value='';render();});
  byId('editor-avatar').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    const version = ++imageVersion;
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();img.src=url;await img.decode();
      const crop = document.createElement('canvas');crop.width=crop.height=128;
      const side=Math.min(img.naturalWidth,img.naturalHeight);
      crop.getContext('2d').drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,128,128);
      if(version===imageVersion){avatar=crop;render();status.textContent='선택한 프로필 사진을 적용했습니다.';}
    } catch {status.textContent='이미지를 읽을 수 없습니다. 다른 이미지 파일을 선택해주세요.';}
    finally {URL.revokeObjectURL(url);}
  });
  byId('editor-download').addEventListener('click', () => {
    if (!text.value.trim()) return;
    render();
    canvas.toBlob(blob => {
      if (!blob) {status.textContent='이미지 저장에 실패했습니다. 다시 시도해주세요.';return;}
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`댓글-편집용-${Number(opacity.value)===0?'투명':document.querySelector('[name="editor-theme"]:checked').value}.png`;
      a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
      status.textContent=`PNG 저장 완료 · ${canvas.width} × ${canvas.height}px · 배경 불투명도 ${opacity.value}%`;
    },'image/png');
  });
  document.querySelectorAll('[data-edit-comment]').forEach(button => button.addEventListener('click', async () => {
    const card=button.closest('article');
    text.value=card.querySelector('blockquote').textContent;
    byId('editor-handle').value=button.dataset.author;
    byId('editor-date').value=button.dataset.date;
    byId('editor-replies').value=button.dataset.replies;
    const version=++imageVersion;avatar=null;render();
    try {
      const img=new Image();img.src=button.dataset.avatarSource;await img.decode();
      const crop=document.createElement('canvas');crop.width=crop.height=80;
      crop.getContext('2d').drawImage(img,8,10,40,40,0,0,80,80);
      if(version===imageVersion){avatar=crop;render();}
    } catch {status.textContent='원본 프로필을 불러오지 못했습니다. 프로필 사진을 직접 선택할 수 있습니다.';}
    byId('editor-title').scrollIntoView({behavior:'smooth',block:'start'});
    status.textContent='원문과 실제 캡처의 프로필을 불러왔습니다. 수정 후 편집용 PNG로 저장할 수 있습니다.';
  }));
  render();
})();
