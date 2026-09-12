import { Children, isValidElement, type ReactNode } from "react";

import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";

export interface FicheTileProps {
  title: string;
  closedFact: string;
  children: ReactNode;
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
export function FicheTile({ title, closedFact, children }: FicheTileProps) {
  const fact = closedFact.trim();
  const detail = comparable(visibleText(children));
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
        <div className="pt-afh-sm text-afh-body text-afh-text-soft">
          {children}
        </div>
      </div>
    );
  }

  return (
    <details
      data-fiche-tile=""
      className="rounded-afh-lg border border-afh-border bg-afh-surface"
    >
      <summary
        className={`min-h-11 cursor-pointer px-afh-md py-afh-sm text-afh-body text-afh-text ${CHARTER_FOCUS_RING}`}
      >
        <span className="font-semibold">{title}</span>
        <span
          data-closed-fact=""
          className="block text-afh-caption text-afh-text-soft md:ml-afh-sm md:inline"
        >
          {fact}
        </span>
      </summary>
      <div className="border-t border-afh-border px-afh-md py-afh-sm text-afh-body text-afh-text-soft">
        {children}
      </div>
    </details>
  );
}
