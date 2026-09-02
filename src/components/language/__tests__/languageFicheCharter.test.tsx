import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageDetailViewV2 } from "@/components/language/LanguageDetailViewV2";
import type { LanguagePageData } from "@/lib/languageDataTransformer";
import { modelChapterKeys } from "@/lib/fieldProvenance";

/**
 * The net the language fiche never had (atlas charter §4).
 *
 * People and country fiches are held to their model by a charter test each;
 * language and name were not, and that is what let the language parchment
 * ship five chapters while the corpus filled fourteen fields. This asserts
 * the same rule those two already obey — every chapter of the model is
 * printed, filled or not — so the list cannot silently shrink again.
 */

/** A language the corpus fills as far as it ever fills one. */
const filled: LanguagePageData = {
  id: "yor",
  name: "Yoruba",
  nameProvenance: "sourced",
  isoCode639_3: "yor",
  glottocode: "yoru1245",
  nameEn: "Yoruba",
  alternateNames: ["Yariba", "Yooba"],
  spellingAliases: ["Yorouba"],
  dialects: ["Ọ̀yọ́", "Ifẹ̀"],
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
  speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
  vehicularRole: "Langue véhiculaire au Nigeria du Sud-Ouest",
  vitalityStatus: { status: "Institutional", scale: "EGIDS", asOf: 2026 },
  sources: [
    {
      label: "SIL Ethnologue",
      url: "https://ethnologue.example/yor",
      standing: "official",
      notes: "Recensé par SIL, édition 2025.",
    },
  ],
};

/** The shape 23 of the 24 language fiches actually have. */
const bare: LanguagePageData = {
  id: "bmi",
  name: "Bagirmi",
  nameProvenance: "sourced",
  isoCode639_3: "bmi",
  glottocode: "bagi1246",
  nameEn: "Bagirmi",
  alternateNames: [],
  spellingAliases: [],
  dialects: [],
  family: { id: "FLG_NILO_SAHARAN", name: "Nilo-saharien" },
  speakingPeoples: [],
  vehicularRole: null,
  vitalityStatus: null,
  sources: [],
};

/**
 * Chapter titles the parchment owes, against the field of the strict model
 * each one reads. The model is the contract; this table is only the French
 * the reader sees for it.
 */
const CHAPTER_TITLES: Array<{ title: string; fieldPath: string }> = [
  { title: "Identifiants", fieldPath: "isoCode639_3" },
  { title: "Autres noms attestés", fieldPath: "alternateNames" },
  { title: "Famille linguistique", fieldPath: "familyId" },
  { title: "Locuteurs", fieldPath: "peoples" },
  { title: "Dialectes", fieldPath: "content.dialects" },
  { title: "Rôle véhiculaire", fieldPath: "content.vehicularRole" },
  { title: "Vitalité", fieldPath: "content.vitalityStatus" },
  { title: "Sources", fieldPath: "content.sources" },
];

describe("language fiche charter — the chapter list is the model's", () => {
  // @req REQ-136
  it("names only chapters the strict model declares", () => {
    const declared = modelChapterKeys("language");

    for (const { fieldPath } of CHAPTER_TITLES) {
      expect(declared).toContain(fieldPath);
    }
  });

  // @req REQ-136
  it("keeps every chapter of the model when the corpus fills none of them", () => {
    render(<LanguageDetailViewV2 data={bare} />);

    for (const { title } of CHAPTER_TITLES) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  // @req REQ-136
  it("marks each unfilled chapter rather than omitting it", () => {
    render(<LanguageDetailViewV2 data={bare} />);

    // Attested names, speakers, dialects, vehicular role, vitality and
    // sources — the six the corpus leaves empty on 23 of the 24 fiches.
    // Identifiers is the one chapter that always has something to say, which
    // is the whole point of adding it.
    expect(screen.getAllByText("Donnée manquante")).toHaveLength(6);
  });
});

describe("language fiche charter — what the service used to withhold", () => {
  // @req REQ-136
  it("prints the two identifiers the corpus fills on all 24 fiches", () => {
    render(<LanguageDetailViewV2 data={filled} />);

    expect(screen.getByText("yor")).toBeInTheDocument();
    expect(screen.getByText("yoru1245")).toBeInTheDocument();
  });

  // @req REQ-136
  it("prints the identifiers even where every editorial chapter is empty", () => {
    render(<LanguageDetailViewV2 data={bare} />);

    expect(screen.getByText("bmi")).toBeInTheDocument();
    expect(screen.getByText("bagi1246")).toBeInTheDocument();
  });

  // @req REQ-136
  it("gathers the English name, attested names and spellings in one chapter", () => {
    render(<LanguageDetailViewV2 data={filled} />);

    for (const form of ["Yariba", "Yooba", "Yorouba"]) {
      expect(screen.getByText(form)).toBeInTheDocument();
    }
  });

  // @req REQ-136
  it("states the tier rationale the service used to overwrite with null", () => {
    render(<LanguageDetailViewV2 data={filled} />);

    expect(
      screen.getByText("Recensé par SIL, édition 2025.")
    ).toBeInTheDocument();
  });
});
