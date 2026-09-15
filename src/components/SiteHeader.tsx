"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/demo", label: "Demo" },
  { href: "/studio", label: "Studio" },
  { href: "/ops", label: "Reliability" },
  { href: "/architecture", label: "Architecture" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Only thicken the header once the page has actually moved, so it stays
  // transparent over the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 bg-ink-950 transition-colors ${
        scrolled ? "border-b border-ink-700" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink-200 transition-opacity hover:opacity-80"
        >
          <span aria-hidden className="h-4 w-1 rounded-sm bg-grass-500" />
          LessonForge
        </Link>

        <div className="ml-auto hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active ? "text-ink-200" : "text-ink-400 hover:text-ink-200"
                }`}
              >
                {link.label}
                {active ? (
                  <span aria-hidden className="absolute inset-x-3 -bottom-2 h-px bg-grass-500" />
                ) : null}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="ml-auto rounded-md border border-ink-700 p-1.5 text-ink-200 sm:hidden"
        >
          {menuOpen ? (
            <X className="h-4 w-4" aria-hidden />
          ) : (
            <Menu className="h-4 w-4" aria-hidden />
          )}
        </button>
      </nav>

      {menuOpen ? (
        <div className="border-t border-ink-700 bg-ink-950 px-5 py-3 sm:hidden">
          <div className="flex flex-col">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2.5 text-sm text-ink-200 transition-colors hover:bg-ink-800/60"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
