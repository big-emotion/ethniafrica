import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildFamilyTargetFacts } from "@/components/family/familyTargetFacts";
import type { AtlasTarget } from "@/lib/atlas/targets";

const nigeria: AtlasTarget = {
  countryId: "NGA",
  nameFr: "Nigeria",
  center: { lon: 8, lat: 9 },
  angularSpanDeg: 10,
};

const facts = buildFamilyTargetFacts({
  familyId: "FLG_BENOUECONGO",
  familyNameFr: "Bénoué-Congo",
  memberPeopleCount: 60,
  peopleNamesByCountry: {
    NGA: ["Yoruba", "Igbo", "Anaga"],
    TGO: [],
  },
});

function renderFacts(target: AtlasTarget) {
  const result = facts(target);
  render(<>{result.body}</>);
  return result;
}

describe("buildFamilyTargetFacts", () => {
  // @req REQ-117
  it("names the country and places it in the family's footprint", () => {
    const result = facts(nigeria);

    expect(result.title).toBe("Nigeria");
    expect(result.description).toContain("NGA");
    expect(result.description).toContain("Bénoué-Congo");
  });

  // @req REQ-117
  it("counts the family's peoples present in that country", () => {
    renderFacts(nigeria);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByText(/Peuples Bénoué-Congo présents/i)
    ).toBeInTheDocument();
  });

  // @req REQ-117
  it("reads that count against the family's own total, not against the footprint's sum", () => {
    // A people in three countries is counted three times across the footprint
    // and once in the family. "3 of 60" is the true reading; "3 of the sum of
    // the per-country counts" would be a different, larger, wrong denominator.
    renderFacts(nigeria);

    expect(screen.getByText(/Sur les 60 de la famille/i)).toBeInTheDocument();
    expect(screen.getByText("5,0 %")).toBeInTheDocument();
  });

  // @req REQ-117
  it("lists the peoples it is counting, so the number can be checked", () => {
    renderFacts(nigeria);

    expect(screen.getByText(/Yoruba/)).toBeInTheDocument();
    expect(screen.getByText(/Igbo/)).toBeInTheDocument();
  });

  // @req REQ-117
  it("marks the whole reading as derived", () => {
    // The most important line in the panel: none of this is declared by the
    // family fiche, and the panel must not let a reader think otherwise.
    renderFacts(nigeria);

    expect(
      screen.getByText(/Dérivé — non déclaré par la fiche famille/i)
    ).toBeInTheDocument();
  });

  // @req REQ-117
  it("offers a way back into the fiche it is quoting", () => {
    renderFacts(nigeria);

    expect(
      screen.getByRole("link", { name: /Lire la fiche complète/i })
    ).toHaveAttribute("href", "#fiche");
  });

  // @req REQ-117
  it("says nothing about peoples it has none of, rather than showing an empty list", () => {
    renderFacts({ ...nigeria, countryId: "TGO", nameFr: "Togo" });

    expect(
      screen.queryByText(/Parmi les plus répandus/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
