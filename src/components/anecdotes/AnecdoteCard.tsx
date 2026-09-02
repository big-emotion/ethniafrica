import Image from "next/image";
import Link from "next/link";

import { AnecdotePlate } from "@/components/anecdotes/AnecdotePlate";
import type {
  DidYouKnowEntity,
  DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
import type { DidYouKnowIllustration } from "@/lib/home/didYouKnowIllustrations";
import {
  DID_YOU_KNOW_ENTITY_ACCENT,
  DID_YOU_KNOW_ENTITY_LABEL,
  DID_YOU_KNOW_TIER_LABEL,
  type AnecdoteImageSide,
} from "@/lib/home/didYouKnowPresentation";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface AnecdoteCardProps {
  language: Language;
  fact: DidYouKnowFact;
  /**
   * Resolved by the caller rather than looked up here, so that rendering a
   * card does not oblige the surface to carry the whole illustration table.
   */
  illustration?: DidYouKnowIllustration;
  /** Drawn by the page, alternated by the reader. See the band note below. */
  imageSide?: AnecdoteImageSide;
}

/**
 * One anecdote, alone on the page.
 *
 * The card used to be one item of a feed and was ranged left for that
 * reason: a reader working down eight of them needs a starting edge on
 * every line. Reading one at a time is the opposite situation — there is no
 * column to descend, the card is the page, and centring it is what tells the
 * reader that nothing else is being withheld below. That still holds on a
 * phone, where the card *is* one column; from the tablet up the picture and
 * the text sit side by side and the prose takes its starting edge back,
 * because centred copy in a half-width column is a ragged block on both
 * sides and reads as a caption rather than as an argument.
 *
 * The band exists to shorten the card, not to decorate it: stacked, the
 * picture alone pushed the four controls under the fold, and a reader who
 * has to scroll to react mostly does not react. Which half the picture takes
 * alternates as the deck is walked, from a side the page draws per visit, so
 * twenty-four cards do not read as twenty-four copies of one template.
 *
 * Every anecdote carries a picture, and the picture is a document the
 * anecdote is *about* rather than decoration: the map that repeats itself,
 * the object that was traded, the person who did the naming. Its credit is
 * printed under it, not filed away — CC BY and CC BY-SA are satisfied by an
 * attribution the reader can see. Provenance in full is in
 * `public/images/anecdotes/CREDITS.md`.
 *
 * The sources stay printed in full: this is the surface a reader can link to
 * and quote, and a page that invites citation owes the provenance the home
 * band can still get away with summarising as one label.
 *
 * The card keeps its id so a reader can link to one anecdote rather than to
 * the page that happens to hold it today.
 */

function entityHref(language: Language, entity: DidYouKnowEntity): string {
  if (entity.kind === "country") return getCountryRoute(language, entity.id);
  if (entity.kind === "family") return getFamilyRoute(language, entity.id);
  return getPeopleRoute(language, entity.id);
}

// @req REQ-113
export function AnecdoteCard({
  language,
  fact,
  illustration,
  imageSide = "end",
}: AnecdoteCardProps) {
  return (
    <article className="anecdote-card" id={fact.id}>
      <div className={`anecdote-split anecdote-split--image-${imageSide}`}>
        {illustration?.kind === "picture" ? (
          <figure className="anecdote-figure">
            <div className="anecdote-frame">
              <Image
                src={illustration.src}
                alt={illustration.alt}
                fill
                priority
                sizes="(min-width: 768px) 460px, 100vw"
                className="anecdote-image"
              />
            </div>
            <figcaption className="anecdote-credit">
              {illustration.credit}
              {/* The licence's URI and the file's page, both reachable. A
                  notice a reader cannot open is not a notice — brand charter
                  §9, and §4(a) of CC BY-SA itself. */}
              {illustration.filePage ? (
                <>
                  {" · "}
                  <a
                    href={illustration.filePage}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    fichier
                  </a>
                </>
              ) : null}
              {illustration.licenceUrl ? (
                <>
                  {" · "}
                  <a
                    href={illustration.licenceUrl}
                    rel="noreferrer noopener license"
                    target="_blank"
                  >
                    licence
                  </a>
                </>
              ) : null}
            </figcaption>
          </figure>
        ) : null}

        {illustration?.kind === "plate" ? (
          <AnecdotePlate plate={illustration} />
        ) : null}

        <div className="anecdote-text">
          <h2 className="anecdote-headline">{fact.headline}</h2>

          {fact.body.map((paragraph, index) => (
            <p
              key={paragraph.slice(0, 32)}
              className={index === 0 ? "anecdote-lede" : undefined}
            >
              {paragraph}
            </p>
          ))}

          <ul className="anecdote-chips">
            {fact.entities.map((entity) => (
              <li key={`${entity.kind}-${entity.id}`}>
                <Link
                  className={`anecdote-chip ${DID_YOU_KNOW_ENTITY_ACCENT[entity.kind]}`}
                  href={entityHref(language, entity)}
                >
                  <span aria-hidden="true" className="anecdote-dot" />
                  <span className="anecdote-chip-kind">
                    {DID_YOU_KNOW_ENTITY_LABEL[entity.kind]}
                  </span>
                  {entity.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="anecdote-provenance">
        {/* Two tiers sit in this footer and they mean different things: the
            fact's, which is the confidence the atlas puts on the claim, and
            each source's, which is the authority of that one citation. Left
            unlabelled they read as one repeated badge. */}
        <p className="anecdote-tier">
          <span className="anecdote-tier-label">Fiabilité du fait</span>
          {DID_YOU_KNOW_TIER_LABEL[fact.tier]}
        </p>

        {fact.sources?.length ? (
          <ul className="anecdote-sources">
            {fact.sources.map((source) => (
              <li key={source.title}>
                {/* A work with no address is printed as a reference rather
                    than as a link that goes nowhere. */}
                {source.url ? (
                  <a
                    href={source.url}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="anecdote-source-link"
                  >
                    {source.title}
                  </a>
                ) : (
                  <cite className="anecdote-source-cite">{source.title}</cite>
                )}
                <span className="anecdote-source-tier">
                  {DID_YOU_KNOW_TIER_LABEL[source.tier]}
                </span>
                {source.notes ? (
                  <span className="anecdote-source-note">{source.notes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          // Six facts predate the sources field. Saying so is the only
          // honest thing to print here: a tier over a blank space asserts a
          // provenance the reader cannot check.
          <p className="anecdote-source-missing">
            Provenance à documenter — ce fait est antérieur au champ de sources.
          </p>
        )}
      </footer>

      <style>{`
        .anecdote-card {
          text-align: center;
        }
        /* One column on a phone, and the picture stays first: it is what the
           reader recognises before they have read a word. */
        .anecdote-split {
          display: flex;
          flex-direction: column;
        }
        .anecdote-figure {
          margin: 0 0 26px;
        }
        /* A fixed frame rather than the file's own ratio: the bank mixes
           portrait engravings with wide maps, and letting each set its own
           height would move every control on the page at each turn. */
        .anecdote-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
          overflow: hidden;
          border-radius: var(--afh-radius-lg, 14px);
          background: var(--afh-bg-warm);
          border: 1px solid var(--afh-border);
        }
        /* Contained, not cropped: the bank runs from a 0.60 portrait
           engraving to a 2.30 panorama, so filling the fixed frame cut the
           subject off the edges of the document the anecdote is about. The
           warm ground the picture floats on reads as its mount. */
        .anecdote-image {
          object-fit: contain;
        }
        .anecdote-credit {
          margin: 10px auto 0;
          max-width: 56ch;
          font-size: var(--afh-text-caption);
          line-height: 1.45;
          color: var(--afh-fg-muted);
        }
        .anecdote-headline {
          margin: 0 auto 16px;
          max-width: 22ch;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h1);
          line-height: 1.16;
          letter-spacing: -0.014em;
          text-wrap: balance;
          color: var(--afh-text);
        }
        .anecdote-card p {
          margin: 0 auto 12px;
          max-width: 60ch;
          font-size: var(--afh-text-body);
          line-height: 1.62;
          color: var(--afh-text-soft);
        }
        .anecdote-card .anecdote-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }
        .anecdote-chips {
          list-style: none;
          margin: 22px 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .anecdote-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 13px 6px 10px;
          border: 1px solid var(--accent);
          border-radius: var(--afh-radius-full);
          background: var(--afh-color-card);
          color: var(--accent-ink);
          font-size: var(--afh-text-caption);
          font-weight: 600;
          text-decoration: none;
        }
        .anecdote-chip:hover,
        .anecdote-chip:focus-visible {
          background: var(--accent-tint);
        }
        .anecdote-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex: none;
        }
        .anecdote-chip-kind {
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .anecdote-provenance {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid var(--afh-border);
        }
        .anecdote-tier {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin: 0 0 10px;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--afh-text);
        }
        .anecdote-tier-label {
          color: var(--afh-fg-muted);
        }
        .anecdote-tier-label::after {
          content: " —";
        }
        .anecdote-sources {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .anecdote-sources li {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          font-size: var(--afh-text-caption);
        }
        .anecdote-source-link {
          color: var(--afh-text-soft);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        /* Same ink as a linked source, without the underline that would
           promise a destination this one does not have. */
        .anecdote-source-cite {
          color: var(--afh-text-soft);
          font-style: italic;
        }
        .anecdote-source-tier {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--afh-fg-muted);
        }
        .anecdote-source-note {
          flex-basis: 100%;
          font-size: var(--afh-text-caption);
          line-height: 1.5;
          color: var(--afh-fg-muted);
        }
        .anecdote-source-missing {
          margin: 0;
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
        }
        /* 768px, not the card's old 720px: below it the body centres every
           run of text site-wide (src/styles/mobile-text.css), and a column
           of centred prose beside a picture is the one shape this band is
           meant to avoid. */
        @media (min-width: 768px) {
          .anecdote-split {
            flex-direction: row;
            align-items: center;
            gap: 34px;
            text-align: left;
          }
          /* Not two equal halves: the text is what sets the card's height, so
             the wider column goes to it and the whole card gets shorter —
             which is the point of the band. min-width:0 is what stops a long
             unbroken word in the headline from widening its own column. */
          .anecdote-split > * {
            min-width: 0;
          }
          .anecdote-figure {
            flex: 0 1 44%;
          }
          .anecdote-text {
            flex: 1 1 56%;
          }
          /* Order rather than row-reverse: the source order stays picture-
             then-text, which is what a screen reader and a phone both get. */
          .anecdote-split--image-end .anecdote-figure {
            order: 2;
          }
          /* Nearer to square than the full-width frame was: at half the width
             a 16/9 crop is a letterbox strip against a tall column of type. */
          .anecdote-frame {
            aspect-ratio: 4 / 3;
          }
          .anecdote-figure {
            margin-bottom: 0;
          }
          .anecdote-credit {
            margin-inline: 0;
          }
          .anecdote-headline {
            margin-inline: 0;
            max-width: none;
            font-size: var(--afh-text-h2);
          }
          .anecdote-text p {
            margin-inline: 0;
            max-width: none;
          }
          .anecdote-chips {
            justify-content: flex-start;
          }
        }
      `}</style>
    </article>
  );
}
