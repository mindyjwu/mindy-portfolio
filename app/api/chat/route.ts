import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";

// Route handlers are never cached for POST; this runs at request time.
export const runtime = "nodejs";

// Model: Claude Haiku 4.5 — fast and inexpensive, a good fit for a public
// portfolio Q&A. Swap to "claude-opus-5" if you want a more capable (but
// slower and ~5x pricier) model.
const MODEL = "claude-haiku-4-5";

const SYSTEM = `You are the assistant on Mindy Wu's personal portfolio website. Visitors — often recruiters — ask you about Mindy. Answer as a knowledgeable, friendly guide to her work.

About Mindy:
- Technology consultant and AI builder based in New York.
- Builds and deploys RAG pipelines and AI systems for Fortune 500 media & entertainment companies — turning strategy into shipped product.
- Also builds AI tools for non-technical people.
- Studying CS & Data Science at NYU (machine learning, AI, and a Stern Data Bootcamp capstone).
- Open to StratOps and Solutions roles at AI-native companies.

Her projects:
1. Mindy's AI Guide — short, honest tutorials teaching non-technical people to use AI for everyday tasks (emails, documents, planning). Claude-powered. https://mindys-ai-guide.vercel.app
2. AI Literacy Survey — a 7-screen UX research prototype on how people perceive AI, misinformation, and trust.
3. Global Explorer — a 3D globe where you click a country and explore its cities; React + MapLibre GL + Vite. https://global-explorer.vercel.app
4. GenAI — ask anything and get two answers from personas "Kyle" and "Kylie" in distinct communication styles; your picks reveal your own style. Next.js + Claude + Supabase. https://gender-ai.vercel.app
5. Stock Advisor — grades stocks on fundamentals, technicals, and AI-analyzed news sentiment, then turns deposits into diversified buy plans. Python + Streamlit + Claude. Educational, not financial advice.

To reach Mindy: LinkedIn (https://linkedin.com/in/mindyjwu) or the contact section of this site.

Rules:
- Only answer questions about Mindy, her background, projects, skills, and how to reach her. If asked about anything else, briefly and warmly redirect to what you can help with.
- Keep answers short — usually 2 to 4 sentences. Be plain-spoken; no marketing fluff.
- Never invent facts. If something isn't covered above (specific dates, GPA, salary, private contact details), say you don't have that and point to her LinkedIn or the contact section.`;

// Best-effort in-memory rate limit. Serverless instances are ephemeral and not
// shared, so this only throttles bursts hitting the same warm instance — it is a
// courtesy guard, not airtight abuse protection.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 20;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "The chat isn't configured yet — set ANTHROPIC_API_KEY to enable it." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return Response.json(
      { error: "That's a lot of questions in a short time — give it a minute and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const incoming = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(incoming)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Sanitize: keep only well-formed user/assistant string turns, cap the number
  // of turns and the length of each to bound cost and abuse.
  const messages: Anthropic.MessageParam[] = incoming
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        !!m &&
        typeof m === "object" &&
        ((m as { role?: unknown }).role === "user" ||
          (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string",
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages,
    });

    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return Response.json({
      reply: reply || "Sorry, I didn't catch that — could you rephrase?",
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "The assistant is busy right now — try again in a moment." },
        { status: 429 },
      );
    }
    console.error("chat route error:", error);
    return Response.json(
      { error: "Something went wrong answering that. Please try again." },
      { status: 500 },
    );
  }
}
