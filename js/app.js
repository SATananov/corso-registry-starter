// js/app.js
import { supabase, getSession, onAuthChanged, signOut, getMyProfile } from './api.js';

export function show(el, v){ if(!el) return; el.hidden = !v; }

export async function bootstrap(){
  // навигация: показвай/скривай според auth и admin роля
  async function paint(){
    const sess = await getSession();
    const authed = !!sess;
    const prof = authed ? await getMyProfile().catch(()=>null) : null;
    const isAdmin = prof?.role === 'admin';

    document.querySelectorAll('[data-if-anon]').forEach(el=> show(el, !authed));
    document.querySelectorAll('[data-if-authed]').forEach(el=> show(el, authed));
    document.querySelectorAll('[data-if-admin]').forEach(el=> show(el, isAdmin));

    const nameBadge = document.querySelector('[data-user-name]');
    if(nameBadge) nameBadge.textContent = prof?.display_name || prof?.username || '';
  }
  await paint();
  onAuthChanged(()=>paint());

  // logout
  document.querySelectorAll('[data-logout]').forEach(a=>{
    a.addEventListener('click', async (e)=>{
      e.preventDefault();
      await signOut();
      location.href = 'index.html';
    });
  });
}

export async function requireAuth(redirect='login.html'){
  const sess = await getSession();
  if(!sess){ location.href = redirect; throw new Error('auth required'); }
}

export async function requireAdmin(redirect='index.html'){
  await requireAuth();
  const prof = await getMyProfile();
  if(prof?.role !== 'admin'){ location.href = redirect; throw new Error('admin required'); }
}
