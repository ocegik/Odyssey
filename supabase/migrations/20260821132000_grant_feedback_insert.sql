-- RLS already limits inserts to a row whose user_id is auth.uid(). Grant the
-- matching table privilege so authenticated feedback submissions can succeed.
grant insert on table public.feedback to authenticated;
