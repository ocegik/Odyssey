-- Remove the username feature and show opted-in Community learners by their
-- existing display name instead. Run after the onboarding/community migrations.

create or replace function public.get_community_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with recent_mock_scores as (
    select
      m.id,
      m.user_id,
      m.mock_date,
      m.created_at,
      case
        when m.manual_total_marks is not null then m.manual_total_marks
        when count(s.id) > 0 then sum(
          case
            when s.manual_total_marks is not null then s.manual_total_marks
            when s.attempted is not null and s.correct is not null
              then (s.correct * 3) - greatest(s.attempted - s.correct, 0)
            else 0
          end
        )
        else null
      end as total_marks
    from public.mocks m
    left join public.sections s on s.mock_id = m.id
    where m.created_at >= timezone('utc', now()) - interval '30 days'
    group by m.id
  ),
  leaderboard as (
    select
      row_number() over (
        order by count(rms.id) desc,
        (array_agg(rms.total_marks order by rms.mock_date desc, rms.created_at desc)
          filter (where rms.total_marks is not null))[1] desc nulls last,
        lower(p.display_name) asc
      )::integer as rank,
      coalesce(nullif(p.display_name, ''), 'Odyssey learner') as display_name,
      count(rms.id)::integer as mock_count,
      (array_agg(rms.total_marks order by rms.mock_date desc, rms.created_at desc)
        filter (where rms.total_marks is not null))[1] as latest_score
    from public.profiles p
    join recent_mock_scores rms on rms.user_id = p.id
    where p.account_type = 'community'
      and p.onboarding_completed = true
    group by p.id, p.display_name
    order by rank
    limit 10
  ),
  totals as (
    select
      (select count(*)::integer from public.profiles where onboarding_completed = true) as total_students,
      (select count(*)::integer from public.mocks) as total_mocks,
      (select count(*)::integer from public.mocks where created_at >= timezone('utc', now()) - interval '30 days') as mocks_last_30_days,
      (select count(distinct user_id)::integer from public.mocks where created_at >= timezone('utc', now()) - interval '30 days') as active_learners
  )
  select jsonb_build_object(
    'total_students', totals.total_students,
    'total_mocks', totals.total_mocks,
    'mocks_last_30_days', totals.mocks_last_30_days,
    'active_learners', totals.active_learners,
    'leaderboard', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'display_name', leaderboard.display_name,
          'mock_count', leaderboard.mock_count,
          'latest_score', leaderboard.latest_score
        )
        order by leaderboard.rank
      )
      from leaderboard
    ), '[]'::jsonb)
  )
  from totals;
$$;

drop index if exists public.profiles_username_unique_idx;
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles drop column if exists username;

revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, age, cat_target_year, account_type, timezone, onboarding_completed) on public.profiles to authenticated;
