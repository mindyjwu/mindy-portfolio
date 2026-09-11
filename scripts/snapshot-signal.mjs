#!/usr/bin/env node
// Manage data/signal-snapshot.json — the last real SIGNAL sweep, committed to
// the repo so the page always has genuine stories to show, and so a demo can
// run with zero API calls.
//
//   node scripts/snapshot-signal.mjs capture [--freeze] [--from https://host]
//       Pull today's three sweeps from the live API and save them. This is the
//       ONLY command that can spend Anthropic credits (3 calls, or 0 if the
//       edge cache is warm). Refuses to overwrite a good snapshot if any sweep
//       fails, so a credit outage never clobbers real data with nothing.
//
//   node scripts/snapshot-signal.mjs freeze      Serve the snapshot only; the
//   node scripts/snapshot-signal.mjs unfreeze    page never calls the API.
//   node scripts/snapshot-signal.mjs status      Show what's saved.
//
// After any of these: git add data/signal-snapshot.json && git commit && git push.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'signal-snapshot.json');
const DEFAULT_HOST = 'https://mindys-ai-guide.vercel.app';

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
function describe(snap) {
  const inds = new Set(snap.stories.map(s => s.industry)).size;
  console.log(`  frozen:     ${snap.frozen ? 'YES — page serves this snapshot, never calls the API' : 'no — page tries the live API first'}`);
  console.log(`  sweep date: ${snap.date ?? '(none)'}`);
  console.log(`  captured:   ${snap.capturedAt ?? '(none)'}`);
  console.log(`  stories:    ${snap.stories.length} across ${inds} industries`);
}

const keyOf = s => (s.url || '') + '|' + String(s.headline || '').toLowerCase().replace(/\W+/g, '');

async function capture() {
  const host = opt('--from', DEFAULT_HOST).replace(/\/$/, '');
  console.log(`Capturing three sweeps from ${host} …`);
  const t0 = Date.now();

  const results = await Promise.all([1, 2, 3].map(async n => {
    const url = `${host}/api/signal?batch=${n}`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(280_000) });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      const cache = r.headers.get('x-vercel-cache') || '?';
      console.log(`  batch ${n}: ${j.stories?.length ?? 0} stories  (edge cache ${cache})`);
      return { ok: true, stories: j.stories || [], meta: j.meta || {} };
    } catch (e) {
      console.log(`  batch ${n}: FAILED — ${String(e.message).slice(0, 160)}`);
      return { ok: false, stories: [], meta: {} };
    }
  }));

  const failed = results.filter(r => !r.ok).length;
  const stories = [...new Map(results.flatMap(r => r.stories).map(s => [keyOf(s), s])).values()];

  if (failed || !stories.length) {
    console.error(`\nAborting: ${failed} of 3 sweeps failed. The existing snapshot is untouched.`);
    console.error('If the error mentions credit balance, that is Anthropic billing, not this code.');
    process.exit(1);
  }

  const prev = load();
  const snap = {
    frozen: flag('--freeze') ? true : prev.frozen,
    date: new Date().toISOString().slice(0, 10),
    capturedAt: new Date().toISOString(),
    meta: results.find(r => r.meta.hottest)?.meta ?? results[0].meta,
    stories,
  };
  save(snap);
  console.log(`\nSaved ${stories.length} stories in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(ROOT, FILE)}`);
  describe(snap);
  console.log('\nNext: git add data/signal-snapshot.json && git commit -m "chore(signal): refresh snapshot" && git push');
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
    console.error(`Unknown command "${cmd}". Use: capture [--freeze] | freeze | unfreeze | status`);
    process.exit(2);
}
