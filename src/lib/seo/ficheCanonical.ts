import type { Metadata } from "next";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import {
  getCountryRoute,
  getFamilyRoute,
  getLanguageRoute,
  getPatronymeRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import type { Language } from "@/types/shared";

/**
 * The canonical URL of a fiche.
 *
 * Three things this settles, none of which the route files should each answer
 * for themselves:
 *
 * **Absolute, from `CANONICAL_DOMAIN`, never `metadataBase`.** The root
 * layout's base falls back to `localhost:3000`, and a canonical pointing at
 * localhost is worse than none — it tells a crawler the real page is one it
 * cannot fetch. `src/app/sitemap.ts` refuses `metadataBase` for the same
 * reason.
 *
 * **The version is dropped.** A pinned `PPL_YORUBA@v3` renders an archived
 * revision of the same fiche: near-identical prose at a second address, which
 * is the textbook shape of self-competing duplicate content. Its canonical is
 * the live fiche. The snapshot stays reachable and readable — it just stops
 * asking to be indexed in the live page's place.
 *
 * **It exists at all.** Until Lot 3 the three fiche routes declared no
 * canonical of any kind, which was survivable only while each fiche had
 * exactly one address. Moving all three under their hub gives every fiche a
 * second address for as long as the 308s stand, and a redirect window without
 * canonicals is the window in which the duplicate gets indexed.
 */
// @req REQ-091
export type FicheKind = "country" | "people" | "family" | "language" | "name";

const ROUTE_BY_KIND: Record<
  FicheKind,
  (language: Language, id: string) => string
> = {
  country: getCountryRoute,
  people: getPeopleRoute,
  family: getFamilyRoute,
  language: getLanguageRoute,
  name: getPatronymeRoute,
};

/**
 * `alternates.canonical` for a fiche, or no metadata at all when the slug
 * names no fiche — the route answers that with a 404, and a 404 that claims a
 * canonical is a 404 asking to be indexed.
 */
// @req REQ-091
export function ficheCanonical(
  kind: FicheKind,
  language: Language,
  slug: string
): Metadata {
  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  if (!parsed) return {};

  const path = ROUTE_BY_KIND[kind](language, encodeURIComponent(parsed.slug));
  return { alternates: { canonical: `https://${CANONICAL_DOMAIN}${path}` } };
}
