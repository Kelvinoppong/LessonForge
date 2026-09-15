import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lessonVariants, lessons } from "@/db/schema";
import { COURSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const createLesson = z.object({
  title: z.string().min(3).max(120),
  course: z.enum(COURSES),
  skill: z.string().min(2).max(80),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET() {
  const rows = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      title: lessons.title,
      course: lessons.course,
      skill: lessons.skill,
      status: lessons.status,
      updatedAt: lessons.updatedAt,
      variantCount: sql<number>`count(${lessonVariants.id})`.mapWith(Number),
    })
    .from(lessons)
    .leftJoin(lessonVariants, eq(lessonVariants.lessonId, lessons.id))
    .groupBy(lessons.id)
    .orderBy(desc(lessons.updatedAt));

  return NextResponse.json({ lessons: rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createLesson.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lesson", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, course, skill } = parsed.data;
  // Slugs are unique; suffix with a short random tail rather than failing the
  // author's request over a name collision.
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;

  const [lesson] = await db
    .insert(lessons)
    .values({ title, course, skill, slug })
    .returning();

  return NextResponse.json({ lesson }, { status: 201 });
}
