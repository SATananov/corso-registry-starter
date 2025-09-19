import { bootstrap, requireAuth } from './app.js';
import { fetchMyListings, updateMyListing, deleteMyListing } from './api.js';

bootstrap();
await requireAuth('login.html');

const wrap = document.getElementById('wrap');
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

async function load(){
  wrap.textContent = 'Зареждам…';
  try {
    const rows = await fetchMyListings();
    if (!rows.length){ wrap.innerHTML = '<div class="muted">Нямаш записи. Добави от „Нов запис“.</div>'; return; }
    wrap.innerHTML = `
      <table class="table">
        <thead><tr><th>Заглавие</th><th>Описание</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
          ${rows.map(r=>`
            <tr data-id="${r.id}">
              <td><input class="editable" name="title" value="${esc(r.title)}"></td>
              <td><textarea class="editable" name="description" rows="3">${esc(r.description || '')}</textarea></td>
              <td><span class="muted-small">${esc(r.status)}</span></td>
              <td class="actions">
                <button class="pill save">Запази</button>
                <a class="pill photos" href="photos.html?id=${r.id}">Снимки</a>
                <button class="pill delete">Изтрий</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll('.pill.save').forEach(btn=>{
      btn.onclick = async (e)=>{
        const tr = e.target.closest('tr');
        const id = tr.dataset.id;
        const title = tr.querySelector('input[name="title"]').value.trim();
        const description = tr.querySelector('textarea[name="description"]').value.trim();
        if(!title){ alert('Заглавието е задължително.'); return; }
        try { await updateMyListing(id, { title, description }); btn.textContent = 'Записано ✓'; setTimeout(()=>btn.textContent='Запази',800); }
        catch(err){ alert('Грешка: ' + (err?.message || err)); }
      };
    });

    wrap.querySelectorAll('.pill.delete').forEach(btn=>{
      btn.onclick = async (e)=>{
        const tr = e.target.closest('tr');
        const id = tr.dataset.id;
        if(!confirm('Сигурни ли сте? Това ще изтрие и снимките.')) return;
        try { await deleteMyListing(id); tr.remove(); }
        catch(err){ alert('Грешка: ' + (err?.message || err)); }
      };
    });

  } catch (e) {
    wrap.innerHTML = `<div class="muted">Грешка: ${esc(e?.message || e)}</div>`;
  }
}
load();
