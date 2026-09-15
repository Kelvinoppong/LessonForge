import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LessonForge — AI lesson authoring with experiment guardrails",
  description:
    "An internal course-authoring studio: draft lessons with GPT-4, A/B test them on learners, and automatically halt any variant that starts hurting outcomes.",
};

const navLinks = [
  { href: "/studio", label: "Studio" },
  { href: "/ops", label: "Reliability" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-ink-700/50 bg-ink-950/80 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-lg bg-grass-500 text-sm text-ink-950"
              >
                LF
              </span>
              <span className="hidden sm:inline">LessonForge</span>
            </Link>

            <div className="ml-auto flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-400 transition hover:bg-ink-800/60 hover:text-ink-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>

        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 text-xs text-ink-400 sm:px-6">
          LessonForge — lesson authoring, experimentation and reliability tooling in one
          platform.
        </footer>
      </body>
    </html>
  );
}
