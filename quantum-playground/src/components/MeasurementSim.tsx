"use client";
import { useMemo, useState } from "react";
import { GATES, applySingle, probabilities, sample, singleQubitFromAngles } from "@/lib/quantum";
import { pct } from "@/lib/format";

type Basis = "Z" | "X";

export default function MeasurementSim() {
  const [theta, setTheta] = useState(Math.PI / 2);
  const [basis, setBasis] = useState<Basis>("Z");
  const [counts, setCounts] = useState<[number, number]>([0, 0]);
  const [last, setLast] = useState<number | null>(null);

  const probs = useMemo(() => {
    let s = singleQubitFromAngles(theta, 0);
    if (basis === "X") s = applySingle(s, 1, 0, GATES.H); // measuring X = H then measure Z
    return probabilities(s);
  }, [theta, basis]);

  const total = counts[0] + counts[1];
  const reset = () => { setCounts([0, 0]); setLast(null); };
  const measure = (k: number) => {
    let c0 = 0, c1 = 0, lastOutcome = 0;
    for (let i = 0; i < k; i++) { lastOutcome = sample(probs); if (lastOutcome === 0) c0++; else c1++; }
    setCounts(([a, b]) => [a + c0, b + c1]);
    setLast(lastOutcome);
  };
  const preset = (th: number, b: Basis = basis) => { setTheta(th); setBasis(b); reset(); };
  const labels = basis === "Z" ? ["0", "1"] : ["+", "−"];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Preset states">
          <button className="btn" onClick={() => preset(0)}>|0⟩</button>
          <button className="btn" onClick={() => preset(Math.PI / 2)}>|+⟩</button>
          <button className="btn" onClick={() => preset(Math.PI / 3)}>Biased (25% / 75%)</button>
        </div>
        <label className="block text-sm">
          <span className="flex justify-between"><span className="text-soft">Prepare state: θ</span><span className="mono">{(theta / Math.PI).toFixed(2)}π</span></span>
          <input type="range" min={0} max={Math.PI} step={0.01} value={theta} onChange={(e) => { setTheta(Number(e.target.value)); reset(); }} className="w-full accent-[var(--accent)]" />
        </label>
        <div className="flex items-center gap-2 text-sm" role="group" aria-label="Measurement basis">
          <span className="text-soft">Measure in</span>
          {(["Z", "X"] as const).map((b) => <button key={b} className="btn" aria-pressed={basis === b} onClick={() => { setBasis(b); reset(); }}>{b} basis</button>)}
        </div>
        <p className="text-sm text-soft">
          Theory: P({labels[0]}) = <span className="mono">{pct(probs[0])}</span>, P({labels[1]}) = <span className="mono">{pct(probs[1])}</span>.
          {basis === "X" && theta === Math.PI / 2 && " |+⟩ is certain in the X basis, but 50/50 in Z. The basis you measure in matters."}
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 10, 100, 1000].map((k) => <button key={k} className="btn btn-primary" onClick={() => measure(k)}>Measure ×{k}</button>)}
          <button className="btn" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm text-soft" role="status">
          {last === null ? "No measurements yet." : <>Last outcome: <span className="mono text-lg text-teal">{labels[last]}</span> · Total: {total}</>}
        </p>
        <div className="mt-4 flex h-44 items-end justify-around gap-6" aria-label="Observed frequencies">
          {[0, 1].map((i) => {
            const obs = total ? counts[i] / total : 0;
            return (
              <div key={i} className="flex h-full w-24 flex-col items-center justify-end">
                <span className="mono mb-1 text-xs">{total ? pct(obs) : "—"}</span>
                <div className="relative w-full flex-1">
                  <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-accent transition-[height] duration-500" style={{ height: `${obs * 100}%` }} />
                  <div className="absolute inset-x-[-6px] border-t-2 border-dashed border-amber" style={{ bottom: `${probs[i] * 100}%` }} title={`Theory ${pct(probs[i])}`} />
                </div>
                <span className="mono mt-1 text-sm">|{labels[i]}⟩ <span className="text-muted">({counts[i]})</span></span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Dashed line = theoretical probability. With few shots the bars wobble; they converge as shots increase (roughly 1/√N). Outcomes here come from JavaScript's pseudo-random generator, not physical randomness.
        </p>
      </div>
    </div>
  );
}
