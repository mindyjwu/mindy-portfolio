\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function t_uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function t_as(n int) returns void language sql as $$ select set_config('request.jwt.claim.sub', t_uid(n)::text, false) $$;
create function t_try(q text) returns text language plpgsql as $$ begin execute q; return 'OK'; exception when others then return 'ERR: '||sqlerrm; end $$;
create function t_check(name text, ok boolean, detail text default '') returns text language sql as $$ select (case when ok then 'PASS  ' else 'FAIL  ' end)||name||case when ok then '' else '   -> '||detail end $$;
create function t_has(n int, cid uuid, needle text) returns boolean language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', t_uid(n)::text, false); return position(needle in circle_state(cid)::text) > 0; end $$;
insert into auth.users(id,email) select t_uid(n),'u'||n||'@t.com' from generate_series(1,7) n;
insert into profiles(id,handle,platform) select t_uid(n),'@u'||n,'instagram' from generate_series(1,7) n;
select t_as(1); select create_circle('Address Circle',20) is not null;
select circle_id as cid from my_circles() \gset
select invite_code as code from circles where id=:'cid' \gset
select t_as(n), join_circle(:'code',null) from generate_series(2,6) n;
select t_as(1); select approve_member(:'cid',t_uid(n),true) from generate_series(2,6) n;     -- u7 is an outsider
-- a party hosted by u2; owner u1 invites u3,u4,u5. u6 is a member who is NOT invited.
insert into events(circle_id,host_id,month,status,cycle) values (:'cid'::uuid,t_uid(2),date_trunc('month',current_date)::date,'planned',1);
select id as eid from events where circle_id=:'cid'::uuid \gset
select t_as(1); select set_party(:'eid','charcuterie',6,array[t_uid(3),t_uid(4),t_uid(5)],'{}'::jsonb);

-- ===== who may set the location =====
select t_as(1); select t_check('the owner cannot set the host''s location', t_try(format('select set_location(%L,%L,%L,%L)',:'eid','Area','1 Secret St','x')) like 'ERR: only the host can set the location%');
select t_as(3); select t_check('a guest cannot set it', t_try(format('select set_location(%L,%L,%L,%L)',:'eid','Area','1 Secret St','x')) like 'ERR: only the host%');
select t_as(7); select t_check('an outsider cannot set it', t_try(format('select set_location(%L,%L,%L,%L)',:'eid','Area','1 Secret St','x')) like 'ERR: only the host%');
select t_as(2); select set_location(:'eid','  East Village ','742 Evergreen Terrace, Apt 4B','Buzzer 4B, door code 1987');
select t_check('host sets area, address and notes (trimmed)', (select area||'|'||address||'|'||notes from event_locations where event_id=:'eid'::uuid)='East Village|742 Evergreen Terrace, Apt 4B|Buzzer 4B, door code 1987');
select set_location(:'eid',repeat('a',200),repeat('b',500),repeat('c',500));
select t_check('lengths are capped (80 / 200 / 300)', (select length(area)||'/'||length(address)||'/'||length(notes) from event_locations where event_id=:'eid'::uuid)='80/200/300');
select set_location(:'eid','East Village','742 Evergreen Terrace, Apt 4B','Buzzer 4B, door code 1987');

-- ===== it cannot be read directly =====
select t_as(3); set role authenticated;
select t_check('RLS: event_locations is unreadable from the browser', (select count(*) from event_locations)=0);
select t_check('RLS: cannot insert a location directly', t_try($q$insert into event_locations(event_id,address) values (gen_random_uuid(),'x')$q$) like 'ERR%');
select t_check('the old events.address column is gone', t_try('select address from events') like 'ERR: column%');
reset role;
select t_as(3); set role authenticated;
select t_check('a guest cannot change the address with a direct update', t_try($q$update event_locations set address='hacked'$q$)='OK' and (select address from event_locations limit 1) is null);
reset role;
select t_check('address untouched after that attempt', (select address from event_locations where event_id=:'eid'::uuid)='742 Evergreen Terrace, Apt 4B');

-- ===== who sees what =====
select t_as(2);
select t_check('host sees the address and notes', (circle_state(:'cid')->'event'->'address'->>'address')='742 Evergreen Terrace, Apt 4B' and (circle_state(:'cid')->'event'->'address'->>'notes') like 'Buzzer%');
select t_as(3);
select t_check('invited guest (not going yet) sees the neighborhood and that an address exists', (circle_state(:'cid')->'event'->>'area')='East Village' and (circle_state(:'cid')->'event'->>'has_address')='true');
select t_check('...but the address is nowhere in what their browser receives', not t_has(3,:'cid','Evergreen') and not t_has(3,:'cid','1987') and not t_has(3,:'cid','4B'));
select t_as(1);
select t_check('the owner (not hosting, not going) sees the area but never the address', (circle_state(:'cid')->'event'->>'area')='East Village' and not t_has(1,:'cid','Evergreen') and not t_has(1,:'cid','1987'));
select t_as(6);
select t_check('a member who was not invited sees neither area nor address', not t_has(6,:'cid','Evergreen') and not t_has(6,:'cid','East Village') and (circle_state(:'cid')->'event'->>'has_address')='false');

