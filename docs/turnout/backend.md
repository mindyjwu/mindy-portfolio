# Turnout: backend and build plan

Audience: friends in their 20s to 30s, starting with one small friend group plus a few strangers each friend brings.

## Recommended stack (smallest thing that works)

| Need | Pick | Why |
|---|---|---|
| Database, auth, realtime | **Supabase** (Postgres) | Phone-number login with SMS codes, row-level security, realtime updates, free tier covers the first circles. Schema is in `docs/turnout/sql/001-schema.sql`. |
| Front end | The existing static site, then a **PWA** | Installable on phones from the browser, no App Store review. Wrap with Capacitor later if you want store listings. |
| API / jobs | Vercel functions (already in `/api`) | Matching, rotation and points need server-side authority, not browser code. |
| ML service | Same Vercel functions first; a small Python service later | Everything in v1 is cheap enough to run in a function. |
| Notifications | Web push + SMS (Twilio) | Reminders ("your turn to host", "bring the spread") drive attendance. |

Instagram login is not a realistic sign-in: Meta restricts it for third-party apps. Use **phone OTP** for identity, and let people paste their Instagram handle as a profile field (unverified at first).

## What moves from the browser to the server

The demo does everything in the browser. For real use, the server must own:
1. **Rotation and claims.** One source of truth so two phones can't both be "the host".
2. **Points.** Computed server-side from events (the `points_ledger`), never trusted from the client.
3. **Matching.** Runs on the server so raw vibe answers aren't downloaded by other users.
4. **Addresses.** Revealed only to confirmed guests.

## The ML plan, honestly

With one friend group you have tens of data points, not millions. A deep neural network would memorise noise. What works at this size, and is what the demo already does:

- **Idea ranking.** Collaborative filtering on idea ratings (users who rated similarly), blended with a logistic model trained on post-party ratings. Gets better with every rating.
- **Guest matching.** A pair-compatibility model (logistic regression over vibe-dimension closeness, "has what you look for", shared interests) retrained from `pair_feedback` (who actually locked in). Weights are per-community.
- **Room composition.** An optimiser (hill-climbing today) that balances friends vs strangers, makes sure nobody is isolated, and respects points and attendance fairness.

Upgrade path as data grows (each step needs roughly the data shown):
1. ~200 feedback pairs: gradient-boosted trees on pair features.
2. ~2,000 pairs: learned user embeddings (two-tower model), cold-start handled by the vibe quiz.
3. Later: use an LLM to turn free-text answers ("describe your ideal Sunday") into vibe features, and to write the icebreakers.

Measure it: log every match score, then compare predicted vs actual lock-ins and event ratings. If a smarter model doesn't beat the simple one on that, don't ship it.

## Points: design risks to watch

Points raising your invite priority can reward early joiners and quietly exclude shy people. Guardrails already in the demo: priority capped at 250 points, a boost for people who haven't attended, and host rotation ignores points entirely. Review it after the first three parties.

## Safety (do this before inviting strangers)

- Strangers meet at someone's home. Add: phone-verified accounts, circle owner approval for new members, report and block, address revealed only after RSVP, a "tell a friend where I am" share link, and a host guideline page.
- Keep raw vibe answers private (see the note at the end of the schema).
- Minimise personal data; privacy policy and account deletion are required for app stores anyway.

## Build order

1. **Week 1.** Create Supabase project, run the schema, turn on phone auth (Twilio). Sign-in and profile in the site.
2. **Week 2.** Circles + invite link. Onboarding ratings and vibe quiz saved to the database.
3. **Week 3.** Server-side rotation and event creation; guest matching endpoint; RSVP.
4. **Week 4.** After-party: ratings, lock-ins, points ledger, pair feedback logging. Push reminders.
5. **Run it with your friends for 2 to 3 parties.** Then decide about the pot (real money needs Stripe and has legal and tax implications; start by tracking dues in a ledger and settling with Venmo).

## Money, honestly

Moving other people's money (the circle pot) triggers payment-compliance questions. Start with a ledger and manual settlement, then use Stripe Connect only after you have retention.

## Setup status

