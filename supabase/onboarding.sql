-- Odyssey onboarding migration
-- Run once after phase-1-foundation.sql (and admin-dashboard.sql, if used).
-- Existing accounts are treated as already onboarded; future profile rows use
-- the false default and will see the three-screen first-run experience.

alter table public.profiles
  add column if not exists onboarding_completed boolean;

update public.profiles
set onboarding_completed = true
where onboarding_completed is null;

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

-- Keep users limited to their own profile while allowing this one persistence
-- field alongside their existing display metadata columns.
grant update (display_name, timezone, onboarding_completed) on public.profiles to authenticated;
