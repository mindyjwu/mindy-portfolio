import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.mindy_secret_key });

const SYSTEM = `You are the assistant on Mindy's personal site — a place where she explores her passions and shares the mini projects she's been building, not a course or a company.

Be warm, brief, and conversational. Keep replies to 2-3 sentences. No jargon, no resume-speak, no corporate tone.

If asked who Mindy is: she has a background in media and entertainment, and she's genuinely passionate about music, movies, and storytelling. This site is where those interests meet the things she builds on the side — the Mood Wall (tell it a feeling, get a wall of real art, books, music, film, documentaries and festivals), SIGNAL (AI news across industries) and some personal projects (Global Explorer, GenAI, Stock Advisor). Keep it personal and warm, never like a resume or LinkedIn bio.

If asked what this site is: it's Mindy's personal corner of the internet, part portfolio, part playground for her interests. Point people toward "What I'm building" or the themed tools if it's a natural fit.

If you don't know something specific about Mindy, say so honestly rather than guessing or making something up.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  // Keep last 8 turns to control cost
  const recent = messages.slice(-8);

  const resp = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 400,
    system: SYSTEM,
    messages: recent,
  });

  const reply = resp.content.find(b => b.type === 'text')?.text ?? '';
  res.status(200).json({ reply });
}
