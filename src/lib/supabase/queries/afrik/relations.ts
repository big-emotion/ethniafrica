/**
 * Supabase queries for AFRIK people relations (Epic 11, Story 11.6, ETNI-507).
 *
 * getRelationsForPeople/getRelationsMap batch-fetch sourced relations plus
 * neighbor fiche data + confidence in a bounded number of queries — no
 * per-edge queries (NFR3). getDerivedLinguisticLinks derives
 * linguistic-proximity links from the AFRIK hierarchy (shared
 * languageFamilyId) via one indexed query, excluding peoples already linked
 * by a sourced relation (FR73). Every function returns an empty
 * array/Map — never null, never throws — on error or when nothing matches.
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import { getSourcesMap, getConfidenceMap } from "./module-zero-batch";
import type {
  RelationType,
  RelationDirection,
  SourcedRelation,
  DerivedLinguisticLink,
  RelationNeighbor,
} from "@/types/relations";

const DEFAULT_DERIVED_LIMIT = 24;

interface RelationRow {
  id: string;
  relation_type: RelationType;
  people_id_a: string;
  people_id_b: string;
  direction: RelationDirection;
  period_start_year: number | null;
  period_end_year: number | null;
  period_label: string | null;
  description: string;
}

interface NeighborRow {
  id: string;
  name_main: string;
  language_family_id: string;
}

function otherSideId(row: RelationRow, pplId: string): string {
  return row.people_id_a === pplId ? row.people_id_b : row.people_id_a;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Two `.in()` queries (side A, side B) for the given peopleIds, merged and
 * de-duplicated by relation id. Bounded regardless of how many ids are
 * supplied — never per-edge.
 */
