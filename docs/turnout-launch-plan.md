# Turnout: launch plan for the first four circles

A working draft. Anything in [brackets] is a blank only you can fill in. Nothing here assumes your city, your friends, or your budget.

## 0. The goal, stated so you can actually hit it

You said: at least 4 communities, each with at least 1 party, and at least 100 sign-ups/installs in month one.

Two things to settle before you start, because they change the plan:

1. **Sign-ups are not attendees.** A good house party is 8 to 12 people. Four parties is about 32 to 48 guests at most, and some of those are the hosts. To reach 100 sign-ups, about half of your sign-ups must be people who joined a circle but did not (yet) attend. That is normal, but it means the invite link has to travel beyond the party guest list. Plan for roughly 25 sign-ups per circle.
2. **"Installs" doesn't apply yet.** Turnout is a web app, not an app-store app, so the honest number is *accounts created*. Count those. (Adding "save to home screen" later can come after you have proof.)

Suggested scoreboard (check it weekly, same day, same place):

| Measure | Target by day 30 |
|---|---|
| Circles created | 4 |
| Circles with a party held | 4 |
| Accounts created | 100 |
| Guests who attended a party | 30+ |
| Attendees who rated the party | 70% of attendees |
| Attendees who say they'd go again | 70%+ |
| New friend "lock-ins" after parties | at least 1 per party |

The last four are the ones that tell you whether it's a product or just a nice month. Sign-ups alone can be bought with enthusiasm; repeat attendance can't.

## 1. Choose the four seed hosts (the most important decision)

A circle lives or dies on its owner. Pick people, not demographics.

A good seed host:
- Has actually hosted before, or has said "I'd host if it were easier."
- Knows 15 to 30 people across at least two friend groups (so the guest list can mix known and new faces, which is the whole point).
- Will reply to messages within a day.
- Is willing to be the circle owner, since owners approve join requests and see reports.

Aim for **four different kinds of circle**, so you learn more than one thing:

| # | Circle type | What it tests |
|---|---|---|
| 1 | Your closest friends [name] | Does the basic loop work with zero friction? |
| 2 | A friend from a different life stage or workplace [name] | Do strangers mix well? |
| 3 | A shared-interest group (run club, book club, game night) [name] | Does a theme help? |
| 4 | A host who is a bit skeptical [name] | Where does the pitch fall flat? |

Honest warning: your closest friends will say yes out of kindness. Their enthusiasm is not evidence. Circle 4 is there to give you honest signal.

## 2. Before you invite anyone (your checklist, about an hour)

- [ ] Supabase migrations 004 to 007 are run (otherwise Report/Block and the hidden address show errors).
- [ ] Hard-refresh the live site, create your own real circle, join it from a second account (a second email), and walk through: spin a host, claim a month, RSVP, close the party, rate it.
- [ ] Report email alerts: either finish `docs/turnout-alerts.md` or accept that you will check the `reports` table by hand. With strangers coming, I'd do the alert setup first.
- [ ] Phone verification: **leave it off** for the first four circles. These are friends of friends, and Twilio setup is 20 to 30 minutes plus a spend cap. Turn it on before you open any circle to people two or more steps from you. That is a judgment call, so tell me if you disagree.
- [ ] Write your own address line for the first party (the exact address is only shown to the host and to guests who RSVP going).

## 3. The invite message (edit into your own voice)

For a seed host, personal and short:

> Hey [name], I'm testing something I built called Turnout. It's a small rotating-host group: each month one person hosts, everyone else brings a piece of the theme, and costs get split. I'd love for you to be the owner of a circle for [your group], and host the first one if you're up for it. It takes about 10 minutes to set up and I'll help. Would you try it with me?

For a host inviting their friends:

> I'm starting a monthly dinner/hangout rotation called [circle name]. Each month someone different hosts, and you only bring what the theme needs. Join here: [invite link]. I'll approve you once you sign up.

Principles:
- One ask per message. Don't explain ML, points, or matching. They don't care yet.
- Always give the first date and the first theme, so "yes" has something to attach to.
- Ask each host to add **2 people the circle doesn't already know**. That is how you reach 100.

## 4. The first party (per circle)

- **Size:** 8 to 10. Small enough to be a conversation, large enough that a no-show doesn't kill it.
- **Cost:** keep it low and visible: the host's spend is split, and the amount is shown before RSVP. Decide your rule now [e.g. under $15 each].
- **Theme:** simple and contribution-based, not performative. Examples to test (one per circle, so you can compare ratings):
  1. Soup and bread night (guests each bring one thing)
  2. Board games, host provides snacks
  3. Potluck from where your family is from
  4. Walk-and-takeout, low-effort host
- **Timing:** first parties in weeks 2 and 3, not week 4, so there's still time to rate, lock in friends, and fix things before day 30.
- **Host support:** you message each host the day before and the day after. Doing this by hand now is how you learn what to automate.

## 5. Timeline (30 days)

| Days | Do |
|---|---|
| 1 to 2 | Finish the checklist in section 2; test end to end |
| 3 to 5 | Personally ask the four seed hosts; get four yeses and four dates |
| 6 to 8 | Hosts create circles and share invite links; you approve join requests quickly |
| 9 to 14 | First two parties; collect ratings the next morning |
| 15 to 21 | Parties three and four; fix what the first two surfaced |
| 22 to 28 | Second round of invites (attendees invite friends); open the second month's host |
| 29 to 30 | Count the scoreboard; write a one-page summary of what you learned |

## 6. What to watch for (and what would change the plan)

- **Approval bottleneck:** if join requests sit unapproved for a day, people drift. Tell owners to approve within 24 hours.
- **Zero strangers showing up:** if only existing friends join, the matching feature has nothing to match. Push the "bring 2 new people" ask harder.
- **A host who ghosts:** pass their month (the app supports passing), and talk to them about why.
- **Anyone uncomfortable:** the report and block tools exist for this. Tell hosts how they work before the first party, not after something happens.
- **Low ratings:** read the written comments first, before the numbers.

## 7. Questions only you can answer (this plan depends on them)

1. What city/area is this, and are all four circles in the same one? (It affects whether circles can overlap.)
2. Who are your four hosts, and did any of them already say they'd do it?
3. How many of your own friends would join if you asked this week? (If you're not sure, ask 10 people and count.)
4. What's your realistic time budget per week for hand-holding hosts?

## Where this plan could be wrong

I'm working from what you've told me, not from data about your friends or city. The 25-per-circle sign-up estimate and 70% thresholds are my rules of thumb, not benchmarks I've verified. Treat the first month as an experiment designed to find out which of them are wrong.
