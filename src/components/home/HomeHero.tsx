import { PRODUCT_NAME } from "@/lib/brand";

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
      </header>

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
          padding: 46px 24px 40px;
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
          .home-hero-copy {
            padding: 34px 20px 30px;
          }
        }

        /* No viewport-height floor. It existed to keep the globe and its
           controls inside the first screen; with the module gone to its own
           section, the same rule would stretch two lines of copy over a full
           screen and push the argument below the fold. */
      `}</style>
    </section>
  );
}
