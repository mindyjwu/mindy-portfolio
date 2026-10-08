import type { Source } from "@/lib/types";

export type Lesson = { id: string; title: string; body: string[]; math?: string[]; tryIt?: { label: string; href: string } };
export type Question = { q: string; options: string[]; answer: number; why: string };
export type Stage = {
  id: string; n: number; title: string; blurb: string;
  lessons: Lesson[]; quiz: Question[]; sources: Source[];
};

export const STAGES: Stage[] = [
  {
    id: "foundations", n: 1, title: "Foundations",
    blurb: "Bits vs qubits, amplitudes, measurement — and what “quantum parallelism” does and doesn't mean.",
    lessons: [
      {
        id: "f1", title: "From bits to qubits",
        body: [
          "A classical bit is 0 or 1. A qubit's state is a unit vector in a 2-dimensional complex vector space. Written in the computational basis:",
          "α and β are complex numbers called amplitudes. They are not probabilities: they can be negative or complex, and that is exactly what lets them cancel each other (interference). Only the overall length is constrained.",
          "A global phase (multiplying both amplitudes by e^{iγ}) has no observable effect, so a qubit really has two real degrees of freedom — the angles on the Bloch sphere (Stage 2).",
        ],
        math: ["|ψ⟩ = α|0⟩ + β|1⟩,   α, β ∈ ℂ", "|α|² + |β|² = 1"],
      },
      {
        id: "f2", title: "Measurement and the Born rule",
        body: [
          "Measuring in the computational basis returns 0 with probability |α|² and 1 with probability |β|². Afterwards the state is the one you observed (it “collapses”) — so one measurement gives you one bit, not the amplitudes.",
          "To learn α and β you must prepare the same state many times and gather statistics. The Measurement demo lets you see this converge.",
        ],
        math: ["P(0) = |α|²,   P(1) = |β|²"],
        tryIt: { label: "Open the measurement simulator", href: "/demos#measure" },
      },
      {
        id: "f3", title: "Why n qubits are powerful — and limited",
        body: [
          "A general n-qubit state has 2ⁿ complex amplitudes (10 qubits → 1,024; 50 qubits → ~10¹⁵). That exponential description size is why simulating quantum systems on classical machines is hard in general.",
          "But a measurement still returns only n classical bits. The popular line that a quantum computer “tries all answers at once” is misleading: a circuit acts on a superposition, but you only get one sampled outcome, so algorithms must be engineered so that interference makes the right answer likely. Most problems have no known way to do this.",
        ],
        math: ["dim = 2ⁿ complex amplitudes,   output = n classical bits per run"],
      },
    ],
    quiz: [
      { q: "A qubit is α|0⟩ + β|1⟩ with α = β (normalized). What is the probability of measuring 0?", options: ["100%", "50%", "25%", "It depends on the global phase"], answer: 1, why: "|α|² + |β|² = 1 with |α| = |β| gives |α|² = 1/2." },
      { q: "Which statement about amplitudes is correct?", options: ["They are probabilities between 0 and 1", "They can be negative or complex, which allows interference", "They must all be real numbers", "They are always equal for every basis state"], answer: 1, why: "Amplitudes are complex numbers; probabilities come from their squared magnitudes. Signs/phases make cancellation possible." },
      { q: "How many complex amplitudes describe a general 10-qubit state?", options: ["10", "20", "100", "1,024"], answer: 3, why: "2¹⁰ = 1,024." },
      { q: "Which is the most accurate description of “quantum parallelism”?", options: ["The computer runs every possible answer and shows you all of them", "A circuit acts on a superposition, but measurement returns one outcome, so interference must be engineered to favor the answer", "Qubits are faster than transistors", "Quantum computers solve every problem exponentially faster"], answer: 1, why: "You get a single sampled outcome per run. Useful speedups require algorithmic structure that interference can exploit." },
    ],
    sources: [
      { label: "Nielsen & Chuang, Quantum Computation and Quantum Information (Ch. 1–2)", url: "https://www.cambridge.org/highereducation/books/quantum-computation-and-quantum-information/01E10196D0A682A6AEFFEA52D53BE9AE" },
      { label: "Aaronson, “The Limits of Quantum Computers” (Sci. Am., 2008)", url: "https://www.scottaaronson.com/writings/limitsqc-draft.pdf" },
    ],
  },
  {
    id: "gates", n: 2, title: "Qubits & Gates",
    blurb: "The Bloch sphere, gates as unitary matrices, multi-qubit states, CNOT, and entanglement — carefully stated.",
    lessons: [
      {
        id: "g1", title: "The Bloch sphere",
        body: [
          "Any pure single-qubit state can be written with two angles. θ sets the probability of 0 vs 1; φ is a relative phase that you cannot see by measuring in the Z basis, but that matters for later gates.",
          "North pole = |0⟩, south pole = |1⟩, +x = |+⟩, −x = |−⟩. Pure states live on the surface; a qubit that is entangled with something else sits inside the sphere (you'll see its vector shrink to length 0 in the Bell demo).",
        ],
        math: ["|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩", "P(0) = cos²(θ/2)"],
        tryIt: { label: "Rotate a qubit on the Bloch sphere", href: "/demos#bloch" },
      },
      {
        id: "g2", title: "Gates are unitary matrices",
        body: [
          "Quantum gates (before measurement) are unitary matrices: they preserve the length of the state vector and are reversible. X is the quantum NOT, Z flips the sign of the |1⟩ amplitude, and H creates equal superposition.",
          "Z doesn't change measurement probabilities directly, but it changes phase — and phase becomes visible after another H. Concretely, H·Z·H = X. Try it in the circuit builder.",
        ],
        math: ["X = [[0,1],[1,0]]    Z = [[1,0],[0,−1]]", "H = (1/√2)·[[1,1],[1,−1]]", "H|0⟩ = (|0⟩+|1⟩)/√2 = |+⟩     HZH = X"],
        tryIt: { label: "Build H·Z·H in the circuit builder", href: "/demos#circuit" },
      },
      {
        id: "g3", title: "Two qubits and CNOT",
        body: [
          "Two qubits have 4 amplitudes (|00⟩, |01⟩, |10⟩, |11⟩). CNOT flips the target qubit if the control is |1⟩. In this site's convention, qubit q0 is the leftmost bit.",
          "Start with H on q0 (giving |+⟩|0⟩), then CNOT with q0 as control. The result cannot be written as a product of two single-qubit states: it is entangled.",
        ],
        math: ["CNOT|00⟩=|00⟩  CNOT|01⟩=|01⟩  CNOT|10⟩=|11⟩  CNOT|11⟩=|10⟩", "CNOT·(H⊗I)|00⟩ = (|00⟩ + |11⟩)/√2   (Bell state |Φ⁺⟩)"],
        tryIt: { label: "Create a Bell state", href: "/demos#bell" },
      },
      {
        id: "g4", title: "Entanglement, stated carefully",
        body: [
          "In the Bell state, each qubit alone gives a random 0/1, yet the two results always agree. This does not let you send information faster than light: neither side can choose its outcome.",
          "Caution: agreement in one measurement basis can be mimicked by classical shared randomness (two sealed envelopes). The genuinely non-classical signature appears when the two parties measure in different bases and violate Bell/CHSH inequalities — experiments recognized by the 2022 Nobel Prize in Physics (Aspect, Clauser, Zeilinger).",
        ],
      },
    ],
    quiz: [
      { q: "Start in |0⟩ and apply H, then Z, then H. What do you measure?", options: ["Always 0", "Always 1", "50/50", "Nothing — the state is destroyed"], answer: 1, why: "HZH = X, which flips |0⟩ to |1⟩. Z's phase flip becomes visible after the second H." },
      { q: "Which Bloch angles describe |+⟩ = (|0⟩+|1⟩)/√2?", options: ["θ = 0", "θ = π", "θ = π/2, φ = 0", "θ = π/2, φ = π"], answer: 2, why: "θ = π/2 gives P(0) = cos²(π/4) = 1/2, and φ = 0 gives the + sign." },
      { q: "Applying CNOT (q0 control) to |+⟩|0⟩ gives:", options: ["|00⟩ only", "A product state |+⟩|+⟩", "(|00⟩ + |11⟩)/√2, an entangled Bell state", "(|01⟩ + |10⟩)/√2"], answer: 2, why: "Control in superposition: the |0⟩ branch leaves the target alone, the |1⟩ branch flips it." },
      { q: "You measure both qubits of a Bell pair in the Z basis. Which is true?", options: ["Each result is random, the two always agree, and no message is sent", "Each result is predetermined by the first qubit's preparation, so it can carry a message", "The results are always opposite", "Measuring one qubit instantly transmits a signal to the other"], answer: 0, why: "Outcomes are individually random, so there is no signaling. Z-basis agreement alone can be mimicked classically; Bell tests use other bases." },
    ],
    sources: [
      { label: "Nobel Prize in Physics 2022 (Bell-inequality experiments)", url: "https://www.nobelprize.org/prizes/physics/2022/summary/" },
      { label: "Qiskit textbook / IBM Quantum Learning", url: "https://quantum.cloud.ibm.com/learning" },
    ],
  },
  {
    id: "algorithms", n: 3, title: "Algorithms",
    blurb: "Interference, Grover, Shor, and variational methods — with the real size of each speedup.",
    lessons: [
      {
        id: "a1", title: "Interference is the engine",
        body: [
          "Quantum algorithms are choreographies of amplitudes: apply gates so that paths leading to wrong answers have opposite signs and cancel, while paths to the right answer add up.",
          "The smallest example: H then H returns |0⟩ with certainty, because the two paths to |1⟩ cancel. A random coin flipped twice would not do that.",
        ],
        math: ["H·H = I     (paths to |1⟩: +1/2 and −1/2 → cancel)"],
        tryIt: { label: "Try H·H in the circuit builder", href: "/demos#circuit" },
      },
      {
        id: "a2", title: "Grover search: a quadratic speedup",
        body: [
          "For unstructured search over N items, Grover's algorithm needs about (π/4)√N oracle calls versus ~N/2 on average classically. That is a proven quadratic speedup and is provably optimal — it is not exponential.",
          "Practical caveat: on error-corrected hardware the constant-factor overhead can erase a quadratic speedup unless the problem is large and each classical step is expensive (Babbush et al., 2021).",
        ],
        math: ["queries ≈ (π/4)·√N     N = 10⁶ → ≈ 785"],
      },
      {
        id: "a3", title: "Shor's algorithm and the RSA threat",
        body: [
          "Shor (1994) factors integers (and solves discrete logarithms) in polynomial time by using the quantum Fourier transform to find periods. That would break RSA and elliptic-curve public-key cryptography. It does not break symmetric ciphers such as AES-256 (Grover roughly halves their effective key length).",
          "Two honest nuances. (1) It is not proven that factoring is classically hard; the best known classical algorithms are just much slower. (2) The hardware requirement is huge: a 2025 estimate by Craig Gidney puts RSA-2048 at under one million noisy physical qubits running for about a week, under specific assumptions (≈0.1% gate error, 2D nearest-neighbor grid). Today's devices are orders of magnitude short in scale and quality for this. Timelines to such machines are genuinely uncertain.",
        ],
      },
      {
        id: "a4", title: "Variational algorithms and the NISQ era",
        body: [
          "John Preskill coined NISQ (Noisy Intermediate-Scale Quantum) for today's devices: tens to thousands of noisy qubits, no full error correction. Variational algorithms (VQE, QAOA) run a short parameterized circuit on a quantum chip and tune the parameters with a classical optimizer.",
          "They're appealing for chemistry and optimization, but they are heuristics: there is no proof of advantage over the best classical methods, and training can hit barren plateaus (flat optimization landscapes). They're excellent for learning and experimentation — treat claims of near-term business advantage skeptically.",
        ],
      },
    ],
    quiz: [
      { q: "Roughly how many Grover queries to search N = 1,000,000 unstructured items?", options: ["~1,000,000", "~500,000", "~785", "~20"], answer: 2, why: "(π/4)·√10⁶ ≈ 785. It is a quadratic, not exponential, speedup." },
      { q: "Which does Shor's algorithm threaten?", options: ["AES-256 directly", "RSA and elliptic-curve public-key cryptography", "All hash functions", "Nothing, it is purely theoretical"], answer: 1, why: "Shor breaks factoring and discrete log. Symmetric crypto is only affected by Grover's quadratic speedup." },
      { q: "What is true about VQE and QAOA?", options: ["They're proven to beat classical solvers", "They're heuristics with no proven advantage; noise limits circuit depth", "They only work on error-corrected machines", "They require no classical computer"], answer: 1, why: "They are hybrid, heuristic NISQ-era methods." },
      { q: "Why isn't Shor's speedup a mathematically proven exponential separation from classical computing?", options: ["Shor's algorithm is incorrect", "Quantum computers cannot do modular arithmetic", "No one has proven that factoring is hard for classical computers; we only know of no fast classical algorithm", "It requires infinite qubits"], answer: 2, why: "Complexity-theoretic separations are unproven; the evidence is the absence of known fast classical methods." },
    ],
    sources: [
      { label: "Gidney (2025), factoring RSA-2048 with <1M noisy qubits", url: "https://arxiv.org/abs/2505.15917" },
      { label: "Babbush et al. (2021), Focus beyond quadratic speedups", url: "https://arxiv.org/abs/2011.04149" },
      { label: "Preskill (2018), Quantum Computing in the NISQ era and beyond", url: "https://arxiv.org/abs/1801.00862" },
      { label: "McClean et al. (2018), Barren plateaus", url: "https://arxiv.org/abs/1803.11173" },
    ],
  },
  {
    id: "applications", n: 4, title: "Real-World Applications",
    blurb: "Where quantum computers might matter, why error correction is the bottleneck, and the one action item for today.",
    lessons: [
      {
        id: "r1", title: "Where speedups are plausible",
        body: [
          "The strongest case is simulating quantum systems (chemistry, materials) — Feynman's original motivation in 1981 — plus factoring and a few structured problems. Whether this yields commercially valuable advantage on realistic problem sizes is still being worked out.",
          "Optimization and machine learning are far more contested: generic speedups are at most polynomial in many known cases, data loading/readout can erase gains (Aaronson, “Read the fine print”), and Ewin Tang's “dequantization” results showed some celebrated quantum ML speedups vanish once classical algorithms get comparable data access.",
        ],
      },
      {
        id: "r2", title: "The error-correction bottleneck",
        body: [
          "Physical qubits fail often (error rates around 10⁻³ per operation on good hardware), while useful algorithms may need ~10⁻¹² or better. Quantum error correction bundles many physical qubits into one logical qubit; for the surface code that overhead is often cited as hundreds to ~1,000 physical qubits per logical qubit.",
          "Milestone: in 2024 Google reported error-corrected memory improving as the code grew (“below threshold”) on its Willow chip. IBM's published roadmap targets a fault-tolerant machine (“Starling”, ~200 logical qubits) by 2029. Treat vendor roadmaps as aspirations: independent experts disagree on when, or whether, they land on schedule.",
        ],
      },
      {
        id: "r3", title: "Post-quantum cryptography: the action item today",
        body: [
          "“Harvest now, decrypt later”: an adversary can record encrypted traffic today and decrypt it if a capable quantum computer appears years from now. That matters for data that must stay secret for a long time.",
          "NIST finalized its first post-quantum standards in August 2024: FIPS 203 (ML-KEM, key establishment), FIPS 204 (ML-DSA, signatures) and FIPS 205 (SLH-DSA, hash-based signatures). A NIST draft (IR 8547) proposes deprecating 112-bit-security RSA/ECC (e.g. RSA-2048, P-256) after 2030 and disallowing quantum-vulnerable public-key algorithms after 2035 — it was a draft when we last checked, so confirm current status. Migration is a large, real consulting and engineering problem right now, independent of when quantum computers arrive.",
        ],
      },
      {
        id: "r4", title: "Where you could plug in",
        body: [
          "Three distinct directions, each with a different bet: (1) study / research path — physics, CS theory, error correction; (2) software and tooling — compilers, error mitigation, workflow and benchmarking tools, education; (3) enterprise services — cryptographic inventories and PQC migration, plus domain-specific application studies (chemistry, finance, logistics) that are honest about what's real.",
          "The field is early, so being a clear-eyed translator between hype and reality is itself valuable. The Build Lab and Think Bigger sections (coming next) go deeper.",
        ],
      },
    ],
    quiz: [
      { q: "Which application area has the strongest theoretical case for quantum advantage?", options: ["Simulating quantum systems (chemistry/materials)", "Speeding up all machine learning", "Streaming video", "General spreadsheet calculations"], answer: 0, why: "Simulation of quantum systems is the original, best-motivated use case." },
      { q: "“Harvest now, decrypt later” means:", options: ["Quantum computers can read data in transit instantly today", "Adversaries can store encrypted data now to decrypt later once capable machines exist", "Companies should delete all encrypted data", "QKD hardware must be bought before 2030"], answer: 1, why: "It's why long-lived secrets motivate migrating to post-quantum crypto early." },
      { q: "Why is building a large useful quantum computer hard?", options: ["Qubits are noisy, so large-scale error correction with big overhead is needed", "No one knows the math", "Qubits cannot be entangled", "Classical computers are already optimal for every task"], answer: 0, why: "Error rates and the physical-to-logical overhead are the central engineering bottleneck." },
      { q: "NIST's first finalized post-quantum standards (including ML-KEM, FIPS 203) were published in:", options: ["2016", "2019", "August 2024", "2030"], answer: 2, why: "NIST published FIPS 203, 204 and 205 on August 13, 2024." },
    ],
    sources: [
      { label: "NIST: first 3 finalized post-quantum standards (Aug 2024)", url: "https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards" },
      { label: "Google Quantum AI: Willow & below-threshold error correction", url: "https://blog.google/technology/research/google-willow-quantum-chip/" },
      { label: "Aaronson (2015), Read the fine print", url: "https://www.scottaaronson.com/papers/qml.pdf" },
      { label: "Tang (2018), quantum-inspired classical algorithm for recommendation systems", url: "https://arxiv.org/abs/1807.04271" },
    ],
  },
];
