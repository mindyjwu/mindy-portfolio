-- Turnout migration 004: report and block.
-- Run AFTER docs/turnout-schema.sql, migration-002.sql and migration-003.sql, in the Supabase SQL editor.
--
-- Block: private, applies in every circle. A blocked pair is never placed in the same party. The
-- server enforces it when the guest list is saved, so a modified browser cannot bypass it, and it
-- never tells anyone who blocked whom.
-- Report: a category, an optional note, and (optionally) the party it happened at. The circle
-- owner can review reports about other members; the reporter's identity is not shown to them.
-- Reports about the owner can only be read by whoever runs the database (the app operator).
-- Nothing is automatic: reports flag people for a human to review but never remove anyone.

create table if not exists blocks (
  blocker uuid not null references profiles on delete cascade,
  blocked uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table blocks enable row level security;
drop policy if exists "see my blocks" on blocks;
create policy "see my blocks" on blocks for select using (blocker = auth.uid());   -- only the blocks you made

-- reports.reason holds the category (unsafe, harassment, inappropriate, fake, other)
alter table reports add column if not exists circle_id uuid references circles on delete set null;
alter table reports add column if not exists note text;
alter table reports add column if not exists status text not null default 'open';
alter table reports add column if not exists handled_by uuid;
alter table reports add column if not exists handled_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reports_status_check') then
    alter table reports add constraint reports_status_check check (status in ('open', 'resolved', 'dismissed'));
  end if;
end $$;
-- Reports used to be insertable directly. They now go through report_member() only.
drop policy if exists "file reports" on reports;

create or replace function is_blocked_pair(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;

-- Returns true if you and that person are both in a party that is still open, so the screen can say so.
create or replace function block_member(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_user is null or p_user = me then raise exception 'you cannot block yourself'; end if;
  if not exists (select 1 from memberships a join memberships b on a.circle_id = b.circle_id
                 where a.user_id = me and a.status = 'approved' and b.user_id = p_user and b.status in ('approved', 'pending')) then
    raise exception 'that person is not in one of your circles';
  end if;
  insert into blocks (blocker, blocked) values (me, p_user) on conflict do nothing;
  return exists (select 1 from events e
                 join rsvps r1 on r1.event_id = e.id and r1.user_id = me
                 join rsvps r2 on r2.event_id = e.id and r2.user_id = p_user
                 where e.status in ('planned', 'confirmed'));
end $$;

create or replace function unblock_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from blocks where blocker = auth.uid() and blocked = p_user;
end $$;

create or replace function report_member(p_circle uuid, p_user uuid, p_category text, p_note text default null,
                                         p_event uuid default null, p_also_block boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); ev uuid;
begin
  if not in_circle(p_circle) then raise exception 'not a member of this circle'; end if;
  if p_user is null or p_user = me then raise exception 'you cannot report yourself'; end if;
  if p_category not in ('unsafe', 'harassment', 'inappropriate', 'fake', 'other') then raise exception 'choose what happened'; end if;
  if not exists (select 1 from memberships where circle_id = p_circle and user_id = p_user and status in ('approved', 'pending')) then
    raise exception 'that person is not in this circle';
  end if;
  if (select count(*) from reports where reporter = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'you have reached the daily report limit';
  end if;
  select id into ev from events where id = p_event and circle_id = p_circle;
  insert into reports (reporter, reported, event_id, reason, circle_id, note)
    values (me, p_user, ev, p_category, p_circle, nullif(left(trim(coalesce(p_note, '')), 500), ''));
  if p_also_block then perform block_member(p_user); end if;
end $$;

-- The owner's view: reports about other members, newest open first. Reporter identity is left out on purpose.
create or replace function circle_reports(p_circle uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not exists (select 1 from circles where id = p_circle and owner_id = me) then raise exception 'only the circle owner can see reports'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
            'id', r.id, 'reported', r.reported, 'handle', p.handle, 'category', r.reason, 'note', r.note,
            'status', r.status, 'created_at', r.created_at,
            'open_for_member', (select count(*) from reports x where x.circle_id = p_circle and x.reported = r.reported and x.status = 'open')
          ) order by (r.status = 'open') desc, r.created_at desc), '[]'::jsonb)
          from reports r join profiles p on p.id = r.reported
          where r.circle_id = p_circle and r.reported <> me);
end $$;

create or replace function resolve_report(p_report bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare r reports;
begin
  if p_status not in ('resolved', 'dismissed') then raise exception 'status must be resolved or dismissed'; end if;
  select * into r from reports where id = p_report;
  if not found or not exists (select 1 from circles where id = r.circle_id and owner_id = auth.uid()) or r.reported = auth.uid() then
    raise exception 'only the circle owner can do this';
  end if;
  update reports set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_report;
end $$;

-- Owner removes someone: they lose access, their invites go, and a party they were hosting is cancelled.
create or replace function remove_member(p_circle uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from circles where id = p_circle and owner_id = auth.uid()) then raise exception 'only the circle owner can do this'; end if;
  if p_user = auth.uid() then raise exception 'you cannot remove yourself as the owner'; end if;
  update memberships set status = 'removed' where circle_id = p_circle and user_id = p_user and role <> 'owner';
  delete from events where circle_id = p_circle and host_id = p_user and status in ('planned', 'confirmed');
  delete from rsvps where user_id = p_user
    and event_id in (select id from events where circle_id = p_circle and status in ('planned', 'confirmed'));
end $$;

-- ---------- set_party now enforces blocks ----------
-- Anyone who would share the party with someone they have a block with (either direction) is quietly left
-- out. The host is always kept; otherwise the earlier name in the list wins. Returns how many were left out.
drop function if exists set_party(uuid, text, int, uuid[], jsonb);
create function set_party(p_event uuid, p_idea text default null, p_size int default null,
                          p_guests uuid[] default null, p_assign jsonb default null)
returns int language plpgsql security definer set search_path = public as $$
declare e events; c circles; guests uuid[]; u uuid; dropped int := 0;
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
      if exists (select 1 from unnest(p_guests) g
                 where not exists (select 1 from memberships where circle_id = e.circle_id and user_id = g and status = 'approved')) then
        raise exception 'every guest must be an approved member';
      end if;
      guests := array[e.host_id];
      foreach u in array p_guests loop
        continue when u = e.host_id;
        if exists (select 1 from unnest(guests) k where is_blocked_pair(u, k)) then
          dropped := dropped + 1;
        elsif not (u = any (guests)) then
          guests := guests || u;
        end if;
      end loop;
      delete from rsvps where event_id = e.id and not (user_id = any (guests));
      insert into rsvps (event_id, user_id, status, brings)
        select e.id, g, case when g = e.host_id then 'going' else 'invited' end, p_assign ->> (g::text)
        from unnest(guests) g
      on conflict (event_id, user_id) do update set brings = excluded.brings;
      update events set status = 'confirmed' where id = e.id;
    end if;
  end if;
  return dropped;
end $$;

-- ---------- rating: never lock in a blocked person ----------
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
    if other <> me and not is_blocked_pair(me, other)
       and exists (select 1 from rsvps where event_id = e.id and user_id = other and status in ('going', 'attended')) then
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

-- ---------- circle_state: also returns your own blocks and, for the owner, how many reports are open ----------
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

revoke execute on function is_blocked_pair, block_member, unblock_member, report_member, circle_reports, resolve_report,
  remove_member, set_party, rate_event, circle_state from public, anon;
grant execute on function block_member, unblock_member, report_member, circle_reports, resolve_report,
  remove_member, set_party, rate_event, circle_state to authenticated;
