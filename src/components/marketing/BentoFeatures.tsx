import { Grid3x3, ShieldAlert, Sparkles, Users, Volume2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CoordinatePlane } from "@/components/CoordinatePlane";
import { MiniOpsTable } from "@/components/marketing/MiniOpsTable";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "Drafting that stays on the rails",
    body: "Generated exercises are checked against the shape a lesson is allowed to take before anyone sees them. Malformed output is sent back for another attempt rather than surfaced as a broken lesson.",
  },
  {
    icon: Users,
    title: "A consistent experience per learner",
    body: "Someone who starts a lesson in one version stays in that version, and running two experiments at once never traps the same group of learners in both.",
  },
  {
    icon: Volume2,
    title: "Listening practice with real audio",
    body: "Spanish clips are voiced once when the lesson is written, then served from storage. If a clip ever fails to load, the browser reads the line instead so the exercise still works.",
    href: "/demo",
    linkLabel: "Hear it",
  },
];

export function BentoFeatures() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        icon={ShieldAlert}
        title="Bad lessons get withdrawn on their own"
        body="Every version is watched as learners use it. A version that breaks, or that makes learners get answers wrong more often than the one it replaced, is pulled without waiting for anyone to notice."
        href="/ops"
        linkLabel="See the dashboard"
      >
        <MiniOpsTable />
      </Panel>

      <Panel
        icon={Grid3x3}
        title="Exercises you can actually use"
        body="The coordinate plane works by tap and by keyboard — arrow keys move, Shift jumps five units, Enter commits — so it's usable without a mouse or a steady hand."
        href="/demo"
        linkLabel="Try it"
      >
        <div className="mx-auto max-w-[240px]">
          <CoordinatePlane gridRange={5} mode="show" shown={{ x: -3, y: 2 }} />
        </div>
      </Panel>

      {FEATURES.map((feature) => (
        <Panel key={feature.title} {...feature} />
      ))}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  body,
  href,
  linkLabel,
  children,
}: Feature & { children?: ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border border-ink-700 bg-ink-900/40 p-6 transition-colors hover:border-ink-600">
      <Icon className="h-5 w-5 text-ink-400" aria-hidden />
      <h3 className="mt-4 text-base font-semibold text-ink-200">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">{body}</p>

      {href ? (
        <Link
          href={href}
          className="mt-4 text-sm font-medium text-macaw-500 underline-offset-4 hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}

      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
