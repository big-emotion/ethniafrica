import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FragmentationPanel } from "../FragmentationPanel";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

const SOURCE_LINE = { label: "Africa History — africahistory.org" };

const FRAGMENTATION: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋeawo",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    { iso3: "GHA", nameFr: "Ghana", populationShare: 0.55, assertionId: null },
    { iso3: "TGO", nameFr: "Togo", populationShare: 0.45, assertionId: null },
  ],
  borderPairs: [{ a: "GHA", b: "TGO" }],
};

describe("FragmentationPanel — wraps FragmentationView in a FichePanel", () => {
  // @req REQ-091
  it("renders zero DOM output when fragmentation is absent (FR98)", () => {
    const { container } = render(
      <FragmentationPanel
        size="md"
        side="right"
        sourceLine={SOURCE_LINE}
        stepLabel="05 · Fragmentation"
        heading="Un peuple, plusieurs pays"
        body="La frontière a coupé ce peuple en deux États."
      />
    );
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-091
  it("renders the FichePanel chapter anatomy when fragmentation is present", () => {
    render(
      <FragmentationPanel
        fragmentation={FRAGMENTATION}
        size="md"
        side="right"
        sourceLine={SOURCE_LINE}
        stepLabel="05 · Fragmentation"
        heading="Un peuple, plusieurs pays"
        body="La frontière a coupé ce peuple en deux États."
      />
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Un peuple, plusieurs pays",
      })
    ).toBeTruthy();
    expect(screen.getByText("05 · Fragmentation")).toBeTruthy();
    expect(screen.getByText("Africa History — africahistory.org")).toBeTruthy();
  });

  // @req REQ-091
  it("delegates the fragmentation data to FragmentationView unchanged, in the fiche-section variant", () => {
    const { container } = render(
      <FragmentationPanel
        fragmentation={FRAGMENTATION}
        size="md"
        side="right"
        sourceLine={SOURCE_LINE}
        stepLabel="05 · Fragmentation"
        heading="Un peuple, plusieurs pays"
        body="La frontière a coupé ce peuple en deux États."
      />
    );
    expect(
      container.querySelector(".FragmentationView--fiche-section")
    ).not.toBeNull();
    expect(screen.getByText("Ghana")).toBeTruthy();
    expect(screen.getByText("Togo")).toBeTruthy();
  });
});
