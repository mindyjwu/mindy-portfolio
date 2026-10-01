# Turnout: backend and build plan

Audience: friends in their 20s to 30s, starting with one small friend group plus a few strangers each friend brings.

## Recommended stack (smallest thing that works)

| Need | Pick | Why |
|---|---|---|
| Database, auth, realtime | **Supabase** (Postgres) | Phone-number login with SMS codes, row-level security, realtime updates, free tier covers the first circles. Schema is in `docs/turnout-schema.sql`. |
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
