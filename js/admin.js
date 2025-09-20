import { requireAdmin, bootstrap } from './app.js';
import { fetchPendingDogs, fetchAllDogs, setDogStatus, supabase } from './api.js';

bootstrap();
await requireAdmin('index.html');

const elPending=document.getElementById('pending');
const elAll=document.getElementById('all');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&#39;'}[m]));
const sexL=s=>s==='male'?'♂ мъжко':'♀ женско';

async function renderPending(){
  const rows=await fetchPendingDogs();
  if(!rows.length){ elPending.innerHTML='<div class="muted">Няма чакащи.</div>'; return; }
  elPending.innerHTML=`
    <table class="table">
      <thead><tr><th>Име</th><th>Детайли</th><th>Създаден</th><th>Действия</th></tr></thead>
      <tbody>
        ${rows.map(r=>`
          <tr data-id="${r.id}">
            <td><strong>${esc(r.name)}</strong> · ${sexL(r.sex)}</td>
            <td class="muted">DOB: ${esc(r.date_of_birth||'—')} · Цвят: ${esc(r.color||'—')}</td>
            <td class="muted">${new Date(r.created_at).toLocaleString()}</td>
            <td>
              <button class="pill approve" data-approve>Одобри</button>
              <button class="pill reject" data-reject>Отхвърли</button>
              <button class="pill delete" data-delete>Изтрий</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  elPending.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async e=>{
    const id=e.target.closest('tr').dataset.id; await setDogStatus(id,'approved'); refresh();
  });
  elPending.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async e=>{
    const id=e.target.closest('tr').dataset.id; await setDogStatus(id,'rejected'); refresh();
  });
  elPending.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async e=>{
    const id=e.target.closest('tr').dataset.id;
    if(!confirm('Да изтрия записа?')) return;
    await supabase.from('dogs').delete().eq('id', id); refresh();
  });
}
async function renderAll(){
  const rows=await fetchAllDogs(100);
  if(!rows.length){ elAll.innerHTML='<div class="muted">—</div>'; return; }
  elAll.innerHTML=`
    <table class="table">
      <thead><tr><th>Име</th><th>Статус</th><th>Създаден</th></tr></thead>
      <tbody>
        ${rows.map(r=>`
          <tr><td>${esc(r.name)}</td><td><span class="badge">${esc(r.status)}</span></td>
              <td class="muted">${new Date(r.created_at).toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>`;
}
async function refresh(){ await Promise.all([renderPending(), renderAll()]); }
refresh();
