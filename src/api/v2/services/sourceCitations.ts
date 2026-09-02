import { getCountryIndex } from "@/api/v2/services/countryService";
import { getPeoplesByIds } from "@/api/v2/services/peopleService";
import { createServerClient } from "@/lib/supabase/server";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getPatronymeRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The citation graph, read backwards: which fiches rest on a given source.
 *
 * Every read of this graph so far has gone the other way — given entities,
 * find their sources. A bibliography needs the inverse, and it is the question
 * that turns a list of titles into something a reader can act on: a source
 * nothing cites is a claim about the corpus, and one that fifty fiches cite is
 * a different object entirely.
 *
 * `assertions.source_ids` is a UUID[] with no foreign key, so PostgREST cannot
 * embed it: array containment is the only path, and migration 078 indexes it.
 */

export interface SourceCitationEntity {
  entityType: string;
  entityId: string;
  /** The fiche's name where we can resolve one, its identifier otherwise. */
  label: string;
  /** Null when this app has no route for the entity type — never a dead link. */
  href: string | null;
  assertionCount: number;
}

export interface SourceCitations {
  /** Assertions citing the source, counted rather than loaded. */
  total: number;
  entities: SourceCitationEntity[];
  /** True when more assertions cite the source than were scanned. */
  truncated: boolean;
}

/**
 * How many assertion rows are read to build the list of citing fiches.
 *
 * Not a page size: a people carries about fourteen assertions and they all
 * cite the same fiche-level source list, so rows and fiches are an order of
 * magnitude apart. Reading five hundred rows resolves several dozen fiches,
 * which is more than a source page can usefully show, while staying a single
 * bounded query.
 */
const ASSERTION_SCAN_LIMIT = 500;

/** Fiches listed on a source's page. Beyond this the page states the count. */
const DEFAULT_ENTITY_LIMIT = 24;

const ROUTE_BY_ENTITY_TYPE: Record<
  string,
  (language: Language, id: string) => string
> = {
  people: getPeopleRoute,
  country: getCountryRoute,
  language_family: getFamilyRoute,
  language: getLanguageRoute,
  patronyme: getPatronymeRoute,
};

// @req REQ-093
export async function getSourceCitations(
  sourceId: string,
  entityLimit: number = DEFAULT_ENTITY_LIMIT
): Promise<SourceCitations> {
  const supabase = createServerClient();

  const [{ count, error: countError }, { data, error: rowsError }] =
    await Promise.all([
      supabase
        .from("assertions")
        .select("*", { count: "exact", head: true })
        .contains("source_ids", [sourceId]),
      supabase
        .from("assertions")
        .select("entity_type, entity_id")
        .contains("source_ids", [sourceId])
        .limit(ASSERTION_SCAN_LIMIT),
    ]);

  if (countError) throw new Error(countError.message);
  if (rowsError) throw new Error(rowsError.message);

  const rows = (data ?? []) as Array<{
    entity_type: string;
    entity_id: string;
  }>;

  const byEntity = new Map<string, SourceCitationEntity>();
  for (const row of rows) {
    const key = `${row.entity_type}:${row.entity_id}`;
    const seen = byEntity.get(key);
    if (seen) {
      seen.assertionCount += 1;
      continue;
    }
    byEntity.set(key, {
      entityType: row.entity_type,
      entityId: row.entity_id,
      label: row.entity_id,
      href:
        ROUTE_BY_ENTITY_TYPE[row.entity_type]?.("fr", row.entity_id) ?? null,
      assertionCount: 1,
    });
  }

  const entities = [...byEntity.values()]
    .sort((a, b) => b.assertionCount - a.assertionCount)
    .slice(0, entityLimit);

  await nameFiches(entities);

  return {
    total: count ?? 0,
    entities,
    truncated: rows.length >= ASSERTION_SCAN_LIMIT,
  };
}

/**
 * Replaces identifiers with names, in place, for the two types that carry the
 * corpus. `PPL_YORUBA` is a key, not a name, and a bibliography that prints it
 * asks the reader to do the lookup the page exists to do.
 *
 * Only peoples and countries: they are 4 285 of the 4 395 sources' citations
 * between them, each resolves in one batched query, and the rest fall back to
 * their identifier rather than costing four more round trips for a handful of
 * rows.
 */
async function nameFiches(entities: SourceCitationEntity[]): Promise<void> {
  const peopleIds = entities
    .filter((entity) => entity.entityType === "people")
    .map((entity) => entity.entityId);
  const hasCountry = entities.some((entity) => entity.entityType === "country");

  const [peoples, countries] = await Promise.all([
    peopleIds.length > 0 ? getPeoplesByIds(peopleIds) : Promise.resolve([]),
    hasCountry ? getCountryIndex() : Promise.resolve([]),
  ]);

  const peopleNames = new Map(
    peoples.map((people) => [people.id, people.nameFr])
  );
  const countryNames = new Map(
    countries.map((country) => [country.id, country.nameFr])
  );

  for (const entity of entities) {
    const named =
      entity.entityType === "people"
        ? peopleNames.get(entity.entityId)
        : entity.entityType === "country"
          ? countryNames.get(entity.entityId)
          : undefined;
    if (named) entity.label = named;
  }
}
