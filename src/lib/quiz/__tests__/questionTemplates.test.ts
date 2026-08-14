import { describe, expect, it } from "vitest";
import {
  buildT1LanguageFamilyTemplate,
  buildT2AutonymTemplate,
  buildT3MainCountryTemplate,
  buildT4MainLanguageTemplate,
  buildT5IsoCodeTemplate,
  questionTemplateBuilders,
} from "../questionTemplates";
import type { QuizPeopleFixture } from "@/types/quiz";

const fiche: QuizPeopleFixture = {
  id: "PPL_YORUBA",
  subjectName: { autonym: "Yorùbá", exonym: "Yoruba" },
  languageFamilyId: "FLG_NIGER_CONGO",
  languageFamilyNameFr: "Niger-Congo",
  selfAppellation: "Yorùbá",
  distributionByCountry: [
    { countryId: "NGA", countryNameFr: "Nigeria", percentage: 82 },
    { countryId: "BEN", countryNameFr: "Bénin", percentage: 12 },
    { countryId: "TGO", countryNameFr: "Togo", percentage: 6 },
  ],
  mainLanguage: { autonym: "Èdè Yorùbá", exonym: "Yoruba" },
  isoCode: "yor",
};

describe("buildT1LanguageFamilyTemplate", () => {
  const pool = ["Bantou", "Nilo-Saharien", "Afro-Asiatique", "Khoisan"];

  // @req REQ-080
  it("returns a candidate with 4 distinct options and the correct family at the answer index", () => {
    const candidate = buildT1LanguageFamilyTemplate(fiche, pool);
    expect(candidate).not.toBeNull();
    expect(candidate!.templateId).toBe("T1");
    expect(candidate!.entityType).toBe("people");
    expect(candidate!.entityId).toBe("PPL_YORUBA");
    expect(candidate!.fieldPath).toBe("languageFamilyId");
    expect(candidate!.baselineDifficulty).toBe(1);
    expect(candidate!.optionsFr).toHaveLength(4);
    expect(candidate!.optionsFr[candidate!.correctOption]).toBe("Niger-Congo");
    const distinct = new Set(candidate!.optionsFr as string[]);
    expect(distinct.size).toBe(4);
  });

  // @req REQ-080
  it("carries the people's autonym-first subject name, not a bare string", () => {
    const candidate = buildT1LanguageFamilyTemplate(fiche, pool);
    expect(candidate!.subjectName).toEqual({
      autonym: "Yorùbá",
      exonym: "Yoruba",
    });
    expect(candidate!.promptFr).toContain("Yorùbá");
  });

  // @req REQ-080
  it("filters out a pool distractor equal to the correct answer", () => {
    const poolWithDuplicate = [
      "Niger-Congo",
      "Bantou",
      "Nilo-Saharien",
      "Afro-Asiatique",
    ];
    const candidate = buildT1LanguageFamilyTemplate(fiche, poolWithDuplicate);
    expect(candidate).not.toBeNull();
    const options = candidate!.optionsFr as string[];
    expect(options.filter((o) => o === "Niger-Congo")).toHaveLength(1);
  });

  // @req REQ-080
  it("returns null when fewer than 3 valid distractors remain", () => {
    const candidate = buildT1LanguageFamilyTemplate(fiche, [
      "Bantou",
      "Niger-Congo",
    ]);
    expect(candidate).toBeNull();
  });

  // @req REQ-080
  it("is deterministic across repeated calls with the same input", () => {
    const first = buildT1LanguageFamilyTemplate(fiche, pool);
    const second = buildT1LanguageFamilyTemplate(fiche, pool);
    expect(first).toEqual(second);
  });
});

describe("buildT2AutonymTemplate", () => {
  const pool = ["Ewe", "Fon", "Akan"];

  // @req REQ-080
  it("returns a candidate whose correct option is the fiche's self-appellation", () => {
    const candidate = buildT2AutonymTemplate(fiche, pool);
    expect(candidate).not.toBeNull();
    expect(candidate!.templateId).toBe("T2");
    expect(candidate!.fieldPath).toBe("content.appellations.selfAppellation");
    expect(candidate!.baselineDifficulty).toBe(2);
    expect(candidate!.optionsFr[candidate!.correctOption]).toBe("Yorùbá");
    const distinct = new Set(candidate!.optionsFr as string[]);
    expect(distinct.size).toBe(4);
  });

  // @req REQ-080
  it("returns null when fewer than 3 valid distractors remain after de-duplication", () => {
    const candidate = buildT2AutonymTemplate(fiche, ["Ewe", "Ewe", "Yorùbá"]);
    expect(candidate).toBeNull();
  });
});

