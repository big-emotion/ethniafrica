import Link from "next/link";

import type {
  DidYouKnowEntity,
  DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
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
 * One anecdote, as the feed shows it.
 *
 * It differs from the home band in two ways that both follow from being
 * read rather than met. The prose is ranged left, because a reader here has
 * come to read several in a row and centred running text costs them a
 * starting edge on every line. And the sources are printed in full, with
 * their own tier, because this is the surface a reader can link to and
 * quote — a page that invites citation owes the provenance the band could
 * still get away with summarising as a single label.
 *
 * The card carries an id so a reader can link to one anecdote rather than
 * to the page that happens to hold it today.
 */

function entityHref(language: Language, entity: DidYouKnowEntity): string {
  if (entity.kind === "country") return getCountryRoute(language, entity.id);
  if (entity.kind === "family") return getFamilyRoute(language, entity.id);
  return getPeopleRoute(language, entity.id);
}

// @req REQ-113
export function AnecdoteCard({ language, fact }: AnecdoteCardProps) {
  return (
    <article className="anecdote-card" id={fact.id}>
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
          border-top: 1px solid var(--afh-border);
          padding: 28px 0 8px;
        }
        .anecdote-headline {
          margin: 0 0 14px;
          font-size: var(--afh-text-h3);
          line-height: 1.22;
          color: var(--afh-text);
        }
        .anecdote-card p {
          margin: 0 0 12px;
          font-size: var(--afh-text-body);
          line-height: 1.65;
          color: var(--afh-text-soft);
        }
        .anecdote-card .anecdote-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }
        .anecdote-chips {
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .anecdote-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 13px 6px 10px;
          border: 1px solid var(--accent);
          border-radius: 100px;
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
          margin-top: 20px;
        }
        .anecdote-tier {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 10px;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--afh-text);
        }
        .anecdote-tier-label {
          color: var(--afh-text-muted);
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
          gap: 6px;
        }
        .anecdote-sources li {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
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
          color: var(--afh-text-muted);
        }
        .anecdote-source-note {
          flex-basis: 100%;
          font-size: var(--afh-text-caption);
          line-height: 1.5;
          color: var(--afh-text-muted);
        }
        .anecdote-source-missing {
          margin: 0;
          font-size: var(--afh-text-caption);
          color: var(--afh-text-muted);
        }
        @media (min-width: 720px) {
          .anecdote-card { padding: 36px 0 12px; }
        }
      `}</style>
    </article>
  );
}

export default AnecdoteCard;
