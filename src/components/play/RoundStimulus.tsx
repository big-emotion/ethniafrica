"use client";

import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import type { GameStimulus } from "@/lib/games/gameKinds";
import { cn } from "@/lib/utils";

export interface RoundStimulusProps {
  stimulus: GameStimulus;
  className?: string;
}

/**
 * Who the round is about, shown before the question is asked (charter §2).
 *
 * The round that shipped without this asked « lequel de ces deux noms le
 * peuple se donne-t-il à lui-même ? » and never said which people, which left
 * the reader with a coin flip instead of something to reason from.
 *
 * The name goes through `AutonymExonymHeading` rather than being printed as a
 * string: the autonym is the point of this game, and it needs its `lang`
 * attribute and its exonym beside it. That makes the subject the section's
 * heading and pushes the question down one level, which is the honest
 * hierarchy — the section is about this people, and the question is what it
 * asks about them.
 */
// @req REQ-120
export const RoundStimulus = ({ stimulus, className }: RoundStimulusProps) => {
  // Family and countries read as one line of provenance: « Niger-Congo ·
  // Nigeria, Bénin ». Either half may be missing from the corpus, and the
  // separator must not survive alone.
  const provenance = [
    stimulus.familyFr,
    stimulus.countriesFr.length > 0 ? stimulus.countriesFr.join(", ") : null,
  ].filter(Boolean);

  return (
    <div
      data-testid="round-stimulus"
      className={cn("flex flex-col gap-1", className)}
    >
      {provenance.length > 0 ? (
        <p className="text-afh-small font-medium uppercase tracking-wide text-afh-text-soft">
          {provenance.join(" · ")}
        </p>
      ) : null}

      <AutonymExonymHeading
        variant="inline"
        autonym={stimulus.subjectName.autonym}
        exonym={stimulus.subjectName.exonym}
      />

      {stimulus.scaleFr ? (
        <p className="text-afh-small text-afh-text-soft">{stimulus.scaleFr}</p>
      ) : null}
    </div>
  );
};

export default RoundStimulus;
