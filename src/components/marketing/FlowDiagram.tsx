"use client";

import { useState } from "react";

type Stage = {
  id: string;
  title: string;
  actor: string;
  body: string;
};

const STAGES: Stage[] = [
  {
    id: "draft",
    title: "Draft",
    actor: "author → content-ai",
    body: "An author describes the lesson in plain language. The Python service prompts GPT-4, validates the JSON against the exercise schema, and retries once with the validation error attached if the model breaks shape.",
  },
  {
    id: "review",
    title: "Review",
    actor: "author → studio",
    body: "Drafted exercises land on a review canvas. Accepting one validates it again, generates any missing Spanish audio, and turns it into a variant. Nothing reaches a learner before this step.",
  },
  {
    id: "assign",
    title: "Assign",
    actor: "learner → api/assign",
    body: "A learner requesting the lesson is hashed into a bucket and gets either the control or the candidate — the same variant every time, and always the control if anything is halted.",
  },
  {
    id: "measure",
    title: "Measure",
    actor: "learner → api/telemetry",
    body: "Views, answers, completions and client errors are batched and flushed, including on page teardown via sendBeacon. Telemetry failures are swallowed rather than interrupting the lesson.",
  },
  {
    id: "halt",
    title: "Halt",
    actor: "cron → guardrails",
    body: "The sweep compares candidate against control. On a breach it halts both the experiment and the variant, so every learner falls back to the control on their next request.",
  },
];

/** Interactive pipeline: click or key through the five stages. */
export function FlowDiagram() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40">
      <div
        role="tablist"
        aria-label="Pipeline stages"
        className="flex flex-wrap gap-px border-b border-ink-700 bg-ink-700/40"
      >
        {STAGES.map((item, index) => {
          const isActive = index === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(index)}
              className={`flex-1 px-4 py-3 text-left text-sm transition-colors ${
                isActive
                  ? "bg-ink-800 font-semibold text-ink-200"
                  : "bg-ink-900 text-ink-400 hover:bg-ink-800/60 hover:text-ink-300"
              }`}
            >
              <span className="font-mono text-[11px] text-ink-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block">{item.title}</span>
            </button>
          );
        })}
      </div>

      <div className="p-6">
        <p className="font-mono text-xs text-macaw-500">{stage.actor}</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">{stage.body}</p>
      </div>
    </div>
  );
}
