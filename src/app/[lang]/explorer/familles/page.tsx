import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import { getCountryIndex } from "@/api/v2/services/countryService";
import { getLanguageFamilyPresence } from "@/api/v2/services/languageFamilyAtlas";
import { getLanguageFamilies } from "@/api/v2/services/languageFamilyService";
import { PublishFacetCountryIndex } from "@/components/hubs/facets/FacetCountryIndex";
import type {
  FacetCountryIndex,
  FacetCountryNarrowing,
} from "@/components/hubs/facets/FacetCountryIndex";
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import { FacetPagination } from "@/components/hubs/facets/FacetPagination";
import { definedFilter, getFacetRoute } from "@/lib/hubs/facets";
import { PAGE_SIZE_PARAM, resolvePageSize } from "@/lib/hubs/pagination";
import { getFamilyRoute, resolveFamilyDeepLink } from "@/lib/routing";
import type { CountryId } from "@/types/afrik";
import type { Language } from "@/types/shared";

/**
 * The families facet of the unified Explorer hub.
 *
 * What it replaces is a client directory that fetched every family through
 * react-query, held them all in memory and paged them in the browser — over a
 * service that had been paginating at the database since REQ-110. The gap was
 * never in the service; it was that nothing on the server was asking it. A
 * server component asking for one page closes it without a line of pagination
 * being written here.
 *
 * The globe is not this page's: `FacetHubShell` mounts one for all three
 * facets, so switching to peoples or countries repaints the reading and leaves
 * the map standing. What this page owes the map is the index below — the
 * families of the current selection, grouped by the countries they reach.
 *
 * The redirect is a net for links already sent; nothing in the app emits the
 * query form any more. It runs on the server, before any render, so it also
 * catches readers arriving from outside and crawlers — and it goes through the
 * shared resolver, which is where the encoding that stops `?family=//host`
 * becoming an open redirect lives. That rule now has one implementation: the
 * client copy that forwarded the identifier raw left with the directory.
 */

/** Twelve of twenty-four families: two pages, and one screen of cards on a phone. */
const FAMILIES_PER_PAGE = 12;

/**
 * The default first, then the whole roster. With twenty-four families there is
 * no third useful size — a hundred per page would name a corpus that does not
 * exist.
 */
const FAMILIES_PAGE_SIZES = [FAMILIES_PER_PAGE, 24] as const;

