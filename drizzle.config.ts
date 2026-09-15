import { defineConfig } from "drizzle-kit";

/**
 * `.env.local` is a Next.js convention that drizzle-kit knows nothing about, so
 * the CLI would otherwise see no DATABASE_URL and fail with a confusing
 * "connection url required". Load it here so `db:push` and `db:studio` use the
 * same connection the app does. A real environment variable still wins, which is
 * what lets CI and `vercel env` override it.
 */
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No local env file — fine, the variable may be set some other way.
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
