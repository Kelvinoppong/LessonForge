/**
 * Seeds a demonstrable state without needing an OpenAI key.
 *
 * Creates one Math lesson and one Spanish lesson, each with a control and a
 * deliberately worse candidate variant, plus synthetic telemetry shaped so that
 * the guardrail sweep has something real to act on: the Math candidate breaches
 * the error-rate delta, the Spanish candidate breaches the client-error ceiling.
 *
 * Run with `npm run db:seed`, then hit "Run health check now" on /ops.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";
import type { Exercise } from "../lib/types.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Create .env.local from .env.example with your Neon connection string.",
  );
  process.exit(1);
}

const db = drizzle(neon(url), { schema });

const mathControl: Exercise[] = [
  {
    kind: "coordinate_plot",
    prompt: "Plot the point (3, 2).",
    target: { x: 3, y: 2 },
    gridRange: 10,
    tolerance: 0.4,
    hint: "Move right along x first, then up along y.",
  },
  {
    kind: "coordinate_plot",
    prompt: "Plot the point (-4, 1).",
    target: { x: -4, y: 1 },
    gridRange: 10,
    tolerance: 0.4,
  },
  {
    kind: "coordinate_read",
    prompt: "What are the coordinates of the plotted point?",
    shown: { x: -2, y: -5 },
    gridRange: 10,
    choices: ["(-2, -5)", "(-5, -2)", "(2, -5)", "(-2, 5)"],
    answerIndex: 0,
  },
  {
    kind: "coordinate_plot",
    prompt: "Plot the point (0, -6).",
    target: { x: 0, y: -6 },
    gridRange: 10,
    tolerance: 0.4,
    hint: "A point with x = 0 sits on the y-axis.",
  },
];

/** Same skill, but the prompts drop the scaffolding and the grid gets bigger. */
const mathCandidate: Exercise[] = [
  {
    kind: "coordinate_plot",
    prompt: "Plot (3, 2).",
    target: { x: 3, y: 2 },
    gridRange: 16,
    tolerance: 0.4,
  },
  {
    kind: "coordinate_read",
    prompt: "Name the point.",
    shown: { x: -13, y: 11 },
    gridRange: 16,
    choices: ["(-13, 11)", "(11, -13)", "(-11, 13)", "(13, -11)"],
    answerIndex: 0,
  },
  {
    kind: "coordinate_plot",
    prompt: "Plot (-14, -15).",
    target: { x: -14, y: -15 },
    gridRange: 16,
    tolerance: 0.4,
  },
  {
    kind: "coordinate_read",
    prompt: "Name the point.",
    shown: { x: 15, y: -14 },
    gridRange: 16,
    choices: ["(15, -14)", "(-14, 15)", "(14, -15)", "(-15, 14)"],
    answerIndex: 0,
  },
];

const spanishControl: Exercise[] = [
  {
    kind: "listening_choice",
    prompt: "Listen. What is she ordering?",
    audioText: "Quiero un café con leche, por favor.",
    choices: ["A coffee with milk", "A glass of water", "A cup of tea", "An orange juice"],
    answerIndex: 0,
    transcript: "Quiero un café con leche, por favor.",
  },
  {
    kind: "listening_choice",
    prompt: "Listen. What time does the train leave?",
    audioText: "El tren sale a las ocho de la mañana.",
    choices: ["8 in the morning", "8 at night", "2 in the afternoon", "10 in the morning"],
    answerIndex: 0,
    transcript: "El tren sale a las ocho de la mañana.",
  },
  {
    kind: "listening_type",
    prompt: "Type what you hear.",
    audioText: "La cuenta, por favor.",
    accepted: ["La cuenta, por favor", "la cuenta por favor"],
    transcript: "La cuenta, por favor.",
  },
];

/** Longer clips and no transcripts — plus this is the variant we break on purpose. */
const spanishCandidate: Exercise[] = [
  {
    kind: "listening_choice",
    prompt: "Listen. What does the customer want?",
    audioText:
      "Buenas tardes, quería pedir un café con leche para llevar y también un croissant, si todavía les quedan.",
    choices: [
      "Coffee and a croissant to go",
      "Tea and a sandwich to stay",
      "Only a coffee to stay",
      "A croissant and juice to go",
    ],
    answerIndex: 0,
  },
  {
    kind: "listening_type",
    prompt: "Type what you hear.",
    audioText:
      "El tren con destino a Valencia sale del andén número siete a las ocho y cuarto.",
    accepted: ["El tren con destino a Valencia sale del andén número siete a las ocho y cuarto"],
  },
  {
    kind: "listening_type",
    prompt: "Type what you hear.",
    audioText: "¿Me podría decir cuánto cuesta el billete de ida y vuelta?",
    accepted: ["¿Me podría decir cuánto cuesta el billete de ida y vuelta?"],
  },
];