const COUNTRY_PARAM = "pays";
const PAGE_PARAM = "page";
const SIZE_PARAM = PAGE_SIZE_PARAM;

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/** The page a reader asked for, or the first — never NaN, never zero. */
function requestedPage(raw: string | string[] | undefined): number {
  const parsed = Number.parseInt(definedFilter(raw) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const formatCount = (value: number): string =>
  new Intl.NumberFormat("fr-FR").format(value);

// @req REQ-114
export default async function FamillesHubPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolveFamilyDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  const [presence, countries] = await Promise.all([
    getLanguageFamilyPresence(),
    getCountryIndex(),
  ]);

  const chosenCountry = definedFilter(query[COUNTRY_PARAM]);
  const selection = chosenCountry
    ? presence.filter((family) => family.countryIds.includes(chosenCountry))
    : presence;

  /**
   * Paged against the roster the page already holds, not a second count query:
   * the roster is the corpus's own family list, so it knows the size of the
   * selection exactly. Clamping *before* the list query is what stops a stale
   * `?page=` fetching a range past the end and reading as an empty corpus.
   */
  const pageSize = resolvePageSize(
    definedFilter(query[SIZE_PARAM]),
    FAMILIES_PAGE_SIZES
  );
  const pageCount = Math.max(1, Math.ceil(selection.length / pageSize));
  const page = Math.min(requestedPage(query[PAGE_PARAM]), pageCount);

  const { data: families, unclassifiedPeoplesCount } =
    await getLanguageFamilies(
      page,
      pageSize,
      chosenCountry ? { ids: selection.map((family) => family.id) } : {}
    );

  const facetRoute = getFacetRoute("fr", "families");

  const countryIndex: FacetCountryIndex = {};
  /**
   * Keyed on the index's own countries, so a narrowing offered from the map
   * always lands on a page with families on it. Narrowing resets the page: page
   * 4 of the whole corpus is past the end of "the families spoken in Benin".
   */
  const narrowing: FacetCountryNarrowing = {};
  for (const family of selection) {
    const row = {
      id: family.id,
      label: family.nameFr,
      href: getFamilyRoute("fr", family.id),
    };
    for (const countryId of family.countryIds) {
      const key = countryId as CountryId;
      countryIndex[key] = [...(countryIndex[key] ?? []), row];
      narrowing[key] ??= `${facetRoute}?${new URLSearchParams({
        [COUNTRY_PARAM]: countryId,
      }).toString()}`;
    }
  }

  // A country no family reaches would promise a page with nothing on it.
  const documentedCountries = new Set(
    presence.flatMap((family) => family.countryIds)
  );
  const countryOptions = countries
    .filter((country) => documentedCountries.has(country.id))
    .map((country) => ({ value: country.id, label: country.nameFr }))
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));

  const pageHref = (target: number, size: number): string => {
    const address = new URLSearchParams();
    if (chosenCountry) address.set(COUNTRY_PARAM, chosenCountry);
    if (target > 1) address.set(PAGE_PARAM, String(target));
    // The default stays out of the address, so the plainest reading keeps the
    // plainest URL and links already sent are unchanged.
    if (size !== FAMILIES_PAGE_SIZES[0]) address.set(SIZE_PARAM, String(size));
    const search = address.toString();
    return search ? `${facetRoute}?${search}` : facetRoute;
  };

  const pagination = (position: "top" | "bottom") => (
    <FacetPagination
      position={position}
      page={page}
      pageCount={pageCount}
      total={selection.length}
      pageSize={pageSize}
      pageSizes={FAMILIES_PAGE_SIZES}
      buildHref={pageHref}
      unitLabel="familles"
    />
  );

  const chosenCountryName = countryOptions.find(
    (option) => option.value === chosenCountry
  )?.label;

  const cardClass =
    "flex min-h-11 flex-col gap-1 rounded-afh-lg border border-afh-border bg-afh-surface p-4 hover:border-[color:var(--accent)]";

  return (
    <>
      <PublishFacetCountryIndex
        index={countryIndex}
        narrowing={narrowing}
        focused={chosenCountry as CountryId | null}
      />

      <div className="afh-parchment">
        <header className="afh-parchment-head">
          <p className="afh-parchment-eyebrow">
            atlas · les familles linguistiques
          </p>
          <h1>Familles linguistiques</h1>
          <p className="afh-parchment-lede">
            {formatCount(selection.length)} familles{" "}
            {chosenCountryName
              ? `documentées en ${chosenCountryName}`
              : "au corpus"}
            . Choisissez un pays sur le globe pour voir lesquelles s&apos;y
            parlent.
          </p>
        </header>

        <FacetFilterBar
          action={facetRoute}
          className="mt-6"
          // A GET form submits its own controls only, so the size chosen above
          // would be dropped by narrowing to a country without this.
          hidden={{
            [SIZE_PARAM]:
              pageSize === FAMILIES_PAGE_SIZES[0]
                ? undefined
                : String(pageSize),
          }}
          fields={[
            {
              name: COUNTRY_PARAM,
              label: "Pays",
              anyLabel: "Tous les pays",
              options: countryOptions,
              value: chosenCountry,
            },
          ]}
        />

        {families.length > 0 && pagination("top")}

        {families.length === 0 ? (
          <p className="mt-6 text-afh-body text-afh-text-soft">
            Aucune famille linguistique ne répond à cette sélection.
          </p>
        ) : (
          <ul
            data-testid="family-facet-list"
            className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {families.map((family) => (
              <li key={family.id}>
                <Link
                  href={getFamilyRoute("fr", family.id)}
                  className={cardClass}
                >
                  <span className="font-afh-display text-afh-h3 font-bold text-afh-text">
                    {family.nameFr}
                  </span>
                  <span className="text-afh-small text-afh-text-soft">
                    {formatCount(family.peopleCount ?? 0)} peuples au corpus
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pagination("bottom")}

        {unclassifiedPeoplesCount > 0 && (
          <p className="mt-6 text-afh-caption text-afh-text-soft">
            {formatCount(unclassifiedPeoplesCount)} peuples non classés dans une
            famille linguistique publiée.
          </p>
        )}
      </div>
    </>
  );
}
