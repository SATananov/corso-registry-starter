import { requireAdmin, bootstrap } from './app.js';
import { fetchPendingListings, fetchAllListings, setListingStatus, supabase } from './api.js';

bootstrap();
await requireAdmin('index.html');

const elPending = document.getElementById('pending');
const elAll = document.getElementById('all');

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

async function ownerName(owner_id){
  const { data } = await supabase.from('profiles').select('username,display_name').eq('id', owner_id).maybeSingle();
  return data?.display_name || data?.username || owner_id.slice(0,8)+'…';
}

async function renderPending(){
  const rows = await fetchPendingListings();
  if (!rows.length){ elPending.innerHTML = '<div class="muted">Няма чакащи към момента.</div>'; return; }

  // обогати с owner
  for (const r of rows){ r.owner_label = await ownerName(r.owner_id); }

  elPending.innerHTML = `
    <table class="table">
      <thead>
        <tr><th>Заглавие</th><th>Собственик</th><th>Създаден</th><th>Действия</th></tr>
      </thead>
      <tbody>
        ${rows.map(r=>`
          <tr data-id="${r.id}">
            <td><strong>${esc(r.title)}</strong><br><span class="muted">${esc(r.description || '')}</span></td>
            <td>${esc(r.owner_label)}</td>
            <td class="muted">${new Date(r.created_at).toLocaleString()}</td>
            <td>
              <button class="pill approve" data-approve>Одобри</button>
              <button class="pill reject" data-reject>Отхвърли</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  elPending.querySelectorAll('[data-approve]').forEach(btn=>{
    btn.onclick = async (e)=>{
      const id = e.target.closest('tr')?.dataset.id;
      await setListingStatus(id,'approved');
      await refresh();
    };
  });
  elPending.querySelectorAll('[data-reject]').forEach(btn=>{
    btn.onclick = async (e)=>{
      const id = e.target.closest('tr')?.dataset.id;
      await setListingStatus(id,'rejected');
      await refresh();
    };
  });
}

async function renderAll(){
  const rows = await fetchAllListings(50);
  for (const r of rows){ r.owner_label = await ownerName(r.owner_id); }
  if (!rows.length){ elAll.innerHTML = '<div class="muted">Няма записи.</div>'; return; }
  elAll.innerHTML = `
    <table class="table">
      <thead>
        <tr><th>Заглавие</th><th>Собственик</th><th>Статус</th><th>Създаден</th></tr>
      </thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td><strong>${esc(r.title)}</strong></td>
            <td>${esc(r.owner_label)}</td>
            <td><span class="badge">${esc(r.status)}</span></td>
            <td class="muted">${new Date(r.created_at).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function refresh(){ await Promise.all([renderPending(), renderAll()]); }
await refresh();