Run these in the Supabase SQL editor, in order: `docs/turnout/sql/001-schema.sql`, `docs/turnout/sql/002-membership-and-invites.sql`, `docs/turnout/sql/003-rotation-and-parties.sql`, `docs/turnout/sql/004-report-and-block.sql`, `docs/turnout/sql/005-hidden-address.sql`, `docs/turnout/sql/006-report-email-alert.sql`, `docs/turnout/sql/007-phone-verification.sql`. Each is safe to re-run.

1. In Supabase: Authentication > URL Configuration, set the Site URL to your site and add your site plus `/**` as a redirect URL. Email sign-in works out of the box; phone needs an SMS provider.
2. The site already contains the project URL and anon key (both public by design). Never put the `service_role` key in the repo.
3. **Phase 1 (done):** email sign-in, profile and idea ratings saved, create a circle, invite link, owner approval.
4. **Phase 2 (done):** rotation, parties and matching run on real circle members (see below).
5. **Safety (done):** report and block, a hidden host address, an email alert to you for reports, and phone verification (see below).

## Phase 2: how a real circle works

When you are signed in and approved into a circle, the Circle tab shows a **Sample circle / Your circle** switch. In your circle, every action is a server call and the screen is built from `circle_state()`:

| Action | Server function | Rules enforced by the database |
|---|---|---|
| Spin for the next host | `spin_host` | any approved member; nobody hosts twice per cycle; weighted by months since last hosted (points are not used); one open party at a time; cycle rolls over when everyone has gone |
| Claim a month / release it | `claim_month`, `pass_turn(circle, month)` | one claim per cycle; no past months |
| Host can't make it | `pass_turn(circle)` | removes the party, skips the host for that month only |
| Skip me this month | `set_skip` | |
| Pick a theme, build the guest list | `set_party` | host or circle owner only; every guest must be an approved member |
| RSVP | `rsvp` | invited guests only |
| Rate, lock in friends | `rate_event` | must have been there; once per party; feeds points, connections and matcher feedback |
| Close the party | `close_event` | host or owner; awards hosting and attendance points; opens the next turn |

**Matching still runs in the host's browser.** It needs the members' answers, so `circle_state()` returns them to every approved member. That means anyone approved into a circle can see the other members' vibe answers and who is friends with whom. Nobody outside the circle can. The vibe quiz says so. Moving matching fully server-side (so answers never leave the database) is the next privacy step and needs either a database function or a server endpoint.

**Models are not stored.** The browser replays the circle's raw feedback (party ratings and who-clicked-with-whom, with no names attached) each time the circle loads, so everyone gets the same weights and there is no model state to tamper with. A member can still submit skewed feedback about themselves; each submission is bounded (at most 20 numbers per row, only for people at the same party, once per party).

**Points are written only by the database.** The points ledger has row-level security with no policies, so the browser cannot read or edit it directly.

## Safety: report and block

`docs/turnout/sql/004-report-and-block.sql`. Strangers meet at people's homes, so this ships before any stranger-heavy party.

