import Image from "next/image";

import {
  AfricaTraceLoader,
  LOADER_REVEAL_DELAY_MS,
} from "@/components/system/AfricaTraceLoader";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import {
  illustrationFor,
  illustrationSideFor,
} from "@/lib/home/didYouKnowIllustrations";
import {
  DID_YOU_KNOW_ENTITY_ACCENT,
  DID_YOU_KNOW_ENTITY_LABEL,
  DID_YOU_KNOW_TIER_LABEL,
} from "@/lib/home/didYouKnowPresentation";
import { cn } from "@/lib/utils";

/**
 * How far apart two consecutive lines arrive.
 *
 * Paced to the eye rather than to the network: at this interval the reader is
 * still on the headline when the first paragraph lands, so the surface reads
 * as something being written rather than as six things appearing late.
 */
const STEP_STAGGER_MS = 160;

/** How many staggered slots the sheet declares. Past this, lines share the last. */
const MAX_STEPS = 8;

const stepClass = (step: number) =>
  `afh-dykl-s${Math.min(step, MAX_STEPS - 1)}`;

export interface DidYouKnowLoaderProps {
  /**
   * What is being waited for, in the reader's words — "Chargement de la fiche
   * peuple", not "Chargement". This is the whole of what a screen reader is
   * told, so a bare "loading" leaves its user with less than the sighted
   * reader gets.
   */
  label: string;
  /** The fact to spend the wait on, or null when the bank has none to give. */
  fact: DidYouKnowFact | null;
  className?: string;
}

/**
 * The wait state of the site: one onomastic fact, unveiled at reading pace
 * (REQ-104, REQ-113).
 *
 * A wait is dead time only if there is nothing in it. The bank the home band
 * draws from is already written, already sourced and already tiered, so the
 * loading surface shows a fact from it rather than an indicator that says
 * nothing but "wait". The reader who navigates a lot ends up having read the
 * bank, which is the outcome the atlas wants anyway.
 *
 * Three things this deliberately does not do:
 *
 * The chips are not links. On the home band they are exits into the atlas;
 * here the surface is about to be replaced by the page the reader already
 * asked for, so a link would be a focus target that vanishes under the
 * pointer. They stay as labels, and nothing inside the wait is focusable.
 *
 * The live region holds the label alone, not the fact. `role="status"` is
 * polite, but a region wrapping four paragraphs would have a screen reader
 * recite the whole anecdote on every navigation. The fact stays in the
 * document, readable on demand; only the wait itself is announced.
 *
 * Nothing paints for the first 300 ms — see `LOADER_REVEAL_DELAY_MS`. A page
 * that resolves inside that window shows no interstitial at all, which is the
 * point: a fact taken away before it can be read is worse than no fact.
 *
 * The continent keeps inking after the last line has landed. It is the only
 * thing still moving once the fact is fully unveiled, and a surface that
 * freezes while the page is still coming reads as a page that has died.
 */
