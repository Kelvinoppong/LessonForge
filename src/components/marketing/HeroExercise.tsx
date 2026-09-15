"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { CoordinatePlane } from "@/components/CoordinatePlane";
import { AppFrame } from "@/components/marketing/AppFrame";
import { buttonStyles } from "@/components/ui";
import type { Point } from "@/lib/types";

const TARGET: Point = { x: 3, y: -2 };
const GRID_RANGE = 6;

/**
 * The hero visual is the actual exercise component learners get, wired up and
 * playable — same CoordinatePlane, same grading, same keyboard affordances as
 * /demo. Showing the real thing is more convincing than a rendering of it, and it
 * means the hero can't drift out of sync with the product.
 */
export function HeroExercise() {
  const [picked, setPicked] = useState<Point | null>(null);
  const [revealed, setRevealed] = useState(false);

  const correct = picked?.x === TARGET.x && picked?.y === TARGET.y;

  return (
    <AppFrame
      breadcrumb={["Courses", "Math · Coordinates", "Plot the point"]}
      status={
        <span className="inline-flex items-center gap-1.5 rounded border border-ink-700 bg-ink-900 px-2 py-0.5 font-mono text-[11px] text-ink-400">
          variant
          <span className="text-ink-200">candidate-b</span>
        </span>
      }
    >
      <div className="p-5">
        <p className="text-sm text-ink-400">Exercise 3 of 8</p>
        <h3 className="mt-1 text-base font-semibold text-ink-200">
          Plot the point{" "}
          <span className="font-mono text-macaw-500">
            ({TARGET.x}, {TARGET.y})
          </span>
        </h3>

        <div className="mt-4">
          <CoordinatePlane
            gridRange={GRID_RANGE}
            mode="plot"
            picked={picked}
            target={TARGET}
            revealed={revealed}
            disabled={revealed}
            onPick={setPicked}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          {revealed ? (
            <>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  correct ? "text-grass-300" : "text-fire-500"
                }`}
              >
                {correct ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <X className="h-4 w-4" aria-hidden />
                )}
                {correct ? "Correct" : `Not quite — that's (${picked?.x}, ${picked?.y})`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setRevealed(false);
                }}
                className={`${buttonStyles.secondary} ml-auto`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Again
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!picked}
              onClick={() => setRevealed(true)}
              className={buttonStyles.primary}
            >
              Check
            </button>
          )}
        </div>
      </div>
    </AppFrame>
  );
}
