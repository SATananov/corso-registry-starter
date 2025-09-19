import { bootstrap, requireAuth } from './app.js';
import { supabase, upsertMyProfile } from './api.js';

bootstrap();

const form = document.getElementById('form');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  const fd = new FormData(form);
  const display_name = (fd.get('display_name')||'').toString().trim();
  const username = (fd.get('username')||'').toString().trim() || null;
  const email = (fd.get('email')||'').toString().trim();
  const password = (fd.get('password')||'').toString();

  try{
    msg.textContent = 'Създавам…';
    const { data, error } = await supabase.auth.signUp({ email, password });
    if(error) throw error;

    // профил (RLS: insert only self)
    await upsertMyProfile({ display_name, username });

    msg.textContent = 'Акаунтът е създаден. Влез с email и парола.';
    location.href = 'login.html';
  }catch(err){
    msg.textContent = err?.message || 'Грешка при регистрация.';
  }
});