// @req REQ-104
// @req REQ-113
export function DidYouKnowLoader({
  label,
  fact,
  className,
}: DidYouKnowLoaderProps) {
  // Steps are handed out in reading order, so the sheet's stagger and the
  // order a reader's eye travels in cannot drift apart.
  let step = 0;
  const nextStep = () => stepClass(step++);
  const illustration = fact ? illustrationFor(fact.id) : undefined;
  const imageSide = fact ? illustrationSideFor(fact.id) : "start";

  return (
    <div
      className={cn("afh-dykl", className)}
      data-testid="did-you-know-loader"
    >
      <p className="sr-only" role="status">
        {label}
      </p>

      <div className={cn("afh-dykl-mark", "afh-dykl-rise", nextStep())}>
        <AfricaTraceLoader decorative label={label} />
      </div>

      {fact ? (
        <div
          className={cn(
            "afh-dykl-inner",
            "afh-dykl-split",
            `afh-dykl-split--image-${imageSide}`
          )}
        >
          {illustration ? (
            <figure
              className={cn("afh-dykl-figure", "afh-dykl-rise", nextStep())}
            >
              <div className="afh-dykl-frame">
                <Image
                  src={illustration.src}
                  alt={illustration.alt}
                  fill
                  priority
                  sizes="(min-width: 768px) 42vw, calc(100vw - 44px)"
                  className="afh-dykl-image"
                />
              </div>
              <figcaption className="afh-dykl-credit">
                {illustration.credit}
              </figcaption>
            </figure>
          ) : null}

          <div className="afh-dykl-text">
            <p className={cn("afh-dykl-eyebrow", "afh-dykl-rise", nextStep())}>
              Saviez-vous que
            </p>

            <p className={cn("afh-dykl-headline", "afh-dykl-rise", nextStep())}>
              {fact.headline}
            </p>

            {fact.body.map((paragraph, index) => (
              <p
                key={paragraph.slice(0, 32)}
                className={cn(
                  "afh-dykl-body",
                  index === 0 && "afh-dykl-lede",
                  "afh-dykl-rise",
                  nextStep()
                )}
              >
                {paragraph}
              </p>
            ))}

            {fact.entities.length > 0 && (
              <ul className={cn("afh-dykl-chips", "afh-dykl-rise", nextStep())}>
                {fact.entities.map((entity) => (
                  <li
                    key={`${entity.kind}-${entity.id}`}
                    className={cn(
                      "afh-dykl-chip",
                      DID_YOU_KNOW_ENTITY_ACCENT[entity.kind]
                    )}
                  >
                    <span aria-hidden="true" className="afh-dykl-dot" />
                    <span className="afh-dykl-chip-kind">
                      {DID_YOU_KNOW_ENTITY_LABEL[entity.kind]}
                    </span>
                    {entity.label}
                  </li>
                ))}
              </ul>
            )}

            <p className={cn("afh-dykl-tier", "afh-dykl-rise", nextStep())}>
              {DID_YOU_KNOW_TIER_LABEL[fact.tier]}
            </p>
          </div>
        </div>
      ) : null}

      <style>{`
        .afh-dykl {
          --afh-dykl-delay: ${LOADER_REVEAL_DELAY_MS}ms;
          --afh-dykl-stagger: ${STEP_STAGGER_MS}ms;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          /* A floor, not a fixed height: it keeps the footer off the fold
             while the fact arrives, and it is the same floor the arriving
             page's first screen occupies, so nothing jumps when it lands. */
          min-height: min(52vh, 420px);
          padding: 32px 22px;
          text-align: center;
        }
        .afh-dykl-mark {
          width: 108px;
          margin: 0 auto 18px;
        }
        .afh-dykl-inner {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
        }
        .afh-dykl-split {
          display: flex;
          flex-direction: column;
        }
        .afh-dykl-figure {
          min-width: 0;
          margin: 0 0 24px;
        }
        .afh-dykl-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
          overflow: hidden;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-lg);
          background: var(--afh-bg-warm);
        }
        .afh-dykl-image {
          object-fit: contain;
        }
        .afh-dykl-credit {
          max-width: 56ch;
          margin: 10px auto 0;
          font-size: var(--afh-text-caption);
          line-height: 1.45;
          color: var(--afh-fg-muted);
        }
        .afh-dykl-text {
          min-width: 0;
          max-width: 58ch;
          margin: 0 auto;
        }
        .afh-dykl-eyebrow {
          margin: 0;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: var(--afh-color-gold);
        }
        .afh-dykl-headline {
          margin: 14px 0 16px;
          font-family: var(--font-fraunces), Georgia, serif;
          font-weight: 600;
          font-size: var(--afh-text-h2);
          line-height: 1.18;
          letter-spacing: -0.014em;
          text-wrap: balance;
          color: var(--afh-text);
        }
        .afh-dykl-body {
          margin: 0 0 14px;
          font-size: var(--afh-text-body);
          line-height: 1.65;
          color: var(--afh-text-soft);
        }
        .afh-dykl-lede {
          font-size: var(--afh-text-lead);
          color: var(--afh-text);
        }
        .afh-dykl-chips {
          list-style: none;
          margin: 22px 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        /* Each chip carries its own accent class, so it reads var(--accent)
           from itself rather than from the surface it is waiting on. */
        .afh-dykl-chip {
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
        }
        .afh-dykl-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex: none;
        }
        .afh-dykl-chip-kind {
          font-size: var(--afh-text-eyebrow);
          font-weight: 500;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          opacity: 0.72;
        }
        .afh-dykl-tier {
          margin: 22px auto 0;
          padding-top: 14px;
          max-width: 34ch;
          border-top: 1px solid var(--afh-border);
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          /* The tier again, this time on the waiting screen. A reader who
             only ever sees the fact here still has to see what backs it. */
          color: var(--afh-fg-muted);
        }

        /* The unveiling. "both" holds each line at zero opacity through its
           own delay — without it every line starts painted and the stagger
           buys nothing. */
        .afh-dykl-rise {
          animation: afh-dykl-rise var(--afh-duration-fade)
            var(--afh-ease-spring)
            calc(
              var(--afh-dykl-delay) + var(--afh-dykl-step, 0) *
                var(--afh-dykl-stagger)
            )
            both;
        }
        .afh-dykl-s0 { --afh-dykl-step: 0; }
        .afh-dykl-s1 { --afh-dykl-step: 1; }
        .afh-dykl-s2 { --afh-dykl-step: 2; }
        .afh-dykl-s3 { --afh-dykl-step: 3; }
        .afh-dykl-s4 { --afh-dykl-step: 4; }
        .afh-dykl-s5 { --afh-dykl-step: 5; }
        .afh-dykl-s6 { --afh-dykl-step: 6; }
        .afh-dykl-s7 { --afh-dykl-step: 7; }
        @keyframes afh-dykl-rise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Charter §6: only opacity survives. The stagger is motion and
           collapses, so the fact arrives whole; the 300 ms threshold is a
           perception guard rather than motion and stays. */
        @media (prefers-reduced-motion: reduce) {
          .afh-dykl { --afh-dykl-stagger: 0ms; }
          .afh-dykl-rise { transform: none; }
        }

        @media (min-width: 720px) {
          .afh-dykl { padding: 56px 40px; }
          .afh-dykl-mark { width: 128px; }
        }
        @media (min-width: 768px) {
          .afh-dykl-split {
            display: grid;
            grid-template-columns: minmax(0, 44%) minmax(0, 56%);
            align-items: center;
            gap: 40px;
            text-align: left;
          }
          .afh-dykl-split--image-end .afh-dykl-figure {
            order: 2;
          }
          .afh-dykl-figure {
            margin: 0;
          }
          .afh-dykl-frame {
            aspect-ratio: 4 / 3;
          }
          .afh-dykl-credit,
          .afh-dykl-text {
            margin-inline: 0;
          }
          .afh-dykl-chips {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
