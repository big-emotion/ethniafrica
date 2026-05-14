import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "../clients/supabase-admin";

export type FicheType = "people" | "country" | "family";

export type SeededFiche = {
  ficheId: string;
  ficheType: FicheType;
  latestVersion: number;
  pinnedUrls: string[];
  cleanup: () => Promise<void>;
};

export type SeedFicheOptions = {
  ficheType: FicheType;
  // Number of revisions to create. revisions=1 means a fresh fiche with one
  // published snapshot; revisions=3 yields @v1, @v2, @v3 plus current.
  revisions: number;
  // Namespaces all entity IDs to keep parallel workers from colliding (R-9).
  testRunId: string;
};

// ASR-6: fiche-revision seeding factory.
// Stub until the per-assertion data model (R-2, ASR-4) and the
// fiche_revisions table land. Once they do, this factory inserts:
//   - one row in afrik_{peoples|pays|familles_linguistiques}
//   - N rows in fiche_revisions with byte-deterministic content_snapshot JSONB
//   - returns pinned URLs in /fr/peuples/PPL_TEST_*@vN form
export async function seedFiche(opts: SeedFicheOptions): Promise<SeededFiche> {
  if (opts.revisions < 1) {
    throw new Error("seedFiche: revisions must be ≥ 1");
  }
  // Touch the admin client so missing env surfaces in setup, not deep in a test.
  getSupabaseAdmin();
  const slugSuffix = `${opts.testRunId.slice(0, 8)}_${randomUUID().slice(0, 4)}`;
  const prefix =
    opts.ficheType === "people"
      ? "PPL_TEST_"
      : opts.ficheType === "family"
        ? "FLG_TEST_"
        : "TEST_";
  const ficheId = `${prefix}${slugSuffix}`;
  throw new Error(
    `seedFiche(${opts.ficheType}, revisions=${opts.revisions}) not implemented. ` +
      "Depends on fiche_revisions table (Phase 1 schema work). Would seed fiche " +
      `id=${ficheId}. See TEA test design ASR-6.`
  );
}
