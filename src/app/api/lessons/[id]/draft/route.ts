import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { draftMessages, lessons } from "@/db/schema";
import { ContentAiError, draftLesson } from "@/lib/contentAi";
import { exerciseList, type Course } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const draftTurn = z.object({
  instruction: z.string().min(3).max(2000),
  /** Exercises already on the canvas, so "make these harder" has something to act on. */
  currentExercises: exerciseList.optional(),
});

/**
 * One turn of the authoring conversation: the author describes what they want,
 * the AI service drafts exercises, and both sides of the exchange are persisted
 * so the studio can be reloaded and the provenance of a lesson inspected later.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = draftTurn.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid draft request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const priorTurns = await db
    .select({ role: draftMessages.role, content: draftMessages.content })
    .from(draftMessages)
    .where(eq(draftMessages.lessonId, id))
    .orderBy(asc(draftMessages.createdAt));

  await db.insert(draftMessages).values({
    lessonId: id,
    role: "user",
    content: parsed.data.instruction,
  });

  try {
    const draft = await draftLesson({
      course: lesson.course as Course,
      skill: lesson.skill,
      instruction: parsed.data.instruction,
      history: priorTurns
        .filter((t): t is { role: "user" | "assistant"; content: string } =>
          t.role === "user" || t.role === "assistant",
        )
        .slice(-8),
      currentExercises: parsed.data.currentExercises,
    });

    const [assistantMessage] = await db
      .insert(draftMessages)
      .values({
        lessonId: id,
        role: "assistant",
        content: draft.message,
        proposedExercises: draft.exercises,
      })
      .returning();

    await db.update(lessons).set({ updatedAt: new Date() }).where(eq(lessons.id, id));

    return NextResponse.json({
      message: assistantMessage,
      exercises: draft.exercises,
      model: draft.model,
    });
  } catch (err) {
    const status = err instanceof ContentAiError ? err.status : 500;
    const detail = (err as Error).message;

    // Record the failure in the transcript so the author sees what happened
    // instead of a turn that silently vanished.
    await db.insert(draftMessages).values({
      lessonId: id,
      role: "system",
      content: `Draft failed: ${detail}`,
    });

    return NextResponse.json({ error: "Draft failed", detail }, { status });
  }
}
