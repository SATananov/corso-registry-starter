import { bootstrap, requireAuth } from './app.js';
import { createListing } from './api.js';

bootstrap();
await requireAuth('login.html');

const form = document.getElementById('form');
const msg = document.getElementById('msg');

function friendly(e){
  const t=(e?.message||'').toLowerCase();
  if (t.includes('row-level security')) return 'RLS политики за listings липсват.';
  if (t.includes('not authenticated')) return 'Трябва да си логнат.';
  return e?.message || 'Грешка.';
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(form);
  const title = String(fd.get('title')||'').trim();
  const description = String(fd.get('description')||'').trim();

  if (!title){ msg.textContent = 'Моля, въведи заглавие.'; return; }

  try{
    msg.textContent = 'Изпращам…';
    await createListing({ title, description });
    msg.textContent = 'Изпратено за одобрение! Ще се появи в каталога, след като админ го одобри.';
    form.reset();
  }catch(err){
    msg.textContent = friendly(err);
    console.error(err);
  }
});
