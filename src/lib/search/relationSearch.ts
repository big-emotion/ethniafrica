/**
 * Relation-scoped search: "the peoples of the Krou family", "the peoples of
 * Côte d'Ivoire".
 *
 * These are expressed as URL parameters reached through plain links rather
 * than as callbacks, which is what lets the family and country chips on a
 * result card behave identically inside the search modal and on /recherche,
 * stay shareable, and survive the back button — without threading a handler
 * through either surface.
 *
 * One relation is active at a time. Two simultaneous scopes would need a
 * second query shape for a combination the corpus is not asked for.
 */

import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export type SearchRelationKind = "family" | "country";

export interface SearchRelation {
  kind: SearchRelationKind;
  id: string;
}

const PARAM_FOR: Record<SearchRelationKind, string> = {
  family: "family",
  country: "country",
};

// @req REQ-002
export function buildRelationSearchHref(
  language: Language,
  relation: SearchRelation,
  query?: string
): string {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query);
  params.set(PARAM_FOR[relation.kind], relation.id);

  return `${getLocalizedRoute(language, "search")}?${params}`;
}

// @req REQ-002
export function readRelation(
  searchParams: Pick<URLSearchParams, "get">
): SearchRelation | null {
  // Family wins when both are present, so the reader always gets one
  // unambiguous scope instead of a silently dropped half.
  const family = searchParams.get(PARAM_FOR.family);
  if (family) return { kind: "family", id: family };

  const country = searchParams.get(PARAM_FOR.country);
  if (country) return { kind: "country", id: country };

  return null;
}

// @req REQ-002
export function relationSearchParams(relation: SearchRelation | null): {
  familyId?: string;
  countryId?: string;
} {
  if (!relation) return {};
  return relation.kind === "family"
    ? { familyId: relation.id }
    : { countryId: relation.id };
}
