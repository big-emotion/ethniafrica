import type { Metadata } from "next";
import Link from "next/link";

import {
  LANGUAGES_FACET_PAGE_SIZES,
  getLanguagesFacetChoices,
  getLanguagesFacetCountryIndex,
  getLanguagesFacetPage,
  type LanguagesFacetFilters,
} from "@/api/v2/services/languagesFacet";
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
import { getLanguageRoute, getLocalizedRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { CountryId } from "@/types/afrik";
import type { Language } from "@/types/shared";

/**
 * The language facet of the atlas hub.
 *
 * What it replaces fetched the whole corpus on every render — 748 rows with an
 * embedded family join — then filtered by letter and paged in memory, with
 * `perPage: 1000` sitting exactly on PostgREST's max-rows ceiling, where a
 * truncated page and a last page are indistinguishable. Every narrowing now
 * goes to the database, which is also what makes a narrowed view addressable:
 * the reading a reader is looking at has a URL they can send.
 *
 * The country filter is the one that has no join table behind it. Nothing
 * links a language to a country, and nothing should: the footprint is derived
 * through the peoples that speak it and cached hourly — the rule
 * `getLanguageFamilyPresence` already states one rung up the same hierarchy.
 *
 * The frame is not this page's. `FacetHubShell` owns the `PageLayout`, the
 * accent, the switcher and the single globe the facets share; a frame here
 * would be the second one on the page, which is why the registry entry, this
 * rewrite and `loading.tsx` have to land in one commit.
 */

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

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<PageSearchParams>;
}

// @req REQ-139
export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const t = getTranslation(lang as Language).languages;
  return {
    title: t.pageTitle,
    description: t.pageSubtitle,
    alternates: {
      canonical: getLocalizedRoute(lang as Language, "languages"),
    },
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
  filters: LanguagesFacetFilters,
  page: number | null,
  pageSize: number
): string {
  const query = new URLSearchParams();
  if (filters.search) query.set(PARAM.search, filters.search);
  if (filters.familyId) query.set(PARAM.family, filters.familyId);
  if (filters.countryId) query.set(PARAM.country, filters.countryId);
  if (filters.letter) query.set(PARAM.letter, filters.letter);
  if (page && page > 1) query.set(PARAM.page, String(page));
  // The default is left out so the plainest reading keeps the plainest
  // address, and links already in circulation stay what they were.
  if (pageSize !== LANGUAGES_FACET_PAGE_SIZES[0]) {
    query.set(PARAM.size, String(pageSize));
  }

  const search = query.toString();
  const path = getFacetRoute(language, "languages");
  return search ? `${path}?${search}` : path;
}

