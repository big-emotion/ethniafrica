import Image from "next/image";

import { PRODUCT_NAME } from "@/lib/brand";

import { HomeHeroSearch } from "./HomeHeroSearch";
import type { SeedWordsByKind } from "@/lib/home/seedWords";

/**
 * The home's opening band (REQ-115): a question, and one sentence answering it.
 *
 * The band used to run three registers — a nine-word headline, a lede, a
 * standfirst — and asked the reader to hold seven items before the first
 * scroll: four in the lede's list, three in the standfirst's. A reader
 * retains one. Eighty-six words of it were spent announcing what the section
 * immediately below (PurposeBlocks) then demonstrates on three cases: a
 * country named by its merchandise, a people carrying an exonym, a language
 * family long read as a people. The same claim was being made twice, and the
 * announcement was the weaker of the two — which is why the standfirst left
 * rather than shrank.
 *
 * The headline is now the question a first-time visitor actually arrives
 * with. It presumes nothing, which is the register the games charter §8 asks
 * of every quiz stem ("the audience knows nothing about the subject") applied
 * to the first line of the site; and a question is the one form a reader
 * retains whole.
 *
 * What the answer states is deliberately narrow: how the atlas proceeds
 * (peuple par peuple), what it costs (rien), and the one rule it holds
 * itself to (every answer carries its source). Not what the corpus contains
 * — the axis cards below print counts that read themselves, and a list here
 * would rebuild the lede that was just removed.
 *
 * Dropping the standfirst also flips the page order it used to justify: the
 * axes came first because the standfirst told the reader what the atlas was
 * for above the fold. It no longer does, so the argument goes back in front
 * of the three doors (see the section order in app/[lang]/page.tsx).
 *
 * The band ends on a seam rather than a fade: the edge where the hero stops
 * and the archive starts is the page's one large gesture, and a gradient
 * would blur exactly the transition it exists to state.
 */
export interface HomeHeroProps {
  /**
   * The seed chips' words, drawn from the corpus per request by the page.
   * Optional so Storybook can render the band with no database behind it —
   * the chips then fall back to the curated dozen.
   */
  seedWords?: SeedWordsByKind;
}

// @req REQ-044
// @req REQ-115
export function HomeHero({ seedWords }: HomeHeroProps = {}) {
  return (
    <section
      // Landmark label dropped during the light-parchment swap (ETNI-820,
      // 6ae60726) — restored here (ETNI-822) because e2e/home-visual.spec.ts
      // resolves the hero's crop origin via this exact locator.
      aria-label={PRODUCT_NAME}
      className="home-hero"
    >
      {/* Copy left, visual right — the shell box, so the headline starts on
          the same left edge as the logo above it. */}
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

          {/* The band's one action, and it is the one readers were already
              taking: the masthead's magnifier was the only affordance above
              the fold, so that is where they went. It carries no count of its
              own — the axis cards below print figures that read themselves,
              and restating them here would rebuild the lede this band was
              stripped of. */}
          <HomeHeroSearch seedWords={seedWords} />
        </header>

        {/* The argument, drawn. Not decoration and not a photograph of the
            continent: al-Idrisi made this in 1154 for Roger II of Sicily,
            oriented south-up, and he was born in Ceuta. A world map made from
            inside Africa, by someone naming it from where he stood, answers
            the headline's question in one image.

            The credit is rendered, not filed: public/images/home/CREDITS.md
            records the provenance, but a licence is only honoured on the page
            the picture is published on. */}
        <figure className="home-hero-figure" data-testid="home-hero-figure">
          <Image
            src="/images/home/al-idrisi-1154.jpg"
            alt="Mappemonde d'al-Idrisi, 1154 : le sud est en haut, et l'Afrique occupe la moitié supérieure de la carte."
            width={960}
            height={1046}
            sizes="(max-width: 767px) 100vw, 34rem"
            priority
          />
          <figcaption>
            Al-Idrisi, mappemonde de la <em>Tabula Rogeriana</em>, 1154 —
            Wikimedia Commons, domaine public
          </figcaption>
        </figure>
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

        /* The band the home shares with the three axis hubs.

           svh, never vh or dvh: on a phone 100vh is the window measured with
           the URL bar retracted, so a 100vh band is always taller than the
           screen it is on and the page below can never be reached in one
           scroll. The min(…, 760px) floor keeps a short, wide window from
           stranding the copy in an empty field. */
        .home-hero {
          min-height: min(100svh, 760px);
        }

        .home-hero-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 32px;
          padding-block: 46px 40px;
        }

        .home-hero-copy {
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

        .home-hero-seam {
          height: 26px;
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
        }

        /* Only the inset changes here. The band used to swap to the left on
           a phone; the whole site now centres its text below the tablet
           floor (styles/mobile-text.css), and a band that opted out was the
           one surface disagreeing with every page under it. */
        @media (max-width: 700px) {
          .home-hero-inner {
            padding-block: 34px 30px;
          }
        }

        /* ─── The visual ────────────────────────────────────────────────
           It used to be withdrawn below the shell's breakpoint, on the
           reading that "at phone width the question and its answer already
           fill the band". Measured, they do not: the band's floor is 760px
           and the copy is 135px of it, so hiding the picture left 82% of the
           product's first screen as empty parchment — on an atlas of African
           peoples showing no Africa larger than its 40px logo.

           The floor is not the defect and is not touched: it is contract-
           tested, and the home is meant to open as immersively as the three
           axis hubs. What the band needed was its content back.

           The picture was always meant to be here: its sizes attribute has
           carried the max-width 767px / 100vw case since it shipped, and
           priority puts it in the preload list at every width — so a phone
           was already paying for an image the stylesheet refused to draw.

           No backticks in this comment: the block is a template literal, and
           one would close it. */
        .home-hero-figure {
          display: block;
          margin: 0;
          min-width: 0;
        }
        .home-hero-figure img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: var(--afh-radius-lg);
          border: 1px solid var(--afh-border);
        }
        .home-hero-figure figcaption {
          margin-top: 10px;
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
        }

        @media (min-width: 768px) {
          .home-hero-inner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 56px;
          }

          /* Left, and left-aligned. Centred copy beside a picture reads as
             two objects sharing a row; ragged-right beside it reads as one
             column with an illustration. */
          .home-hero-copy {
            flex: 1 1 0;
            min-width: 0;
            margin: 0;
            max-width: 34rem;
            text-align: left;
          }
          .home-hero-answer {
            margin-inline: 0;
          }

          /* Only what the second column changes. The picture's own dress —
             radius, border, caption — is set once in the base rules now that
             it is drawn at every width, rather than declared twice and left
             to drift. */
          .home-hero-figure {
            flex: 0 1 34rem;
          }

          /* The viewport-height floor is back, but not on the band it was
             removed from. It went because two lines of copy stretched over a
             full screen is air; the band is two columns now, so the height is
             filled by the picture that answers the question beside it. */
          .home-hero {
            min-height: 100svh;
          }
        }
      `}</style>
    </section>
  );
}
