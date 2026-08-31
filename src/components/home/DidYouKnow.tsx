import Link from "next/link";

import { SectionHeading } from "@/components/home/SectionHeading";
import { ActionLink } from "@/components/ui/ActionLink";

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
 * ── The composition ──────────────────────────────────────────────────────
 *
 * The band once had to fit a viewport whole, and everything about it was set
 * against that budget: eight pixels under the title, ten between paragraphs,
 * the heading held one rung below every other section on the page. What it
 * bought in height it spent in legibility — six centred lines of prose with
 * five registers of type stacked around them, none of the gaps telling the
 * reader which lines belonged together.
 *
 * That budget is deliberately given up here. In its place the band composes:
 *
 *   rhythm      Gaps come from the spacing scale and are graded — twelve
 *               pixels inside a group, twenty to twenty-four between two.
 *               The seam a reader has to see is the one between the fact and
 *               its provenance, not the one between two paragraphs.
 *
 *   focus       The title takes the shared heading unit's own rung rather
 *               than the rung below it. The override that held it down was
 *               half dead anyway: its companion `max-width` lost the cascade
 *               to `.afh-section-heading.is-centred`, so the measure it
 *               claimed to widen had been 28ch all along.
 *
 *   ground      A field of question marks and lenses sits behind the band at
 *               five percent, decorative and out of the accessible tree. It
 *               is the only thing on the home that says « this is where the
 *               atlas asks a question » before a word is read.
 *
 *   asymmetry   Below the tablet floor the prose stays centred, because
 *               src/styles/mobile-text.css is right that a forty-character
 *               measure composes better centred than ragged. Above it the
 *               prose takes the left edge while the title, the chips and the
 *               provenance stay centred — so the band reads as a composed
 *               page rather than one undifferentiated cone of text.
 *
 *   register    Two inks in the prose, not five: the lede carries the fact
 *               and takes the full ink, the tail carries the context and
 *               takes the soft one. The provenance was mono, uppercase and
 *               tracked — the eyebrow's exact dress, on the least important
 *               line of the band, which is why the reader met two eyebrows
 *               and no hierarchy. It is a footnote now, and still readable:
 *               the Source Tier policy makes it content, not chrome.
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

/**
 * The motif's pattern id is fixed rather than generated: the band renders
 * once per page by construction (the home draws one fact), and `useId` is not
 * available to a server component.
 */
