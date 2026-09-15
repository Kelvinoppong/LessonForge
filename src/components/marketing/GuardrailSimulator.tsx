"use client";

import { CircleCheck, Hourglass, OctagonMinus } from "lucide-react";
import { useMemo, useState } from "react";
import { decideHealthAction, emptyStats, type Guardrails } from "@/lib/guardrails";

const GUARDRAILS: Guardrails = {
  maxErrorRateDelta: 0.15,
  maxClientErrorRate: 0.05,
  minSessions: 20,
};

const PRESETS = [
  { label: "Healthy variant", sessions: 240, candidateError: 0.26, clientError: 0.01 },
  { label: "Too little traffic", sessions: 12, candidateError: 0.75, clientError: 0.0 },
  { label: "Content regression", sessions: 240, candidateError: 0.58, clientError: 0.01 },
  { label: "Broken audio", sessions: 240, candidateError: 0.29, clientError: 0.22 },
];

const CONTROL_ERROR_RATE = 0.28;

/**
 * Live guardrail playground.
 *
 * This calls `decideHealthAction` — the exact function the scheduled sweep runs
 * in production — rather than reimplementing the rules for display. Because that
 * function is pure and free of database imports, it runs unchanged in the browser,
 * so what a visitor sees here is genuinely the platform's behaviour.
 */
export function GuardrailSimulator() {
  const [sessions, setSessions] = useState(240);
  const [candidateError, setCandidateError] = useState(0.26);
  const [clientError, setClientError] = useState(0.01);

  const decision = useMemo(() => {
    const control = { ...emptyStats("control"), sessions: 240, answerErrorRate: CONTROL_ERROR_RATE };
    const candidate = {
      ...emptyStats("candidate"),
      sessions,
      answerErrorRate: candidateError,
      clientErrorRate: clientError,
      clientErrors: Math.round(clientError * sessions),
    };

    return decideHealthAction(control, candidate, GUARDRAILS);
  }, [sessions, candidateError, clientError]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setSessions(preset.sessions);
    setCandidateError(preset.candidateError);
    setClientError(preset.clientError);
  };

  const tone =
    decision.action === "halted"
      ? {
          ring: "border-fire-600/50 bg-fire-500/[0.07]",
          text: "text-fire-500",
          label: "Withdrawn from learners",
          Icon: OctagonMinus,
        }
      : decision.action === "skipped_low_traffic"
        ? {
            ring: "border-bee-500/40 bg-bee-500/[0.07]",
            text: "text-bee-500",
            label: "Not enough data yet",
            Icon: Hourglass,
          }
        : {
            ring: "border-grass-600/50 bg-grass-500/[0.07]",
            text: "text-grass-300",
            label: "Kept in front of learners",
            Icon: CircleCheck,
          };

  const delta = candidateError - CONTROL_ERROR_RATE;

  return (
    <div className="grid gap-8 rounded-lg border border-ink-700 bg-ink-900/40 p-6 sm:p-8 lg:grid-cols-2">
      <div>
        <h3 className="text-base font-semibold text-ink-200">Try it yourself</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          Drag the sliders to describe how a new version of a lesson is doing. The verdict updates
          as you go.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded border border-ink-700 bg-ink-800/60 px-2.5 py-1 text-xs font-medium text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <Slider
            label="Learners who tried it"
            value={sessions}
            min={0}
            max={400}
            step={4}
            display={String(sessions)}
            hint={
              sessions < GUARDRAILS.minSessions
                ? `too few to judge — needs at least ${GUARDRAILS.minSessions}`
                : undefined
            }
            onChange={setSessions}
          />
          <Slider
            label="How often they answered wrong"
            value={candidateError}
            min={0}
            max={1}
            step={0.01}
            display={`${(candidateError * 100).toFixed(0)}%`}
            hint={`the old version sits at ${(CONTROL_ERROR_RATE * 100).toFixed(0)}%`}
            onChange={setCandidateError}
          />
          <Slider
            label="Errors while using it"
            value={clientError}
            min={0}
            max={0.5}
            step={0.01}
            display={`${(clientError * 100).toFixed(0)}%`}
            hint={`anything above ${(GUARDRAILS.maxClientErrorRate * 100).toFixed(0)}% is withdrawn`}
            onChange={setClientError}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat
            label="Versus the old version"
            value={`${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`}
            breaching={delta > GUARDRAILS.maxErrorRateDelta}
            limit={`limit +${(GUARDRAILS.maxErrorRateDelta * 100).toFixed(0)}%`}
          />
          <MiniStat
            label="Error rate"
            value={`${(clientError * 100).toFixed(1)}%`}
            breaching={clientError > GUARDRAILS.maxClientErrorRate}
            limit={`limit ${(GUARDRAILS.maxClientErrorRate * 100).toFixed(0)}%`}
          />
        </div>

        {/* aria-live so the verdict is announced as the sliders change. */}
        <div className={`rounded-md border p-4 ${tone.ring}`} aria-live="polite">
          <div className={`flex items-center gap-2 text-sm font-semibold ${tone.text}`}>
            <tone.Icon className="h-4 w-4 shrink-0" aria-hidden />
            {tone.label}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">{decision.detail}</p>
          <p className="mt-3 font-mono text-[11px] text-ink-400">action: {decision.action}</p>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium text-ink-400">{label}</label>
        <span className="font-mono text-sm text-ink-200 nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-grass-500"
      />
      {hint ? <p className="mt-1 text-[11px] text-ink-400">{hint}</p> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  breaching,
  limit,
}: {
  label: string;
  value: string;
  breaching: boolean;
  limit: string;
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 transition-colors ${
        breaching ? "border-fire-600/50 bg-fire-500/[0.07]" : "border-ink-700 bg-ink-800/40"
      }`}
    >
      <div className="text-[11px] text-ink-400">{label}</div>
      <div
        className={`mt-1 font-mono text-xl nums ${
          breaching ? "text-fire-500" : "text-ink-200"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-ink-400">{limit}</div>
    </div>
  );
}
