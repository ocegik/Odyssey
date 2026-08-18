-- Odyssey Phase 1: authenticated, normalized storage foundation
--
-- Run this once in the Supabase SQL editor after the existing schema.sql.
-- It deliberately does NOT read, alter, migrate, revoke access to, or add
-- policies to app_storage. The current application continues using that table
-- until a later, explicitly planned migration phase.
--
-- Email/password authentication itself is configured in the Supabase Dashboard:
-- Authentication > Providers > Email. Enable Email, then choose whether email
-- confirmation is required and set the project's Site URL / redirect URLs.

-- ---------------------------------------------------------------------------
-- Shared timestamps
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- One row per authenticated person. This is intentionally separate from the
-- app preferences: profiles describe the person; settings describe the app.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  display_name text not null default '',
  username text check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  age smallint check (age is null or age between 1 and 120),
  cat_target_year smallint check (cat_target_year between 2020 and 2100),
  account_type text not null default 'community' check (account_type in ('community', 'personal')),
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

-- New email/password signups receive their private profile row immediately.
-- SECURITY DEFINER is required because the auth service, rather than the new
-- end user, performs the insert. Keep the function narrowly scoped.
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

-- Keep the dashboard's non-sensitive account identifier aligned if a person
-- changes their sign-in email in Supabase Auth.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();

-- A parent mock. legacy_mock_id is reserved solely for a future controlled
-- app_storage migration, so an imported client id can be made idempotent.
create table if not exists public.mocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  legacy_mock_id text,
  mock_date date not null,
  source text not null,
  manual_total_marks numeric(8, 2),
  overall_percentile numeric(5, 2) check (overall_percentile between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  -- Normal SQL NULL semantics allow any number of unmigrated mocks. Once a
  -- legacy id is populated, the pair is unique and migration retries stay
  -- idempotent.
  unique (user_id, legacy_mock_id)
);

-- A score-level section belonging to one mock. question_blocks preserves the
-- current paper-structure payload without forcing a premature blocks table.
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null,
  user_id uuid not null default auth.uid(),
  section_name text not null check (section_name in ('VARC', 'DILR', 'Quant')),
  attempted integer check (attempted is null or attempted >= 0),
  correct integer check (correct is null or correct >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  percentile numeric(5, 2) check (percentile between 0 and 100),
  manual_total_marks numeric(8, 2),
  question_set_count integer check (question_set_count is null or question_set_count >= 0),
  question_blocks jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (mock_id, section_name),
  foreign key (mock_id, user_id) references public.mocks(id, user_id) on delete cascade
);

-- One optional detailed analysis document per mock. Its question/block tree is
-- retained as JSONB for Phase 1; relational question tables can be introduced
-- only after real query/reporting requirements have been validated.
create table if not exists public.analysis (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null,
  user_id uuid not null default auth.uid(),
  schema_version integer not null default 3 check (schema_version > 0),
  source_format text not null default 'detailed-analysis-json',
  overall_reflection text not null default '',
  structure_text text not null default '',
  document jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (mock_id),
  foreign key (mock_id, user_id) references public.mocks(id, user_id) on delete cascade
);

-- Singleton per-user app preferences, including targets, schedule and view
-- preferences. Typed frequently queried values stay as columns; flexible UI
-- preference fields can live in preferences until a migration needs them.
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  overall_target_marks numeric(8, 2) check (overall_target_marks is null or overall_target_marks >= 0),
  overall_target_percentile numeric(5, 2) check (overall_target_percentile is null or overall_target_percentile between 0 and 100),
  section_target_marks jsonb not null default '{}'::jsonb,
  mock_schedule jsonb not null default '[]'::jsonb,
  layout_width text not null default 'comfortable' check (layout_width in ('cozy', 'comfortable', 'wide')),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- One progress record per user/topic. Revision history and imported legacy
-- metrics remain JSONB until Phase 2 proves the need for event-level queries.
create table if not exists public.syllabus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_id text not null,
  completion_status text not null default 'not_started'
    check (completion_status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  notes text not null default '',
  resources jsonb not null default '[]'::jsonb,
  revision_history jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, topic_id)
);

create index if not exists mocks_user_date_idx on public.mocks (user_id, mock_date desc);
create index if not exists sections_user_mock_idx on public.sections (user_id, mock_id);
create index if not exists analysis_user_mock_idx on public.analysis (user_id, mock_id);
create index if not exists syllabus_user_status_idx on public.syllabus (user_id, completion_status);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists mocks_set_updated_at on public.mocks;
create trigger mocks_set_updated_at before update on public.mocks
  for each row execute function public.set_updated_at();
drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at before update on public.sections
  for each row execute function public.set_updated_at();
drop trigger if exists analysis_set_updated_at on public.analysis;
create trigger analysis_set_updated_at before update on public.analysis
  for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
drop trigger if exists syllabus_set_updated_at on public.syllabus;
create trigger syllabus_set_updated_at before update on public.syllabus
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: every new row is private to its signed-in owner. There are no anon
-- grants or public policies on these tables. `app_storage` is untouched.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.mocks enable row level security;
alter table public.sections enable row level security;
alter table public.analysis enable row level security;
alter table public.settings enable row level security;
alter table public.syllabus enable row level security;

-- This helper runs as the schema owner so the RLS policies can determine an
-- account's role without recursively querying profiles under the caller's
-- row policy. It grants no table access on its own.
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

drop policy if exists "Users manage their own mocks" on public.mocks;
create policy "Users manage their own mocks" on public.mocks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their own sections" on public.sections;
create policy "Users manage their own sections" on public.sections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their own analysis" on public.analysis;
create policy "Users manage their own analysis" on public.analysis
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their own settings" on public.settings;
create policy "Users manage their own settings" on public.settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their own syllabus" on public.syllabus;
create policy "Users manage their own syllabus" on public.syllabus
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Administrators may read only the account and mock metadata required for the
-- aggregate dashboard. Analysis, settings, and syllabus stay owner-only.
drop policy if exists "Admins read all mocks" on public.mocks;
create policy "Admins read all mocks" on public.mocks
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins read all sections" on public.sections;
create policy "Admins read all sections" on public.sections
  for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.mocks, public.sections,
  public.analysis, public.settings, public.syllabus to authenticated;

-- A role must never be self-assigned through the browser. The auth trigger
-- creates profiles; signed-in people may change only their display metadata.
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, username, age, cat_target_year, account_type, timezone, onboarding_completed) on public.profiles to authenticated;
