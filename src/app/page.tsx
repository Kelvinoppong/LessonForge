import Link from "next/link";
import { buttonStyles, Card } from "@/components/ui";

const pillars = [
  {
    title: "Draft with GPT-4",
    body: "Authors describe a lesson in plain language. The content service drafts exercises, validates them against a strict schema, and repairs its own mistakes before a human ever sees them.",
  },
  {
    title: "Two real exercise types",
    body: "Spanish listening comprehension with generated audio, and an interactive coordinate plane for teaching coordinates — both playable, both keyboard-accessible.",
  },
  {
    title: "Experiment on learners",
    body: "Lesson variants are assigned by sticky hash bucketing, so a learner always sees the same version and results stay comparable.",
  },
  {
    title: "Halt what's hurting",
    body: "A scheduled guardrail sweep watches error rates and client failures per variant, and halts any candidate that regresses — no human in the loop.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="pt-4">
        <p className="text-sm font-bold uppercase tracking-widest text-grass-300">
          Internal tooling
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Author lessons with AI. Ship them safely.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-ink-400 sm:text-lg">
          LessonForge is a course-authoring studio with an experimentation platform built in.
          Content is drafted conversationally, tested on a slice of learners, and automatically
          pulled if it starts making them worse.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demo" className={buttonStyles.primary}>
            Try a lesson
          </Link>
          <Link href="/studio" className={buttonStyles.secondary}>
            Open the Studio
          </Link>
          <Link href="/ops" className={buttonStyles.secondary}>
            Reliability dashboard
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-400">
          The demo runs without a database or API key.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="p-6">
            <h2 className="font-bold">{pillar.title}</h2>
            <p className="mt-2 text-sm text-ink-400">{pillar.body}</p>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">How it fits together</h2>
        <Card className="mt-4 overflow-x-auto p-6">
          <pre className="min-w-[34rem] text-xs leading-relaxed text-ink-400">
{`  author                        learner
    │                              │
    ▼                              ▼
┌─────────────┐            ┌──────────────┐
│   Studio    │            │   Lesson     │
│  (Next.js)  │            │   player     │
└──────┬──────┘            └──────┬───────┘
       │ draft                    │ assign / telemetry
       ▼                          ▼
┌─────────────┐            ┌──────────────┐
│  content-ai │            │  Next.js API │
│  (FastAPI)  │            │    routes    │
│   GPT-4/TTS │            └──────┬───────┘
└─────────────┘                   │
                                  ▼
                        ┌────────────────────┐
                        │  Neon Postgres     │
                        └─────────┬──────────┘
                                  │ every 5 min
                                  ▼
                        ┌────────────────────┐
                        │  guardrail sweep   │
                        │  halts bad variants│
                        └────────────────────┘`}
          </pre>
        </Card>
      </section>
    </div>
  );
}
