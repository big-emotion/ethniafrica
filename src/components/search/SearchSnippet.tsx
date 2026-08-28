import { parseHighlightedSnippet } from "@/lib/search/highlight";
import { cn } from "@/lib/utils";

interface SearchSnippetProps {
  snippet: string;
  className?: string;
}

/**
 * The "why did this match" line under a search result.
 *
 * A reader searching "Bété" who is shown Amhara deserves to see
 * `Wollo (Bete Amhara)` with the term marked, rather than being left to guess
 * that a historical region is what surfaced the fiche.
 *
 * The excerpt is split into plain strings before rendering, so the corpus can
 * never inject markup here — see `src/lib/search/highlight.ts`.
 */
// @req REQ-002
export function SearchSnippet({ snippet, className }: SearchSnippetProps) {
  const segments = parseHighlightedSnippet(snippet);
  if (segments.length === 0) return null;

  return (
    <p
      data-testid="search-snippet"
      className={cn("text-afh-small text-afh-text-soft", className)}
    >
      {segments.map((segment, index) =>
        segment.marked ? (
          <mark
            key={index}
            className="rounded-afh-sm bg-[var(--accent-tint)] px-0.5 text-afh-text"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </p>
  );
}
