import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePatronymeFile } from "@/lib/afrik/parsers/patronymeParser";

import { recordLeaves } from "../modelLeafPaths";
import {
  CLASS_EXCEPTIONS,
  classOf,
  coverageGaps,
  GLOSSED_INVARIANT_PATHS,
  glossedInvariantName,
  modelLeaves,
  PARSER_ONLY_LEAVES,
  STRICT_MODEL_FILES,
  TRANSLATION_CLASSES,
  type StrictModelFile,
} from "../translationClasses";

const PUBLIC_ROOT = join(__dirname, "../../../../public");

function readModel(file: StrictModelFile): unknown {
  return JSON.parse(readFileSync(join(PUBLIC_ROOT, file), "utf-8"));
}

describe("the sixteen strict models", () => {
  // @req REQ-143
  it("are exactly the files public/modele-*.json holds", () => {
    const onDisk = readdirSync(PUBLIC_ROOT)
      .filter((name) => /^modele-.*\.json$/.test(name))
      .sort();
    expect(onDisk).toEqual([...STRICT_MODEL_FILES].sort());
    expect(STRICT_MODEL_FILES).toHaveLength(16);
  });

  // @req REQ-143
  it("have every leaf declared and no declaration pointing at a leaf that is gone", () => {
    for (const model of STRICT_MODEL_FILES) {
      expect(coverageGaps(model, readModel(model)), model).toEqual({
        undeclared: [],
        dead: [],
      });
    }
  });

  // @req REQ-143
  it("fails coverage on a field the model gained and the declaration did not", () => {
    const grown = readModel("modele-peuple.json") as Record<string, unknown>;
    (grown.content as Record<string, unknown>).newChapter = "<prose>";
    expect(coverageGaps("modele-peuple.json", grown).undeclared).toEqual([
      "content.newChapter",
    ]);
  });

  // @req REQ-143
  it("fails coverage on a declaration whose leaf left the model", () => {
    const shrunk = readModel("modele-relation.json") as Record<string, unknown>;
    delete shrunk.description;
    expect(coverageGaps("modele-relation.json", shrunk).dead).toEqual([
      "description",
    ]);
  });
});