describe("buildT3MainCountryTemplate", () => {
  const pool = ["Ghana", "Sénégal", "Kenya", "Mali"];

  // @req REQ-080
  it("picks the country with the largest population share as the correct answer", () => {
    const candidate = buildT3MainCountryTemplate(fiche, pool);
    expect(candidate).not.toBeNull();
    expect(candidate!.templateId).toBe("T3");
    expect(candidate!.fieldPath).toBe(
      "content.demography.distributionByCountry"
    );
    expect(candidate!.baselineDifficulty).toBe(1);
    expect(candidate!.optionsFr[candidate!.correctOption]).toBe("Nigeria");
  });

  // @req REQ-080
  it("returns null when the fiche has no country distribution data", () => {
    const emptyFiche: QuizPeopleFixture = {
      ...fiche,
      distributionByCountry: [],
    };
    const candidate = buildT3MainCountryTemplate(emptyFiche, pool);
    expect(candidate).toBeNull();
  });

  // @req REQ-080
  it("returns null when fewer than 3 valid distractors remain", () => {
    const candidate = buildT3MainCountryTemplate(fiche, ["Ghana", "Nigeria"]);
    expect(candidate).toBeNull();
  });
});

describe("buildT4MainLanguageTemplate", () => {
  const pool = [
    { autonym: "Kiswahili", exonym: "Swahili" },
    { autonym: "Ikirundi", exonym: "Kirundi" },
    { autonym: "Setswana", exonym: "Tswana" },
  ];

  // @req REQ-080
  it("returns structured autonym-first options, never bare strings, for a language field", () => {
    const candidate = buildT4MainLanguageTemplate(fiche, pool);
    expect(candidate).not.toBeNull();
    expect(candidate!.templateId).toBe("T4");
    expect(candidate!.fieldPath).toBe("content.languages.mainLanguage");
    expect(candidate!.baselineDifficulty).toBe(2);
    for (const option of candidate!.optionsFr) {
      expect(typeof option).not.toBe("string");
      expect(option).toHaveProperty("autonym");
    }
    expect(candidate!.optionsFr[candidate!.correctOption]).toEqual({
      autonym: "Èdè Yorùbá",
      exonym: "Yoruba",
    });
  });

  // @req REQ-080
  it("filters out a distractor whose autonym matches the correct answer's autonym", () => {
    const poolWithDuplicate = [
      { autonym: "Èdè Yorùbá", exonym: "Yoruba" },
      { autonym: "Kiswahili", exonym: "Swahili" },
      { autonym: "Ikirundi", exonym: "Kirundi" },
      { autonym: "Setswana", exonym: "Tswana" },
    ];
    const candidate = buildT4MainLanguageTemplate(fiche, poolWithDuplicate);
    expect(candidate).not.toBeNull();
    const autonyms = candidate!.optionsFr.map((o) =>
      typeof o === "string" ? o : o.autonym
    );
    expect(autonyms.filter((a) => a === "Èdè Yorùbá")).toHaveLength(1);
  });

  // @req REQ-080
  it("returns null when fewer than 3 valid distractors remain", () => {
    const candidate = buildT4MainLanguageTemplate(fiche, [
      { autonym: "Kiswahili" },
    ]);
    expect(candidate).toBeNull();
  });
});

describe("buildT5IsoCodeTemplate", () => {
  const pool = ["swa", "run", "tsn", "hau"];

  // @req REQ-080
  it("returns the fiche's ISO 639-3 code as the correct option", () => {
    const candidate = buildT5IsoCodeTemplate(fiche, pool);
    expect(candidate).not.toBeNull();
    expect(candidate!.templateId).toBe("T5");
    expect(candidate!.fieldPath).toBe("content.languages.isoCodes");
    expect(candidate!.baselineDifficulty).toBe(4);
    expect(candidate!.optionsFr[candidate!.correctOption]).toBe("yor");
    const distinct = new Set(candidate!.optionsFr as string[]);
    expect(distinct.size).toBe(4);
  });

  // @req REQ-080
  it("returns null when fewer than 3 valid distractors remain", () => {
    const candidate = buildT5IsoCodeTemplate(fiche, ["swa", "yor"]);
    expect(candidate).toBeNull();
  });
});

describe("questionTemplateBuilders barrel", () => {
  // @req REQ-080
  it("exposes all five template builders keyed by template id", () => {
    expect(Object.keys(questionTemplateBuilders).sort()).toEqual([
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
    ]);
    expect(questionTemplateBuilders.T1).toBe(buildT1LanguageFamilyTemplate);
    expect(questionTemplateBuilders.T5).toBe(buildT5IsoCodeTemplate);
  });
});
