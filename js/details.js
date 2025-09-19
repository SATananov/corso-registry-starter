import { bootstrap } from './app.js';
import { fetchListingApproved, listPhotos, publicUrl, fetchProfilesMap } from './api.js';

bootstrap();

const params = new URLSearchParams(location.search);
const id = params.get('id');
const head = document.getElementById('head');
const grid = document.getElementById('grid');

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

(async ()=>{
  if(!id){ head.textContent = 'Липсва id.'; return; }
  try{
    const row = await fetchListingApproved(id);
    if(!row){ head.innerHTML = '<div class="muted">Записът не е намерен или не е одобрен.</div>'; grid.textContent = '—'; return; }

    const owners = await fetchProfilesMap([row.owner_id]);
    head.innerHTML = `
      <h1>${esc(row.title)}</h1>
      <div class="muted">${new Date(row.created_at).toLocaleString()} · от ${esc(owners[row.owner_id] || '—')}</div>
      <p>${esc(row.description || '')}</p>
    `;

    const photos = await listPhotos(id); // RLS: връща само ако listing е approved
    if(!photos.length){ grid.innerHTML = '<div class="muted">Няма снимки.</div>'; return; }
    grid.innerHTML = photos.map(p=>`
      <div class="ph"><img src="${esc(publicUrl(p.path))}" alt=""></div>
    `).join('');
  }catch(e){
    head.innerHTML = `<div class="muted">Грешка: ${esc(e?.message || e)}</div>`;
  }
})();

