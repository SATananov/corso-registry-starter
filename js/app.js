// js/app.js — малък bootstrap: визуално състояние на навигацията + guard
import { supabase, logout } from './api.js';

export async function refreshTopbar() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;

  // Навигация: ако има елементи с тези data-атрибути, ги показваме/скриваме
  const showIfAnon = document.querySelectorAll('[data-if-anon]');
  const showIfAuthed = document.querySelectorAll('[data-if-authed]');
  showIfAnon.forEach(el => el.style.display = user ? 'none' : '');
  showIfAuthed.forEach(el => el.style.display = user ? '' : 'none');

  // Пример за бутон изход
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      await logout();
      location.href = 'index.html';
    };
  });
}

export function bootstrap() {
  refreshTopbar();
}

export async function requireAuth(redirectUrl = 'login.html') {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    location.href = redirectUrl;
    throw new Error('Not authenticated');
  }
}
