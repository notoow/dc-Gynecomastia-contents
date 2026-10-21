'use strict';
(() => {
  const dialog=document.getElementById('comment-popup');
  const picture=document.getElementById('popup-image');
  const title=document.getElementById('popup-title');
  const save=document.getElementById('popup-save');
  const source=document.getElementById('popup-source');
  let trigger;
  const video=document.getElementById('popup-video');
  document.querySelectorAll('.comment-preview').forEach(image => {
    const link=image.closest('a');
    link.addEventListener('click',event => {
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
      event.preventDefault();trigger=link;
      const card=link.closest('article');
      title.textContent=card.querySelector('h2').textContent;
      picture.src=image.src;picture.alt=image.alt;
      picture.hidden=false;video.hidden=true;video.removeAttribute('src');save.hidden=false;
      save.href=image.src;save.download=card.querySelector('.number').textContent+'-댓글-실제캡처.png';
      source.href=card.querySelector('.source-link').href;
      dialog.showModal();document.body.classList.add('popup-open');
    });
  });
  document.querySelectorAll('[data-video-popup]').forEach(button=>button.addEventListener('click',()=>{
    const url=new URL(button.dataset.videoPopup);
    const id=url.pathname.split('/').pop();
    if(!/^[\w-]{11}$/.test(id))return;
    trigger=button;title.textContent='댓글에 첨부된 영상';picture.hidden=true;save.hidden=true;
    video.src=`https://www.youtube-nocookie.com/embed/${id}`;video.hidden=false;
    source.href=url.href;dialog.showModal();document.body.classList.add('popup-open');
  }));
  document.getElementById('popup-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    const r=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();
  });
  dialog.addEventListener('close',()=>{video.removeAttribute('src');document.body.classList.remove('popup-open');trigger?.focus();});
})();
