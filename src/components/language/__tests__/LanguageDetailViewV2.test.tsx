import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageDetailViewV2 } from "@/components/language/LanguageDetailViewV2";
import type { LanguagePageData } from "@/lib/languageDataTransformer";
import { getFamilyRoute, getPeopleRoute } from "@/lib/routing";

const fullData: LanguagePageData = {
  id: "yor",
  name: "Yoruba",
  nameProvenance: "sourced",
  isoCode639_3: "yor",
  glottocode: "yoru1245",
  nameEn: "Yoruba",
  // Filled, so that each test below leaves exactly one chapter empty and can
  // still assert a single missing marker.
  alternateNames: ["Yariba"],
  spellingAliases: ["Yorouba"],
  dialects: ["Ọ̀yọ́"],
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
  speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
  vehicularRole: "Langue véhiculaire au Nigeria du Sud-Ouest",
  vitalityStatus: { status: "Institutional", scale: "EGIDS", asOf: 2026 },
  sources: [
    {
      label: "SIL Ethnologue",
      url: "https://ethnologue.example/yor",
      standing: "official",
      notes: undefined,
    },
  ],
};

describe("LanguageDetailViewV2", () => {
  // @req REQ-136
  it("links the declared family and lists the speaking peoples", () => {
    render(<LanguageDetailViewV2 data={fullData} />);

    expect(screen.getByRole("link", { name: "Niger-Congo" })).toHaveAttribute(
      "href",
      getFamilyRoute("fr", "FLG_NIGER_CONGO")
    );
    expect(screen.getByRole("link", { name: "Yoruba" })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_YORUBA")
    );
  });

  // @req REQ-136
  it("prints the vehicular role and vitality status when the corpus declares them", () => {
    render(<LanguageDetailViewV2 data={fullData} />);

    expect(
      screen.getByText("Langue véhiculaire au Nigeria du Sud-Ouest")
    ).toBeInTheDocument();
    expect(screen.getByText(/Institutional/)).toBeInTheDocument();
  });

  // AC2: a language with no vitality status in the corpus must render that
  // absence explicitly rather than omit the section.
  // @req REQ-136
  it("shows the absence of a vitality status explicitly rather than hiding the section (AC2)", () => {
    render(
      <LanguageDetailViewV2 data={{ ...fullData, vitalityStatus: null }} />
    );

    expect(
      screen.getByRole("heading", { name: "Vitalité" })
    ).toBeInTheDocument();
    expect(screen.getByText("Donnée manquante")).toBeInTheDocument();
  });

  // @req REQ-136
  it("shows an explicit absence for an unfilled vehicular role and an empty speakers list", () => {
    render(
      <LanguageDetailViewV2
        data={{ ...fullData, vehicularRole: null, speakingPeoples: [] }}
      />
    );

    const missingMarkers = screen.getAllByText("Donnée manquante");
    expect(missingMarkers.length).toBeGreaterThanOrEqual(2);
  });

  // @req REQ-136
  it("shows an explicit absence for the sources section when the corpus cites none", () => {
    render(<LanguageDetailViewV2 data={{ ...fullData, sources: [] }} />);

    expect(
      screen.getByRole("heading", { name: "Sources" })
    ).toBeInTheDocument();
    expect(screen.getByText("Donnée manquante")).toBeInTheDocument();
  });
});
