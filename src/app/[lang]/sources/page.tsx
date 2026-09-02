import type { Metadata } from "next";
import Link from "next/link";

import {
  getSourcesFacetChoices,
  getSourcesFacetPage,
  SOURCES_FACET_PAGE_SIZES,
  type SourcesFacetFilters,
  type SourcesFacetSort,
  type SourceStanding,
} from "@/api/v2/services/sourcesFacet";
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import { FacetPagination } from "@/components/hubs/facets/FacetPagination";
import type { FacetActiveFilter } from "@/components/hubs/facets/FacetFilterBar";
import { PageLayout } from "@/components/layout/PageLayout";
import SourcesPageContent from "@/components/pages/SourcesPageContent";
import { SourceRow } from "@/components/sources/SourceRow";
import { definedFilter } from "@/lib/hubs/facets";
import { PAGE_SIZE_PARAM, resolvePageSize } from "@/lib/hubs/pagination";
import { getLocalizedRoute } from "@/lib/routing";
import { SOURCE_KINDS, type SourceKind } from "@/types/sources";

/**
 * The sources directory.
 *
 * Not a facet of the atlas, and it does not borrow the atlas's shell: a source
 * is not an entity of the corpus, it is the apparatus the corpus rests on.
 * `routing.ts` says the same thing structurally — `sources` carries no axis
 * prefix, because no hub lists it and nesting one would invent an ancestor the
 * menu never offers. So it takes `PageLayout` directly and no page accent: the
 * four categorical hues already teach entity kinds, and a fifth meaning on the
 * same palette is a code no reader can learn.
 *
 * What it does borrow is the machinery, which is generic: `FacetFilterBar` is
 * a plain GET form and `FacetPagination` an address composer, neither of which
 * knows anything about the atlas.
 */

type PageParams = { lang: string };
type PageSearchParams = Record<string, string | string[] | undefined>;

/** Query parameters, named as the reader sees them in the address bar. */
const PARAM = {
  search: "q",
  standing: "autorite",
  provenance: "provenance",
  decade: "decennie",
  sort: "tri",
  page: "page",
  size: PAGE_SIZE_PARAM,
} as const;

const countFormat = new Intl.NumberFormat("fr-FR");

const SORTS: ReadonlyArray<{ value: SourcesFacetSort; label: string }> = [
  { value: "titre", label: "Titre" },
  { value: "annee", label: "Année, la plus récente d'abord" },
  { value: "ajout", label: "Ajout au corpus, le plus récent d'abord" },
];

// @req REQ-114
export const metadata: Metadata = {
  title: "Sources",
  description:
    "La bibliographie du corpus : chaque source sur laquelle reposent les fiches, avec son degré d'autorité et ce qui la cite.",
};

function isSort(value: string | null): value is SourcesFacetSort {
  return SORTS.some((sort) => sort.value === value);
}

function isKind(value: string | null): value is SourceKind {
  return SOURCE_KINDS.includes(value as SourceKind);
}

/**
 * An address for the directory under a given selection.
 *
 * The path comes from the slug table and only the query is composed here, so
 * the next time the page moves this call site moves with it.
 */
function directoryHref(
  filters: SourcesFacetFilters,
  page: number | null,
  pageSize: number
): string {
  const query = new URLSearchParams();
  if (filters.search) query.set(PARAM.search, filters.search);
  if (filters.standing) query.set(PARAM.standing, filters.standing);
  if (filters.sourceKind) query.set(PARAM.provenance, filters.sourceKind);
  if (filters.decade) query.set(PARAM.decade, String(filters.decade));
  if (filters.sort && filters.sort !== "titre") {
    query.set(PARAM.sort, filters.sort);
  }
  if (page && page > 1) query.set(PARAM.page, String(page));
  // The default is left out so the plainest reading keeps the plainest
  // address, and so links already in circulation stay what they were.
  if (pageSize !== SOURCES_FACET_PAGE_SIZES[0]) {
    query.set(PARAM.size, String(pageSize));
  }

  const search = query.toString();
  const path = getLocalizedRoute("fr", "sources");
  return search ? `${path}?${search}` : path;
}

