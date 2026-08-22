-- New accounts are private by default. Existing account choices are preserved.
alter table public.profiles
  alter column account_type set default 'personal';
