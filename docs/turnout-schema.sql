-- Turnout: Postgres schema for Supabase. Run in the Supabase SQL editor.
-- Auth: Supabase Auth (phone OTP). auth.users.id is the person's id.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null,
  platform text check (platform in ('instagram','phone','tiktok','other')),
  interests text[] default '{}',
  qualities text[] default '{}',        -- "friends describe me as"
  looking_for text[] default '{}',      -- "in new friends I look for"
  vibe jsonb default '{}',              -- {energy:1-5, depth:1-5, ...}
  vibe_embedding real[],                -- optional, filled by the ML service
  created_at timestamptz default now()
);

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity int default 20 check (capacity between 6 and 100),
  invite_code text unique default encode(gen_random_bytes(5),'hex'),
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table memberships (
  circle_id uuid references circles on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text default 'member' check (role in ('owner','member')),
  status text default 'pending' check (status in ('pending','approved','removed')),  -- owner approves invitees
  invited_by uuid references profiles,   -- the friend whose invite link they used
  points int default 0 check (points >= 0),
  skip_until date,
  joined_at timestamptz default now(),
  primary key (circle_id, user_id)
);

create table ideas (                       -- the catalog of 10-20 party ideas
  id text primary key, category text, name text, features text[],
  host_items text[], guest_items text[], host_fixed_cost int, host_per_guest int, guest_cost int
);

create table idea_ratings (                -- onboarding votes AND post-party re-rates
  user_id uuid references profiles on delete cascade,
  idea_id text references ideas,
  rating smallint check (rating between 1 and 5),
  source text default 'onboarding' check (source in ('onboarding','post_party')),
  updated_at timestamptz default now(),
  primary key (user_id, idea_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles on delete cascade,
  host_id uuid references profiles,
  idea_id text references ideas,
  month date not null,                    -- first of month
  starts_at timestamptz,
  address text,                           -- NEVER exposed until RSVP is confirmed (see policy)
  size int,
  status text default 'planned' check (status in ('planned','confirmed','done','cancelled')),
  unique (circle_id, month)
);

create table rsvps (
  event_id uuid references events on delete cascade,
  user_id uuid references profiles on delete cascade,
  status text default 'invited' check (status in ('invited','going','declined','attended')),
  brings text,
  match_reason text,                      -- stored explanation from the matcher
  primary key (event_id, user_id)
);

create table connections (                 -- "lock in" after a party
  a uuid references profiles on delete cascade,
  b uuid references profiles on delete cascade,
  met_event uuid references events,
  created_at timestamptz default now(),
  primary key (a, b), check (a < b)       -- store each pair once, smaller id first
);

create table pair_feedback (               -- training data for the compatibility model
  event_id uuid references events,
  rater uuid references profiles,
  other uuid references profiles,
  clicked boolean not null,               -- true if locked in
  features jsonb not null,                -- feature vector at match time
  primary key (event_id, rater, other)
);

create table points_ledger (
  id bigserial primary key,
  circle_id uuid, user_id uuid, delta int, reason text, event_id uuid,
  created_at timestamptz default now()
);

create table pot_ledger (                  -- circle pot dues and reimbursements
  id bigserial primary key, circle_id uuid, user_id uuid,
  kind text check (kind in ('dues','reimbursement')), amount_cents int, event_id uuid,
  created_at timestamptz default now()
);

create table reports (                     -- safety: report / block
  id bigserial primary key, reporter uuid, reported uuid, event_id uuid, reason text,
  created_at timestamptz default now()
);

-- ---------- Row Level Security: the main safety net ----------
alter table profiles enable row level security;
alter table circles enable row level security;
alter table memberships enable row level security;
alter table events enable row level security;
alter table rsvps enable row level security;
alter table idea_ratings enable row level security;
alter table connections enable row level security;
alter table pair_feedback enable row level security;
alter table reports enable row level security;

create function in_circle(c uuid) returns boolean language sql security definer stable as
$$ select exists (select 1 from memberships where circle_id = c and user_id = auth.uid()) $$;

create policy "own profile" on profiles for all using (id = auth.uid());
create policy "see circle mates" on profiles for select using (
  exists (select 1 from memberships a join memberships b on a.circle_id = b.circle_id
          where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy "members see their circle" on circles for select using (in_circle(id));
create policy "members see memberships" on memberships for select using (in_circle(circle_id));
-- Make in_circle() count only approved members: add "and status = 'approved'" inside it.
-- Owner approval: owners update memberships.status through a server function, not directly.
create policy "members see events" on events for select using (in_circle(circle_id));
create policy "own ratings" on idea_ratings for all using (user_id = auth.uid());
create policy "own rsvp" on rsvps for select using (user_id = auth.uid() or
  exists (select 1 from events e where e.id = event_id and e.host_id = auth.uid()));
create policy "own connections" on connections for select using (a = auth.uid() or b = auth.uid());
create policy "own feedback" on pair_feedback for all using (rater = auth.uid());
create policy "file reports" on reports for insert with check (reporter = auth.uid());
-- Raw vibe answers: profiles.vibe is visible to circle mates by the policy above. If you want
-- "others only see a match %", move vibe/qualities into a private table and expose match scores
-- through a server function instead. Recommended before inviting strangers.
-- Address privacy: serve events.address through an RPC that checks rsvps.status = 'going'.
