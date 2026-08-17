-- Odyssey onboarding migration
-- Run once after phase-1-foundation.sql (and admin-dashboard.sql, if used).
-- Existing accounts are treated as already onboarded; future profile rows use
-- the false default and will see the three-screen first-run experience.

alter table public.profiles
  add column if not exists onboarding_completed boolean;
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

update public.profiles
set onboarding_completed = true
where onboarding_completed is null;

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

-- Keep users limited to their own profile while allowing this one persistence
-- field alongside their existing display metadata columns.
grant update (display_name, username, cat_target_year, timezone, onboarding_completed) on public.profiles to authenticated;
