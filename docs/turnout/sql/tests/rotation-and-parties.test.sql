\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
-- helpers (test only)
create function t_uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function t_as(n int) returns void language sql as $$ select set_config('request.jwt.claim.sub', t_uid(n)::text, false) $$;
create function t_try(q text) returns text language plpgsql as $$ begin execute q; return 'OK'; exception when others then return 'ERR: '||sqlerrm; end $$;
create function t_check(name text, ok boolean, detail text default '') returns text language sql as $$ select (case when ok then 'PASS  ' else 'FAIL  ' end)||name||case when ok then '' else '   -> '||detail end $$;

insert into auth.users(id,email) select t_uid(n), 'u'||n||'@t.com' from generate_series(1,6) n;
select t_as(1);
insert into profiles(id,handle,platform,interests,qualities,looking_for,vibe) select t_uid(n),'@u'||n,'instagram',array['food'],array['funny'],array['curious'],jsonb_build_object('energy',n%5+1,'depth',3) from generate_series(1,6) n;
select t_as(1); select create_circle('Test Circle',20);
select circle_id as cid from my_circles() \gset
select invite_code as code from (select c.invite_code from circles c where c.id=:'cid') q \gset
-- 2..5 join and get approved; 6 stays pending
select t_as(n), join_circle(:'code', t_uid(1)) from generate_series(2,6) n;
select t_as(1);
select approve_member(:'cid', t_uid(n), true) from generate_series(2,5) n;

select t_as(6); select t_check('pending member cannot read circle_state', t_try(format('select circle_state(%L)', :'cid')) like 'ERR: not a member%');
select t_as(2); select t_check('circle_state lists 5 approved members', jsonb_array_length(circle_state(:'cid')->'members')=5, (circle_state(:'cid')->'members'->0)::text);
select t_check('pending user not in members', not (circle_state(:'cid')->>'members') like '%@u6%');

-- spin
select t_as(2); select spin_host(:'cid') as host1 \gset
select t_check('spin returns an approved member', :'host1' in (select t_uid(n)::text from generate_series(1,5) n));
select t_check('second spin same month is refused', t_try(format('select spin_host(%L)', :'cid')) like 'ERR: this month already has a host%');
select (circle_state(:'cid')->'event'->>'id') as eid \gset
select t_check('event is planned with the spun host', circle_state(:'cid')->'event'->>'host_id' = :'host1' and circle_state(:'cid')->'event'->>'status'='planned');

-- planning permissions: pick a non-host non-owner
select n as outsider from generate_series(2,5) n where t_uid(n)::text <> :'host1' limit 1 \gset
select t_as(:outsider);
select t_check('non-host non-owner cannot plan', t_try(format('select set_party(%L,%L,6,array[%L::uuid],%L::jsonb)', :'eid','charcuterie',t_uid(1),'{}')) like 'ERR: only the host or the circle owner%');
-- owner (u1) plans: guests = host + u1 + u3 + u4 (maybe overlap with host) ; assign items
select t_as(1);
select set_party(:'eid','charcuterie',6,array[t_uid(1),t_uid(3),t_uid(4)],jsonb_build_object(t_uid(3)::text,'a cheese',t_uid(4)::text,'crackers'));
select t_check('party becomes confirmed with invites', circle_state(:'cid')->'event'->>'status'='confirmed');
select t_check('host auto-added to guests', exists (select 1 from rsvps where event_id=:'eid'::uuid and user_id=:'host1'::uuid and status='going'));
select t_check('rejects unapproved guest (pending u6)', t_try(format('select set_party(%L,null,null,array[%L::uuid],null)', :'eid', t_uid(6))) like 'ERR: every guest must be an approved member%');
select t_check('rejects unknown idea', t_try(format('select set_party(%L,%L)', :'eid','nope')) like 'ERR: unknown idea%');

-- visibility: a member who is not invited sees no rsvps/assign
select n as uninv from generate_series(1,5) n where not exists (select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(n)) and t_uid(n)::text<>:'host1' and n<>1 limit 1 \gset
\if :{?uninv}
select t_as(:uninv);
select t_check('uninvited member sees no guest list', jsonb_array_length(circle_state(:'cid')->'event'->'rsvps')=0 and (circle_state(:'cid')->'event'->'assign')='{}'::jsonb);
\else
select 'SKIP  uninvited visibility (everyone invited in this draw)';
\endif

-- rsvp
select t_as(3); select rsvp(:'eid','going');
select t_check('invited guest can RSVP going', exists (select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(3) and status='going'));
select t_as(6); select t_check('uninvited cannot RSVP', t_try(format('select rsvp(%L,%L)', :'eid','going')) like 'ERR%');

-- rate: u3 (going) rates and locks u4? u4 is only invited -> no lock. lock host instead.
select t_as(3);
select rate_event(:'eid',5,array[:'host1'::uuid, t_uid(4)], jsonb_build_array(jsonb_build_object('other',:'host1','clicked',true,'features',jsonb_build_array(.9,.8,.7,.6,.5,.4,.3,.2,.9,.5)), jsonb_build_object('other',t_uid(4),'clicked',false,'features',jsonb_build_array(.1,.1,.1,.1,.1,.1,.1,.1,.1,.1)))) as pts \gset
select t_check('rating awards attend+rate+1 lock = 45 points', :pts=45 or :'host1'=t_uid(3)::text, 'got '||:pts);
select t_check('lock-in created only for people who were going (host yes, invited-only no)', (select count(*) from connections where met_event=:'eid'::uuid)=case when :'host1'=t_uid(3)::text then 0 else 1 end);
select t_check('only the eligible feedback row stored (invited-only excluded)', (select count(*) from pair_feedback where event_id=:'eid'::uuid)=case when :'host1'=t_uid(3)::text then 0 else 1 end);
select t_check('cannot rate twice', t_try(format('select rate_event(%L,4)', :'eid')) like 'ERR: you already rated%');
select t_as(4); select t_check('invited-but-not-RSVPd cannot rate', t_try(format('select rate_event(%L,4)', :'eid')) like 'ERR: you were not at this party%' or :'host1'=t_uid(4)::text, t_try(format('select rate_event(%L,4)', :'eid')));
select t_as(3); select t_check('bad rating refused', t_try(format('select rate_event(%L,9)', :'eid')) like 'ERR%');

