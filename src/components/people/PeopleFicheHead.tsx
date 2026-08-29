import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import type {
  PeopleCountriesData,
  PeopleHeroData,
} from "@/lib/peopleDataTransformer";

const populationFr = new Intl.NumberFormat("fr-FR");

/**
 * The head of the people fiche: overline, title, lede, and two chips.
 *
 * The overline is the fiche's own identifiers — its PPL id, its family, its
 * ethnolinguistic group — because a reader who arrives from a search should be
 * able to see, before anything else, exactly which record they are looking at.
 * 25 fiches declare no ethnolinguistic group; there the family stands in, so
 * the overline stays a triple rather than trailing off after a separator.
 *
 * The country chip counts the declared *distribution*, not `currentCountries`.
 * The two disagree on 75 fiches, and the globe above draws the distribution —
 * a head counting the other field would have the page contradicting itself
 * within one screen.
 */
// @req REQ-115
export function PeopleFicheHead({
  hero,
  countries,
  confidenceScore = null,
  sourceCount = null,
  lastHumanAuditAt = null,
  showConfidence = true,
}: {
  hero: PeopleHeroData;
  countries: PeopleCountriesData;
  confidenceScore?: number | null;
  sourceCount?: number | null;
  lastHumanAuditAt?: string | null;
  /**
   * The chip cites the fiche's sources and links to their footer. When the
   * head stands above the globe, as the page's title band, it is outside the
   * document that owns that anchor — so the chip stays with the parchment and
   * the band carries the title alone.
   */
  showConfidence?: boolean;
}) {
  const group = hero.ethnoLinguisticGroup ?? hero.languageFamilyName;
  const eyebrow = [hero.peopleId, hero.languageFamilyId, group].filter(Boolean);
  const presenceCount = countries.distributions.length;

  return (
    <header className="px-3 md:px-4 xl:px-5 pt-afh-base flex flex-col gap-afh-xs">
      <p
        data-testid="fiche-head-eyebrow"
        className="font-[family-name:var(--afh-font-mono)] text-afh-caption uppercase tracking-[0.1em] text-afh-text-soft"
      >
        {eyebrow.join(" · ")}
      </p>

      <AutonymExonymHeading
        variant="hero"
        autonym={hero.nameMain}
        predicate="un peuple sans bord"
      />

      {hero.historicalRegion && (
        <p className="text-afh-body text-afh-text-soft">
          {hero.historicalRegion}
        </p>
      )}

      <div className="flex flex-wrap gap-afh-xs">
        {/* A population of zero is a fiche that declared none, not a people of
            nobody — so the chip goes rather than stating a figure. */}
        {countries.totalPopulation > 0 && (
          <span className="rounded-afh-full border border-afh-border px-afh-sm py-afh-xs text-afh-small">
            <span className="font-[family-name:var(--afh-font-mono)] tabular-nums">
              {populationFr.format(countries.totalPopulation)}
            </span>{" "}
            personnes
            {countries.referenceYear
              ? ` · réf. ${countries.referenceYear}`
              : ""}
          </span>
        )}
        <span className="rounded-afh-full border border-afh-border px-afh-sm py-afh-xs text-afh-small">
          {presenceCount} pays de présence
        </span>
      </div>

      {/* A fiche resting entirely on unverified sources is published and
          visibly marked as such — that is the intended outcome of the tier
          policy, not a defect, so the chip belongs in the head. */}
      {showConfidence && (
        <ConfidenceChip
          confidenceScore={confidenceScore}
          sourceCount={sourceCount}
          lastHumanAuditAt={lastHumanAuditAt}
          variant="hero"
          id={hero.peopleId}
          ariaSuffix={`pour la fiche ${hero.nameMain}`}
        />
      )}
    </header>
  );
}
