"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, buttonStyles, Card, EmptyState, inputStyles, Stat } from "@/components/ui";
import { apiFetch, apiSend } from "@/lib/api";

type VariantStats = {
  sessions: number;
  answers: number;
  answerErrorRate: number;
  clientErrors: number;
  clientErrorRate: number;
  completionRate: number;
  p95LatencyMs: number;
};

type Overview = {
  window: number;
  experiments: {
    id: string;
    key: string;
    name: string;
    status: string;
    trafficSplit: number;
    maxErrorRateDelta: number;
    maxClientErrorRate: number;
    minSessions: number;
    haltedAt: string | null;
    haltReason: string | null;
    lessonId: string;
    lessonTitle: string;
    course: string;
    variants: {
      id: string;
      label: string;
      isControl: boolean;
      status: string;
      stats: VariantStats | null;
    }[];
  }[];
  series: {
    bucket: string;
    variantLabel: string;
    errorRate: number;
    clientErrors: number;
  }[];
  recentChecks: {
    id: string;
    experimentKey: string;
    evaluatedAt: string;
    action: string;
    detail: string | null;
    candidateSessions: number;
  }[];
};

type LessonOption = { id: string; title: string; variantCount: number };

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function OpsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [overview, lessonList] = await Promise.all([
        apiFetch<Overview>("/api/ops/overview"),
        apiFetch<{ lessons: LessonOption[] }>("/api/lessons"),
      ]);

      setData(overview);
      setLessons(lessonList.lessons.filter((l) => l.variantCount >= 2));
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
      setData((current) => current ?? { window: 24, experiments: [], series: [], recentChecks: [] });
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 20_000);
    return () => clearInterval(interval);
  }, [load]);

  const setStatus = async (id: string, status: "running" | "halted") => {
    try {
      await apiSend("/api/experiments", "PATCH", { id, status });
      setNotice({
        tone: "good",
        text: status === "halted" ? "Experiment halted." : "Experiment resumed.",
      });
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    }
    await load();
  };

  /** Trigger the guardrail sweep on demand instead of waiting for the cron. */
  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const body = await apiFetch<{ evaluated: number; halted: number }>(
        "/api/cron/experiment-health",
      );
      setNotice({
        tone: "good",
        text: `Evaluated ${body.evaluated} experiment(s); halted ${body.halted}.`,
      });
      await load();
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const chartData = buildChartData(data?.series ?? []);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Reliability & experiments
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Guardrails are evaluated on a schedule every five minutes. Any candidate variant
            that breaches its error-rate or client-error ceiling is halted automatically, and
            learners fall back to the control on their next request.
          </p>
        </div>
        <button
          type="button"
          onClick={runHealthCheck}
          disabled={running}
          className={buttonStyles.secondary}
        >
          {running ? "Evaluating…" : "Run health check now"}
        </button>
      </header>

      {notice ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            notice.tone === "good"
              ? "border-grass-600/40 bg-grass-500/10 text-grass-300"
              : "border-fire-600/40 bg-fire-500/10 text-fire-500"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <NewExperiment lessons={lessons} onCreated={load} onError={setNotice} />

      {data === null ? (
        <div className="h-48 animate-pulse rounded-lg bg-ink-900/70" />
      ) : data.experiments.length === 0 ? (
        <EmptyState
          title="No experiments yet"
          body="Accept at least two variants on a lesson in the Studio, then start an experiment above to begin routing traffic."
          action={
            <Link href="/studio" className={buttonStyles.secondary}>
              Go to Studio
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {data.experiments.map((experiment) => {
            const control = experiment.variants.find((v) => v.isControl);
            const candidate = experiment.variants.find((v) => !v.isControl);
            const controlRate = control?.stats?.answerErrorRate ?? 0;
            const candidateRate = candidate?.stats?.answerErrorRate ?? 0;
            const delta = candidateRate - controlRate;
            const breaching = delta > experiment.maxErrorRateDelta;

            return (
              <Card key={experiment.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{experiment.name}</h2>
                      <Badge
                        tone={
                          experiment.status === "running"
                            ? "good"
                            : experiment.status === "halted"
                              ? "bad"
                              : "neutral"
                        }
                      >
                        {experiment.status}
                      </Badge>
                      <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-400">
                        {experiment.key}
                      </code>
                    </div>
                    <p className="mt-1 text-sm text-ink-400">
                      {experiment.lessonTitle} · {experiment.trafficSplit}% to candidate
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/learn/${experiment.lessonId}`} className={buttonStyles.ghost}>
                      Open lesson
                    </Link>
                    {experiment.status === "running" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(experiment.id, "halted")}
                        className={buttonStyles.danger}
                      >
                        Halt
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStatus(experiment.id, "running")}
                        className={buttonStyles.secondary}
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>

                {experiment.haltReason ? (
                  <p className="mt-4 rounded-md border border-fire-600/40 bg-fire-500/10 px-4 py-3 text-sm text-fire-500">
                    {experiment.haltReason}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {[control, candidate].map((variant, i) =>
                    variant ? (
                      <div key={variant.id}>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          {i === 0 ? "Control" : "Candidate"}
                          <code className="text-xs text-ink-400">{variant.label}</code>
                          {variant.status === "halted" ? <Badge tone="bad">halted</Badge> : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Stat
                            label="Sessions"
                            value={String(variant.stats?.sessions ?? 0)}
                            hint={
                              i === 1 && (variant.stats?.sessions ?? 0) < experiment.minSessions
                                ? `min ${experiment.minSessions}`
                                : undefined
                            }
                          />
                          <Stat
                            label="Error rate"
                            value={pct(variant.stats?.answerErrorRate ?? 0)}
                            tone={i === 1 && breaching ? "bad" : "neutral"}
                          />
                          <Stat
                            label="Client errors"
                            value={pct(variant.stats?.clientErrorRate ?? 0)}
                            tone={
                              (variant.stats?.clientErrorRate ?? 0) > experiment.maxClientErrorRate
                                ? "bad"
                                : "neutral"
                            }
                            hint="per session"
                          />
                          <Stat
                            label="p95 latency"
                            value={`${variant.stats?.p95LatencyMs ?? 0}ms`}
                            hint="answer time"
                          />
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>

                <p className="mt-4 text-xs text-ink-400">
                  Guardrails: halt if candidate error rate exceeds control by{" "}
                  <span className="font-semibold text-ink-200">
                    +{pct(experiment.maxErrorRateDelta)}
                  </span>{" "}
                  (currently{" "}
                  <span
                    className={`font-semibold ${breaching ? "text-fire-500" : "text-grass-300"}`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {pct(delta)}
                  </span>
                  ), or if client errors exceed{" "}
                  <span className="font-semibold text-ink-200">
                    {pct(experiment.maxClientErrorRate)}
                  </span>{" "}
                  per session.
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {chartData.length > 0 ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
            Answer error rate by variant
          </h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#2a3550" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" stroke="#8a97b1" fontSize={11} tickMargin={8} />
                <YAxis
                  stroke="#8a97b1"
                  fontSize={11}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                  domain={[0, 1]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #2a3550",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => pct(value)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {chartData.length > 0
                  ? Object.keys(chartData[0])
                      .filter((k) => k !== "bucket")
                      .map((key, i) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={["#1cb0f6", "#ff4b4b", "#58cc02", "#ffc800"][i % 4]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      ))
                  : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {data?.recentChecks.length ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
            Guardrail evaluation log
          </h2>
          <ul className="mt-4 divide-y divide-ink-700/50">
            {data.recentChecks.map((check) => (
              <li key={check.id} className="flex flex-wrap gap-x-3 gap-y-1 py-2.5 text-sm">
                <Badge
                  tone={
                    check.action === "halted"
                      ? "bad"
                      : check.action === "none"
                        ? "good"
                        : "neutral"
                  }
                >
                  {check.action}
                </Badge>
                <code className="text-xs text-ink-400">{check.experimentKey}</code>
                <span className="text-ink-400">
                  {new Date(check.evaluatedAt).toLocaleTimeString()}
                </span>
                <span className="w-full text-ink-200 sm:w-auto sm:flex-1">{check.detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

/** Pivot the flat hourly series into one row per bucket, one column per variant. */
function buildChartData(series: Overview["series"]) {
  const byBucket = new Map<string, Record<string, string | number>>();

  for (const row of series) {
    const label = row.bucket.slice(11);
    const existing = byBucket.get(row.bucket) ?? { bucket: label };
    existing[row.variantLabel] = row.errorRate;
    byBucket.set(row.bucket, existing);
  }

  return [...byBucket.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

function NewExperiment({
  lessons,
  onCreated,
  onError,
}: {
  lessons: LessonOption[];
  onCreated: () => Promise<void>;
  onError: (notice: { tone: "good" | "bad"; text: string }) => void;
}) {
  const [lessonId, setLessonId] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [minSessions, setMinSessions] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  if (lessons.length === 0) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const body = await apiSend<{ experiment: { key: string } }>("/api/experiments", "POST", {
        lessonId,
        name,
        key,
        trafficSplit,
        minSessions,
      });

      onError({ tone: "good", text: `Experiment "${body.experiment.key}" is running.` });
      setName("");
      setKey("");
      await onCreated();
    } catch (err) {
      onError({ tone: "bad", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">New experiment</h2>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          required
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          aria-label="Lesson"
          className={inputStyles}
        >
          <option value="">Choose a lesson…</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Experiment name"
          aria-label="Experiment name"
          className={inputStyles}
        />
        <input
          required
          value={key}
          onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          placeholder="experiment-key"
          aria-label="Experiment key"
          className={inputStyles}
        />
        <label className="flex items-center gap-2 text-xs text-ink-400">
          Split %
          <input
            type="number"
            min={1}
            max={99}
            value={trafficSplit}
            onChange={(e) => setTrafficSplit(Number(e.target.value))}
            className={inputStyles}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-400">
          Min sessions
          <input
            type="number"
            min={1}
            value={minSessions}
            onChange={(e) => setMinSessions(Number(e.target.value))}
            className={inputStyles}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className={`${buttonStyles.primary} lg:col-span-5`}
        >
          {submitting ? "Starting…" : "Start experiment"}
        </button>
      </form>
    </Card>
  );
}