**Block** (private, applies in every circle you're in)
- A blocked pair is never placed in the same party. The **server** enforces this when the host saves the guest list, so a modified browser can't get around it. Anyone who would share the party with someone they have a block with, in either direction, is quietly left out. The host is always kept; otherwise the earlier name in the list wins.
- The host only learns *how many* people couldn't be placed, never who or why. Nobody is told who blocked them.
- The host's matcher also avoids the people the host blocked, so those invites are never attempted.
- Neither person can lock the other in as a friend after a party.
- If you block someone you're both invited to a current party with, the screen tells you so, so you can decline. It never removes anyone by itself.
- Undo any time in the Me tab.

**Report** (reason, optional note up to 500 characters, optionally "also block")
- Reasons: made me feel unsafe, harassment or unwanted contact, inappropriate behavior, fake or misleading profile, something else.
- The **circle owner** sees reports about other members (who it's about, reason, note, how many open reports that member has) in the Me tab, and can mark them resolved or dismissed, or remove the member. The owner does **not** see who sent a report.
- Removing a member cuts their access, deletes their invites, and cancels a party they were hosting.
- **Reports about the owner can only be read by whoever runs the database** (you, as the app operator). Every report also emails you (`docs/turnout/sql/006-report-email-alert.sql`; setup in [`docs/turnout/alerts.md`](alerts.md)). The email is a nudge, not the record. To review reports, run this in the Supabase SQL editor:

```sql
select r.id, r.created_at, r.status, r.reason, r.note,
       p.handle as reported, rp.handle as reporter, c.name as circle
from reports r
join profiles p on p.id = r.reported
left join profiles rp on rp.id = r.reporter
left join circles c on c.id = r.circle_id
order by (r.status = 'open') desc, r.created_at desc;
```

- Limit of 5 reports per person per day, to blunt spam.
- Nothing is automatic. Two people could pile on someone, so reports flag people for a human to review but never remove or hide anyone on their own.

**Limits to know about**
- Blocking doesn't hide your profile answers from the person (circle members can see each other's answers), and doesn't remove either of you from the circle. Only the owner can remove someone.
- A report can't be edited or withdrawn after it's sent.
- Turnout can't respond to emergencies. The report screen says to call local emergency services first.
- Ideas not built yet: a timed address reveal (only a few hours before the party), a CAPTCHA on sign-in (protects against text-message fraud), email alerts to circle owners, and banning a phone number across circles.

## Hidden host address

`docs/turnout/sql/005-hidden-address.sql`. The host types a neighborhood, an address and getting-in notes in the Party tab.

| Who | Neighborhood | Address and notes |
|---|---|---|
| The host | yes | yes |
| A guest who said they're **going** | yes | **yes** |
| A guest who is invited but hasn't answered, or declined | yes | no |
| The circle owner (if not hosting or going) | yes | **no** |
| A member who wasn't invited | no | no |

- **Where it lives.** In its own table that the browser can't read at all (row-level security, no policies). The server only returns it, inside `circle_state()`, to the people marked "yes" above. The address is never sent to anyone else's browser, so it can't be found in the page, the app's memory, or the network traffic of someone who isn't allowed to see it. The tests check all three.
- **An older risk this fixed.** The `events` table already had an unused `address` column, and every circle member can read every column of every event. It would have exposed home addresses to the whole circle, so the column is dropped.
- **It follows the RSVP.** If a guest changes to "can't make it", or the host drops them from the guest list, the address disappears on their next refresh. Anything they already saw is still in their memory until then, and a screenshot can't be taken back.
- **Deleted when the party closes**, and removed with the party if the host passes the turn. `purge_old_locations(days)` is an operator-only function that clears addresses of parties that were never closed; schedule it with Supabase's cron (pg_cron) if you want it automatic. It is not callable from the browser.
- **The owner never sees the address** unless they are hosting or going. That's deliberate: owners moderate, they don't need to know where people live.
- **Limits.** Anyone who is going can copy the address. The "Open in Maps" link sends it to Google if tapped. There's no timed reveal yet (for example, only within a few hours of the party); that's a possible next step.

## Email alert for reports

`docs/turnout/sql/006-report-email-alert.sql`, `api/turnout-report-alert.js`, and the setup guide `docs/turnout/alerts.md` (about 15 minutes, once). Every new report triggers an email to you with the category, who it's about, who filed it, the circle, and the note (handles only: no emails, ids or addresses). It is sent by a database trigger through Supabase's HTTP queue to a small Vercel function, which emails you through Resend. A failure to send can never stop a report from being saved, but it can mean a missed email, because the queue doesn't retry; so the guide also shows how to check the open reports yourself.

## Phone verification

`docs/turnout/sql/007-phone-verification.sql` and the setup guide `docs/turnout/phone.md` (about 20 to 30 minutes, once, because it needs a text-message provider such as Twilio). People can verify a number with a texted code from the Me tab, or sign in with their phone. Supabase Auth sends and checks the code; a number can belong to only one account.

A switch, **off by default**, makes a verified phone required to create a circle, join one, or be approved into one (existing members are not locked out). It ships off so that you can't lock everyone out before texts work. The number is never shown to other members: they see only a "verified" badge, and the member themselves sees only the last two digits. Verification proves control of a phone number, not identity.

### Tests

`docs/turnout/sql/tests/` has 185 database checks (plus 13 for the email function in `tests/`, run with `npm test`) and the stub that lets them run on plain PostgreSQL (permissions, privacy, rotation fairness, cycle rollover, claims, passing, points, and direct-write attempts that must fail). To run them: start a local PostgreSQL, then `docs/turnout/sql/tests/run.sh`.

### Known limits

- No live updates yet: the screen refreshes when you switch back to the tab, or with the Refresh button.
- The month a party belongs to is based on the server's date (UTC).
- Sign-in is by email or by phone (see "Phone verification" below).
