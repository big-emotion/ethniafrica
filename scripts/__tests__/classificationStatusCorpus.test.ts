/**
 * Corpus contract for the editorial `classificationStatus` field (ETNI-1359).
 *
 * The field is the machine-readable half of the decolonial claim: 19 family
 * fiches and 473 people fiches argue in prose, via `whyProblematic`, that
 * their name is an imposition, while the enum that would let a reader filter
 * or a badge render said nothing at all.
 *
 * Two invariants are asserted here rather than in the fiche loader, because
 * both are properties of the corpus as a whole and neither is visible from a
 * single file:
 *
 *   - a fiche that argues its name is problematic declares a classification;
 *   - a fiche that argues nothing declares none.
 *
 * The second matters as much as the first. `ClassificationBadge` renders
 * nothing for `consensual` *and* nothing for a missing value, so writing
 * `consensual` onto the 316 people fiches nobody has read would be
 * indistinguishable on screen from the truth while asserting a review that
 * never happened.
 */

import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AFRIK_ROOT = path.join(REPO_ROOT, "dataset", "source", "afrik");

/** The four members of `ClassificationStatus` in `src/types/afrik.ts`. */
const CLASSIFICATION_VALUES = [
  "consensual",
  "contested",
  "colonial-legacy",
  "reconstructive",
] as const;

interface CorpusFiche {
  id?: string;
  classificationStatus?: unknown;
  content?: Record<string, unknown>;
}

function readJson(file: string): CorpusFiche {
  return JSON.parse(fs.readFileSync(file, "utf8")) as CorpusFiche;
}

function jsonFilesUnder(dir: string): string[] {
  const found: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith(".json")) found.push(full);
    }
  }
  return found.sort();
}

/**
 * `whyProblematic` sits under `content.appellations` on a people fiche and
 * under `content.decolonialHeader` on a family one. Reading it positionally
 * would tie this contract to two shapes that have already moved once, so the
 * value is found by key wherever the fiche happens to put it.
 */
function findWhyProblematic(node: unknown): string | null {
  if (node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findWhyProblematic(item);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [key, value] of Object.entries(node)) {
    if (
      key === "whyProblematic" &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value;
    }
    const found = findWhyProblematic(value);
    if (found !== null) return found;
  }
  return null;
}

const familyFiles = jsonFilesUnder(
  path.join(AFRIK_ROOT, "famille_linguistique")
);
const peopleFiles = jsonFilesUnder(path.join(AFRIK_ROOT, "peuples"));

interface Row {
  file: string;
  id: string;
  status: unknown;
  arguesProblematic: boolean;
}

function rows(files: string[]): Row[] {
  return files.map((file) => {
    const fiche = readJson(file);
    return {
      file: path.relative(REPO_ROOT, file),
      id: fiche.id ?? path.basename(file, ".json"),
      status: fiche.classificationStatus,
      arguesProblematic: findWhyProblematic(fiche.content) !== null,
    };
  });
}

const families = rows(familyFiles);
const peoples = rows(peopleFiles);

describe("AFRIK strict models declare classificationStatus (ETNI-1359)", () => {
  // The curator skill forbids fields absent from the strict model, so the
  // model has to declare the field before 492 fiches may carry it.
  const models = [
    ["modele-peuple.json", "peuple"],
    ["modele-linguistique.json", "famille_linguistique"],
  ] as const;

  for (const [fileName, entity] of models) {
    // @req REQ-023
    it(`${fileName} declares a top-level classificationStatus`, () => {
      const model = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, "public", fileName), "utf8")
      ) as Record<string, unknown> & { _meta?: { entity?: string } };

      expect(model._meta?.entity).toBe(entity);
      expect(Object.keys(model)).toContain("classificationStatus");
    });

    // @req REQ-023
    it(`${fileName} documents every ClassificationStatus value`, () => {
      const model = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, "public", fileName), "utf8")
      ) as Record<string, unknown>;
      const placeholder = String(model.classificationStatus ?? "");

      for (const value of CLASSIFICATION_VALUES) {
        expect(placeholder).toContain(value);
      }
    });
  }
});

describe("classificationStatus corpus contract (ETNI-1359)", () => {
  // The loader reads `family.classificationStatus` / `people.classificationStatus`
  // at the top level (migrateAfrikToDatabase.ts:204,244). A value nested under
  // `content` would load as NULL and the badge would never appear.
  // @req REQ-023
  it("finds the corpus on disk", () => {
    expect(families.length).toBeGreaterThan(0);
    expect(peoples.length).toBeGreaterThan(0);
  });

  for (const [label, set] of [
    ["family", families],
    ["people", peoples],
  ] as const) {
    // @req REQ-023
    it(`every ${label} fiche arguing whyProblematic declares a classificationStatus`, () => {
      const missing = set
        .filter((row) => row.arguesProblematic && !row.status)
        .map((row) => row.id);

      expect(missing).toEqual([]);
    });

    // @req REQ-023
    it(`every declared ${label} classificationStatus is a known enum value`, () => {
      const invalid = set
        .filter((row) => row.status !== undefined && row.status !== null)
        .filter(
          (row) =>
            !CLASSIFICATION_VALUES.includes(
              row.status as (typeof CLASSIFICATION_VALUES)[number]
            )
        )
        .map((row) => `${row.id}=${String(row.status)}`);

      expect(invalid).toEqual([]);
    });

    // An unreviewed fiche stays absent rather than declaring `consensual`:
    // the two render identically, and only one of them is true.
    // @req REQ-023
    it(`no ${label} fiche without whyProblematic declares a classificationStatus`, () => {
      const overreaching = set
        .filter((row) => !row.arguesProblematic && row.status)
        .map((row) => `${row.id}=${String(row.status)}`);

      expect(overreaching).toEqual([]);
    });
  }
});

/**
 * The ledger is the auditable half of the pass: each fiche's assigned status
 * with the sentence of its own prose that justified it. A ledger that drifts
 * from the corpus is worse than none — it would read as a review that
 * happened while the fiches said something else — so the two are held equal
 * here rather than by anyone's diligence.
 */
describe("classification ledger agrees with the corpus (ETNI-1359)", () => {
  interface LedgerEntry {
    id: string;
    status: string;
    rationale: string;
  }

  const ledger: LedgerEntry[] = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, "docs/editorial/classification-status-ledger.json"),
      "utf8"
    )
  );
  const byId = new Map(
    rows(familyFiles.concat(peopleFiles)).map((r) => [r.id, r])
  );

  // @req REQ-023
  it("records every fiche the corpus classifies, and only those", () => {
    const classifiedInCorpus = [...byId.values()]
      .filter((row) => row.status)
      .map((row) => row.id)
      .sort();
    const inLedger = ledger.map((entry) => entry.id).sort();

    expect(inLedger).toEqual(classifiedInCorpus);
  });

  // @req REQ-023
  it("assigns each fiche the status the corpus carries", () => {
    const disagreements = ledger
      .filter((entry) => byId.get(entry.id)?.status !== entry.status)
      .map(
        (entry) =>
          `${entry.id}: ledger=${entry.status} corpus=${String(byId.get(entry.id)?.status)}`
      );

    expect(disagreements).toEqual([]);
  });

  // A decision with no stated reason is not auditable, which is the only
  // thing the ledger exists to be.
  // @req REQ-023
  it("gives every decision a rationale", () => {
    const unreasoned = ledger
      .filter((entry) => (entry.rationale ?? "").trim().length < 20)
      .map((entry) => entry.id);

    expect(unreasoned).toEqual([]);
  });
});
