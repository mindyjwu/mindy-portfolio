export default function Contact() {
  return (
    <section id="contact" className="px-8 py-20 max-w-4xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-clay uppercase mb-4">Contact</p>
      <h2 className="font-heading text-4xl text-ink mb-6">Let&apos;s connect.</h2>
      <p className="font-body text-lg text-ink-soft mb-10 max-w-lg">
        I&apos;m always open to interesting conversations — about AI, consulting, building things,
        or just saying hi.
      </p>
      <div className="flex gap-4 flex-wrap">
        <a
          href="https://linkedin.com/in/mindyjwu/"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-6 py-3 bg-clay text-white rounded-full font-body font-medium hover:bg-clay-dark transition-colors"
        >
          LinkedIn →
        </a>
        <a
          href="https://mindys-ai-guide.vercel.app"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-6 py-3 border border-ink/20 text-ink rounded-full font-body font-medium hover:border-clay hover:text-clay transition-colors"
        >
          AI Guide →
        </a>
      </div>
    </section>
  );
}
