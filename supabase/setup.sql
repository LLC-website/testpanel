-- Lina Lien Testpanel: database, beveiliging en foto-opslag
-- Plak dit in Supabase > SQL Editor en klik op Run. Je kunt het veilig opnieuw draaien.

-- Tabellen
create table if not exists public.admins (email text primary key);
create table if not exists public.invites (email text primary key, name text default '', created_at timestamptz default now());
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text, name text default '', show_name boolean default true, wish text default '',
  straat text default '', postcode text default '', plaats text default '',
  press jsonb default '{"used": true}', diy jsonb default '{"used": true}',
  notif jsonb default '{"admin": true, "post": true, "sample": true}',
  created_at timestamptz default now());
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), name text not null, description text default '',
  steps jsonb default '[]', letop text default '', created_at timestamptz default now());
create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(),
  tester uuid not null references public.profiles(id) on delete cascade,
  product uuid not null references public.products(id) on delete cascade,
  what text default '', sent date default current_date, received date, carrier text default '', code text default '',
  created_at timestamptz default now());
create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  tester uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product uuid not null references public.products(id) on delete cascade,
  day int, cijfer int, zit text, los text, water text[] default '{}', irritatie text, text text default '', photo text default '',
  created_at timestamptz default now());
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(), text text not null, photo text default '', created_at timestamptz default now());

-- Wie is beheerder / wie is uitgenodigd
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'))
$$;
create or replace function public.is_member() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.invites where lower(email) = lower(auth.jwt() ->> 'email'))
$$;
create or replace function public.mark_received(sid uuid) returns void language sql security definer set search_path = public as $$
  update public.samples set received = current_date where id = sid and tester = auth.uid() and public.is_member()
$$;

-- Alleen uitgenodigde e-mailadressen kunnen een account krijgen
create or replace function public.check_invite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.invites where lower(email) = lower(new.email))
     and not exists (select 1 from public.admins where lower(email) = lower(new.email)) then
    raise exception 'Dit e-mailadres is niet uitgenodigd';
  end if;
  return new;
end $$;
drop trigger if exists check_invite on auth.users;
create trigger check_invite before insert on auth.users for each row execute function public.check_invite();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), coalesce((select name from public.invites where lower(email) = lower(new.email)), ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Beveiliging per rij
alter table public.admins enable row level security;
alter table public.invites enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.samples enable row level security;
alter table public.updates enable row level security;
alter table public.posts enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('admins','invites','profiles','products','samples','updates','posts') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy admin_all on public.invites  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.samples  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.updates  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.posts    for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy own_read   on public.profiles for select to authenticated using (id = auth.uid() and public.is_member());
create policy own_insert on public.profiles for insert to authenticated with check (id = auth.uid() and public.is_member());
create policy own_update on public.profiles for update to authenticated using (id = auth.uid() and public.is_member()) with check (id = auth.uid());
create policy member_read on public.products for select to authenticated using (public.is_member());
create policy own_read on public.samples for select to authenticated using (tester = auth.uid() and public.is_member());
create policy own_read on public.updates for select to authenticated using (tester = auth.uid() and public.is_member());
create policy own_insert on public.updates for insert to authenticated with check (tester = auth.uid() and public.is_member());
create policy member_read on public.posts for select to authenticated using (public.is_member());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.invites, public.profiles, public.products, public.samples, public.updates, public.posts to authenticated;
revoke all on public.admins from anon, authenticated;
grant execute on function public.is_admin(), public.is_member(), public.mark_received(uuid) to authenticated;

-- Foto-opslag (privé)
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists "testpanel photos insert" on storage.objects;
drop policy if exists "testpanel photos read" on storage.objects;
drop policy if exists "testpanel photos delete" on storage.objects;
create policy "testpanel photos insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'photos' and (
    ((storage.foldername(name))[1] = auth.uid()::text and public.is_member())
    or ((storage.foldername(name))[1] = 'community' and public.is_admin())));
create policy "testpanel photos read" on storage.objects for select to authenticated using (
  bucket_id = 'photos' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'community' and public.is_member())));
create policy "testpanel photos delete" on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());

-- Beheerder en eerste product
insert into public.admins (email) values ('info@linaliencosmetics.com') on conflict do nothing;
insert into public.products (name, description, steps, letop)
select 'Voorgelijmde striplash', 'Blijft de nieuwe strip langer zitten, ook onder de douche?',
  '["Maak je eigen wimpers schoon met micellair water. Dat bevat geen oliën en haalt ze juist weg. Je kunt ook op een andere manier zorgen dat er geen olie op je wimpers zit. Let op: foundation en skincare bevatten oliën, en zelfs poeders zoals oogschaduw.",
    "Breng de striplash aan onder je eigen wimpers en begin aan het uiteinde. Het mooiste resultaat krijg je als je de lash iets meer richting de buitenste ooghoek plaatst.",
    "Knijp je eigen wimpers en de lash stevig samen met je non-sticky applicator.",
    "Vermijd te allen tijde olie in de buurt van de lijmstrip. Dat heeft direct invloed op de draagtijd!"]'::jsonb,
  'Breng je wimpers altijd aan vóór je make-up, zodat er geen restjes olie op je wimpers terechtkomen.'
where not exists (select 1 from public.products where name = 'Voorgelijmde striplash');
