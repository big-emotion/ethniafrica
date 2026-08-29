import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import { PublishFacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import type { FacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import {
  getCountryFacetSelection,
  parseCountryFacetSort,
} from "@/api/v2/services/countryFacet";
import type { CountryFacetRow } from "@/api/v2/services/countryFacet";
import { definedFilter, getFacetRoute } from "@/lib/hubs/facets";
import { getCountryRoute, resolveCountryDeepLink } from "@/lib/routing";
import type { CountryId } from "@/types/afrik";
import type { Language } from "@/types/shared";

/**
 * The countries facet of the unified Explorer hub.
 *
 * This file exists to take the route out of the `[section]` catch-all. That
 * fall-through was the whole reason the directory could open a country in a
 * detail pane of its own: a second country surface, with no globe and its
 * dossier folded behind a disclosure, reached from the main navigation while
 * the atlas fiche sat one URL away.
 *
 * The globe is no longer this page's. `FacetHubShell` mounts one for all three
 * facets, so that switching to peoples or families repaints the reading and
 * leaves the map standing; this page publishes what the map should say about a
 * country when one is chosen. On this facet that is the country itself, which
 * is why the entry is a single row: the panel's job is to open the fiche, and a
 * hub exists to be left.
 *
 * What the page owes beyond that index is the half the map cannot be. Aiming at
 * a shape is no way into a country for a reader on a keyboard, on a page whose
 * script has not run, or on a device with no WebGL — so the list below is the
 * facet's guaranteed access path and the globe is the second one. A country the
 * admin-0 asset cannot draw is still listed, which is the whole point of that
 * ordering.
 *
 * The redirect below is a net for links already sent — nothing in the app emits
 * the query form any more. It runs on the server, before any render, so it also
 * catches readers arriving from outside and crawlers, which a client-side guard
 * would have served the directory to first.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/** The query parameters the facet's filters travel under, in the reader's own language. */
const FAMILY_PARAM = "famille";
const SORT_PARAM = "tri";

/**
 * One country, as a row that opens its fiche.
 *
 * A plain anchor and nothing else. Charter rule: the map opens the panel and
 * the list does not — a row that opened a pane would put the hub's own detail
 * surface back between the reader and the fiche, which is the failure this
 * route was split out to end.
 */
function CountryRow({ row }: { row: CountryFacetRow }) {
  return (
    <li>
      <Link
        href={getCountryRoute("fr", row.id)}
        className="flex min-h-11 items-baseline justify-between gap-3 rounded-afh-lg border border-afh-border bg-afh-surface px-4 py-3 text-afh-body text-afh-text"
      >
        <span>{row.label}</span>
        <span className="text-afh-caption text-afh-text-soft font-mono tabular-nums">
          {row.documentedPeopleCount}
          <span className="sr-only"> peuples documentés</span>
        </span>
      </Link>
    </li>
  );
}

// @req REQ-091
export default async function PaysHubPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolveCountryDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  const chosenFamily = definedFilter(query[FAMILY_PARAM]);
  const chosenSort = parseCountryFacetSort(definedFilter(query[SORT_PARAM]));

  const selection = await getCountryFacetSelection({
    languageFamilyId: chosenFamily,
    sort: chosenSort,
  });

  /** The facet under the current family, with the order back to its default. */
  const withoutSort = chosenFamily
    ? `${getFacetRoute("fr", "countries")}?${new URLSearchParams({ [FAMILY_PARAM]: chosenFamily })}`
    : getFacetRoute("fr", "countries");

  // The index the shared map reads is built from the *filtered* rows, never
  // from the corpus behind them: publishing everything would make a click on
  // the globe answer with a country the list on the same page has excluded.
  const countryIndex: FacetCountryIndex = Object.fromEntries(
    selection.rows.map((row) => [
      row.id as CountryId,
      [
        {
          id: row.id,
          label: row.label,
          href: getCountryRoute("fr", row.id),
        },
      ],
    ])
  );

  const filtered = selection.rows.length !== selection.totalCountries;

  return (
    <>
      <PublishFacetCountryIndex index={countryIndex} />

      <div className="afh-facet-reading">
        {/* The eyebrow and the name belong to the shell, which prints them
            above the globe — see `FacetDefinition.title`. What stays here is
            the count, because it answers the filters directly below it and
            changes with them. */}
        <header className="afh-facet-reading-head">
          <p className="afh-facet-reading-lede">
            {selection.totalCountries} pays au corpus
            {filtered && ` · ${selection.rows.length} dans cette sélection`}.
            Choisissez-en un sur le globe ou dans la liste pour ouvrir sa fiche.
          </p>
        </header>

        <section className="afh-facet-reading-section">
          <FacetFilterBar
            action={getFacetRoute("fr", "countries")}
            submitLabel="Appliquer"
            primaryField={{
              name: FAMILY_PARAM,
              label: "Famille linguistique",
              anyLabel: "Toutes les familles",
              options: selection.familyOptions,
              value: chosenFamily,
            }}
            advancedFields={[
              {
                // The empty option *is* the alphabetical order rather than an
                // absent one: a list always has some order, so "no sort" would
                // name a state the page cannot be in.
                name: SORT_PARAM,
                label: "Tri",
                anyLabel: "Nom (A → Z)",
                options: [
                  {
                    value: "peuples",
                    label: "Peuples documentés (décroissant)",
                  },
                ],
                value: chosenSort === "peuples" ? "peuples" : null,
              },
            ]}
            activeFilters={
              chosenSort === "peuples"
                ? [
                    {
                      label: "Tri : peuples documentés",
                      removeHref: withoutSort,
                    },
                  ]
                : []
            }
          />

          {selection.rows.length === 0 ? (
            <p data-testid="country-facet-empty" className="mt-4">
              Aucun pays du corpus ne porte cette famille linguistique.
            </p>
          ) : (
            // No pagination, and that is a decision rather than an omission:
            // the corpus holds 54 countries, and the facet's point is that the
            // continent can be read at once. It is also what makes the ordering
            // above honest — the page never holds a slice of a larger set, so
            // sorting the selection is sorting all of it.
            <ul
              data-testid="country-facet-list"
              className="mt-4 grid list-none grid-cols-1 gap-2 p-0 md:grid-cols-2 xl:grid-cols-3"
            >
              {selection.rows.map((row) => (
                <CountryRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