type SeedSpec = {
  title: string;
  course: "math" | "spanish";
  skill: string;
  control: Exercise[];
  candidate: Exercise[];
  experiment: { key: string; name: string };
  /** Per-session probability that an answer is wrong. */
  controlErrorRate: number;
  candidateErrorRate: number;
  /** Client errors emitted per candidate session. */
  candidateClientErrorsPerSession: number;
};

const SPECS: SeedSpec[] = [
  {
    title: "Coordinates: plotting points in four quadrants",
    course: "math",
    skill: "Coordinates",
    control: mathControl,
    candidate: mathCandidate,
    experiment: { key: "coords-terser-prompts", name: "Coordinates: terser prompts, wider grid" },
    controlErrorRate: 0.22,
    candidateErrorRate: 0.61,
    candidateClientErrorsPerSession: 0,
  },
  {
    title: "Café Spanish: ordering and paying",
    course: "spanish",
    skill: "Listening comprehension",
    control: spanishControl,
    candidate: spanishCandidate,
    experiment: { key: "cafe-longer-clips", name: "Café Spanish: longer, unscaffolded clips" },
    controlErrorRate: 0.24,
    candidateErrorRate: 0.3,
    candidateClientErrorsPerSession: 0.4,
  },
];

const SESSIONS_PER_VARIANT = 60;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function seedSpec(spec: SeedSpec) {
  const [lesson] = await db
    .insert(schema.lessons)
    .values({
      title: spec.title,
      course: spec.course,
      skill: spec.skill,
      slug: `${slugify(spec.title)}-${Math.random().toString(36).slice(2, 6)}`,
      status: "published",
    })
    .returning();

  const [control] = await db
    .insert(schema.lessonVariants)
    .values({
      lessonId: lesson.id,
      label: "control",
      isControl: true,
      exercises: spec.control,
      authoredBy: "human",
    })
    .returning();

  const [candidate] = await db
    .insert(schema.lessonVariants)
    .values({
      lessonId: lesson.id,
      label: "candidate",
      isControl: false,
      exercises: spec.candidate,
      authoredBy: "gpt-4o",
    })
    .returning();

  const [experiment] = await db
    .insert(schema.experiments)
    .values({
      lessonId: lesson.id,
      key: spec.experiment.key,
      name: spec.experiment.name,
      status: "running",
      trafficSplit: 50,
    })
    .returning();

  const rows: (typeof schema.events.$inferInsert)[] = [];
  const now = Date.now();

  const emit = (
    variantId: string,
    exercises: Exercise[],
    errorRate: number,
    clientErrorsPerSession: number,
    prefix: string,
  ) => {
    for (let s = 0; s < SESSIONS_PER_VARIANT; s++) {
      const learnerId = `seed_${prefix}_${s}`;
      // Spread sessions across the last 20 hours so the dashboard chart has shape.
      const sessionStart = now - Math.floor(Math.random() * 20 * 60 * 60 * 1000);

      exercises.forEach((_, index) => {
        const at = new Date(sessionStart + index * 45_000);
        rows.push({
          learnerId,
          lessonId: lesson.id,
          variantId,
          experimentId: experiment.id,
          type: "exercise_view",
          exerciseIndex: index,
          createdAt: at,
        });
        rows.push({
          learnerId,
          lessonId: lesson.id,
          variantId,
          experimentId: experiment.id,
          type: "exercise_answer",
          exerciseIndex: index,
          correct: Math.random() >= errorRate,
          latencyMs: 3000 + Math.floor(Math.random() * 9000),
          createdAt: new Date(at.getTime() + 20_000),
        });
      });

      if (Math.random() < clientErrorsPerSession) {
        rows.push({
          learnerId,
          lessonId: lesson.id,
          variantId,
          experimentId: experiment.id,
          type: "audio_error",
          exerciseIndex: 0,
          detail: "Audio playback failed: NotSupportedError",
          createdAt: new Date(sessionStart + 5_000),
        });
      }

      // Most sessions finish; a few abandon.
      if (Math.random() > 0.15) {
        rows.push({
          learnerId,
          lessonId: lesson.id,
          variantId,
          experimentId: experiment.id,
          type: "lesson_complete",
          exerciseIndex: exercises.length - 1,
          createdAt: new Date(sessionStart + exercises.length * 45_000),
        });
      }
    }
  };

  emit(control.id, spec.control, spec.controlErrorRate, 0, `${spec.course}_control`);
  emit(
    candidate.id,
    spec.candidate,
    spec.candidateErrorRate,
    spec.candidateClientErrorsPerSession,
    `${spec.course}_candidate`,
  );

  // Neon's HTTP driver has a statement size limit, so insert in chunks.
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(schema.events).values(rows.slice(i, i + 500));
  }

  console.log(
    `Seeded "${lesson.title}" with ${rows.length} events and experiment ${experiment.key}`,
  );
}

for (const spec of SPECS) {
  await seedSpec(spec);
}

console.log(
  "\nDone. Open /ops and choose 'Run health check now' — both candidates should be halted, " +
    "for different reasons.",
);
