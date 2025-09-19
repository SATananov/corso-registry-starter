// js/app.js — визуално състояние на навигацията + guard
import { supabase, logout } from './api.js';

export async function refreshTopbar() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;

  document.querySelectorAll('[data-if-anon]').forEach(el => el.style.display = user ? 'none' : '');
  document.querySelectorAll('[data-if-authed]').forEach(el => el.style.display = user ? '' : 'none');

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.onclick = async (e) => { e.preventDefault(); await logout(); location.href = 'index.html'; };
  });
}
export function bootstrap(){ refreshTopbar(); }
export async function requireAuth(redirect='login.html'){
  const { data } = await supabase.auth.getSession();
  if(!data.session?.user){ location.href = redirect; throw new Error('Not authenticated'); }
}
