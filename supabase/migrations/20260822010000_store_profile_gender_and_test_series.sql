-- Store the personalisation fields as first-class profile metadata, rather
-- than only inside the settings JSON payload. `test_series` covers both test
-- series and coaching providers selected in the Account and onboarding forms.

alter table public.profiles
  add column if not exists gender text;
alter table public.profiles
  add column if not exists test_series text[] not null default '{}'::text[];

alter table public.profiles
  drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('female', 'male', 'non_binary', 'prefer_not_to_say'));

-- Preserve values collected before these columns existed. Do not overwrite a
-- profile that has already been updated through the new fields.
update public.profiles profile
set
  gender = coalesce(profile.gender, nullif(settings.preferences ->> 'gender', '')),
  test_series = case
    when cardinality(profile.test_series) = 0 then coalesce(
      array(
        select jsonb_array_elements_text(
          case
            when jsonb_typeof(settings.preferences -> 'testSeries') = 'array'
              then settings.preferences -> 'testSeries'
            else '[]'::jsonb
          end
        )
      ),
      '{}'::text[]
    )
    else profile.test_series
  end
from public.settings settings
where settings.user_id = profile.id;

revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, age, gender, test_series, cat_target_year, account_type, timezone, onboarding_completed) on public.profiles to authenticated;
