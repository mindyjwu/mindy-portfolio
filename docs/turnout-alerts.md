# Turnout: email alerts for safety reports

When someone files a report, you get an email within about a minute. This guide is the one-time setup. It takes about 15 minutes.

## What you'll get

An email like this, sent only to you:

> **[Turnout] URGENT: Made me feel unsafe (@maya.eats)**
> What: Made me feel unsafe · About: @maya.eats (the circle owner) in "The Sunday Table" · Filed by: @jordan.runs · When · Open reports about this person · Details (the note) · a one-line query to review all open reports.

- It includes **handles and the note only**: no email addresses, ids, or home addresses.
- Subjects say **URGENT** for "unsafe", "harassment", "inappropriate", and for anything about a circle owner (the one case nobody else in the app can act on).
- It's plain text, so nothing a reporter types can turn into a link or a script.

## How it works (so you know what can break)

1. A report is saved in the database.
2. A trigger asks the database's built-in HTTP queue (`pg_net`) to send the details to `https://mindy-portfolio.vercel.app/api/turnout-report-alert`.
3. That small function (`api/turnout-report-alert.js` in the portfolio repo) checks a shared secret and sends you the email through Resend.

A failure in steps 2 or 3 **can never stop a report from being saved**. The cost is that it can mean a missed email. `pg_net` does not retry, so check the open-reports query occasionally (below).

## One-time setup

### 1. Resend (sends the email)
1. Sign up at https://resend.com **with the email address where you want alerts.**
2. Go to **API Keys**, create one with sending access, and copy it (it starts with `re_`).

Resend's free test sender (`onboarding@resend.dev`) is, as I understand it, limited to sending to the email you signed up with, which is exactly this use. If you later want alerts to go to someone else, verify a domain in Resend and set `TURNOUT_ALERT_FROM`. I couldn't check Resend's current rules from where I work, so confirm in their docs if this matters.

### 2. Vercel (runs the function)
Open the **`mindy-portfolio`** project (not `mindys-ai-guide-2026`) → **Settings → Environment Variables**, and add:

| Name | Value |
|---|---|
| `TURNOUT_ALERT_SECRET` | a long random string. To make one, run `select encode(gen_random_bytes(24), 'hex');` in the Supabase SQL editor and copy the result |
| `RESEND_API_KEY` | the `re_...` key from step 1 |
| `TURNOUT_ALERT_TO` | your email address |

Optional: `TURNOUT_ALERT_LEVEL` = `serious` to skip routine reports (fake profile, other) and only be emailed for the urgent kinds. Default is `all`, which is right while you have a handful of circles.

Then **redeploy** (Deployments, the latest one, Redeploy). Changes to environment variables only apply to new deployments. The function itself ships when the PR is merged.

### 3. Supabase (sends the alert)
1. Run `docs/migration-006.sql` in the SQL editor (after the earlier migrations).
2. In **Database → Extensions**, check that **pg_net** is enabled. The migration tries to turn it on.
3. Tell the database where to send alerts. Paste the **same secret** you used in Vercel:

```sql
insert into app_settings (key, value) values
  ('report_alert_url',    'https://mindy-portfolio.vercel.app/api/turnout-report-alert'),
  ('report_alert_secret', 'PASTE_THE_SAME_SECRET_HERE')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

### 4. Test it
Run this in the SQL editor:

```sql
select send_test_report_alert();
```

A clearly marked **TEST** email should arrive within a minute. Check spam the first time.

## If the test email doesn't arrive

Look at what the database got back:

```sql
select id, status_code, left(content::text, 120) as reply, error_msg, created
from net._http_response order by created desc limit 5;
```

| You see | It means | Fix |
|---|---|---|
| nothing, or `null` status | the request wasn't queued | `pg_net` isn't enabled, or `app_settings` has no rows (re-run step 3) |
| **200** | the function accepted it | check spam; check `TURNOUT_ALERT_TO` is right |
| **401** | the secret doesn't match | re-copy the same value into both places, with no spaces, and redeploy |
| **500** | the function isn't fully configured | one of the three Vercel variables is missing, or you haven't redeployed |
| **502** | the email service refused it | the Resend key is wrong, or the sender/recipient isn't allowed (see the note in step 1) |
| **404** | wrong URL, or the function isn't deployed | merge the PR that adds `api/turnout-report-alert.js`, and check the URL in `app_settings` |

## Reviewing reports

The email is a nudge, not the record. The record is the `reports` table:

```sql
select r.id, r.created_at, r.status, r.reason, r.note,
       p.handle as reported, rp.handle as reporter, c.name as circle
from reports r
join profiles p on p.id = r.reported
left join profiles rp on rp.id = r.reporter
left join circles c on c.id = r.circle_id
order by (r.status = 'open') desc, r.created_at desc;
```

Run it now and then, even when no emails arrive, in case an alert was missed. Circle owners resolve or dismiss reports about other members in the app; reports about an owner stay open until you handle them in the database (`update reports set status = 'resolved' where id = ...`).

## Things to be honest about

- **It's one inbox.** If you're away, nobody else is told. Before you have many circles, decide who covers for you, and don't promise reporters a response time.
- **Turnout is not an emergency service.** The report screen says so.
- **The email is a copy of sensitive text** (the note) in your inbox and Resend's logs. Keep that mailbox secured.
- To rotate the secret: change it in Vercel (and redeploy) and in `app_settings` at the same time.

## Tests

- `docs/sql-tests/report-alert.test.sql` (19 checks): alerts are sent once per report with the right contents and secret; nothing is sent until set up; sending can never break reporting; settings and the sender can't be reached from the app.
- `tests/turnout-report-alert.test.mjs` (13 checks, `npm test`): the function rejects wrong secrets and bad input, builds the right email from a **real payload captured from the database**, strips hostile text, honors the alert level, and never leaks the secret or API key. It never sends real email.
