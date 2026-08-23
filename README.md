# Mindy Wu — Portfolio

**[mindy-portfolio.vercel.app](https://mindy-portfolio.vercel.app)**

The one-page version of "what do you actually do." Consulting work on enterprise AI deployments during the day, a handful of side projects that try to make AI feel less intimidating the rest of the time. This site is where those two things sit next to each other.

## What's on it

- A single-page layout, smooth-scroll navigation, no clicking through five tabs to find anything
- An editorial type system — serif display headings, sans body text, monospaced accents — instead of the default SaaS-landing-page look
- Project cards that link straight out to the live work, not to more marketing copy
- Staggered fade-up entrances, kept subtle on purpose

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. Type is DM Serif Display, DM Sans, and DM Mono, loaded through `next/font`. Deployed on Vercel.

## Why this exists as its own site

Mindy's AI Guide is written for someone with zero AI background — it's deliberately not about me. This site is the opposite: it's the one place that's actually about the work, for anyone who clicks through from a resume or a LinkedIn message wanting the fuller picture.

## Running it locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Status

Currently redeploying — if the live link 404s, that's a deployment gap on my end, not a broken build. Fixing.
