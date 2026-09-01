import { describe, expect, it } from "vitest";

import { parsePatronymeFile } from "../patronymeParser";
import {
  SOURCE_KEY,
  validPatronymeFiche,
} from "./fixtures/validPatronymeFiche.fixture";

describe("parsePatronymeFile", () => {
  const canonicalSubtypes = [
    "clan_name",
    "non_hereditary_patronymic",
    "nisba",
    "praise_name",
    "totemic_clan",
  ] as const;

  // @req REQ-133
  it.each(canonicalSubtypes)(
    "accepts the canonical %s subtype",
    (nameSystem) => {
      const subtypeFields: Record<string, unknown> = {};
      if (nameSystem === "non_hereditary_patronymic") {
        subtypeFields.patronymicChainDepth = {
          generations: 1,
          sourceRefs: [SOURCE_KEY],
        };
      }
      if (nameSystem === "nisba") {
        subtypeFields.nisbaSubtype = {
          value: "tribal",
          sourceRefs: [SOURCE_KEY],
        };
      }
      if (nameSystem === "totemic_clan") {
        subtypeFields.totemicFoodProhibition = {
          value: "Interdit attesté",
          sourceRefs: [SOURCE_KEY],
        };
        subtypeFields.permittedGivenNames = [
          { name: "Kato", sourceRefs: [SOURCE_KEY] },
        ];
      }

      const result = parsePatronymeFile(
        validPatronymeFiche({ nameSystem, ...subtypeFields })
      );

      expect(result.success).toBe(true);
      expect(result.data?.nameSystem).toBe(nameSystem);
    }
  );

  // @req REQ-134
  it.each([
    "patronymic_non_hereditary",
    "lineage_praise_name",
    "closed_list_totemic",
    "patronymic_chain",
    "jamu",
    "undetermined",
  ])("rejects the non-canonical authoring alias %s", (nameSystem) => {
    const result = parsePatronymeFile(validPatronymeFiche({ nameSystem }));

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "nameSystem" })
    );
  });

  // @req REQ-133
  it("rejects subtype-only fields outside their canonical subtype", () => {
    const result = parsePatronymeFile(
      validPatronymeFiche({
        nameSystem: "clan_name",
        patronymicChainDepth: {
          generations: 2,
          sourceRefs: [SOURCE_KEY],
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "patronymicChainDepth" })
    );
  });

  // @req REQ-133
  it("rejects unknown keys at the top level and in nested records", () => {
    const fiche = validPatronymeFiche({ inventedSection: "non" });
    fiche.spellings[0].attestations[0] = {
      ...fiche.spellings[0].attestations[0],
      inferredPeople: "PPL_MALINKE",
    } as (typeof fiche.spellings)[number]["attestations"][number];

    const result = parsePatronymeFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "inventedSection" }),
        expect.objectContaining({
          path: "spellings.0.attestations.0.inferredPeople",
        }),
      ])
    );
  });

  // @req REQ-133
  it("requires every top-level source to carry an explicit tier", () => {
    const fiche = validPatronymeFiche();
    delete (fiche.sources[0] as Record<string, unknown>).tier;

    const result = parsePatronymeFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "sources.0.tier" }),
      ])
    );
  });

  // @req REQ-133
  it("requires every nested source reference to resolve within the fiche", () => {
    const fiche = validPatronymeFiche();
    fiche.peoples[0].sourceRefs = ["missing-source"];

    const result = parsePatronymeFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "peoples.0.sourceRefs.0" })
    );
  });

  // @req REQ-133
  it("requires at least one explicit gap", () => {
    const result = parsePatronymeFile(validPatronymeFiche({ gaps: [] }));

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "gaps" })
    );
  });

  // @req REQ-133
  it("accepts a living bearer only with a cited public self-identification", () => {
    const fiche = validPatronymeFiche({
      bearers: [
        {
          status: "living_self_identified",
          personId: "PER_LIVING_TEST",
          sourceRefs: [SOURCE_KEY],
          selfIdentificationSourceRef: SOURCE_KEY,
        },
      ],
      sources: [
        {
          ...(validPatronymeFiche().sources[0] as Record<string, unknown>),
          isSelfIdentification: true,
        },
      ],
    });

    expect(parsePatronymeFile(fiche).success).toBe(true);
  });

  // @req REQ-133
  it("rejects a living bearer whose source is not marked as self-identification", () => {
    const result = parsePatronymeFile(
      validPatronymeFiche({
        bearers: [
          {
            status: "living_self_identified",
            personId: "PER_LIVING_TEST",
            sourceRefs: [SOURCE_KEY],
            selfIdentificationSourceRef: SOURCE_KEY,
          },
        ],
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: "bearers.0.selfIdentificationSourceRef",
      })
    );
  });

  // @req REQ-133
  it("rejects any ethnic-origin field on a bearer (DEC-040)", () => {
    const fiche = validPatronymeFiche();
    fiche.bearers[0] = {
      ...fiche.bearers[0],
      ethnicOrigin: "PPL_MALINKE",
    } as (typeof fiche.bearers)[number];

    const result = parsePatronymeFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "bearers.0.ethnicOrigin" })
    );
  });

  // @req REQ-133
  it("rejects an unsourced caste or social-function claim", () => {
    const result = parsePatronymeFile(
      validPatronymeFiche({
        casteOrSocialFunction: {
          value: "jeli",
          sourceRefs: [],
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "casteOrSocialFunction.sourceRefs" })
    );
  });
});
