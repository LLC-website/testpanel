-- Polls in de Community. Plak dit in Supabase > SQL Editor en klik op Run.
alter table public.posts add column if not exists poll jsonb;
create table if not exists public.poll_votes (
  post uuid not null references public.posts(id) on delete cascade,
  tester uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  choice int not null,
  created_at timestamptz default now(),
  primary key (post, tester));
alter table public.poll_votes enable row level security;
drop policy if exists own_read on public.poll_votes;
drop policy if exists own_insert on public.poll_votes;
drop policy if exists admin_delete on public.poll_votes;
create policy own_read on public.poll_votes for select to authenticated using (tester = auth.uid() or public.is_admin());
create policy own_insert on public.poll_votes for insert to authenticated with check (
  tester = auth.uid() and public.is_member() and not public.is_admin()
  and exists (select 1 from public.posts p where p.id = poll_votes.post and p.poll is not null
              and poll_votes.choice >= 0 and poll_votes.choice < jsonb_array_length(p.poll)));
create policy admin_delete on public.poll_votes for delete to authenticated using (public.is_admin());
grant select, insert, delete on public.poll_votes to authenticated;
create or replace function public.poll_counts() returns table (post uuid, choice int, n bigint)
language sql stable security definer set search_path = public as $$
  select v.post, v.choice, count(*) from public.poll_votes v where public.is_member() group by v.post, v.choice
$$;
grant execute on function public.poll_counts() to authenticated;
