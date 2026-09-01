import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { DirectoryEntityType } from "@/lib/hubs/directoryAccent";
import type { Language } from "@/types/shared";

/**
 * The three facets of the unified Explorer hub.
 *
 * They are three *static sibling routes*, not `explorer/[facet]`: a dynamic
 * segment there would swallow `/fr/atlas/recherche`, and the facet switch
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
  /**
   * The head `FacetHubShell` prints above the globe: the provenance line and
   * the page's only h1.
   *
   * It lives here rather than in each facet page because a page is the shell's
   * `children` and cannot render above the band it sits under — and the band
   * is some 520px of full-bleed night, so a head left in the parchment is
   * below the fold on every screen. A reader landing on a facet had the trail
   * and nothing else to say which of the three they were on. `FicheSequence`
   * settled the identical question for the fiches by lifting their head out of
   * the parchment; this is that rule, applied to the hub the fiches hang off.
   */
  eyebrow: string;
  title: string;
  /**
   * The sentence that separates the facet from the filters.
   *
   * They collide in the reader's language, not by accident: "pays" names a
   * facet *and* a filter, so a reader on the peoples facet is offered a
   * country control and has every reason to read it as a way to switch. The
   * two do different things — the facet decides what the list is made of, the
   * filter decides how much of it is shown — and nothing on the page said so.
   * Each facet says it in its own terms, because "filtrer par pays" means
   * something different on each one.
   */
  filterHint: string;
}

// @req REQ-114
export const FACETS: readonly FacetDefinition[] = [
  // Declaration order is the order the switcher walks, and it matches the
  // Explorer hub's module list above it: pays, peuples, familles. The two are
  // one running order seen twice, so they are ordered together or the reader
  // meets the same three entities in two different sequences.
  {
    key: "countries",
    page: "countries",
    entityType: "country",
    label: "Pays",
    sectionName: "Pays",
    eyebrow: "atlas · les pays d'Afrique",
    title: "Les pays d'Afrique",
    filterHint:
      "La liste est faite de pays. Les filtres la restreignent sans changer sa nature : filtrer par famille linguistique montre les pays où cette famille est présente, pas la famille elle-même.",
  },
  {
    key: "peoples",
    page: "peoples",
    entityType: "people",
    label: "Peuples",
    sectionName: "Peuples",
    eyebrow: "atlas · les peuples d'Afrique",
    title: "Les peuples d'Afrique",
    filterHint:
      "La liste est faite de peuples. Les filtres la restreignent sans changer sa nature : filtrer par pays montre les peuples que ce pays documente, pas le pays lui-même.",
  },
  {
    key: "families",
    page: "families",
    entityType: "language-family",
    label: "Familles",
    sectionName: "Familles linguistiques",
    eyebrow: "atlas · les familles linguistiques",
    title: "Familles linguistiques",
    filterHint:
      "La liste est faite de familles linguistiques. Les filtres la restreignent sans changer sa nature : filtrer par pays montre les familles présentes dans ce pays, pas le pays lui-même.",
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
 * The facet a page type is, or null.
 *
 * The navigation asks this, and it must not answer it from a list of its own.
 * Peoples, families and countries were three sibling modules before they became
 * three facets of one hub; a menu that still offers them as three destinations
 * is describing the site as it was. `FACETS` is where that changed, so it is
 * where the menu reads it — a fourth facet, or one promoted back to a module,
 * moves the menu with it.
 *
 * It answers with the facet rather than a boolean because the caller needs the
 * short label too: "Peuples", not "Les peuples d'Afrique". A module names a
 * destination and has to say which one among all of them; a facet names a state
 * of the page above it, and the full title there reads as a fourth destination
 * again.
 */
// @req REQ-114
export const getFacetByPage = (page: PageType): FacetDefinition | null =>
  FACETS.find((facet) => facet.page === page) ?? null;

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
