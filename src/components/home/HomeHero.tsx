import Image from "next/image";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { PRODUCT_NAME } from "@/lib/brand";
import {
  HEADLINE_ACCESSIBLE_NAME,
  headlineSegments,
} from "@/lib/home/headlineSegments";
import type { HomeHeroVisual } from "@/lib/home/homeHeroVisuals";
import type { SeedWordsByKind } from "@/lib/home/seedWords";

import { HomeHeadlineReel } from "./HomeHeadlineReel";
import { HomeHeroSearch } from "./HomeHeroSearch";

/**
 * The search-first opening band (REQ-115, ETNI-1404).
 *
 * Reading order stays stable across widths: question and primary search,
 * then drawn visual. At desktop the grid places the copy in the left column
 * while the visual occupies the right; CSS never changes the accessible
 * order.
 */
export interface HomeHeroProps {
  /**
   * The seed chips' words, drawn from the corpus per request by the page.
   * Optional so Storybook can render the band with no database behind it —
   * the chips then fall back to the curated dozen.
   */
  seedWords?: SeedWordsByKind;
  /** Documented peoples per country, forwarded to the globe's honest field. */
  peopleCountsByCountry?: Record<string, number>;
  /**
   * The classes the headline turns through, figures included, built by the
   * server page from the same totals the counters show. Defaults to the five
   * classes without their figures, so Storybook and a test can render the band
   * with no database behind it.
   */
  headline?: string[];
  /** The visual drawn once by the server for this page request. */
  visual?: HomeHeroVisual;
}

