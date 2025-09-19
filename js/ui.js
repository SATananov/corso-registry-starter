import { getSession, logout } from './api.js';

export async function initNavbar(){
  const host = document.getElementById('navbar');
  if(!host) return;
  const { user, role, profile } = await getSession();

  host.innerHTML = !user ? `
    <a class="btn link" href="login.html">Вход</a>
    <a class="btn primary" href="register.html">Регистрация</a>
  ` : `
    <span class="muted">👤 ${profile?.display_name || profile?.username || 'Потребител'}</span>
    ${role==='admin' ? `<a class="btn link" href="admin.html">Админ</a>`:''}
    <a class="btn link" href="profile.html">Профил</a>
    <button class="btn link" id="logoutBtn">Изход</button>
  `;

  document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{
    await logout(); location.href='login.html';
  });
}
