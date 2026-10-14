-- Turnout migration 003: rotation, parties and matching on real circle members.
-- Run AFTER docs/turnout-schema.sql and docs/migration-002.sql, in the Supabase SQL editor.
--
-- Design: the server is the source of truth for who hosts, who is invited, points and
-- feedback. The browser still computes the guest matching (it needs members' answers to do
-- that), then saves the result through set_party(). Models are NOT stored: the browser
-- replays the circle's raw feedback on load, so there is no model state to tamper with.

-- ---------- columns and indexes ----------
alter table circles add column if not exists cycle int not null default 1;
alter table events add column if not exists cycle int;
alter table events add column if not exists assign jsonb not null default '{}'::jsonb;  -- guest -> what they bring
alter table events add column if not exists created_at timestamptz not null default now();
alter table rsvps add column if not exists rating smallint check (rating between 1 and 5);
alter table rsvps add column if not exists rated_at timestamptz;
alter table pair_feedback add column if not exists created_at timestamptz not null default now();

create unique index if not exists points_event_once on points_ledger (user_id, event_id, reason) where event_id is not null;
create unique index if not exists points_circle_once on points_ledger (user_id, circle_id, reason) where event_id is null;

-- ---------- tighten access ----------
-- Ledgers had no row-level security; with it on and no policies, only the functions below can touch them.
alter table points_ledger enable row level security;
alter table pot_ledger enable row level security;
-- Feedback used to be writable directly. Writes now go through rate_event() only.
drop policy if exists "own feedback" on pair_feedback;
drop policy if exists "read own feedback" on pair_feedback;
create policy "read own feedback" on pair_feedback for select using (rater = auth.uid());

-- ---------- helpers ----------
-- The month the next party is for: this month, or the month after the latest finished party.
create or replace function slot_month(p_circle uuid) returns date
language sql stable security definer set search_path = public as $$
  select greatest(
    date_trunc('month', current_date)::date,
    coalesce((select (max(month) + interval '1 month')::date from events where circle_id = p_circle and status = 'done'),
             date_trunc('month', current_date)::date))
$$;

