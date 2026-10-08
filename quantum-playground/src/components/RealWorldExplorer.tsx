"use client";
import { useState } from "react";
import { MATURITY_META, REAL_WORLD, type Maturity } from "@/data/realworld";

const TAG_STYLE: Record<Maturity, string> = {
  "in-use": "border-teal/50 text-teal",
  emerging: "border-amber/50 text-amber",
  experimental: "border-violet/50 text-violet",
};

export default function RealWorldExplorer() {
  const [filter, setFilter] = useState<Maturity | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const items = REAL_WORLD.filter((c) => filter === "all" || c.maturity === filter);

  return (
    <div className="mt-6">
      <div role="group" aria-label="Filter by maturity" className="flex flex-wrap gap-2">
        <button className="btn" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All ({REAL_WORLD.length})</button>
        {(Object.keys(MATURITY_META) as Maturity[]).map((m) => (
          <button key={m} className="btn" aria-pressed={filter === m} onClick={() => setFilter(m)}>
            {MATURITY_META[m].label} ({REAL_WORLD.filter((c) => c.maturity === m).length})
          </button>
        ))}
      </div>
      {filter !== "all" && <p className="mt-3 text-sm text-muted">{MATURITY_META[filter].blurb}</p>}

      <div className="mt-6 grid items-start gap-4 sm:grid-cols-2">
        {items.map((c) => {
          const isOpen = open === c.id;
          return (
            <article key={c.id} className="card fade-in flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TAG_STYLE[c.maturity]}`}>{MATURITY_META[c.maturity].label}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{c.maturityNote}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="font-semibold text-ink">Quantum principle</dt><dd className="text-soft">{c.principle}</dd></div>
                <div><dt className="font-semibold text-ink">Real-world impact</dt><dd className="text-soft">{c.impact}</dd></div>
              </dl>
              <button className="btn mt-4 self-start" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>
                {isOpen ? "Hide" : "Show"} honest caveat &amp; sources
              </button>
              {isOpen && (
                <div className="fade-in mt-3 rounded-xl border border-line bg-card2 p-3 text-sm">
                  <p className="font-semibold text-amber">Caveat</p>
                  <p className="mt-1 text-soft">{c.caveat}</p>
                  <p className="mt-3 font-semibold">Sources</p>
                  <ul className="mt-1 list-disc pl-5 text-soft">
                    {c.sources.map((s) => (
                      <li key={s.url}><a className="text-accent underline underline-offset-2" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
