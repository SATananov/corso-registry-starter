// js/app.js — навигация + guards
import { supabase, logout, getMyProfile } from './api.js';

export async function refreshTopbar() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;

  document.querySelectorAll('[data-if-anon]').forEach(el => el.style.display = user ? 'none' : '');
  document.querySelectorAll('[data-if-authed]').forEach(el => el.style.display = user ? '' : 'none');

  let role = null;
  if (user) {
    const prof = await getMyProfile();
    role = prof?.role || null;
  }
  document.querySelectorAll('[data-if-admin]').forEach(el => el.style.display = role === 'admin' ? '' : 'none');

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.onclick = async (e) => { e.preventDefault(); await logout(); location.href = 'index.html'; };
  });
}

export function bootstrap(){ refreshTopbar(); }

export async function requireAuth(redirect='login.html'){
  const { data } = await supabase.auth.getSession();
  if(!data.session?.user){ location.href = redirect; throw new Error('Not authenticated'); }
}

export async function requireAdmin(redirect='index.html'){
  await requireAuth('login.html');
  const prof = await getMyProfile();
  if (prof?.role !== 'admin'){ location.href = redirect; throw new Error('Not admin'); }
}
