/**
 * Parser for the match excerpt `/api/v2/search` returns.
 *
 * Postgres `ts_headline` wraps matched terms in delimiters of our choosing.
 * We ask it for `[[` / `]]` rather than its default `<b>` / `</b>` so that no
 * string in the pipeline ever *looks* like markup — there is then nothing to
 * be tempted to inject, and the safety of the excerpt is a property of the
 * shape rather than a discipline someone has to remember.
 *
 * This parser only ever emits strings, which React escapes on render, so no
 * code path from a fiche's text to the DOM can carry markup.
 */

const START = "[[";
const STOP = "]]";

export interface HighlightSegment {
  text: string;
  marked: boolean;
}

// @req REQ-002
export function parseHighlightedSnippet(snippet: string): HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < snippet.length) {
    const start = snippet.indexOf(START, cursor);
    if (start === -1) break;

    // An unbalanced opener means the excerpt was truncated mid-delimiter;
    // the remainder is shown verbatim rather than silently swallowed.
    const stop = snippet.indexOf(STOP, start + START.length);
    if (stop === -1) break;

    if (start > cursor) {
      segments.push({ text: snippet.slice(cursor, start), marked: false });
    }
    segments.push({
      text: snippet.slice(start + START.length, stop),
      marked: true,
    });
    cursor = stop + STOP.length;
  }

  if (cursor < snippet.length) {
    segments.push({ text: snippet.slice(cursor), marked: false });
  }

  return segments.filter((segment) => segment.text.length > 0);
}
