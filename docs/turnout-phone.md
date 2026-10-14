# Turnout: phone verification

People can verify their phone number with a texted 6-digit code, or sign in with their phone instead of email. You can then **require** a verified phone to create or join a circle.

Supabase does the texting. This guide is the one-time setup of a text-message provider (about 20 to 30 minutes), plus how to turn the requirement on safely.

## What it does, and what it doesn't

**It does**
- Ties each account to a real phone number that can only belong to **one** account (the database refuses duplicates). Someone who is blocked, reported and removed can't simply make a second account with the same number.
- Shows a **verified** badge on members in your circle. Nobody sees anyone's number, including the circle owner. The person themselves sees only the last two digits.
- Optionally **requires** it (off by default) to create a circle, join one, or be approved into one. People already in a circle are not removed or locked out when you switch it on.

**It doesn't**
- Prove who someone is. It proves they control a phone number. Cheap or temporary numbers exist, so it raises the effort needed to make fake accounts; it doesn't stop a determined person. It works together with owner approval, report and block, not instead of them.
- Merge accounts. Someone who signs in with email one day and phone the next gets two separate accounts. The simplest path for most people: sign in with email, then **Verify your phone** in the Me tab (that adds the number to the same account).
- Protect against text-message fraud by itself (see "Costs and abuse"). I did not build a CAPTCHA.

## Why the requirement is OFF until you turn it on

If it were on before text messages work, nobody, including you, could create or join anything. So: set up the provider, test it with your own number, then switch it on.

## One-time setup

### 1. A text-message provider
Supabase supports several. **Twilio Verify** is the one I'd use, and this is how I understand it works; read Supabase's current "Phone Login" documentation as you go, because dashboards change.

1. Create a Twilio account (twilio.com). A free trial account can only text numbers you've verified inside Twilio, which is fine for testing with your own phone.
2. In the Twilio console, create a **Verify service** and copy its **Service SID** (starts with `VA`). Also copy your **Account SID** (`AC...`) and **Auth Token** from the console home page.
3. In Supabase: **Authentication → Providers → Phone**. Turn it on, choose **Twilio Verify**, and paste the Account SID, Auth Token and Service SID.

Why Verify rather than a plain Twilio number: in the US, carriers filter texts from ordinary numbers unless the sender has gone through registration (called A2P 10DLC), which can take days or weeks. Verify is built for one-time codes and avoids that process. If you use a plain number and codes never arrive, that is the likely reason.

### 2. Put limits on it (important)
Texts cost money, and criminals trigger codes to unrelated numbers to run up bills ("SMS pumping"). Before you share the link with anyone:

- In Supabase **Authentication → Rate Limits**, set the limit on **SMS messages sent** low (for example 10 to 20 per hour) while you have a handful of users.
- In Twilio, limit the countries that can receive texts to the ones you actually need (for example the United States and Canada), under its geographic permissions.
- In Twilio, do **not** turn on auto-recharge. Add a small amount (for example $10 to $20) and set a usage alert so you get an email as spend grows.
- Keep the code length at 6 and the expiry short (a few minutes at most).

Texts cost roughly a cent or a few cents each in the US; check Twilio's current pricing page. For your first 100 sign-ups, plan on a small amount of money, not a large one, unless someone abuses it. If you see unexpected charges, tell me and I'll add a CAPTCHA to sign-in, which is the proper fix.

### 3. Run the migration
Run `docs/migration-007.sql` in the Supabase SQL editor, after the earlier migrations. It changes nothing for anyone yet, because the requirement is off.

### 4. Test with your own number
1. Open Turnout, sign in, go to the **Me** tab, and use **Verify your phone**.
2. Enter your number (US numbers can be typed as `555 123 4567`; elsewhere start with the country code, like `+44`).
3. You should get a text within a minute. Enter the code. The card should change to "Phone verified •• 67" (your last two digits).
4. Confirm on the server:

```sql
select email, phone, phone_confirmed_at from auth.users order by created_at desc limit 5;
```

### 5. Test phone sign-in
Sign out. On the sign-in card choose **Phone**, enter a number, and enter the code. (On a Twilio trial account the number has to be one you verified in Twilio.)

### 6. Turn the requirement on
When codes arrive reliably, run:

```sql
insert into app_settings (key, value) values ('require_phone_verification', 'true')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

To turn it off again (for example if text messages stop working):

```sql
update app_settings set value = 'false' where key = 'require_phone_verification';
```

What changes when it's on: creating a circle, joining through an invite link, and being approved all need a verified phone. Someone who opens an invite link without one is told to verify first, and **their invite is kept** and used automatically once they've verified. Existing members keep full access.

## Checking who's verified

```sql
select p.handle, m.role, m.status, (u.phone_confirmed_at is not null) as phone_verified
from memberships m
join profiles p on p.id = m.user_id
join auth.users u on u.id = m.user_id
order by phone_verified, p.handle;
```

## If something doesn't work

| What you see | Likely cause | What to try |
|---|---|---|
| No text arrives | provider not enabled, wrong SIDs/token, or a trial account texting an unverified number | check Supabase's phone provider settings; look at Twilio's logs (Monitor → Logs) for the message and any error code |
| An error right after "Text me a code" | the provider isn't configured, or the rate limit was reached | check the provider settings and the SMS rate limit; wait a few minutes |
| "That code didn't work or has expired" | wrong digits, expired code, or an old code after "Send again" | ask for a new code and use the latest one |
| "Verify your phone first" when creating a circle | the requirement is on and the person isn't verified | that's the rule working; they verify in the Me tab |
| That number "is already registered" | the number is attached to another account | they should sign in with that account, or use another number |

## Privacy

- The number is stored by Supabase Auth, not in Turnout's own tables. Only you (in the Supabase dashboard) and the person who owns it can see it. Circle members only ever see a "verified" badge.
- If you collect phone numbers, your privacy policy should say so and say how someone can have their account and number deleted.
- Texts are sent through Twilio, so the number and message pass through their systems too.

## Tests

- `docs/sql-tests/phone-verification.test.sql` (29 checks): the requirement off by default and fails open; create, join and approve refused for unverified people when it's on, allowed once verified; existing members not locked out; the number never appears in anything a member receives; the number can't be attached to two accounts.
- The screens were exercised end to end against the real database rules: stopped when unverified, bad numbers rejected before anything is sent, wrong codes rejected, the saved invite used after verifying, and no phone number in any page, memory or server response of another member. The text messages themselves were **not** tested, because the sandbox can't reach Supabase or Twilio; the setup test above in step 4 is how you confirm that part.
