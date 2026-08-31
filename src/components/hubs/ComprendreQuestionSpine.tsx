import Link from "next/link";

import { getModuleHref } from "@/lib/hubs/moduleHref";
import { getTranslation } from "@/lib/translations";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
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
 *
 * It reads the same `HubModule[]` the rows above it read (atlas-charter §3).
 * It used to hold its own `PageType` per stop and link all three
 * unconditionally, so /fr/comprendre served a spine inviting the reader to
 * *Noms & appellations* directly above the row marking that module
 * **Bientôt** — one page making two contrary claims about one module.
 */
interface SpineStop {
  question: string;
  /** The registry id of the module that answers it (moduleRegistry.ts). */
  moduleId: string;
  /**
   * What the stop names when the hub hands over no module under that id —
   * the question keeps its answer's name rather than trailing off.
   */
  answeredBy: string;
}

// Ordered like the registry behind it: from the most concrete question to
// the method that governs every answer.
const STOPS: SpineStop[] = [
  {
    question: "Pourquoi ce peuple porte-t-il ce nom ?",
    moduleId: "noms",
    answeredBy: "Appellations",
  },
  {
    question: "D'où viennent-ils, et quand ?",
    moduleId: "frise",
    answeredBy: "Premiers repères de migrations",
  },
  {
    question: "Qui dit ça, et sur quelle source ?",
    moduleId: "doctrine",
    answeredBy: "La doctrine éditoriale",
  },
];

export interface ComprendreQuestionSpineProps {
  language: Language;
  /** The axis's modules, availability already resolved by getHubModules. */
  modules: HubModule[];
}

// @req REQ-114 @req REQ-106
export function ComprendreQuestionSpine({
  language,
  modules,
}: ComprendreQuestionSpineProps) {
  const t = getTranslation(language);
  const moduleById = new Map(
    modules.map((hubModule) => [hubModule.id, hubModule])
  );

  return (
    <div data-testid="comprendre-question-spine" className="comprendre-spine">
      <p className="comprendre-spine-lead">
        {"Trois questions, et l'endroit du corpus qui y répond."}
      </p>

      {/* role="list" because list-style: none strips list semantics in
          Safari/VoiceOver, and the sequence is the point here. */}
      <ol className="comprendre-spine-list" role="list">
        {STOPS.map((stop) => {
          const answeringModule = moduleById.get(stop.moduleId);
          const href = answeringModule
            ? getModuleHref(answeringModule, language)
            : null;
          const answerLabel = answeringModule?.name ?? stop.answeredBy;

          // Same condition as AccessModeHub's row, so the two surfaces of
          // this page cannot drift apart again.
          if (!answeringModule?.available || !href) {
            return (
              <li key={stop.moduleId} className="comprendre-spine-stop">
                <div
                  data-testid={`comprendre-spine-pending-${stop.moduleId}`}
                  className="comprendre-spine-link comprendre-spine-link-pending"
                >
                  <span className="comprendre-spine-question">
                    {stop.question}
                  </span>
                  <span className="comprendre-spine-answer">
                    {`${answerLabel} — ${t.hubs.unavailableLabel}`}
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={stop.moduleId} className="comprendre-spine-stop">
              <Link
                href={href}
                data-testid={`comprendre-spine-stop-${stop.moduleId}`}
                className="comprendre-spine-link"
              >
                <span className="comprendre-spine-question">
                  {stop.question}
                </span>
                <span className="comprendre-spine-answer">{answerLabel}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <style>{`
        .comprendre-spine-lead {
          margin: 0 0 16px;
          font-size: var(--afh-text-small);
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
        .comprendre-spine-stop:has(.comprendre-spine-link-pending)::before {
          border-color: var(--afh-text-soft);
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

        /* Inert, and legibly so: the pending stop keeps its place in the
           sequence but drops to the soft ink the hub's Bientôt row uses,
           so "not yet" reads without being spelled out twice. */
        .comprendre-spine-link-pending .comprendre-spine-question {
          color: var(--afh-text-soft);
        }

        .comprendre-spine-question {
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h3);
          font-weight: 700;
          color: var(--afh-text);
          text-wrap: balance;
        }
        /* :not(pending) — the inert stop shares the link's layout class and
           would otherwise offer a hover affordance for a click it refuses. */
        .comprendre-spine-link:not(.comprendre-spine-link-pending):hover
          .comprendre-spine-question {
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .comprendre-spine-answer {
          font-size: var(--afh-text-caption);
          /* --afh-fg-muted, not --afh-text-muted: the latter measures
             3.29:1 on parchment and 4.21:1 at night, both under AA. */
          color: var(--afh-fg-muted);
        }

      `}</style>
    </div>
  );
}

export default ComprendreQuestionSpine;
