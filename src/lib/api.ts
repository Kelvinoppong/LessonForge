"use client";

/**
 * Client-side fetch wrapper.
 *
 * Exists because a failing route doesn't always answer with JSON — an unhandled
 * server exception returns an empty body, and surfacing the resulting
 * "Unexpected end of JSON input" to a user tells them nothing about what broke.
 * Everything here funnels into one readable message.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageForStatus(status: number): string {
  if (status === 500) {
    return "The server hit an error. If you haven't set DATABASE_URL yet, that's the likely cause — check the server logs.";
  }
  if (status === 404) return "Not found.";
  if (status === 401 || status === 403) return "Not authorised.";
  if (status === 504) return "The request timed out.";
  return `Request failed with status ${status}.`;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch (err) {
    throw new ApiError(`Could not reach the server: ${(err as Error).message}`, 0);
  }

  const raw = await response.text();
  let parsed: unknown = null;

  if (raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Non-JSON body (an HTML error page, say). Fall through to a status message.
      parsed = null;
    }
  }

  if (!response.ok) {
    const body = parsed as { error?: string; detail?: string } | null;
    throw new ApiError(
      body?.detail ?? body?.error ?? messageForStatus(response.status),
      response.status,
    );
  }

  return parsed as T;
}

/** Convenience for the many POST/PATCH calls that send and receive JSON. */
export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
