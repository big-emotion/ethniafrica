import { getAdmin0NameFr } from "@/lib/atlas/overlays";
import type { CountryDistribution } from "@/types/afrik";

/**
 * The key to the field, and what the field leaves out.
 *
 * It used to print the fiche's whole roll of declared presences — every
 * country, with its population. That is the same field, in full, that
 * "Répartition géographique" prints further down, where each country also
 * carries its share, the fiche's own note on where inside it the people are,
 * a link to the country and the source line. Two rolls of the same list, and
 * the shorter one won by being nearer the map.
 *
 * What only the map's own key can say is what the map does not draw. 38
 * declared presences across 24 fiches sit outside the atlas's Africa scope;
 * naming them here is what keeps the fiche's count of countries from
 * disagreeing with what the reader can see. `getAdmin0NameFr` is the resolver
 * the globe draws with, so the two cannot fall out of step.
 */
// @req REQ-116
export function PeopleFieldLegend({
  distribution,
}: {
  distribution: CountryDistribution[] | undefined;
}) {
  if (!distribution || distribution.length === 0) return null;

  const offMap = distribution
    .filter((entry) => !getAdmin0NameFr(entry.country))
    .map((entry) => entry.country);

  return (
    <div className="flex flex-col gap-afh-xs">
      <p className="flex items-center gap-afh-xs text-afh-small text-afh-text-soft">
        <span
          aria-hidden="true"
          className="inline-block h-3 w-7 rounded-afh-full"
          style={{
            background: "linear-gradient(to right, var(--accent), transparent)",
          }}
        />
        Densité décroissante, bord nul
      </p>
      {offMap.length > 0 && (
        <p
          data-testid="people-field-off-map"
          className="text-afh-small text-afh-text-soft"
        >
          {offMap.length === 1
            ? "Une présence déclarée est hors carte, l'atlas ne couvrant que l'Afrique :"
            : `${offMap.length} présences déclarées sont hors carte, l'atlas ne couvrant que l'Afrique :`}{" "}
          {offMap.join(", ")}.
        </p>
      )}
    </div>
  );
}
