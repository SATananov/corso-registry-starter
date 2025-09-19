import { initClient, getSession, logout } from './api.js';
import { initNavbar } from './ui.js';

export function bootstrap(){
  initClient();
  initNavbar();

  // тема
  const btn = document.getElementById('themeBtn');
  if(btn){
    btn.onclick = ()=>{
      const cur=document.documentElement.getAttribute('data-theme')||'dark';
      document.documentElement.setAttribute('data-theme', cur==='dark'?'light':'dark');
    };
  }
  document.getElementById('burgerBtn')?.addEventListener('click', ()=> document.body.classList.toggle('menu-open'));
}

export async function requireAuth(redirectTo='login.html'){
  const { user } = await getSession();
  if(!user) location.href = redirectTo;
}

export async function requireAdmin(redirectTo='login.html'){
  const { user, role } = await getSession();
  if(!user || role!=='admin') location.href = redirectTo;
}

// удобно за бутон "Изход", ако не сме в navbar
export async function doLogout(){
  await logout(); location.href='login.html';
}
