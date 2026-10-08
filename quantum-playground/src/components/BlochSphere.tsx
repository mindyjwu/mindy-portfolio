"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GATES, applySingle, blochVector, probabilities, singleQubitFromAngles, zeroState, type StateVector } from "@/lib/quantum";
import { ketString, pct } from "@/lib/format";

type V3 = [number, number, number];

/** Move `c` along the great-circle arc toward unit vector `t` (handles antipodal targets). */
function stepToward(c: V3, t: V3, frac: number): V3 {
  const dot = Math.max(-1, Math.min(1, c[0] * t[0] + c[1] * t[1] + c[2] * t[2]));
  const angle = Math.acos(dot);
  if (angle < 0.004) return t;
  let ax: V3 = [c[1] * t[2] - c[2] * t[1], c[2] * t[0] - c[0] * t[2], c[0] * t[1] - c[1] * t[0]];
  let len = Math.hypot(...ax);
  if (len < 1e-6) { // antipodal: pick any axis perpendicular to c
    ax = Math.abs(c[0]) < 0.9 ? [0, c[2], -c[1]] : [-c[2], 0, c[0]];
    len = Math.hypot(...ax);
  }
  const k: V3 = [ax[0] / len, ax[1] / len, ax[2] / len];
  const step = Math.max(angle * frac, 0.02);
  const th = Math.min(step, angle);
  const cos = Math.cos(th), sin = Math.sin(th);
  const kxc: V3 = [k[1] * c[2] - k[2] * c[1], k[2] * c[0] - k[0] * c[2], k[0] * c[1] - k[1] * c[0]];
  const kdc = k[0] * c[0] + k[1] * c[1] + k[2] * c[2];
  const r: V3 = [0, 1, 2].map((i) => c[i] * cos + kxc[i] * sin + k[i] * kdc * (1 - cos)) as V3;
  const n = Math.hypot(...r);
  return [r[0] / n, r[1] / n, r[2] / n];
}

function useAnimatedVector(target: V3): V3 {
  const [v, setV] = useState<V3>(target);
  const cur = useRef<V3>(target);
  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { cur.current = target; setV(target); return; }
    const tick = () => {
      cur.current = stepToward(cur.current, target, 0.18);
      setV(cur.current);
      const d = Math.hypot(cur.current[0] - target[0], cur.current[1] - target[1], cur.current[2] - target[2]);
      if (d > 0.002) raf = requestAnimationFrame(tick); else { cur.current = target; setV(target); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2]]);
  return v;
}

/** Screen projection. Viewer sits on the -y side; screen-x = x', screen-y = -z'; depth = y' (negative = near). */
function project([x, y, z]: V3, yaw: number, pitch: number) {
  const x1 = x * Math.cos(yaw) - y * Math.sin(yaw);
  const y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
  const y2 = y1 * Math.cos(pitch) - z * Math.sin(pitch);
  const z2 = y1 * Math.sin(pitch) + z * Math.cos(pitch);
  return { sx: x1, sy: -z2, depth: y2 };
}

const R = 100; // px radius in SVG units
const px = (n: number) => (n * R).toFixed(1);

function circlePaths(fn: (t: number) => V3, yaw: number, pitch: number) {
  let front = "", back = "";
  const N = 72;
  let prev = project(fn(0), yaw, pitch);
  for (let i = 1; i <= N; i++) {
    const cur = project(fn((i / N) * Math.PI * 2), yaw, pitch);
    const seg = `M${px(prev.sx)} ${px(prev.sy)}L${px(cur.sx)} ${px(cur.sy)}`;
    if ((prev.depth + cur.depth) / 2 <= 0) front += seg; else back += seg;
    prev = cur;
  }
  return { front, back };
}

const AXES: { label: string; v: V3 }[] = [
  { label: "|0⟩", v: [0, 0, 1] }, { label: "|1⟩", v: [0, 0, -1] },
  { label: "|+⟩", v: [1, 0, 0] }, { label: "|−⟩", v: [-1, 0, 0] },
  { label: "|+i⟩", v: [0, 1, 0] }, { label: "|−i⟩", v: [0, -1, 0] },
];

