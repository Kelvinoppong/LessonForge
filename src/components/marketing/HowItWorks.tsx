const STEPS: { title: string; body: string }[] = [
  {
    title: "Describe the lesson",
    body: "Say what you want to teach in plain language — a set of coordinate-plotting exercises, or a listening drill on café vocabulary. The studio drafts the exercises and shows them to you.",
  },
  {
    title: "Review and release",
    body: "Edit or reject anything that isn't right. When you accept a draft it becomes a new version, released to a slice of learners alongside the version it might replace.",
  },
  {
    title: "Let the results decide",
    body: "Both versions are measured as learners work through them. If the new one performs worse, it's withdrawn automatically and everyone goes back to the old one.",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-6 sm:grid-cols-3 sm:gap-8">
      {STEPS.map((step, index) => (
        <li key={step.title}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-700 font-mono text-xs text-ink-400">
            {index + 1}
          </div>
          <h3 className="mt-4 text-base font-semibold text-ink-200">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
