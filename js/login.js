import { bootstrap } from './app.js';
import { supabase } from './api.js';

bootstrap();

const form = document.getElementById('form');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  const fd = new FormData(form);
  const email = (fd.get('email')||'').toString().trim();
  const password = (fd.get('password')||'').toString();
  try{
    msg.textContent = 'Влизам…';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) throw error;
    location.href = 'my.html';
  }catch(err){
    msg.textContent = err?.message || 'Неуспешен вход.';
  }
});
