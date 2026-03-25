export default function Hero() {
  return (
    <section className="pt-32 pb-24 px-8 max-w-4xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-clay uppercase mb-6">
        CS &amp; Data Science · NYU · Consulting
      </p>
      <h1 className="font-heading text-6xl md:text-7xl text-ink leading-tight mb-8">
        Building things<br />
        <em>that actually help.</em>
      </h1>
      <p className="font-body text-lg text-ink-soft max-w-xl leading-relaxed mb-10">
        I'm Mindy — I study CS &amp; Data Science at NYU and work in consulting. I build tools
        and tutorials to help non-technical people get the most out of AI.
      </p>
      <div className="flex gap-4 flex-wrap">
        <a
          href="#work"
          className="inline-flex items-center gap-2 px-6 py-3 bg-clay text-white rounded-full font-body font-medium hover:bg-clay-dark transition-colors"
        >
          See my work
        </a>
        <a
          href="https://mindys-ai-guide.vercel.app"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-6 py-3 border border-ink/20 text-ink rounded-full font-body font-medium hover:border-clay hover:text-clay transition-colors"
        >
          Mindy&apos;s AI Guide →
        </a>
      </div>
    </section>
  );
}
