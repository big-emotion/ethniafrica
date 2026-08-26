"use client";

import { useMemo } from "react";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildCountrySetOverlay } from "@/lib/atlas/overlays";
import type { AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";
import { cn } from "@/lib/utils";

/** REQ-119: the placeholder names what is absent, never just "indisponible". */
const MISSING_ROUND_GEOMETRY = "Contours non disponibles pour cette manche";

/**
 * The atlas marker is 22px, sized for a pointer on a fiche. A round is answered
 * with a thumb, so the round's own stage grows the hit area to the WCAG 2.5.8
 * minimum from the outside — AtlasGlobe stays exactly as every fiche mounts it.
 * The centring margins have to be restated with `!important` because the
 * marker sets them inline, sized to its own smaller diameter.
 */
const THUMB_TAP_TARGET =
  "[&_[data-atlas-target]]:min-h-11 [&_[data-atlas-target]]:min-w-11 [&_[data-atlas-target]]:!-ml-[22px] [&_[data-atlas-target]]:!-mt-[22px]";

export interface GlobeTapProps {
  /** The round's question, shown above the stage. */
  promptFr: string;
  choices: CountryId[];
  onChoose: (countryId: CountryId) => void;
  /** True once the round is answered: the globe stays explorable, the answer stays cast. */
  disabled?: boolean;
  className?: string;
}

/**
 * The game's seam onto the one globe engine the charter allows (REQ-120): it
 * wraps AtlasGlobe rather than rendering geometry of its own, so a round gets
 * the atlas's outlines, camera and facts panel and adds only a question and an
 * answer channel.
 */
// @req REQ-120
export function GlobeTap({
  promptFr,
  choices,
  onChoose,
  disabled = false,
  className,
}: GlobeTapProps) {
  const overlay = useMemo(() => buildCountrySetOverlay(choices), [choices]);

  const reportChoice = (target: AtlasTarget) => {
    // An answered round still lets the reader tap around the globe and read the
    // facts; what it no longer does is cast a second answer.
    if (disabled) return;
    onChoose(target.countryId);
  };

  return (
    <section
      data-testid="globe-tap"
      data-round-answered={disabled ? "true" : "false"}
      className={cn("flex flex-col gap-4", className)}
    >
      <p
        data-testid="globe-tap-prompt"
        className="text-afh-body font-afh text-afh-text"
      >
        {promptFr}
      </p>
      <AtlasGlobe
        overlay={overlay}
        missingMessage={MISSING_ROUND_GEOMETRY}
        onTargetChosen={reportChoice}
        className={THUMB_TAP_TARGET}
      />
    </section>
  );
}

export default GlobeTap;
