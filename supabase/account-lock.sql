-- Ultimate Dashboard · account lock (already applied to the ultimate-dashboard project on 2026-11-12)
-- Only the existing account can use the dashboard. Every attempt to create a new
-- account is refused by the database itself, whatever the Authentication settings
-- say (sign-up form, magic link, Google/other providers, anonymous sign-in, invites).
-- Also removes table access the site never uses.
--
-- To add another account later on purpose, run first:
--   drop trigger block_new_accounts on auth.users;
-- create the account, then run this whole file again.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.block_new_accounts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'New accounts are disabled for this dashboard.'
    using errcode = 'insufficient_privilege';
end
$$;
revoke all on function private.block_new_accounts() from public, anon, authenticated;

drop trigger if exists block_new_accounts on auth.users;
create trigger block_new_accounts
  before insert on auth.users
  for each row execute function private.block_new_accounts();

revoke all on table public.dashboard_records from anon;
revoke truncate, references, trigger, delete on table public.dashboard_records from authenticated;
grant select, insert, update on table public.dashboard_records to authenticated;
alter default privileges in schema public revoke all on tables from anon;
