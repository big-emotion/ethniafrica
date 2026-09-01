import { describe, expect, it } from "vitest";

import { languageIdParamSchema, publicLanguageSchema } from "../languages";

const validLanguage = {
  id: "yor",
  name: "Yoruba",
  nameProvenance: "sourced",
  family: {
    id: "FLG_NIGER_CONGO",
    name: "Niger-Congo",
  },
  speakingPeoples: [
    {
      id: "PPL_YORUBA",
      name: "Yoruba",
    },
  ],
  vehicularRole: "Regional lingua franca",
  vitalityStatus: {
    status: "Institutional",
    scale: "EGIDS",
    asOf: 2025,
  },
  sources: [
    {
      id: "source-1",
      title: "Ethnologue",
      url: "https://www.ethnologue.com/language/yor/",
      tier: "official",
      notes: "Language classification reference",
    },
  ],
};

describe("publicLanguageSchema", () => {
  // @req REQ-136
  it("accepts a complete public language payload", () => {
    expect(publicLanguageSchema.parse(validLanguage)).toEqual(validLanguage);
  });

  // @req REQ-136
  it("accepts nullable public fields and an omitted source note", () => {
    const payload = {
      ...validLanguage,
      nameProvenance: "derived",
      speakingPeoples: [],
      vehicularRole: null,
      vitalityStatus: null,
      sources: [
        {
          id: "source-2",
          title: "Language catalogue",
          url: null,
          tier: "referenced",
        },
      ],
    };

    expect(publicLanguageSchema.parse(payload)).toEqual(payload);
  });

  // @req REQ-136
  it("rejects a payload missing nameProvenance", () => {
    const payload = { ...validLanguage } as Partial<typeof validLanguage>;
    delete payload.nameProvenance;

    const result = publicLanguageSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["nameProvenance"]);
    }
  });

  // @req REQ-136
  it.each(["yo", "yoru", "YOR", "y0r"])(
    "rejects malformed language id %s",
    (id) => {
      const result = publicLanguageSchema.safeParse({ ...validLanguage, id });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["id"]);
      }
    }
  );

  // @req REQ-136
  it("rejects a non-positive or non-integer vitality asOf value", () => {
    for (const asOf of [0, -2025, 2025.5]) {
      const result = publicLanguageSchema.safeParse({
        ...validLanguage,
        vitalityStatus: { ...validLanguage.vitalityStatus, asOf },
      });

      expect(result.success).toBe(false);
    }
  });

  // @req REQ-136
  it("rejects empty names in nested public records", () => {
    const emptyFamilyName = publicLanguageSchema.safeParse({
      ...validLanguage,
      family: { ...validLanguage.family, name: "" },
    });
    const emptyPeopleName = publicLanguageSchema.safeParse({
      ...validLanguage,
      speakingPeoples: [{ id: "PPL_YORUBA", name: "" }],
    });

    expect(emptyFamilyName.success).toBe(false);
    expect(emptyPeopleName.success).toBe(false);
  });
});

describe("languageIdParamSchema", () => {
  // @req REQ-136
  it("accepts a lowercase three-letter ISO 639-3 id", () => {
    expect(languageIdParamSchema.parse({ id: "yor" })).toEqual({ id: "yor" });
  });

  // @req REQ-136
  it.each(["yo", "yoru", "YOR", "y0r"])(
    "rejects malformed route id %s",
    (id) => {
      expect(languageIdParamSchema.safeParse({ id }).success).toBe(false);
    }
  );
});
