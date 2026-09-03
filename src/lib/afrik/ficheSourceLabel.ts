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

/**
 * One fiche source, kept whole. `ficheSourceLine` flattens the same
 * entries to a single string, which is all the people fiche needs; a
 * surface that shows each source's standing needs the parts instead.
 */
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
 * The same entries as `ficheSourceLine`, in fiche order and with the same
 * malformed ones dropped, but structured. A legacy bare string carries no
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
