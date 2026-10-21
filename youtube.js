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

const printChecks = [...document.querySelectorAll('.print-check')];
const printButton = document.getElementById('print-download');
const printStatus = document.getElementById('print-status');
const printSave = document.getElementById('print-save');
let printUrl = null, printing = false;
function updatePrintSelection() {
  const count = printChecks.filter(input => input.checked).length;
  document.getElementById('print-count').textContent = `${count}개 선택`;
  printButton.disabled = printing || count === 0;
  for (const input of printChecks) input.closest('article').classList.toggle('print-selected',input.checked);
  printSave.hidden = true;
}
printChecks.forEach(input => input.addEventListener('change',updatePrintSelection));
document.getElementById('print-select-visible').addEventListener('click', () => {
  cards.filter(card => !card.hidden).forEach(card => {card.querySelector('.print-check').checked=true;});
  updatePrintSelection();
});
document.getElementById('print-clear').addEventListener('click', () => {
  printChecks.forEach(input => {input.checked=false;});updatePrintSelection();
});
document.getElementById('print-mode').addEventListener('change', () => {printSave.hidden=true;});
printButton.addEventListener('click',async () => {
  const selected = cards.filter(card => card.querySelector('.print-check').checked);
  if (!selected.length || printing) return;
  printing=true;printButton.disabled=true;printSave.hidden=true;
  printStatus.textContent=`${selected.length}개 댓글을 A4 PDF로 병합 중…`;
  try {
    const mode=document.getElementById('print-mode').value;
    const response=await fetch(`assets/youtube/print/${mode}-source.pdf`);
    if (!response.ok) throw new Error('인쇄용 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    const bytes=await HighstPrint(await response.arrayBuffer(),selected.map(card=>Number(card.dataset.printIndex)));
    if (printUrl) URL.revokeObjectURL(printUrl);
    printUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    printSave.href=printUrl;printSave.download=`유튜브-댓글-${selected.length}개-A4.pdf`;
    printSave.hidden=false;printSave.click();
    printStatus.textContent=`${selected.length}개 댓글 병합 완료. PDF를 열어 A4 · 실제 크기(100%)로 인쇄하세요.`;
  } catch(error) {
    printStatus.textContent=`PDF 생성 실패: ${error.message}`;
  } finally {
    printing=false;printButton.disabled=!printChecks.some(input=>input.checked);
  }
});

// Carry the selected comment to the standalone editor, including on file://.
document.querySelectorAll('[data-edit-comment]').forEach(button => {
  button.addEventListener('click', () => {
    const data = {...button.dataset, text: button.closest('article').querySelector('blockquote').textContent};
    location.href = `comment-editor.html#comment=${encodeURIComponent(JSON.stringify(data))}`;
  });
});
