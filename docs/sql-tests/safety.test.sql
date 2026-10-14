\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function t_uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function t_as(n int) returns void language sql as $$ select set_config('request.jwt.claim.sub', t_uid(n)::text, false) $$;
create function t_try(q text) returns text language plpgsql as $$ begin execute q; return 'OK'; exception when others then return 'ERR: '||sqlerrm; end $$;
create function t_check(name text, ok boolean, detail text default '') returns text language sql as $$ select (case when ok then 'PASS  ' else 'FAIL  ' end)||name||case when ok then '' else '   -> '||detail end $$;
insert into auth.users(id,email) select t_uid(n),'u'||n||'@t.com' from generate_series(1,8) n;
insert into profiles(id,handle,platform) select t_uid(n),'@u'||n,'instagram' from generate_series(1,8) n;
select t_as(1); select create_circle('Safety Circle',20) is not null;
select circle_id as cid from my_circles() \gset
select invite_code as code from circles where id=:'cid' \gset
select t_as(n), join_circle(:'code',null) from generate_series(2,6) n;
select t_as(1); select approve_member(:'cid',t_uid(n),true) from generate_series(2,5) n;   -- u6 stays pending; u7,u8 are outsiders

-- ===== block basics =====
select t_as(2);
select t_check('blocking someone with no shared party returns false', block_member(t_uid(3))=false);
select t_check('cannot block yourself', t_try(format('select block_member(%L)',t_uid(2))) like 'ERR: you cannot block yourself%');
select t_check('cannot block a stranger outside your circles (no probing of ids)', t_try(format('select block_member(%L)',t_uid(7))) like 'ERR: that person is not in one of your circles%');
select t_check('blocking is idempotent', block_member(t_uid(3))=false and (select count(*) from blocks where blocker=t_uid(2))=1);
select t_check('a pending member can be blocked', block_member(t_uid(6))=false);
select unblock_member(t_uid(6));
select t_check('unblock removes it', (select count(*) from blocks where blocker=t_uid(2))=1);
set role authenticated;
select t_check('RLS: I can read only the blocks I made', (select count(*) from blocks)=1);
reset role;
select t_as(3); set role authenticated;
select t_check('RLS: the blocked person sees nothing about it', (select count(*) from blocks)=0);
select t_check('RLS: cannot insert a block directly', t_try($q$insert into blocks(blocker,blocked) values (auth.uid(), gen_random_uuid())$q$) like 'ERR%');
reset role;
select t_as(3); select t_check('circle_state hides the blocker from the blocked person', (circle_state(:'cid')->'my_blocks')='[]'::jsonb);
select t_as(2); select t_check('circle_state tells me my own blocks', (circle_state(:'cid')->'my_blocks')=jsonb_build_array(t_uid(3)::text));
select unblock_member(t_uid(3));

-- ===== set_party enforces blocks =====
select t_as(1); select spin_host(:'cid') as host \gset
select (circle_state(:'cid')->'event'->>'id') as eid \gset
-- three guests who are not the host: a, b, c
select string_agg(n::text, ',' order by n) as others from generate_series(2,5) n where t_uid(n)::text<>:'host' \gset
select split_part(:'others',',',1)::int as a, split_part(:'others',',',2)::int as b, split_part(:'others',',',3)::int as c \gset
select n as hn from generate_series(1,5) n where t_uid(n)::text=:'host' \gset
-- a blocks b: if both are invited, b (listed second) is left out
select t_as(:a); select block_member(t_uid(:b));
select t_as(1); select set_party(:'eid','games',6,array[t_uid(:a),t_uid(:b),t_uid(:c)],'{}'::jsonb) as d1 \gset
select t_check('block pair: later guest is quietly left out and count returned', :d1=1);
select t_check('block pair: rsvps keep a and c, not b', exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:a)) and exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:c)) and not exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:b)));
select set_party(:'eid',null,null,array[t_uid(:b),t_uid(:a),t_uid(:c)],'{}'::jsonb) as d2 \gset
select t_check('block works in both directions (blocker listed second is the one dropped)', :d2=1 and not exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:a)) and exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:b)));
select t_as(:a); select unblock_member(t_uid(:b));
-- a guest blocked the host: the guest is dropped, the host is never dropped
select t_as(:c); select block_member(:'host'::uuid);
select t_as(1); select set_party(:'eid',null,null,array[t_uid(:c),t_uid(:a)],'{}'::jsonb) as d3 \gset
select t_check('guest who blocked the host is left out; host stays', :d3=1 and not exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:c)) and exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=:'host'::uuid));
select t_as(:c); select unblock_member(:'host'::uuid);
-- the host blocked a guest
select t_as(:hn); select block_member(t_uid(:a));
select t_as(1); select set_party(:'eid',null,null,array[t_uid(:a),t_uid(:b)],'{}'::jsonb) as d4 \gset
select t_check('guest the host blocked is left out', :d4=1 and not exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:a)));
select t_as(:hn); select unblock_member(t_uid(:a));
select t_as(1); select t_check('no blocks, no drops', set_party(:'eid',null,null,array[t_uid(:a),t_uid(:b),t_uid(:c)],'{}'::jsonb)=0);
-- block_member reports a shared open party
select t_as(:a); select t_check('blocking someone in the same open party says so', block_member(t_uid(:b))=true);
select unblock_member(t_uid(:b));

