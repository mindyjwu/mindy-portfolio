-- Turnout migration 005: hidden host address.
-- Run AFTER docs/turnout-schema.sql and migration-002 to 004, in the Supabase SQL editor.
--
-- Who can see what:
--   area (a neighborhood the host types, e.g. "East Village")  -> the host, the owner, and everyone invited
--   address + getting-in notes                                  -> the host, and guests who said they are GOING
--   nobody else, not even the circle owner, and not other circle members
-- The address lives in its own table that nothing can read directly (row-level security with no
-- policies), so it cannot be pulled with a query from the browser. It is only returned by
-- circle_state() for the people above, and it is deleted when the host closes the party.

-- The old, never-used column sat on a table every circle member can read in full. Remove it.
alter table events drop column if exists address;

create table if not exists event_locations (
  event_id uuid primary key references events on delete cascade,
  area text,
  address text,
  notes text,
  updated_at timestamptz not null default now()
);
alter table event_locations enable row level security;      -- no policies on purpose: functions only

-- Only the host sets it (not even the owner). Pass empty text to clear a field.
create or replace function set_location(p_event uuid, p_area text default '', p_address text default '', p_notes text default '')
returns void language plpgsql security definer set search_path = public as $$
declare e events;
begin
  select * into e from events where id = p_event;
  if not found or e.host_id is distinct from auth.uid() then raise exception 'only the host can set the location'; end if;
  if e.status not in ('planned', 'confirmed') then raise exception 'this party is already closed'; end if;
  insert into event_locations (event_id, area, address, notes, updated_at)
  values (e.id, nullif(left(trim(coalesce(p_area, '')), 80), ''),
                nullif(left(trim(coalesce(p_address, '')), 200), ''),
                nullif(left(trim(coalesce(p_notes, '')), 300), ''), now())
  on conflict (event_id) do update
    set area = excluded.area, address = excluded.address, notes = excluded.notes, updated_at = now();
end $$;

