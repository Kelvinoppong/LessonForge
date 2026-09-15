import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { Exercise } from "@/lib/types";

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** "spanish" | "math" */
    course: text("course").notNull(),
    skill: text("skill").notNull(),
    /** "draft" | "published" | "archived" */
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("lessons_slug_key").on(t.slug), index("lessons_course_idx").on(t.course)],
);

/**
 * A lesson can hold several variants. Exactly one is the control; the others are
 * candidates an experiment routes traffic to. Halting a variant is what the
 * health monitor does when a variant starts hurting learners.
 */
export const lessonVariants = pgTable(
  "lesson_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    isControl: boolean("is_control").notNull().default(false),
    exercises: jsonb("exercises").$type<Exercise[]>().notNull(),
    /** "active" | "halted" */
    status: text("status").notNull().default("active"),
    /** Model name if AI-drafted, "human" if hand-written. */
    authoredBy: text("authored_by").notNull().default("human"),
    haltedAt: timestamp("halted_at", { withTimezone: true }),
    haltReason: text("halt_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("lesson_variants_label_key").on(t.lessonId, t.label),
    index("lesson_variants_lesson_idx").on(t.lessonId),
  ],
);

/** Transcript of the authoring conversation, kept for provenance and auditing. */
export const draftMessages = pgTable(
  "draft_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    /** "user" | "assistant" | "system" */
    role: text("role").notNull(),
    content: text("content").notNull(),
    /** Draft exercises attached to an assistant turn, before the author accepts them. */
    proposedExercises: jsonb("proposed_exercises").$type<Exercise[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("draft_messages_lesson_idx").on(t.lessonId, t.createdAt)],
);

export const experiments = pgTable(
  "experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    /** "running" | "halted" | "completed" */
    status: text("status").notNull().default("running"),
    /** Percent of learners sent to the candidate variant, 0-100. */
    trafficSplit: integer("traffic_split").notNull().default(50),

    // --- Guardrails the health monitor enforces ---
    /** Halt if the candidate's answer error rate exceeds the control's by this much. */
    maxErrorRateDelta: real("max_error_rate_delta").notNull().default(0.15),
    /** Halt if the candidate's client error count per session exceeds this. */
    maxClientErrorRate: real("max_client_error_rate").notNull().default(0.05),
    /** Don't act until the candidate has at least this many sessions. */
    minSessions: integer("min_sessions").notNull().default(20),

    haltedAt: timestamp("halted_at", { withTimezone: true }),
    haltReason: text("halt_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("experiments_key_key").on(t.key),
    index("experiments_status_idx").on(t.status),
  ],
);

/** Sticky assignment so a learner always sees the same variant. */
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => lessonVariants.id, { onDelete: "cascade" }),
    learnerId: text("learner_id").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("assignments_learner_key").on(t.experimentId, t.learnerId),
    index("assignments_variant_idx").on(t.variantId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: text("learner_id").notNull(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => lessonVariants.id, { onDelete: "cascade" }),
    experimentId: uuid("experiment_id").references(() => experiments.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    exerciseIndex: integer("exercise_index"),
    correct: boolean("correct"),
    latencyMs: integer("latency_ms"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_variant_time_idx").on(t.variantId, t.createdAt),
    index("events_experiment_time_idx").on(t.experimentId, t.createdAt),
    index("events_type_idx").on(t.type),
  ],
);

/** Audit trail: every health evaluation, whether or not it took action. */
export const healthChecks = pgTable(
  "health_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    candidateSessions: integer("candidate_sessions").notNull(),
    candidateErrorRate: real("candidate_error_rate").notNull(),
    controlErrorRate: real("control_error_rate").notNull(),
    candidateClientErrorRate: real("candidate_client_error_rate").notNull(),
    /** "none" | "halted" | "skipped_low_traffic" */
    action: text("action").notNull(),
    detail: text("detail"),
  },
  (t) => [index("health_checks_experiment_idx").on(t.experimentId, t.evaluatedAt)],
);