-- ===== RSVP flips visibility =====
select t_as(3); select rsvp(:'eid','going');
select t_check('guest who is going sees the address and notes', (circle_state(:'cid')->'event'->'address'->>'address')='742 Evergreen Terrace, Apt 4B' and t_has(3,:'cid','1987'));
select t_as(4); select rsvp(:'eid','declined');
select t_check('guest who declined does not see it', not t_has(4,:'cid','Evergreen'));
select t_as(5);
select t_check('guest who has not answered does not see it', not t_has(5,:'cid','Evergreen'));
select t_as(3); select rsvp(:'eid','declined');
select t_check('a guest who changes to declined loses sight of it again', not t_has(3,:'cid','Evergreen'));
select rsvp(:'eid','going');
select t_check('...and sees it again if they go back to going', t_has(3,:'cid','Evergreen'));

-- ===== being removed from the guest list hides it =====
select t_as(1); select set_party(:'eid',null,null,array[t_uid(4),t_uid(5)],'{}'::jsonb);
select t_check('a guest the host drops no longer sees the area or address', not t_has(3,:'cid','Evergreen') and not t_has(3,:'cid','East Village'));
select t_as(1); select set_party(:'eid',null,null,array[t_uid(3),t_uid(4),t_uid(5)],'{}'::jsonb);
select t_as(3); select rsvp(:'eid','going');

-- ===== a removed member sees nothing =====
select t_as(1); select remove_member(:'cid',t_uid(5));
select t_as(5); select t_check('a removed member cannot load the circle at all', t_try(format('select circle_state(%L)',:'cid')) like 'ERR: not a member%');

-- ===== clearing, closing, and retention =====
select t_as(2); select set_location(:'eid','East Village','','');
select t_check('host can clear the address (area stays)', (select address from event_locations where event_id=:'eid'::uuid) is null and (select area from event_locations where event_id=:'eid'::uuid)='East Village');
select t_check('cleared address is no longer offered to guests', (select (circle_state(:'cid')->'event'->>'has_address')) = 'false' and not t_has(3,:'cid','Evergreen'));
select t_as(2); select set_location(:'eid','East Village','742 Evergreen Terrace, Apt 4B','Buzzer 4B');
select t_as(1); select close_event(:'eid');
select t_check('closing the party deletes the address', (select count(*) from event_locations where event_id=:'eid'::uuid)=0);
select t_as(2); select t_check('cannot set a location on a closed party', t_try(format('select set_location(%L,%L,%L,%L)',:'eid','A','B','C')) like 'ERR: this party is already closed%');

-- host passes the turn: cascade removes the location with the party
select t_as(1); select spin_host(:'cid') as h \gset
select (circle_state(:'cid')->'event'->>'id') as e2 \gset
select n as hn from generate_series(1,6) n where t_uid(n)::text=:'h' \gset
select t_as(:hn); select set_location(:'e2','Somewhere','9 Cascade Rd','');
select pass_turn(:'cid');
select t_check('passing the turn removes the location too', (select count(*) from event_locations where event_id=:'e2'::uuid)=0);

-- operator housekeeping
reset role;
insert into events(circle_id,host_id,month,status,cycle) values (:'cid'::uuid,t_uid(2),(date_trunc('month',current_date) - interval '3 months')::date,'planned',1);
select id as old_e from events where month < current_date - 60 order by month limit 1 \gset
insert into event_locations(event_id,address) values (:'old_e'::uuid,'Old Address');
select purge_old_locations(14) as purged \gset
select t_check('purge_old_locations removes addresses of parties that were never closed', :purged>=1 and (select count(*) from event_locations where event_id=:'old_e'::uuid)=0, 'purged='||:purged);
select t_as(2); set role authenticated;
select t_check('members cannot call the purge', t_try('select purge_old_locations(1)') like 'ERR: permission denied%');
reset role;
set role anon; select t_check('anon cannot set a location or load a circle', t_try(format('select set_location(%L)',gen_random_uuid())) like 'ERR: permission denied%' and t_try(format('select circle_state(%L)',:'cid')) like 'ERR: permission denied%'); reset role;
