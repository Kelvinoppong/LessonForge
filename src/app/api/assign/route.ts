import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { resolveVariant } from "@/lib/assignment";

export const dynamic = "force-dynamic";

/**
 * The learner-facing entry point: given a lesson and a learner, hand back the
 * exercises that learner should see plus the ids they must echo back on telemetry.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lessonId = url.searchParams.get("lessonId");
  const learnerId = url.searchParams.get("learnerId");

  if (!lessonId || !learnerId) {
    return NextResponse.json(
      { error: "lessonId and learnerId are both required" },
      { status: 400 },
    );
  }

  const [lesson] = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      course: lessons.course,
      skill: lessons.skill,
      status: lessons.status,
    })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const assignment = await resolveVariant(lessonId, learnerId);
  if (!assignment) {
    return NextResponse.json(
      { error: "This lesson has no variants yet." },
      { status: 409 },
    );
  }

  return NextResponse.json({ lesson, assignment });
}
