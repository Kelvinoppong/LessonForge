CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_learner_key" UNIQUE("experiment_id","learner_id")
);
--> statement-breakpoint
CREATE TABLE "draft_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"proposed_exercises" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"experiment_id" uuid,
	"type" text NOT NULL,
	"exercise_index" integer,
	"correct" boolean,
	"latency_ms" integer,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"traffic_split" integer DEFAULT 50 NOT NULL,
	"max_error_rate_delta" real DEFAULT 0.15 NOT NULL,
	"max_client_error_rate" real DEFAULT 0.05 NOT NULL,
	"min_sessions" integer DEFAULT 20 NOT NULL,
	"halted_at" timestamp with time zone,
	"halt_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiments_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"candidate_sessions" integer NOT NULL,
	"candidate_error_rate" real NOT NULL,
	"control_error_rate" real NOT NULL,
	"candidate_client_error_rate" real NOT NULL,
	"action" text NOT NULL,
	"detail" text
);
--> statement-breakpoint
CREATE TABLE "lesson_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"label" text NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"exercises" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"authored_by" text DEFAULT 'human' NOT NULL,
	"halted_at" timestamp with time zone,
	"halt_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_variants_label_key" UNIQUE("lesson_id","label")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"course" text NOT NULL,
	"skill" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_variant_id_lesson_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."lesson_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_messages" ADD CONSTRAINT "draft_messages_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_variant_id_lesson_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."lesson_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_variants" ADD CONSTRAINT "lesson_variants_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_variant_idx" ON "assignments" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "draft_messages_lesson_idx" ON "draft_messages" USING btree ("lesson_id","created_at");--> statement-breakpoint
CREATE INDEX "events_variant_time_idx" ON "events" USING btree ("variant_id","created_at");--> statement-breakpoint
CREATE INDEX "events_experiment_time_idx" ON "events" USING btree ("experiment_id","created_at");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "experiments_status_idx" ON "experiments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "health_checks_experiment_idx" ON "health_checks" USING btree ("experiment_id","evaluated_at");--> statement-breakpoint
CREATE INDEX "lesson_variants_lesson_idx" ON "lesson_variants" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lessons_course_idx" ON "lessons" USING btree ("course");