import { bootstrap, requireAuth } from './app.js';
import { listPhotos, uploadPhoto, deletePhoto, publicUrl } from './api.js';

bootstrap();
await requireAuth('login.html');

const params = new URLSearchParams(location.search);
const listingId = params.get('id');
if(!listingId){ alert('Липсва id на запис.'); location.href='my.html'; throw new Error('missing id'); }

const grid = document.getElementById('grid');
const msg = document.getElementById('msg');
const files = document.getElementById('files');
const uploadBtn = document.getElementById('upload');

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

async function load(){
  grid.textContent = 'Зареждам…';
  try{
    const rows = await listPhotos(listingId);
    if(!rows.length){ grid.innerHTML = '<div class="muted">Няма качени снимки.</div>'; return; }
    grid.innerHTML = rows.map(r=>`
      <div class="ph" data-id="${r.id}" data-path="${esc(r.path)}">
        <img src="${esc(publicUrl(r.path))}" alt="">
        <div class="row">
          <span class="muted" style="font-size:12px">${new Date(r.created_at).toLocaleString()}</span>
          <button class="pill delete">Изтрий</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.pill.delete').forEach(btn=>{
      btn.onclick = async (e)=>{
        const box = e.target.closest('.ph');
        const id = Number(box.dataset.id);
        const path = box.dataset.path;
        if(!confirm('Да изтрия снимката?')) return;
        try { await deletePhoto(id, path); box.remove(); }
        catch(err){ alert('Грешка: ' + (err?.message || err)); }
      };
    });

  }catch(e){
    grid.innerHTML = `<div class="muted">Грешка: ${esc(e?.message || e)}</div>`;
  }
}

uploadBtn.addEventListener('click', async ()=>{
  const list = Array.from(files.files || []);
  if(!list.length){ msg.textContent = 'Избери снимки.'; return; }
  msg.textContent = 'Качвам…';
  try{
    for (const f of list){ await uploadPhoto(listingId, f); }
    msg.textContent = `Качени: ${list.length} ✓`;
    files.value = '';
    await load();
  }catch(err){
    msg.textContent = 'Грешка: ' + (err?.message || err);
  }
});

load();