describe("class doctrine", () => {
  // @req REQ-143
  it("carries names, identifiers and citations over verbatim (class 1)", () => {
    const invariants: Array<[StrictModelFile, string]> = [
      ["modele-peuple.json", "nameMain"],
      ["modele-peuple.json", "content.appellations.selfAppellation"],
      ["modele-peuple.json", "content.appellations.exonyms[]"],
      ["modele-peuple.json", "content.appellations.spellingAliases[]"],
      ["modele-peuple.json", "content.sources[].title"],
      ["modele-peuple.json", "content.sources[].url"],
      ["modele-peuple.json", "content.sources[].tier"],
      ["modele-peuple.json", "content.languages.isoCodes[]"],
      ["modele-peuple.json", "content.demography.totalPopulation"],
      ["modele-pays.json", "nameFr"],
      ["modele-pays.json", "content.majorPeoples[].exonyms[]"],
      ["modele-linguistique.json", "nameEn"],
      ["modele-linguistique.json", "content.decolonialHeader.selfAppellation"],
      ["modele-langue.json", "alternateNames[]"],
      ["modele-nom.json", "names[].nameText"],
      ["modele-nom.json", "names[].sources[].author"],
      ["modele-nom-patronyme.json", "sources[].sourceKey"],
      ["modele-nom-patronyme.json", "spellings[].spelling"],
      ["modele-relation.json", "peopleIdA"],
      ["modele-migration.json", "eventType"],
      ["modele-media.json", "licence.uri"],
      ["modele-recit-oral.json", "attribution.displayName"],
      ["modele-source.json", "source.title"],
      ["modele-frontiere-coloniale.json", "colonial_powers[]"],
    ];
    for (const [model, path] of invariants) {
      expect(classOf(model, path), `${model}:${path}`).toBe("invariant");
    }
  });

  // @req REQ-143
  it("hands narrative prose to translation (class 2)", () => {
    const prose: Array<[StrictModelFile, string]> = [
      ["modele-peuple.json", "content.origins.ancientOrigins"],
      ["modele-peuple.json", "content.organization.clanOrganization"],
      ["modele-peuple.json", "content.culture.majorRites"],
      ["modele-peuple.json", "content.historicalRole.diaspora"],
      ["modele-peuple.json", "content.demography.distributionByCountry[].note"],
      ["modele-peuple.json", "content.sources[].notes"],
      ["modele-pays.json", "summary"],
      ["modele-pays.json", "content.historicalFacts.colonization"],
      ["modele-migration.json", "content.narrative"],
      ["modele-migration.json", "nameMain"],
      ["modele-relation.json", "description"],
      ["modele-nom-patronyme.json", "gaps[].reason"],
      ["modele-nom-patronyme.json", "origin.oralTraditions[].claim"],
      ["modele-frontiere-coloniale.json", "title_fr"],
    ];
    for (const [model, path] of prose) {
      expect(classOf(model, path), `${model}:${path}`).toBe("translatable");
    }
  });

  // @req REQ-143
  it("holds anything about the meaning of a word for review (class 3)", () => {
    const aboutWords: Array<[StrictModelFile, string]> = [
      ["modele-peuple.json", "content.appellations.whyProblematic"],
      ["modele-peuple.json", "content.appellations.originOfExonyms"],
      ["modele-peuple.json", "content.appellations.contemporaryUsage"],
      ["modele-linguistique.json", "content.decolonialHeader.whyProblematic"],
      [
        "modele-linguistique.json",
        "content.decolonialHeader.originOfHistoricalTerm",
      ],
      ["modele-pays.json", "etymology"],
      ["modele-pays.json", "content.historicalNames.formerNames[]"],
      ["modele-nom.json", "names[].meaning"],
      ["modele-nom.json", "names[].whyProblematic"],
      ["modele-nom-patronyme.json", "origin.linguisticReconstructions[].claim"],
      ["modele-recit-oral.json", "content.transcript"],
    ];
    for (const [model, path] of aboutWords) {
      expect(classOf(model, path), `${model}:${path}`).toBe("review_required");
    }
  });

  // @req REQ-143
  it("declares no class-4 leaf: a generated string is authored in code, never stored", () => {
    for (const model of STRICT_MODEL_FILES) {
      const stored = Object.entries(TRANSLATION_CLASSES[model]).filter(
        ([, cls]) => cls === "generated"
      );
      expect(stored, model).toEqual([]);
    }
  });

  // @req REQ-143
  it("resolves a wildcard subtree and an ISO-keyed map, and stays silent on an unknown leaf", () => {
    expect(classOf("modele-peuple.json", "_meta.directives")).toBe("invariant");
    expect(
      classOf(
        "modele-linguistique.json",
        "content.distribution.distributionByCountry.GHA"
      )
    ).toBe("invariant");
    expect(classOf("modele-peuple.json", "content.nowhere")).toBeUndefined();
  });

  // @req REQ-143
  it("gives a leaf name one class across models unless the exception says why not", () => {
    const seen = new Map<string, Map<string, string>>();
    const record = (path: string, cls: string, where: string) => {
      if (path.endsWith(".*")) return;
      const leafName = path.split(".").pop()!.replace(/\[\]$/, "");
      const byClass = seen.get(leafName) ?? new Map<string, string>();
      if (!byClass.has(cls)) byClass.set(cls, where);
      seen.set(leafName, byClass);
    };
    for (const model of STRICT_MODEL_FILES) {
      for (const [path, cls] of Object.entries(TRANSLATION_CLASSES[model])) {
        record(path, cls, `${model}:${path}`);
      }
    }
    for (const leaf of PARSER_ONLY_LEAVES) {
      record(leaf.path, leaf.class, `${leaf.model}:${leaf.path}`);
    }

    const excepted = new Set(CLASS_EXCEPTIONS.map((e) => e.leafName));
    const conflicts = [...seen]
      .filter(
        ([leafName, byClass]) => byClass.size > 1 && !excepted.has(leafName)
      )
      .map(
        ([leafName, byClass]) =>
          `${leafName}: ${[...byClass.values()].join(" vs ")}`
      );
    expect(conflicts).toEqual([]);

    const spurious = CLASS_EXCEPTIONS.filter(
      (e) => (seen.get(e.leafName)?.size ?? 0) < 2
    ).map((e) => e.leafName);
    expect(spurious).toEqual([]);
  });
});

