import { logger } from "@/lib/api/logger";
import { CANONICAL_DOMAIN, PRODUCT_NAME } from "@/lib/brand";
import { violatesReaderRegister } from "@/lib/editorial/readerRegister";
import { TRAIL_PAGE_LABELS } from "@/lib/i18n/copy/trail";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getLocalizedRoute,
  getPatronymeRoute,
  getPeopleRoute,
  type PageType,
} from "@/lib/routing";
import type { FicheKind } from "@/lib/seo/ficheCanonical";
import { ficheSubjectFor } from "@/lib/seo/ficheHead";
import type { FicheSubject } from "@/lib/seo/ficheMetadata";
import type { FicheEntityType } from "@/types/fiche";
import type { Language } from "@/types/shared";

/**
 * What a fiche tells a machine that is not a browser.
 *
 * Measured on production 2026-09-07: no fiche carried a single line of
 * structured data. The corpus is a graph — family → language → people →
 * country — and none of it was declared, so a search engine saw 3 242
 * unrelated documents where the atlas holds one connected set, and an
 * assistant citing the site (one visitor already arrived from chatgpt.com)
 * had no machine-readable claim to quote.
 *
 * **The types are chosen not to overclaim.** A people is not an `Article`,
 * which would assert an authored essay where the atlas publishes a sourced
 * record, and it is certainly not a `Person`. It is a term this atlas defines:
 * `DefinedTerm` inside a `DefinedTermSet`, which is the honest shape and the
 * one that survives a reader asking what the markup is asserting. Countries
 * and languages have exact types and take them.
 *
 * **Absence stays absent.** A relation the corpus does not fill is omitted
 * rather than emitted empty — the same rule the fiche surface follows, for the
 * same reason: an empty `containedInPlace` claims the atlas looked and found
 * nothing, when it has not looked.
 */

/** A JSON-LD node. Values are whatever schema.org allows in that position. */
export type JsonLdNode = Record<string, unknown> & {
  "@type": string;
  "@id"?: string;
  name?: string;
  url?: string;
};

const SCHEMA_TYPE_BY_KIND: Record<FicheKind, string> = {
  people: "DefinedTerm",
  family: "DefinedTerm",
  name: "DefinedTerm",
  peopleLinks: "DefinedTerm",
  language: "Language",
  country: "Country",
};

/** The hub each kind of fiche hangs under, for the breadcrumb's middle rung. */
const HUB_BY_KIND: Record<FicheKind, PageType> = {
  people: "peoples",
  peopleLinks: "peoples",
  family: "families",
  language: "languages",
  country: "countries",
  name: "patronymes",
};

const absoluteUrl = (path: string) => `https://${CANONICAL_DOMAIN}${path}`;

/** A value the graph may publish, or nothing — the register applies here too. */
function publishable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return violatesReaderRegister(trimmed) ? null : trimmed;
}

function publishableList(values: readonly string[] | undefined): string[] {
  return (values ?? [])
    .map(publishable)
    .filter((value): value is string => value !== null);
}

function breadcrumb(
  kind: FicheKind,
  language: Language,
  name: string,
  url: string
): JsonLdNode {
  const labels = TRAIL_PAGE_LABELS[language];
  const hub = HUB_BY_KIND[kind];

  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: labels.atlasHub,
        item: absoluteUrl(getLocalizedRoute(language, "atlasHub")),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: labels[hub],
        item: absoluteUrl(getLocalizedRoute(language, hub)),
      },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };
}

/**
 * The fiche's graph: the entity itself, then its breadcrumb.
 *
 * Returned as an array so the caller emits one `@graph` rather than two
 * competing script tags — a consumer reading the second would otherwise have
 * to guess which one describes the page.
 */
// @req REQ-091
export function buildFicheJsonLd(
  kind: FicheKind,
  language: Language,
  subject: FicheSubject,
  url: string
): JsonLdNode[] {
  const name = publishable(subject.name) ?? PRODUCT_NAME;
  const description = publishable(subject.summary);
  const countries = publishableList(subject.countryNames);
  const family = publishable(subject.familyName);

  const entity: JsonLdNode = {
    "@type": SCHEMA_TYPE_BY_KIND[kind],
    "@id": url,
    name,
    url,
    ...(description ? { description } : {}),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: PRODUCT_NAME,
      url: absoluteUrl(getLocalizedRoute(language, "atlasHub")),
    },
    // The atlas's whole posture, stated where a machine can read it.
    isPartOf: {
      "@type": "WebSite",
      name: PRODUCT_NAME,
      url: `https://${CANONICAL_DOMAIN}`,
    },
    ...(countries.length > 0
      ? {
          containedInPlace: countries.map((country) => ({
            "@type": "Country",
            name: country,
          })),
        }
      : {}),
    ...(family && kind !== "family" ? { isPartOfLanguageFamily: family } : {}),
  };

  return [entity, breadcrumb(kind, language, name, url)];
}

/** The shell speaks in entity types; the head and the graph in fiche kinds. */
const KIND_BY_ENTITY_TYPE: Record<FicheEntityType, FicheKind> = {
  people: "people",
  country: "country",
  "language-family": "family",
  language: "language",
  name: "name",
};

const ROUTE_BY_KIND: Record<
  FicheKind,
  (language: Language, id: string) => string
> = {
  country: getCountryRoute,
  people: getPeopleRoute,
  peopleLinks: getPeopleRoute,
  family: getFamilyRoute,
  language: getLanguageRoute,
  name: getPatronymeRoute,
};

/**
 * The graph for a fiche, read from the corpus.
 *
 * Awaited by the route rather than by a component — see `FicheJsonLd` for why
 * an async component could not live in that tree. Reuses `ficheSubjectFor`, so
 * the fiche is described the same way to a machine as to a search result, and
 * the request-cached loaders mean this costs no additional query.
 *
 * Returns null on any failure: a page must not 500 over its markup for
 * machines, having already rendered the fiche for the reader.
 */
// @req REQ-091
export async function ficheJsonLdFor(
  entityType: FicheEntityType,
  language: Language,
  entityId: string | undefined
): Promise<JsonLdNode[] | null> {
  if (!entityId) return null;
  const kind = KIND_BY_ENTITY_TYPE[entityType];

  try {
    const subject = await ficheSubjectFor(kind, language, entityId);
    if (!subject) return null;
    return buildFicheJsonLd(
      kind,
      language,
      subject,
      `https://${CANONICAL_DOMAIN}${ROUTE_BY_KIND[kind](language, entityId)}`
    );
  } catch (error) {
    logger.error(`Structured data could not be built for ${entityId}`, error);
    return null;
  }
}
