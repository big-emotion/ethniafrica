/**
 * A `FicheTile`'s closed state must state a datum, never repeat the rubric
 * name (its own charter, REQ-153) — so a field long enough to hold two
 * sentences is split at its first terminator, and only the first becomes the
 * closed fact. `PeopleCultureChapter` is the one reader since the culture grid
 * that shared this rule was removed; the file keeps its name so the import
 * does not move with the deletion.
 *
 * @req REQ-153
 */
export function splitSourcedProse(text: string) {
  const match = text.trim().match(/^([\s\S]{20,}?[.!?])\s+([\s\S]+)$/);
  return match
    ? { fact: match[1], detail: match[2] }
    : { fact: text.trim(), detail: null };
}
