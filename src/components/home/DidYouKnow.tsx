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
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
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
 * It has one budget the other sections of the home do not: **the whole fact
 * and the controls that turn it must fit one viewport.** A deck whose arrows
 * sit below the fold is not a deck — the reader meets a paragraph, never
 * learns there are twenty-three more, and the bank goes back to being
 * invisible. The bank grew from six facts to twenty-four and the band went
 * with it, to 893px against a 800px screen, so the measures here are set
 * against that budget rather than against the page's usual rhythm: tighter
 * padding, one rung down on the title, the lede at body size, and the
 * counter moved between the arrows. Measured after: 707px at 1280×720,
 * 800px at 390×844. A 667px-tall viewport (iPhone SE) still overflows; the
 * longest fact cannot be made to fit there without shrinking the type below
 * what the scale allows.
 *
 * The picture and the four controls on `/comprendre/anecdotes` stay on that
 * page. The band is met, not sought: a reader who did not ask for an
 * anecdote is not the reader to ask for a reaction to one.
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

              {/* The counter sits between the arrows rather than on a line of
                  its own: the band has to fit a viewport whole, controls
                  included, and a second centred line of mono type costs
                  twenty-six pixels to say what one already says. */}
              <p className="home-dyk-count">{`${current + 1} / ${total}`}</p>

              <button
                type="button"
                className="home-dyk-arrow"
                onClick={() => turnBy(1)}
              >
                <span aria-hidden="true">›</span>
                <span className="sr-only">Fait suivant</span>
              </button>
            </div>
          </>
        ) : null}

        {/* The deck is a hook, and a hook has no URL. This is the only exit
            from it that a reader can bookmark, share or be sent by a search
            engine. */}
        <p className="home-dyk-all">
          <Link href={getLocalizedRoute(language, "anecdotes")}>
            {`Lire les ${total} anecdotes`}
          </Link>
        </p>
      </div>

      <style>{`
        /* The band has one size constraint the other sections do not: a
           reader must be able to see the whole fact *and* the controls that
           turn it without scrolling, otherwise the deck reads as a static
           paragraph and nobody presses anything. Every measure below is set
           against that budget rather than against the page's usual rhythm,
           which is why this section is tighter than its neighbours. */
        .home-dyk {
          background: var(--afh-bg-warm);
          border-top: 1px solid var(--afh-border);
          border-bottom: 1px solid var(--afh-border);
          padding: 18px 20px 16px;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        .home-dyk-inner {
          /* Wider than the reading measure the other sections take: four
             lines of centred display type is where the band overflowed, and
             a few more characters per line removes one of them. */
          max-width: 68ch;
          margin: 0 auto;
          text-align: center;
        }
        /* The eyebrow and the title are the shared unit's now
           (src/styles/section-heading.css). Only the spacing is local. */
        .home-dyk-heading {
          margin-bottom: 8px;
        }
        /* The one place the section-heading unit is overridden, and the only
           section that has grounds to: everywhere else the title is a fixed
           label three words long, here it is the fact itself and runs to
           ninety characters. Held at --afh-text-h1 the longest fact took four
           lines and pushed the controls off the screen, which cost the reader
           the deck. One rung down it takes three and the band fits. */
        .home-dyk-heading .afh-section-heading-title {
          font-size: var(--afh-text-h2);
          max-width: 32ch;
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
          margin: 0 0 10px;
          font-size: var(--afh-text-body);
          line-height: 1.55;
          color: var(--afh-text-soft);
        }
        /* The lede keeps its ink but not its size. Set a step above the body
           it cost the band six lines' worth of leading on the longest fact,
           and the contrast between --afh-text and --afh-text-soft already
           does the work of telling the reader which paragraph carries the
           claim. The anecdotes page, which has a screen to itself, keeps the
           larger lede. */
        .home-dyk .home-dyk-lede {
          color: var(--afh-text);
        }

        /* The last paragraph's bottom margin sits between the prose and the
           chips, which already declare their own top margin — two gaps for
           one seam, and ten of the pixels the band did not have. Selected by
           what follows it rather than by :last-of-type, which would land on
           the tier: the tier is a <p> too, and is the real last one. */
        .home-dyk-slide > p:has(+ .home-dyk-chips) {
          margin-bottom: 0;
        }
        .home-dyk-chips {
          list-style: none;
          margin: 12px 0 0;
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
          margin: 10px 0 0;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          /* The tier is the band's provenance — the whole point of the
             Source Tier policy is that a reader can see what a claim rests
             on, so it is content and takes an ink that clears AA. */
          color: var(--afh-fg-muted);
        }

        .home-dyk-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 12px;
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
        .home-dyk-all {
          margin: 10px 0 0;
          text-align: center;
          font-size: var(--afh-text-caption);
        }
        .home-dyk-all a {
          color: var(--afh-text-soft);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .home-dyk-all a:hover,
        .home-dyk-all a:focus-visible {
          color: var(--afh-text);
        }
        .home-dyk-count {
          margin: 0;
          min-width: 5ch;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          color: var(--afh-fg-muted);
        }

        /* Under 430px the same fact costs three or four more lines, and the
           band went back over the fold on a 390px phone. The measures below
           buy those lines back without touching the type sizes, which are
           already at the bottom of their clamps here. */
        @media (max-width: 430px) {
          .home-dyk { padding: 12px 16px 12px; }
          .home-dyk p { line-height: 1.5; }
          .home-dyk-chip { padding: 5px 12px 5px 9px; }
          .home-dyk-controls { margin-top: 10px; }
        }

        @media (min-width: 720px) {
          .home-dyk { padding: 18px 40px 14px; }
          .home-dyk-controls { gap: 14px; margin-top: 12px; }
        }
      `}</style>
    </section>
  );
}
