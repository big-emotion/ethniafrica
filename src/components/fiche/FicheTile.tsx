import { Children, isValidElement, type ReactNode } from "react";

import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

export interface FicheTileProps {
  title: string;
  closedFact: string;
  closedFactContent?: ReactNode;
  /**
   * A datum set in the display face above the preview — a count, a name. The
   * preview under it stays the sentence the reader decides on.
   */
  value?: ReactNode;
  detailText?: string;
  children?: ReactNode;
  /** A line above the label — the period of a chronology station. */
  kicker?: ReactNode;
  /**
   * The body repeats the preview in full, with what plain text cannot carry
   * (a note call). Opened, the preview steps aside so nothing reads twice.
   */
  bodyRestatesPreview?: boolean;
  /** Spans both columns of `FicheTiles`. An odd last tile does so on its own. */
  wide?: boolean;
  language?: Language;
}

function visibleText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return visibleText(child.props.children);
      }
      return "";
    })
    .join(" ");
}

/**
 * Past this many characters a preview no longer fits its two lines. A tile
 * whose body restates the preview then still folds: the clamp is what differs
 * between the closed and the opened tile, and a long country field written as
 * one sentence would otherwise print whole and open.
 */
const PREVIEW_OVERFLOW_CHARS = 90;

function comparable(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?…]+$/u, "")
    .toLocaleLowerCase();
}

/**
 * The grid every chapter lays its tiles out in: two columns from the phone up,
 * 12px apart. The column count is the stylesheet's, not each caller's, which
 * is how the chapters ended up at three different gaps before this existed.
 */
// @req REQ-153
export function FicheTiles({ children }: { children: ReactNode }) {
  return <div className="afh-tiles">{children}</div>;
}

/**
 * A disclosure inside a fiche chapter, never the chapter itself. Nommer's
 * ChapterTile navigates because its destination is a page; this tile deploys
 * additional prose, so the same rule permits it to open in place (DEC-048).
 * Native details supplies keyboard operation and announced expanded state
 * without client-side state or motion.
 *
 * Closed, it shows its label, an optional value, and a preview clamped to two
 * lines, then a worded control. Open, the clamp lifts and the body follows.
 * The long text is folded, never dropped (operator ruling, 2026-09-12).
 */
// @req REQ-153
export function FicheTile({
  title,
  closedFact,
  closedFactContent,
  value,
  detailText,
  children,
  kicker,
  bodyRestatesPreview = false,
  wide = false,
  language = FALLBACK_LOCALE,
}: FicheTileProps) {
  const fact = closedFact.trim();
  const detail = comparable(detailText ?? visibleText(children));
  const canCollapse =
    fact.length > 0 &&
    detail.length > 0 &&
    comparable(fact) !== comparable(title) &&
    (detail !== comparable(fact) ||
      (bodyRestatesPreview && fact.length > PREVIEW_OVERFLOW_CHARS));
  const wideAttribute = wide ? "true" : undefined;

  if (!canCollapse) {
    return (
      <div data-fiche-tile="" data-wide={wideAttribute} className="afh-tile">
        {kicker ? <p className="afh-tile-kicker">{kicker}</p> : null}
        <h3 className="afh-tile-label">{title}</h3>
        {value ? (
          <p data-tile-value="" className="afh-tile-value">
            {value}
          </p>
        ) : null}
        <div data-closed-fact="" className="afh-tile-fact">
          {children ?? closedFactContent ?? fact}
        </div>
      </div>
    );
  }

  const copy = ficheCopy[language].tile;

  return (
    <details
      data-fiche-tile=""
      data-wide={wideAttribute}
      data-body-restates-preview={bodyRestatesPreview ? "true" : undefined}
      className="afh-tile"
    >
      <summary className={`afh-tile-summary ${CHARTER_FOCUS_RING}`}>
        {kicker ? <span className="afh-tile-kicker">{kicker}</span> : null}
        <span className="afh-tile-label">{title}</span>
        {value ? (
          <span data-tile-value="" className="afh-tile-value">
            {value}
          </span>
        ) : null}
        <span data-closed-fact="" className="afh-tile-preview">
          {closedFactContent ?? fact}
        </span>
        {/* Words rather than a glyph, and both labels in the markup: the
            `open` attribute picks the one that shows, so nothing turns and
            nothing transitions. The tile charter greps for a transform. */}
        <span
          aria-hidden="true"
          data-fiche-tile-control=""
          className="afh-tile-control"
        >
          <span data-when="closed">{copy.more}</span>
          <span data-when="open">{copy.less}</span>
        </span>
      </summary>
      <div className="afh-tile-body">{children}</div>
    </details>
  );
}
