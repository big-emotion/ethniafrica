"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { SectionHeading } from "@/components/home/SectionHeading";

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

export interface DidYouKnowProps {
  language: Language;
  /** The bank, in the order the reader will page through it. */
  facts: DidYouKnowFact[];
}

/**
 * The home's anecdotes, as a deck the reader turns rather than a single card.
 *
 * It sits between the argument (why this atlas exists) and the sample (what
 * a fiche holds) because it is the proof between the two: a name, taken
 * apart, doing what the whole site claims to do.
 *
 * Two things changed when it became a deck:
 *
 * - The bank was invisible. One fact was drawn per request and the other
 *   five were dropped, so the reader had no way of knowing there were
 *   others, and no way to ask for one. The band asserted the atlas was full
 *   of stories while showing exactly one.
 * - Every fact is mounted, stacked in a single grid cell. The band is
 *   therefore as tall as its longest fact from first paint, and turning a
 *   card moves nothing else on the page — a deck that resized itself under
 *   the reader's thumb would be worse than no deck.
 *
 * The band's own dress is deliberately untouched: no card, no frame, no
 * surface between the reader and the sentence. The controls are the only
 * thing the deck adds to what the reader already saw.
 *
 * The chips remain the point. Without them the deck is a cul-de-sac — good
 * stories with nowhere to go — and the reader who is finally curious has to
 * go find the search box themselves.
 */

function entityHref(language: Language, entity: DidYouKnowEntity): string {
  if (entity.kind === "country") return getCountryRoute(language, entity.id);
  if (entity.kind === "family") return getFamilyRoute(language, entity.id);
  return getPeopleRoute(language, entity.id);
}

/** Below this the reader is tapping, not swiping. */
const SWIPE_THRESHOLD_PX = 40;

/**
 * Past this many facts the dots stop being a map and become a smear the
 * reader cannot aim at on a 430px screen. The counter still says where they
 * are; only the shortcut to an arbitrary card goes.
 */
const MAX_DOTS = 8;

