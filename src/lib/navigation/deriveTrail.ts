import {
  getLanguageFromRoute,
  getLocalizedRoute,
  getPageFromRoute,
} from "@/lib/routing";
import { AXIS_HUB_PAGE, getAxisForPage } from "@/lib/hubs/axisRoutes";
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
  if (!language) return [];

  const t = translations[language].trail;
  const page = getPageFromRoute(pathname);

  /**
   * The trail opens on the home and, where there is one, on the axis that
   * leads to the page — `Accueil › Explorer › Peuples › Bété`, the hierarchy
   * the URLs have encoded since the routes nested under their hub.
   *
   * A page no axis leads to gets `Accueil › <page>`: two crumbs, honest about
   * being an escape hatch rather than a hierarchy, because inventing a parent
   * for the legal pages would be inventing a claim about the site's shape.
   *
   * The axis crumb carries no href. It names the access mode the page sits
   * under; it does not lead anywhere, because there is nowhere to lead to —
   * ETNI-1555 deleted the three axis landing pages, since a level offering no
   * choice is not a level. The atlas charter had already called this crumb a
   * non-navigating heading.
   *
   * The axis crumb is skipped on the axis hub itself, for the same reason
   * under a different name: `Accueil › Explorer › Explorer` would name the
   * same place twice.
   */
  const crumbs: TrailCrumb[] = [{ label: t.home, href: `/${language}` }];

  /**
   * Where the derivation switches from the slug table to walking segments.
   *
   * A page the table addresses gets its axis and its own crumb from the
   * table, and the walk starts below its hub. A page the table does not
   * address — the legal notices, the account screens — has no hub and no
   * axis, so the walk starts at the language root and names every segment
   * itself. Both then run the same loop, which is the point: the trail's
   * rules about what it may print should not depend on which branch a route
   * happened to arrive through.
   */
  let base = `/${language}`;

  if (page) {
    const axis = getAxisForPage(page);
    const isAxisHub = axis !== null && AXIS_HUB_PAGE[axis] === page;

    if (axis && !isAxisHub) {
      crumbs.push({ label: t.pages[AXIS_HUB_PAGE[axis]] });
    }

    base = getLocalizedRoute(language, page);

    // A game — `/fr/jouer/mercator` — has no `PageType` of its own, so the
    // slug table answers with the axis hub and the axis arrives here as the
    // page rather than above it. It is the same crumb and owes the same
    // silence: `base` still opens the walk below it, but nothing links to it.
    crumbs.push(
      isAxisHub
        ? { label: t.pages[page] }
        : { label: t.pages[page], href: base }
    );
  }

  const tail = pathname.slice(base.length).split("/").filter(Boolean);
  let complete = true;

  /**
   * `entityLabel` names the first segment the table cannot name, and only
   * that one.
   *
   * It used to name the segment directly below a hub, by position. Position
   * stopped being a reliable test once the trail covered routes with no hub
   * to be below: on `/fr/signalements/RPT_12` the identifier is the second
   * segment, and on `/fr/comparer/peuples/PPL_A,PPL_B` it is the third. What
   * the caller actually knows how to name is the one thing this module never
   * could — the identifier — so that is what the argument is spent on,
   * wherever in the path it falls.
   */
  let unusedEntityLabel = entityLabel;

  for (const [index, segment] of tail.entries()) {
    let label = t.segments[segment];
    if (!label && unusedEntityLabel) {
      label = unusedEntityLabel;
      unusedEntityLabel = undefined;
    }
    if (!label) {
      complete = false;
      break;
    }
    crumbs.push({
      label,
      href: `${base}/${tail.slice(0, index + 1).join("/")}`,
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
