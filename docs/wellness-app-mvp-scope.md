# Wellness Recommender: MVP Scope

Working name: TBD. One-line pitch: a personal health recommender for people who hate wearables. It combines the data your phone already has, the classes you actually take, and what you eat into one monthly report that tells you what is working for *your* body.

## Who it is for

Young, health-conscious people who pay for fitness (ClassPass, Life Time, Chelsea Piers, independent yoga/Pilates studios), are willing to pay about $5-6/month, and do not want to wear a ring or band. Reached first through small sports and wellness influencers.

## The wedge (what competitors don't do)

1. **Wearable-free.** Uses phone-only signals: Apple Health (steps, workouts, sleep estimates from phone if present), location, and manual input.
2. **Studio-agnostic activity log.** ClassPass has no public API (partner-only), so MVP logs classes by lightweight self-report plus calendar and email-confirmation import. Studio-agnostic is the point.
3. **Personalized, not generic.** The recommender learns from your own outcomes ("on weeks you do 3+ strength classes and sleep 7h+, you report higher energy").

## MVP: the smallest thing that proves the idea

**Core loop: log -> weekly check-in -> insight.**

| # | Feature | In MVP? | How |
|---|---------|---------|-----|
| 1 | Activity log (class, gym, run, yoga, Pilates) | Yes | One-tap add: type, studio, duration, intensity. Manual first. |
| 2 | Calendar/email import of class bookings | Stretch | Parse booking confirmations; this is the ClassPass workaround. |
| 3 | Meal photo -> rough macros | Yes | Claude vision; show ranges and confidence, not false precision. |
| 4 | Sleep, energy, mood daily check-in (10 seconds) | Yes | Three sliders. This is the outcome signal the recommender learns from. |
| 5 | Weekly/monthly report | Yes | Claude summarizes patterns across activity, food and check-ins. |
| 6 | "What's working / what's not" insights | Yes | Simple correlations over your own history, framed as observations, not diagnoses. |
| 7 | Nutrient-gap suggestions + recipes | Yes (light) | Food-pattern based, with explicit "estimate" labels. |
| 8 | Apple Health sync | Later | Needs a native iOS app (HealthKit has no web API). |
| 9 | Wearable integrations (Oura, WHOOP) | No | Not the target user, and incumbents own this. |
| 10 | Bloodwork / deficiency detection | No | Regulatory and accuracy risk. Revisit with labs later. |
| 11 | Genetics | No | Do not claim it. "Personalized from your own results" is honest and enough. |

## Guardrails

- Wellness framing only: no diagnosis, no deficiency claims from food photos alone. Say "likely low in" with an estimate label.
- Photo calorie estimation is known to under-count; show ranges and let users correct.
- Health data is sensitive: keep demo data local/sample, no real PII in the portfolio version.

## Prototype for the portfolio (matches this repo's style)

A single `wellness.html` page: plain HTML/CSS/JS, sample data, one serverless route in `/api` for the report and photo steps, same as Mood Wall and SIGNAL.

Screens: (1) Today: log activity + 3-slider check-in + meal photo; (2) Week: calendar of activity with sleep/energy overlay; (3) Report: "what's working / what's not" with next-week recommendations and a recipe.

## How to test if it is a startup (before building more)

- Interview 10 ClassPass/studio users. Ask: how do you track this today, and what would you pay for?
- Landing page + waitlist, shared by 3-5 micro-influencers. Target: 100 signups and 10 people saying they'd pay $5-6.
- Run the manual version: log 10 friends' weeks in a spreadsheet, send a Claude-written report, and see if they ask for the next one.
- Kill/continue signal: if people open the report and act on it, continue. If they only like the idea, it's a portfolio piece.

## Key risks to test early

- **Retention:** will people keep logging? The 10-second check-in is the answer to this; measure it.
- **Insight quality:** with little data per person, correlations are weak. Start with simple, honest "early signal" language.
- **Distribution:** influencer CAC vs. $5-6/month. Needs real numbers from a test.
