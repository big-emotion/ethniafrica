import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { DirectoryEntityType } from "@/components/views/DirectoryHero";
import type { Language } from "@/types/shared";

/**
 * The three facets of the unified Explorer hub.
 *
 * They are three *static sibling routes*, not `explorer/[facet]`: a dynamic
 * segment there would swallow `/fr/explorer/recherche`, and the facet switch
 * has to be three plain anchors so it works with no JavaScript and a crawler
 * can follow it.
 *
 * Which means this table is not a router — it is the vocabulary the switcher,
 * the accent scope and the shell all read, so that "which facet am I on" has
 * exactly one answer instead of three that drift.
 */
export type FacetKey = "peoples" | "families" | "countries";

export interface FacetDefinition {
  key: FacetKey;
  /** The page type whose slug addresses this facet. Routes are never typed out. */
  page: PageType;
  /**
   * The hue the facet scopes to its subtree. `DIRECTORY_ACCENT_CLASS` already
   * maps people→terre, country→ocre, family→teal, so the per-facet accent is
   * a lookup rather than a new palette decision.
   */
  entityType: DirectoryEntityType;
  /** The switcher's anchor text. */
  label: string;
  /** What `PageLayout` names the section in the header. */
  sectionName: string;
}

// @req REQ-114
export const FACETS: readonly FacetDefinition[] = [
  {
    key: "peoples",
    page: "peoples",
    entityType: "people",
    label: "Peuples",
    sectionName: "Peuples",
  },
  {
    key: "families",
    page: "families",
    entityType: "language-family",
    label: "Familles",
    sectionName: "Familles linguistiques",
  },
  {
    key: "countries",
    page: "countries",
    entityType: "country",
    label: "Pays",
    sectionName: "Pays",
  },
] as const;

// @req REQ-114
export const getFacet = (key: FacetKey): FacetDefinition => {
  const facet = FACETS.find((candidate) => candidate.key === key);
  if (!facet) {
    // Unreachable through the type, reachable through a cast at a boundary.
    throw new Error(`Unknown facet: ${key}`);
  }
  return facet;
};

// @req REQ-114
export const getFacetRoute = (language: Language, key: FacetKey): string =>
  getLocalizedRoute(language, getFacet(key).page);

/**
 * The facet a path addresses, or null.
 *
 * Exact match, deliberately: `getPageFromRoute` answers "peoples" for a
 * *fiche* too, since a fiche's path starts with its directory's slug. The
 * shell hangs off the whole Explorer subtree, so anything looser would hand
 * every fiche a facet switcher and a second globe.
 */
// @req REQ-114
export const getFacetFromRoute = (pathname: string): FacetKey | null => {
  const normalized = pathname.replace(/\/+$/, "");
  const language = normalized.split("/").filter(Boolean)[0] as Language;
  if (!language) return null;

  for (const facet of FACETS) {
    if (normalized === getFacetRoute(language, facet.key)) {
      return facet.key;
    }
  }
  return null;
};

/**
 * A filter value the reader actually chose, or null.
 *
 * The same guard `definedScope()` applies to a game's scope, and for the same
 * reason: a native `<select>` submits its empty option as `""`, so "no filter"
 * arrives as a present-but-empty parameter. Treating that as a value narrows
 * the corpus to nothing and the reader is shown an empty page they did not ask
 * for.
 *
 * There is no `__all__` sentinel here. That sentinel exists in the search
 * surface only because a shadcn `SelectItem` may not carry an empty value —
 * a native `<option value="">` has no such rule, so the workaround does not
 * come along.
 */
// @req REQ-114
export const definedFilter = (
  raw: string | string[] | undefined | null
): string | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};
