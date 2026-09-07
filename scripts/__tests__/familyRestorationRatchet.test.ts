import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  LEDGER_DIR,
  diffFamily,
  familyIds,
  type FamilyRestorationLedger,
} from "../afrik/diffFamilyArchive";

const REPO_ROOT = path.join(__dirname, "../..");

function ledgers(): FamilyRestorationLedger[] {
  const dir = path.join(REPO_ROOT, LEDGER_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map(
      (file) =>
        JSON.parse(
          readFileSync(path.join(dir, file), "utf8")
        ) as FamilyRestorationLedger
    );
}

describe("family restoration ratchet", () => {
  /**
   * The gate. A family that has been restored records the number of archive
   * anchors it still does not carry; drifting back above that number fails.
   * Families nobody has started have no ledger and nothing to fail — the
   * directory holds work in progress, not twenty-four identical complaints.
   */
  // @req REQ-148
  it("keeps every recorded family at or below its own anchor budget", () => {
    const recorded = ledgers();
    expect(recorded.length).toBeGreaterThan(0);
    for (const ledger of recorded) {
      const { diff } = diffFamily(REPO_ROOT, ledger.familyId);
      expect(
        diff.totalMissingAnchors,
        `${ledger.familyId}: lower anchorBudget to ${diff.totalMissingAnchors} in the change that restored it`
      ).toBeLessThanOrEqual(ledger.anchorBudget);
    }
  });

  // @req REQ-148
  it("names a family that actually exists in both the archive and the corpus", () => {
    const known = new Set(familyIds(REPO_ROOT));
    for (const ledger of ledgers()) {
      expect(known.has(ledger.familyId), ledger.familyId).toBe(true);
    }
  });

  /**
   * FLG_BERBERE was the only fiche in the corpus with two empty sections, and
   * the section that had gone was the one carrying the competing theories of
   * Berber origins. Nothing else in the corpus states that debate.
   */
  // @req REQ-148
  it("keeps the restored Berber sections filled and their debate exposed", () => {
    const fiche = JSON.parse(
      readFileSync(
        path.join(
          REPO_ROOT,
          "dataset/source/afrik/famille_linguistique/FLG_BERBERE.json"
        ),
        "utf8"
      )
    ) as { content: Record<string, Record<string, string>> };

    expect(Object.keys(fiche.content.historyAndOrigins).length).toBeGreaterThan(
      0
    );
    expect(
      Object.keys(fiche.content.linguisticCharacteristics).length
    ).toBeGreaterThan(0);

    const origin = fiche.content.historyAndOrigins.probableOrigin;
    // The three competing theories, each named.
    expect(origin).toMatch(/Camps/);
    expect(origin).toMatch(/Ehret/);
    expect(origin).toMatch(/Diop/);
    // And the reason it is a debate rather than a verdict.
    expect(origin).toMatch(/divergence avec le consensus|n'est pas confirmée/);
  });
});
