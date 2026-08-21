-- Account deletion removes all user data. The original feedback FK omitted
-- the cascade and blocked deletion for anyone who had submitted feedback.
alter table public.feedback
  drop constraint if exists feedback_user_id_fkey;

alter table public.feedback
  add constraint feedback_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