// @req REQ-139 @req REQ-136
export default async function LanguesHubPage({
  params,
  searchParams,
}: PageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const t = getTranslation(language).languages;
  const query = (await searchParams) ?? {};

  const chosenSearch = definedFilter(query[PARAM.search]);
  const rawLetter = definedFilter(query[PARAM.letter]);
  const filters: LanguagesFacetFilters = {
    familyId: definedFilter(query[PARAM.family]),
    countryId: definedFilter(query[PARAM.country]),
    // Declared, never offered as a control: 1.61 peoples per language, and
    // only 261 of 753 have more than one, so the select would be a lookup and
    // not a narrowing — see `LanguagesFacetFilters`.
    peopleId: null,
    letter:
      rawLetter && /^[A-Za-z]$/.test(rawLetter)
        ? rawLetter.toUpperCase()
        : null,
    ...(chosenSearch ? { search: chosenSearch } : {}),
  };
  const requestedPage = Number.parseInt(
    definedFilter(query[PARAM.page]) ?? "1",
    10
  );
  const pageSize = resolvePageSize(
    definedFilter(query[PARAM.size]),
    LANGUAGES_FACET_PAGE_SIZES
  );

  let choices = { families: [], countries: [] } as Awaited<
    ReturnType<typeof getLanguagesFacetChoices>
  >;
  let reading = { languages: [], page: 1, total: 0, totalPages: 1 } as Awaited<
    ReturnType<typeof getLanguagesFacetPage>
  >;
  let index: Awaited<ReturnType<typeof getLanguagesFacetCountryIndex>> = [];
  let unavailable = false;

  try {
    [choices, reading, index] = await Promise.all([
      getLanguagesFacetChoices(),
      getLanguagesFacetPage(requestedPage, filters, pageSize),
      getLanguagesFacetCountryIndex(filters),
    ]);
  } catch {
    // Zero is a valid total; a failed read is not. The unavailability state
    // below must never render as an empty (0-result) corpus.
    unavailable = true;
  }

  const countryIndex: FacetCountryIndex = {};
  /**
   * Built from the index's own keys, so the map can never offer a narrowing
   * that lands on an empty list: a country is addressable here exactly when
   * the current selection places a language in it.
   */
  const narrowing: FacetCountryNarrowing = {};
  for (const row of index) {
    for (const countryId of row.countryIds) {
      const key = countryId as CountryId;
      const rows = countryIndex[key] ?? [];
      rows.push({
        id: row.id,
        label: row.name,
        href: getLanguageRoute(language, row.id),
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
   * line, and a chip repeating a visible control tells the reader nothing.
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

  const pagerHref = (page: number, size: number) =>
    facetHref(language, filters, page, size);

  const pagination = (position: "top" | "bottom") => (
    <FacetPagination
      position={position}
      page={reading.page}
      pageCount={reading.totalPages}
      total={reading.total}
      pageSize={pageSize}
      pageSizes={LANGUAGES_FACET_PAGE_SIZES}
      buildHref={pagerHref}
      unitLabel={t.range.languagesPlural}
    />
  );

  const lede =
    `${countFormat.format(reading.total)} ` +
    `${reading.total === 1 ? t.range.languagesSingular : t.range.languagesPlural} ` +
    `dans cette sélection. Choisissez un pays sur le globe pour voir celles qu'on y parle.`;

  if (unavailable) {
    return (
      <div className="afh-facet-reading">
        <p role="status" className="afh-facet-reading-lede">
          {t.unavailable}
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

        {/* Pays stays on the line and famille folds, as on the peoples facet:
            a reader narrowing 748 languages reaches for the country they know
            before the linguistic family they are here to learn. */}
        <FacetFilterBar
          action={getFacetRoute(language, "languages")}
          className="mt-4"
          searchField={{
            name: PARAM.search,
            label: "Rechercher une langue",
            placeholder: "Nom de la langue, code ISO 639-3",
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
          preservedParams={{
            [PARAM.letter]: filters.letter,
            [PARAM.size]:
              pageSize === LANGUAGES_FACET_PAGE_SIZES[0]
                ? undefined
                : String(pageSize),
          }}
          activeFilters={activeFilters}
        />

        {reading.languages.length === 0 ? (
          <p data-testid="langues-facet-empty" className="mt-6">
            Aucune langue du corpus ne répond à cette sélection.{" "}
            <Link
              href={facetHref(
                language,
                {
                  familyId: null,
                  countryId: null,
                  peopleId: null,
                  letter: null,
                },
                null,
                pageSize
              )}
            >
              Revenir à toutes les langues
            </Link>
          </p>
        ) : (
          <>
            {pagination("top")}
            <ul
              aria-label="Langues"
              className="mt-6 flex flex-col gap-2 p-0 md:grid md:grid-cols-2 xl:grid-cols-3"
            >
              {reading.languages.map((entry) => (
                <li key={entry.id} className="list-none">
                  <Link
                    href={getLanguageRoute(language, entry.id)}
                    prefetch={false}
                    className="block h-full rounded-afh-xl border border-afh-border bg-afh-surface p-4 focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
                  >
                    <span className="block text-afh-body font-semibold">
                      {entry.name}
                    </span>
                    {/* 748 languages for 532 distinct names — « Fulfulde »
                        names both fuf and fuv — so the family and the ISO code
                        are what tell two rows apart. */}
                    <span className="mt-2 block text-afh-small text-afh-text-soft">
                      {entry.family.name} · {entry.id}
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
