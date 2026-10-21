'use strict';
(() => {
  const dialog=document.getElementById('comment-popup');
  const picture=document.getElementById('popup-image');
  const title=document.getElementById('popup-title');
  const save=document.getElementById('popup-save');
  const source=document.getElementById('popup-source');
  let trigger;
  document.querySelectorAll('.comment-preview').forEach(image => {
    const link=image.closest('a');
    link.addEventListener('click',event => {
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
      event.preventDefault();trigger=link;
      const card=link.closest('article');
      title.textContent=card.querySelector('h2').textContent;
      picture.src=image.src;picture.alt=image.alt;
      save.href=image.src;save.download=card.querySelector('.number').textContent+'-댓글-실제캡처.png';
      source.href=card.querySelector('.source-link').href;
      dialog.showModal();document.body.classList.add('popup-open');
    });
  });
  document.getElementById('popup-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    const r=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();
  });
  dialog.addEventListener('close',()=>{document.body.classList.remove('popup-open');trigger?.focus();});
})();
