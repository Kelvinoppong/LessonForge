"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExercisePreview } from "@/components/ExercisePreview";
import { Badge, buttonStyles, Card, inputStyles } from "@/components/ui";
import { apiFetch, apiSend } from "@/lib/api";
import type { Exercise } from "@/lib/types";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  course: string;
  skill: string;
  status: string;
};

type Variant = {
  id: string;
  label: string;
  isControl: boolean;
  status: string;
  authoredBy: string;
  haltReason: string | null;
  exercises: Exercise[];
};

type Message = {
  id: string;
  role: string;
  content: string;
  proposedExercises: Exercise[] | null;
  createdAt: string;
};

export default function AuthoringPage() {
  const { id } = useParams<{ id: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [canvas, setCanvas] = useState<Exercise[] | null>(null);

  const [instruction, setInstruction] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [variantLabel, setVariantLabel] = useState("");
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const load = useCallback(async () => {
    let body: { lesson: Lesson; variants: Variant[]; messages: Message[] };

    try {
      body = await apiFetch(`/api/lessons/${id}`);
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
      return;
    }

    setLesson(body.lesson);
    setVariants(body.variants);
    setMessages(body.messages);

    // Restore the canvas from the most recent draft so a reload doesn't lose work.
    const lastDraft = [...body.messages]
      .reverse()
      .find((m: Message) => m.proposedExercises?.length);
    setCanvas((current) => current ?? lastDraft?.proposedExercises ?? null);
    setVariantLabel(body.variants.length === 0 ? "control" : `variant-${body.variants.length}`);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const draft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!instruction.trim() || drafting) return;

    setDrafting(true);
    setNotice(null);

    try {
      const body = await apiSend<{ exercises: Exercise[] }>(
        `/api/lessons/${id}/draft`,
        "POST",
        { instruction, currentExercises: canvas ?? undefined },
      );
      setCanvas(body.exercises);
      setInstruction("");
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    } finally {
      setDrafting(false);
      await load();
    }
  };

  const acceptVariant = async () => {
    if (!canvas || accepting) return;
    setAccepting(true);
    setNotice(null);

    try {
      const body = await apiSend<{
        variant: { label: string };
        audioGenerated: number;
        warnings?: string[];
      }>(`/api/lessons/${id}/variants`, "POST", {
        label: variantLabel,
        exercises: canvas,
        authoredBy: "gpt-4o",
      });

      const audioNote =
        body.audioGenerated > 0 ? ` Generated ${body.audioGenerated} audio clip(s).` : "";
      const warnings = body.warnings?.length ? ` ${body.warnings.join(" ")}` : "";
      setNotice({
        tone: "good",
        text: `Accepted as "${body.variant.label}".${audioNote}${warnings}`,
      });
      setCanvas(null);
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    } finally {
      setAccepting(false);
      await load();
    }
  };

  const publish = async () => {
    try {
      await apiSend(`/api/lessons/${id}`, "PATCH", { status: "published" });
      setNotice({ tone: "good", text: "Lesson published." });
    } catch (err) {
      setNotice({ tone: "bad", text: (err as Error).message });
    }
    await load();
  };

  if (!lesson) {
    return <div className="h-64 animate-pulse rounded-lg bg-ink-900/70" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/studio" className={buttonStyles.ghost}>
            ← Studio
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-400">
            <Badge tone={lesson.course === "math" ? "info" : "good"}>
              {lesson.course === "math" ? "Math" : "Spanish"}
            </Badge>
            <span>{lesson.skill}</span>
            <Badge tone={lesson.status === "published" ? "good" : "neutral"}>
              {lesson.status}
            </Badge>
          </p>
        </div>

        <div className="flex gap-2">
          {variants.length > 0 ? (
            <Link href={`/learn/${lesson.id}`} className={buttonStyles.secondary}>
              Preview as learner
            </Link>
          ) : null}
          {lesson.status !== "published" && variants.length > 0 ? (
            <button type="button" onClick={publish} className={buttonStyles.primary}>
              Publish
            </button>
          ) : null}
        </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- authoring conversation ---- */}
        <Card className="flex max-h-[36rem] flex-col p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
            Draft with AI
          </h2>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-ink-400">
                Describe the lesson you want. For example:{" "}
                <em className="text-ink-200">
                  {lesson.course === "math"
                    ? "Six exercises introducing plotting points in all four quadrants, starting easy."
                    : "Five listening exercises about ordering food in a café, short clips."}
                </em>
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md px-3.5 py-2.5 text-sm ${
                    message.role === "user"
                      ? "ml-6 bg-macaw-500/10 text-ink-200"
                      : message.role === "system"
                        ? "border border-fire-600/40 bg-fire-500/10 text-fire-500"
                        : "mr-6 bg-ink-800/60 text-ink-200"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    {message.role === "user" ? "You" : message.role === "system" ? "Error" : "AI"}
                  </div>
                  {message.content}
                  {message.proposedExercises?.length ? (
                    <button
                      type="button"
                      onClick={() => setCanvas(message.proposedExercises)}
                      className="mt-2 block text-xs font-semibold text-macaw-500 hover:underline"
                    >
                      Load these {message.proposedExercises.length} exercises onto the canvas
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <form onSubmit={draft} className="mt-4 space-y-2">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder={
                canvas
                  ? "Refine the current draft — e.g. 'make the last two harder'"
                  : "Describe the exercises you want…"
              }
              className={`${inputStyles} resize-none`}
            />
            <button
              type="submit"
              disabled={drafting || !instruction.trim()}
              className={`${buttonStyles.primary} w-full`}
            >
              {drafting ? "Drafting…" : canvas ? "Revise draft" : "Draft exercises"}
            </button>
          </form>
        </Card>

        {/* ---- review canvas ---- */}
        <Card className="flex max-h-[36rem] flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
              Review canvas
            </h2>
            {canvas ? <Badge tone="warn">{canvas.length} drafted</Badge> : null}
          </div>

          {canvas ? (
            <>
              <ul className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
                {canvas.map((exercise, i) => (
                  <ExercisePreview key={i} exercise={exercise} index={i} />
                ))}
              </ul>

              <div className="mt-4 flex gap-2 border-t border-ink-700/60 pt-4">
                <input
                  value={variantLabel}
                  onChange={(e) => setVariantLabel(e.target.value)}
                  aria-label="Variant label"
                  placeholder="variant label"
                  className={inputStyles}
                />
                <button
                  type="button"
                  onClick={acceptVariant}
                  disabled={accepting || !variantLabel.trim()}
                  className={buttonStyles.primary}
                >
                  {accepting ? "Accepting…" : "Accept"}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-400">
                Accepting validates the exercises, generates any missing Spanish audio, and
                makes this variant assignable to learners.
              </p>
            </>
          ) : (
            <p className="mt-4 flex-1 text-sm text-ink-400">
              Nothing drafted yet. Once the AI proposes exercises they appear here for review
              before anything reaches a learner.
            </p>
          )}
        </Card>
      </div>

      {/* ---- variants ---- */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
          Variants ({variants.length})
        </h2>

        {variants.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">
            No accepted variants yet. The first one you accept becomes the control.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((variant) => (
              <li
                key={variant.id}
                className="rounded-md border border-ink-700/60 bg-ink-800/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{variant.label}</span>
                  {variant.isControl ? <Badge tone="info">control</Badge> : null}
                  <Badge tone={variant.status === "halted" ? "bad" : "good"}>
                    {variant.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-400">
                  {variant.exercises.length} exercises · authored by {variant.authoredBy}
                </p>
                {variant.haltReason ? (
                  <p className="mt-2 text-xs text-fire-500">{variant.haltReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {variants.length >= 2 ? (
          <p className="mt-4 text-xs text-ink-400">
            This lesson has a control and at least one candidate, so it&apos;s ready to run an
            experiment from the{" "}
            <Link href="/ops" className="font-semibold text-macaw-500 hover:underline">
              reliability dashboard
            </Link>
            .
          </p>
        ) : null}
      </Card>
    </div>
  );
}
