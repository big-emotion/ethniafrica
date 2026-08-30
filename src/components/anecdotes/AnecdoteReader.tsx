"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { AnecdoteCard } from "@/components/anecdotes/AnecdoteCard";
import {
  shuffleDidYouKnowDeck,
  type DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";
import type { AnecdoteImageSide } from "@/lib/home/didYouKnowPresentation";
import { accentForModule } from "@/lib/hubs/moduleRegistry";
import type { Language } from "@/types/shared";

export interface AnecdoteReaderProps {
  language: Language;
  /** The bank, already drawn server-side so the first card is not a flash. */
  deck: DidYouKnowFact[];
  /** The fact a shared link names, when it names one still in the bank. */
  initialFactId?: string | null;
  /** Which side the first card's picture takes; the rest alternate from it. */
  openingImageSide?: AnecdoteImageSide;
}

/**
 * The anecdotes page: one fact, drawn, with somewhere to go next.
 *
 * It replaced a paginated feed. The feed was the honest first shape — the
 * whole bank, addressable, in the authored order — but it asked the reader
 * to choose what to read before they knew what any of it was, and twenty-four
 * headlines stacked in a column is a table of contents, not a surface anyone
 * reads. One card at a time asks nothing and shows everything.
 *
 * Three things follow from serving one card:
 *
 * - **The draw happens on the server.** The deck arrives shuffled from the
 *   page, so the reader never sees the first fact of the bank swapped out
 *   from under them a frame after paint. Walking and re-shuffling are the
 *   client's job because they follow a press, not a request.
 * - **The card is addressable.** `?a=<id>` names the fact on show and the
 *   history entry is rewritten as the reader turns, so the share button, a
 *   reload and a bookmark all mean the anecdote rather than the page.
 * - **The deck is exhausted before it repeats.** A reader pressing
 *   « Suivant » reaches the twenty-fourth fact on the twenty-fourth press.
 *
 * The two feedback controls do different jobs and are honest about it. The
 * mark is the reader's own, kept in their browser: it builds a private trail
 * through the bank and is never sent anywhere, which is why the counter says
 * « sur cet appareil » rather than pretending to be a public tally. The
 * contestation goes to the atlas's existing signalement form, because an
 * objection that stays on the reader's machine is not an objection.
 */

/** Where the reader's own marks live. Their browser, and nowhere else. */
const MARKS_KEY = "afh.anecdotes.marked";

/** One shared empty array: a new [] each read would loop the store. */
const NO_MARKS: string[] = [];

const markListeners = new Set<() => void>();

// useSyncExternalStore compares snapshots by identity, so the parsed array has
// to be cached against the raw string it came from — parsing afresh on every
// render would hand React a new array each time and never settle.
let cachedRaw: string | null = null;
let cachedMarks: string[] = NO_MARKS;

function readMarks(): string[] {
  try {
    const raw = window.localStorage.getItem(MARKS_KEY);
    if (raw === cachedRaw) return cachedMarks;
    cachedRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedMarks = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : NO_MARKS;
    return cachedMarks;
  } catch {
    // Private windows, cleared site data and browsers set to refuse storage
    // all throw here. A reader who cannot keep marks still gets the page.
    return NO_MARKS;
  }
}

/** The server has no reader and therefore no marks. */
function noMarks(): string[] {
  return NO_MARKS;
}

function subscribeToMarks(onChange: () => void): () => void {
  markListeners.add(onChange);
  // A second tab marking a fact is a real change to the same store.
  window.addEventListener("storage", onChange);
  return () => {
    markListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeMarks(marks: string[]): void {
  try {
    window.localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
  } catch {
    // Same three cases. Losing the trail is not worth losing the card over.
  }
  for (const listener of markListeners) listener();
}

// @req REQ-113
export function AnecdoteReader({
  language,
  deck,
  initialFactId = null,
  openingImageSide = "end",
}: AnecdoteReaderProps) {
  const [order, setOrder] = useState<DidYouKnowFact[]>(deck);
  const [position, setPosition] = useState(() => {
    const named = deck.findIndex((fact) => fact.id === initialFactId);
    return named >= 0 ? named : 0;
  });
  // Both panels are scoped to the fact that opened them, so turning the card
  // closes them without an effect reaching in to reset anything.
  const [shareOpenFor, setShareOpenFor] = useState<string | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const marked = useSyncExternalStore(subscribeToMarks, readMarks, noMarks);

  const fact = order[position];

  // The address follows the card so that sharing, reloading and going back
  // all name the anecdote on screen. replaceState rather than the router:
  // turning a card is not a navigation, and pushing one would make the back
  // button walk the deck backwards instead of leaving the page.
  useEffect(() => {
    if (!fact) return;
    const url = new URL(window.location.href);
    url.searchParams.set("a", fact.id);
    window.history.replaceState(null, "", url.toString());
  }, [fact]);

  const goNext = useCallback(() => {
    if (position + 1 < order.length) {
      setPosition(position + 1);
      return;
    }
    setOrder(shuffleDidYouKnowDeck(Math.random, order, fact?.id ?? null));
    setPosition(0);
  }, [fact, order, position]);

  const toggleMark = useCallback(() => {
    if (!fact) return;
    writeMarks(
      marked.includes(fact.id)
        ? marked.filter((id) => id !== fact.id)
        : [...marked, fact.id]
    );
  }, [fact, marked]);

  const shareUrl = useMemo(() => {
    if (!fact || typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}?a=${fact.id}`;
  }, [fact]);

  // The button used to hand the intent to `navigator.share` first and only
  // open this row once that sheet was dismissed — so on every phone the
  // press produced a system sheet, and the row appeared *after* the reader
  // had said no to it, reading as a second, unasked-for prompt. One press,
  // the choices, always the same five.
  const share = useCallback(() => {
    if (!fact) return;
    setShareOpenFor((open) => (open === fact.id ? null : fact.id));
  }, [fact]);

  const copyLink = useCallback(async () => {
    if (!fact) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedFor(fact.id);
    } catch {
      setCopiedFor(null);
    }
  }, [fact, shareUrl]);

  // An empty bank is not an error state to dress; it is a page with nothing
  // to say, and saying so beats framing an empty card.
  if (!fact) {
    return (
      <p className="anecdote-empty">
        Aucune anecdote n&apos;est publiée pour le moment.
      </p>
    );
  }

  const isMarked = marked.includes(fact.id);
  const isSharing = shareOpenFor === fact.id;
  const isCopied = copiedFor === fact.id;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(fact.headline);

  // The wrapper carries the module's own accent — the one its tile takes in
  // the Comprendre hub. It is a wrapper rather than a set of colour literals
  // because --accent means two incompatible things depending on where it is
  // read: a bare shadcn HSL triplet at :root, a charter hex under an
  // .afh-accent-* element. Without it, var(--accent-tint) and
  // var(--accent-ink) below resolve to nothing at all.
  const accent = accentForModule({ id: "anecdotes" });

  // Alternating from a side the page drew, rather than drawing per card:
  // a fresh draw at each turn would land on the same side twice or three
  // times running, which looks like a layout that failed to change.
  const imageSide: AnecdoteImageSide =
    position % 2 === 0
      ? openingImageSide
      : openingImageSide === "start"
        ? "end"
        : "start";

  return (
    <div className={`anecdote-reader ${accent}`}>
      {/* Turning a card swaps the content under a button that has not moved:
          without this the only thing announced is that focus is still where
          the reader left it. */}
      <p className="sr-only" aria-live="polite">
        {`Anecdote ${position + 1} sur ${order.length} : ${fact.headline}`}
      </p>

      <AnecdoteCard language={language} fact={fact} imageSide={imageSide} />

      <div className="anecdote-controls">
        <button type="button" className="anecdote-next" onClick={goNext}>
          Suivant
        </button>

        <div className="anecdote-reactions">
          <button
            type="button"
            className="anecdote-action"
            aria-pressed={isMarked}
            onClick={toggleMark}
          >
            {isMarked ? "Anecdote retenue" : "Cette anecdote est intéressante"}
          </button>

          <button
            type="button"
            className="anecdote-action"
            aria-expanded={isSharing}
            onClick={share}
          >
            Partager
          </button>

          <Link
            className="anecdote-action"
            href={`/${language}/report-error?anecdote=${fact.id}`}
          >
            Je conteste cette anecdote
          </Link>
        </div>

        {isSharing ? (
          <ul className="anecdote-share">
            <li>
              <button
                type="button"
                className="anecdote-share-link"
                onClick={copyLink}
              >
                {isCopied ? "Lien copié" : "Copier le lien"}
              </button>
            </li>
            <li>
              <a
                className="anecdote-share-link"
                href={`https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`}
                rel="noreferrer noopener"
                target="_blank"
              >
                X
              </a>
            </li>
            <li>
              <a
                className="anecdote-share-link"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                rel="noreferrer noopener"
                target="_blank"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                className="anecdote-share-link"
                href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                rel="noreferrer noopener"
                target="_blank"
              >
                WhatsApp
              </a>
            </li>
            <li>
              <a
                className="anecdote-share-link"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                rel="noreferrer noopener"
                target="_blank"
              >
                LinkedIn
              </a>
            </li>
          </ul>
        ) : null}

        <p className="anecdote-progress">
          {marked.length > 0
            ? `${position + 1} / ${order.length} — ${marked.length} retenue${marked.length > 1 ? "s" : ""} sur cet appareil`
            : `${position + 1} / ${order.length}`}
        </p>
      </div>

      <style>{`
        .anecdote-reader {
          max-width: 62ch;
          margin: 0 auto;
        }
        /* The measure that suits one column is half a column once the card
           splits in two, so the box widens with the band — and only with it. */
        @media (min-width: 768px) {
          .anecdote-reader {
            max-width: 1040px;
          }
        }
        .anecdote-empty {
          color: var(--afh-text-soft);
        }
        .anecdote-controls {
          margin-top: 26px;
          padding-top: 22px;
          border-top: 1px solid var(--afh-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        /* Terracotta rather than the surface accent: it is the pair the
           site's own Button already ships for a primary action
           (bg-afh-terracotta / white), it clears AA in both themes, and it
           does not depend on which accent the module happens to sit on. */
        .anecdote-next {
          min-height: 48px;
          padding: 0 34px;
          border: 1px solid var(--afh-terracotta);
          border-radius: var(--afh-radius-full);
          background: var(--afh-terracotta);
          color: #fff;
          font-size: var(--afh-text-body);
          font-weight: 600;
          cursor: pointer;
        }
        .anecdote-next:hover,
        .anecdote-next:focus-visible {
          filter: brightness(0.94);
        }
        .anecdote-reactions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }
        /* 44px of tappable height on every secondary control, whatever the
           label's length does to its width. */
        .anecdote-action {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-full);
          background: var(--afh-color-card);
          color: var(--afh-text-soft);
          font-size: var(--afh-text-caption);
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
        }
        .anecdote-action:hover,
        .anecdote-action:focus-visible {
          border-color: var(--afh-text-soft);
          color: var(--afh-text);
        }
        .anecdote-action[aria-pressed="true"] {
          border-color: var(--accent);
          color: var(--accent-ink);
          background: var(--accent-tint);
        }
        .anecdote-share {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
        }
        .anecdote-share-link {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-full);
          background: transparent;
          color: var(--afh-text-soft);
          font-size: var(--afh-text-caption);
          text-decoration: none;
          cursor: pointer;
        }
        .anecdote-share-link:hover,
        .anecdote-share-link:focus-visible {
          border-color: var(--afh-text-soft);
          color: var(--afh-text);
        }
        .anecdote-progress {
          margin: 0;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          color: var(--afh-fg-muted);
        }
      `}</style>
    </div>
  );
}

export default AnecdoteReader;
