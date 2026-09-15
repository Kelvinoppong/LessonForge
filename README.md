# LessonForge

An internal course-authoring studio with an experimentation platform built in.
Authors draft lessons conversationally with GPT-4, publish them as variants, and
the platform A/B tests those variants on learners — automatically halting any
variant that starts making learners worse.

Two working exercise types ship with it: **Spanish listening comprehension** with
generated audio, and an interactive **coordinate plane** for teaching coordinates.

---

## Why this exists

Most AI content tools stop at generation. The hard part isn't drafting a lesson —
it's knowing whether the lesson you shipped is worse than the one it replaced, and
pulling it before thousands of learners hit it.

LessonForge closes that loop:

```
  author                        learner
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
                        └────────────────────┘
```

## What it does

| Capability                | How it works                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Conversational drafting** | Authors describe a lesson in plain language. A separate FastAPI service prompts GPT-4, validates the JSON against a strict exercise schema, and feeds validation errors back for one self-repair attempt before failing. |
| **Spanish listening**       | `audioText` is synthesized with OpenAI TTS at authoring time and stored in Vercel Blob, so replays are instant. Falls back to browser speech synthesis if the hosted clip fails. |
| **Coordinate plane**        | An SVG plane the learner clicks to plot points, or reads coordinates from. Fully keyboard-operable — arrow keys move a cursor, Enter plots, Shift jumps five units. |
| **Review before publish**   | Nothing the model produces reaches a learner until an author accepts it as a variant. The full authoring transcript is persisted for provenance. |
| **Sticky A/B assignment**   | Learners are bucketed by an FNV-1a hash of `experimentKey:learnerId`, so assignment is stable across requests and independent between concurrent experiments. |
| **Automatic halting**       | A scheduled sweep compares each candidate against its control and halts it on either an answer-error-rate regression or an absolute client-error breach. Halted candidates fall back to control on the learner's next request. |
| **Reliability dashboard**   | Per-variant sessions, error rates, client errors and p95 answer latency, plotted hourly, alongside an audit log of every guardrail evaluation. |

## Design decisions worth calling out

**The guardrail logic is a pure function.** `src/lib/guardrails.ts` has no database
or network imports. Deciding whether to pull content away from learners is the most
consequential logic here, so it's testable in isolation and covered directly.

**Two independent halt conditions, not one score.** A variant can be *hard* (high
answer error rate relative to control) or *broken* (client errors above an absolute
ceiling). Collapsing those into a single health number would obscure which one
fired, and they need different thresholds — brokenness shouldn't be graded on a
curve against the control.

**Halting is gated on sample size.** A guardrail that fires on three sessions of
noise is a guardrail nobody trusts, so nothing is judged below `minSessions`.

**The AI service is a separate deployment.** The web app never holds an
`OPENAI_API_KEY`. A model outage degrades authoring without touching learners or
telemetry, and prompt iteration doesn't require redeploying the platform.

**Validation happens at both boundaries.** The Python service validates model
output with Pydantic; the web app re-validates with Zod on receipt. An exercise
that can't be rendered is never persisted.

**Telemetry never breaks a lesson.** Events are batched, flushed with
`sendBeacon` on page teardown, and every failure path drops the batch instead of
surfacing an error to the learner.

**The database connection is lazy.** `next build` imports every route module with
no runtime environment, so connecting on first use rather than at import time means
a missing `DATABASE_URL` fails a request, not the build.

## Tech stack

- **Web** — Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Data** — Neon Postgres with Drizzle ORM
- **AI service** — Python, FastAPI, OpenAI (GPT-4 + TTS), Pydantic
- **Storage** — Vercel Blob for generated audio
- **Scheduling** — Vercel Cron for the guardrail sweep
- **Charts** — Recharts

## Running it locally

### 1. Database

Create a free Postgres database at [neon.tech](https://neon.tech) and copy the
connection string.

```bash
cp .env.example .env.local   # then fill in DATABASE_URL
npm install
npm run db:push              # create the tables
```

### 2. Content AI service

```bash
cd services/content-ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export OPENAI_API_KEY=sk-...
export CONTENT_AI_TOKEN=dev-local-token-change-me
uvicorn api.index:app --reload --port 8000
```

Use the same `CONTENT_AI_TOKEN` in `.env.local`.

### 3. Web app

```bash
npm run dev     # http://localhost:3000
```

### 4. Optional: seed a demo

```bash
npm run db:seed
```

This creates a Math and a Spanish lesson, each with a control and a deliberately
worse candidate, plus ~1,500 synthetic telemetry events. Open `/ops` and click
**Run health check now** — both candidates get halted, for different reasons. No
OpenAI key needed.

## Tests

```bash
npm test              # guardrail decisions and bucketing distribution
npm run typecheck

cd services/content-ai
pip install -r requirements-dev.txt
python -m pytest      # exercise validation and endpoint auth
```

28 tests across both languages, covering the two things that would do real damage
if they broke: the guardrail decisions that pull content away from learners, and
the validation that stops malformed AI output from reaching them. CI runs
typecheck, both test suites, and a production build on every push.

## Deploying to Vercel

Two Vercel projects from one repository.

**Project 1 — web app** (root directory `.`)

| Variable                 | Notes                                          |
| ------------------------ | ---------------------------------------------- |
| `DATABASE_URL`           | Neon connection string                         |
| `CONTENT_AI_URL`         | The deployed content-ai URL                    |
| `CONTENT_AI_TOKEN`       | Must match the AI service                      |
| `BLOB_READ_WRITE_TOKEN`  | From the Vercel Blob integration               |
| `CRON_SECRET`            | Long random string; Vercel sends it to the cron |

The `crons` entry in `vercel.json` registers the five-minute guardrail sweep
automatically.

**Project 2 — content-ai** (root directory `services/content-ai`)

| Variable            | Notes                          |
| ------------------- | ------------------------------ |
| `OPENAI_API_KEY`    | Your OpenAI key                |
| `CONTENT_AI_TOKEN`  | Must match the web app         |
| `OPENAI_MODEL`      | Defaults to `gpt-4o`           |
| `OPENAI_TTS_MODEL`  | Defaults to `gpt-4o-mini-tts`  |

## Roadmap

- React Native client reusing the same assignment and telemetry endpoints, to
  demonstrate porting the learner surface across platforms
- Statistical significance on the dashboard rather than raw rate deltas
- More exercise types per course, and authoring for a third course
