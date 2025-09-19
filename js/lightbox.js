let box, img, btnPrev, btnNext, btnClose;
let cur = { list: [], i: 0 };

function ensure(){
  if(box) return;
  box = document.createElement('div');
  box.className = 'lb-backdrop';
  box.innerHTML = `
    <img class="lb-img" alt="">
    <button class="lb-btn lb-prev">◀</button>
    <button class="lb-btn lb-next">▶</button>
    <button class="lb-btn lb-close" style="top:16px; right:16px">✕</button>
  `;
  document.body.appendChild(box);
  img = box.querySelector('.lb-img');
  btnPrev = box.querySelector('.lb-prev');
  btnNext = box.querySelector('.lb-next');
  btnClose = box.querySelector('.lb-close');

  function show(i){
    const n = cur.list.length; if(n===0) return;
    cur.i = ((i % n) + n) % n; img.src = cur.list[cur.i];
    const one = n<2; btnPrev.style.display = one?'none':''; btnNext.style.display = one?'none':'';
  }
  btnPrev.onclick = ()=> show(cur.i - 1);
  btnNext.onclick = ()=> show(cur.i + 1);
  btnClose.onclick = closeLightbox;
  box.addEventListener('click', (e)=>{ if(e.target===box) closeLightbox(); });
  document.addEventListener('keydown', (e)=>{ if(!box.classList.contains('show')) return; if(e.key==='Escape') closeLightbox(); if(e.key==='ArrowLeft') btnPrev.click(); if(e.key==='ArrowRight') btnNext.click(); });
  box.showIndex = show;
}

export function openLightbox(urls, start=0){
  ensure();
  cur.list = (urls||[]).filter(Boolean);
  if(cur.list.length===0) return;
  box.classList.add('show');
  box.style.display='flex';
  box.showIndex(start);
}
export function closeLightbox(){
  if(!box) return; box.classList.remove('show'); box.style.display='none'; img.src='';
}