// @req REQ-114
export default async function SourcesPage({
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const query = (await searchParams) ?? {};

  const decade = definedFilter(query[PARAM.decade]);
  const sort = definedFilter(query[PARAM.sort]);
  const provenance = definedFilter(query[PARAM.provenance]);
  const filters: SourcesFacetFilters = {
    search: definedFilter(query[PARAM.search]),
    standing: definedFilter(query[PARAM.standing]) as SourceStanding | null,
    sourceKind: isKind(provenance) ? provenance : null,
    decade: decade ? Number.parseInt(decade, 10) : null,
    letter: null,
    sort: isSort(sort) ? sort : null,
  };

  const requestedPage = Number.parseInt(
    definedFilter(query[PARAM.page]) ?? "1",
    10
  );
  const pageSize = resolvePageSize(
    definedFilter(query[PARAM.size]),
    SOURCES_FACET_PAGE_SIZES
  );

  const [choices, reading] = await Promise.all([
    getSourcesFacetChoices(),
    getSourcesFacetPage(requestedPage, filters, pageSize),
  ]);

  /** What the fold owes back while it is shut. */
  const activeFilters: FacetActiveFilter[] = [];
  if (filters.sourceKind) {
    activeFilters.push({
      label: `Provenance : ${filters.sourceKind}`,
      removeHref: directoryHref(
        { ...filters, sourceKind: null },
        null,
        pageSize
      ),
    });
  }
  if (filters.decade) {
    activeFilters.push({
      label: `Décennie : ${filters.decade}`,
      removeHref: directoryHref({ ...filters, decade: null }, null, pageSize),
    });
  }
  if (filters.sort && filters.sort !== "titre") {
    activeFilters.push({
      label: `Tri : ${SORTS.find((s) => s.value === filters.sort)?.label}`,
      removeHref: directoryHref({ ...filters, sort: null }, null, pageSize),
    });
  }

  const pagination = (position: "top" | "bottom") => (
    <FacetPagination
      position={position}
      page={reading.page}
      pageCount={reading.totalPages}
      total={reading.total}
      pageSize={pageSize}
      pageSizes={SOURCES_FACET_PAGE_SIZES}
      buildHref={(page, size) => directoryHref(filters, page, size)}
      unitLabel="sources"
    />
  );

  // One string rather than text around expressions: JSX drops the whitespace
  // between an expression and the text that follows on the next line.
  const lede =
    `${countFormat.format(reading.total)} ` +
    `${reading.total === 1 ? "source" : "sources"} dans cette sélection. ` +
    `Chacune porte son degré d'autorité, et la raison de ce degré.`;

  const provenanceNote =
    `La provenance n'est renseignée que pour ` +
    `${countFormat.format(choices.withSourceKind)} sources sur ` +
    `${countFormat.format(choices.total)} : filtrer dessus ne montre pas ` +
    `l'état du corpus, seulement ce qui a déjà été qualifié.`;

  return (
    <PageLayout language="fr" title="Sources">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <p
            data-testid="sources-lede"
            className="text-afh-body text-afh-text-soft"
          >
            {lede}
          </p>
        </header>

        <FacetFilterBar
          action={getLocalizedRoute("fr", "sources")}
          className="mt-4"
          searchField={{
            name: PARAM.search,
            label: "Rechercher une source",
            placeholder: "Titre ou auteur",
            value: filters.search,
          }}
          primaryField={{
            name: PARAM.standing,
            label: "Autorité",
            anyLabel: "Toutes les autorités",
            options: choices.standings.map((standing) => ({
              value: standing.id,
              // The count rides in the label: a shelf that hides how much it
              // holds asserts an absence nobody checked, and the filter bar
              // has no slot of its own for a per-option figure.
              label: `${standing.label} (${countFormat.format(standing.count)})`,
            })),
            value: filters.standing,
          }}
          advancedFields={[
            {
              name: PARAM.provenance,
              label: "Provenance",
              anyLabel: "Toutes les provenances",
              options: choices.sourceKinds.map((kind) => ({
                value: kind.id,
                label: `${kind.label} (${countFormat.format(kind.count)})`,
              })),
              value: filters.sourceKind,
            },
            {
              name: PARAM.decade,
              label: "Décennie",
              anyLabel: "Toutes les décennies",
              options: choices.decades.map((decade) => ({
                value: decade.id,
                label: `${decade.label} (${countFormat.format(decade.count)})`,
              })),
              value: filters.decade ? String(filters.decade) : null,
            },
            {
              name: PARAM.sort,
              label: "Trier par",
              anyLabel: "Titre",
              options: SORTS.filter((sort) => sort.value !== "titre").map(
                (sort) => ({ value: sort.value, label: sort.label })
              ),
              value: filters.sort === "titre" ? null : filters.sort,
            },
          ]}
          // Set outside this form, so without them the reader loses their page
          // size the moment they narrow. The page number is deliberately
          // absent — a new selection starts at one.
          preservedParams={{
            [PARAM.size]:
              pageSize === SOURCES_FACET_PAGE_SIZES[0]
                ? undefined
                : String(pageSize),
          }}
          activeFilters={activeFilters}
        />

        <p
          data-testid="sources-provenance-note"
          className="mt-2 text-afh-caption text-afh-text-soft"
        >
          {provenanceNote}
        </p>

        {reading.sources.length === 0 ? (
          <p data-testid="sources-facet-empty" className="mt-6">
            Aucune source du corpus ne répond à cette sélection.{" "}
            <Link href={getLocalizedRoute("fr", "sources")}>
              Revenir à toutes les sources
            </Link>
          </p>
        ) : (
          <>
            {pagination("top")}
            <ul aria-label="Sources" className="mt-4 flex flex-col p-0">
              {reading.sources.map((source) => (
                <li key={source.id} className="list-none">
                  <SourceRow source={source} />
                </li>
              ))}
            </ul>
          </>
        )}

        {pagination("bottom")}

        {/* The bibliography this directory replaced, kept rather than deleted:
            it holds some ninety citations written by hand that the table does
            not carry in that form, and losing them to gain tidiness would be a
            poor trade. Folded, because it is a reading list and the directory
            above is the answer to the question the page is asked. */}
        <details className="mt-10 border-t border-afh-border pt-6">
          <summary className="cursor-pointer text-afh-body text-afh-text">
            La bibliographie de référence du projet
          </summary>
          <div className="mt-4">
            <SourcesPageContent />
          </div>
        </details>
      </div>
    </PageLayout>
  );
}
