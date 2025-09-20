-- self insert/update
do $$
begin
  create policy "profiles insert self"
    on public.profiles for insert to authenticated
    with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "profiles update self"
    on public.profiles for update to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;

-- RLS за dogs
do $$
begin
  create policy "dogs insert owner"
    on public.dogs for insert to authenticated
    with check (owner_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dogs update owner"
    on public.dogs for update to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dogs delete owner"
    on public.dogs for delete to authenticated
    using (owner_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dogs read approved or own or admin"
    on public.dogs for select to anon, authenticated
    using ( status = 'approved' or owner_id = auth.uid() or public.is_admin() );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dogs admin update"
    on public.dogs for update to authenticated
    using (public.is_admin()) with check (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dogs admin delete"
    on public.dogs for delete to authenticated
    using (public.is_admin());
exception
  when duplicate_object then null;
end $$;

-- RLS за dog_photos
do $$
begin
  create policy "dog_photos insert owner"
    on public.dog_photos for insert to authenticated
    with check (
      exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid())
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dog_photos delete owner or admin"
    on public.dog_photos for delete to authenticated
    using (
      exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid())
      or public.is_admin()
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "dog_photos read public/own/admin"
    on public.dog_photos for select to anon, authenticated
    using (
      exists (select 1 from public.dogs d
              where d.id = dog_id and (d.status='approved' or d.owner_id = auth.uid() or public.is_admin()))
    );
exception
  when duplicate_object then null;
end $$;
