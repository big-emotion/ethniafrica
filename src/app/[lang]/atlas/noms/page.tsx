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
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import type { FacetActiveFilter } from "@/components/hubs/facets/FacetFilterBar";
import { FacetLetterRail } from "@/components/hubs/facets/FacetLetterRail";
import { FacetPagination } from "@/components/hubs/facets/FacetPagination";
import { buildFacetCountryIndex, readFacet } from "@/lib/hubs/facetHub";
import { definedFilter, getFacetRoute } from "@/lib/hubs/facets";
import { PAGE_SIZE_PARAM, resolvePageSize } from "@/lib/hubs/pagination";
import { getLocalizedRoute, getPatronymeRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { CountryId } from "@/types/afrik";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import { formatNumber } from "@/lib/languageTag";
import { facetDirectoriesCopy } from "@/lib/i18n/copy/facetDirectories";
import type { Language } from "@/types/shared";
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

interface PageProps {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}

// @req REQ-139
// @req REQ-141
export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const t = getTranslation(lang as Language).patronymes;
  const copy = { title: t.index.pageTitle, description: t.index.pageSubtitle };
  return {
    ...copy,
    ...surfaceHead(
      lang as Language,
      "patronymes",
      (locale) => getLocalizedRoute(locale, "patronymes"),
      copy
    ),
  };
}

/**
 * An address for this facet under a given selection.
 *
 * The path comes from the slug table and only the query is composed here, so
 * the next time the module moves this call site moves with it.
 */
function facetHref(
  language: Language,
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
  const path = getFacetRoute(language, "patronymes");
  return search ? `${path}?${search}` : path;
}

// @req REQ-139 @req REQ-133
export default async function NomsHubPage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const count = (value: number) => formatNumber(language, value);
  const t = getTranslation(language).patronymes;
  const copy = facetDirectoriesCopy[language].names;
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

  const facetReading = await readFacet(() =>
    Promise.all([
      getPatronymesFacetChoices(),
      getPatronymesFacetPage(requestedPage, filters, pageSize),
      getPatronymesFacetCountryIndex(filters),
    ])
  );

  // Thirty names are always published, so a read failure is never an empty
  // corpus — say so explicitly rather than render "0 résultats".
  if (facetReading === null) {
    return (
      <div className="afh-facet-reading">
        <p role="alert" className="afh-facet-reading-lede">
          {t.index.unavailable}
        </p>
      </div>
    );
  }

  const [choices, reading, index] = facetReading;
  const { index: countryIndex, narrowing } = buildFacetCountryIndex(index, {
    label: (row) => row.nameMain,
    href: (row) => getPatronymeRoute(language, row.id),
    narrowHref: (countryId) =>
      facetHref(language, { ...filters, countryId }, null, pageSize),
  });

  /**
   * What the fold owes back while it is shut. Peuple is not here: it is on the
   * line, and a chip repeating a visible control tells the reader nothing.
   */
  const activeFilters: FacetActiveFilter[] = [];
  if (filters.countryId) {
    activeFilters.push({
      label: `${copy.countryFilter}: ${filters.countryId}`,
      removeHref: facetHref(
        language,
        { ...filters, countryId: null },
        null,
        pageSize
      ),
    });
  }
  if (filters.nameSystem) {
    activeFilters.push({
      label: `${copy.systemFilter}: ${t.nameSystemLabels[filters.nameSystem]}`,
      removeHref: facetHref(
        language,
        { ...filters, nameSystem: null },
        null,
        pageSize
      ),
    });
  }
  if (filters.letter) {
    activeFilters.push({
      label: `${copy.letterFilter}: ${filters.letter}`,
      removeHref: facetHref(
        language,
        { ...filters, letter: null },
        null,
        pageSize
      ),
    });
  }

  const pagerHref = (page: number, size: number) =>
    facetHref(language, filters, page, size);

  const pagination = (position: "top" | "bottom") => (
    <FacetPagination
      language={language}
      position={position}
      page={reading.page}
      pageCount={reading.totalPages}
      total={reading.total}
      pageSize={pageSize}
      pageSizes={PATRONYMES_FACET_PAGE_SIZES}
      buildHref={pagerHref}
      unitLabel={copy.plural}
    />
  );

  const lede = copy.lede(count(reading.total), reading.total === 1);

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
          action={getFacetRoute(language, "patronymes")}
          className="mt-4"
          searchField={{
            name: PARAM.search,
            label: copy.searchLabel,
            placeholder: copy.searchPlaceholder,
            value: filters.search ?? null,
          }}
          primaryField={{
            name: PARAM.people,
            label: copy.people,
            anyLabel: copy.allPeoples,
            options: choices.peoples.map((people) => ({
              value: people.id,
              label: people.label,
            })),
            value: filters.peopleId,
          }}
          advancedFields={[
            {
              name: PARAM.country,
              label: copy.country,
              anyLabel: copy.allCountries,
              options: choices.countries.map((country) => ({
                value: country.id,
                label: country.label,
              })),
              value: filters.countryId,
            },
            {
              name: PARAM.system,
              label: copy.system,
              anyLabel: copy.allSystems,
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
                language={language}
                current={filters.letter}
                hrefFor={(letter) =>
                  facetHref(language, { ...filters, letter }, null, pageSize)
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
            {copy.empty}{" "}
            <Link
              href={facetHref(
                language,
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
              {copy.reset}
            </Link>
          </p>
        ) : (
          <>
            {pagination("top")}
            <ul
              aria-label={copy.listLabel}
              className="mt-6 flex flex-col gap-2 p-0 md:grid md:grid-cols-2 xl:grid-cols-3"
            >
              {reading.patronymes.map((patronyme) => (
                <li key={patronyme.id} className="list-none">
                  <Link
                    href={getPatronymeRoute(language, patronyme.id)}
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
