import Link from "next/link";

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
  /** The fact drawn for this request, or null when the bank has none. */
  fact: DidYouKnowFact | null;
}

/**
 * The home's anecdote: one fact, drawn afresh on every load.
 *
 * It sits between the argument (why this atlas exists) and the sample (what
 * a fiche holds) because it is the proof between the two: a name, taken
 * apart, doing what the whole site claims to do.
 *
 * The band spent a release as a deck the reader could page through, arrows,
 * dots and a « 2 / 24 » counter. Two things were wrong with that. The
 * counter turned a hook into an inventory — it told the reader exactly how
 * finite the atlas's stock of stories is, which is the opposite of what the
 * band is for. And paging is work asked of a reader who has not yet been
 * given a reason to do any: the anecdote is met unasked, on the way past.
 * The draw does the varying instead, and it costs the reader nothing.
 *
 * The draw runs in a server component (REQ-115's reasoning applies: it never
 * re-runs during hydration and cannot desynchronise the client tree), which
 * is why nothing here is a client component any more.
 *
 * The band's own dress is deliberately bare: no card, no frame, no surface
 * between the reader and the sentence.
 *
 * It also has to fit a viewport whole, which the deck had stopped doing: at
 * twenty-four facts stacked in one grid cell it stood 893px tall against an
 * 800px screen and pushed its own controls under the fold. Dropping the deck
 * removed the controls and most of the height; what is kept from that fix is
 * the vertical rhythm — tighter padding than the sections around it, and the
 * title one rung down. That override of the section-heading unit is the only
 * one on the home and the only section with grounds for it: everywhere else
 * the title is a fixed label three words long, here it is the fact itself and
 * runs to ninety characters, which at --afh-text-h1 takes four lines.
 *
 * The picture and the four controls on `/comprendre/anecdotes` stay on that
 * page. The band is met, not sought: a reader who did not ask for an anecdote
 * is not the reader to ask for a reaction to one.
 *
 * The chips remain the point. Without them the band is a cul-de-sac — a good
 * story with nowhere to go — and the reader who is finally curious has to go
 * find the search box themselves. The link below them is the band's other
 * exit, and the only one that can be bookmarked or shared.
 */

function entityHref(language: Language, entity: DidYouKnowEntity): string {
  if (entity.kind === "country") return getCountryRoute(language, entity.id);
  if (entity.kind === "family") return getFamilyRoute(language, entity.id);
  return getPeopleRoute(language, entity.id);
}

// @req REQ-113
export function DidYouKnow({ language, fact }: DidYouKnowProps) {
  // Rendering the heading over an empty bank would assert the atlas has an
  // anecdote it does not, so the section simply does not exist that day.
  if (!fact) return null;

  return (
    <section className="home-dyk" data-testid="home-did-you-know">
      <div className="home-dyk-inner">
        <article className="home-dyk-fact">
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

          <p className="home-dyk-tier">{DID_YOU_KNOW_TIER_LABEL[fact.tier]}</p>
        </article>

        {/* The band is a hook, and a hook has no URL. This is the only exit
            from it that a reader can bookmark, share or be sent by a search
            engine. It says « d'autres » rather than a count: the reader is
            being offered more, not shown how little there is. */}
        <p className="home-dyk-all">
          <Link href={getLocalizedRoute(language, "anecdotes")}>
            Lire d&apos;autres anecdotes
          </Link>
        </p>
      </div>

      <style>{`
        /* The band has one size constraint the other sections do not: a
           reader must be able to see the whole fact and the link out of it
           without scrolling. Every measure below is set against that budget
           rather than against the page's usual rhythm, which is why this
           section is tighter than its neighbours. */
        .home-dyk {
          background: var(--afh-bg-warm);
          border-top: 1px solid var(--afh-border);
          border-bottom: 1px solid var(--afh-border);
          padding: 24px 20px 20px;
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
           ninety characters. Held at --afh-text-h1 the longest fact takes four
           lines; one rung down it takes three, and the band fits a viewport. */
        .home-dyk-heading .afh-section-heading-title {
          font-size: var(--afh-text-h2);
          max-width: 32ch;
        }

        .home-dyk-fact {
          animation: home-dyk-arrive 220ms ease-out both;
        }
        @keyframes home-dyk-arrive {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-dyk-fact { animation: none; }
        }

        .home-dyk p {
          margin: 0 0 10px;
          font-size: var(--afh-text-body);
          line-height: 1.55;
          color: var(--afh-text-soft);
        }
        .home-dyk .home-dyk-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }

        /* The last paragraph's bottom margin sits between the prose and the
           chips, which already declare their own top margin — two gaps for
           one seam. Selected by what follows it rather than by
           :last-of-type, which would land on the tier: the tier is a <p>
           too, and is the real last one. */
        .home-dyk-fact > p:has(+ .home-dyk-chips) {
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

        .home-dyk-all {
          margin: 18px 0 0;
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

        /* Under 430px the same fact costs three or four more lines. These buy
           them back without touching the type sizes, which are already at the
           bottom of their clamps here. */
        @media (max-width: 430px) {
          .home-dyk { padding: 20px 16px 18px; }
          .home-dyk p { line-height: 1.5; }
          .home-dyk-chip { padding: 5px 12px 5px 9px; }
        }

        @media (min-width: 720px) {
          .home-dyk { padding: 36px 40px 30px; }
        }
      `}</style>
    </section>
  );
}
