import Link from "next/link";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface FacetLetterRailProps {
  /** The letter the reading is on, or null for the whole alphabet. */
  current: string | null;
  /** The facet's address under a given letter — null means "every letter". */
  hrefFor: (letter: string | null) => string;
  className?: string;
}

/**
 * The alphabetical index of a facet.
 *
 * Anchors, not buttons: a letter is a reading of the corpus, so it has an
 * address — and the rail then works before hydration and can be followed by a
 * crawler. That is also why it keeps its 27 anchors when the filter bar folds
 * it away; a fold hides them from the eye, never from the document.
 *
 * It was written inline in the peoples facet, which is where it also fell
 * outside the filter form — applying a family dropped the letter, because a
 * `GET` form submits the fields it holds and this rail was not one of them.
 * Lifting it out is what let the bar hold it.
 */
// @req REQ-114
export function FacetLetterRail({
  current,
  hrefFor,
  className,
}: FacetLetterRailProps) {
  const pillClass =
    "inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-afh-caption";
  const pillStyle = (selected: boolean) =>
    selected
      ? {
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)",
        }
      : { backgroundColor: "var(--accent-tint)" };

  return (
    <nav aria-label="Première lettre" className={className}>
      <ul className="flex flex-wrap gap-1">
        <li>
          <Link
            href={hrefFor(null)}
            aria-current={current ? undefined : "page"}
            className={pillClass}
            style={pillStyle(!current)}
          >
            Tous
          </Link>
        </li>
        {ALPHABET.map((letter) => (
          <li key={letter}>
            <Link
              href={hrefFor(letter)}
              aria-current={current === letter ? "page" : undefined}
              className={pillClass}
              style={pillStyle(current === letter)}
            >
              {letter}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default FacetLetterRail;
