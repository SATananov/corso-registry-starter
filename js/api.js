// js/api.js — Supabase клиент + helpers за auth
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⇩ ПОСТАВИ ТВОИТЕ ДАННИ
const SUPABASE_URL = 'https://wwdshtnrduxauwxtgadl.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// ===== Helpers =====
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return { session: data.session, user: data.session?.user ?? null };
}
export async function logout() {
  await supabase.auth.signOut();
}

// Регистрация: записва username/display_name като user metadata,
// после (ако има активна сесия) upsert-ва ред в public.profiles
export async function register({ display_name, username, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { username, display_name } }
  });
  if (error) throw error;

  const user = data.user;
  if (user) {
    // ако email confirmations са OFF, ще има сесия веднага
    const { error: e2 } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, email, username, display_name, role: 'user' },
        { onConflict: 'id' }
      );
    if (e2) console.warn('profiles upsert warning:', e2.message);
  }
  return user;
}

// Вход по username (намираме email от profiles, после signInWithPassword)
export async function loginWithUsername(username, password) {
  const uname = String(username || '').trim();
  const { data: prof, error: e1 } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', uname) // гъвкаво (без значение от регистъра)
    .maybeSingle();

  if (e1) throw e1;
  if (!prof) throw new Error('Потребител не е намерен.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: prof.email, password
  });
  if (error) throw error;
  return data.user;
}
