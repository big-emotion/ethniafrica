import type { ScaleFact } from "@/lib/games/scaleFacts";
import { revealProvenanceFr } from "@/lib/games/revealProvenance";
import { cn } from "@/lib/utils";

const COPY_FR = {
  eyebrow: "Ce que la carte cachait",
  provenanceLabel: "D'après",
} as const;

export interface ScaleFactCardProps {
  fact: ScaleFact;
  className?: string;
}

/**
 * One measured scale fact, stated between rounds (REQ-120).
 *
 * The session is a sequence of judgements, and a reader who has just been
 * told they were wrong is at the one moment they are actively curious —
 * charter §7 makes that point about the reveal, and it holds here. So the
 * fact lands on the reveal screen rather than in a separate mode the reader
 * has to choose: a chooser between « questions » and « faits » would hand the
 * facts to whoever picked that tab and to nobody else.
 *
 * It carries its provenance for the same reason a reveal does. A sentence
 * with a number in it is a claim, and this surface states where every claim
 * was measured.
 */
// @req REQ-120
export const ScaleFactCard = ({ fact, className }: ScaleFactCardProps) => {
  const provenanceFr = revealProvenanceFr(fact.fieldPath);

  return (
    <aside
      data-testid="scale-fact-card"
      className={cn(
        "flex flex-col gap-2 rounded-afh-lg border border-dashed border-afh-border bg-afh-bg-warm p-4",
        className
      )}
    >
      <p className="font-afh-mono text-afh-caption uppercase tracking-wide text-afh-text-soft">
        {COPY_FR.eyebrow}
      </p>
      <p className="font-afh-display text-afh-h3 font-bold text-afh-text">
        {fact.headlineFr}
      </p>
      <p className="text-afh-body text-afh-text-soft">{fact.bodyFr}</p>
      {provenanceFr ? (
        <p className="text-afh-small text-afh-text-soft">
          {COPY_FR.provenanceLabel} {provenanceFr}.
        </p>
      ) : null}
    </aside>
  );
};

export default ScaleFactCard;
