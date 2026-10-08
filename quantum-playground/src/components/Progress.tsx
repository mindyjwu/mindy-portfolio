"use client";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { STAGES } from "@/data/stages";

export type ProgressState = { lessons: Record<string, boolean>; quiz: Record<string, number> };
export const EMPTY_PROGRESS: ProgressState = { lessons: {}, quiz: {} };
export const PROGRESS_KEY = "qp.progress.v1";

export function useProgress() {
  return useLocalStorage<ProgressState>(PROGRESS_KEY, EMPTY_PROGRESS);
}

export function stageStats(p: ProgressState, stageId: string) {
  const s = STAGES.find((x) => x.id === stageId)!;
  const done = s.lessons.filter((l) => p.lessons[l.id]).length;
  const score = p.quiz[s.id];
  return { done, total: s.lessons.length, score, quizTotal: s.quiz.length, complete: done === s.lessons.length && score !== undefined };
}

export function overallPercent(p: ProgressState) {
  // each lesson and each stage quiz counts as one unit
  let done = 0, total = 0;
  for (const s of STAGES) {
    total += s.lessons.length + 1;
    done += s.lessons.filter((l) => p.lessons[l.id]).length + (p.quiz[s.id] !== undefined ? 1 : 0);
  }
  return Math.round((done / total) * 100);
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-card2">
      <div className="bar h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function HomeProgress() {
  const [p, , ready] = useProgress();
  const pct = ready ? overallPercent(p) : 0;
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-soft">Your learning progress</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <ProgressBar percent={pct} label="Overall learning progress" />
      <p className="mt-2 text-xs text-muted">Saved in this browser only (localStorage). Nothing leaves your device.</p>
    </div>
  );
}
