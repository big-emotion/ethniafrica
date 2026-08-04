/**
 * Compare handler — assembles entities for GET /v2/compare (FR64, AR8, AR9).
 *
 * Exposes `assembleComparison()` so the 9.4 SSR comparison page can reuse the
 * same assembly code path as this API route (one code path, two transports).
 */

import { getPeopleById } from "../services/peopleService";
import { getCountryById } from "../services/countryService";
import { getLanguageFamilyById } from "../services/languageFamilyService";
import { COMPARABLE_ROWS, type CompareEntityType } from "@/types/compare";
import type { CompareEntityTypeParam } from "@/api/v2/schemas/compare";

const INTERNAL_TYPE_BY_PARAM: Record<
  CompareEntityTypeParam,
  CompareEntityType
> = {
  peoples: "peuple",
  countries: "pays",
  "language-families": "famille",
};

interface ComparisonEntity {
  type: CompareEntityType;
  id: string;
  label: string;
  [sectionKey: string]: unknown;
}

export interface AssembleComparisonSuccess {
  ok: true;
  entityType: CompareEntityTypeParam;
  entities: ComparisonEntity[];
}

export interface AssembleComparisonFailure {
  ok: false;
  code: "NOT_FOUND";
  message: string;
}

export type AssembleComparisonResult =
  | AssembleComparisonSuccess
  | AssembleComparisonFailure;

interface EntityLookup {
  id: string;
  label: string;
  content: Record<string, unknown>;
}

async function lookupEntity(
  entityType: CompareEntityTypeParam,
  id: string
): Promise<EntityLookup | null> {
  if (entityType === "peoples") {
    const people = await getPeopleById(id);
    if (!people) return null;
    return { id: people.id, label: people.nameMain, content: people.content };
  }
  if (entityType === "countries") {
    const country = await getCountryById(id);
    if (!country) return null;
    return { id: country.id, label: country.nameFr, content: country.content };
  }
  const family = await getLanguageFamilyById(id);
  if (!family) return null;
  return { id: family.id, label: family.nameFr, content: family.content };
}

function buildEntity(
  internalType: CompareEntityType,
  entity: EntityLookup
): ComparisonEntity {
  const result: ComparisonEntity = {
    type: internalType,
    id: entity.id,
    label: entity.label,
  };
  for (const sectionKey of COMPARABLE_ROWS[internalType]) {
    result[sectionKey] = entity.content[sectionKey] ?? null;
  }
  return result;
}

// @req REQ-084
export async function assembleComparison({
  entityType,
  ids,
}: {
  entityType: CompareEntityTypeParam;
  ids: string[];
}): Promise<AssembleComparisonResult> {
  const internalType = INTERNAL_TYPE_BY_PARAM[entityType];
  const entities: ComparisonEntity[] = [];

  for (const id of ids) {
    const entity = await lookupEntity(entityType, id);
    if (!entity) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: `Entity not found: ${id}`,
      };
    }
    entities.push(buildEntity(internalType, entity));
  }

  return { ok: true, entityType, entities };
}