create or replace function recalc_points(p_circle uuid, p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare total int;
begin
  select coalesce(sum(delta), 0) into total from points_ledger where circle_id = p_circle and user_id = p_user;
  update memberships set points = total where circle_id = p_circle and user_id = p_user;
  return total;
end $$;

-- Who can host right now, and how likely each is. Nobody hosts twice per cycle; the longer
-- since you last hosted, the slightly higher your weight. Points are deliberately NOT used.
create or replace function spin_pool(p_circle uuid, p_slot date, p_cycle int, p_ignore_cycle boolean default false)
returns table (user_id uuid, w numeric)
language sql stable security definer set search_path = public as $$
  select m.user_id,
         1 + 0.25 * least(coalesce(((extract(year from age(p_slot, h.last)) * 12) + extract(month from age(p_slot, h.last)))::numeric, 6), 12)
  from memberships m
  left join lateral (select max(e.month) as last from events e
                     where e.circle_id = p_circle and e.host_id = m.user_id and e.status = 'done') h on true
  where m.circle_id = p_circle and m.status = 'approved'
    and (m.skip_until is null or m.skip_until < p_slot)
    and (p_ignore_cycle or not exists (
          select 1 from events e where e.circle_id = p_circle and e.host_id = m.user_id
            and e.cycle = p_cycle and e.status in ('planned', 'confirmed', 'done')))
$$;

-- ---------- rotation ----------
create or replace function spin_host(p_circle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare slot date; cyc int; host uuid;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  perform 1 from circles where id = p_circle for update;           -- one spin at a time
  slot := slot_month(p_circle);
  if exists (select 1 from events where circle_id = p_circle and status in ('planned', 'confirmed') and month <= slot) then
    raise exception 'this month already has a host';
  end if;
  select cycle into cyc from circles where id = p_circle;
  if not exists (select 1 from spin_pool(p_circle, slot, cyc)) then
    cyc := cyc + 1;                                                  -- everyone has hosted: new cycle
    update circles set cycle = cyc where id = p_circle;
  end if;
  select x.user_id into host from (
    select sp.user_id, sum(sp.w) over (order by sp.user_id) as cw, sum(sp.w) over () as tot
    from spin_pool(p_circle, slot, cyc) sp) x
  where x.cw >= random() * x.tot order by x.cw limit 1;
  if host is null then raise exception 'nobody is available to host this month'; end if;
  insert into events (circle_id, host_id, month, status, cycle) values (p_circle, host, slot, 'planned', cyc);
  return host;
end $$;

create or replace function claim_month(p_circle uuid, p_month date) returns void
language plpgsql security definer set search_path = public as $$
declare slot date; m date; cyc int;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  perform 1 from circles where id = p_circle for update;
  slot := slot_month(p_circle);
  m := date_trunc('month', p_month)::date;
  if m < slot then raise exception 'that month is in the past'; end if;
  if exists (select 1 from events where circle_id = p_circle and month = m) then raise exception 'that month already has a host'; end if;
  select cycle into cyc from circles where id = p_circle;
  if exists (select 1 from events where circle_id = p_circle and host_id = auth.uid() and cycle = cyc and status in ('planned', 'confirmed', 'done')) then
    raise exception 'you have already hosted or claimed a turn this cycle';
  end if;
  insert into events (circle_id, host_id, month, status, cycle) values (p_circle, auth.uid(), m, 'planned', cyc);
end $$;

-- The host steps back. They stay in the pool for later, but not for this month's spin.
-- With no month: step back from the current party. With a month: release a future claim.
create or replace function pass_turn(p_circle uuid, p_month date default null) returns void
language plpgsql security definer set search_path = public as $$
declare e events; slot date := slot_month(p_circle);
begin
  select * into e from events
   where circle_id = p_circle and host_id = auth.uid() and status in ('planned', 'confirmed')
     and ((p_month is null and month <= slot) or (p_month is not null and month = date_trunc('month', p_month)::date))
   order by month limit 1;
  if not found then raise exception 'you are not hosting that month'; end if;
  delete from events where id = e.id;
  if e.month <= slot then
    update memberships set skip_until = e.month where circle_id = p_circle and user_id = auth.uid();
  end if;
end $$;

create or replace function set_skip(p_circle uuid, p_skip boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  update memberships set skip_until = case when p_skip then slot_month(p_circle) else null end
   where circle_id = p_circle and user_id = auth.uid();
end $$;

-- ---------- planning a party ----------
-- Any argument left null is left unchanged. An empty guest list clears the invites.
create or replace function set_party(p_event uuid, p_idea text default null, p_size int default null,
                                     p_guests uuid[] default null, p_assign jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare e events; c circles; guests uuid[];
begin
  select * into e from events where id = p_event;
  if not found then raise exception 'party not found'; end if;
  select * into c from circles where id = e.circle_id;
  if auth.uid() is distinct from e.host_id and auth.uid() is distinct from c.owner_id then
    raise exception 'only the host or the circle owner can plan this party';
  end if;
  if e.status not in ('planned', 'confirmed') then raise exception 'this party is already closed'; end if;
  if p_idea is not null then
    if not exists (select 1 from ideas where id = p_idea) then raise exception 'unknown idea'; end if;
    update events set idea_id = p_idea where id = e.id;
  end if;
  if p_size is not null then update events set size = greatest(2, least(p_size, 100)) where id = e.id; end if;
  if p_assign is not null then update events set assign = p_assign where id = e.id; end if;
  if p_guests is not null then
    if cardinality(p_guests) = 0 then
      delete from rsvps where event_id = e.id;
      update events set status = 'planned' where id = e.id;
    else
      select array(select distinct x from unnest(p_guests || e.host_id) x) into guests;
      if exists (select 1 from unnest(guests) u
                 where not exists (select 1 from memberships where circle_id = e.circle_id and user_id = u and status = 'approved')) then
        raise exception 'every guest must be an approved member';
      end if;
      delete from rsvps where event_id = e.id and not (user_id = any (guests));
      insert into rsvps (event_id, user_id, status, brings)
        select e.id, u, case when u = e.host_id then 'going' else 'invited' end, p_assign ->> (u::text)
        from unnest(guests) u
      on conflict (event_id, user_id) do update set brings = excluded.brings;
      update events set status = 'confirmed' where id = e.id;
    end if;
  end if;
end $$;

create or replace function rsvp(p_event uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare e events;
begin
  if p_status not in ('going', 'declined') then raise exception 'status must be going or declined'; end if;
  select * into e from events where id = p_event;
  if not found or e.status = 'done' then raise exception 'this party is not open'; end if;
  update rsvps set status = p_status
   where event_id = p_event and user_id = auth.uid() and status in ('invited', 'going', 'declined');
  if not found then raise exception 'you are not invited to this party'; end if;
end $$;

-- ---------- after the party ----------
-- p_met: people you met for the first time and want to keep.
-- p_feedback: [{"other": uuid, "clicked": bool, "features": [numbers]}] training rows for the matcher.
create or replace function rate_event(p_event uuid, p_rating int, p_met uuid[] default '{}', p_feedback jsonb default '[]')
returns int language plpgsql security definer set search_path = public as $$
declare e events; r rsvps; me uuid := auth.uid(); other uuid;
begin
  select * into e from events where id = p_event;
  if not found or not in_circle(e.circle_id) then raise exception 'party not found'; end if;
  if e.status not in ('confirmed', 'done') then raise exception 'this party has not happened yet'; end if;
  select * into r from rsvps where event_id = e.id and user_id = me;
  if not found or r.status = 'declined' or r.status = 'invited' then raise exception 'you were not at this party'; end if;
  if r.rating is not null then raise exception 'you already rated this party'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'rating must be 1 to 5'; end if;

  update rsvps set rating = p_rating, rated_at = now(), status = 'attended' where event_id = e.id and user_id = me;
  if e.idea_id is not null then
    insert into idea_ratings (user_id, idea_id, rating, source) values (me, e.idea_id, p_rating, 'post_party')
    on conflict (user_id, idea_id) do update set rating = excluded.rating, source = 'post_party', updated_at = now();
  end if;
  insert into points_ledger (circle_id, user_id, delta, reason, event_id) values (e.circle_id, me, 20, 'attend', e.id) on conflict do nothing;
  insert into points_ledger (circle_id, user_id, delta, reason, event_id) values (e.circle_id, me, 10, 'rate', e.id) on conflict do nothing;

  foreach other in array coalesce(p_met, '{}') loop
    if other <> me and exists (select 1 from rsvps where event_id = e.id and user_id = other and status in ('going', 'attended')) then
      insert into connections (a, b, met_event) values (least(me, other), greatest(me, other), e.id) on conflict do nothing;
      insert into points_ledger (circle_id, user_id, delta, reason, event_id)
        values (e.circle_id, me, 15, 'lock:' || other::text, e.id) on conflict do nothing;
    end if;
  end loop;

  insert into pair_feedback (event_id, rater, other, clicked, features)
    select e.id, me, (x ->> 'other')::uuid, (x ->> 'clicked')::boolean, x -> 'features'
    from jsonb_array_elements(case when jsonb_typeof(p_feedback) = 'array' then p_feedback else '[]'::jsonb end) x
    where jsonb_typeof(x -> 'features') = 'array' and jsonb_array_length(x -> 'features') <= 20
      and (x ->> 'other')::uuid <> me
      and exists (select 1 from rsvps where event_id = e.id and user_id = (x ->> 'other')::uuid and status in ('going', 'attended'))
  on conflict do nothing;

  return recalc_points(e.circle_id, me);
end $$;

-- The host (or owner) closes the party: attendance and hosting points, and the next turn opens up.
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
  insert into points_ledger (circle_id, user_id, delta, reason, event_id)
    select e.circle_id, s.user_id, 20, 'attend', e.id from rsvps s
    where s.event_id = e.id and s.status in ('going', 'attended') on conflict do nothing;
  insert into points_ledger (circle_id, user_id, delta, reason, event_id) values (e.circle_id, e.host_id, 60, 'host', e.id) on conflict do nothing;
  for u in select s.user_id from rsvps s where s.event_id = e.id loop perform recalc_points(e.circle_id, u); end loop;
end $$;

-- One-time points for filling in your picks and the vibe quiz.
create or replace function award_onboarding(p_circle uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int; has_vibe boolean;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  select count(*) into n from idea_ratings where user_id = auth.uid();
  select coalesce(vibe <> '{}'::jsonb, false) into has_vibe from profiles where id = auth.uid();
  if n > 0 then
    insert into points_ledger (circle_id, user_id, delta, reason) values (p_circle, auth.uid(), 3 * least(n, 14), 'onboarding_ratings')
    on conflict (user_id, circle_id, reason) where event_id is null do update set delta = excluded.delta;
  end if;
  if has_vibe then
    insert into points_ledger (circle_id, user_id, delta, reason) values (p_circle, auth.uid(), 20, 'onboarding_vibe')
    on conflict (user_id, circle_id, reason) where event_id is null do nothing;
  end if;
  return recalc_points(p_circle, auth.uid());
end $$;

-- ---------- one call to load everything the screen needs ----------
-- Members' answers are included because matching runs in the browser. Anyone approved into a
-- circle can therefore see the other members' answers. Raw event details (guest list, what each
-- person brings) are only returned to invited guests, the host and the owner.
create or replace function circle_state(p_circle uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare slot date; me uuid := auth.uid(); c circles; ev events; involved boolean := false; res jsonb;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  select * into c from circles where id = p_circle;
  slot := slot_month(p_circle);
  select * into ev from events where circle_id = p_circle and status in ('planned', 'confirmed') and month <= slot order by month limit 1;
  if ev.id is not null then
    involved := ev.host_id = me or c.owner_id = me or exists (select 1 from rsvps where event_id = ev.id and user_id = me);
  end if;
  res := jsonb_build_object(
    'circle', jsonb_build_object('id', c.id, 'name', c.name, 'capacity', c.capacity, 'cycle', c.cycle, 'owner_id', c.owner_id),
    'slot', slot,
    'me', me,
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

revoke execute on function slot_month, recalc_points, spin_pool, spin_host, claim_month, pass_turn(uuid, date), set_skip, set_party,
  rsvp, rate_event, close_event, award_onboarding, circle_state from public, anon;
grant execute on function spin_host, claim_month, pass_turn(uuid, date), set_skip, set_party, rsvp, rate_event, close_event,
  award_onboarding, circle_state to authenticated;
