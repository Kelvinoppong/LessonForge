"use client";

import type { TelemetryEvent } from "@/lib/types";

const STORAGE_KEY = "lessonforge:learnerId";

/**
 * A stable per-browser learner id. Sticky variant assignment depends on this
 * being stable, so it lives in localStorage rather than being regenerated.
 */
export function getLearnerId(): string {
  if (typeof window === "undefined") return "server";

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const fresh = `learner_${crypto.randomUUID().slice(0, 12)}`;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private browsing or blocked storage: fall back to an ephemeral id rather
    // than breaking the lesson.
    return `learner_ephemeral_${Math.random().toString(36).slice(2, 10)}`;
  }
}

type Context = {
  learnerId: string;
  lessonId: string;
  variantId: string;
  experimentId?: string | null;
};

export type LearnerEvent = Omit<
  TelemetryEvent,
  "learnerId" | "lessonId" | "variantId" | "experimentId"
>;

/**
 * What the player needs from telemetry. An interface rather than the concrete
 * class so the offline demo can run the real player against a sink that discards
 * events instead of posting them.
 */
export interface TelemetrySink {
  record(event: LearnerEvent): void;
  flush(): Promise<void>;
}

export class NoopTelemetry implements TelemetrySink {
  record(): void {}
  async flush(): Promise<void> {}
}

/**
 * Batching telemetry client.
 *
 * Events are buffered and flushed together, because the guardrail monitor cares
 * about aggregate rates, not millisecond-level ordering, and one request per
 * keystroke would be wasteful. Errors are flushed immediately — those are the
 * events the monitor acts on.
 */
export class Telemetry implements TelemetrySink {
  private buffer: TelemetryEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private context: Context,
    private flushIntervalMs = 4000,
  ) {
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", this.flushSync);
      window.addEventListener("beforeunload", this.flushSync);
    }
  }

  record(event: LearnerEvent): void {
    this.buffer.push({ ...this.context, ...event });

    const urgent = event.type === "client_error" || event.type === "audio_error";
    if (urgent || this.buffer.length >= 20) {
      void this.flush();
      return;
    }

    this.timer ??= setTimeout(() => void this.flush(), this.flushIntervalMs);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;

    const batch = this.buffer;
    this.buffer = [];

    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
    } catch {
      // Dropping telemetry is strictly better than interrupting a lesson.
    }
  }

  /** Best-effort flush during page teardown, where async work won't complete. */
  private flushSync = (): void => {
    if (this.buffer.length === 0) return;
    const payload = JSON.stringify({ events: this.buffer });
    this.buffer = [];

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/telemetry", new Blob([payload], { type: "application/json" }));
    }
  };

  dispose(): void {
    this.flushSync();
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.flushSync);
      window.removeEventListener("beforeunload", this.flushSync);
    }
  }
}

/** Accent- and case-insensitive comparison for typed Spanish answers. */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, "")
    .replace(/\s+/g, " ");
}
