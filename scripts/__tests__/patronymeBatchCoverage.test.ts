import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAllPatronymeDossiers } from "../../src/lib/afrik/loaders/patronymeJsonLoader";
import { checkPatronymeFicheModel } from "../validateAfrikData";

const MANIFEST_PATH = resolve(
  process.cwd(),
  "dataset/source/afrik/patronymes/_manifest.json"
);
const CANONICAL_NAME_SYSTEMS = [
  "clan_name",
  "non_hereditary_patronymic",
  "nisba",
  "praise_name",
  "totemic_clan",
] as const;
const ENTRY_KEYS = [
  "corpusPassages",
  "editorialNotes",
  "externalSelectionSources",
  "familyEvidence",
  "id",
  "name",
  "nameSystem",
  "primaryLinguisticFamilyId",
  "reviewStatus",
  "selectionBasis",
].sort();
const PASSAGE_KEYS = [
  "excerpt",
  "fieldPath",
  "file",
  "inheritedTier",
  "linguisticFamilyId",
  "sourceFicheId",
  "sourceReviewStatus",
  "tierResolution",
].sort();
const EXTERNAL_SOURCE_KEYS = [
  "accessedAt",
  "organization",
  "sourceType",
  "supports",
  "title",
  "url",
].sort();

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function readCorpusJson(file: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8"));
}

function valueAtPath(value: unknown, fieldPath: string): unknown {
  const parts = Array.from(fieldPath.match(/[^.[\]]+/g) ?? []);
  return parts.reduce<unknown>((current, part) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);
}

