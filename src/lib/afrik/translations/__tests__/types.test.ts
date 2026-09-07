import { describe, expect, it } from "vitest";

import {
  ENTITY_TYPE_BY_CORPUS_DIRECTORY,
  TRANSLATION_BLOCK_KEY,
  TRANSLATION_ENTITY_TYPES,
  TRANSLATION_KINDS,
  modelForEntity,
  stripTranslationBlock,
  translationBlockSchema,
} from "../types";

const VALID_BLOCK = {
  kind: "machine",
  translatedAt: "2026-09-05T10:00:00.000Z",
  model: "claude-sonnet-4-5",
  sourceHash: "a".repeat(64),
  fieldHashes: { "content.origins.ancientOrigins": "0123456789abcdef" },
  reviewRequired: ["content.appellations.originOfExonyms"],
};

describe("translation domain types (REQ-142)", () => {
  // @req REQ-142
  it("declares exactly the three provenance kinds the table checks", () => {
    expect([...TRANSLATION_KINDS]).toEqual([
      "human",
      "machine_reviewed",
      "machine",
    ]);
  });

  // @req REQ-142
  it("maps every corpus directory to one entity type, and every entity type to one directory", () => {
    const directories = Object.keys(ENTITY_TYPE_BY_CORPUS_DIRECTORY).sort();
    expect(directories).toEqual([
      "famille_linguistique",
      "langues",
      "migrations",
      "noms",
      "patronymes",
      "pays",
      "peuples",
      "relations",
      "systemes_onomastiques",
    ]);
    const mapped = Object.values(ENTITY_TYPE_BY_CORPUS_DIRECTORY).sort();
    expect(mapped).toEqual([...TRANSLATION_ENTITY_TYPES].sort());
  });

  // @req REQ-142
  it("accepts a complete _translation block", () => {
    expect(translationBlockSchema.safeParse(VALID_BLOCK).success).toBe(true);
  });

  // @req REQ-142
  it("refuses a block whose kind is outside the three-value set", () => {
    const parsed = translationBlockSchema.safeParse({
      ...VALID_BLOCK,
      kind: "auto",
    });
    expect(parsed.success).toBe(false);
  });

  // @req REQ-142
  it("refuses a block that declares no kind at all", () => {
    const { kind: _kind, ...undeclared } = VALID_BLOCK;
    expect(translationBlockSchema.safeParse(undeclared).success).toBe(false);
  });

  // @req REQ-142
  it("refuses a source hash that is not a sha256 hex digest", () => {
    const parsed = translationBlockSchema.safeParse({
      ...VALID_BLOCK,
      sourceHash: "not-a-hash",
    });
    expect(parsed.success).toBe(false);
  });

  // @req REQ-142
  it("strips the _translation block and keeps the fiche key order", () => {
    const sidecar = {
      id: "PPL_X",
      nameMain: "X",
      [TRANSLATION_BLOCK_KEY]: VALID_BLOCK,
      content: { a: 1 },
    };
    const { block, content } = stripTranslationBlock(sidecar);
    expect(block).toEqual(VALID_BLOCK);
    expect(Object.keys(content)).toEqual(["id", "nameMain", "content"]);
  });

  // @req REQ-142
  it("resolves the strict model of each entity type, and a naming system by its subtype", () => {
    expect(modelForEntity("people", {})).toBe("modele-peuple.json");
    expect(modelForEntity("country", {})).toBe("modele-pays.json");
    expect(modelForEntity("language_family", {})).toBe(
      "modele-linguistique.json"
    );
    expect(modelForEntity("language", {})).toBe("modele-langue.json");
    expect(modelForEntity("patronyme", {})).toBe("modele-nom-patronyme.json");
    expect(modelForEntity("relation", {})).toBe("modele-relation.json");
    expect(modelForEntity("migration", {})).toBe("modele-migration.json");
    expect(modelForEntity("name", {})).toBe("modele-nom.json");
    expect(
      modelForEntity("onomastic_system", { namingSystem: "totemic_clan" })
    ).toBe("modele-nom-totemique.json");
    expect(modelForEntity("onomastic_system", { namingSystem: "nisba" })).toBe(
      "modele-nom-nisba.json"
    );
  });
});
