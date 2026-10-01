-- Turnout migration 002. Run AFTER docs/schema.sql, in the Supabase SQL editor.
-- Adds: approved-only membership checks, the idea catalog, and the functions the site calls
-- to create a circle, join through an invite link, and approve new people.

create extension if not exists pgcrypto;

-- Only approved members count as "in" a circle.
create or replace function in_circle(c uuid) returns boolean language sql security definer stable
set search_path = public as
$$ select exists (select 1 from memberships where circle_id = c and user_id = auth.uid() and status = 'approved') $$;

-- Let signed-in users read the idea catalog (it's public information).
alter table ideas enable row level security;
drop policy if exists "read ideas" on ideas;
create policy "read ideas" on ideas for select using (true);

create or replace function create_circle(p_name text, p_cap int default 20)
returns circles language plpgsql security definer set search_path = public as $$
declare c circles;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'finish your profile first'; end if;
  insert into circles (name, capacity, owner_id) values (left(trim(p_name),60), greatest(6, least(coalesce(p_cap,20),100)), auth.uid()) returning * into c;
  insert into memberships (circle_id, user_id, role, status) values (c.id, auth.uid(), 'owner', 'approved');
  return c;
end $$;

-- Joining through an invite link puts you in as PENDING until the owner approves.
create or replace function join_circle(p_code text, p_by uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare c circles; n int; inviter uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
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

create or replace function approve_member(p_circle uuid, p_user uuid, p_ok boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from circles where id = p_circle and owner_id = auth.uid()) then raise exception 'only the circle owner can do this'; end if;
  update memberships set status = case when p_ok then 'approved' else 'removed' end
  where circle_id = p_circle and user_id = p_user and role <> 'owner';
end $$;

-- Roster: approved members see approved members; the owner also sees pending people.
create or replace function circle_roster(p_circle uuid)
returns table (user_id uuid, handle text, role text, status text, points int)
language sql security definer stable set search_path = public as $$
  select m.user_id, p.handle, m.role, m.status, m.points
  from memberships m join profiles p on p.id = m.user_id
  where m.circle_id = p_circle
    and (exists (select 1 from memberships me where me.circle_id = p_circle and me.user_id = auth.uid() and me.status = 'approved')
         and (m.status = 'approved' or exists (select 1 from circles c where c.id = p_circle and c.owner_id = auth.uid())))
  order by m.status, m.joined_at
$$;

-- Your own memberships (including pending), with the circle name and invite code once approved.
create or replace function my_circles()
returns table (circle_id uuid, name text, capacity int, invite_code text, role text, status text)
language sql security definer stable set search_path = public as $$
  select c.id, c.name, c.capacity, case when m.status = 'approved' then c.invite_code end, m.role, m.status
  from memberships m join circles c on c.id = m.circle_id
  where m.user_id = auth.uid() and m.status <> 'removed'
$$;

revoke execute on function create_circle, join_circle, approve_member, circle_roster, my_circles from anon;
grant execute on function create_circle, join_circle, approve_member, circle_roster, my_circles to authenticated;

-- Seed the idea catalog (same 14 ideas as the demo).
insert into ideas (id,category,name,features,host_items,guest_items,host_fixed_cost,host_per_guest,guest_cost) values
  ('charcuterie','gather','Charcuterie Night',array['food','wine','cozy','evening','lowEffort'],array['Boards, knives, napkins','A big shared wine pour'],array['A cheese you love','Cured or smoked something','Something pickled or sweet','Crackers or a baguette','Seasonal fruit'],30,6,14),
  ('wine','gather','Blind Wine Tasting',array['wine','games','competitive','evening'],array['Glasses, paper bags, scorecards','Water and plain crackers'],array['A bottle under $20, hidden in a paper bag'],25,5,16),
  ('bagel','gather','Bagel Spread-Off Brunch',array['food','coffee','morning','competitive','handsOn'],array['Warm toasted bagels','Coffee and juice'],array['A homemade spread (sweet)','A homemade spread (savory)','A fruit or veggie topper','A dip nobody expects'],25,5,10),
  ('chili','gather','Potluck Chili Cook-Off',array['food','cozy','competitive','evening'],array['Bowls, spoons, toppings bar','Cornbread'],array['A pot of chili (any style)','Toppings or a side','A drink to share'],20,4,12),
  ('dumpling','gather','Dumpling Folding Party',array['food','handsOn','cozy','evening'],array['Wrappers, a steamer, dipping station','Tea'],array['A filling to fold','A dipping sauce','A side or pickle'],25,7,8),
  ('games','gather','Board Game Night',array['games','lowEffort','evening','competitive'],array['A table and a couple of games','Basic snacks'],array['A game you love','A snack','A drink'],15,4,8),
  ('picnic','gather','Sunset Picnic',array['outdoors','food','lowEffort','evening'],array['Blankets, a speaker, a good spot'],array['Something to share','A drink','A dessert'],15,3,12),
  ('mix','gather','Cocktail & Mocktail Mix-Off',array['wine','music','competitive','handsOn','evening'],array['Ice, glasses, bar tools','Soda and citrus'],array['A spirit or a mixer','Garnish or syrup you made'],35,6,14),
  ('dessert','gather','Dessert Swap',array['food','cozy','lowEffort','handsOn'],array['Plates, tea, coffee','Takeaway boxes'],array['A dozen of something sweet'],15,3,10),
  ('vinyl','gather','Listening Party',array['music','art','cozy','evening','lowEffort'],array['Speaker or turntable','Snacks and a lamp-lit room'],array['One record or playlist with a story','A snack'],10,3,6),
  ('bookbake','gather','Book & Bake Swap',array['books','coffee','food','morning','cozy'],array['Coffee, tea, a shelf-sized swap table'],array['A book to give away','Something baked'],15,4,9),
  ('pilates','move','Sunrise Pilates + Smoothies',array['wellness','sports','morning'],array['Mats and a playlist','Blender and fruit'],array['A mat (or borrow one)','A smoothie add-in'],20,5,6),
  ('yoga','move','Park Yoga & Picnic',array['wellness','outdoors','food','lowEffort'],array['A shady spot, a guest instructor','Water'],array['A mat','A picnic dish to share'],20,3,9),
  ('trail','move','Trail Walk + Coffee',array['outdoors','sports','coffee','morning','lowEffort'],array['A route and a thermos'],array['Snack for the summit','A pastry'],10,2,7)
on conflict (id) do update set category=excluded.category,name=excluded.name,features=excluded.features,host_items=excluded.host_items,guest_items=excluded.guest_items,host_fixed_cost=excluded.host_fixed_cost,host_per_guest=excluded.host_per_guest,guest_cost=excluded.guest_cost;