describe("glossed invariants", () => {
  // @req REQ-143
  it("are all class-1 leaves — the rule only makes sense on a name carried verbatim", () => {
    for (const { model, path } of GLOSSED_INVARIANT_PATHS) {
      expect(classOf(model, path), `${model}:${path}`).toBe("invariant");
    }
  });

  // @req REQ-143
  it("keep the name and release the parenthetical gloss", () => {
    expect(glossedInvariantName("Hottentots (péjoratif, colonial)")).toBe(
      "Hottentots"
    );
    expect(glossedInvariantName("Asante / Asantefo")).toBe("Asante / Asantefo");
    expect(
      glossedInvariantName("Jieng (pluriel) / Muonyjang (singulier)")
    ).toBe("Jieng / Muonyjang");
  });
});

describe("parser-only leaves of the patronyme model", () => {
  const source = {
    sourceKey: "src-1",
    title: "Source",
    url: null,
    tier: "referenced",
    isSelfIdentification: true,
  };
  const claim = {
    claim: "<claim>",
    claimStatus: "claimed",
    sourceRefs: ["src-1"],
  };
  const common = {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "patronyme",
      directives: "d",
      illustrative: true,
    },
    id: "PAT_TEST",
    nameMain: "Test",
    spellings: [
      {
        spelling: "Test",
        attestations: [{ countryId: "MLI", sourceRefs: ["src-1"] }],
      },
    ],
    transmissionMode: "patrilineal",
    designatedSocialUnit: "clan",
    origin: {
      oralTraditions: [{ ...claim, griot: "G", transcription: "T" }],
      writtenChronicles: [claim],
      linguisticReconstructions: [claim],
    },
    peoples: [],
    countries: [],
    alliances: [],
    casteOrSocialFunction: { value: "<prose>", sourceRefs: ["src-1"] },
    bearers: [
      { status: "deceased", displayName: "Someone", sourceRefs: ["src-1"] },
      { status: "aggregated", description: "<prose>", sourceRefs: ["src-1"] },
      {
        status: "living_self_identified",
        personId: "PER_X",
        sourceRefs: ["src-1"],
        selfIdentificationSourceRef: "src-1",
      },
    ],
    homonyms: [],
    sources: [source],
    gaps: [{ fieldPath: "alliances", reason: "<reason>" }],
  };
  const fixtures = [
    { ...common, nameSystem: "clan_name" },
    {
      ...common,
      nameSystem: "non_hereditary_patronymic",
      patronymicChainDepth: { generations: 3, sourceRefs: ["src-1"] },
    },
    {
      ...common,
      nameSystem: "nisba",
      nisbaSubtype: { value: "geographic", sourceRefs: ["src-1"] },
    },
    {
      ...common,
      nameSystem: "totemic_clan",
      totemicFoodProhibition: { value: "<prose>", sourceRefs: ["src-1"] },
      permittedGivenNames: [{ name: "N", sourceRefs: ["src-1"] }],
    },
  ];

  // @req REQ-143
  it("are every leaf the parser accepts beyond the model, each with a class", () => {
    const accepted = new Set<string>();
    for (const fixture of fixtures) {
      const parsed = parsePatronymeFile(fixture);
      expect(parsed.errors, fixture.nameSystem).toBeUndefined();
      for (const leaf of recordLeaves(parsed.data)) {
        accepted.add(leaf.modelPath);
        expect(
          classOf("modele-nom-patronyme.json", leaf.modelPath),
          leaf.modelPath
        ).toBeDefined();
      }
    }
    for (const leaf of PARSER_ONLY_LEAVES) {
      expect(accepted.has(leaf.path), leaf.path).toBe(true);
    }
  });

  // @req REQ-143
  it("name a leaf the model itself does not show, on a parser that exists", () => {
    for (const leaf of PARSER_ONLY_LEAVES) {
      expect(modelLeaves(leaf.model, readModel(leaf.model))).not.toContain(
        leaf.path
      );
      expect(() =>
        readFileSync(join(__dirname, "../../../..", leaf.parser))
      ).not.toThrow();
    }
  });
});
