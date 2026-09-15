import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { telemetryEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Accept a single event or a batch, since the client flushes in batches. */
const payload = z.union([telemetryEvent, z.object({ events: z.array(telemetryEvent).min(1).max(50) })]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payload.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid telemetry", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const batch = "events" in parsed.data ? parsed.data.events : [parsed.data];

  try {
    await db.insert(events).values(
      batch.map((e) => ({
        learnerId: e.learnerId,
        lessonId: e.lessonId,
        variantId: e.variantId,
        experimentId: e.experimentId ?? null,
        type: e.type,
        exerciseIndex: e.exerciseIndex ?? null,
        correct: e.correct ?? null,
        latencyMs: e.latencyMs ?? null,
        detail: e.detail ?? null,
      })),
    );
  } catch (err) {
    // Telemetry must never break the lesson. Log and return a soft failure so the
    // client drops the batch instead of retrying forever.
    console.error("[telemetry] insert failed", err);
    return NextResponse.json({ accepted: 0, dropped: batch.length }, { status: 202 });
  }

  return NextResponse.json({ accepted: batch.length }, { status: 202 });
}
