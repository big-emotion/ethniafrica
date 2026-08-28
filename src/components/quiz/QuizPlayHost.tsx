"use client";

import dynamic from "next/dynamic";

import type { QuizScope } from "@/lib/quiz/quizScope";

// The play island is a below-the-fold enhancement only needed once a track is
// chosen — never required to read/render the picker first.
const LazyQuizPlayIsland = dynamic(
  () =>
    import("@/components/quiz/QuizPlayIsland").then(
      (mod) => mod.QuizPlayIsland
    ),
  { ssr: false }
);

interface QuizPlayHostProps {
  scope: QuizScope;
  scopeLabelFr: string;
  exitHref: string;
}

/**
 * Mounts the client-only play loop for the track the URL names.
 *
 * It used to hold the chosen segment in component state and swap the picker
 * for the island. The track now lives in the query string — the picker is a
 * `GET` form, so choosing one is a navigation — which means this component no
 * longer decides anything: the page renders the picker or the host, and a
 * session is a page a reader can bookmark, share, and leave by following a
 * link.
 */
// @req REQ-103 FR66 FR67
export const QuizPlayHost = ({
  scope,
  scopeLabelFr,
  exitHref,
}: QuizPlayHostProps) => (
  <LazyQuizPlayIsland
    scope={scope}
    scopeLabelFr={scopeLabelFr}
    exitHref={exitHref}
  />
);

export default QuizPlayHost;
