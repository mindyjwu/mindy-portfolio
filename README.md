# Mindy's Portfolio

**Live: [mindy-portfolio.vercel.app](https://mindy-portfolio.vercel.app)**

My personal site — a clean **Portfolio** and **History** up front, an **About** page, and a set of small AI/data products you can click into. Plain HTML/CSS/JS, no build step, with a few Vercel serverless functions in `/api` for the interactive pages.

## What's on the site

- **Home** (`index.html`) — a short intro, a **Portfolio** list of everything I'm building (name + one-line focus), and a **History** timeline (roles, internships, NYU).
- **About** (`about.html`) — who I am, why this site exists, and what I believe about building with AI.
- **Buddy** (`wellness.html`) — Wellness Buddy, a wearable-free wellness check-in prototype: log classes and workouts, snap a meal and tap each item to correct the estimate, see your week, read a monthly "what's working" report with nutrient gaps and a recipe, and keep a crew with a weekly challenge, class meetups and a photo feed. Black-and-white, mobile-first. Like Mood Wall it makes no API calls: all insights are pre-written sample data, and state lives in localStorage. Scope is in `docs/wellness-app-mvp-scope.md`.
- **Mood Wall** (`mood.html`) — tell it how you feel and get a wall of real art, books, music and film chosen for that feeling. Claude picks; the browser resolves every pick against The Met, Open Library, iTunes (30-second previews) and Wikipedia, so every card is a real thing with a real link. Save cards to a local wall, share a mood by URL. Eleven walls are hand-authored in `data/moods/source.json` and snapshotted once into static JSON so they load instantly and cost nothing.
- **SIGNAL** (`signal.html`) — an AI-news feed that sweeps 16 industries each morning, with an estimated read time on every story and a downloadable podcast script.
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

Both the Mood Wall and SIGNAL commit their last real result to the repo, so they load instantly, cost nothing during demos, and fall back gracefully if the Anthropic account is out of credits — always labelled with its real date, never as "today".

```bash
# Mood Wall
node scripts/snapshot-moods.mjs capture     # resolve the authored walls into static JSON (spends credits)
node scripts/snapshot-moods.mjs freeze      # typed moods serve the nearest curated wall, never call the API
node scripts/snapshot-moods.mjs unfreeze
node scripts/snapshot-moods.mjs status

# SIGNAL
node scripts/snapshot-signal.mjs capture     # pull today's sweeps and save them (the only command that spends credits)
node scripts/snapshot-signal.mjs freeze      # page serves the snapshot only, never calls the API
node scripts/snapshot-signal.mjs unfreeze
node scripts/snapshot-signal.mjs status
```

Commit and push after any of these. Freeze before a demo: zero API calls, instant load, no cold-start wait.

## Environment variables

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` (get one at console.anthropic.com). In Vercel, set it under Project → Settings → Environment Variables.

## Deploying

Push to GitHub, import the repo in Vercel, add `ANTHROPIC_API_KEY`, deploy. Every push after that auto-deploys.
