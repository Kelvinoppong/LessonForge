import { Badge } from "@/components/ui";
import type { Exercise } from "@/lib/types";

const KIND_LABELS: Record<Exercise["kind"], string> = {
  coordinate_plot: "Plot a point",
  coordinate_read: "Read coordinates",
  listening_choice: "Listen & choose",
  listening_type: "Listen & type",
};

/** Compact, reviewable rendering of a drafted exercise for the author. */
export function ExercisePreview({ exercise, index }: { exercise: Exercise; index: number }) {
  return (
    <li className="rounded-md border border-ink-700/60 bg-ink-800/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-ink-400">#{index + 1}</span>
        <Badge tone="neutral">{KIND_LABELS[exercise.kind]}</Badge>
      </div>

      <p className="mt-2 text-sm font-semibold text-ink-200">{exercise.prompt}</p>

      {exercise.kind === "coordinate_plot" ? (
        <p className="mt-2 text-xs text-ink-400">
          Target{" "}
          <span className="font-semibold nums text-grass-300">
            ({exercise.target.x}, {exercise.target.y})
          </span>{" "}
          on a ±{exercise.gridRange} grid, tolerance {exercise.tolerance}
        </p>
      ) : null}

      {exercise.kind === "coordinate_read" ? (
        <>
          <p className="mt-2 text-xs text-ink-400">
            Shows{" "}
            <span className="font-semibold nums text-ink-200">
              ({exercise.shown.x}, {exercise.shown.y})
            </span>{" "}
            on a ±{exercise.gridRange} grid
          </p>
          <ChoiceList choices={exercise.choices} answerIndex={exercise.answerIndex} />
        </>
      ) : null}

      {exercise.kind === "listening_choice" ? (
        <>
          <AudioLine text={exercise.audioText} hasAudio={Boolean(exercise.audioUrl)} />
          <ChoiceList choices={exercise.choices} answerIndex={exercise.answerIndex} />
        </>
      ) : null}

      {exercise.kind === "listening_type" ? (
        <>
          <AudioLine text={exercise.audioText} hasAudio={Boolean(exercise.audioUrl)} />
          <p className="mt-2 text-xs text-ink-400">
            Accepts:{" "}
            <span className="font-semibold text-grass-300">{exercise.accepted.join(" · ")}</span>
          </p>
        </>
      ) : null}
    </li>
  );
}

function AudioLine({ text, hasAudio }: { text: string; hasAudio: boolean }) {
  return (
    <p className="mt-2 text-xs text-ink-400">
      <span aria-hidden>🔊</span> <span lang="es" className="text-ink-200">{text}</span>
      {hasAudio ? null : (
        <span className="ml-1 text-bee-500">(audio generated on accept)</span>
      )}
    </p>
  );
}

function ChoiceList({ choices, answerIndex }: { choices: string[]; answerIndex: number }) {
  return (
    <ul className="mt-2 space-y-1">
      {choices.map((choice, i) => (
        <li
          key={`${i}-${choice}`}
          className={`text-xs ${i === answerIndex ? "font-semibold text-grass-300" : "text-ink-400"}`}
        >
          {i === answerIndex ? "✓" : "·"} {choice}
        </li>
      ))}
    </ul>
  );
}
