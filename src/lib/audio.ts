import { put } from "@vercel/blob";
import { synthesizeSpeech } from "@/lib/contentAi";
import type { Exercise } from "@/lib/types";

const NEEDS_AUDIO = new Set(["listening_choice", "listening_type"]);

function slugForAudio(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "clip";
}

/**
 * Generate and host audio for every listening exercise that doesn't have it yet.
 *
 * Audio is produced once at authoring time rather than per learner request:
 * listening exercises are replayed constantly, and paying the TTS latency on
 * every replay would be both slow and expensive.
 *
 * If Blob isn't configured we fall back to inlining a data URL so the lesson
 * still works locally — degraded, but not broken.
 */
export async function attachAudio(
  exercises: Exercise[],
  lessonSlug: string,
): Promise<{ exercises: Exercise[]; generated: number; warnings: string[] }> {
  const warnings: string[] = [];
  let generated = 0;

  const withAudio = await Promise.all(
    exercises.map(async (ex, index) => {
      if (!NEEDS_AUDIO.has(ex.kind)) return ex;
      const listening = ex as Extract<Exercise, { audioText: string }>;
      if (listening.audioUrl) return ex;

      try {
        const speech = await synthesizeSpeech(listening.audioText);
        const bytes = Buffer.from(speech.audioBase64, "base64");
        generated++;

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          warnings.push(
            `BLOB_READ_WRITE_TOKEN missing — exercise ${index + 1} audio inlined as a data URL instead of hosted.`,
          );
          return {
            ...listening,
            audioUrl: `data:${speech.contentType};base64,${speech.audioBase64}`,
          };
        }

        const blob = await put(
          `lessons/${lessonSlug}/${index}-${slugForAudio(listening.audioText)}.mp3`,
          bytes,
          { access: "public", contentType: speech.contentType, addRandomSuffix: true },
        );

        return { ...listening, audioUrl: blob.url };
      } catch (err) {
        warnings.push(
          `Audio generation failed for exercise ${index + 1}: ${(err as Error).message}`,
        );
        return ex;
      }
    }),
  );

  return { exercises: withAudio as Exercise[], generated, warnings };
}
