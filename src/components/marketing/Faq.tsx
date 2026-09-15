import { Plus } from "lucide-react";

const ITEMS: { question: string; answer: string }[] = [
  {
    question: "Do learners ever see a lesson nobody reviewed?",
    answer:
      "No. A drafted exercise is only a proposal until an author accepts it. Acceptance is what turns it into a variant that can be served, and it's a deliberate step — there is no path from the model straight to a learner.",
  },
  {
    question: "How quickly does a bad lesson get pulled?",
    answer:
      "Within five minutes. A scheduled job re-reads the telemetry for every running experiment on that cadence and halts any candidate that breaches a guardrail. Halted means learners fall back to the previous version on their next request.",
  },
  {
    question: "What counts as a lesson being bad?",
    answer:
      "Two separate things, measured separately. A lesson can be broken — audio failing to load, exercises erroring — which is judged against an absolute ceiling. Or it can be worse than what it replaced, where learners get answers wrong far more often than on the control. Neither is allowed to hide behind the other.",
  },
  {
    question: "Can I try it without setting anything up?",
    answer:
      "Yes. The demo runs entirely in your browser with no database and no API key, and records nothing. The Studio and reliability dashboard need a database connection, since they read and write real lessons and telemetry.",
  },
  {
    question: "Why is the AI in a separate service?",
    answer:
      "So the app that serves learners never holds a model provider key, and so an outage or a slow response while drafting can't affect anyone taking a lesson. It also keeps prompt handling and output validation in one place instead of scattered through the web app.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-ink-700 border-y border-ink-700">
      {ITEMS.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-ink-200 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
            {item.question}
            <Plus
              className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-45"
              aria-hidden
            />
          </summary>
          <p className="max-w-2xl pb-5 text-sm leading-relaxed text-ink-400">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
