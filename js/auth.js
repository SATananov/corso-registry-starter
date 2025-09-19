// js/auth.js — логика за login/register страници
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
      const t = err?.message || '';
      msg.textContent = /invalid|email|password/i.test(t)
        ? 'Грешно потребителско име или парола.'
        : (t || 'Неуспешен вход.');
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
      // ако email confirmations са OFF, user ще е наличен веднага
      msg.textContent = user ? 'Готово! Влез с потребителско име и парола.' : 'Провери email за потвърждение.';
      setTimeout(() => location.href = 'login.html', 900);
    } catch (err) {
      const txt = err?.message || '';
      if (/duplicate|unique/i.test(txt)) msg.textContent = 'Това потребителско име или email вече е заето.';
      else if (/row-level security/i.test(txt)) msg.textContent = 'Нужни са RLS политики за profiles (виж SQL).';
      else msg.textContent = 'Грешка при регистрация.';
    }
  });
}
