import { getAdmin0NameFr } from "@/lib/atlas/overlays";
import type { CountryDistribution } from "@/types/afrik";

const populationFr = new Intl.NumberFormat("fr-FR");

interface LegendRow {
  countryId: string;
  label: string;
  population: number;
  drawn: boolean;
}

/**
 * The key to the field, and the fiche's full roll of declared presences.
 *
 * It resolves what is drawable through `getAdmin0NameFr` — the same resolver
 * the globe draws with — so the list and the map cannot end up disagreeing
 * about which countries exist. A presence outside the atlas's Africa scope is
 * listed and marked "hors carte" rather than omitted: 38 of them sit across 24
 * fiches, and dropping them would make the fiche's own count of countries
 * disagree with what the reader can see.
 */
// @req REQ-116
export function PeopleFieldLegend({
  distribution,
}: {
  distribution: CountryDistribution[] | undefined;
}) {
  if (!distribution || distribution.length === 0) return null;

  const rows: LegendRow[] = distribution
    .map((entry) => {
      const nameFr = getAdmin0NameFr(entry.country);
      return {
        countryId: entry.country,
        // An off-map country has no French name in the asset, so its ISO code
        // is all there is — and showing that beats showing nothing.
        label: nameFr ?? entry.country,
        population: entry.population ?? 0,
        drawn: Boolean(nameFr),
      };
    })
    // Drawable first, then by population: the reader scans what is on the map
    // before what is only in the record.
    .sort((a, b) =>
      a.drawn === b.drawn
        ? b.population - a.population
        : Number(b.drawn) - Number(a.drawn)
    );

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
      <ul className="flex flex-col gap-afh-xs text-afh-small text-afh-text-soft">
        {rows.map((row) => (
          <li
            key={row.countryId}
            data-legend-drawn={row.drawn ? "true" : "false"}
            className="flex flex-wrap items-baseline gap-afh-xs"
          >
            <span>{row.label}</span>
            <span className="font-[family-name:var(--afh-font-mono)] tabular-nums">
              {populationFr.format(row.population)}
            </span>
            {!row.drawn && (
              <span className="text-afh-caption uppercase tracking-wide">
                hors carte
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
