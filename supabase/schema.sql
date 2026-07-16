-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor -> New query).
-- Backs the app's cloud sync: a single generic key/value table, one row per
-- app data slice ("entries" = mock records, "settings" = profile/schedule).

create table if not exists app_storage (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_storage enable row level security;

-- No login in this app (single-user personal project, non-sensitive data),
-- so the anon key is allowed full read/write. Anyone with the project URL
-- and anon key could read/write this table -- acceptable tradeoff here, but
-- do not reuse this policy for anything sensitive.
create policy "Public read/write access"
  on app_storage
  for all
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on app_storage to anon, authenticated;
