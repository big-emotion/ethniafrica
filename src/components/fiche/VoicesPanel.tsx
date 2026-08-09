"use client";

import { useEffect, useState } from "react";

import { FichePanel } from "@/components/fiche/FichePanel";
import { OralNarrativesSection } from "@/components/people/OralNarrativesSection";
import type {
  FichePanelSide,
  FichePanelSize,
  FichePanelSourceLine,
} from "@/types/fiche";

export interface VoicesPanelProps {
  peopleId: string;
  size: FichePanelSize;
  side: FichePanelSide;
  sourceLine: FichePanelSourceLine;
  stepLabel: string;
  heading: string;
  body: string;
  note?: string;
}

/**
 * Voices panel (Epic 15 · Story 15.7 · FR98, FR99) — oral narratives through
 * the shipped REQ-095 public renderer (OralNarrativesSection), rights
 * metadata untouched: the same public, rights-filtered endpoint decides
 * both this panel's presence and the wrapped renderer's content, so the
 * chapter anatomy (heading, source line) and the canvas are absent together
 * when there is nothing to show.
 */
// @req REQ-095
export function VoicesPanel({
  peopleId,
  size,
  side,
  sourceLine,
  stepLabel,
  heading,
  body,
  note,
}: VoicesPanelProps) {
  const [hasNarratives, setHasNarratives] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/v2/oral-narratives?entityType=people&entityId=${encodeURIComponent(peopleId)}`
    )
      .then(async (response) => {
        if (!response.ok) return [];
        const body = await response.json();
        return (body.data ?? []) as unknown[];
      })
      .then((data) => {
        if (!cancelled) setHasNarratives(data.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasNarratives(false);
      });

    return () => {
      cancelled = true;
    };
  }, [peopleId]);

  if (!hasNarratives) {
    return <FichePanel size={size} side={side} sourceLine={sourceLine} />;
  }

  return (
    <FichePanel
      size={size}
      side={side}
      sourceLine={sourceLine}
      data={{
        stepLabel,
        heading,
        body,
        note,
        canvas: (
          <div
            data-voices-canvas
            className="h-full w-full overflow-y-auto p-afh-lg"
          >
            <OralNarrativesSection peopleId={peopleId} />
          </div>
        ),
      }}
    />
  );
}

export default VoicesPanel;
