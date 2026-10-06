# Mindy's Portfolio

**Live: [mindy-portfolio.vercel.app](https://mindy-portfolio.vercel.app)**

My personal site — a clean **Portfolio** and **History** up front, an **About** page, and a set of small AI/data products you can click into. Plain HTML/CSS/JS, no build step, with a few Vercel serverless functions in `/api` for the interactive pages.

## What's on the site

- **Home** (`index.html`) — a short intro, a **Portfolio** list of everything I'm building (name + one-line focus), and a **History** timeline (roles, internships, NYU).
- **About** (`about.html`) — who I am, why this site exists, and what I believe about building with AI.
- **Buddy** — Wellness Buddy, a wearable-free wellness check-in prototype with its own repo: [mindyjwu/wellness-buddy](https://github.com/mindyjwu/wellness-buddy), live at [wellness-buddy-chi.vercel.app](https://wellness-buddy-chi.vercel.app). Linked from the Portfolio list like Global Explorer and GenAI. `/wellness` on this site redirects there.
- **The AI Money Map** — an interactive supply chain of who funds AI: 17 layers and ~220 players from daily life down through apps, labs, clouds, chips, fabs, energy and space to raw quartz and copper. Click any logo for what it makes, how it's doing and the opportunity. Its own repo: [mindyjwu/ai-eco-diagram](https://github.com/mindyjwu/ai-eco-diagram), live at [ai-eco-diagram.vercel.app](https://ai-eco-diagram.vercel.app). Linked from the Portfolio list like Buddy.
- **Mood Wall** (`mood.html`) — tell it how you feel and get a wall of real art, books, music and film chosen for that feeling. Claude picks; the browser resolves every pick against The Met, Open Library, iTunes (30-second previews) and Wikipedia, so every card is a real thing with a real link. Save cards to a local wall, share a mood by URL. Eleven walls are hand-authored in `data/moods/source.json` and snapshotted once into static JSON so they load instantly and cost nothing.
- **SIGNAL** (`signal.html`) — an AI-news feed that sweeps 16 industries each morning, with an estimated read time on every story and a downloadable podcast script.
- **Turnout** (`turnout.html`) — a rotating-host community. A fair rotation wheel, themed party ideas ranked by an on-device logistic-regression model that learns from ratings, a hill-climbing guest matcher that mixes friends with new people by shared interests, a host-cost model with a circle pot, and a post-party "lock in new friends" network. Demo build: state lives in `localStorage`, no backend yet.
- **Stock Advisor** (`stock-advisor.html`) — scores stocks on fundamentals, technicals and news sentiment, then grades its own calls. Sample data, not investment advice.
- **People Like Me** (`people-like-me.html`) — vetted beauty and body providers, ranked by people who share your hair, skin type and budget.
- **Festival Clash Resolver** (`festival-clash-resolver.html`) — an offline-first set-clash resolver and route planner for electronic-music festivals.
- Plus external builds linked from the Portfolio: **Global Explorer** (a 3D globe of cities worth visiting) and **GenAI**.

## Stack

Plain HTML, CSS, and JavaScript — no framework, no build step, so it loads instantly for anyone. The interactive pages call the Claude API through Vercel serverless functions in `/api`. A small Python script filters MoMA's open dataset for the Mood Wall art.

## Running it locally

No build tools needed for the front end — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
```

The `/api` routes need a Node environment that supports Vercel serverless functions:

```bash
npm install -g vercel
vercel dev
```

## Content snapshots (demos and credit control)

Both the Mood Wall and SIGNAL commit their last real result to the repo, so they load instantly, cost nothing during demos, and fall back gracefully if the Anthropic account is out of credits. Anything that isn't today's data is labelled with its real date, never passed off as "today".

```bash
# Mood Wall
node scripts/snapshot-moods.mjs capture     # resolve the authored walls into static JSON (spends credits)
node scripts/snapshot-moods.mjs freeze      # typed moods serve the nearest curated wall, never call the API
node scripts/snapshot-moods.mjs unfreeze
node scripts/snapshot-moods.mjs status

# SIGNAL
node scripts/snapshot-signal.mjs capture     # pull a fresh sweep and save it (the only command that spends credits)
node scripts/snapshot-signal.mjs freeze      # page serves the snapshot only, never calls the API
node scripts/snapshot-signal.mjs unfreeze
node scripts/snapshot-signal.mjs status      # what's saved, and how many days old it is
```

Commit and push after any of these. Freeze before a demo: zero API calls, instant load, no cold-start wait.

### SIGNAL refreshes itself daily

`.github/workflows/signal-snapshot.yml` runs `capture --scheduled` every morning (10:17 UTC, about 6am ET), commits the result, and Vercel redeploys. Visitors only ever read the committed file, so traffic never costs credits. This job is the one thing that spends: three Claude calls a day.

- **Refresh now:** Actions tab → *Refresh SIGNAL snapshot* → *Run workflow*.
- **No secrets to set up.** The job calls the public endpoint; the Anthropic key stays in Vercel.
- **It never replaces good data with worse.** The run fails, and the previous snapshot stays live, if a sweep errors (including out-of-credits), if the edge returns a stale cached sweep, or if the result has fewer than 8 stories or 5 industries.
- **The page tells you when it stops.** The badge reads `DAILY` while the snapshot is within two days old. At three days it flips to an amber `STALE` and says *"Daily refresh has stopped"*. GitHub's default notifications also email the account that last edited the schedule when a scheduled run fails.
- If a run fails with a credit-balance error, it is billing, not code. Top up under Plans & Billing and re-run.

## Environment variables

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` (get one at console.anthropic.com). In Vercel, set it under Project → Settings → Environment Variables.

## Deploying

Push to GitHub, import the repo in Vercel, add `ANTHROPIC_API_KEY`, deploy. Every push after that auto-deploys.