-- ===== reports =====
select t_as(:a);
select t_check('report requires a valid category', t_try(format('select report_member(%L,%L,%L)',:'cid',t_uid(:b),'rude')) like 'ERR: choose what happened%');
select t_check('cannot report yourself', t_try(format('select report_member(%L,%L,%L)',:'cid',t_uid(:a),'other')) like 'ERR: you cannot report yourself%');
select t_check('cannot report someone outside the circle', t_try(format('select report_member(%L,%L,%L)',:'cid',t_uid(7),'other')) like 'ERR: that person is not in this circle%');
select report_member(:'cid',t_uid(:b),'harassment',repeat('x',700),:'eid'::uuid,true);
select t_check('report stored with category and note capped at 500', (select reason from reports where reporter=t_uid(:a) limit 1)='harassment' and (select length(note) from reports where reporter=t_uid(:a) limit 1)=500);
select t_check('report links to the party when it belongs to the circle', (select event_id from reports where reporter=t_uid(:a) limit 1)=:'eid'::uuid);
select t_check('"also block" blocks them', exists(select 1 from blocks where blocker=t_uid(:a) and blocked=t_uid(:b)));
select report_member(:'cid',t_uid(:c),'other',null,gen_random_uuid(),false);
select t_check('an event id from elsewhere is dropped, not trusted', (select event_id from reports where reporter=t_uid(:a) and reported=t_uid(:c))is null);
select t_check('without "also block" no block is made', not exists(select 1 from blocks where blocker=t_uid(:a) and blocked=t_uid(:c)));
select report_member(:'cid',t_uid(:c),'unsafe',null,null,false);select report_member(:'cid',t_uid(:c),'unsafe',null,null,false);select report_member(:'cid',t_uid(:c),'unsafe',null,null,false);
select t_check('daily report limit (5) is enforced', t_try(format('select report_member(%L,%L,%L)',:'cid',t_uid(:c),'unsafe')) like 'ERR: you have reached the daily report limit%');
set role authenticated;
select t_check('RLS: reporters cannot read the reports table', (select count(*) from reports)=0);
select t_check('RLS: reports cannot be inserted directly', t_try($q$insert into reports(reporter,reported,reason) values (auth.uid(), gen_random_uuid(), 'other')$q$) like 'ERR%');
reset role;

