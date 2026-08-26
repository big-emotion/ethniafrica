import type { FicheSource } from "@/types/afrik";

/**
 * The display text of a fiche `sources[]` entry.
 *
 * Two shapes are live at once, and will be until the AFRIK loaders re-run: the
 * corpus in `dataset/source/afrik/` now holds structured `{title, url, tier}`
 * entries, while the database still serves the fiche JSON it was loaded from,
 * where `sources` is an array of bare strings. Reading `.title` off a string
 * yields `undefined`, and the leading-dash trim that follows then throws — which
 * is how every country fiche started returning HTTP 500.
 *
 * Returns null for an entry carrying no usable text, so a single malformed
 * source drops out of the list instead of taking the page down with it.
 */
// @req REQ-001
export function ficheSourceLabel(
  source: FicheSource | string | null | undefined
): string | null {
  const text = typeof source === "string" ? source : source?.title;
  if (typeof text !== "string") return null;

  const label = text.replace(/^-\s*/, "").trim();
  return label.length > 0 ? label : null;
}

/**
 * The same entries as a single line, in fiche order, with malformed ones
 * dropped.
 */
// @req REQ-001
export function ficheSourceLine(
  sources?: Array<FicheSource | string> | null
): string {
  if (!sources || sources.length === 0) return "";
  return sources
    .map(ficheSourceLabel)
    .filter((label): label is string => label !== null)
    .join(" · ");
}
