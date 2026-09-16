// js/mood-resolvers.js
// Turns a pick ({medium, title, creator, ...hints}) into a real card
// ({imageUrl, link, preview?, meta?}) using keyless public APIs.
// Plain ESM with no DOM access, so the same code runs in the browser
// (mood.html) and in Node (scripts/snapshot-moods.mjs).

export function norm(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function words(s) { return new Set(norm(s).split(' ').filter(w => w.length > 1)); }

// Share of the smaller set found in the larger — forgiving of subtitles and "(Remastered)".
export function overlap(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
// Jaccard — punishes extra names, so "AURORA & Nick Drake" ranks below "Nick Drake".
export function same(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / (A.size + B.size - n);
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Browsers ignore a User-Agent header; Node sends it, and Wikipedia's API policy asks for one.
const HEADERS = { 'User-Agent': 'MoodWall/1.0 (https://mindy-portfolio.vercel.app; snapshot script)', 'Accept': 'application/json' };

// The Met's bot shield blocks bursts, so requests to it are spaced out per host.
const PACE_MS = { 'collectionapi.metmuseum.org': 400, 'en.wikipedia.org': 150 };
const nextSlot = {};
async function pace(url) {
  const host = new URL(url).host, gap = PACE_MS[host];
  if (!gap) return;
  const at = Math.max(Date.now(), nextSlot[host] || 0);
  nextSlot[host] = at + gap;
  await sleep(at - Date.now());
}

// Retries 429/403 with backoff (honouring Retry-After) so a burst doesn't turn into a wall of misses.
async function getJSON(url, ms = 8000, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    await pace(url);
    const r = await withTimeout(fetch(url, { headers: HEADERS }), ms);
    if (r.ok) return r.json();
    const retryable = (r.status === 429 || r.status === 403 || r.status >= 500) && attempt < tries;
    if (!retryable) throw new Error(`${r.status}`);
    const wait = Number(r.headers.get('retry-after')) * 1000 || 1500 * 2 ** attempt;
    await sleep(Math.min(wait, 30000));
  }
}

/* ---------- Wikipedia (film, documentary, festival; fallback for everything) ---------- */
export async function resolveWiki(title) {
  if (!title) return null;
  const d = await getJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (d.type === 'disambiguation') return null;
  // Wikimedia only serves pre-rendered thumbnail widths (rewriting the px size 400s),
  // so take the original when it's a sane size and the ~330px thumb otherwise.
  const orig = d.originalimage;
  const img = orig && orig.width <= 2000 ? orig.source : (d.thumbnail?.source || orig?.source || '');
  return { imageUrl: img, link: d.content_urls?.desktop?.page || '', sourceName: 'Wikipedia' };
}

/* ---------- The Met ---------- */
const MET = 'https://collectionapi.metmuseum.org/public/collection/v1';

function metCard(o) {
  return {
    imageUrl: o.primaryImageSmall,
    link: o.objectURL,
    sourceName: 'The Met',
    meta: [o.artistDisplayName, o.objectDate].filter(Boolean).join(' · '),
  };
}

// A specific work: search by title + artist, keep the best fuzzy match.
// Some famous works are flagged non-public-domain in the Met's data and carry no
// image; those come back link-only so the dispatcher can borrow Wikipedia's picture.
export async function resolveMet(pick) {
  const q = pick.metQuery || `${pick.title} ${pick.creator}`;
  const s = await getJSON(`${MET}/search?q=${encodeURIComponent(q)}`);
  const ids = (s.objectIDs || []).slice(0, 6);
  if (!ids.length) return null;
  const objs = [];
  for (const id of ids) objs.push(await getJSON(`${MET}/objects/${id}`, 9000).catch(() => null));
  const scored = objs.filter(Boolean).map(o => ({
    o, title: overlap(o.title, pick.title), artist: same(o.artistDisplayName, pick.creator),
  })).filter(x => x.title >= 0.5 && (x.artist >= 0.3 || x.title === 1))
    .sort((a, b) => (b.title * 2 + b.artist + (b.o.primaryImageSmall ? 0.5 : 0)) - (a.title * 2 + a.artist + (a.o.primaryImageSmall ? 0.5 : 0)));
  if (!scored.length) return null;
  const o = scored[0].o;
  return { ...metCard(o), imageUrl: o.primaryImageSmall || '' };
}

// "Something from <place>": the Met's own highlights tagged with that geography,
// narrowed to a department so a French wall gets paintings rather than accordions.
// pick.metGeoIndex picks the Nth highlight that has an image, so picks on one wall differ.
export async function resolveMetGeo(pick) {
  const dept = pick.metGeoDept ? `&departmentId=${pick.metGeoDept}` : '';
  const s = await getJSON(`${MET}/search?geoLocation=${encodeURIComponent(pick.metGeo)}${dept}&hasImages=true&isHighlight=true&q=*`);
  const ids = s.objectIDs || [];
  const want = pick.metGeoIndex || 0;
  let seen = 0;
  for (const id of ids.slice(0, want + 6)) {
    const o = await getJSON(`${MET}/objects/${id}`, 9000).catch(() => null);
    if (!o || !o.primaryImageSmall) continue;
    if (seen++ < want) continue;
    // The pick's title/creator/year are placeholders; the real object fills them in.
    return { ...metCard(o), title: o.title, creator: o.artistDisplayName || o.culture || '', year: o.objectDate || '' };
  }
  return null;
}

/* ---------- Open Library ---------- */
export async function resolveBook(pick) {
  const d = await getJSON(`https://openlibrary.org/search.json?title=${encodeURIComponent(pick.title)}&author=${encodeURIComponent(pick.creator)}&limit=5&fields=key,title,author_name,cover_i,first_publish_year`);
  const docs = (d.docs || []).filter(x => x.cover_i);
  const best = docs.map(x => ({ x, score: overlap(x.title, pick.title) + same((x.author_name || []).join(' '), pick.creator) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.5) return null;
  return {
    imageUrl: `https://covers.openlibrary.org/b/id/${best.x.cover_i}-L.jpg`,
    link: `https://openlibrary.org${best.x.key}`,
    sourceName: 'Open Library',
  };
}

/* ---------- iTunes (30-second previews) ---------- */
export async function resolveMusic(pick) {
  const d = await getJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(`${pick.title} ${pick.creator}`)}&entity=song&limit=5`);
  const best = (d.results || []).map(x => ({ x, score: overlap(x.trackName, pick.title) * 2 + same(x.artistName, pick.creator) * 1.5 }))
    .sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.6) return null;
  const x = best.x;
  return {
    imageUrl: (x.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    link: x.trackViewUrl,
    preview: x.previewUrl || '',
    sourceName: 'Apple Music',
    meta: [x.artistName, x.collectionName].filter(Boolean).join(' · '),
  };
}

/* ---------- Art: the Met first; Wikipedia fills in whatever the Met couldn't ---------- */
async function resolveArt(pick) {
  const met = await resolveMet(pick).catch(() => null);
  if (met && met.imageUrl) return met;
  const wiki = pick.wiki ? await resolveWiki(pick.wiki).catch(() => null) : null;
  if (met && wiki?.imageUrl) return { ...met, imageUrl: wiki.imageUrl };   // Met link, Wikipedia picture
  return wiki || met;
}

/* ---------- Dispatcher: first resolver that returns an image or a link wins ---------- */
export async function resolve(pick) {
  if (pick.medium === 'art' && !pick.metGeo) return resolveArt(pick);
  const chain = {
    art:         [() => resolveMetGeo(pick)],
    book:        [() => resolveBook(pick), () => resolveWiki(pick.wiki)],
    music:       [() => resolveMusic(pick), () => resolveWiki(pick.wiki)],
    film:        [() => resolveWiki(pick.wiki), () => resolveWiki(pick.title)],
    documentary: [() => resolveWiki(pick.wiki), () => resolveWiki(pick.title)],
    festival:    [() => resolveWiki(pick.wiki), () => resolveWiki(pick.title)],
  }[pick.medium] || [];
  for (const step of chain) {
    try { const r = await step(); if (r && (r.imageUrl || r.link)) return r; } catch { /* try next */ }
  }
  return null;
}
