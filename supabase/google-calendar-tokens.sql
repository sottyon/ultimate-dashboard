-- Ultimate Dashboard · Google Calendar refresh tokens (already applied to the ultimate-dashboard project on 2026-11-12)
-- One row per account. Only the google-calendar Edge Function (service role) can read or write it:
-- RLS is on with no policies, and browser roles have no grants.
create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  scope text,
  updated_at timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;
alter table public.google_calendar_tokens force row level security;
revoke all on table public.google_calendar_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.google_calendar_tokens to service_role;

-- pg_net lets the database call Edge Functions (used for testing and by the optional text reminders)
create extension if not exists pg_net with schema extensions;
