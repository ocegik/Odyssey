-- Odyssey onboarding migration
-- Run once after phase-1-foundation.sql (and admin-dashboard.sql, if used).
-- Existing accounts are treated as already onboarded; future profile rows use
-- the false default and will see the three-screen first-run experience.

alter table public.profiles
  add column if not exists onboarding_completed boolean;
alter table public.profiles
  add column if not exists cat_target_year smallint;
alter table public.profiles
  add column if not exists age smallint;
alter table public.profiles
  add column if not exists account_type text;

alter table public.profiles
  drop constraint if exists profiles_cat_target_year_check;
alter table public.profiles
  add constraint profiles_cat_target_year_check
  check (cat_target_year is null or cat_target_year between 2020 and 2100);

alter table public.profiles
  drop constraint if exists profiles_age_check;
alter table public.profiles
  add constraint profiles_age_check
  check (age is null or age between 1 and 120);

alter table public.profiles
  drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('community', 'personal'));

update public.profiles
set onboarding_completed = true
where onboarding_completed is null;

update public.profiles
set account_type = 'personal'
where account_type is null;

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null,
  alter column account_type set default 'personal',
  alter column account_type set not null;

-- Keep users limited to their own profile while allowing this one persistence
-- field alongside their existing display metadata columns.
grant update (display_name, age, cat_target_year, account_type, timezone, onboarding_completed) on public.profiles to authenticated;
