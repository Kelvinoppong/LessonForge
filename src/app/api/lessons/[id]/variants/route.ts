import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lessonVariants, lessons } from "@/db/schema";
import { attachAudio } from "@/lib/audio";
import { exerciseList } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

const acceptVariant = z.object({
  label: z.string().min(1).max(40),
  exercises: exerciseList,
  isControl: z.boolean().default(false),
  authoredBy: z.string().min(1).max(60).default("human"),
});

/**
 * Accept drafted exercises as a real variant. This is the gate between "the model
 * suggested something" and "a learner can see it": validation, audio generation,
 * and control-flag bookkeeping all happen here.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = acceptVariant.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid variant", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const existing = await db
    .select({ id: lessonVariants.id, isControl: lessonVariants.isControl })
    .from(lessonVariants)
    .where(eq(lessonVariants.lessonId, id));

  // The first variant is the control whether or not the caller said so —
  // a lesson with variants but no control has no baseline to compare against.
  const hasControl = existing.some((v) => v.isControl);
  const isControl = parsed.data.isControl || !hasControl;

  if (isControl && hasControl) {
    await db
      .update(lessonVariants)
      .set({ isControl: false })
      .where(eq(lessonVariants.lessonId, id));
  }

  const { exercises, generated, warnings } = await attachAudio(
    parsed.data.exercises,
    lesson.slug,
  );

  try {
    const [variant] = await db
      .insert(lessonVariants)
      .values({
        lessonId: id,
        label: parsed.data.label,
        isControl,
        exercises,
        authoredBy: parsed.data.authoredBy,
      })
      .returning();

    await db.update(lessons).set({ updatedAt: new Date() }).where(eq(lessons.id, id));

    return NextResponse.json({ variant, audioGenerated: generated, warnings }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("lesson_variants_label_key")) {
      return NextResponse.json(
        { error: `A variant labelled "${parsed.data.label}" already exists on this lesson.` },
        { status: 409 },
      );
    }
    throw err;
  }
}
