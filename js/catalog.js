import { bootstrap } from './app.js';
import { fetchApprovedListings, fetchProfilesMap } from './api.js';

bootstrap();

const qInput = document.getElementById('q');
const btn = document.getElementById('btn');
const list = document.getElementById('list');
const countEl = document.getElementById('count');

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function short(s,len=180){ const t=String(s||''); return t.length>len? t.slice(0,len-1)+'…' : t; }

async function load(q=''){
  list.textContent = 'Зареждам…';
  try{
    const { rows, count } = await fetchApprovedListings({ q, limit: 50, offset: 0 });
    countEl.textContent = `Намерени: ${count}`;

    if (!rows.length){ list.innerHTML = '<div class="muted">Няма резултати.</div>'; return; }

    // имена на собствениците
    const map = await fetchProfilesMap(rows.map(r=>r.owner_id));

    list.innerHTML = rows.map(r => `
      <article class="item">
        <h3><a href="details.html?id=${encodeURIComponent(r.id)}">${esc(r.title)}</a></h3>
        <span class="muted">${new Date(r.created_at).toLocaleString()} · от ${esc(map[r.owner_id] || '—')}</span>
        <p>${esc(short(r.description))}</p>
      </article>
    `).join('');
  }catch(e){
    list.innerHTML = `<div class="muted">Грешка: ${esc(e?.message||e)}</div>`;
  }
}

btn.addEventListener('click', ()=> load(qInput.value));
qInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') load(qInput.value); });

// първоначално зареждане
load('');
