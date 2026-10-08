import type { Complex, StateVector } from "./quantum";
import { basisLabel } from "./quantum";

const EPS = 1e-9;

export function fmtComplex(a: Complex): string {
  const r = Math.abs(a.re) < EPS ? 0 : a.re;
  const i = Math.abs(a.im) < EPS ? 0 : a.im;
  if (i === 0) return r.toFixed(3);
  if (r === 0) return `${i.toFixed(3)}i`;
  return `${r.toFixed(3)}${i < 0 ? "−" : "+"}${Math.abs(i).toFixed(3)}i`;
}

/** e.g. "0.707|00⟩ − 0.707|11⟩" — only non-zero terms. */
export function ketString(state: StateVector, n: number): string {
  const terms: string[] = [];
  state.forEach((a, idx) => {
    if (a.re * a.re + a.im * a.im < EPS) return;
    const isReal = Math.abs(a.im) < EPS;
    const body = isReal ? Math.abs(a.re).toFixed(3) : `(${fmtComplex(a)})`;
    const neg = isReal && a.re < 0;
    const term = `${body}|${basisLabel(idx, n)}⟩`;
    terms.push(terms.length === 0 ? (neg ? `−${term}` : term) : `${neg ? "−" : "+"} ${term}`);
  });
  return terms.join(" ");
}

export const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
