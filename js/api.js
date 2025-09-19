import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

let supabase;

export function initClient(){
  if(supabase) return;
  const SUPABASE_URL = 'https://lmhvchdjiockosttadvk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaHZjaGRqaW9ja29zdHRhZHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjkyMzgsImV4cCI6MjA3Mzg0NTIzOH0.OCWL6mND7bGlaOpNRgPVPGTLUBpU7WVTVyMg-mvoTfE';
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function client(){ return supabase; }

/* ===== Сесия / Профил ===== */
export async function getSession(){
  const { data: { user } } = await supabase.auth.getUser();
  let role='visitor', profile=null;
  if(user){
    const { data } = await supabase.from('profiles').select('role, username, display_name, city, email').eq('id', user.id).maybeSingle();
    role = data?.role || 'user'; profile = data || null;
  }
  return { user, role, profile };
}

export async function loginWithUsername(username, password){
  const uname = String(username||'').trim();
  if(!uname) throw new Error('Моля, въведете потребителско име.');
  const { data: prof, error: qErr } = await supabase.from('profiles').select('email').ilike('username', uname).maybeSingle();
  if(qErr) throw qErr;
  if(!prof?.email) throw new Error('Потребител не е намерен.');
  const { error } = await supabase.auth.signInWithPassword({ email: prof.email, password });
  if(error) throw error; return true;
}

export async function register({ email, password, username, display_name }){
  const { data, error } = await supabase.auth.signUp({ email, password });
  if(error) throw error;
  if(data?.user){
    const row = { id: data.user.id, email, username, display_name: display_name || username, role: 'user' };
    const { error: upErr } = await supabase.from('profiles').upsert(row, { onConflict:'id' });
    if(upErr) throw upErr;
  }
  return true;
}
export async function logout(){ await supabase.auth.signOut(); }

/* ===== Публични ===== */
export async function listApprovedDogs(q=''){
  let query = supabase.from('dogs').select('id,name,sex,color,city,date_of_birth,cover_path,status').eq('status','approved').order('created_at',{ascending:false});
  if(q && q.trim()) query = query.ilike('name', `%${q}%`);
  const { data, error } = await query; if(error) throw error;
  return Promise.all((data||[]).map(signCover));
}
export async function getDogById(id){
  const { data: dog, error } = await supabase.from('dogs').select('*').eq('id', id).maybeSingle();
  if(error) throw error; if(!dog) return null;
  const { data: photos } = await supabase.from('photos').select('id,path,created_at').eq('dog_id', id).order('created_at',{ascending:true});
  const signed = await Promise.all((photos||[]).map(async p=>{
    const { data: s } = await supabase.storage.from('dog-photos').createSignedUrl(p.path, 3600);
    return { ...p, url: s?.signedUrl || null };
  }));
  const dogWithCover = await signCover(dog); return { ...dogWithCover, photos: signed };
}
async function signCover(dog){
  if(!dog?.cover_path) return { ...dog, cover_url: null };
  const { data: s } = await supabase.storage.from('dog-photos').createSignedUrl(dog.cover_path, 3600);
  return { ...dog, cover_url: s?.signedUrl || null };
}

/* ===== Моите ===== */
export async function myDogs(){
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('dogs').select('id,name,status,created_at,cover_path,sex,color,city').eq('owner_id', user.id).order('created_at',{ascending:false});
  if(error) throw error; return Promise.all((data||[]).map(signCover));
}
export async function createDog(payload){
  const { data: { user } } = await supabase.auth.getUser(); if(!user) throw new Error('Не си логнат.');
  const row = { ...payload, owner_id: user.id, status:'draft' };
  const { data, error } = await supabase.from('dogs').insert(row).select().single();
  if(error) throw error; return data;
}
export async function updateDog(id, payload){
  const { data, error } = await supabase.from('dogs').update(payload).eq('id', id).select().single();
  if(error) throw error; return data;
}
export async function submitDog(id){
  const { error } = await supabase.from('dogs').update({ status:'pending', rejection_reason:null }).eq('id', id);
  if(error) throw error; return true;
}
export async function setCover(dogId, path){
  const { error } = await supabase.from('dogs').update({ cover_path: path }).eq('id', dogId);
  if(error) throw error; return true;
}
export async function uploadDogPhoto(dogId, file){
  const { data: { user } } = await supabase.auth.getUser(); if(!user) throw new Error('Не си логнат.');
  const safeName=file.name.replace(/[^\w.\-]+/g,'_'); const path=`${user.id}/${dogId}/${Date.now()}_${safeName}`;
  const { error: upErr } = await supabase.storage.from('dog-photos').upload(path, file, { contentType: file.type || 'application/octet-stream', cacheControl:'3600', upsert:false, metadata:{ owner_id:user.id, dog_id:dogId } });
  if(upErr) throw upErr;
  await supabase.from('photos').insert({ dog_id: dogId, path });
  const { data: dog } = await supabase.from('dogs').select('cover_path').eq('id', dogId).maybeSingle();
  if(!dog?.cover_path){ await supabase.from('dogs').update({ cover_path: path }).eq('id', dogId); }
  return path;
}
export async function deletePhoto(photoId, path){
  if(path) await supabase.storage.from('dog-photos').remove([path]);
  const { error } = await supabase.from('photos').delete().eq('id', photoId);
  if(error) throw error; return true;
}

/* ===== Admin ===== */
export async function adminListDogs(status='pending'){
  const { data, error } = await supabase.from('dogs').select('id,name,sex,city,date_of_birth,status,owner_id,cover_path,created_at,rejection_reason').eq('status', status).order('created_at',{ascending:true});
  if(error) throw error; return Promise.all((data||[]).map(signCover));
}
export async function adminApprove(dogId){
  const { error } = await supabase.from('dogs').update({ status:'approved', rejection_reason:null }).eq('id', dogId);
  if(error) throw error; return true;
}
export async function adminReject(dogId, reason=''){
  const { error } = await supabase.from('dogs').update({ status:'rejected', rejection_reason:reason }).eq('id', dogId);
  if(error) throw error; return true;
}
