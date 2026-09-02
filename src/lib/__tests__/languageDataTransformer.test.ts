import { describe, expect, it } from "vitest";
import { transformLanguageData } from "../languageDataTransformer";
import type { LanguageDetail } from "@/api/v2/services/languageService";

const baseLanguage: LanguageDetail = {
  id: "yor",
  name: "Yoruba",
  nameProvenance: "sourced",
  isoCode639_3: "yor",
  glottocode: "yoru1245",
  nameEn: "Yoruba",
  alternateNames: [],
  spellingAliases: [],
  dialects: [],
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
  speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
  vehicularRole: "Langue véhiculaire au Nigeria du Sud-Ouest",
  vitalityStatus: { status: "Institutional", scale: "EGIDS", asOf: 2026 },
  sources: [
    {
      id: "src-1",
      title: "SIL Ethnologue",
      url: "https://ethnologue.example/yor",
      tier: "official",
      notes: null,
    },
  ],
};

describe("transformLanguageData", () => {
  // @req REQ-136
  it("carries the identity, provenance and relation fields through untouched", () => {
    const data = transformLanguageData(baseLanguage);

    expect(data.id).toBe("yor");
    expect(data.name).toBe("Yoruba");
    expect(data.nameProvenance).toBe("sourced");
    expect(data.family).toEqual({ id: "FLG_NIGER_CONGO", name: "Niger-Congo" });
    expect(data.speakingPeoples).toEqual([
      { id: "PPL_YORUBA", name: "Yoruba" },
    ]);
    expect(data.vehicularRole).toBe(
      "Langue véhiculaire au Nigeria du Sud-Ouest"
    );
    expect(data.vitalityStatus).toEqual({
      status: "Institutional",
      scale: "EGIDS",
      asOf: 2026,
    });
  });

  // @req REQ-136
  it("reshapes sources from the service's tier/title shape to SourcesFooter's standing/label shape", () => {
    const data = transformLanguageData(baseLanguage);

    expect(data.sources).toEqual([
      {
        label: "SIL Ethnologue",
        url: "https://ethnologue.example/yor",
        standing: "official",
        notes: undefined,
      },
    ]);
  });

  // @req REQ-136
  it("passes a derived nameProvenance through rather than upgrading it (AC1)", () => {
    const data = transformLanguageData({
      ...baseLanguage,
      nameProvenance: "derived",
    });

    expect(data.nameProvenance).toBe("derived");
  });

  // @req REQ-136
  it("passes a null vitalityStatus through as null rather than inventing one (AC2)", () => {
    const data = transformLanguageData({
      ...baseLanguage,
      vitalityStatus: null,
    });

    expect(data.vitalityStatus).toBeNull();
  });
});
