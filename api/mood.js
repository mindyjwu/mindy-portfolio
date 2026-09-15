// api/mood.js
// Vercel serverless function — powers the Mood Wall.
// One mood in, a JSON list of real picks out. Claude only chooses; the browser
// resolves each pick against the Met, Open Library, iTunes and Wikipedia so
// every card carries a real image, a real link and (for music) a 30s preview.

import Anthropic from '@anthropic-ai/sdk';

const MEDIUMS = ['art', 'book', 'music', 'film', 'documentary', 'festival'];

// How many picks per medium when it's switched on.
const COUNTS = { art: 3, book: 3, music: 3, film: 3, documentary: 2, festival: 2 };

const SYSTEM = `You are the curator behind Mood Wall. Someone tells you how they feel, or what kind of moment they're in, and you answer with real things — artworks, books, songs, films, documentaries and festivals — chosen for exactly that feeling.

Taste rules:
- Specific beats obvious. Reach for the pick that would make a well-read friend say "oh, yes" — not the first result anyone would guess. Mix one familiar anchor with lesser-known choices.
- Every "why" is one sentence, spoken to the person, and names the thing in the work that matches their mood. Never a plot summary, never "this is a classic".
- Spread across eras, countries and languages. No two picks by the same creator.
- Only recommend things that actually exist. If you are not sure a work exists, choose one you are sure of.

Resolution hints (the browser looks each pick up by these, so be exact):
- art: prefer works in The Metropolitan Museum of Art's collection (European and American paintings, Asian art, Egyptian, Islamic, photography, prints, textiles, arms and armor, musical instruments). "metQuery" is the artwork's title as the Met catalogs it, plus the artist's surname.
- book: title and author exactly as published in English.
- music: one track, "title" is the track name and "creator" is the artist as they appear on streaming services.
- film / documentary / festival: "wiki" is the exact English Wikipedia article title, with disambiguation if the article uses it, e.g. "Paris, Texas (film)", "Koyaanisqatsi", "Big Ears Festival".
- Give a "wiki" title for every pick when one exists; it's the fallback image source.

Respond with ONLY a JSON object, no prose before or after:
{"reading":"One warm, specific sentence reading the mood back to them, in the second person.","picks":[{"medium":"art","title":"","creator":"","year":"","why":"","metQuery":"","wiki":""},{"medium":"book","title":"","creator":"","year":"","why":"","wiki":""},{"medium":"music","title":"","creator":"","year":"","why":"","wiki":""},{"medium":"film","title":"","creator":"director","year":"","why":"","wiki":""},{"medium":"documentary","title":"","creator":"director","year":"","why":"","wiki":""},{"medium":"festival","title":"","creator":"City, Country","year":"month it happens","why":"","wiki":""}]}`;

function extractJSON(txt) {
  const c = txt.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < c.length; i++) {
    if (c[i] === '{') { if (!depth) start = i; depth++; }
    else if (c[i] === '}') { depth--; if (!depth && start >= 0) { end = i; break; } }
  }
  if (start < 0 || end < 0) throw new Error('No JSON found in response');
  const slice = c.slice(start, end + 1);
  try { return JSON.parse(slice); }
  catch {
    return JSON.parse(slice.replace(/,(\s*[}\]])/g, '$1').replace(/[\x00-\x1F]/g, ''));
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { mood, mediums } = req.body ?? {};
  const text = String(mood ?? '').trim().slice(0, 400);
  if (!text) return res.status(400).json({ error: 'mood required' });

  const wanted = Array.isArray(mediums)
    ? MEDIUMS.filter(m => mediums.includes(m))
    : MEDIUMS;
  if (wanted.length === 0) return res.status(400).json({ error: 'pick at least one medium' });

  const apiKey = process.env.mindy_secret_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY (or mindy_secret_key) is not set in Vercel environment variables' });
  }

  const ask = wanted.map(m => `${COUNTS[m]} ${m}`).join(', ');
  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `The mood: "${text}"\n\nGive me exactly: ${ask}. Only those mediums.`,
      }],
    });

    if (resp.stop_reason === 'refusal') {
      return res.status(200).json({ error: 'That one I can\'t build a wall for. Try describing the feeling a different way.' });
    }

    const raw = resp.content.find(b => b.type === 'text')?.text ?? '';
    const data = extractJSON(raw);

    const picks = (Array.isArray(data.picks) ? data.picks : [])
      .filter(p => p && wanted.includes(p.medium) && p.title)
      .map((p, i) => ({
        id: `${p.medium}-${i}`,
        medium: p.medium,
        title: String(p.title),
        creator: String(p.creator ?? ''),
        year: String(p.year ?? ''),
        why: String(p.why ?? ''),
        metQuery: p.metQuery ? String(p.metQuery) : '',
        wiki: p.wiki ? String(p.wiki) : '',
      }));

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ reading: String(data.reading ?? ''), picks });
  } catch (err) {
    console.error('mood error:', err);
    // Surface the real reason — a dead API key must never look like a taste problem.
    const status = err instanceof Anthropic.APIError ? err.status : 500;
    const message = /credit balance/i.test(err.message)
      ? 'The site\'s Claude API key is out of credits, so nothing can be chosen right now. Mindy has to top it up.'
      : err.message;
    res.status(status >= 400 ? status : 500).json({ error: message });
  }
}
