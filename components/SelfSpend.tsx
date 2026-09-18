const columns = [
  {
    heading: "The problem",
    body:
      "Bank categories are useless here. Plaid lumps a med spa, a nail bar, a hair salon and a Mindbody-booked pilates class into one code, and independents arrive as processor strings like SQ *ROSE STUDIO. self-spend keeps a hand-seeded NYC merchant dictionary, a rules layer, a Claude fallback for the unknowns, and user corrections that stick.",
  },
  {
    heading: "How it works",
    body:
      "It remembers what women in NYC spend on themselves — skin, hair, nails, strength, food, clothes, home, culture, care — and, over time, what it does for them. It never shows a monthly total. It shows what the next $200 buys, with real merchants, real list prices and booking links. A weekly three-tap check-in (three dimensions you pick, rated 1 to 5) lets spend be related to outcomes later.",
  },
  {
    heading: "Privacy is the product",
    body:
      "Read-only Plaid. The one card you choose. No name or account number stored. One tap revokes access and deletes everything. A plain-language “what you do not have to worry about” page lives in the app.",
  },
];

const picks = [
  { merchant: "Rose Studio", what: "Gel manicure", where: "Nolita", price: "$45" },
  { merchant: "Heyday", what: "50-min facial", where: "Flatiron", price: "$120" },
  { merchant: "Sky Ting", what: "Single class", where: "Tribeca", price: "$35" },
];

export default function SelfSpend() {
  return (
    <section id="selfspend" className="bg-[#F6E7E4]">
      <div className="px-8 py-20 max-w-4xl mx-auto">
        <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] items-center mb-16">
          <div>
            <p className="font-mono text-xs tracking-widest text-clay uppercase mb-4">Case study</p>
            <p className="font-heading text-2xl text-ink mb-1">
              self-spend
              <span className="font-mono text-xs tracking-widest text-ink-muted uppercase ml-3 align-middle">
                financial keeper
              </span>
            </p>
            <h2 className="font-heading text-4xl text-ink mb-4">A keeper, not a budget.</h2>
            <p className="font-body text-lg text-ink-soft max-w-md">
              It never shows a monthly total. It shows what the next $200 buys, with real merchants,
              real list prices and booking links.
            </p>
          </div>

          {/* Mock card */}
          <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 shadow-sm">
            <p className="font-mono text-xs text-ink-muted">Card · Sep 18 · read-only</p>
            <h3 className="font-heading text-2xl text-ink">What the next $200 buys you</h3>
            <ul className="flex flex-col divide-y divide-border">
              {picks.map((p) => (
                <li key={p.merchant} className="flex items-baseline justify-between gap-4 py-3">
                  <div>
                    <p className="font-body text-sm font-medium text-ink">{p.merchant}</p>
                    <p className="font-body text-xs text-ink-muted">
                      {p.what} · {p.where}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-ink whitespace-nowrap">{p.price}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between gap-4 pt-1">
              <span className="font-body text-xs text-ink-muted">List prices · booking links inside</span>
              <span className="font-mono text-sm text-clay whitespace-nowrap">$200 → $0 left</span>
            </div>
            <p className="font-body text-xs text-ink-muted border-t border-border pt-3">
              Was SQ *ROSE STUDIO on the statement. Corrected once, remembered forever.
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mb-12">
          {columns.map((c) => (
            <div key={c.heading}>
              <p className="font-mono text-xs text-clay uppercase tracking-widest mb-2">{c.heading}</p>
              <p className="font-body text-sm text-ink-soft leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <a
            href="/selfspend/"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-3 bg-clay text-white rounded-full font-body font-medium hover:bg-clay-dark transition-colors"
          >
            Try the demo →
          </a>
          <a
            href="https://github.com/mindyjwu/selfspend"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-3 border border-ink/20 text-ink rounded-full font-body font-medium hover:border-clay hover:text-clay transition-colors"
          >
            Source on GitHub →
          </a>
          <a
            href="https://github.com/mindyjwu/selfspend/blob/main/docs/privacy-promise.md"
            target="_blank"
            rel="noopener"
            className="font-body text-sm font-medium text-clay hover:text-clay-dark transition-colors"
          >
            Read the privacy promise →
          </a>
        </div>

        <p className="font-mono text-xs text-ink-muted mt-10">
          Python stdlib + SQLite · Plaid REST · Claude API structured outputs for unknown merchants · single-file UI
        </p>
      </div>
    </section>
  );
}
