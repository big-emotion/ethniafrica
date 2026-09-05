import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import {
  PEOPLES_FACET_PAGE_SIZES,
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
import type { FacetActiveFilter } from "@/components/hubs/facets/FacetFilterBar";
import { FacetLetterRail } from "@/components/hubs/facets/FacetLetterRail";
import { FacetPagination } from "@/components/hubs/facets/FacetPagination";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { definedFilter, getFacetRoute } from "@/lib/hubs/facets";
import { PAGE_SIZE_PARAM, resolvePageSize } from "@/lib/hubs/pagination";
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
  search: "q",
  family: "famille",
  country: "pays",
  letter: "lettre",
  page: "page",
  size: PAGE_SIZE_PARAM,
} as const;

const countFormat = new Intl.NumberFormat("fr-FR");

/**
 * An address for this facet under a given selection.
 *
 * The path comes from the slug table and only the query is composed here, so
 * the next time the module moves this call site moves with it.
 */
function facetHref(
  language: Language,
  filters: PeoplesFacetFilters,
  page: number | null,
  pageSize: number
): string {
  const query = new URLSearchParams();
  if (filters.search) query.set(PARAM.search, filters.search);
  if (filters.familyId) query.set(PARAM.family, filters.familyId);
  if (filters.countryId) query.set(PARAM.country, filters.countryId);
  if (filters.letter) query.set(PARAM.letter, filters.letter);
  if (page && page > 1) query.set(PARAM.page, String(page));
  // The default is left out so the plainest reading keeps the plainest address,
  // and so the links already in circulation stay byte-for-byte what they were.
  if (pageSize !== PEOPLES_FACET_PAGE_SIZES[0]) {
    query.set(PARAM.size, String(pageSize));
  }

  const search = query.toString();
  const path = getFacetRoute(language, "peoples");
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
  const language = lang as Language;
  const query = (await searchParams) ?? {};

  const fiche = resolvePeopleDeepLink(language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  const chosenSearch = definedFilter(query[PARAM.search]);
  const filters: PeoplesFacetFilters = {
    familyId: definedFilter(query[PARAM.family]),
    countryId: definedFilter(query[PARAM.country]),
    letter: definedFilter(query[PARAM.letter]),
    ...(chosenSearch ? { search: chosenSearch } : {}),
  };
  const requestedPage = Number.parseInt(
    definedFilter(query[PARAM.page]) ?? "1",
    10
  );
  const pageSize = resolvePageSize(
    definedFilter(query[PARAM.size]),
    PEOPLES_FACET_PAGE_SIZES
  );

  const [choices, reading, index] = await Promise.all([
    getPeoplesFacetChoices(),
    getPeoplesFacetPage(requestedPage, filters, pageSize),
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
        href: getPeopleRoute(language, row.id),
      });
      countryIndex[key] = rows;
      narrowing[key] ??= facetHref(
        language,
        { ...filters, countryId },
        null,
        pageSize
      );
    }
  }

  const familyLabels = new Map(
    choices.families.map((family) => [family.id, family.label])
  );

  /**
   * What the fold owes back while it is shut. Pays is not here: it is on the
   * line, and a chip repeating a visible control would tell the reader nothing
   * they cannot already see.
   */
  const activeFilters: FacetActiveFilter[] = [];
  if (filters.familyId) {
    activeFilters.push({
      label: `Famille : ${familyLabels.get(filters.familyId) ?? filters.familyId}`,
      removeHref: facetHref(
        language,
        { ...filters, familyId: null },
        null,
        pageSize
      ),
    });
  }
  if (filters.letter) {
    activeFilters.push({
      label: `Lettre : ${filters.letter}`,
      removeHref: facetHref(
        language,
        { ...filters, letter: null },
        null,
        pageSize
      ),
    });
  }

  /** The pager's own address composer: same filters, only the page moves. */
  const pagerHref = (page: number, size: number) =>
    facetHref(language, filters, page, size);

  const pagination = (position: "top" | "bottom") => (
    <FacetPagination
      position={position}
      page={reading.page}
      pageCount={reading.totalPages}
      total={reading.total}
      pageSize={pageSize}
      pageSizes={PEOPLES_FACET_PAGE_SIZES}
      buildHref={pagerHref}
      unitLabel="peuples"
    />
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

      <div className="afh-facet-reading">
        {/* The eyebrow and the name belong to the shell, which prints them
            above the globe — see `FacetDefinition.title`. What stays here is
            the count, because it answers the filters directly below it and
            changes with them. */}
        <header className="afh-facet-reading-head">
          {/* One string rather than text around expressions: JSX drops the
              whitespace between an expression and the text that follows it on
              the next line, which reads as "803 peuplesdans cette sélection". */}
          <p className="afh-facet-reading-lede">{lede}</p>
        </header>

        {/* Pays stays on the line and famille folds, which is the order the
            axis above already runs in: a reader narrowing 803 peoples reaches
            for the country they know before the linguistic family they are
            here to learn. The globe applies the same `?pays=` this select
            submits, and the select still earns the line — aiming at a shape
            needs WebGL and a script, and this needs neither. */}
        <FacetFilterBar
          action={getFacetRoute(language, "peoples")}
          className="mt-4"
          searchField={{
            name: PARAM.search,
            label: "Rechercher un peuple",
            placeholder: "Nom du peuple",
            value: filters.search ?? null,
          }}
          primaryField={{
            name: PARAM.country,
            label: "Pays",
            anyLabel: "Tous les pays",
            options: choices.countries.map((country) => ({
              value: country.id,
              label: country.label,
            })),
            value: filters.countryId,
          }}
          advancedFields={[
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
          advancedSlot={{
            content: (
              <FacetLetterRail
                current={filters.letter}
                hrefFor={(letter) =>
                  facetHref(language, { ...filters, letter }, null, pageSize)
                }
              />
            ),
            activeCount: filters.letter ? 1 : 0,
          }}
          // The letter and the page size are set outside this form; without
          // them the reader loses both the moment they narrow by family. The
          // page number is deliberately absent — a new selection starts at one.
          preservedParams={{
            [PARAM.letter]: filters.letter,
            [PARAM.size]:
              pageSize === PEOPLES_FACET_PAGE_SIZES[0]
                ? undefined
                : String(pageSize),
          }}
          activeFilters={activeFilters}
        />

        {reading.peoples.length === 0 ? (
          <p data-testid="peoples-facet-empty" className="mt-6">
            Aucun peuple du corpus ne répond à cette sélection.{" "}
            <Link
              href={facetHref(
                language,
                { familyId: null, countryId: null, letter: null },
                null,
                pageSize
              )}
            >
              Revenir à tous les peuples
            </Link>
          </p>
        ) : (
          <>
            {pagination("top")}
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
                    href={getPeopleRoute(language, people.id)}
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
          </>
        )}

        {pagination("bottom")}
      </div>
    </>
  );
}
