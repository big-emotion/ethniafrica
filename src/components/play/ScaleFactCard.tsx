import type { ScaleFact } from "@/lib/games/scaleFacts";
import { revealProvenanceFr } from "@/lib/games/revealProvenance";
import { revealProvenanceEn } from "@/lib/games/revealProvenance.en";
import { cn } from "@/lib/utils";
import { gamesCopy } from "@/lib/i18n/copy/games";
import type { Language } from "@/types/shared";

export interface ScaleFactCardProps {
  fact: ScaleFact;
  language?: Language;
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
export const ScaleFactCard = ({
  fact,
  language = "fr",
  className,
}: ScaleFactCardProps) => {
  const copy = gamesCopy[language];
  const provenance =
    language === "en"
      ? revealProvenanceEn(fact.fieldPath)
      : revealProvenanceFr(fact.fieldPath);
  const headline =
    language === "en" ? (fact.headlineEn ?? fact.headlineFr) : fact.headlineFr;
  const body = language === "en" ? (fact.bodyEn ?? fact.bodyFr) : fact.bodyFr;

  return (
    <aside
      data-testid="scale-fact-card"
      className={cn(
        "flex flex-col gap-2 rounded-afh-lg border border-dashed border-afh-border bg-afh-bg-warm p-4",
        className
      )}
    >
      <p className="font-afh-mono text-afh-caption uppercase tracking-wide text-afh-text-soft">
        {copy.factEyebrow}
      </p>
      <p className="font-afh-display text-afh-h3 font-bold text-afh-text">
        {headline}
      </p>
      <p className="text-afh-body text-afh-text-soft">{body}</p>
      {provenance ? (
        <p className="text-afh-small text-afh-text-soft">
          {copy.provenanceLabel} {provenance}.
        </p>
      ) : null}
    </aside>
  );
};
