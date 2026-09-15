"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, buttonStyles, Card, EmptyState, inputStyles } from "@/components/ui";
import { apiFetch, apiSend } from "@/lib/api";
import { COURSES, type Course } from "@/lib/types";

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  course: string;
  skill: string;
  status: string;
  updatedAt: string;
  variantCount: number;
};

const SKILL_SUGGESTIONS: Record<Course, string> = {
  math: "Coordinates",
  spanish: "Listening comprehension",
};

export default function StudioPage() {
  const [lessons, setLessons] = useState<LessonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState<Course>("math");
  const [skill, setSkill] = useState(SKILL_SUGGESTIONS.math);

  const load = async () => {
    try {
      const body = await apiFetch<{ lessons: LessonRow[] }>("/api/lessons");
      setLessons(body.lessons);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setLessons([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await apiSend("/api/lessons", "POST", { title, course, skill });
      setTitle("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Authoring studio</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-400">
          Describe the lesson you want in plain language. The content service drafts
          exercises, you review them, and only accepted drafts become variants that
          learners can be assigned to.
        </p>
      </header>

      <Card className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">New lesson</h2>
        <form onSubmit={createLesson} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr_auto]">
          <input
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson title"
            aria-label="Lesson title"
            className={inputStyles}
          />
          <select
            value={course}
            aria-label="Course"
            onChange={(e) => {
              const next = e.target.value as Course;
              setCourse(next);
              setSkill(SKILL_SUGGESTIONS[next]);
            }}
            className={inputStyles}
          >
            {COURSES.map((c) => (
              <option key={c} value={c}>
                {c === "math" ? "Math" : "Spanish"}
              </option>
            ))}
          </select>
          <input
            required
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Skill"
            aria-label="Skill"
            className={inputStyles}
          />
          <button type="submit" disabled={creating} className={buttonStyles.primary}>
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
      </Card>

      {error ? (
        <div className="rounded-md border border-fire-600/40 bg-fire-500/10 px-4 py-3 text-sm text-fire-500">
          {error}
        </div>
      ) : null}

      {lessons === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-ink-900/70" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        // Suppressed when the load failed: "no lessons yet" would be a claim we
        // can't actually make, since we never managed to read them.
        error ? null : (
          <EmptyState
            title="No lessons yet"
            body="Create your first lesson above, then draft its exercises with the content service."
          />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="flex flex-col p-5 transition hover:border-ink-400/60">
              <div className="flex items-start justify-between gap-2">
                <Badge tone={lesson.course === "math" ? "info" : "good"}>
                  {lesson.course === "math" ? "Math" : "Spanish"}
                </Badge>
                <Badge tone={lesson.status === "published" ? "good" : "neutral"}>
                  {lesson.status}
                </Badge>
              </div>

              <h3 className="mt-3 font-semibold leading-snug">{lesson.title}</h3>
              <p className="mt-1 text-xs text-ink-400">{lesson.skill}</p>

              <p className="mt-3 text-xs text-ink-400">
                {lesson.variantCount === 0
                  ? "No variants yet"
                  : `${lesson.variantCount} variant${lesson.variantCount === 1 ? "" : "s"}`}
              </p>

              <div className="mt-4 flex gap-2 pt-1">
                <Link href={`/studio/${lesson.id}`} className={buttonStyles.secondary}>
                  Author
                </Link>
                {lesson.variantCount > 0 ? (
                  <Link href={`/learn/${lesson.id}`} className={buttonStyles.ghost}>
                    Preview
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
