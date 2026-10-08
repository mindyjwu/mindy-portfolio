import type { Source } from "@/lib/types";

export type Maturity = "in-use" | "emerging" | "experimental";

export type RealWorldCard = {
  id: string; name: string; maturity: Maturity; maturityNote: string;
  principle: string; impact: string; caveat: string; sources: Source[];
};

export const MATURITY_META: Record<Maturity, { label: string; blurb: string }> = {
  "in-use": { label: "In use today", blurb: "Quantum mechanics is the reason these work; they're deployed at massive scale." },
  emerging: { label: "Emerging", blurb: "Real products or pilots exist, but capabilities are narrow or still maturing." },
  experimental: { label: "Experimental", blurb: "Lab-stage or contested; timelines are uncertain and experts disagree." },
};

export const REAL_WORLD: RealWorldCard[] = [
  {
    id: "transistors", name: "Transistors & chips", maturity: "in-use",
    maturityNote: "Mass-market since the 1950s–60s.",
    principle: "Energy bands in semiconductors arise from quantum mechanics: electrons occupy allowed bands separated by a gap, and doping tunes how easily current flows.",
    impact: "Every phone, server and GPU. The foundation of the entire information economy.",
    caveat: "These are quantum-enabled but behave as classical switches: a transistor is not a quantum computer. At nanometer scales, quantum tunneling is mostly a leakage problem engineers fight.",
    sources: [{ label: "Nobel Prize in Physics 1956 (transistor)", url: "https://www.nobelprize.org/prizes/physics/1956/summary/" }],
  },
  {
    id: "lasers", name: "Lasers", maturity: "in-use",
    maturityNote: "Mass-market since the 1960s–70s.",
    principle: "Stimulated emission (Einstein, 1917): an excited atom is triggered by a photon to emit an identical photon, producing coherent light.",
    impact: "Fiber-optic internet, barcode scanners, LASIK, manufacturing, DVD/Blu-ray, and precision measurement.",
    caveat: "Lasers rely on quantum energy levels but their light is well described classically for most engineering. The first working laser was demonstrated in 1960.",
    sources: [{ label: "Nobel Prize in Physics 1964 (masers/lasers)", url: "https://www.nobelprize.org/prizes/physics/1964/summary/" }],
  },
  {
    id: "mri", name: "MRI", maturity: "in-use",
    maturityNote: "Clinical standard since the 1980s.",
    principle: "Nuclear spin (an intrinsically quantum property) of hydrogen nuclei precesses in a magnetic field; radio pulses flip spins and the emitted signal reveals tissue environment.",
    impact: "Non-invasive imaging of soft tissue for neurology, oncology and orthopedics.",
    caveat: "MRI uses quantum spins but does not involve entanglement or quantum computing; image reconstruction is classical signal processing.",
    sources: [{ label: "Nobel Prize in Physiology or Medicine 2003 (MRI)", url: "https://www.nobelprize.org/prizes/medicine/2003/summary/" }],
  },
  {
    id: "atomic-clocks", name: "Atomic clocks & GPS", maturity: "in-use",
    maturityNote: "Defines the SI second since 1967; in every GPS satellite.",
    principle: "Atoms have discrete energy levels. The SI second is defined by the cesium-133 hyperfine transition at 9,192,631,770 Hz, which is the same for every cesium atom.",
    impact: "Satellite navigation, telecom synchronization, financial timestamping, and power-grid timing.",
    caveat: "GPS also depends heavily on relativity corrections, which are not quantum effects (net about 38 µs/day for satellite clocks). Optical clocks are the frontier and are not yet in everyday devices.",
    sources: [
      { label: "BIPM: definition of the second", url: "https://www.bipm.org/en/si-base-units/second" },
      { label: "Ashby, Relativity in the Global Positioning System", url: "https://link.springer.com/article/10.12942/lrr-2003-1" },
    ],
  },
  {
    id: "flash", name: "Flash memory", maturity: "in-use",
    maturityNote: "Mass-market since the 1990s (SSDs, USB drives, phones).",
    principle: "Electrons quantum-tunnel through a thin oxide barrier onto a floating gate (Fowler–Nordheim tunneling), storing charge that persists without power.",
    impact: "SSDs, smartphones, cameras — non-volatile storage everywhere.",
    caveat: "Repeated tunneling slowly damages the oxide, which is why flash cells have limited write endurance and controllers do wear-leveling.",
    sources: [{ label: "Overview: Flash memory", url: "https://en.wikipedia.org/wiki/Flash_memory" }],
  },
  {
    id: "quantum-computing", name: "Quantum computing", maturity: "emerging",
    maturityNote: "Cloud-accessible machines exist; no broadly useful advantage demonstrated yet.",
    principle: "Qubits in superposition plus interference and entanglement let some algorithms (Shor, quantum simulation) scale better than known classical methods.",
    impact: "Potential long-term impact on chemistry, materials and cryptanalysis. Today it is mainly used for research, benchmarking and learning.",
    caveat: "Current devices are noisy. Landmark results (e.g. Google's 2024 below-threshold error correction) are milestones toward, not evidence of, commercial advantage. Vendor roadmaps such as IBM's 2029 fault-tolerance target are goals; timelines are uncertain and experts disagree.",
    sources: [
      { label: "Google Quantum AI: Willow", url: "https://blog.google/technology/research/google-willow-quantum-chip/" },
      { label: "Preskill: Quantum Computing in the NISQ era", url: "https://arxiv.org/abs/1801.00862" },
      { label: "Gidney: RSA-2048 with <1M noisy qubits", url: "https://arxiv.org/abs/2505.15917" },
    ],
  },
  {
    id: "quantum-sensing", name: "Quantum sensing", maturity: "emerging",
    maturityNote: "Commercial niches (magnetometry, gravimetry); many lab prototypes.",
    principle: "Quantum systems like nitrogen-vacancy (NV) centers in diamond or cold atoms are extremely sensitive to magnetic fields, gravity and time, so they can serve as precision sensors.",
    impact: "Navigation without GPS, mineral and underground surveying, biomedical magnetic imaging, and timing.",
    caveat: "Often a sensor must beat a mature classical one on cost, size and robustness, not just sensitivity. Field deployment is the hard part, and many applications are still prototypes.",
    sources: [{ label: "Degen, Reinhard, Cappellaro: Quantum sensing (Rev. Mod. Phys.)", url: "https://arxiv.org/abs/1611.02427" }],
  },
  {
    id: "pqc", name: "Post-quantum cryptography (PQC)", maturity: "emerging",
    maturityNote: "Standards finalized Aug 2024; migration has begun and will take years.",
    principle: "New classical algorithms (lattice-based ML-KEM, ML-DSA; hash-based SLH-DSA) designed to resist both classical and known quantum attacks. They run on ordinary computers.",
    impact: "Protects long-lived data from “harvest now, decrypt later.” Large enterprise and government migration programs are underway.",
    caveat: "NIST's draft IR 8547 proposes deprecating RSA/ECC after 2030 and disallowing them after 2035. It was a draft when last checked, so verify current status. When a cryptographically relevant quantum computer will exist is uncertain. Newer algorithms have less cryptanalysis history, so crypto-agility matters.",
    sources: [
      { label: "NIST: first 3 finalized PQC standards", url: "https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards" },
      { label: "NSA: Post-Quantum Cybersecurity Resources", url: "https://www.nsa.gov/Cybersecurity/Post-Quantum-Cybersecurity-Resources/" },
    ],
  },
  {
    id: "qkd", name: "Quantum key distribution (QKD)", maturity: "emerging",
    maturityNote: "Commercial links and satellite demos exist; limited deployment.",
    principle: "Eavesdropping on quantum states (e.g. photon polarization) disturbs them, so two parties can detect interception while establishing a shared key.",
    impact: "Niche high-security links; China's Micius satellite demonstrated satellite-to-ground QKD in 2017.",
    caveat: "Contested: the US NSA does not recommend QKD for national security systems and the UK NCSC does not endorse it for government or military use. Reasons include needing separate authentication, special hardware, and trusted relays. Both agencies prefer PQC. Proponents argue some limits are solvable.",
    sources: [
      { label: "NSA: Post-Quantum Cybersecurity Resources (QKD position)", url: "https://www.nsa.gov/Cybersecurity/Post-Quantum-Cybersecurity-Resources/" },
      { label: "UK NCSC: Quantum security technologies", url: "https://www.ncsc.gov.uk/paper/quantum-security-technologies" },
      { label: "Liao et al. (2017), Satellite-to-ground QKD", url: "https://arxiv.org/abs/1707.00934" },
    ],
  },
  {
    id: "ftqc", name: "Large-scale fault-tolerant quantum computing", maturity: "experimental",
    maturityNote: "Components demonstrated; a full useful system does not exist yet.",
    principle: "Quantum error correction encodes one logical qubit across many physical qubits so computations can run long enough to run Shor-scale algorithms.",
    impact: "Would unlock cryptanalysis (Shor) and large chemistry/materials simulations.",
    caveat: "Overhead is large (often hundreds to ~1,000 physical qubits per logical qubit with the surface code). Estimates for factoring RSA-2048 have fallen (Gidney 2025: <1M noisy qubits) but remain theoretical preprints about machines nobody has built. Arrival dates: genuinely uncertain.",
    sources: [
      { label: "Gidney (2025)", url: "https://arxiv.org/abs/2505.15917" },
      { label: "Google Quantum AI: Willow", url: "https://blog.google/technology/research/google-willow-quantum-chip/" },
    ],
  },
  {
    id: "qml", name: "Quantum machine learning", maturity: "experimental",
    maturityNote: "Mostly research; no demonstrated practical advantage.",
    principle: "Use quantum states as high-dimensional feature spaces, or quantum linear-algebra routines, to speed up learning tasks.",
    impact: "Speculative. Possible niche advantages for quantum data (e.g. outputs of quantum experiments).",
    caveat: "Loading classical data and reading out results can erase speedups (Aaronson), and Tang's dequantization results showed some prominent quantum ML speedups vanish when classical algorithms get comparable data access. Treat headlines skeptically.",
    sources: [
      { label: "Aaronson (2015), Read the fine print", url: "https://www.scottaaronson.com/papers/qml.pdf" },
      { label: "Tang (2018), dequantization", url: "https://arxiv.org/abs/1807.04271" },
    ],
  },
  {
    id: "topological", name: "Topological qubits (Majorana)", maturity: "experimental",
    maturityNote: "Claimed by Microsoft in 2025; disputed by many physicists.",
    principle: "Encode information non-locally in exotic quasiparticles so errors are suppressed in hardware, in principle reducing error-correction overhead.",
    impact: "If it works, it could greatly reduce the cost of fault tolerance.",
    caveat: "Microsoft's February 2025 “Majorana 1” announcement drew substantial skepticism. Nature's editors noted the paper does not demonstrate topological modes, and Microsoft had retracted a related 2018 claim. This remains unresolved; treat as unproven.",
    sources: [{ label: "Science News: Physicists are mostly unconvinced", url: "https://www.sciencenews.org/article/microsoft-topological-quantum-majorana" }],
  },
  {
    id: "qinternet", name: "Quantum internet & repeaters", maturity: "experimental",
    maturityNote: "Lab and metropolitan-scale testbeds.",
    principle: "Distribute entanglement between distant nodes using quantum repeaters and memories so quantum devices can be networked.",
    impact: "Distributed quantum computing, ultra-secure protocols, and networked sensors. All long-term.",
    caveat: "Photon loss over fiber is the obstacle and practical repeaters are an open engineering problem. Roadmaps are research visions, not products.",
    sources: [{ label: "Wehner, Elkouss, Hanson: Quantum internet: a vision for the road ahead", url: "https://www.science.org/doi/10.1126/science.aam9288" }],
  },
];
