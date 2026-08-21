-- Feedback is deliberately write-only from the client. Review submissions in
-- the Supabase dashboard; no user-facing read policy is needed.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  category text check (category in ('bug', 'idea', 'confusing', 'other')),
  message text not null,
  page_context text,
  app_version text
);

alter table feedback enable row level security;

create policy "Users can insert their own feedback"
  on feedback for insert
  with check (auth.uid() = user_id);
