export default function About() {
  return (
    <section id="about" className="px-8 py-20 bg-ink text-cream">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="font-mono text-xs tracking-widest text-clay uppercase mb-4">About</p>
          <h2 className="font-heading text-4xl mb-6">Hi, I&apos;m Mindy.</h2>
          <p className="font-body text-base leading-relaxed text-cream/80 mb-4">
            CS &amp; Data Science major at NYU — coursework spanning machine learning,
            database systems, responsible AI, and a Stern Data Bootcamp capstone on
            causal inference. I build and deploy RAG pipelines and AI systems for
            Fortune 500 media &amp; entertainment companies — and my parents still ask
            me whether AI is going to take their jobs.
          </p>
          <p className="font-body text-base leading-relaxed text-cream/80">
            So this is my answer. AI isn&apos;t here to replace us — it&apos;s here to help us
            do our jobs better. Everything I build is for anyone who wants to understand that
            firsthand.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {[
            ["NYU", "CS & Data Science"],
            ["Consulting", "RAG pipelines · Fortune 500 media & entertainment"],
            ["Builder", "Mindy's AI Guide"],
          ].map(([label, value]) => (
            <div key={label} className="border border-cream/10 rounded-xl p-5">
              <p className="font-mono text-xs text-clay uppercase tracking-widest mb-1">{label}</p>
              <p className="font-body text-base text-cream">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
