import { describe, expect, it } from "vitest";
import {
  buildT1LanguageFamilyTemplate,
  buildT2AutonymTemplate,
  buildT3MainCountryTemplate,
  buildT4MainLanguageTemplate,
  buildT6RitesTemplate,
  buildT12ContestedExonymTemplate,
  buildT13EtymologyTemplate,
  buildT16KingdomTemplate,
  questionTemplateBuilders,
} from "../questionTemplates";
import { QUIZ_TEMPLATE_IDS } from "@/lib/quiz/segmentPolicy";
import type {
  AutonymExonymName,
  QuizCountryFixture,
  QuizPeopleFixture,
} from "@/types/quiz";

const fiche: QuizPeopleFixture = {
  id: "PPL_YORUBA",
  subjectName: { autonym: "Yorùbá", exonym: "Yoruba" },
  languageFamilyId: "FLG_NIGER_CONGO",
  languageFamilyNameFr: "Niger-Congo",
  selfAppellation: "Yorùbá",
  distributionByCountry: [
    { countryId: "NGA", countryNameFr: "Nigeria", population: 41_000_000 },
    { countryId: "BEN", countryNameFr: "Bénin", population: 6_000_000 },
    { countryId: "TGO", countryNameFr: "Togo", population: 3_000_000 },
  ],
  mainLanguage: { autonym: "Èdè Yorùbá", exonym: "Yoruba" },
  totalPopulation: 50_000_000,
  exonyms: [],
  rubrics: { T6: null, T7: null, T8: null, T9: null, T10: null, T11: null },
  whyProblematic: null,
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

const PEOPLE_POOL: AutonymExonymName[] = [
  { autonym: "amaZulu", exonym: "Zoulou" },
  { autonym: "Basotho" },
  { autonym: "Vatsonga", exonym: "Tsonga" },
  { autonym: "VhaVenda", exonym: "Venda" },
];

function inversionFiche(
  overrides: Partial<QuizPeopleFixture> = {}
): QuizPeopleFixture {
  return {
    ...fiche,
    id: "PPL_VENDA",
    subjectName: { autonym: "VhaVenda", exonym: "Venda" },
    selfAppellation: "VhaVenda (pl.), MuVenda (sg.)",
    exonyms: ["Venda (terme europeen standardise)", "Bawenda"],
    rubrics: {
      ...fiche.rubrics,
      T6:
        "Domba (danse du python) : ceremonie d'initiation des jeunes femmes au lac Fundudzi, consideree comme la danse la plus sacree du Venda. " +
        "Les futures mariees dansent en file indienne en imitant les mouvements du python, symbolisant le passage a l'age adulte.",
    },
    ...overrides,
  };
}

describe("buildT6RitesTemplate", () => {
  /**
   * The inversion: the fragment is what the reader is shown and the people is
   * what they are asked for. Its whole value rests on the fragment not saying
   * « Venda », which the first sentence of this rubric does.
   */
  // @req REQ-121
  it("quotes only the part of the rubric that does not name the answer", () => {
    const round = buildT6RitesTemplate(inversionFiche(), PEOPLE_POOL);

    expect(round?.stimulusFr).toBe(
      "Les futures mariees dansent en file indienne en imitant les mouvements du python, symbolisant le passage a l'age adulte."
    );
    expect(round?.stimulusFr).not.toContain("Venda");
  });

  // @req REQ-121
  it("answers with the subject itself, among peoples of its near pool", () => {
    const round = buildT6RitesTemplate(inversionFiche(), PEOPLE_POOL);

    expect(round?.optionsFr).toHaveLength(4);
    expect(round?.optionsFr[round.correctOption]).toEqual({
      autonym: "VhaVenda",
      exonym: "Venda",
    });
    // The subject is never also a distractor.
    expect(
      round?.optionsFr.filter(
        (o) => (o as AutonymExonymName).autonym === "VhaVenda"
      )
    ).toHaveLength(1);
  });

  // @req REQ-121
  it("asks its own question rather than one standing prompt reused by every round", () => {
    const rites = buildT6RitesTemplate(inversionFiche(), PEOPLE_POOL);
    const t1 = buildT1LanguageFamilyTemplate(fiche, [
      "Bantou",
      "Nilo-Saharien",
      "Khoisan",
      "Afro-Asiatique",
    ]);

    expect(rites?.promptFr).toBe("Quel peuple pratique ces rites ?");
    expect(rites?.promptFr).not.toBe(t1?.promptFr);
  });

  // @req REQ-121
  it("generates nothing when every sentence of the rubric names its subject", () => {
    const round = buildT6RitesTemplate(
      inversionFiche({
        rubrics: {
          ...fiche.rubrics,
          T6: "Les VhaVenda dansent la Domba au bord du lac sacre chaque annee depuis des siecles.",
        },
      }),
      PEOPLE_POOL
    );

    expect(round).toBeNull();
  });

  // @req REQ-121
  it("generates nothing when the near pool cannot supply three peoples", () => {
    expect(
      buildT6RitesTemplate(inversionFiche(), [{ autonym: "Basotho" }])
    ).toBeNull();
  });
});

describe("buildT12ContestedExonymTemplate", () => {
  const tsonga = (): QuizPeopleFixture => ({
    ...fiche,
    id: "PPL_TSONGA",
    subjectName: { autonym: "Vatsonga", exonym: "Tsonga" },
    exonyms: ["Shangaan", "Thonga", "Gwamba", "Machangane"],
    whyProblematic:
      "Le terme Shangaan est souvent utilise de facon abusive pour l'ensemble des Tsonga, ce qui est historiquement inexact.",
  });

  // @req REQ-121
  it("makes the contested name the answer and the people's other names the distractors", () => {
    const round = buildT12ContestedExonymTemplate(tsonga());

    expect(round?.optionsFr[round.correctOption]).toBe("Shangaan");
    expect([...(round?.optionsFr ?? [])].sort()).toEqual([
      "Gwamba",
      "Machangane",
      "Shangaan",
      "Thonga",
    ]);
  });

  /**
   * The stem asserts these are names given to *this* people. Topping the
   * options up from a neighbour's exonyms would nearly double the yield and
   * would make that sentence false, so a fiche with too few names of its own
   * simply gets no round.
   */
  // @req REQ-121
  it("refuses to borrow a distractor from another people", () => {
    expect(
      buildT12ContestedExonymTemplate({
        ...tsonga(),
        exonyms: ["Shangaan", "Thonga"],
      })
    ).toBeNull();
  });

  // @req REQ-121
  it("generates nothing when the passage names none of the exonyms", () => {
    expect(
      buildT12ContestedExonymTemplate({
        ...tsonga(),
        whyProblematic: "Ce nom prete a confusion avec un peuple voisin.",
      })
    ).toBeNull();
  });

  // @req REQ-121
  it("reveals the corpus's own explanation rather than a paraphrase", () => {
    const round = buildT12ContestedExonymTemplate(tsonga());
    expect(round?.explanationFr).toBe(tsonga().whyProblematic);
  });
});

const COUNTRY_POOL: AutonymExonymName[] = [
  { autonym: "Comores" },
  { autonym: "Ghana" },
  { autonym: "Kenya" },
  { autonym: "Sénégal" },
];

function countryFiche(
  overrides: Partial<QuizCountryFixture> = {}
): QuizCountryFixture {
  return {
    id: "COM",
    subjectName: { autonym: "Comores" },
    selfAppellation: "Union des Comores",
    exonyms: [],
    rubrics: {
      T13:
        "Le nom « Comores » vient de l'arabe « Juzur al-Qamar ». " +
        "Les navigateurs qui accostaient l'archipel au IXe siècle voyaient dans ses sommets la forme de croissants.",
    },
    kingdomNames: ["Sultanats des Comores", "Royaume de Ndzuwani"],
    ...overrides,
  };
}

describe("the country templates", () => {
  /**
   * The same inversion as the people rounds, on the entity the quiz had never
   * asked about: 54 fiches whose etymology, colonial name and religious
   * landscape no template read.
   */
  // @req REQ-121
  it("quotes a country rubric without naming the country", () => {
    const round = buildT13EtymologyTemplate(countryFiche(), COUNTRY_POOL);

    expect(round?.entityType).toBe("country");
    expect(round?.stimulusFr).not.toContain("Comores");
    expect(round?.stimulusFr).toContain("navigateurs qui accostaient");
    expect(round?.optionsFr[round.correctOption]).toEqual({
      autonym: "Comores",
    });
  });

  // @req REQ-121
  it("generates nothing when the etymology names the country throughout", () => {
    expect(
      buildT13EtymologyTemplate(
        countryFiche({
          rubrics: {
            T13: "Le nom des Comores vient d'une racine arabe ancienne, portee par les marchands de l'ocean Indien.",
          },
        }),
        COUNTRY_POOL
      )
    ).toBeNull();
  });

  /**
   * T16 is the one country round whose answer is an atom rather than the
   * subject, so it names its country in the stem like T1-T4 do.
   */
  // @req REQ-121
  it("asks which country a kingdom stood on, naming the country in the stem", () => {
    const round = buildT16KingdomTemplate(countryFiche(), [
      "Sultanats des Comores",
      "Empire du Ghana",
      "Royaume Ashanti",
      "Empire du Mali",
    ]);

    expect(round?.promptFr).toContain("Comores");
    expect(round?.stimulusFr).toBeNull();
    expect(round?.optionsFr[round.correctOption]).toBe("Sultanats des Comores");
  });

  /**
   * A kingdom the same country also held is not a wrong answer — the corpus
   * lists several per country, and offering two of them would make the round
   * unanswerable rather than hard.
   */
  // @req REQ-121
  it("never offers another kingdom of the same country as a distractor", () => {
    const round = buildT16KingdomTemplate(countryFiche(), [
      "Sultanats des Comores",
      "Royaume de Ndzuwani",
      "Empire du Ghana",
      "Royaume Ashanti",
      "Empire du Mali",
    ]);

    expect(round?.optionsFr).not.toContain("Royaume de Ndzuwani");
  });

  // @req REQ-121
  it("generates nothing for a country whose fiche names no kingdom", () => {
    expect(
      buildT16KingdomTemplate(countryFiche({ kingdomNames: [] }), [
        "Empire du Ghana",
        "Royaume Ashanti",
        "Empire du Mali",
      ])
    ).toBeNull();
  });
});

describe("questionTemplateBuilders barrel", () => {
  /**
   * The barrel is what `buildCandidate` dispatches through, and its switch is
   * not the tripwire it looks like: with `strictNullChecks` off a missing case
   * returns `undefined` and compiles. Holding the barrel against the registry
   * is what actually catches a template declared but never built.
   */
  // @req REQ-080 REQ-121
  it("builds every template the policy declares, and no others", () => {
    expect(Object.keys(questionTemplateBuilders).sort()).toEqual(
      [...QUIZ_TEMPLATE_IDS].sort()
    );
    expect(questionTemplateBuilders.T1).toBe(buildT1LanguageFamilyTemplate);
    expect(questionTemplateBuilders.T12).toBe(buildT12ContestedExonymTemplate);
  });
});
