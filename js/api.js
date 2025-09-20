// api.js — Supabase клиент + помощни функции
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://wwdshtnrduxauwxtgadl.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHNodG5yZHV4YXV3eHRnYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ5NDUsImV4cCI6MjA3Mzc2MDk0NX0.R_ITamQoP4G6webhXg-q81iywl3nzmysRBDx6YwJKNw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Връща текущия потребител (или null)
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

// Зарежда моя профил (profiles)
export async function getMyProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

// Проверява дали съм админ (чрез SQL функцията)
export async function isAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
}

// Удобни CRUD за dogs
export async function listDogs({ mine = false, includePending = false } = {}) {
  let q = supabase.from('dogs').select('*').order('created_at', { ascending: false });
  if (mine) {
    const user = await getUser();
    if (!user) return [];
    q = q.eq('owner_id', user.id);
  } else if (!includePending) {
    q = q.eq('status', 'approved');
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createDog(payload) {
  const user = await getUser();
  if (!user) throw new Error('Не сте логнат.');
  const body = { ...payload, owner_id: user.id, status: 'pending' };
  const { data, error } = await supabase.from('dogs').insert(body).select().single();
  if (error) throw error;
  return data;
}

export async function updateDog(id, patch) {
  const { data, error } = await supabase.from('dogs').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDog(id) {
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  if (error) throw error;
}

export async function addDogPhoto(dog_id, url) {
  const { data, error } = await supabase.from('dog_photos').insert({ dog_id, url }).select().single();
  if (error) throw error;
  return data;
}

export async function listDogPhotos(dog_id) {
  const { data, error } = await supabase.from('dog_photos').select('*').eq('dog_id', dog_id).order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
