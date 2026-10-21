'use strict';
// Shared by the browser and the build-time PDF checks.
globalThis.HighstPrint = async function(source, indices) {
  if (!indices.length) throw new Error('인쇄할 댓글을 선택해주세요.');
  const output = await PDFLib.PDFDocument.create();
  const pieces = await output.embedPdf(source, indices);
  const W = 595.28, H = 841.89, margin = 40, gap = 18;
  let page, y = 0;
  for (const piece of pieces) {
    const scale = Math.min((W-2*margin)/piece.width, (H-2*margin)/piece.height, 1);
    const h = piece.height*scale, w = piece.width*scale;
    if (!page || y-h < margin) { page = output.addPage([W,H]); y = H-margin; }
    page.drawPage(piece,{x:margin,y:y-h,width:w,height:h});
    y -= h+gap;
  }
  output.setTitle('YouTube Q&A - selected comments');
  return output.save();
};
