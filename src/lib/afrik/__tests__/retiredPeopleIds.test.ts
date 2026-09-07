import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import { RETIRED_PEOPLE_IDS } from "../retiredPeopleIds";

const AFRIK_ROOT = join(process.cwd(), "dataset", "source", "afrik");

interface LedgerEntry {
  decision: "merged" | "renamed" | "kept-distinct";
  retiredId: string;
  successorId: string | null;
}

function readLedger(): LedgerEntry[] {
  return JSON.parse(
    readFileSync(join(AFRIK_ROOT, "_retired-identifiers.json"), "utf8")
  ) as LedgerEntry[];
}

function ficheExists(peopleId: string): boolean {
  const peuples = join(AFRIK_ROOT, "peuples");
  return readdirSync(peuples, { withFileTypes: true }).some(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(peuples, entry.name, `${peopleId}.json`))
  );
}

describe("RETIRED_PEOPLE_IDS", () => {
  // The redirect map and the editorial ledger must never disagree: a decision
  // recorded in one and not the other is a URL that 404s or a ghost redirect.
  // @req REQ-027
  it("mirrors every merged and renamed entry of the retired-identifiers ledger", () => {
    const expected = Object.fromEntries(
      readLedger()
        .filter((entry) => entry.decision !== "kept-distinct")
        .map((entry) => [entry.retiredId, entry.successorId])
    );

    expect(RETIRED_PEOPLE_IDS).toEqual(expected);
  });

  // @req REQ-027
  it("lands every retired id in one hop on a living fiche", () => {
    for (const [retiredId, successorId] of Object.entries(RETIRED_PEOPLE_IDS)) {
      expect(RETIRED_PEOPLE_IDS[successorId], successorId).toBeUndefined();
      expect(ficheExists(successorId), successorId).toBe(true);
      expect(ficheExists(retiredId), retiredId).toBe(false);
    }
  });
});
