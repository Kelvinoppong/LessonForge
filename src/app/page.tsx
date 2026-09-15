import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BentoFeatures } from "@/components/marketing/BentoFeatures";
import { Faq } from "@/components/marketing/Faq";
import { GuardrailSimulator } from "@/components/marketing/GuardrailSimulator";
import { HeroExercise } from "@/components/marketing/HeroExercise";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { buttonStyles } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      {/* ---------------- hero ---------------- */}
      <section className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div className="lg:pt-8">
          <p className="text-sm font-medium text-grass-300">
            Course authoring for learning platforms
          </p>

          <h1 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight text-ink-200 sm:text-[2.625rem]">
            Write better lessons.
            <br />
            Never ship a worse one.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-400">
            LessonForge helps course teams draft lessons quickly, try them on a small group of
            learners first, and automatically withdraw any version that turns out to be worse than
            the one it replaced.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/demo" className={buttonStyles.primary}>
              Try a lesson
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/studio" className={buttonStyles.secondary}>
              Open the Studio
            </Link>
          </div>

          <p className="mt-4 text-sm text-ink-400">
            No account needed — the demo runs in your browser.
          </p>
        </div>

        <HeroExercise />
      </section>

      {/* ---------------- how it works ---------------- */}
      <section>
        <SectionHeading
          title="How it works"
          body="Three steps, and only one of them needs a person."
        />
        <div className="mt-10">
          <HowItWorks />
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <section>
        <SectionHeading
          title="What you get"
          body="Lessons learners can actually use, and the confidence to change them."
        />
        <div className="mt-10">
          <BentoFeatures />
        </div>
      </section>

      {/* ---------------- interactive guardrail ---------------- */}
      <section>
        <SectionHeading
          title="See it decide for yourself"
          body="This is the real check that runs against every live experiment, not an illustration of it. Describe how a new version is performing and watch what happens."
        />
        <div className="mt-10">
          <GuardrailSimulator />
        </div>
      </section>

      {/* ---------------- faq ---------------- */}
      <section>
        <SectionHeading title="Questions" />
        <div className="mt-8">
          <Faq />
        </div>
      </section>

      {/* ---------------- cta ---------------- */}
      <section className="rounded-lg border border-ink-700 bg-ink-900/40 px-6 py-12 text-center sm:px-10">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-200">
          Start with a lesson
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-400">
          Plot a few points, listen to a Spanish clip, then look at the dashboard that decides
          whether either one stays.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/demo" className={buttonStyles.primary}>
            Try a lesson
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/ops" className={buttonStyles.secondary}>
            View the dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, body }: { title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-tight text-ink-200 sm:text-3xl">{title}</h2>
      {body ? <p className="mt-3 text-base leading-relaxed text-ink-400">{body}</p> : null}
    </div>
  );
}
