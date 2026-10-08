/**
 * Tiny state-vector quantum simulator (client-side, no dependencies).
 *
 * Convention: qubit 0 is the leftmost bit when a basis state is written,
 * i.e. for 2 qubits the amplitude index 0b01 is the state |q0=0, q1=1> = "01".
 * This matches how circuits are drawn (q0 on the top wire).
 */

export type Complex = { re: number; im: number };
export type Matrix2 = [[Complex, Complex], [Complex, Complex]];
export type StateVector = Complex[];

const c = (re: number, im = 0): Complex => ({ re, im });
const add = (a: Complex, b: Complex): Complex => c(a.re + b.re, a.im + b.im);
const mul = (a: Complex, b: Complex): Complex =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const conj = (a: Complex): Complex => c(a.re, -a.im);
const abs2 = (a: Complex) => a.re * a.re + a.im * a.im;

const S = Math.SQRT1_2;

export const GATES = {
  H: [[c(S), c(S)], [c(S), c(-S)]] as Matrix2,
  X: [[c(0), c(1)], [c(1), c(0)]] as Matrix2,
  Z: [[c(1), c(0)], [c(0), c(-1)]] as Matrix2,
};

export type SingleGateName = keyof typeof GATES;

export function zeroState(n: number): StateVector {
  const s: StateVector = Array.from({ length: 2 ** n }, () => c(0));
  s[0] = c(1);
  return s;
}

/** Bit mask of qubit k (qubit 0 = most significant bit of the index). */
const mask = (n: number, k: number) => 1 << (n - 1 - k);

export function applySingle(state: StateVector, n: number, target: number, m: Matrix2): StateVector {
  const out = state.map((a) => ({ ...a }));
  const bit = mask(n, target);
  for (let i = 0; i < state.length; i++) {
    if (i & bit) continue; // handle each |0>/|1> pair once
    const j = i | bit;
    const a0 = state[i];
    const a1 = state[j];
    out[i] = add(mul(m[0][0], a0), mul(m[0][1], a1));
    out[j] = add(mul(m[1][0], a0), mul(m[1][1], a1));
  }
  return out;
}

export function applyCNOT(state: StateVector, n: number, control: number, target: number): StateVector {
  if (control === target) throw new Error("CNOT control and target must differ");
  const out = state.map((a) => ({ ...a }));
  const cb = mask(n, control);
  const tb = mask(n, target);
  for (let i = 0; i < state.length; i++) {
    if (i & cb) out[i] = state[i ^ tb];
  }
  return out;
}

export function probabilities(state: StateVector): number[] {
  return state.map(abs2);
}

/** Label a basis-state index as a bitstring, qubit 0 first. */
export function basisLabel(index: number, n: number): string {
  return index.toString(2).padStart(n, "0");
}

/**
 * Bloch vector of qubit k, computed from its reduced density matrix.
 * Length 1 = pure single-qubit state; length 0 = maximally entangled with the rest.
 */
export function blochVector(state: StateVector, n: number, k: number): [number, number, number] {
  const bit = mask(n, k);
  let rho00 = 0;
  let rho11 = 0;
  let rho01 = c(0); // <0|rho|1> = sum a(...0...) * conj(a(...1...))
  for (let i = 0; i < state.length; i++) {
    if (i & bit) continue;
    const a0 = state[i];
    const a1 = state[i | bit];
    rho00 += abs2(a0);
    rho11 += abs2(a1);
    rho01 = add(rho01, mul(a0, conj(a1)));
  }
  return [2 * rho01.re, -2 * rho01.im, rho00 - rho11];
}

/** State of a single qubit from Bloch angles: cos(θ/2)|0> + e^{iφ} sin(θ/2)|1>. */
export function singleQubitFromAngles(theta: number, phi: number): StateVector {
  return [c(Math.cos(theta / 2)), c(Math.cos(phi) * Math.sin(theta / 2), Math.sin(phi) * Math.sin(theta / 2))];
}

/** Sample one measurement outcome (index) using the supplied RNG in [0,1). */
export function sample(probs: number[], rand: () => number = Math.random): number {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r < acc) return i;
  }
  return probs.length - 1; // guard against float rounding
}

export type CircuitOp =
  | { kind: "gate"; gate: SingleGateName; qubit: number }
  | { kind: "cnot"; control: number; target: number };

export function runCircuit(n: number, ops: CircuitOp[]): StateVector {
  let s = zeroState(n);
  for (const op of ops) {
    s = op.kind === "gate" ? applySingle(s, n, op.qubit, GATES[op.gate]) : applyCNOT(s, n, op.control, op.target);
  }
  return s;
}
