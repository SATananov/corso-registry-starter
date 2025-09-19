import { bootstrap, requireAuth } from './app.js';
import { getMyProfile, upsertMyProfile } from './api.js';

bootstrap();
await requireAuth('login.html');

const form = document.getElementById('form');
const msg = document.getElementById('msg');

(async ()=>{
  const p = await getMyProfile();
  form.display_name.value = p?.display_name || '';
  form.username.value = p?.username || '';
})();

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const display_name = form.display_name.value.trim();
  const username = form.username.value.trim() || null;
  try{
    await upsertMyProfile({ display_name, username });
    msg.textContent = 'Записано ✓';
  }catch(err){
    msg.textContent = err?.message || 'Грешка.';
  }
});
