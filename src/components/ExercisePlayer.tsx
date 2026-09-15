"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { CoordinatePlane } from "@/components/CoordinatePlane";
import { Badge, buttonStyles, inputStyles } from "@/components/ui";
import { normalizeAnswer, type TelemetrySink } from "@/lib/learner";
import type { Exercise, Point } from "@/lib/types";

type Props = {
  lessonTitle: string;
  exercises: Exercise[];
  telemetry: TelemetrySink;
  variantLabel: string;
};

type Answer =
  | { kind: "choice"; index: number }
  | { kind: "point"; point: Point }
  | { kind: "text"; value: string };

function grade(exercise: Exercise, answer: Answer): boolean {
  switch (exercise.kind) {
    case "coordinate_plot":
      if (answer.kind !== "point") return false;
      return (
        Math.abs(answer.point.x - exercise.target.x) <= exercise.tolerance &&
        Math.abs(answer.point.y - exercise.target.y) <= exercise.tolerance
      );
    case "coordinate_read":
    case "listening_choice":
      return answer.kind === "choice" && answer.index === exercise.answerIndex;
    case "listening_type":
      if (answer.kind !== "text") return false;
      return exercise.accepted.some(
        (accepted) => normalizeAnswer(accepted) === normalizeAnswer(answer.value),
      );
  }
}

