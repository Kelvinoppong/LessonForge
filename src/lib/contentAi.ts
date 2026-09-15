import { exerciseList, type Course, type Exercise } from "@/lib/types";

const BASE_URL = process.env.CONTENT_AI_URL ?? "http://127.0.0.1:8000";
const TOKEN = process.env.CONTENT_AI_TOKEN ?? "";

export class ContentAiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ContentAiError";
  }
}

async function post<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ContentAiError(
        `content-ai ${path} failed (${res.status}): ${text.slice(0, 300)}`,
        res.status,
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ContentAiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ContentAiError(`content-ai ${path} timed out after ${timeoutMs}ms`, 504);
    }
    throw new ContentAiError(
      `content-ai ${path} unreachable at ${BASE_URL}: ${(err as Error).message}`,
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export type DraftRequest = {
  course: Course;
  skill: string;
  instruction: string;
  /** Prior turns, so the author can iterate conversationally. */
  history?: { role: "user" | "assistant"; content: string }[];
  /** Exercises currently on the canvas, for "make these harder"-style edits. */
  currentExercises?: Exercise[];
};

export type DraftResponse = {
  message: string;
  exercises: Exercise[];
  model: string;
};

/**
 * Ask the AI service for a lesson draft. The response is validated against our
 * exercise schema here, at the boundary — an unparseable draft is a failed draft,
 * not something we persist and discover later in front of a learner.
 */
export async function draftLesson(req: DraftRequest): Promise<DraftResponse> {
  const raw = await post<{ message: string; exercises: unknown; model: string }>(
    "/draft",
    req,
  );

  const parsed = exerciseList.safeParse(raw.exercises);
  if (!parsed.success) {
    throw new ContentAiError(
      `Model returned exercises that failed validation: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
      422,
    );
  }

  return { message: raw.message, exercises: parsed.data, model: raw.model };
}

export type SpeechResponse = { audioBase64: string; contentType: string; model: string };

/** Generate Spanish audio for a listening exercise. */
export async function synthesizeSpeech(text: string, voice = "nova"): Promise<SpeechResponse> {
  return post<SpeechResponse>("/speech", { text, voice });
}
