// js/api.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://wwdshtnrduxauwxtgadl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHNodG5yZHV4YXV3eHRnYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ5NDUsImV4cCI6MjA3Mzc2MDk0NX0.R_ITamQoP4G6webhXg-q81iywl3nzmysRBDx6YwJKNw'
);

// ---------- AUTH ----------
export async function getSession(){ return (await supabase.auth.getSession()).data.session; }
export async function currentUser(){ return (await supabase.auth.getUser()).data.user; }
export function onAuthChanged(cb){ return supabase.auth.onAuthStateChange((_e, sess)=>cb(sess)); }
export async function signOut(){ await supabase.auth.signOut(); }

// ---------- PROFILES ----------
export async function getMyProfile(){
  const u = await currentUser(); if(!u) return null;
  const { data, error } = await supabase.from('profiles')
    .select('id,email,username,display_name,role')
    .eq('id', u.id).maybeSingle();
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
  const uniq = [...new Set((ids||[]).filter(Boolean))];
  if(!uniq.length) return {};
  const { data, error } = await supabase.from('profiles')
    .select('id,display_name,username').in('id', uniq);
  if(error) throw error;
  const m={}; for(const r of data) m[r.id] = r.display_name || r.username || r.id.slice(0,8)+'…';
  return m;
}

// ---------- LISTINGS ----------
export async function createListing({ title, description }){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const { error } = await supabase.from('listings').insert([{ title, description }]);
  if(error) throw error;
}
export async function fetchMyListings(){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('listings')
    .select('*').eq('owner_id', u.id).order('created_at', { ascending:false });
  if(error) throw error;
  return data;
}
export async function updateMyListing(id, fields){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const { error } = await supabase.from('listings')
    .update(fields).eq('id', id).eq('owner_id', u.id);
  if(error) throw error;
}
export async function deleteMyListing(id){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  // 1) изтрий файловете в bucket (ако има)
  const { data: photos } = await supabase.from('photos').select('id,path').eq('listing_id', id);
  if (photos?.length){
    await supabase.storage.from('photos').remove(photos.map(p=>p.path));
    await supabase.from('photos').delete().eq('listing_id', id);
  }
  // 2) изтрий записа
  const { error } = await supabase.from('listings').delete().eq('id', id).eq('owner_id', u.id);
  if(error) throw error;
}
export async function fetchApprovedListings({ q='', limit=50, offset=0 }={}){
  let qry = supabase.from('listings').select('*', { count:'exact' }).eq('status','approved')
    .order('created_at', { ascending:false }).range(offset, offset+limit-1);
  if(q && q.trim()){
    const s = `%${q.trim()}%`;
    // ако имаш GIN/fts – смени със to_tsvector; за basic: ilike на title/description
    qry = qry.or(`title.ilike.${s},description.ilike.${s}`);
  }
  const { data, error, count } = await qry;
  if(error) throw error;
  return { rows: data, count };
}
export async function fetchListingApproved(id){
  const { data, error } = await supabase.from('listings').select('*')
    .eq('id', id).eq('status','approved').maybeSingle();
  if(error) throw error;
  return data;
}

// ---------- ADMIN ----------
export async function fetchPendingListings(){
  const { data, error } = await supabase.from('listings').select('*')
    .eq('status','pending').order('created_at',{ascending:true});
  if(error) throw error;
  return data;
}
export async function fetchAllListings(limit=100){
  const { data, error } = await supabase.from('listings').select('*')
    .order('created_at',{ascending:false}).limit(limit);
  if(error) throw error;
  return data;
}
export async function setListingStatus(id, status){
  const { error } = await supabase.from('listings').update({ status }).eq('id', id);
  if(error) throw error;
}

// ---------- PHOTOS ----------
export function publicUrl(path){ return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl; }

export async function listPhotos(listing_id){
  const { data, error } = await supabase.from('photos')
    .select('*').eq('listing_id', listing_id).order('created_at',{ascending:false});
  if(error) throw error;
  return data;
}
export async function uploadPhoto(listing_id, file){
  const u = await currentUser(); if(!u) throw new Error('Not authenticated');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${listing_id}/${crypto.randomUUID?.():Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert:false, cacheControl:'3600' });
  if(upErr) throw upErr;
  const { error } = await supabase.from('photos').insert([{ listing_id, path }]);
  if(error){ // rollback storage
    await supabase.storage.from('photos').remove([path]);
    throw error;
  }
}
export async function deletePhoto(photo_id, path){
  const { error } = await supabase.from('photos').delete().eq('id', photo_id);
  if(error) throw error;
  await supabase.storage.from('photos').remove([path]).catch(()=>{});
}
