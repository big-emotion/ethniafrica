"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CountrySynthesisCard } from "@/components/home/CountrySynthesisCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";
import { getLocalizedRoute } from "@/lib/routing";
import Link from "next/link";
import type { Language } from "@/types/shared";

export interface SynthesisRailProps {
  language: Language;
  syntheses: CountrySynthesis[];
}

/**
 * Four countries, drawn from the corpus, shown rather than described.
 *
 * The rail is a client component only for its arrows. The scroll itself is
 * CSS — scroll-snap on an overflowing flex row — so a reader whose JS never
 * arrives still gets every card by dragging, and loses nothing but two
 * buttons. Building the scroll in JS would have made the whole band depend
 * on hydration for its primary function.
 */
// @req REQ-113
export function SynthesisRail({ language, syntheses }: SynthesisRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // 1px of slack: sub-pixel layout means scrollLeft rarely reaches the
    // exact maximum, and a button that never enables is worse than one that
    // enables a pixel early.
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  }, []);

  useEffect(() => {
    syncEdges();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(syncEdges);
    observer.observe(track);
    return () => observer.disconnect();
  }, [syncEdges]);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    // One card plus its gap, so a click lands on a card edge rather than
    // halfway through one.
    const card = track.querySelector("article");
    const step = card ? card.clientWidth + 14 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (syntheses.length === 0) return null;

  return (
    <section
      className="home-syn afh-accent-teal"
      data-testid="home-synthesis-rail"
    >
      <div className="home-syn-head">
        <div>
          <SectionHeading
            eyebrow="Ce que contient une fiche"
            title="Quatre pays, pris dans l'atlas"
            className="home-syn-heading"
          />
        </div>
        <div className="home-syn-arrows">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={atStart}
            aria-label="Cartes précédentes"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={atEnd}
            aria-label="Cartes suivantes"
          >
            →
          </button>
        </div>
      </div>

      <div className="home-syn-track" ref={trackRef} onScroll={syncEdges}>
        {syntheses.map((synthesis) => (
          <CountrySynthesisCard
            key={synthesis.id}
            language={language}
            synthesis={synthesis}
          />
        ))}
      </div>

      <p className="home-syn-all">
        <Link href={getLocalizedRoute(language, "countries")}>
          Voir les 54 pays
          <span aria-hidden="true"> →</span>
        </Link>
      </p>

      <style>{`
        .home-syn {
          background: var(--afh-bg);
          padding: 44px 0 40px;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        .home-syn-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 0 22px;
          max-width: 1200px;
          margin: 0 auto;
        }
        /* The eyebrow and the title come from the shared unit
           (src/styles/section-heading.css) — this section was one of the two
           hand-set spellings the unit was extracted from. The arrows sit
           beside it, so it carries no bottom margin of its own. */
        .home-syn-heading {
          margin-bottom: 0;
        }
        .home-syn-arrows {
          display: flex;
          gap: 8px;
          flex: none;
        }
        .home-syn-arrows button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--afh-border);
          background: var(--afh-color-card);
          color: var(--afh-text);
          font-size: var(--afh-text-small);
          cursor: pointer;
        }
        .home-syn-arrows button:disabled {
          color: var(--afh-text-muted);
          cursor: default;
        }
        .home-syn-arrows button:not(:disabled):hover {
          border-color: var(--accent);
        }
        .home-syn-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 22px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .home-syn-all {
          margin: 0;
          padding: 0 22px;
          max-width: 1200px;
          margin: 0 auto;
          font-size: var(--afh-text-caption);
          font-weight: 700;
        }
        .home-syn-all a {
          color: var(--accent-ink);
          text-decoration: none;
        }
        .home-syn-all a:hover,
        .home-syn-all a:focus-visible {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        /* The arrows are a convenience on a surface that already scrolls by
           touch. Hiding them below the tablet breakpoint buys the heading
           its full width, where it is tightest. */
        @media (max-width: 719px) {
          .home-syn-arrows { display: none; }
        }
        @media (min-width: 720px) {
          .home-syn { padding: 60px 0 52px; }
          .home-syn-head, .home-syn-track, .home-syn-all { padding-left: 40px; padding-right: 40px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-syn-track { scroll-behavior: auto; }
        }
      `}</style>
    </section>
  );
}
