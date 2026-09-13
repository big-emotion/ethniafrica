import type { FicheSource } from "@/types/afrik";
import type { SourceTier } from "@/types/sources";

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
 * source drops out of the list instead of taking the page down with it. The
 * old database copy may also carry a machine tier suffix after the title;
 * remove it until recette has loaded the cleaned corpus.
 */
// @req REQ-001
export function ficheSourceLabel(
  source: FicheSource | string | null | undefined
): string | null {
  const text = typeof source === "string" ? source : source?.title;
  if (typeof text !== "string") return null;

  const label = text
    .replace(/^-\s*/, "")
    .replace(/\s*[–—-]\s*\[tier \d+\]\s*$/i, "")
    .trim();
  return label.length > 0 ? label : null;
}

/** One fiche source, kept whole, with the standing its surface shows. */
export interface FicheSourceEntry {
  label: string;
  url: string | null;
  standing: SourceTier | "needs_review";
  notes?: string;
  /**
   * Its place in the fiche's bibliography, when the fiche has one.
   *
   * Optional because only a fiche carrying note callouts numbers its sources:
   * country and family declare sources and cite none of them from the prose,
   * and numbering a list nothing points at promises a link that does not
   * exist. `ficheSourceEntries` never sets it — `buildFicheSourceRegister`
   * does.
   */
  number?: number;
  /** The `sources` row this entry was matched to, when one exists. */
  sourceId?: string;
}

/**
 * Every entry `ficheSourceLabel` can read, in fiche order with malformed ones
 * dropped, structured. A legacy bare string carries no
 * standing of its own, so it reads as awaiting review rather than being
 * asserted to be unverified.
 */
// @req REQ-001
export function ficheSourceEntries(
  sources?: Array<FicheSource | string> | null
): FicheSourceEntry[] {
  if (!sources || sources.length === 0) return [];

  return sources.flatMap((source) => {
    const label = ficheSourceLabel(source);
    if (label === null) return [];

    if (typeof source === "string") {
      return [{ label, url: null, standing: "needs_review" as const }];
    }

    return [
      {
        label,
        url: source.url ?? null,
        standing: source.tier ?? ("needs_review" as const),
        ...(source.notes === undefined ? {} : { notes: source.notes }),
      },
    ];
  });
}

/**
 * Clauses the enrichment pipeline wrote into `sources[].notes` about its own
 * bookkeeping: how a tier was resolved, which domain ruling was missing, that
 * the tier awaits review. `notes` reaches the reader verbatim, and the
 * reader-facing register owes them the silence, never the workshop's reason
 * for it.
 *
 * The corpus no longer carries these notes. Keep this compatibility filter
 * until the stored fiches have been refreshed from the merged corpus; pages
 * read the database and can serve an older revision during synchronization.
 */
// @req REQ-092
export const PIPELINE_NOTE_PATTERNS: readonly RegExp[] = [
  /^Tier (?:resolved|inferred|resolu)\b/i,
  /^No URL and no recognisable citation shape\b/i,
  /^No domain ruling covers\b/i,
  /^the tier awaits editorial review\b/i,
  /^Resolved from the (?:prior|URL-less)\b/i,
];

/**
 * A source note as the reader should see it. Each `;`-separated clause in the
 * pipeline's register is dropped and the rest kept, because a curated note
 * sometimes follows the pipeline's clause with the one sentence worth
 * reading. A note with nothing dropped comes back exactly as written; a note
 * with nothing left is no note.
 */
// @req REQ-092
export function readerFacingNote(notes?: string | null): string | undefined {
  const text = notes?.trim();
  if (!text) return undefined;

  const clauses = text.split(/\s*;\s*/).filter(Boolean);
  const kept = clauses.filter(
    (clause) => !PIPELINE_NOTE_PATTERNS.some((pattern) => pattern.test(clause))
  );
  if (kept.length === clauses.length) return text;
  if (kept.length === 0) return undefined;

  const joined = kept.join("; ");
  return joined.charAt(0).toLocaleUpperCase() + joined.slice(1);
}
