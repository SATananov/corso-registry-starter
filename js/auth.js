// js/auth.js — логика за login/register страници (по-говорливи грешки)
import { bootstrap } from './app.js';
import { register, loginWithUsername, getSession } from './api.js';

bootstrap();

const form = document.getElementById('form');
const msg = document.getElementById('msg');
const mode = form?.dataset.mode; // "login" или "register"

(async () => {
  const { user } = await getSession();
  if (user && (mode === 'login' || mode === 'register')) {
    location.href = 'profile.html';
    return;
  }
  if (mode === 'login') initLogin();
  if (mode === 'register') initRegister();
})();

function friendly(e) {
  const t = (e?.message || '').toLowerCase();
  if (t.includes('already registered')) return 'Този email вече е регистриран.';
  if (t.includes('signups not allowed')) return 'Регистрациите са изключени в Supabase (Auth → Settings).';
  if (t.includes('password')) return 'Невалидна парола (мин. 6 символа).';
  if (t.includes('network') || t.includes('cors')) return 'Мрежова/CORS грешка – провери Site URL в Supabase и ключовете.';
  if (t.includes('row-level security')) return 'RLS политики за profiles липсват (пусни SQL-а).';
  if (t.includes('duplicate') || t.includes('unique')) return 'Потребителско име или email вече е заето.';
  return e?.message || 'Грешка при регистрация.';
}

function initLogin() {
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const username = String(fd.get('username') || '').trim();
    const password = String(fd.get('password') || '');
    if (!username || !password) {
      msg.textContent = 'Моля, попълнете потребителско име и парола.';
      return;
    }
    msg.textContent = 'Влизам…';
    try {
      await loginWithUsername(username, password);
      location.href = 'profile.html';
    } catch (err) {
      msg.textContent = friendly(err);
      console.error(err);
    }
  });
}

function initRegister() {
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      display_name: String(fd.get('display_name') || '').trim(),
      username: String(fd.get('username') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      password: String(fd.get('password') || '')
    };

    if (!payload.display_name || !payload.username || !payload.email || !payload.password) {
      msg.textContent = 'Моля, попълнете всички полета.';
      return;
    }
    if (payload.password.length < 6) {
      msg.textContent = 'Паролата трябва да е поне 6 символа.';
      return;
    }

    msg.textContent = 'Създавам акаунт…';
    try {
      const user = await register(payload);
      msg.textContent = user
        ? 'Готово! Влез с потребителско име и парола.'
        : 'Провери email за потвърждение.';
      setTimeout(() => (location.href = 'login.html'), 900);
    } catch (err) {
      msg.textContent = friendly(err);
      console.error(err);
    }
  });
}

