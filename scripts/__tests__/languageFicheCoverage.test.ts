// @req REQ-136
import { readFileSync, readdirSync } from "fs";
import { basename, join } from "path";
import { describe, expect, it } from "vitest";

const DATASET_ROOT = join(__dirname, "../../dataset/source/afrik");
const LANGUAGE_ROOT = join(DATASET_ROOT, "langues");
const FAMILY_ROOT = join(DATASET_ROOT, "famille_linguistique");
const MODEL_PATH = join(__dirname, "../../public/modele-langue.json");

const EXPECTED_LANGUAGE_BY_FAMILY = {
  FLG_AFROASIATIQUE: "egy",
  FLG_ATLANTIQUE: "wol",
  FLG_AUSTRONESIENNE: "plt",
  FLG_BANTU: "lin",
  FLG_BENOUECONGO: "yor",
  FLG_BERBERE: "kab",
  FLG_COUCHITIQUE: "som",
  FLG_CREOLE: "kea",
  FLG_GUR: "mos",
  FLG_KHOE: "naq",
  FLG_KHOISAN: "hts",
  FLG_KROU: "grb",
  FLG_KXA: "ktz",
  FLG_MANDE: "bam",
  FLG_NIGERCONGO: "swh",
  FLG_NILOSAHARIENNE: "wti",
  FLG_NILOTIQUE: "din",
  FLG_OMOTIQUE: "wal",
  FLG_SAHARIEN: "tuq",
  FLG_SEMITIQUE: "arb",
  FLG_SONGHAY: "dje",
  FLG_SOUDANIQUECENTRAL: "bmi",
  FLG_TCHADIQUE: "hau",
  FLG_TUU: "ngh",
} as const;

type LanguageFiche = {
  id: string;
  isoCode639_3: string;
  glottocode: string;
  familyId: string;
  content: {
    sources: Array<{ tier?: string; url?: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function languageFiles(): string[] {
  return readdirSync(LANGUAGE_ROOT)
    .filter((file) => file.endsWith(".json"))
    .sort();
}

function loadLanguage(file: string): LanguageFiche {
  return JSON.parse(
    readFileSync(join(LANGUAGE_ROOT, file), "utf8")
  ) as LanguageFiche;
}

describe("language fiche coverage (ETNI-1508)", () => {
  // @req REQ-136
  it("maps every one of the 24 linguistic families to its selected first ISO 639-3 fiche", () => {
    const expectedCodes = Object.values(EXPECTED_LANGUAGE_BY_FAMILY).sort();
    const files = languageFiles();
    const fiches = files.map(loadLanguage);
    const fichesById = new Map(fiches.map((fiche) => [fiche.id, fiche]));

    expect(Object.keys(EXPECTED_LANGUAGE_BY_FAMILY)).toHaveLength(24);
    expect(new Set(expectedCodes).size).toBe(24);
    expect(files.map((file) => basename(file, ".json"))).toEqual(
      expect.arrayContaining(expectedCodes)
    );

    const actualMapping = Object.fromEntries(
      Object.entries(EXPECTED_LANGUAGE_BY_FAMILY).map(
        ([familyId, languageId]) => [
          fichesById.get(languageId)?.familyId,
          languageId,
        ]
      )
    );
    expect(actualMapping).toEqual(EXPECTED_LANGUAGE_BY_FAMILY);

    for (const code of expectedCodes) {
      const fiche = fichesById.get(code);
      expect(fiche).toBeDefined();
      expect(fiche.isoCode639_3).toBe(fiche.id);
    }
  });

  // @req REQ-136
  it("covers exactly the family IDs represented by the strict family fiches", () => {
    const familyIds = readdirSync(FAMILY_ROOT)
      .filter((file) => /^FLG_.+\.json$/.test(file))
      .map((file) => basename(file, ".json"))
      .sort();

    expect(Object.keys(EXPECTED_LANGUAGE_BY_FAMILY).sort()).toEqual(familyIds);
  });

  // @req REQ-136
  it("keeps every fiche aligned with modele-langue.json and explicitly tiers its sources", () => {
    const model = JSON.parse(readFileSync(MODEL_PATH, "utf8")) as {
      content: Record<string, unknown>;
      [key: string]: unknown;
    };
    const topKeys = Object.keys(model)
      .filter((key) => key !== "_meta")
      .sort();
    const contentKeys = Object.keys(model.content).sort();
    const firstBatchCodes = new Set<string>(
      Object.values(EXPECTED_LANGUAGE_BY_FAMILY)
    );
    const validTiers = new Set(["official", "referenced", "unverified"]);

    for (const file of languageFiles()) {
      const fiche = loadLanguage(file);

      expect(
        Object.keys(fiche)
          .filter((key) => key !== "_meta")
          .sort(),
        `${file} top-level keys`
      ).toEqual(topKeys);
      expect(Object.keys(fiche.content).sort(), `${file} content keys`).toEqual(
        contentKeys
      );
      expect(fiche.content.sources.length, `${file} sources`).toBeGreaterThan(
        0
      );

      for (const source of fiche.content.sources) {
        expect(validTiers.has(source.tier ?? ""), `${file} source tier`).toBe(
          true
        );
      }

      if (firstBatchCodes.has(fiche.id)) {
        expect(
          fiche.content.sources.some(
            (source) =>
              source.tier === "official" &&
              source.url ===
                `https://glottolog.org/resource/languoid/id/${fiche.glottocode}`
          ),
          `${file} direct official Glottolog source`
        ).toBe(true);
      }
    }
  });
});
