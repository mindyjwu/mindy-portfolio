\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function t_uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function t_as(n int) returns void language sql as $$ select set_config('request.jwt.claim.sub', t_uid(n)::text, false) $$;
create function t_try(q text) returns text language plpgsql as $$ begin execute q; return 'OK'; exception when others then return 'ERR: '||sqlerrm; end $$;
create function t_check(name text, ok boolean, detail text default '') returns text language sql as $$ select (case when ok then 'PASS  ' else 'FAIL  ' end)||name||case when ok then '' else '   -> '||detail end $$;
create function t_verify(n int) returns void language sql as $$ update auth.users set phone='+1555010'||lpad(n::text,4,'0'), phone_confirmed_at=now() where id=t_uid(n) $$;
insert into auth.users(id,email) select t_uid(n),'u'||n||'@t.test' from generate_series(1,7) n;
insert into profiles(id,handle,platform) select t_uid(n),'@u'||n,'instagram' from generate_series(1,7) n;
select t_verify(1);   -- the owner is verified; the others start unverified

-- ===== switch OFF (the default): everything works as before =====
select t_check('by default the requirement is off', (select count(*) from app_settings where key='require_phone_verification')=0);
select t_as(6); select t_check('off: an unverified person can create a circle', t_try($q$select create_circle('Off Circle',20)$q$)='OK');
select t_as(1); select create_circle('Main Circle',20) is not null;
select id as cid from circles where name='Main Circle' \gset
select invite_code as code from circles where id=:'cid' \gset
select t_as(2); select t_check('off: an unverified person can join', t_try(format('select join_circle(%L,null)',:'code'))='OK');
select t_as(3); select join_circle(:'code',null);
select t_as(1); select t_check('off: an unverified pending member can be approved', t_try(format('select approve_member(%L,%L,true)',:'cid',t_uid(2)))='OK');

-- ===== phone_status =====
select t_as(2); select t_check('phone_status says not required, not verified', phone_status()='{"required": false, "verified": false}'::jsonb, phone_status()::text);
select t_as(1); select t_check('phone_status says verified for a verified person', (phone_status()->>'verified')='true');
set role anon; select t_check('anon cannot call phone_status', t_try('select phone_status()') like 'ERR: permission denied%'); reset role;

-- ===== switch ON =====
insert into app_settings(key,value) values ('require_phone_verification','true');
select t_as(1); select t_check('on: phone_status now says required', (phone_status()->>'required')='true');
select t_as(4); select t_check('on: an unverified person cannot create a circle', t_try($q$select create_circle('Nope',20)$q$) like 'ERR: verify your phone number first%');
select t_check('on: an unverified person cannot join', t_try(format('select join_circle(%L,null)',:'code')) like 'ERR: verify your phone number first%');
select t_check('on: ...and no membership row was created by the refused join', not exists(select 1 from memberships where user_id=t_uid(4)));
select t_as(1); select t_check('on: cannot approve a pending member who is not verified', t_try(format('select approve_member(%L,%L,true)',:'cid',t_uid(3))) like 'ERR: that person has not verified their phone number yet%');
select t_check('on: the owner can still decline an unverified pending member', t_try(format('select approve_member(%L,%L,false)',:'cid',t_uid(3)))='OK');
select t_as(2); select t_check('on: someone already approved is not locked out (they can still spin)', t_try(format('select spin_host(%L)',:'cid'))='OK');

-- verifying changes the answers
select t_verify(3); select t_verify(4);
select t_as(3); select t_check('verified person can join again', t_try(format('select join_circle(%L,null)',:'code'))='OK');
select t_as(4); select t_check('on: a verified person can join', t_try(format('select join_circle(%L,null)',:'code'))='OK');
select t_as(1); select t_check('on: a verified pending member can be approved', t_try(format('select approve_member(%L,%L,true)',:'cid',t_uid(4)))='OK');
select t_verify(5); select t_as(5);
select t_check('on: a verified person can create a circle', t_try($q$select create_circle('Verified Circle',20)$q$)='OK');
select t_as(5); select t_check('phone_status reflects verification for the caller', phone_status()='{"required": true, "verified": true}'::jsonb);

-- ===== the badge, and no number leaks =====
select t_as(4);
select t_check('circle_state marks verified members', (select (m->>'verified')::boolean from jsonb_array_elements(circle_state(:'cid')->'members') m where m->>'user_id'=t_uid(1)::text)=true and (select (m->>'verified')::boolean from jsonb_array_elements(circle_state(:'cid')->'members') m where m->>'user_id'=t_uid(2)::text)=false);
select t_check('no phone number appears in anything a member receives', position('555010' in circle_state(:'cid')::text)=0 and position('555010' in phone_status()::text)=0);
set role authenticated;
select t_check('a member cannot read anyone''s phone number from the auth table', t_try('select phone from auth.users') like 'ERR: permission denied%');
select t_check('members cannot call the internal check or the setting reader', t_try(format('select is_phone_verified(%L)',t_uid(1))) like 'ERR: permission denied%' and t_try('select phone_required()') like 'ERR: permission denied%');
select t_check('members cannot change the requirement', t_try($q$update app_settings set value='false'$q$)='OK' and (select count(*) from app_settings)=0);
reset role;
select t_check('...and the setting is still on', phone_required());

-- ===== how the setting is read =====
update app_settings set value='  TRUE ' where key='require_phone_verification';
select t_check('"TRUE" with spaces still counts as on', phone_required());
update app_settings set value='yes' where key='require_phone_verification';
select t_check('anything other than true counts as off (fails open, not closed)', not phone_required());
update app_settings set value='true' where key='require_phone_verification';
delete from app_settings where key='require_phone_verification';
select t_as(7); select t_check('removing the setting turns it off again', t_try($q$select create_circle('Back Off',20)$q$)='OK');

-- ===== a phone number can belong to only one account =====
select t_check('the same number cannot be attached to two accounts', t_try(format('update auth.users set phone=(select phone from auth.users where id=%L) where id=%L',t_uid(5),t_uid(6))) like 'ERR: duplicate key%');
