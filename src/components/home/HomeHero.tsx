import { PRODUCT_NAME } from "@/lib/brand";

/**
 * The home's opening band (REQ-115).
 *
 * The copy states the thesis rather than the medium. « Le continent raconté
 * comme une carte vivante » described how the page looked; a reader landing
 * cold could not tell what the atlas holds or what makes it different from
 * any other encyclopedia. What makes it different is the naming: a people
 * appears under the name it gives itself, beside the name it was given from
 * outside, with who gave it, from where, and when. That is the one sentence
 * the band owes a first-time reader, so it is the H1.
 *
 * The headline says « les peuples », never « chaque peuple »: an autonym is
 * required only from `confidence >= medium` upward, so a per-fiche guarantee
 * would be a claim the corpus does not carry.
 *
 * Three registers, in descending order of voice: the headline states the
 * thesis, the lede glosses it, the standfirst says plainly what the site is
 * and what rule it holds itself to. The band used to stop after the lede and
 * hand the reader a globe, which meant the one question a first-time visitor
 * actually has — what is this site? — went unanswered above the fold.
 *
 * The module that used to fill the rest of the band now stands lower on the
 * page as its own section (FeaturedModule), with a heading of its own. The
 * band is copy, and it sizes to its copy: the viewport-height floor it used
 * to carry existed to hold the globe and left with it.
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
          Les peuples d&apos;Afrique, sous{" "}
          {/* The article is bound to its noun: balanced wrapping otherwise
              ends a line on « sous le », which reads as a broken sentence
              at exactly the moment the headline states its thesis. */}
          <em>le&nbsp;nom qu&apos;ils se donnent</em>
        </h1>
        <p className="home-hero-lede">
          Leurs langues, leurs familles, leurs pays — et, derrière chaque nom,
          qui l&apos;a donné, depuis où et à quelle époque.
        </p>
        {/* The lede glosses the headline; the standfirst says what the site
            is, to a reader who has landed on it for the first time and has
            no idea yet whether this is an encyclopedia, a map or a game.
            Two sentences: what the atlas publishes, and the rule it holds
            itself to.

            No figures in it. « 803 peuples » would be a literal the corpus
            outgrows silently — the axis cards already print counts that read
            themselves (getCorpusCounts), and that is where a number belongs. */}
        <p className="home-hero-standfirst" data-testid="home-hero-standfirst">
          L&apos;Atlas des Peuples d&apos;Afrique publie en accès libre les
          peuples du continent, leurs langues, leurs familles linguistiques et
          leurs pays, chacun sous le nom qu&apos;il se donne. Chaque affirmation
          y porte sa source et son niveau de confiance, et ce qui reste débattu
          est signalé comme tel.
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
        .home-hero-copy h1 em {
          font-style: italic;
          color: var(--afh-display-accent);
        }
        /* Class, not \`.home-hero-copy p\`: a descendant selector outranks a
           single class, so the element rule would have overridden the
           standfirst's own size and ink below however it was written. */
        .home-hero-lede {
          margin: 0 auto;
          max-width: 56ch;
          font-size: var(--home-text-hero-copy);
          line-height: 1.6;
          color: var(--afh-text-soft);
        }

        /* The standfirst is the page's first prose, so it takes the reading
           size and the full ink — the lede above it stays the smaller, softer
           gloss on the headline. Set the other way round, two paragraphs of
           near-identical grey would read as one four-line block and the
           reader would skip both.

           A hairline rather than a rule: it marks where the claim stops and
           the description starts, without cutting the band in two. */
        .home-hero-standfirst {
          margin: 0 auto;
          margin-top: 22px;
          padding-top: 22px;
          max-width: 62ch;
          font-size: var(--afh-text-body);
          line-height: var(--afh-leading-body);
          color: var(--afh-text);
          border-top: 1px solid var(--afh-border);
        }

        .home-hero-seam {
          height: 26px;
          background: var(--afh-bg);
          border-bottom: 1px solid var(--afh-cat-ocre);
        }

        @media (max-width: 700px) {
          .home-hero-copy {
            padding: 34px 20px 30px;
            text-align: left;
          }
          .home-hero-standfirst {
            margin-inline: 0;
          }
        }

        /* No viewport-height floor any more. It existed to keep the globe
           and its controls inside the first screen; with the module gone to
           its own section, the same rule would stretch three paragraphs over
           a full screen and push the three entry points below the fold —
           which is the opposite of why they were moved up here. */
      `}</style>
    </section>
  );
}
