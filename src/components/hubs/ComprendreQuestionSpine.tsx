import Link from "next/link";

import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * Comprendre's scene (REQ-114). A reader arrives here with a question, so
 * the scene shows the questions rather than the modules that answer them —
 * that is the whole difference between this axis and Explorer, and a
 * second `<ul>` of module names would have hidden it.
 *
 * The spine borrows HistoryTimeline's vertical-stop idiom but not its
 * tokens: that component runs on the `--country-*` namespace and carries a
 * raw rgba() literal, neither of which belongs outside a fiche.
 */
interface SpineStop {
  question: string;
  /** Where the corpus answers it — named, so the stop is not a bare tease. */
  answeredBy: string;
  page: PageType;
}

// Ordered like the registry behind it: from the most concrete question to
// the method that governs every answer.
const STOPS: SpineStop[] = [
  {
    question: "Pourquoi ce peuple porte-t-il ce nom ?",
    answeredBy: "Noms & appellations",
    page: "names",
  },
  {
    question: "D'où viennent-ils, et quand ?",
    answeredBy: "Premiers repères de migrations",
    page: "migrations",
  },
  {
    question: "Qui dit ça, et sur quelle source ?",
    answeredBy: "La doctrine éditoriale",
    page: "doctrine",
  },
];

export interface ComprendreQuestionSpineProps {
  language: Language;
}

// @req REQ-114
export function ComprendreQuestionSpine({
  language,
}: ComprendreQuestionSpineProps) {
  return (
    <div data-testid="comprendre-question-spine" className="comprendre-spine">
      <p className="comprendre-spine-lead">
        {"Trois questions, et l'endroit du corpus qui y répond."}
      </p>

      {/* role="list" because list-style: none strips list semantics in
          Safari/VoiceOver, and the sequence is the point here. */}
      <ol className="comprendre-spine-list" role="list">
        {STOPS.map((stop) => (
          <li key={stop.page} className="comprendre-spine-stop">
            <Link
              href={getLocalizedRoute(language, stop.page)}
              data-testid={`comprendre-spine-stop-${stop.page}`}
              className="comprendre-spine-link"
            >
              <span className="comprendre-spine-question">{stop.question}</span>
              <span className="comprendre-spine-answer">{stop.answeredBy}</span>
            </Link>
          </li>
        ))}
      </ol>

      <style>{`
        .comprendre-spine-lead {
          margin: 0 0 16px;
          font-size: 14px;
          color: var(--afh-fg-muted);
        }

        .comprendre-spine-list {
          list-style: none;
          margin: 0;
          padding: 0 0 0 26px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* The spine itself: one continuous run behind every stop, so the
           three questions read as one thread rather than three rows. */
        .comprendre-spine-list::before {
          content: "";
          position: absolute;
          left: 5px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: linear-gradient(
            to bottom,
            var(--accent),
            color-mix(in srgb, var(--accent) 25%, transparent)
          );
        }

        .comprendre-spine-stop {
          position: relative;
        }
        .comprendre-spine-stop::before {
          content: "";
          position: absolute;
          left: -26px;
          top: 7px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--afh-surface);
          border: 2px solid var(--accent);
        }

        .comprendre-spine-link {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-height: 44px;
          text-decoration: none;
          border-radius: var(--afh-radius-md);
          padding: 2px 4px;
        }
        .comprendre-spine-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .comprendre-spine-question {
          font-family: var(--afh-font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--afh-text);
          text-wrap: balance;
        }
        .comprendre-spine-link:hover .comprendre-spine-question {
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .comprendre-spine-answer {
          font-size: 13px;
          /* --afh-fg-muted, not --afh-text-muted: the latter measures
             3.29:1 on parchment and 4.21:1 at night, both under AA. */
          color: var(--afh-fg-muted);
        }

        @media (min-width: 800px) {
          .comprendre-spine-question { font-size: 20px; }
        }
      `}</style>
    </div>
  );
}

export default ComprendreQuestionSpine;
