"use client";

import * as React from "react";

import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { translations } from "@/lib/translations";

const t = translations.fr.quiz;

/**
 * The wait of a quiz session (REQ-104, REQ-113).
 *
 * The session is fetched client-side once a track is chosen, so no route
 * boundary can cover it: this is the fourth wait slot on the site, alongside
 * the page, the fiche and the facet panel. It served a bare
 * `AfricaTraceLoader` — the only wait on the site spent on nothing but a
 * silhouette, and a black one at that, because outside an `.afh-accent-*`
 * wrapper `var(--accent)` resolves to shadcn's bare HSL triplet and `fill`
 * cannot read it.
 *
 * Both halves are fixed here rather than at the call site. The accent is the
 * Jouer axis's, read from the registry so it follows the axis if the axis
 * moves; `PageLayout` declares no scope of its own, so the wait has to carry
 * it. And nothing above the fact is drawn: the quiz page's own shell — header,
 * trail, title band — is still mounted while the session is in flight.
 *
 * The fact is drawn once per mount rather than per render. `useQuizSession`
 * re-renders during its fetch, and a fact redrawn under the reader mid-wait is
 * a paragraph that changes while they are reading it.
 */
// @req REQ-103
// @req REQ-104
// @req REQ-113
export function QuizSessionWait() {
  const [fact] = React.useState(() => pickDidYouKnowFact());

  return (
    <div className={ACCENT_BY_ACCESS_MODE.jeux}>
      <DidYouKnowLoader fact={fact} label={t.loadingSession} />
    </div>
  );
}
