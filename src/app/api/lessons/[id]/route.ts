import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { draftMessages, lessonVariants, lessons } from "@/db/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const [variants, messages] = await Promise.all([
    db
      .select()
      .from(lessonVariants)
      .where(eq(lessonVariants.lessonId, id))
      .orderBy(asc(lessonVariants.createdAt)),
    db
      .select()
      .from(draftMessages)
      .where(eq(draftMessages.lessonId, id))
      .orderBy(asc(draftMessages.createdAt)),
  ]);

  return NextResponse.json({ lesson, variants, messages });
}

const patchLesson = z.object({
  title: z.string().min(3).max(120).optional(),
  skill: z.string().min(2).max(80).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchLesson.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.status === "published") {
    const variants = await db
      .select({ id: lessonVariants.id })
      .from(lessonVariants)
      .where(eq(lessonVariants.lessonId, id));

    if (variants.length === 0) {
      return NextResponse.json(
        { error: "Cannot publish a lesson with no accepted variants." },
        { status: 409 },
      );
    }
  }

  const [updated] = await db
    .update(lessons)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(lessons.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json({ lesson: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const [deleted] = await db.delete(lessons).where(eq(lessons.id, id)).returning();

  if (!deleted) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
