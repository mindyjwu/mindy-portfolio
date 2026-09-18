const projects = [
  {
    tag: "Web · AI Education",
    title: "Mindy's AI Guide",
    desc: "Short, honest video tutorials showing non-technical people how to use AI for everyday tasks — emails, documents, planning, and more.",
    link: "https://mindys-ai-guide.vercel.app",
    linkLabel: "Visit site →",
    bg: "bg-clay-light",
  },
  {
    tag: "Research · UX",
    title: "AI Literacy Survey",
    desc: "A 7-screen user research prototype exploring how people perceive AI, misinformation, and trust — built to validate content direction for the AI Guide.",
    link: "https://mindys-ai-guide.vercel.app/research.html",
    linkLabel: "See prototype →",
    bg: "bg-[#EEF5F0]",
  },
  {
    tag: "Interactive map · React + MapLibre GL + Vite",
    title: "Global Explorer",
    desc: "Click any country on a 3D globe and explore its cities, each tagged by what makes it worth visiting.",
    link: "https://global-explorer-ivory.vercel.app",
    linkLabel: "Visit site →",
    bg: "bg-[#DCEEE3]",
  },
  {
    tag: "Communication style discovery · Next.js + Claude + Supabase",
    title: "GenAI",
    desc: "Ask anything and get two perspectives — Kyle and Kylie respond in distinct communication styles. Pick what resonates, and discover what your choices say about you.",
    link: "https://gender-ai.vercel.app",
    linkLabel: "Visit site →",
    bg: "bg-[#E9F0DE]",
  },
  {
    tag: "AI stock dashboard · Python + Streamlit + Claude",
    title: "Stock Advisor",
    desc: "Grades stocks on fundamentals, technicals, and AI-analyzed news sentiment, then turns cash deposits into diversified buy plans. Educational tool, not financial advice.",
    link: "/stock-advisor.html",
    linkLabel: "Visit site →",
    bg: "bg-[#DFF3EC]",
  },
  {
    tag: "Spend memory · Python + Plaid + Claude",
    title: "selfspend",
    desc: "Classifies what women spend on themselves in NYC — skin, hair, nails, strength, culture, care — past the useless bank categories, and shows what the next $200 buys. No budgets, no totals.",
    link: "/selfspend/",
    linkLabel: "Try the demo →",
    bg: "bg-[#F6E7E4]",
  },
  {
    tag: "Product concept · static PWA + similarity engine",
    title: "People Like Me",
    desc: "A vetted beauty and body provider directory plus community, ranked by people who actually share your hair type, skin tone and eye shape. NYC demo with a working per-vertical matching engine.",
    link: "https://mindyjwu.github.io/people-like-me/",
    linkLabel: "Try the demo →",
    bg: "bg-[#F3E6EC]",
  },
  {
    tag: "Coming soon",
    title: "More projects",
    desc: "Data science projects, consulting case studies, and other builds. Check back soon.",
    link: null,
    linkLabel: null,
    bg: "bg-[#F1F0EA]",
  },
];

export default function Work() {
  return (
    <section id="work" className="px-8 py-20 max-w-4xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-clay uppercase mb-4">Work</p>
      <h2 className="font-heading text-4xl text-ink mb-12">Things I&apos;ve built</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div key={p.title} className={`rounded-2xl p-6 flex flex-col gap-4 ${p.bg}`}>
            <span className="font-mono text-xs text-ink-muted">{p.tag}</span>
            <h3 className="font-heading text-2xl text-ink">{p.title}</h3>
            <p className="font-body text-sm text-ink-soft leading-relaxed flex-1">{p.desc}</p>
            {p.link && (
              <a
                href={p.link}
                target="_blank"
                rel="noopener"
                className="font-body text-sm font-medium text-clay hover:text-clay-dark transition-colors"
              >
                {p.linkLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
