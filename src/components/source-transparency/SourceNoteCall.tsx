"use client";

import { cn } from "@/lib/utils";

interface SourceNoteCallProps {
  /** Its number in this fiche's bibliography, which the footer repeats. */
  number: number;
  /** The DOM id a shared `#chip-…` link lands on. Content-addressed, never `note-3`. */
  anchorId: string;
  /** The chapter or field this note belongs to, for the accessible name. */
  fieldLabel: string;
  /** True when `assertions.confidence_level` records a contested claim. */
  contested?: boolean;
  onOpen: () => void;
  className?: string;
}

/**
 * The inline mark that turns a sourced field into a citation.
 *
 * A sibling of `ConfidenceChip` rather than a use of it, and the difference is
 * not stylistic. The chip states a verdict — "85 % · 3 sources · vérifié le …"
 * — and falls back to a plain text link the moment any of those three values is
 * null, which on this corpus is nearly always, because `last_human_audit_at` is
 * unset almost everywhere. A note callout must never fall back: it exists
 * because sources exist, and it says only which ones. The chip also pulses once
 * per session, which is fair for one mark on a page and is a flicker for twelve.
 *
 * Square, not a pill, and not tinted: `actions-charter.md` §6 gives radius 0 to
 * the source apparatus, and the four categorical accents already teach entity
 * kinds — a fifth meaning on them is a code no reader can learn.
 */
// @req REQ-019
export function SourceNoteCall({
  number,
  anchorId,
  fieldLabel,
  contested,
  onOpen,
  className,
}: SourceNoteCallProps) {
  return (
    <sup className="align-super leading-none">
      <button
        type="button"
        id={anchorId}
        data-note-number={number}
        data-contested={contested ? "true" : undefined}
        onClick={onOpen}
        aria-label={`note ${number} — ouvrir les sources de « ${fieldLabel} »`}
        className={cn(
          "relative inline-block rounded-none px-0.5 text-afh-eyebrow tabular-nums",
          "text-afh-text-soft underline-offset-2 hover:underline",
          "focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]",
          // The target is grown with an absolutely positioned overlay rather
          // than with padding: padding on an inline element inside prose grows
          // the line box, and a paragraph whose leading jumps at every citation
          // is a worse read than a small mark.
          "after:absolute after:-inset-x-3 after:-inset-y-4 after:content-['']",
          contested && "underline decoration-dotted",
          className
        )}
      >
        [{number}]
      </button>
    </sup>
  );
}