-- close
select t_as(3); select t_check('non-host cannot close', t_try(format('select close_event(%L)', :'eid')) like 'ERR: only the host%' or :'host1'=t_uid(3)::text);
select t_as(1); select close_event(:'eid');
select t_check('event is done', (select status from events where id=:'eid'::uuid)='done');
select t_check('host got 60 + 20 attend', (select points from memberships where circle_id=:'cid'::uuid and user_id=:'host1'::uuid) >= 80);
select t_check('closing twice refused', t_try(format('select close_event(%L)', :'eid')) like 'ERR: there is nothing to close%');

-- run the whole cycle: 5 members; first event already used one host. Spin/close 4 more times; nobody repeats.
create temp table hosts(n int, host uuid);
insert into hosts values (1, :'host1'::uuid);
do $$ declare i int; h uuid; e uuid; cid uuid := (select circle_id from my_circles() limit 1); begin
  for i in 2..5 loop
    perform t_as(1); h := spin_host(cid); insert into hosts values (i,h);
    select id into e from events where circle_id=cid and status='planned' limit 1;
    perform set_party(e,'games',6,array[]::uuid[] || h,'{}'::jsonb);
    perform close_event(e);
  end loop; end $$;
select t_check('five different hosts in one cycle', (select count(distinct host) from hosts)=5, (select string_agg(host::text,',') from hosts));
select t_check('still cycle 1', circle_state(:'cid')->'circle'->>'cycle'='1');
select t_as(1); select spin_host(:'cid') as host6 \gset
select t_check('6th spin starts cycle 2', circle_state(:'cid')->'circle'->>'cycle'='2' and :'host6' in (select t_uid(n)::text from generate_series(1,5) n));
select (circle_state(:'cid')->'event'->>'id') as eid6 \gset
select t_check('months advanced one at a time', (select count(distinct month) from events where circle_id=:'cid'::uuid)=6);

-- pass turn and skip
select n as hostn from generate_series(1,5) n where t_uid(n)::text=:'host6' \gset
select t_as(:hostn); select pass_turn(:'cid');
select t_check('pass removes the event', not exists (select 1 from events where id=:'eid6'::uuid));
select t_as(1); select spin_host(:'cid') as host7 \gset
select t_check('after pass, a different host is drawn', :'host7' <> :'host6');
-- claim
select n as freen from generate_series(1,5) n where not exists (select 1 from events where circle_id=:'cid'::uuid and host_id=t_uid(n) and cycle=2) limit 1 \gset
\if :{?freen}
select t_as(:freen); select claim_month(:'cid', (date_trunc('month',current_date) + interval '14 months')::date);
select t_check('claim creates a future planned event', exists (select 1 from events where circle_id=:'cid'::uuid and host_id=t_uid(:freen) and status='planned' and month > current_date + 300));
select t_check('second claim in same cycle refused', t_try(format('select claim_month(%L,%L)', :'cid', (date_trunc('month',current_date) + interval '15 months')::date)) like 'ERR: you have already%');
select t_check('future claim appears in state', jsonb_array_length(circle_state(:'cid')->'future')>=1);
\endif

-- onboarding points
select t_as(2); insert into idea_ratings(user_id,idea_id,rating) values (t_uid(2),'charcuterie',5),(t_uid(2),'wine',4) on conflict do nothing;
select award_onboarding(:'cid') as p1 \gset
select award_onboarding(:'cid') as p2 \gset
select t_check('onboarding points are awarded once (idempotent)', :p1=:p2 and :p1>=26, 'p1='||:p1||' p2='||:p2);

-- feedback replay payload
select t_as(1);
select t_check('state includes feedback replay data', jsonb_array_length(circle_state(:'cid')->'feedback'->'ideas')>=1);

-- RLS: direct writes must fail for signed-in users
select t_as(2); set role authenticated;
select t_check('cannot read points_ledger directly', (select count(*) from points_ledger)=0);
select t_check('cannot insert into points_ledger', t_try($q$insert into points_ledger(circle_id,user_id,delta,reason) values (gen_random_uuid(),gen_random_uuid(),999,'x')$q$) like 'ERR%');
select t_check('cannot write pair_feedback directly', t_try($q$insert into pair_feedback(event_id,rater,other,clicked,features) values (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),true,'[]')$q$) like 'ERR%');
select t_check('cannot create events directly', t_try($q$insert into events(circle_id,host_id,month) values (gen_random_uuid(),gen_random_uuid(),current_date)$q$) like 'ERR%');
select t_check('cannot edit own points', t_try($q$update memberships set points=9999 where user_id=auth.uid()$q$)='OK' and (select max(points) from memberships where user_id=auth.uid()) < 9999);
reset role;
set role anon; select t_check('anon blocked from RPCs', t_try(format('select spin_host(%L)', :'cid')) like 'ERR: permission denied%'); reset role;
