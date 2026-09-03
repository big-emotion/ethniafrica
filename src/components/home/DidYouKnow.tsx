import Image from "next/image";
import Link from "next/link";

import { AnecdotePlate } from "@/components/anecdotes/AnecdotePlate";
import { DidYouKnowMotif } from "@/components/home/DidYouKnowMotif";
import { SectionHeading } from "@/components/home/SectionHeading";
import { ActionLink } from "@/components/ui/ActionLink";
import type {
  DidYouKnowEntity,
  DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
import { illustrationFor } from "@/lib/home/didYouKnowIllustrations";
import {
  DID_YOU_KNOW_ENTITY_ACCENT,
  DID_YOU_KNOW_ENTITY_LABEL,
  DID_YOU_KNOW_TIER_LABEL,
  type AnecdoteImageSide,
} from "@/lib/home/didYouKnowPresentation";
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import type { Language } from "@/types/shared";
import type { DidYouKnowMotif as DidYouKnowMotifName } from "@/lib/home/didYouKnowMotifs";

export interface DidYouKnowProps {
  language: Language;
  /** The two distinct facts drawn for this request, or an empty list. */
  facts: DidYouKnowFact[];
  /** The cultural line motif drawn once for this page request. */
  motif?: DidYouKnowMotifName;
}

function entityHref(language: Language, entity: DidYouKnowEntity): string {
  if (entity.kind === "country") return getCountryRoute(language, entity.id);
  if (entity.kind === "family") return getFamilyRoute(language, entity.id);
  return getPeopleRoute(language, entity.id);
}

interface HomeFactProps {
  fact: DidYouKnowFact;
  imageSide: AnecdoteImageSide;
  language: Language;
  priority: boolean;
}

/**
 * One home-page preview: the document first on phones, then document and text
 * side by side from the tablet breakpoint. It deliberately carries none of
 * AnecdoteReader's paging, reaction, contest or sharing controls.
 *
 * The headline is the band's own h2, not an h3 under a group title: the band
 * carries no title over a random draw (brand charter §8.5), so each fact is a
 * section of the page in its own right.
 */
function HomeFact({ fact, imageSide, language, priority }: HomeFactProps) {
  const illustration = illustrationFor(fact.id);
  const officialSource = fact.sources?.find(
    (source) => source.tier === "official"
  );

  return (
    <article
      className={`home-dyk-card home-dyk-card--image-${imageSide}`}
      data-testid="home-dyk-fact"
    >
      {illustration?.kind === "picture" ? (
        <figure className="home-dyk-figure">
          <div className="home-dyk-frame">
            <Image
              src={illustration.src}
              alt={illustration.alt}
              fill
              priority={priority}
              sizes="(min-width: 1200px) 470px, (min-width: 768px) 42vw, calc(100vw - 44px)"
              className="home-dyk-image"
            />
          </div>
          <figcaption className="home-dyk-credit">
            {illustration.credit}
          </figcaption>
        </figure>
      ) : null}

      {/* Half the bank is a drawn plate rather than a photograph, and the home
          rendered nothing for those — 34 of 67 facts left their image column
          empty, which is the one composition the brand charter §8.2 refuses.
          The anecdotes page has always drawn them; this is the same figure, so
          turning from a photographed card to a drawn one moves nothing. */}
      {illustration?.kind === "plate" ? (
        <AnecdotePlate plate={illustration} className="home-dyk-figure" />
      ) : null}

      <div className="home-dyk-text">
        <h2 className="home-dyk-headline">{fact.headline}</h2>

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

        <p className="home-dyk-tier">
          {officialSource ? (
            <>
              Source&nbsp;:{" "}
              <a
                data-testid="home-dyk-official-source"
                href={officialSource.url}
                rel="noreferrer noopener"
                target="_blank"
              >
                {officialSource.title}
              </a>
            </>
          ) : (
            DID_YOU_KNOW_TIER_LABEL[fact.tier]
          )}
        </p>
      </div>
    </article>
  );
}

/**
 * Two illustrated onomastic facts on the home page.
 *
 * The dedicated anecdote route remains the interactive reader. Here the
 * facts are part of the page's editorial flow: two complete image/text blocks
 * that alternate at tablet and desktop widths, while phones preserve one
 * predictable image-first reading order.
 *
 * The band is filed by its kicker alone. It carried « Deux noms, deux
 * histoires » over a pair drawn at random from the bank — a sentence true of
 * some draws and of no others, in the slot that names the section. Brand
 * charter §8.5: a group title must be able to be wrong.
 */
// @req REQ-113
export function DidYouKnow({
  language,
  facts,
  motif = "mande-kora",
}: DidYouKnowProps) {
  const visibleFacts = facts.slice(0, 2);
  if (visibleFacts.length === 0) return null;

  return (
    <section
      className="home-dyk"
      data-testid="home-did-you-know"
      data-motif={motif}
    >
      <DidYouKnowMotif motif={motif} />

      <div className="home-dyk-inner">
        <SectionHeading
          centred
          eyebrow="Saviez-vous que"
          className="home-dyk-heading"
        />

        <div className="home-dyk-list">
          {visibleFacts.map((fact, index) => (
            <HomeFact
              key={fact.id}
              fact={fact}
              imageSide={index % 2 === 0 ? "start" : "end"}
              language={language}
              priority={index === 0}
            />
          ))}
        </div>

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
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          padding: var(--afh-space-5xl) var(--afh-space-2xl);
          border-top: 1px solid var(--afh-border);
          border-bottom: 1px solid var(--afh-border);
          background: var(--afh-bg-warm);
        }
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
        .home-dyk-motif-mark {
          fill: none;
          stroke: currentColor;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
        }
        .home-dyk-inner {
          position: relative;
          max-width: 1120px;
          margin: 0 auto;
        }
        .home-dyk-list {
          display: grid;
          gap: var(--afh-space-8xl);
          margin-top: var(--afh-space-6xl);
        }
        .home-dyk-card {
          display: flex;
          flex-direction: column;
          text-align: center;
          animation: home-dyk-arrive 220ms ease-out both;
        }
        .home-dyk-card:nth-child(2) {
          animation-delay: 80ms;
        }
        @keyframes home-dyk-arrive {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        .home-dyk-figure {
          min-width: 0;
          margin: 0 0 var(--afh-space-4xl);
        }
        .home-dyk-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
          overflow: hidden;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-lg);
          background: var(--afh-bg);
        }
        .home-dyk-image {
          object-fit: contain;
        }
        .home-dyk-credit {
          max-width: 58ch;
          margin: var(--afh-space-md) auto 0;
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-fg-muted);
        }
        .home-dyk-text {
          min-width: 0;
        }
        .home-dyk-headline {
          max-width: 24ch;
          margin: 0 auto var(--afh-space-xl);
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h2);
          font-weight: 700;
          line-height: var(--afh-leading-h2);
          letter-spacing: -0.014em;
          text-wrap: balance;
          color: var(--afh-text);
        }
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
        .home-dyk-prose .home-dyk-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }
        .home-dyk-prose p:last-child {
          margin-bottom: 0;
        }
        .home-dyk-chips {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--afh-space-md);
          margin: var(--afh-space-4xl) 0 0;
          padding: 0;
          list-style: none;
        }
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
          flex: none;
          border-radius: 50%;
          background: var(--accent);
        }
        .home-dyk-chip-kind {
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }
        .home-dyk-tier {
          margin: var(--afh-space-4xl) 0 0;
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
        }
        .home-dyk-tier a {
          color: inherit;
          text-underline-offset: 3px;
        }
        .home-dyk-tier a:hover,
        .home-dyk-tier a:focus-visible {
          color: var(--afh-text);
        }
        .home-dyk-all {
          margin: var(--afh-space-6xl) 0 0;
          text-align: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .home-dyk-card {
            animation: none;
          }
        }
        @media (min-width: 768px) {
          .home-dyk {
            padding: var(--afh-space-8xl) var(--afh-space-7xl);
          }
          .home-dyk-list {
            gap: var(--afh-space-9xl);
          }
          .home-dyk-card {
            display: grid;
            grid-template-columns: minmax(0, 44%) minmax(0, 56%);
            align-items: center;
            gap: var(--afh-space-6xl);
            text-align: left;
          }
          .home-dyk-card--image-end .home-dyk-figure {
            order: 2;
          }
          .home-dyk-figure {
            margin: 0;
          }
          .home-dyk-frame {
            aspect-ratio: 4 / 3;
          }
          .home-dyk-credit,
          .home-dyk-headline,
          .home-dyk-prose {
            margin-inline: 0;
          }
          .home-dyk-headline {
            max-width: none;
          }
          .home-dyk-prose {
            text-align: left;
          }
          .home-dyk-chips {
            justify-content: flex-start;
          }
        }
        @media (min-width: 1200px) {
          .home-dyk-card {
            gap: var(--afh-space-8xl);
          }
        }
      `}</style>
    </section>
  );
}
