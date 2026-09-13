/**
 * Cutting corpus prose for a tile: a lead a reader decides on, and the rest
 * behind the disclosure.
 *
 * The split waits for twenty characters before it accepts a terminator, so an
 * abbreviation near the start ("S. M. le roi…") does not end the lead. It is
 * the rule the culture tiles already used, moved here so the chronology and
 * the culture chapter cannot drift into two splitting rules.
 */
// @req REQ-153
export function splitLeadSentence(text: string): {
  lead: string;
  rest: string | null;
} {
  const trimmed = text.trim();
  const match = trimmed.match(/^([\s\S]{20,}?[.!?])\s+([\s\S]+)$/);
  return match
    ? { lead: match[1], rest: match[2] }
    : { lead: trimmed, rest: null };
}

/** The sentences of a paragraph, for comparing two fields that overlap. */
// @req REQ-154
export function sentencesOf(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * Two sentences are the same when they differ only in case, spacing or the
 * kind of quotation mark — the corpus writes « », " " and “ ” for one quote.
 */
// @req REQ-154
export function sameSentence(left: string, right: string): boolean {
  const normalise = (value: string) =>
    value
      .replace(/[«»“”"]/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase();
  return normalise(left) === normalise(right);
}
