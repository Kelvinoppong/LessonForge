import { NextResponse } from "next/server";

/**
 * Answer API requests clearly when the database isn't configured.
 *
 * Every route under /api reads or writes Postgres, so without a connection
 * string they would all throw on first use and Next would return a bare 500 with
 * an empty body. That reads as "this app is broken" rather than "this app needs
 * an environment variable", which is a materially different message for anyone
 * cloning the repo.
 *
 * Gating once here rather than adding the same guard to nine route handlers keeps
 * the check in a single place. 503 is the honest status: the service is
 * unavailable pending configuration, and the request itself was fine.
 *
 * The learner-facing /demo route deliberately touches no API, so it keeps working.
 */
export function middleware() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error:
          "The database isn't configured. Create a Neon project, then add its connection string to .env.local as DATABASE_URL and restart the dev server. The /demo page works without one.",
        code: "DATABASE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
