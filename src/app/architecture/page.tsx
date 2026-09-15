import type { Metadata } from "next";
import { FlowDiagram } from "@/components/marketing/FlowDiagram";

export const metadata: Metadata = {
  title: "Architecture — LessonForge",
  description:
    "How LessonForge is built: two deployed services, the request pipeline from draft to halt, and the guardrail thresholds.",
};

const SPECS: { label: string; value: string }[] = [
  { label: "Web app", value: "Next.js 15 · React 19 · TypeScript · Tailwind CSS 4" },
  { label: "AI service", value: "FastAPI · Pydantic · OpenAI GPT-4 · OpenAI TTS" },
  { label: "Data", value: "Neon Postgres · Drizzle ORM · 7 tables" },
  { label: "Storage", value: "Vercel Blob for synthesized audio clips" },
  { label: "Scheduling", value: "Vercel Cron · guardrail sweep every 5 minutes" },
  { label: "Charts", value: "Recharts · error-rate series per variant" },
  { label: "Tests", value: "node:test and pytest · guardrail and bucketing logic" },
  { label: "Hosting", value: "Two Vercel projects from one repository" },
];

const GUARDRAILS: { rule: string; threshold: string; rationale: string }[] = [
  {
    rule: "Answer error rate delta",
    threshold: "+15 pts vs control",
    rationale:
      "A candidate measurably harder to answer correctly than the control is a content regression, not a difficulty preference.",
  },
  {
    rule: "Client error rate",
    threshold: "5% of sessions",
    rationale:
      "Audio and rendering failures are judged on an absolute ceiling — comparing broken against working is meaningless.",
  },
  {
    rule: "Minimum sessions",
    threshold: "20 sessions",
    rationale:
      "Nothing is judged below this. Halting on a handful of noisy sessions would make the mechanism untrustworthy.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="space-y-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-200">Architecture</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-400">
          LessonForge is two deployed services sharing one repository: a Next.js app that authors,
          serves and measures lessons, and a Python service that owns every call to the model. The
          web app never holds an OpenAI key, so authoring can degrade without affecting learners.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-ink-200">The pipeline</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          Five stages, each with a clear owner.
        </p>
        <div className="mt-6">
          <FlowDiagram />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-ink-200">Guardrail thresholds</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          Two independent halt conditions, both gated on a minimum sample size. The logic is a pure
          function over aggregated numbers, which is why it can be unit tested and why the
          simulator on the home page can run the real thing in the browser.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-700">
                {["Rule", "Threshold", "Why"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-2.5 text-xs font-medium text-ink-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GUARDRAILS.map((row) => (
                <tr key={row.rule} className="border-b border-ink-700/60 last:border-0">
                  <td className="px-4 py-3 align-top text-sm text-ink-200">{row.rule}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-sm text-bee-500">
                    {row.threshold}
                  </td>
                  <td className="px-4 py-3 align-top text-sm leading-relaxed text-ink-400">
                    {row.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-ink-200">Stack</h2>
        <dl className="mt-6 divide-y divide-ink-700 border-y border-ink-700">
          {SPECS.map((spec) => (
            <div key={spec.label} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
              <dt className="text-sm text-ink-400">{spec.label}</dt>
              <dd className="font-mono text-sm text-ink-300">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
