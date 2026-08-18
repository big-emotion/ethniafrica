"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { QuizSegmentPicker } from "@/components/quiz/QuizSegmentPicker";
import type { QuizSegmentView } from "@/api/v2/schemas/quiz";
import type { QuizAudience } from "@/lib/quiz/segmentPolicy";

// The play island is a below-the-fold enhancement only needed once a
// segment is chosen — never required to read/render the picker first.
const LazyQuizPlayIsland = dynamic(
  () =>
    import("@/components/quiz/QuizPlayIsland").then(
      (mod) => mod.QuizPlayIsland
    ),
  { ssr: false }
);

interface QuizPlayHostProps {
  segments: QuizSegmentView[];
}

/**
 * Bridges the server-rendered picker (FR66) to the client-only play loop
 * (FR67/FR68/FR71): shows `QuizSegmentPicker` until a segment is chosen,
 * then lazily mounts `QuizPlayIsland` for that segment (ETNI-1137).
 */
// @req REQ-103 FR66 FR67
export const QuizPlayHost = ({ segments }: QuizPlayHostProps) => {
  const [segment, setSegment] = React.useState<QuizAudience | null>(null);

  if (segment) {
    return (
      <LazyQuizPlayIsland segment={segment} onExit={() => setSegment(null)} />
    );
  }

  return <QuizSegmentPicker segments={segments} onSelectSegment={setSegment} />;
};

export default QuizPlayHost;
