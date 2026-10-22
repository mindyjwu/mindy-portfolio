\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
create function t_uid(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000000'||lpad(n::text,2,'0'))::uuid $$;
create function t_as(n int) returns void language sql as $$ select set_config('request.jwt.claim.sub', t_uid(n)::text, false) $$;
create function t_try(q text) returns text language plpgsql as $$ begin execute q; return 'OK'; exception when others then return 'ERR: '||sqlerrm; end $$;
create function t_check(name text, ok boolean, detail text default '') returns text language sql as $$ select (case when ok then 'PASS  ' else 'FAIL  ' end)||name||case when ok then '' else '   -> '||detail end $$;
insert into auth.users(id,email) select t_uid(n),'u'||n||'@private-mail.test' from generate_series(1,5) n;
insert into profiles(id,handle,platform) select t_uid(n),'@u'||n,'instagram' from generate_series(1,5) n;
select t_as(1); select create_circle('Alert Circle',20) is not null;
select circle_id as cid from my_circles() \gset
select invite_code as code from circles where id=:'cid' \gset
select t_as(n), join_circle(:'code',null) from generate_series(2,4) n;
select t_as(1); select approve_member(:'cid',t_uid(n),true) from generate_series(2,4) n;

-- ===== alerts not set up yet: reporting works, nothing is sent =====
select t_as(2); select report_member(:'cid',t_uid(3),'other','not configured yet',null,false);
select t_check('without settings the report is saved and nothing is sent', (select count(*) from reports)=1 and (select count(*) from net.calls)=0);

-- ===== set up (what the operator does in the SQL editor) =====
insert into app_settings(key,value) values ('report_alert_url','https://example.test/api/turnout-report-alert'),('report_alert_secret','s3cret-value');

select t_as(2); select report_member(:'cid',t_uid(3),'harassment','He kept messaging me.',null,false);
select t_check('one report sends exactly one alert', (select count(*) from net.calls)=1);
select t_check('it goes to the configured address with the shared secret', (select url from net.calls)='https://example.test/api/turnout-report-alert' and (select headers->>'x-turnout-secret' from net.calls)='s3cret-value' and (select headers->>'Content-Type' from net.calls)='application/json');
select t_check('payload names the category, note, both handles and the circle', (select body#>>'{report,category}' from net.calls)='harassment' and (select body#>>'{report,note}' from net.calls)='He kept messaging me.' and (select body#>>'{reported,handle}' from net.calls)='@u3' and (select body#>>'{reporter,handle}' from net.calls)='@u2' and (select body#>>'{circle,name}' from net.calls)='Alert Circle');
select t_check('payload says this is not a test and not about the owner', (select body->>'test' from net.calls)='false' and (select body#>>'{reported,is_owner}' from net.calls)='false');
select t_check('payload carries no ids and no email addresses', position('private-mail' in (select body::text from net.calls))=0 and position(t_uid(2)::text in (select body::text from net.calls))=0 and position(t_uid(3)::text in (select body::text from net.calls))=0);
select t_check('open-report count includes the earlier open report about the same person (2)', (select body#>>'{reported,open_reports}' from net.calls)='2');
select t_as(4); select report_member(:'cid',t_uid(3),'unsafe',null,null,false);
select t_check('another report about the same person raises the count to 3', (select (body#>>'{reported,open_reports}')::int from net.calls order by id desc limit 1)=3);
select t_check('an empty note arrives as null, not as an empty string', (select body#>'{report,note}' from net.calls order by id desc limit 1)='null'::jsonb);

-- ===== about the owner =====
select t_as(3); select report_member(:'cid',t_uid(1),'inappropriate','test',null,true);
select t_check('a report about the owner is flagged as such', (select body#>>'{reported,is_owner}' from net.calls order by id desc limit 1)='true');
select t_check('"also block" still sends just one alert for that report', (select count(*) from net.calls)=3 and exists(select 1 from blocks where blocker=t_uid(3) and blocked=t_uid(1)));

-- ===== the alert can never break reporting =====
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000)
returns bigint language plpgsql as $$ begin raise exception 'the alert service is down'; end $$;
select t_as(2); select report_member(:'cid',t_uid(4),'fake','still saved',null,false);
select t_check('if sending fails, the report is still saved', exists(select 1 from reports where note='still saved'));
create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb, headers jsonb default '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds integer default 5000)
returns bigint language plpgsql as $$ declare i bigint; begin insert into net.calls(url,body,headers) values (url,body,headers) returning id into i; return i; end $$;

-- ===== only the operator can touch the settings or the sender =====
select t_as(2); set role authenticated;
select t_check('RLS: the app cannot read the settings (or the secret)', (select count(*) from app_settings)=0);
select t_check('RLS: the app cannot write settings', t_try($q$insert into app_settings(key,value) values ('report_alert_url','https://evil.test')$q$) like 'ERR%');
select t_check('members cannot call the sender or the test function', t_try('select send_test_report_alert()') like 'ERR: permission denied%' and t_try($q$select send_report_alert('{}'::jsonb)$q$) like 'ERR: permission denied%');
reset role;
set role anon; select t_check('anon cannot call the test function', t_try('select send_test_report_alert()') like 'ERR: permission denied%'); reset role;

-- ===== the operator's test button =====
delete from net.calls;
select send_test_report_alert();
select t_check('the test alert is sent through the same path and marked as a test', (select count(*) from net.calls)=1 and (select body->>'test' from net.calls)='true' and (select headers->>'x-turnout-secret' from net.calls)='s3cret-value');
select t_check('the test reports nothing: no report row was created', (select count(*) from reports where reason='unsafe' and note like 'This is only a test%')=0);

-- ===== rate limit still applies and sends nothing extra =====
delete from net.calls;
select t_as(2); select report_member(:'cid',t_uid(3),'other',null,null,false);select report_member(:'cid',t_uid(3),'other',null,null,false);
select t_check('a rejected (over-limit) report sends no alert', t_try(format('select report_member(%L,%L,%L)',:'cid',t_uid(3),'other')) like 'ERR: you have reached the daily report limit%' and (select count(*) from net.calls)=2);
