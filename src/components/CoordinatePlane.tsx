"use client";

import { useCallback, useRef, useState } from "react";
import type { Point } from "@/lib/types";

const SIZE = 440;
const PAD = 22;
const PLOT = SIZE - PAD * 2;

type Props = {
  gridRange: number;
  /** "plot" lets the learner pick a point; "show" is read-only. */
  mode: "plot" | "show";
  /** Point rendered for the learner to read off (mode="show"). */
  shown?: Point;
  /** The learner's current selection (mode="plot"). */
  picked?: Point | null;
  onPick?: (point: Point) => void;
  /** Correct answer, revealed after grading. */
  target?: Point | null;
  revealed?: boolean;
  disabled?: boolean;
};

export function CoordinatePlane({
  gridRange,
  mode,
  shown,
  picked,
  onPick,
  target,
  revealed = false,
  disabled = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });

  const toSvgX = (x: number) => PAD + ((x + gridRange) / (gridRange * 2)) * PLOT;
  const toSvgY = (y: number) => PAD + ((gridRange - y) / (gridRange * 2)) * PLOT;

  const commit = useCallback(
    (point: Point) => {
      if (disabled || mode !== "plot") return;
      setCursor(point);
      onPick?.(point);
    },
    [disabled, mode, onPick],
  );

  /** Map a pointer position to the nearest integer lattice point. */
  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || disabled || mode !== "plot") return;

    const rect = svg.getBoundingClientRect();
    // The SVG scales responsively, so convert through the rendered size.
    const svgX = ((event.clientX - rect.left) / rect.width) * SIZE;
    const svgY = ((event.clientY - rect.top) / rect.height) * SIZE;

    const gridX = ((svgX - PAD) / PLOT) * (gridRange * 2) - gridRange;
    const gridY = gridRange - ((svgY - PAD) / PLOT) * (gridRange * 2);

    const clamp = (v: number) => Math.max(-gridRange, Math.min(gridRange, Math.round(v)));
    commit({ x: clamp(gridX), y: clamp(gridY) });
  };

  /**
   * Arrow keys walk a cursor around the lattice and Enter selects it. Clicking a
   * precise pixel is not a reasonable requirement for a math exercise.
   */
  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (disabled || mode !== "plot") return;
    const step = event.shiftKey ? 5 : 1;
    const moves: Record<string, Point> = {
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    };

    if (event.key in moves) {
      event.preventDefault();
      const move = moves[event.key];
      const clamp = (v: number) => Math.max(-gridRange, Math.min(gridRange, v));
      setCursor((c) => ({ x: clamp(c.x + move.x), y: clamp(c.y + move.y) }));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit(cursor);
    }
  };

  const ticks = Array.from({ length: gridRange * 2 + 1 }, (_, i) => i - gridRange);
  const labelEvery = gridRange > 10 ? 2 : 1;
  const isCorrect =
    revealed && target && picked && picked.x === target.x && picked.y === target.y;

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role={mode === "plot" ? "application" : "img"}
        aria-label={
          mode === "plot"
            ? `Coordinate plane from negative ${gridRange} to ${gridRange}. Use arrow keys to move the cursor, Enter to plot. Cursor at ${cursor.x}, ${cursor.y}.`
            : `Coordinate plane showing a point at ${shown?.x}, ${shown?.y}`
        }
        tabIndex={mode === "plot" && !disabled ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`mx-auto block h-auto w-full max-w-lg touch-manipulation rounded-2xl border border-ink-700/60 bg-ink-950/60 ${
          mode === "plot" && !disabled ? "cursor-crosshair" : ""
        }`}
      >
        {/* grid */}
        {ticks.map((t) => (
          <g key={`grid-${t}`}>
            <line
              x1={toSvgX(t)}
              y1={PAD}
              x2={toSvgX(t)}
              y2={SIZE - PAD}
              stroke="currentColor"
              className={t === 0 ? "text-ink-400" : "text-ink-700/50"}
              strokeWidth={t === 0 ? 1.6 : 0.7}
            />
            <line
              x1={PAD}
              y1={toSvgY(t)}
              x2={SIZE - PAD}
              y2={toSvgY(t)}
              stroke="currentColor"
              className={t === 0 ? "text-ink-400" : "text-ink-700/50"}
              strokeWidth={t === 0 ? 1.6 : 0.7}
            />
          </g>
        ))}

        {/* axis numbers */}
        {ticks
          .filter((t) => t !== 0 && Math.abs(t) % labelEvery === 0)
          .map((t) => (
            <g key={`label-${t}`} className="text-ink-400" fill="currentColor" fontSize="10">
              <text x={toSvgX(t)} y={toSvgY(0) + 13} textAnchor="middle">
                {t}
              </text>
              <text x={toSvgX(0) - 7} y={toSvgY(t) + 3.5} textAnchor="end">
                {t}
              </text>
            </g>
          ))}

        <g className="text-ink-400" fill="currentColor" fontSize="12" fontWeight="700">
          <text x={SIZE - PAD + 2} y={toSvgY(0) - 6} textAnchor="end">
            x
          </text>
          <text x={toSvgX(0) + 8} y={PAD + 10}>
            y
          </text>
        </g>

        {/* keyboard cursor */}
        {mode === "plot" && !disabled ? (
          <g>
            <circle
              cx={toSvgX(cursor.x)}
              cy={toSvgY(cursor.y)}
              r={9}
              className="text-macaw-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          </g>
        ) : null}

        {/* the point to read off */}
        {mode === "show" && shown ? (
          <g>
            <circle
              cx={toSvgX(shown.x)}
              cy={toSvgY(shown.y)}
              r={7}
              className="text-macaw-500"
              fill="currentColor"
            />
            <circle
              cx={toSvgX(shown.x)}
              cy={toSvgY(shown.y)}
              r={13}
              className="text-macaw-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              opacity={0.5}
            />
          </g>
        ) : null}

        {/* learner's answer */}
        {picked ? (
          <circle
            cx={toSvgX(picked.x)}
            cy={toSvgY(picked.y)}
            r={8}
            className={
              revealed ? (isCorrect ? "text-grass-500" : "text-fire-500") : "text-bee-500"
            }
            fill="currentColor"
          />
        ) : null}

        {/* correct answer, once revealed and only if they missed it */}
        {revealed && target && !isCorrect ? (
          <g>
            <circle
              cx={toSvgX(target.x)}
              cy={toSvgY(target.y)}
              r={8}
              className="text-grass-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            />
            <text
              x={toSvgX(target.x)}
              y={toSvgY(target.y) - 14}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              className="text-grass-300"
              fill="currentColor"
            >
              ({target.x}, {target.y})
            </text>
          </g>
        ) : null}
      </svg>

      {mode === "plot" && !disabled ? (
        <p className="mt-2 text-center text-xs text-ink-400">
          Tap the grid, or use arrow keys and press Enter. Cursor:{" "}
          <span className="font-semibold tabular-nums text-ink-200">
            ({cursor.x}, {cursor.y})
          </span>
        </p>
      ) : null}
    </div>
  );
}
