import Image from "next/image";
import Link from "next/link";

import type {
  DidYouKnowEntity,
  DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
import { illustrationFor } from "@/lib/home/didYouKnowIllustrations";
import {
  DID_YOU_KNOW_ENTITY_ACCENT,
  DID_YOU_KNOW_ENTITY_LABEL,
  DID_YOU_KNOW_TIER_LABEL,
} from "@/lib/home/didYouKnowPresentation";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface AnecdoteCardProps {
  language: Language;
  fact: DidYouKnowFact;
}

/**
 * One anecdote, alone on the page.
 *
 * The card used to be one item of a feed and was ranged left for that
 * reason: a reader working down eight of them needs a starting edge on
 * every line. Reading one at a time is the opposite situation — there is no
 * column to descend, the card is the page, and centring it is what tells the
 * reader that nothing else is being withheld below.
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
export function AnecdoteCard({ language, fact }: AnecdoteCardProps) {
  const illustration = illustrationFor(fact.id);

  return (
    <article className="anecdote-card" id={fact.id}>
      {illustration ? (
        <figure className="anecdote-figure">
          <div className="anecdote-frame">
            <Image
              src={illustration.src}
              alt={illustration.alt}
              fill
              priority
              sizes="(min-width: 720px) 640px, 100vw"
              className="anecdote-image"
            />
          </div>
          <figcaption className="anecdote-credit">
            {illustration.credit}
          </figcaption>
        </figure>
      ) : null}

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
              <li key={source.url}>
                <a
                  href={source.url}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="anecdote-source-link"
                >
                  {source.title}
                </a>
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
        .anecdote-image {
          object-fit: cover;
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
        @media (min-width: 720px) {
          .anecdote-frame { aspect-ratio: 16 / 9; }
        }
      `}</style>
    </article>
  );
}

export default AnecdoteCard;
