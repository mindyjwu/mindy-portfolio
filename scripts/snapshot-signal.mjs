#!/usr/bin/env node
// Manage data/signal-snapshot.json — the last real SIGNAL sweep, committed to
// the repo so the page always has genuine stories to show without any visitor
// ever triggering an Anthropic call.
//
//   node scripts/snapshot-signal.mjs capture [--scheduled] [--freeze]
//                                            [--from https://host]
//                                            [--min-stories N] [--min-industries N]
//       Pull a fresh sweep from the live API and save it. This is the ONLY
//       command that spends Anthropic credits (three calls).
//       --scheduled   what the daily GitHub Action runs: marks the snapshot as
//                     auto-refreshed (so the page says "Updated daily" and can
//                     warn when the refresh stops) and keeps it frozen.
//       Refuses to overwrite a good snapshot if a sweep fails, comes back from
//       a stale cache, or is thinner than the floor — a credit outage or a bad
//       model day never replaces real data with less.
//
//   node scripts/snapshot-signal.mjs freeze | unfreeze   Whether the page may call the API.
//   node scripts/snapshot-signal.mjs status              Show what's saved and how old it is.
//
// Run by hand, commit data/signal-snapshot.json afterwards. The Action commits for itself.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'signal-snapshot.json');
const DEFAULT_HOST = 'https://mindy-portfolio.vercel.app';

// The last snapshot that cleared review had 8 stories across 6 industries, so
// the floor sits just under that. A healthy sweep is ~15 across ~14; below
// that we still save, but say so in the log.
const FLOOR_STORIES = 8;
const FLOOR_INDUSTRIES = 5;
const HEALTHY_STORIES = 15;
const HEALTHY_INDUSTRIES = 12;

const [cmd = 'status', ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(name);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 && rest[i + 1] ? rest[i + 1] : dflt; };

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { frozen: false, date: null, capturedAt: null, meta: {}, stories: [] }; }
}
function save(snap) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(snap, null, 2) + '\n');
}
function ageDays(iso) {
  if (!iso) return null;
  return Math.round((Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z') - Date.parse(iso + 'T00:00:00Z')) / 864e5);
}
function describe(snap) {
  const inds = new Set(snap.stories.map(s => s.industry)).size;
  const age = ageDays(snap.date);
  console.log(`  frozen:     ${snap.frozen ? 'YES — page serves this snapshot, never calls the API' : 'no — page tries the live API first'}`);
  console.log(`  refresh:    ${snap.refresh === 'daily' ? 'daily (GitHub Action)' : 'manual'}`);
  console.log(`  sweep date: ${snap.date ?? '(none)'}${age != null ? `  (${age === 0 ? 'today' : age + ' day' + (age === 1 ? '' : 's') + ' old'})` : ''}`);
  console.log(`  captured:   ${snap.capturedAt ?? '(none)'}`);
  console.log(`  stories:    ${snap.stories.length} across ${inds} industries`);
}

// Shows up on the Actions run page, so a glance tells you what a run did.
function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); } catch { /* best effort */ }
  }
}

const keyOf = s => (s.url || '') + '|' + String(s.headline || '').toLowerCase().replace(/\W+/g, '');

function abort(why, detail = '') {
  console.error(`\nAborting: ${why}`);
  if (detail) console.error(detail);
  console.error('The existing snapshot is untouched.');
  summary(`### ❌ SIGNAL capture aborted\n\n**${why}**\n\n${detail}\n\nThe existing snapshot was left untouched.`);
  process.exit(1);
}