async function fetchRelationRows(
  supabase: ReturnType<typeof createServerClient>,
  peopleIds: string[]
): Promise<RelationRow[]> {
  const [aSide, bSide] = await Promise.all([
    supabase
      .from("afrik_people_relations")
      .select("*")
      .in("people_id_a", peopleIds),
    supabase
      .from("afrik_people_relations")
      .select("*")
      .in("people_id_b", peopleIds),
  ]);

  if (aSide.error || bSide.error) {
    logger.error(
      "relations.fetchRelationRows failed",
      aSide.error || bSide.error
    );
    return [];
  }

  const byId = new Map<string, RelationRow>();
  for (const row of [
    ...((aSide.data || []) as RelationRow[]),
    ...((bSide.data || []) as RelationRow[]),
  ]) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

async function getNeighborsMap(
  supabase: ReturnType<typeof createServerClient>,
  peopleIds: string[]
): Promise<Map<string, RelationNeighbor>> {
  if (peopleIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("id, name_main, language_family_id")
    .in("id", peopleIds);

  if (error) {
    logger.error("relations.getNeighborsMap failed", error);
    return new Map();
  }

  const map = new Map<string, RelationNeighbor>();
  for (const row of (data || []) as NeighborRow[]) {
    map.set(row.id, {
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
    });
  }
  return map;
}

function mapRowToSourcedRelation(
  row: RelationRow,
  pplId: string,
  neighborsMap: Map<string, RelationNeighbor>,
  sourcesMap: Map<
    string,
    Array<{
      id: string;
      title: string;
      url: string | null;
      tier: string | null;
    }>
  >,
  confidenceMap: Map<string, { score: number; sourceCount: number | null }>
): SourcedRelation | null {
  const neighbor = neighborsMap.get(otherSideId(row, pplId));
  if (!neighbor) return null;

  const confidence = confidenceMap.get(row.id);

  return {
    id: row.id,
    relationType: row.relation_type,
    direction: row.direction,
    period: {
      startYear: row.period_start_year,
      endYear: row.period_end_year,
      label: row.period_label ?? "",
    },
    description: row.description,
    sources: sourcesMap.get(row.id) || [],
    confidence: confidence
      ? { score: confidence.score, sourceCount: confidence.sourceCount }
      : null,
    neighbor,
  };
}

/**
 * Batch-fetches sourced relations for many peopleIds in a bounded number of
 * queries (relation edges + neighbor/source/confidence batches) — never
 * per-edge. Keyed by peopleId; a relation between two ids both present in
 * the input set appears under both keys.
 */
export async function getRelationsMap(
  peopleIds: string[]
): Promise<Map<string, SourcedRelation[]>> {
  if (peopleIds.length === 0) return new Map();

  const supabase = createServerClient();
  const rows = await fetchRelationRows(supabase, peopleIds);
  if (rows.length === 0) return new Map();

  const relationIds = rows.map((r) => r.id);
  const neighborIds = uniqueStrings(
    rows.flatMap((r) => [r.people_id_a, r.people_id_b])
  );

  const [neighborsMap, sourcesMap, confidenceMap] = await Promise.all([
    getNeighborsMap(supabase, neighborIds),
    getSourcesMap(relationIds),
    getConfidenceMap(relationIds, "relation"),
  ]);

  const map = new Map<string, SourcedRelation[]>();
  for (const pplId of peopleIds) {
    const sourced: SourcedRelation[] = [];
    for (const row of rows) {
      if (row.people_id_a !== pplId && row.people_id_b !== pplId) continue;
      const relation = mapRowToSourcedRelation(
        row,
        pplId,
        neighborsMap,
        sourcesMap,
        confidenceMap
      );
      if (relation) sourced.push(relation);
    }
    if (sourced.length > 0) map.set(pplId, sourced);
  }
  return map;
}

/**
 * Sourced relations touching a single people (side A or B), with neighbor
 * fiche data + confidence. Delegates to getRelationsMap — no per-edge query.
 */
export async function getRelationsForPeople(
  pplId: string
): Promise<SourcedRelation[]> {
  const map = await getRelationsMap([pplId]);
  return map.get(pplId) || [];
}

/**
 * Ids of peoples already linked to pplId by a sourced relation (side A or
 * B), via two lean `.eq()` queries on the indexed people_id_a/people_id_b
 * columns — not the full sourced-relation hydration.
 */
async function getSourcedNeighborIds(
  supabase: ReturnType<typeof createServerClient>,
  pplId: string
): Promise<string[]> {
  const [aSide, bSide] = await Promise.all([
    supabase
      .from("afrik_people_relations")
      .select("people_id_a, people_id_b")
      .eq("people_id_a", pplId),
    supabase
      .from("afrik_people_relations")
      .select("people_id_a, people_id_b")
      .eq("people_id_b", pplId),
  ]);

  if (aSide.error || bSide.error) {
    logger.error(
      "relations.getSourcedNeighborIds failed",
      aSide.error || bSide.error
    );
    return [];
  }

  const rows = [
    ...((aSide.data || []) as Array<{
      people_id_a: string;
      people_id_b: string;
    }>),
    ...((bSide.data || []) as Array<{
      people_id_a: string;
      people_id_b: string;
    }>),
  ];

  return uniqueStrings(rows.map((r) => otherSideId(r as RelationRow, pplId)));
}

/**
 * Same-family peoples via one indexed query on languageFamilyId, excluding
 * pplId itself and any people already linked to it by a sourced relation.
 * Never null, never throws.
 */
export async function getDerivedLinguisticLinks(
  pplId: string,
  limit: number = DEFAULT_DERIVED_LIMIT
): Promise<DerivedLinguisticLink[]> {
  const supabase = createServerClient();

  const { data: selfRow, error: selfError } = await supabase
    .from("afrik_peoples")
    .select("id, language_family_id")
    .eq("id", pplId)
    .single();

  if (selfError || !selfRow) {
    if (selfError && (selfError as { code?: string }).code !== "PGRST116") {
      logger.error(
        `relations.getDerivedLinguisticLinks failed for ${pplId}`,
        selfError
      );
    }
    return [];
  }

  const familyId = (selfRow as { language_family_id: string | null })
    .language_family_id;
  if (!familyId) return [];

  const excludeIds = uniqueStrings([
    pplId,
    ...(await getSourcedNeighborIds(supabase, pplId)),
  ]);

  let query = supabase
    .from("afrik_peoples")
    .select("id, name_main, language_family_id")
    .eq("language_family_id", familyId)
    .neq("id", pplId);

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.order("name_main").limit(limit);

  if (error) {
    logger.error(
      `relations.getDerivedLinguisticLinks family query failed for ${pplId}`,
      error
    );
    return [];
  }

  return ((data || []) as NeighborRow[]).map((row) => ({
    derived: true,
    basis: "sharedLanguageFamily",
    neighbor: {
      id: row.id,
      nameMain: row.name_main,
      languageFamilyId: row.language_family_id,
    },
  }));
}
