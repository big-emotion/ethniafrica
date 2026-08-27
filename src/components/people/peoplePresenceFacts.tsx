import type { AtlasTargetFacts } from "@/components/atlas/AtlasGlobe";
import { sectionIdForPanel } from "@/components/fiche/panelRegistry";
import { inCountry } from "@/lib/atlas/countryPreposition";
import { getAdmin0NameFr } from "@/lib/atlas/overlays";
import type { CountryId, GlobalDemographySection } from "@/types/afrik";

const populationFr = new Intl.NumberFormat("fr-FR");
const shareFr = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * What the fiche puts in the globe's panel for each country of presence.
 *
 * Built as data rather than as a resolver, because the route that calls it is
 * a server component and AtlasGlobe is a client one — a function cannot cross
 * that boundary, so a builder would be unusable from the only caller there is.
 *
 * Everything here is derived from `demography`, never authored: the share is
 * the country's declared population over the fiche's own total, and the
 * reference year is the fiche's. A panel that quoted a figure the corpus did
 * not state would be the fiche disagreeing with itself.
 */
// @req REQ-117
export function buildPeoplePresenceFacts({
  peopleName,
  demography,
}: {
  peopleName: string;
  peopleId: string;
  demography: GlobalDemographySection | undefined;
}): Partial<Record<CountryId, AtlasTargetFacts>> {
  const distribution = demography?.distributionByCountry ?? [];
  if (distribution.length === 0) return {};

  const total = demography?.totalPopulation ?? 0;
  // 394 of the corpus's 789 fiches declare exactly one country. There the
  // share is always 100 %, which informs of nothing and invites a comparison
  // that does not exist — so it is dropped rather than shown flat.
  const showsShare = distribution.length > 1 && total > 0;

  const facts: Partial<Record<CountryId, AtlasTargetFacts>> = {};

  for (const entry of distribution) {
    const nameFr = getAdmin0NameFr(entry.country) ?? entry.country;
    const population = entry.population ?? 0;
    const share = total > 0 ? (population / total) * 100 : 0;

    facts[entry.country] = {
      title: `${peopleName} ${inCountry(entry.country, nameFr)}`,
      description: `${entry.country} · présence déclarée, sans tracé de limite`,
      body: (
        <div className="flex flex-col gap-afh-sm text-afh-small">
          <div>
            <dt className="text-afh-caption uppercase tracking-wide">
              Population déclarée
            </dt>
            <dd className="font-[family-name:var(--afh-font-mono)] text-afh-h3 tabular-nums">
              {populationFr.format(population)}
            </dd>
          </div>

          {showsShare && (
            <div>
              {/* The people is named in the panel's own title, so repeating
                  it here would render the name bare — which afh/no-bare-people-name
                  forbids for good reason: an exonym must never appear without
                  the autonym AutonymExonymHeading carries. */}
              <dt className="text-afh-caption uppercase tracking-wide">
                Part de l&apos;ensemble du peuple
              </dt>
              <dd className="flex items-center gap-afh-xs">
                <span className="font-[family-name:var(--afh-font-mono)] tabular-nums">
                  {shareFr.format(share)}&nbsp;%
                </span>
                <span
                  aria-hidden="true"
                  className="h-1.5 flex-1 rounded-afh-full"
                  style={{ backgroundColor: "var(--afh-night-line)" }}
                >
                  <span
                    className="block h-full rounded-afh-full"
                    style={{
                      width: `${Math.min(share, 100)}%`,
                      backgroundColor: "var(--accent)",
                    }}
                  />
                </span>
              </dd>
            </div>
          )}

          {/* Without this the halo reads as a fuzzy territory, which is the
              one thing the encoding exists to avoid claiming. */}
          <div>
            <dt className="text-afh-caption uppercase tracking-wide">
              Ce que le halo dit
            </dt>
            <dd>
              Le rayon suit la racine de la population, donc l&apos;aire suit la
              population. Le bord vaut zéro : il n&apos;y a pas de limite à
              lire.
            </dd>
          </div>

          {demography?.referenceYear && (
            <p className="text-afh-caption">Réf. {demography.referenceYear}</p>
          )}

          {/* Anchored on the record section rather than the top of the page:
              a reader who came for this country should land on the prose, not
              back on the globe they just left. */}
          <a
            href={`#${sectionIdForPanel("record")}`}
            className="underline underline-offset-2"
          >
            Lire la fiche complète →
          </a>
        </div>
      ),
    };
  }

  return facts;
}
