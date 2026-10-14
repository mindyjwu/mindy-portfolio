-- Turnout migration 006: email alert when a safety report is filed.
-- Run AFTER docs/turnout-schema.sql and migration-002 to 005, in the Supabase SQL editor.
-- Setup steps are in docs/turnout-alerts.md.
--
-- How it works: a trigger fires on every new row in `reports` and asks the database's
-- built-in HTTP queue (pg_net) to POST the details to the serverless function at
-- api/turnout-report-alert.js, which sends you an email. The request is queued and sent
-- after the report is saved, and any failure in here is caught: filing a report can never
-- fail because the alert couldn't be sent.

-- pg_net is Supabase's HTTP-from-the-database extension. (Skipped quietly on a plain PostgreSQL.)
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available here; alerts will not send until it is enabled (Database > Extensions)';
end $$;

-- Operator settings. Row-level security with no policies: nothing in the app can read or write
-- this table; only you, in the SQL editor.
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

-- What gets sent. Handles only: no emails, no ids, no addresses.
create or replace function report_alert_payload(r reports, is_test boolean default false) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'kind', 'report',
    'test', is_test,
    'report', jsonb_build_object(
      'id', r.id, 'category', r.reason, 'note', r.note, 'created_at', r.created_at,
      'event_month', (select e.month from events e where e.id = r.event_id)),
    'reported', jsonb_build_object(
      'handle', (select p.handle from profiles p where p.id = r.reported),
      'is_owner', coalesce((select c.owner_id = r.reported from circles c where c.id = r.circle_id), false),
      'open_reports', (select count(*) from reports x
                       where x.reported = r.reported and x.circle_id is not distinct from r.circle_id and x.status = 'open')),
    'reporter', jsonb_build_object('handle', (select p.handle from profiles p where p.id = r.reporter)),
    'circle', jsonb_build_object('name', (select c.name from circles c where c.id = r.circle_id)))
$$;

create or replace function send_report_alert(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select value into url from app_settings where key = 'report_alert_url';
  select value into secret from app_settings where key = 'report_alert_secret';
  if url is null or secret is null then return; end if;          -- alerts not set up yet
  perform net.http_post(
    url := url,
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-turnout-secret', secret),
    timeout_milliseconds := 5000);
end $$;

create or replace function notify_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform send_report_alert(report_alert_payload(new));
  exception when others then
    raise warning 'report alert could not be queued: %', sqlerrm;   -- never block the report
  end;
  return new;
end $$;

drop trigger if exists reports_notify on reports;
create trigger reports_notify after insert on reports for each row execute function notify_report();

-- Sends a clearly marked TEST email through the same path. Run it yourself in the SQL editor:
--   select send_test_report_alert();
create or replace function send_test_report_alert() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform send_report_alert(jsonb_build_object(
    'kind', 'report', 'test', true,
    'report', jsonb_build_object('id', 0, 'category', 'unsafe', 'note', 'This is only a test. Nothing was reported.', 'created_at', now(), 'event_month', null),
    'reported', jsonb_build_object('handle', '@test.member', 'is_owner', false, 'open_reports', 1),
    'reporter', jsonb_build_object('handle', '@test.reporter'),
    'circle', jsonb_build_object('name', 'Test circle')));
end $$;

-- None of these are for the browser.
revoke execute on function report_alert_payload, send_report_alert, notify_report, send_test_report_alert from public, anon, authenticated;
