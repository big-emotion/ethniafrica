import { ChevronDown, ChevronUp } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";

import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";

export interface FicheTileProps {
  title: string;
  closedFact: string;
  closedFactContent?: ReactNode;
  detailText?: string;
  children?: ReactNode;
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

function comparable(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?…]+$/u, "")
    .toLocaleLowerCase();
}

/**
 * A disclosure inside a fiche chapter, never the chapter itself. Nommer's
 * ChapterTile navigates because its destination is a page; this tile deploys
 * additional prose, so the same rule permits it to open in place (DEC-048).
 * Native details supplies keyboard operation and announced expanded state
 * without client-side state or motion.
 */
// @req REQ-153
export function FicheTile({
  title,
  closedFact,
  closedFactContent,
  detailText,
  children,
}: FicheTileProps) {
  const fact = closedFact.trim();
  const detail = comparable(detailText ?? visibleText(children));
  const canCollapse =
    fact.length > 0 &&
    detail.length > 0 &&
    comparable(fact) !== comparable(title) &&
    detail !== comparable(fact);

  if (!canCollapse) {
    return (
      <div
        data-fiche-tile=""
        className="rounded-afh-lg border border-afh-border bg-afh-surface px-afh-md py-afh-sm"
      >
        <h3 className="text-afh-body font-semibold text-afh-text">{title}</h3>
        <div
          data-closed-fact=""
          className="pt-afh-sm text-afh-body text-afh-text-soft"
        >
          {children ?? closedFactContent ?? fact}
        </div>
      </div>
    );
  }

  return (
    <details
      data-fiche-tile=""
      className="group rounded-afh-lg border border-afh-border bg-afh-surface"
    >
      {/* The native triangle is replaced by a circle the size of a thumb.
          It does not turn: the tile charter greps this markup for a rotation,
          a transform transition or a motion-safe variant and fails on any of
          them, and a 44px control that spins is exactly the kind of motion
          that rule exists to keep off a reading surface.

          So the state is said with two glyphs rather than one turned glyph —
          swapped by the `open` attribute, which costs no script and no
          motion, and reads the same to someone who has asked the system for
          less animation. */}
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center gap-afh-md px-afh-md py-afh-sm text-afh-body text-afh-text [&::-webkit-details-marker]:hidden ${CHARTER_FOCUS_RING}`}
      >
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{title}</span>
          <span
            data-closed-fact=""
            className="block text-afh-caption text-afh-text-soft md:ml-afh-sm md:inline"
          >
            {closedFactContent ?? fact}
          </span>
        </span>
        <span
          aria-hidden="true"
          data-fiche-tile-chevron=""
          className="grid h-11 w-11 shrink-0 place-items-center rounded-afh-full border border-afh-border text-afh-text-soft group-open:border-[color:var(--accent)] group-open:text-[color:var(--accent-ink)]"
        >
          <ChevronDown className="h-4 w-4 group-open:hidden" />
          <ChevronUp className="hidden h-4 w-4 group-open:block" />
        </span>
      </summary>
      <div className="border-t border-afh-border px-afh-md py-afh-sm text-afh-body text-afh-text-soft">
        {children}
      </div>
    </details>
  );
}
