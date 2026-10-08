import LearningPath from "@/components/LearningPath";

export const metadata = { title: "Learning Path · Quantum Playground" };

export default function Page() {
  return (
    <div className="fade-in">
      <h1 className="text-3xl font-semibold sm:text-4xl">Learning Path</h1>
      <p className="mt-3 max-w-2xl text-soft">
        Four stages, each with short lessons (the real math included) and a quiz. Mark lessons complete as you go; progress is saved in your browser.
      </p>
      <LearningPath />
    </div>
  );
}
