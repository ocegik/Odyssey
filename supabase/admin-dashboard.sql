-- Odyssey admin dashboard migration
-- Run this once in the Supabase SQL editor after phase-1-foundation.sql.
-- It is safe to run on a populated project: existing profiles are backfilled
-- from auth.users and every account defaults to the non-admin "user" role.

alter table public.profiles
  add column if not exists email text not null default '';
alter table public.profiles
  add column if not exists role text not null default 'user';
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles
  add column if not exists username text;
alter table public.profiles
  add column if not exists cat_target_year smallint;

alter table public.profiles
  drop constraint if exists profiles_cat_target_year_check;
alter table public.profiles
  add constraint profiles_cat_target_year_check
  check (cat_target_year is null or cat_target_year between 2020 and 2100);

alter table public.profiles
  drop constraint if exists profiles_username_check;
alter table public.profiles
  add constraint profiles_username_check
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

update public.profiles profile
set email = coalesce(auth_user.email, '')
from auth.users auth_user
where profile.id = auth_user.id
  and profile.email is distinct from coalesce(auth_user.email, '');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Users manage their own profile" on public.profiles;
drop policy if exists "Users read their own profile" on public.profiles;
drop policy if exists "Users update their own profile" on public.profiles;
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins read all mocks" on public.mocks;
create policy "Admins read all mocks" on public.mocks
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins read all sections" on public.sections;
create policy "Admins read all sections" on public.sections
  for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, username, cat_target_year, timezone, onboarding_completed) on public.profiles to authenticated;

-- Promote the intended account manually, once, after checking the address:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
