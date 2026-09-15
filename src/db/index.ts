import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | null = null;

function connect(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }
  return drizzle(neon(url), { schema });
}

/**
 * Lazily-connected database handle.
 *
 * The connection is deferred to first use rather than module load so that
 * `next build` — which imports every route module without any runtime
 * environment — doesn't fail on a missing DATABASE_URL. A misconfigured
 * deployment then surfaces as a failing request, not a failing build.
 */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    instance ??= connect();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
