-- One-time, idempotent import of the legacy app_storage `entries` payload.
--
-- Prerequisite: run phase-1-foundation.sql first.
-- Run this in the Supabase SQL editor with a role that can write the private
-- normalized tables. This script only SELECTs from app_storage; it never
-- inserts, updates, deletes, alters, or changes policies on that table.
--
-- Re-running it is safe. Parent rows are identified by
-- (user_id, legacy_mock_id); child rows are identified by their existing
-- unique constraints. The final result set separates source/upsert counts
-- from rows newly inserted in this execution.

begin;

do $$
declare
  entries_payload jsonb;
begin
  select value
    into entries_payload
  from public.app_storage
  where key = 'entries';

  if entries_payload is null then
    raise exception 'Cannot migrate: public.app_storage has no `entries` row.';
  end if;

  if jsonb_typeof(entries_payload -> 'mocks') <> 'array' then
    raise exception 'Cannot migrate: app_storage.entries.mocks must be a JSON array.';
  end if;
end;
$$;

create temporary table legacy_entry_mocks on commit drop as
select
  source_mock ->> 'id' as legacy_mock_id,
  source_mock as payload
from public.app_storage as storage
cross join lateral jsonb_array_elements(storage.value -> 'mocks') as source_mock
where storage.key = 'entries';

do $$
declare
  invalid_mock_count integer;
  invalid_section_count integer;
begin
  select count(*) into invalid_mock_count
  from legacy_entry_mocks
  where nullif(btrim(legacy_mock_id), '') is null
     or nullif(btrim(payload ->> 'date'), '') is null
     or nullif(btrim(payload ->> 'source'), '') is null;

  if invalid_mock_count > 0 then
    raise exception 'Cannot migrate: % mock(s) have no id, date, or source.', invalid_mock_count;
  end if;

  select count(*) into invalid_section_count
  from legacy_entry_mocks
  cross join lateral jsonb_each(coalesce(payload -> 'sections', '{}'::jsonb)) as section_data(section_name, section_payload)
  where section_data.section_name in ('VARC', 'DILR', 'Quant')
    and jsonb_typeof(section_data.section_payload) <> 'object';

  if invalid_section_count > 0 then
    raise exception 'Cannot migrate: % section payload(s) are not JSON objects.', invalid_section_count;
  end if;
end;
$$;

create temporary table legacy_migrated_mocks (
  legacy_mock_id text primary key,
  mock_id uuid not null,
  inserted boolean not null
) on commit drop;

with upserted_mocks as (
  insert into public.mocks (
    user_id,
    legacy_mock_id,
    mock_date,
    source,
    manual_total_marks,
    overall_percentile
  )
  select
    '70ef854f-c8b6-4a45-8024-0d3e290ef9a3'::uuid,
    legacy_mock_id,
    (payload ->> 'date')::date,
    payload ->> 'source',
    nullif(payload ->> 'manualTotalMarks', '')::numeric,
    nullif(payload ->> 'overallPercentile', '')::numeric
  from legacy_entry_mocks
  on conflict (user_id, legacy_mock_id) do update set
    mock_date = excluded.mock_date,
    source = excluded.source,
    manual_total_marks = excluded.manual_total_marks,
    overall_percentile = excluded.overall_percentile
  returning id, legacy_mock_id, (xmax = 0) as inserted
)
insert into legacy_migrated_mocks (legacy_mock_id, mock_id, inserted)
select legacy_mock_id, id, inserted
from upserted_mocks;

create temporary table legacy_migrated_sections (
  mock_id uuid not null,
  section_name text not null,
  inserted boolean not null,
  primary key (mock_id, section_name)
) on commit drop;

