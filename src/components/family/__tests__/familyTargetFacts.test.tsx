import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildFamilyTargetFacts } from "@/components/family/familyTargetFacts";

const facts = buildFamilyTargetFacts({
  familyId: "FLG_BENOUECONGO",
  familyNameFr: "Bénoué-Congo",
  memberPeopleCount: 60,
  peopleNamesByCountry: {
    NGA: ["Yoruba", "Igbo", "Anaga"],
    TGO: [],
  },
  countryNamesFr: { NGA: "Nigeria", TGO: "Togo" },
});

function renderFacts(countryId: string) {
  const result = facts[countryId];
  render(<>{result.body}</>);
  return result;
}

describe("buildFamilyTargetFacts", () => {
  // @req REQ-117
  it("returns data, never a resolver, so it can cross to a client component", () => {
    // The family fiche is a server component and AtlasGlobe is a client one.
    // This shipped as a function once and every family route answered HTTP 500
    // — a failure no unit test saw, because a unit test renders AtlasGlobe on
    // the client where a function is perfectly valid, and no build catches it
    // either. Asserting the shape here is what makes the boundary a typed fact
    // rather than something to remember.
    expect(typeof facts).toBe("object");
    expect(typeof facts.NGA).toBe("object");
    for (const entry of Object.values(facts)) {
      expect(typeof entry.title).toBe("string");
      expect(typeof entry.body).not.toBe("function");
    }
  });

  // @req REQ-117
  it("names the country and places it in the family's footprint", () => {
    const result = facts.NGA;

    expect(result.title).toBe("Nigeria");
    expect(result.description).toContain("NGA");
    expect(result.description).toContain("Bénoué-Congo");
  });

  // @req REQ-117
  it("counts the family's peoples present in that country", () => {
    renderFacts("NGA");

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
    renderFacts("NGA");

    expect(screen.getByText(/Sur les 60 de la famille/i)).toBeInTheDocument();
    expect(screen.getByText("5,0 %")).toBeInTheDocument();
  });

  // @req REQ-117
  it("lists the peoples it is counting, so the number can be checked", () => {
    renderFacts("NGA");

    expect(screen.getByText(/Yoruba/)).toBeInTheDocument();
    expect(screen.getByText(/Igbo/)).toBeInTheDocument();
  });

  // @req REQ-117
  it("marks the whole reading as derived", () => {
    // The most important line in the panel: none of this is declared by the
    // family fiche, and the panel must not let a reader think otherwise.
    renderFacts("NGA");

    expect(
      screen.getByText(/Dérivé — non déclaré par la fiche famille/i)
    ).toBeInTheDocument();
  });

  // @req REQ-117
  it("offers a way back into the fiche it is quoting", () => {
    renderFacts("NGA");

    expect(
      screen.getByRole("link", { name: /Lire la fiche complète/i })
    ).toHaveAttribute("href", "#fiche");
  });

  // @req REQ-117
  it("says nothing about peoples it has none of, rather than showing an empty list", () => {
    renderFacts("TGO");

    expect(
      screen.queryByText(/Parmi les plus répandus/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
