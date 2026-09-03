/**
 * NameSpellingHistory — Epic 8 Story 8.8 (ETNI-472).
 *
 * A semantic `<ol>` of historical spellings in the order given by the
 * caller — the ordered list IS the primary rendering (no dataviz, no
 * timeline library). Each entry carries its own `ConfidenceChip` slot
 * (one chip per entry, source-attached rule UX-DR49 #2). Renders nothing
 * when there is no history to show.
 */

import type { NameSpellingHistoryEntry } from "@/types/names";

export interface NameSpellingHistoryProps {
  spellings: NameSpellingHistoryEntry[];
}

// @req REQ-056
export function NameSpellingHistory({ spellings }: NameSpellingHistoryProps) {
  if (spellings.length === 0) {
    return null;
  }

  return (
    <ol className="flex flex-col gap-afh-sm font-afh text-afh-body text-afh-text">
      {spellings.map((entry, index) => (
        <li
          key={`${entry.nameText}-${index}`}
          className="flex flex-wrap items-baseline gap-afh-xs"
        >
          <span className="font-afh-display font-bold">{entry.nameText}</span>
          {entry.periodLabel ? (
            <span className="text-afh-small text-afh-text-soft">
              {entry.periodLabel}
            </span>
          ) : null}
          {entry.confidenceChip}
        </li>
      ))}
    </ol>
  );
}
