import Image from "next/image";
import type { ReactNode } from "react";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { PRODUCT_NAME } from "@/lib/brand";
import type { HomeHeroVisual } from "@/lib/home/homeHeroVisuals";
import type { SeedWordsByKind } from "@/lib/home/seedWords";

import { HomeHeroSearch } from "./HomeHeroSearch";

/**
 * The search-first opening band (REQ-115, ETNI-1404).
 *
 * Reading order stays stable across widths: question and primary search,
 * drawn visual, then corpus counters. At desktop the grid places the first
 * and third items in the left column while the visual occupies the
 * right; CSS never changes the accessible order.
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
  /** Corpus counters supplied by the server page, after the visual in reading order. */
  counts?: ReactNode;
  /** The visual drawn once by the server for this page request. */
  visual?: HomeHeroVisual;
}

// @req REQ-044
// @req REQ-115
export function HomeHero({
  seedWords,
  peopleCountsByCountry,
  counts,
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
          {/* The thin no-break space is the French rule before a question
              mark, and it is load-bearing here rather than typographic
              politeness: the headline wraps to two lines on a phone, and a
              plain space lets « ? » start the third one on its own. */}
          <h1>Qui sont les peuples d&apos;Afrique&nbsp;?</h1>
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
            {`${PRODUCT_NAME} y répond peuple par peuple, en accès libre, ` +
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

        {counts && <div className="home-hero-counts">{counts}</div>}
      </div>

      <div className="home-hero-seam" aria-hidden="true" />

      <style>{`
        .home-hero {
          position: relative;
          overflow: hidden;
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
            "globe"
            "counts";
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
          text-wrap: balance;
          color: var(--afh-text);
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

        .home-hero-counts {
          grid-area: counts;
          min-width: 0;
        }

        .home-hero-seam {
          height: 26px;
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
        }

        @media (min-width: 768px) {
          .home-hero-inner {
            gap: 24px;
            padding-block: 32px 36px;
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
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas:
              "copy globe"
              "counts globe";
            align-items: center;
            column-gap: 48px;
            row-gap: 20px;
            padding-block: 40px;
          }
          .home-hero-copy {
            margin: 0;
            max-width: 36rem;
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
