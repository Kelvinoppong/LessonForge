"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ExercisePlayer } from "@/components/ExercisePlayer";
import { buttonStyles, EmptyState } from "@/components/ui";
import { getLearnerId, Telemetry } from "@/lib/learner";
import type { Exercise } from "@/lib/types";

type AssignResponse = {
  lesson: { id: string; title: string; course: string; skill: string; status: string };
  assignment: {
    variantId: string;
    label: string;
    exercises: Exercise[];
    experimentId: string | null;
    reason: string;
  };
};

export default function LearnPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;

  const learnerId = useMemo(() => getLearnerId(), []);
  const [data, setData] = useState<AssignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/assign?lessonId=${encodeURIComponent(lessonId)}&learnerId=${encodeURIComponent(learnerId)}`,
          { cache: "no-store" },
        );
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setError(body.error ?? "Could not load this lesson.");
          return;
        }
        setData(body as AssignResponse);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, learnerId]);

  // Build the telemetry client once the variant is known, and report uncaught
  // client errors against it — those are exactly what the guardrail acts on.
  useEffect(() => {
    if (!data) return;

    const client = new Telemetry({
      learnerId,
      lessonId: data.lesson.id,
      variantId: data.assignment.variantId,
      experimentId: data.assignment.experimentId,
    });
    setTelemetry(client);

    const onError = (event: ErrorEvent) => {
      client.record({
        type: "client_error",
        detail: `${event.message} @ ${event.filename}:${event.lineno}`,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      client.record({
        type: "client_error",
        detail: `Unhandled rejection: ${String(event.reason).slice(0, 400)}`,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      client.dispose();
      setTelemetry(null);
    };
  }, [data, learnerId]);

  if (error) {
    return (
      <EmptyState
        title="This lesson isn't playable yet"
        body={error}
        action={
          <a href="/studio" className={buttonStyles.secondary}>
            Back to Studio
          </a>
        }
      />
    );
  }

  if (!data || !telemetry) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4">
        <div className="h-2.5 rounded-full bg-ink-800" />
        <div className="h-64 rounded-2xl bg-ink-900/70" />
      </div>
    );
  }

  return (
    <ExercisePlayer
      lessonTitle={data.lesson.title}
      exercises={data.assignment.exercises}
      telemetry={telemetry}
      variantLabel={data.assignment.label}
    />
  );
}
