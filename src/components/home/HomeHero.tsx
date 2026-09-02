import Image from "next/image";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { PRODUCT_NAME } from "@/lib/brand";
import { corpusCensus, type CensusEntry } from "@/lib/home/corpusCensus";
import type { HomeHeroVisual } from "@/lib/home/homeHeroVisuals";
import type { SeedWordsByKind } from "@/lib/home/seedWords";

import { HomeCensusLine } from "./HomeCensusLine";
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
   * The five corpus classes and their sizes, counted per request by the server
   * page. Defaults to the classes without their figures, so Storybook and a
   * test can render the band with no database behind it.
   */
  census?: CensusEntry[];
  /** The visual drawn once by the server for this page request. */
  visual?: HomeHeroVisual;
}

// @req REQ-044
// @req REQ-115
export function HomeHero({
  seedWords,
  peopleCountsByCountry,
  census = corpusCensus(null),
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
          {/* One string inside an expression, never bare JSX text: SWC drops
              the space between an expression and the text that follows it on
              the same line — the bug that shipped « EthniAfricapublie » and
              which no test in this repo reproduces. Inside a string literal no
              whitespace rule applies.

              The no-break space before « ? » is the French rule, and it is
              load-bearing rather than typographic politeness: the headline
              wraps on a phone, and a plain space lets « ? » start a line of
              its own. Written as an escape because the character is invisible
              in a diff, and a plain space typed here would survive review.

              And no aria-label. The heading used to show one class that turned
              every few seconds while its accessible name listed all five — a
              landmark whose name was a different sentence from its text. The
              census line below carries the five classes now, so the heading
              says the one thing it means and is called by it. */}
          <h1>{"Une question sur l'Afrique\u00a0?"}</h1>
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

          {/* What the corpus holds, counted per request by the server page.
              This is the half of the retired reel that mattered: it named a
              class and gave its size, one at a time. The line states all five
              at once, and states them to every reader — the reel never armed
              at all under prefers-reduced-motion. */}
          <HomeCensusLine entries={census} />

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
        /* \`balance\` is back, and now it has something to balance.

           It was dropped when the headline carried the reel: an inline-block
           sized to its longest segment — 512px of the copy column's 648 at
           1440 — cannot share a line with anything, so balancing spent its
           freedom on the three words left over and broke the band as
           « Une question / sur les / 790 peuples / d'Afrique ? ». The
           headline is six short words of plain text again, which is exactly
           the case balance is for. */
        .home-hero-copy h1 {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: var(--home-text-hero-title);
          line-height: 1.04;
          margin: 0 0 16px;
          color: var(--afh-text);
          text-wrap: balance;
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

        /* The cartouche: what the corpus holds, under the answer.

           A rank below the prose it follows — small size, soft ink — because
           these are the corpus's own measurements and not the band's argument.
           The figures alone take full ink, so the line reads as five totals
           rather than as a sentence.

           \`balance\` rather than \`pretty\`: the entries are of very uneven
           length ("54 pays" against "3 134 appellations") and at 430px the
           line takes three rows, where balance keeps them even instead of
           leaving one word alone on the last. */
        .home-hero-census {
          margin: 12px auto 0;
          max-width: 52ch;
          font-size: var(--afh-text-small);
          line-height: var(--afh-leading-small);
          color: var(--afh-text-soft);
          font-variant-numeric: tabular-nums;
          text-wrap: balance;
        }
        /* No \`white-space: nowrap\` here, and that is the point. An entry
           holds no breakable space of its own — the figure is tied to its word
           and to its trailing separator by U+00A0 — so it is already
           unbreakable, and declaring nowrap on top of that also suppressed the
           plain space *after* each separator, which is the line's only break
           opportunity. The census then measured 499px at a 430px viewport and
           dragged the copy column out of the band with it. */
        .home-hero-census-figure {
          font-weight: 700;
          color: var(--afh-text);
        }
        /* A total the server could not read drops to the quiet-text ink and
           to book weight, so it reads as visibly not a figure and can never be
           mistaken for one.

           \`--afh-fg-muted\`, not \`--afh-text-muted\`: the two are the same
           hue on parchment but the second is reserved for non-text marks, and
           it measures 3.29:1 on a card — textColorContrastSweep catches the
           substitution, which is how this line was first written. */
        .home-hero-census-figure.is-unavailable {
          font-weight: 400;
          color: var(--afh-fg-muted);
        }
        /* Neither colour nor padding of its own. The ink is the line's soft
           ink, because a dimmer punctuation mark would have to come from the
           non-text ramp, which is exactly the token this line may not use; and
           the spacing is the two real spaces the separator is written with,
           because padding would have added air without adding the break
           opportunity that air implies. */
        .home-hero-census-sep {
          font-variant-numeric: normal;
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
            /* 1.15/0.85, not an even split. It was set to give the rotating
               headline the room its widest segment needed; that headline is
               gone and the split stays, because what now claims the width is
               the census line — 499px on one row at 1440, which an even 0.5fr
               column would fold onto two. The visual gives up ~18% of its
               width and nothing else: its 620px is a max-width, a ceiling and
               not a floor. */
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
               the copy at 576 was breaking the headline across a line more
               than it needed inside a column with room for it. The prose keeps
               its own measure through .home-hero-answer's 52ch, which is what
               actually governs reading comfort here. */
            max-width: 100%;
            text-align: left;
          }
          /* Both prose blocks, in one declaration. They are centred boxes on a
             phone and flush-left here, and when the census had its own
             \`margin: auto\` it stayed centred inside a left-aligned column —
             a second left edge inside one block, which §8.1 of the brand
             charter counts as a defect. One rule, so they cannot part. */
          .home-hero-answer,
          .home-hero-census {
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
