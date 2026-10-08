"use client";
import { useMemo, useState } from "react";
import { basisLabel, blochVector, probabilities, runCircuit, sample, type CircuitOp } from "@/lib/quantum";
import { ketString, pct } from "@/lib/format";

const STEPS: { title: string; text: string; ops: CircuitOp[] }[] = [
  { title: "Start: |00⟩", text: "Both qubits are |0⟩. Each is a pure state on its own sphere.", ops: [] },
  { title: "Apply H to q0", text: "q0 is now an equal superposition. The pair is still a product state: q1 is untouched.", ops: [{ kind: "gate", gate: "H", qubit: 0 }] },
  {
    title: "Apply CNOT (q0 → q1)", text: "Now q1 flips only in the branch where q0 = 1. The state (|00⟩ + |11⟩)/√2 can't be split into one state per qubit. That's entanglement.",
    ops: [{ kind: "gate", gate: "H", qubit: 0 }, { kind: "cnot", control: 0, target: 1 }],
  },
];

export default function BellDemo() {
  const [step, setStep] = useState(0);
  const [pairs, setPairs] = useState<string[]>([]);
  const state = useMemo(() => runCircuit(2, STEPS[step].ops), [step]);
  const probs = probabilities(state);
  const lens = [0, 1].map((k) => Math.hypot(...blochVector(state, 2, k)));

  const measure = (k: number) => {
    const out: string[] = [];
    for (let i = 0; i < k; i++) out.push(basisLabel(sample(probs), 2));
    setPairs((p) => [...out.reverse(), ...p].slice(0, 200));
  };
  const agree = pairs.filter((p) => p[0] === p[1]).length;
  const ones = pairs.filter((p) => p[0] === "1").length;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={i}>
              <button onClick={() => { setStep(i); setPairs([]); }} aria-current={i === step ? "step" : undefined}
                className={`card w-full p-3 text-left transition-colors ${i === step ? "!border-accent" : "hover:border-soft"}`}>
                <span className="text-sm font-semibold">{i + 1}. {s.title}</span>
                {i === step && <span className="fade-in mt-1 block text-sm text-soft">{s.text}</span>}
              </button>
            </li>
          ))}
        </ol>
        <div className="card p-4">
          <p className="mono text-sm break-words">|ψ⟩ = {ketString(state, 2)}</p>
          <div className="mt-3 space-y-2">
            {probs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="mono w-12 text-soft">|{basisLabel(i, 2)}⟩</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-card2"><div className="bar h-full rounded-full bg-accent" style={{ width: `${p * 100}%` }} /></div>
                <span className="mono w-14 text-right">{pct(p)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {lens.map((l, k) => (
              <div key={k} className="rounded-xl border border-line bg-card2 p-3">
                <p className="text-soft">q{k} Bloch vector length</p>
                <p className="mono text-xl">{l.toFixed(2)}</p>
                <p className="text-xs text-muted">{l > 0.99 ? "pure state on its own" : l < 0.01 ? "maximally entangled" : "partly entangled"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold">Measure the pair</h3>
        <p className="mt-1 text-sm text-soft">Each click samples both qubits together (q0 q1).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => measure(1)}>Measure ×1</button>
          <button className="btn btn-primary" onClick={() => measure(20)}>×20</button>
          <button className="btn" onClick={() => setPairs([])}>Clear</button>
        </div>
        <div className="mono fade-in mt-4 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto text-sm" aria-label="Measurement results" role="log">
          {pairs.length === 0 && <span className="text-muted">No results yet.</span>}
          {pairs.slice(0, 60).map((p, i) => (
            <span key={`${pairs.length}-${i}`} className={`rounded-md border px-1.5 py-0.5 ${p[0] === p[1] ? "border-teal/60 text-teal" : "border-rose/60 text-rose"}`}>{p}</span>
          ))}
        </div>
        {pairs.length > 0 && (
          <p className="mt-3 text-sm text-soft" role="status">
            {pairs.length} shots · q0 = 1 in {ones} · <span className="font-semibold text-ink">q0 and q1 agree in {agree}/{pairs.length}</span>
          </p>
        )}
        <div className="mt-4 rounded-xl border border-line bg-card2 p-3 text-xs text-muted">
          <p className="font-semibold text-soft">Read this carefully</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Each qubit alone is a fair coin; neither side can choose its result, so no message is sent faster than light.</li>
            <li>Agreement in this one basis could be faked with classical shared randomness. Entanglement is proven by Bell/CHSH tests that use different measurement bases (2022 Nobel Prize in Physics).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
