import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-ink-700/60 bg-ink-900/70 backdrop-blur-sm shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-800 text-ink-400 border-ink-700",
    good: "bg-grass-500/15 text-grass-300 border-grass-600/40",
    warn: "bg-bee-500/15 text-bee-500 border-bee-500/40",
    bad: "bg-fire-500/15 text-fire-500 border-fire-600/40",
    info: "bg-macaw-500/15 text-macaw-500 border-macaw-600/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const valueTone: Record<string, string> = {
    neutral: "text-ink-200",
    good: "text-grass-300",
    bad: "text-fire-500",
    warn: "text-bee-500",
  };
  return (
    <div className="rounded-xl border border-ink-700/50 bg-ink-800/40 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueTone[tone]}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-ink-400">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink-200">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-grass-500 px-4 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-grass-600 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-ink-700 bg-ink-800/60 px-4 py-2.5 text-sm font-semibold text-ink-200 transition hover:border-ink-400 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-fire-600/50 bg-fire-500/10 px-4 py-2.5 text-sm font-semibold text-fire-500 transition hover:bg-fire-500/20 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-400 transition hover:text-ink-200",
};

export const inputStyles =
  "w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3.5 py-2.5 text-sm text-ink-200 placeholder:text-ink-400/70 transition focus:border-macaw-500 focus:outline-none";
