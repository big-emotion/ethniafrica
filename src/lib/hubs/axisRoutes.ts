import { MODULE_DEFINITIONS, type AccessMode } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The hub page each access mode is addressed by.
 *
 * The only half of the axis-to-route relation that has to be written down.
 * Everything else about an axis — which modules it holds, which accent it
 * wears — the registry already states once, and the map below reads it back.
 */
// @req REQ-114
export const AXIS_HUB_PAGE: Record<AccessMode, PageType> = {
  atlas: "atlasHub",
  dossiers: "dossiersHub",
  jeux: "jeuxHub",
};

/**
 * Where an axis lives, for callers composing a route below it.
 *
 * A game is `<jeux hub>/<slug>` and a facet will be `<atlas hub>/<facet>`;
 * both used to spell the segment out. Spelled out, the segment stays behind
 * when the axis moves — which is the whole failure mode the slug table exists
 * to prevent.
 */
// @req REQ-114
export const getAxisHubRoute = (language: Language, mode: AccessMode): string =>
  getLocalizedRoute(language, AXIS_HUB_PAGE[mode]);

const AXIS_BY_PAGE = new Map<PageType, AccessMode>([
  ...(Object.entries(AXIS_HUB_PAGE) as [AccessMode, PageType][]).map(
    ([mode, page]): [PageType, AccessMode] => [page, mode]
  ),
  ...MODULE_DEFINITIONS.filter((definition) => definition.page).map(
    (definition): [PageType, AccessMode] => [
      definition.page,
      definition.accessMode,
    ]
  ),
]);

/**
 * Which axis owns a page, or null for a page no axis leads to.
 *
 * Derived from the registry rather than declared beside it: a page's axis is
 * already stated once, on the module that lists it, and a second table would
 * be a second chance to file the same page under two verbs — which, once the
 * routes nest, means two URLs and no canonical.
 */
// @req REQ-114
export const getAxisForPage = (page: PageType): AccessMode | null =>
  AXIS_BY_PAGE.get(page) ?? null;
