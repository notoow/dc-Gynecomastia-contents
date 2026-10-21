'use strict';
const search = document.getElementById('comment-search');
const category = document.getElementById('category');
const cards = [...document.querySelectorAll('.youtube-card')];
function filterComments() {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const card of cards) {
    card.hidden = !(card.textContent.toLocaleLowerCase().includes(query) && (!category.value || card.dataset.category === category.value));
    if (!card.hidden) count++;
  }
  document.getElementById('result-count').textContent = `${count}개 질문`;
  document.getElementById('empty').hidden = count !== 0;
}
search.addEventListener('input', filterComments);
category.addEventListener('change', filterComments);
