import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkPatronymeFicheModel } from "../validateAfrikData";
import {
  SOURCE_KEY,
  validPatronymeFiche,
} from "../../src/lib/afrik/parsers/__tests__/fixtures/validPatronymeFiche.fixture";

const MODEL_PATH = resolve(process.cwd(), "public/modele-nom-patronyme.json");
const COMMON_KEYS = [
  "_meta",
  "alliances",
  "bearers",
  "casteOrSocialFunction",
  "countries",
  "designatedSocialUnit",
  "gaps",
  "homonyms",
  "id",
  "nameMain",
  "nameSystem",
  "origin",
  "peoples",
  "sources",
  "spellings",
  "transmissionMode",
].sort();

describe("strict PAT_* fiche model", () => {
  let datasetRoot: string;

  beforeEach(() => {
    datasetRoot = join(
      __dirname,
      `tmp_patronyme_model_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(join(datasetRoot, "patronymes"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(datasetRoot)) {
      rmSync(datasetRoot, { recursive: true, force: true });
    }
  });

  function writeFiche(fiche: Record<string, unknown>) {
    writeFileSync(
      join(datasetRoot, "patronymes", "PAT_KEITA.json"),
      JSON.stringify(fiche)
    );
  }

  // @req REQ-133
  it("publishes one per-name model with the exact common PAT_* sections", () => {
    const model = JSON.parse(readFileSync(MODEL_PATH, "utf8"));

    expect(Object.keys(model).sort()).toEqual(COMMON_KEYS);
    expect(model._meta.entity).toBe("patronyme");
    expect(model.id).toMatch(/^PAT_/);
    expect(model).not.toHaveProperty("entityType");
    expect(JSON.stringify(model)).not.toContain("ONS_XXXXX");
  });

  // @req REQ-133
  it("accepts exact nested shapes, explicit tiers, and PAT/PPL/ISO3/PER references", () => {
    writeFiche(validPatronymeFiche());

    expect(checkPatronymeFicheModel(datasetRoot)).toEqual({
      ok: true,
      errors: [],
      warnings: [],
    });
  });

  // @req REQ-134
  it("accepts subtype fields only under the matching canonical nameSystem", () => {
    const totemicFields = {
      totemicFoodProhibition: {
        value: "Interdit attesté",
        sourceRefs: [SOURCE_KEY],
      },
      permittedGivenNames: [{ name: "Kato", sourceRefs: [SOURCE_KEY] }],
    };
    writeFiche(
      validPatronymeFiche({
        nameSystem: "totemic_clan",
        ...totemicFields,
      })
    );
    expect(checkPatronymeFicheModel(datasetRoot).ok).toBe(true);

    writeFiche(
      validPatronymeFiche({ nameSystem: "clan_name", ...totemicFields })
    );
    const invalid = checkPatronymeFicheModel(datasetRoot);
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.join("\n")).toContain("totemicFoodProhibition");
    expect(invalid.errors.join("\n")).toContain("permittedGivenNames");
  });

  // @req REQ-133
  it("rejects malformed entity references and an unknown nested key", () => {
    const fiche = validPatronymeFiche({
      id: "PPL_KEITA",
      peoples: [
        {
          peopleId: "MLI",
          status: "attested",
          sourceRefs: [SOURCE_KEY],
        },
      ],
      countries: [
        {
          countryId: "MALI",
          status: "attested",
          sourceRefs: [SOURCE_KEY],
        },
      ],
      bearers: [
        {
          status: "deceased",
          personId: "PPL_PERSON",
          sourceRefs: [SOURCE_KEY],
          peopleId: "PPL_MALINKE",
        },
      ],
    });
    writeFiche(fiche);

    const result = checkPatronymeFicheModel(datasetRoot);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/id.*PAT_/);
    expect(result.errors.join("\n")).toMatch(/peopleId.*PPL_/);
    expect(result.errors.join("\n")).toMatch(/countryId.*ISO/);
    expect(result.errors.join("\n")).toMatch(/personId.*PER_/);
  });

  // @req REQ-133
  it("rejects unknown top-level keys, missing gaps, and an invalid nested tier", () => {
    const fiche = validPatronymeFiche({ gaps: [], inventedSection: {} });
    (fiche.sources[0] as Record<string, unknown>).tier = "Tier 2";
    writeFiche(fiche);

    const result = checkPatronymeFicheModel(datasetRoot);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("inventedSection");
    expect(result.errors.join("\n")).toContain("gaps");
    expect(result.errors.join("\n")).toContain("tier");
  });

  // @req REQ-133
  it("enforces DEC-040 for living bearers and caste claims", () => {
    writeFiche(
      validPatronymeFiche({
        casteOrSocialFunction: { value: "jeli", sourceRefs: [] },
        bearers: [
          {
            status: "living_self_identified",
            personId: "PER_LIVING_TEST",
            sourceRefs: [SOURCE_KEY],
            selfIdentificationSourceRef: SOURCE_KEY,
            ethnicOrigin: "PPL_MALINKE",
          },
        ],
      })
    );

    const result = checkPatronymeFicheModel(datasetRoot);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("casteOrSocialFunction");
    expect(result.errors.join("\n")).toContain("bearers.0");
  });
});
