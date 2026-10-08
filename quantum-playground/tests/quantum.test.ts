import { describe, expect, it } from "vitest";
import {
  GATES, applyCNOT, applySingle, blochVector, probabilities, runCircuit,
  sample, singleQubitFromAngles, zeroState,
} from "@/lib/quantum";

const close = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe("single-qubit gates", () => {
  it("H on |0> gives 50/50", () => {
    const p = probabilities(applySingle(zeroState(1), 1, 0, GATES.H));
    close(p[0], 0.5); close(p[1], 0.5);
  });
  it("H twice returns to |0>", () => {
    const s = runCircuit(1, [{ kind: "gate", gate: "H", qubit: 0 }, { kind: "gate", gate: "H", qubit: 0 }]);
    close(probabilities(s)[0], 1);
  });
  it("X flips |0> to |1>", () => {
    close(probabilities(runCircuit(1, [{ kind: "gate", gate: "X", qubit: 0 }]))[1], 1);
  });
  it("Z does not change probabilities but flips the |-> / |+> phase", () => {
    const plus = runCircuit(1, [{ kind: "gate", gate: "H", qubit: 0 }]);
    const minus = applySingle(plus, 1, 0, GATES.Z);
    close(probabilities(minus)[0], 0.5);
    close(blochVector(plus, 1, 0)[0], 1);   // +x
    close(blochVector(minus, 1, 0)[0], -1); // -x
  });
  it("H Z H equals X", () => {
    const s = runCircuit(1, ["H", "Z", "H"].map((g) => ({ kind: "gate", gate: g as "H" | "Z", qubit: 0 })));
    close(probabilities(s)[1], 1);
  });
});

describe("two qubits", () => {
  it("qubit 0 is the leftmost bit: X on q0 gives |10> (index 2)", () => {
    const p = probabilities(runCircuit(2, [{ kind: "gate", gate: "X", qubit: 0 }]));
    close(p[2], 1);
  });
  it("CNOT flips target only when control is 1", () => {
    const off = applyCNOT(zeroState(2), 2, 0, 1);
    close(probabilities(off)[0], 1);
    const on = runCircuit(2, [{ kind: "gate", gate: "X", qubit: 0 }, { kind: "cnot", control: 0, target: 1 }]);
    close(probabilities(on)[3], 1); // |11>
  });
  it("Bell state: 50% |00>, 50% |11>, nothing else", () => {
    const s = runCircuit(2, [{ kind: "gate", gate: "H", qubit: 0 }, { kind: "cnot", control: 0, target: 1 }]);
    const p = probabilities(s);
    close(p[0], 0.5); close(p[3], 0.5); close(p[1], 0); close(p[2], 0);
  });
  it("each qubit of a Bell pair has a zero-length Bloch vector (entangled)", () => {
    const s = runCircuit(2, [{ kind: "gate", gate: "H", qubit: 0 }, { kind: "cnot", control: 0, target: 1 }]);
    for (const k of [0, 1]) {
      const [x, y, z] = blochVector(s, 2, k);
      close(Math.hypot(x, y, z), 0);
    }
  });
  it("a product state keeps unit-length Bloch vectors", () => {
    const s = runCircuit(2, [{ kind: "gate", gate: "H", qubit: 0 }]);
    close(Math.hypot(...blochVector(s, 2, 0)), 1);
    close(Math.hypot(...blochVector(s, 2, 1)), 1);
  });
  it("total probability stays 1 through a longer circuit", () => {
    const s = runCircuit(3, [
      { kind: "gate", gate: "H", qubit: 0 }, { kind: "cnot", control: 0, target: 2 },
      { kind: "gate", gate: "Z", qubit: 2 }, { kind: "gate", gate: "H", qubit: 1 },
    ]);
    close(probabilities(s).reduce((a, b) => a + b, 0), 1);
  });
});

describe("Bloch angles and sampling", () => {
  it("theta=0 is |0> (north pole), theta=pi is |1>", () => {
    close(blochVector(singleQubitFromAngles(0, 0), 1, 0)[2], 1);
    close(blochVector(singleQubitFromAngles(Math.PI, 0), 1, 0)[2], -1);
  });
  it("angles round-trip through the Bloch vector", () => {
    const th = 1.1, ph = 2.3;
    const [x, y, z] = blochVector(singleQubitFromAngles(th, ph), 1, 0);
    close(x, Math.sin(th) * Math.cos(ph)); close(y, Math.sin(th) * Math.sin(ph)); close(z, Math.cos(th));
  });
  it("P(0) = cos^2(theta/2)", () => {
    close(probabilities(singleQubitFromAngles(1.0, 0.4))[0], Math.cos(0.5) ** 2);
  });
  it("sample respects probabilities (deterministic RNG)", () => {
    expect(sample([0.25, 0.75], () => 0.1)).toBe(0);
    expect(sample([0.25, 0.75], () => 0.3)).toBe(1);
    expect(sample([0.5, 0.5], () => 0.999999999)).toBe(1);
  });
});
