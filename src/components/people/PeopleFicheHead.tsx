import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import type {
  PeopleCountriesData,
  PeopleHeroData,
} from "@/lib/peopleDataTransformer";

const populationFr = new Intl.NumberFormat("fr-FR");

/**
 * The head of the people fiche: overline, title, lede, and two chips.
 *
 * It wears `.afh-parchment-head`, the unit the country and family fiches
 * already open on. This one used to assemble its own dress out of utility
 * classes, and being the odd fiche of three showed: raw corpus keys shouted
 * in mono capitals, a predicate set in the same ink and weight as the name it
 * qualifies, and a lede running the band's full four columns.
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
  const corpusKeys = [hero.peopleId, hero.languageFamilyId]
    .filter(Boolean)
    .join(" · ");
  const presenceCount = countries.distributions.length;

  return (
    <header className="afh-parchment-head">
      <p data-testid="fiche-head-eyebrow" className="afh-parchment-eyebrow">
        {corpusKeys}
        {corpusKeys && group ? " · " : null}
        {group && <span className="afh-parchment-eyebrow-group">{group}</span>}
      </p>

      <AutonymExonymHeading
        variant="parchment"
        autonym={hero.nameMain}
        predicate="un peuple sans bord"
      />

      {hero.historicalRegion && (
        <p className="afh-parchment-lede">{hero.historicalRegion}</p>
      )}

      <div className="afh-chips">
        {/* A population of zero is a fiche that declared none, not a people of
            nobody — so the chip goes rather than stating a figure. */}
        {countries.totalPopulation > 0 && (
          <span className="afh-chip">
            <span className="font-[family-name:var(--afh-font-mono)] tabular-nums">
              {populationFr.format(countries.totalPopulation)}
            </span>{" "}
            personnes
            {countries.referenceYear
              ? ` · réf. ${countries.referenceYear}`
              : ""}
          </span>
        )}
        <span className="afh-chip">{presenceCount} pays de présence</span>

        {/* 473 fiches argue in `whyProblematic` that their name was imposed;
            this is where that argument becomes something a reader can act on.
            No guard here on purpose — the badge renders nothing for a missing
            status and nothing for `consensual`, and duplicating that contract
            in the caller is how the two states drift apart. */}
        <ClassificationBadge status={hero.classificationStatus} />
      </div>

      {/* A fiche resting entirely on unverified sources is published and
          visibly marked as such — that is the intended outcome of the tier
          policy, not a defect, so the chip belongs in the head. */}
      {showConfidence && (
        <div className="mt-afh-sm">
          <ConfidenceChip
            confidenceScore={confidenceScore}
            sourceCount={sourceCount}
            lastHumanAuditAt={lastHumanAuditAt}
            variant="hero"
            id={hero.peopleId}
            ariaSuffix={`pour la fiche ${hero.nameMain}`}
          />
        </div>
      )}
    </header>
  );
}
