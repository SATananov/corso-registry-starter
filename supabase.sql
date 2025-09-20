-- Extensions
create extension if not exists "pgcrypto";

-- PROFILES (unchanged if you already have it)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  display_name text,
  role text check (role in ('user','admin')) default 'user',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- self insert/update
do $$ begin
  create policy "profiles insert self"
    on public.profiles for insert to authenticated
    with check (auth.uid() = id);
exception when duplicate_object then null end $$;

do $$ begin
  create policy "profiles update self"
    on public.profiles for update to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception when duplicate_object then null end $$;

-- Helper: is_admin()
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- DOGS
create table if not exists public.dogs (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),

  -- Cane Corso fields
  name text not null,
  sex text not null check (sex in ('male','female')),
  date_of_birth date not null,
  color text,
  microchip_number text,
  pedigree_number text,
  spayed_neutered boolean default false,
  sire_name text,
  dam_name text,
  breeder_name text,
  notes text
);
alter table public.dogs enable row level security;

-- RLS for dogs
do $$ begin
  create policy "dogs insert owner"
    on public.dogs for insert to authenticated
    with check (owner_id = auth.uid());
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dogs update owner"
    on public.dogs for update to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dogs delete owner"
    on public.dogs for delete to authenticated
    using (owner_id = auth.uid());
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dogs read approved or own or admin"
    on public.dogs for select to anon, authenticated
    using ( status = 'approved' or owner_id = auth.uid() or public.is_admin() );
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dogs admin update"
    on public.dogs for update to authenticated
    using (public.is_admin()) with check (true);
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dogs admin delete"
    on public.dogs for delete to authenticated
    using (public.is_admin());
exception when duplicate_object then null end $$;

-- DOG PHOTOS
create table if not exists public.dog_photos (
  id bigserial primary key,
  dog_id bigint not null references public.dogs(id) on delete cascade,
  path text not null,
  created_at timestamptz default now()
);
alter table public.dog_photos enable row level security;

-- RLS for dog_photos
do $$ begin
  create policy "dog_photos insert owner"
    on public.dog_photos for insert to authenticated
    with check (
      exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid())
    );
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dog_photos delete owner or admin"
    on public.dog_photos for delete to authenticated
    using (
      exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid())
      or public.is_admin()
    );
exception when duplicate_object then null end $$;

do $$ begin
  create policy "dog_photos read public/own/admin"
    on public.dog_photos for select to anon, authenticated
    using (
      exists (select 1 from public.dogs d
              where d.id = dog_id and (d.status='approved' or d.owner_id = auth.uid() or public.is_admin()))
    );
exception when duplicate_object then null end $$;
