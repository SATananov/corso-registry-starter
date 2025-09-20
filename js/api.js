// js/api.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://wwdshtnrduxauwxtgadl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHNodG5yZHV4YXV3eHRnYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ5NDUsImV4cCI6MjA3Mzc2MDk0NX0.R_ITamQoP4G6webhXg-q81iywl3nzmysRBDx6YwJKNw'
);

// ---------- AUTH ----------
export async function getSession(){ return (await supabase.auth.getSession()).data.session; }
export async function currentUser(){ return (await supabase.auth.getUser()).data.user; }
export function onAuthChanged(cb){ return supabase.auth.onAuthStateChange((_e, s)=>cb(s)); }
export async function signOut(){ await supabase.auth.signOut(); }

// ---------- PROFILES ----------
export async function getMyProfile(){
  const u = await currentUser(); if(!u) return null;
  const { data, error } = await supabase.from('profiles')
    .select('id,email,username,display_name,role').eq('id', u.id).maybeSingle();
  if(error) throw error;
  return data;
}
export async function upsertMyProfile({ display_name, username }){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const row = { id: u.id, email: u.email, display_name, username };
  const { error } = await supabase.from('profiles').upsert(row, { onConflict:'id' });
  if(error) throw error;
}
export async function fetchProfilesMap(ids){
  const uniq=[...new Set((ids||[]).filter(Boolean))]; if(!uniq.length) return {};
  const { data, error } = await supabase.from('profiles').select('id,display_name,username').in('id', uniq);
  if(error) throw error; const m={}; for(const r of data) m[r.id]=r.display_name||r.username||r.id.slice(0,8)+'…'; return m;
}

// ---------- DOGS ----------
export async function createDog(payload){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  // server-side default owner_id via RLS, но подаваме за яснота:
  const row = { ...payload, owner_id: u.id };
  const { error } = await supabase.from('dogs').insert([row]);
  if(error) throw error;
}
export async function fetchMyDogs(){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('dogs')
    .select('*').eq('owner_id', u.id).order('created_at',{ascending:false});
  if(error) throw error; return data;
}
export async function updateMyDog(id, fields){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const { error } = await supabase.from('dogs').update(fields).eq('id', id).eq('owner_id', u.id);
  if(error) throw error;
}
export async function deleteMyDog(id){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const { data: photos } = await supabase.from('dog_photos').select('path').eq('dog_id', id);
  if(photos?.length) await supabase.storage.from('dogphotos').remove(photos.map(p=>p.path));
  await supabase.from('dog_photos').delete().eq('dog_id', id);
  const { error } = await supabase.from('dogs').delete().eq('id', id).eq('owner_id', u.id);
  if(error) throw error;
}
export async function fetchApprovedDogs({ q='', limit=50, offset=0 }={}){
  let qry = supabase.from('dogs').select('*', { count:'exact' })
    .eq('status','approved').order('created_at',{ascending:false})
    .range(offset, offset+limit-1);
  if(q && q.trim()){
    const s = `%${q.trim()}%`;
    qry = qry.or(`name.ilike.${s},color.ilike.${s},microchip_number.ilike.${s},pedigree_number.ilike.${s}`);
  }
  const { data, error, count } = await qry;
  if(error) throw error;
  return { rows: data, count };
}
export async function fetchDogApproved(id){
  const { data, error } = await supabase.from('dogs').select('*')
    .eq('id', id).eq('status','approved').maybeSingle();
  if(error) throw error; return data;
}

// ---------- ADMIN ----------
export async function fetchPendingDogs(){
  const { data, error } = await supabase.from('dogs').select('*')
    .eq('status','pending').order('created_at',{ascending:true});
  if(error) throw error; return data;
}
export async function fetchAllDogs(limit=100){
  const { data, error } = await supabase.from('dogs').select('*')
    .order('created_at',{ascending:false}).limit(limit);
  if(error) throw error; return data;
}
export async function setDogStatus(id, status){
  const { error } = await supabase.from('dogs').update({ status }).eq('id', id);
  if(error) throw error;
}

// ---------- DOG PHOTOS ----------
export function publicUrl(path){ return supabase.storage.from('dogphotos').getPublicUrl(path).data.publicUrl; }

export async function listDogPhotos(dog_id){
  const { data, error } = await supabase.from('dog_photos').select('*')
    .eq('dog_id', dog_id).order('created_at',{ascending:false});
  if(error) throw error; return data;
}
export async function uploadDogPhoto(dog_id, file){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${dog_id}/${crypto.randomUUID?.():Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('dogphotos').upload(path, file, { upsert:false, cacheControl:'3600' });
  if(upErr) throw upErr;
  const { error } = await supabase.from('dog_photos').insert([{ dog_id, path }]);
  if(error){ await supabase.storage.from('dogphotos').remove([path]).catch(()=>{}); throw error; }
}
export async function deleteDogPhoto(photo_id, path){
  const { error } = await supabase.from('dog_photos').delete().eq('id', photo_id);
  if(error) throw error; await supabase.storage.from('dogphotos').remove([path]).catch(()=>{});
}
