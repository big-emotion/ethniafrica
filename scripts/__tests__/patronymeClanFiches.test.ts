import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePatronymeFile } from "../../src/lib/afrik/parsers/patronymeParser";

const EXPECTED = [
  ["PAT_TRAORE", "Traore", "PPL_BAMBARA", "patrilineal"],
  ["PAT_COULIBALY", "Coulibaly", "PPL_BAMBARA", "patrilineal"],
  ["PAT_KEITA", "Keïta", "PPL_MALINKE", "patrilineal"],
  ["PAT_DIALLO", "Diallo", "PPL_FULA_FORET", "patrilineal"],
  ["PAT_BAMBA_CLAN", "Bamba", "PPL_DIOULA", "other"],
  ["PAT_CAMARA", "Camara", "PPL_VAI", "other"],
  ["PAT_KOUYATE", "Kouyate", "PPL_DIOULA", "other"],
  ["PAT_DIARRA", "Diarra", "PPL_BAMBARA", "patrilineal"],
  ["PAT_DIABATE", "Diabate", "PPL_DAFING", "patrilineal"],
  ["PAT_FOFANA", "Fofana", "PPL_DIOULA", "other"],
  ["PAT_DOUMBIA", "Doumbia", "PPL_DIOULA", "other"],
  ["PAT_SOW", "Sow", "PPL_WOLOF", "patrilineal"],
  ["PAT_DUBE", "Dube", "PPL_NDAU_MOZ", "patrilineal"],
  ["PAT_MTHETHWA", "Mthethwa", "PPL_NDEBELE_NORD", "other"],
  ["PAT_NDLOVU", "Ndlovu", "PPL_NDEBELE_NORD", "other"],
  ["PAT_NXUMALO", "Nxumalo", "PPL_NDEBELE_NORD", "other"],
  ["PAT_SIBANDA", "Sibanda", "PPL_NDEBELE_NORD", "other"],
  ["PAT_DLAMINI_CLAN", "Dlamini", "PPL_SWAZI", "patrilineal"],
] as const;

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

describe("ETNI-1684 first clan-name dossiers", () => {
  // @req REQ-133
  // @req REQ-134
  it("publishes the selected clan-name fiches as conservative sourced dossiers", () => {
    const manifest = readJson("dataset/source/afrik/patronymes/_manifest.json");
    const manifestById = new Map(
      manifest.entries.map((entry: { id: string }) => [entry.id, entry])
    );

    for (const [id, name, peopleId, transmissionMode] of EXPECTED) {
      const raw = readJson(`dataset/source/afrik/patronymes/${id}.json`);
      const parsed = parsePatronymeFile(raw);
      const manifestEntry = manifestById.get(id) as {
        familyEvidence: { file: string };
      };
      const sourcePeople = readJson(manifestEntry.familyEvidence.file);

      expect(parsed.success, `${id}: ${JSON.stringify(parsed.errors)}`).toBe(
        true
      );
      expect(raw).toMatchObject({
        id,
        nameMain: name,
        nameSystem: "clan_name",
        transmissionMode,
        designatedSocialUnit: "clan",
        peoples: [{ peopleId, status: "attested" }],
      });
      expect(
        raw.spellings.map(({ spelling }: { spelling: string }) => spelling)
      ).toContain(name);
      expect(
        raw.countries.map(({ countryId }: { countryId: string }) => countryId)
      ).toEqual(sourcePeople.currentCountries);
      expect(raw.sources).toHaveLength(1);
      expect(raw.sources[0]).toMatchObject({
        tier: "unverified",
        source_kind: "repository",
      });
      expect(raw.sources[0].notes).toContain("revue claim-level");
      expect(raw.origin).toEqual({
        oralTraditions: [],
        writtenChronicles: [],
        linguisticReconstructions: [],
      });
      expect(raw.alliances).toEqual([]);
      expect(raw.casteOrSocialFunction).toBeNull();
      expect(raw.bearers).toEqual([]);
      expect(raw.homonyms).toEqual([]);
      const gapPaths = raw.gaps.map(
        ({ fieldPath }: { fieldPath: string }) => fieldPath
      );
      expect(gapPaths).toEqual([
        ...(transmissionMode === "other" ? ["transmissionMode"] : []),
        "origin",
        "alliances",
        "casteOrSocialFunction",
        "bearers",
        "homonyms",
      ]);
    }
  });
});
