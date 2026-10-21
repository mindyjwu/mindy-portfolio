\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function t_uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function t_as(n int) returns void language sql as $$ select set_config('request.jwt.claim.sub', t_uid(n)::text, false) $$;
create function t_try(q text) returns text language plpgsql as $$ begin execute q; return 'OK'; exception when others then return 'ERR: '||sqlerrm; end $$;
create function t_check(name text, ok boolean, detail text default '') returns text language sql as $$ select (case when ok then 'PASS  ' else 'FAIL  ' end)||name||case when ok then '' else '   -> '||detail end $$;
insert into auth.users(id,email) select t_uid(n),'u'||n||'@t.com' from generate_series(1,4) n;
insert into profiles(id,handle,platform) select t_uid(n),'@u'||n,'instagram' from generate_series(1,4) n;
select t_as(1); select create_circle('C3',20) is not null;
select circle_id as cid from my_circles() \gset
select invite_code as code from circles where id=:'cid' \gset
select t_as(n), join_circle(:'code',null) from generate_series(2,4) n;
select t_as(1); select approve_member(:'cid',t_uid(n),true) from generate_series(2,4) n;

-- u2 claims a month three months out
select t_as(2); select claim_month(:'cid',(date_trunc('month',current_date)+interval '3 months')::date);
select t_check('claim for a later month leaves the current slot open', circle_state(:'cid')->'event' is null or (circle_state(:'cid')->>'event') is null or circle_state(:'cid')->'event'='null'::jsonb);
select t_check('claim shows up in future list', jsonb_array_length(circle_state(:'cid')->'future')=1);
select t_as(1); select spin_host(:'cid') as h \gset
select t_check('spin still allowed with only a future claim', :'h' <> '');
select t_check('the claimer is not drawn (already has a turn this cycle)', :'h'::uuid <> t_uid(2));
select t_check('open event is the spun one, claim stays in future', (circle_state(:'cid')->'event'->>'host_id')=:'h' and jsonb_array_length(circle_state(:'cid')->'future')=1);
select t_check('cannot spin while a party is open', t_try(format('select spin_host(%L)',:'cid')) like 'ERR: this month already has a host%');
select t_check('claiming a past month refused', t_try(format('select claim_month(%L,%L)',:'cid',(date_trunc('month',current_date)-interval '2 months')::date)) like 'ERR: that month is in the past%');

-- u2 releases the future claim: allowed, no skip
select t_as(2); select pass_turn(:'cid',(date_trunc('month',current_date)+interval '3 months')::date);
select t_check('release future claim', not exists (select 1 from events where circle_id=:'cid'::uuid and host_id=t_uid(2)) and (select skip_until from memberships where circle_id=:'cid'::uuid and user_id=t_uid(2)) is null);
select t_check('releasing a month you do not host fails', t_try(format('select pass_turn(%L,%L)',:'cid',(date_trunc('month',current_date)+interval '5 months')::date)) like 'ERR: you are not hosting that month%');

-- the current host passes: event removed, skip set, then re-spin excludes them
select n as hn from generate_series(1,4) n where t_uid(n)::text=:'h' \gset
select t_as(:hn); select pass_turn(:'cid');
select t_check('host passes: current event removed and host skipped', not exists (select 1 from events where circle_id=:'cid'::uuid and status='planned' and month<=current_date) and (select skip_until from memberships where circle_id=:'cid'::uuid and user_id=t_uid(:hn)) is not null);
select t_as(1); select spin_host(:'cid') as h2 \gset
select t_check('re-spin picks someone else', :'h2' <> :'h');
-- claim the current slot while it has a host: refused; set_skip works
select t_as(3); select t_check('cannot claim the slot that already has a host', t_try(format('select claim_month(%L,current_date)',:'cid')) like 'ERR: that month already has a host%');
select set_skip(:'cid',true);
select t_check('set_skip marks skipping in state', (select bool_or((m->>'skip')::boolean) from jsonb_array_elements(circle_state(:'cid')->'members') m where m->>'user_id'=t_uid(3)::text));
select set_skip(:'cid',false);
select t_check('set_skip(false) clears it', (select bool_or((m->>'skip')::boolean) from jsonb_array_elements(circle_state(:'cid')->'members') m where m->>'user_id'=t_uid(3)::text) is not true);
-- close the open party, then a claim for the new current slot becomes the open event
select (circle_state(:'cid')->'event'->>'id') as e2 \gset
select t_as(1); select set_party(:'e2','games',null,array[]::uuid[]||t_uid(1),'{}'::jsonb);
select close_event(:'e2');
select n as cn from generate_series(1,4) n where not exists (select 1 from events where circle_id=:'cid'::uuid and host_id=t_uid(n) and cycle=1 and status in ('planned','confirmed','done')) limit 1 \gset
\if :{?cn}
select t_as(:cn); select claim_month(:'cid',current_date + 40);
select t_check('claiming the next slot makes it the open event', (circle_state(:'cid')->'event'->>'host_id')=t_uid(:cn)::text);
\endif
select t_check('RLS: cannot see another circle', t_try(format('select circle_state(%L)',gen_random_uuid())) like 'ERR: not a member%');