describe("ETNI-1680 patronyme batch selection manifest", () => {
  // @req REQ-133
  // @req REQ-134
  it("selects exactly 30 unique stable PAT_* entries", () => {
    const manifest = readManifest();
    const ids = manifest.entries.map((entry: { id: string }) => entry.id);
    const names = manifest.entries.map((entry: { name: string }) => entry.name);

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.ticket).toBe("ETNI-1461");
    expect(manifest.selectionSubtask).toBe("ETNI-1680");
    expect(manifest.reviewStatus).toBe("selection_review_required");
    expect(manifest.entries).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(names.every((name: string) => name.trim().length > 0)).toBe(true);
    expect(ids.every((id: string) => /^PAT_[A-Z0-9_]+$/.test(id))).toBe(true);
  });

  // @req REQ-133
  // @req REQ-134
  it("covers every canonical name system at least twice", () => {
    const manifest = readManifest();
    const counts = Object.fromEntries(
      CANONICAL_NAME_SYSTEMS.map((nameSystem) => [
        nameSystem,
        manifest.entries.filter(
          (entry: { nameSystem: string }) => entry.nameSystem === nameSystem
        ).length,
      ])
    );

    expect(
      new Set(
        manifest.entries.map(
          (entry: { nameSystem: string }) => entry.nameSystem
        )
      )
    ).toEqual(new Set(CANONICAL_NAME_SYSTEMS));
    expect(counts).toMatchObject({
      clan_name: 18,
      non_hereditary_patronymic: 4,
      nisba: 2,
      praise_name: 2,
      totemic_clan: 4,
    });
    expect(Object.values(counts).every((count) => count >= 2)).toBe(true);
  });

  // @req REQ-133
  // @req REQ-134
  it("keeps every linguistic family at or below half of the batch", () => {
    const manifest = readManifest();
    const counts = manifest.entries.reduce(
      (
        byFamily: Record<string, number>,
        entry: { primaryLinguisticFamilyId: string }
      ) => {
        byFamily[entry.primaryLinguisticFamilyId] =
          (byFamily[entry.primaryLinguisticFamilyId] ?? 0) + 1;
        return byFamily;
      },
      {}
    );

    expect(
      Math.max(...(Object.values(counts) as number[]))
    ).toBeLessThanOrEqual(15);
    expect(manifest.familyCounts).toEqual(counts);
  });

  // @req REQ-133
  // @req REQ-134
  it("records exact corpus passages or direct external selection provenance", () => {
    const manifest = readManifest();

    for (const entry of manifest.entries) {
      expect(Object.keys(entry).sort()).toEqual(ENTRY_KEYS);
      expect(entry.reviewStatus).toBe("selected_pending_fiche_research");

      const familyFiche = readCorpusJson(entry.familyEvidence.file);
      expect(entry.familyEvidence).toEqual({
        file: entry.familyEvidence.file,
        sourceFicheId: familyFiche.id,
        linguisticFamilyId: familyFiche.languageFamilyId,
      });
      expect(entry.primaryLinguisticFamilyId).toBe(
        familyFiche.languageFamilyId
      );

      if (entry.selectionBasis === "corpus") {
        expect(entry.corpusPassages.length).toBeGreaterThan(0);
        expect(entry.externalSelectionSources).toEqual([]);

        for (const passage of entry.corpusPassages) {
          expect(Object.keys(passage).sort()).toEqual(PASSAGE_KEYS);
          expect(existsSync(resolve(process.cwd(), passage.file))).toBe(true);
          const sourceFiche = readCorpusJson(passage.file);
          expect(sourceFiche.id).toBe(passage.sourceFicheId);
          expect(sourceFiche.languageFamilyId).toBe(passage.linguisticFamilyId);
          expect(valueAtPath(sourceFiche, passage.fieldPath)).toBe(
            passage.excerpt
          );
          expect(passage.inheritedTier).toBeNull();
          expect(passage.tierResolution).toBe("review_required");
          expect(passage.sourceReviewStatus).toBe("unreviewed");
        }
      } else {
        expect(entry.selectionBasis).toBe("external_academic_or_institutional");
        expect(entry.corpusPassages).toEqual([]);
        expect(entry.externalSelectionSources.length).toBeGreaterThan(0);

        for (const source of entry.externalSelectionSources) {
          expect(Object.keys(source).sort()).toEqual(EXTERNAL_SOURCE_KEYS);
          expect(source.accessedAt).toBe("2026-09-01");
          expect(["academic", "institutional"]).toContain(source.sourceType);
          expect(source.url).toMatch(/^https:\/\//);
          expect(source.url).not.toMatch(/wikipedia\.org/i);
        }
      }
    }
  });

  // @req REQ-133
  // @req REQ-134
  it("preserves exact spellings, distinct homonyms, and current Songhay coverage", () => {
    const manifest = readManifest();
    const byId = new Map<string, { name: string; nameSystem: string }>(
      manifest.entries.map(
        (entry: { id: string; name: string; nameSystem: string }) => [
          entry.id,
          entry,
        ]
      )
    );

    expect(byId.get("PAT_TRAORE")?.name).toBe("Traore");
    expect(byId.get("PAT_KEITA")?.name).toBe("Keïta");
    expect(byId.get("PAT_DLAMINI_CLAN")?.nameSystem).toBe("clan_name");
    expect(byId.get("PAT_ABIKAN_PRAISE")?.nameSystem).toBe("praise_name");
    expect(manifest.coverageCorrections).toEqual([
      {
        staleClaim: "FLG_SONGHAY has zero extracted clan-name candidates",
        currentFinding: ["Kurtey", "Taguru"],
        evidence: manifest.coverageCorrections[0].evidence,
      },
    ]);

    for (const evidence of manifest.coverageCorrections[0].evidence) {
      expect(Object.keys(evidence).sort()).toEqual(
        ["excerpt", "fieldPath", "file", "name"].sort()
      );
      expect(
        valueAtPath(readCorpusJson(evidence.file), evidence.fieldPath)
      ).toBe(evidence.excerpt);
      expect(evidence.excerpt).toContain(evidence.name);
    }
  });

  // @req REQ-133
  // @req REQ-134
  it("keeps the non-fiche manifest outside PAT_* discovery and validation", () => {
    const datasetRoot = mkdtempSync(join(tmpdir(), "etni-1680-manifest-"));
    const patronymeRoot = join(datasetRoot, "patronymes");

    try {
      mkdirSync(patronymeRoot, { recursive: true });
      writeFileSync(
        join(datasetRoot, "patronymes", "_manifest.json"),
        JSON.stringify({ schemaVersion: 1, entries: [] }),
        { flag: "wx" }
      );

      expect(loadAllPatronymeDossiers(datasetRoot)).toEqual({
        dossiers: [],
        errors: [],
      });
      expect(checkPatronymeFicheModel(datasetRoot)).toEqual({
        ok: true,
        errors: [],
        warnings: [],
      });
    } finally {
      if (existsSync(patronymeRoot)) {
        rmSync(datasetRoot, { recursive: true, force: true });
      }
    }
  });
});
