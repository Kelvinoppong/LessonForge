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
      className={`rounded-lg border border-ink-700 bg-ink-900/40 ${className}`}
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
    good: "bg-grass-500/[0.12] text-grass-300 border-grass-600/40",
    warn: "bg-bee-500/[0.12] text-bee-500 border-bee-500/40",
    bad: "bg-fire-500/[0.12] text-fire-500 border-fire-600/40",
    info: "bg-macaw-500/[0.12] text-macaw-500 border-macaw-600/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] ${tones[tone]}`}
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
    <div className="rounded-md border border-ink-700 bg-ink-800/40 px-4 py-3">
      <div className="text-[11px] text-ink-400">{label}</div>
      <div className={`mt-1 font-mono text-2xl nums ${valueTone[tone]}`}>{value}</div>
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
    <div className="rounded-lg border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink-200">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-md bg-grass-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-grass-600 disabled:cursor-not-allowed disabled:opacity-40",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-md border border-ink-700 bg-ink-800/60 px-4 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-ink-600 hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-md border border-fire-600/50 bg-fire-500/[0.08] px-4 py-2 text-sm font-medium text-fire-500 transition-colors hover:bg-fire-500/[0.16] disabled:cursor-not-allowed disabled:opacity-40",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink-200",
};

export const inputStyles =
  "w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 placeholder:text-ink-400/70 transition-colors focus:border-macaw-500 focus:outline-none";
