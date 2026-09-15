import { OctagonMinus } from "lucide-react";

type Row = {
  variant: string;
  sessions: number;
  errorRate: number;
  clientErrors: number;
  state: "control" | "running" | "halted";
};

// Illustrative figures, but the same shape the /ops dashboard renders from real
// telemetry — and the halted row is the case the guardrail actually produces.
const ROWS: Row[] = [
  { variant: "control", sessions: 1284, errorRate: 0.281, clientErrors: 0.004, state: "control" },
  { variant: "candidate-a", sessions: 1301, errorRate: 0.264, clientErrors: 0.006, state: "running" },
  { variant: "candidate-b", sessions: 618, errorRate: 0.512, clientErrors: 0.071, state: "halted" },
];

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export function MiniOpsTable() {
  return (
    <div className="overflow-hidden rounded-md border border-ink-700">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink-700 bg-ink-800/50">
            {["Variant", "Sessions", "Err", "Client"].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const halted = row.state === "halted";
            return (
              <tr
                key={row.variant}
                className={`border-b border-ink-700/60 last:border-0 ${
                  halted ? "bg-fire-500/[0.07]" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5 font-mono text-xs text-ink-200">
                    {halted ? (
                      <OctagonMinus className="h-3 w-3 shrink-0 text-fire-500" aria-hidden />
                    ) : null}
                    {row.variant}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-ink-300 nums">{row.sessions}</td>
                <td
                  className={`px-3 py-2 font-mono text-xs nums ${
                    halted ? "font-semibold text-fire-500" : "text-ink-300"
                  }`}
                >
                  {pct(row.errorRate)}
                </td>
                <td
                  className={`px-3 py-2 font-mono text-xs nums ${
                    halted ? "font-semibold text-fire-500" : "text-ink-300"
                  }`}
                >
                  {pct(row.clientErrors)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-ink-700 bg-ink-800/40 px-3 py-2 font-mono text-[11px] text-fire-500">
        halted candidate-b · client error rate 7.1% exceeds 5.0% ceiling
      </p>
    </div>
  );
}
