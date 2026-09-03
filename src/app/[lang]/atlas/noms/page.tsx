import type { Metadata } from "next";
import Link from "next/link";

import {
  PATRONYMES_FACET_PAGE_SIZES,
  getPatronymesFacetChoices,
  getPatronymesFacetCountryIndex,
  getPatronymesFacetPage,
  type PatronymesFacetFilters,
} from "@/api/v2/services/patronymesFacet";
import { PublishFacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import type {
  FacetCountryIndex,
  FacetCountryNarrowing,
} from "@/components/hubs/facets/FacetCountryIndex";
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import type { FacetActiveFilter } from "@/components/hubs/facets/FacetFilterBar";
import { FacetLetterRail } from "@/components/hubs/facets/FacetLetterRail";
import { FacetPagination } from "@/components/hubs/facets/FacetPagination";
import { definedFilter, getFacetRoute } from "@/lib/hubs/facets";
import { PAGE_SIZE_PARAM, resolvePageSize } from "@/lib/hubs/pagination";
import { getLocalizedRoute, getPatronymeRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";
import type { CountryId } from "@/types/afrik";
import type { PatronymeNameSystem } from "@/api/v2/schemas/patronymes";

/**
 * The name facet of the atlas hub.
 *
 * It was the one corpus class with an index and no way to narrow it: thirty
 * rows, a prev/next pager of its own, no globe and no filters, beside three
 * sibling axes that share a shell. « Quels noms portent les Bamana » had no
 * control to ask it with, which is the question this axis exists for.
 *
 * The frame is not this page's. `FacetHubShell` owns the `PageLayout`, the
 * accent, the switcher and the single globe the facets share; a frame here
 * would be the second one on the page — which is exactly what this route had
 * while it rendered its own `PageLayout`, and why the registry entry and this
 * rewrite have to land together.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/** Query parameters, named as the reader sees them in the address bar. */
const PARAM = {
  search: "q",
  people: "peuple",
  country: "pays",
  system: "systeme",
  letter: "lettre",
  page: "page",
  size: PAGE_SIZE_PARAM,
} as const;

const t = translations.fr.patronymes;
const countFormat = new Intl.NumberFormat("fr-FR");

/**
 * What the reading counts, in the reader's word.
 *
 * Written here rather than read from `t.index`, which the facet inherits from
 * the index this page replaces: those two keys still hold « patronyme » — the
 * internal identifier DEC-038 keeps out of the interface — and a facet is a
 * new surface to print it on. `peuples/page.tsx` states its own unit the same
 * way, for the same reason: the unit belongs to the facet, not to the copy of
 * whatever the facet grew out of.
 */
const UNIT = { singular: "nom", plural: "noms" } as const;

// @req REQ-139
export const metadata: Metadata = {
  title: t.index.pageTitle,
  description: t.index.pageSubtitle,
  alternates: {
    canonical: getLocalizedRoute("fr", "patronymes"),
  },
};

/**
 * An address for this facet under a given selection.
 *
 * The path comes from the slug table and only the query is composed here, so
 * the next time the module moves this call site moves with it.
 */
function facetHref(
  filters: PatronymesFacetFilters,
  page: number | null,
  pageSize: number
): string {
  const query = new URLSearchParams();
  if (filters.search) query.set(PARAM.search, filters.search);
  if (filters.peopleId) query.set(PARAM.people, filters.peopleId);
  if (filters.countryId) query.set(PARAM.country, filters.countryId);
  if (filters.nameSystem) query.set(PARAM.system, filters.nameSystem);
  if (filters.letter) query.set(PARAM.letter, filters.letter);
  if (page && page > 1) query.set(PARAM.page, String(page));
  // The default is left out so the plainest reading keeps the plainest
  // address, and links already in circulation stay what they were.
  if (pageSize !== PATRONYMES_FACET_PAGE_SIZES[0]) {
    query.set(PARAM.size, String(pageSize));
  }

  const search = query.toString();
  const path = getFacetRoute("fr", "patronymes");
  return search ? `${path}?${search}` : path;
}

// @req REQ-139 @req REQ-133
export default async function NomsHubPage({
  searchParams,
}: {
  params?: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const query = (await searchParams) ?? {};

  const chosenSearch = definedFilter(query[PARAM.search]);
  const filters: PatronymesFacetFilters = {
    peopleId: definedFilter(query[PARAM.people]),
    countryId: definedFilter(query[PARAM.country]),
    nameSystem: definedFilter(
      query[PARAM.system]
    ) as PatronymeNameSystem | null,
    letter: definedFilter(query[PARAM.letter]),
    ...(chosenSearch ? { search: chosenSearch } : {}),
  };
  const requestedPage = Number.parseInt(
    definedFilter(query[PARAM.page]) ?? "1",
    10
  );
  const pageSize = resolvePageSize(
    definedFilter(query[PARAM.size]),
    PATRONYMES_FACET_PAGE_SIZES
  );

  let choices = { peoples: [], countries: [], nameSystems: [] } as Awaited<
    ReturnType<typeof getPatronymesFacetChoices>
  >;
  let reading = {
    patronymes: [],
    page: 1,
    total: 0,
    totalPages: 1,
  } as Awaited<ReturnType<typeof getPatronymesFacetPage>>;
  let index: Awaited<ReturnType<typeof getPatronymesFacetCountryIndex>> = [];
  let unavailable = false;

  try {
    [choices, reading, index] = await Promise.all([
      getPatronymesFacetChoices(),
      getPatronymesFacetPage(requestedPage, filters, pageSize),
      getPatronymesFacetCountryIndex(filters),
    ]);
  } catch {
    // Thirty names are always published, so a read failure is never an empty
    // corpus — say so explicitly rather than render "0 résultats".
    unavailable = true;
  }

  const countryIndex: FacetCountryIndex = {};
  /**
   * Built from the index's own keys, so the map can never offer a narrowing
   * that lands on an empty list: a country is addressable here exactly when
   * the current selection attests a name in it.
   */
  const narrowing: FacetCountryNarrowing = {};
  for (const row of index) {
    for (const countryId of row.countryIds) {
      const key = countryId as CountryId;
      const rows = countryIndex[key] ?? [];
      rows.push({
        id: row.id,
        label: row.nameMain,
        href: getPatronymeRoute("fr", row.id),
      });
      countryIndex[key] = rows;
      narrowing[key] ??= facetHref({ ...filters, countryId }, null, pageSize);
    }
  }

  const peopleLabels = new Map(
    choices.peoples.map((people) => [people.id, people.label])
  );

  /**
   * What the fold owes back while it is shut. Peuple is not here: it is on the
   * line, and a chip repeating a visible control tells the reader nothing.
   */
  const activeFilters: FacetActiveFilter[] = [];
  if (filters.countryId) {
    activeFilters.push({
      label: `Pays : ${filters.countryId}`,
      removeHref: facetHref({ ...filters, countryId: null }, null, pageSize),
    });
  }
  if (filters.nameSystem) {
    activeFilters.push({
      label: `Système : ${t.nameSystemLabels[filters.nameSystem]}`,
      removeHref: facetHref({ ...filters, nameSystem: null }, null, pageSize),
    });
  }
  if (filters.letter) {
    activeFilters.push({
      label: `Lettre : ${filters.letter}`,
      removeHref: facetHref({ ...filters, letter: null }, null, pageSize),
    });
  }

  const pagerHref = (page: number, size: number) =>
    facetHref(filters, page, size);

  const pagination = (position: "top" | "bottom") => (
    <FacetPagination
      position={position}
      page={reading.page}
      pageCount={reading.totalPages}
      total={reading.total}
      pageSize={pageSize}
      pageSizes={PATRONYMES_FACET_PAGE_SIZES}
      buildHref={pagerHref}
      unitLabel={UNIT.plural}
    />
  );

  const lede =
    `${countFormat.format(reading.total)} ` +
    `${reading.total === 1 ? UNIT.singular : UNIT.plural} ` +
    `dans cette sélection. Choisissez un pays sur le globe pour voir ceux qu'il atteste.`;

  if (unavailable) {
    return (
      <div className="afh-facet-reading">
        <p role="alert" className="afh-facet-reading-lede">
          {t.index.unavailable}
        </p>
      </div>
    );
  }

  return (
    <>
      <PublishFacetCountryIndex
        index={countryIndex}
        narrowing={narrowing}
        focused={filters.countryId as CountryId | null}
      />

      <div className="afh-facet-reading">
        {/* The eyebrow and the name belong to the shell, which prints them
            above the globe. What stays here is the count, because it answers
            the filters directly below it and changes with them. */}
        <header className="afh-facet-reading-head">
          <p className="afh-facet-reading-lede">{lede}</p>
        </header>

        {/* Peuple stays on the line and the rest folds: a name is documented
            through the peoples that carry it — 25 of the 30 dossiers name at
            least one — and « quels noms portent les Bamana » is the question
            this axis exists for. */}
        <FacetFilterBar
          action={getFacetRoute("fr", "patronymes")}
          className="mt-4"
          searchField={{
            name: PARAM.search,
            label: "Rechercher un nom",
            placeholder: "Nom, graphie attestée",
            value: filters.search ?? null,
          }}
          primaryField={{
            name: PARAM.people,
            label: "Peuple",
            anyLabel: "Tous les peuples",
            options: choices.peoples.map((people) => ({
              value: people.id,
              label: people.label,
            })),
            value: filters.peopleId,
          }}
          advancedFields={[
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
              name: PARAM.system,
              label: "Système de nommage",
              anyLabel: "Tous les systèmes",
              options: choices.nameSystems.map((system) => ({
                value: system.id,
                label: system.label,
              })),
              value: filters.nameSystem,
            },
          ]}
          advancedSlot={{
            content: (
              <FacetLetterRail
                current={filters.letter}
                hrefFor={(letter) =>
                  facetHref({ ...filters, letter }, null, pageSize)
                }
              />
            ),
            activeCount: filters.letter ? 1 : 0,
          }}
          preservedParams={{
            [PARAM.letter]: filters.letter,
            [PARAM.size]:
              pageSize === PATRONYMES_FACET_PAGE_SIZES[0]
                ? undefined
                : String(pageSize),
          }}
          activeFilters={activeFilters}
        />

        {reading.patronymes.length === 0 ? (
          <p data-testid="noms-facet-empty" className="mt-6">
            {/* Not `t.index.emptyState`, which says the corpus documents no
                name at all. Under a filter that is a different statement and a
                false one: thirty are published, and this selection reaches
                none of them. */}
            Aucun nom du corpus ne répond à cette sélection.{" "}
            <Link
              href={facetHref(
                {
                  peopleId: null,
                  countryId: null,
                  nameSystem: null,
                  letter: null,
                },
                null,
                pageSize
              )}
            >
              Revenir à tous les noms
            </Link>
          </p>
        ) : (
          <>
            {pagination("top")}
            <ul
              aria-label="Noms"
              className="mt-6 flex flex-col gap-2 p-0 md:grid md:grid-cols-2 xl:grid-cols-3"
            >
              {reading.patronymes.map((patronyme) => (
                <li key={patronyme.id} className="list-none">
                  <Link
                    href={getPatronymeRoute("fr", patronyme.id)}
                    prefetch={false}
                    className="block h-full rounded-afh-xl border border-afh-border bg-afh-surface p-4 focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
                  >
                    <span className="block text-afh-body font-semibold">
                      {patronyme.nameMain}
                    </span>
                    <span className="mt-2 block text-afh-small text-afh-text-soft">
                      {t.nameSystemLabels[patronyme.nameSystem]}
                    </span>
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
