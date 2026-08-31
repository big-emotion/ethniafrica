import type { ReactNode } from "react";

/**
 * The band every page opens on.
 *
 * One band, one height. It shipped with two — a short one for destinations
 * and a viewport-tall one for the home and the three axis hubs — and the tall
 * one was wrong on every route that could reach it. The plate is bottom-
 * aligned, so a screen-tall band set the title at the foot of a screen of
 * empty parchment: a reader opening the Explorer hub met the masthead, a field
 * of nothing, and the page's own name somewhere near the fold. The home, the
 * one surface the tall band was designed around, never rendered it at all —
 * it passes `hideHeader` and opens on its own globe.
 *
 * Inside the band sits the plate: an opaque card carrying the title, the
 * subtitle and the trail, in that order. The order is the whole point. The
 * shell used to print the trail *below* the band in its own container, so the
 * trail and the title started on different verticals and read as two separate
 * pieces of chrome rather than one caption qualifying one title.
 *
 * The band is full-bleed and the plate is not: the ground runs edge to edge,
 * the content stops at the shell box, which is what puts the hero title on the
 * same left edge as the logo above it and the copyright below.
 */
export interface PageHeroProps {
  /** The page's name, when the shell can compose the head from strings. */
  title?: string;
  subtitle?: string;
  /**
   * A head the page composed itself, filling the plate in place of `title` and
   * `subtitle`.
   *
   * The five surfaces a reader actually comes here for cannot state themselves
   * in two strings: a people fiche names its subject with the autonym beside
   * the exonym and the `lang` attribute that makes the pair readable, a
   * country fiche prints the corpus identifier and the reference year, a facet
   * prints its provenance line. They used to opt out of the band entirely
   * (`hideHeader`) and raise that head in a box of their own — which cost them
   * the plate, and sent the trail back to a second container on a second
   * vertical.
   *
   * When a head is given the band composes no title beside it: the head brings
   * the page's only h1.
   */
  head?: ReactNode;
  /**
   * The breadcrumb, passed in rather than mounted. `SiteTrail` derives itself
   * from the router; taking it as a slot keeps this component a plain function
   * of its props and lets the shell stay the single place the trail is built.
   */
  trail?: ReactNode;
}

// @req REQ-115
export function PageHero({ title, subtitle, head, trail }: PageHeroProps) {
  return (
    <section className="afh-hero" data-testid="page-hero">
      <div className="afh-shell afh-hero-inner">
        <div className="afh-hero-plate" data-testid="page-hero-plate">
          {head ?? (
            <>
              <h1 className="afh-hero-title page-title-gradient">{title}</h1>
              {subtitle ? (
                <p
                  className="afh-hero-subtitle"
                  data-testid="page-hero-subtitle"
                >
                  {subtitle}
                </p>
              ) : null}
            </>
          )}
          {trail}
        </div>
      </div>
    </section>
  );
}

export default PageHero;
