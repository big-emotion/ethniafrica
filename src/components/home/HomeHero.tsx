import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";
import { PRODUCT_NAME } from "@/lib/brand";

/**
 * The home's opening band (REQ-115). Nothing here is pinned to a surface
 * any more: the whole band, the globe's panel included, follows the reader's
 * choice. DEC-022 — dataviz on the night surface — still governs a fiche's
 * atlas, where the globe is a panel inside a page of prose. The home's globe
 * is not a panel but the page's subject, and a dark disc held over a
 * parchment page read as a hole punched through it rather than as a sky.
 *
 * A dark sky is what makes a lit body read as round, so the globe does not
 * simply lose it — HomeGlobe repaints the sphere itself in the parchment
 * palette (--afh-globe-parchment-*), where the ocean is a shade deeper than
 * the page and the disc states its own edge.
 *
 * The band ends on a seam rather than a fade: the edge where the hero stops
 * and the archive starts is the page's one large gesture, and a gradient
 * would blur exactly the transition it exists to state.
 */
// @req REQ-044
// @req REQ-115
export function HomeHero() {
  return (
    <section
      // Landmark label dropped during the light-parchment swap (ETNI-820,
      // 6ae60726) — restored here (ETNI-822) because e2e/home-visual.spec.ts
      // resolves the hero's crop origin via this exact locator.
      aria-label={PRODUCT_NAME}
      className="home-hero"
    >
      <header className="home-hero-copy">
        <h1>
          Le continent raconté comme une <em>carte vivante</em>
        </h1>
        <p>L&apos;histoire africaine, racontée depuis son propre regard.</p>
      </header>

      {/* The globe says what it is from its own readout (HomeGlobe), which
          also tracks the morph — a second static caption beside it said
          less and covered it. */}
      <div className="home-globe-holder">
        <HomeGlobeStage />
      </div>

      <div className="home-hero-seam" aria-hidden="true" />

      <style>{`
        .home-hero {
          position: relative;
          overflow: hidden;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          display: flex;
          flex-direction: column;
          background: var(--afh-bg);
          color: var(--afh-text);
        }

        .home-hero-copy {
          padding: 46px 24px 0;
          max-width: 780px;
          margin: 0 auto;
          text-align: center;
        }
        .home-hero-copy h1 {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: clamp(30px, 5.6vw, 56px);
          line-height: 1.04;
          margin: 0 0 16px;
          text-wrap: balance;
          color: var(--afh-text);
        }
        .home-hero-copy h1 em {
          font-style: italic;
          color: var(--afh-display-accent);
        }
        .home-hero-copy p {
          margin: 0 auto;
          max-width: 56ch;
          font-size: 15.5px;
          line-height: 1.6;
          color: var(--afh-text-soft);
        }

        /* The panel carries no surface of its own: it runs edge to edge on
           the band's own ground, so the globe sits on the page rather than
           in a card cut out of it. */
        .home-globe-holder {
          position: relative;
          background: var(--afh-bg);
          padding-top: 16px;
          margin-top: 16px;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
        }

        .home-hero-seam {
          height: 26px;
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
        }

        @media (max-width: 700px) {
          .home-hero-copy {
            padding: 34px 20px 0;
            text-align: left;
          }
          .home-hero-copy p { font-size: 14.5px; }
        }

        /* The nav sits above the band, not inside it, so a plain 100dvh
           pushed the globe's own controls past the fold by exactly the
           height of the bar. */
        @media (min-width: 1200px) {
          .home-hero {
            min-height: calc(100vh - 56px);
            min-height: calc(100dvh - 56px);
          }
        }
      `}</style>
    </section>
  );
}
