/**
 * Orphan detection for the AFRIK corpus sync.
 *
 * `migrateAfrikToDatabase` only ever upserts, so deleting a fiche from
 * dataset/source/afrik/ leaves its row in the database for good. Recette
 * carried 14 such rows for seven months — deduplicated peoples and one fiche
 * named "Khoza (Faux exonyme)" that editorial had removed on purpose — and
 * served them to readers alongside the 790 the corpus actually declares.
 *
 * The dangerous shape of an automatic prune is the inverse failure: if the
 * loader returns an empty corpus (a parse error, a bad working directory),
 * every row in the table looks orphaned and a naive prune empties the atlas.
 * So the scan reports orphans unconditionally but withholds authorisation
 * whenever the evidence is too thin to trust — and the caller must respect
 * `refusal` rather than the mere presence of `orphans`.
 */

/**
 * Above this share of the table, an "orphan" set is far likelier to be a
 * broken corpus load than seven months of editorial deletions. Recette's
 * real drift was 1.7% (14 of 804), so the cap leaves ample room for genuine
 * cleanup while stopping a wipe.
 */
export const ORPHAN_SHARE_CAP = 0.05;

export interface OrphanScanInput {
  /** The table being scanned — quoted in the refusal so a report says where it stopped. */
  table: string;
  databaseIds: readonly string[];
  /** The identifiers the corpus on disk currently declares. */
  sourceIds: readonly string[];
}

export interface OrphanScan {
  orphans: string[];
  /** Non-null when the scan declines to authorise deletion, and why. */
  refusal: string | null;
}

export function scanCorpusOrphans({
  table,
  databaseIds,
  sourceIds,
}: OrphanScanInput): OrphanScan {
  const declared = new Set(sourceIds);
  const orphans = databaseIds.filter((id) => !declared.has(id));

  return {
    orphans,
    refusal: refuse({ table, databaseIds, declared, orphans }),
  };
}

function refuse({
  table,
  databaseIds,
  declared,
  orphans,
}: {
  table: string;
  databaseIds: readonly string[];
  declared: ReadonlySet<string>;
  orphans: readonly string[];
}): string | null {
  if (orphans.length === 0) {
    return null;
  }

  if (declared.size === 0) {
    return `Refusing to prune ${table}: the corpus declared no identifier at all, which reads as a failed load rather than an empty corpus.`;
  }

  const share = orphans.length / databaseIds.length;
  if (share > ORPHAN_SHARE_CAP) {
    return `Refusing to prune ${table}: ${orphans.length} of ${
      databaseIds.length
    } rows (${(share * 100).toFixed(1)}%) have no fiche on disk, above the ${(
      ORPHAN_SHARE_CAP * 100
    ).toFixed(1)}% cap. Verify the corpus loaded before deleting anything.`;
  }

  return null;
}
