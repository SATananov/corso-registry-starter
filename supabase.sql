create extension if not exists "pgcrypto";

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  display_name text not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles public read"  on public.profiles;
drop policy if exists "profiles self insert"  on public.profiles;
drop policy if exists "profiles self update"  on public.profiles;

create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id,email,username,display_name,role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'display_name',''), 'user'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- LISTINGS (generic content)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.listings enable row level security;

drop policy if exists "listings public read approved" on public.listings;
drop policy if exists "listings owner write"           on public.listings;
drop policy if exists "listings admin all"             on public.listings;

create policy "listings public read approved" on public.listings for select using (status = 'approved');
create policy "listings owner write"          on public.listings for insert with check (auth.uid() = owner_id);
create policy "listings owner update"         on public.listings for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "listings owner delete"         on public.listings for delete using (auth.uid() = owner_id);
create policy "listings admin all"
  on public.listings
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'));

-- PHOTOS
create table if not exists public.photos (
  id bigserial primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  path text not null unique,
  created_at timestamptz default now()
);
alter table public.photos enable row level security;

drop policy if exists "photos public read via approved parent" on public.photos;
drop policy if exists "photos owner write"                     on public.photos;
drop policy if exists "photos admin all"                       on public.photos;

create policy "photos public read via approved parent"
  on public.photos for select using (
    exists (select 1 from public.listings l where l.id = photos.listing_id and l.status = 'approved')
  );
create policy "photos owner write"
  on public.photos for insert with check (
    exists (select 1 from public.listings l where l.id = photos.listing_id and l.owner_id = auth.uid())
  );
create policy "photos owner update"
  on public.photos for update using (
    exists (select 1 from public.listings l where l.id = photos.listing_id and l.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = photos.listing_id and l.owner_id = auth.uid())
  );
create policy "photos owner delete"
  on public.photos for delete using (
    exists (select 1 from public.listings l where l.id = photos.listing_id and l.owner_id = auth.uid())
  );
create policy "photos admin all"
  on public.photos
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'));

-- STORAGE bucket (public read)
select storage.create_bucket('photos', public := true);

drop policy if exists "photos public read" on storage.objects;
drop policy if exists "photos user write own" on storage.objects;
drop policy if exists "photos user update own" on storage.objects;
drop policy if exists "photos user delete own" on storage.objects;

create policy "photos public read"  on storage.objects for select using (bucket_id = 'photos');
create policy "photos user write own" on storage.objects for insert to authenticated with check (bucket_id='photos' and split_part(name,'/',1)=auth.uid()::text);
create policy "photos user update own" on storage.objects for update to authenticated using (bucket_id='photos' and split_part(name,'/',1)=auth.uid()::text);
create policy "photos user delete own" on storage.objects for delete to authenticated using (bucket_id='photos' and split_part(name,'/',1)=auth.uid()::text);