async function capture() {
  const host = opt('--from', DEFAULT_HOST).replace(/\/$/, '');
  const scheduled = flag('--scheduled');
  const minStories = Number(opt('--min-stories', FLOOR_STORIES));
  const minIndustries = Number(opt('--min-industries', FLOOR_INDUSTRIES));
  console.log(`Capturing three sweeps from ${host} …`);
  const t0 = Date.now();

  // The API tells the edge to serve a cached sweep for 6h and a STALE one for
  // 24h more. Asked at 6am, we could be handed yesterday's stories and stamp
  // them with today's date. A unique query string makes every capture a
  // cache miss; the API ignores params it doesn't know.
  const bust = Date.now();

  const results = await Promise.all([1, 2, 3].map(async n => {
    const url = `${host}/api/signal?batch=${n}&_=${bust}`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(280_000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), { status: r.status });
      const cache = r.headers.get('x-vercel-cache') || '?';
      if (cache === 'STALE') throw new Error('edge served a STALE cached sweep, so its date cannot be trusted');
      console.log(`  batch ${n}: ${j.stories?.length ?? 0} stories  (edge ${cache})`);
      return { ok: true, stories: j.stories || [], meta: j.meta || {} };
    } catch (e) {
      console.log(`  batch ${n}: FAILED — ${String(e.message).slice(0, 200)}`);
      return { ok: false, error: String(e.message), status: e.status, stories: [], meta: {} };
    }
  }));

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    // api/signal.js swaps Anthropic's billing text for "Live sweeps are paused"
    // + a 503 and says so only for a credit-balance error, so that is the tell.
    const credit = failed.some(f => f.status === 503 || /credit balance|billing|sweeps are paused/i.test(f.error));
    abort(`${failed.length} of 3 sweeps failed.`,
      credit ? 'The API reports live sweeps are paused, which it only does when the Anthropic account is out of credits. Top up under Plans & Billing and re-run; no code change is needed.'
             : failed.map(f => `- ${f.error.slice(0, 200)}`).join('\n'));
  }

  const stories = [...new Map(results.flatMap(r => r.stories).map(s => [keyOf(s), s])).values()];
  const industries = new Set(stories.map(s => s.industry)).size;

  if (stories.length < minStories || industries < minIndustries) {
    abort(`sweep too thin: ${stories.length} stories across ${industries} industries (floor is ${minStories} / ${minIndustries}).`,
      'A model off-day, not an outage. Re-running usually fixes it; the previous snapshot stays live meanwhile.');
  }

  const prev = load();
  const prevKeys = new Set(prev.stories.map(keyOf));
  const fresh = stories.filter(s => !prevKeys.has(keyOf(s))).length;
  const date = new Date().toISOString().slice(0, 10);

  const snap = {
    // A scheduled snapshot is meant to be served statically: visitors never call the API.
    frozen: scheduled ? true : (flag('--freeze') ? true : prev.frozen),
    ...(scheduled || prev.refresh ? { refresh: scheduled ? 'daily' : prev.refresh } : {}),
    date,
    capturedAt: new Date().toISOString(),
    meta: results.find(r => r.meta.hottest)?.meta ?? results[0].meta,
    stories,
  };
  save(snap);

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nSaved ${stories.length} stories in ${secs}s → ${path.relative(ROOT, FILE)}`);
  console.log(`  ${fresh} of ${stories.length} are new since the ${prev.date ?? 'previous'} snapshot`);
  const thin = stories.length < HEALTHY_STORIES || industries < HEALTHY_INDUSTRIES;
  if (thin) console.log(`  note: thinner than a healthy sweep (~${HEALTHY_STORIES} stories / ~${HEALTHY_INDUSTRIES}+ industries)`);
  describe(snap);

  summary([
    `### ✅ SIGNAL snapshot refreshed — ${date}`,
    '',
    '| | |', '|---|---|',
    `| Stories | ${stories.length} |`,
    `| Industries | ${industries} of 16 |`,
    `| New since ${prev.date ?? 'previous'} | ${fresh} |`,
    `| Time | ${secs}s |`,
    ...(thin ? ['', '> ⚠️ Thinner than a healthy sweep. Worth a look, but within the floor.'] : []),
  ].join('\n'));

  if (!scheduled) console.log('\nNext: git add data/signal-snapshot.json && git commit -m "chore(signal): refresh snapshot" && git push');
}

function setFrozen(v) {
  const snap = load();
  if (!snap.stories.length) {
    console.error('No snapshot to freeze — run `capture` first.');
    process.exit(1);
  }
  snap.frozen = v;
  save(snap);
  console.log(v ? 'Frozen. Commit and push, and the page will never call the API.' : 'Unfrozen. The page will try the live API again.');
  describe(snap);
}

switch (cmd) {
  case 'capture':  await capture(); break;
  case 'freeze':   setFrozen(true); break;
  case 'unfreeze': setFrozen(false); break;
  case 'status':   describe(load()); break;
  default:
    console.error(`Unknown command "${cmd}". Use: capture [--scheduled] [--freeze] | freeze | unfreeze | status`);
    process.exit(2);
}