// @req REQ-044
// @req REQ-115
export function HomeHero({
  seedWords,
  peopleCountsByCountry,
  headline = headlineSegments(null),
  visual = { kind: "globe" },
}: HomeHeroProps = {}) {
  return (
    <section
      // Landmark label dropped during the light-parchment swap (ETNI-820,
      // 6ae60726) — restored here (ETNI-822) because e2e/home-visual.spec.ts
      // resolves the hero's crop origin via this exact locator.
      aria-label={PRODUCT_NAME}
      className="home-hero"
    >
      {/* The shell keeps every hero item on the page's shared content edge. */}
      <div className="afh-shell home-hero-inner">
        <header className="home-hero-copy afh-phone-centred">
          {/* Every fragment is a string inside an expression, never bare JSX
              text beside one: SWC drops the space between an expression and
              the text that follows it on the same line — the bug documented
              below, which shipped « EthniAfricapublie » and which no test in
              this repo reproduces. Inside a string literal no whitespace rule
              applies, so the spaces around the reel are safe.

              The no-break space before « ? » is the French rule, and it is
              load-bearing rather than typographic politeness: the headline
              wraps on a phone, and a plain space lets « ? » start a line of
              its own.

              aria-label, not the content: the reel turns every four seconds
              and a level-one heading is a landmark. The name states all five
              classes once and never moves. */}
          <h1 aria-label={HEADLINE_ACCESSIBLE_NAME}>
            <span className="home-hero-headline-line">
              {"Une question sur les "}
            </span>
            <HomeHeadlineReel segments={headline} />
            <span className="home-hero-headline-line">{" d'Afrique ?"}</span>
          </h1>
          {/* One string, not the product name followed by JSX text. Next's
              SWC transform drops the space between an expression and the text
              that follows it on the same line, so the band once shipped
              « EthniAfricapublie » — in the first line of prose the site
              offers. Neither vitest's transform nor Prettier reproduces that
              reading: the runner keeps the space, so every test here stayed
              green, and Prettier deletes an explicit space expression it
              believes JSX already implies. Inside a template literal no
              whitespace rule applies at all. */}
          <p className="home-hero-answer" data-testid="home-hero-answer">
            {`${PRODUCT_NAME} y répond fiche par fiche, en accès libre, ` +
              `et donne la source de chaque réponse.`}
          </p>

          {/* Search is the band's primary action; seed words keep its three
              corpus entry types visible before the reader starts typing. */}
          <HomeHeroSearch seedWords={seedWords} />
        </header>

        <div
          className={`home-hero-visual home-hero-${visual.kind}`}
          data-testid={`home-hero-${visual.kind}`}
        >
          {visual.kind === "globe" ? (
            /* Placement only: the shared stage keeps ownership of WebGL
               probing, its SVG fallback, keyboard controls and reduced-motion
               behaviour. */
            <ContinentGlobeStage
              peopleCountsByCountry={peopleCountsByCountry}
              presentation="hero"
              autoRotate
            />
          ) : (
            <figure className="home-hero-figure" data-testid="home-hero-figure">
              <div className="home-hero-image-frame">
                <Image
                  src={visual.image.src}
                  alt={visual.image.alt}
                  fill
                  sizes="(min-width: 1200px) 620px, (min-width: 768px) 560px, calc(100vw - 32px)"
                  priority
                  style={{ objectPosition: visual.image.position }}
                />
              </div>
              <figcaption>{visual.image.credit}</figcaption>
            </figure>
          )}
        </div>
      </div>

      <div className="home-hero-seam" aria-hidden="true" />

      <style>{`
        /* overflow-x, and clip rather than hidden. The band needs the 100vw
           bleed bounded, but overflow:hidden bound both axes and so trapped
           the search panel that opens under the field — which is why that
           panel used to sit in the flow and push the page down. Unlike
           hidden, clip does not force the other axis to a scroll container,
           so overflow-y stays genuinely visible. */
        .home-hero {
          position: relative;
          overflow-x: clip;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background: var(--afh-bg);
          color: var(--afh-text);
        }

        .home-hero-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas:
            "copy"
            "globe";
          gap: 16px;
          padding-block: 24px 28px;
        }

        .home-hero-copy {
          grid-area: copy;
          min-width: 0;
          max-width: 780px;
          margin: 0 auto;
          text-align: center;
        }
        .home-hero-copy h1 {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--home-text-hero-title);
          line-height: 1.04;
          margin: 0 0 16px;
          color: var(--afh-text);
        }

        /* Three lines, declared rather than balanced.

           The reel is an inline-block sized to its longest segment — 512px of
           the copy column's 648 at 1440 — so it cannot share a line with
           anything, and \`text-wrap: balance\` spent its freedom on the words
           that were left: the headline broke as « Une question / sur les /
           790 peuples / d'Afrique ? », four lines with a widow in the middle.
           Blocks put the break where the sentence already has its joint, and
           give the same three lines at 430 that the phone was getting by
           accident. \`balance\` is gone with the same change: it has nothing
           left to balance, and leaving it would only invite the next reader to
           think it is doing something. */
        .home-hero-headline-line {
          display: block;
        }

        /* A class, not \`.home-hero-copy p\`: a descendant selector outranks
           a single class, so an element rule would silently override
           whatever the answer sets for itself.

           Reading size and full ink, because this is now the band's only
           prose. At the retired lede's smaller, softer grey it would read
           as a caption under the headline rather than as its answer. No
           rule above it either — the hairline separated a standfirst from
           a lede, and neither is here now. */
        .home-hero-answer {
          margin: 0 auto;
          max-width: 52ch;
          font-size: var(--afh-text-body);
          line-height: var(--afh-leading-body);
          color: var(--afh-text);
        }

        .home-hero-visual {
          grid-area: globe;
          min-width: 0;
          width: 100%;
        }

        /* The shared globe is intentionally compact only on this opening
           surface. Its engine and interaction model remain untouched. */
        .home-hero-globe .home-globe-stage {
          min-height: 300px;
          --afh-globe-stage-height: 300px;
          max-width: 430px;
        }

        .home-hero-figure {
          width: 100%;
          max-width: 430px;
          margin: 0 auto;
        }
        .home-hero-image-frame {
          position: relative;
          overflow: hidden;
          width: 100%;
          aspect-ratio: 1;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-lg);
          background: var(--afh-surface);
          box-shadow: var(--afh-elev-warm);
        }
        .home-hero-image-frame img {
          object-fit: cover;
        }
        .home-hero-figure figcaption {
          margin-top: 10px;
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
        }

        /* Taller on the phone than the desktop's original 26px: it is the
           one thing that tells a reader the hero has ended and the next
           section has begun, and at 430px the two used to abut close enough
           to read as one band. The @media below restores the desktop value,
           which was never the complaint. */
        .home-hero-seam {
          height: 44px;
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
        }

        @media (min-width: 768px) {
          .home-hero-inner {
            gap: 24px;
            padding-block: 32px 36px;
          }
          .home-hero-seam {
            height: 26px;
          }
          .home-hero-globe .home-globe-stage {
            min-height: 380px;
            --afh-globe-stage-height: 380px;
            max-width: 560px;
          }
          .home-hero-figure {
            max-width: 560px;
          }
        }

        @media (min-width: 1200px) {
          .home-hero-inner {
            /* 1.15/0.85, not an even split: the copy column keeps the room
               that lets « Une question sur les » stay on one line (see
               .home-hero-copy below). The visual gives up ~18% of its width
               and nothing else: its 620px is a max-width, a ceiling and not
               a floor. */
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
            grid-template-areas: "copy globe";
            align-items: center;
            column-gap: 48px;
            row-gap: 20px;
            padding-block: 40px;
          }
          .home-hero-copy {
            margin: 0;
            /* The column, not 36rem. That cap was set when the two columns
               split evenly at 564px; the left one is 648px now, and holding
               the copy at 576 was breaking « Une question sur les » across two
               lines inside a column with room for it — the headline stayed at
               four lines even after the reel got a line of its own. The prose
               keeps its own measure through .home-hero-answer's 52ch, which is
               what actually governs reading comfort here. */
            max-width: 100%;
            text-align: left;
          }
          .home-hero-answer {
            margin-inline: 0;
          }
          .home-hero-globe .home-globe-stage {
            min-height: 460px;
            --afh-globe-stage-height: 460px;
            max-width: 620px;
          }
          .home-hero-figure {
            max-width: 620px;
            margin-inline: 0;
          }
        }
      `}</style>
    </section>
  );
}
