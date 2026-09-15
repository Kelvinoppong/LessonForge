import { z } from "zod";

/**
 * Exercise schemas are the contract between the AI authoring service, the
 * database, and the learner renderer. The AI service is asked to emit JSON
 * matching these shapes; anything that fails validation never reaches a learner.
 */

export const point = z.object({
  x: z.number(),
  y: z.number(),
});

export const coordinatePlotExercise = z.object({
  kind: z.literal("coordinate_plot"),
  prompt: z.string().min(1),
  /** The point the learner has to click on the plane. */
  target: point,
  /** Plane spans -range..range on both axes. */
  gridRange: z.number().int().min(4).max(20).default(10),
  /** How close a click has to be, in grid units, to count as correct. */
  tolerance: z.number().min(0.1).max(1).default(0.4),
  hint: z.string().optional(),
});

export const coordinateReadExercise = z.object({
  kind: z.literal("coordinate_read"),
  prompt: z.string().min(1),
  /** The point drawn on the plane; the learner names its coordinates. */
  shown: point,
  gridRange: z.number().int().min(4).max(20).default(10),
  choices: z.array(z.string().min(1)).min(2).max(6),
  answerIndex: z.number().int().min(0),
  hint: z.string().optional(),
});

export const listeningChoiceExercise = z.object({
  kind: z.literal("listening_choice"),
  prompt: z.string().min(1),
  /** Spanish text sent to TTS at authoring time. */
  audioText: z.string().min(1),
  /** Populated once audio has been generated and uploaded to Blob. */
  audioUrl: z.string().url().optional(),
  choices: z.array(z.string().min(1)).min(2).max(6),
  answerIndex: z.number().int().min(0),
  /** Shown only after the learner answers, so listening is actually tested. */
  transcript: z.string().optional(),
});

export const listeningTypeExercise = z.object({
  kind: z.literal("listening_type"),
  prompt: z.string().min(1),
  audioText: z.string().min(1),
  audioUrl: z.string().url().optional(),
  /** Accepted answers, compared case- and accent-insensitively. */
  accepted: z.array(z.string().min(1)).min(1),
  transcript: z.string().optional(),
});

export const exercise = z.discriminatedUnion("kind", [
  coordinatePlotExercise,
  coordinateReadExercise,
  listeningChoiceExercise,
  listeningTypeExercise,
]);

export const exerciseList = z.array(exercise).min(1).max(12);

export type Point = z.infer<typeof point>;
export type Exercise = z.infer<typeof exercise>;
export type ExerciseKind = Exercise["kind"];
export type CoordinatePlotExercise = z.infer<typeof coordinatePlotExercise>;
export type CoordinateReadExercise = z.infer<typeof coordinateReadExercise>;
export type ListeningChoiceExercise = z.infer<typeof listeningChoiceExercise>;
export type ListeningTypeExercise = z.infer<typeof listeningTypeExercise>;

export const COURSES = ["spanish", "math"] as const;
export type Course = (typeof COURSES)[number];

/** Which exercise kinds make sense for which course, used to steer the AI. */
export const COURSE_EXERCISE_KINDS: Record<Course, ExerciseKind[]> = {
  spanish: ["listening_choice", "listening_type"],
  math: ["coordinate_plot", "coordinate_read"],
};

export const EVENT_TYPES = [
  "exercise_view",
  "exercise_answer",
  "lesson_complete",
  "client_error",
  "audio_error",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const telemetryEvent = z.object({
  learnerId: z.string().min(1).max(128),
  lessonId: z.string().uuid(),
  variantId: z.string().uuid(),
  experimentId: z.string().uuid().nullish(),
  type: z.enum(EVENT_TYPES),
  exerciseIndex: z.number().int().min(0).nullish(),
  correct: z.boolean().nullish(),
  latencyMs: z.number().int().min(0).max(600_000).nullish(),
  detail: z.string().max(2000).nullish(),
});

export type TelemetryEvent = z.infer<typeof telemetryEvent>;
