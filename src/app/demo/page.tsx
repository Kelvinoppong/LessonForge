"use client";

import { useMemo, useState } from "react";
import { ExercisePlayer } from "@/components/ExercisePlayer";
import { buttonStyles, Card } from "@/components/ui";
import { NoopTelemetry } from "@/lib/learner";
import type { Exercise } from "@/lib/types";

/**
 * Offline demo of the learner experience.
 *
 * Runs the real player and the real exercise components against fixed content,
 * with a telemetry sink that discards events, so the interface can be tried
 * without a database, an API key, or a seeded experiment.
 */

const MATH_EXERCISES: Exercise[] = [
  {
    kind: "coordinate_plot",
    prompt: "Plot the point (3, 2).",
    target: { x: 3, y: 2 },
    gridRange: 10,
    tolerance: 0.4,
    hint: "Move right along the x-axis first, then up along the y-axis.",
  },
  {
    kind: "coordinate_read",
    prompt: "What are the coordinates of the plotted point?",
    shown: { x: -4, y: 5 },
    gridRange: 10,
    choices: ["(-4, 5)", "(5, -4)", "(4, 5)", "(-4, -5)"],
    answerIndex: 0,
    hint: "Read across for x, then up or down for y.",
  },
  {
    kind: "coordinate_plot",
    prompt: "Plot the point (0, -6).",
    target: { x: 0, y: -6 },
    gridRange: 10,
    tolerance: 0.4,
    hint: "A point with x = 0 sits directly on the y-axis.",
  },
];

const SPANISH_EXERCISES: Exercise[] = [
  {
    kind: "listening_choice",
    prompt: "Listen. What is she ordering?",
    audioText: "Quiero un café con leche, por favor.",
    choices: ["A coffee with milk", "A glass of water", "A cup of tea", "An orange juice"],
    answerIndex: 0,
    transcript: "Quiero un café con leche, por favor.",
  },
  {
    kind: "listening_type",
    prompt: "Type what you hear.",
    audioText: "La cuenta, por favor.",
    accepted: ["La cuenta, por favor", "la cuenta por favor"],
    transcript: "La cuenta, por favor.",
  },
];

export default function DemoPage() {
  const [course, setCourse] = useState<"math" | "spanish">("math");
  const telemetry = useMemo(() => new NoopTelemetry(), []);

  const isMath = course === "math";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Try a lesson</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          The real learner player, running on fixed sample content. No database, no API key, and
          nothing recorded. The coordinate plane works with a tap or with arrow keys and Enter.
        </p>
      </header>

      <Card className="p-2">
        <div className="flex gap-2" role="tablist" aria-label="Course">
          <button
            type="button"
            role="tab"
            aria-selected={isMath}
            onClick={() => setCourse("math")}
            className={isMath ? buttonStyles.primary : buttonStyles.secondary}
          >
            Math — Coordinates
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isMath}
            onClick={() => setCourse("spanish")}
            className={!isMath ? buttonStyles.primary : buttonStyles.secondary}
          >
            Spanish — Listening
          </button>
        </div>
      </Card>

      {!isMath ? (
        <p className="rounded-xl border border-macaw-600/40 bg-macaw-500/10 px-4 py-3 text-sm text-macaw-500">
          In the full platform this audio is generated with OpenAI TTS at authoring time and served
          from blob storage. Here there is no hosted clip, so the player falls back to your
          browser&apos;s Spanish voice — the same fallback that protects a learner when a clip
          fails to load.
        </p>
      ) : null}

      {/* Remounting on course change resets progress to the first exercise. */}
      <ExercisePlayer
        key={course}
        lessonTitle={isMath ? "Coordinates: plotting points" : "Café Spanish: ordering"}
        exercises={isMath ? MATH_EXERCISES : SPANISH_EXERCISES}
        telemetry={telemetry}
        variantLabel="demo"
      />
    </div>
  );
}