export function ExercisePlayer({
  lessonTitle,
  exercises,
  telemetry,
  variantLabel,
}: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [graded, setGraded] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const shownAt = useRef<number>(Date.now());

  const exercise = exercises[index];
  const isLast = index === exercises.length - 1;

  useEffect(() => {
    shownAt.current = Date.now();
    telemetry.record({ type: "exercise_view", exerciseIndex: index });
  }, [index, telemetry]);

  const canSubmit = useMemo(() => {
    if (!answer) return false;
    if (answer.kind === "text") return answer.value.trim().length > 0;
    return true;
  }, [answer]);

  const submit = () => {
    if (!answer || graded !== null) return;

    const correct = grade(exercise, answer);
    setGraded(correct);
    if (correct) setCorrectCount((n) => n + 1);

    telemetry.record({
      type: "exercise_answer",
      exerciseIndex: index,
      correct,
      latencyMs: Date.now() - shownAt.current,
    });
  };

  const next = () => {
    if (isLast) {
      telemetry.record({ type: "lesson_complete", exerciseIndex: index });
      void telemetry.flush();
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer(null);
    setGraded(null);
  };

  const reportAudioError = (detail: string) => {
    telemetry.record({ type: "audio_error", exerciseIndex: index, detail });
  };

  if (done) {
    const pct = Math.round((correctCount / exercises.length) * 100);
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-ink-700/60 bg-ink-900/70 p-8 text-center">
        <div aria-hidden className="text-5xl">
          {pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📚"}
        </div>
        <h2 className="mt-4 text-2xl font-extrabold">Lesson complete</h2>
        <p className="mt-2 text-ink-400">
          You got{" "}
          <span className="font-bold text-ink-200">
            {correctCount} of {exercises.length}
          </span>{" "}
          correct.
        </p>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-grass-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${buttonStyles.secondary} mt-6`}
        >
          Practise again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-ink-400">{lessonTitle}</span>
          <span className="flex items-center gap-2">
            <Badge tone="info">{variantLabel}</Badge>
            <span className="tabular-nums text-ink-400">
              {index + 1} / {exercises.length}
            </span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={exercises.length}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-800"
        >
          <div
            className="h-full rounded-full bg-grass-500 transition-all duration-300"
            style={{ width: `${((index + (graded !== null ? 1 : 0)) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-ink-700/60 bg-ink-900/70 p-5 sm:p-7">
        <h2 className="text-lg font-bold sm:text-xl">{exercise.prompt}</h2>

        <div className="mt-6">
          {exercise.kind === "coordinate_plot" ? (
            <CoordinatePlane
              gridRange={exercise.gridRange}
              mode="plot"
              picked={answer?.kind === "point" ? answer.point : null}
              onPick={(point) => setAnswer({ kind: "point", point })}
              target={exercise.target}
              revealed={graded !== null}
              disabled={graded !== null}
            />
          ) : null}

          {exercise.kind === "coordinate_read" ? (
            <div className="space-y-5">
              <CoordinatePlane gridRange={exercise.gridRange} mode="show" shown={exercise.shown} />
              <ChoiceGrid
                choices={exercise.choices}
                selected={answer?.kind === "choice" ? answer.index : null}
                answerIndex={exercise.answerIndex}
                graded={graded}
                onSelect={(i) => setAnswer({ kind: "choice", index: i })}
              />
            </div>
          ) : null}

          {exercise.kind === "listening_choice" ? (
            <div className="space-y-6">
              <AudioPlayer
                src={exercise.audioUrl}
                fallbackText={exercise.audioText}
                onError={reportAudioError}
              />
              <ChoiceGrid
                choices={exercise.choices}
                selected={answer?.kind === "choice" ? answer.index : null}
                answerIndex={exercise.answerIndex}
                graded={graded}
                onSelect={(i) => setAnswer({ kind: "choice", index: i })}
              />
            </div>
          ) : null}

          {exercise.kind === "listening_type" ? (
            <div className="space-y-6">
              <AudioPlayer
                src={exercise.audioUrl}
                fallbackText={exercise.audioText}
                onError={reportAudioError}
              />
              <div>
                <label htmlFor="typed-answer" className="sr-only">
                  Type what you hear
                </label>
                <input
                  id="typed-answer"
                  autoComplete="off"
                  spellCheck={false}
                  lang="es"
                  disabled={graded !== null}
                  value={answer?.kind === "text" ? answer.value : ""}
                  onChange={(e) => setAnswer({ kind: "text", value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit && graded === null) submit();
                  }}
                  placeholder="Escribe lo que oyes…"
                  className={inputStyles}
                />
              </div>
            </div>
          ) : null}
        </div>

        {graded !== null ? (
          <div
            role="status"
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              graded
                ? "border-grass-600/40 bg-grass-500/10 text-grass-300"
                : "border-fire-600/40 bg-fire-500/10 text-fire-500"
            }`}
          >
            <p className="font-bold">{graded ? "Correct" : "Not quite"}</p>
            {!graded && exercise.kind === "listening_type" ? (
              <p className="mt-1 text-ink-200">
                Expected: <span className="font-semibold">{exercise.accepted[0]}</span>
              </p>
            ) : null}
            {"transcript" in exercise && exercise.transcript ? (
              <p className="mt-1 text-ink-200">
                Transcript: <span lang="es">{exercise.transcript}</span>
              </p>
            ) : null}
            {!graded && "hint" in exercise && exercise.hint ? (
              <p className="mt-1 text-ink-200">{exercise.hint}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 flex justify-end">
          {graded === null ? (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={buttonStyles.primary}
            >
              Check
            </button>
          ) : (
            <button type="button" onClick={next} className={buttonStyles.primary}>
              {isLast ? "Finish" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceGrid({
  choices,
  selected,
  answerIndex,
  graded,
  onSelect,
}: {
  choices: string[];
  selected: number | null;
  answerIndex: number;
  graded: boolean | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {choices.map((choice, i) => {
        const isSelected = selected === i;
        let tone = "border-ink-700 bg-ink-800/50 hover:border-ink-400";

        if (graded !== null) {
          if (i === answerIndex) tone = "border-grass-600 bg-grass-500/15 text-grass-300";
          else if (isSelected) tone = "border-fire-600 bg-fire-500/15 text-fire-500";
          else tone = "border-ink-700/50 bg-ink-800/30 text-ink-400";
        } else if (isSelected) {
          tone = "border-macaw-500 bg-macaw-500/15 text-ink-200";
        }

        return (
          <button
            key={`${i}-${choice}`}
            type="button"
            disabled={graded !== null}
            aria-pressed={isSelected}
            onClick={() => onSelect(i)}
            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-default ${tone}`}
          >
            {choice}
          </button>
        );
      })}
    </div>
  );
}