-- ---------- the party is closed: forget the address ----------
create or replace function close_event(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e events; c circles; u uuid;
begin
  select * into e from events where id = p_event;
  if not found then raise exception 'party not found'; end if;
  select * into c from circles where id = e.circle_id;
  if auth.uid() is distinct from e.host_id and auth.uid() is distinct from c.owner_id then
    raise exception 'only the host or the circle owner can close this party';
  end if;
  if e.status <> 'confirmed' then raise exception 'there is nothing to close yet'; end if;
  update events set status = 'done' where id = e.id;
  delete from event_locations where event_id = e.id;     -- the address is not kept once the party is over
  insert into points_ledger (circle_id, user_id, delta, reason, event_id)
    select e.circle_id, s.user_id, 20, 'attend', e.id from rsvps s
    where s.event_id = e.id and s.status in ('going', 'attended') on conflict do nothing;
  insert into points_ledger (circle_id, user_id, delta, reason, event_id) values (e.circle_id, e.host_id, 60, 'host', e.id) on conflict do nothing;
  for u in select s.user_id from rsvps s where s.event_id = e.id loop perform recalc_points(e.circle_id, u); end loop;
end $$;

-- ---------- circle_state: area for invitees, address only for the host and guests who are going ----------
create or replace function circle_state(p_circle uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare slot date; me uuid := auth.uid(); c circles; ev events; involved boolean := false; can_see boolean := false; res jsonb;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  select * into c from circles where id = p_circle;
  slot := slot_month(p_circle);
  select * into ev from events where circle_id = p_circle and status in ('planned', 'confirmed') and month <= slot order by month limit 1;
  if ev.id is not null then
    involved := ev.host_id = me or c.owner_id = me or exists (select 1 from rsvps where event_id = ev.id and user_id = me);
    -- the exact address is for the host and for guests who said they are going, nobody else (not even the owner)
    can_see := ev.host_id = me or exists (select 1 from rsvps where event_id = ev.id and user_id = me and status in ('going', 'attended'));
  end if;
  res := jsonb_build_object(
    'circle', jsonb_build_object('id', c.id, 'name', c.name, 'capacity', c.capacity, 'cycle', c.cycle, 'owner_id', c.owner_id),
    'slot', slot,
    'me', me,
    'my_blocks', (select coalesce(jsonb_agg(b.blocked), '[]'::jsonb) from blocks b
                  where b.blocker = me and exists (select 1 from memberships x where x.circle_id = p_circle and x.user_id = b.blocked and x.status = 'approved')),
    'open_reports', case when c.owner_id = me
                         then (select count(*) from reports r where r.circle_id = p_circle and r.status = 'open' and r.reported <> me)
                         else 0 end,
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'handle', p.handle, 'platform', p.platform, 'role', m.role, 'points', m.points,
        'skip', (m.skip_until is not null and m.skip_until >= slot),
        'interests', p.interests, 'qualities', p.qualities, 'looking_for', p.looking_for, 'vibe', p.vibe,
        'ratings', (select coalesce(jsonb_object_agg(r.idea_id, r.rating), '{}'::jsonb) from idea_ratings r where r.user_id = m.user_id),
        'hosted', (select coalesce(jsonb_agg(e.month order by e.month), '[]'::jsonb) from events e
                   where e.circle_id = p_circle and e.host_id = m.user_id and e.status = 'done'),
        'in_cycle', exists (select 1 from events e where e.circle_id = p_circle and e.host_id = m.user_id
                            and e.cycle = c.cycle and e.status in ('planned', 'confirmed', 'done')),
        'attended', (select count(*) from rsvps s join events e on e.id = s.event_id
                     where e.circle_id = p_circle and s.user_id = m.user_id and s.status = 'attended')
      ) order by m.joined_at), '[]'::jsonb)
      from memberships m join profiles p on p.id = m.user_id
      where m.circle_id = p_circle and m.status = 'approved'),
    'event', case when ev.id is null then null else jsonb_build_object(
      'id', ev.id, 'host_id', ev.host_id, 'month', ev.month, 'idea_id', ev.idea_id, 'size', ev.size, 'status', ev.status,
      'assign', case when involved then ev.assign else '{}'::jsonb end,
      'area', case when involved then (select l.area from event_locations l where l.event_id = ev.id) end,
      'has_address', case when involved then exists (select 1 from event_locations l where l.event_id = ev.id and l.address is not null) else false end,
      'address', case when can_see then (select jsonb_build_object('address', l.address, 'notes', l.notes)
                                         from event_locations l where l.event_id = ev.id and l.address is not null) end,
      'rsvps', case when involved then (
        select coalesce(jsonb_agg(jsonb_build_object('user_id', s.user_id, 'status', s.status,
                                                     'rated', s.rating is not null) order by s.user_id), '[]'::jsonb)
        from rsvps s where s.event_id = ev.id) else '[]'::jsonb end) end,
    'future', (select coalesce(jsonb_agg(jsonb_build_object('month', e.month, 'host_id', e.host_id) order by e.month), '[]'::jsonb)
               from events e where e.circle_id = p_circle and e.status in ('planned', 'confirmed') and e.month > slot),
    'history', (select coalesce(jsonb_agg(jsonb_build_object('month', h.month, 'host_id', h.host_id, 'idea_id', h.idea_id) order by h.month desc), '[]'::jsonb)
                from (select * from events where circle_id = p_circle and status = 'done' order by month desc limit 12) h),
    'connections', (select coalesce(jsonb_agg(jsonb_build_array(cn.a, cn.b)), '[]'::jsonb) from connections cn
                    where exists (select 1 from memberships x where x.circle_id = p_circle and x.user_id = cn.a and x.status = 'approved')
                      and exists (select 1 from memberships y where y.circle_id = p_circle and y.user_id = cn.b and y.status = 'approved')),
    'feedback', jsonb_build_object(
      'pairs', (select coalesce(jsonb_agg(jsonb_build_object('f', pf.features, 'y', pf.clicked) order by pf.created_at), '[]'::jsonb)
                from pair_feedback pf join events e on e.id = pf.event_id where e.circle_id = p_circle),
      'ideas', (select coalesce(jsonb_agg(jsonb_build_object('idea', e.idea_id, 'rating', s.rating) order by e.month, s.rated_at), '[]'::jsonb)
                from rsvps s join events e on e.id = s.event_id
                where e.circle_id = p_circle and s.rating is not null and e.idea_id is not null)));
  return res;
end $$;

-- Housekeeping for the app operator (not callable from the browser): remove addresses of parties that were
-- never closed. Schedule it with Supabase's cron (pg_cron) if you want it automatic, for example daily.
create or replace function purge_old_locations(p_days int default 14) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from event_locations l using events e
   where e.id = l.event_id and e.month < (current_date - make_interval(days => greatest(p_days, 1)));
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function set_location, close_event, circle_state, purge_old_locations from public, anon;
revoke execute on function purge_old_locations from authenticated;
grant execute on function set_location, close_event, circle_state to authenticated;