-- ===== owner review =====
select t_as(:b); select t_check('non-owner cannot list reports', t_try(format('select circle_reports(%L)',:'cid')) like 'ERR: only the circle owner%');
select t_as(1);
select t_check('owner sees reports about other members', jsonb_array_length(circle_reports(:'cid'))=5, jsonb_array_length(circle_reports(:'cid'))::text);
select t_check('reporter identity is not in what the owner sees', position(t_uid(:a)::text in circle_reports(:'cid')::text)=0);
select t_check('owner sees how many open reports a member has', (select max((r->>'open_for_member')::int) from jsonb_array_elements(circle_reports(:'cid')) r)=4);
select t_check('circle_state shows the owner the open-report count', (circle_state(:'cid')->>'open_reports')='5');
select t_as(:a); select t_check('other members see 0 open reports', (circle_state(:'cid')->>'open_reports')='0');
-- a report about the owner is invisible to the owner
select t_as(:b); select report_member(:'cid',t_uid(1),'inappropriate',null,null,false);
select t_as(1);
select t_check('reports about the owner are hidden from the owner', jsonb_array_length(circle_reports(:'cid'))=5);
select (select r->>'id' from jsonb_array_elements(circle_reports(:'cid')) r limit 1) as rid \gset
select resolve_report(:'rid'::bigint,'resolved');
select t_check('owner can resolve a report', (select status from reports where id=:'rid'::bigint)='resolved' and (select handled_by from reports where id=:'rid'::bigint)=t_uid(1));
select t_check('resolved reports no longer count as open', (circle_state(:'cid')->>'open_reports')='4');
select t_check('bad status refused', t_try(format('select resolve_report(%s,%L)',:'rid','banned')) like 'ERR: status must be%');
select t_as(:b); select t_check('non-owner cannot resolve', t_try(format('select resolve_report(%s,%L)',:'rid','dismissed')) like 'ERR: only the circle owner%');
select t_as(1); select (select id::text from reports where reported=t_uid(1) limit 1) as orid \gset
select t_check('owner cannot resolve a report about themselves', t_try(format('select resolve_report(%s,%L)',:'orid','dismissed')) like 'ERR: only the circle owner%');

-- ===== remove member =====
select t_as(:b); select t_check('non-owner cannot remove anyone', t_try(format('select remove_member(%L,%L)',:'cid',t_uid(:c))) like 'ERR: only the circle owner%');
select t_as(1); select t_check('owner cannot remove themselves', t_try(format('select remove_member(%L,%L)',:'cid',t_uid(1))) like 'ERR: you cannot remove yourself%');
select remove_member(:'cid',t_uid(:c));
select t_check('removed member loses access', (select t_try(format('select circle_state(%L)',:'cid')) from (select t_as(:c)) x) like 'ERR: not a member%');
select t_as(1);
select t_check('removed member is out of the open party', not exists(select 1 from rsvps where event_id=:'eid'::uuid and user_id=t_uid(:c)));
select remove_member(:'cid',:'host'::uuid) where :'host'::uuid <> t_uid(1);
select t_check('removing the host of an open party cancels that party', :hn=1 or not exists(select 1 from events where id=:'eid'::uuid));

-- ===== rating never locks in a blocked pair =====
delete from blocks;
delete from events where status in ('planned','confirmed');
insert into auth.users(id,email) select t_uid(n),'u'||n||'@t.com' from generate_series(9,10) n;
insert into profiles(id,handle,platform) select t_uid(n),'@u'||n,'instagram' from generate_series(9,10) n;
insert into memberships(circle_id,user_id,role,status) select :'cid'::uuid,t_uid(n),'member','approved' from generate_series(9,10) n;
select t_as(1); select spin_host(:'cid') as h2 \gset
select (circle_state(:'cid')->'event'->>'id') as e2 \gset
select set_party(:'e2','games',6,array[t_uid(9),t_uid(10)],'{}'::jsonb);
select t_as(9); select rsvp(:'e2','going');
select t_as(10); select rsvp(:'e2','going');
select block_member(t_uid(9));                       -- 10 blocks 9 after they were invited together
select t_as(9); select rate_event(:'e2',4,array[t_uid(10)],'[]'::jsonb);
select t_check('a person cannot lock in someone who blocked them', not exists(select 1 from connections where met_event=:'e2'::uuid and ((a=t_uid(9) and b=t_uid(10)) or (a=t_uid(10) and b=t_uid(9)))));
select t_as(10); select rate_event(:'e2',4,array[t_uid(9)],'[]'::jsonb);
select t_check('and the blocker cannot lock them in either', not exists(select 1 from connections where met_event=:'e2'::uuid and ((a=t_uid(9) and b=t_uid(10)) or (a=t_uid(10) and b=t_uid(9)))));
select t_check('ratings still count even when the lock-in is skipped', (select count(*) from rsvps where event_id=:'e2'::uuid and rating is not null)=2);
set role anon; select t_check('anon cannot block or report', t_try(format('select block_member(%L)',t_uid(2))) like 'ERR: permission denied%' and t_try(format('select report_member(%L,%L,%L)',:'cid',t_uid(2),'other')) like 'ERR: permission denied%'); reset role;
