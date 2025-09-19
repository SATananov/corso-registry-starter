// js/api.js — Supabase клиент + helpers за auth/профил/листинги
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wwdshtnrduxauwxtgadl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHNodG5yZHV4YXV3eHRnYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ5NDUsImV4cCI6MjA3Mzc2MDk0NX0.R_ITamQoP4G6webhXg-q81iywl3nzmysRBDx6YwJKNw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// session helpers
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return { session: data.session, user: data.session?.user ?? null };
}
export async function logout() { await supabase.auth.signOut(); }

// auth flows
export async function register({ display_name, username, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { username, display_name } }
  });
  if (error) throw error;

  const user = data.user;
  if (user) {
    const { error: e2 } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email, username, display_name, role: 'user' }, { onConflict: 'id' });
    if (e2) console.warn('profiles upsert warning:', e2.message);
  }
  return user;
}

export async function loginWithUsername(username, password) {
  const uname = String(username || '').trim();
  const { data: prof, error: e1 } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', uname)
    .maybeSingle();
  if (e1) throw e1;
  if (!prof) throw new Error('Потребител не е намерен.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: prof.email, password });
  if (error) throw error;
  return data.user;
}

// profile helpers
export async function getMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data: prof } = await supabase
    .from('profiles')
    .select('id, email, username, display_name, role')
    .eq('id', uid).maybeSingle();
  return prof || null;
}

// listings (админ: approve/reject)
export async function fetchPendingListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, owner_id, title, description, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAllListings(limit = 50) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, owner_id, title, description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function setListingStatus(id, status) {
  const { error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}
