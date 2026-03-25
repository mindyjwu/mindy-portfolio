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
    bg: "bg-[#E4EFE8]",
  },
  {
    tag: "Coming soon",
    title: "More projects",
    desc: "Data science projects, consulting case studies, and other builds. Check back soon.",
    link: null,
    linkLabel: null,
    bg: "bg-[#FDF6DC]",
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
