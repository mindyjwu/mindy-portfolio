-- Turnout migration 007: phone verification.
-- Run AFTER docs/turnout-schema.sql and migration-002 to 006, in the Supabase SQL editor.
-- Setup steps (text-message provider, rate limits, turning the requirement on) are in docs/turnout-phone.md.
--
-- Sending and checking the text-message code is done by Supabase Auth. This migration adds:
--   * a switch, OFF by default, that makes a verified phone number required to create a circle, join one,
--     or be approved into one. It is off so you can't lock everyone out before text messages work.
--   * a "verified" flag on members so the screen can show a badge. The phone number itself is never
--     returned to anyone but its owner.
-- Existing members are not removed or blocked when you switch it on; it applies to new entries.
--
-- Turn the requirement on or off (operator only, in the SQL editor):
--   insert into app_settings (key, value) values ('require_phone_verification', 'true')
--   on conflict (key) do update set value = excluded.value, updated_at = now();     -- 'false' turns it off

-- Needs app_settings from migration 006.
create or replace function phone_required() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select lower(trim(value)) = 'true' from app_settings where key = 'require_phone_verification'), false)
$$;

-- Supabase Auth sets phone_confirmed_at when someone proves they own the number.
create or replace function is_phone_verified(p_user uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users u where u.id = p_user and u.phone_confirmed_at is not null)
$$;

-- What the screen needs to know about you. No number is returned.
create or replace function phone_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('required', phone_required(), 'verified', is_phone_verified(auth.uid()))
$$;

-- ---------- the requirement, enforced on the server ----------
create or replace function create_circle(p_name text, p_cap int default 20)
returns circles language plpgsql security definer set search_path = public as $$
declare c circles;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if phone_required() and not is_phone_verified(auth.uid()) then raise exception 'verify your phone number first'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'finish your profile first'; end if;
  insert into circles (name, capacity, owner_id) values (left(trim(p_name),60), greatest(6, least(coalesce(p_cap,20),100)), auth.uid()) returning * into c;
  insert into memberships (circle_id, user_id, role, status) values (c.id, auth.uid(), 'owner', 'approved');
  return c;
end $$;

create or replace function join_circle(p_code text, p_by uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare c circles; n int; inviter uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if phone_required() and not is_phone_verified(auth.uid()) then raise exception 'verify your phone number first'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'finish your profile first'; end if;
  select * into c from circles where invite_code = p_code;
  if not found then raise exception 'invite link not valid'; end if;
  select count(*) into n from memberships where circle_id = c.id and status = 'approved';
  if n >= c.capacity then raise exception 'this circle is full'; end if;
  -- only trust "invited by" if that person is really an approved member
  select user_id into inviter from memberships where circle_id = c.id and user_id = p_by and status = 'approved';
  insert into memberships (circle_id, user_id, role, status, invited_by)
  values (c.id, auth.uid(), 'member', 'pending', inviter)
  on conflict (circle_id, user_id) do nothing;
  return c.name;
end $$;

-- Approval is also checked, so someone who joined before the switch came on can't slip in unverified.
create or replace function approve_member(p_circle uuid, p_user uuid, p_ok boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from circles where id = p_circle and owner_id = auth.uid()) then raise exception 'only the circle owner can do this'; end if;
  if p_ok and phone_required() and not is_phone_verified(p_user) then raise exception 'that person has not verified their phone number yet'; end if;
  update memberships set status = case when p_ok then 'approved' else 'removed' end
  where circle_id = p_circle and user_id = p_user and role <> 'owner';
end $$;

-- ---------- circle_state: members now carry a "verified" flag (never the number) ----------
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
        'verified', is_phone_verified(m.user_id),
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

revoke execute on function phone_required, is_phone_verified from public, anon, authenticated;
revoke execute on function phone_status, create_circle, join_circle, approve_member, circle_state from public, anon;
grant execute on function phone_status, create_circle, join_circle, approve_member, circle_state to authenticated;
