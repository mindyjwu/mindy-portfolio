import RealWorldExplorer from "@/components/RealWorldExplorer";

export const metadata = { title: "Quantum in the Real World · Quantum Playground" };

export default function Page() {
  return (
    <div className="fade-in">
      <h1 className="text-3xl font-semibold sm:text-4xl">Quantum in the Real World</h1>
      <p className="mt-3 max-w-2xl text-soft">
        “Quantum” covers two very different things: technologies that rely on quantum physics and already run the modern world, and quantum
        <em> information</em> technologies (computing, sensing, networking) that are earlier. Each card gives the principle, the impact, a maturity note, and the caveat.
      </p>
      <RealWorldExplorer />
    </div>
  );
}
