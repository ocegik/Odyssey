# Authenticated normalized storage

## Scope and safety boundary

The app uses private normalized tables for signed-in people: `mocks` with `sections`, one optional `analysis` row per mock, `settings`, and `syllabus`. It does **not** migrate, copy, read from, write to, revoke access from, or change policies on the legacy `app_storage` table. The reserved `mocks.legacy_mock_id` remains available for a separately planned, controlled legacy-data import.

## Canonical schema

| Table | Ownership and purpose | Main fields |
| --- | --- | --- |
| `profiles` | One-to-one with `auth.users`; identity display metadata | `id`, `display_name`, `timezone` |
| `mocks` | A user’s parent mock record | `mock_date`, `source`, `manual_total_marks`, `overall_percentile`, `legacy_mock_id` |
| `sections` | One score-level VARC/DILR/Quant record per mock | counts, score, percentile, `question_blocks`, notes |
| `analysis` | Optional detailed review document, one per mock | version, reflection, structure text, question/block `document`, computed `summary` |
| `settings` | Singleton user-level targets, schedule and UI preferences | targets, `section_target_marks`, `mock_schedule`, `layout_width`, `preferences` |
| `syllabus` | One progress record for each user/topic pair | status, notes, resources, revision history, metrics |

The app’s existing detailed-analysis tree and syllabus revision history are intentionally JSONB in Phase 1. They are accepted as a cohesive document today and have no established database query requirement yet; splitting them now would introduce write complexity without a user-facing benefit. The high-value relationships—account → mock → section/analysis and account → topic progress—are relational from the beginning.

An `auth.users` trigger creates the corresponding empty `profiles` row for every new email/password signup. No current dashboard data is written there yet.

## Security model

Every new table has RLS enabled. Only the `authenticated` role is granted access, and each policy requires the row’s owner ID to equal `auth.uid()`. Child `sections` and `analysis` records also have a composite foreign key to their owning `mocks` row, preventing cross-account attachment at the database level.

## Admin dashboard

Run [`supabase/admin-dashboard.sql`](../supabase/admin-dashboard.sql) after the foundation migration to enable `/admin`. It adds `profiles.role` (default `user`) and a mirrored, non-sensitive profile email used only by the account-level table. Promote an administrator in the SQL editor with `update public.profiles set role = 'admin' where email = '…';`.

The database policies are the boundary: admins receive read-only cross-user access to `profiles`, `mocks`, and `sections` only. `analysis`, `settings`, and `syllabus` remain owner-only. Browser access is also guarded and the normal navigation shows the Admin link only after the signed-in profile reports `role = 'admin'`.

The included `vercel.json` rewrites `/admin` to the Vite app shell. Keep this file in the deployment so opening or refreshing the admin URL does not produce a host-level 404.

There is deliberately no anon policy for these tables. The existing public `app_storage` policy remains unchanged during this phase and is out of scope.

## Applying the foundation

1. In Supabase, open **Authentication → Providers → Email** and enable Email. Set the Site URL and allowed redirect URLs for the deployed app. Choose whether email confirmation is required.
2. In the SQL editor, run the existing `supabase/schema.sql` only if `app_storage` has not already been created.
3. Run `supabase/phase-1-foundation.sql`.
4. Deploy the UI with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set. The public anon key is appropriate for the browser client; never expose a service-role key.

## What the UI does now

The header lets a person create an email/password account, sign in, and sign out. The signed-in account scopes every normalized-table read and write. Browser cache and in-memory state for mocks, analysis, settings, and syllabus are cleared at logout (and on any account change) to prevent a previous account’s data appearing for the next browser user.

## Legacy `app_storage` import prerequisites

Before changing the live storage path, prepare an explicit migration that:

1. Exports and backs up each current `app_storage` payload.
2. Requires a signed-in account and records the user’s confirmation of the target account.
3. Transforms normalized mock, section, analysis, settings, and syllabus rows deterministically.
4. Uses `legacy_mock_id` plus upserts so retries cannot duplicate mocks.
5. Validates record counts and representative totals before cutover.
6. Leaves the legacy payload available for a defined recovery window.
