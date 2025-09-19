-- Enable needed extensions
create extension if not exists "pgcrypto";

-- PROFILES (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  display_name text,
  city text,
  role text check (role in ('user','admin')) default 'user',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- PUBLIC read of minimal profile info (optional)
create policy "profiles public read"
on public.profiles for select
to anon, authenticated
using (true);

-- DOGS
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sex text check (sex in ('male','female')) not null default 'male',
  date_of_birth date,
  color text,
  city text,
  microchip text,
  pedigree text,
  cover_path text,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  rejection_reason text,
  created_at timestamptz default now()
);
alter table public.dogs enable row level security;

-- RLS for dogs
-- Anyone can read approved
create policy "dogs: public read approved"
on public.dogs for select
to anon, authenticated
using (status = 'approved');

-- Owners can read their own non-approved
create policy "dogs: owner read own"
on public.dogs for select
to authenticated
using (owner_id = auth.uid());

-- Owners can insert
create policy "dogs: owner insert"
on public.dogs for insert
to authenticated
with check (owner_id = auth.uid());

-- Owners can update their own
create policy "dogs: owner update own"
on public.dogs for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Admin can manage all
create policy "dogs: admin all"
on public.dogs
as permissive
for all
to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') )
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') );

-- PHOTOS
create table if not exists public.photos (
  id bigserial primary key,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  path text not null,
  created_at timestamptz default now()
);
alter table public.photos enable row level security;

-- Public can read photos of approved dogs
create policy "photos: public read approved"
on public.photos for select
to anon, authenticated
using (
  exists (select 1 from public.dogs d where d.id = photos.dog_id and d.status = 'approved')
);

-- Owners can read photos of their dogs
create policy "photos: owner read own"
on public.photos for select
to authenticated
using ( exists (select 1 from public.dogs d where d.id = photos.dog_id and d.owner_id = auth.uid()) );

-- Owners can insert / delete own
create policy "photos: owner insert"
on public.photos for insert
to authenticated
with check ( exists (select 1 from public.dogs d where d.id = photos.dog_id and d.owner_id = auth.uid()) );

create policy "photos: owner delete"
on public.photos for delete
to authenticated
using ( exists (select 1 from public.dogs d where d.id = photos.dog_id and d.owner_id = auth.uid()) );

-- Admin full access
create policy "photos: admin all"
on public.photos
as permissive
for all
to authenticated
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') )
with check ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') );

-- STORAGE bucket policies (dog-photos)
-- Create bucket "dog-photos" from Storage UI, then:
-- Allow owners to upload to their folder user_id/dog_id/*
create policy "storage: upload own path"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dog-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can update/delete own objects
create policy "storage: owner modify own"
on storage.objects for update using (
  bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "storage: owner delete own"
on storage.objects for delete using (
  bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public can read objects whose dog is approved (we sign URLs anyway; policy optional)
create policy "storage: public select"
on storage.objects for select
to anon, authenticated
using ( bucket_id = 'dog-photos' );