export default function BlochSphere() {
  const [state, setState] = useState<StateVector>(() => singleQubitFromAngles(Math.PI / 3, Math.PI / 4));
  const [view, setView] = useState({ yaw: 0.6, pitch: 0.35 });
  const lastPhi = useRef(Math.PI / 4);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const bv = useMemo(() => blochVector(state, 1, 0), [state]);
  const target = useMemo<V3>(() => {
    const n = Math.hypot(...bv) || 1;
    return [bv[0] / n, bv[1] / n, bv[2] / n];
  }, [bv]);
  const shown = useAnimatedVector(target);

  const theta = Math.acos(Math.max(-1, Math.min(1, bv[2])));
  if (Math.sin(theta) > 1e-4) lastPhi.current = (Math.atan2(bv[1], bv[0]) + 2 * Math.PI) % (2 * Math.PI);
  const phi = lastPhi.current;
  const [p0, p1] = probabilities(state);

  const setAngles = (th: number, ph: number) => { lastPhi.current = ph; setState(singleQubitFromAngles(th, ph)); };
  const gate = (g: "H" | "X" | "Z") => setState((s) => applySingle(s, 1, 0, GATES[g]));

  const equator = circlePaths((t) => [Math.cos(t), Math.sin(t), 0], view.yaw, view.pitch);
  const mer1 = circlePaths((t) => [Math.cos(t), 0, Math.sin(t)], view.yaw, view.pitch);
  const mer2 = circlePaths((t) => [0, Math.cos(t), Math.sin(t)], view.yaw, view.pitch);
  const tip = project(shown, view.yaw, view.pitch);
  const tipFront = tip.depth <= 0.05;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,380px)_1fr]">
      <div>
        <svg
          viewBox="-150 -140 300 280" role="img" aria-label={`Bloch sphere. State vector at x=${bv[0].toFixed(2)}, y=${bv[1].toFixed(2)}, z=${bv[2].toFixed(2)}`}
          className="w-full touch-none select-none rounded-2xl border border-line bg-card cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
            drag.current = { x: e.clientX, y: e.clientY };
            setView((v) => ({ yaw: v.yaw + dx * 0.01, pitch: Math.max(-1.4, Math.min(1.4, v.pitch + dy * 0.01)) }));
          }}
          onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}
        >
          <circle r={R} fill="var(--card-2)" opacity="0.5" stroke="var(--line)" />
          <g fill="none" strokeWidth="1">
            <path d={equator.back + mer1.back + mer2.back} stroke="var(--muted)" opacity="0.25" />
            <path d={equator.front + mer1.front + mer2.front} stroke="var(--muted)" opacity="0.7" />
          </g>
          {AXES.map((a) => {
            const q = project(a.v, view.yaw, view.pitch);
            const near = q.depth <= 0.05;
            return (
              <g key={a.label} opacity={near ? 1 : 0.4}>
                <line x1="0" y1="0" x2={px(q.sx)} y2={px(q.sy)} stroke="var(--muted)" strokeWidth="0.6" strokeDasharray="2 3" />
                <text x={Number(px(q.sx * 1.17))} y={Number(px(q.sy * 1.17)) + 4} textAnchor="middle" fontSize="11" fill="var(--soft)">{a.label}</text>
              </g>
            );
          })}
          <line x1="0" y1="0" x2={px(tip.sx)} y2={px(tip.sy)} stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={px(tip.sx)} cy={px(tip.sy)} r="6" fill="var(--teal)" opacity={tipFront ? 1 : 0.55} stroke="var(--bg)" strokeWidth="1.5" />
        </svg>
        <p className="mt-2 text-xs text-muted">Drag the sphere to change your viewing angle. Use the sliders or gates to move the qubit.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="flex justify-between"><span className="text-soft">θ (polar angle)</span><span className="mono">{(theta / Math.PI).toFixed(2)}π</span></span>
            <input type="range" min={0} max={Math.PI} step={0.01} value={theta} onChange={(e) => setAngles(Number(e.target.value), phi)} className="w-full accent-[var(--accent)]" />
          </label>
          <label className="block text-sm">
            <span className="flex justify-between"><span className="text-soft">φ (phase angle)</span><span className="mono">{(phi / Math.PI).toFixed(2)}π</span></span>
            <input type="range" min={0} max={2 * Math.PI - 0.001} step={0.01} value={phi} onChange={(e) => setAngles(theta, Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Apply gates">
          {(["H", "X", "Z"] as const).map((g) => <button key={g} className="btn" onClick={() => gate(g)}>Apply {g}</button>)}
          <button className="btn" onClick={() => { lastPhi.current = 0; setState(zeroState(1)); }}>Reset |0⟩</button>
        </div>

        <div className="card p-4">
          <p className="mono text-sm break-words">|ψ⟩ = {ketString(state, 1)}</p>
          <div className="mt-3 space-y-2" aria-label="Measurement probabilities">
            {[{ l: "P(0)", p: p0 }, { l: "P(1)", p: p1 }].map((r) => (
              <div key={r.l} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-soft">{r.l}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-card2"><div className="bar h-full rounded-full bg-accent" style={{ width: `${r.p * 100}%` }} /></div>
                <span className="mono w-14 text-right">{pct(r.p)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Probabilities depend only on θ. φ is a relative phase: invisible to a Z-basis measurement, but it changes what later gates do (try φ = 0 vs π, then apply H).
          </p>
        </div>
      </div>
    </div>
  );
}
