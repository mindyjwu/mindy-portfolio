"use client";
import { useState } from "react";
import type { Stage } from "@/data/stages";

export default function Quiz({ stage, best, onFinish }: { stage: Stage; best?: number; onFinish: (score: number) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => stage.quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const score = answers.filter((a, i) => a === stage.quiz[i].answer).length;
  const allAnswered = answers.every((a) => a !== null);

  const submit = () => { setSubmitted(true); onFinish(score); };
  const retry = () => { setAnswers(stage.quiz.map(() => null)); setSubmitted(false); };

  return (
    <section className="card mt-6 p-5" aria-labelledby={`quiz-${stage.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`quiz-${stage.id}`} className="text-lg font-semibold">Stage {stage.n} quiz</h3>
        {best !== undefined && <span className="text-xs text-muted">Best: {best}/{stage.quiz.length}</span>}
      </div>
      <ol className="mt-4 space-y-5">
        {stage.quiz.map((q, qi) => (
          <li key={qi}>
            <fieldset>
              <legend className="font-medium">{qi + 1}. {q.q}</legend>
              <div className="mt-2 space-y-2">
                {q.options.map((o, oi) => {
                  const chosen = answers[qi] === oi;
                  const correct = submitted && oi === q.answer;
                  const wrong = submitted && chosen && oi !== q.answer;
                  return (
                    <label key={oi} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors ${correct ? "border-teal bg-teal/10" : wrong ? "border-rose bg-rose/10" : chosen ? "border-accent" : "border-line hover:border-soft"}`}>
                      <input
                        type="radio" name={`${stage.id}-${qi}`} disabled={submitted} checked={chosen}
                        onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <span>{o}{correct && <span className="sr-only"> (correct answer)</span>}{wrong && <span className="sr-only"> (your answer, incorrect)</span>}</span>
                    </label>
                  );
                })}
              </div>
              {submitted && <p className="fade-in mt-2 text-sm text-soft"><span className="font-semibold text-ink">Why: </span>{q.why}</p>}
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button className="btn btn-primary" disabled={!allAnswered} onClick={submit} style={{ opacity: allAnswered ? 1 : 0.5 }}>Check answers</button>
        ) : (
          <>
            <span className="font-semibold" role="status">Score: {score}/{stage.quiz.length}</span>
            <button className="btn" onClick={retry}>Try again</button>
          </>
        )}
      </div>
    </section>
  );
}