// @req REQ-113
export function DidYouKnow({ language, facts }: DidYouKnowProps) {
  const [current, setCurrent] = useState(0);
  const swipeOriginX = useRef<number | null>(null);

  const total = facts.length;

  const turnBy = useCallback(
    (step: number) => {
      setCurrent((index) => (index + step + total) % total);
    },
    [total]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") turnBy(-1);
      else if (event.key === "ArrowRight") turnBy(1);
      else return;
      event.preventDefault();
    },
    [turnBy]
  );

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    swipeOriginX.current = event.clientX;
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      const origin = swipeOriginX.current;
      swipeOriginX.current = null;
      if (origin === null) return;
      const travelled = event.clientX - origin;
      if (Math.abs(travelled) < SWIPE_THRESHOLD_PX) return;
      turnBy(travelled < 0 ? 1 : -1);
    },
    [turnBy]
  );

  // Rendering the heading over an empty bank would assert the atlas has an
  // anecdote it does not, so the section simply does not exist that day.
  if (total === 0) return null;

  const isDeck = total > 1;

  return (
    <section
      className="home-dyk"
      data-testid="home-did-you-know"
      onKeyDown={isDeck ? handleKeyDown : undefined}
    >
      <div className="home-dyk-inner">
        <div
          className="home-dyk-deck"
          onPointerDown={isDeck ? handlePointerDown : undefined}
          onPointerUp={isDeck ? handlePointerUp : undefined}
        >
          {facts.map((fact, index) => (
            <article
              key={fact.id}
              className="home-dyk-slide"
              aria-hidden={index === current ? undefined : "true"}
            >
              <SectionHeading
                centred
                eyebrow="Saviez-vous que"
                title={fact.headline}
                className="home-dyk-heading"
              />
              {fact.body.map((paragraph, position) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className={position === 0 ? "home-dyk-lede" : undefined}
                >
                  {paragraph}
                </p>
              ))}

              <ul className="home-dyk-chips">
                {fact.entities.map((entity) => (
                  <li key={`${entity.kind}-${entity.id}`}>
                    <Link
                      className={`home-dyk-chip ${DID_YOU_KNOW_ENTITY_ACCENT[entity.kind]}`}
                      href={entityHref(language, entity)}
                    >
                      <span aria-hidden="true" className="home-dyk-dot" />
                      <span className="home-dyk-chip-kind">
                        {DID_YOU_KNOW_ENTITY_LABEL[entity.kind]}
                      </span>
                      {entity.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="home-dyk-tier">
                {DID_YOU_KNOW_TIER_LABEL[fact.tier]}
              </p>
            </article>
          ))}
        </div>

        {isDeck ? (
          <>
            {/* Turning a card swaps content in place: without this, the only
                signal a screen reader gets is that focus is still on the same
                button it just pressed. */}
            <p className="sr-only" aria-live="polite">
              {`Fait ${current + 1} sur ${total} : ${facts[current].headline}`}
            </p>

            <div className="home-dyk-controls">
              <button
                type="button"
                className="home-dyk-arrow"
                onClick={() => turnBy(-1)}
              >
                <span aria-hidden="true">‹</span>
                <span className="sr-only">Fait précédent</span>
              </button>

              {total <= MAX_DOTS ? (
                <ul className="home-dyk-pips">
                  {facts.map((fact, index) => (
                    <li key={fact.id}>
                      <button
                        type="button"
                        className="home-dyk-pip"
                        aria-current={index === current ? "true" : undefined}
                        onClick={() => setCurrent(index)}
                      >
                        <span className="sr-only">{`Aller au fait ${index + 1}`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                className="home-dyk-arrow"
                onClick={() => turnBy(1)}
              >
                <span aria-hidden="true">›</span>
                <span className="sr-only">Fait suivant</span>
              </button>
            </div>

            <p className="home-dyk-count">{`${current + 1} / ${total}`}</p>
          </>
        ) : null}
      </div>

      <style>{`
        .home-dyk {
          background: var(--afh-bg-warm);
          border-top: 1px solid var(--afh-border);
          border-bottom: 1px solid var(--afh-border);
          padding: 46px 22px 36px;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        .home-dyk-inner {
          max-width: 62ch;
          margin: 0 auto;
          text-align: center;
        }
        /* The eyebrow and the title are the shared unit's now
           (src/styles/section-heading.css). Only the spacing is local. */
        .home-dyk-heading {
          margin-bottom: 16px;
        }

        /* Every fact in one cell: the deck is as tall as its longest fact
           from first paint, so turning a card cannot shift the page. The
           band keeps its own dress — no frame, no card, nothing between the
           reader and the sentence. */
        .home-dyk-deck {
          display: grid;
          touch-action: pan-y;
        }
        /* Short facts leave slack in a cell sized for the longest one.
           Centring the slide spreads it above and below rather than pooling
           it into one hole above the controls. */
        .home-dyk-slide {
          grid-area: 1 / 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          animation: home-dyk-turn 220ms ease-out both;
        }
        /* visibility, not display: the cell keeps its size, and the browser
           takes the hidden facts out of the tab order for free. */
        .home-dyk-slide[aria-hidden="true"] {
          visibility: hidden;
          animation: none;
        }
        @keyframes home-dyk-turn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-dyk-slide { animation: none; }
        }

        .home-dyk p {
          margin: 0 0 14px;
          font-size: var(--afh-text-body);
          line-height: 1.65;
          color: var(--afh-text-soft);
        }
        .home-dyk .home-dyk-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }

        .home-dyk-chips {
          list-style: none;
          margin: 24px 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        /* Each chip carries its own accent class, so it reads var(--accent)
           from itself rather than from the page — three destinations, three
           inks, one component. */
        .home-dyk-chip {
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
        .home-dyk-chip:hover,
        .home-dyk-chip:focus-visible {
          background: var(--accent-tint);
        }
        .home-dyk-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex: none;
        }
        .home-dyk-chip-kind {
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .home-dyk-tier {
          margin: 22px 0 0;
          padding-top: 16px;
          border-top: 1px solid var(--afh-border);
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--afh-text-muted);
        }

        .home-dyk-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 18px;
        }
        /* 44px of tappable area on every control, whatever it looks like. */
        .home-dyk-arrow {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--afh-border);
          border-radius: 100px;
          background: var(--afh-color-card);
          color: var(--afh-text);
          font-size: var(--afh-text-lead);
          line-height: 1;
          cursor: pointer;
        }
        .home-dyk-arrow:hover,
        .home-dyk-arrow:focus-visible {
          border-color: var(--afh-text-soft);
        }
        .home-dyk-pips {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 2px;
          margin: 0;
          padding: 0;
        }
        .home-dyk-pip {
          width: 22px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: none;
          cursor: pointer;
        }
        .home-dyk-pip::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--afh-border);
          transition: background 160ms ease, transform 160ms ease;
        }
        .home-dyk-pip[aria-current="true"]::before {
          background: var(--afh-text-soft);
          transform: scale(1.35);
        }
        @media (prefers-reduced-motion: reduce) {
          .home-dyk-pip::before { transition: none; }
        }
        .home-dyk-count {
          margin: 8px 0 0;
          text-align: center;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          color: var(--afh-text-muted);
        }

        @media (min-width: 720px) {
          .home-dyk { padding: 64px 40px 48px; }
          .home-dyk-controls { gap: 14px; margin-top: 26px; }
        }
      `}</style>
    </section>
  );
}
