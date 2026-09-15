import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Metrics, thresholds and identifiers are set in mono so digits line up in columns
// and don't shift width as values change.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  // Vercel injects VERCEL_URL per deployment; the localhost fallback keeps dev quiet.
  metadataBase: new URL(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
  ),
  title: "LessonForge — AI lesson authoring with experiment guardrails",
  description:
    "An internal course-authoring studio: draft lessons with GPT-4, A/B test them on learners, and automatically halt any variant that starts hurting outcomes.",
  openGraph: {
    title: "LessonForge — AI lesson authoring with experiment guardrails",
    description:
      "Draft lessons with GPT-4, A/B test them on learners, and automatically halt any variant that starts hurting outcomes.",
    type: "website",
  },
};

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { href: "/demo", label: "Demo" },
      { href: "/studio", label: "Studio" },
      { href: "/ops", label: "Reliability" },
    ],
  },
  {
    title: "Project",
    links: [{ href: "/architecture", label: "Architecture" }],
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-grass-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>

        <SiteHeader />

        <main id="main" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          {children}
        </main>

        <footer className="mt-24 border-t border-ink-700">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
            <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-200">
                  <span aria-hidden className="h-4 w-1 rounded-sm bg-grass-500" />
                  LessonForge
                </p>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-400">
                  Course authoring with experimentation and reliability built in, so lessons can
                  change without putting learners at risk.
                </p>
              </div>

              {FOOTER_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h2 className="text-xs font-medium text-ink-200">{section.title}</h2>
                  <ul className="mt-4 space-y-2.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-ink-400 transition-colors hover:text-ink-200"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-12 border-t border-ink-700 pt-6 text-xs text-ink-400">
              A portfolio project modelled on internal tooling for a learning platform.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
