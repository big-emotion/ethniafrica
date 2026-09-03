/** One cause, and every fiche that hit it. */
export interface DefectCause {
  cause: string;
  count: number;
  fiches: string[];
}

// Loader defects are recorded as `${ficheId}: ${message}`, and the message
// often embeds the id of the row the database refused.
const FICHE_PREFIX = /^([A-Z][A-Z0-9_]*):\s*/;
const RECORD_ID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;

/**
 * Group per-fiche defects by what actually went wrong.
 *
 * The 2026-09-03 load reported 51 appellation refusals, each naming a different
 * assertion uuid, all saying the same thing: the assertion cites no explicitly
 * tiered source. Fifty-one lines read as fifty-one problems; one line with
 * fifty-one fiche ids reads as one instruction.
 *
 * @req REQ-057
 */
export function summarizeByCause(defects: string[]): DefectCause[] {
  const byCause = new Map<string, DefectCause>();

  for (const defect of defects) {
    const ficheId = FICHE_PREFIX.exec(defect)?.[1];
    const cause = defect
      .replace(FICHE_PREFIX, "")
      .replace(RECORD_ID, "<record>");

    const existing = byCause.get(cause);
    if (existing) {
      existing.count += 1;
      if (ficheId) existing.fiches.push(ficheId);
      continue;
    }

    byCause.set(cause, {
      cause,
      count: 1,
      fiches: ficheId ? [ficheId] : [],
    });
  }

  return [...byCause.values()].sort((a, b) => b.count - a.count);
}
