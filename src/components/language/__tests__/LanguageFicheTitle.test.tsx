import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageFicheTitle } from "@/components/language/LanguageFicheTitle";
import type { LanguagePageData } from "@/lib/languageDataTransformer";

const baseData: LanguagePageData = {
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
  speakingPeoples: [],
  vehicularRole: null,
  vitalityStatus: null,
  sources: [],
};

describe("LanguageFicheTitle", () => {
  // @req REQ-136
  it("prints the name with no provenance marker when it is sourced", () => {
    render(<LanguageFicheTitle data={baseData} />);

    expect(screen.getByRole("heading", { name: "Yoruba" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // AC1: a language fiche whose name was derived by majority vote must show
  // the derivation, and must not present the name as attested.
  // @req REQ-136
  it("shows the name is derived by majority vote rather than presenting it as attested (AC1)", () => {
    render(
      <LanguageFicheTitle data={{ ...baseData, nameProvenance: "derived" }} />
    );

    expect(screen.getByRole("heading", { name: "Yoruba" })).toBeInTheDocument();
    expect(
      screen.getByText("Dérivée de : vote majoritaire des sources")
    ).toBeInTheDocument();
  });
});
