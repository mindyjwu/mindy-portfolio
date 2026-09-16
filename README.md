# Mindy's Portfolio

**[mindys-ai-guide.vercel.app](https://mindys-ai-guide.vercel.app)** · **[More of my work](https://mindy-portfolio.vercel.app)**

My parents kept asking me, separately, whether AI was going to take their jobs. I work in enterprise AI consulting, so I have an answer, but it's not one that fits in a text message — so I built them a website instead.

It teaches non-technical people how to actually use Claude for the stuff that's already on their plate: confusing paperwork, an email you don't want to overthink, planning a trip, rehearsing a hard conversation before you have it. No jargon, no "AI background" assumed. Short guides, prompts you can copy and paste right now, and a built-in "Ask the guide" chat if you'd rather just ask.

## What's on the site

- **Mood Wall** (`mood.html`) — tell it how you feel and get a wall of real art, books, music, film, documentaries and festivals chosen for that feeling. Claude picks; the browser resolves every pick against The Met, Open Library, iTunes (30-second previews) and Wikipedia, so every card is a real thing with a real link. Save cards to a local wall, share a mood by URL. This replaced the old Explorer / Creator / Reader / Film / Score chat pages, which now redirect here. Eleven walls (the starter chips plus Paris, Tokyo, Mexico City and New York) are hand-authored in `data/moods/source.json` and resolved once by `node scripts/snapshot-moods.mjs capture` into static JSON, so they load instantly and cost nothing; `index.json`'s `frozen` flag (`freeze` / `unfreeze`) decides whether typed moods call Claude or get the nearest curated wall.
- **Prompt library** — real prompts for real situations, ready to paste into Claude
- **Ask the guide** — an embedded chat that answers AI questions in plain English
- **Quick Research prototype** — a 7-screen flow probing how people actually perceive AI, misinformation, and trust
- **SIGNAL** — an AI-news feed that sweeps all 16 industries each morning in three parallel passes, with an estimated read time on every story, an on-demand search for any industry the day's sweep missed, and a downloadable podcast script
- **About page** (`about.html`) — the "why" behind the site: AI as a talent amplifier, not a replacement
- **My projects** — Global Explorer, GenAI, and Stock Advisor are surfaced right on the homepage, since they're the projects I'm actually actively building

## Stack

Plain HTML, CSS, and JavaScript — no framework, no build step, because the whole point was that it should load instantly for someone who's never touched a dev tool. The interactive bits run as Vercel serverless functions in `/api`, calling the Claude API. A small Python script filters MoMA's open dataset for the art explorer.

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

## SIGNAL snapshot (demos and credit control)

`data/signal-snapshot.json` holds the last real sweep, committed to the repo. The page shows it as an honest placeholder while today's sweep loads, and falls back to it if the API is down or the Anthropic account is out of credits — labelled with its real date, never as "today".

```bash
node scripts/snapshot-signal.mjs capture   # pull today's sweeps and save them (the only command that spends credits)
node scripts/snapshot-signal.mjs freeze    # page serves the snapshot only, never calls the API
node scripts/snapshot-signal.mjs unfreeze
node scripts/snapshot-signal.mjs status
```

Commit and push after any of these. Freeze before a demo: zero API calls, instant load, no cold-start wait.

## Environment variables

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` (get one at console.anthropic.com). In Vercel, set it under Project → Settings → Environment Variables.

## Deploying

Push to GitHub, import the repo in Vercel, add `ANTHROPIC_API_KEY`, deploy. Every push after that auto-deploys.

## What's not finished yet

Being upfront about this rather than hiding it:

- The feedback form on the homepage posts to a placeholder Formspree endpoint — needs a real form ID before it actually collects anything.
- `research.html` works but isn't linked from the nav yet, so it's only reachable by direct URL. `signal.html` is now linked from the nav.
- The "Other things I'm building" section at the bottom of the homepage is intentionally sparse right now — just a placeholder card, waiting on the next real project.
