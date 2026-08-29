import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import {
  getPeoplesFacetChoices,
  getPeoplesFacetCountryIndex,
  getPeoplesFacetPage,
  type PeoplesFacetFilters,
} from "@/api/v2/services/peoplesFacet";
import { PublishFacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import type {
  FacetCountryIndex,
  FacetCountryNarrowing,
} from "@/components/hubs/facets/FacetCountryIndex";
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { definedFilter, getFacetRoute } from "@/lib/hubs/facets";
import { getPeopleRoute, resolvePeopleDeepLink } from "@/lib/routing";
import type { CountryId, People } from "@/types/afrik";
import type { Language } from "@/types/shared";

/**
 * The peoples facet of the unified Explorer hub.
 *
 * A server component, and every narrowing it offers goes to the database. The
 * client directory it replaces fetched a page of twenty and then dropped the
 * rows whose countries did not match the one chosen, against a total that
 * still counted the whole corpus — so a country filter showed "whichever of
 * the first twenty happen to be Ghanaian" and offered pages of a set nobody
 * was looking at. Filtering where the rows come from is the whole difference,
 * and it is also what makes a filtered view addressable: the reading a reader
 * is looking at has a URL they can send.
 *
 * The frame is not this page's. `FacetHubShell` owns the `PageLayout`, the
 * terre accent, the facet switcher and the single globe the three facets
 * share; a frame here would be the second one on the page. What this route
 * owes is the reading, and the index the shared map reads — which peoples the
 * current selection has in each country, and what each one opens.
 *
 * The redirect below is a net for links already sent — nothing in the app
 * emits the query form any more. It runs on the server, before any render, so
 * it also catches readers arriving from outside and crawlers, which a
 * client-side guard would have served the directory to first.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/** Query parameters, named as the reader sees them in the address bar. */
const PARAM = {
  family: "famille",
  country: "pays",
  letter: "lettre",
  page: "page",
} as const;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const countFormat = new Intl.NumberFormat("fr-FR");

/**
 * An address for this facet under a given selection.
 *
 * The path comes from the slug table and only the query is composed here, so
 * the next time the module moves this call site moves with it.
 */
function facetHref(filters: PeoplesFacetFilters, page: number | null): string {
  const query = new URLSearchParams();
  if (filters.familyId) query.set(PARAM.family, filters.familyId);
  if (filters.countryId) query.set(PARAM.country, filters.countryId);
  if (filters.letter) query.set(PARAM.letter, filters.letter);
  if (page && page > 1) query.set(PARAM.page, String(page));

  const search = query.toString();
  const path = getFacetRoute("fr", "peoples");
  return search ? `${path}?${search}` : path;
}

/** The autonym the fiche opens on, when the corpus records one. */
function selfAppellationOf(people: People): string | undefined {
  return people.content?.appellations?.selfAppellation || undefined;
}

// @req REQ-091
export default async function PeuplesHubPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolvePeopleDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  const filters: PeoplesFacetFilters = {
    familyId: definedFilter(query[PARAM.family]),
    countryId: definedFilter(query[PARAM.country]),
    letter: definedFilter(query[PARAM.letter]),
  };
  const requestedPage = Number.parseInt(
    definedFilter(query[PARAM.page]) ?? "1",
    10
  );

  const [choices, reading, index] = await Promise.all([
    getPeoplesFacetChoices(),
    getPeoplesFacetPage(requestedPage, filters),
    getPeoplesFacetCountryIndex(filters),
  ]);

  const countryIndex: FacetCountryIndex = {};
  /**
   * Built from the index's own keys, so the map can never offer a narrowing
   * that lands on an empty list: a country is addressable here exactly when
   * the current selection documents a peuple in it. The rest of the filters
   * ride along — narrowing by country from the map keeps the family and the
   * letter the reader had already set.
   */
  const narrowing: FacetCountryNarrowing = {};
  for (const row of index) {
    for (const countryId of row.countryIds) {
      const key = countryId as CountryId;
      const rows = countryIndex[key] ?? [];
      rows.push({
        id: row.id,
        label: row.nameMain,
        href: getPeopleRoute("fr", row.id),
      });
      countryIndex[key] = rows;
      narrowing[key] ??= facetHref({ ...filters, countryId }, null);
    }
  }

  const familyLabels = new Map(
    choices.families.map((family) => [family.id, family.label])
  );

  const lede =
    `${countFormat.format(reading.total)} ` +
    `${reading.total === 1 ? "peuple" : "peuples"} dans cette sélection. ` +
    `Choisissez un pays sur le globe pour voir ceux qu'il documente.`;

  return (
    <>
      <PublishFacetCountryIndex
        index={countryIndex}
        narrowing={narrowing}
        focused={filters.countryId as CountryId | null}
      />

      <div className="afh-parchment">
        {/* The eyebrow and the name belong to the shell, which prints them
            above the globe — see `FacetDefinition.title`. What stays here is
            the count, because it answers the filters directly below it and
            changes with them. */}
        <header className="afh-parchment-head">
          {/* One string rather than text around expressions: JSX drops the
              whitespace between an expression and the text that follows it on
              the next line, which reads as "803 peuplesdans cette sélection". */}
          <p className="afh-parchment-lede">{lede}</p>
        </header>

        <FacetFilterBar
          action={getFacetRoute("fr", "peoples")}
          className="mt-4"
          fields={[
            {
              name: PARAM.country,
              label: "Pays",
              anyLabel: "Tous les pays",
              options: choices.countries.map((country) => ({
                value: country.id,
                label: country.label,
              })),
              value: filters.countryId,
            },
            {
              name: PARAM.family,
              label: "Famille linguistique",
              anyLabel: "Toutes les familles",
              options: choices.families.map((family) => ({
                value: family.id,
                label: family.label,
              })),
              value: filters.familyId,
            },
          ]}
        />

        {/* Anchors, not buttons: a letter is a reading of the corpus, so it has
            an address — and the rail then works before hydration and can be
            followed by a crawler. */}
        <nav aria-label="Première lettre" className="mt-4">
          <ul className="flex flex-wrap gap-1">
            <li>
              <Link
                href={facetHref({ ...filters, letter: null }, null)}
                aria-current={filters.letter ? undefined : "page"}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-afh-caption"
                style={
                  filters.letter
                    ? { backgroundColor: "var(--accent-tint)" }
                    : {
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground)",
                      }
                }
              >
                Tous
              </Link>
            </li>
            {ALPHABET.map((letter) => {
              const current = filters.letter === letter;
              return (
                <li key={letter}>
                  <Link
                    href={facetHref({ ...filters, letter }, null)}
                    aria-current={current ? "page" : undefined}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-afh-caption"
                    style={
                      current
                        ? {
                            backgroundColor: "var(--accent)",
                            color: "var(--accent-foreground)",
                          }
                        : { backgroundColor: "var(--accent-tint)" }
                    }
                  >
                    {letter}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {reading.peoples.length === 0 ? (
          <p data-testid="peoples-facet-empty" className="mt-6">
            Aucun peuple du corpus ne répond à cette sélection.{" "}
            <Link
              href={facetHref(
                { familyId: null, countryId: null, letter: null },
                null
              )}
            >
              Revenir à tous les peuples
            </Link>
          </p>
        ) : (
          <ul
            aria-label="Peuples"
            className="mt-6 flex flex-col gap-2 p-0 md:grid md:grid-cols-2 xl:grid-cols-3"
          >
            {reading.peoples.map((people) => (
              <li key={people.id} className="list-none">
                {/* The whole row is one anchor. A card with an onClick reached
                    no keyboard and left the directory with zero followable
                    links to a fiche. */}
                <Link
                  href={getPeopleRoute("fr", people.id)}
                  prefetch={false}
                  className="block h-full rounded-afh-xl border border-afh-border bg-afh-surface p-4 focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
                >
                  <AutonymExonymHeading
                    variant="compact"
                    exonym={people.nameMain}
                    autonym={selfAppellationOf(people)}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-afh-small text-afh-text-soft">
                    {people.classificationStatus && (
                      <ClassificationBadge
                        status={people.classificationStatus}
                      />
                    )}
                    {familyLabels.get(people.languageFamilyId) && (
                      <span>{familyLabels.get(people.languageFamilyId)}</span>
                    )}
                    {people.currentCountries?.length > 0 && (
                      <span>{people.currentCountries.join(" · ")}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {reading.totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-6 flex items-center gap-3">
            {reading.page > 1 && (
              <Link href={facetHref(filters, reading.page - 1)}>
                Page précédente
              </Link>
            )}
            <span>
              Page {reading.page} sur {reading.totalPages}
            </span>
            {reading.page < reading.totalPages && (
              <Link href={facetHref(filters, reading.page + 1)}>
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
