import type { ReactNode } from "react";

import type { HeroVariant } from "@/lib/layout/heroVariant";

/**
 * The band every page opens on.
 *
 * Two variants, one component. The immersive band takes the viewport and is
 * reserved for the four entry points (home, and the three axis hubs); the
 * compact band is short and belongs to every destination. Splitting them into
 * two components is how a system ends up with two title treatments that drift
 * apart — `heroVariant.ts` decides which, from the route.
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
  variant: HeroVariant;
  title: string;
  subtitle?: string;
  /**
   * The breadcrumb, passed in rather than mounted. `SiteTrail` derives itself
   * from the router; taking it as a slot keeps this component a plain function
   * of its props and lets the shell stay the single place the trail is built.
   */
  trail?: ReactNode;
  /**
   * The visual the immersive band sets beside its copy. Decorative by
   * contract — it argues the copy next to it, so a reader who has the copy has
   * already had the argument, and an alt text here would say it twice.
   */
  media?: ReactNode;
}

// @req REQ-115
export function PageHero({
  variant,
  title,
  subtitle,
  trail,
  media,
}: PageHeroProps) {
  return (
    <section
      className="afh-hero"
      data-testid="page-hero"
      data-hero-variant={variant}
    >
      <div className="afh-shell afh-hero-inner">
        <div className="afh-hero-plate" data-testid="page-hero-plate">
          <h1 className="afh-hero-title page-title-gradient">{title}</h1>
          {subtitle ? (
            <p className="afh-hero-subtitle" data-testid="page-hero-subtitle">
              {subtitle}
            </p>
          ) : null}
          {trail}
        </div>
        {media ? (
          <div className="afh-hero-media" data-testid="page-hero-media">
            {media}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PageHero;
