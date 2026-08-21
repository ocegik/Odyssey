-- `app_storage` was the pre-auth single-user cache. All active client paths
-- now use owner-scoped normalized tables, so no browser role needs access to
-- this legacy table. Keep RLS on and remove the old public policy before
-- launch; the service role can still use it for a controlled legacy import.
alter table public.app_storage enable row level security;

drop policy if exists "Public read/write access" on public.app_storage;

revoke all on table public.app_storage from anon, authenticated;
