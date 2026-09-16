#!/usr/bin/env node
// scripts/snapshot-moods.mjs
// Resolves the hand-authored walls in data/moods/source.json against the free
// public APIs (The Met, Open Library, iTunes, Wikipedia) and writes one static
// JSON per wall plus an index. Nothing here touches the Claude API.
//
//   node scripts/snapshot-moods.mjs capture [slug]   resolve and write walls
//   node scripts/snapshot-moods.mjs freeze           serve snapshots only (no API calls from the page)
//   node scripts/snapshot-moods.mjs unfreeze         chips stay curated; typed moods go live again
//   node scripts/snapshot-moods.mjs status           what's on disk

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from '../js/mood-resolvers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data', 'moods');
const INDEX = path.join(DIR, 'index.json');

async function readJSON(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; }
}
async function writeJSON(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n');
}

// Resolve picks a few at a time — the Met answers slowly under a burst.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

async function captureWall(wall) {
  const cards = await mapLimit(wall.picks, 2, async (pick, i) => {
    const r = await resolve(pick).catch(() => null);
    const card = {
      id: `${wall.slug}-${pick.medium}-${i}`,
      medium: pick.medium,
      title: r?.title ?? pick.title,
      creator: r?.creator ?? pick.creator,
      year: r?.year ?? pick.year,
      why: pick.why,
      imageUrl: r?.imageUrl ?? '',
      link: r?.link ?? '',
      preview: r?.preview ?? '',
      meta: r?.meta ?? '',
      sourceName: r?.sourceName ?? '',
      resolved: true,
    };
    const ok = card.imageUrl && card.link;
    console.log(`  ${ok ? '✓' : (card.link ? '~' : '✗')} [${pick.medium}] ${card.title}${card.creator ? ' — ' + card.creator : ''}${ok ? '' : card.link ? '  (no image)' : '  (NOT FOUND)'}`);
    return card;
  });
  return { slug: wall.slug, mood: wall.mood, reading: wall.reading, place: !!wall.place, capturedAt: new Date().toISOString(), cards };
}

async function capture(only) {
  const src = await readJSON(path.join(DIR, 'source.json'));
  if (!src) throw new Error('data/moods/source.json missing');
  const prev = await readJSON(INDEX, { frozen: true, walls: [] });
  const walls = src.walls.filter(w => !only || w.slug === only);
  if (!walls.length) throw new Error(`no wall with slug "${only}"`);

  let missing = 0;
  for (const wall of walls) {
    console.log(`\n${wall.mood}  (${wall.slug})`);
    const snap = await captureWall(wall);
    missing += snap.cards.filter(c => !c.link).length;
    await writeJSON(path.join(DIR, `${wall.slug}.json`), snap);
  }

  // Index lists every wall in source order, regardless of which were re-captured.
  const index = {
    frozen: prev.frozen ?? true,
    updatedAt: new Date().toISOString(),
    walls: src.walls.map(w => ({ slug: w.slug, mood: w.mood, chip: !!w.chip, place: !!w.place })),
  };
  await writeJSON(INDEX, index);
  console.log(`\n${walls.length} wall(s) written · ${missing} pick(s) unresolved · frozen=${index.frozen}`);
}

async function setFrozen(v) {
  const idx = await readJSON(INDEX);
  if (!idx) throw new Error('no index yet — run capture first');
  idx.frozen = v;
  await writeJSON(INDEX, idx);
  console.log(`frozen=${v}`);
}

async function status() {
  const idx = await readJSON(INDEX);
  if (!idx) return console.log('no snapshots on disk');
  console.log(`frozen=${idx.frozen}  updated ${idx.updatedAt}`);
  for (const w of idx.walls) {
    const snap = await readJSON(path.join(DIR, `${w.slug}.json`));
    const n = snap?.cards?.length ?? 0, ok = snap?.cards?.filter(c => c.imageUrl && c.link).length ?? 0;
    console.log(`  ${w.chip ? '●' : '○'} ${w.mood.padEnd(44)} ${snap ? `${ok}/${n} complete` : 'MISSING'}`);
  }
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'capture') await capture(arg);
  else if (cmd === 'freeze') await setFrozen(true);
  else if (cmd === 'unfreeze') await setFrozen(false);
  else await status();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
