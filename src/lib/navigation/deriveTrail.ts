import {
  getLanguageFromRoute,
  getLocalizedRoute,
  getPageFromRoute,
} from "@/lib/routing";
import {
  AXIS_HUB_PAGE,
  getAxisForPage,
  getAxisHubRoute,
} from "@/lib/hubs/axisRoutes";
import { translations } from "@/lib/translations";

/**
 * One crumb. Structurally the `BreadcrumbItem` `AfrikBreadcrumbs` renders,
 * declared here so the derivation does not depend on a component.
 */
// @req REQ-091
export interface TrailCrumb {
  label: string;
  href?: string;
}

/**
 * The trail for a path, read off the slug table rather than written by hand.
 *
 * Five call sites each composed their own, and they disagreed: a people fiche
 * opened on "Familles", a country fiche opened on the people the reader
 * happened to arrive from. Neither is the path — the URL is — and once the
 * routes nest under their axis (Lot 3, PR3), a hand-written trail keeps
 * naming the place a page used to live. Deriving it means the move costs
 * nothing here.
 *
 * The rule the derivation enforces: **never print a segment you cannot name.**
 * A fiche identifier is nameable only if the caller passes `entityLabel` —
 * this module has no corpus and will not invent one — and a sub-route only if
 * `t.trail.segments` has words for it. At the first segment it cannot name the
 * trail stops, keeping the crumbs it is sure of, rather than spelling out a
 * `PPL_YORUBA` that reads as debris.
 *
 * The last crumb loses its href only when the trail reached the end of the
 * path: that crumb is then where the reader stands. A truncated trail keeps
 * every href, because the reader is somewhere further down and each crumb is
 * still a way back.
 *
 * @param pathname a site path, e.g. `/fr/peuples/PPL_YORUBA/liens`
 * @param entityLabel how to name the fiche the path names, when it names one
 */
// @req REQ-091
export function deriveTrail(
  pathname: string,
  entityLabel?: string
): TrailCrumb[] {
  const language = getLanguageFromRoute(pathname);
  const page = getPageFromRoute(pathname);
  if (!language || !page) return [];

  const t = translations[language].trail;
  const hubRoute = getLocalizedRoute(language, page);

  /**
   * The trail opens on the home and, where there is one, on the axis that
   * leads to the page — `Accueil › Explorer › Peuples › Bété`, the hierarchy
   * the URLs have encoded since the routes nested under their hub.
   *
   * A page no axis leads to gets `Accueil › <page>`: two crumbs, honest about
   * being an escape hatch rather than a hierarchy, because inventing a parent
   * for the legal pages would be inventing a claim about the site's shape.
   *
   * The axis crumb is skipped on the axis hub itself. `Accueil › Explorer ›
   * Explorer` would name the same place twice, and the charter already rules
   * on that shape: a level offering no choice is not a level.
   */
  const crumbs: TrailCrumb[] = [{ label: t.home, href: `/${language}` }];

  const axis = getAxisForPage(page);
  if (axis && AXIS_HUB_PAGE[axis] !== page) {
    crumbs.push({
      label: t.pages[AXIS_HUB_PAGE[axis]],
      href: getAxisHubRoute(language, axis),
    });
  }

  crumbs.push({ label: t.pages[page], href: hubRoute });

  const tail = pathname.slice(hubRoute.length).split("/").filter(Boolean);
  let complete = true;

  for (const [index, segment] of tail.entries()) {
    // The segment directly below a hub is an entity identifier; everything
    // deeper is a named sub-route of that fiche.
    const label = index === 0 ? entityLabel : t.segments[segment];
    if (!label) {
      complete = false;
      break;
    }
    crumbs.push({
      label,
      href: `${hubRoute}/${tail.slice(0, index + 1).join("/")}`,
    });
  }

  if (complete) delete crumbs[crumbs.length - 1].href;
  return crumbs;
}

/**
 * The way back to the fiche a reader arrived from.
 *
 * Provenance, not hierarchy. A country reached from a people fiche was given
 * a "Peuples › Yoruba › Bénin" trail, which asserts that Bénin sits under the
 * Yoruba — it does not, and the same country reached from the hub got a
 * different trail for the same page. The arrival is still worth offering; it
 * is offered as a return link, beside the trail rather than inside it.
 */
// @req REQ-091
export function backLinkLabel(entityLabel: string): string {
  return `${translations.fr.trail.backTo} ${entityLabel}`;
}