const MOTIF_TILE_ID = "home-dyk-motif-tile";

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
      <div className="home-dyk-motif" aria-hidden="true">
        <svg focusable="false">
          <defs>
            {/* A 280px tile carrying four marks. The first pass tiled three
                marks every 150px, which at desktop width put roughly forty
                glyphs behind the fact and read as wallpaper rather than as
                grain — the band has to hold a question, not be papered in
                them. Sparser at the same weight is what makes it a mood. */}
            <pattern
              id={MOTIF_TILE_ID}
              width="280"
              height="280"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-9)"
            >
              <text
                className="home-dyk-motif-glyph"
                x="18"
                y="86"
                fontSize={64}
              >
                ?
              </text>
              <circle className="home-dyk-motif-lens" cx="196" cy="62" r="20" />
              <line
                className="home-dyk-motif-lens"
                x1="210"
                y1="76"
                x2="230"
                y2="96"
              />
              <text
                className="home-dyk-motif-glyph"
                x="150"
                y="242"
                fontSize={64}
              >
                ?
              </text>
              <circle className="home-dyk-motif-lens" cx="52" cy="206" r="13" />
              <line
                className="home-dyk-motif-lens"
                x1="61"
                y1="215"
                x2="74"
                y2="228"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${MOTIF_TILE_ID})`} />
        </svg>
      </div>

      <div className="home-dyk-inner">
        <article className="home-dyk-fact">
          <SectionHeading
            centred
            eyebrow="Saviez-vous que"
            title={fact.headline}
            className="home-dyk-heading"
          />

          {/* The prose is wrapped rather than left loose in the article: the
              wrapper is what carries the measure, the alignment switch and
              the last paragraph's cleared margin, none of which the article
              can hold without also holding the chips and the provenance. */}
          <div className="home-dyk-prose">
            {fact.body.map((paragraph, position) => (
              <p
                key={paragraph.slice(0, 32)}
                className={position === 0 ? "home-dyk-lede" : undefined}
              >
                {paragraph}
              </p>
            ))}
          </div>

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
            being offered more, not shown how little there is. The arrow is
            what tells a reader it leaves the page at all — the underline
            alone put it in the same register as the provenance above it. */}
        <p className="home-dyk-all">
          <ActionLink href={getLocalizedRoute(language, "anecdotes")}>
            Lire d&apos;autres anecdotes
          </ActionLink>
        </p>
      </div>

      <style>{`
        .home-dyk {
          position: relative;
          overflow: hidden;
          background: var(--afh-bg-warm);
          border-top: 1px solid var(--afh-border);
          border-bottom: 1px solid var(--afh-border);
          padding: var(--afh-space-6xl) var(--afh-space-4xl);
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }

        /* Mood, not information. At five percent the glyphs read as a grain
           in the paper rather than as marks on it, so the band's text still
           contrasts against the warm ground alone and the a11y gates see the
           surface they measured. Decorative, hidden, and inert to the
           pointer: a full-bleed layer that swallowed taps would take the
           chips with it. */
        .home-dyk-motif {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.04;
          color: var(--afh-text);
        }
        .home-dyk-motif svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        /* 700, not 600: Fraunces is loaded at 300/500/700/900, so 600 has
           always resolved to 700. Stating what renders — brand charter §6. */
        .home-dyk-motif-glyph {
          font-family: var(--afh-font-display);
          font-weight: 700;
          fill: currentColor;
        }
        .home-dyk-motif-lens {
          fill: none;
          stroke: currentColor;
          stroke-width: 3;
          stroke-linecap: round;
        }

        .home-dyk-inner {
          /* Positioned so the band's own content paints over the motif: an
             absolutely positioned sibling otherwise sits above every static
             box that follows it, motif over prose. */
          position: relative;
          /* Wider than the reading measure the other sections take: four
             lines of centred display type is where the band overflowed, and
             a few more characters per line removes one of them. */
          max-width: 68ch;
          margin: 0 auto;
          text-align: center;
        }
        /* The eyebrow, the title and the gap under them are the shared
           unit's now (src/styles/section-heading.css) — the band declares
           none of the three. Its one remaining claim on the unit is the
           measure: every other section title is a fixed label three words
           long, this one is the fact itself and runs to ninety characters.
           Written at the unit's own weight so it wins the cascade — the
           version it replaces sat two classes below the centred modifier and
           never applied. */
        .home-dyk .afh-section-heading.is-centred .afh-section-heading-title {
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

        /* The prose takes the atlas's own reading measure rather than the
           band's wider one: 68ch of centred display type is what the title
           needs to lose a line, and what a paragraph gains nothing from. */
        .home-dyk-prose {
          max-width: var(--afh-measure-prose);
          margin: 0 auto;
        }
        .home-dyk-prose p {
          margin: 0 0 var(--afh-space-lg);
          font-size: var(--afh-text-body);
          line-height: 1.6;
          color: var(--afh-text-soft);
        }
        /* Two registers, and only two: the lede states the fact, the tail
           gives it its context. The gap below the group is the chips' to
           declare, so the last paragraph clears its own. */
        .home-dyk-prose .home-dyk-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }
        .home-dyk-prose p:last-child {
          margin-bottom: 0;
        }

        .home-dyk-chips {
          list-style: none;
          margin: var(--afh-space-5xl) 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: var(--afh-space-md);
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
          border-radius: var(--afh-radius-full);
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
          /* No opacity here. Fading the glyph composites it toward the card
             and takes the accent ink with it — ocre went 6.41:1 → 3.45:1 at
             0.72. The smaller size, lighter weight, caps and tracking are
             what separate the kind from the name; the colour stays legible,
             like the tier line below. */
        }
        /* The band's provenance, in the register of a footnote. It used to
           be set mono, uppercase and tracked, which is the eyebrow's dress
           exactly — so the band opened and closed with the same shout and
           the reader had no way to tell which of the two was the heading.
           Sentence case, body face and the caption rung file it under the
           fact instead. The ink still clears AA: the whole point of the
           Source Tier policy is that a reader can see what a claim rests on,
           which makes this content. */
        .home-dyk-tier {
          margin: var(--afh-space-4xl) 0 0;
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
        }

        /* The exit is an ActionLink now (actions charter form A), so it
           brings its own size, weight, ink and 44px target. All this rule
           still owes it is where it sits. */
        .home-dyk-all {
          margin: var(--afh-space-5xl) 0 0;
          text-align: center;
        }

        /* Under 430px the same fact costs three or four more lines. These buy
           some of them back without touching the type sizes, which are
           already at the bottom of their clamps here. */
        @media (max-width: 430px) {
          .home-dyk { padding: var(--afh-space-5xl) var(--afh-space-2xl); }
          .home-dyk-prose p { line-height: 1.55; }
          .home-dyk-chip { padding: 5px 12px 5px 9px; }
        }

        /* One tablet edge for the whole band, and it is the site's own:
           src/styles/mobile-text.css centres every run of copy below 768px
           and names that floor as the line a component opts back out at.
           Splitting the band's padding step off onto a second breakpoint
           would put the composition change and the space change on either
           side of a 48px no man's land. */
        @media (min-width: 768px) {
          .home-dyk {
            padding: var(--afh-space-8xl) var(--afh-space-7xl);
          }
          /* Six centred lines is a poster, not a paragraph. The title, the
             chips and the provenance stay on the axis; only the prose moves,
             which is what gives the band a composition instead of a cone.

             It moves onto an edge that exists: dropping the auto margins
             lands the prose on the inner column's own left edge. Centred as
             a block it would instead have floated a few characters inside
             that edge, aligned to nothing on the page. */
          .home-dyk-prose {
            margin-inline: 0;
            text-align: left;
          }
        }
      `}</style>
    </section>
  );
}