with upserted_sections as (
  insert into public.sections (
    user_id,
    mock_id,
    section_name,
    correct,
    attempted,
    total_questions,
    percentile,
    manual_total_marks,
    question_blocks,
    question_set_count,
    notes
  )
  select
    '70ef854f-c8b6-4a45-8024-0d3e290ef9a3'::uuid,
    migrated.mock_id,
    section_data.section_name,
    nullif(section_data.section_payload ->> 'correct', '')::integer,
    nullif(section_data.section_payload ->> 'attempted', '')::integer,
    coalesce(nullif(section_data.section_payload ->> 'totalQuestions', '')::integer, 0),
    nullif(section_data.section_payload ->> 'percentile', '')::numeric,
    nullif(section_data.section_payload ->> 'manualTotalMarks', '')::numeric,
    coalesce(section_data.section_payload -> 'questionBlocks', '[]'::jsonb),
    nullif(section_data.section_payload ->> 'questionSetCount', '')::integer,
    coalesce(section_data.section_payload ->> 'notes', '')
  from legacy_entry_mocks as source_mock
  join legacy_migrated_mocks as migrated using (legacy_mock_id)
  cross join lateral jsonb_each(coalesce(source_mock.payload -> 'sections', '{}'::jsonb)) as section_data(section_name, section_payload)
  where section_data.section_name in ('VARC', 'DILR', 'Quant')
  on conflict (mock_id, section_name) do update set
    user_id = excluded.user_id,
    correct = excluded.correct,
    attempted = excluded.attempted,
    total_questions = excluded.total_questions,
    percentile = excluded.percentile,
    manual_total_marks = excluded.manual_total_marks,
    question_blocks = excluded.question_blocks,
    question_set_count = excluded.question_set_count,
    notes = excluded.notes
  returning mock_id, section_name, (xmax = 0) as inserted
)
insert into legacy_migrated_sections (mock_id, section_name, inserted)
select mock_id, section_name, inserted
from upserted_sections;

create temporary table legacy_migrated_analysis (
  mock_id uuid primary key,
  inserted boolean not null
) on commit drop;

with upserted_analysis as (
  insert into public.analysis (
    user_id,
    mock_id,
    schema_version,
    overall_reflection,
    structure_text,
    document,
    summary
  )
  select
    '70ef854f-c8b6-4a45-8024-0d3e290ef9a3'::uuid,
    migrated.mock_id,
    coalesce(nullif(source_mock.payload -> 'analysis' ->> 'schemaVersion', '')::integer, 3),
    coalesce(source_mock.payload -> 'analysis' ->> 'overallReflection', ''),
    coalesce(source_mock.payload -> 'analysis' ->> 'structureText', ''),
    source_mock.payload -> 'analysis',
    coalesce(source_mock.payload -> 'analysis' -> 'summary', '{}'::jsonb)
  from legacy_entry_mocks as source_mock
  join legacy_migrated_mocks as migrated using (legacy_mock_id)
  where source_mock.payload -> 'analysis' is not null
    and source_mock.payload -> 'analysis' <> 'null'::jsonb
  on conflict (mock_id) do update set
    user_id = excluded.user_id,
    schema_version = excluded.schema_version,
    overall_reflection = excluded.overall_reflection,
    structure_text = excluded.structure_text,
    document = excluded.document,
    summary = excluded.summary
  returning mock_id, (xmax = 0) as inserted
)
insert into legacy_migrated_analysis (mock_id, inserted)
select mock_id, inserted
from upserted_analysis;

-- The expected 13/39 values are deliberately retained as comparison columns.
-- If the legacy payload has changed, this report shows the actual source and
-- post-migration counts instead of silently omitting records.
select
  (select count(*) from legacy_entry_mocks) as mocks_source,
  (select count(*) from legacy_migrated_mocks where inserted) as mocks_inserted,
  (select count(*) from legacy_migrated_mocks) as mocks_upserted,
  (select count(*) from public.mocks m join legacy_migrated_mocks lm on lm.mock_id = m.id) as mocks_after_migration,
  13 as mocks_expected,
  (select count(*) from legacy_migrated_sections) as sections_source,
  (select count(*) from legacy_migrated_sections where inserted) as sections_inserted,
  (select count(*) from public.sections s join legacy_migrated_sections ls on ls.mock_id = s.mock_id and ls.section_name = s.section_name) as sections_after_migration,
  39 as sections_expected,
  (select count(*) from legacy_migrated_analysis) as analysis_source,
  (select count(*) from legacy_migrated_analysis where inserted) as analysis_inserted,
  (select count(*) from public.analysis a join legacy_migrated_analysis la on la.mock_id = a.mock_id) as analysis_after_migration,
  (select count(*) from legacy_migrated_analysis) as analysis_expected,
  case
    when (select count(*) from legacy_entry_mocks) = 13
     and (select count(*) from legacy_migrated_sections) = 39
    then 'matches expected mock/section counts'
    else 'source differs from expected 13 mocks / 39 sections'
  end as count_comparison;

commit;
