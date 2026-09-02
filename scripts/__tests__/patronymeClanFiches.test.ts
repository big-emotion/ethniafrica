import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePatronymeFile } from "../../src/lib/afrik/parsers/patronymeParser";

const EXPECTED = [
  ["PAT_TRAORE", "Traore", "PPL_BAMBARA", "patrilineal"],
  ["PAT_COULIBALY", "Coulibaly", "PPL_BAMBARA", "patrilineal"],
  ["PAT_KEITA", "Keïta", "PPL_MALINKE", "patrilineal"],
  ["PAT_DIALLO", "Diallo", "PPL_FULA_FORET", "patrilineal"],
  ["PAT_BAMBA_CLAN", "Bamba", "PPL_DIOULA", "patrilineal"],
  ["PAT_CAMARA", "Camara", "PPL_VAI", "patrilineal"],
  ["PAT_KOUYATE", "Kouyate", "PPL_DIOULA", "patrilineal"],
  ["PAT_DIARRA", "Diarra", "PPL_BAMBARA", "patrilineal"],
  ["PAT_DIABATE", "Diabate", "PPL_DAFING", "patrilineal"],
  ["PAT_FOFANA", "Fofana", "PPL_DIOULA", "patrilineal"],
  ["PAT_DOUMBIA", "Doumbia", "PPL_DIOULA", "patrilineal"],
  ["PAT_SOW", "Sow", "PPL_WOLOF", "patrilineal"],
  ["PAT_DUBE", "Dube", "PPL_NDAU_MOZ", "patrilineal"],
  ["PAT_MTHETHWA", "Mthethwa", "PPL_NDEBELE_NORD", "patrilineal"],
  ["PAT_NDLOVU", "Ndlovu", "PPL_NDEBELE_NORD", "patrilineal"],
  ["PAT_NXUMALO", "Nxumalo", "PPL_NDEBELE_NORD", "patrilineal"],
  ["PAT_SIBANDA", "Sibanda", "PPL_NDEBELE_NORD", "patrilineal"],
  ["PAT_DLAMINI_CLAN", "Dlamini", "PPL_SWAZI", "patrilineal"],
] as const;

interface Source {
  sourceKey: string;
  tier: string;
  source_kind?: string;
  notes?: string;
}

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

describe("ETNI-1684 first clan-name dossiers", () => {
  // @req REQ-133
  // @req REQ-134
  it("publishes the clan-name fiches with tiered sources and gaps matching their empty fields", () => {
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
      // Where the people lives now is a floor, not a ceiling. A name can be
      // attested where the people no longer is — Bluett records Jallo in the
      // Bundu in 1734 — so research may add a country, provided it brings a
      // source, but may never drop one the people fiche carries.
      const ficheCountries = raw.countries.map(
        ({ countryId }: { countryId: string }) => countryId
      );
      expect(ficheCountries, `${id}: countries`).toEqual(
        expect.arrayContaining(sourcePeople.currentCountries)
      );
      for (const country of raw.countries as Array<{
        countryId: string;
        sourceRefs: string[];
      }>) {
        expect(
          country.sourceRefs,
          `${id}/${country.countryId}: country sources`
        ).not.toHaveLength(0);
      }
      // The corpus passage the selection pass rested on is never dropped, and
      // never silently promoted: the research pass adds sources beside it.
      const corpusSource = raw.sources.find(({ sourceKey }: Source) =>
        sourceKey.startsWith("corpus-")
      );
      expect(corpusSource, `${id}: corpus passage source`).toMatchObject({
        tier: "unverified",
        source_kind: "repository",
      });
      expect(corpusSource.notes).toContain("revue claim-level");

      for (const source of raw.sources as Source[]) {
        expect(
          ["official", "referenced", "unverified"],
          `${id}/${source.sourceKey}`
        ).toContain(source.tier);
      }

      // Every declared source is cited and every citation resolves — the two
      // halves of the same invariant, which is what keeps a fiche's advertised
      // provenance equal to the provenance it actually uses.
      const cited = new Set(
        JSON.stringify(raw)
          .match(/"sourceRefs":\[[^\]]*\]/g)
          ?.flatMap((block) => block.match(/"([^"[\]]+)"/g) ?? [])
          .map((quoted) => quoted.slice(1, -1))
          .filter((token) => token !== "sourceRefs") ?? []
      );
      const declared = new Set(
        (raw.sources as Source[]).map(({ sourceKey }) => sourceKey)
      );
      expect([...cited].sort(), `${id}: citations resolve`).toEqual(
        [...declared].sort()
      );

      // A gap is declared for an empty field and for nothing else.
      const gapPaths = (raw.gaps as Array<{ fieldPath: string }>).map(
        ({ fieldPath }) => fieldPath
      );
      const emptyFields = [
        raw.origin.oralTraditions.length === 0 &&
        raw.origin.writtenChronicles.length === 0 &&
        raw.origin.linguisticReconstructions.length === 0
          ? "origin"
          : null,
        raw.alliances.length === 0 ? "alliances" : null,
        raw.casteOrSocialFunction === null ? "casteOrSocialFunction" : null,
        raw.bearers.length === 0 ? "bearers" : null,
        raw.homonyms.length === 0 ? "homonyms" : null,
      ].filter(Boolean);
      expect(gapPaths.sort(), `${id}: gaps match empty fields`).toEqual(
        (emptyFields as string[]).sort()
      );
      for (const gap of raw.gaps as Array<{ reason: string }>) {
        expect(gap.reason.length, `${id}: gap reason`).toBeGreaterThan(30);
      }
    }
  });
});
